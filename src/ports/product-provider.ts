import type { Product } from "../domain/product.js";

export interface ProductProvider {
  getProducts(): Promise<readonly Product[]>;
  getProduct(id: number): Promise<Product | null>;
}
