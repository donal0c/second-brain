import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { z } from "zod";
import type { InferSelectModel } from "drizzle-orm";
import { eq, ilike, or, and, sql, gte, lte } from "drizzle-orm";
import { db, schema } from "../db/index.js";
import { generateEmbedding, hasOpenAIClient } from "../services/embedding.js";
import { findSimilarByEmbedding } from "../services/similarity.js";
import {
  sendData,
  sendValidationError,
  sendInternalError,
} from "../utils/response.js";

// =============================================================================
// Search Result Types
// =============================================================================

type DbTask = InferSelectModel<typeof schema.tasks>;
type DbProject = InferSelectModel<typeof schema.projects>;
type DbIdea = InferSelectModel<typeof schema.ideas>;
type DbPerson = InferSelectModel<typeof schema.persons>;

type SearchResultSnippet = { title: string; content: string };

type TaskSearchResult = {
  type: "task";
  id: string;
  entity: DbTask;
  snippet: SearchResultSnippet;
  similarity?: number;
};

type ProjectSearchResult = {
  type: "project";
  id: string;
  entity: DbProject;
  snippet: SearchResultSnippet;
  similarity?: number;
};

type IdeaSearchResult = {
  type: "idea";
  id: string;
  entity: DbIdea;
  snippet: SearchResultSnippet;
  similarity?: number;
};

type PersonSearchResult = {
  type: "person";
  id: string;
  entity: DbPerson;
  snippet: SearchResultSnippet;
  similarity?: number;
};

type SearchResult = TaskSearchResult | ProjectSearchResult | IdeaSearchResult | PersonSearchResult;

// =============================================================================
// Search Schemas
// =============================================================================

export const SearchQuerySchema = z.object({
  q: z.string().min(1).max(200),
  type: z.enum(["task", "project", "idea", "person"]).optional(),
  context: z.string().optional(),
  status: z.string().optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  limit: z.coerce.number().min(1).max(100).optional().default(50),
  offset: z.coerce.number().min(0).optional().default(0),
  mode: z.enum(["keyword", "semantic", "hybrid"]).optional().default("keyword"),
  semanticWeight: z.coerce.number().min(0).max(1).optional().default(0.7),
  semanticThreshold: z.coerce.number().min(0).max(1).optional().default(0.7),
});

// =============================================================================
// Helper Functions (exported for testing)
// =============================================================================

/**
 * Escape HTML entities to prevent XSS when rendering user content
 */
export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Escape special regex characters in a string
 */
