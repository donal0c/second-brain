-- Add unique expression index on lower(name) for personal_contexts
-- This prevents duplicate entries with different casing and enables ON CONFLICT upsert
CREATE UNIQUE INDEX IF NOT EXISTS "personal_contexts_name_lower_unique_idx" ON "personal_contexts" (LOWER("name"));
