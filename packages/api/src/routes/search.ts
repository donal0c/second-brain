import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { z } from "zod";
import type { InferSelectModel } from "drizzle-orm";
import { eq, ilike, or, and, sql } from "drizzle-orm";
import { db, schema } from "../db/index.js";
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

type SearchResultSnippet = { title: string; content: string };

type TaskSearchResult = {
  type: "task";
  id: string;
  entity: DbTask;
  snippet: SearchResultSnippet;
};

type ProjectSearchResult = {
  type: "project";
  id: string;
  entity: DbProject;
  snippet: SearchResultSnippet;
};

type IdeaSearchResult = {
  type: "idea";
  id: string;
  entity: DbIdea;
  snippet: SearchResultSnippet;
};

type SearchResult = TaskSearchResult | ProjectSearchResult | IdeaSearchResult;

// =============================================================================
// Search Schemas
// =============================================================================

const SearchQuerySchema = z.object({
  q: z.string().min(1).max(200),
  type: z.enum(["task", "project", "idea"]).optional(),
  context: z.string().optional(),
  status: z.string().optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  limit: z.coerce.number().min(1).max(100).optional().default(50),
  offset: z.coerce.number().min(0).optional().default(0),
});

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Escape HTML entities to prevent XSS when rendering user content
 */
