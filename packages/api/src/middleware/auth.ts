import type { FastifyRequest, FastifyReply } from "fastify";

/**
 * Authentication middleware for API routes
 * Validates Bearer token against API_AUTH_TOKEN environment variable
 */
export async function authMiddleware(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  // Skip auth if no token is configured (development mode)
  const configuredToken = process.env.API_AUTH_TOKEN;
  if (!configuredToken || configuredToken === "your-secret-token-here") {
    return;
  }

  // Extract token from Authorization header
  const authHeader = request.headers.authorization;
  if (!authHeader) {
    return reply.status(401).send({
      error: {
        code: "UNAUTHORIZED",
        message: "Missing Authorization header",
      },
    });
  }

  // Check if it's a Bearer token
  const [scheme, token] = authHeader.split(" ");
  if (scheme !== "Bearer" || !token) {
    return reply.status(401).send({
      error: {
        code: "UNAUTHORIZED",
        message: "Invalid Authorization header format. Expected: Bearer <token>",
      },
    });
  }

  // Validate token
  if (token !== configuredToken) {
    return reply.status(401).send({
      error: {
        code: "UNAUTHORIZED",
        message: "Invalid authentication token",
      },
    });
  }
}

/**
 * Optional auth middleware that allows requests without auth
 * but validates the token if present
 */
export async function optionalAuthMiddleware(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const configuredToken = process.env.API_AUTH_TOKEN;
  if (!configuredToken || configuredToken === "your-secret-token-here") {
    return;
  }

  const authHeader = request.headers.authorization;
  if (!authHeader) {
    return;
  }

  const [scheme, token] = authHeader.split(" ");
  if (scheme !== "Bearer" || !token) {
    return reply.status(401).send({
      error: {
        code: "UNAUTHORIZED",
        message: "Invalid Authorization header format. Expected: Bearer <token>",
      },
    });
  }

  if (token !== configuredToken) {
    return reply.status(401).send({
      error: {
        code: "UNAUTHORIZED",
        message: "Invalid authentication token",
      },
    });
  }
}
