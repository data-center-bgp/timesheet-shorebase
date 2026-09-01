-- Closes a privilege-escalation hole found by review: app_user's RLS
-- policy granted ALL authenticated users blanket UPDATE on every
-- column, including role_code - meaning any signed-in user could call
-- PostgREST directly (the same anon key this app ships to the browser)
-- and promote themselves to role_code='master', completely bypassing
-- the app's own requireMasterRole() check. That check only gated the
-- UI path; the data layer underneath was wide open.
--
-- Fix: revoke UPDATE entirely for authenticated. All app_user writes
-- (setting name/username/role_code on create or edit) now go through
-- src/lib/supabase/admin.ts's service-role client instead, which
-- bypasses RLS/grants entirely - and that client is only ever reached
-- from code already gated by requireMasterRole(). SELECT stays broad
-- (using(true)) since many other features legitimately read app_user
-- for dropdown display (approver, user position, etc.) and that was
-- never the actual risk - only the write path was.

begin;

revoke update on timesheet_shorebase.app_user from authenticated;

drop policy if exists "authenticated users can read/write app users" on timesheet_shorebase.app_user;

create policy "authenticated users can read app users"
  on timesheet_shorebase.app_user
  for select
  to authenticated
  using (true);

commit;
