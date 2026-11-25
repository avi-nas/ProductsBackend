import request from "supertest";
import { describe, expect, it } from "vitest";

import { createApp } from "../../src/app.js";
import { CatalogueService } from "../../src/services/catalogue-service.js";
import { EnquiryService } from "../../src/services/enquiry-service.js";
import { FakeEmailProvider } from "../fakes/fake-email-provider.js";
import { FakeProductProvider } from "../fakes/fake-product-provider.js";

describe("application foundation", () => {
  const productProvider = new FakeProductProvider([]);
  const app = createApp({
    catalogueService: new CatalogueService(productProvider, [1, 2, 3, 4, 5]),
    enquiryService: new EnquiryService(productProvider, new FakeEmailProvider()),
  });

  it("reports health without calling external dependencies", async () => {
    const response = await request(app).get("/health");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: "ok" });
    expect(response.headers["x-powered-by"]).toBeUndefined();
  });

  it("returns the common error envelope for unknown routes", async () => {
    const response = await request(app).get("/missing");

    expect(response.status).toBe(404);
    expect(response.body).toEqual({
      error: {
        code: "ROUTE_NOT_FOUND",
        message: "The requested route was not found.",
      },
    });
  });

  it("rejects malformed JSON", async () => {
    const response = await request(app)
      .post("/missing")
      .set("Content-Type", "application/json")
      .send('{"broken":');

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      error: {
        code: "INVALID_JSON",
        message: "Request body must contain valid JSON.",
      },
    });
  });

  it("enforces the JSON body size limit", async () => {
    const response = await request(app)
      .post("/missing")
      .set("Content-Type", "application/json")
      .send(JSON.stringify({ value: "x".repeat(17_000) }));

    expect(response.status).toBe(413);
    expect(response.body.error.code).toBe("PAYLOAD_TOO_LARGE");
  });
});
