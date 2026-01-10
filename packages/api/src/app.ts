import Fastify, { type FastifyInstance } from "fastify";
import cors from "@fastify/cors";
import { errorHandler } from "./middleware/error-handler.js";
import { healthRoutes } from "./routes/health.js";
import { inboxRoutes } from "./routes/inbox.js";
import { processRoutes } from "./routes/process.js";
import { entityRoutes } from "./routes/entities.js";
import { receiptRoutes, clarificationRoutes } from "./routes/receipts.js";
import { digestRoutes } from "./routes/digest.js";
import { jobRoutes } from "./routes/jobs.js";
import { createClaudeProvider, setLLMProvider, hasLLMProvider } from "./llm/index.js";

export async function buildApp(): Promise<FastifyInstance> {
  const app = Fastify({
    logger: {
      level: process.env.LOG_LEVEL || "info",
      transport:
        process.env.NODE_ENV !== "production"
          ? {
              target: "pino-pretty",
              options: {
                translateTime: "HH:MM:ss Z",
                ignore: "pid,hostname",
              },
            }
          : undefined,
    },
  });

  // Initialize LLM provider if API key is configured
  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  if (anthropicKey && anthropicKey !== "your-api-key-here") {
    const provider = createClaudeProvider({ apiKey: anthropicKey });
    setLLMProvider(provider);
    app.log.info(`LLM provider initialized: ${provider.name} (${provider.model})`);
  } else {
    app.log.warn("ANTHROPIC_API_KEY not configured - LLM features disabled");
  }

  // Register CORS
  await app.register(cors, {
    origin: process.env.CORS_ORIGIN || "http://localhost:5173",
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
  });

  // Register error handler
  app.setErrorHandler(errorHandler);

  // Register routes
  await app.register(healthRoutes);
  await app.register(inboxRoutes);
  await app.register(processRoutes);
  await app.register(entityRoutes);
  await app.register(receiptRoutes);
  await app.register(clarificationRoutes);
  await app.register(digestRoutes);
  await app.register(jobRoutes);

  return app;
}

/**
 * Check if LLM features are available
 */
export function isLLMAvailable(): boolean {
  return hasLLMProvider();
}
