CREATE TABLE "account_profiles" (
	"account_id" uuid PRIMARY KEY NOT NULL,
	"display_name" text DEFAULT 'Administrator' NOT NULL,
	"full_name" text DEFAULT '' NOT NULL,
	"job_title" text DEFAULT '' NOT NULL,
	"phone" text DEFAULT '' NOT NULL,
	"timezone" text DEFAULT '' NOT NULL,
	"bio" text DEFAULT '' NOT NULL,
	"updated_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "activity" (
	"id" text PRIMARY KEY NOT NULL,
	"actor_id" text NOT NULL,
	"actor_name" text NOT NULL,
	"kind" text NOT NULL,
	"entity_id" text NOT NULL,
	"summary" text NOT NULL,
	"created_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "applications" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"country" text NOT NULL,
	"role" text NOT NULL,
	"availability" text NOT NULL,
	"experience" text NOT NULL,
	"created_at" text NOT NULL,
	"resume_key" text,
	"resume_name" text,
	"resume_type" text,
	"resume_size" text,
	"phone" text,
	"profile_url" text,
	"stage" text DEFAULT 'new' NOT NULL,
	"notes" text DEFAULT '' NOT NULL,
	"interview_at" text,
	"reviewed_at" text
);
--> statement-breakpoint
CREATE TABLE "employee_requests" (
	"id" text PRIMARY KEY NOT NULL,
	"member_id" text NOT NULL,
	"category" text NOT NULL,
	"subject" text NOT NULL,
	"body" text NOT NULL,
	"status" text DEFAULT 'open' NOT NULL,
	"reply" text DEFAULT '' NOT NULL,
	"created_at" text NOT NULL,
	"updated_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "members" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"user_id" uuid,
	"active" text DEFAULT 'yes' NOT NULL,
	"job_title" text DEFAULT '' NOT NULL,
	"department" text DEFAULT '' NOT NULL,
	"timezone" text DEFAULT '' NOT NULL,
	"task_capacity" text DEFAULT '8' NOT NULL,
	"bio" text DEFAULT '' NOT NULL,
	"skills" text DEFAULT '' NOT NULL,
	"availability" text DEFAULT '' NOT NULL,
	"inbox_read_at" text,
	"focus_tasks" text DEFAULT '[]' NOT NULL,
	"created_at" text NOT NULL,
	CONSTRAINT "members_email_unique" UNIQUE("email"),
	CONSTRAINT "members_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "portal_accounts" (
	"id" uuid PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"role" text NOT NULL,
	"member_id" text,
	"must_change_password" boolean DEFAULT true NOT NULL,
	CONSTRAINT "portal_accounts_email_unique" UNIQUE("email"),
	CONSTRAINT "portal_accounts_member_id_unique" UNIQUE("member_id")
);
--> statement-breakpoint
CREATE TABLE "task_checklist" (
	"id" text PRIMARY KEY NOT NULL,
	"task_id" text NOT NULL,
	"title" text NOT NULL,
	"done" text DEFAULT 'no' NOT NULL,
	"created_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "task_comments" (
	"id" text PRIMARY KEY NOT NULL,
	"task_id" text NOT NULL,
	"author_id" text NOT NULL,
	"author_name" text NOT NULL,
	"body" text NOT NULL,
	"created_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "task_drafts" (
	"id" text PRIMARY KEY NOT NULL,
	"task_id" text NOT NULL,
	"member_id" text NOT NULL,
	"answers" text NOT NULL,
	"updated_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tasks" (
	"id" text PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"form_schema" text DEFAULT '{}' NOT NULL,
	"assignee_id" text NOT NULL,
	"priority" text NOT NULL,
	"status" text DEFAULT 'todo' NOT NULL,
	"due_date" text NOT NULL,
	"created_at" text NOT NULL,
	"updated_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "work_submissions" (
	"id" text PRIMARY KEY NOT NULL,
	"task_id" text NOT NULL,
	"member_id" text NOT NULL,
	"note" text NOT NULL,
	"url" text NOT NULL,
	"form_data" text,
	"form_schema" text,
	"created_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "workspace_resources" (
	"id" text PRIMARY KEY NOT NULL,
	"kind" text NOT NULL,
	"title" text NOT NULL,
	"category" text NOT NULL,
	"body" text NOT NULL,
	"url" text DEFAULT '' NOT NULL,
	"active" text DEFAULT 'yes' NOT NULL,
	"created_at" text NOT NULL,
	"updated_at" text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "account_profiles" ADD CONSTRAINT "account_profiles_account_id_portal_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."portal_accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portal_accounts" ADD CONSTRAINT "portal_accounts_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE no action ON UPDATE no action;