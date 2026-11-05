# Vercel + Supabase deployment

The website and portal run on standard Next.js 16, Node.js 24 and Vercel. Supabase supplies PostgreSQL, Auth and private Storage. No Cloudflare binding, D1 HTTP adapter, R2 credential, Sites tool or ignored hosting manifest is needed to install, build or run the project.

## Project settings

| Setting | Value |
| --- | --- |
| Root directory | Directory containing package.json |
| Framework preset | Next.js |
| Node.js | 24.x |
| Package manager | pnpm 10.34.9 (packageManager field) |
| Install command | pnpm install --frozen-lockfile |
| Build command | pnpm run build |
| Output directory | Leave default; Next.js uses .next |
| Start command | No override; Vercel runs the Next.js functions |
| API duration | 60 seconds, configured in vercel.json |

Do not use static export or dist. No remote migration runs during installation, build or startup. Build and public pages can work without credentials; the portal needs a configured Supabase project.

## Environment variables

Set these under Vercel Project Settings → Environment Variables. Supply the public variables at build time too. Use a different Supabase project and keys for Preview/development. Use a stable Preview domain with its own AUTH_ORIGIN; never attach untrusted branch previews to production credentials.

| Name | Value source |
| --- | --- |
| AUTH_ORIGIN | Exact canonical website origin, e.g. https://portal.example.com, no path. Locally http://localhost:3000. Used for CSRF and callback destinations. |
| NEXT_PUBLIC_SUPABASE_URL | Supabase project Connect dialog / API settings → Project URL, https://PROJECT_REF.supabase.co. |
| NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY | Supabase Settings → API Keys → Publishable key (sb_publishable_…). Safe to expose; authorization relies on RLS and server checks. |
| SUPABASE_SECRET_KEY | Same project's API Keys → Secret key (sb_secret_…). Privileged and server-only; never prefix with NEXT_PUBLIC_. |
| DATABASE_URL | Supabase Connect → Transaction pooler URI (Supavisor, port 6543). Use the project's database password, not an API key. Replace its placeholder with a URL-encoded password. Keep server-only. |
| SUPABASE_STORAGE_BUCKET | portal-cvs, created by the reviewed SQL migration. |
| UPLOAD_TOKEN_SECRET | A separate cryptographically random value, at least 32 characters, generated and saved in your password manager. Signs short-lived application tickets. Server-only. |

Store local values in ignored .env.local. Never paste secrets into source, commits, command arguments or build logs. Old D1_HTTP_*, R2_* and AUTH_SETUP_TOKEN variables are unused and should not be copied into this target. Changing Vercel variables requires a later redeployment.

## Before a later deployment

1. Complete [SUPABASE.md](SUPABASE.md): create an isolated project, apply both reviewed migrations, configure Auth, confirm the private bucket, and create the first administrator.
2. Set the variables above and the exact authentication redirect allowlist for that environment.
3. Run pnpm install --frozen-lockfile, pnpm typecheck, pnpm test and pnpm build. Use pnpm start for a local production smoke test.
4. Against your isolated Supabase project, check administrator login, employee creation/reset/disable/re-enable, mandatory password changes, all-session revocation, settings, personal task permissions, drafts, submissions, approvals, resources, requests, candidate updates, and a full 5 MB PDF/DOCX upload/download. Confirm anonymous and employee clients cannot list/download CVs or promote roles through the Data API.
5. Only then schedule a separate production deployment and cutover. No Git push, remote database changes, import, Cloudflare deletion or deployment was performed during this source change.

The signed Storage upload bypasses Vercel's 4.5 MB function request limit. The server verifies the stored bytes and returns a short admin-authorized signed download URL, so 5 MB CVs do not pass through Vercel responses either. Configure appropriate public endpoint traffic limits in Vercel in addition to the application's PostgreSQL-backed limiter.

## Existing resources and connectors

The old Cloudflare resources are untouched and are not read by the new runtime. Supabase starts empty. Existing passwords, sessions, users, applications, tasks and CVs are not automatically present there. A future export/import requires a separately reviewed plan, including Auth UUID mapping, password resets and copying private CV objects; do not apply legacy SQLite migrations to PostgreSQL.

Connector contracts remain unused library scaffolding. No portal feature imports them, and no Sites capability or connector binding is impersonated. Supabase database, Auth and Storage access use their own real server integrations.

Tests execute PostgreSQL migrations and RLS locally through PGlite. Auth/provider and Storage network behavior are isolated test doubles; they do not prove live credentials, hosted Auth settings or network access. Complete the isolated project acceptance checks before cutover.

References: [Supabase Next.js SSR integration](https://supabase.com/docs/guides/auth/server-side/creating-a-client?framework=nextjs), [Supabase connection options](https://supabase.com/docs/guides/database/connecting-to-postgres), [Vercel function limits](https://vercel.com/docs/functions/limitations).
