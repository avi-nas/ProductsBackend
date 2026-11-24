import { Router, type Request } from "express";

import { AppError } from "../errors.js";
import type { CatalogueService } from "../services/catalogue-service.js";

function validationError(field: string, message: string): AppError {
  return new AppError(400, "VALIDATION_ERROR", "The request is invalid.", {
    [field]: [message],
  });
}

function readSearchQuery(request: Request): string {
  const value = request.query.q;
  if (typeof value !== "string") {
    throw validationError("q", "q must be a string.");
  }

  const query = value.trim();
  if (query.length === 0 || query.length > 100) {
    throw validationError("q", "q must contain between 1 and 100 characters.");
  }
  return query;
}

function readCategory(request: Request): string {
  const value = request.params.category;
  if (typeof value !== "string") {
    throw validationError("category", "category must be a string.");
  }

  const category = value.trim();
  if (!category || category.length > 100) {
    throw validationError("category", "category must contain between 1 and 100 characters.");
  }
  return category;
}

function readProductId(request: Request): number {
  const value = request.params.id;
  if (typeof value !== "string" || !/^[1-9]\d*$/.test(value)) {
    throw validationError("id", "id must be a positive integer.");
  }

  const id = Number(value);
  if (!Number.isSafeInteger(id)) {
    throw validationError("id", "id must be a positive integer.");
  }
  return id;
}

export function createCatalogueRouter(catalogueService: CatalogueService): Router {
  const router = Router();

  router.get("/home", async (_request, response) => {
    response.status(200).json({ data: await catalogueService.getHome() });
  });

  router.get("/categories", async (_request, response) => {
    response.status(200).json({ data: await catalogueService.getCategories() });
  });

  router.get("/categories/:category/products", async (request, response) => {
    response
      .status(200)
      .json({ data: await catalogueService.getCategoryProducts(readCategory(request)) });
  });

  router.get("/products/search", async (request, response) => {
    response
      .status(200)
      .json({ data: await catalogueService.searchProducts(readSearchQuery(request)) });
  });

  router.get("/products/:id", async (request, response) => {
    response.status(200).json({ data: await catalogueService.getProduct(readProductId(request)) });
  });

  return router;
}
