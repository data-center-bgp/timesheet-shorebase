# ContractService management — design

## Purpose

Build the fourth real CRUD feature on the ERD-derived schema: `ContractService` binds a `Contract` to a specific `ShorebaseService` line item, with its own code, unit of measure, aggregation rule, and validity period. This is the entity most of the operational workflow (`Activity`, `Timesheet`, `MaterialHandlingJob`, `InvoiceComponent`, `PersonAccomodation`, `PersonMeal`) ultimately attaches to, so getting its shape right matters more than the three entities before it.

## Non-goals

- No `ContractServiceTimesheetGroup` management. `contract_service.timesheet_group_id` stays nullable and is omitted from the form entirely — that table has no CRUD feature yet.
- No `ContractServicePrice` management (per-contract-service pricing history) — separate, later feature.
- No filtering of the Contract/Service dropdowns by status — same convention already established for Contract's Company dropdown: show all rows regardless of Active/Inactive.
- No role-based access control — same single permissive RLS policy pattern as every prior feature.
- No hard-delete — deactivate via `active`, built correctly from the start (no repeat of the Contract/Company `end_date`-mutation bug).

## Design

### Schema

`timesheet_shorebase.contract_service` already has `id`, `contract_id`, `service_id`, `company_id`, `code`, `uom_code`, `summary_calculation_type`, `start_date`, `end_date`, `timesheet_site_code`, `timesheet_group_id` — all six FKs already exist. New migration:

```sql
alter table timesheet_shorebase.contract_service
  alter column code set not null;
alter table timesheet_shorebase.contract_service
  alter column contract_id set not null;
alter table timesheet_shorebase.contract_service
  alter column service_id set not null;
alter table timesheet_shorebase.contract_service
  alter column uom_code set not null;
alter table timesheet_shorebase.contract_service
  alter column summary_calculation_type set not null;
alter table timesheet_shorebase.contract_service
  alter column start_date set not null;
alter table timesheet_shorebase.contract_service
  alter column end_date set not null;

alter table timesheet_shorebase.contract_service
  add constraint uq_contract_service_code unique (code);

alter table timesheet_shorebase.contract_service
  add column active boolean not null default true;

grant select, insert, update on timesheet_shorebase.contract_service to authenticated;
alter table timesheet_shorebase.contract_service enable row level security;
create policy "authenticated users can read/write contract services"
  on timesheet_shorebase.contract_service
  for all
  to authenticated
  using (true)
  with check (true);
```

`company_id` and `timesheet_group_id` stay nullable — `company_id` because the app populates it, never the user (see below); `timesheet_group_id` because it's genuinely optional and out of scope.

### `company_id`: auto-derived, never shown on the form

Confirmed: `company_id` is a denormalized snapshot of the contract's company, the same pattern this project already uses for `PersonAccomodation`/`PersonMeal`'s duplicated `company_id`/`staff_type_code`. It never appears as a form field. Both `createContractService` and `updateContractService` look up the selected `contract_id`'s current `company_id` server-side and write that into the row — so it always mirrors whichever contract the row currently points to, with no independent user choice possible.

### Service → UoM auto-fill

`ContractServiceForm` is the first form in this app that needs live client-side interactivity beyond plain field entry: picking a Service should pre-fill the UoM dropdown from that service's `default_uom_code`, while remaining editable afterward. Implementation: the UoM `<select>`'s value becomes local `useState`, initialized from the existing row's `uom_code` on edit (empty on create). An `onChange` handler on the Service `<select>` looks up the newly-selected service's `default_uom_code` from the already-fetched services list (which now needs `default_uom_code` included in its query, not just `code`/`name`) and updates that state. No new dependency — plain React state, consistent with how this codebase already manages the theme toggle and sidebar collapse state.

`summary_calculation_type` gets no auto-fill (a plain required dropdown) since `ShorebaseService` has no default for it.

### Fields

**Required**: Contract (dropdown), Service (dropdown), Code (unique), UoM (dropdown, auto-filled from Service), Summary Calculation Type (dropdown), Start date, End date.
**Optional**: Timesheet site code (plain text).
**Not on the form**: Company (auto-derived), Timesheet Group (deferred, out of scope).

### Navigation

The legacy system treats "Contract Service" as its own top-level menu item, separate from "Contract" — unlike every prior feature, `nav.ts` has no pre-existing placeholder href for this, since the original nav structure only anticipated the base ERD's flatter entity list. This feature adds a new nav item: **"Contract Services"** in the Master Data group, next to "Contracts", routed at `/contract-services`.

### Routes

- `src/app/(app)/contract-services/page.tsx` — list: Code, Contract (joined `contract_number`), Service (joined `name`), UoM, Status. Links to edit each row and to `/contract-services/new`.
- `src/app/(app)/contract-services/new/page.tsx` — fetches Contract list, Service list (including `default_uom_code`), and Summary Calculation Type list for the three dropdowns.
- `src/app/(app)/contract-services/[id]/edit/page.tsx` — same, plus Deactivate/Reactivate.
- `src/app/(app)/contract-services/ContractServiceForm.tsx` — shared form, same `useActionState` pattern as every prior form, extended with the UoM auto-fill state described above.
- `src/app/(app)/contract-services/actions.ts` — `createContractService`, `updateContractService` (both deriving `company_id` server-side from the selected contract), `deactivateContractService`, `reactivateContractService` — same error-checked + zero-rows-affected guard shape already proven three times over.

## Testing

No automated tests. Manual verification: create a contract-service line, confirm the UoM field auto-fills when a service is picked and can still be changed; confirm `company_id` correctly mirrors the selected contract's company (verify via `psql`, since it's never shown in the UI); edit it; deactivate it and confirm dates stay untouched; reactivate and confirm the same.
