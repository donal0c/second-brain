-- Create FTS5 virtual table for full-text search across all entities
CREATE VIRTUAL TABLE entity_search_fts USING fts5(
  entity_type,     -- 'task', 'project', or 'idea'
  entity_id,       -- UUID of the entity
  title,           -- Main title/name field
  content,         -- Combined searchable content (nextAction, desiredOutcome, summary, etc.)
  context,         -- Context field (for tasks)
  raw_text,        -- Original raw text from inbox item (if available)
  tokenize = 'porter unicode61'
);--> statement-breakpoint

-- Populate FTS table with existing tasks
INSERT INTO entity_search_fts (entity_type, entity_id, title, content, context, raw_text)
SELECT
  'task',
  t.id,
  t.title,
  t.next_action || ' ' || COALESCE(t.context, ''),
  t.context,
  COALESCE(i.raw_text, '')
FROM tasks t
LEFT JOIN inbox_items i ON t.source_inbox_item_id = i.id;--> statement-breakpoint

-- Populate FTS table with existing projects
INSERT INTO entity_search_fts (entity_type, entity_id, title, content, context, raw_text)
SELECT
  'project',
  p.id,
  p.name,
  COALESCE(p.desired_outcome, '') || ' ' || COALESCE(p.next_action, ''),
  NULL,
  COALESCE(i.raw_text, '')
FROM projects p
LEFT JOIN inbox_items i ON p.source_inbox_item_id = i.id;--> statement-breakpoint

-- Populate FTS table with existing ideas
INSERT INTO entity_search_fts (entity_type, entity_id, title, content, context, raw_text)
SELECT
  'idea',
  id.id,
  id.title,
  COALESCE(id.summary, ''),
  NULL,
  COALESCE(i.raw_text, '')
FROM ideas id
LEFT JOIN inbox_items i ON id.source_inbox_item_id = i.id;--> statement-breakpoint

-- Triggers to keep FTS table in sync with tasks table
CREATE TRIGGER tasks_fts_insert AFTER INSERT ON tasks BEGIN
  INSERT INTO entity_search_fts (entity_type, entity_id, title, content, context, raw_text)
  SELECT
    'task',
    NEW.id,
    NEW.title,
    NEW.next_action || ' ' || COALESCE(NEW.context, ''),
    NEW.context,
    COALESCE(i.raw_text, '')
  FROM (SELECT NEW.source_inbox_item_id as sid) n
  LEFT JOIN inbox_items i ON n.sid = i.id;
END;--> statement-breakpoint

CREATE TRIGGER tasks_fts_update AFTER UPDATE ON tasks BEGIN
  DELETE FROM entity_search_fts WHERE entity_type = 'task' AND entity_id = OLD.id;
  INSERT INTO entity_search_fts (entity_type, entity_id, title, content, context, raw_text)
  SELECT
    'task',
    NEW.id,
    NEW.title,
    NEW.next_action || ' ' || COALESCE(NEW.context, ''),
    NEW.context,
    COALESCE(i.raw_text, '')
  FROM (SELECT NEW.source_inbox_item_id as sid) n
  LEFT JOIN inbox_items i ON n.sid = i.id;
END;--> statement-breakpoint

CREATE TRIGGER tasks_fts_delete AFTER DELETE ON tasks BEGIN
  DELETE FROM entity_search_fts WHERE entity_type = 'task' AND entity_id = OLD.id;
END;--> statement-breakpoint

-- Triggers to keep FTS table in sync with projects table
CREATE TRIGGER projects_fts_insert AFTER INSERT ON projects BEGIN
  INSERT INTO entity_search_fts (entity_type, entity_id, title, content, context, raw_text)
  SELECT
    'project',
    NEW.id,
    NEW.name,
    COALESCE(NEW.desired_outcome, '') || ' ' || COALESCE(NEW.next_action, ''),
    NULL,
    COALESCE(i.raw_text, '')
  FROM (SELECT NEW.source_inbox_item_id as sid) n
  LEFT JOIN inbox_items i ON n.sid = i.id;
END;--> statement-breakpoint

CREATE TRIGGER projects_fts_update AFTER UPDATE ON projects BEGIN
  DELETE FROM entity_search_fts WHERE entity_type = 'project' AND entity_id = OLD.id;
  INSERT INTO entity_search_fts (entity_type, entity_id, title, content, context, raw_text)
  SELECT
    'project',
    NEW.id,
    NEW.name,
    COALESCE(NEW.desired_outcome, '') || ' ' || COALESCE(NEW.next_action, ''),
    NULL,
    COALESCE(i.raw_text, '')
  FROM (SELECT NEW.source_inbox_item_id as sid) n
  LEFT JOIN inbox_items i ON n.sid = i.id;
END;--> statement-breakpoint

CREATE TRIGGER projects_fts_delete AFTER DELETE ON projects BEGIN
  DELETE FROM entity_search_fts WHERE entity_type = 'project' AND entity_id = OLD.id;
END;--> statement-breakpoint

-- Triggers to keep FTS table in sync with ideas table
CREATE TRIGGER ideas_fts_insert AFTER INSERT ON ideas BEGIN
  INSERT INTO entity_search_fts (entity_type, entity_id, title, content, context, raw_text)
  SELECT
    'idea',
    NEW.id,
    NEW.title,
    COALESCE(NEW.summary, ''),
    NULL,
    COALESCE(i.raw_text, '')
  FROM (SELECT NEW.source_inbox_item_id as sid) n
  LEFT JOIN inbox_items i ON n.sid = i.id;
END;--> statement-breakpoint

CREATE TRIGGER ideas_fts_update AFTER UPDATE ON ideas BEGIN
  DELETE FROM entity_search_fts WHERE entity_type = 'idea' AND entity_id = OLD.id;
  INSERT INTO entity_search_fts (entity_type, entity_id, title, content, context, raw_text)
  SELECT
    'idea',
    NEW.id,
    NEW.title,
    COALESCE(NEW.summary, ''),
    NULL,
    COALESCE(i.raw_text, '')
  FROM (SELECT NEW.source_inbox_item_id as sid) n
  LEFT JOIN inbox_items i ON n.sid = i.id;
END;--> statement-breakpoint

CREATE TRIGGER ideas_fts_delete AFTER DELETE ON ideas BEGIN
  DELETE FROM entity_search_fts WHERE entity_type = 'idea' AND entity_id = OLD.id;
END;
