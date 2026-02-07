import { createOpenAI } from "@ai-sdk/openai";
import { createAnthropic } from "@ai-sdk/anthropic";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createVertex, vertex } from "@ai-sdk/google-vertex";
import { getLLMProviderHint, resolveLLMProviderChoice } from "./provider-selection.js";

const DEFAULT_OPENAI_MODEL = "gpt-5-mini";
const DEFAULT_ANTHROPIC_MODEL = "claude-sonnet-4-5-20250929";
const DEFAULT_GEMINI_UI_MODEL = "gemini-3-flash-preview";

export type StreamingModelConfig = {
  provider: "openai" | "anthropic" | "google" | "vertex";
  modelName: string;
  model: any;
};

function resolveVertexProvider() {
  const credentialsJson = process.env.GOOGLE_VERTEX_CREDENTIALS_JSON;
  if (!credentialsJson) {
    return vertex;
  }

  try {
    const credentials = JSON.parse(credentialsJson) as Record<string, unknown>;
    return createVertex({
      project: process.env.GOOGLE_VERTEX_PROJECT,
      location: process.env.GOOGLE_VERTEX_LOCATION,
      googleAuthOptions: {
        credentials,
      },
    });
  } catch {
    return vertex;
  }
}

export function resolveStreamingModel(): StreamingModelConfig | null {
  const choice = resolveLLMProviderChoice();
  if (!choice) {
    return null;
  }

  const preferredModel = process.env.SECOND_BRAIN_LLM_MODEL;
  if (choice.provider === "openai") {
    const modelName = preferredModel || DEFAULT_OPENAI_MODEL;
    return {
      provider: "openai",
      modelName,
      model: createOpenAI({ apiKey: choice.apiKey })(modelName),
    };
  }

  if (choice.provider === "google") {
    const modelName = process.env.SECOND_BRAIN_UI_MODEL || DEFAULT_GEMINI_UI_MODEL;
    return {
      provider: "google",
      modelName,
      model: createGoogleGenerativeAI({ apiKey: choice.apiKey })(modelName),
    };
  }

  if (choice.provider === "vertex") {
    const modelName = process.env.SECOND_BRAIN_UI_MODEL || DEFAULT_GEMINI_UI_MODEL;
    const vertexProvider = resolveVertexProvider();
    return {
      provider: "vertex",
      modelName,
      model: vertexProvider(modelName),
    };
  }

  const modelName = preferredModel || DEFAULT_ANTHROPIC_MODEL;
  return {
    provider: "anthropic",
    modelName,
    model: createAnthropic({ apiKey: choice.apiKey })(modelName),
  };
}

export function getStreamingProviderHint(): string {
  return getLLMProviderHint();
}

export function resolveUiGenerationModel(): StreamingModelConfig | null {
  return resolveStreamingModel();
}
