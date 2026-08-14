# Company fix: deactivate no longer touches end_date — design

## Purpose

Fix the same problem in Company management that was just fixed in Contract management: `deactivateCompany`/`reactivateCompany` currently overwrite `end_date` (set to today / cleared to null) instead of using a dedicated status flag. Now that the Contract fix has proven the remedy, apply the identical pattern to Company.

## Non-goals

- Not making `start_date`/`end_date` required or changing their presence on the form — unlike Contract, the legacy production system's Company form has no date fields at all (just Nama + Internal), so there's no evidence pushing toward requiring them here. They stay exactly as they are today: optional, editable directly on the form.
- Not relabeling the status badge — Company already uses "Active"/"Inactive" (Contract needed to change from "Expired" to match this; Company already matches).
- Not touching `contract_number`/`company_id` nullability on Contract (separate, deliberately deferred decision from the Contract fix).

## Design

### Schema

New migration on `timesheet_shorebase.company`:

```sql
alter table timesheet_shorebase.company
  add column active boolean not null default true;
```

Same naming convention as Contract's `active` column (no `is_` prefix, matches `company.internal`/`invoice_status.locked`).

### Actions

`deactivateCompany`/`reactivateCompany` in `src/app/(app)/companies/actions.ts` stop touching `end_date` and instead flip `active` (`update({ active: false })` / `update({ active: true })`), keeping the existing error-check + zero-rows-affected guard shape unchanged. The now-unused `import { todayLocal } from '@/lib/date';` is removed from this file.

### List & edit pages

Both `src/app/(app)/companies/page.tsx` and `src/app/(app)/companies/[id]/edit/page.tsx` add `active` to their query's `select`, remove their `isActiveByEndDate` import, and read `company.active` directly instead of computing it from `end_date`. Labels stay "Active"/"Inactive" — no wording change needed. `isActiveByEndDate` itself stays untouched in `src/lib/date.ts` — nothing else calls it after this fix, but it isn't being deleted (it's a small, harmless, potentially-useful pure function, and removing it isn't necessary to fix the bug).

## Testing

No automated tests. Manual verification: deactivate an existing company, confirm status shows "Inactive" while start_date/end_date are completely unchanged; reactivate and confirm it returns to "Active" with the same dates still intact throughout — the same regression test that proved the Contract fix.
