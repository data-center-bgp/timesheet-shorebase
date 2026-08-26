-- PersonAccomodation's create/edit forms and list page read the room_type
-- lookup table (Room Type dropdown/embed). Like sum_calc_type and
-- staff_type before it, room_type never received a SELECT grant to
-- authenticated in any prior migration. No RLS enable needed: room_type
-- has row level security disabled, same as uom/staff_type.

begin;

grant select on timesheet_shorebase.room_type to authenticated;

commit;
