import express, { type Express } from "express";

import { errorHandler, notFoundHandler } from "./middleware/error-handler.js";

export function createApp(): Express {
  const app = express();

  app.disable("x-powered-by");
  app.use(express.json({ limit: "16kb" }));

  app.get("/health", (_request, response) => {
    response.status(200).json({ status: "ok" });
  });

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
