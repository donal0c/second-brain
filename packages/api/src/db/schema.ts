import { pgTable, text, integer, real, timestamp, jsonb, index, boolean, vector } from "drizzle-orm/pg-core";

// =============================================================================
// Database Schema
// =============================================================================
// Matches the shared types package exactly

// --- Inbox Items ---
export const inboxItems = pgTable("inbox_items", {
  id: text("id").primaryKey(),
  capturedAt: timestamp("captured_at").notNull(),
  rawText: text("raw_text").notNull(),
  source: text("source").notNull().default("web"),
  status: text("status", { enum: ["new", "processing", "processed", "blocked", "error"] })
    .notNull()
    .default("new"),
  processingStartedAt: timestamp("processing_started_at"),
  errorMessage: text("error_message"),
  clarificationAttempts: integer("clarification_attempts").notNull().default(0),
  embedding: vector("embedding", { dimensions: 1536 }),
}, (table) => ({
  statusIdx: index("inbox_items_status_idx").on(table.status),
  capturedAtIdx: index("inbox_items_captured_at_idx").on(table.capturedAt),
}));

// --- Tasks ---
export const tasks = pgTable("tasks", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  nextAction: text("next_action").notNull(),
  dueDate: timestamp("due_date"),
  context: text("context"),
  status: text("status", { enum: ["active", "completed", "waiting", "someday"] })
    .notNull()
    .default("active"),
  needsReview: boolean("needs_review").notNull().default(false),
  sourceInboxItemId: text("source_inbox_item_id").references(() => inboxItems.id, { onDelete: 'set null' }),
  createdAt: timestamp("created_at").notNull(),
  updatedAt: timestamp("updated_at").notNull(),
  embedding: vector("embedding", { dimensions: 1536 }),
}, (table) => ({
  statusIdx: index("tasks_status_idx").on(table.status),
  contextIdx: index("tasks_context_idx").on(table.context),
  needsReviewIdx: index("tasks_needs_review_idx").on(table.needsReview),
}));

// --- Projects ---
export const projects = pgTable("projects", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  desiredOutcome: text("desired_outcome"),
  nextAction: text("next_action"),
  status: text("status", { enum: ["active", "completed", "on_hold", "someday"] })
    .notNull()
    .default("active"),
  needsReview: boolean("needs_review").notNull().default(false),
  sourceInboxItemId: text("source_inbox_item_id").references(() => inboxItems.id, { onDelete: 'set null' }),
  createdAt: timestamp("created_at").notNull(),
  updatedAt: timestamp("updated_at").notNull(),
  embedding: vector("embedding", { dimensions: 1536 }),
}, (table) => ({
  needsReviewIdx: index("projects_needs_review_idx").on(table.needsReview),
}));

// --- Ideas ---
export const ideas = pgTable("ideas", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  summary: text("summary"),
  links: jsonb("links").$type<string[]>().default([]),
  needsReview: boolean("needs_review").notNull().default(false),
  sourceInboxItemId: text("source_inbox_item_id").references(() => inboxItems.id, { onDelete: 'set null' }),
  createdAt: timestamp("created_at").notNull(),
  updatedAt: timestamp("updated_at").notNull(),
  embedding: vector("embedding", { dimensions: 1536 }),
}, (table) => ({
  needsReviewIdx: index("ideas_needs_review_idx").on(table.needsReview),
}));

// --- Persons ---
export const persons = pgTable("persons", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  relationshipContext: text("relationship_context"),
  lastTouchedAt: timestamp("last_touched_at"),
  followUpNextAction: text("follow_up_next_action"),
  needsReview: boolean("needs_review").notNull().default(false),
  sourceInboxItemId: text("source_inbox_item_id").references(() => inboxItems.id, { onDelete: 'set null' }),
  createdAt: timestamp("created_at").notNull(),
  updatedAt: timestamp("updated_at").notNull(),
  embedding: vector("embedding", { dimensions: 1536 }),
}, (table) => ({
  needsReviewIdx: index("persons_needs_review_idx").on(table.needsReview),
}));

