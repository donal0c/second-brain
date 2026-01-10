-- Add indexes for better query performance
-- These indexes cover the most common query patterns identified in the code review

-- inbox_items indexes
CREATE INDEX IF NOT EXISTS idx_inbox_items_status ON inbox_items(status);
CREATE INDEX IF NOT EXISTS idx_inbox_items_captured_at ON inbox_items(captured_at);

-- tasks indexes
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_context ON tasks(context);
CREATE INDEX IF NOT EXISTS idx_tasks_updated_at ON tasks(updated_at);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date);

-- projects indexes
CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);
CREATE INDEX IF NOT EXISTS idx_projects_updated_at ON projects(updated_at);

-- ideas indexes
CREATE INDEX IF NOT EXISTS idx_ideas_updated_at ON ideas(updated_at);

-- persons indexes
CREATE INDEX IF NOT EXISTS idx_persons_updated_at ON persons(updated_at);

-- receipts indexes
CREATE INDEX IF NOT EXISTS idx_receipts_inbox_item_id ON receipts(inbox_item_id);
CREATE INDEX IF NOT EXISTS idx_receipts_timestamp ON receipts(timestamp);

-- clarifications indexes
CREATE INDEX IF NOT EXISTS idx_clarifications_inbox_item_id ON clarifications(inbox_item_id);
CREATE INDEX IF NOT EXISTS idx_clarifications_resolved_at ON clarifications(resolved_at);
CREATE INDEX IF NOT EXISTS idx_clarifications_created_at ON clarifications(created_at);

-- personal_contexts indexes
CREATE INDEX IF NOT EXISTS idx_personal_contexts_name ON personal_contexts(name);
CREATE INDEX IF NOT EXISTS idx_personal_contexts_mention_count ON personal_contexts(mention_count);
CREATE INDEX IF NOT EXISTS idx_personal_contexts_type ON personal_contexts(type);
