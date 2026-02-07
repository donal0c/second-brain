export type LLMProviderChoice = {
  provider: "openai" | "anthropic" | "google" | "vertex";
  apiKey: string;
  source: "explicit" | "fallback";
};

const PROVIDER_ENV = "SECOND_BRAIN_LLM_PROVIDER";

export function resolveLLMProviderChoice(): LLMProviderChoice | null {
  const preferred = process.env[PROVIDER_ENV]?.toLowerCase();
  const openaiKey = process.env.OPENAI_API_KEY;
  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  const googleKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GEMINI_API_KEY;
  const hasVertexConfig =
    !!process.env.GOOGLE_VERTEX_PROJECT &&
    !!process.env.GOOGLE_VERTEX_LOCATION &&
    (!!process.env.GOOGLE_APPLICATION_CREDENTIALS || !!process.env.GOOGLE_VERTEX_CREDENTIALS_JSON);

  if (preferred === "openai") {
    return openaiKey ? { provider: "openai", apiKey: openaiKey, source: "explicit" } : null;
  }

  if (preferred === "anthropic") {
    return anthropicKey
      ? { provider: "anthropic", apiKey: anthropicKey, source: "explicit" }
      : null;
  }

  if (preferred === "google" || preferred === "gemini") {
    return googleKey ? { provider: "google", apiKey: googleKey, source: "explicit" } : null;
  }

  if (preferred === "vertex") {
    return hasVertexConfig
      ? { provider: "vertex", apiKey: "vertex-auth", source: "explicit" }
      : null;
  }

  if (openaiKey) {
    return { provider: "openai", apiKey: openaiKey, source: "fallback" };
  }

  if (anthropicKey) {
    return { provider: "anthropic", apiKey: anthropicKey, source: "fallback" };
  }

  if (googleKey) {
    return { provider: "google", apiKey: googleKey, source: "fallback" };
  }

  if (hasVertexConfig) {
    return { provider: "vertex", apiKey: "vertex-auth", source: "fallback" };
  }

  return null;
}

export function getLLMProviderHint(): string {
  return "Set OPENAI_API_KEY, ANTHROPIC_API_KEY, GOOGLE_GENERATIVE_AI_API_KEY (GEMINI_API_KEY), or Vertex envs (GOOGLE_VERTEX_PROJECT, GOOGLE_VERTEX_LOCATION, and GOOGLE_APPLICATION_CREDENTIALS or GOOGLE_VERTEX_CREDENTIALS_JSON).";
}
