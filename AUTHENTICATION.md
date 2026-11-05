# Authentication

Supabase Auth owns passwords, login, JWTs, refresh tokens and cookie sessions. The official @supabase/ssr integration refreshes cookies through Next.js 16 proxy.ts. Server routes verify the user with getUser and verified claims, then read protected portal_accounts rows. Roles never come from user_metadata. PostgreSQL RLS repeats the portal access checks for Data API reads.

Follow [SUPABASE.md](SUPABASE.md) to create a fresh project and its first administrator. Public signup and the old setup-token endpoint are disabled. A Supabase Auth user alone has no portal access. Employee creation links a new Auth UUID to a member and a protected employee role; temporary passwords require a change before portal access.

Password changes verify the current password through an isolated Supabase Auth client. Resets and changes revoke existing portal sessions; disabled accounts lose access immediately and old sessions stay revoked after re-enabling. A credential version check prevents a concurrent reset from silently clearing the forced-change flag. The portal revocation ledger supplements Supabase Auth to deny still-valid access JWTs immediately. No application password hashes, custom authentication cookies or refresh tokens are stored in portal tables.

Auth and SQL are separate services. Employee creation compensates a failed SQL insert by deleting only the Auth user created in that attempt. Password-operation failures leave the account restricted; the administrator can retry Reset password. Review the recovery instructions in SUPABASE.md. No old Cloudflare account, password, session or data is automatically imported.
