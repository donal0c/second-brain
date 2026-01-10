CREATE TABLE IF NOT EXISTS "clarifications" (
	"id" text PRIMARY KEY NOT NULL,
	"inbox_item_id" text NOT NULL,
	"question" text NOT NULL,
	"options" jsonb,
	"user_answer" text,
	"resolved_at" timestamp,
	"created_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "ideas" (
	"id" text PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"summary" text,
	"links" jsonb DEFAULT '[]'::jsonb,
	"source_inbox_item_id" text,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "inbox_items" (
	"id" text PRIMARY KEY NOT NULL,
	"captured_at" timestamp NOT NULL,
	"raw_text" text NOT NULL,
	"source" text DEFAULT 'web' NOT NULL,
	"status" text DEFAULT 'new' NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "personal_contexts" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"type" text NOT NULL,
	"description" text,
	"domain" text,
	"mention_count" integer DEFAULT 1 NOT NULL,
	"learned_from" jsonb DEFAULT '[]'::jsonb,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "persons" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"relationship_context" text,
	"last_touched_at" timestamp,
	"follow_up_next_action" text,
	"source_inbox_item_id" text,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "projects" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"desired_outcome" text,
	"next_action" text,
	"status" text DEFAULT 'active' NOT NULL,
	"source_inbox_item_id" text,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "receipts" (
	"id" text PRIMARY KEY NOT NULL,
	"inbox_item_id" text NOT NULL,
	"classification" text NOT NULL,
	"extracted_fields" jsonb NOT NULL,
	"confidence_score" real NOT NULL,
	"model_used" text NOT NULL,
	"timestamp" timestamp NOT NULL,
	"writes" jsonb NOT NULL,
	"previous_receipt_id" text,
	"personal_context_used" jsonb DEFAULT '[]'::jsonb
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "tasks" (
	"id" text PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"next_action" text NOT NULL,
	"due_date" timestamp,
	"context" text,
	"status" text DEFAULT 'active' NOT NULL,
	"source_inbox_item_id" text,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "clarifications" ADD CONSTRAINT "clarifications_inbox_item_id_inbox_items_id_fk" FOREIGN KEY ("inbox_item_id") REFERENCES "public"."inbox_items"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "ideas" ADD CONSTRAINT "ideas_source_inbox_item_id_inbox_items_id_fk" FOREIGN KEY ("source_inbox_item_id") REFERENCES "public"."inbox_items"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "persons" ADD CONSTRAINT "persons_source_inbox_item_id_inbox_items_id_fk" FOREIGN KEY ("source_inbox_item_id") REFERENCES "public"."inbox_items"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "projects" ADD CONSTRAINT "projects_source_inbox_item_id_inbox_items_id_fk" FOREIGN KEY ("source_inbox_item_id") REFERENCES "public"."inbox_items"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "receipts" ADD CONSTRAINT "receipts_inbox_item_id_inbox_items_id_fk" FOREIGN KEY ("inbox_item_id") REFERENCES "public"."inbox_items"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "tasks" ADD CONSTRAINT "tasks_source_inbox_item_id_inbox_items_id_fk" FOREIGN KEY ("source_inbox_item_id") REFERENCES "public"."inbox_items"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "clarifications_resolved_at_idx" ON "clarifications" USING btree ("resolved_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "inbox_items_status_idx" ON "inbox_items" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "inbox_items_captured_at_idx" ON "inbox_items" USING btree ("captured_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "personal_contexts_name_idx" ON "personal_contexts" USING btree ("name");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "personal_contexts_mention_count_idx" ON "personal_contexts" USING btree ("mention_count");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "receipts_inbox_item_id_idx" ON "receipts" USING btree ("inbox_item_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "receipts_timestamp_idx" ON "receipts" USING btree ("timestamp");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "tasks_status_idx" ON "tasks" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "tasks_context_idx" ON "tasks" USING btree ("context");