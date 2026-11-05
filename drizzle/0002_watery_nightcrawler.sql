CREATE TABLE `activity` (
	`id` text PRIMARY KEY NOT NULL,
	`actor_id` text NOT NULL,
	`actor_name` text NOT NULL,
	`kind` text NOT NULL,
	`entity_id` text NOT NULL,
	`summary` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `task_checklist` (
	`id` text PRIMARY KEY NOT NULL,
	`task_id` text NOT NULL,
	`title` text NOT NULL,
	`done` text DEFAULT 'no' NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
ALTER TABLE `applications` ADD `resume_key` text;--> statement-breakpoint
ALTER TABLE `applications` ADD `resume_name` text;--> statement-breakpoint
ALTER TABLE `applications` ADD `resume_type` text;--> statement-breakpoint
ALTER TABLE `applications` ADD `resume_size` text;--> statement-breakpoint
ALTER TABLE `applications` ADD `phone` text;--> statement-breakpoint
ALTER TABLE `applications` ADD `profile_url` text;--> statement-breakpoint
ALTER TABLE `applications` ADD `stage` text DEFAULT 'new' NOT NULL;--> statement-breakpoint
ALTER TABLE `applications` ADD `notes` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `applications` ADD `interview_at` text;--> statement-breakpoint
ALTER TABLE `applications` ADD `reviewed_at` text;--> statement-breakpoint
ALTER TABLE `members` ADD `job_title` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `members` ADD `department` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `members` ADD `timezone` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `members` ADD `task_capacity` text DEFAULT '8' NOT NULL;