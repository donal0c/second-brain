// =============================================================================
// API Client
// =============================================================================

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

export interface InboxItem {
  id: string;
  capturedAt: string;
  rawText: string;
  source: string;
  status: "new" | "processing" | "processed" | "blocked";
}

export interface InboxListResponse {
  items: InboxItem[];
  total: number;
  limit: number;
  offset: number;
}

export const inbox = {
  capture: (rawText: string, source: string = "web", signal?: AbortSignal) =>
    request<InboxItem>("/inbox", {
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

export interface Task {
  id: string;
  title: string;
  nextAction: string;
  dueDate: string | null;
  context: string | null;
  status: "active" | "completed" | "waiting" | "someday";
  createdAt: string;
  updatedAt: string;
}

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

export interface Project {
  id: string;
  name: string;
  desiredOutcome: string | null;
  nextAction: string | null;
  status: "active" | "completed" | "on_hold" | "someday";
  createdAt: string;
  updatedAt: string;
}

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

export interface Idea {
  id: string;
  title: string;
  summary: string | null;
  links: string[];
  createdAt: string;
  updatedAt: string;
}

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
// Fix API (Cross-Entity)
// =============================================================================

export type EntityType = "tasks" | "projects" | "ideas";
export type Entity = Task | Project | Idea;

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

export interface Clarification {
  id: string;
  inboxItemId: string;
  question: string;
  options: string[] | null;
  userAnswer: string | null;
  resolvedAt: string | null;
  createdAt: string;
}

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

export interface DigestResponse {
  date: string;
  context: string;
  nextActions: Task[];
  flaggedItems: unknown[];
  pendingClarifications: Clarification[];
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

export const digest = {
  daily: (params?: { context?: string; maxItems?: number }, signal?: AbortSignal) =>
    request<DigestResponse>(`/digest/daily?${new URLSearchParams(params as Record<string, string>)}`, { signal }),

  summary: (signal?: AbortSignal) => request<SummaryResponse>("/digest/summary", { signal }),
};

// =============================================================================
// Receipts API
// =============================================================================

export interface Receipt {
  id: string;
  inboxItemId: string;
  classification: "task" | "project" | "idea" | "person" | "unknown";
  extractedFields: Record<string, unknown>;
  confidenceScore: number;
  modelUsed: string;
  timestamp: string;
  writes: Array<{
    entityType: "task" | "project" | "idea" | "person";
    entityId: string;
    action: "create" | "update";
  }>;
  previousReceiptId: string | null;
  personalContextUsed: string[];
}

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

export const process = {
  status: () => request<ProcessStatus>("/process/status"),

  single: (id: string) =>
    request<unknown>(`/process/${id}`, { method: "POST" }),
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
