import type { Product, Rating } from "../domain/product.js";
import { AppError } from "../errors.js";
import type { ProductProvider } from "../ports/product-provider.js";

type FetchClient = (input: URL, init: RequestInit) => Promise<Response>;

interface FakeStoreProductDto {
  readonly id: number;
  readonly title: string;
  readonly price: number;
  readonly description: string;
  readonly category: string;
  readonly image: string;
  readonly rating: unknown;
}

export interface FakeStoreProductProviderOptions {
  readonly baseUrl: string;
  readonly timeoutMs: number;
  readonly fetchClient?: FetchClient;
}

function invalidResponse(): AppError {
  return new AppError(
    502,
    "PRODUCT_SOURCE_INVALID_RESPONSE",
    "The product source returned an invalid response.",
  );
}

function unavailable(message = "The product source is unavailable."): AppError {
  return new AppError(502, "PRODUCT_SOURCE_UNAVAILABLE", message);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function mapRating(value: unknown): Rating | null {
  if (!isRecord(value)) {
    return null;
  }

  const rate = value.rate;
  const count = value.count;
  if (
    typeof rate !== "number" ||
    !Number.isFinite(rate) ||
    rate < 0 ||
    rate > 5 ||
    typeof count !== "number" ||
    !Number.isSafeInteger(count) ||
    count < 0
  ) {
    return null;
  }

  return { rate, count };
}

function toFakeStoreDto(value: unknown): FakeStoreProductDto {
  if (!isRecord(value)) {
    throw invalidResponse();
  }

  const { id, title, price, description, category, image } = value;
  if (
    typeof id !== "number" ||
    !Number.isSafeInteger(id) ||
    id <= 0 ||
    typeof title !== "string" ||
    title.trim() === "" ||
    typeof price !== "number" ||
    !Number.isFinite(price) ||
    price < 0 ||
    typeof description !== "string" ||
    typeof category !== "string" ||
    category.trim() === "" ||
    typeof image !== "string" ||
    !isHttpUrl(image)
  ) {
    throw invalidResponse();
  }

  return {
    id,
    title: title.trim(),
    price,
    description,
    category: category.trim(),
    image,
    rating: value.rating,
  };
}

function mapProduct(value: unknown): Product {
  const dto = toFakeStoreDto(value);
  return {
    id: dto.id,
    title: dto.title,
    price: dto.price,
    description: dto.description,
    category: dto.category,
    imageUrl: dto.image,
    rating: mapRating(dto.rating),
  };
}

export class FakeStoreProductProvider implements ProductProvider {
  private readonly baseUrl: string;
  private readonly timeoutMs: number;
  private readonly fetchClient: FetchClient;

  constructor(options: FakeStoreProductProviderOptions) {
    this.baseUrl = options.baseUrl.replace(/\/$/, "");
    this.timeoutMs = options.timeoutMs;
    this.fetchClient = options.fetchClient ?? fetch;
  }

  async getProducts(): Promise<readonly Product[]> {
    const response = await this.request("products");
    const payload = await this.readJson(response);
    if (!Array.isArray(payload)) {
      throw invalidResponse();
    }
    return payload.map(mapProduct);
  }

  async getProduct(id: number): Promise<Product | null> {
    const response = await this.request(`products/${id}`, true);
    if (response === null) {
      return null;
    }

    const payload = await this.readJson(response);
    if (payload === null || (isRecord(payload) && Object.keys(payload).length === 0)) {
      return null;
    }
    return mapProduct(payload);
  }

  private async request(path: string): Promise<Response>;
  private async request(path: string, allowNotFound: true): Promise<Response | null>;
  private async request(path: string, allowNotFound = false): Promise<Response | null> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

    let response: Response;
    try {
      response = await this.fetchClient(new URL(path, `${this.baseUrl}/`), {
        headers: { accept: "application/json" },
        signal: controller.signal,
      });
    } catch {
      if (controller.signal.aborted) {
        throw unavailable("The product source request timed out.");
      }
      throw unavailable();
    } finally {
      clearTimeout(timeout);
    }

    if (allowNotFound && response.status === 404) {
      return null;
    }
    if (!response.ok) {
      throw unavailable();
    }
    return response;
  }

  private async readJson(response: Response): Promise<unknown> {
    try {
      return await response.json();
    } catch {
      throw invalidResponse();
    }
  }
}
