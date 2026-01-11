CREATE TABLE IF NOT EXISTS "nudges" (
	"id" text PRIMARY KEY NOT NULL,
	"type" text NOT NULL,
	"message" text NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" text NOT NULL,
	"created_at" timestamp NOT NULL,
	"dismissed_at" timestamp,
	"snoozed_until" timestamp
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "nudges_created_at_idx" ON "nudges" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "nudges_entity_idx" ON "nudges" USING btree ("entity_type","entity_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "nudges_dismissed_at_idx" ON "nudges" USING btree ("dismissed_at");