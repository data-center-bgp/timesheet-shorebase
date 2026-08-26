-- Clear the leftover test rows created while manually verifying
-- PersonAccomodation's create/edit/deactivate/reactivate flow and the
-- company_id/staff_type_code derivation from Person. Deleted in FK-safe
-- order: person_accomodation first, then contract_service (which it
-- referenced), then person and shorebase_service (which contract_service
-- referenced alongside the pre-existing contract).

begin;

delete from timesheet_shorebase.person_accomodation where id = 1;
delete from timesheet_shorebase.contract_service where code = 'ACCOM-CS-TEST';
delete from timesheet_shorebase.person where name = 'Test Accommodation Person';
delete from timesheet_shorebase.shorebase_service where code = 'ACCOM-TEST';

commit;
