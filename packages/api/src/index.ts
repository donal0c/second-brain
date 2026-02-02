// @second-brain/api
// Fastify backend API

import { config } from "dotenv";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

// Load .env from monorepo root (two levels up from packages/api/src)
// Use override: true so .env takes precedence over shell environment variables
const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, "../../../.env"), override: true });

import { buildApp } from "./app.js";
import { startProcessorJob, stopProcessorJob, isProcessorJobRunning } from "./jobs/processor.js";
import { hasLLMProvider } from "./llm/index.js";

const PORT = parseInt(process.env.PORT || "3001", 10);
const HOST = process.env.HOST || "0.0.0.0";

async function main() {
  const app = await buildApp();

  // Graceful shutdown handler
  const shutdown = async (signal: string) => {
    app.log.info(`Received ${signal}, shutting down gracefully...`);

    // Stop processor job if running
    if (isProcessorJobRunning()) {
      stopProcessorJob({ info: (msg) => app.log.info(msg) });
    }

    try {
      await app.close();
      app.log.info("Server closed");
      process.exit(0);
    } catch (err) {
      app.log.error(err);
      process.exit(1);
    }
  };

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));

  try {
    await app.listen({ port: PORT, host: HOST });
    console.log(`Server running at http://${HOST}:${PORT}`);

    // Auto-start background processor job if LLM is available
    if (hasLLMProvider()) {
      startProcessorJob({
        logger: {
          info: (msg, data) => app.log.info(data ? { ...data, msg } : msg),
          error: (msg, data) => app.log.error(data ? { ...data, msg } : msg),
          warn: (msg, data) => app.log.warn(data ? { ...data, msg } : msg),
        },
      });
      app.log.info("Background processor job auto-started");
    } else {
      app.log.warn("Background processor job not started - LLM provider not configured");
    }
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

main();
