-- Adds Plan Activity's schema requirements: required-field constraints
-- for the fields this feature's form treats as mandatory, a unique
-- constraint on code, and the active-column convention (see CLAUDE.md).
-- status_code/company_id/service_id/uom_code stay nullable - status_code
-- is always written as 'P' by the app (never left to the user), and the
-- other three are derived server-side from the selected contract_service.
-- subcontractor_id/mh_product_id/ss_type_code/plan_activity_id and every
-- actual_* column stay untouched by this feature.
--
-- Also grants select on timesheet_type and activity_status up front -
-- both currently have zero grants to authenticated (checked via psql
-- before writing this migration), the same class of gap that had to be
-- fixed as a follow-up for several tables in prior features.

begin;

alter table timesheet_shorebase.activity
  alter column code set not null;
alter table timesheet_shorebase.activity
  alter column contract_service_id set not null;
alter table timesheet_shorebase.activity
  alter column timesheet_type_code set not null;
alter table timesheet_shorebase.activity
  alter column plan_amount set not null;
alter table timesheet_shorebase.activity
  alter column plan_date set not null;

alter table timesheet_shorebase.activity
  add constraint uq_activity_code unique (code);

alter table timesheet_shorebase.activity
  add column active boolean not null default true;

grant select, insert, update on timesheet_shorebase.activity to authenticated;

alter table timesheet_shorebase.activity enable row level security;

create policy "authenticated users can read/write activities"
  on timesheet_shorebase.activity
  for all
  to authenticated
  using (true)
  with check (true);

grant select on timesheet_shorebase.timesheet_type to authenticated;
grant select on timesheet_shorebase.activity_status to authenticated;

commit;
