import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { rawDb } from "../db/index.js";

interface HealthResponse {
  status: "healthy" | "unhealthy";
  database: "connected" | "disconnected";
  timestamp: string;
  version: string;
  uptime: number;
  errors?: string[];
}

async function checkDatabase(): Promise<{ connected: boolean; error?: string }> {
  try {
    await rawDb`SELECT 1`;
    return { connected: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown database error";
    return { connected: false, error: message };
  }
}

function checkEnvironmentVariables(): string[] {
  const errors: string[] = [];
  const required = ["DATABASE_URL"];
  const recommended = ["ANTHROPIC_API_KEY"];

  for (const envVar of required) {
    if (!process.env[envVar]) {
      errors.push(`Missing required environment variable: ${envVar}`);
    }
  }

  for (const envVar of recommended) {
    const value = process.env[envVar];
    if (!value || value === "your-api-key-here") {
      errors.push(`Missing ${envVar} - LLM features disabled`);
    }
  }

  return errors;
}

export async function healthRoutes(app: FastifyInstance): Promise<void> {
  app.get("/health", async (_request: FastifyRequest, _reply: FastifyReply): Promise<HealthResponse> => {
    const errors: string[] = [];

    // Check database connection
    const dbCheck = await checkDatabase();
    if (!dbCheck.connected) {
      errors.push(`Database connection failed: ${dbCheck.error}`);
    }

    // Check environment variables
    const envErrors = checkEnvironmentVariables();
    errors.push(...envErrors);

    // Determine overall status - unhealthy if database is down
    const isHealthy = dbCheck.connected;

    const response: HealthResponse = {
      status: isHealthy ? "healthy" : "unhealthy",
      database: dbCheck.connected ? "connected" : "disconnected",
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || "0.1.0",
      uptime: process.uptime(),
    };

    if (errors.length > 0) {
      response.errors = errors;
    }

    return response;
  });
}
