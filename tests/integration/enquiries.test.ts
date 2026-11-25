import request from "supertest";
import { describe, expect, it } from "vitest";

import { createApp } from "../../src/app.js";
import { AppError } from "../../src/errors.js";
import { CatalogueService } from "../../src/services/catalogue-service.js";
import { EnquiryService } from "../../src/services/enquiry-service.js";
import { FakeEmailProvider } from "../fakes/fake-email-provider.js";
import { FakeProductProvider } from "../fakes/fake-product-provider.js";
import { product } from "../fixtures/products.js";

const products = [product({ id: 1, title: "Backpack", category: "men's clothing" })];

function appWith(emailProvider: FakeEmailProvider, productProvider = new FakeProductProvider(products)) {
  return createApp({
    catalogueService: new CatalogueService(productProvider, [1, 2, 3, 4, 5]),
    enquiryService: new EnquiryService(productProvider, emailProvider),
  });
}

describe("POST /api/v1/enquiries", () => {
  it("returns success only after sending the sales email", async () => {
    const emailProvider = new FakeEmailProvider();

    const response = await request(appWith(emailProvider)).post("/api/v1/enquiries").send({
      name: "  Asha Patel  ",
      email: "asha@example.test",
      productId: 1,
      message: "  Please contact me.  ",
    });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ data: { submitted: true } });
    expect(emailProvider.messages).toHaveLength(1);
    expect(emailProvider.messages[0]?.text).toContain("Customer name: Asha Patel");
    expect(emailProvider.messages[0]?.text).toContain("Message: Please contact me.");
  });

  it.each([
    [{ email: "asha@example.test", productId: 1 }, "name"],
    [{ name: "Asha", email: "invalid", productId: 1 }, "email"],
    [{ name: "Asha", email: "asha@example.test", productId: 0 }, "productId"],
    [
      { name: "Asha", email: "asha@example.test", productId: 1, message: "x".repeat(2_001) },
      "message",
    ],
  ])("rejects invalid input for %s", async (body, field) => {
    const emailProvider = new FakeEmailProvider();

    const response = await request(appWith(emailProvider)).post("/api/v1/enquiries").send(body);

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("VALIDATION_ERROR");
    expect(response.body.error.details[field]).toBeDefined();
    expect(emailProvider.messages).toEqual([]);
  });

  it("does not send email for an unknown product", async () => {
    const emailProvider = new FakeEmailProvider();

    const response = await request(appWith(emailProvider)).post("/api/v1/enquiries").send({
      name: "Asha",
      email: "asha@example.test",
      productId: 999,
    });

    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe("PRODUCT_NOT_FOUND");
    expect(emailProvider.messages).toEqual([]);
  });

  it("returns a safe error when email delivery fails", async () => {
    const emailProvider = new FakeEmailProvider(
      new AppError(502, "EMAIL_DELIVERY_FAILED", "The enquiry email could not be delivered."),
    );

    const response = await request(appWith(emailProvider)).post("/api/v1/enquiries").send({
      name: "Asha",
      email: "asha@example.test",
      productId: 1,
    });

    expect(response.status).toBe(502);
    expect(response.body).toEqual({
      error: {
        code: "EMAIL_DELIVERY_FAILED",
        message: "The enquiry email could not be delivered.",
      },
    });
  });
});
