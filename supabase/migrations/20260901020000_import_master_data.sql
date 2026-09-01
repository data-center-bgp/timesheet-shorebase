-- Imports real business master data from the company's existing staging
-- system (staging-shorebase.barokahmarineconsulting.com), covering
-- Company, Contract, Sub Contractor, Equipment, Jetty & Ship, Product,
-- Room Type, Meal Time, and Contract Service. This is real, permanent
-- business data - no cleanup migration follows.
--
-- All FK lookups resolve by name/code via subqueries rather than
-- hardcoded ids, since migrations here are applied by hand and row ids
-- aren't guaranteed to match across environments.

begin;

-- Company (8 real companies)
insert into timesheet_shorebase.company (name, internal) values
  ('PT. PERTAMINA HULU MAHAKAM', false),
  ('PT. ELNUSA TBK', true),
  ('PT. DOWELL ANADRILL SCHLUMBERGER', false),
  ('PT MI INDONESIA', false),
  ('PT. SCHLUMBERGER GEOPHYSICS NUSANTARA', false),
  ('PT. CAKRAWALA SUMBER ABADI', false),
  ('PT. ARMADA SAMUDRA GLOBAL', true),
  ('PT. BAROKAH GEMILANG PERKASA', true);

-- Contract (1 real contract, under Pertamina)
insert into timesheet_shorebase.contract (company_id, contract_number, contract_name, start_date, end_date)
select id, '4710010269',
  'Jasa Penyedia Pangkalan Logistik (Shorebase) Untuk Drilling Fluid & Cementing Area Swamp',
  '2026-03-01', '2029-02-28'
from timesheet_shorebase.company where name = 'PT. PERTAMINA HULU MAHAKAM';

-- Subcontractors (3 real subcontractors, all under the one contract above)
insert into timesheet_shorebase.subcontractors (contract_id, company_id, start_date, end_date)
select c.id, co.id, '2026-03-01', '2029-02-28'
from timesheet_shorebase.contract c
join timesheet_shorebase.company co on co.name = 'PT MI INDONESIA'
where c.contract_number = '4710010269';

insert into timesheet_shorebase.subcontractors (contract_id, company_id, start_date, end_date)
select c.id, co.id, '2026-03-01', '2029-02-28'
from timesheet_shorebase.contract c
join timesheet_shorebase.company co on co.name = 'PT. DOWELL ANADRILL SCHLUMBERGER'
where c.contract_number = '4710010269';

insert into timesheet_shorebase.subcontractors (contract_id, company_id, start_date, end_date)
select c.id, co.id, '2026-03-01', '2029-02-28'
from timesheet_shorebase.contract c
join timesheet_shorebase.company co on co.name = 'PT. ELNUSA TBK'
where c.contract_number = '4710010269';

-- Equipment (6 real items, genuinely unique codes)
insert into timesheet_shorebase.equipment (code, name) values
  ('FD30NT', 'Mitsubishi Forklift 3 Ton'),
  ('FD50NT', 'Mitsubishi Forklift 5 Ton'),
  ('CAT50NT', 'Caterpillar Forklift 5 Ton'),
  ('50H51-90', 'Telehandler Unidieci 5 Ton'),
  ('SCC28000A', 'Crawler Crane Sany SCC28000A'),
  ('SCC600A', 'Crawler Crane Sany SCC600A');

-- Jetty & Ship (7 real vessels; type is a shared vessel-type classification)
insert into timesheet_shorebase.jetty_ship (type, name) values
  ('TK', 'SEA HAVEN 4'),
  ('LCT', 'LCT. HEYDAR 8017'),
  ('AHTS', 'AHTS. SETIA AMAN 9'),
  ('MT', 'MT. GRACE V'),
  ('TONGKANG', 'TK. KLP-01'),
  ('SPOB', 'TAMEDA 5'),
  ('MT', 'KM YU NO 3');

-- Product (1 real product)
insert into timesheet_shorebase.product (name) values ('SAK');

-- Room Type (2 real rows; codes preserved exactly as the source system uses them)
insert into timesheet_shorebase.room_type (code, name) values
  ('1', 'Kamar A (Single)'),
  ('2', 'Kamar B (Double)');

-- Meal Time (4 real rows; source has no separate code column, name doubles as code)
insert into timesheet_shorebase.meal_time (code, name) values
  ('PAGI', 'PAGI'),
  ('SIANG', 'SIANG'),
  ('MALAM', 'MALAM'),
  ('SUPPER', 'SUPPER');

-- Contract Service (18 real rows, all under the one Contract/Company above).
-- Only the two Jetty-related rows (2.1, 2.2) belong to the "Jetty"
-- Contract Service Group (already created for real via the app's own UI).
insert into timesheet_shorebase.contract_service
  (contract_id, company_id, service_id, code, uom_code, summary_calculation_type, start_date, end_date, timesheet_site_code, timesheet_group_id)
select
  c.id, c.company_id, ss.id, v.cs_code, v.uom_code, v.sum_calc, '2026-03-01', '2029-02-28', v.site_code, tg.id
from (values
  ('1.1', '1.1', 'M2',  'AVG', 'TS-SHB',   null::text),
  ('1.2', '1.2', 'LOT', 'AVG', 'TS-SHB',   null),
  ('1.3', '1.3', 'M2',  'AVG', 'TS-SHB',   null),
  ('1.4', '1.4', 'M2',  'AVG', 'TS-SHB',   null),
  ('1.5', '1.5', 'M2',  'AVG', 'TS-SHB',   null),
  ('1.6', '1.6', 'M2',  'AVG', 'TS-SHB',   null),
  ('2.1', '2.1', 'JAM', 'SUM', 'TS-JETTY', 'Jetty'),
  ('2.2', '2.2', 'JAM', 'SUM', 'TS-JETTY', 'Jetty'),
  ('2.3', '2.3', 'TON', 'SUM', 'TS-SHB',   null),
  ('2.4', '2.4', 'TON', 'SUM', 'TS-SHB',   null),
  ('2.5', '2.5', 'M3',  'SUM', 'TS-SHB',   null),
  ('2.6', '2.6', 'M3',  'SUM', 'TS-SHB',   null),
  ('2.7', '2.7', 'TON', 'SUM', 'TS-SHB',   null),
  ('2.8', '2.8', 'TON', 'SUM', 'TS-SHB',   null),
  ('3.1', '3.1', 'LOT', 'AVG', 'TS-SHB',   null),
  ('3.2', '3.2', 'KHR', 'SUM', 'TS-SHB',   null),
  ('3.3', '3.3', 'KHR', 'SUM', 'TS-SHB',   null),
  ('3.4', '3.4', 'AMT', 'SUM', 'TS-SHB',   null)
) as v(cs_code, service_code, uom_code, sum_calc, site_code, group_name)
join timesheet_shorebase.contract c on c.contract_number = '4710010269'
join timesheet_shorebase.shorebase_service ss on ss.code = v.service_code
left join timesheet_shorebase.contract_service_timesheet_group tg on tg.name = v.group_name;

commit;
