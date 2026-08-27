# Job Title, Job Position & User management — design

## Purpose

Build the tenth real CRUD area on the ERD-derived schema, replacing the single "Positions & Users" nav placeholder with three separate features: **Job Titles** (a simple lookup), **Job Positions** (a self-referential org chart), and **Users** (a minimal edit-only view onto `app_user`, the table `auth.users` signups already populate via trigger). `UserPosition` (assigning a user to a position) and `UserSignature` (file-upload-dependent) are explicitly deferred to a later pass — see Non-goals.

## Non-goals

- No `UserPosition` management — deferred to a follow-up feature once Job Title/Job Position exist to assign against.
- No `UserSignature` management — deferred until file storage (Supabase Storage or otherwise) is actually decided for this app; this would be the first file-upload feature and shouldn't be designed as a side effect of this pass.
- No `app_user` creation — accounts are created exclusively by the `handle_new_auth_user` trigger on Supabase Auth signup (see `CLAUDE.md`). This feature only adds an edit view.
- No `app_user` deactivate/reactivate — disabling a user account has real auth/access implications (should it also revoke Supabase Auth login? that's a separate decision) that are out of scope for "let someone fix an empty name field." `start_date`/`end_date` also stay off the form for the same reason — deferred.
- No deep cycle prevention on `job_position.parent_position_id` — only direct self-reference is prevented (a position can't be its own parent), enforced by excluding the position being edited from its own "Parent Position" dropdown. Multi-level cycles (A→B→A) are not guarded against; not worth the complexity for what's expected to be a small org chart.
- No filtering of dropdowns by status — same convention as every prior feature.
- No role-based access control beyond the existing single permissive RLS policy pattern.

## Design

### Nav: three new items replace one placeholder

`nav.ts`'s People group currently has one entry, `{ label: 'Positions & Users', icon: Network, href: '/positions-users' }`. This is replaced with three:

```ts
{ label: 'Job Titles', icon: Tag, href: '/job-titles' },
{ label: 'Job Positions', icon: Network, href: '/job-positions' },
{ label: 'Users', icon: UserCog, href: '/users' },
```

in that order (Job Titles before Job Positions, matching the dependency direction — a Job Position references a Job Title). `Network` is reused from the old entry (fits an org chart). `Tag` and `UserCog` are new imports.

### Job Title

The simplest of the three — same shape as `ShorebaseService`/`StaffType`-adjacent master data: `code`, `name`, `start_date`, `end_date`, plus the standard `active` column (no status field in the ERD, same "add it anyway" precedent as `Subcontractors`/`PersonAccomodation`/`PersonMeal`). `code` gets a unique constraint, matching `ShorebaseService.code`'s precedent (a real business identifier).

Migration:

```sql
alter table timesheet_shorebase.job_title
  alter column code set not null;
alter table timesheet_shorebase.job_title
  alter column name set not null;
alter table timesheet_shorebase.job_title
  alter column start_date set not null;
alter table timesheet_shorebase.job_title
  alter column end_date set not null;

alter table timesheet_shorebase.job_title
  add constraint uq_job_title_code unique (code);

alter table timesheet_shorebase.job_title
  add column active boolean not null default true;

grant select, insert, update on timesheet_shorebase.job_title to authenticated;
alter table timesheet_shorebase.job_title enable row level security;
create policy "authenticated users can read/write job titles"
  on timesheet_shorebase.job_title
  for all
  to authenticated
  using (true)
  with check (true);
```

Routes: `/job-titles`, `/job-titles/new`, `/job-titles/[id]/edit` — full CRUD (list, create, edit, deactivate/reactivate), same shape as every entity since `ContractService`.

### Job Position

An org-chart entity: `company_id`, `job_title_id`, `parent_position_id` (self-FK, nullable — top-level positions have no parent), `name`, `start_date`, `end_date`, plus `active`.

Migration:

```sql
alter table timesheet_shorebase.job_position
  alter column company_id set not null;
alter table timesheet_shorebase.job_position
  alter column job_title_id set not null;
alter table timesheet_shorebase.job_position
  alter column name set not null;
alter table timesheet_shorebase.job_position
  alter column start_date set not null;
alter table timesheet_shorebase.job_position
  alter column end_date set not null;

alter table timesheet_shorebase.job_position
  add column active boolean not null default true;

grant select, insert, update on timesheet_shorebase.job_position to authenticated;
alter table timesheet_shorebase.job_position enable row level security;
create policy "authenticated users can read/write job positions"
  on timesheet_shorebase.job_position
  for all
  to authenticated
  using (true)
  with check (true);
```

`parent_position_id` stays nullable and is NOT required — represents a top-level position with no parent. It's an optional dropdown ("No parent (top-level position)" as the empty option), independently selected — not derived from anything.

**Self-reference guard**: on the edit page, the current position's own `id` is excluded from the "Parent Position" dropdown's option list, so a position can never directly select itself as its own parent. This is a plain client-visible filter on the fetched options list, not a DB constraint — see Non-goals for why deeper cycle prevention isn't attempted.

Routes: `/job-positions`, `/job-positions/new`, `/job-positions/[id]/edit` — full CRUD, same shape.

### Users (app_user, edit-only)

`app_user` already exists and is populated exclusively by `handle_new_auth_user` (the trigger fires on every Supabase Auth signup, inserting `id`/`email`/`name` — `name` comes from `raw_user_meta_data ->> 'name'`, which can legitimately be `null` if the signup flow didn't supply one; both real rows today have `name = null`). Because of this, **no `not null` constraint is added to `name` or `username`** — a stricter DB constraint would risk breaking future signups the trigger performs. Instead, the edit form treats Name as a required *form* field (client + server validation only), which naturally backfills real values the next time someone edits a row, without touching the trigger's insert path.

`app_user` currently has **zero grants and RLS disabled** — this is the same "gap discovered before it breaks something" pattern as the `sum_calc_type`/`staff_type`/`room_type`/`meal_time` fixes, caught proactively this time by checking before writing this spec. `app_role` (the Role dropdown's source) also has zero grants — fixed in the same migration.

Migration:

```sql
grant select, update on timesheet_shorebase.app_user to authenticated;
alter table timesheet_shorebase.app_user enable row level security;
create policy "authenticated users can read/write app users"
  on timesheet_shorebase.app_user
  for all
  to authenticated
  using (true)
  with check (true);

grant select on timesheet_shorebase.app_role to authenticated;
```

Note: only `select`/`update` are granted — no `insert`, since this feature never creates `app_user` rows (see Non-goals). The RLS policy is still written as `for all` (matching every other feature's single-policy convention) even though only `select`/`update` are grant-enabled in practice — the table grant is what actually restricts `insert`, not the policy.

Fields on the edit form: **Name** (required text), **Username** (optional text), **Role** (dropdown from `app_role`, required — every row already has a non-null `role_code` with a default, so this one can be required immediately). `email`/`start_date`/`end_date` are NOT on the form — `email` is set by the trigger from the real auth identity and shouldn't be user-editable here; `start_date`/`end_date` are deferred with the rest of the lifecycle question (see Non-goals).

Routes: `/users` (list: Name, Email, Role, linking to edit — no "Add user" button, since creation isn't supported here), `/users/[id]/edit` (no deactivate/reactivate button). No `/users/new` route at all.

## Testing

No automated tests. Manual verification per entity: Job Title — create/edit/deactivate/reactivate cycle, confirm unique code constraint triggers a clear error on a duplicate. Job Position — create a top-level position (no parent) and a child position (parent = the first one), confirm the parent dropdown excludes a position from selecting itself when editing that same position. Users — edit one of the two real existing rows' Name, confirm it persists and shows on `/users`; confirm no create route exists and no deactivate button appears.
