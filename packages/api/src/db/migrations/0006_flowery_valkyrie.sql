ALTER TABLE "ideas" ADD COLUMN "needs_review" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "persons" ADD COLUMN "needs_review" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "needs_review" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "tasks" ADD COLUMN "needs_review" boolean DEFAULT false NOT NULL;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ideas_needs_review_idx" ON "ideas" USING btree ("needs_review");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "persons_needs_review_idx" ON "persons" USING btree ("needs_review");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "projects_needs_review_idx" ON "projects" USING btree ("needs_review");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "tasks_needs_review_idx" ON "tasks" USING btree ("needs_review");