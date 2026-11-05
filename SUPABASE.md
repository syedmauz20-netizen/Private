# Supabase setup for RemoteWorkNest

This is a new deployment target, not a data import. No local or Cloudflare account, task, application, password or object is assumed to exist in Supabase. Existing remote resources remain untouched. Use a dedicated Supabase project for this portal and a separate project for development/Preview.

## 1. Create the project and collect configuration

Create a project in the Supabase dashboard, choose a region near the Vercel functions, and save the database password in your password manager. In the project's Connect dialog and Settings → API Keys, obtain:

| Variable | Source / value |
| --- | --- |
| NEXT_PUBLIC_SUPABASE_URL | Project URL, https://PROJECT_REF.supabase.co |
| NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY | Publishable API key, sb_publishable_… |
| SUPABASE_SECRET_KEY | Secret API key, sb_secret_…, server-only |
| DATABASE_URL | Connect → Transaction pooler → URI, normally postgresql://postgres.PROJECT_REF:PASSWORD@POOLER_HOST:6543/postgres; copy your actual region's host. URL-encode the database password. |
| SUPABASE_STORAGE_BUCKET | portal-cvs |
| AUTH_ORIGIN | Exact application origin: http://localhost:3000 or your canonical HTTPS production/Preview origin |
| UPLOAD_TOKEN_SECRET | Independent random secret of at least 32 characters |

Copy .env.example to ignored .env.local for local use, and set the same names in the matching Vercel environment. DATABASE_URL and SUPABASE_SECRET_KEY are privileged credentials. They must never be used in browser code. The database connection uses TLS, a small pool and prepare:false for transaction-pooler compatibility. Do not use the anonymous/publishable API key as a database password.

## 2. Apply the PostgreSQL migrations

Use a new, empty project. In Supabase SQL Editor as the project database owner, review and execute these files in order, each as a complete query:

1. supabase/migrations/20261105000100_portal.sql
2. supabase/migrations/20261105000200_security.sql

Alternatively, use the Supabase CLI's normal linked-project migration workflow with only supabase/migrations. No CLI command or remote migration has been executed by this change. Do not paste the old drizzle/*.sql or migration-guide/schema-fresh.sql into Supabase. The migrations intentionally fail on existing conflicting tables/buckets rather than overwrite them. If execution fails, inspect transaction state before retrying; do not drop existing tables to make it pass.

The business tables retain text IDs and ISO date/JSON strings expected by the existing UI. PostgreSQL uses UUID references to auth.users and a real boolean for the mandatory-password-change flag. Epoch milliseconds in the limiter use bigint. Unique indexes, status checks, member/task foreign keys and PostgreSQL transactions replace SQLite behavior. There are no application password hashes or custom session-token tables.

The migrations also enable RLS on every portal table. Authenticated Data API clients can read only their permitted rows: administrators see portal data, employees see their own tasks/workspace and published resources, and anonymous clients see no portal data. No browser/Data API client can write portal tables, including role rows. All mutations use validated Next.js routes with live role/ownership checks. The private helper functions use a fixed search_path and cannot promote users. Neither user_metadata nor client-supplied role fields authorize anything.

The Next.js database connection is privileged and bypasses RLS. Server routes therefore enforce authentication, forced-change, disabled-account, ownership and transition checks before writes. Keep both DATABASE_URL and the secret API key private. Do not add permissive write policies or expose the database credentials to implement browser writes.

## 3. Configure Supabase Auth

In Authentication → Providers / Sign In settings:

- Enable Email/password authentication.
- Disable new user signups and anonymous sign-ins. Administrators create employee accounts through the portal using the server-side Admin API.
- Set the minimum password length to at least 12. The UI accepts 12–128 characters. Configure provider rate limits appropriate to your traffic.
- Use the project's current asymmetric signing keys and normal Auth session settings. The portal verifies users with getUser and verified getClaims; it does not trust getSession's stored user object.

In Authentication → URL Configuration:

| Environment | Site URL | Redirect URL allowlist entry |
| --- | --- | --- |
| Local isolated project | http://localhost:3000 | http://localhost:3000/auth/callback |
| Production | https://YOUR_CANONICAL_DOMAIN | https://YOUR_CANONICAL_DOMAIN/auth/callback |
| Preview isolated project | https://YOUR_STABLE_PREVIEW_DOMAIN | https://YOUR_STABLE_PREVIEW_DOMAIN/auth/callback |

Replace placeholders and match AUTH_ORIGIN exactly. Add only explicitly approved origins; do not broadly allow arbitrary production-project previews. Password sign-in and temporary-password employee provisioning do not send email links. The supplied /auth/callback handler supports PKCE code exchange with a fixed, same-origin destination and requires a provisioned portal account. It does not implement a public signup or password-recovery UI. Employees who lose a password use the administrator's Reset password workflow.

The official @supabase/ssr cookie integration and Next.js 16 proxy.ts refresh tokens and propagate refreshed request/response cookies with private/no-store cache controls. There is no legacy rwn_session cookie. A domain change requires signing in on the new domain.

## 4. Secure first administrator creation

There is no public administrator-creation endpoint and no AUTH_SETUP_TOKEN. /setup displays operator instructions only. There is no role-from-email or role-from-metadata automatic promotion.

