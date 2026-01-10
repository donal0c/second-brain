import type { FastifyError, FastifyReply, FastifyRequest } from "fastify";
import { ZodError } from "zod";

interface ErrorResponse {
  statusCode: number;
  error: string;
  message: string;
  details?: unknown;
}

export function errorHandler(
  error: FastifyError,
  _request: FastifyRequest,
  reply: FastifyReply
): void {
  const response: ErrorResponse = {
    statusCode: 500,
    error: "Internal Server Error",
    message: "An unexpected error occurred",
  };

  // Handle Zod validation errors
  if (error instanceof ZodError) {
    response.statusCode = 400;
    response.error = "Validation Error";
    response.message = "Request validation failed";
    response.details = error.errors.map((e) => ({
      path: e.path.join("."),
      message: e.message,
    }));
    reply.status(400).send(response);
    return;
  }

  // Handle Fastify validation errors
  if (error.validation) {
    response.statusCode = 400;
    response.error = "Validation Error";
    response.message = error.message;
    response.details = error.validation;
    reply.status(400).send(response);
    return;
  }

  // Handle known HTTP errors
  if (error.statusCode && error.statusCode < 500) {
    response.statusCode = error.statusCode;
    response.error = error.name || "Client Error";
    response.message = error.message;
    reply.status(error.statusCode).send(response);
    return;
  }

  // Log server errors
  reply.log.error(error);

  // Don't expose internal error details in production
  if (process.env.NODE_ENV !== "production") {
    response.message = error.message;
    response.details = error.stack;
  }

  reply.status(500).send(response);
}
