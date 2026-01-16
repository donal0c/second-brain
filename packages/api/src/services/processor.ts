// =============================================================================
// Processing Pipeline Service
// =============================================================================
// Core logic for classifying, extracting, and filing inbox items.

import { randomUUID } from "crypto";
import { eq, desc, sql, and, lt } from "drizzle-orm";
import { db, schema } from "../db/index.js";
import { getLLMProvider, hasLLMProvider } from "../llm/index.js";
import type { ClassificationResult, ExtractedContextEntity, PersonalContext, ClarificationContext, ExtractionResult } from "../llm/types.js";
import { validateExtractionResult } from "../llm/types.js";
import { getConfidenceAction, DEFAULT_THRESHOLDS } from "@second-brain/config";

// =============================================================================
// Constants
// =============================================================================

/** Maximum clarification attempts before circuit breaker triggers force-filing */
const MAX_CLARIFICATION_ATTEMPTS = 3;

/** Known safe error code prefixes that don't contain user data */
const SAFE_ERROR_PREFIXES = [
  "LLM_JSON_PARSE_ERROR",
  "ANTHROPIC_API_ERROR",
  "VALIDATION_ERROR",
  "PROCESSING_TIMEOUT",
  "CONTEXT_FETCH_ERROR",
];

/**
 * Sanitize error messages to avoid persisting/exposing sensitive user data.
 * Only allows known safe error codes; replaces unknown errors with opaque message.
 */
function sanitizeErrorMessage(message: string): string {
  // Check if error starts with a known safe prefix
  for (const prefix of SAFE_ERROR_PREFIXES) {
    if (message.startsWith(prefix)) {
      return message.substring(0, 200); // Safe prefix, but truncate
    }
  }
  // Unknown error - return opaque message to avoid leaking user data
  return "PROCESSING_ERROR: An error occurred during processing";
}

// =============================================================================
// Types
// =============================================================================

type EntityWrite = {
  entityType: "task" | "project" | "idea" | "person";
  entityId: string;
  action: "create" | "update";
};

/**
 * Generate a clarification question for validation errors.
 * Handles Zod validation errors and formats them into a user-friendly question.
 */
function buildValidationClarificationQuestion(
  errors: { path: string; message: string }[],
  entityType: string,
  rawText: string
): { question: string; options: string[] | null } {
  // Extract field names from error paths (e.g., "data.title" -> "title")
  const fieldNames = errors.map((e) => {
    const parts = e.path.split(".");
    return parts[parts.length - 1] || e.path;
  });
  const uniqueFields = [...new Set(fieldNames)];
  const fieldList = uniqueFields.join(" and ");
  const truncatedText = rawText.length > 100 ? rawText.substring(0, 100) + "..." : rawText;

  return {
    question: `I couldn't determine the ${fieldList} for this ${entityType}. From your capture "${truncatedText}", what should the ${fieldList} be?`,
    options: null, // Free-form answer needed
  };
}

/**
 * Build best-effort extraction data when circuit breaker triggers.
 * Uses raw text to fill in required fields that couldn't be extracted.
 */
function buildBestEffortExtraction(
  rawText: string,
  classification: string,
  partialData?: Record<string, unknown>
): ExtractionResult {
  const truncatedTitle = rawText.length > 100 ? rawText.substring(0, 100) + "..." : rawText;
  const fallbackAction = "Review and clarify this item";

  switch (classification) {
    case "task":
      return {
        type: "task",
        data: {
          title: (partialData?.title as string) || truncatedTitle,
          nextAction: (partialData?.nextAction as string) || fallbackAction,
          dueDate: (partialData?.dueDate as string) || null,
          context: (partialData?.context as string) || "needs-review",
        },
      };
    case "project":
      return {
        type: "project",
        data: {
          name: (partialData?.name as string) || truncatedTitle,
          desiredOutcome: (partialData?.desiredOutcome as string) || null,
          nextAction: (partialData?.nextAction as string) || fallbackAction,
        },
      };
    case "idea":
      return {
        type: "idea",
        data: {
          title: (partialData?.title as string) || truncatedTitle,
          summary: (partialData?.summary as string) || rawText,
          links: (partialData?.links as string[]) || [],
        },
      };
    case "person":
      return {
        type: "person",
        data: {
          name: (partialData?.name as string) || truncatedTitle,
          relationshipContext: (partialData?.relationshipContext as string) || null,
          followUpNextAction: (partialData?.followUpNextAction as string) || fallbackAction,
        },
      };
    default:
      // Default to idea for unknown classifications
      return {
        type: "idea",
        data: {
          title: truncatedTitle,
          summary: rawText,
          links: [],
        },
      };
  }
}

