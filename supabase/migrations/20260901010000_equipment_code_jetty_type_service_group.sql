-- Adds required fields the real staging-system master data needs:
-- equipment.code (genuinely unique per item, e.g. FD30NT/SCC600A), and
-- jetty_ship.type (a vessel-type classification shared across multiple
-- ships, e.g. MT/TK/LCT - NOT a per-ship code, so no unique constraint,
-- confirmed with the project owner after finding two real ships both
-- typed "MT"). Also upgrades contract_service_timesheet_group to the
-- active-column convention (see CLAUDE.md) now that real data exists for
-- it, matching Equipment/JettyShip/Product's original required+unique+
-- active pattern. Finally removes the leftover test fixtures (Company
-- "NewCorp Inc Ltd", Contract "Test Services Contract", its
-- Subcontractor) now that real business data is being imported -
-- confirmed via psql that nothing currently references them.

begin;

alter table timesheet_shorebase.equipment add column code varchar(255);
alter table timesheet_shorebase.jetty_ship add column type varchar(255);

-- (real data is inserted by the following migration before these are
-- made required; safe here only because both tables are currently
-- empty - verified via psql)
alter table timesheet_shorebase.equipment alter column code set not null;
alter table timesheet_shorebase.equipment add constraint uq_equipment_code unique (code);
alter table timesheet_shorebase.jetty_ship alter column type set not null;

alter table timesheet_shorebase.contract_service_timesheet_group
  alter column name set not null;
alter table timesheet_shorebase.contract_service_timesheet_group
  add constraint uq_contract_service_timesheet_group_name unique (name);
alter table timesheet_shorebase.contract_service_timesheet_group
  add column active boolean not null default true;
grant select, insert, update on timesheet_shorebase.contract_service_timesheet_group to authenticated;
alter table timesheet_shorebase.contract_service_timesheet_group enable row level security;
create policy "authenticated users can read/write contract service timesheet groups"
  on timesheet_shorebase.contract_service_timesheet_group for all to authenticated using (true) with check (true);

delete from timesheet_shorebase.subcontractors where id = 2;
delete from timesheet_shorebase.contract where id = 2;
delete from timesheet_shorebase.company where id = 2;

commit;
