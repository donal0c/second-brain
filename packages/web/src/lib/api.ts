// =============================================================================
// API Client
// =============================================================================

import type {
  InboxItemApi,
  TaskApi,
  ProjectApi,
  IdeaApi,
  PersonApi,
  ReceiptApi,
  ClarificationApi,
  PersonalContextApi,
  NudgeApi,
} from "@second-brain/shared";

// Create local type aliases for use within this file
// These types have Date fields as strings (JSON serialization)
export type InboxItem = InboxItemApi;
export type Task = TaskApi;
export type Project = ProjectApi;
export type Idea = IdeaApi;
export type Person = PersonApi;
export type Receipt = ReceiptApi;
export type Clarification = ClarificationApi;
export type PersonalContext = PersonalContextApi;
export type Nudge = NudgeApi;

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:3001";

export interface ApiErrorDetail {
  code: string;
  message: string;
  details?: unknown;
}

export interface ApiError {
  error: ApiErrorDetail;
  // Convenience property for UI display (extracted from error.message)
  message: string;
}

// Helper to extract error message string from various error types
export function extractErrorMessage(error: unknown): string {
  if (typeof error === "string") {
    return error;
  }
  if (error && typeof error === "object") {
    // Handle ApiError type (thrown by normalizeApiError)
    if ("message" in error && typeof (error as ApiError).message === "string") {
      return (error as ApiError).message;
    }
    // Handle Error type
    if (error instanceof Error) {
      return error.message;
    }
  }
  return "An unexpected error occurred";
}

interface ApiDataResponse<T> {
  data: T;
}

// API response envelope types (server returns { data, meta? })
interface ApiEnvelope<T> {
  data: T;
  meta?: {
    total?: number;
    limit?: number;
    offset?: number;
    [key: string]: unknown;
  };
}

function normalizeApiError(rawError: unknown, fallbackMessage: string): ApiError {
  const error = rawError as { error?: { code?: string; message?: string; details?: unknown } } | null;
  const message = error?.error?.message || fallbackMessage || "Request failed";
  return {
    error: {
      code: error?.error?.code || "REQUEST_FAILED",
      message,
      details: error?.error?.details,
    },
    message,
  };
}

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE}${path}`;

  const response = await fetch(url, {
    ...options,
    headers: {
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...options.headers,
    },
  });

  if (!response.ok) {
    const rawError = await response.json().catch(() => null);
    throw normalizeApiError(rawError, response.statusText);
  }

  // Handle 204 No Content
  if (response.status === 204) {
    return {} as T;
  }

  const json = await response.json();

  // Unwrap API envelope: { data: T, meta?: {...} }
  // The API standardizes responses with a data wrapper
  if (json && typeof json === "object" && "data" in json) {
    return json.data as T;
  }

  return json;
}

async function requestEnvelope<T>(
  path: string,
  options: RequestInit = {}
): Promise<ApiEnvelope<T>> {
  const url = `${API_BASE}${path}`;

  const response = await fetch(url, {
    ...options,
    headers: {
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...options.headers,
    },
  });

  if (!response.ok) {
    const rawError = await response.json().catch(() => null);
    throw normalizeApiError(rawError, response.statusText);
  }

  return response.json();
}

// Helper for list endpoints that return { data: T[], meta: { total, limit, offset } }
// Transforms to { items: T[], total, limit, offset } for frontend compatibility
export interface ListResponse<T> {
  items: T[];
  total: number;
  limit: number;
  offset: number;
}

async function requestList<T>(
  path: string,
  options: RequestInit = {}
): Promise<ListResponse<T>> {
  const url = `${API_BASE}${path}`;

  const response = await fetch(url, {
    ...options,
    headers: {
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...options.headers,
    },
  });

  if (!response.ok) {
    const rawError = await response.json().catch(() => null);
    throw normalizeApiError(rawError, response.statusText);
  }

  const json = await response.json();

  // Transform { data: T[], meta: {...} } to { items: T[], total, limit, offset }
  if (json && typeof json === "object" && "data" in json && "meta" in json) {
    return {
      items: json.data as T[],
      total: json.meta.total ?? 0,
      limit: json.meta.limit ?? 0,
      offset: json.meta.offset ?? 0,
    };
  }

  // Fallback for non-envelope responses
  return json;
}

// =============================================================================
// Inbox API
// =============================================================================

// InboxItem type is now imported from @second-brain/shared

export interface InboxListResponse {
  items: InboxItem[];
  total: number;
  limit: number;
  offset: number;
}

export interface InboxCaptureResponse {
  inboxItem: InboxItem;
  processed: boolean;
  result?: ProcessResult;
  error?: string;
}

export const inbox = {
  capture: (rawText: string, source: string = "web", signal?: AbortSignal) =>
    request<InboxCaptureResponse>("/inbox", {
      method: "POST",
      body: JSON.stringify({ rawText, source }),
      signal,
    }),

  list: (params?: { status?: string; limit?: number; offset?: number }, signal?: AbortSignal) =>
    requestList<InboxItem>(`/inbox?${new URLSearchParams(params as Record<string, string>)}`, { signal }),

  get: (id: string, signal?: AbortSignal) => request<InboxItem>(`/inbox/${id}`, { signal }),
};

// =============================================================================
// Tasks API
// =============================================================================

// Task type is now imported from @second-brain/shared

export interface TaskListResponse {
  items: Task[];
  total: number;
  limit: number;
  offset: number;
}

export interface InterpretResponse<T> {
  entity: T;
  interpretation: {
    updates: Record<string, unknown>;
    reasoning: string;
  };
}

export interface TaskCreateInput {
  title: string;
  nextAction: string;
  dueDate?: string | null;
  context?: string | null;
  status?: "active" | "completed" | "waiting" | "someday";
  needsReview?: boolean;
}

export const tasks = {
  list: (params?: { status?: string; context?: string; limit?: number; offset?: number }, signal?: AbortSignal) =>
    requestList<Task>(`/tasks?${new URLSearchParams(params as Record<string, string>)}`, { signal }),

  get: (id: string, signal?: AbortSignal) => request<Task>(`/tasks/${id}`, { signal }),

  create: (data: TaskCreateInput, signal?: AbortSignal) =>
    request<Task>("/tasks", {
      method: "POST",
      body: JSON.stringify(data),
      signal,
    }),

  update: (id: string, data: Partial<Task>, signal?: AbortSignal) =>
    request<Task>(`/tasks/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
      signal,
    }),

  interpret: (id: string, instruction: string, signal?: AbortSignal) =>
    request<InterpretResponse<Task>>(`/tasks/${id}/interpret`, {
      method: "POST",
      body: JSON.stringify({ instruction }),
      signal,
    }),

  delete: (id: string, signal?: AbortSignal) =>
    request<void>(`/tasks/${id}`, { method: "DELETE", signal }),
};

