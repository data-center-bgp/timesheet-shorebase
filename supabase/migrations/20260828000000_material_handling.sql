-- Adds required-field constraints matching each of the three Material
-- Handling tables' forms, plus the active-column convention (see
-- CLAUDE.md) for all three. Job's job_start/job_finish stay optional (a
-- job can be scheduled before it starts/finishes); Item's unit_size
-- stays optional (not always applicable). Checked via psql before
-- writing this migration: none of the three tables had any grants to
-- authenticated yet, and their dropdown sources (equipment, product,
-- subcontractors, uom, contract_service) already do from prior features.

begin;

alter table timesheet_shorebase.material_handling_job
  alter column contract_service_id set not null;
alter table timesheet_shorebase.material_handling_job
  alter column sub_contractor_id set not null;
alter table timesheet_shorebase.material_handling_job
  alter column name set not null;
alter table timesheet_shorebase.material_handling_job
  alter column job_date set not null;
alter table timesheet_shorebase.material_handling_job
  add column active boolean not null default true;
grant select, insert, update on timesheet_shorebase.material_handling_job to authenticated;
alter table timesheet_shorebase.material_handling_job enable row level security;
create policy "authenticated users can read/write material handling jobs"
  on timesheet_shorebase.material_handling_job for all to authenticated using (true) with check (true);

alter table timesheet_shorebase.material_handling_item
  alter column job_id set not null;
alter table timesheet_shorebase.material_handling_item
  alter column product_id set not null;
alter table timesheet_shorebase.material_handling_item
  alter column quantity set not null;
alter table timesheet_shorebase.material_handling_item
  alter column uom set not null;
alter table timesheet_shorebase.material_handling_item
  add column active boolean not null default true;
grant select, insert, update on timesheet_shorebase.material_handling_item to authenticated;
alter table timesheet_shorebase.material_handling_item enable row level security;
create policy "authenticated users can read/write material handling items"
  on timesheet_shorebase.material_handling_item for all to authenticated using (true) with check (true);

alter table timesheet_shorebase.material_handling_equipment
  alter column job_id set not null;
alter table timesheet_shorebase.material_handling_equipment
  alter column equipment_id set not null;
alter table timesheet_shorebase.material_handling_equipment
  add column active boolean not null default true;
grant select, insert, update on timesheet_shorebase.material_handling_equipment to authenticated;
alter table timesheet_shorebase.material_handling_equipment enable row level security;
create policy "authenticated users can read/write material handling equipment"
  on timesheet_shorebase.material_handling_equipment for all to authenticated using (true) with check (true);

commit;
