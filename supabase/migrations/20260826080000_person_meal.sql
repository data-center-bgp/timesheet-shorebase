-- Adds PersonMeal's schema requirements: required-field constraints
-- matching the fields this feature's form treats as mandatory, and the
-- active-column convention (see CLAUDE.md). company_id and
-- staff_type_code stay nullable - both are derived automatically from
-- the selected person, same pattern as person_accomodation. This
-- migration also grants select on meal_time up front - the equivalent
-- gap (a dropdown-source lookup table with zero grants) had to be
-- fixed as a follow-up for sum_calc_type, staff_type, and room_type in
-- three straight prior features; catching it here avoids a fourth.

begin;

alter table timesheet_shorebase.person_meal
  alter column person_id set not null;
alter table timesheet_shorebase.person_meal
  alter column meal_time_code set not null;
alter table timesheet_shorebase.person_meal
  alter column contract_service_id set not null;
alter table timesheet_shorebase.person_meal
  alter column count set not null;
alter table timesheet_shorebase.person_meal
  alter column meal_date set not null;

alter table timesheet_shorebase.person_meal
  add column active boolean not null default true;

grant select, insert, update on timesheet_shorebase.person_meal to authenticated;

alter table timesheet_shorebase.person_meal enable row level security;

create policy "authenticated users can read/write person meals"
  on timesheet_shorebase.person_meal
  for all
  to authenticated
  using (true)
  with check (true);

grant select on timesheet_shorebase.meal_time to authenticated;

commit;
