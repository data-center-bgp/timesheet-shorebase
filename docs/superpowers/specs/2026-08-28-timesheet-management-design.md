# Timesheet management — design

## Purpose

Build the twentieth real CRUD area on the ERD-derived schema: `Timesheet`, the billing-facing header record tying a Period + Contract Service together with a total amount and a generated-looking code. This is the largest single-table entity built so far (11 FKs).

## Non-goals

- **No `timesheet_activity_daily` (the daily breakdown child table)**. Confirmed with the project owner: this feature covers only the `timesheet` header. The daily breakdown — per-day amounts linked to an `Activity` and optionally a person's accommodation/meal for that day — is a genuine reconciliation layer whose relationship to Activity roll-ups isn't decided yet, deferred as a separate future feature (tracked in the roadmap memory, not re-litigated here).
- **No `timesheet_group_id` field on the form.** `contract_service_timesheet_group` has zero rows and no CRUD built yet (already called out as a separate non-goal in the ContractService spec) — there's nothing to select. Left off the form entirely, same treatment as `activity.mh_product_id` before Material Handling existed.
- **No `invoice_component_id` field on the form.** `invoice_component` has zero rows; the whole Approvals & Billing / Invoice cluster is unstarted. Left off the form, same reasoning as `timesheet_group_id` above.
- **No wiring of `created_at`.** Checked the one existing precedent for this exact pattern: `Person.created_at` (same `timestamptz`, no default) was never added to `PersonForm`/`actions.ts` — left fully unset. Same treatment here: not on the form, no DB default invented.
- **No uniqueness constraint on `code`.** Unlike `Activity.code` (confirmed unique per status), no business rule for `Timesheet.code`'s uniqueness has been confirmed — required, not unique, per the "don't infer uniqueness the ERD didn't specify" rule in `CLAUDE.md`.
- No role-based access control, no hard-delete (deactivate via `active`) — same precedent as every prior feature.

## Design

### Schema: required fields and `active` column

`timesheet` has no ERD status field, so it gets `active boolean not null default true`, Deactivate/Reactivate touching only that column.

Required (added as NOT NULL, matching what the form treats as mandatory): `period_id`, `type_code`, `contract_service_id`, `timesheet_date`, `code`, `total_amount`.

Left nullable (optional on the form, or not on the form at all — see below): `subcontractor_id`, `jetty_ship_id`, `mh_job_id`, `code_serial_number`, `company_id`, `service_id`, `uom_code`, `timesheet_group_id`, `invoice_component_id`, `created_at`.

### `company_id`/`service_id`/`uom_code`: derived from Contract Service, extending the established pattern

Same shape as `Activity`'s `lookupCompanyServiceUomForContractService`: picking a Contract Service snapshots its `company_id`, `service_id`, and `uom_code` onto the Timesheet row — none of the three are independently chosen on the form. `lookupCompanyServiceUomForTimesheet(supabase, contractServiceId)` reads `company_id, service_id, uom_code` off the selected `contract_service` row. If the linked Contract Service changes on an edit, all three re-snapshot, same "always mirrors the current source" rule as every prior derivation helper.

### `subcontractor_id`/`jetty_ship_id`/`mh_job_id`: independent, optional dropdowns

None of these are derivable from Contract Service (it has no columns for any of them). Same pattern as `Activity.subcontractor_id`: independent optional FK, "No subcontractor"/"No jetty/ship"/"No material handling job" as the blank option's real display text.

### Fields

**Required**: Period (dropdown), Timesheet type (dropdown), Contract service (dropdown), Timesheet date (date), Code (text), Total amount (number, decimals allowed).
**Optional**: Subcontractor (dropdown), Jetty/Ship (dropdown), Material handling job (dropdown), Code serial number (number).
**Not on the form**: `company_id`/`service_id`/`uom_code` (all three derived from Contract Service), Active (its own Deactivate/Reactivate button). `timesheet_group_id`, `invoice_component_id`, `created_at` (all three genuinely deferred — see Non-goals).

### Dropdown sources (all previously-established patterns, no new syntax)

- **Period** → `id, name` (plain query, labeled by `name` — confirmed via `psql \d` this is Period's own required, non-unique display column).
- **Timesheet type** → `code, name` (plain query, same shape already used by `Activity`'s `timesheet_type_code` dropdown — this table already has 3 rows: C/Contract, S/Subcontractor, I/Independent).
- **Contract service** → `id, code` (plain query, same as every prior feature's contract service dropdown).
- **Subcontractor** → `id, company(name)` (one-level embed, same as `Activity`/`MaterialHandlingJob`).
- **Jetty/Ship** → `id, name` (plain query).
- **Material handling job** → `id, name` (plain query, same shape `MaterialHandlingItem`/`MaterialHandlingEquipment` already use).
- **List page's own embeds** (read-only, one-level, standard no-hint rule — verified via `pg_constraint` that `timesheet` has exactly one FK to each of these targets): `period(name)`, `contract_service(code)`, `timesheet_type(name)`.

### Grants

`timesheet` currently has zero grants to `authenticated` (checked via `psql`) — needs `grant select, insert, update` in the migration. Every dropdown source (`period`, `timesheet_type`, `contract_service`, `subcontractors`, `jetty_ship`, `material_handling_job`) is already granted from prior features — verified, no gap.

### Routes

- `src/app/(app)/timesheets/page.tsx` — list: Code, Period, Contract Service, Timesheet date, Total amount, Status.
- `src/app/(app)/timesheets/new/page.tsx` — fetches all six dropdown sources.
- `src/app/(app)/timesheets/[id]/edit/page.tsx` — same, plus Deactivate/Reactivate.
- `src/app/(app)/timesheets/TimesheetForm.tsx` — shared form.
- `src/app/(app)/timesheets/actions.ts` — `createTimesheet`, `updateTimesheet` (both deriving `company_id`/`service_id`/`uom_code` server-side from the selected Contract Service), `deactivateTimesheet`, `reactivateTimesheet`.

Nav: `nav.ts` already has a `Timesheets` placeholder (`/timesheets`, `ClipboardList` icon) in the Operations group — no nav changes needed, it just stops resolving to the "Coming soon" catch-all once the real route exists.

## Testing

No automated tests. Manual verification: create a Period, a Timesheet Type is already seeded, create a Timesheet against a real Contract Service, confirm `company_id`/`service_id`/`uom_code` match the Contract Service's own values (check via `psql`, not exposed on the form so can't eyeball in the UI); confirm the list shows Period/Contract Service names correctly; edit the Timesheet, change the linked Contract Service, confirm the three derived fields re-derive; leave Subcontractor/Jetty-Ship/MH Job blank, confirm they save as null; deactivate/reactivate, confirm every other field stays untouched.
