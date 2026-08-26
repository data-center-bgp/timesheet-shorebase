-- Adds Subcontractors' schema requirements: required-field constraints
-- matching the fields this feature's form treats as mandatory, and the
-- active-column convention (see CLAUDE.md). Unlike contract_service and
-- period, company_id here is NOT auto-derived from the contract - it
-- represents the subcontracted company itself (an independent selection),
-- so it becomes required rather than staying nullable.

begin;

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

commit;
