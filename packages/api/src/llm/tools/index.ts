import type { Tool } from "ai";
import { buildToolSet, getToolRegistry } from "./registry.js";
import "./demo.js";

export * from "./registry.js";

export function getEnabledTools(_context?: unknown): Record<string, Tool> {
  if (getToolRegistry().size === 0) {
    return {};
  }
  return buildToolSet();
}
