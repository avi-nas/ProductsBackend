import type { Product } from "../../src/domain/product.js";
import type { ProductProvider } from "../../src/ports/product-provider.js";

export class FakeProductProvider implements ProductProvider {
  constructor(
    private readonly products: readonly Product[],
    private readonly failure?: Error,
  ) {}

  async getProducts(): Promise<readonly Product[]> {
    if (this.failure) {
      throw this.failure;
    }
    return this.products;
  }

  async getProduct(id: number): Promise<Product | null> {
    if (this.failure) {
      throw this.failure;
    }
    return this.products.find((candidate) => candidate.id === id) ?? null;
  }
}
