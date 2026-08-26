# Subcontractor management — design

## Purpose

Build the sixth real CRUD feature on the ERD-derived schema, and the last remaining Master Data entity: `Subcontractors` records which external `Company` is subcontracted under a given `Contract`, for a defined date range. `Activity`, `ApprovalWorkflow`, `MaterialHandlingJob`, and `Timesheet` all reference `subcontractor_id`.

## Non-goals

- No filtering of the Company dropdown by `company.internal` — same convention as every prior feature's status-based dropdown filtering (show all rows). `internal` distinguishes Barokah's own entity from external companies, but the form doesn't enforce it; the user is trusted to pick a real subcontractor.
- No filtering of the Contract dropdown by status — same convention as every prior feature.
- No role-based access control — same single permissive RLS policy pattern as every prior feature.
- No hard-delete — deactivate via `active`, built correctly from the start.
- No new uniqueness constraint — nothing in the ERD specifies one (e.g. preventing overlapping date ranges for the same contract+company pair), and there's no obvious natural key on this table.

## Design

### Schema

`timesheet_shorebase.subcontractors` already has `id`, `contract_id`, `company_id`, `start_date`, `end_date` — both FKs already exist. New migration:

```sql
alter table timesheet_shorebase.subcontractors
  alter column contract_id set not null;
alter table timesheet_shorebase.subcontractors
  alter column company_id set not null;
alter table timesheet_shorebase.subcontractors
  alter column start_date set not null;
alter table timesheet_shorebase.subcontractors
  alter column end_date set not null;

alter table timesheet_shorebase.subcontractors
  add column active boolean not null default true;

grant select, insert, update on timesheet_shorebase.subcontractors to authenticated;
alter table timesheet_shorebase.subcontractors enable row level security;
create policy "authenticated users can read/write subcontractors"
  on timesheet_shorebase.subcontractors
  for all
  to authenticated
  using (true)
  with check (true);
```

### `company_id`: an independent, user-selected field — NOT auto-derived

This is the key way `Subcontractors` differs from `ContractService`/`Period`. Those features' `company_id` is a denormalized snapshot that always mirrors the parent `Contract`'s own `company_id` (the client). Here, `company_id` represents the **subcontracted company itself** — a genuinely different company than the contract's client. Confirmed by `company.internal`, which exists specifically to distinguish Barokah's own entity from external companies; a `Subcontractors` row's whole purpose is recording which external company is subcontracted. So `company_id` is a normal required dropdown on the form, chosen independently of Contract, written directly from form input — no server-side derivation helper, unlike every prior feature since `ContractService`.

### Fields

**Required**: Contract (dropdown), Company (dropdown), Start date, End date.
**Not on the form**: none — this is the first feature since `ShorebaseService` with no derived/auto-filled field.

### Navigation

`nav.ts` already has a "Subcontractors" entry at `/subcontractors` in the Master Data group — no nav changes needed, same as `Period`.

### Routes

- `src/app/(app)/subcontractors/page.tsx` — list: Contract (joined `contract_number`), Company (joined `name`), Start date, End date, Status. No natural "title" column exists (unlike every prior feature's code/name) — the Contract+Company pair is the row's identity, both shown as plain text with the Contract cell linking to the edit page. Links to `/subcontractors/new`.
- `src/app/(app)/subcontractors/new/page.tsx` — fetches Contract list and Company list for the two dropdowns.
- `src/app/(app)/subcontractors/[id]/edit/page.tsx` — same, plus Deactivate/Reactivate.
- `src/app/(app)/subcontractors/SubcontractorForm.tsx` — shared form, same `useActionState` pattern as every prior form. No client-side interactivity needed — every field uses plain `defaultValue`.
- `src/app/(app)/subcontractors/actions.ts` — `createSubcontractor`, `updateSubcontractor`, `deactivateSubcontractor`, `reactivateSubcontractor` — same error-checked + zero-rows-affected guard shape already proven five times over. No `lookupCompanyIdForContract`-style helper — `company_id` comes straight from `formData`.

## Testing

No automated tests. Manual verification: create a subcontractor record, confirm Contract and Company are both independently selectable and both are saved correctly (verify via `psql` that `company_id` does NOT match `contract.company_id` when a different company is deliberately chosen, proving it's independent — not a snapshot); edit it; deactivate it and confirm dates stay untouched; reactivate and confirm the same.
