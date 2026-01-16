import { z } from "zod";

// =============================================================================
// Enums & Constants
// =============================================================================

export const InboxItemStatus = {
  NEW: "new",
  PROCESSING: "processing",
  PROCESSED: "processed",
  BLOCKED: "blocked",
  ERROR: "error",
} as const;

export const EntityType = {
  TASK: "task",
  PROJECT: "project",
  IDEA: "idea",
  PERSON: "person",
  UNKNOWN: "unknown",
} as const;

export const TaskStatus = {
  ACTIVE: "active",
  COMPLETED: "completed",
  WAITING: "waiting",
  SOMEDAY: "someday",
} as const;

export const ProjectStatus = {
  ACTIVE: "active",
  COMPLETED: "completed",
  ON_HOLD: "on_hold",
  SOMEDAY: "someday",
} as const;

// =============================================================================
// Zod Schemas
// =============================================================================

// --- InboxItem ---
export const InboxItemSchema = z.object({
  id: z.string().uuid(),
  capturedAt: z.coerce.date(),
  rawText: z.string().min(1),
  source: z.string().default("web"),
  status: z.enum(["new", "processing", "processed", "blocked", "error"]).default("new"),
  errorMessage: z.string().nullable().optional(),
  clarificationAttempts: z.number().int().min(0).default(0),
});

export type InboxItem = z.infer<typeof InboxItemSchema>;

export const CreateInboxItemSchema = InboxItemSchema.omit({
  id: true,
  capturedAt: true,
  status: true,
});

export type CreateInboxItem = z.infer<typeof CreateInboxItemSchema>;

