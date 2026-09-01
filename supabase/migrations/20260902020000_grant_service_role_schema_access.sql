-- The service_role had zero access to the timesheet_shorebase schema -
-- not even USAGE - since admin.ts's service-role client had only ever
-- been used for auth.* (Supabase Auth's own schema) calls until the
-- User Management feature needed it to also write directly to
-- timesheet_shorebase.app_user. service_role is meant to bypass RLS by
-- design, but it still needs the ordinary Postgres GRANT system to see
-- the schema/tables at all - RLS bypass isn't a GRANT bypass. This is
-- the standard Supabase pattern for a custom (non-public) schema:
-- broad access now, plus default privileges so future tables in this
-- schema don't need this repeated.

begin;

grant usage on schema timesheet_shorebase to service_role;
grant all privileges on all tables in schema timesheet_shorebase to service_role;
grant all privileges on all sequences in schema timesheet_shorebase to service_role;
alter default privileges in schema timesheet_shorebase
  grant all privileges on tables to service_role;
alter default privileges in schema timesheet_shorebase
  grant all privileges on sequences to service_role;

commit;