export function escapeRegex(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Generate a snippet with highlighted search terms
 * @param text The full text to extract snippet from
 * @param query The search query
 * @param maxLength Maximum length of snippet
 * @returns Snippet with <mark> tags around matching terms (HTML-escaped)
 */
export function generateSnippet(text: string, query: string, maxLength: number = 200): string {
  if (!text) return "";

  // Split query into terms
  const terms = query
    .toLowerCase()
    .split(/\s+/)
    .filter((t) => t.length > 0);

  // Find first occurrence of any search term
  const lowerText = text.toLowerCase();
  let firstMatchIndex = -1;

  for (const term of terms) {
    const index = lowerText.indexOf(term);
    if (index !== -1 && (firstMatchIndex === -1 || index < firstMatchIndex)) {
      firstMatchIndex = index;
    }
  }

  // If no match found, return beginning of text
  if (firstMatchIndex === -1) {
    const snippet = text.substring(0, maxLength);
    // Escape HTML before returning
    return escapeHtml(snippet) + (text.length > maxLength ? "..." : "");
  }

  // Extract snippet around the match
  const start = Math.max(0, firstMatchIndex - 50);
  const end = Math.min(text.length, start + maxLength);
  let snippet = text.substring(start, end);

  // Add ellipsis
  if (start > 0) snippet = "..." + snippet;
  if (end < text.length) snippet = snippet + "...";

  // Escape HTML entities BEFORE adding highlight marks
  snippet = escapeHtml(snippet);

  // Highlight all occurrences of search terms (escape both HTML and regex special chars)
  for (const term of terms) {
    const escapedTerm = escapeRegex(escapeHtml(term));
    const regex = new RegExp(`(${escapedTerm})`, "gi");
    snippet = snippet.replace(regex, "<mark>$1</mark>");
  }

  return snippet;
}

/**
 * Calculate relevance score for a title based on query match type
 * @param title The title to score
 * @param query The search query
 * @returns Score: 3 for exact match, 2 for prefix match, 1 for contains, 0 for no match
 */
export function getTitleRelevanceScore(title: string, query: string): number {
  const lowerTitle = title.toLowerCase();
  const lowerQuery = query.toLowerCase();
  // Higher score for exact matches, then prefix, then contains
  if (lowerTitle === lowerQuery) return 3;
  if (lowerTitle.startsWith(lowerQuery)) return 2;
  if (lowerTitle.includes(lowerQuery)) return 1;
  return 0;
}

/**
 * Merge keyword and semantic results using Reciprocal Rank Fusion.
 */
function mergeWithRRF<T extends { id: string }>(
  keywordResults: T[],
  semanticResults: T[],
  semanticWeight: number
): T[] {
  const K = 60;
  const scores = new Map<string, { score: number; item: T }>();

  keywordResults.forEach((item, index) => {
    const rrfScore = (1 - semanticWeight) / (K + index + 1);
    scores.set(item.id, { score: rrfScore, item });
  });

  semanticResults.forEach((item, index) => {
    const rrfScore = semanticWeight / (K + index + 1);
    const existing = scores.get(item.id);
    if (existing) {
      existing.score += rrfScore;
      if ("similarity" in item && (existing.item as any).similarity === undefined) {
        (existing.item as any).similarity = (item as any).similarity;
      }
    } else {
      scores.set(item.id, { score: rrfScore, item });
    }
  });

  return Array.from(scores.values())
    .sort((a, b) => b.score - a.score)
    .map(({ item }) => item);
}

function isShortQuery(query: string): boolean {
  return query.trim().length < 3;
}

function matchesFilters(
  result: SearchResult,
  filters: {
    context?: string;
    status?: string;
    from?: Date;
    to?: Date;
  }
): boolean {
  const { context, status, from, to } = filters;

  if (from) {
    const createdAt = (result.entity as { createdAt?: Date }).createdAt;
    if (createdAt && createdAt < from) return false;
  }

  if (to) {
    const createdAt = (result.entity as { createdAt?: Date }).createdAt;
    if (createdAt && createdAt > to) return false;
  }

  if (status) {
    if (result.type === "task") {
      if (result.entity.status !== status) return false;
    } else if (result.type === "project") {
      if (result.entity.status !== status) return false;
    }
  }

  if (context && result.type === "task") {
    const taskContext = result.entity.context || "";
    if (!taskContext.toLowerCase().includes(context.toLowerCase())) {
      return false;
    }
  }

  return true;
}

async function performSemanticSearch(
  query: string,
  type: string | undefined,
  threshold: number,
  limit: number,
  filters: {
    context?: string;
    status?: string;
    from?: Date;
    to?: Date;
  }
): Promise<SearchResult[]> {
  const embedding = await generateEmbedding(query);
  const results: SearchResult[] = [];

  if (!type || type === "task") {
    const tasks = await findSimilarByEmbedding<DbTask>("tasks", embedding, limit, threshold);
    results.push(
      ...tasks.map((r) => ({
        type: "task" as const,
        id: r.entity.id,
        entity: r.entity,
        similarity: r.similarity,
        snippet: {
          title: generateSnippet(r.entity.title, query, 100),
          content: generateSnippet(r.entity.nextAction, query, 200),
        },
      }))
    );
  }

  if (!type || type === "project") {
    const projects = await findSimilarByEmbedding<DbProject>("projects", embedding, limit, threshold);
    results.push(
      ...projects.map((r) => ({
        type: "project" as const,
        id: r.entity.id,
        entity: r.entity,
        similarity: r.similarity,
        snippet: {
          title: generateSnippet(r.entity.name, query, 100),
          content: generateSnippet(
            r.entity.desiredOutcome || r.entity.nextAction || "",
            query,
            200
          ),
        },
      }))
    );
  }

  if (!type || type === "idea") {
    const ideas = await findSimilarByEmbedding<DbIdea>("ideas", embedding, limit, threshold);
    results.push(
      ...ideas.map((r) => ({
        type: "idea" as const,
        id: r.entity.id,
        entity: r.entity,
        similarity: r.similarity,
        snippet: {
          title: generateSnippet(r.entity.title, query, 100),
          content: generateSnippet(r.entity.summary || "", query, 200),
        },
      }))
    );
  }

  if (!type || type === "person") {
    const persons = await findSimilarByEmbedding<DbPerson>("persons", embedding, limit, threshold);
    results.push(
      ...persons.map((r) => ({
        type: "person" as const,
        id: r.entity.id,
        entity: r.entity,
        similarity: r.similarity,
        snippet: {
          title: generateSnippet(r.entity.name, query, 100),
          content: generateSnippet(
            r.entity.relationshipContext || r.entity.followUpNextAction || "",
            query,
            200
          ),
        },
      }))
    );
  }

  return results
    .filter((result) => matchesFilters(result, filters))
    .sort((a, b) => (b.similarity || 0) - (a.similarity || 0));
}

async function performKeywordSearchSingleType(
  type: "task" | "project" | "idea" | "person",
  query: string,
  filters: {
    context?: string;
    status?: string;
    from?: Date;
    to?: Date;
  },
  limit: number,
  offset: number
): Promise<{ results: SearchResult[]; total: number }> {
  const { context, status, from, to } = filters;
  const searchPattern = `%${query}%`;

  if (type === "task") {
    const taskConditions = [
      or(
        ilike(schema.tasks.title, searchPattern),
        ilike(schema.tasks.nextAction, searchPattern),
        ilike(schema.tasks.context, searchPattern)
      ),
    ];

    if (status) {
      taskConditions.push(eq(schema.tasks.status, status as any));
    }
    if (context) {
      taskConditions.push(ilike(schema.tasks.context, `%${context}%`));
    }
    if (from) {
      taskConditions.push(gte(schema.tasks.createdAt, from));
    }
    if (to) {
      taskConditions.push(lte(schema.tasks.createdAt, to));
    }

    const [tasks, countResult] = await Promise.all([
      db.select().from(schema.tasks).where(and(...taskConditions)).limit(limit).offset(offset),
      db.select({ count: sql<number>`count(*)` }).from(schema.tasks).where(and(...taskConditions)),
    ]);

    const results: TaskSearchResult[] = tasks.map((task) => ({
      type: "task" as const,
      id: task.id,
      entity: task,
      snippet: {
        title: generateSnippet(task.title, query, 100),
        content: generateSnippet(task.nextAction, query, 200),
      },
    }));

    return { results, total: countResult[0]?.count ?? 0 };
  }

  if (type === "project") {
    const projectConditions = [
      or(
        ilike(schema.projects.name, searchPattern),
        ilike(schema.projects.desiredOutcome, searchPattern),
        ilike(schema.projects.nextAction, searchPattern)
      ),
    ];

    if (status) {
      projectConditions.push(eq(schema.projects.status, status as any));
    }
    if (from) {
      projectConditions.push(gte(schema.projects.createdAt, from));
    }
    if (to) {
      projectConditions.push(lte(schema.projects.createdAt, to));
    }

    const [projects, countResult] = await Promise.all([
      db
        .select()
        .from(schema.projects)
        .where(and(...projectConditions))
        .limit(limit)
        .offset(offset),
      db
        .select({ count: sql<number>`count(*)` })
        .from(schema.projects)
        .where(and(...projectConditions)),
    ]);

    const results: ProjectSearchResult[] = projects.map((project) => ({
      type: "project" as const,
      id: project.id,
      entity: project,
      snippet: {
        title: generateSnippet(project.name, query, 100),
        content: generateSnippet(
          project.desiredOutcome || project.nextAction || "",
          query,
          200
        ),
      },
    }));

    return { results, total: countResult[0]?.count ?? 0 };
  }

  if (type === "idea") {
    const ideaConditions = [
      or(
        ilike(schema.ideas.title, searchPattern),
        ilike(schema.ideas.summary, searchPattern)
      ),
    ];

    if (from) {
      ideaConditions.push(gte(schema.ideas.createdAt, from));
    }
    if (to) {
      ideaConditions.push(lte(schema.ideas.createdAt, to));
    }

    const [ideas, countResult] = await Promise.all([
      db.select().from(schema.ideas).where(and(...ideaConditions)).limit(limit).offset(offset),
      db.select({ count: sql<number>`count(*)` }).from(schema.ideas).where(and(...ideaConditions)),
    ]);

    const results: IdeaSearchResult[] = ideas.map((idea) => ({
      type: "idea" as const,
      id: idea.id,
      entity: idea,
      snippet: {
        title: generateSnippet(idea.title, query, 100),
        content: generateSnippet(idea.summary || "", query, 200),
      },
    }));

    return { results, total: countResult[0]?.count ?? 0 };
  }

  const personConditions = [
    or(
      ilike(schema.persons.name, searchPattern),
      ilike(schema.persons.relationshipContext, searchPattern),
      ilike(schema.persons.followUpNextAction, searchPattern)
    ),
  ];

  if (from) {
    personConditions.push(gte(schema.persons.createdAt, from));
  }
  if (to) {
    personConditions.push(lte(schema.persons.createdAt, to));
  }

  const [persons, countResult] = await Promise.all([
    db.select().from(schema.persons).where(and(...personConditions)).limit(limit).offset(offset),
    db.select({ count: sql<number>`count(*)` }).from(schema.persons).where(and(...personConditions)),
  ]);

  const results: PersonSearchResult[] = persons.map((person) => ({
    type: "person" as const,
    id: person.id,
    entity: person,
    snippet: {
      title: generateSnippet(person.name, query, 100),
      content: generateSnippet(
        person.relationshipContext || person.followUpNextAction || "",
        query,
        200
      ),
    },
  }));

  return { results, total: countResult[0]?.count ?? 0 };
}

async function performKeywordSearchAllTypes(
  query: string,
  filters: {
    context?: string;
    status?: string;
    from?: Date;
    to?: Date;
  },
  limit: number,
  offset: number,
  perTypeLimitOverride?: number,
  applyPagination: boolean = true
): Promise<{ results: SearchResult[]; total: number }> {
  const { context, status, from, to } = filters;
  const searchPattern = `%${query}%`;
  const perTypeLimit = perTypeLimitOverride ?? Math.max(limit * 2, 100);

  const taskConditions = [
    or(
      ilike(schema.tasks.title, searchPattern),
      ilike(schema.tasks.nextAction, searchPattern),
      ilike(schema.tasks.context, searchPattern)
    ),
  ];
  if (status) {
    taskConditions.push(eq(schema.tasks.status, status as any));
  }
  if (context) {
    taskConditions.push(ilike(schema.tasks.context, `%${context}%`));
  }
  if (from) {
    taskConditions.push(gte(schema.tasks.createdAt, from));
  }
  if (to) {
    taskConditions.push(lte(schema.tasks.createdAt, to));
  }

  const projectConditions = [
    or(
      ilike(schema.projects.name, searchPattern),
      ilike(schema.projects.desiredOutcome, searchPattern),
      ilike(schema.projects.nextAction, searchPattern)
    ),
  ];
  if (status) {
    projectConditions.push(eq(schema.projects.status, status as any));
  }
  if (from) {
    projectConditions.push(gte(schema.projects.createdAt, from));
  }
  if (to) {
    projectConditions.push(lte(schema.projects.createdAt, to));
  }

  const ideaConditions = [
    or(
      ilike(schema.ideas.title, searchPattern),
      ilike(schema.ideas.summary, searchPattern)
    ),
  ];
  if (from) {
    ideaConditions.push(gte(schema.ideas.createdAt, from));
  }
  if (to) {
    ideaConditions.push(lte(schema.ideas.createdAt, to));
  }

  const personConditions = [
    or(
      ilike(schema.persons.name, searchPattern),
      ilike(schema.persons.relationshipContext, searchPattern),
      ilike(schema.persons.followUpNextAction, searchPattern)
    ),
  ];
  if (from) {
    personConditions.push(gte(schema.persons.createdAt, from));
  }
  if (to) {
    personConditions.push(lte(schema.persons.createdAt, to));
  }

  const [tasks, projects, ideas, persons] = await Promise.all([
    db.select().from(schema.tasks).where(and(...taskConditions)).limit(perTypeLimit),
    db.select().from(schema.projects).where(and(...projectConditions)).limit(perTypeLimit),
    db.select().from(schema.ideas).where(and(...ideaConditions)).limit(perTypeLimit),
    db.select().from(schema.persons).where(and(...personConditions)).limit(perTypeLimit),
  ]);

  const results: SearchResult[] = [];

  for (const task of tasks) {
    results.push({
      type: "task",
      id: task.id,
      entity: task,
      snippet: {
        title: generateSnippet(task.title, query, 100),
        content: generateSnippet(task.nextAction, query, 200),
      },
    });
  }

  for (const project of projects) {
    results.push({
      type: "project",
      id: project.id,
      entity: project,
      snippet: {
        title: generateSnippet(project.name, query, 100),
        content: generateSnippet(project.desiredOutcome || project.nextAction || "", query, 200),
      },
    });
  }

  for (const idea of ideas) {
    results.push({
      type: "idea",
      id: idea.id,
      entity: idea,
      snippet: {
        title: generateSnippet(idea.title, query, 100),
        content: generateSnippet(idea.summary || "", query, 200),
      },
    });
  }

  for (const person of persons) {
    results.push({
      type: "person",
      id: person.id,
      entity: person,
      snippet: {
        title: generateSnippet(person.name, query, 100),
        content: generateSnippet(
          person.relationshipContext || person.followUpNextAction || "",
          query,
          200
        ),
      },
    });
  }

  const getEntityTitle = (result: SearchResult): string => {
    switch (result.type) {
      case "task":
        return result.entity.title;
      case "project":
        return result.entity.name;
      case "idea":
        return result.entity.title;
      case "person":
        return result.entity.name;
    }
  };

  results.sort((a, b) => {
    const aScore = getTitleRelevanceScore(getEntityTitle(a), query);
    const bScore = getTitleRelevanceScore(getEntityTitle(b), query);
    return bScore - aScore;
  });

  const total = results.length;

  return {
    results: applyPagination ? results.slice(offset, offset + limit) : results,
    total,
  };
}


// =============================================================================
// Search Route
// =============================================================================

export async function searchRoutes(app: FastifyInstance): Promise<void> {
  app.get(
    "/search",
    async (
      request: FastifyRequest<{ Querystring: z.infer<typeof SearchQuerySchema> }>,
      reply: FastifyReply
    ) => {
      const parseResult = SearchQuerySchema.safeParse(request.query);
      if (!parseResult.success) {
        return sendValidationError(
          reply,
          "Validation failed",
          parseResult.error.flatten().fieldErrors
        );
      }

      const {
        q,
        type,
        context,
        status,
        from,
        to,
        limit,
        offset,
        mode,
        semanticWeight,
        semanticThreshold,
      } = parseResult.data;

      try {
        const filters = { context, status, from, to };

        if (mode === "semantic") {
          if (!hasOpenAIClient()) {
            return sendValidationError(reply, "Semantic search requires OPENAI_API_KEY");
          }

          if (isShortQuery(q)) {
            if (type) {
              const { results, total } = await performKeywordSearchSingleType(
                type,
                q,
                filters,
                limit,
                offset
              );
              return sendData(reply, results, { total, limit, offset, query: q });
            }

            const { results, total } = await performKeywordSearchAllTypes(
              q,
              filters,
              limit,
              offset
            );
            return sendData(reply, results, { total, limit, offset, query: q });
          }

          const candidateLimit = Math.max(limit + offset, limit * 2);
          const semanticResults = await performSemanticSearch(
            q,
            type,
            semanticThreshold,
            candidateLimit,
            filters
          );
          const total = semanticResults.length;
          return sendData(reply, semanticResults.slice(offset, offset + limit), {
            total,
            limit,
            offset,
            query: q,
          });
        }

        if (mode === "hybrid") {
          if (!hasOpenAIClient() || isShortQuery(q)) {
            if (type) {
              const { results, total } = await performKeywordSearchSingleType(
                type,
                q,
                filters,
                limit,
                offset
              );
              return sendData(reply, results, { total, limit, offset, query: q });
            }

            const { results, total } = await performKeywordSearchAllTypes(
              q,
              filters,
              limit,
              offset
            );
            return sendData(reply, results, { total, limit, offset, query: q });
          }

          const candidateLimit = type ? Math.max(limit * 2, limit + offset) : Math.max(limit * 2, 100);
          const keywordResults = type
            ? (await performKeywordSearchSingleType(type, q, filters, candidateLimit, 0)).results
            : (
                await performKeywordSearchAllTypes(
                  q,
                  filters,
                  candidateLimit,
                  0,
                  candidateLimit,
                  false
                )
              ).results;

          const semanticResults = await performSemanticSearch(
            q,
            type,
            semanticThreshold,
            candidateLimit,
            filters
          );

          const merged = mergeWithRRF(keywordResults, semanticResults, semanticWeight);
          const total = merged.length;
          return sendData(reply, merged.slice(offset, offset + limit), {
            total,
            limit,
            offset,
            query: q,
          });
        }

        if (type) {
          const { results, total } = await performKeywordSearchSingleType(
            type,
            q,
            filters,
            limit,
            offset
          );
          return sendData(reply, results, { total, limit, offset, query: q });
        }

        const { results, total } = await performKeywordSearchAllTypes(
          q,
          filters,
          limit,
          offset
        );

        return sendData(reply, results, { total, limit, offset, query: q });
      } catch (error) {
        app.log.error(error);
        return sendInternalError(
          reply,
          error instanceof Error ? error.message : "Search failed"
        );
      }
    }
  );
}
