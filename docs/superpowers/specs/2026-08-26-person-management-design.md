# Person management — design

## Purpose

Build the seventh real CRUD feature on the ERD-derived schema, and the first entity in the People group: `Person` records an individual (staff or non-staff) belonging to a Company. `PersonAccomodation` and `PersonMeal` both depend on `person_id`, and both already duplicate `company_id`/`staff_type_code` from `Person` (an existing denormalized-snapshot pattern noted in `CLAUDE.md`) — so `Person` is the origin of that chain, not a copy of anything itself.

## Non-goals

- No `PersonAccomodation`/`PersonMeal` management — separate, later features.
- No filtering of the Company/Staff Type dropdowns by status — same convention as every prior feature.
- No role-based access control — same single permissive RLS policy pattern as every prior feature.
- No hard-delete — deactivate via `is_active`, built correctly from the start.
- No new uniqueness constraint on `name` — people can share a name; nothing in the ERD specifies a natural key here.

## Design

### Schema

`timesheet_shorebase.person` already has `id`, `staff_type_code`, `company_id`, `name`, `is_active`, `created_at`, `ended_at` — both FKs already exist. New migration:

```sql
alter table timesheet_shorebase.person
  alter column name set not null;
alter table timesheet_shorebase.person
  alter column company_id set not null;
alter table timesheet_shorebase.person
  alter column staff_type_code set not null;
alter table timesheet_shorebase.person
  alter column is_active set default true;
alter table timesheet_shorebase.person
  alter column is_active set not null;
alter table timesheet_shorebase.person
  alter column created_at set default now();
alter table timesheet_shorebase.person
  alter column created_at set not null;

grant select, insert, update on timesheet_shorebase.person to authenticated;
alter table timesheet_shorebase.person enable row level security;
create policy "authenticated users can read/write persons"
  on timesheet_shorebase.person
  for all
  to authenticated
  using (true)
  with check (true);
```

`ended_at` stays nullable — it's an optional business fact, not a status flag (see below).

### `is_active` vs. `ended_at`: the two-status-fields trap, resolved up front

`person` is the first table in this schema that ships with *both* a status boolean (`is_active`) and a business timestamp (`ended_at`) already present from the ERD — exactly the shape of the bug that shipped twice before (Contract's `end_date`, then Company's `end_date`, both accidentally mutated by a deactivate action). This time it's caught at design time instead of by a live bug:

- `is_active` is the **only** field Deactivate/Reactivate ever touches. `created_at`, `ended_at`, and every other field are untouched by that action, no exceptions.
- `ended_at` is exposed as a genuinely optional, independently-editable field on the create/edit form (a `datetime-local` input) — the user can record when a person's engagement actually ended, entirely separately from toggling `is_active`. Leaving it blank is fine; it's nullable.
- `created_at` is never on the form at all — it's set once by the database default (`now()`) at insert time and never written to by the app afterward.

### Fields

**Required**: Name (text), Company (dropdown), Staff Type (dropdown).
**Optional**: Ended at (datetime-local).
**Not on the form**: `created_at` (DB-managed default), `is_active` (its own Deactivate/Reactivate button, not a form field).

### Navigation

`nav.ts` already has a "Persons" entry at `/persons` in the People group — no nav changes needed, same as `Period`/`Subcontractors`.

### Routes

- `src/app/(app)/persons/page.tsx` — list: Name, Company (joined `name`), Staff Type (joined `name`), Status. Links to edit each row and to `/persons/new`.
- `src/app/(app)/persons/new/page.tsx` — fetches Company list and Staff Type list for the two dropdowns.
- `src/app/(app)/persons/[id]/edit/page.tsx` — same, plus Deactivate/Reactivate.
- `src/app/(app)/persons/PersonForm.tsx` — shared form, same `useActionState` pattern as every prior form. Includes a small local helper to format the fetched `ended_at` ISO timestamp into the `YYYY-MM-DDTHH:mm` shape the `datetime-local` input requires — this codebase's first timestamp (as opposed to plain date) field, so no existing formatting helper to reuse.
- `src/app/(app)/persons/actions.ts` — `createPerson`, `updatePerson` (both writing `company_id`/`staff_type_code` straight from form input, no derivation helper — same as `Subcontractors`), `deactivatePerson`, `reactivatePerson` — same error-checked + zero-rows-affected guard shape already proven six times over, touching only `is_active`.

## Testing

No automated tests. Manual verification: create a person with `ended_at` left blank, confirm it saves as null; edit it, set `ended_at` to a real value, confirm it persists and round-trips correctly through the datetime-local input; deactivate it and confirm `ended_at` and every other field stay untouched; reactivate and confirm the same.
