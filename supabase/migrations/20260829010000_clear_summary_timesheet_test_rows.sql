-- Clear the leftover test rows created while manually verifying Summary
-- Timesheet's create/edit/deactivate/reactivate flow. Deleted in
-- FK-safe order: the Summary Timesheet row first (references both the
-- Period and the Contract below), then the Period, then the Contract.
-- Both the Period and this second Contract were seeded live because
-- neither existed yet at the time of verification. The pre-existing,
-- reused company (id 2) is left untouched.

begin;

delete from timesheet_shorebase.summary_timesheet where code = 'TEST-SUM-001';
delete from timesheet_shorebase.period where name = 'TEST-PERIOD-001';
delete from timesheet_shorebase.contract where contract_name = 'Second Test Contract';

commit;
