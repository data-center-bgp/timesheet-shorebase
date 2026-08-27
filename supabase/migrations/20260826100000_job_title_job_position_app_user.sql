-- Adds required-field constraints, active columns, and grants/RLS for
-- job_title and job_position (same convention as every prior feature),
-- plus fixes app_user/app_role's grants up front - both currently have
-- zero grants to authenticated (app_user also has RLS disabled), the
-- same class of gap caught proactively for meal_time in the previous
-- feature after having to fix it as a follow-up three times before that.
--
-- app_user gets NO not-null constraint on name/username: the
-- handle_new_auth_user trigger (see the init migration) inserts name
-- from auth signup metadata, which can legitimately be null - a
-- stricter constraint here would risk breaking future signups. Only
-- select/update are granted, no insert - this feature never creates
-- app_user rows, those come exclusively from the auth trigger.

begin;

alter table timesheet_shorebase.job_title
  alter column code set not null;
alter table timesheet_shorebase.job_title
  alter column name set not null;
alter table timesheet_shorebase.job_title
  alter column start_date set not null;
alter table timesheet_shorebase.job_title
  alter column end_date set not null;

alter table timesheet_shorebase.job_title
  add constraint uq_job_title_code unique (code);

alter table timesheet_shorebase.job_title
  add column active boolean not null default true;

grant select, insert, update on timesheet_shorebase.job_title to authenticated;
alter table timesheet_shorebase.job_title enable row level security;
create policy "authenticated users can read/write job titles"
  on timesheet_shorebase.job_title
  for all
  to authenticated
  using (true)
  with check (true);

alter table timesheet_shorebase.job_position
  alter column company_id set not null;
alter table timesheet_shorebase.job_position
  alter column job_title_id set not null;
alter table timesheet_shorebase.job_position
  alter column name set not null;
alter table timesheet_shorebase.job_position
  alter column start_date set not null;
alter table timesheet_shorebase.job_position
  alter column end_date set not null;

alter table timesheet_shorebase.job_position
  add column active boolean not null default true;

grant select, insert, update on timesheet_shorebase.job_position to authenticated;
alter table timesheet_shorebase.job_position enable row level security;
create policy "authenticated users can read/write job positions"
  on timesheet_shorebase.job_position
  for all
  to authenticated
  using (true)
  with check (true);

grant select, update on timesheet_shorebase.app_user to authenticated;
alter table timesheet_shorebase.app_user enable row level security;
create policy "authenticated users can read/write app users"
  on timesheet_shorebase.app_user
  for all
  to authenticated
  using (true)
  with check (true);

grant select on timesheet_shorebase.app_role to authenticated;

commit;
