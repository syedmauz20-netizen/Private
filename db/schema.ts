import {sql} from 'drizzle-orm';
import { sqliteTable, text, integer, index, uniqueIndex, check } from "drizzle-orm/sqlite-core";
export const applications = sqliteTable("applications", {id:text("id").primaryKey(),name:text("name").notNull(),email:text("email").notNull(),country:text("country").notNull(),role:text("role").notNull(),availability:text("availability").notNull(),experience:text("experience").notNull(),createdAt:text("created_at").notNull(),resumeKey:text("resume_key"),resumeName:text("resume_name"),resumeType:text("resume_type"),resumeSize:text("resume_size"),phone:text("phone"),profileUrl:text("profile_url"),stage:text("stage").notNull().default("new"),notes:text("notes").notNull().default(""),interviewAt:text("interview_at"),reviewedAt:text("reviewed_at")});
export const members=sqliteTable('members',{id:text('id').primaryKey(),name:text('name').notNull(),email:text('email').notNull().unique(),userId:text('user_id').unique(),active:text('active').notNull().default('yes'),jobTitle:text('job_title').notNull().default(''),department:text('department').notNull().default(''),timezone:text('timezone').notNull().default(''),taskCapacity:text('task_capacity').notNull().default('8'),bio:text('bio').notNull().default(''),skills:text('skills').notNull().default(''),availability:text('availability').notNull().default(''),inboxReadAt:text('inbox_read_at'),focusTasks:text('focus_tasks').notNull().default('[]'),createdAt:text('created_at').notNull()});
export const tasks=sqliteTable('tasks',{id:text('id').primaryKey(),title:text('title').notNull(),description:text('description').notNull(),formSchema:text('form_schema').notNull().default('{}'),assigneeId:text('assignee_id').notNull(),priority:text('priority').notNull(),status:text('status').notNull().default('todo'),dueDate:text('due_date').notNull(),createdAt:text('created_at').notNull(),updatedAt:text('updated_at').notNull()});
export const taskComments=sqliteTable('task_comments',{id:text('id').primaryKey(),taskId:text('task_id').notNull(),authorId:text('author_id').notNull(),authorName:text('author_name').notNull(),body:text('body').notNull(),createdAt:text('created_at').notNull()});

export const activity=sqliteTable('activity',{id:text('id').primaryKey(),actorId:text('actor_id').notNull(),actorName:text('actor_name').notNull(),kind:text('kind').notNull(),entityId:text('entity_id').notNull(),summary:text('summary').notNull(),createdAt:text('created_at').notNull()});
export const taskChecklist=sqliteTable('task_checklist',{id:text('id').primaryKey(),taskId:text('task_id').notNull(),title:text('title').notNull(),done:text('done').notNull().default('no'),createdAt:text('created_at').notNull()});

export const workSubmissions=sqliteTable('work_submissions',{id:text('id').primaryKey(),taskId:text('task_id').notNull(),memberId:text('member_id').notNull(),note:text('note').notNull(),url:text('url').notNull(),formData:text('form_data'),formSchema:text('form_schema'),createdAt:text('created_at').notNull()});
export const employeeRequests=sqliteTable('employee_requests',{id:text('id').primaryKey(),memberId:text('member_id').notNull(),category:text('category').notNull(),subject:text('subject').notNull(),body:text('body').notNull(),status:text('status').notNull().default('open'),reply:text('reply').notNull().default(''),createdAt:text('created_at').notNull(),updatedAt:text('updated_at').notNull()});
export const workspaceResources=sqliteTable('workspace_resources',{id:text('id').primaryKey(),kind:text('kind').notNull(),title:text('title').notNull(),category:text('category').notNull(),body:text('body').notNull(),url:text('url').notNull().default(''),active:text('active').notNull().default('yes'),createdAt:text('created_at').notNull(),updatedAt:text('updated_at').notNull()});

export const taskDrafts=sqliteTable('task_drafts',{id:text('id').primaryKey(),taskId:text('task_id').notNull(),memberId:text('member_id').notNull(),answers:text('answers').notNull(),updatedAt:text('updated_at').notNull()});


export const authAccounts = sqliteTable('auth_accounts', {
  id: text('id').primaryKey(),
  email: text('email').notNull().unique(),
  role: text('role').notNull(),
  memberId: text('member_id').unique().references(() => members.id),
  passwordHash: text('password_hash').notNull(),
  mustChangePassword: integer('must_change_password').notNull().default(1),
}, t => [
  uniqueIndex('auth_single_admin').on(t.role).where(sql`role='admin'`),
  check('auth_role', sql`role IN ('admin','employee')`),
  check('auth_change', sql`must_change_password IN (0,1)`),
  check('auth_identity', sql`(role='admin' AND email='syedmauz20@gmail.com' AND member_id IS NULL) OR (role='employee' AND member_id IS NOT NULL AND email!='syedmauz20@gmail.com')`),
]);
export const authSessions = sqliteTable('auth_sessions', {
  tokenHash: text('token_hash').primaryKey(),
  accountId: text('account_id').notNull().references(() => authAccounts.id, {onDelete:'cascade'}),
  expiresAt: integer('expires_at').notNull(),
}, t => [index('auth_sessions_account').on(t.accountId), index('auth_sessions_expiry').on(t.expiresAt)]);
export const authLimits = sqliteTable('auth_limits', {
  key: text('key').primaryKey(),
  attempts: integer('attempts').notNull(),
  expiresAt: integer('expires_at').notNull(),
});

export const accountProfiles = sqliteTable('account_profiles', {
  accountId:text('account_id').primaryKey().references(()=>authAccounts.id,{onDelete:'cascade'}),
  displayName:text('display_name').notNull().default('Administrator'),
  fullName:text('full_name').notNull().default(''),
  jobTitle:text('job_title').notNull().default(''),
  phone:text('phone').notNull().default(''),
  timezone:text('timezone').notNull().default(''),
  bio:text('bio').notNull().default(''),
  updatedAt:text('updated_at').notNull(),
});