// =============================================================================
// Projects API
// =============================================================================

// Project type is now imported from @second-brain/shared

export interface ProjectListResponse {
  items: Project[];
  total: number;
  limit: number;
  offset: number;
}

export interface ProjectCreateInput {
  name: string;
  desiredOutcome?: string | null;
  nextAction?: string | null;
  status?: "active" | "completed" | "on_hold" | "someday";
  needsReview?: boolean;
}

export const projects = {
  list: (params?: { status?: string; limit?: number; offset?: number }, signal?: AbortSignal) =>
    requestList<Project>(`/projects?${new URLSearchParams(params as Record<string, string>)}`, { signal }),

  get: (id: string, signal?: AbortSignal) => request<Project>(`/projects/${id}`, { signal }),

  create: (data: ProjectCreateInput, signal?: AbortSignal) =>
    request<Project>("/projects", {
      method: "POST",
      body: JSON.stringify(data),
      signal,
    }),

  update: (id: string, data: Partial<Project>, signal?: AbortSignal) =>
    request<Project>(`/projects/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
      signal,
    }),

  interpret: (id: string, instruction: string, signal?: AbortSignal) =>
    request<InterpretResponse<Project>>(`/projects/${id}/interpret`, {
      method: "POST",
      body: JSON.stringify({ instruction }),
      signal,
    }),

  delete: (id: string, signal?: AbortSignal) =>
    request<void>(`/projects/${id}`, { method: "DELETE", signal }),
};

// =============================================================================
// Ideas API
// =============================================================================

// Idea type is now imported from @second-brain/shared

export interface IdeaListResponse {
  items: Idea[];
  total: number;
  limit: number;
  offset: number;
}

export interface IdeaCreateInput {
  title: string;
  summary?: string | null;
  links?: string[];
  needsReview?: boolean;
}

export const ideas = {
  list: (params?: { limit?: number; offset?: number }, signal?: AbortSignal) =>
    requestList<Idea>(`/ideas?${new URLSearchParams(params as Record<string, string>)}`, { signal }),

  get: (id: string, signal?: AbortSignal) => request<Idea>(`/ideas/${id}`, { signal }),

  create: (data: IdeaCreateInput, signal?: AbortSignal) =>
    request<Idea>("/ideas", {
      method: "POST",
      body: JSON.stringify(data),
      signal,
    }),

  update: (id: string, data: Partial<Idea>, signal?: AbortSignal) =>
    request<Idea>(`/ideas/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
      signal,
    }),

  interpret: (id: string, instruction: string, signal?: AbortSignal) =>
    request<InterpretResponse<Idea>>(`/ideas/${id}/interpret`, {
      method: "POST",
      body: JSON.stringify({ instruction }),
      signal,
    }),

  delete: (id: string, signal?: AbortSignal) =>
    request<void>(`/ideas/${id}`, { method: "DELETE", signal }),
};

