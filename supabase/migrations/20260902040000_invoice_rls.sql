-- `invoice` and `invoice_component` were part of the initial 43-table
-- schema migration but never got the RLS/grant treatment every other
-- table received, since no feature ever touched them until now (confirmed
-- via relrowsecurity = false and zero grants to `authenticated`). This
-- goes straight to the current manager-aware policy shape rather than the
-- old permissive-then-fixed-later shape, since that's now standing
-- practice for anything new. Reuses timesheet_shorebase.is_manager(),
-- added in 20260902030000_manager_read_only_rls.sql.

begin;

grant select, insert, update, delete on timesheet_shorebase.invoice to authenticated;
grant select, insert, update, delete on timesheet_shorebase.invoice_component to authenticated;

alter table timesheet_shorebase.invoice enable row level security;
alter table timesheet_shorebase.invoice_component enable row level security;

create policy "invoice_select_all" on timesheet_shorebase.invoice for select to authenticated using (true);
create policy "invoice_insert_non_manager" on timesheet_shorebase.invoice for insert to authenticated with check (not timesheet_shorebase.is_manager());
create policy "invoice_update_non_manager" on timesheet_shorebase.invoice for update to authenticated using (not timesheet_shorebase.is_manager()) with check (not timesheet_shorebase.is_manager());
create policy "invoice_delete_non_manager" on timesheet_shorebase.invoice for delete to authenticated using (not timesheet_shorebase.is_manager());

create policy "invoice_component_select_all" on timesheet_shorebase.invoice_component for select to authenticated using (true);
create policy "invoice_component_insert_non_manager" on timesheet_shorebase.invoice_component for insert to authenticated with check (not timesheet_shorebase.is_manager());
create policy "invoice_component_update_non_manager" on timesheet_shorebase.invoice_component for update to authenticated using (not timesheet_shorebase.is_manager()) with check (not timesheet_shorebase.is_manager());
create policy "invoice_component_delete_non_manager" on timesheet_shorebase.invoice_component for delete to authenticated using (not timesheet_shorebase.is_manager());

commit;
