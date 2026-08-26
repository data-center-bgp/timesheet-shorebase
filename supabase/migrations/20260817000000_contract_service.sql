-- ContractService management: enforce required fields, unique code,
-- add active-based status column, and grant/RLS for authenticated access.
-- company_id and timesheet_group_id stay nullable (see design spec).

begin;

alter table timesheet_shorebase.contract_service
  alter column code set not null;
alter table timesheet_shorebase.contract_service
  alter column contract_id set not null;
alter table timesheet_shorebase.contract_service
  alter column service_id set not null;
alter table timesheet_shorebase.contract_service
  alter column uom_code set not null;
alter table timesheet_shorebase.contract_service
  alter column summary_calculation_type set not null;
alter table timesheet_shorebase.contract_service
  alter column start_date set not null;
alter table timesheet_shorebase.contract_service
  alter column end_date set not null;

alter table timesheet_shorebase.contract_service
  add constraint uq_contract_service_code unique (code);

alter table timesheet_shorebase.contract_service
  add column active boolean not null default true;

grant select, insert, update on timesheet_shorebase.contract_service to authenticated;
alter table timesheet_shorebase.contract_service enable row level security;
create policy "authenticated users can read/write contract services"
  on timesheet_shorebase.contract_service
  for all
  to authenticated
  using (true)
  with check (true);

commit;
