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
 * Generate a snippet with highlighted search terms
 * @param text The full text to extract snippet from
 * @param query The search query
 * @param maxLength Maximum length of snippet
 * @returns Snippet with <mark> tags around matching terms
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
    return snippet + (text.length > maxLength ? "..." : "");
  }

  // Extract snippet around the match
  const start = Math.max(0, firstMatchIndex - 50);
  const end = Math.min(text.length, start + maxLength);
  let snippet = text.substring(start, end);

  // Add ellipsis
  if (start > 0) snippet = "..." + snippet;
  if (end < text.length) snippet = snippet + "...";

  // Highlight all occurrences of search terms
  for (const term of terms) {
    // Escape regex metacharacters to prevent RegExp injection
    const safeTerm = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(`(${safeTerm})`, "gi");
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
        const results: SearchResult[] = [];

        // Search tasks
        if (!type || type === "task") {
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

          const tasks = await db
            .select()
            .from(schema.tasks)
            .where(and(...taskConditions))
            .limit(limit)
            .offset(offset);

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
        }

        // Search projects
        if (!type || type === "project") {
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

          const projects = await db
            .select()
            .from(schema.projects)
            .where(and(...projectConditions))
            .limit(limit)
            .offset(offset);

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
        }

        // Search ideas
        if (!type || type === "idea") {
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

          const ideas = await db
            .select()
            .from(schema.ideas)
            .where(and(...ideaConditions))
            .limit(limit)
            .offset(offset);

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
        }

        // Sort results by relevance (simple scoring based on title matches)
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
          const aTitle = getEntityTitle(a);
          const bTitle = getEntityTitle(b);
          const aScore = aTitle.toLowerCase().includes(q.toLowerCase()) ? 1 : 0;
          const bScore = bTitle.toLowerCase().includes(q.toLowerCase()) ? 1 : 0;
          return bScore - aScore;
        });

        return sendData(
          reply,
          results.slice(0, limit),
          {
            total: results.length,
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
