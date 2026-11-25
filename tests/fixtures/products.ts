import type { Product } from "../../src/domain/product.js";

export function product(overrides: Partial<Product> & Pick<Product, "id">): Product {
  const { id, ...rest } = overrides;
  return {
    id,
    title: `Product ${id}`,
    price: 10,
    description: `Description ${id}`,
    category: "electronics",
    imageUrl: `https://example.test/products/${id}.png`,
    rating: { rate: 3, count: 10 },
    ...rest,
  };
}
