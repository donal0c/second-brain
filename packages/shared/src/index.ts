// @second-brain/shared
// Types, schemas, and validation utilities shared across packages

// Entity types and schemas
export {
  // Constants
  InboxItemStatus,
  EntityType,
  TaskStatus,
  ProjectStatus,
  // InboxItem
  InboxItemSchema,
  CreateInboxItemSchema,
  type InboxItem,
  type CreateInboxItem,
  // Task
  TaskSchema,
  CreateTaskSchema,
  type Task,
  type CreateTask,
  // Project
  ProjectSchema,
  CreateProjectSchema,
  type Project,
  type CreateProject,
  // Idea
  IdeaSchema,
  CreateIdeaSchema,
  type Idea,
  type CreateIdea,
  // Person
  PersonSchema,
  CreatePersonSchema,
  type Person,
  type CreatePerson,
  // Receipt
  ReceiptSchema,
  CreateReceiptSchema,
  type Receipt,
  type CreateReceipt,
  // Clarification
  ClarificationSchema,
  CreateClarificationSchema,
  type Clarification,
  type CreateClarification,
  // Personal Context
  PersonalContextType,
  PersonalContextSchema,
  CreatePersonalContextSchema,
  UpdatePersonalContextSchema,
  type PersonalContext,
  type CreatePersonalContext,
  type UpdatePersonalContext,
} from "./types.js";

// Taxonomy types
export {
  AreaSchema,
  DomainSchema,
  TaxonomyConfigSchema,
  type Area,
  type Domain,
  type TaxonomyConfig,
  DEFAULT_AREAS,
  DEFAULT_DOMAINS,
  DEFAULT_TAXONOMY,
} from "./taxonomy.js";

// Validation utilities
export {
  validate,
  validateOrThrow,
  isValid,
  uuidSchema,
  nonEmptyStringSchema,
  confidenceScoreSchema,
  isoDateStringSchema,
  type ValidationResult,
  type ValidationError,
} from "./validation.js";
