import { z } from "zod";
import { registerTool } from "./registry.js";
import { UISpecSchema } from "../ui-spec.js";

const optionSchema = z.object({
  label: z.string().min(1),
  value: z.string().min(1),
});

registerTool({
  name: "clarificationMultipleChoice",
  description:
    "Present multiple choice options when user needs to select from known options.",
  contexts: ["clarification"],
  inputSchema: z.object({
    question: z.string().min(1),
    options: z.array(optionSchema).min(1),
  }),
  execute: async (input) => input,
  componentType: "ClarificationMultipleChoice",
});

registerTool({
  name: "clarificationFreeText",
  description: "Request additional context when more information is needed.",
  contexts: ["clarification"],
  inputSchema: z.object({
    prompt: z.string().min(1),
    placeholder: z.string().optional(),
  }),
  execute: async (input) => input,
  componentType: "ClarificationFreeText",
});

registerTool({
  name: "clarificationEntityPicker",
  description: "Show similar existing entities when potential duplicate detected.",
  contexts: ["clarification"],
  inputSchema: z.object({
    candidates: z.array(
      z.object({
        id: z.string().uuid(),
        name: z.string().min(1),
        type: z.enum(["task", "project", "idea", "person"]),
      })
    ),
    newItemPreview: z.object({
      name: z.string().min(1),
      type: z.enum(["task", "project", "idea", "person"]),
    }),
  }),
  execute: async (input) => input,
  componentType: "ClarificationEntityPicker",
});

registerTool({
  name: "clarificationDatePicker",
  description: "Request date/time when temporal information is ambiguous.",
  contexts: ["clarification"],
  inputSchema: z.object({
    prompt: z.string().min(1),
    suggestedDates: z.array(z.string()).optional(),
  }),
  execute: async (input) => input,
  componentType: "ClarificationDatePicker",
});

registerTool({
  name: "clarificationUiSpec",
  description: "Return a declarative UI specification for clarification flows.",
  contexts: ["clarification-spec"],
  inputSchema: UISpecSchema,
  execute: async (input) => input,
  componentType: "UISpec",
});
