-- Adds required-field constraints matching Timesheet's form, plus the
-- active-column convention (see CLAUDE.md). company_id/service_id/uom_code
-- stay nullable at the DB level even though they're always populated in
-- practice - they're written by the server action's derivation helper,
-- never independently required by a form field, so a DB-level NOT NULL
-- here would be redundant with (and could drift from) that derivation
-- logic. timesheet_group_id/invoice_component_id/created_at are left
-- fully alone - all three are deferred (see design spec's Non-goals):
-- their dependency tables have zero rows and no CRUD built yet, or (for
-- created_at) no precedent for wiring it exists anywhere in this codebase.

begin;

alter table timesheet_shorebase.timesheet
  alter column period_id set not null;
alter table timesheet_shorebase.timesheet
  alter column type_code set not null;
alter table timesheet_shorebase.timesheet
  alter column contract_service_id set not null;
alter table timesheet_shorebase.timesheet
  alter column timesheet_date set not null;
alter table timesheet_shorebase.timesheet
  alter column code set not null;
alter table timesheet_shorebase.timesheet
  alter column total_amount set not null;
alter table timesheet_shorebase.timesheet
  add column active boolean not null default true;
grant select, insert, update on timesheet_shorebase.timesheet to authenticated;
alter table timesheet_shorebase.timesheet enable row level security;
create policy "authenticated users can read/write timesheets"
  on timesheet_shorebase.timesheet for all to authenticated using (true) with check (true);

commit;
