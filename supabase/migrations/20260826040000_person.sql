-- Adds Person's schema requirements: required-field constraints matching
-- the fields this feature's form treats as mandatory, is_active
-- defaulting to true (the only field Deactivate/Reactivate touches), and
-- created_at defaulting to now() and set once at insert time. ended_at
-- stays nullable - it's an independent, optional business fact exposed on
-- the form, never written by the deactivate/reactivate action.

begin;

alter table timesheet_shorebase.person
  alter column name set not null;
alter table timesheet_shorebase.person
  alter column company_id set not null;
alter table timesheet_shorebase.person
  alter column staff_type_code set not null;
alter table timesheet_shorebase.person
  alter column is_active set default true;
alter table timesheet_shorebase.person
  alter column is_active set not null;
alter table timesheet_shorebase.person
  alter column created_at set default now();
alter table timesheet_shorebase.person
  alter column created_at set not null;

grant select, insert, update on timesheet_shorebase.person to authenticated;

alter table timesheet_shorebase.person enable row level security;

create policy "authenticated users can read/write persons"
  on timesheet_shorebase.person
  for all
  to authenticated
  using (true)
  with check (true);

commit;
