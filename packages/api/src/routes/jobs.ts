import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { z } from "zod";
import {
  startProcessorJob,
  stopProcessorJob,
  isProcessorJobRunning,
  isProcessingCycleInProgress,
  runProcessingCycle,
} from "../jobs/processor.js";
import { hasLLMProvider } from "../llm/index.js";

// =============================================================================
// Request Schemas
// =============================================================================

const TriggerBodySchema = z.object({
  batchSize: z.number().min(1).max(50).optional().default(10),
});

// =============================================================================
// Job Routes
// =============================================================================

export async function jobRoutes(app: FastifyInstance): Promise<void> {
  /**
   * GET /jobs/processor/status - Get processor job status
   */
  app.get("/jobs/processor/status", async (_request: FastifyRequest, reply: FastifyReply) => {
    return reply.send({
      jobRunning: isProcessorJobRunning(),
      cycleInProgress: isProcessingCycleInProgress(),
      llmAvailable: hasLLMProvider(),
    });
  });

  /**
   * POST /jobs/processor/start - Start the processor job
   */
  app.post("/jobs/processor/start", async (request: FastifyRequest, reply: FastifyReply) => {
    if (!hasLLMProvider()) {
      return reply.status(503).send({
        error: "Service unavailable",
        message: "LLM provider not configured. Set ANTHROPIC_API_KEY to enable processing.",
      });
    }

    if (isProcessorJobRunning()) {
      return reply.status(409).send({
        error: "Conflict",
        message: "Processor job is already running",
      });
    }

    startProcessorJob({
      logger: request.log as unknown as {
        info: (msg: string, data?: Record<string, unknown>) => void;
        error: (msg: string, data?: Record<string, unknown>) => void;
        warn: (msg: string, data?: Record<string, unknown>) => void;
      },
    });

    return reply.send({
      message: "Processor job started",
      status: "running",
    });
  });

  /**
   * POST /jobs/processor/stop - Stop the processor job
   */
  app.post("/jobs/processor/stop", async (request: FastifyRequest, reply: FastifyReply) => {
    if (!isProcessorJobRunning()) {
      return reply.status(409).send({
        error: "Conflict",
        message: "Processor job is not running",
      });
    }

    stopProcessorJob(request.log as unknown as { info: (msg: string) => void });

    return reply.send({
      message: "Processor job stopped",
      status: "stopped",
    });
  });

  /**
   * POST /jobs/processor/trigger - Manually trigger a processing cycle
   */
  app.post(
    "/jobs/processor/trigger",
    async (
      request: FastifyRequest<{ Body: z.infer<typeof TriggerBodySchema> }>,
      reply: FastifyReply
    ) => {
      if (!hasLLMProvider()) {
        return reply.status(503).send({
          error: "Service unavailable",
          message: "LLM provider not configured. Set ANTHROPIC_API_KEY to enable processing.",
        });
      }

      const parseResult = TriggerBodySchema.safeParse(request.body || {});
      if (!parseResult.success) {
        return reply.status(400).send({
          error: "Validation failed",
          details: parseResult.error.flatten().fieldErrors,
        });
      }

      const result = await runProcessingCycle({
        batchSize: parseResult.data.batchSize,
        logger: request.log as unknown as {
          info: (msg: string, data?: Record<string, unknown>) => void;
          error: (msg: string, data?: Record<string, unknown>) => void;
          warn: (msg: string, data?: Record<string, unknown>) => void;
        },
      });

      if (result.error) {
        return reply.status(500).send({
          error: "Processing failed",
          message: result.error,
          processed: result.processed,
        });
      }

      return reply.send({
        message: "Processing cycle complete",
        processed: result.processed,
        results: result.results.map((r) => ({
          inboxItemId: r.inboxItemId,
          action: r.action,
          classification: r.classification.classification,
          confidence: r.classification.confidence,
        })),
      });
    }
  );
}
