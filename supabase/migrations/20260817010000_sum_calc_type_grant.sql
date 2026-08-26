-- sum_calc_type never received a SELECT grant to authenticated in any prior
-- migration, unlike every other dropdown-source table (contract, company,
-- shorebase_service, service_type, uom). ContractService's create/edit
-- forms fetch sum_calc_type via the RLS-respecting server client, so
-- authenticated users hit "permission denied" and the forms fail to load.

begin;

grant select on timesheet_shorebase.sum_calc_type to authenticated;

commit;
