-- Clear the leftover test rows created while manually verifying
-- UserPosition's create/edit/deactivate/reactivate flow. Deleted in
-- FK-safe order: user_position first, then job_position (which it
-- referenced), then job_title (which job_position referenced). Does NOT
-- touch app_user - both real account rows, including
-- cga.barokahperkasagroup@gmail.com's permanently-set name "CGA
-- Barokah" from an earlier feature, are left completely untouched.

begin;

delete from timesheet_shorebase.user_position where job_position_id in (
  select id from timesheet_shorebase.job_position where name = 'Shorebase Supervisor'
);
delete from timesheet_shorebase.job_position where name = 'Shorebase Supervisor';
delete from timesheet_shorebase.job_title where code = 'SUP01';

commit;
