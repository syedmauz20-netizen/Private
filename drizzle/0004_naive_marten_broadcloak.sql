CREATE TABLE `task_drafts` (
	`id` text PRIMARY KEY NOT NULL,
	`task_id` text NOT NULL,
	`member_id` text NOT NULL,
	`answers` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
ALTER TABLE `tasks` ADD `form_schema` text DEFAULT '{}' NOT NULL;--> statement-breakpoint
ALTER TABLE `work_submissions` ADD `form_data` text;--> statement-breakpoint
ALTER TABLE `work_submissions` ADD `form_schema` text;