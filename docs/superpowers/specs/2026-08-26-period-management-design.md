# Period management — design

## Purpose

Build the fifth real CRUD feature on the ERD-derived schema: `Period` defines a billing/timesheet period (e.g. a month) scoped to a `Contract`. It's the next dependency to unblock, since `Timesheet`, `SummaryTimesheet`, and `Invoice` all reference `period_id` directly — more downstream tables than any prior entity except `ContractService`.

## Non-goals

- No `Timesheet`/`SummaryTimesheet`/`Invoice` management — those are separate, later features that will reference Period once it exists.
- No filtering of the Contract dropdown by status — same convention as every prior feature's Contract/Company dropdowns.
- No role-based access control — same single permissive RLS policy pattern as every prior feature.
- No new uniqueness constraint on `(contract_id, name)` or the date range — nothing in the ERD specifies this and there's no obvious natural key; revisit only if a real duplicate-period incident happens.

## Design

### Schema

`timesheet_shorebase.period` already has `id`, `contract_id`, `company_id`, `name`, `start_date`, `end_date`, `locked` — both FKs (`contract_id`, `company_id`) already exist, `locked` is already `boolean`. New migration:

```sql
alter table timesheet_shorebase.period
  alter column contract_id set not null;
alter table timesheet_shorebase.period
  alter column name set not null;
alter table timesheet_shorebase.period
  alter column start_date set not null;
alter table timesheet_shorebase.period
  alter column end_date set not null;
alter table timesheet_shorebase.period
  alter column locked set not null;
alter table timesheet_shorebase.period
  alter column locked set default false;

grant select, insert, update on timesheet_shorebase.period to authenticated;
alter table timesheet_shorebase.period enable row level security;
create policy "authenticated users can read/write periods"
  on timesheet_shorebase.period
  for all
  to authenticated
  using (true)
  with check (true);
```

`company_id` stays nullable — the app populates it, never the user (see below). No unique constraint is added (see Non-goals).

### `company_id`: auto-derived, never shown on the form

Same pattern as `ContractService`: `company_id` is a denormalized snapshot of the contract's company. It never appears as a form field. Both `createPeriod` and `updatePeriod` reuse the same `lookupCompanyIdForContract`-style helper (re-implemented locally in `periods/actions.ts`, matching `contract-services/actions.ts`'s helper exactly — not imported cross-feature, consistent with how no prior feature shares action helpers across route folders) to look up the selected `contract_id`'s current `company_id` server-side and write that into the row.

### `locked`: workflow lock, not a soft-delete status

`locked` means the period is closed to further timesheet entry/edits once processing starts. This is a genuinely different concept from every prior feature's `active` column — periods aren't soft-deleted, they're locked. No `active` column is added; `locked` is Period's only lifecycle field.

The edit page gets a **Lock / Unlock** button (same visual pattern as every prior feature's Deactivate/Reactivate button, same server-action shape: flip `locked` only, error-checked, zero-rows-affected guard, `revalidatePath` both the list and edit page) instead of a plain form checkbox. `locked` never appears inside `PeriodForm` itself.

### Fields

**Required**: Contract (dropdown), Name (text), Start date, End date.
**Not on the form**: Company (auto-derived), Locked (its own Lock/Unlock button, not a form field).

### Navigation

`nav.ts` already has a "Periods" entry at `/periods` in the Master Data group (added when the nav skeleton was first built, ahead of any real page existing) — no nav changes needed for this feature, unlike `ContractService` which needed a brand-new entry.

### Routes

- `src/app/(app)/periods/page.tsx` — list: Name, Contract (joined `contract_number`), Start date, End date, Locked status. Links to edit each row and to `/periods/new`.
- `src/app/(app)/periods/new/page.tsx` — fetches the Contract list for the one dropdown.
- `src/app/(app)/periods/[id]/edit/page.tsx` — same, plus Lock/Unlock.
- `src/app/(app)/periods/PeriodForm.tsx` — shared form, same `useActionState` pattern as every prior form. No client-side interactivity needed (no auto-fill dependency like ContractService's UoM) — every field uses plain `defaultValue`.
- `src/app/(app)/periods/actions.ts` — `createPeriod`, `updatePeriod` (both deriving `company_id` server-side from the selected contract), `lockPeriod`, `unlockPeriod` — same error-checked + zero-rows-affected guard shape already proven four times over.

## Testing

No automated tests. Manual verification: create a period, confirm `company_id` correctly mirrors the selected contract's company (verify via `psql`, since it's never shown in the UI); edit it; lock it and confirm the button/list state flip; unlock and confirm the same; confirm start/end dates and company_id are untouched by the lock/unlock cycle.
