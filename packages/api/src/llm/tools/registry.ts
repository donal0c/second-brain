import { z } from "zod";
import { tool, type Tool } from "ai";

export interface UITool<TInput, TOutput extends Record<string, unknown>> {
  name: string;
  description: string;
  inputSchema: z.ZodType<TInput>;
  execute: (input: TInput) => Promise<TOutput>;
  componentType: string; // Maps to React component
  contexts?: string[]; // Optional context scoping (e.g., "clarification")
}

const toolRegistry = new Map<string, UITool<unknown, Record<string, unknown>>>();

export function registerTool<TInput, TOutput extends Record<string, unknown>>(
  toolDef: UITool<TInput, TOutput>
): void {
  toolRegistry.set(toolDef.name, toolDef as UITool<unknown, Record<string, unknown>>);
}

export function getTool(name: string): UITool<unknown, Record<string, unknown>> | null {
  return toolRegistry.get(name) ?? null;
}

export function getToolRegistry(): ReadonlyMap<string, UITool<unknown, Record<string, unknown>>> {
  return toolRegistry;
}

export function buildToolSet(
  filter?: (toolDef: UITool<unknown, Record<string, unknown>>) => boolean
): Record<string, Tool> {
  const tools: Record<string, Tool> = {};
  for (const [name, toolDef] of toolRegistry.entries()) {
    if (filter && !filter(toolDef)) {
      continue;
    }
    tools[name] = tool({
      description: toolDef.description,
      inputSchema: toolDef.inputSchema,
      execute: async (input) => ({
        ...(await toolDef.execute(input)),
        componentType: toolDef.componentType,
      }),
    });
  }
  return tools;
}