export interface ProcessResult {
  inboxItemId: string;
  classification: ClassificationResult;
  action: "filed" | "flagged" | "clarify";
  receipt: {
    id: string;
    classification: string;
    extractedFields: Record<string, unknown>;
    confidenceScore: number;
    modelUsed: string;
    timestamp: Date;
    writes: EntityWrite[];
  };
  entity?: {
    type: "task" | "project" | "idea" | "person";
    id: string;
    data: Record<string, unknown>;
  };
  clarification?: {
    id: string;
    question: string;
    options: string[] | null;
  };
}

// Map config action to our action names
function mapAction(configAction: "file" | "flag" | "clarify"): "filed" | "flagged" | "clarify" {
  if (configAction === "file") return "filed";
  if (configAction === "flag") return "flagged";
  return "clarify";
}

// =============================================================================
// Personal Context Loading
// =============================================================================

/**
 * Load personal contexts from the database for injection into LLM prompts.
 * Returns the top N most-mentioned contexts, formatted for the LLM.
 */
async function loadPersonalContexts(limit: number = 20): Promise<PersonalContext[]> {
  const contexts = await db
    .select()
    .from(schema.personalContexts)
    .orderBy(desc(schema.personalContexts.mentionCount))
    .limit(limit);

  return contexts.map((ctx) => ({
    id: ctx.id,
    name: ctx.name,
    type: ctx.type as PersonalContext["type"],
    description: ctx.description,
    domain: ctx.domain,
  }));
}

/**
 * Find which personal contexts appear in the given text.
 * Returns IDs of contexts that were potentially relevant.
 */
function findRelevantContexts(text: string, contexts: PersonalContext[]): string[] {
  const lowerText = text.toLowerCase();
  return contexts
    .filter((ctx) => lowerText.includes(ctx.name.toLowerCase()))
    .map((ctx) => ctx.id);
}

// =============================================================================
// Main Processing Function
// =============================================================================

/**
 * Process a single inbox item through the classification and extraction pipeline
 * @param inboxItemId - The inbox item to process
 * @param clarification - Optional clarification context from a resolved clarification
 */
export async function processInboxItem(
  inboxItemId: string,
  clarification?: ClarificationContext
): Promise<ProcessResult> {
  if (!hasLLMProvider()) {
    throw new Error("LLM provider not configured. Set ANTHROPIC_API_KEY to enable processing.");
  }

  const provider = getLLMProvider();

  // Fetch the inbox item
  const items = await db
    .select()
    .from(schema.inboxItems)
    .where(eq(schema.inboxItems.id, inboxItemId))
    .limit(1);

  if (items.length === 0) {
    throw new Error(`Inbox item not found: ${inboxItemId}`);
  }

  const inboxItem = items[0];

  if (inboxItem.status !== "new") {
    throw new Error(`Inbox item ${inboxItemId} is not in 'new' status (current: ${inboxItem.status})`);
  }

  // Mark as processing with timestamp for stale detection
  await db
    .update(schema.inboxItems)
    .set({ status: "processing", processingStartedAt: new Date() })
    .where(eq(schema.inboxItems.id, inboxItemId));

  try {
    // Step 0: Load personal context for smarter processing
    const personalContexts = await loadPersonalContexts();
    const relevantContextIds = findRelevantContexts(inboxItem.rawText, personalContexts);

    // Step 1: Classify the item (with context injection and clarification if provided)
    const classification = await provider.classify(inboxItem.rawText, personalContexts, clarification);

    // Step 2: Determine action based on confidence
    const configAction = getConfidenceAction(classification.confidence, DEFAULT_THRESHOLDS);
    const action = mapAction(configAction);

    // Step 3: Handle based on action
    let result: ProcessResult;

    // Circuit breaker: check if we've exceeded max clarification attempts
    const attemptsExceeded = inboxItem.clarificationAttempts >= MAX_CLARIFICATION_ATTEMPTS;

    if ((action === "clarify" || classification.classification === "unknown") && !attemptsExceeded) {
      // Low confidence or unknown - create clarification (if attempts not exceeded)
      result = await handleClarification(
        inboxItem,
        classification,
        provider,
        relevantContextIds
      );
    } else if (attemptsExceeded && (action === "clarify" || classification.classification === "unknown")) {
      // Circuit breaker triggered: force-file with best-effort data
      console.log(`[CIRCUIT_BREAKER] Force-filing inbox item ${inboxItem.id} after ${inboxItem.clarificationAttempts} clarification attempts`);
      result = await handleForceFile(
        inboxItem,
        classification,
        provider,
        personalContexts,
        relevantContextIds,
        clarification
      );
    } else {
      // High/medium confidence - extract and file
      // At this point, action can only be 'filed' or 'flagged' (clarify is handled above)
      const extractionAction = action === "clarify" ? "flagged" : action;
      result = await handleExtraction(
        inboxItem,
        classification,
        extractionAction,
        provider,
        personalContexts,
        relevantContextIds,
        clarification
      );
    }

    // Update inbox item status (clear processing timestamp on success)
    const finalStatus = result.clarification ? "blocked" : "processed";
    await db
      .update(schema.inboxItems)
      .set({ status: finalStatus, processingStartedAt: null })
      .where(eq(schema.inboxItems.id, inboxItemId));

    return result;
  } catch (error) {
    // Sanitize error message to avoid exposing sensitive data (e.g., user prompts in LLM responses)
    const rawMessage = error instanceof Error ? error.message : String(error);
    const sanitizedMessage = sanitizeErrorMessage(rawMessage);
    await db
      .update(schema.inboxItems)
      .set({
        status: "error",
        processingStartedAt: null,
        errorMessage: sanitizedMessage,
      })
      .where(eq(schema.inboxItems.id, inboxItemId));
    throw error;
  }
}

