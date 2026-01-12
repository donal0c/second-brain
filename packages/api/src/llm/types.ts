// =============================================================================
// LLM Result Types
// =============================================================================
// These types define the structure of LLM responses for classification,
// extraction, clarification, and correction operations.

import { z } from "zod";
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
// Extraction Validation Schemas (Zod)
// -----------------------------------------------------------------------------
// These schemas validate LLM extraction output before database insertion.
// They ensure the LLM returns properly structured data.

/** Schema for task extraction - title and nextAction are required */
export const TaskExtractionSchema = z.object({
  title: z.string().min(1, "Task title is required"),
  nextAction: z.string().min(1, "Task next action is required"),
  dueDate: z.string().nullable(),
  context: z.string().nullable(),
});

/** Schema for project extraction - name is required */
export const ProjectExtractionSchema = z.object({
  name: z.string().min(1, "Project name is required"),
  desiredOutcome: z.string().nullable(),
  nextAction: z.string().nullable(),
});

/** Schema for idea extraction - title is required */
export const IdeaExtractionSchema = z.object({
  title: z.string().min(1, "Idea title is required"),
  summary: z.string().nullable(),
  links: z.array(z.string()).default([]),
});

/** Schema for person extraction - name is required */
export const PersonExtractionSchema = z.object({
  name: z.string().min(1, "Person name is required"),
  relationshipContext: z.string().nullable(),
  followUpNextAction: z.string().nullable(),
});

/** Discriminated union schema for all extraction results */
export const ExtractionResultSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("task"), data: TaskExtractionSchema }),
  z.object({ type: z.literal("project"), data: ProjectExtractionSchema }),
  z.object({ type: z.literal("idea"), data: IdeaExtractionSchema }),
  z.object({ type: z.literal("person"), data: PersonExtractionSchema }),
]);

/** Validation result type for extraction validation */
export type ExtractionValidationResult =
  | { success: true; data: ExtractionResult }
  | { success: false; errors: { path: string; message: string }[] };

/**
 * Validate an extraction result from the LLM.
 * Returns a discriminated union for type-safe error handling.
 */
export function validateExtractionResult(data: unknown): ExtractionValidationResult {
  const result = ExtractionResultSchema.safeParse(data);

  if (result.success) {
    return { success: true, data: result.data };
  }

  return {
    success: false,
    errors: result.error.errors.map((err) => ({
      path: err.path.join("."),
      message: err.message,
    })),
  };
}

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
// Fix/Transformation (for entity type changes)
// -----------------------------------------------------------------------------

export interface FixResult {
  /** Whether the entity type should change */
  shouldTransform: boolean;
  /** The new entity type (if transforming) */
  newType?: Classification;
  /** The fields for the new entity (if transforming) or updates to existing */
  fields: Record<string, unknown>;
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
