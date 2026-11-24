import type { EmailMessage, Enquiry } from "../domain/enquiry.js";
import type { Product } from "../domain/product.js";
import { AppError } from "../errors.js";
import type { EmailProvider } from "../ports/email-provider.js";
import type { ProductProvider } from "../ports/product-provider.js";

function formatEmail(enquiry: Enquiry, product: Product): EmailMessage {
  const lines = [
    "New product enquiry",
    "",
    `Customer name: ${enquiry.name}`,
    `Customer email: ${enquiry.email}`,
    `Product ID: ${enquiry.productId}`,
    `Product: ${product.title}`,
    `Category: ${product.category}`,
    `Price: ${product.price}`,
    `Image: ${product.imageUrl}`,
    `Message: ${enquiry.message ?? "Not provided"}`,
  ];

  return {
    replyTo: enquiry.email,
    subject: `New product enquiry for product ${enquiry.productId}`,
    text: lines.join("\n"),
  };
}

export class EnquiryService {
  constructor(
    private readonly productProvider: ProductProvider,
    private readonly emailProvider: EmailProvider,
  ) {}

  async submit(enquiry: Enquiry): Promise<void> {
    const product = await this.productProvider.getProduct(enquiry.productId);
    if (product === null) {
      throw new AppError(404, "PRODUCT_NOT_FOUND", "The requested product was not found.");
    }

    await this.emailProvider.send(formatEmail(enquiry, product));
  }
}