// --- Receipts (Audit Trail) ---
export const receipts = pgTable("receipts", {
  id: text("id").primaryKey(),
  inboxItemId: text("inbox_item_id")
    .references(() => inboxItems.id, { onDelete: 'set null' }),
  classification: text("classification", {
    enum: ["task", "project", "idea", "person", "unknown"],
  }).notNull(),
  extractedFields: jsonb("extracted_fields")
    .$type<Record<string, unknown>>()
    .notNull(),
  confidenceScore: real("confidence_score").notNull(),
  modelUsed: text("model_used").notNull(),
  timestamp: timestamp("timestamp").notNull(),
  writes: jsonb("writes")
    .$type<
      Array<{
        entityType: "task" | "project" | "idea" | "person";
        entityId: string;
        action: "create" | "update";
      }>
    >()
    .notNull(),
  previousReceiptId: text("previous_receipt_id"), // Self-reference handled at app level
  personalContextUsed: jsonb("personal_context_used")
    .$type<string[]>()
    .default([]),
  contextExtractionStatus: text("context_extraction_status", {
    enum: ["pending", "success", "failed", "skipped"],
  }).default("pending"),
}, (table) => ({
  inboxItemIdIdx: index("receipts_inbox_item_id_idx").on(table.inboxItemId),
  timestampIdx: index("receipts_timestamp_idx").on(table.timestamp),
}));

// --- Clarifications ---
export const clarifications = pgTable("clarifications", {
  id: text("id").primaryKey(),
  inboxItemId: text("inbox_item_id")
    .notNull()
    .references(() => inboxItems.id, { onDelete: 'cascade' }),
  question: text("question").notNull(),
  options: jsonb("options").$type<string[] | null>(),
  userAnswer: text("user_answer"),
  resolvedAt: timestamp("resolved_at"),
  createdAt: timestamp("created_at").notNull(),
}, (table) => ({
  resolvedAtIdx: index("clarifications_resolved_at_idx").on(table.resolvedAt),
}));

// --- Personal Context (learned entities from captures) ---
export const personalContexts = pgTable("personal_contexts", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  type: text("type", { enum: ["person", "place", "organization", "concept"] }).notNull(),
  description: text("description"),
  domain: text("domain"), // e.g., "work", "family", "health"
  mentionCount: integer("mention_count").notNull().default(1),
  learnedFrom: jsonb("learned_from").$type<string[]>().default([]),
  createdAt: timestamp("created_at").notNull(),
  updatedAt: timestamp("updated_at").notNull(),
  embedding: vector("embedding", { dimensions: 1536 }),
}, (table) => ({
  nameIdx: index("personal_contexts_name_idx").on(table.name),
  mentionCountIdx: index("personal_contexts_mention_count_idx").on(table.mentionCount),
}));

// --- Nudges (contextual micro-prompts) ---
export const nudges = pgTable("nudges", {
  id: text("id").primaryKey(),
  type: text("type", {
    enum: [
      "follow_up_overdue",
      "project_missing_next_action",
      "task_due_soon",
      "task_stale",
      "person_follow_up"
    ],
  }).notNull(),
  message: text("message").notNull(),
  entityType: text("entity_type", { enum: ["task", "project", "person"] }).notNull(),
  entityId: text("entity_id").notNull(),
  createdAt: timestamp("created_at").notNull(),
  dismissedAt: timestamp("dismissed_at"),
  snoozedUntil: timestamp("snoozed_until"),
}, (table) => ({
  createdAtIdx: index("nudges_created_at_idx").on(table.createdAt),
  entityIdx: index("nudges_entity_idx").on(table.entityType, table.entityId),
  dismissedAtIdx: index("nudges_dismissed_at_idx").on(table.dismissedAt),
}));
