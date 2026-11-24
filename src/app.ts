import express, { type Express } from "express";

import { errorHandler, notFoundHandler } from "./middleware/error-handler.js";
import { createCatalogueRouter } from "./routes/catalogue.js";
import { createEnquiryRouter } from "./routes/enquiries.js";
import type { CatalogueService } from "./services/catalogue-service.js";
import type { EnquiryService } from "./services/enquiry-service.js";

export interface AppDependencies {
  readonly catalogueService: CatalogueService;
  readonly enquiryService: EnquiryService;
}

export function createApp(dependencies: AppDependencies): Express {
  const app = express();

  app.disable("x-powered-by");
  app.use(express.json({ limit: "16kb" }));

  app.get("/health", (_request, response) => {
    response.status(200).json({ status: "ok" });
  });

  app.use("/api/v1", createCatalogueRouter(dependencies.catalogueService));
  app.use("/api/v1", createEnquiryRouter(dependencies.enquiryService));

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
