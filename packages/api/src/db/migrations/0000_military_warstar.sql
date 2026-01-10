CREATE TABLE `clarifications` (
	`id` text PRIMARY KEY NOT NULL,
	`inbox_item_id` text NOT NULL,
	`question` text NOT NULL,
	`options` text,
	`user_answer` text,
	`resolved_at` integer,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`inbox_item_id`) REFERENCES `inbox_items`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `ideas` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`summary` text,
	`links` text DEFAULT '[]',
	`source_inbox_item_id` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`source_inbox_item_id`) REFERENCES `inbox_items`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `inbox_items` (
	`id` text PRIMARY KEY NOT NULL,
	`captured_at` integer NOT NULL,
	`raw_text` text NOT NULL,
	`source` text DEFAULT 'web' NOT NULL,
	`status` text DEFAULT 'new' NOT NULL
);
--> statement-breakpoint
CREATE TABLE `persons` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`relationship_context` text,
	`last_touched_at` integer,
	`follow_up_next_action` text,
	`source_inbox_item_id` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`source_inbox_item_id`) REFERENCES `inbox_items`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `projects` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`desired_outcome` text,
	`next_action` text,
	`status` text DEFAULT 'active' NOT NULL,
	`source_inbox_item_id` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`source_inbox_item_id`) REFERENCES `inbox_items`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `receipts` (
	`id` text PRIMARY KEY NOT NULL,
	`inbox_item_id` text NOT NULL,
	`classification` text NOT NULL,
	`extracted_fields` text NOT NULL,
	`confidence_score` real NOT NULL,
	`model_used` text NOT NULL,
	`timestamp` integer NOT NULL,
	`writes` text NOT NULL,
	`previous_receipt_id` text,
	FOREIGN KEY (`inbox_item_id`) REFERENCES `inbox_items`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `tasks` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`next_action` text NOT NULL,
	`due_date` integer,
	`context` text,
	`status` text DEFAULT 'active' NOT NULL,
	`source_inbox_item_id` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`source_inbox_item_id`) REFERENCES `inbox_items`(`id`) ON UPDATE no action ON DELETE no action
);
