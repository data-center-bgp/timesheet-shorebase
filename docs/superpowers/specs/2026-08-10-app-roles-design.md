# User roles in `timesheet_shorebase` — design

## Purpose

Store a coarse system-access role for each user in the app's own schema, rather than in Supabase's `auth.users` metadata. This is separate from the existing `job_position`/`user_position` org-chart tables, which continue to drive business approval routing unchanged.

## Non-goals

- No app code changes — this is schema only. No homepage/UI updates, no permission-enforcement logic yet.
- No multi-role-per-user support — one role per user, per the project owner's decision.
- No interaction with `job_position`/`approval_workflow_stage` — role is a separate, orthogonal concept from org placement.

## Design

**New table `timesheet_shorebase.app_role`** (matches the existing lookup-table pattern already used for `staff_type`, `room_type`, etc.):

```sql
create table if not exists timesheet_shorebase.app_role (
  code varchar(32) primary key,
  name varchar(255) not null
);

insert into timesheet_shorebase.app_role (code, name) values
  ('master', 'Master'),
  ('admin', 'Admin'),
  ('manager', 'Manager')
on conflict (code) do nothing;
```

- `master` — full system access. Held only by the project owner's own account.
- `admin` — broad access, scope to be refined later.
- `manager` — read-only access to everything, no mutations.

**New column on `timesheet_shorebase.app_user`:**

```sql
alter table timesheet_shorebase.app_user
  add column role_code varchar(32) not null default 'manager';

alter table timesheet_shorebase.app_user
  add constraint fk_app_user_role_code
  foreign key (role_code) references timesheet_shorebase.app_role (code);
```

`role_code` defaults to `manager` (the least-privileged role) rather than being nullable, so every new sign-up gets defined, minimal access rather than an undefined state. Because it's a default rather than a value the trigger must supply, `handle_new_auth_user` (the existing trigger that auto-creates an `app_user` row on signup) needs **no changes** — Postgres fills in the default for any column an `insert` doesn't mention.

## Known follow-up, not part of this migration

The project owner's own `auth.users` account predates `handle_new_auth_user`, so it still has no `app_user` row (flagged originally in the login/homepage spec). Adding `role_code` doesn't fix this by itself. A one-off backfill statement (parameterized by email, run manually in Supabase Studio's SQL editor — not by the assistant, since it touches `auth.users`) creates that row with `role_code = 'master'`:

```sql
insert into timesheet_shorebase.app_user (id, email, name, role_code)
select id, email, raw_user_meta_data ->> 'name', 'master'
from auth.users
where email = '<paste your account''s email here>'
on conflict (id) do update set role_code = 'master';
```

## Testing

No automated tests (consistent with the rest of this project's approach so far). Verification is: run the migration against the self-hosted instance, confirm `app_role` has exactly three rows, confirm `app_user.role_code` exists with the `manager` default and the FK constraint in place.
