# Actual Activity management — design

## Purpose

Build the fifteenth real CRUD area on the ERD-derived schema, completing `Activity`'s Plan/Actual duality deferred from the `Plan Activity` feature: `status_code = 'A'` rows, each linked back to the Plan row it fulfills via the self-referential `plan_activity_id`, recording `actual_amount`/`actual_remark`/`actual_description`.

## Non-goals

- No display of the linked Plan row's own `plan_amount`/`plan_date`/`plan_remark`/`plan_description` as read-only context on the Actual form — a nice-to-have, not requested.
- No one-to-one enforcement between a Plan row and its Actual(s) — a Plan Activity's dropdown shows every Plan row regardless of whether it already has an Actual linked, same "no new uniqueness without a clear business rule" precedent as `Subcontractors`/`PersonAccomodation`/`PersonMeal`. Multiple Actuals per Plan are allowed.
- No filtering of the Plan Activity dropdown by status — same convention as every prior feature.
- No role-based access control — same single permissive RLS policy pattern as every prior feature.
- No hard-delete — deactivate via `active`, same precedent as `Plan Activity` itself.

## Design

### Schema change: relax `code`'s uniqueness

Confirmed with the project owner: an Actual row shares its linked Plan's `code` (it represents the real-world execution of that specific planned line item, not a separate identity). The existing `uq_activity_code unique (code)` constraint (added in the Plan Activity migration) must be relaxed to allow a Plan row and its Actual counterpart to share a `code`:

```sql
alter table timesheet_shorebase.activity drop constraint uq_activity_code;
alter table timesheet_shorebase.activity add constraint uq_activity_code_status unique (code, status_code);
```

This still prevents two Plan rows (or two Actual rows) from sharing a code, while allowing exactly one Plan + one Actual pair (or Plan + multiple Actuals, per the no-one-to-one-enforcement decision above) to share it.

### No new NOT NULL constraints on Actual-only fields

`plan_activity_id` and `actual_amount` must be required for Actual rows but stay `null` for Plan rows — the same table serves both purposes, so this can't be a DB-level constraint (nothing distinguishes "required for A" from "required for P" at that layer). Required-ness is enforced entirely in `createActualActivity`'s validation, exactly like every other Plan/Actual-scoped rule in this table.

### `code`/`contract_service_id`/`timesheet_type_code`/`subcontractor_id`/`company_id`/`service_id`/`uom_code`: all seven derived from the selected Plan Activity

This extends the derivation pattern furthest yet — from `PersonAccomodation`'s 2-field helper and `PlanActivity`'s own 3-field helper, to 7 fields snapshotted from one selected row. `lookupActivitySnapshotFromPlan(supabase, planActivityId)` reads all seven columns off the chosen Plan row and writes them into the new Actual row — none of the seven ever come from `formData`. If the linked Plan is changed on an edit, all seven re-snapshot from whichever Plan is now selected, same "always mirrors the current source" rule as every prior derivation helper.

### `status_code`/`plan_activity_id`: hardcoded and form-set respectively, never independently chosen

`status_code` is written as the literal string `'A'` in `createActualActivity`, exactly mirroring `createPlanActivity`'s `'P'`. `plan_activity_id` IS a form field (the "Plan Activity" dropdown) — the one field in this derivation chain the user actually picks; everything else cascades from it.

### The self-referential embed: a documented exception to the "no alias" rule

`activity.plan_activity_id` points at `activity` itself — the *only* self-referential FK in this schema, structurally like `job_position.parent_position_id` (which this codebase's `JobPosition` feature avoided embedding entirely, fetching parent options via a separate plain query instead). Here, the Actual Activities list genuinely needs to show the linked Plan's `code`, so the self-embed can't be avoided the way `JobPosition` avoided it.

**This is a real exception to the established "no alias needed, PostgREST resolves by target-table-name" rule** (`CLAUDE.md`'s documented convention, which has held for every embed in this codebase so far): a self-join's embed target table name is *identical* to the base query's own table name (`activity` selecting from `activity`), which is exactly the kind of self-reference PostgREST requires an explicit hint for, regardless of the FK-uniqueness reasoning that governs every other embed here. The correct syntax is:

```
plan_activity:activity!plan_activity_id(code)
```

— an aliased embed (`plan_activity:`) naming the FK column as the hint. Do not "simplify" this to a bare `activity(code)` by analogy with every other embed in this codebase; that analogy doesn't hold for self-joins. This is the first embed alias/hint used anywhere in this app, and it is correct specifically because this is a self-referential case, not a multi-FK-to-same-target case.

### Fields

**Required**: Plan Activity (dropdown), Actual amount (number, decimals allowed).
**Optional**: Actual remark (textarea), Actual description (text).
**Not on the form**: `code`/`contract_service_id`/`timesheet_type_code`/`subcontractor_id`/`company_id`/`service_id`/`uom_code` (all seven derived), `status_code` (hardcoded `'A'`), Active (its own Deactivate/Reactivate button).

### Navigation

No existing placeholder — new top-level nav entry, joining the Operations group after `Activities`: **Actual Activities** (`/actual-activities`).

### Routes

- `src/app/(app)/actual-activities/page.tsx` — list (filtered `.eq('status_code', 'A')`): linked Plan's Code (via the aliased self-embed), Actual amount, Status. Links to edit each row and to `/actual-activities/new`.
- `src/app/(app)/actual-activities/new/page.tsx` — fetches the Plan Activity list (`.from('activity').select('id, code').eq('status_code', 'P')`).
- `src/app/(app)/actual-activities/[id]/edit/page.tsx` — same, plus Deactivate/Reactivate. Fetched row filtered `.eq('status_code', 'A')` (so a Plan row's id correctly 404s here, symmetric with Plan Activity's edit page filtering out Actual rows).
- `src/app/(app)/actual-activities/ActualActivityForm.tsx` — shared form, no client-side interactivity, plain `defaultValue` fields.
- `src/app/(app)/actual-activities/actions.ts` — `createActualActivity`, `updateActualActivity` (both deriving the seven fields server-side from the selected Plan Activity), `deactivateActualActivity`, `reactivateActualActivity`.

## Testing

No automated tests. Manual verification: create a Plan Activity (or reuse the deferred cleanup — none exist right now, so one must be seeded), create an Actual against it, confirm all seven derived fields match the Plan's own values and `status_code = 'A'`, confirm `code` matches the Plan's `code` exactly; confirm submitting a duplicate `(code, status_code)` pair is rejected (would require creating a second Actual with a manually-forced duplicate code — likely not naturally reachable through the UI since code is never user-entered here, so this may only be exercisable via a direct SQL check, not a live UI reproduction); edit the Actual, change which Plan it links to, confirm all seven fields re-derive; deactivate/reactivate, confirm every other field stays untouched.
