import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import { consumeStream, streamText } from "ai";
import { Readable } from "node:stream";
import { getEnabledTools } from "../llm/tools/index.js";
import { sendServiceUnavailable, sendValidationError } from "../utils/response.js";
import { getStreamingProviderHint, resolveStreamingModel } from "../llm/streaming.js";

const StreamRequestSchema = z.object({
  messages: z.array(z.any()),
  context: z.unknown().optional(),
});

function applyCorsHeaders(reply: FastifyReply, origin: string | undefined): void {
  const resolvedOrigin = origin ?? "*";
  reply.header("access-control-allow-origin", resolvedOrigin);
  reply.header("vary", "Origin");
  reply.header("access-control-allow-methods", "POST,OPTIONS");
  reply.header("access-control-allow-headers", "authorization,content-type");
}

function mergeCorsHeaders(headers: Record<string, string>, origin: string | undefined): void {
  headers["access-control-allow-origin"] = origin ?? "*";
  headers["vary"] = "Origin";
  headers["access-control-allow-methods"] = "POST,OPTIONS";
  headers["access-control-allow-headers"] = "authorization,content-type";
}

export async function streamRoutes(app: FastifyInstance): Promise<void> {
  app.options("/stream", async (req, reply) => {
    applyCorsHeaders(reply, req.headers.origin);
    return reply.status(204).send();
  });

  app.post(
    "/stream",
    async (
      req: FastifyRequest<{ Body: z.infer<typeof StreamRequestSchema> }>,
      reply: FastifyReply
    ) => {
      const parsed = StreamRequestSchema.safeParse(req.body);
      if (!parsed.success) {
        return sendValidationError(reply, "Invalid stream payload", parsed.error.flatten());
      }

      const modelConfig = resolveStreamingModel();
      if (!modelConfig) {
        return sendServiceUnavailable(reply, `LLM provider not configured. ${getStreamingProviderHint()}`);
      }

      const controller = new AbortController();
      req.raw.on("aborted", () => controller.abort());
      reply.raw.on("close", () => {
        if (!reply.raw.writableEnded) {
          controller.abort();
        }
      });
      reply.raw.on("error", () => controller.abort());

      const result = streamText({
        model: modelConfig.model,
        messages: parsed.data.messages,
        tools: getEnabledTools(parsed.data.context),
        abortSignal: controller.signal,
      });

      const response = result.toUIMessageStreamResponse({
        consumeSseStream: consumeStream,
      });
      const headers = Object.fromEntries(response.headers.entries());
      mergeCorsHeaders(headers, req.headers.origin);
      for (const [key, value] of Object.entries(headers)) {
        reply.raw.setHeader(key, value);
      }
      reply.raw.statusCode = response.status;

      if (!response.body) {
        reply.raw.end();
        return reply;
      }

      Readable.fromWeb(response.body as unknown as ReadableStream).pipe(reply.raw);
      return reply;
    }
  );
}
