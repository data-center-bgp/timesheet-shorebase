-- Clear the leftover test rows created while manually verifying
-- JobTitle's create/edit/deactivate/reactivate flow and JobPosition's
-- create/edit/deactivate/reactivate flow, including the self-referential
-- parent-position exclusion logic. Deleted child position before parent
-- (FK-safe order). Deliberately does NOT touch app_user - the real
-- account cga.barokahperkasagroup@gmail.com had its name permanently
-- set to "CGA Barokah" during this feature's live verification; that is
-- real data, not test data, and must be left as-is.

begin;

delete from timesheet_shorebase.job_position where name = 'Test Child Position';
delete from timesheet_shorebase.job_position where name = 'Test Top Position Edited';
delete from timesheet_shorebase.job_title where code = 'JT-TEST';

commit;
