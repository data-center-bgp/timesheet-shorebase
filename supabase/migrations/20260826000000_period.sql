-- Adds Period's schema requirements: required-field constraints matching
-- the fields this feature's form treats as mandatory, and locked defaulting
-- to false. company_id stays nullable - the app derives it automatically
-- from the selected contract rather than the user setting it, same pattern
-- as contract_service.company_id. locked is Period's own lifecycle field
-- (a workflow lock, not a soft-delete status) - no active column is added.

begin;

alter table timesheet_shorebase.period
  alter column contract_id set not null;
alter table timesheet_shorebase.period
  alter column name set not null;
alter table timesheet_shorebase.period
  alter column start_date set not null;
alter table timesheet_shorebase.period
  alter column end_date set not null;
alter table timesheet_shorebase.period
  alter column locked set default false;
alter table timesheet_shorebase.period
  alter column locked set not null;

grant select, insert, update on timesheet_shorebase.period to authenticated;

alter table timesheet_shorebase.period enable row level security;

create policy "authenticated users can read/write periods"
  on timesheet_shorebase.period
  for all
  to authenticated
  using (true)
  with check (true);

commit;
