-- Seeds the 11 lookup/reference tables that were left empty when the schema
-- was first created. Values fall into three confidence tiers - see CLAUDE.md
-- for which is which. All of this is meant to be edited later; nothing here
-- is load-bearing business logic yet.

begin;

-- Three lookup tables were defined in the ERD with only a `code` column and
-- no `name` - not useful as a human-readable label. Adding `name` to match
-- every other lookup table's shape (uom, staff_type, room_type, etc.).
alter table timesheet_shorebase.activity_status add column if not exists name varchar(255);
alter table timesheet_shorebase.approval_type add column if not exists name varchar(255);
alter table timesheet_shorebase.timesheet_type add column if not exists name varchar(255);

-- ---- Tier 1: explicit in the ERD's own hint text, not a guess ----

insert into timesheet_shorebase.staff_type (code, name) values
  ('S', 'Staff'),
  ('N', 'Non Staff')
on conflict (code) do nothing;

insert into timesheet_shorebase.invoice_type (code, name) values
  ('P', 'Proforma'),
  ('I', 'Invoice')
on conflict (code) do nothing;

insert into timesheet_shorebase.invoice_status (code, name, locked) values
  ('D', 'Draft', false),
  ('F', 'Finalized', true)
on conflict (code) do nothing;

insert into timesheet_shorebase.approval_status (code, name, pass) values
  ('A', 'Approved', true),
  ('R', 'Rejected', false)
on conflict (code) do nothing;

insert into timesheet_shorebase.sum_calc_type (code, name) values
  ('SUM', 'Sum'),
  ('AVG', 'Average')
on conflict (code) do nothing;

-- ---- Tier 2: codes were given in the ERD, names are inferred - confirm later ----

-- Inferred from InvoiceComponent's pricePerUomContract/pricePerUomIndependent
-- and Timesheet's subcontractorId columns.
insert into timesheet_shorebase.timesheet_type (code, name) values
  ('C', 'Contract'),
  ('S', 'Subcontractor'),
  ('I', 'Independent')
on conflict (code) do nothing;

-- Inferred from Approval's four nullable FK columns (timesheetId,
-- summaryTimesheetId, proformaInvoiceId, invoiceId), which map 1:1.
insert into timesheet_shorebase.approval_type (code, name) values
  ('T', 'Timesheet'),
  ('ST', 'Summary Timesheet'),
  ('PIN', 'Proforma Invoice'),
  ('IN', 'Invoice')
on conflict (code) do nothing;

-- Inferred from Activity's paired plan_*/actual_* columns.
insert into timesheet_shorebase.activity_status (code, name) values
  ('P', 'Plan'),
  ('A', 'Actual')
on conflict (code) do nothing;

-- ---- Tier 3: no information in the ERD at all - generic placeholders ----

insert into timesheet_shorebase.uom (code, name) values
  ('PCS', 'Pieces'),
  ('UNIT', 'Unit'),
  ('HR', 'Hour'),
  ('DAY', 'Day'),
  ('KG', 'Kilogram'),
  ('MT', 'Metric Ton')
on conflict (code) do nothing;

insert into timesheet_shorebase.room_type (code, name) values
  ('SGL', 'Single Room'),
  ('DBL', 'Double Room'),
  ('DORM', 'Dormitory')
on conflict (code) do nothing;

insert into timesheet_shorebase.meal_time (code, name) values
  ('BF', 'Breakfast'),
  ('LU', 'Lunch'),
  ('DI', 'Dinner')
on conflict (code) do nothing;

commit;
