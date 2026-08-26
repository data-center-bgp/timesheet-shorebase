-- Clear the leftover test rows created while manually verifying
-- PersonMeal's create/edit/deactivate/reactivate flow and the
-- company_id/staff_type_code derivation from Person. Deleted in FK-safe
-- order: person_meal first, then contract_service (which it referenced),
-- then person and shorebase_service (which contract_service referenced
-- alongside the pre-existing, reused company/contract rows - those are
-- left untouched, same as PersonAccomodation's equivalent cleanup).

begin;

delete from timesheet_shorebase.person_meal where id = 1;
delete from timesheet_shorebase.contract_service where code = 'MEAL-CS-TEST';
delete from timesheet_shorebase.person where name = 'Test Meal Person';
delete from timesheet_shorebase.shorebase_service where code = 'MEAL-TEST';

commit;
