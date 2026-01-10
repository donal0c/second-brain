-- Add indexes for better query performance
-- These indexes cover the most common query patterns identified in the code review

-- inbox_items indexes
CREATE INDEX IF NOT EXISTS idx_inbox_items_status ON inbox_items(status);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS idx_inbox_items_captured_at ON inbox_items(captured_at);
--> statement-breakpoint
-- tasks indexes
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS idx_tasks_context ON tasks(context);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS idx_tasks_updated_at ON tasks(updated_at);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date);
--> statement-breakpoint
-- projects indexes
CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS idx_projects_updated_at ON projects(updated_at);
--> statement-breakpoint
-- ideas indexes
CREATE INDEX IF NOT EXISTS idx_ideas_updated_at ON ideas(updated_at);
--> statement-breakpoint
-- persons indexes
CREATE INDEX IF NOT EXISTS idx_persons_updated_at ON persons(updated_at);
--> statement-breakpoint
-- receipts indexes
CREATE INDEX IF NOT EXISTS idx_receipts_inbox_item_id ON receipts(inbox_item_id);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS idx_receipts_timestamp ON receipts(timestamp);
--> statement-breakpoint
-- clarifications indexes
CREATE INDEX IF NOT EXISTS idx_clarifications_inbox_item_id ON clarifications(inbox_item_id);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS idx_clarifications_resolved_at ON clarifications(resolved_at);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS idx_clarifications_created_at ON clarifications(created_at);
--> statement-breakpoint
-- personal_contexts indexes
CREATE INDEX IF NOT EXISTS idx_personal_contexts_name ON personal_contexts(name);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS idx_personal_contexts_mention_count ON personal_contexts(mention_count);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS idx_personal_contexts_type ON personal_contexts(type);
