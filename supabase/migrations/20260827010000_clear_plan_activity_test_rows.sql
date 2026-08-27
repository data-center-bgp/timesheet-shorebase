-- Clear the leftover test rows created while manually verifying Plan
-- Activity's create/edit/deactivate/reactivate flow and the
-- company_id/service_id/uom_code derivation from Contract Service.
-- Deleted in FK-safe order: activity first, then contract_service (which
-- it referenced), then shorebase_service (which contract_service
-- referenced). The pre-existing company/contract rows are reused test
-- fixtures from an earlier feature and are left untouched.

begin;

delete from timesheet_shorebase.activity where code = 'PLAN-ACT-TEST-EDITED';
delete from timesheet_shorebase.contract_service where code = 'ACT-CS-TEST';
delete from timesheet_shorebase.shorebase_service where code = 'ACT-TEST';

commit;
