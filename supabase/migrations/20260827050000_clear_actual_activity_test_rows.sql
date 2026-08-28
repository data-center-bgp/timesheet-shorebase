-- Clear the leftover test rows created while manually verifying Actual
-- Activity's create/edit/deactivate/reactivate flow and the nine-field
-- derivation from its linked Plan Activity. Deleted in FK-safe order:
-- the Actual row (id 5) first since it references the Plan row via
-- plan_activity_id, then the Plan row (code 'ACT-PLAN-TEST'), then
-- contract_service, then shorebase_service. The pre-existing, reused
-- company/contract rows are left untouched.

begin;

delete from timesheet_shorebase.activity where status_code = 'A' and plan_activity_id in (
  select id from timesheet_shorebase.activity where code = 'ACT-PLAN-TEST' and status_code = 'P'
);
delete from timesheet_shorebase.activity where code = 'ACT-PLAN-TEST' and status_code = 'P';
delete from timesheet_shorebase.contract_service where code = 'CS-TEST-01';
delete from timesheet_shorebase.shorebase_service where code = 'SVC-TEST-01';

commit;
