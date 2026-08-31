-- Adds required-field constraints matching each of the three Approval
-- tables' forms, the active-column convention (see CLAUDE.md) for all
-- three, and read grants for approval_status/approval_type - two
-- lookup tables that already hold real seed data (Approved/Rejected;
-- Timesheet/Summary Timesheet/Proforma Invoice/Invoice) but had zero
-- grants to authenticated, checked via psql before writing this
-- migration (same recurring gotcha as sum_calc_type/staff_type/etc in
-- earlier features).

begin;

grant select on timesheet_shorebase.approval_status to authenticated;
grant select on timesheet_shorebase.approval_type to authenticated;

alter table timesheet_shorebase.approval_workflow
  alter column type_code set not null;
alter table timesheet_shorebase.approval_workflow
  alter column start_date set not null;
alter table timesheet_shorebase.approval_workflow
  alter column end_date set not null;
alter table timesheet_shorebase.approval_workflow
  add column active boolean not null default true;
grant select, insert, update on timesheet_shorebase.approval_workflow to authenticated;
alter table timesheet_shorebase.approval_workflow enable row level security;
create policy "authenticated users can read/write approval workflows"
  on timesheet_shorebase.approval_workflow for all to authenticated using (true) with check (true);

alter table timesheet_shorebase.approval_workflow_stage
  alter column workflow_id set not null;
alter table timesheet_shorebase.approval_workflow_stage
  alter column level set not null;
alter table timesheet_shorebase.approval_workflow_stage
  add column active boolean not null default true;
grant select, insert, update on timesheet_shorebase.approval_workflow_stage to authenticated;
alter table timesheet_shorebase.approval_workflow_stage enable row level security;
create policy "authenticated users can read/write approval workflow stages"
  on timesheet_shorebase.approval_workflow_stage for all to authenticated using (true) with check (true);

alter table timesheet_shorebase.approval
  alter column workflow_stage_id set not null;
alter table timesheet_shorebase.approval
  alter column timesheet_id set not null;
alter table timesheet_shorebase.approval
  alter column status_code set not null;
alter table timesheet_shorebase.approval
  alter column type_code set not null;
alter table timesheet_shorebase.approval
  add column active boolean not null default true;
grant select, insert, update on timesheet_shorebase.approval to authenticated;
alter table timesheet_shorebase.approval enable row level security;
create policy "authenticated users can read/write approvals"
  on timesheet_shorebase.approval for all to authenticated using (true) with check (true);

commit;
