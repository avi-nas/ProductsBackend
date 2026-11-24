import type { CategoryCatalogue, HomeCatalogue } from "../domain/category.js";
import type { Product } from "../domain/product.js";
import { AppError } from "../errors.js";
import type { ProductProvider } from "../ports/product-provider.js";

function ratingValue(product: Product): number {
  return product.rating?.rate ?? Number.NEGATIVE_INFINITY;
}

function ratingCount(product: Product): number {
  return product.rating?.count ?? Number.NEGATIVE_INFINITY;
}

export function rankProducts(products: readonly Product[]): readonly Product[] {
  return [...products].sort(
    (left, right) =>
      ratingValue(right) - ratingValue(left) ||
      ratingCount(right) - ratingCount(left) ||
      left.id - right.id,
  );
}

export class CatalogueService {
  constructor(
    private readonly productProvider: ProductProvider,
    private readonly featuredProductIds: readonly number[],
  ) {}

  async getHome(): Promise<HomeCatalogue> {
    const products = await this.productProvider.getProducts();
    const productsById = new Map(products.map((product) => [product.id, product]));

    if (this.featuredProductIds.length !== 5) {
      throw new AppError(
        502,
        "FEATURED_PRODUCTS_UNAVAILABLE",
        "One or more configured featured products are unavailable.",
      );
    }

    const featuredProducts: Product[] = [];
    for (const id of this.featuredProductIds) {
      const product = productsById.get(id);
      if (product === undefined) {
        throw new AppError(
          502,
          "FEATURED_PRODUCTS_UNAVAILABLE",
          "One or more configured featured products are unavailable.",
        );
      }
      featuredProducts.push(product);
    }

    return { featuredProducts };
  }

  async getCategories(): Promise<readonly string[]> {
    const products = await this.productProvider.getProducts();
    const categories = new Map<string, string>();
    for (const product of products) {
      const key = product.category.toLocaleLowerCase("en");
      if (!categories.has(key)) {
        categories.set(key, product.category);
      }
    }

    return [...categories.values()].sort((left, right) =>
      left.localeCompare(right, "en", { sensitivity: "base" }),
    );
  }

  async getCategoryProducts(category: string): Promise<CategoryCatalogue> {
    const products = await this.productProvider.getProducts();
    const normalizedCategory = category.toLocaleLowerCase("en");
    const matching = products.filter(
      (product) => product.category.toLocaleLowerCase("en") === normalizedCategory,
    );

    if (matching.length === 0) {
      throw new AppError(404, "CATEGORY_NOT_FOUND", "The requested category was not found.");
    }

    const ranked = rankProducts(matching);
    return {
      category: matching[0]?.category ?? category,
      topRated: ranked.slice(0, 2),
      additional: ranked.slice(2),
    };
  }

  async searchProducts(query: string): Promise<readonly Product[]> {
    const products = await this.productProvider.getProducts();
    const normalizedQuery = query.toLocaleLowerCase("en");

    return products
      .filter(
        (product) =>
          product.title.toLocaleLowerCase("en").includes(normalizedQuery) ||
          product.description.toLocaleLowerCase("en").includes(normalizedQuery),
      )
      .sort((left, right) => left.id - right.id);
  }

  async getProduct(id: number): Promise<Product> {
    const product = await this.productProvider.getProduct(id);
    if (product === null) {
      throw new AppError(404, "PRODUCT_NOT_FOUND", "The requested product was not found.");
    }
    return product;
  }
}
