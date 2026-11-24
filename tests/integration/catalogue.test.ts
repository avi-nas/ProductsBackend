import request from "supertest";
import { describe, expect, it } from "vitest";

import { createApp } from "../../src/app.js";
import { AppError } from "../../src/errors.js";
import { CatalogueService } from "../../src/services/catalogue-service.js";
import { EnquiryService } from "../../src/services/enquiry-service.js";
import { FakeEmailProvider } from "../fakes/fake-email-provider.js";
import { FakeProductProvider } from "../fakes/fake-product-provider.js";
import { product } from "../fixtures/products.js";

const products = [
  product({ id: 1, title: "Trail Backpack", category: "men's clothing", rating: { rate: 4, count: 5 } }),
  product({ id: 2, title: "Cotton Jacket", category: "men's clothing", rating: { rate: 4.8, count: 20 } }),
  product({ id: 3, description: "LIGHTWEIGHT jacket", category: "men's clothing", rating: { rate: 4.8, count: 10 } }),
  product({ id: 4, category: "men's clothing", rating: null }),
  product({ id: 5, category: "jewelery", rating: { rate: 3.5, count: 15 } }),
  product({ id: 6, category: "jewelery", rating: { rate: 4.5, count: 30 } }),
];

function appWith(provider = new FakeProductProvider(products)) {
  return createApp({
    catalogueService: new CatalogueService(provider, [5, 2, 1, 6, 3]),
    enquiryService: new EnquiryService(provider, new FakeEmailProvider()),
  });
}

describe("catalogue endpoints", () => {
  it("returns exactly five configured products from home", async () => {
    const response = await request(appWith()).get("/api/v1/home");

    expect(response.status).toBe(200);
    expect(response.body.data.featuredProducts.map((item: { id: number }) => item.id)).toEqual([
      5, 2, 1, 6, 3,
    ]);
  });

  it("returns distinct categories alphabetically", async () => {
    const response = await request(appWith()).get("/api/v1/categories");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ data: ["jewelery", "men's clothing"] });
  });

  it("returns top-rated and additional products for a category", async () => {
    const response = await request(appWith()).get(
      "/api/v1/categories/men%27s%20clothing/products",
    );

    expect(response.status).toBe(200);
    expect(response.body.data.category).toBe("men's clothing");
    expect(response.body.data.topRated.map((item: { id: number }) => item.id)).toEqual([2, 3]);
    expect(response.body.data.additional.map((item: { id: number }) => item.id)).toEqual([1, 4]);
  });

  it("searches case-insensitively and returns an empty array when nothing matches", async () => {
    const matched = await request(appWith()).get("/api/v1/products/search?q=JACKET");
    const empty = await request(appWith()).get("/api/v1/products/search?q=missing");

    expect(matched.status).toBe(200);
    expect(matched.body.data.map((item: { id: number }) => item.id)).toEqual([2, 3]);
    expect(empty.status).toBe(200);
    expect(empty.body).toEqual({ data: [] });
  });

  it("returns product details and product-not-found errors", async () => {
    const found = await request(appWith()).get("/api/v1/products/2");
    const missing = await request(appWith()).get("/api/v1/products/999");

    expect(found.status).toBe(200);
    expect(found.body.data.id).toBe(2);
    expect(missing.status).toBe(404);
    expect(missing.body.error.code).toBe("PRODUCT_NOT_FOUND");
  });

  it.each([
    ["/api/v1/products/search", "q"],
    ["/api/v1/products/search?q=%20", "q"],
    ["/api/v1/products/0", "id"],
  ])("validates requests to %s", async (path, field) => {
    const response = await request(appWith()).get(path);

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("VALIDATION_ERROR");
    expect(response.body.error.details[field]).toBeDefined();
  });

  it("returns category-not-found errors", async () => {
    const response = await request(appWith()).get("/api/v1/categories/unknown/products");

    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe("CATEGORY_NOT_FOUND");
  });

  it("maps provider failures through centralized error handling", async () => {
    const failure = new AppError(
      502,
      "PRODUCT_SOURCE_UNAVAILABLE",
      "The product source is unavailable.",
    );
    const response = await request(appWith(new FakeProductProvider([], failure))).get(
      "/api/v1/categories",
    );

    expect(response.status).toBe(502);
    expect(response.body.error.code).toBe("PRODUCT_SOURCE_UNAVAILABLE");
  });
});
