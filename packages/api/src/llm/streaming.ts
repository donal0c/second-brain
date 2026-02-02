import { createOpenAI } from "@ai-sdk/openai";
import { createAnthropic } from "@ai-sdk/anthropic";
import { getLLMProviderHint, resolveLLMProviderChoice } from "./provider-selection.js";

const DEFAULT_OPENAI_MODEL = "gpt-5-mini";
const DEFAULT_ANTHROPIC_MODEL = "claude-sonnet-4-5-20250929";

export type StreamingModelConfig = {
  provider: "openai" | "anthropic";
  model: ReturnType<ReturnType<typeof createOpenAI>> | ReturnType<ReturnType<typeof createAnthropic>>;
};

export function resolveStreamingModel(): StreamingModelConfig | null {
  const choice = resolveLLMProviderChoice();
  if (!choice) {
    return null;
  }

  const preferredModel = process.env.SECOND_BRAIN_LLM_MODEL;
  if (choice.provider === "openai") {
    return {
      provider: "openai",
      model: createOpenAI({ apiKey: choice.apiKey })(preferredModel || DEFAULT_OPENAI_MODEL),
    };
  }

  return {
    provider: "anthropic",
    model: createAnthropic({ apiKey: choice.apiKey })(preferredModel || DEFAULT_ANTHROPIC_MODEL),
  };
}

export function getStreamingProviderHint(): string {
  return getLLMProviderHint();
}
