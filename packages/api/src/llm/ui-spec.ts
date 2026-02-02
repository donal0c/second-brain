import { z } from "zod";

export const UISpecSectionSchema = z.object({
  id: z.string().min(1),
  type: z.enum([
    "alert",
    "entity-card",
    "entity-list",
    "action-list",
    "summary",
    "chart",
    "timeline",
    "calendar",
    "empty-state",
  ]),
  title: z.string().optional(),
  style: z.enum(["urgent", "info", "success", "warning", "neutral"]).optional(),
  data: z.record(z.any()).default({}),
  actions: z
    .array(
      z.object({
        label: z.string(),
        action: z.string(),
        primary: z.boolean().optional(),
      })
    )
    .optional(),
});

export const UISpecSchema = z.object({
  layout: z.enum(["priority-focused", "exploration", "planning", "review", "minimal"]),
  sections: z.array(UISpecSectionSchema).min(1),
  emphasis: z
    .object({
      urgency: z.enum(["low", "medium", "high"]).optional(),
      tone: z.enum(["actionable", "reflective", "celebratory", "informational"]).optional(),
      density: z.enum(["compact", "comfortable", "spacious"]).optional(),
    })
    .optional(),
  context: z
    .object({
      intent: z.string(),
      timeframe: z.string().optional(),
    })
    .optional(),
});

export type UISpec = z.infer<typeof UISpecSchema>;
export type UISpecSection = z.infer<typeof UISpecSectionSchema>;
