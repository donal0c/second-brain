-- Enable pg_trgm extension for fuzzy text search with GIN indexes
CREATE EXTENSION IF NOT EXISTS pg_trgm;
--> statement-breakpoint
-- Tasks table: Add GIN indexes for text search on title and next_action
CREATE INDEX IF NOT EXISTS "tasks_title_trgm_idx" ON "tasks" USING gin ("title" gin_trgm_ops);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "tasks_next_action_trgm_idx" ON "tasks" USING gin ("next_action" gin_trgm_ops);
--> statement-breakpoint
-- Projects table: Add GIN indexes for text search on name, desired_outcome, next_action
CREATE INDEX IF NOT EXISTS "projects_name_trgm_idx" ON "projects" USING gin ("name" gin_trgm_ops);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "projects_desired_outcome_trgm_idx" ON "projects" USING gin ("desired_outcome" gin_trgm_ops);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "projects_next_action_trgm_idx" ON "projects" USING gin ("next_action" gin_trgm_ops);
--> statement-breakpoint
-- Ideas table: Add GIN indexes for text search on title and summary
CREATE INDEX IF NOT EXISTS "ideas_title_trgm_idx" ON "ideas" USING gin ("title" gin_trgm_ops);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ideas_summary_trgm_idx" ON "ideas" USING gin ("summary" gin_trgm_ops);
