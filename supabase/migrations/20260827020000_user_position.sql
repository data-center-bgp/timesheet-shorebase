-- Adds UserPosition's schema requirements: required-field constraints
-- matching the fields this feature's form treats as mandatory, and the
-- active-column convention (see CLAUDE.md). user_id and job_position_id
-- are both independent required fields - user_id is the assigned
-- account, job_position_id is the position they're assigned to. No
-- derivation from anywhere.

begin;

alter table timesheet_shorebase.user_position
  alter column user_id set not null;
alter table timesheet_shorebase.user_position
  alter column job_position_id set not null;
alter table timesheet_shorebase.user_position
  alter column start_date set not null;
alter table timesheet_shorebase.user_position
  alter column end_date set not null;

alter table timesheet_shorebase.user_position
  add column active boolean not null default true;

grant select, insert, update on timesheet_shorebase.user_position to authenticated;

alter table timesheet_shorebase.user_position enable row level security;

create policy "authenticated users can read/write user positions"
  on timesheet_shorebase.user_position
  for all
  to authenticated
  using (true)
  with check (true);

commit;
