@AGENTS.md

# Shorebase Timesheet System

Next.js (App Router, TypeScript, Tailwind) app backed by a **self-hosted Supabase** instance (not supabase.com).

## Database

- All app tables live in a dedicated **`timesheet_shorebase` schema**, not `public` — this is a shared self-hosted instance, so the app's tables are kept separate from anything else on it. `auth.users` (Supabase's own) is the one exception, referenced directly from `timesheet_shorebase.app_user`.
- Schema source of truth for design discussions is the drawio ERD at `D:/Copy of Shorebase System Diagram.drawio` (tab "ERD") — a working/annotated copy lives at `D:/Shorebase System Diagram - EDITED.drawio`. The two files are outside this repo (shared with a related project).
- The initial schema migration (`supabase/migrations/20260807000000_init_schema.sql`) was generated directly from that ERD: 43 tables, FK constraints, all names normalized to snake_case. Two ERD relationships were intentionally *not* turned into real FK constraints because they point at non-key columns (`invoice_component.price_per_uom_contract`/`price_per_uom_independent` — see the comment block at the bottom of that migration file) — they look like value snapshots, not real foreign keys.
- `activity.ss_type_code` has no FK — the ERD never resolved what it should reference; left as a plain column pending clarification.
- Nullability/uniqueness beyond primary keys was **not** inferred from the ERD (it didn't specify them) — add `not null`/`unique` constraints as business rules are confirmed, via new migrations rather than editing the initial one.

## Supabase connection

- Client helpers: `src/lib/supabase/client.ts` (browser), `src/lib/supabase/server.ts` (Server Components/Actions, respects RLS), `src/lib/supabase/admin.ts` (service-role, bypasses RLS — server-only, never import from client code). All three pass `db: { schema: 'timesheet_shorebase' }` so queries default to the app's schema instead of `public`.
- Env vars live in `.env.local` (gitignored) — see `.env.local.example` for what's needed and where to find each value in a self-hosted deployment.
- Migrations are plain SQL files under `supabase/migrations/`, written and version-controlled here — but **`npx supabase db push` does not actually work against this instance**. It replays every migration from scratch (there's no record of the initial migration ever being applied via the CLI, since it was first applied by hand), and separately, `postgres`'s grants don't confer table *ownership*, which `ALTER TABLE ADD CONSTRAINT` requires. Every migration so far has been applied by pasting the SQL file's contents directly into Supabase Studio's SQL editor. Do that, then verify with `psql "<DATABASE_URL>"` afterward.
- **Required server-side step, separate from the migration**: PostgREST (the self-hosted instance's REST API layer) only serves schemas it's explicitly told to expose — by default just `public`. Running the migration creates the `timesheet_shorebase` schema and tables in Postgres, but the API won't serve them until `timesheet_shorebase` is added to that instance's exposed-schemas config — typically the `PGRST_DB_SCHEMAS` env var in the server's docker-compose setup, followed by restarting the `rest`/PostgREST container. This is infrastructure the server admin controls, not something this repo's migration can do. `supabase/config.toml` here already lists `timesheet_shorebase`, but that only affects the local Supabase CLI dev stack (`supabase start`), not the remote instance.

## Auth

Decided: **Supabase's built-in Auth (GoTrue)**, no Keycloak. `app_user.id` is a `uuid` that *is* the `auth.users.id` (not a separate surrogate key) — a trigger (`handle_new_auth_user`, bottom of the init migration) auto-inserts an `app_user` row whenever someone signs up via `auth.users`. `src/proxy.ts`, `src/lib/supabase/client.ts`, and `server.ts` already assume this pattern, so no code changes were needed for this decision — only the schema changed (dropped `kc_user_id`, changed the PK type, and the three columns that reference it — `user_position.user_id`, `user_signature.user_id`, `approval.approver_user_id` — from `integer` to `uuid`).

Not yet done: **Row Level Security policies**. No RLS policies exist on any table yet — until they're added, the anon/authenticated roles have no access under Postgres defaults, and only `admin.ts` (service-role) can read/write. Add policies table-by-table as business rules are confirmed, via new migrations.

Known trade-off: `@supabase/ssr`'s browser client stores the session in non-HttpOnly cookies by design (`DEFAULT_COOKIE_OPTIONS` in `node_modules/@supabase/ssr/dist/main/utils/constants.js` sets `httpOnly: false`), because the client-side login flow needs to read them directly. This is an accepted consequence of the chosen "client-side login form" approach (Approach 1 in the design spec, over Approach 3), not a bug — worth knowing before building more auth surface on top.
