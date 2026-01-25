import "dotenv/config";
import { and, asc, eq, gt, isNull, sql } from "drizzle-orm";
import { db, schema } from "../db/index.js";
import {
  generateEmbeddingsBatch,
  hasOpenAIClient,
  prepareTextForEmbedding,
} from "../services/embedding.js";

// =============================================================================
// Configuration
// =============================================================================

const BATCH_SIZE = 50;
const DELAY_BETWEEN_BATCHES_MS = 200;

// =============================================================================
// Table Configurations
// =============================================================================

const tables = [
  {
    name: "inbox_items",
    table: schema.inboxItems,
    type: "inbox_item" as const,
  },
  {
    name: "tasks",
    table: schema.tasks,
    type: "task" as const,
  },
  {
    name: "projects",
    table: schema.projects,
    type: "project" as const,
  },
  {
    name: "ideas",
    table: schema.ideas,
    type: "idea" as const,
  },
  {
    name: "persons",
    table: schema.persons,
    type: "person" as const,
  },
  {
    name: "personal_contexts",
    table: schema.personalContexts,
    type: "personal_context" as const,
  },
];

// =============================================================================
// Helpers
// =============================================================================

async function sleep(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function getStats(): Promise<void> {
  console.log("\n📊 Current embedding status:");

  for (const { name, table } of tables) {
    const [total] = await db
      .select({ count: sql<number>`count(*)` })
      .from(table);

    const [withEmbedding] = await db
      .select({ count: sql<number>`count(*)` })
      .from(table)
      .where(sql`embedding IS NOT NULL`);

    const pct =
      total.count > 0
        ? ((withEmbedding.count / total.count) * 100).toFixed(1)
        : "N/A";

    console.log(`   ${name}: ${withEmbedding.count}/${total.count} (${pct}%)`);
  }
}

// =============================================================================
// Backfill Logic
// =============================================================================

async function backfillTable(config: (typeof tables)[0]): Promise<number> {
  const { name, table, type } = config;
  console.log(`\n📦 Backfilling ${name}...`);

  let totalProcessed = 0;
  let lastId: string | null = null;

  while (true) {
    const conditions = [isNull(table.embedding)];
    if (lastId) {
      conditions.push(gt(table.id, lastId));
    }

    const items = await db
      .select()
      .from(table)
      .where(and(...conditions))
      .orderBy(asc(table.id))
      .limit(BATCH_SIZE);

    if (items.length === 0) {
      console.log(`   ✓ ${name}: No more items to process`);
      break;
    }

    lastId = (items[items.length - 1] as any).id;

    const texts = items.map((item) =>
      prepareTextForEmbedding({ type, data: item as Record<string, unknown> })
    );

    const validIndices: number[] = [];
    const validTexts: string[] = [];
    texts.forEach((text, i) => {
      if (text.trim()) {
        validIndices.push(i);
        validTexts.push(text);
      }
    });

    if (validTexts.length === 0) {
      console.log(`   ⚠ Batch had no valid texts, skipping...`);
      await sleep(DELAY_BETWEEN_BATCHES_MS);
      continue;
    }

    try {
      const embeddings = await generateEmbeddingsBatch(validTexts);

      for (let i = 0; i < validIndices.length; i++) {
        const itemIndex = validIndices[i];
        const item = items[itemIndex];
        const embedding = embeddings[i];

        await db
          .update(table)
          .set({ embedding })
          .where(eq(table.id, (item as any).id));
      }

      totalProcessed += validTexts.length;
      console.log(`   ✓ Embedded ${validTexts.length} items`);
    } catch (error) {
      console.error(`   ✗ Batch failed:`, error);
    }

    await sleep(DELAY_BETWEEN_BATCHES_MS);
  }

  return totalProcessed;
}

// =============================================================================
// Main
// =============================================================================

async function main(): Promise<void> {
  console.log("🚀 Starting embedding backfill...\n");

  if (!hasOpenAIClient()) {
    console.error("❌ OPENAI_API_KEY not set. Cannot generate embeddings.");
    process.exit(1);
  }

  await getStats();

  const results: Record<string, number> = {};
  for (const config of tables) {
    results[config.name] = await backfillTable(config);
  }

  console.log("\n" + "=".repeat(50));
  console.log("✅ Backfill complete!\n");

  for (const [name, count] of Object.entries(results)) {
    console.log(`   ${name}: ${count} items embedded`);
  }

  await getStats();

  process.exit(0);
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
