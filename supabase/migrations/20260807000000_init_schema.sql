-- Initial schema generated from the ERD (Shorebase System Diagram.drawio, "ERD" tab)
-- Generated automatically -- review nullability, uniqueness, and cascade rules before relying on this in production.

begin;

create schema if not exists timesheet_shorebase;

create table if not exists timesheet_shorebase.activity (
  id integer generated always as identity primary key,
  status_code varchar(255),
  timesheet_type_code varchar(255),
  contract_service_id integer,
  subcontractor_id integer,
  company_id integer,
  ss_type_code integer,
  service_id integer,
  uom_code varchar(255),
  mh_product_id integer,
  plan_activity_id integer,
  code varchar(255),
  plan_amount double precision,
  plan_date date,
  plan_remark varchar(1023),
  plan_description varchar(255),
  actual_amount double precision,
  actual_remark varchar(1023),
  actual_description varchar(255)
);

create table if not exists timesheet_shorebase.activity_status (
  code varchar(255) primary key
);

create table if not exists timesheet_shorebase.app_user (
  id uuid primary key references auth.users (id) on delete cascade,
  name varchar(255),
  username varchar(255),
  email varchar(255),
  start_date date,
  end_date date
);

create table if not exists timesheet_shorebase.approval (
  id integer generated always as identity primary key,
  type_code varchar(255),
  timesheet_id integer,
  summary_timesheet_id integer,
  proforma_invoice_id integer,
  invoice_id integer,
  workflow_stage_id integer,
  status_code varchar(255),
  approver_user_id uuid,
  approver_user_pos_id integer,
  signature_id integer,
  remark varchar(255)
);

create table if not exists timesheet_shorebase.approval_status (
  code varchar(255) primary key,
  name varchar(255),
  pass boolean
);

create table if not exists timesheet_shorebase.approval_type (
  code varchar(255) primary key
);

create table if not exists timesheet_shorebase.approval_workflow (
  id integer generated always as identity primary key,
  type_code varchar(255),
  timesheet_type_code varchar(255),
  contract_id integer,
  subcontractor_id integer,
  company_id integer,
  start_date date,
  end_date date
);

create table if not exists timesheet_shorebase.approval_workflow_stage (
  id integer generated always as identity primary key,
  workflow_id integer,
  level integer,
  job_position_id integer,
  user_position_id integer
);

create table if not exists timesheet_shorebase.company (
  id integer generated always as identity primary key,
  name varchar(255),
  internal boolean,
  start_date date,
  end_date date
);

create table if not exists timesheet_shorebase.contract (
  id integer generated always as identity primary key,
  company_id integer,
  contract_number varchar(255),
  start_date date,
  end_date date
);

create table if not exists timesheet_shorebase.contract_service (
  id integer generated always as identity primary key,
  contract_id integer,
  service_id integer,
  company_id integer,
  code varchar(255),
  uom_code varchar(255),
  summary_calculation_type varchar(255),
  start_date date,
  end_date date,
  timesheet_site_code varchar(255),
  timesheet_group_id integer
);

create table if not exists timesheet_shorebase.contract_service_price (
  id integer generated always as identity primary key,
  contract_service_id integer,
  price_per_uom numeric(22,4),
  start_date date,
  end_date date
);

create table if not exists timesheet_shorebase.contract_service_timesheet_group (
  id integer generated always as identity primary key,
  name varchar(255)
);

create table if not exists timesheet_shorebase.equipment (
  id integer generated always as identity primary key,
  name varchar(255)
);

create table if not exists timesheet_shorebase.invoice (
  id integer generated always as identity primary key,
  type_code varchar(255),
  period_id integer,
  proforma_invoice_id integer,
  status_code varchar(32),
  status_at timestamptz,
  code varchar(255),
  issue_date date,
  tax_percentage numeric(22,4),
  signed_at timestamptz
);

create table if not exists timesheet_shorebase.invoice_component (
  id integer generated always as identity primary key,
  invoice_id integer,
  contract_service_id integer,
  shorebase_service_id integer,
  company_id integer,
  uom_code varchar(255),
  price_per_uom_contract numeric(22,4),
  price_per_uom_independent numeric(22,4),
  actual_price_per_uom numeric(22,4),
  remark varchar(1023),
  agg_amount integer
);

create table if not exists timesheet_shorebase.invoice_status (
  code varchar(32) primary key,
  name varchar(255),
  locked boolean
);

create table if not exists timesheet_shorebase.invoice_type (
  code varchar(32) primary key,
  name varchar(255)
);

