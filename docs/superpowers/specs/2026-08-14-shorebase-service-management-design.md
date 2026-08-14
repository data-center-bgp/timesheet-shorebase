# ShorebaseService management — design

## Purpose

Build the third real CRUD feature on the ERD-derived schema, continuing the workflow in dependency order: `ContractService` (binding a contract to a billable service) needs `ShorebaseService` to exist first. This feature is informed by the real legacy production system's Service form, which has a richer field set than the original ERD modeled — most of it, fortunately, already exists on `timesheet_shorebase.shorebase_service` from the initial ERD-derived migration.

## Non-goals

- No `ShorebaseServicePrice` management. The legacy system folds default pricing directly into the Service record itself (`Harga Default` + a validity date range) rather than a separate time-boxed price history table — this feature matches that. `shorebase_service_price` stays in the schema (for future per-company negotiated pricing) but gets no CRUD UI in this pass.
- No dedicated management UI for `service_type` — it's seeded as a plain lookup table, same as `uom`/`staff_type`/`room_type` have been until now. A generic "Reference Data" management page (already a nav placeholder) is a separate, later effort.
- No role-based access control — same single permissive RLS policy pattern already used for `company`/`contract`.
- No hard-delete — deactivate via the `active` column only.

## Design

### Schema

`timesheet_shorebase.shorebase_service` already has `id`, `code`, `name`, `description`, `default_uom_code` (FK to `uom`), `default_price_per_uom`, `active`, `start_date`, `end_date` — matching the legacy form almost exactly. The only structural gap is the legacy form's "Tipe Service" field.

**New migration:**

```sql
create table if not exists timesheet_shorebase.service_type (
  code varchar(32) primary key,
  name varchar(255) not null
);

insert into timesheet_shorebase.service_type (code, name) values
  ('FAC', 'Facility & Equipment'),
  ('MAR', 'Marine Operations'),
  ('PER', 'Personnel Services')
on conflict (code) do nothing;

alter table timesheet_shorebase.shorebase_service
  add column service_type_code varchar(32);

alter table timesheet_shorebase.shorebase_service
  add constraint fk_shorebase_service_service_type_code
  foreign key (service_type_code) references timesheet_shorebase.service_type (code);

alter table timesheet_shorebase.shorebase_service
  alter column code set not null;
alter table timesheet_shorebase.shorebase_service
  alter column name set not null;
alter table timesheet_shorebase.shorebase_service
  alter column default_uom_code set not null;
alter table timesheet_shorebase.shorebase_service
  alter column default_price_per_uom set not null;
alter table timesheet_shorebase.shorebase_service
  alter column service_type_code set not null;

alter table timesheet_shorebase.shorebase_service
  alter column active set not null;
alter table timesheet_shorebase.shorebase_service
  alter column active set default true;

grant select, insert, update on timesheet_shorebase.shorebase_service to authenticated;
grant select on timesheet_shorebase.service_type to authenticated;
grant select on timesheet_shorebase.uom to authenticated;

alter table timesheet_shorebase.shorebase_service enable row level security;

create policy "authenticated users can read/write shorebase services"
  on timesheet_shorebase.shorebase_service
  for all
  to authenticated
  using (true)
  with check (true);
```

`service_type` category names are placeholders — inferred from the real system's `Kode` prefixes observed earlier (e.g. `1.x`/`2.x`/`3.x` grouping facility, marine-ops, and personnel-type services), same confidence tier as every other lookup table's seed data. `uom` gets its first-ever grant here (it had none until now, which would have made the dropdown fail with a permission error).

**Separately, `uom`'s seed data is replaced** with the real values found on the legacy system, since nothing yet references the placeholder codes:

```sql
delete from timesheet_shorebase.uom;

insert into timesheet_shorebase.uom (code, name) values
  ('TON', 'Ton'),
  ('JAM', 'Jam'),
  ('M3', 'Meter Kubik'),
  ('KHR', 'Kamar/Hari'),
  ('LOT', 'Lot'),
  ('M2', 'Meter Persegi'),
  ('AMT', 'Amount')
on conflict (code) do nothing;
```

### Form changes

Unlike Company and Contract's first pass, Deactivate/Reactivate is built correctly from the start here: it flips the `active` column directly and never touches `start_date`/`end_date`, which stay as real, optional validity-period data on the form (matching the legacy "Waktu awal/akhir berlaku" fields).

**Required fields** (matching the legacy form's asterisked fields): Code, Name, Service Type, UoM, Default price per UoM.
**Optional fields**: Start date, End date, Description.
No "Active" checkbox on the create/edit form — same pattern as Company/Contract: a new service starts active (DB default), and Deactivate/Reactivate lives only as a button on the edit page.

### Routes

- `src/app/(app)/services/page.tsx` — list: Code, Name, Type (joined `service_type.name`), UoM (joined `uom.name`), Default Price, Status (Active/Inactive, from the real `active` column). Links to edit each row and to `/services/new`.
- `src/app/(app)/services/new/page.tsx` — fetches `service_type` and `uom` lists for the two dropdowns.
- `src/app/(app)/services/[id]/edit/page.tsx` — same, plus Deactivate/Reactivate button.
- `src/app/(app)/services/ServiceForm.tsx` — shared form component, same `useActionState` pattern as `CompanyForm`/`ContractForm`.
- `src/app/(app)/services/actions.ts` — `createService`, `updateService`, `deactivateService`, `reactivateService`, same error-checked + zero-rows-affected guard shape already proven for Company/Contract.

### Nav

`src/components/app-shell/nav.ts` already has `href: '/services'` — no change needed.

## Testing

No automated tests. Manual verification: create a service with all required fields (including both dropdowns), confirm it appears in the list with the correct type/UoM names; edit it; deactivate it and confirm status shows Inactive while start/end dates (if set) stay untouched; reactivate and confirm it returns to Active with dates still intact.
