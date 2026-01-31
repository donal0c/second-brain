import Fastify, { type FastifyInstance } from "fastify";
import cors from "@fastify/cors";
import { errorHandler } from "./middleware/error-handler.js";
import { authMiddleware } from "./middleware/auth.js";
import { healthRoutes } from "./routes/health.js";
import { inboxRoutes } from "./routes/inbox.js";
import { processRoutes } from "./routes/process.js";
import { entityRoutes } from "./routes/entities.js";
import { receiptRoutes, clarificationRoutes } from "./routes/receipts.js";
import { digestRoutes } from "./routes/digest.js";
import { nudgeRoutes } from "./routes/nudges.js";
import { jobRoutes } from "./routes/jobs.js";
import { contextRoutes } from "./routes/context.js";
import { searchRoutes } from "./routes/search.js";
import { similarityRoutes } from "./routes/similarity.js";
import { createOpenAIProvider, setLLMProvider, hasLLMProvider } from "./llm/index.js";

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
  const openaiKey = process.env.OPENAI_API_KEY;
  if (openaiKey && openaiKey !== "your-openai-key-here") {
    const provider = createOpenAIProvider({ apiKey: openaiKey });
    setLLMProvider(provider);
    app.log.info(`LLM provider initialized: ${provider.name} (${provider.model})`);
  } else {
    app.log.warn("OPENAI_API_KEY not configured - LLM features disabled");
  }

  const corsOriginEnv = process.env.CORS_ORIGIN;
  const corsOrigins = corsOriginEnv
    ? corsOriginEnv.split(",").map((origin) => origin.trim()).filter(Boolean)
    : null;
  const corsOrigin =
    corsOrigins && corsOrigins.length > 0
      ? corsOrigins
      : process.env.NODE_ENV === "production"
        ? true
        : ["http://localhost:5173", "http://localhost:5174"];

  if (process.env.NODE_ENV === "production" && (!corsOrigins || corsOrigins.length === 0)) {
    app.log.warn("CORS_ORIGIN not set in production - allowing all origins");
  }

  // Register CORS
  await app.register(cors, {
    origin: corsOrigin,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
  });

  // Register error handler
  app.setErrorHandler(errorHandler);

  // Register public routes (no auth required)
  await app.register(healthRoutes);

  // Register protected routes (auth required)
  await app.register(inboxRoutes, { preHandler: authMiddleware });
  await app.register(processRoutes, { preHandler: authMiddleware });
  await app.register(entityRoutes, { preHandler: authMiddleware });
  await app.register(receiptRoutes, { preHandler: authMiddleware });
  await app.register(clarificationRoutes, { preHandler: authMiddleware });
  await app.register(digestRoutes, { preHandler: authMiddleware });
  await app.register(jobRoutes, { preHandler: authMiddleware });
  await app.register(contextRoutes, { preHandler: authMiddleware });
  await app.register(searchRoutes, { preHandler: authMiddleware });
  await app.register(similarityRoutes, { preHandler: authMiddleware });
  await app.register(nudgeRoutes, { preHandler: authMiddleware });

  return app;
}

/**
 * Check if LLM features are available
 */
export function isLLMAvailable(): boolean {
  return hasLLMProvider();
}