// =============================================================================
// Helper Functions
// =============================================================================

async function handleClarification(
  inboxItem: typeof schema.inboxItems.$inferSelect,
  classification: ClassificationResult,
  provider: ReturnType<typeof getLLMProvider>,
  relevantContextIds: string[]
): Promise<ProcessResult> {
  // Generate clarification question
  const clarificationQuestion = await provider.generateClarification(
    inboxItem.rawText,
    classification
  );

  // Create clarification record
  const clarificationId = randomUUID();
  await db.insert(schema.clarifications).values({
    id: clarificationId,
    inboxItemId: inboxItem.id,
    question: clarificationQuestion.question,
    options: clarificationQuestion.options,
    createdAt: new Date(),
  });

  // Create receipt (no entity created, but track context used)
  const receiptId = randomUUID();
  const timestamp = new Date();
  const receiptData = {
    id: receiptId,
    inboxItemId: inboxItem.id,
    classification: classification.classification,
    extractedFields: { reasoning: classification.reasoning },
    confidenceScore: classification.confidence,
    modelUsed: provider.model,
    timestamp,
    writes: [] as EntityWrite[],
    personalContextUsed: relevantContextIds,
  };

  await db.insert(schema.receipts).values(receiptData);

  return {
    inboxItemId: inboxItem.id,
    classification,
    action: "clarify",
    receipt: receiptData,
    clarification: {
      id: clarificationId,
      question: clarificationQuestion.question,
      options: clarificationQuestion.options,
    },
  };
}

/**
 * Force-file an item when circuit breaker triggers.
 * Uses best-effort extraction to fill in missing required fields.
 */
