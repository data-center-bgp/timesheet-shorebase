-- Removes the throwaway test service ("SVC001") created during this
-- feature's own Task 3-5 verification and the final-review deactivate/
-- reactivate regression check - nothing real depends on it.

begin;

delete from timesheet_shorebase.shorebase_service where code = 'SVC001';

commit;
