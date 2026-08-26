-- Person's create/edit forms read the staff_type lookup table to
-- populate the Staff Type dropdown (src/app/(app)/persons/new/page.tsx),
-- same as shorebase_service reads uom/service_type. Task 1's person
-- migration (20260826040000_person.sql) only granted on person itself
-- and missed this dependency - staff_type had ZERO grants until this
-- migration, exactly the gap the shorebase_service migration's comment
-- called out for uom. No RLS enable needed: staff_type has row level
-- security disabled, same as uom.

begin;

grant select on timesheet_shorebase.staff_type to authenticated;

commit;