async function handleForceFile(
  inboxItem: typeof schema.inboxItems.$inferSelect,
  classification: ClassificationResult,
  provider: ReturnType<typeof getLLMProvider>,
  personalContexts: PersonalContext[],
  relevantContextIds: string[],
  clarification?: ClarificationContext
): Promise<ProcessResult> {
  // Try to extract structured data
  let extraction: ExtractionResult;
  let wasForced = false;

  try {
    extraction = await provider.extract(
      inboxItem.rawText,
      classification.classification,
      personalContexts,
      clarification
    );

    // Validate extraction - if invalid, use best-effort
    const validation = validateExtractionResult(extraction);
    if (!validation.success) {
      console.log(`[CIRCUIT_BREAKER] Validation failed for ${inboxItem.id}, using best-effort extraction`);
      extraction = buildBestEffortExtraction(
        inboxItem.rawText,
        classification.classification,
        extraction.data as unknown as Record<string, unknown>
      );
      wasForced = true;
    }
  } catch (error) {
    // LLM extraction failed - use best-effort
    console.log(`[CIRCUIT_BREAKER] LLM extraction failed for ${inboxItem.id}, using best-effort extraction:`, error);
    extraction = buildBestEffortExtraction(inboxItem.rawText, classification.classification);
    wasForced = true;
  }

  // Create the entity and receipt
  const entityId = randomUUID();
  const receiptId = randomUUID();
  const now = new Date();
  let entityData: Record<string, unknown>;

  const writes: EntityWrite[] = [
    {
      entityType: extraction.type,
      entityId,
      action: "create",
    },
  ];

  const receiptData = {
    id: receiptId,
    inboxItemId: inboxItem.id,
    classification: classification.classification,
    extractedFields: {
      ...extraction.data as unknown as Record<string, unknown>,
      _circuitBreakerTriggered: wasForced,
      _clarificationAttempts: inboxItem.clarificationAttempts,
    },
    confidenceScore: classification.confidence,
    modelUsed: provider.model,
    timestamp: now,
    writes,
    personalContextUsed: relevantContextIds,
  };

  // Execute entity creation in transaction
  // Force-filed items always need review
  await db.transaction(async (tx) => {
    switch (extraction.type) {
      case "task": {
        const taskData = {
          id: entityId,
          title: extraction.data.title,
          nextAction: extraction.data.nextAction,
          dueDate: extraction.data.dueDate ? new Date(extraction.data.dueDate) : null,
          context: extraction.data.context,
          status: "active" as const,
          needsReview: true,
          sourceInboxItemId: inboxItem.id,
          createdAt: now,
          updatedAt: now,
        };
        await tx.insert(schema.tasks).values(taskData);
        entityData = taskData;
        break;
      }
      case "project": {
        const projectData = {
          id: entityId,
          name: extraction.data.name,
          desiredOutcome: extraction.data.desiredOutcome,
          nextAction: extraction.data.nextAction,
          status: "active" as const,
          needsReview: true,
          sourceInboxItemId: inboxItem.id,
          createdAt: now,
          updatedAt: now,
        };
        await tx.insert(schema.projects).values(projectData);
        entityData = projectData;
        break;
      }
      case "idea": {
        const ideaData = {
          id: entityId,
          title: extraction.data.title,
          summary: extraction.data.summary,
          links: extraction.data.links,
          needsReview: true,
          sourceInboxItemId: inboxItem.id,
          createdAt: now,
          updatedAt: now,
        };
        await tx.insert(schema.ideas).values(ideaData);
        entityData = ideaData;
        break;
      }
      case "person": {
        const personData = {
          id: entityId,
          name: extraction.data.name,
          relationshipContext: extraction.data.relationshipContext,
          followUpNextAction: extraction.data.followUpNextAction,
          lastTouchedAt: now,
          needsReview: true,
          sourceInboxItemId: inboxItem.id,
          createdAt: now,
          updatedAt: now,
        };
        await tx.insert(schema.persons).values(personData);
        entityData = personData;
        break;
      }
    }

    await tx.insert(schema.receipts).values(receiptData);
  });

  console.log(`[CIRCUIT_BREAKER] Successfully force-filed ${inboxItem.id} as ${extraction.type} (entity: ${entityId})`);

  return {
    inboxItemId: inboxItem.id,
    classification,
    action: "flagged", // Mark as flagged since it was force-filed
    receipt: receiptData,
    entity: {
      type: extraction.type,
      id: entityId,
      data: entityData!,
    },
  };
}

