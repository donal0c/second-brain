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

export interface ApiError {
  error: string;
  message?: string;
  details?: Record<string, string[]>;
}

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE}${path}`;

  const response = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({
      error: "Request failed",
      message: response.statusText,
    }));
    throw error;
  }

  // Handle 204 No Content
  if (response.status === 204) {
    return {} as T;
  }

  return response.json();
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
    request<InboxListResponse>(`/inbox?${new URLSearchParams(params as Record<string, string>)}`, { signal }),

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

export const tasks = {
  list: (params?: { status?: string; context?: string; limit?: number; offset?: number }, signal?: AbortSignal) =>
    request<TaskListResponse>(`/tasks?${new URLSearchParams(params as Record<string, string>)}`, { signal }),

  get: (id: string, signal?: AbortSignal) => request<Task>(`/tasks/${id}`, { signal }),

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

export const projects = {
  list: (params?: { status?: string; limit?: number; offset?: number }, signal?: AbortSignal) =>
    request<ProjectListResponse>(`/projects?${new URLSearchParams(params as Record<string, string>)}`, { signal }),

  get: (id: string, signal?: AbortSignal) => request<Project>(`/projects/${id}`, { signal }),

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

export const ideas = {
  list: (params?: { limit?: number; offset?: number }, signal?: AbortSignal) =>
    request<IdeaListResponse>(`/ideas?${new URLSearchParams(params as Record<string, string>)}`, { signal }),

  get: (id: string, signal?: AbortSignal) => request<Idea>(`/ideas/${id}`, { signal }),

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

export const persons = {
  list: (params?: { limit?: number; offset?: number }, signal?: AbortSignal) =>
    request<PersonListResponse>(`/persons?${new URLSearchParams(params as Record<string, string>)}`, { signal }),

  get: (id: string, signal?: AbortSignal) => request<Person>(`/persons/${id}`, { signal }),

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
  clarifications: Clarification[];
  total: number;
  limit: number;
  offset: number;
}

export const clarifications = {
  list: (params?: { resolved?: string; limit?: number; offset?: number }, signal?: AbortSignal) =>
    request<ClarificationListResponse>(`/clarifications?${new URLSearchParams(params as Record<string, string>)}`, { signal }),

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
  receipts: Receipt[];
  total: number;
  limit: number;
  offset: number;
}

export const receipts = {
  list: (params?: { inboxItemId?: string; limit?: number; offset?: number }, signal?: AbortSignal) =>
    request<ReceiptListResponse>(`/receipts?${new URLSearchParams(params as Record<string, string>)}`, { signal }),

  get: (id: string, signal?: AbortSignal) => request<Receipt>(`/receipts/${id}`, { signal }),
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
    extractedFields: Record<string, unknown>;
    confidenceScore: number;
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
      throw { error: "No source inbox item", message: "This entity has no original inbox item to reprocess" };
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
  query: (params: {
    q: string;
    type?: "task" | "project" | "idea";
    context?: string;
    status?: string;
    from?: string;
    to?: string;
    limit?: number;
    offset?: number;
  }) => {
    const queryParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        queryParams.append(key, value.toString());
      }
    });
    return request<SearchResponse>(`/search?${queryParams}`);
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
    const response = await request<{ data: Nudge[]; meta: { total: number } }>("/nudges", { signal });
    return {
      nudges: response.data,
      count: response.meta.total,
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
