import { afterEach, describe, expect, it, vi } from "vitest";

import { FakeStoreProductProvider } from "../../src/adapters/fake-store-product-provider.js";

function response(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function productDto(overrides: Readonly<Record<string, unknown>> = {}): Record<string, unknown> {
  return {
    id: 1,
    title: "Backpack",
    price: 109.95,
    description: "Everyday backpack",
    category: "men's clothing",
    image: "https://example.test/backpack.png",
    rating: { rate: 4.2, count: 120 },
    ...overrides,
  };
}

function provider(fetchClient: (input: URL, init: RequestInit) => Promise<Response>, timeoutMs = 50) {
  return new FakeStoreProductProvider({
    baseUrl: "https://fakestore.example",
    timeoutMs,
    fetchClient,
  });
}

describe("FakeStoreProductProvider", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("maps external product fields to the domain model", async () => {
    const fetchClient = vi.fn(async () => response([productDto()]));

    const products = await provider(fetchClient).getProducts();

    expect(products).toEqual([
      {
        id: 1,
        title: "Backpack",
        price: 109.95,
        description: "Everyday backpack",
        category: "men's clothing",
        imageUrl: "https://example.test/backpack.png",
        rating: { rate: 4.2, count: 120 },
      },
    ]);
    expect(fetchClient).toHaveBeenCalledWith(
      new URL("https://fakestore.example/products"),
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
  });

  it("normalizes missing and malformed ratings to null", async () => {
    const fetchClient = vi.fn(async () =>
      response([productDto({ rating: undefined }), productDto({ id: 2, rating: { rate: 9 } })]),
    );

    const products = await provider(fetchClient).getProducts();

    expect(products.map((item) => item.rating)).toEqual([null, null]);
  });

  it("rejects invalid required product fields", async () => {
    const fetchClient = vi.fn(async () => response([productDto({ title: null })]));

    await expect(provider(fetchClient).getProducts()).rejects.toMatchObject({
      statusCode: 502,
      code: "PRODUCT_SOURCE_INVALID_RESPONSE",
    });
  });

  it("treats a 404 product response as not found", async () => {
    const fetchClient = vi.fn(async () => response({}, 404));

    await expect(provider(fetchClient).getProduct(99)).resolves.toBeNull();
  });

  it("maps upstream HTTP and network failures to an unavailable error", async () => {
    const httpFailure = vi.fn(async () => response({}, 503));
    const networkFailure = vi.fn(async () => {
      throw new TypeError("connection failed");
    });

    await expect(provider(httpFailure).getProducts()).rejects.toMatchObject({
      code: "PRODUCT_SOURCE_UNAVAILABLE",
    });
    await expect(provider(networkFailure).getProducts()).rejects.toMatchObject({
      code: "PRODUCT_SOURCE_UNAVAILABLE",
    });
  });

  it("rejects invalid JSON responses", async () => {
    const fetchClient = vi.fn(async () => new Response("not-json", { status: 200 }));

    await expect(provider(fetchClient).getProducts()).rejects.toMatchObject({
      code: "PRODUCT_SOURCE_INVALID_RESPONSE",
    });
  });

  it("aborts and maps upstream timeouts", async () => {
    vi.useFakeTimers();
    const fetchClient = vi.fn(
      async (_input: URL, init: RequestInit): Promise<Response> =>
        new Promise((_resolve, reject) => {
          init.signal?.addEventListener("abort", () => reject(new Error("aborted")));
        }),
    );

    const expectation = expect(provider(fetchClient, 10).getProducts()).rejects.toMatchObject({
      code: "PRODUCT_SOURCE_UNAVAILABLE",
      message: "The product source request timed out.",
    });
    await vi.advanceTimersByTimeAsync(10);
    await expectation;
  });
});