create table if not exists timesheet_shorebase.jetty_ship (
  id integer generated always as identity primary key,
  name varchar(255)
);

create table if not exists timesheet_shorebase.job_position (
  id integer generated always as identity primary key,
  company_id integer,
  job_title_id integer,
  parent_position_id integer,
  name varchar(255),
  start_date date,
  end_date date
);

create table if not exists timesheet_shorebase.job_title (
  id integer generated always as identity primary key,
  code varchar(255),
  name varchar(255),
  start_date date,
  end_date date
);

create table if not exists timesheet_shorebase.material_handling_equipment (
  id integer generated always as identity primary key,
  job_id integer,
  equipment_id integer
);

create table if not exists timesheet_shorebase.material_handling_item (
  id integer generated always as identity primary key,
  job_id integer,
  product_id integer,
  quantity double precision,
  uom varchar(255),
  unit_size double precision
);

create table if not exists timesheet_shorebase.material_handling_job (
  id integer generated always as identity primary key,
  contract_service_id integer,
  sub_contractor_id integer,
  name varchar(255),
  job_date date,
  job_start timestamptz,
  job_finish timestamptz
);

create table if not exists timesheet_shorebase.meal_time (
  code varchar(32) primary key,
  name varchar(255)
);

create table if not exists timesheet_shorebase.period (
  id integer generated always as identity primary key,
  contract_id integer,
  company_id integer,
  name varchar(255),
  start_date date,
  end_date date,
  locked boolean
);

create table if not exists timesheet_shorebase.person (
  id integer generated always as identity primary key,
  staff_type_code varchar(32),
  company_id integer,
  name varchar(255),
  is_active boolean,
  created_at timestamptz,
  ended_at timestamptz
);

create table if not exists timesheet_shorebase.person_accomodation (
  id integer generated always as identity primary key,
  person_id integer,
  room_type_code varchar(32),
  company_id integer,
  staff_type_code varchar(32),
  contract_service_id integer,
  count integer,
  start_date date,
  end_date date
);

create table if not exists timesheet_shorebase.person_meal (
  id integer generated always as identity primary key,
  person_id integer,
  meal_time_code varchar(32),
  company_id integer,
  staff_type_code varchar(32),
  contract_service_id integer,
  count integer,
  meal_date date
);

create table if not exists timesheet_shorebase.product (
  id integer generated always as identity primary key,
  name varchar(255)
);

create table if not exists timesheet_shorebase.room_type (
  code varchar(32) primary key,
  name varchar(255)
);

create table if not exists timesheet_shorebase.shorebase_service (
  id integer generated always as identity primary key,
  code varchar(255),
  name varchar(255),
  description varchar(1023),
  default_uom_code varchar(255),
  default_price_per_uom numeric(22,4),
  active boolean,
  start_date date,
  end_date date
);

create table if not exists timesheet_shorebase.shorebase_service_price (
  id integer generated always as identity primary key,
  shorebase_service_id integer,
  company_id integer,
  price_per_uom numeric(22,4),
  start_date date,
  end_date date
);

create table if not exists timesheet_shorebase.staff_type (
  code varchar(32) primary key,
  name varchar(255)
);

create table if not exists timesheet_shorebase.subcontractors (
  id integer generated always as identity primary key,
  contract_id integer,
  company_id integer,
  start_date date,
  end_date date
);

create table if not exists timesheet_shorebase.sum_calc_type (
  code varchar(255) primary key,
  name varchar(255)
);

create table if not exists timesheet_shorebase.summary_timesheet (
  id integer generated always as identity primary key,
  period_id integer,
  type_code varchar(255),
  contract_id integer,
  company_id integer,
  code varchar(255),
  issue_date date
);

create table if not exists timesheet_shorebase.timesheet (
  id integer generated always as identity primary key,
  period_id integer,
  type_code varchar(255),
  contract_service_id integer,
  timesheet_group_id integer,
  subcontractor_id integer,
  company_id integer,
  service_id integer,
  uom_code varchar(255),
  invoice_component_id integer,
  code varchar(255),
  code_serial_number integer,
  code_site_code varchar(255),
  timesheet_date date,
  total_amount double precision,
  jetty_ship_id integer,
  mh_job_id integer,
  created_at timestamptz
);

create table if not exists timesheet_shorebase.timesheet_activity_daily (
  id integer generated always as identity primary key,
  activity_id integer,
  timesheet_id integer,
  activity_date date,
  amount double precision,
  amount_for_display double precision,
  person_accomodation_id integer,
  person_meal_id integer
);

