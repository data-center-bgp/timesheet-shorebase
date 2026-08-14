-- Two fixes found by comparing this feature against the real legacy
-- production system:
-- 1. contract_name ("Nama Kontrak") was missing entirely - the original
--    ERD only ever had contract_number ("Nomor Kontrak").
-- 2. Deactivate/Reactivate was overwriting end_date, which the legacy
--    system treats as required, immutable business data. Adds a separate
--    `active` flag instead, so end_date is never touched by status changes.

begin;

-- The only existing row is a throwaway test contract created during this
-- feature's own Task 4 verification (blank dates, placeholder number) -
-- nothing real depends on it, so it's removed rather than backfilled with
-- invented data.
delete from timesheet_shorebase.contract where contract_number = 'CONTRACT-2026-001';

alter table timesheet_shorebase.contract
  add column contract_name varchar(255) not null;

alter table timesheet_shorebase.contract
  add column active boolean not null default true;

alter table timesheet_shorebase.contract
  alter column start_date set not null;

alter table timesheet_shorebase.contract
  alter column end_date set not null;

commit;
