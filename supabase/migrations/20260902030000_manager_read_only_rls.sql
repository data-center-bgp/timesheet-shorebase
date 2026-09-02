-- The 'manager' role should be view-only across the whole app. Every
-- business table except app_user currently has a single permissive
-- "for all using (true) with check (true)" policy for `authenticated` -
-- the same shape that let any authenticated user write to app_user
-- directly via PostgREST before the 2026-09-02 lockdown. Gating only the
-- Next.js layer would repeat that mistake for a different role, so this
-- splits every affected table's policy into a SELECT-for-everyone policy
-- plus INSERT/UPDATE/DELETE policies that block 'manager' specifically.
--
-- Generated via a loop over the table list rather than hand-written once
-- per table (4 policies x 25 tables = 100 statements) - less surface area
-- for a copy-paste mistake across that many near-identical repetitions.

begin;

create or replace function timesheet_shorebase.is_manager()
returns boolean
language sql
stable
security definer
set search_path = timesheet_shorebase, public
as $$
  select coalesce(
    (select role_code = 'manager' from timesheet_shorebase.app_user where id = auth.uid()),
    false
  );
$$;

do $$
declare
  t text;
  tables text[] := array[
    'activity', 'approval', 'approval_workflow', 'approval_workflow_stage',
    'company', 'contract', 'contract_service',
    'contract_service_timesheet_group', 'equipment', 'jetty_ship',
    'job_position', 'job_title', 'material_handling_equipment',
    'material_handling_item', 'material_handling_job', 'period', 'person',
    'person_accomodation', 'person_meal', 'product', 'shorebase_service',
    'subcontractors', 'summary_timesheet', 'timesheet', 'user_position'
  ];
begin
  foreach t in array tables loop
    -- Drop whatever the existing permissive policy is named (varies per
    -- table - e.g. "authenticated users can read/write companies" vs
    -- "...jetty ships" vs "...material handling equipment") by looking it
    -- up rather than guessing the exact string.
    execute (
      select string_agg(format('drop policy %I on timesheet_shorebase.%I;', policyname, t), ' ')
      from pg_policies
      where schemaname = 'timesheet_shorebase' and tablename = t
    );

    execute format(
      'create policy %I on timesheet_shorebase.%I for select to authenticated using (true);',
      t || '_select_all', t
    );
    execute format(
      'create policy %I on timesheet_shorebase.%I for insert to authenticated with check (not timesheet_shorebase.is_manager());',
      t || '_insert_non_manager', t
    );
    execute format(
      'create policy %I on timesheet_shorebase.%I for update to authenticated using (not timesheet_shorebase.is_manager()) with check (not timesheet_shorebase.is_manager());',
      t || '_update_non_manager', t
    );
    execute format(
      'create policy %I on timesheet_shorebase.%I for delete to authenticated using (not timesheet_shorebase.is_manager());',
      t || '_delete_non_manager', t
    );
  end loop;
end $$;

commit;
