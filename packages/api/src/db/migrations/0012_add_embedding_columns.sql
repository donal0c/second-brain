-- Add vector(1536) columns for text-embedding-3-small
ALTER TABLE inbox_items ADD COLUMN embedding vector(1536);
--> statement-breakpoint
ALTER TABLE tasks ADD COLUMN embedding vector(1536);
--> statement-breakpoint
ALTER TABLE projects ADD COLUMN embedding vector(1536);
--> statement-breakpoint
ALTER TABLE ideas ADD COLUMN embedding vector(1536);
--> statement-breakpoint
ALTER TABLE persons ADD COLUMN embedding vector(1536);
--> statement-breakpoint
ALTER TABLE personal_contexts ADD COLUMN embedding vector(1536);
--> statement-breakpoint

-- HNSW indexes for fast approximate nearest neighbor search
-- Using cosine distance (vector_cosine_ops) - standard for OpenAI embeddings
-- m=16: connections per node, ef_construction=64: build-time quality
CREATE INDEX inbox_items_embedding_idx ON inbox_items
  USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);
--> statement-breakpoint
CREATE INDEX tasks_embedding_idx ON tasks
  USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);
--> statement-breakpoint
CREATE INDEX projects_embedding_idx ON projects
  USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);
--> statement-breakpoint
CREATE INDEX ideas_embedding_idx ON ideas
  USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);
--> statement-breakpoint
CREATE INDEX persons_embedding_idx ON persons
  USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);
--> statement-breakpoint
CREATE INDEX personal_contexts_embedding_idx ON personal_contexts
  USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);
