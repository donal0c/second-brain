CREATE INDEX `clarifications_resolved_at_idx` ON `clarifications` (`resolved_at`);--> statement-breakpoint
CREATE INDEX `inbox_items_status_idx` ON `inbox_items` (`status`);--> statement-breakpoint
CREATE INDEX `inbox_items_captured_at_idx` ON `inbox_items` (`captured_at`);--> statement-breakpoint
CREATE INDEX `personal_contexts_name_idx` ON `personal_contexts` (`name`);--> statement-breakpoint
CREATE INDEX `personal_contexts_mention_count_idx` ON `personal_contexts` (`mention_count`);--> statement-breakpoint
CREATE INDEX `receipts_inbox_item_id_idx` ON `receipts` (`inbox_item_id`);--> statement-breakpoint
CREATE INDEX `receipts_timestamp_idx` ON `receipts` (`timestamp`);--> statement-breakpoint
CREATE INDEX `tasks_status_idx` ON `tasks` (`status`);--> statement-breakpoint
CREATE INDEX `tasks_context_idx` ON `tasks` (`context`);