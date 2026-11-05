CREATE TABLE `employee_requests` (
	`id` text PRIMARY KEY NOT NULL,
	`member_id` text NOT NULL,
	`category` text NOT NULL,
	`subject` text NOT NULL,
	`body` text NOT NULL,
	`status` text DEFAULT 'open' NOT NULL,
	`reply` text DEFAULT '' NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `work_submissions` (
	`id` text PRIMARY KEY NOT NULL,
	`task_id` text NOT NULL,
	`member_id` text NOT NULL,
	`note` text NOT NULL,
	`url` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `workspace_resources` (
	`id` text PRIMARY KEY NOT NULL,
	`kind` text NOT NULL,
	`title` text NOT NULL,
	`category` text NOT NULL,
	`body` text NOT NULL,
	`url` text DEFAULT '' NOT NULL,
	`active` text DEFAULT 'yes' NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
ALTER TABLE `members` ADD `bio` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `members` ADD `skills` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `members` ADD `availability` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `members` ADD `inbox_read_at` text;--> statement-breakpoint
ALTER TABLE `members` ADD `focus_tasks` text DEFAULT '[]' NOT NULL;