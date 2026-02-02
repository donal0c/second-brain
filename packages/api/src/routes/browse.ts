import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import { consumeStream, streamText } from "ai";
import { Readable } from "node:stream";
import { getToolsForContext } from "../llm/tools/index.js";
import { getStreamingProviderHint, resolveStreamingModel } from "../llm/streaming.js";
import { sendServiceUnavailable, sendValidationError } from "../utils/response.js";

const BrowseStreamSchema = z.object({
  viewContext: z.object({
    tab: z.enum(["tasks", "projects", "ideas", "persons"]),
    search: z.string().optional(),
  }),
  counts: z
    .object({
      tasks: z.number().int().min(0).optional(),
      projects: z.number().int().min(0).optional(),
      ideas: z.number().int().min(0).optional(),
      persons: z.number().int().min(0).optional(),
    })
    .optional(),
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

export async function browseRoutes(app: FastifyInstance): Promise<void> {
  app.options("/browse/stream", async (request, reply) => {
    applyCorsHeaders(reply, request.headers.origin);
    return reply.status(204).send();
  });

  app.post(
    "/browse/stream",
    async (
      request: FastifyRequest<{ Body: z.infer<typeof BrowseStreamSchema> }>,
      reply: FastifyReply
    ) => {
      const parseResult = BrowseStreamSchema.safeParse(request.body);
      if (!parseResult.success) {
        return sendValidationError(reply, "Invalid browse stream payload", parseResult.error.flatten());
      }

      const modelConfig = resolveStreamingModel();
      if (!modelConfig) {
        return sendServiceUnavailable(reply, `LLM provider not configured. ${getStreamingProviderHint()}`);
      }

      const controller = new AbortController();
      request.raw.on("aborted", () => controller.abort());
      reply.raw.on("close", () => {
        if (!reply.raw.writableEnded) {
          controller.abort();
        }
      });
      reply.raw.on("error", () => controller.abort());

      const result = streamText({
        model: modelConfig.model,
        tools: getToolsForContext("browse"),
        messages: [
          {
            role: "system",
            content:
              "Choose the best browse layout for the user's current tab and search context. " +
              "Use browseTaskListView for task-focused views, browseProjectKanbanView for project overviews, " +
              "browseTimelineView for time-based queries, and browseCalendarView for scheduling-focused queries. " +
              "Always call exactly one tool.",
          },
          {
            role: "user",
            content: JSON.stringify(parseResult.data),
          },
        ],
        abortSignal: controller.signal,
      });

      const response = result.toUIMessageStreamResponse({
        consumeSseStream: consumeStream,
      });
      const headers = Object.fromEntries(response.headers.entries());
      mergeCorsHeaders(headers, request.headers.origin);
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