async function handleExtraction(
  inboxItem: typeof schema.inboxItems.$inferSelect,
  classification: ClassificationResult,
  action: "filed" | "flagged",
  provider: ReturnType<typeof getLLMProvider>,
  personalContexts: PersonalContext[],
  relevantContextIds: string[],
  clarification?: ClarificationContext
): Promise<ProcessResult> {
  // Extract structured data based on classification (with context and clarification injection)
  const rawExtraction = await provider.extract(
    inboxItem.rawText,
    classification.classification,
    personalContexts,
    clarification
  );

  // Validate extraction results using Zod schemas before DB insert
  const validation = validateExtractionResult(rawExtraction);
  if (!validation.success) {
    // Create clarification for validation errors (missing/invalid fields)
    const clarificationQuestion = buildValidationClarificationQuestion(
      validation.errors,
      classification.classification,
      inboxItem.rawText
    );

    const clarificationId = randomUUID();
    await db.insert(schema.clarifications).values({
      id: clarificationId,
      inboxItemId: inboxItem.id,
      question: clarificationQuestion.question,
      options: clarificationQuestion.options,
      createdAt: new Date(),
    });

    // Create error receipt for debugging (tracks validation failure)
    const receiptId = randomUUID();
    const timestamp = new Date();
    const errorDetails = validation.errors.map((e) => `${e.path}: ${e.message}`).join("; ");
    const receiptData = {
      id: receiptId,
      inboxItemId: inboxItem.id,
      classification: classification.classification,
      extractedFields: {
        _rawExtraction: rawExtraction,
        _validationError: `Zod validation failed: ${errorDetails}`,
      },
      confidenceScore: classification.confidence,
      modelUsed: provider.model,
      timestamp,
      writes: [] as EntityWrite[],
      personalContextUsed: relevantContextIds,
    };

    await db.insert(schema.receipts).values(receiptData);

    return {
      inboxItemId: inboxItem.id,
      classification,
      action: "clarify",
      receipt: receiptData,
      clarification: {
        id: clarificationId,
        question: clarificationQuestion.question,
        options: clarificationQuestion.options,
      },
    };
  }

  // Validation passed - use the validated extraction data
  const extraction = validation.data;

  // Create the entity and receipt in a transaction for data consistency
  const entityId = randomUUID();
  const receiptId = randomUUID();
  const now = new Date();
  let entityData: Record<string, unknown>;

  // Prepare receipt data
  const writes: EntityWrite[] = [
    {
      entityType: extraction.type,
      entityId,
      action: "create",
    },
  ];
  const receiptData = {
    id: receiptId,
    inboxItemId: inboxItem.id,
    classification: classification.classification,
    extractedFields: extraction.data as unknown as Record<string, unknown>,
    confidenceScore: classification.confidence,
    modelUsed: provider.model,
    timestamp: now,
    writes,
    personalContextUsed: relevantContextIds,
  };

  // Flagged items need human review - set needsReview flag
  const needsReview = action === "flagged";

  // Execute entity creation and receipt in a transaction
  await db.transaction(async (tx) => {
    switch (extraction.type) {
      case "task": {
        const taskData = {
          id: entityId,
          title: extraction.data.title,
          nextAction: extraction.data.nextAction,
          dueDate: extraction.data.dueDate ? new Date(extraction.data.dueDate) : null,
          context: extraction.data.context,
          status: "active" as const,
          needsReview,
          sourceInboxItemId: inboxItem.id,
          createdAt: now,
          updatedAt: now,
        };
        await tx.insert(schema.tasks).values(taskData);
        entityData = taskData;
        break;
      }

      case "project": {
        const projectData = {
          id: entityId,
          name: extraction.data.name,
          desiredOutcome: extraction.data.desiredOutcome,
          nextAction: extraction.data.nextAction,
          status: "active" as const,
          needsReview,
          sourceInboxItemId: inboxItem.id,
          createdAt: now,
          updatedAt: now,
        };
        await tx.insert(schema.projects).values(projectData);
        entityData = projectData;
        break;
      }

      case "idea": {
        const ideaData = {
          id: entityId,
          title: extraction.data.title,
          summary: extraction.data.summary,
          links: extraction.data.links,
          needsReview,
          sourceInboxItemId: inboxItem.id,
          createdAt: now,
          updatedAt: now,
        };
        await tx.insert(schema.ideas).values(ideaData);
        entityData = ideaData;
        break;
      }

      case "person": {
        const personData = {
          id: entityId,
          name: extraction.data.name,
          relationshipContext: extraction.data.relationshipContext,
          followUpNextAction: extraction.data.followUpNextAction,
          lastTouchedAt: now,
          needsReview,
          sourceInboxItemId: inboxItem.id,
          createdAt: now,
          updatedAt: now,
        };
        await tx.insert(schema.persons).values(personData);
        entityData = personData;
        break;
      }
    }

    // Create receipt in same transaction
    await tx.insert(schema.receipts).values(receiptData);
  });

  // Extract personal context entities (async, non-blocking for main flow)
  // This is where the system "learns" about the user's world
  // Status is tracked in receipt.contextExtractionStatus
  void extractAndStoreContext(inboxItem.rawText, receiptId);

  return {
    inboxItemId: inboxItem.id,
    classification,
    action,
    receipt: receiptData,
    entity: {
      type: extraction.type,
      id: entityId,
      data: entityData!,
    },
  };
}

/**
 * Process multiple inbox items in batch
 */
