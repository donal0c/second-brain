// =============================================================================
// OpenAI LLM Provider Implementation
// =============================================================================

import OpenAI from "openai";
import type { LLMProvider } from "./provider.js";
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
  TaskExtraction,
  ProjectExtraction,
  IdeaExtraction,
  PersonExtraction,
} from "./types.js";
import {
  CLASSIFIER_SYSTEM_PROMPT,
  buildClassifierPrompt,
  TASK_EXTRACTOR_SYSTEM_PROMPT,
  buildTaskExtractorPrompt,
  PROJECT_EXTRACTOR_SYSTEM_PROMPT,
  buildProjectExtractorPrompt,
  IDEA_EXTRACTOR_SYSTEM_PROMPT,
  buildIdeaExtractorPrompt,
  PERSON_EXTRACTOR_SYSTEM_PROMPT,
  buildPersonExtractorPrompt,
  CLARIFICATION_SYSTEM_PROMPT,
  buildClarificationPrompt,
} from "@second-brain/config";

const DEFAULT_MODEL = process.env.SECOND_BRAIN_LLM_MODEL || "gpt-5-mini";

// =============================================================================
// Retry Configuration
// =============================================================================

interface RetryOptions {
  maxRetries: number;
  initialDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
}

const DEFAULT_RETRY_OPTIONS: RetryOptions = {
  maxRetries: 3,
  initialDelayMs: 1000,
  maxDelayMs: 10000,
  backoffMultiplier: 2,
};

// =============================================================================
// Circuit Breaker
// =============================================================================

enum CircuitState {
  CLOSED = "closed",
  OPEN = "open",
  HALF_OPEN = "half_open",
}

class CircuitBreaker {
  private state: CircuitState = CircuitState.CLOSED;
  private failureCount = 0;
  private lastFailureTime: number | null = null;
  private readonly threshold = 5;
  private readonly timeout = 60000;

  isOpen(): boolean {
    if (this.state === CircuitState.OPEN && this.lastFailureTime) {
      const timeSinceLastFailure = Date.now() - this.lastFailureTime;
      if (timeSinceLastFailure >= this.timeout) {
        this.state = CircuitState.HALF_OPEN;
        return false;
      }
      return true;
    }
    return false;
  }

  recordSuccess(): void {
    this.failureCount = 0;
    this.state = CircuitState.CLOSED;
  }

  recordFailure(): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();

    if (this.failureCount >= this.threshold) {
      this.state = CircuitState.OPEN;
    }
  }

  getState(): CircuitState {
    return this.state;
  }
}

export interface OpenAIProviderOptions {
  apiKey: string;
  model?: string;
  retryOptions?: Partial<RetryOptions>;
}

export class OpenAIProvider implements LLMProvider {
  readonly name = "openai";
  readonly model: string;
  private client: OpenAI;
  private retryOptions: RetryOptions;
  private circuitBreaker: CircuitBreaker;

  constructor(options: OpenAIProviderOptions) {
    this.client = new OpenAI({ apiKey: options.apiKey });
    this.model = options.model ?? DEFAULT_MODEL;
    this.retryOptions = {
      ...DEFAULT_RETRY_OPTIONS,
      ...options.retryOptions,
    };
    this.circuitBreaker = new CircuitBreaker();
  }

  private async withRetry<T>(
    operation: () => Promise<T>,
    operationName: string
  ): Promise<T> {
    if (this.circuitBreaker.isOpen()) {
      throw new Error(
        `Circuit breaker is open for ${operationName}. Too many recent failures.`
      );
    }

    let lastError: Error | null = null;
    let delay = this.retryOptions.initialDelayMs;

    for (let attempt = 0; attempt <= this.retryOptions.maxRetries; attempt++) {
      try {
        const result = await operation();
        this.circuitBreaker.recordSuccess();
        return result;
      } catch (error) {
        lastError = error as Error;

        const isRetryable = this.isRetryableError(error);
        const isLastAttempt = attempt === this.retryOptions.maxRetries;

        if (!isRetryable || isLastAttempt) {
          this.circuitBreaker.recordFailure();
          throw error;
        }

        await this.sleep(Math.min(delay, this.retryOptions.maxDelayMs));
        delay *= this.retryOptions.backoffMultiplier;
      }
    }

    this.circuitBreaker.recordFailure();
    throw lastError || new Error(`${operationName} failed after retries`);
  }

