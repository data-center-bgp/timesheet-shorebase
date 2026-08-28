-- Relaxes activity.code's uniqueness from unique(code) to unique(code,
-- status_code), so an Actual row can share its linked Plan row's code
-- (confirmed with the project owner: an Actual represents the real-world
-- execution of that specific Plan line item, not a separate identity).
-- Still prevents two Plan rows, or two Actual rows, from sharing a code.

begin;

alter table timesheet_shorebase.activity
  drop constraint uq_activity_code;

alter table timesheet_shorebase.activity
  add constraint uq_activity_code_status unique (code, status_code);

commit;
