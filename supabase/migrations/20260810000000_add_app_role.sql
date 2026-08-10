-- Adds a coarse system-access role per user, stored in this schema rather
-- than Supabase's auth.users metadata. Separate from job_position/
-- user_position, which continue to drive business approval routing.

begin;

create table if not exists timesheet_shorebase.app_role (
  code varchar(32) primary key,
  name varchar(255) not null
);

insert into timesheet_shorebase.app_role (code, name) values
  ('master', 'Master'),
  ('admin', 'Admin'),
  ('manager', 'Manager')
on conflict (code) do nothing;

alter table timesheet_shorebase.app_user
  add column if not exists role_code varchar(32) not null default 'manager';

alter table timesheet_shorebase.app_user
  add constraint fk_app_user_role_code
  foreign key (role_code) references timesheet_shorebase.app_role (code);

commit;
