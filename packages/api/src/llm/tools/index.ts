import type { Tool } from "ai";
import { buildToolSet, getToolRegistry } from "./registry.js";
import "./demo.js";
import "./clarification.js";

export * from "./registry.js";

function resolveContextKey(context?: unknown): string | null {
  if (!context) return null;
  if (typeof context === "string") return context;
  if (typeof context === "object" && "scope" in context) {
    const scope = (context as { scope?: unknown }).scope;
    return typeof scope === "string" ? scope : null;
  }
  return null;
}

export function getEnabledTools(context?: unknown): Record<string, Tool> {
  const contextKey = resolveContextKey(context);
  if (getToolRegistry().size === 0) {
    return {};
  }
  if (!contextKey) {
    return buildToolSet();
  }
  return buildToolSet((toolDef) => {
    if (!toolDef.contexts || toolDef.contexts.length === 0) {
      return true;
    }
    return toolDef.contexts.includes(contextKey);
  });
}

export function getToolsForContext(contextKey: string): Record<string, Tool> {
  return getEnabledTools(contextKey);
}