function escapeHtml(text: string): string {
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
function escapeRegex(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Generate a snippet with highlighted search terms
 * @param text The full text to extract snippet from
 * @param query The search query
 * @param maxLength Maximum length of snippet
 * @returns Snippet with <mark> tags around matching terms (HTML-escaped)
 */
function generateSnippet(text: string, query: string, maxLength: number = 200): string {
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

      const { q, type, context, status, from, to, limit, offset } = parseResult.data;

      try {
        const searchPattern = `%${q}%`;

        // Helper to calculate relevance score for a title
        const getTitleRelevanceScore = (title: string): number => {
          const lowerTitle = title.toLowerCase();
          const lowerQuery = q.toLowerCase();
          // Higher score for exact matches, then prefix, then contains
          if (lowerTitle === lowerQuery) return 3;
          if (lowerTitle.startsWith(lowerQuery)) return 2;
          if (lowerTitle.includes(lowerQuery)) return 1;
          return 0;
        };

        // Single-type search: use SQL-level pagination for efficiency
        if (type) {
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
              taskConditions.push(sql`${schema.tasks.createdAt} >= ${from}`);
            }
            if (to) {
              taskConditions.push(sql`${schema.tasks.createdAt} <= ${to}`);
            }

            const [tasks, countResult] = await Promise.all([
              db
                .select()
                .from(schema.tasks)
                .where(and(...taskConditions))
                .limit(limit)
                .offset(offset),
              db
                .select({ count: sql<number>`count(*)` })
                .from(schema.tasks)
                .where(and(...taskConditions)),
            ]);

            const results: TaskSearchResult[] = tasks.map((task) => ({
              type: "task" as const,
              id: task.id,
              entity: task,
              snippet: {
                title: generateSnippet(task.title, q, 100),
                content: generateSnippet(task.nextAction, q, 200),
              },
            }));

            return sendData(reply, results, {
              total: countResult[0]?.count ?? 0,
              limit,
              offset,
              query: q,
            });
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
              projectConditions.push(sql`${schema.projects.createdAt} >= ${from}`);
            }
            if (to) {
              projectConditions.push(sql`${schema.projects.createdAt} <= ${to}`);
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
                title: generateSnippet(project.name, q, 100),
                content: generateSnippet(
                  project.desiredOutcome || project.nextAction || "",
                  q,
                  200
                ),
              },
            }));

            return sendData(reply, results, {
              total: countResult[0]?.count ?? 0,
              limit,
              offset,
              query: q,
            });
          }

          if (type === "idea") {
            const ideaConditions = [
              or(
                ilike(schema.ideas.title, searchPattern),
                ilike(schema.ideas.summary, searchPattern)
              ),
            ];

            if (from) {
              ideaConditions.push(sql`${schema.ideas.createdAt} >= ${from}`);
            }
            if (to) {
              ideaConditions.push(sql`${schema.ideas.createdAt} <= ${to}`);
            }

            const [ideas, countResult] = await Promise.all([
              db
                .select()
                .from(schema.ideas)
                .where(and(...ideaConditions))
                .limit(limit)
                .offset(offset),
              db
                .select({ count: sql<number>`count(*)` })
                .from(schema.ideas)
                .where(and(...ideaConditions)),
            ]);

            const results: IdeaSearchResult[] = ideas.map((idea) => ({
              type: "idea" as const,
              id: idea.id,
              entity: idea,
              snippet: {
                title: generateSnippet(idea.title, q, 100),
                content: generateSnippet(idea.summary || "", q, 200),
              },
            }));

            return sendData(reply, results, {
              total: countResult[0]?.count ?? 0,
              limit,
              offset,
              query: q,
            });
          }
        }

        // Cross-type search: fetch all results, combine, sort by relevance, then paginate
        // This approach is necessary for accurate cross-type relevance sorting
        const results: SearchResult[] = [];

        // Build task conditions
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
          taskConditions.push(sql`${schema.tasks.createdAt} >= ${from}`);
        }
        if (to) {
          taskConditions.push(sql`${schema.tasks.createdAt} <= ${to}`);
        }

        // Build project conditions
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
          projectConditions.push(sql`${schema.projects.createdAt} >= ${from}`);
        }
        if (to) {
          projectConditions.push(sql`${schema.projects.createdAt} <= ${to}`);
        }

        // Build idea conditions
        const ideaConditions = [
          or(
            ilike(schema.ideas.title, searchPattern),
            ilike(schema.ideas.summary, searchPattern)
          ),
        ];
        if (from) {
          ideaConditions.push(sql`${schema.ideas.createdAt} >= ${from}`);
        }
        if (to) {
          ideaConditions.push(sql`${schema.ideas.createdAt} <= ${to}`);
        }

        // Fetch all matching results in parallel
        const [tasks, projects, ideas] = await Promise.all([
          db.select().from(schema.tasks).where(and(...taskConditions)),
          db.select().from(schema.projects).where(and(...projectConditions)),
          db.select().from(schema.ideas).where(and(...ideaConditions)),
        ]);

        // Convert to search results with relevance scores
        for (const task of tasks) {
          results.push({
            type: "task",
            id: task.id,
            entity: task,
            snippet: {
              title: generateSnippet(task.title, q, 100),
              content: generateSnippet(task.nextAction, q, 200),
            },
          });
        }

        for (const project of projects) {
          results.push({
            type: "project",
            id: project.id,
            entity: project,
            snippet: {
              title: generateSnippet(project.name, q, 100),
              content: generateSnippet(
                project.desiredOutcome || project.nextAction || "",
                q,
                200
              ),
            },
          });
        }

        for (const idea of ideas) {
          results.push({
            type: "idea",
            id: idea.id,
            entity: idea,
            snippet: {
              title: generateSnippet(idea.title, q, 100),
              content: generateSnippet(idea.summary || "", q, 200),
            },
          });
        }

        // Sort results by relevance (scoring based on title matches)
        const getEntityTitle = (result: SearchResult): string => {
          switch (result.type) {
            case "task":
              return result.entity.title;
            case "project":
              return result.entity.name;
            case "idea":
              return result.entity.title;
          }
        };

        results.sort((a, b) => {
          const aScore = getTitleRelevanceScore(getEntityTitle(a));
          const bScore = getTitleRelevanceScore(getEntityTitle(b));
          return bScore - aScore;
        });

        // Store total before slicing for accurate pagination metadata
        const total = results.length;

        return sendData(
          reply,
          results.slice(offset, offset + limit),
          {
            total,
            limit,
            offset,
            query: q,
          }
        );
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
