# Plan Activity management — design

## Purpose

Build the twelfth real CRUD area on the ERD-derived schema, and the first entity in the Operations nav group: `Activity` records planned/actual operational work against a `ContractService`. The table is genuinely more complex than anything built so far — `status_code` (P=Plan / A=Actual) distinguishes two lifecycle stages living in the *same* table, with a self-referential `plan_activity_id` letting an Actual row point back at the Plan row it fulfills, plus separate `plan_*`/`actual_*` field groups. This first pass scopes down to **Plan Activities only** (`status_code` always `'P'`, hardcoded, never a form field) — Actual recording, the `plan_activity_id` linkage, and everything that depends on a Plan row already existing are deferred to a follow-up feature.

## Non-goals

- No Actual Activity recording — no `actual_amount`/`actual_remark`/`actual_description` fields, no `plan_activity_id` linkage. Deferred to a follow-up feature once Plan Activity management exists to link against.
- `mh_product_id` (material-handling product) stays off the form and nullable — its exact applicability (which activities need it) isn't resolved yet.
- `ss_type_code` stays off the form and nullable — `CLAUDE.md` already documents this column as having no resolved FK target in the ERD; not attempting to guess its meaning here.
- No conditional field logic (e.g. showing `subcontractor_id` only when `timesheet_type_code = 'S'`) — `subcontractor_id` is simply always an optional dropdown regardless of `timesheet_type_code`. Real conditional-field UX is a feature in its own right, not something to bolt on as a side effect of this pass.
- No filtering of dropdowns by status — same convention as every prior feature.
- No role-based access control — same single permissive RLS policy pattern as every prior feature.
- No hard-delete — deactivate via `active`, same precedent as every table without an ERD lifecycle-status field. (`status_code` P/A is a Plan-vs-Actual categorization, not a soft-delete concept — orthogonal to `active`, so both coexist here same as `Period`'s `locked` alongside no `active`... except unlike `Period`, `activity` genuinely gets both `status_code` AND `active`, since neither one serves the other's purpose.)

## Design

### Schema

```sql
alter table timesheet_shorebase.activity alter column code set not null;
alter table timesheet_shorebase.activity alter column contract_service_id set not null;
alter table timesheet_shorebase.activity alter column timesheet_type_code set not null;
alter table timesheet_shorebase.activity alter column plan_amount set not null;
alter table timesheet_shorebase.activity alter column plan_date set not null;

alter table timesheet_shorebase.activity add constraint uq_activity_code unique (code);

alter table timesheet_shorebase.activity add column active boolean not null default true;

grant select, insert, update on timesheet_shorebase.activity to authenticated;
alter table timesheet_shorebase.activity enable row level security;
create policy "authenticated users can read/write activities"
  on timesheet_shorebase.activity
  for all
  to authenticated
  using (true)
  with check (true);
```

`status_code`, `company_id`, `service_id`, `uom_code` stay nullable at the DB level (all three of the latter are auto-derived; `status_code` is always written as `'P'` by the app, never left to the user, so a DB-level `not null` isn't needed to guarantee it). `subcontractor_id`, `mh_product_id`, `ss_type_code`, `plan_activity_id`, `plan_remark`, `plan_description`, and all `actual_*` columns stay nullable and mostly untouched by this feature.

Checked upfront (per the now-standard practice from the last several features): `timesheet_type` and `activity_status` both currently have **zero grants to `authenticated`** and RLS disabled — this migration also grants `select` on both, so the Timesheet Type dropdown and (later, when the Actual-recording feature ships) the Status display don't hit the same missing-grant class of bug a fourth+ time.

### `company_id`/`service_id`/`uom_code`: auto-derived from Contract Service

Same denormalized-snapshot mechanism as `PersonAccomodation`'s `lookupCompanyAndStaffTypeForPerson`, here deriving three fields from one source row (`contract_service`) instead of two from `person`: `lookupCompanyServiceUomForContractService(supabase, contractServiceId)` returns `{ companyId, serviceId, uomCode }`, all read from the selected `contract_service` row, none ever taken from form input.

### `status_code`: hardcoded, not a form field

Every row this feature creates gets `status_code: 'P'`, written directly in `createPlanActivity` — never read from `formData`. The list page explicitly queries `.eq('status_code', 'P')`, so it stays correct even after a future Actual-recording feature starts writing `'A'` rows into the same table.

### Fields

**Required**: Code (text, unique), Contract Service (dropdown), Timesheet Type (dropdown: Contract/Subcontractor/Independent), Plan amount (number, allows decimals — the column is `double precision`, not integer), Plan date.
**Optional**: Subcontractor (dropdown, always available regardless of Timesheet Type), Plan remark (longer free text — `varchar(1023)` vs. `plan_description`'s `varchar(255)`, so this is the first `<textarea>` in the app rather than a plain `<input>`), Plan description (text).
**Not on the form**: Company, Service, UoM (all auto-derived), Status (`'P'`, hardcoded), Active (its own Deactivate/Reactivate button), everything Actual-related, `mh_product_id`, `ss_type_code`, `plan_activity_id`.

### Navigation

`nav.ts` already has an "Activities" entry at `/activities` in the Operations group — no nav changes needed.

### Routes

- `src/app/(app)/activities/page.tsx` — list (filtered to `status_code = 'P'`): Code, Contract Service (joined `code`), Timesheet Type (joined `name`), Subcontractor (joined... `subcontractors` has no name/code column — see below), Plan amount, Plan date, Status.
- `src/app/(app)/activities/new/page.tsx` — fetches Contract Service list, Timesheet Type list, Subcontractor list.
- `src/app/(app)/activities/[id]/edit/page.tsx` — same, plus Deactivate/Reactivate.
- `src/app/(app)/activities/PlanActivityForm.tsx` — shared form, `useActionState` pattern, no controlled fields.
- `src/app/(app)/activities/actions.ts` — `createPlanActivity`, `updatePlanActivity` (both deriving company/service/uom server-side), `deactivateActivity`, `reactivateActivity`.

**Subcontractor display note**: `subcontractors` (built earlier this session) has no `name`/`code` column of its own — it's identified by its `contract_id` + `company_id` pair. The Subcontractor dropdown and the list page's Subcontractor column both display via a nested embed through to the subcontracted company's name (`subcontractor(company(name))`), not a direct field on `subcontractors` itself.

## Testing

No automated tests. Manual verification: create a Plan Activity, confirm `company_id`/`service_id`/`uom_code` correctly mirror the selected Contract Service's own values (verify via `psql`, none shown in the UI); confirm the unique `code` constraint triggers on a duplicate; edit it; deactivate/reactivate, confirm all fields except `active` stay untouched; confirm the list only ever shows `status_code = 'P'` rows.
