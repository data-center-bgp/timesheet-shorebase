-- Adds required-field constraints matching SummaryTimesheet's form (all
-- six columns are required - a summary timesheet is a concrete
-- generated document, not a broad template like ApprovalWorkflow), plus
-- the active-column convention (see CLAUDE.md).

begin;

alter table timesheet_shorebase.summary_timesheet
  alter column period_id set not null;
alter table timesheet_shorebase.summary_timesheet
  alter column type_code set not null;
alter table timesheet_shorebase.summary_timesheet
  alter column contract_id set not null;
alter table timesheet_shorebase.summary_timesheet
  alter column company_id set not null;
alter table timesheet_shorebase.summary_timesheet
  alter column code set not null;
alter table timesheet_shorebase.summary_timesheet
  alter column issue_date set not null;
alter table timesheet_shorebase.summary_timesheet
  add column active boolean not null default true;
grant select, insert, update on timesheet_shorebase.summary_timesheet to authenticated;
alter table timesheet_shorebase.summary_timesheet enable row level security;
create policy "authenticated users can read/write summary timesheets"
  on timesheet_shorebase.summary_timesheet for all to authenticated using (true) with check (true);

commit;
