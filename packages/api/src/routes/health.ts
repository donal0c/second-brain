import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";

interface HealthResponse {
  status: "ok" | "degraded" | "error";
  timestamp: string;
  version: string;
  uptime: number;
}

export async function healthRoutes(app: FastifyInstance): Promise<void> {
  app.get("/health", async (_request: FastifyRequest, _reply: FastifyReply): Promise<HealthResponse> => {
    return {
      status: "ok",
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || "0.1.0",
      uptime: process.uptime(),
    };
  });
}
