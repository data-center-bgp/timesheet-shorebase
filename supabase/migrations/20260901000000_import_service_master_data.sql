-- Imports real Service Type and Service master data from the company's
-- existing staging system (staging-shorebase.barokahmarineconsulting.com),
-- Service Master Data > Service Type / Service. Replaces the 3 placeholder
-- service_type rows (Facility & Equipment/Marine Operations/Personnel
-- Services) with the 6 real categories used by that system - confirmed
-- safe since shorebase_service was still empty and nothing referenced the
-- placeholders. This is real business data, not test data - no cleanup
-- migration will follow.

begin;

delete from timesheet_shorebase.service_type where code in ('FAC', 'MAR', 'PER');

insert into timesheet_shorebase.service_type (code, name) values
  ('RENT', 'Facility Rent'),
  ('JETTY', 'Jetty'),
  ('MH', 'Material Handling'),
  ('OSS', 'Other Support Service'),
  ('ACCOM', 'Accomodation'),
  ('MEAL', 'Meal');

insert into timesheet_shorebase.shorebase_service
  (code, name, default_uom_code, default_price_per_uom, service_type_code, active, start_date, end_date)
values
  ('1.1', 'Area untuk LMP Plant', 'M2', 0, 'RENT', true, '2026-03-01', '2029-02-28'),
  ('1.2', 'Area dan Pekerjaan untuk Bulk Cementing Plant', 'LOT', 0, 'RENT', true, '2026-03-01', '2029-02-28'),
  ('1.3', 'Gudang Tertutup', 'M2', 0, 'RENT', true, '2026-03-01', '2029-02-28'),
  ('1.4', 'Shelter beratap dan lantai cor', 'M2', 0, 'RENT', true, '2026-03-01', '2029-02-28'),
  ('1.5', 'Area transit sampah/limbah', 'M2', 0, 'RENT', true, '2026-03-01', '2029-02-28'),
  ('1.6', 'Area Penyimpanan Terbuka (Open Yard)', 'M2', 0, 'RENT', true, '2026-03-01', '2029-02-28'),
  ('2.1', 'Tarif sandar untuk operasional', 'JAM', 0, 'JETTY', true, '2026-03-01', '2029-02-28'),
  ('2.2', 'Tarif sandar untuk standby', 'JAM', 0, 'JETTY', true, '2026-03-01', '2029-02-28'),
  ('2.3', 'Stevedoring', 'TON', 0, 'MH', true, '2026-03-01', '2029-02-28'),
  ('2.4', 'Cargodoring', 'TON', 0, 'MH', true, '2026-03-01', '2029-02-28'),
  ('2.5', 'Transfer Bulk Cargo Via Pipiline', 'M3', 0, 'MH', true, '2026-03-01', '2029-02-28'),
  ('2.6', 'Drill Water', 'M3', 0, 'MH', true, '2026-03-01', '2029-02-28'),
  ('2.7', 'Stacking/Unstacking', 'TON', 0, 'MH', true, '2026-03-01', '2029-02-28'),
  ('2.8', 'Lift On / LIft Off', 'TON', 0, 'MH', true, '2026-03-01', '2029-02-28'),
  ('3.1', 'Gedung dan Sarana Perkantoran', 'LOT', 0, 'OSS', true, '2026-03-01', '2029-02-28'),
  ('3.2', 'Akomodasi untuk Staff', 'KHR', 0, 'ACCOM', true, '2026-03-01', '2029-02-28'),
  ('3.3', 'Akomodasi untuk non Staff', 'KHR', 0, 'ACCOM', true, '2026-03-01', '2029-02-28'),
  ('3.4', 'Tarif makan', 'AMT', 0, 'MEAL', true, '2026-03-01', '2029-02-28');

commit;
