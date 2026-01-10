CREATE TABLE `personal_contexts` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`type` text NOT NULL,
	`description` text,
	`domain` text,
	`mention_count` integer DEFAULT 1 NOT NULL,
	`learned_from` text DEFAULT '[]',
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
