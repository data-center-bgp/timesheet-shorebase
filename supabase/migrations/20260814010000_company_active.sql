-- Mirrors the Contract fix (20260814000000_contract_name_and_active.sql):
-- deactivateCompany/reactivateCompany currently overwrite end_date instead
-- of using a dedicated status flag. This adds that flag so Task 2 can stop
-- touching end_date. Unlike Contract, start_date/end_date stay nullable
-- here - the legacy system's Company form has no date fields at all, so
-- there's no evidence to require them.

begin;

alter table timesheet_shorebase.company
  add column active boolean not null default true;

commit;
