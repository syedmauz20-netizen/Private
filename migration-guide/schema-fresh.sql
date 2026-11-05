-- RemoteWorkNest schema: EMPTY database only; not a production data export.

-- 0000_motionless_blonde_phantom.sql
CREATE TABLE `applications` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`email` text NOT NULL,
	`country` text NOT NULL,
	`role` text NOT NULL,
	`availability` text NOT NULL,
	`experience` text NOT NULL,
	`created_at` text NOT NULL
);


-- 0001_tidy_switch.sql
CREATE TABLE `members` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`email` text NOT NULL,
	`user_id` text,
	`active` text DEFAULT 'yes' NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `members_email_unique` ON `members` (`email`);--> statement-breakpoint
CREATE UNIQUE INDEX `members_user_id_unique` ON `members` (`user_id`);--> statement-breakpoint
CREATE TABLE `task_comments` (
	`id` text PRIMARY KEY NOT NULL,
	`task_id` text NOT NULL,
	`author_id` text NOT NULL,
	`author_name` text NOT NULL,
	`body` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `tasks` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`description` text NOT NULL,
	`assignee_id` text NOT NULL,
	`priority` text NOT NULL,
	`status` text DEFAULT 'todo' NOT NULL,
	`due_date` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);


-- 0002_watery_nightcrawler.sql
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

-- 0003_lyrical_harry_osborn.sql
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

-- 0004_naive_marten_broadcloak.sql
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