// =============================================================================
// Persons API
// =============================================================================

// Person type is now imported from @second-brain/shared

export interface PersonListResponse {
  items: Person[];
  total: number;
  limit: number;
  offset: number;
}

export interface PersonCreateInput {
  name: string;
  relationshipContext?: string | null;
  lastTouchedAt?: string | null;
  followUpNextAction?: string | null;
  needsReview?: boolean;
}

export const persons = {
  list: (params?: { limit?: number; offset?: number }, signal?: AbortSignal) =>
    requestList<Person>(`/persons?${new URLSearchParams(params as Record<string, string>)}`, { signal }),

  get: (id: string, signal?: AbortSignal) => request<Person>(`/persons/${id}`, { signal }),

  create: (data: PersonCreateInput, signal?: AbortSignal) =>
    request<Person>("/persons", {
      method: "POST",
      body: JSON.stringify(data),
      signal,
    }),

  update: (id: string, data: Partial<Person>, signal?: AbortSignal) =>
    request<Person>(`/persons/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
      signal,
    }),

  interpret: (id: string, instruction: string, signal?: AbortSignal) =>
    request<InterpretResponse<Person>>(`/persons/${id}/interpret`, {
      method: "POST",
      body: JSON.stringify({ instruction }),
      signal,
    }),

  delete: (id: string, signal?: AbortSignal) =>
    request<void>(`/persons/${id}`, { method: "DELETE", signal }),
};

// =============================================================================
// Fix API (Cross-Entity)
// =============================================================================

export type EntityType = "tasks" | "projects" | "ideas" | "persons";
export type Entity = Task | Project | Idea | Person;

export interface FixResponse {
  oldEntity: Entity;
  newEntity: Entity;
  receipt: Receipt;
  reasoning: string;
}

export const fix = {
  entity: (entityType: EntityType, id: string, correction: string) =>
    request<FixResponse>(`/fix/${entityType}/${id}`, {
      method: "POST",
      body: JSON.stringify({ correction }),
    }),
};

// =============================================================================
// Clarifications API
// =============================================================================

// Clarification type is now imported from @second-brain/shared

export interface ClarificationListResponse {
  items: Clarification[];
  total: number;
  limit: number;
  offset: number;
}

export const clarifications = {
  list: (params?: { resolved?: string; limit?: number; offset?: number }, signal?: AbortSignal) =>
    requestList<Clarification>(`/clarifications?${new URLSearchParams(params as Record<string, string>)}`, { signal }),

  get: (id: string, signal?: AbortSignal) => request<Clarification>(`/clarifications/${id}`, { signal }),

  resolve: (id: string, answer: string, signal?: AbortSignal) =>
    request<{ clarification: Clarification; receipt?: unknown; entity?: unknown }>(
      `/clarifications/${id}/resolve`,
      {
        method: "POST",
        body: JSON.stringify({ answer }),
        signal,
      }
    ),
};

// =============================================================================
// Digest API
// =============================================================================

// PersonalContext type is now imported from @second-brain/shared

export interface DigestResponse {
  date: string;
  context: string;
  nextActions: Task[];
  flaggedItems: Receipt[];
  pendingClarifications: Clarification[];
  staleTasks: Task[];
  projectsWithoutNextAction: Project[];
  newContexts: PersonalContext[];
  stats: {
    activeTasks: number;
    activeProjects: number;
    ideas: number;
  };
}

export interface SummaryResponse {
  inbox: {
    new: number;
    needsClarification: number;
  };
  entities: {
    activeTasks: number;
    activeProjects: number;
    ideas: number;
  };
  pendingClarifications: number;
}

export interface ContextQuestion {
  contextId: string;
  name: string;
  type: string;
  mentionCount: number;
  domain: string | null;
  suggestedQuestion: string;
}

export interface FocusSuggestion {
  context: string;
  taskCount: number;
  suggestion: string;
}

export interface WeeklyReviewResponse {
  weekStart: string;
  weekEnd: string;
  openLoops: {
    tasks: Task[];
    total: number;
  };
  staleProjects: {
    projects: Project[];
    total: number;
  };
  contextQuestions: {
    questions: ContextQuestion[];
    total: number;
  };
  wins: {
    completedTasks: Task[];
    completedProjects: Project[];
    totalTasks: number;
    totalProjects: number;
  };
  suggestedFocus: FocusSuggestion[];
}

export const digest = {
  daily: (params?: { context?: string; maxItems?: number }, signal?: AbortSignal) =>
    request<DigestResponse>(`/digest/daily?${new URLSearchParams(params as Record<string, string>)}`, { signal }),

  weekly: (signal?: AbortSignal) => request<WeeklyReviewResponse>("/digest/weekly", { signal }),

  summary: (signal?: AbortSignal) => request<SummaryResponse>("/digest/summary", { signal }),
};

// =============================================================================
// Receipts API
// =============================================================================

// Receipt type is now imported from @second-brain/shared

export interface ReceiptListResponse {
  items: Receipt[];
  total: number;
  limit: number;
  offset: number;
}

export const receipts = {
  list: (params?: { inboxItemId?: string; limit?: number; offset?: number }, signal?: AbortSignal) =>
    requestList<Receipt>(`/receipts?${new URLSearchParams(params as Record<string, string>)}`, { signal }),

  get: async (id: string, signal?: AbortSignal): Promise<Receipt> => {
    const response = await request<ApiDataResponse<Receipt>>(`/receipts/${id}`, { signal });
    return response.data;
  },
};

// =============================================================================
// Processing API
// =============================================================================

export interface ProcessStatus {
  available: boolean;
  message: string;
}

export interface ProcessResult {
  inboxItemId: string;
  classification: {
    classification: string;
    confidence: number;
    reasoning: string;
  };
  action: "filed" | "flagged" | "clarify";
  receipt: Receipt;
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

export const process = {
  status: () => request<ProcessStatus>("/process/status"),

  single: (id: string) =>
    request<ProcessResult>(`/process/${id}`, { method: "POST" }),

  reprocess: async (entityType: EntityType, entityId: string, signal?: AbortSignal): Promise<ProcessResult> => {
    // Fetch the entity to get its sourceInboxItemId
    let entity: Entity;
    if (entityType === "tasks") {
      entity = await tasks.get(entityId, signal);
    } else if (entityType === "projects") {
      entity = await projects.get(entityId, signal);
    } else if (entityType === "ideas") {
      entity = await ideas.get(entityId, signal);
    } else {
      entity = await persons.get(entityId, signal);
    }

    if (!entity.sourceInboxItemId) {
      throw {
        error: { code: "NO_SOURCE_INBOX_ITEM", message: "This entity has no original inbox item to reprocess" },
        message: "This entity has no original inbox item to reprocess",
      } as ApiError;
    }

    // Fetch the original inbox item
    const originalInboxItem = await inbox.get(entity.sourceInboxItemId, signal);

    // Create a new inbox item with the same rawText
    const captureResponse = await inbox.capture(originalInboxItem.rawText, "reprocess", signal);

    // Process the new inbox item
    const result = await request<ProcessResult>(`/process/${captureResponse.inboxItem.id}`, { method: "POST", signal });

    return result;
  },
};

// =============================================================================
// Search API
// =============================================================================

export interface SearchResult {
  type: "task" | "project" | "idea";
  id: string;
  entity: Task | Project | Idea;
  snippet: {
    title: string;
    content: string;
  };
}

export interface SearchResponse {
  results: SearchResult[];
  total: number;
  query: string;
  limit: number;
  offset: number;
}

export const search = {
  query: async (
    params: {
      q: string;
      type?: "task" | "project" | "idea";
      context?: string;
      status?: string;
      from?: string;
      to?: string;
      limit?: number;
      offset?: number;
    },
    signal?: AbortSignal
  ): Promise<SearchResponse> => {
    const queryParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        queryParams.append(key, value.toString());
      }
    });
    // Server returns { data: SearchResult[], meta: { total, limit, offset, query } }
    const envelope = await requestEnvelope<SearchResult[]>(
      `/search?${queryParams}`,
      { signal }
    );
    return {
      results: envelope.data,
      total: envelope.meta?.total ?? envelope.data.length,
      limit: envelope.meta?.limit ?? envelope.data.length,
      offset: envelope.meta?.offset ?? 0,
      query: (envelope.meta?.query as string) ?? params.q,
    };
  },
};

// =============================================================================
// Nudges API
// =============================================================================

// Nudge type is now imported from @second-brain/shared

export interface NudgesResponse {
  nudges: Nudge[];
  count: number;
}

export const nudges = {
  list: async (signal?: AbortSignal): Promise<NudgesResponse> => {
    // API returns { data: Nudge[], meta: { total, ... } }, transform to { nudges: [], count }
    const result = await requestList<Nudge>("/nudges", { signal });
    return {
      nudges: result.items,
      count: result.total,
    };
  },

  dismiss: (id: string, signal?: AbortSignal) =>
    request<{ success: boolean }>(`/nudges/${id}/dismiss`, {
      method: "POST",
      signal,
    }),

  snooze: (id: string, hours: number = 24, signal?: AbortSignal) =>
    request<{ success: boolean; snoozedUntil: string }>(`/nudges/${id}/snooze`, {
      method: "POST",
      body: JSON.stringify({ hours }),
      signal,
    }),
};
