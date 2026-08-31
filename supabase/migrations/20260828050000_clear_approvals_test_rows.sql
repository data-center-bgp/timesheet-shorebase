-- Clear the leftover test rows created while manually verifying the
-- Approvals cluster (ApprovalWorkflow/ApprovalWorkflowStage/Approval)
-- and the prerequisite chains built through the live UI to exercise
-- them. Deleted in FK-safe order: Approval first (references the
-- Workflow Stage, the Timesheet, and the User Position), then the
-- Workflow Stage (references the Workflow, Job Position, User
-- Position), then the Workflow itself (references only pre-existing,
-- reused contract/subcontractor/company rows - left untouched), then
-- the User Position (references Job Position; the real user account it
-- linked to is left untouched), then Job Position, then Job Title, then
-- the Timesheet (references Period and Contract Service), then
-- Contract Service, then Shorebase Service, then Period. The
-- pre-existing, reused contract/subcontractor/company (id 2 each) are
-- left untouched, matching the reuse precedent from prior features'
-- cleanup migrations.

begin;

delete from timesheet_shorebase.approval where id = 1;
delete from timesheet_shorebase.approval_workflow_stage where id = 1;
delete from timesheet_shorebase.approval_workflow where id = 1;
delete from timesheet_shorebase.user_position where id = 2;
delete from timesheet_shorebase.job_position where name = 'Test Approver Position';
delete from timesheet_shorebase.job_title where code = 'TEST-JT-01';
delete from timesheet_shorebase.timesheet where code = 'TS-TEST-001';
delete from timesheet_shorebase.contract_service where code = 'CS-TEST';
delete from timesheet_shorebase.shorebase_service where code = 'SVC-TEST';
delete from timesheet_shorebase.period where name = 'Test Period';

commit;
