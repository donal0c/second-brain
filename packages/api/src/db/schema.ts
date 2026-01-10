import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";

// =============================================================================
// Database Schema
// =============================================================================
// Matches the shared types package exactly

// --- Inbox Items ---
export const inboxItems = sqliteTable("inbox_items", {
  id: text("id").primaryKey(),
  capturedAt: integer("captured_at", { mode: "timestamp" }).notNull(),
  rawText: text("raw_text").notNull(),
  source: text("source").notNull().default("web"),
  status: text("status", { enum: ["new", "processing", "processed", "blocked"] })
    .notNull()
    .default("new"),
});

// --- Tasks ---
export const tasks = sqliteTable("tasks", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  nextAction: text("next_action").notNull(),
  dueDate: integer("due_date", { mode: "timestamp" }),
  context: text("context"),
  status: text("status", { enum: ["active", "completed", "waiting", "someday"] })
    .notNull()
    .default("active"),
  sourceInboxItemId: text("source_inbox_item_id").references(() => inboxItems.id),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
});

// --- Projects ---
export const projects = sqliteTable("projects", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  desiredOutcome: text("desired_outcome"),
  nextAction: text("next_action"),
  status: text("status", { enum: ["active", "completed", "on_hold", "someday"] })
    .notNull()
    .default("active"),
  sourceInboxItemId: text("source_inbox_item_id").references(() => inboxItems.id),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
});

// --- Ideas ---
export const ideas = sqliteTable("ideas", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  summary: text("summary"),
  links: text("links", { mode: "json" }).$type<string[]>().default([]),
  sourceInboxItemId: text("source_inbox_item_id").references(() => inboxItems.id),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
});

// --- Persons ---
export const persons = sqliteTable("persons", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  relationshipContext: text("relationship_context"),
  lastTouchedAt: integer("last_touched_at", { mode: "timestamp" }),
  followUpNextAction: text("follow_up_next_action"),
  sourceInboxItemId: text("source_inbox_item_id").references(() => inboxItems.id),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
});

// --- Receipts (Audit Trail) ---
export const receipts = sqliteTable("receipts", {
  id: text("id").primaryKey(),
  inboxItemId: text("inbox_item_id")
    .notNull()
    .references(() => inboxItems.id),
  classification: text("classification", {
    enum: ["task", "project", "idea", "person", "unknown"],
  }).notNull(),
  extractedFields: text("extracted_fields", { mode: "json" })
    .$type<Record<string, unknown>>()
    .notNull(),
  confidenceScore: real("confidence_score").notNull(),
  modelUsed: text("model_used").notNull(),
  timestamp: integer("timestamp", { mode: "timestamp" }).notNull(),
  writes: text("writes", { mode: "json" })
    .$type<
      Array<{
        entityType: "task" | "project" | "idea" | "person";
        entityId: string;
        action: "create" | "update";
      }>
    >()
    .notNull(),
  previousReceiptId: text("previous_receipt_id"), // Self-reference handled at app level
  personalContextUsed: text("personal_context_used", { mode: "json" })
    .$type<string[]>()
    .default([]),
});

// --- Clarifications ---
export const clarifications = sqliteTable("clarifications", {
  id: text("id").primaryKey(),
  inboxItemId: text("inbox_item_id")
    .notNull()
    .references(() => inboxItems.id),
  question: text("question").notNull(),
  options: text("options", { mode: "json" }).$type<string[] | null>(),
  userAnswer: text("user_answer"),
  resolvedAt: integer("resolved_at", { mode: "timestamp" }),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
});

// --- Personal Context (learned entities from captures) ---
export const personalContexts = sqliteTable("personal_contexts", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  type: text("type", { enum: ["person", "place", "organization", "concept"] }).notNull(),
  description: text("description"),
  domain: text("domain"), // e.g., "work", "family", "health"
  mentionCount: integer("mention_count").notNull().default(1),
  learnedFrom: text("learned_from", { mode: "json" }).$type<string[]>().default([]),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
});
