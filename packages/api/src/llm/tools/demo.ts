import { z } from "zod";
import { registerTool } from "./registry.js";

registerTool({
  name: "echo",
  description: "Echo back text with a timestamp for UI streaming demos.",
  inputSchema: z.object({
    text: z.string().min(1, "Text is required"),
  }),
  execute: async ({ text }) => ({
    text,
    receivedAt: new Date().toISOString(),
  }),
  componentType: "echo-card",
});
