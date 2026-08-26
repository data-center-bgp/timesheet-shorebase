-- Adds PersonAccomodation's schema requirements: required-field
-- constraints matching the fields this feature's form treats as
-- mandatory, and the active-column convention (see CLAUDE.md).
-- company_id and staff_type_code stay nullable - both are derived
-- automatically from the selected person rather than the user setting
-- them, extending the same denormalized-snapshot pattern used by
-- contract_service.company_id, but sourced from Person instead of
-- Contract and covering two fields instead of one.

begin;

alter table timesheet_shorebase.person_accomodation
  alter column person_id set not null;
alter table timesheet_shorebase.person_accomodation
  alter column room_type_code set not null;
alter table timesheet_shorebase.person_accomodation
  alter column contract_service_id set not null;
alter table timesheet_shorebase.person_accomodation
  alter column count set not null;
alter table timesheet_shorebase.person_accomodation
  alter column start_date set not null;
alter table timesheet_shorebase.person_accomodation
  alter column end_date set not null;

alter table timesheet_shorebase.person_accomodation
  add column active boolean not null default true;

grant select, insert, update on timesheet_shorebase.person_accomodation to authenticated;

alter table timesheet_shorebase.person_accomodation enable row level security;

create policy "authenticated users can read/write person accomodations"
  on timesheet_shorebase.person_accomodation
  for all
  to authenticated
  using (true)
  with check (true);

commit;