  private isRetryableError(error: unknown): boolean {
    if (!error || typeof error !== "object") {
      return false;
    }

    const err = error as { status?: number; code?: string; message?: string };

    if (err.status === 429) {
      return true;
    }

    if (err.status && err.status >= 500 && err.status < 600) {
      return true;
    }

    if (
      err.code === "ECONNRESET" ||
      err.code === "ETIMEDOUT" ||
      err.code === "ENOTFOUND" ||
      err.message?.includes("network") ||
      err.message?.includes("timeout")
    ) {
      return true;
    }

    return false;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  async classify(
    text: string,
    context?: PersonalContext[],
    clarification?: ClarificationContext
  ): Promise<ClassificationResult> {
    let systemPrompt = this.buildSystemPromptWithContext(
      CLASSIFIER_SYSTEM_PROMPT,
      context
    );

    if (clarification) {
      systemPrompt = this.injectClarificationContext(systemPrompt, clarification);
    }

    return this.withRetry(async () => {
      const response = await this.client.chat.completions.create({
        model: this.model,
        max_tokens: 256,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: buildClassifierPrompt(text) },
        ],
      });

      const content = this.extractTextContent(response);
      return this.parseJSON<ClassificationResult>(content);
    }, "classify");
  }

  async extract(
    text: string,
    type: Classification,
    context?: PersonalContext[],
    clarification?: ClarificationContext
  ): Promise<ExtractionResult> {
    switch (type) {
      case "task":
        return this.extractTask(text, context, clarification);
      case "project":
        return this.extractProject(text, context, clarification);
      case "idea":
        return this.extractIdea(text, context, clarification);
      case "person":
        return this.extractPerson(text, context, clarification);
      default:
        throw new Error(`Cannot extract for type: ${type}`);
    }
  }

  async generateClarification(
    text: string,
    classificationAttempt: ClassificationResult
  ): Promise<ClarificationQuestion> {
    const prompt = buildClarificationPrompt(
      text,
      classificationAttempt.classification,
      classificationAttempt.confidence,
      classificationAttempt.reasoning
    );

    return this.withRetry(async () => {
      const response = await this.client.chat.completions.create({
        model: this.model,
        max_tokens: 256,
        messages: [
          { role: "system", content: CLARIFICATION_SYSTEM_PROMPT },
          { role: "user", content: prompt },
        ],
      });

      const content = this.extractTextContent(response);
      return this.parseJSON<ClarificationQuestion>(content);
    }, "generateClarification");
  }

  async interpretCorrection(
    original: Record<string, unknown>,
    correction: string
  ): Promise<CorrectionResult> {
    const today = new Date().toISOString().split("T")[0];
    const currentYear = new Date().getFullYear();

    const systemPrompt = `You are a cognitive assistant that interprets user corrections to data entries.

Today's date is ${today}. The current year is ${currentYear}.

Given the original data and a natural language correction, determine what fields should be updated.

Guidelines:
- Only update fields mentioned in the correction
- Preserve fields not mentioned
- Be precise about what changed and why
- When interpreting dates like "September" or "next month", use the current year (${currentYear}) or next year if the date has already passed
- Format dates as YYYY-MM-DD`;

    const userPrompt = `Original data:
${JSON.stringify(original, null, 2)}

User correction: "${correction}"

Respond with JSON only:
{
  "updates": { "fieldName": "newValue", ... },
  "reasoning": "Brief explanation of what was changed"
}`;

    return this.withRetry(async () => {
      const response = await this.client.chat.completions.create({
        model: this.model,
        max_tokens: 512,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      });

      const content = this.extractTextContent(response);
      return this.parseJSON<CorrectionResult>(content);
    }, "interpretCorrection");
  }

  async interpretFix(
    originalType: Classification,
    original: Record<string, unknown>,
    correction: string
  ): Promise<FixResult> {
    const today = new Date().toISOString().split("T")[0];
    const currentYear = new Date().getFullYear();

    const systemPrompt = `You are a cognitive assistant that interprets user corrections to entities in a personal knowledge system.

Today's date is ${today}. The current year is ${currentYear}.

The system has these entity types:
- task: An actionable item with a next action and optional due date
- project: A multi-step outcome with desired result and next action
- idea: A concept or thought to potentially explore later
- person: A contact or relationship to maintain

Given an entity's current type and data, plus a natural language correction, determine:
1. Whether the entity type should change (e.g., "this is actually a project, not a task")
2. What fields should be updated or what the new entity should contain

Guidelines:
- If the correction explicitly mentions the entity should be a different type, set shouldTransform=true
- If transforming, provide complete fields for the new entity type
- If not transforming, provide only the updated fields
- When interpreting dates, use the current year (${currentYear}) or next year if the date has already passed
- Format dates as YYYY-MM-DD
- Be precise about what changed and why

Entity field schemas:
Task: { title, nextAction, dueDate?, context?, status }
Project: { name, desiredOutcome?, nextAction?, status }
Idea: { title, summary?, links }
Person: { name, relationshipContext?, followUpNextAction? }`;

    const userPrompt = `Current entity type: ${originalType}
Current data:
${JSON.stringify(original, null, 2)}

User correction: "${correction}"

Respond with JSON only:
{
  "shouldTransform": true/false,
  "newType": "task|project|idea|person" (only if shouldTransform is true),
  "fields": { complete fields if transforming, or updates if not },
  "reasoning": "Brief explanation of what was changed"
}`;

    return this.withRetry(async () => {
      const response = await this.client.chat.completions.create({
        model: this.model,
        max_tokens: 1024,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      });

      const content = this.extractTextContent(response);
      return this.parseJSON<FixResult>(content);
    }, "interpretFix");
  }

  async extractContextEntities(text: string): Promise<ContextExtractionResult> {
    const systemPrompt = `You are a cognitive assistant that identifies named entities from text captures.

Your job is to extract SPECIFIC, NAMED entities that represent important parts of the user's world:
- People (specific individuals mentioned by name)
- Places (specific locations, venues, cities)
- Organizations (companies, teams, groups, institutions)
- Concepts (important domain-specific terms, project codenames)

Guidelines:
- Only extract SPECIFIC named entities, not generic terms
- "my wife" is NOT an entity (no name). "Sarah" IS an entity.
- "the office" is NOT an entity. "Acme Corp headquarters" IS.
- "a meeting" is NOT an entity. "Q4 Planning" might be a concept.
- Infer the domain (work, family, health, finance, etc.) when context clues exist
- ALWAYS provide a brief description (1 sentence) explaining who/what the entity is based on context clues in the text. Even if context is limited, infer what you can.
- Return an empty array if no specific named entities are found
- Be conservative - only extract entities you're confident about

Example input: "Need to send the quarterly report to Sarah before the Acme meeting on Friday"
Example output:
{
  "entities": [
    { "name": "Sarah", "type": "person", "description": "Recipient of the quarterly report, likely a colleague or stakeholder", "domain": "work" },
    { "name": "Acme", "type": "organization", "description": "Company the user has a meeting with", "domain": "work" }
  ]
}

Respond with JSON matching this structure:
{
  "entities": [
    { "name": "string", "type": "person|place|organization|concept", "description": "string (required - brief description based on context)", "domain": "string or null" }
  ]
}`;

    return this.withRetry(async () => {
      const response = await this.client.chat.completions.create({
        model: this.model,
        max_tokens: 512,
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: `Extract named entities from this text:\n\n"${text}"`,
          },
        ],
      });

      const content = this.extractTextContent(response);
      return this.parseJSON<ContextExtractionResult>(content);
    }, "extractContextEntities");
  }

  // ---------------------------------------------------------------------------
  // Private Extraction Methods
  // ---------------------------------------------------------------------------

  private async extractTask(
    text: string,
    context?: PersonalContext[],
    clarification?: ClarificationContext
  ): Promise<ExtractionResult> {
    let systemPrompt = this.buildSystemPromptWithContext(
      TASK_EXTRACTOR_SYSTEM_PROMPT,
      context
    );
    if (clarification) {
      systemPrompt = this.injectClarificationContext(systemPrompt, clarification);
    }

    return this.withRetry(async () => {
      const response = await this.client.chat.completions.create({
        model: this.model,
        max_tokens: 512,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: buildTaskExtractorPrompt(text) },
        ],
      });

      const content = this.extractTextContent(response);
      const data = this.parseJSON<TaskExtraction>(content);
      return { type: "task", data };
    }, "extractTask");
  }

  private async extractProject(
    text: string,
    context?: PersonalContext[],
    clarification?: ClarificationContext
  ): Promise<ExtractionResult> {
    let systemPrompt = this.buildSystemPromptWithContext(
      PROJECT_EXTRACTOR_SYSTEM_PROMPT,
      context
    );
    if (clarification) {
      systemPrompt = this.injectClarificationContext(systemPrompt, clarification);
    }

    return this.withRetry(async () => {
      const response = await this.client.chat.completions.create({
        model: this.model,
        max_tokens: 512,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: buildProjectExtractorPrompt(text) },
        ],
      });

      const content = this.extractTextContent(response);
      const data = this.parseJSON<ProjectExtraction>(content);
      return { type: "project", data };
    }, "extractProject");
  }

  private async extractIdea(
    text: string,
    context?: PersonalContext[],
    clarification?: ClarificationContext
  ): Promise<ExtractionResult> {
    let systemPrompt = this.buildSystemPromptWithContext(
      IDEA_EXTRACTOR_SYSTEM_PROMPT,
      context
    );
    if (clarification) {
      systemPrompt = this.injectClarificationContext(systemPrompt, clarification);
    }

    return this.withRetry(async () => {
      const response = await this.client.chat.completions.create({
        model: this.model,
        max_tokens: 512,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: buildIdeaExtractorPrompt(text) },
        ],
      });

      const content = this.extractTextContent(response);
      const data = this.parseJSON<IdeaExtraction>(content);
      return { type: "idea", data };
    }, "extractIdea");
  }

  private async extractPerson(
    text: string,
    context?: PersonalContext[],
    clarification?: ClarificationContext
  ): Promise<ExtractionResult> {
    let systemPrompt = this.buildSystemPromptWithContext(
      PERSON_EXTRACTOR_SYSTEM_PROMPT,
      context
    );
    if (clarification) {
      systemPrompt = this.injectClarificationContext(systemPrompt, clarification);
    }

    return this.withRetry(async () => {
      const response = await this.client.chat.completions.create({
        model: this.model,
        max_tokens: 512,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: buildPersonExtractorPrompt(text) },
        ],
      });

      const content = this.extractTextContent(response);
      const data = this.parseJSON<PersonExtraction>(content);
      return { type: "person", data };
    }, "extractPerson");
  }

  // ---------------------------------------------------------------------------
  // Utility Methods
  // ---------------------------------------------------------------------------

  private injectClarificationContext(
    basePrompt: string,
    clarification: ClarificationContext
  ): string {
    const clarificationSection = `

IMPORTANT - User Clarification Context:
The user was previously asked this clarifying question: "${clarification.question}"
The user answered: "${clarification.answer}"

Use this information to guide your classification and extraction. The user's answer should inform your decision about what type of entity this is and how to extract the relevant fields.`;

    return basePrompt + clarificationSection;
  }

  private buildSystemPromptWithContext(
    basePrompt: string,
    context?: PersonalContext[]
  ): string {
    if (!context || context.length === 0) {
      return basePrompt;
    }

    const formatContext = (c: PersonalContext): string => {
      let line = `- ${c.name} (${c.type})`;
      if (c.domain) line += ` [${c.domain}]`;
      if (c.description) line += `: ${c.description}`;
      return line;
    };

    const contextSection = `

Known Context (use this information about the user's world for better classification and extraction):
${context.map(formatContext).join("\n")}`;

    return basePrompt + contextSection;
  }

  private extractTextContent(response: OpenAI.Chat.Completions.ChatCompletion): string {
    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error("No text content in response");
    }
    return content;
  }

  private parseJSON<T>(content: string): T {
    const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    const jsonStr = jsonMatch ? jsonMatch[1] : content;

    try {
      return JSON.parse(jsonStr.trim()) as T;
    } catch {
      throw new Error("LLM_JSON_PARSE_ERROR: Failed to parse JSON response");
    }
  }
}

/**
 * Create an OpenAI LLM provider instance
 */
export function createOpenAIProvider(
  options: OpenAIProviderOptions
): OpenAIProvider {
  return new OpenAIProvider(options);
}
