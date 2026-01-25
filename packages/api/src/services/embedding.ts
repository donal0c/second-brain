// =============================================================================
// OpenAI Embedding Service
// =============================================================================

import OpenAI from "openai";

// =============================================================================
// Constants
// =============================================================================

const EMBEDDING_MODEL = "text-embedding-3-small";
const EMBEDDING_DIMENSIONS = 1536;
const MAX_INPUT_CHARS = 12000;
const MAX_BATCH_SIZE = 100;
const MAX_RETRIES = 4;
const BASE_RETRY_DELAY_MS = 500;

// =============================================================================
// Client
// =============================================================================

let openaiClient: OpenAI | null = null;

export function hasOpenAIClient(): boolean {
  return !!process.env.OPENAI_API_KEY;
}

export function getOpenAIClient(): OpenAI {
  if (!openaiClient) {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error("OPENAI_API_KEY not configured");
    }
    openaiClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return openaiClient;
}

// =============================================================================
// Text Preparation
// =============================================================================

type EntityType = "inbox_item" | "task" | "project" | "idea" | "person" | "personal_context";

interface EntityData {
  type: EntityType;
  data: Record<string, unknown>;
}

function normalizeText(value: unknown): string {
  if (value === null || value === undefined) return "";
  return String(value).trim();
}

function truncateText(text: string): string {
  if (text.length <= MAX_INPUT_CHARS) return text;
  return text.substring(0, MAX_INPUT_CHARS);
}

/**
 * Prepare text for embedding by combining relevant fields per entity type.
 * Uses pipe separator to maintain some structure while keeping it readable.
 */
export function prepareTextForEmbedding(entity: EntityData): string {
  const { type, data } = entity;

  switch (type) {
    case "inbox_item":
      return normalizeText(data.rawText);

    case "task":
      return [
        normalizeText(data.title),
        normalizeText(data.nextAction),
        normalizeText(data.context),
      ].filter(Boolean).join(" | ");

    case "project":
      return [
        normalizeText(data.name),
        normalizeText(data.desiredOutcome),
        normalizeText(data.nextAction),
      ].filter(Boolean).join(" | ");

    case "idea":
      return [
        normalizeText(data.title),
        normalizeText(data.summary),
      ].filter(Boolean).join(" | ");

    case "person":
      return [
        normalizeText(data.name),
        normalizeText(data.relationshipContext),
        normalizeText(data.followUpNextAction),
      ].filter(Boolean).join(" | ");

    case "personal_context":
      return [
        normalizeText(data.name),
        normalizeText(data.description),
        normalizeText(data.domain),
      ].filter(Boolean).join(" | ");

    default:
      throw new Error(`Unknown entity type: ${type}`);
  }
}

// =============================================================================
// Retry Helpers
// =============================================================================

function isRetryableError(error: unknown): boolean {
  const status = (error as { status?: number }).status;
  return status === 429 || status === 500 || status === 502 || status === 503;
}

async function sleep(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function withRetries<T>(fn: () => Promise<T>): Promise<T> {
  let attempt = 0;
  while (true) {
    try {
      return await fn();
    } catch (error) {
      attempt += 1;
      if (attempt > MAX_RETRIES || !isRetryableError(error)) {
        throw error;
      }
      const jitter = Math.floor(Math.random() * 200);
      const delay = BASE_RETRY_DELAY_MS * Math.pow(2, attempt - 1) + jitter;
      await sleep(delay);
    }
  }
}

// =============================================================================
// Embedding Generation
// =============================================================================

/**
 * Generate embedding for a single text.
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  const prepared = truncateText(text.trim());
  if (!prepared) {
    throw new Error("Cannot embed empty text");
  }

  const client = getOpenAIClient();
  const response = await withRetries(() =>
    client.embeddings.create({
      model: EMBEDDING_MODEL,
      input: prepared,
      dimensions: EMBEDDING_DIMENSIONS,
    })
  );

  return response.data[0].embedding;
}

/**
 * Generate embeddings for multiple texts in batch.
 * OpenAI supports up to 2048 inputs per request.
 */
export async function generateEmbeddingsBatch(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return [];

  const client = getOpenAIClient();
  const results: number[][] = [];

  for (let i = 0; i < texts.length; i += MAX_BATCH_SIZE) {
    const batch = texts.slice(i, i + MAX_BATCH_SIZE).map((text) => truncateText(text.trim()));

    const response = await withRetries(() =>
      client.embeddings.create({
        model: EMBEDDING_MODEL,
        input: batch,
        dimensions: EMBEDDING_DIMENSIONS,
      })
    );

    const sorted = response.data.sort((a, b) => a.index - b.index);
    results.push(...sorted.map((d) => d.embedding));
  }

  return results;
}

/**
 * Convenience function to generate embedding for an entity.
 */
export async function generateEntityEmbedding(entity: EntityData): Promise<number[]> {
  const text = prepareTextForEmbedding(entity);
  return generateEmbedding(text);
}
