-- Clear the leftover test rows created while manually verifying
-- Equipment/Jetty-Ship/Product's create/edit/deactivate/reactivate flow
-- and the unique-name constraint on each.

begin;

delete from timesheet_shorebase.equipment where name = 'Test Excavator Edited';
delete from timesheet_shorebase.jetty_ship where name = 'Test Ship One Edited';
delete from timesheet_shorebase.product where name = 'Test Product One Edited';

commit;
