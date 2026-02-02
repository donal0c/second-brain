import { z } from "zod";
import { registerTool } from "./registry.js";
import { UISpecSchema } from "../ui-spec.js";

const taskSchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(1),
  dueDate: z.string().nullable().optional(),
});

const projectSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  updatedAt: z.string().optional(),
});

const ideaSchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(1),
  summary: z.string().nullable().optional(),
});

const personSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  lastContact: z.string().nullable().optional(),
});

const deadlineSchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(1),
  dueDate: z.string().nullable().optional(),
  type: z.enum(["task", "project", "idea", "person"]),
});

const statsSchema = z.object({
  activeTasks: z.number().int().min(0),
  activeProjects: z.number().int().min(0),
  ideas: z.number().int().min(0),
});

registerTool({
  name: "digestUrgentTasksCard",
  description: "Show tasks due today or overdue - use when user has urgent pending work.",
  contexts: ["digest"],
  inputSchema: z.object({
    tasks: z.array(taskSchema),
  }),
  execute: async (input) => input,
  componentType: "DigestUrgentTasks",
});

registerTool({
  name: "digestUiSpec",
  description: "Return a declarative UI specification for the digest.",
  contexts: ["digest-spec"],
  inputSchema: UISpecSchema,
  execute: async (input) => input,
  componentType: "UISpec",
});

registerTool({
  name: "digestStaleProjectsAlert",
  description: "Warn about projects with no activity - use when projects are stagnating.",
  contexts: ["digest"],
  inputSchema: z.object({
    projects: z.array(projectSchema),
    staleDays: z.number().int().min(1),
  }),
  execute: async (input) => input,
  componentType: "DigestStaleProjects",
});

registerTool({
  name: "digestUpcomingDeadlines",
  description: "Show timeline of upcoming due dates - use when multiple deadlines approaching.",
  contexts: ["digest"],
  inputSchema: z.object({
    items: z.array(deadlineSchema),
  }),
  execute: async (input) => input,
  componentType: "DigestTimeline",
});

registerTool({
  name: "digestIdeaNudge",
  description: "Surface a relevant idea worth revisiting - use when user has idle ideas.",
  contexts: ["digest"],
  inputSchema: z.object({
    idea: ideaSchema,
    reason: z.string().min(1),
  }),
  execute: async (input) => input,
  componentType: "DigestIdeaNudge",
});

registerTool({
  name: "digestPersonReminder",
  description: "Remind about person contact - use when relationship needs attention.",
  contexts: ["digest"],
  inputSchema: z.object({
    person: personSchema,
    suggestion: z.string().min(1),
  }),
  execute: async (input) => input,
  componentType: "DigestPersonReminder",
});

registerTool({
  name: "digestStatsOverview",
  description: "Show productivity stats - use for general status update.",
  contexts: ["digest"],
  inputSchema: z.object({
    stats: statsSchema,
  }),
  execute: async (input) => input,
  componentType: "DigestStats",
});