1. In Supabase Authentication → Users → Add user / Create user, create the intended administrator email with a strong temporary password of at least 12 characters. Confirm the email through the trusted dashboard operation. Securely communicate that password to the actual owner. Do not put it in SQL, Git or shell arguments.
2. Copy that new user's UUID from the dashboard. In SQL Editor, verify the UUID/email and confirmed status:

```sql
SELECT id,email,email_confirmed_at FROM auth.users
WHERE id='REPLACE_WITH_NEW_AUTH_USER_UUID'::uuid;
```

3. After verifying identity, execute the following once, replacing the same UUID. This grants the single administrator role and forces an initial password change:

```sql
INSERT INTO public.portal_accounts(id,email,role,must_change_password)
SELECT id,lower(email),'admin',true FROM auth.users
WHERE id='REPLACE_WITH_NEW_AUTH_USER_UUID'::uuid
  AND email_confirmed_at IS NOT NULL;
```

Confirm exactly one row was inserted. The single-admin unique index prevents creating another administrator. Do not change role metadata in the Auth dashboard as a substitute for this protected row.

4. Sign in at /login with that email and temporary password. Complete /change-password, then sign in again. Create employees from the existing Employee Logins panel. Employee creation confirms the email as an explicit administrator action, links the returned Auth UUID, assigns only the employee role and requires a password change.

An unlinked Auth user has no portal access. Existing Auth emails are never silently adopted as employees or administrators. If an Auth user already exists before portal provisioning, reconcile it explicitly as the project operator; do not delete or take over an unknown user to get past a duplicate-email error.

## 5. Private CV Storage

The security migration creates portal-cvs with Public disabled, a 5,242,880-byte limit, and these allowed MIME types:

- application/pdf
- application/vnd.openxmlformats-officedocument.wordprocessingml.document

In Storage, confirm these values and keep the bucket private. Do not add public or employee read/write policies. The only read policy permits a current, unrestricted administrator to read final resumes/ objects. Anonymous clients and employees cannot list/read CVs. Application uploads work through server-generated signed upload URLs for a single random pending-resumes/ object, without granting general bucket access.

The browser hashes the file, requests a signed upload, PUTs directly to Storage, and submits a small form with a ten-minute signed ticket. Supabase signed upload URLs remain usable for two hours; the shorter portal ticket limits when that upload can become an application. Uploads use upsert:false. Storage enforces size/MIME; the server independently checks ticket signature/expiry, declared size, SHA-256, extension and PDF/DOCX file signatures before copying bytes to a separate random resumes/ object and inserting the application. A duplicate ticket cannot create a second application because the application ID is a primary key. Failed database inserts clean up only that attempt's final object.

Downloads go through /api/resume, which checks current administrator access before issuing a 60-second signed URL. Treat that URL as a bearer capability until expiration. No public bucket URL is used. Supabase's hosted Storage handles cross-origin upload requests; no R2 CORS configuration or AWS headers are needed. Verify a real browser upload from each approved environment during acceptance testing.

Schedule scripts/cleanup-uploads.mjs daily in a trusted operator environment with the server variables. For local operator execution after reviewing the target project, use:

```sh
node --env-file=.env.local scripts/cleanup-uploads.mjs
```

It uses the Storage API to remove up to 1,000 pending-resumes/ objects older than 24 hours per run. Repeat if there is a larger backlog. It never deletes resumes/ objects or application rows. Do not delete storage.objects rows directly: that would leave orphaned bytes. This job has not been run against any remote project.

## 6. Failure recovery and existing data

Auth Admin API calls and SQL cannot share one transaction. Employee creation deletes only its newly created Auth user if the SQL transaction fails. If compensation fails, the UI explicitly asks the operator to reconcile that unlinked user. Password changes/resets restrict access and revoke existing sessions before updating Auth; failed changes leave the forced-change flag set and can be retried through Reset password. For an administrator locked out during a failed change, the project owner can set a new temporary password in Authentication → Users and keep must_change_password=true in portal_accounts; do not clear the flag to bypass a failed password update.

The portal_revoked_sessions ledger denies existing Auth session IDs immediately after logout/reset/change/disable, including still-valid access JWTs. Re-enabling a member does not restore those sessions. The Auth session must still exist and belong to the user. All sessions and password credentials themselves remain managed by Supabase.

Cloudflare D1/R2, local SQLite files and their legacy migrations are historical resources. No export/import/deletion is performed. Supabase begins with no portal data other than explicitly provisioned accounts and new records. A future data import must map Auth UUIDs to members, preserve business IDs/relationships and JSON/date contracts, arrange password resets, and copy private CV bytes before switching resume keys. Review that separate plan before moving production data.

## 7. Verification

Run pnpm install --frozen-lockfile, pnpm typecheck, pnpm test and pnpm build. PostgreSQL/PGlite tests execute the actual migrations, constraints, RLS and route queries. Local fixtures stand in for Supabase's managed Auth/Storage schemas and provider network calls, so hosted signup settings, cookie refresh, S3-independent Storage uploads, Supavisor TLS connectivity and actual secret-key permissions require an isolated Supabase acceptance run. Do not connect that test to production data.

References: [SSR setup](https://supabase.com/docs/guides/auth/server-side/creating-a-client?framework=nextjs), [RLS](https://supabase.com/docs/guides/database/postgres/row-level-security), [Auth sessions](https://supabase.com/docs/guides/auth/sessions), [signed uploads](https://supabase.com/docs/reference/javascript/storage-from-createsigneduploadurl), [PostgreSQL connection pooling](https://supabase.com/docs/guides/database/connecting-to-postgres).