create table if not exists timesheet_shorebase.timesheet_type (
  code varchar(255) primary key
);

create table if not exists timesheet_shorebase.uom (
  code varchar(255) primary key,
  name varchar(255)
);

create table if not exists timesheet_shorebase.user_position (
  id integer generated always as identity primary key,
  user_id uuid,
  job_position_id integer,
  start_date date,
  end_date date
);

create table if not exists timesheet_shorebase.user_signature (
  id integer generated always as identity primary key,
  user_id uuid,
  file_url varchar(1023),
  started_at timestamptz,
  ended_at timestamptz
);

-- Foreign key constraints
-- Note: Activity.ss_type_code has no FK target defined in the ERD (flagged as unresolved) and is left as a plain column.

alter table timesheet_shorebase.job_position add constraint fk_job_position_parent_position_id
  foreign key (parent_position_id) references timesheet_shorebase.job_position (id);

alter table timesheet_shorebase.contract_service add constraint fk_contract_service_service_id
  foreign key (service_id) references timesheet_shorebase.shorebase_service (id);

alter table timesheet_shorebase.contract_service add constraint fk_contract_service_company_id
  foreign key (company_id) references timesheet_shorebase.company (id);

alter table timesheet_shorebase.activity add constraint fk_activity_contract_service_id
  foreign key (contract_service_id) references timesheet_shorebase.contract_service (id);

alter table timesheet_shorebase.user_position add constraint fk_user_position_job_position_id
  foreign key (job_position_id) references timesheet_shorebase.job_position (id);

alter table timesheet_shorebase.job_position add constraint fk_job_position_job_title_id
  foreign key (job_title_id) references timesheet_shorebase.job_title (id);

alter table timesheet_shorebase.approval_workflow_stage add constraint fk_approval_workflow_stage_workflow_id
  foreign key (workflow_id) references timesheet_shorebase.approval_workflow (id);

alter table timesheet_shorebase.approval add constraint fk_approval_status_code
  foreign key (status_code) references timesheet_shorebase.approval_status (code);

alter table timesheet_shorebase.approval add constraint fk_approval_timesheet_id
  foreign key (timesheet_id) references timesheet_shorebase.timesheet (id);

alter table timesheet_shorebase.approval add constraint fk_approval_workflow_stage_id
  foreign key (workflow_stage_id) references timesheet_shorebase.approval_workflow_stage (id);

alter table timesheet_shorebase.contract add constraint fk_contract_company_id
  foreign key (company_id) references timesheet_shorebase.company (id);

alter table timesheet_shorebase.contract_service_price add constraint fk_contract_service_price_contract_service_id
  foreign key (contract_service_id) references timesheet_shorebase.contract_service (id);

alter table timesheet_shorebase.contract_service add constraint fk_contract_service_contract_id
  foreign key (contract_id) references timesheet_shorebase.contract (id);

alter table timesheet_shorebase.contract_service add constraint fk_contract_service_uom_code
  foreign key (uom_code) references timesheet_shorebase.uom (code);

alter table timesheet_shorebase.contract_service add constraint fk_contract_service_summary_calculation_type
  foreign key (summary_calculation_type) references timesheet_shorebase.sum_calc_type (code);

alter table timesheet_shorebase.user_signature add constraint fk_user_signature_user_id
  foreign key (user_id) references timesheet_shorebase.app_user (id);

alter table timesheet_shorebase.subcontractors add constraint fk_subcontractors_contract_id
  foreign key (contract_id) references timesheet_shorebase.contract (id);

alter table timesheet_shorebase.subcontractors add constraint fk_subcontractors_company_id
  foreign key (company_id) references timesheet_shorebase.company (id);

alter table timesheet_shorebase.activity add constraint fk_activity_status_code
  foreign key (status_code) references timesheet_shorebase.activity_status (code);

alter table timesheet_shorebase.timesheet add constraint fk_timesheet_type_code
  foreign key (type_code) references timesheet_shorebase.timesheet_type (code);

alter table timesheet_shorebase.shorebase_service add constraint fk_shorebase_service_default_uom_code
  foreign key (default_uom_code) references timesheet_shorebase.uom (code);

alter table timesheet_shorebase.approval add constraint fk_approval_type_code
  foreign key (type_code) references timesheet_shorebase.approval_type (code);

