-- Clear the leftover test rows created while manually verifying Material
-- Handling's Job/Item/Equipment create/edit/deactivate/reactivate flows.
-- Deleted in FK-safe order: the Item and Equipment rows first (both
-- reference the Job via job_id), then the Job row, then the
-- contract_service/shorebase_service dependency chain the Job task
-- agent had to create from scratch (contract_service and subcontractors
-- had zero rows before this feature), then the standalone test product
-- and equipment rows. The pre-existing, reused subcontractor/company
-- rows (id 2 each) are left untouched, matching the reuse precedent from
-- prior features' cleanup migrations.

begin;

delete from timesheet_shorebase.material_handling_item where id = 1;
delete from timesheet_shorebase.material_handling_equipment where id = 1;
delete from timesheet_shorebase.material_handling_job where name = 'Test MH Job One';
delete from timesheet_shorebase.contract_service where code = 'MHTEST-CS';
delete from timesheet_shorebase.shorebase_service where code = 'MHTEST';
delete from timesheet_shorebase.product where name = 'Test MH Product One';
delete from timesheet_shorebase.equipment where name in ('Test Forklift MH', 'Test Crane MH');

commit;
