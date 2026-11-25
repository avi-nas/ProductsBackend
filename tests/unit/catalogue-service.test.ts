import { describe, expect, it } from "vitest";

import { CatalogueService } from "../../src/services/catalogue-service.js";
import { FakeProductProvider } from "../fakes/fake-product-provider.js";
import { product } from "../fixtures/products.js";

const products = [
  product({ id: 1, title: "Trail Backpack", rating: { rate: 4.5, count: 10 } }),
  product({ id: 2, title: "Gaming Display", rating: { rate: 4.5, count: 20 } }),
  product({ id: 3, description: "A GAMING accessory", rating: { rate: 4.5, count: 20 } }),
  product({ id: 4, rating: { rate: 5, count: 1 } }),
  product({ id: 5, rating: null }),
  product({ id: 6, category: "jewelery", rating: { rate: 4.8, count: 100 } }),
];

describe("CatalogueService", () => {
  it("returns five featured products in configured order", async () => {
    const service = new CatalogueService(new FakeProductProvider(products), [5, 4, 3, 2, 1]);

    const home = await service.getHome();

    expect(home.featuredProducts.map((item) => item.id)).toEqual([5, 4, 3, 2, 1]);
  });

  it("ranks category products by rate, count, then id and places unrated products last", async () => {
    const service = new CatalogueService(new FakeProductProvider(products), [1, 2, 3, 4, 5]);

    const category = await service.getCategoryProducts("ELECTRONICS");

    expect(category.topRated.map((item) => item.id)).toEqual([4, 2]);
    expect(category.additional.map((item) => item.id)).toEqual([3, 1, 5]);
  });

  it("searches titles and descriptions case-insensitively", async () => {
    const service = new CatalogueService(new FakeProductProvider(products), [1, 2, 3, 4, 5]);

    const results = await service.searchProducts("GaMiNg");

    expect(results.map((item) => item.id)).toEqual([2, 3]);
  });
});
