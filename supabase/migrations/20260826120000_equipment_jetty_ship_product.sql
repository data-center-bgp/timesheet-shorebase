-- Adds required/unique name and the active-column convention (see
-- CLAUDE.md) for equipment, jetty_ship, and product - three trivially
-- simple reference tables (name only) that will later be dropdown
-- sources for MaterialHandlingEquipment/Timesheet/Activity respectively.

begin;

alter table timesheet_shorebase.equipment alter column name set not null;
alter table timesheet_shorebase.equipment add constraint uq_equipment_name unique (name);
alter table timesheet_shorebase.equipment add column active boolean not null default true;
grant select, insert, update on timesheet_shorebase.equipment to authenticated;
alter table timesheet_shorebase.equipment enable row level security;
create policy "authenticated users can read/write equipment"
  on timesheet_shorebase.equipment for all to authenticated using (true) with check (true);

alter table timesheet_shorebase.jetty_ship alter column name set not null;
alter table timesheet_shorebase.jetty_ship add constraint uq_jetty_ship_name unique (name);
alter table timesheet_shorebase.jetty_ship add column active boolean not null default true;
grant select, insert, update on timesheet_shorebase.jetty_ship to authenticated;
alter table timesheet_shorebase.jetty_ship enable row level security;
create policy "authenticated users can read/write jetty ships"
  on timesheet_shorebase.jetty_ship for all to authenticated using (true) with check (true);

alter table timesheet_shorebase.product alter column name set not null;
alter table timesheet_shorebase.product add constraint uq_product_name unique (name);
alter table timesheet_shorebase.product add column active boolean not null default true;
grant select, insert, update on timesheet_shorebase.product to authenticated;
alter table timesheet_shorebase.product enable row level security;
create policy "authenticated users can read/write products"
  on timesheet_shorebase.product for all to authenticated using (true) with check (true);

commit;
