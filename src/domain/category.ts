import type { Product } from "./product.js";

export interface CategoryCatalogue {
  readonly category: string;
  readonly topRated: readonly Product[];
  readonly additional: readonly Product[];
}

export interface HomeCatalogue {
  readonly featuredProducts: readonly Product[];
}
