-- Clear the leftover test row created while manually verifying Period's
-- create/edit/lock/unlock flow in the browser (period.name = 'Task3 Test
-- Period', contract_id 2).

begin;

delete from timesheet_shorebase.period where name = 'Task3 Test Period';

commit;
