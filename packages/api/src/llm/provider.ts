// =============================================================================
// LLM Provider Interface
// =============================================================================
// Abstract interface for LLM operations. Implementations can swap providers
// (Claude, GPT, local models) without changing the processing pipeline.

import type { ModelMessage, Tool, UIMessageChunk } from "ai";
import type {
  ClassificationResult,
  ExtractionResult,
  ClarificationQuestion,
  CorrectionResult,
  FixResult,
  PersonalContext,
  Classification,
  ContextExtractionResult,
  ClarificationContext,
} from "./types.js";

export interface LLMProvider {
  /**
   * Provider identifier (e.g., "claude", "openai", "local")
   */
  readonly name: string;

  /**
   * Model identifier being used
   */
  readonly model: string;

  /**
   * Classify raw text into an entity type
   * @param text - The raw inbox item text
   * @param context - Optional personal context for better matching
   * @param clarification - Optional clarification context when reprocessing after user input
   */
  classify(
    text: string,
    context?: PersonalContext[],
    clarification?: ClarificationContext
  ): Promise<ClassificationResult>;

  /**
   * Extract structured fields from text based on its classification
   * @param text - The raw inbox item text
   * @param type - The determined entity type
   * @param context - Optional personal context for better extraction
   * @param clarification - Optional clarification context when reprocessing after user input
   */
  extract(
    text: string,
    type: Classification,
    context?: PersonalContext[],
    clarification?: ClarificationContext
  ): Promise<ExtractionResult>;

  /**
   * Generate a clarifying question for ambiguous input
   * @param text - The raw inbox item text
   * @param classificationAttempt - The attempted classification result
   */
  generateClarification(
    text: string,
    classificationAttempt: ClassificationResult
  ): Promise<ClarificationQuestion>;

  /**
   * Interpret a user's correction and determine field updates
   * @param original - The original entity data
   * @param correction - Natural language correction from user
   */
  interpretCorrection(
    original: Record<string, unknown>,
    correction: string
  ): Promise<CorrectionResult>;

  /**
   * Interpret a user's fix/correction that may involve entity type transformation
   * @param originalType - The current entity type
   * @param original - The original entity data
   * @param correction - Natural language correction from user
   */
  interpretFix(
    originalType: Classification,
    original: Record<string, unknown>,
    correction: string
  ): Promise<FixResult>;

  /**
   * Extract context entities (people, places, organizations, concepts) from text
   * These are used to learn about the user's world for better future processing
   * @param text - The raw inbox item text
   */
  extractContextEntities(text: string): Promise<ContextExtractionResult>;

  /**
   * Stream UI message parts (text + tool parts) for generative UI flows
   */
  streamUI(params: {
    messages: ModelMessage[];
    tools: Record<string, Tool>;
    onToolCall?: (toolCall: unknown) => void;
  }): AsyncIterable<UIMessageChunk>;
}

// =============================================================================
// Provider Factory
// =============================================================================

export type LLMProviderConfig = {
  provider: "claude" | "openai";
  apiKey: string;
  model?: string;
};

let _provider: LLMProvider | null = null;

/**
 * Get the configured LLM provider instance
 */
export function getLLMProvider(): LLMProvider {
  if (!_provider) {
    throw new Error(
      "LLM provider not initialized. Call initLLMProvider() first."
    );
  }
  return _provider;
}

/**
 * Set the LLM provider instance (used during initialization)
 */
export function setLLMProvider(provider: LLMProvider): void {
  _provider = provider;
}

/**
 * Check if an LLM provider has been initialized
 */
export function hasLLMProvider(): boolean {
  return _provider !== null;
}

/**
 * Clear the LLM provider (used in testing)
 */
export function clearLLMProvider(): void {
  _provider = null;
}
