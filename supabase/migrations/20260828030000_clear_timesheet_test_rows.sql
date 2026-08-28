-- Clear the leftover test rows created while manually verifying
-- Timesheet's create/edit/deactivate/reactivate flow and its
-- company_id/service_id/uom_code derivation from contract_service.
-- Deleted in FK-safe order: the Timesheet row first (references
-- contract_service/jetty_ship/material_handling_job/period), then the
-- Material Handling Job it linked to (references contract_service),
-- then the two contract_service test rows, then the shorebase_service
-- and jetty_ship they depended on, then the test period. The
-- pre-existing, reused subcontractor/company (id 2) are left untouched,
-- matching the reuse precedent from prior features' cleanup migrations.

begin;

delete from timesheet_shorebase.timesheet where code = 'TEST-TS-001';
delete from timesheet_shorebase.material_handling_job where name = 'TEST-MH-Job-1';
delete from timesheet_shorebase.contract_service where code in ('TEST-CS-A', 'TEST-CS-B');
delete from timesheet_shorebase.shorebase_service where code = 'TEST-SVC-001';
delete from timesheet_shorebase.jetty_ship where name = 'TEST-Jetty-1';
delete from timesheet_shorebase.period where name = 'TEST-Period-Aug2026';

commit;
