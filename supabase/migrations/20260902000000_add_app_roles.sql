-- Adds three new app_role rows (Operation, Finance, Customer), alongside
-- the existing master/admin/manager. Same convention as the existing
-- rows: lowercase code, title-case name.

begin;

insert into timesheet_shorebase.app_role (code, name) values
  ('operation', 'Operation'),
  ('finance', 'Finance'),
  ('customer', 'Customer');

commit;
