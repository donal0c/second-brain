import { z } from "zod";
import { registerTool } from "./registry.js";

registerTool({
  name: "browseTaskListView",
  description: "Compact checklist for task-focused queries.",
  contexts: ["browse"],
  inputSchema: z.object({
    reason: z.string().optional(),
  }),
  execute: async (input) => input,
  componentType: "BrowseTaskList",
});

registerTool({
  name: "browseProjectKanbanView",
  description: "Kanban columns by status for project overview.",
  contexts: ["browse"],
  inputSchema: z.object({
    reason: z.string().optional(),
  }),
  execute: async (input) => input,
  componentType: "BrowseKanban",
});

registerTool({
  name: "browseTimelineView",
  description: "Chronological timeline for date-related searches.",
  contexts: ["browse"],
  inputSchema: z.object({
    reason: z.string().optional(),
  }),
  execute: async (input) => input,
  componentType: "BrowseTimeline",
});

registerTool({
  name: "browseCalendarView",
  description: "Calendar grid for scheduling queries.",
  contexts: ["browse"],
  inputSchema: z.object({
    reason: z.string().optional(),
  }),
  execute: async (input) => input,
  componentType: "BrowseCalendar",
});
