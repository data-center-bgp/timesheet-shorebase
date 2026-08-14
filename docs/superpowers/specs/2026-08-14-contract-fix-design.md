# Contract fix: missing name field + deactivate no longer touches end_date — design

## Purpose

Correct two problems in the already-built Contract management feature, both surfaced by comparing it against the real legacy production system (`staging-shorebase.barokahmarineconsulting.com`), which this whole ERD-derived rebuild is meant to replace:

1. **Missing field.** The legacy Contract form has both a "Nama Kontrak" (contract name/title) and a "Nomor Kontrak" (contract number) as two separate required fields. Our schema — inherited from the original ERD — only ever had `contract_number`. The name field was never modeled at all.
2. **Deactivate corrupts real data.** The legacy system has no deactivate concept for Contract at all: Start Date and End Date are both required, real business dates entered once (e.g. a contract running 2026–2029), and removal is a hard Delete. Our built feature's "Deactivate" button overwrites `end_date` with today and "Reactivate" clears it to `null` — silently destroying whatever real end date was there. This is the exact risk our own final review flagged as a product decision to revisit once real evidence existed; it now does.

## Non-goals

- Not touching Company's own `end_date`/deactivate pattern in this pass — same underlying issue exists there, but it's a separate, later decision.
- Not adding the "Lokasi" (Location) lookup table discovered during the comparison — unrelated finding, tracked separately.
- Not building ShorebaseService here.
- Not switching to hard Delete (the legacy system's actual model) — deliberately keeping a soft-delete concept per the project owner's choice, just no longer backed by `end_date`.

## Design

### Schema

New migration on `timesheet_shorebase.contract`:

```sql
begin;

-- The only existing row is a throwaway test contract created during Contract
-- management's own Task 4 verification (blank dates, placeholder number) -
-- nothing real depends on it, so it's removed rather than backfilled with
-- invented data.
delete from timesheet_shorebase.contract where contract_number = 'CONTRACT-2026-001';

alter table timesheet_shorebase.contract
  add column contract_name varchar(255) not null;

alter table timesheet_shorebase.contract
  add column active boolean not null default true;

alter table timesheet_shorebase.contract
  alter column start_date set not null;

alter table timesheet_shorebase.contract
  alter column end_date set not null;

commit;
```

`active` (no `is_` prefix) matches this schema's existing boolean-naming convention (`company.internal`, `invoice_status.locked`).

### Form changes

`ContractForm.tsx` reorders fields to match the legacy layout — Company → Contract Name → Contract Number → Start Date → End Date — with Contract Name and both dates now `required`, validated server-side in `createContract`/`updateContract` the same way `contract_number` already is (trim, reject if empty).

### Deactivate/Reactivate

`deactivateContract`/`reactivateContract` stop touching `end_date` entirely and instead flip the new `active` column (`update({ active: false })` / `update({ active: true })`), keeping the existing error-check + zero-rows-affected guard pattern unchanged.

Since status is now a real manual flag rather than something derived from a date, the list page's status badge relabels from "Active"/"Expired" to **"Active"/"Inactive"** — matching Company's own wording, since "Expired" implied a date-driven state that no longer applies. Both the list page and the edit page read `contract.active` directly; neither calls `isActiveByEndDate` anymore. That helper is untouched and stays in `src/lib/date.ts` for Company's continued use.

### Data flow

Unchanged from the existing Contract feature (list/create/edit all still Server Component + Server Action, same RLS policy, same company dropdown) — only the fields present on the form and the meaning of the status toggle change.

## Testing

No automated tests, consistent with the rest of the project. Manual verification: create a contract with a name, number, and both dates (all required — confirm the form blocks submission if any is missing); confirm the list shows the name-bearing row correctly; deactivate it and confirm status shows "Inactive" while End Date is untouched (still whatever real date was entered); reactivate and confirm it returns to "Active" with the same End Date still intact throughout.
