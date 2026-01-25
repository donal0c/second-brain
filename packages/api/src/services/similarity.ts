// =============================================================================
// Similarity Search Service
// =============================================================================

import { eq, sql } from "drizzle-orm";
import { db, schema } from "../db/index.js";
import { generateEmbedding, hasOpenAIClient } from "./embedding.js";

// =============================================================================
// Types
// =============================================================================

export interface SimilarityResult<T> {
  entity: T;
  similarity: number; // -1 to 1, higher = more similar
}

type TableName =
  | "inbox_items"
  | "tasks"
  | "projects"
  | "ideas"
  | "persons"
  | "personal_contexts";

const TABLE_IDENTIFIERS: Record<TableName, ReturnType<typeof sql.identifier>> = {
  inbox_items: sql.identifier(["inbox_items"]),
  tasks: sql.identifier(["tasks"]),
  projects: sql.identifier(["projects"]),
  ideas: sql.identifier(["ideas"]),
  persons: sql.identifier(["persons"]),
  personal_contexts: sql.identifier(["personal_contexts"]),
};

// =============================================================================
// Core Similarity Functions
// =============================================================================

function buildVectorLiteral(embedding: number[]): string {
  return `[${embedding.join(",")}]`;
}

/**
 * Find items similar to a given embedding vector.
 * Uses cosine similarity via pgvector's <=> operator.
 */
export async function findSimilarByEmbedding<T>(
  tableName: TableName,
  queryEmbedding: number[],
  limit: number = 10,
  threshold: number = 0.7,
  excludeIds: string[] = []
): Promise<SimilarityResult<T>[]> {
  const tableIdentifier = TABLE_IDENTIFIERS[tableName];
  const embeddingLiteral = buildVectorLiteral(queryEmbedding);

  const excludeClause = excludeIds.length > 0
    ? sql`AND id NOT IN (${sql.join(excludeIds.map((id) => sql`${id}`), sql`, `)})`
    : sql``;

  const results = await db.execute(sql`
    SELECT
      *,
      1 - (embedding <=> ${embeddingLiteral}::vector) as similarity
    FROM ${tableIdentifier}
    WHERE embedding IS NOT NULL
      AND 1 - (embedding <=> ${embeddingLiteral}::vector) >= ${threshold}
      ${excludeClause}
    ORDER BY embedding <=> ${embeddingLiteral}::vector
    LIMIT ${limit}
  `);

  return results.map((row) => ({
    entity: row as T,
    similarity: (row as { similarity: number }).similarity,
  }));
}

/**
 * Find items similar to arbitrary text.
 * Generates embedding first, then searches.
 */
export async function findSimilarByText<T>(
  tableName: TableName,
  text: string,
  limit: number = 10,
  threshold: number = 0.7,
  excludeIds: string[] = []
): Promise<SimilarityResult<T>[]> {
  if (!hasOpenAIClient()) {
    return [];
  }

  const embedding = await generateEmbedding(text);
  return findSimilarByEmbedding<T>(tableName, embedding, limit, threshold, excludeIds);
}

/**
 * Find items similar to an existing entity.
 * Retrieves entity's embedding, then searches.
 */
export async function findSimilarToEntity(
  entityType: "task" | "project" | "idea" | "person",
  entityId: string,
  limit: number = 10,
  threshold: number = 0.7
): Promise<SimilarityResult<unknown>[]> {
  const tableMap = {
    task: { table: schema.tasks, name: "tasks" as TableName },
    project: { table: schema.projects, name: "projects" as TableName },
    idea: { table: schema.ideas, name: "ideas" as TableName },
    person: { table: schema.persons, name: "persons" as TableName },
  };

  const { table, name } = tableMap[entityType];

  const [entity] = await db
    .select()
    .from(table)
    .where(eq(table.id, entityId))
    .limit(1);

  if (!entity || !entity.embedding) {
    return [];
  }

  return findSimilarByEmbedding(
    name,
    entity.embedding as number[],
    limit,
    threshold,
    [entityId]
  );
}

/**
 * Search across all entity tables for similar items.
 * Used for Deja Capture detection.
 */
export async function findSimilarAcrossAllTables(
  text: string,
  limit: number = 5,
  threshold: number = 0.8
): Promise<{ type: string; results: SimilarityResult<unknown>[] }[]> {
  if (!hasOpenAIClient()) {
    return [];
  }

  const embedding = await generateEmbedding(text);

  const [tasks, projects, ideas, persons] = await Promise.all([
    findSimilarByEmbedding("tasks", embedding, limit, threshold),
    findSimilarByEmbedding("projects", embedding, limit, threshold),
    findSimilarByEmbedding("ideas", embedding, limit, threshold),
    findSimilarByEmbedding("persons", embedding, limit, threshold),
  ]);

  return [
    { type: "task", results: tasks },
    { type: "project", results: projects },
    { type: "idea", results: ideas },
    { type: "person", results: persons },
  ].filter((entry) => entry.results.length > 0);
}
