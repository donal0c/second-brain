// =============================================================================
// API Response Envelope Utilities
// =============================================================================
// Provides consistent response structure across all API endpoints.
// Standard format: { data, error, meta }

import type { FastifyReply } from "fastify";

// =============================================================================
// Types
// =============================================================================

export interface PaginationMeta {
  total: number;
  limit: number;
  offset: number;
}

export interface ApiMeta extends Partial<PaginationMeta> {
  [key: string]: unknown;
}

export interface ApiSuccessResponse<T> {
  data: T;
  meta?: ApiMeta;
}

export interface ApiErrorDetail {
  code: string;
  message: string;
  details?: unknown;
}

export interface ApiErrorResponse {
  error: ApiErrorDetail;
}

// =============================================================================
// Success Response Helpers
// =============================================================================

/**
 * Send a success response with data
 */
export function sendData<T>(reply: FastifyReply, data: T, meta?: ApiMeta): FastifyReply {
  const response: ApiSuccessResponse<T> = { data };
  if (meta && Object.keys(meta).length > 0) {
    response.meta = meta;
  }
  return reply.send(response);
}

/**
 * Send a paginated list response
 */
export function sendList<T>(
  reply: FastifyReply,
  items: T[],
  pagination: PaginationMeta,
  extraMeta?: Record<string, unknown>
): FastifyReply {
  return sendData(reply, items, { ...pagination, ...extraMeta });
}

/**
 * Send a success response for create operations (201)
 */
export function sendCreated<T>(reply: FastifyReply, data: T, meta?: ApiMeta): FastifyReply {
  return reply.status(201).send({ data, ...(meta ? { meta } : {}) });
}

/**
 * Send a no-content response for delete operations (204)
 */
export function sendNoContent(reply: FastifyReply): FastifyReply {
  return reply.status(204).send();
}

// =============================================================================
// Error Response Helpers
// =============================================================================

/**
 * Send an error response
 */
export function sendError(
  reply: FastifyReply,
  statusCode: number,
  code: string,
  message: string,
  details?: unknown
): FastifyReply {
  const response: ApiErrorResponse = {
    error: { code, message },
  };
  if (details !== undefined) {
    response.error.details = details;
  }
  return reply.status(statusCode).send(response);
}

/**
 * Send a 400 Bad Request error
 */
export function sendBadRequest(
  reply: FastifyReply,
  message: string,
  details?: unknown
): FastifyReply {
  return sendError(reply, 400, "BAD_REQUEST", message, details);
}

/**
 * Send a 400 Validation error
 */
export function sendValidationError(
  reply: FastifyReply,
  message: string,
  details?: unknown
): FastifyReply {
  return sendError(reply, 400, "VALIDATION_ERROR", message, details);
}

/**
 * Send a 404 Not Found error
 */
export function sendNotFound(reply: FastifyReply, resource: string): FastifyReply {
  return sendError(reply, 404, "NOT_FOUND", `${resource} not found`);
}

/**
 * Send a 409 Conflict error
 */
export function sendConflict(reply: FastifyReply, message: string): FastifyReply {
  return sendError(reply, 409, "CONFLICT", message);
}

/**
 * Send a 503 Service Unavailable error
 */
export function sendServiceUnavailable(reply: FastifyReply, message: string): FastifyReply {
  return sendError(reply, 503, "SERVICE_UNAVAILABLE", message);
}

/**
 * Send a 500 Internal Server Error
 */
export function sendInternalError(reply: FastifyReply, message: string): FastifyReply {
  return sendError(reply, 500, "INTERNAL_ERROR", message);
}
