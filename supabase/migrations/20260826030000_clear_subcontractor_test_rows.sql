-- Clear the test rows created while manually verifying Subcontractor's
-- create/edit/deactivate/reactivate flow in the browser, and specifically
-- proving company_id is independent of the parent contract's own company
-- (subcontractors.company_id = 3 vs contract.company_id = 2). The second
-- company ('SUB-TEST Company') was created solely to have a genuinely
-- different company available to select.

begin;

delete from timesheet_shorebase.subcontractors where contract_id = 2 and company_id = 3;
delete from timesheet_shorebase.company where name = 'SUB-TEST Company';

commit;