// --- Task ---
export const TaskSchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(1),
  nextAction: z.string().min(1),
  dueDate: z.coerce.date().nullable().optional(),
  context: z.string().nullable().optional(),
  status: z.enum(["active", "completed", "waiting", "someday"]).default("active"),
  sourceInboxItemId: z.string().uuid().nullable().optional(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export type Task = z.infer<typeof TaskSchema>;

export const CreateTaskSchema = TaskSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type CreateTask = z.infer<typeof CreateTaskSchema>;

// --- Project ---
export const ProjectSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  desiredOutcome: z.string().nullable().optional(),
  nextAction: z.string().nullable().optional(),
  status: z.enum(["active", "completed", "on_hold", "someday"]).default("active"),
  sourceInboxItemId: z.string().uuid().nullable().optional(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export type Project = z.infer<typeof ProjectSchema>;

export const CreateProjectSchema = ProjectSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type CreateProject = z.infer<typeof CreateProjectSchema>;

// --- Idea (Note) ---
export const IdeaSchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(1),
  summary: z.string().nullable().optional(),
  links: z.array(z.string().url()).default([]),
  sourceInboxItemId: z.string().uuid().nullable().optional(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export type Idea = z.infer<typeof IdeaSchema>;

export const CreateIdeaSchema = IdeaSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type CreateIdea = z.infer<typeof CreateIdeaSchema>;

// --- Person ---
export const PersonSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  relationshipContext: z.string().nullable().optional(),
  lastTouchedAt: z.coerce.date().nullable().optional(),
  followUpNextAction: z.string().nullable().optional(),
  sourceInboxItemId: z.string().uuid().nullable().optional(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export type Person = z.infer<typeof PersonSchema>;

export const CreatePersonSchema = PersonSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type CreatePerson = z.infer<typeof CreatePersonSchema>;

// --- Receipt (Audit Trail) ---
export const ReceiptSchema = z.object({
  id: z.string().uuid(),
  inboxItemId: z.string().uuid().nullable(),
  classification: z.enum(["task", "project", "idea", "person", "unknown"]),
  extractedFields: z.record(z.unknown()),
  confidenceScore: z.number().min(0).max(1),
  modelUsed: z.string(),
  timestamp: z.coerce.date(),
  writes: z.array(
    z.object({
      entityType: z.enum(["task", "project", "idea", "person"]),
      entityId: z.string().uuid(),
      action: z.enum(["create", "update"]),
    })
  ),
  previousReceiptId: z.string().uuid().nullable().optional(),
  personalContextUsed: z.array(z.string().uuid()).default([]),
});

export type Receipt = z.infer<typeof ReceiptSchema>;

export const CreateReceiptSchema = ReceiptSchema.omit({ id: true });

export type CreateReceipt = z.infer<typeof CreateReceiptSchema>;

// --- Clarification ---
export const ClarificationSchema = z.object({
  id: z.string().uuid(),
  inboxItemId: z.string().uuid(),
  question: z.string().min(1),
  options: z.array(z.string()).nullable().optional(),
  userAnswer: z.string().nullable().optional(),
  resolvedAt: z.coerce.date().nullable().optional(),
  createdAt: z.coerce.date(),
});

export type Clarification = z.infer<typeof ClarificationSchema>;

export const CreateClarificationSchema = ClarificationSchema.omit({
  id: true,
  userAnswer: true,
  resolvedAt: true,
  createdAt: true,
});

export type CreateClarification = z.infer<typeof CreateClarificationSchema>;

// --- Personal Context (learned entities from captures) ---
export const PersonalContextType = {
  PERSON: "person",
  PLACE: "place",
  ORGANIZATION: "organization",
  CONCEPT: "concept",
} as const;

export const PersonalContextSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  type: z.enum(["person", "place", "organization", "concept"]),
  description: z.string().nullable().optional(),
  domain: z.string().nullable().optional(), // e.g., "work", "family", "health"
  mentionCount: z.number().int().min(1).default(1),
  learnedFrom: z.array(z.string().uuid()).default([]), // receipt IDs
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export type PersonalContext = z.infer<typeof PersonalContextSchema>;

export const CreatePersonalContextSchema = PersonalContextSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type CreatePersonalContext = z.infer<typeof CreatePersonalContextSchema>;

export const UpdatePersonalContextSchema = z.object({
  description: z.string().nullable().optional(),
  domain: z.string().nullable().optional(),
});

export type UpdatePersonalContext = z.infer<typeof UpdatePersonalContextSchema>;

// --- Nudge (Contextual micro-prompts) ---
export const NudgeType = {
  FOLLOW_UP_OVERDUE: "follow_up_overdue",
  PROJECT_MISSING_NEXT_ACTION: "project_missing_next_action",
  TASK_DUE_SOON: "task_due_soon",
  TASK_STALE: "task_stale",
  PERSON_FOLLOW_UP: "person_follow_up",
} as const;

export const NudgeSchema = z.object({
  id: z.string().uuid(),
  type: z.enum([
    "follow_up_overdue",
    "project_missing_next_action",
    "task_due_soon",
    "task_stale",
    "person_follow_up",
  ]),
  message: z.string().min(1),
  entityType: z.enum(["task", "project", "person"]),
  entityId: z.string().uuid(),
  createdAt: z.coerce.date(),
  dismissedAt: z.coerce.date().nullable().optional(),
  snoozedUntil: z.coerce.date().nullable().optional(),
});

export type Nudge = z.infer<typeof NudgeSchema>;

// =============================================================================
// API Response Types (Date fields serialized as ISO strings over JSON)
// =============================================================================

/**
 * Utility type that converts Date fields to string for API responses.
 * When entities are serialized to JSON, Date objects become ISO strings.
 */
type DateToString<T> = {
  [K in keyof T]: T[K] extends Date
    ? string
    : T[K] extends Date | null
    ? string | null
    : T[K] extends Date | null | undefined
    ? string | null | undefined
    : T[K];
};

// API response types for each entity - use these in frontend code
export type InboxItemApi = DateToString<InboxItem>;
export type TaskApi = DateToString<Task>;
export type ProjectApi = DateToString<Project>;
export type IdeaApi = DateToString<Idea>;
export type PersonApi = DateToString<Person>;
export type ReceiptApi = DateToString<Receipt>;
export type ClarificationApi = DateToString<Clarification>;
export type PersonalContextApi = DateToString<PersonalContext>;
export type NudgeApi = DateToString<Nudge>;
