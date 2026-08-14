-- Adds the ShorebaseService feature's schema requirements, found by
-- comparing against the real legacy production system:
-- 1. service_type - the one field the ERD never modeled at all.
-- 2. Required-field constraints matching the legacy form's asterisked
--    fields (code, name, uom, service type, default price were all
--    required there; nothing here has any existing rows to violate them).
-- 3. The active-column convention (see CLAUDE.md) - shorebase_service
--    already had an `active` column from the ERD, just not enforced as
--    not-null-default-true yet.
-- 4. Grants/RLS so the feature can read/write shorebase_service and read
--    its two dropdown lookups - uom had ZERO grants until this migration.
-- 5. Real uom seed data, replacing the generic placeholders - safe, since
--    every table that references uom.code is still empty.

begin;

create table if not exists timesheet_shorebase.service_type (
  code varchar(32) primary key,
  name varchar(255) not null
);

insert into timesheet_shorebase.service_type (code, name) values
  ('FAC', 'Facility & Equipment'),
  ('MAR', 'Marine Operations'),
  ('PER', 'Personnel Services')
on conflict (code) do nothing;

alter table timesheet_shorebase.shorebase_service
  add column if not exists service_type_code varchar(32);

alter table timesheet_shorebase.shorebase_service
  add constraint fk_shorebase_service_service_type_code
  foreign key (service_type_code) references timesheet_shorebase.service_type (code);

alter table timesheet_shorebase.shorebase_service
  alter column code set not null;
alter table timesheet_shorebase.shorebase_service
  alter column name set not null;
alter table timesheet_shorebase.shorebase_service
  alter column default_uom_code set not null;
alter table timesheet_shorebase.shorebase_service
  alter column default_price_per_uom set not null;
alter table timesheet_shorebase.shorebase_service
  alter column service_type_code set not null;

alter table timesheet_shorebase.shorebase_service
  alter column active set default true;
alter table timesheet_shorebase.shorebase_service
  alter column active set not null;

grant select, insert, update on timesheet_shorebase.shorebase_service to authenticated;
grant select on timesheet_shorebase.service_type to authenticated;
grant select on timesheet_shorebase.uom to authenticated;

alter table timesheet_shorebase.shorebase_service enable row level security;

create policy "authenticated users can read/write shorebase services"
  on timesheet_shorebase.shorebase_service
  for all
  to authenticated
  using (true)
  with check (true);

delete from timesheet_shorebase.uom;

insert into timesheet_shorebase.uom (code, name) values
  ('TON', 'Ton'),
  ('JAM', 'Jam'),
  ('M3', 'Meter Kubik'),
  ('KHR', 'Kamar/Hari'),
  ('LOT', 'Lot'),
  ('M2', 'Meter Persegi'),
  ('AMT', 'Amount')
on conflict (code) do nothing;

commit;
