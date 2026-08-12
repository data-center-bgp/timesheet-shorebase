-- First Row Level Security policy in this schema, scoped to `company` only.
-- Every other table remains inaccessible to anon/authenticated until it gets
-- its own migration (see CLAUDE.md's "Not yet done: RLS"). No role_code
-- distinction yet - any authenticated user can read/write, refined later.

begin;

grant usage on schema timesheet_shorebase to authenticated;
grant select, insert, update on timesheet_shorebase.company to authenticated;

alter table timesheet_shorebase.company enable row level security;

create policy "authenticated users can read/write companies"
  on timesheet_shorebase.company
  for all
  to authenticated
  using (true)
  with check (true);

commit;
