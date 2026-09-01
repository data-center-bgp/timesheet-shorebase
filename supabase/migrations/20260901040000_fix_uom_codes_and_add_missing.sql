-- Corrects 4 UoM codes to match the real codes used by the company's
-- staging system (found by actually opening its UoM master data page,
-- rather than inferring UoM coverage from the Service list alone):
-- LOT -> Lot, JAM -> Jam, KHR -> Kamar/hari, AMT -> Au. These 4 codes
-- were guessed early in this session before real data was available,
-- and are now referenced by the 18 real Contract Service/Service rows
-- already imported - renamed via insert-repoint-delete so the FK
-- references never point at a missing code mid-transaction. Also adds
-- the 6 real UoM entries the source has that we were missing entirely:
-- Unit/hari, M (Meter), Ea, DRUM, CAN, SAK.

begin;

-- Lot -> Lot
insert into timesheet_shorebase.uom (code, name) values ('Lot', 'Lot');
update timesheet_shorebase.shorebase_service set default_uom_code = 'Lot' where default_uom_code = 'LOT';
update timesheet_shorebase.contract_service set uom_code = 'Lot' where uom_code = 'LOT';
delete from timesheet_shorebase.uom where code = 'LOT';

-- JAM -> Jam
insert into timesheet_shorebase.uom (code, name) values ('Jam', 'Jam');
update timesheet_shorebase.shorebase_service set default_uom_code = 'Jam' where default_uom_code = 'JAM';
update timesheet_shorebase.contract_service set uom_code = 'Jam' where uom_code = 'JAM';
delete from timesheet_shorebase.uom where code = 'JAM';

-- KHR -> Kamar/hari
insert into timesheet_shorebase.uom (code, name) values ('Kamar/hari', 'Kamar/hari');
update timesheet_shorebase.shorebase_service set default_uom_code = 'Kamar/hari' where default_uom_code = 'KHR';
update timesheet_shorebase.contract_service set uom_code = 'Kamar/hari' where uom_code = 'KHR';
delete from timesheet_shorebase.uom where code = 'KHR';

-- AMT -> Au
insert into timesheet_shorebase.uom (code, name) values ('Au', 'Amount');
update timesheet_shorebase.shorebase_service set default_uom_code = 'Au' where default_uom_code = 'AMT';
update timesheet_shorebase.contract_service set uom_code = 'Au' where uom_code = 'AMT';
delete from timesheet_shorebase.uom where code = 'AMT';

-- 6 real UoM entries we were missing entirely
insert into timesheet_shorebase.uom (code, name) values
  ('Unit/hari', 'Unit/hari'),
  ('M', 'Meter'),
  ('Ea', 'Ea'),
  ('DRUM', 'Drum'),
  ('CAN', 'Can'),
  ('SAK', 'SAK');

commit;
