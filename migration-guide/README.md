# RemoteWorkNest — VS Code source export

Exported 5 November 2026 (Asia/Karachi). Source is published version 10, commit `f0f798517e876e5dd4e383d8d6bc6f7bc12d16ff`.
This is a source snapshot, not a database backup. Creating this archive did not edit, push, or redeploy the live website.

## Open in VS Code (Windows / macOS / Linux)

1. Extract the ZIP and open the **RemoteWorkNest** folder in VS Code: File → Open Folder.
    2. Install Node.js 22.13 or newer and open Terminal → New Terminal.
3. Use the pinned package manager and locked dependencies:

```sh
corepack enable
corepack pnpm install --frozen-lockfile
corepack pnpm run build
```

If Corepack is unavailable, install the package manager version specified in `package.json` (`pnpm@11.25.0`) and use `pnpm` in place of `corepack pnpm`. Do not use the old README's `install:ci` shortcut for this export; use the lockfile command above.

4. Initialize a NEW local database, once, after building:

```sh
corepack pnpm exec wrangler d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file migration-guide/schema-fresh.sql
```

This uses local D1 emulation only. Do not add `--remote`. The SQL is for an empty database; it deliberately fails rather than overwriting existing tables. It combines the five original migrations, so do not replay those migrations on the same initialized database.

5. Start local development:

```sh
corepack pnpm run dev
```

Open the printed localhost URL (normally http://localhost:5173). Stop with Ctrl+C. No cloud publishing command is part of these steps.

## Local dashboard access

See [authentication setup](../AUTHENTICATION.md). ChatGPT and mock sign-in have been removed. After initializing the original schema above, apply `drizzle/0005_password_auth.sql` exactly once. Existing records remain intact.

## Included architecture

| Location | Purpose |
| --- | --- |
| `app/page.tsx`, `app/website.tsx`, `app/experience.tsx` | Public frontend and application UI |
| `app/about/`, `app/services/`, `app/apply/`, `app/faq/`, `app/how-it-works/` | Public page routes |
| `app/dashboard/` | Admin and employee portals, reports, tasks, logins and resources |
| `app/api/apply/route.ts` | Application intake and CV upload |
| `app/api/portal/route.ts` | Members, admin task/recruitment operations and reports data |
| `app/api/resume/route.ts` | Protected CV download |
| `app/api/workspace/route.ts` | Employee workspace, requests, resources and task submission |
| `db/schema.ts`, `db/index.ts` | Drizzle schema and D1 database access |
| `drizzle/` | All five original migrations and schema snapshots |
| `lib/` | Authorization, permissions, task forms, reports and upload helpers |
| `lib/session.ts`, `app/api/auth/route.ts` | Email/password sessions and account setup |
| `worker/index.ts` | Cloudflare Worker backend entry point |
| `components/`, `hooks/`, `vendor/`, `public/` | UI, utilities, licenses and assets |
| `package.json`, `pnpm-lock.yaml`, `pnpm-workspace.yaml` | Exact dependency declarations and lockfile |
| `vite.config.ts`, `next.config.ts`, `tsconfig.json`, `postcss.config.mjs` | Framework, build, TypeScript and CSS configuration |
| `.openai/hosting.json` | Existing Site identity and DB/BUCKET binding names; no secret |
| `scripts/`, `tests/` | Framework tooling and regression checks |
| `migration-guide/` | These instructions, complete file inventory, config examples and fresh database SQL |

The frontend uses React 19 and TypeScript with Tailwind/CSS. The app runs through Vinext/Vite with a Cloudflare Workers backend; it is not a plain static HTML site or a conventional Express server. D1 is SQLite-compatible storage accessed through Drizzle. R2 holds uploaded CV files. The source includes existing content verbatim, including past text edits.

## Configuration and secrets

AUTH_ORIGIN and AUTH_SETUP_TOKEN must be configured; see ../AUTHENTICATION.md. `.dev.vars.example` includes AUTH_ORIGIN and an empty AUTH_SETUP_TOKEN placeholder. The original binding names are DB and BUCKET. `wrangler.external.example.jsonc` is a configuration shape for a future separate Cloudflare deployment and is NOT automatically loaded by this project's Vite configuration. Do not copy real credentials into source control or frontend variables.

The original source's owner email and opaque Site project ID are configuration identifiers, not passwords; they are retained for fidelity. `.git`, credentials, local environment files, node_modules, build output, runtime caches, local database state and uploaded CVs are excluded.

## Independent hosting: work still required

Opening and editing source in VS Code is supported by this ZIP. Independent hosting needs additional integration work:

- **Authentication:** current production identity comes from the Sites gateway and its reserved sign-in/sign-out/callback routes. Outside Sites, implement a supported identity provider with server-verified sessions and update `app/chatgpt-auth.ts`, `lib/portal-auth.ts` and related handlers. Do not trust visitor-supplied `oai-authenticated-user-*` headers. Existing employee login entries do not contain passwords.
- **Database:** provision a new D1 DB or port the Drizzle adapter to another database. Apply migrations once to the new database. Export/import live records separately if desired; no production database data is included here.
- **CV storage:** provision private R2 storage or port the bucket calls to another file store. Copy existing CV objects separately and preserve database resume-key mappings. No CVs are included.
- **Runtime/build:** preserve or adapt the Worker entry point and generated bindings. Ordinary static hosting or PHP shared hosting will not run these API routes. The example Wrangler file alone is not a complete standalone deployment conversion.
- **User mapping:** Sites user IDs are site-specific. Rebind identities securely for your new provider, including linked employee IDs and historical ownership references.
- **Cutover:** validate login, permissions, uploads and database access before changing DNS. No cutover was performed for this export.

## Checks

The published source passed TypeScript and report/layout checks during its prior build. For this export the SQL was applied to an empty in-memory SQLite database, the file inventory and hashes were verified, and the ZIP was checked for excluded runtime/credential files. A fresh installation and signed-in end-to-end run on your Windows laptop have not been performed.

Useful existing checks after installing:

```sh
corepack pnpm exec tsc --noEmit
node tests/report-metrics.test.mjs
node tests/analytics-layout.test.cjs
node tests/workspace.test.mjs
```

## Direct export

This ZIP is the complete source export supplied for this request: download, extract, and open the folder. The available Sites connector exposes repository source access but no separate one-click source-download operation. I have not verified an Export button in your Sites interface, so these instructions do not assume one exists. The private Sites repository URL is not a public GitHub repository, and short-lived repository credentials are deliberately not included. To use your own GitHub repository later, initialize a new Git repository in the extracted folder and push it using your own credentials after reviewing the files. That does not automatically connect it to the existing live Site.
