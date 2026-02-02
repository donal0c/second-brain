export type LLMProviderChoice = {
  provider: "openai" | "anthropic";
  apiKey: string;
  source: "explicit" | "fallback";
};

const PROVIDER_ENV = "SECOND_BRAIN_LLM_PROVIDER";

export function resolveLLMProviderChoice(): LLMProviderChoice | null {
  const preferred = process.env[PROVIDER_ENV]?.toLowerCase();
  const openaiKey = process.env.OPENAI_API_KEY;
  const anthropicKey = process.env.ANTHROPIC_API_KEY;

  if (preferred === "openai") {
    return openaiKey ? { provider: "openai", apiKey: openaiKey, source: "explicit" } : null;
  }

  if (preferred === "anthropic") {
    return anthropicKey
      ? { provider: "anthropic", apiKey: anthropicKey, source: "explicit" }
      : null;
  }

  if (openaiKey) {
    return { provider: "openai", apiKey: openaiKey, source: "fallback" };
  }

  if (anthropicKey) {
    return { provider: "anthropic", apiKey: anthropicKey, source: "fallback" };
  }

  return null;
}

export function getLLMProviderHint(): string {
  return "Set OPENAI_API_KEY (or ANTHROPIC_API_KEY) to enable processing.";
}
