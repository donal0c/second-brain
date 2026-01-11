import type { FastifyError, FastifyReply, FastifyRequest } from "fastify";
import { ZodError } from "zod";

interface ErrorResponse {
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export function errorHandler(
  error: FastifyError,
  _request: FastifyRequest,
  reply: FastifyReply
): void {
  const response: ErrorResponse = {
    error: {
      code: "INTERNAL_ERROR",
      message: "An unexpected error occurred",
    },
  };

  // Handle Zod validation errors
  if (error instanceof ZodError) {
    response.error.code = "VALIDATION_ERROR";
    response.error.message = "Request validation failed";
    response.error.details = error.errors.map((e) => ({
      path: e.path.join("."),
      message: e.message,
    }));
    reply.status(400).send(response);
    return;
  }

  // Handle Fastify validation errors
  if (error.validation) {
    response.error.code = "VALIDATION_ERROR";
    response.error.message = error.message;
    response.error.details = error.validation;
    reply.status(400).send(response);
    return;
  }

  // Handle known HTTP errors
  if (error.statusCode && error.statusCode < 500) {
    response.error.code = error.code || "CLIENT_ERROR";
    response.error.message = error.message;
    reply.status(error.statusCode).send(response);
    return;
  }

  // Log server errors
  reply.log.error(error);

  // Don't expose internal error details in production
  if (process.env.NODE_ENV !== "production") {
    response.error.message = error.message;
    response.error.details = error.stack;
  }

  reply.status(500).send(response);
}
