# Database

The authoritative typed schema is `db/schema.ts`; original migrations are in `drizzle/`. `schema-fresh.sql` combines them for one-time initialization of an empty database. No rows are included.

Tables:

- `activity`
- `applications`
- `employee_requests`
- `members`
- `task_checklist`
- `task_comments`
- `task_drafts`
- `tasks`
- `work_submissions`
- `workspace_resources`

CV file bytes are stored separately in the R2 `BUCKET` binding, with keys/metadata recorded on applications. Constraints match the existing source; do not assume foreign keys not defined there.
