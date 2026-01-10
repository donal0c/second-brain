-- Add unique constraint on personal_contexts.name (case-insensitive)
-- Using COLLATE NOCASE for case-insensitive uniqueness

-- First, we need to handle any existing duplicates by keeping the one with highest mention_count
-- Delete duplicates (keeping the one with highest mention_count for each lowercase name)
DELETE FROM personal_contexts
WHERE id NOT IN (
  SELECT id FROM (
    SELECT id, ROW_NUMBER() OVER (
      PARTITION BY LOWER(name)
      ORDER BY mention_count DESC, created_at ASC
    ) as rn
    FROM personal_contexts
  ) WHERE rn = 1
);
--> statement-breakpoint
-- Create unique index on lowercase name
CREATE UNIQUE INDEX IF NOT EXISTS idx_personal_contexts_name_unique
ON personal_contexts(name COLLATE NOCASE);
