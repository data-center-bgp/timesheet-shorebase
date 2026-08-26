-- Clear the test rows created while manually verifying ContractService's
-- create/edit/deactivate/reactivate flow and the Service->UoM auto-fill
-- in the browser (contract_service.code = 'CS-TEST-01', a child row, and
-- its parent shorebase_service.code = 'SVC-TEST-01', created solely to
-- have a Service with a default_uom_code to select in that test).

begin;

delete from timesheet_shorebase.contract_service where code = 'CS-TEST-01';
delete from timesheet_shorebase.shorebase_service where code = 'SVC-TEST-01';

commit;
