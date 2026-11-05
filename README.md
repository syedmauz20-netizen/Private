# RemoteWorkNest

Next.js App Router website and team workspace, deployed on Vercel with Node.js 24. Supabase provides PostgreSQL, Auth and private CV Storage. See [VERCEL.md](VERCEL.md) for deployment settings and [SUPABASE.md](SUPABASE.md) for database, authentication and storage setup.

## Development and verification

Use Node.js 24 and pnpm 10.34.9 (the packageManager field pins this version). Enable Corepack if your Node installation supplies it, or install pnpm using its official installation instructions.

```sh
pnpm install --frozen-lockfile
# Copy .env.example to .env.local and supply your own development resources.
pnpm dev
pnpm typecheck
pnpm test
pnpm build
pnpm start
```

Public pages and the production build do not require credentials. Login/setup pages, authenticated APIs and uploads require the configured remote resources. Use an isolated Supabase project for development and Vercel Preview environments; previews must not modify production data.

The PostgreSQL schema is in db/schema.ts. Apply the reviewed migrations in supabase/migrations in order to a new Supabase project. The old drizzle/ and migration-guide/ directories are historical SQLite source material and must not be applied to Supabase. No database migration runs during install, build or startup. db:generate writes candidate PostgreSQL SQL to supabase/generated for review; production migrations, constraints and RLS are maintained in supabase/migrations.

Legacy migration-guide documents describe the original source export, not the current deployment target. The original Worker, Vite configuration and Sites-specific scripts were removed. There is no runtime dependency on .openai, local Wrangler state or Sites tooling. Connector contracts remain available as unused library code; no application page or API imports them, and no hosted connector capability is impersonated or replaced with fixture data.
