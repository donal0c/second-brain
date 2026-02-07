import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import { generateText } from "ai";
import { getStreamingProviderHint, resolveUiGenerationModel } from "../llm/streaming.js";
import { sendServiceUnavailable, sendValidationError } from "../utils/response.js";

const AgUiInteractionSchema = z
  .object({
    type: z.enum(["user_action", "user_message"]).default("user_action"),
    action: z.string().optional(),
    itemId: z.string().optional(),
    text: z.string().optional(),
  })
  .optional();

const AgUiRunSchema = z.object({
  feature: z.enum(["digest", "browse", "clarifications"]),
  payload: z.record(z.unknown()).optional().default({}),
  state: z.record(z.unknown()).optional().default({}),
  interaction: AgUiInteractionSchema,
});

function applyCorsHeaders(reply: FastifyReply, origin: string | undefined): void {
  const resolvedOrigin = origin ?? "*";
  reply.header("access-control-allow-origin", resolvedOrigin);
  reply.header("vary", "Origin");
  reply.header("access-control-allow-methods", "POST,OPTIONS");
  reply.header("access-control-allow-headers", "authorization,content-type");
  reply.raw.setHeader("access-control-allow-origin", resolvedOrigin);
  reply.raw.setHeader("vary", "Origin");
  reply.raw.setHeader("access-control-allow-methods", "POST,OPTIONS");
  reply.raw.setHeader("access-control-allow-headers", "authorization,content-type");
}

function writeEvent(reply: FastifyReply, eventType: string, payload: Record<string, unknown>): void {
  reply.raw.write(`event: ${eventType}\n`);
  reply.raw.write(`data: ${JSON.stringify({ type: eventType, ...payload })}\n\n`);
}

function buildPrompt(
  feature: "digest" | "browse" | "clarifications",
  payload: Record<string, unknown>,
  state: Record<string, unknown>,
  interaction?: z.infer<typeof AgUiInteractionSchema>
) {
  if (feature === "clarifications" && interaction?.action === "draft_answer") {
    return `You are helping a user resolve one clarification quickly.
Return exactly one concise answer sentence with no bullet points and no markdown.
Use the question/options/original text. If options are present, prefer the best matching option phrase.
Context:
${JSON.stringify({ payload, interaction, state }, null, 2)}`;
  }

  if (feature === "digest") {
    return `You are an assistant for a personal productivity app.
Summarize the daily digest payload into concise actionable insights.
Return 3-5 bullet points as plain text.
Payload:
${JSON.stringify({ payload, state, interaction: interaction ?? null }, null, 2)}`;
  }

  if (feature === "browse") {
    return `You are an assistant for a browse/search view.
Give a concise overview of patterns, priorities, and one suggested next action.
Return 2-4 bullet points as plain text.
Payload:
${JSON.stringify({ payload, state, interaction: interaction ?? null }, null, 2)}`;
  }

  return `You are an assistant for clarifications.
Given unresolved clarification items, suggest how the user should answer quickly and safely.
Return 2-4 bullet points as plain text.
Payload:
${JSON.stringify({ payload, state, interaction: interaction ?? null }, null, 2)}`;
}

function toBulletItems(text: string): string[] {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => line.replace(/^[-*]\s+/, "").replace(/^\d+\.\s+/, ""))
    .filter(Boolean);
}

