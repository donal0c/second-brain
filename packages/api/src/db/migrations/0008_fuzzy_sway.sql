ALTER TABLE "clarifications" DROP CONSTRAINT "clarifications_inbox_item_id_inbox_items_id_fk";
--> statement-breakpoint
ALTER TABLE "ideas" DROP CONSTRAINT "ideas_source_inbox_item_id_inbox_items_id_fk";
--> statement-breakpoint
ALTER TABLE "persons" DROP CONSTRAINT "persons_source_inbox_item_id_inbox_items_id_fk";
--> statement-breakpoint
ALTER TABLE "projects" DROP CONSTRAINT "projects_source_inbox_item_id_inbox_items_id_fk";
--> statement-breakpoint
ALTER TABLE "receipts" DROP CONSTRAINT "receipts_inbox_item_id_inbox_items_id_fk";
--> statement-breakpoint
ALTER TABLE "tasks" DROP CONSTRAINT "tasks_source_inbox_item_id_inbox_items_id_fk";
--> statement-breakpoint
ALTER TABLE "ideas" ADD COLUMN "needs_review" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "persons" ADD COLUMN "needs_review" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "needs_review" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "tasks" ADD COLUMN "needs_review" boolean DEFAULT false NOT NULL;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "clarifications" ADD CONSTRAINT "clarifications_inbox_item_id_inbox_items_id_fk" FOREIGN KEY ("inbox_item_id") REFERENCES "public"."inbox_items"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "ideas" ADD CONSTRAINT "ideas_source_inbox_item_id_inbox_items_id_fk" FOREIGN KEY ("source_inbox_item_id") REFERENCES "public"."inbox_items"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "persons" ADD CONSTRAINT "persons_source_inbox_item_id_inbox_items_id_fk" FOREIGN KEY ("source_inbox_item_id") REFERENCES "public"."inbox_items"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "projects" ADD CONSTRAINT "projects_source_inbox_item_id_inbox_items_id_fk" FOREIGN KEY ("source_inbox_item_id") REFERENCES "public"."inbox_items"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "receipts" ADD CONSTRAINT "receipts_inbox_item_id_inbox_items_id_fk" FOREIGN KEY ("inbox_item_id") REFERENCES "public"."inbox_items"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "tasks" ADD CONSTRAINT "tasks_source_inbox_item_id_inbox_items_id_fk" FOREIGN KEY ("source_inbox_item_id") REFERENCES "public"."inbox_items"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ideas_needs_review_idx" ON "ideas" USING btree ("needs_review");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "persons_needs_review_idx" ON "persons" USING btree ("needs_review");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "projects_needs_review_idx" ON "projects" USING btree ("needs_review");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "tasks_needs_review_idx" ON "tasks" USING btree ("needs_review");