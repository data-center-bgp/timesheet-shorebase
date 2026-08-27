# UserPosition management — design

## Purpose

Build the thirteenth real CRUD area on the ERD-derived schema, and the last remaining entity from the original "Positions & Users" cluster: `UserPosition` assigns a real `app_user` to a `JobPosition` over a date range. `Approval` and `ApprovalWorkflowStage` both reference `user_position_id` later.

## Non-goals

- No filtering of the User/Job Position dropdowns by status — same convention as every prior feature.
- No role-based access control — same single permissive RLS policy pattern as every prior feature.
- No hard-delete — deactivate via `active`, same precedent as every table without an ERD status field.
- No new uniqueness constraint (e.g. preventing a user from holding overlapping/duplicate position assignments) — nothing in the ERD specifies one, same "skip unless there's a clear business rule" precedent as `Subcontractors`/`PersonAccomodation`/`PersonMeal`.

## Design

### Schema

`timesheet_shorebase.user_position` already has `id`, `user_id`, `job_position_id`, `start_date`, `end_date` — both FKs already exist. New migration:

```sql
alter table timesheet_shorebase.user_position
  alter column user_id set not null;
alter table timesheet_shorebase.user_position
  alter column job_position_id set not null;
alter table timesheet_shorebase.user_position
  alter column start_date set not null;
alter table timesheet_shorebase.user_position
  alter column end_date set not null;

alter table timesheet_shorebase.user_position
  add column active boolean not null default true;

grant select, insert, update on timesheet_shorebase.user_position to authenticated;
alter table timesheet_shorebase.user_position enable row level security;
create policy "authenticated users can read/write user positions"
  on timesheet_shorebase.user_position
  for all
  to authenticated
  using (true)
  with check (true);
```

### `user_id`/`job_position_id`: both independent required dropdowns

Neither field is derived from anything — same shape as `Subcontractors`' `contract_id`/`company_id`, two genuinely independent FK selections. `user_id` is the app's second UUID-typed FK field (after `Users`' own `id`).

### Fields

**Required**: User (dropdown, showing `app_user.name` — falling back to `email` when `name` is null, since real accounts can still have a null name), Job Position (dropdown), Start date, End date.
**Not on the form**: Active (its own Deactivate/Reactivate button).

### Navigation

None yet — `nav.ts` has no placeholder for this. Joins the **People** group, appended after `Users`: **User Positions** (`/user-positions`).

### Routes

- `src/app/(app)/user-positions/page.tsx` — list: User (joined `name`, falling back to `email`), Job Position (joined `name`), Start date, End date, Status.
- `src/app/(app)/user-positions/new/page.tsx` — fetches User list, Job Position list.
- `src/app/(app)/user-positions/[id]/edit/page.tsx` — same, plus Deactivate/Reactivate.
- `src/app/(app)/user-positions/UserPositionForm.tsx` — shared form, no client-side interactivity, plain `defaultValue` fields.
- `src/app/(app)/user-positions/actions.ts` — `createUserPosition`, `updateUserPosition`, `deactivateUserPosition`, `reactivateUserPosition`.

## Testing

No automated tests. Manual verification: create an assignment (there are 2 real `app_user` rows and `job_position` currently has 0 — seed one via `/job-positions/new` first, which itself needs a Company/Job Title); edit it; deactivate/reactivate, confirm all fields except `active` stay untouched.