alter table timesheet_shorebase.approval add constraint fk_approval_invoice_id
  foreign key (invoice_id) references timesheet_shorebase.invoice (id);

alter table timesheet_shorebase.approval_workflow add constraint fk_approval_workflow_timesheet_type_code
  foreign key (timesheet_type_code) references timesheet_shorebase.timesheet_type (code);

alter table timesheet_shorebase.summary_timesheet add constraint fk_summary_timesheet_type_code
  foreign key (type_code) references timesheet_shorebase.timesheet_type (code);

alter table timesheet_shorebase.invoice_component add constraint fk_invoice_component_invoice_id
  foreign key (invoice_id) references timesheet_shorebase.invoice (id);

alter table timesheet_shorebase.approval add constraint fk_approval_summary_timesheet_id
  foreign key (summary_timesheet_id) references timesheet_shorebase.summary_timesheet (id);

alter table timesheet_shorebase.shorebase_service_price add constraint fk_shorebase_service_price_shorebase_service_id
  foreign key (shorebase_service_id) references timesheet_shorebase.shorebase_service (id);

alter table timesheet_shorebase.user_position add constraint fk_user_position_user_id
  foreign key (user_id) references timesheet_shorebase.app_user (id);

alter table timesheet_shorebase.approval_workflow add constraint fk_approval_workflow_type_code
  foreign key (type_code) references timesheet_shorebase.approval_type (code);

alter table timesheet_shorebase.invoice add constraint fk_invoice_type_code
  foreign key (type_code) references timesheet_shorebase.invoice_type (code);

alter table timesheet_shorebase.invoice add constraint fk_invoice_period_id
  foreign key (period_id) references timesheet_shorebase.period (id);

alter table timesheet_shorebase.timesheet add constraint fk_timesheet_invoice_component_id
  foreign key (invoice_component_id) references timesheet_shorebase.invoice_component (id);

alter table timesheet_shorebase.timesheet_activity_daily add constraint fk_timesheet_activity_daily_activity_id
  foreign key (activity_id) references timesheet_shorebase.activity (id);

alter table timesheet_shorebase.timesheet_activity_daily add constraint fk_timesheet_activity_daily_timesheet_id
  foreign key (timesheet_id) references timesheet_shorebase.timesheet (id);

alter table timesheet_shorebase.person_accomodation add constraint fk_person_accomodation_person_id
  foreign key (person_id) references timesheet_shorebase.person (id);

alter table timesheet_shorebase.person_meal add constraint fk_person_meal_person_id
  foreign key (person_id) references timesheet_shorebase.person (id);

alter table timesheet_shorebase.material_handling_item add constraint fk_material_handling_item_job_id
  foreign key (job_id) references timesheet_shorebase.material_handling_job (id);

alter table timesheet_shorebase.material_handling_equipment add constraint fk_material_handling_equipment_job_id
  foreign key (job_id) references timesheet_shorebase.material_handling_job (id);

alter table timesheet_shorebase.timesheet add constraint fk_timesheet_period_id
  foreign key (period_id) references timesheet_shorebase.period (id);

alter table timesheet_shorebase.invoice add constraint fk_invoice_status_code
  foreign key (status_code) references timesheet_shorebase.invoice_status (code);

alter table timesheet_shorebase.contract_service add constraint fk_contract_service_timesheet_group_id
  foreign key (timesheet_group_id) references timesheet_shorebase.contract_service_timesheet_group (id);

alter table timesheet_shorebase.timesheet add constraint fk_timesheet_contract_service_id
  foreign key (contract_service_id) references timesheet_shorebase.contract_service (id);

alter table timesheet_shorebase.timesheet add constraint fk_timesheet_timesheet_group_id
  foreign key (timesheet_group_id) references timesheet_shorebase.contract_service_timesheet_group (id);

alter table timesheet_shorebase.timesheet add constraint fk_timesheet_subcontractor_id
  foreign key (subcontractor_id) references timesheet_shorebase.subcontractors (id);

alter table timesheet_shorebase.timesheet add constraint fk_timesheet_company_id
  foreign key (company_id) references timesheet_shorebase.company (id);

alter table timesheet_shorebase.timesheet add constraint fk_timesheet_service_id
  foreign key (service_id) references timesheet_shorebase.shorebase_service (id);

alter table timesheet_shorebase.timesheet add constraint fk_timesheet_uom_code
  foreign key (uom_code) references timesheet_shorebase.uom (code);

alter table timesheet_shorebase.timesheet add constraint fk_timesheet_mh_job_id
  foreign key (mh_job_id) references timesheet_shorebase.material_handling_job (id);

