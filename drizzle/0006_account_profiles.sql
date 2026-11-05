CREATE TABLE account_profiles (
  account_id TEXT PRIMARY KEY NOT NULL REFERENCES auth_accounts(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL DEFAULT 'Administrator',
  full_name TEXT NOT NULL DEFAULT '',
  job_title TEXT NOT NULL DEFAULT '',
  phone TEXT NOT NULL DEFAULT '',
  timezone TEXT NOT NULL DEFAULT '',
  bio TEXT NOT NULL DEFAULT '',
  updated_at TEXT NOT NULL
);
