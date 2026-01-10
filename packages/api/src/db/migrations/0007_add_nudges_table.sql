-- Create nudges table for contextual micro-prompts
CREATE TABLE `nudges` (
  `id` text PRIMARY KEY NOT NULL,
  `type` text NOT NULL,
  `message` text NOT NULL,
  `entity_type` text NOT NULL,
  `entity_id` text NOT NULL,
  `created_at` integer NOT NULL,
  `dismissed_at` integer,
  `snoozed_until` integer
);--> statement-breakpoint

-- Create indexes for efficient querying
CREATE INDEX `nudges_created_at_idx` ON `nudges` (`created_at`);--> statement-breakpoint
CREATE INDEX `nudges_entity_idx` ON `nudges` (`entity_type`, `entity_id`);--> statement-breakpoint
CREATE INDEX `nudges_dismissed_at_idx` ON `nudges` (`dismissed_at`);