alter table timesheet_shorebase.approval_workflow add constraint fk_approval_workflow_contract_id
  foreign key (contract_id) references timesheet_shorebase.contract (id);

alter table timesheet_shorebase.approval_workflow add constraint fk_approval_workflow_subcontractor_id
  foreign key (subcontractor_id) references timesheet_shorebase.subcontractors (id);

alter table timesheet_shorebase.approval_workflow add constraint fk_approval_workflow_company_id
  foreign key (company_id) references timesheet_shorebase.company (id);

alter table timesheet_shorebase.approval_workflow_stage add constraint fk_approval_workflow_stage_job_position_id
  foreign key (job_position_id) references timesheet_shorebase.job_position (id);

alter table timesheet_shorebase.approval_workflow_stage add constraint fk_approval_workflow_stage_user_position_id
  foreign key (user_position_id) references timesheet_shorebase.user_position (id);

alter table timesheet_shorebase.approval add constraint fk_approval_proforma_invoice_id
  foreign key (proforma_invoice_id) references timesheet_shorebase.invoice (id);

alter table timesheet_shorebase.approval add constraint fk_approval_approver_user_id
  foreign key (approver_user_id) references timesheet_shorebase.app_user (id);

alter table timesheet_shorebase.approval add constraint fk_approval_approver_user_pos_id
  foreign key (approver_user_pos_id) references timesheet_shorebase.user_position (id);

alter table timesheet_shorebase.approval add constraint fk_approval_signature_id
  foreign key (signature_id) references timesheet_shorebase.user_signature (id);

alter table timesheet_shorebase.invoice_component add constraint fk_invoice_component_contract_service_id
  foreign key (contract_service_id) references timesheet_shorebase.contract_service (id);

alter table timesheet_shorebase.invoice_component add constraint fk_invoice_component_shorebase_service_id
  foreign key (shorebase_service_id) references timesheet_shorebase.shorebase_service (id);

alter table timesheet_shorebase.invoice_component add constraint fk_invoice_component_company_id
  foreign key (company_id) references timesheet_shorebase.company (id);

alter table timesheet_shorebase.invoice_component add constraint fk_invoice_component_uom_code
  foreign key (uom_code) references timesheet_shorebase.uom (code);

alter table timesheet_shorebase.invoice add constraint fk_invoice_proforma_invoice_id
  foreign key (proforma_invoice_id) references timesheet_shorebase.invoice (id);

alter table timesheet_shorebase.job_position add constraint fk_job_position_company_id
  foreign key (company_id) references timesheet_shorebase.company (id);

alter table timesheet_shorebase.activity add constraint fk_activity_timesheet_type_code
  foreign key (timesheet_type_code) references timesheet_shorebase.timesheet_type (code);

alter table timesheet_shorebase.activity add constraint fk_activity_subcontractor_id
  foreign key (subcontractor_id) references timesheet_shorebase.subcontractors (id);

alter table timesheet_shorebase.activity add constraint fk_activity_company_id
  foreign key (company_id) references timesheet_shorebase.company (id);

alter table timesheet_shorebase.activity add constraint fk_activity_service_id
  foreign key (service_id) references timesheet_shorebase.shorebase_service (id);

alter table timesheet_shorebase.activity add constraint fk_activity_uom_code
  foreign key (uom_code) references timesheet_shorebase.uom (code);

alter table timesheet_shorebase.activity add constraint fk_activity_plan_activity_id
  foreign key (plan_activity_id) references timesheet_shorebase.activity (id);

alter table timesheet_shorebase.summary_timesheet add constraint fk_summary_timesheet_period_id
  foreign key (period_id) references timesheet_shorebase.period (id);

alter table timesheet_shorebase.summary_timesheet add constraint fk_summary_timesheet_contract_id
  foreign key (contract_id) references timesheet_shorebase.contract (id);

alter table timesheet_shorebase.summary_timesheet add constraint fk_summary_timesheet_company_id
  foreign key (company_id) references timesheet_shorebase.company (id);

alter table timesheet_shorebase.shorebase_service_price add constraint fk_shorebase_service_price_company_id
  foreign key (company_id) references timesheet_shorebase.company (id);

alter table timesheet_shorebase.timesheet_activity_daily add constraint fk_timesheet_activity_daily_person_accomodation_id
  foreign key (person_accomodation_id) references timesheet_shorebase.person_accomodation (id);

