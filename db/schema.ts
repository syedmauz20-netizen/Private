import { pgTable, text, uuid, boolean, integer } from "drizzle-orm/pg-core";
export const applications = pgTable("applications", {id:text("id").primaryKey(),name:text("name").notNull(),email:text("email").notNull(),country:text("country").notNull(),role:text("role").notNull(),availability:text("availability").notNull(),experience:text("experience").notNull(),createdAt:text("created_at").notNull(),resumeKey:text("resume_key"),resumeName:text("resume_name"),resumeType:text("resume_type"),resumeSize:text("resume_size"),phone:text("phone"),profileUrl:text("profile_url"),stage:text("stage").notNull().default("new"),notes:text("notes").notNull().default(""),interviewAt:text("interview_at"),reviewedAt:text("reviewed_at")});
export const members=pgTable('members',{id:text('id').primaryKey(),name:text('name').notNull(),email:text('email').notNull().unique(),userId:uuid('user_id').unique(),active:text('active').notNull().default('yes'),jobTitle:text('job_title').notNull().default(''),department:text('department').notNull().default(''),timezone:text('timezone').notNull().default(''),taskCapacity:text('task_capacity').notNull().default('8'),bio:text('bio').notNull().default(''),skills:text('skills').notNull().default(''),availability:text('availability').notNull().default(''),inboxReadAt:text('inbox_read_at'),focusTasks:text('focus_tasks').notNull().default('[]'),createdAt:text('created_at').notNull()});
export const tasks=pgTable('tasks',{id:text('id').primaryKey(),title:text('title').notNull(),description:text('description').notNull(),formSchema:text('form_schema').notNull().default('{}'),assigneeId:text('assignee_id').notNull(),priority:text('priority').notNull(),status:text('status').notNull().default('todo'),dueDate:text('due_date').notNull(),createdAt:text('created_at').notNull(),updatedAt:text('updated_at').notNull()});
export const taskComments=pgTable('task_comments',{id:text('id').primaryKey(),taskId:text('task_id').notNull(),authorId:text('author_id').notNull(),authorName:text('author_name').notNull(),body:text('body').notNull(),createdAt:text('created_at').notNull()});

export const activity=pgTable('activity',{id:text('id').primaryKey(),actorId:text('actor_id').notNull(),actorName:text('actor_name').notNull(),kind:text('kind').notNull(),entityId:text('entity_id').notNull(),summary:text('summary').notNull(),createdAt:text('created_at').notNull()});
export const taskChecklist=pgTable('task_checklist',{id:text('id').primaryKey(),taskId:text('task_id').notNull(),title:text('title').notNull(),done:text('done').notNull().default('no'),createdAt:text('created_at').notNull()});

export const workSubmissions=pgTable('work_submissions',{id:text('id').primaryKey(),taskId:text('task_id').notNull(),memberId:text('member_id').notNull(),note:text('note').notNull(),url:text('url').notNull(),formData:text('form_data'),formSchema:text('form_schema'),createdAt:text('created_at').notNull()});
export const employeeRequests=pgTable('employee_requests',{id:text('id').primaryKey(),memberId:text('member_id').notNull(),category:text('category').notNull(),subject:text('subject').notNull(),body:text('body').notNull(),status:text('status').notNull().default('open'),reply:text('reply').notNull().default(''),createdAt:text('created_at').notNull(),updatedAt:text('updated_at').notNull()});
export const workspaceResources=pgTable('workspace_resources',{id:text('id').primaryKey(),kind:text('kind').notNull(),title:text('title').notNull(),category:text('category').notNull(),body:text('body').notNull(),url:text('url').notNull().default(''),active:text('active').notNull().default('yes'),createdAt:text('created_at').notNull(),updatedAt:text('updated_at').notNull()});

export const taskDrafts=pgTable('task_drafts',{id:text('id').primaryKey(),taskId:text('task_id').notNull(),memberId:text('member_id').notNull(),answers:text('answers').notNull(),updatedAt:text('updated_at').notNull()});


export const portalAccounts = pgTable('portal_accounts', {
  id: uuid('id').primaryKey(), email: text('email').notNull().unique(), role: text('role').notNull(),
  memberId: text('member_id').unique().references(() => members.id),
  mustChangePassword: boolean('must_change_password').notNull().default(true),
  credentialVersion: integer('credential_version').notNull().default(0),
});
export const accountProfiles = pgTable('account_profiles', {
  accountId:uuid('account_id').primaryKey().references(()=>portalAccounts.id,{onDelete:'cascade'}),
  displayName:text('display_name').notNull().default('Administrator'),
  fullName:text('full_name').notNull().default(''),jobTitle:text('job_title').notNull().default(''),
  phone:text('phone').notNull().default(''),timezone:text('timezone').notNull().default(''),
  bio:text('bio').notNull().default(''),updatedAt:text('updated_at').notNull(),
});