export async function processBatch(
  limit: number = 10
): Promise<{ processed: number; results: ProcessResult[] }> {
  // Get pending items
  const pendingItems = await db
    .select()
    .from(schema.inboxItems)
    .where(eq(schema.inboxItems.status, "new"))
    .limit(limit);

  const results: ProcessResult[] = [];

  for (const item of pendingItems) {
    try {
      const result = await processInboxItem(item.id);
      results.push(result);
    } catch (error) {
      // Log error but continue processing other items
      console.error(`Failed to process ${item.id}:`, error);
    }
  }

  return {
    processed: results.length,
    results,
  };
}

// =============================================================================
// Stale Processing Recovery
// =============================================================================

/** Default threshold for stale processing detection (5 minutes) */
const STALE_PROCESSING_THRESHOLD_MS = 5 * 60 * 1000;

/**
 * Recover items stuck in 'processing' status due to server crash.
 * Items in 'processing' for longer than the threshold are reset to 'new'.
 * @param thresholdMs - Time in ms before an item is considered stale (default: 5 minutes)
 * @returns Number of items recovered
 */
export async function recoverStaleProcessingItems(
  thresholdMs: number = STALE_PROCESSING_THRESHOLD_MS
): Promise<number> {
  const cutoffTime = new Date(Date.now() - thresholdMs);

  // Find and reset items stuck in 'processing' for too long
  const result = await db
    .update(schema.inboxItems)
    .set({ status: "new", processingStartedAt: null })
    .where(
      and(
        eq(schema.inboxItems.status, "processing"),
        lt(schema.inboxItems.processingStartedAt, cutoffTime)
      )
    )
    .returning({ id: schema.inboxItems.id });

  return result.length;
}

// =============================================================================
// Personal Context Extraction
// =============================================================================

/**
 * Extract and store personal context entities from processed text.
 * Updates the receipt with the extraction status (success/failed/skipped).
 */
export async function extractAndStoreContext(
  text: string,
  receiptId: string
): Promise<string[]> {
  // Helper to update receipt status
  const updateReceiptStatus = async (status: "success" | "failed" | "skipped") => {
    try {
      await db
        .update(schema.receipts)
        .set({ contextExtractionStatus: status })
        .where(eq(schema.receipts.id, receiptId));
    } catch (err) {
      console.error(`Failed to update receipt ${receiptId} context extraction status:`, err);
    }
  };

  if (!hasLLMProvider()) {
    await updateReceiptStatus("skipped");
    return [];
  }

  const provider = getLLMProvider();

  try {
    const { entities } = await provider.extractContextEntities(text);

    if (entities.length === 0) {
      await updateReceiptStatus("success");
      return [];
    }

    const storedIds: string[] = [];

    for (const entity of entities) {
      const contextId = await upsertPersonalContext(entity, receiptId);
      storedIds.push(contextId);
    }

    await updateReceiptStatus("success");
    return storedIds;
  } catch (error) {
    console.error("Failed to extract context entities:", error);
    await updateReceiptStatus("failed");
    return [];
  }
}

/**
 * Create or update a personal context entity
 * Uses INSERT ... ON CONFLICT for atomic upsert to prevent race conditions
 */
async function upsertPersonalContext(
  entity: ExtractedContextEntity,
  receiptId: string
): Promise<string> {
  const now = new Date();
  const id = randomUUID();

  // Atomic upsert using ON CONFLICT with expression index on lower(name)
  // This prevents duplicate entries from concurrent extractions
  const result = await db.execute(sql`
    INSERT INTO personal_contexts (id, name, type, description, domain, mention_count, learned_from, created_at, updated_at)
    VALUES (
      ${id},
      ${entity.name},
      ${entity.type},
      ${entity.description},
      ${entity.domain},
      1,
      ${JSON.stringify([receiptId])}::jsonb,
      ${now},
      ${now}
    )
    ON CONFLICT ((LOWER(name))) DO UPDATE SET
      mention_count = personal_contexts.mention_count + 1,
      learned_from = personal_contexts.learned_from || ${JSON.stringify([receiptId])}::jsonb,
      domain = COALESCE(personal_contexts.domain, EXCLUDED.domain),
      description = COALESCE(personal_contexts.description, EXCLUDED.description),
      updated_at = EXCLUDED.updated_at
    RETURNING id
  `);

  // Return the id (either new or existing)
  // db.execute returns RowList which is array-like, access first element directly
  return (result[0] as { id: string }).id;
}
