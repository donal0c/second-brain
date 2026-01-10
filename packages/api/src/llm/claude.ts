// =============================================================================
// Claude LLM Provider Implementation
// =============================================================================

import Anthropic from "@anthropic-ai/sdk";
import type { LLMProvider } from "./provider.js";
import type {
  ClassificationResult,
  ExtractionResult,
  ClarificationQuestion,
  CorrectionResult,
  PersonalContext,
  Classification,
  TaskExtraction,
  ProjectExtraction,
  IdeaExtraction,
  PersonExtraction,
  ContextExtractionResult,
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

const DEFAULT_MODEL = "claude-sonnet-4-20250514";

export interface ClaudeProviderOptions {
  apiKey: string;
  model?: string;
}

export class ClaudeProvider implements LLMProvider {
  readonly name = "claude";
  readonly model: string;
  private client: Anthropic;

  constructor(options: ClaudeProviderOptions) {
    this.client = new Anthropic({ apiKey: options.apiKey });
    this.model = options.model ?? DEFAULT_MODEL;
  }

  async classify(
    text: string,
    context?: PersonalContext[]
  ): Promise<ClassificationResult> {
    const systemPrompt = this.buildSystemPromptWithContext(
      CLASSIFIER_SYSTEM_PROMPT,
      context
    );

    const response = await this.client.messages.create({
      model: this.model,
      max_tokens: 256,
      system: systemPrompt,
      messages: [{ role: "user", content: buildClassifierPrompt(text) }],
    });

    const content = this.extractTextContent(response);
    return this.parseJSON<ClassificationResult>(content);
  }

  async extract(
    text: string,
    type: Classification,
    context?: PersonalContext[]
  ): Promise<ExtractionResult> {
    switch (type) {
      case "task":
        return this.extractTask(text, context);
      case "project":
        return this.extractProject(text, context);
      case "idea":
        return this.extractIdea(text, context);
      case "person":
        return this.extractPerson(text, context);
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

    const response = await this.client.messages.create({
      model: this.model,
      max_tokens: 256,
      system: CLARIFICATION_SYSTEM_PROMPT,
      messages: [{ role: "user", content: prompt }],
    });

    const content = this.extractTextContent(response);
    return this.parseJSON<ClarificationQuestion>(content);
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

    const response = await this.client.messages.create({
      model: this.model,
      max_tokens: 512,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
    });

    const content = this.extractTextContent(response);
    return this.parseJSON<CorrectionResult>(content);
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
- Return an empty array if no specific named entities are found
- Be conservative - only extract entities you're confident about

Respond with JSON only:
{
  "entities": [
    { "name": "...", "type": "person|place|organization|concept", "domain": "work|family|health|..." or null }
  ]
}`;

    const response = await this.client.messages.create({
      model: this.model,
      max_tokens: 512,
      system: systemPrompt,
      messages: [
        {
          role: "user",
          content: `Extract named entities from this text:\n\n"${text}"`,
        },
      ],
    });

    const content = this.extractTextContent(response);
    return this.parseJSON<ContextExtractionResult>(content);
  }

  // ---------------------------------------------------------------------------
  // Private Extraction Methods
  // ---------------------------------------------------------------------------

  private async extractTask(
    text: string,
    context?: PersonalContext[]
  ): Promise<ExtractionResult> {
    const systemPrompt = this.buildSystemPromptWithContext(
      TASK_EXTRACTOR_SYSTEM_PROMPT,
      context
    );

    const response = await this.client.messages.create({
      model: this.model,
      max_tokens: 512,
      system: systemPrompt,
      messages: [{ role: "user", content: buildTaskExtractorPrompt(text) }],
    });

    const content = this.extractTextContent(response);
    const data = this.parseJSON<TaskExtraction>(content);
    return { type: "task", data };
  }

  private async extractProject(
    text: string,
    context?: PersonalContext[]
  ): Promise<ExtractionResult> {
    const systemPrompt = this.buildSystemPromptWithContext(
      PROJECT_EXTRACTOR_SYSTEM_PROMPT,
      context
    );

    const response = await this.client.messages.create({
      model: this.model,
      max_tokens: 512,
      system: systemPrompt,
      messages: [{ role: "user", content: buildProjectExtractorPrompt(text) }],
    });

    const content = this.extractTextContent(response);
    const data = this.parseJSON<ProjectExtraction>(content);
    return { type: "project", data };
  }

  private async extractIdea(
    text: string,
    context?: PersonalContext[]
  ): Promise<ExtractionResult> {
    const systemPrompt = this.buildSystemPromptWithContext(
      IDEA_EXTRACTOR_SYSTEM_PROMPT,
      context
    );

    const response = await this.client.messages.create({
      model: this.model,
      max_tokens: 512,
      system: systemPrompt,
      messages: [{ role: "user", content: buildIdeaExtractorPrompt(text) }],
    });

    const content = this.extractTextContent(response);
    const data = this.parseJSON<IdeaExtraction>(content);
    return { type: "idea", data };
  }

  private async extractPerson(
    text: string,
    context?: PersonalContext[]
  ): Promise<ExtractionResult> {
    const systemPrompt = this.buildSystemPromptWithContext(
      PERSON_EXTRACTOR_SYSTEM_PROMPT,
      context
    );

    const response = await this.client.messages.create({
      model: this.model,
      max_tokens: 512,
      system: systemPrompt,
      messages: [{ role: "user", content: buildPersonExtractorPrompt(text) }],
    });

    const content = this.extractTextContent(response);
    const data = this.parseJSON<PersonExtraction>(content);
    return { type: "person", data };
  }

  // ---------------------------------------------------------------------------
  // Utility Methods
  // ---------------------------------------------------------------------------

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

  private extractTextContent(response: Anthropic.Message): string {
    const textBlock = response.content.find((block) => block.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      throw new Error("No text content in response");
    }
    return textBlock.text;
  }

  private parseJSON<T>(content: string): T {
    // Try to extract JSON from the response (handle markdown code blocks)
    const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    const jsonStr = jsonMatch ? jsonMatch[1] : content;

    try {
      return JSON.parse(jsonStr.trim()) as T;
    } catch {
      throw new Error(`Failed to parse JSON response: ${content}`);
    }
  }
}

/**
 * Create a Claude LLM provider instance
 */
export function createClaudeProvider(
  options: ClaudeProviderOptions
): ClaudeProvider {
  return new ClaudeProvider(options);
}
