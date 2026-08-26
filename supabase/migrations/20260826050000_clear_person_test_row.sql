-- Clear the leftover test row created while manually verifying Person's
-- create/edit/deactivate/reactivate flow and the ended_at datetime-local
-- round-trip fix (person.name = 'Test Person One Edited').

begin;

delete from timesheet_shorebase.person where name = 'Test Person One Edited';

commit;
