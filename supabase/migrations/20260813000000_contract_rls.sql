-- Extends the RLS pattern already applied to `company` (see
-- 20260812000000_company_rls.sql) to `contract`. Schema-level `usage` was
-- already granted to `authenticated` there - only the table grants and
-- policy are new here.

begin;

grant select, insert, update on timesheet_shorebase.contract to authenticated;

alter table timesheet_shorebase.contract enable row level security;

create policy "authenticated users can read/write contracts"
  on timesheet_shorebase.contract
  for all
  to authenticated
  using (true)
  with check (true);

commit;
