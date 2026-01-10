import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db, rawDb, schema } from "../db/index.js";

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
    const regex = new RegExp(`(${term})`, "gi");
    snippet = snippet.replace(regex, "<mark>$1</mark>");
  }

  return snippet;
}

/**
 * Fetch full entity details based on type and ID
 */
async function fetchEntityDetails(entityType: string, entityId: string) {
  switch (entityType) {
    case "task": {
      const results = await db
        .select()
        .from(schema.tasks)
        .where(eq(schema.tasks.id, entityId))
        .limit(1);
      return results[0] || null;
    }
    case "project": {
      const results = await db
        .select()
        .from(schema.projects)
        .where(eq(schema.projects.id, entityId))
        .limit(1);
      return results[0] || null;
    }
    case "idea": {
      const results = await db
        .select()
        .from(schema.ideas)
        .where(eq(schema.ideas.id, entityId))
        .limit(1);
      return results[0] || null;
    }
    default:
      return null;
  }
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
        return reply.status(400).send({
          error: "Validation failed",
          details: parseResult.error.flatten().fieldErrors,
        });
      }

      const { q, type, context, status, from, to, limit, offset } = parseResult.data;

      try {
        // Build the FTS5 query
        let ftsQuery = q;

        // Escape special FTS5 characters
        ftsQuery = ftsQuery.replace(/"/g, '""');

        // Build SQL conditions
        const conditions: string[] = [];

        if (type) {
          conditions.push(`entity_type = '${type}'`);
        }

        if (context) {
          conditions.push(`context LIKE '%${context}%'`);
        }

        // Build the WHERE clause for FTS search
        let whereClause = `entity_search_fts MATCH '"${ftsQuery}"'`;
        if (conditions.length > 0) {
          whereClause += ` AND ${conditions.join(" AND ")}`;
        }

        // Execute FTS search query using raw SQLite
        const ftsResults = rawDb.prepare(`
          SELECT
            entity_type,
            entity_id,
            title,
            content,
            context,
            raw_text,
            rank
          FROM entity_search_fts
          WHERE ${whereClause}
          ORDER BY rank
          LIMIT ${limit}
          OFFSET ${offset}
        `).all();

        // Fetch full entity details and apply additional filters
        const results = await Promise.all(
          ftsResults.map(async (row: any) => {
            const entity = await fetchEntityDetails(row.entity_type, row.entity_id);

            if (!entity) return null;

            // Apply status filter
            if (status && "status" in entity && entity.status !== status) {
              return null;
            }

            // Apply date filters
            if (from || to) {
              const entityDate = new Date(entity.createdAt);
              if (from && entityDate < from) return null;
              if (to && entityDate > to) return null;
            }

            // Generate snippets with highlights
            const titleSnippet = generateSnippet(row.title, q, 100);
            const contentSnippet = generateSnippet(row.content || row.raw_text, q, 200);

            return {
              type: row.entity_type,
              id: row.entity_id,
              entity,
              snippet: {
                title: titleSnippet,
                content: contentSnippet,
              },
            };
          })
        );

        // Filter out null results (filtered entities)
        const filteredResults = results.filter((r) => r !== null);

        return reply.send({
          results: filteredResults,
          total: filteredResults.length,
          query: q,
          limit,
          offset,
        });
      } catch (error) {
        app.log.error(error);
        return reply.status(500).send({
          error: "Search failed",
          message: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }
  );
}
