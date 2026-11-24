import { describe, expect, it } from "vitest";

import { EnquiryService } from "../../src/services/enquiry-service.js";
import { FakeEmailProvider } from "../fakes/fake-email-provider.js";
import { FakeProductProvider } from "../fakes/fake-product-provider.js";
import { product } from "../fixtures/products.js";

describe("EnquiryService", () => {
  it("looks up the product and composes a plain-text sales email", async () => {
    const emailProvider = new FakeEmailProvider();
    const service = new EnquiryService(
      new FakeProductProvider([
        product({
          id: 7,
          title: "Gaming Display",
          category: "electronics",
          price: 599,
          imageUrl: "https://example.test/display.png",
        }),
      ]),
      emailProvider,
    );

    await service.submit({
      name: "Asha Patel",
      email: "asha@example.test",
      productId: 7,
      message: "Please contact me.",
    });

    expect(emailProvider.messages).toHaveLength(1);
    expect(emailProvider.messages[0]).toMatchObject({
      replyTo: "asha@example.test",
      subject: "New product enquiry for product 7",
    });
    expect(emailProvider.messages[0]?.text).toContain("Customer name: Asha Patel");
    expect(emailProvider.messages[0]?.text).toContain("Product: Gaming Display");
    expect(emailProvider.messages[0]?.text).toContain("Price: 599");
    expect(emailProvider.messages[0]?.text).toContain("Message: Please contact me.");
  });

  it("does not send email when the product does not exist", async () => {
    const emailProvider = new FakeEmailProvider();
    const service = new EnquiryService(new FakeProductProvider([]), emailProvider);

    await expect(
      service.submit({ name: "Asha", email: "asha@example.test", productId: 99 }),
    ).rejects.toMatchObject({ statusCode: 404, code: "PRODUCT_NOT_FOUND" });
    expect(emailProvider.messages).toEqual([]);
  });
});
