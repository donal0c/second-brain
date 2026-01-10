// =============================================================================
// LLM Result Types
// =============================================================================
// These types define the structure of LLM responses for classification,
// extraction, clarification, and correction operations.

import type { EntityType } from "@second-brain/shared";

// -----------------------------------------------------------------------------
// Classification
// -----------------------------------------------------------------------------

export type Classification = (typeof EntityType)[keyof typeof EntityType];

export interface ClassificationResult {
  classification: Classification;
  confidence: number;
  reasoning: string;
}

// -----------------------------------------------------------------------------
// Extraction Results
// -----------------------------------------------------------------------------

export interface TaskExtraction {
  title: string;
  nextAction: string;
  dueDate: string | null;
  context: string | null;
}

export interface ProjectExtraction {
  name: string;
  desiredOutcome: string | null;
  nextAction: string | null;
}

export interface IdeaExtraction {
  title: string;
  summary: string | null;
  links: string[];
}

export interface PersonExtraction {
  name: string;
  relationshipContext: string | null;
  followUpNextAction: string | null;
}

export type ExtractionResult =
  | { type: "task"; data: TaskExtraction }
  | { type: "project"; data: ProjectExtraction }
  | { type: "idea"; data: IdeaExtraction }
  | { type: "person"; data: PersonExtraction };

// -----------------------------------------------------------------------------
// Clarification
// -----------------------------------------------------------------------------

export interface ClarificationQuestion {
  question: string;
  options: string[] | null;
}

// -----------------------------------------------------------------------------
// Correction
// -----------------------------------------------------------------------------

export interface CorrectionResult {
  /** The fields that should be updated */
  updates: Record<string, unknown>;
  /** Explanation of what was changed */
  reasoning: string;
}

// -----------------------------------------------------------------------------
// Clarification Context (for reprocessing with user input)
// -----------------------------------------------------------------------------

export interface ClarificationContext {
  /** The question that was asked */
  question: string;
  /** The user's answer to the question */
  answer: string;
}

// -----------------------------------------------------------------------------
// Context (for enhanced processing)
// -----------------------------------------------------------------------------

export interface PersonalContext {
  type: "person" | "place" | "organization" | "concept";
  id: string;
  name: string;
  /** User-provided description of this entity */
  description?: string | null;
  /** Domain (work, family, health, etc.) */
  domain?: string | null;
}

// -----------------------------------------------------------------------------
// Context Entity Extraction (learning about user's world)
// -----------------------------------------------------------------------------

export interface ExtractedContextEntity {
  name: string;
  type: "person" | "place" | "organization" | "concept";
  domain: string | null; // e.g., "work", "family", "health"
}

export interface ContextExtractionResult {
  entities: ExtractedContextEntity[];
}
