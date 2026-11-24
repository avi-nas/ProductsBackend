import type { ErrorRequestHandler, NextFunction, Request, RequestHandler, Response } from "express";

import { AppError } from "../errors.js";

interface ErrorResponse {
  error: {
    code: string;
    message: string;
    details?: Readonly<Record<string, readonly string[]>>;
  };
}

function isBodyParserError(error: unknown, type: string): boolean {
  if (typeof error !== "object" || error === null) {
    return false;
  }

  const candidate = error as { type?: unknown };
  return candidate.type === type;
}

function sendAppError(error: AppError, response: Response): void {
  const body: ErrorResponse = {
    error: {
      code: error.code,
      message: error.message,
    },
  };

  if (error.details !== undefined) {
    body.error.details = error.details;
  }

  response.status(error.statusCode).json(body);
}

export const notFoundHandler: RequestHandler = (
  _request: Request,
  _response: Response,
  next: NextFunction,
): void => {
  next(new AppError(404, "ROUTE_NOT_FOUND", "The requested route was not found."));
};

export const errorHandler: ErrorRequestHandler = (
  error: unknown,
  _request: Request,
  response: Response,
  next: NextFunction,
): void => {
  if (response.headersSent) {
    next(error);
    return;
  }

  if (error instanceof AppError) {
    sendAppError(error, response);
    return;
  }

  if (isBodyParserError(error, "entity.parse.failed")) {
    sendAppError(new AppError(400, "INVALID_JSON", "Request body must contain valid JSON."), response);
    return;
  }

  if (isBodyParserError(error, "entity.too.large")) {
    sendAppError(new AppError(413, "PAYLOAD_TOO_LARGE", "Request body exceeds the 16 KB limit."), response);
    return;
  }

  console.error("Unhandled request error", error);
  sendAppError(new AppError(500, "INTERNAL_ERROR", "An unexpected error occurred."), response);
};
