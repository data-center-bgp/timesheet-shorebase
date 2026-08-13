# Contract management — design

## Purpose

Build the second real CRUD feature on the ERD-derived schema, continuing the workflow in dependency order: a `Contract` is signed with a client `Company`, so nothing in the "Contract & pricing setup" stage of the workflow (`ContractService`, pricing, `Subcontractors`, `Period`) can be built meaningfully until this exists. This feature follows the exact same shape as Company management, extended with a company-selection dropdown and a joined company name on the list.

## Non-goals

- No role-based access control on `contract` yet — same single permissive RLS policy as `company`, no `role_code` distinction.
- No hard-delete. "Deactivate" is the only removal mechanism, via `end_date`, same as Company.
- No uniqueness enforcement on `contract_number` — required, but duplicates are a business-process concern, not a database constraint, in this first pass.
- No filtering of the company dropdown by status — it lists all companies regardless of Active/Inactive, so a contract can reference a company that's since been deactivated (e.g. historical data) without that company disappearing from the list.
- No automated tests, consistent with the rest of the project.

## Design

### Schema

`timesheet_shorebase.contract` already exists: `id`, `company_id` (FK to `company.id`), `contract_number`, `start_date`, `end_date`. No schema changes beyond the RLS policy below.

**New migration** — same permissive pattern already applied to `company`:

```sql
alter table timesheet_shorebase.contract enable row level security;

create policy "authenticated users can read/write contracts"
  on timesheet_shorebase.contract
  for all
  to authenticated
  using (true)
  with check (true);
```

(Schema-level `usage` was already granted to `authenticated` by the Company migration — only the table-level grants and policy are new here.)

### Shared helper: `isActiveByEndDate`

Company's list and edit pages each independently compute "is this row active" as `end_date` is null or in the future (`end_date > today`, per the boundary-condition fix applied during Company's final review). Contract needs the identical logic. Rather than write a third copy, this feature extracts:

```ts
// src/lib/date.ts
export function isActiveByEndDate(endDate: string | null): boolean {
  if (!endDate) return true;
  return endDate > todayLocal();
}
```

and updates `src/app/(app)/companies/page.tsx` and `src/app/(app)/companies/[id]/edit/page.tsx` to call it instead of their own inline computations. This is a small, targeted refactor of existing code that directly serves this feature (stopping duplication at two copies instead of letting it reach three), not unrelated cleanup.

### Routes

- `src/app/(app)/contracts/page.tsx` — Server Component. Table: Contract Number, Company (joined name via the existing `company_id` FK), Status (Active/Expired, via `isActiveByEndDate`), Start/End Date. Links to edit each row and to `/contracts/new`.
- `src/app/(app)/contracts/new/page.tsx` — thin wrapper; fetches the full company list (`id`, `name`) to populate the dropdown, renders `<ContractForm>` in create mode.
- `src/app/(app)/contracts/[id]/edit/page.tsx` — thin wrapper; fetches the contract row and the full company list, renders `<ContractForm>` in edit mode plus Deactivate/Reactivate buttons (same pattern as Company's edit page).
- `src/app/(app)/contracts/ContractForm.tsx` — Client Component: contract_number (required), company_id (`<select>` populated from the passed-in company list), start date, end date. Submits via `useActionState`, same inline-error pattern as `CompanyForm`.
- `src/app/(app)/contracts/actions.ts` — `createContract`, `updateContract`, `deactivateContract`, `reactivateContract`. Same shapes as Company's equivalents, including the error-checking and zero-rows-affected guard added to Company's deactivate/reactivate during its final review (not the earlier, silent-failure version).

### Nav

`src/components/app-shell/nav.ts` already has `href: '/contracts'` set. Once this route exists, Next.js resolves it there instead of the `[section]` coming-soon catch-all automatically — no nav.ts change needed, same as Company.

### Data flow

1. `/contracts` — Server Component queries `timesheet_shorebase.contract` joined to `company` for the display name, renders the table.
2. Create — `/contracts/new` fetches the company list server-side, passes it to `ContractForm`; submitting calls `createContract`, which inserts a row and redirects to `/contracts`.
3. Edit — `/contracts/[id]/edit` fetches the contract and the company list; submitting calls `updateContract`, which updates the row and redirects to `/contracts`.
4. Deactivate/Reactivate — buttons on the edit page call their Server Action directly (same shape as Company's), revalidating both `/contracts` and the edit page.

### Error handling

Server-side validation (contract_number required, company_id required) surfaced via `useActionState`, same inline-error pattern as `CompanyForm`. The edit page's fetch checks its query `error` explicitly before falling through to `notFound()` (same fix already applied to Company's edit page — not repeating that gap here).

## Testing

No automated tests. Manual verification: create a contract against an existing company, confirm it appears in the list with the correct company name and Active status, edit it, deactivate it and confirm it shows Expired, reactivate it and confirm it shows Active again.