alter table timesheet_shorebase.timesheet_activity_daily add constraint fk_timesheet_activity_daily_person_meal_id
  foreign key (person_meal_id) references timesheet_shorebase.person_meal (id);

alter table timesheet_shorebase.person add constraint fk_person_staff_type_code
  foreign key (staff_type_code) references timesheet_shorebase.staff_type (code);

alter table timesheet_shorebase.person add constraint fk_person_company_id
  foreign key (company_id) references timesheet_shorebase.company (id);

alter table timesheet_shorebase.person_accomodation add constraint fk_person_accomodation_room_type_code
  foreign key (room_type_code) references timesheet_shorebase.room_type (code);

alter table timesheet_shorebase.person_accomodation add constraint fk_person_accomodation_company_id
  foreign key (company_id) references timesheet_shorebase.company (id);

alter table timesheet_shorebase.person_accomodation add constraint fk_person_accomodation_staff_type_code
  foreign key (staff_type_code) references timesheet_shorebase.staff_type (code);

alter table timesheet_shorebase.person_accomodation add constraint fk_person_accomodation_contract_service_id
  foreign key (contract_service_id) references timesheet_shorebase.contract_service (id);

alter table timesheet_shorebase.person_meal add constraint fk_person_meal_company_id
  foreign key (company_id) references timesheet_shorebase.company (id);

alter table timesheet_shorebase.person_meal add constraint fk_person_meal_staff_type_code
  foreign key (staff_type_code) references timesheet_shorebase.staff_type (code);

alter table timesheet_shorebase.person_meal add constraint fk_person_meal_contract_service_id
  foreign key (contract_service_id) references timesheet_shorebase.contract_service (id);

alter table timesheet_shorebase.material_handling_job add constraint fk_material_handling_job_contract_service_id
  foreign key (contract_service_id) references timesheet_shorebase.contract_service (id);

alter table timesheet_shorebase.material_handling_job add constraint fk_material_handling_job_sub_contractor_id
  foreign key (sub_contractor_id) references timesheet_shorebase.subcontractors (id);

alter table timesheet_shorebase.material_handling_item add constraint fk_material_handling_item_uom
  foreign key (uom) references timesheet_shorebase.uom (code);

alter table timesheet_shorebase.period add constraint fk_period_contract_id
  foreign key (contract_id) references timesheet_shorebase.contract (id);

alter table timesheet_shorebase.period add constraint fk_period_company_id
  foreign key (company_id) references timesheet_shorebase.company (id);

alter table timesheet_shorebase.timesheet add constraint fk_timesheet_jetty_ship_id
  foreign key (jetty_ship_id) references timesheet_shorebase.jetty_ship (id);

alter table timesheet_shorebase.activity add constraint fk_activity_mh_product_id
  foreign key (mh_product_id) references timesheet_shorebase.product (id);

alter table timesheet_shorebase.material_handling_item add constraint fk_material_handling_item_product_id
  foreign key (product_id) references timesheet_shorebase.product (id);

alter table timesheet_shorebase.material_handling_equipment add constraint fk_material_handling_equipment_equipment_id
  foreign key (equipment_id) references timesheet_shorebase.equipment (id);

alter table timesheet_shorebase.person_meal add constraint fk_person_meal_meal_time_code
  foreign key (meal_time_code) references timesheet_shorebase.meal_time (code);

-- Keep app_user in sync with Supabase Auth: create a profile row automatically
-- whenever someone signs up via auth.users.
create or replace function timesheet_shorebase.handle_new_auth_user()
returns trigger
language plpgsql
security definer set search_path = timesheet_shorebase
as $$
begin
  insert into timesheet_shorebase.app_user (id, email, name)
  values (new.id, new.email, new.raw_user_meta_data ->> 'name');
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function timesheet_shorebase.handle_new_auth_user();

-- The following relationships from the ERD were NOT added as real FK constraints because
-- they point at a non-key column (Postgres requires FK targets to be a primary/unique key).
-- These looked like "value lineage" (e.g. a snapshotted price) rather than a true foreign key.
-- Review each one and either (a) leave as a plain column, or (b) add a unique constraint on
-- the target column if it should really be a relational FK.
-- timesheet_shorebase.invoice_component.price_per_uom_contract -> timesheet_shorebase.contract_service_price.price_per_uom (not a key column)
-- timesheet_shorebase.invoice_component.price_per_uom_independent -> timesheet_shorebase.shorebase_service_price.price_per_uom (not a key column)

commit;