function buildStateDelta(
  feature: "digest" | "browse" | "clarifications",
  payload: Record<string, unknown>,
  text: string,
  interaction?: z.infer<typeof AgUiInteractionSchema>
): Record<string, unknown> {
  const bullets = toBulletItems(text);

  if (feature === "clarifications" && interaction?.action === "draft_answer" && interaction.itemId) {
    return {
      draftAnswers: {
        [interaction.itemId]: text.trim(),
      },
      ui: {
        title: "Suggested Clarification Answer",
        blocks: [
          {
            type: "card",
            title: "Draft Answer",
            body: text.trim(),
          },
          {
            type: "actions",
            title: "Next Step",
            actions: [
              {
                id: "refine_draft",
                label: "Refine Draft",
                action: "draft_answer",
                kind: "secondary",
                payload: {
                  itemId: interaction.itemId,
                },
              },
            ],
          },
        ],
      },
    };
  }

  if (feature === "digest") {
    const pendingClarifications = Number(payload.pendingClarifications ?? 0);
    return {
      ui: {
        title: "Digest Agent Plan",
        blocks: [
          {
            type: "list",
            title: "Priorities",
            items: bullets.slice(0, 5),
          },
          {
            type: "actions",
            title: "Quick Actions",
            actions: [
              pendingClarifications > 0
                ? {
                    id: "open_clarifications",
                    label: "Review Clarifications",
                    action: "navigate",
                    kind: "primary",
                    payload: { href: "/clarifications" },
                  }
                : {
                    id: "open_browse",
                    label: "Open Browse",
                    action: "navigate",
                    kind: "secondary",
                    payload: { href: "/browse" },
                  },
            ],
          },
        ],
      },
    };
  }

  if (feature === "browse") {
    return {
      ui: {
        title: "Browse Agent Summary",
        blocks: [
          {
            type: "card",
            title: "Current Focus",
            body: `Active tab: ${String(payload.activeTab ?? "tasks")}`,
          },
          {
            type: "list",
            title: "Insights",
            items: bullets.slice(0, 4),
          },
        ],
      },
    };
  }

  return {
    ui: {
      title: "Clarification Guidance",
      blocks: [
        {
          type: "list",
          title: "How To Answer",
          items: bullets.slice(0, 4),
        },
      ],
    },
  };
}

export async function aguiRoutes(app: FastifyInstance): Promise<void> {
  app.options("/agui/run", async (request, reply) => {
    applyCorsHeaders(reply, request.headers.origin);
    return reply.status(204).send();
  });

  app.post(
    "/agui/run",
    async (
      request: FastifyRequest<{ Body: z.infer<typeof AgUiRunSchema> }>,
      reply: FastifyReply
    ) => {
      applyCorsHeaders(reply, request.headers.origin);

      const parsed = AgUiRunSchema.safeParse(request.body);
      if (!parsed.success) {
        return sendValidationError(reply, "Invalid AG-UI payload", parsed.error.flatten());
      }

      const modelConfig = resolveUiGenerationModel();
      if (!modelConfig) {
        return sendServiceUnavailable(reply, `LLM provider not configured. ${getStreamingProviderHint()}`);
      }

      reply.raw.setHeader("content-type", "text/event-stream; charset=utf-8");
      reply.raw.setHeader("cache-control", "no-cache, no-transform");
      reply.raw.setHeader("connection", "keep-alive");

      const { feature, payload, state, interaction } = parsed.data;
      writeEvent(reply, "RUN_STARTED", {
        feature,
        provider: modelConfig.provider,
        model: modelConfig.modelName,
      });
      writeEvent(reply, "TOOL_CALL_START", {
        tool: "ui_generation",
      });

      try {
        const toolStart = Date.now();
        const result = await generateText({
          model: modelConfig.model,
          prompt: buildPrompt(feature, payload, state, interaction),
        });
        writeEvent(reply, "TOOL_CALL_END", {
          tool: "ui_generation",
          success: true,
          durationMs: Date.now() - toolStart,
        });

        const text = result.text.trim();
        const stateDelta = buildStateDelta(feature, payload, text, interaction);
        writeEvent(reply, "STATE_DELTA", { delta: stateDelta });
        if (text.length > 0) {
          writeEvent(reply, "TEXT_MESSAGE_CONTENT", { content: text });
        }
        writeEvent(reply, "RUN_FINISHED", { success: true });
      } catch (error) {
        writeEvent(reply, "TOOL_CALL_END", {
          tool: "ui_generation",
          success: false,
        });
        writeEvent(reply, "RUN_FINISHED", {
          success: false,
          error: error instanceof Error ? error.message : "AG-UI run failed",
        });
      } finally {
        reply.raw.end();
      }

      return reply;
    }
  );
}
