-- The one existing company row ("NewCorp Inc Ltd", id 2) still carries
-- end_date = 2026-08-12 - residue from the OLD deactivateCompany, which
-- used to stamp end_date to mean "deactivated" before this fix introduced
-- the real `active` column. Now that `active` is the source of truth,
-- this leftover date is confusing (the row shows Active with a past End
-- date). No other rows exist in this table besides this one.

begin;

update timesheet_shorebase.company
  set end_date = null
  where id = 2 and end_date = '2026-08-12';

commit;
