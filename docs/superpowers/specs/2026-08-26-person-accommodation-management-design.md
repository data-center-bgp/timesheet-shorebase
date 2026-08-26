# PersonAccomodation management — design

## Purpose

Build the eighth real CRUD feature on the ERD-derived schema: `PersonAccomodation` records a Person's accommodation assignment (room type, count, date range) billed against a specific `ContractService`. This is the first feature to exercise the denormalized-snapshot pattern `CLAUDE.md` already documents as precedent — `company_id`/`staff_type_code` here duplicate the values from the selected `Person`, the same way `ContractService`/`Period` duplicate `company_id` from the selected `Contract`.

Display label: **"Accommodation"** (matching `nav.ts`'s existing entry and the correct spelling), even though the table/columns keep the ERD's `accomodation` spelling throughout.

## Non-goals

- No filtering of the Person/ContractService/Room Type dropdowns by status — same convention as every prior feature.
- No role-based access control — same single permissive RLS policy pattern as every prior feature.
- No hard-delete — deactivate via `active`, built correctly from the start, even though this table reads more like a line-item record than an ongoing entity (confirmed with the project owner).
- No new uniqueness constraint — nothing in the ERD specifies one (e.g. preventing overlapping date ranges for the same person).

## Design

### Schema

`timesheet_shorebase.person_accomodation` already has `id`, `person_id`, `room_type_code`, `company_id`, `staff_type_code`, `contract_service_id`, `count`, `start_date`, `end_date` — all FKs already exist. New migration:

```sql
alter table timesheet_shorebase.person_accomodation
  alter column person_id set not null;
alter table timesheet_shorebase.person_accomodation
  alter column room_type_code set not null;
alter table timesheet_shorebase.person_accomodation
  alter column contract_service_id set not null;
alter table timesheet_shorebase.person_accomodation
  alter column count set not null;
alter table timesheet_shorebase.person_accomodation
  alter column start_date set not null;
alter table timesheet_shorebase.person_accomodation
  alter column end_date set not null;

alter table timesheet_shorebase.person_accomodation
  add column active boolean not null default true;

grant select, insert, update on timesheet_shorebase.person_accomodation to authenticated;
alter table timesheet_shorebase.person_accomodation enable row level security;
create policy "authenticated users can read/write person accomodations"
  on timesheet_shorebase.person_accomodation
  for all
  to authenticated
  using (true)
  with check (true);
```

`company_id`/`staff_type_code` stay nullable — the app populates both, never the user (see below).

### `company_id`/`staff_type_code`: auto-derived from Person, never shown on the form

Confirmed by `CLAUDE.md`'s existing precedent note: both fields are a denormalized snapshot of the selected `Person`'s own `company_id`/`staff_type_code`. Both `createPersonAccomodation` and `updatePersonAccomodation` look up the selected `person_id`'s current `company_id`/`staff_type_code` server-side (one helper, one query, since both values come from the same `Person` row) and write both into the row — so they always mirror whichever person the row currently points to, with no independent user choice possible. This is the same mechanism as `ContractService`'s `lookupCompanyIdForContract`, extended to return two fields instead of one since they share a single source row.

### Fields

**Required**: Person (dropdown), Contract Service (dropdown), Room Type (dropdown), Count (number), Start date, End date.
**Not on the form**: Company, Staff Type (both auto-derived), Active (its own Deactivate/Reactivate button).

### Navigation

`nav.ts` already has an "Accommodation" entry at `/accommodation` in the People group — no nav changes needed, same as `Period`/`Subcontractors`/`Person`.

### Routes

- `src/app/(app)/accommodation/page.tsx` — list: Person (joined `name`), Contract Service (joined `code`), Room Type (joined `name`), Count, Start date, End date, Status. Links to edit each row and to `/accommodation/new`. Note the route uses the correct "accommodation" spelling even though every underlying table/column reference is `person_accomodation`.
- `src/app/(app)/accommodation/new/page.tsx` — fetches Person list, ContractService list, and Room Type list for the three dropdowns.
- `src/app/(app)/accommodation/[id]/edit/page.tsx` — same, plus Deactivate/Reactivate.
- `src/app/(app)/accommodation/PersonAccomodationForm.tsx` — shared form, same `useActionState` pattern as every prior form. No client-side interactivity needed — every field uses plain `defaultValue`.
- `src/app/(app)/accommodation/actions.ts` — `createPersonAccomodation`, `updatePersonAccomodation` (both deriving `company_id`/`staff_type_code` server-side from the selected person), `deactivatePersonAccomodation`, `reactivatePersonAccomodation` — same error-checked + zero-rows-affected guard shape already proven six times over.

## Testing

No automated tests. Manual verification: since both `person` and `contract_service` currently have 0 rows, seed one of each first. Create an accommodation record, confirm `company_id`/`staff_type_code` correctly mirror the selected person's own values (verify via `psql`, since neither is shown in the UI); edit it; deactivate it and confirm dates/count/company_id/staff_type_code stay untouched; reactivate and confirm the same.
