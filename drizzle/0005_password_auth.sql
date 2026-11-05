CREATE TABLE auth_accounts (id TEXT PRIMARY KEY NOT NULL,email TEXT NOT NULL COLLATE NOCASE UNIQUE,role TEXT NOT NULL CHECK(role IN ('admin','employee')),member_id TEXT UNIQUE REFERENCES members(id),password_hash TEXT NOT NULL,must_change_password INTEGER NOT NULL DEFAULT 1 CHECK(must_change_password IN (0,1)),CHECK((role='admin' AND email='syedmauz20@gmail.com' AND member_id IS NULL) OR (role='employee' AND member_id IS NOT NULL AND email!='syedmauz20@gmail.com')));
--> statement-breakpoint
CREATE UNIQUE INDEX auth_single_admin ON auth_accounts(role) WHERE role='admin';
--> statement-breakpoint
CREATE TABLE auth_sessions (token_hash TEXT PRIMARY KEY NOT NULL,account_id TEXT NOT NULL REFERENCES auth_accounts(id) ON DELETE CASCADE,expires_at INTEGER NOT NULL);
--> statement-breakpoint
CREATE INDEX auth_sessions_account ON auth_sessions(account_id);
--> statement-breakpoint
CREATE INDEX auth_sessions_expiry ON auth_sessions(expires_at);
--> statement-breakpoint
CREATE TABLE auth_limits (key TEXT PRIMARY KEY NOT NULL,attempts INTEGER NOT NULL,expires_at INTEGER NOT NULL);
