// =============================================================================
// Processing Pipeline Service
// =============================================================================
// Core logic for classifying, extracting, and filing inbox items.

import { randomUUID } from "crypto";
import { eq } from "drizzle-orm";
import { db, schema } from "../db/index.js";
import { getLLMProvider, hasLLMProvider } from "../llm/index.js";
import type { ClassificationResult, ExtractedContextEntity } from "../llm/types.js";
import { getConfidenceAction, DEFAULT_THRESHOLDS } from "@second-brain/config";

// =============================================================================
// Types
// =============================================================================

type EntityWrite = {
  entityType: "task" | "project" | "idea" | "person";
  entityId: string;
  action: "create" | "update";
};

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
// Main Processing Function
// =============================================================================

/**
 * Process a single inbox item through the classification and extraction pipeline
 */
export async function processInboxItem(inboxItemId: string): Promise<ProcessResult> {
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

  // Mark as processing
  await db
    .update(schema.inboxItems)
    .set({ status: "processing" })
    .where(eq(schema.inboxItems.id, inboxItemId));

  try {
    // Step 1: Classify the item
    const classification = await provider.classify(inboxItem.rawText);

    // Step 2: Determine action based on confidence
    const configAction = getConfidenceAction(classification.confidence, DEFAULT_THRESHOLDS);
    const action = mapAction(configAction);

    // Step 3: Handle based on action
    let result: ProcessResult;

    if (action === "clarify" || classification.classification === "unknown") {
      // Low confidence or unknown - create clarification
      result = await handleClarification(
        inboxItem,
        classification,
        provider
      );
    } else {
      // High/medium confidence - extract and file
      result = await handleExtraction(
        inboxItem,
        classification,
        action,
        provider
      );
    }

    // Update inbox item status
    const finalStatus = result.clarification ? "blocked" : "processed";
    await db
      .update(schema.inboxItems)
      .set({ status: finalStatus })
      .where(eq(schema.inboxItems.id, inboxItemId));

    return result;
  } catch (error) {
    // Reset status on error
    await db
      .update(schema.inboxItems)
      .set({ status: "new" })
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
  provider: ReturnType<typeof getLLMProvider>
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

  // Create receipt (no entity created)
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

async function handleExtraction(
  inboxItem: typeof schema.inboxItems.$inferSelect,
  classification: ClassificationResult,
  action: "filed" | "flagged",
  provider: ReturnType<typeof getLLMProvider>
): Promise<ProcessResult> {
  // Extract structured data based on classification
  const extraction = await provider.extract(
    inboxItem.rawText,
    classification.classification
  );

  // Create the entity
  const entityId = randomUUID();
  const now = new Date();
  let entityData: Record<string, unknown>;

  switch (extraction.type) {
    case "task": {
      const taskData = {
        id: entityId,
        title: extraction.data.title,
        nextAction: extraction.data.nextAction,
        dueDate: extraction.data.dueDate ? new Date(extraction.data.dueDate) : null,
        context: extraction.data.context,
        status: "active" as const,
        sourceInboxItemId: inboxItem.id,
        createdAt: now,
        updatedAt: now,
      };
      await db.insert(schema.tasks).values(taskData);
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
        sourceInboxItemId: inboxItem.id,
        createdAt: now,
        updatedAt: now,
      };
      await db.insert(schema.projects).values(projectData);
      entityData = projectData;
      break;
    }

    case "idea": {
      const ideaData = {
        id: entityId,
        title: extraction.data.title,
        summary: extraction.data.summary,
        links: extraction.data.links,
        sourceInboxItemId: inboxItem.id,
        createdAt: now,
        updatedAt: now,
      };
      await db.insert(schema.ideas).values(ideaData);
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
        sourceInboxItemId: inboxItem.id,
        createdAt: now,
        updatedAt: now,
      };
      await db.insert(schema.persons).values(personData);
      entityData = personData;
      break;
    }
  }

  // Create receipt
  const receiptId = randomUUID();
  const timestamp = new Date();
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
    timestamp,
    writes,
  };

  await db.insert(schema.receipts).values(receiptData);

  // Extract personal context entities (async, non-blocking for main flow)
  // This is where the system "learns" about the user's world
  extractAndStoreContext(inboxItem.rawText, receiptId).catch((err) =>
    console.error("Context extraction failed:", err)
  );

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
// Personal Context Extraction
// =============================================================================

/**
 * Extract and store personal context entities from processed text
 */
export async function extractAndStoreContext(
  text: string,
  receiptId: string
): Promise<string[]> {
  if (!hasLLMProvider()) {
    return [];
  }

  const provider = getLLMProvider();

  try {
    const { entities } = await provider.extractContextEntities(text);

    if (entities.length === 0) {
      return [];
    }

    const storedIds: string[] = [];

    for (const entity of entities) {
      const contextId = await upsertPersonalContext(entity, receiptId);
      storedIds.push(contextId);
    }

    return storedIds;
  } catch (error) {
    // Log but don't fail the main processing
    console.error("Failed to extract context entities:", error);
    return [];
  }
}

/**
 * Create or update a personal context entity
 */
async function upsertPersonalContext(
  entity: ExtractedContextEntity,
  receiptId: string
): Promise<string> {
  const now = new Date();

  // Check if entity already exists (case-insensitive name match)
  const existing = await db
    .select()
    .from(schema.personalContexts)
    .where(eq(schema.personalContexts.name, entity.name))
    .limit(1);

  if (existing.length > 0) {
    // Update existing: increment mention count, add receipt to learnedFrom
    const current = existing[0];
    const learnedFrom = [...(current.learnedFrom || []), receiptId];

    await db
      .update(schema.personalContexts)
      .set({
        mentionCount: current.mentionCount + 1,
        learnedFrom,
        // Update domain if we learned a new one and didn't have one before
        domain: current.domain || entity.domain,
        updatedAt: now,
      })
      .where(eq(schema.personalContexts.id, current.id));

    return current.id;
  } else {
    // Create new
    const id = randomUUID();
    await db.insert(schema.personalContexts).values({
      id,
      name: entity.name,
      type: entity.type,
      domain: entity.domain,
      mentionCount: 1,
      learnedFrom: [receiptId],
      createdAt: now,
      updatedAt: now,
    });

    return id;
  }
}
