import { Router, type Request } from "express";

import type { Enquiry } from "../domain/enquiry.js";
import { AppError } from "../errors.js";
import type { EnquiryService } from "../services/enquiry-service.js";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readEnquiry(request: Request): Enquiry {
  const body: unknown = request.body;
  if (!isRecord(body)) {
    throw new AppError(400, "VALIDATION_ERROR", "The request is invalid.", {
      body: ["body must be a JSON object."],
    });
  }

  const details: Record<string, string[]> = {};
  const name = typeof body.name === "string" ? body.name.trim() : "";
  if (name.length < 1 || name.length > 100) {
    details.name = ["name must contain between 1 and 100 characters."];
  }

  const email = typeof body.email === "string" ? body.email.trim() : "";
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    details.email = ["email must be a valid address no longer than 254 characters."];
  }

  const productId =
    typeof body.productId === "number" && Number.isSafeInteger(body.productId) && body.productId > 0
      ? body.productId
      : 0;
  if (productId === 0) {
    details.productId = ["productId must be a positive integer."];
  }

  let message: string | undefined;
  if (body.message !== undefined) {
    if (typeof body.message !== "string" || body.message.length > 2_000) {
      details.message = ["message must be a string no longer than 2000 characters."];
    } else {
      message = body.message.trim() || undefined;
    }
  }

  if (Object.keys(details).length > 0) {
    throw new AppError(
      400,
      "VALIDATION_ERROR",
      "The request is invalid.",
      details,
    );
  }

  return {
    name,
    email,
    productId,
    ...(message ? { message } : {}),
  };
}

export function createEnquiryRouter(enquiryService: EnquiryService): Router {
  const router = Router();

  router.post("/enquiries", async (request, response) => {
    await enquiryService.submit(readEnquiry(request));
    response.status(200).json({ data: { submitted: true } });
  });

  return router;
}
