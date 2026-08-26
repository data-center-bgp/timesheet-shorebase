# PersonMeal management — design

## Purpose

Build the ninth real CRUD feature on the ERD-derived schema: `PersonMeal` records a Person's meal count for a specific meal time on a given date, billed against a `ContractService`. Structurally near-identical to `PersonAccomodation`, just built moments before it: same `company_id`/`staff_type_code` denormalized-snapshot derivation from `Person`, same active-column decision, swapping `room_type`/date-range for `meal_time`/a single `meal_date`.

## Non-goals

- No filtering of the Person/ContractService/Meal Time dropdowns by status — same convention as every prior feature.
- No role-based access control — same single permissive RLS policy pattern as every prior feature.
- No hard-delete — deactivate via `active`, built correctly from the start. Same precedent as `PersonAccomodation`: this table has no status field in the ERD either, and the same "add `active` + Deactivate/Reactivate" decision applies without needing to re-ask, since the two tables are the same category (Person-linked billing line items).
- No new uniqueness constraint — nothing in the ERD specifies one.

## Design

### Schema

`timesheet_shorebase.person_meal` already has `id`, `person_id`, `meal_time_code`, `company_id`, `staff_type_code`, `contract_service_id`, `count`, `meal_date` — all FKs already exist. New migration:

```sql
alter table timesheet_shorebase.person_meal
  alter column person_id set not null;
alter table timesheet_shorebase.person_meal
  alter column meal_time_code set not null;
alter table timesheet_shorebase.person_meal
  alter column contract_service_id set not null;
alter table timesheet_shorebase.person_meal
  alter column count set not null;
alter table timesheet_shorebase.person_meal
  alter column meal_date set not null;

alter table timesheet_shorebase.person_meal
  add column active boolean not null default true;

grant select, insert, update on timesheet_shorebase.person_meal to authenticated;
alter table timesheet_shorebase.person_meal enable row level security;
create policy "authenticated users can read/write person meals"
  on timesheet_shorebase.person_meal
  for all
  to authenticated
  using (true)
  with check (true);

-- meal_time has zero grants to authenticated (checked upfront this time,
-- after having to fix this as a follow-up for sum_calc_type, staff_type,
-- and room_type in three straight prior features). RLS stays disabled,
-- matching every other plain code/name lookup table (uom, staff_type,
-- room_type, service_type, sum_calc_type).
grant select on timesheet_shorebase.meal_time to authenticated;
```

`company_id`/`staff_type_code` stay nullable — the app populates both, never the user, same as `PersonAccomodation`.

### `company_id`/`staff_type_code`: auto-derived from Person, never shown on the form

Identical mechanism to `PersonAccomodation`'s `lookupCompanyAndStaffTypeForPerson` — reimplemented locally in `person-meals/actions.ts` (no cross-feature action imports, consistent with every prior feature), not shared code. Both `createPersonMeal` and `updatePersonMeal` look up the selected `person_id`'s current `company_id`/`staff_type_code` server-side and write both into the row.

### Fields

**Required**: Person (dropdown), Contract Service (dropdown), Meal Time (dropdown), Count (number), Meal date.
**Not on the form**: Company, Staff Type (both auto-derived), Active (its own Deactivate/Reactivate button).

### Navigation

`nav.ts` already has a "Meals" entry at `/meals` in the People group — no nav changes needed.

### Routes

- `src/app/(app)/meals/page.tsx` — list: Person (joined `name`), Contract Service (joined `code`), Meal Time (joined `name`), Count, Meal date, Status. Links to edit each row and to `/meals/new`.
- `src/app/(app)/meals/new/page.tsx` — fetches Person list, ContractService list, and Meal Time list for the three dropdowns.
- `src/app/(app)/meals/[id]/edit/page.tsx` — same, plus Deactivate/Reactivate.
- `src/app/(app)/meals/PersonMealForm.tsx` — shared form, same `useActionState` pattern as every prior form. No client-side interactivity needed — every field uses plain `defaultValue`. One date field (`meal_date`), not a start/end pair.
- `src/app/(app)/meals/actions.ts` — `createPersonMeal`, `updatePersonMeal` (both deriving `company_id`/`staff_type_code` server-side from the selected person), `deactivatePersonMeal`, `reactivatePersonMeal` — same error-checked + zero-rows-affected guard shape already proven eight times over.

## Testing

No automated tests. Manual verification: seed a Person and ContractService if needed (both may already have been cleaned up after `PersonAccomodation`'s verification). Create a meal record, confirm `company_id`/`staff_type_code` correctly mirror the selected person's own values (verify via `psql`); edit it; deactivate it and confirm date/count/company_id/staff_type_code stay untouched; reactivate and confirm the same.
