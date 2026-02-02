import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import { consumeStream, streamText } from "ai";
import { Readable } from "node:stream";
import { getToolsForContext } from "../llm/tools/index.js";
import { getStreamingProviderHint, resolveStreamingModel } from "../llm/streaming.js";
import { BROWSE_UI_SPEC_SYSTEM_PROMPT } from "../llm/prompts/ui-generation.js";
import { sendServiceUnavailable, sendValidationError } from "../utils/response.js";

const BrowseStreamSchema = z.object({
  viewContext: z.object({
    tab: z.enum(["tasks", "projects", "ideas", "persons"]),
    search: z.string().optional(),
  }),
  entities: z
    .object({
      tasks: z.array(z.object({ title: z.string(), type: z.literal("task") })).optional(),
      projects: z.array(z.object({ title: z.string(), type: z.literal("project") })).optional(),
      ideas: z.array(z.object({ title: z.string(), type: z.literal("idea") })).optional(),
      persons: z.array(z.object({ title: z.string(), type: z.literal("person") })).optional(),
    })
    .optional(),
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

function detectBrowseIntent(tab: "tasks" | "projects" | "ideas" | "persons", search?: string) {
  const query = (search ?? "").toLowerCase().trim();
  if (query) {
    if (/(urgent|overdue|asap|today|now)\b/.test(query)) return "urgent";
    if (/(plan|planning|schedule|week|calendar|roadmap)\b/.test(query)) return "planning";
    if (/(idea|brainstorm|explore|inspire|discover)\b/.test(query)) return "explore";
    if (/(review|status|progress|health|summary)\b/.test(query)) return "review";
  }
  if (tab === "ideas") return "explore";
  if (tab === "projects") return "review";
  if (tab === "tasks") return "planning";
  return "review";
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
        tools: getToolsForContext("browse-spec"),
        messages: [
          {
            role: "system",
            content:
              BROWSE_UI_SPEC_SYSTEM_PROMPT +
              "\nReturn a UISpec in JSON by calling the tool `browseUiSpec`.",
          },
          {
            role: "user",
            content: JSON.stringify({
              ...parseResult.data,
              intent: detectBrowseIntent(
                parseResult.data.viewContext.tab,
                parseResult.data.viewContext.search
              ),
              examples: {
                tasks: parseResult.data.viewContext.tab === "tasks" ? "task list" : undefined,
              },
            }),
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
