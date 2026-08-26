-- Confirmed with the project owner: Service Code is a real business
-- identifier (matches the legacy system's Kode field) and should be
-- unique. Nothing in the app writes duplicates today, but nothing
-- enforced it at the database level either.

begin;

alter table timesheet_shorebase.shorebase_service
  add constraint uq_shorebase_service_code unique (code);

commit;
