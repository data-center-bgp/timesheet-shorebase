# Approval linkage expansion — design spec

## Problem

`Approval` was scoped to Timesheet-only when built (Invoice/Summary
Timesheet didn't exist yet) — `type_code` is hardcoded `'T'` server-side,
and `summary_timesheet_id`/`proforma_invoice_id`/`invoice_id` (all already
present on the table) are never wired into the form. Both Invoice and
Summary Timesheet now exist, so this closes that gap.

## Schema facts that shaped this design

- `approval_type` is already fully seeded: `T`=Timesheet, `ST`=Summary
  Timesheet, `PIN`=Proforma Invoice, `IN`=Invoice.
- **`approval_workflow.type_code` is already required (`NOT NULL`)** — a
  Workflow (and every Stage under it) is already scoped to exactly one of
  these four types. This means `approval.type_code` doesn't need its own
  form field at all: it should be **derived server-side from whichever
  Workflow Stage is selected** (same snapshot-from-a-chosen-parent pattern
  as Actual Activity deriving fields from its Plan Activity), never a
  separate dropdown. This also closes a real bug class where someone could
  previously pick a Summary-Timesheet-scoped stage while the row still got
  stamped `type_code='T'`.
- **`approval.timesheet_id` is `NOT NULL` regardless of type** — confirmed
  with the project owner this stays required for every approval type:
  every approval, whatever pipeline stage it's for, still traces back to
  one specific timesheet. No migration needed.
- `summary_timesheet` has an `active` column (standard active-filter +
  fallback dropdown convention applies). `invoice` does not (same as the
  Invoice feature's own dropdowns — plain/unfiltered, filtered by
  `type_code` instead where relevant).

## Design

**`workflow_stage_id` dropdown** gets a richer label so the type is visible
before picking: fetch `id, workflow_id, level, approval_workflow(type_code)`
(normal, non-self-referential embed) and compose
`` `Level ${level} — Workflow #${workflow_id} (${typeName})` `` using a
static `type_code → name` map (`T`→'Timesheet', `ST`→'Summary Timesheet',
`PIN`→'Proforma Invoice', `IN`→'Invoice' — these four codes are fixed/
seeded, no need for an extra join to `approval_type.name`).

**Form fields** (confirmed: always show all three subject dropdowns,
server enforces which one applies — matches this app's existing flat-form
convention, no client-side conditional rendering):
- `workflow_stage_id` (dropdown, required, richer label above)
- `timesheet_id` (dropdown, required, unchanged — active-filtered)
- `summary_timesheet_id` (dropdown, active-filtered + fallback, optional in
  the DOM — required by the server only when the derived type is `ST`)
- `proforma_invoice_id` (dropdown, unfiltered but scoped to `invoice` rows
  where `type_code = 'P'`, optional in the DOM — required only when
  derived type is `PIN`)
- `invoice_id` (dropdown, unfiltered but scoped to `invoice` rows where
  `type_code = 'I'`, optional in the DOM — required only when derived type
  is `IN`)
- `status_code`, `approver_user_id`, `approver_user_pos_id`, `remark` —
  unchanged from the current form.

**Server validation** (`createApproval`/`updateApproval`, after the
existing manager guard): look up the selected `workflow_stage_id`'s parent
workflow's `type_code` — this becomes the row's `type_code`, never read
from `formData`. Then, based on that derived type:

| Derived type | Required subject field | The other two must be blank |
|---|---|---|
| `T` | none | all three must be blank |
| `ST` | `summary_timesheet_id` | `proforma_invoice_id`, `invoice_id` |
| `PIN` | `proforma_invoice_id` | `summary_timesheet_id`, `invoice_id` |
| `IN` | `invoice_id` | `summary_timesheet_id`, `proforma_invoice_id` |

If the required field for the derived type is missing: return an error
naming which field is needed and why (e.g. "This workflow stage is for
Summary Timesheet approvals — select a Summary Timesheet."). If either of
the other two fields has a value: return an error saying only the one
field matching this stage's type should be filled in. `timesheet_id`
stays required in every case, independent of `type_code`.

## Nothing else changes

List/edit page structure, Deactivate/Reactivate, manager read-only
behavior — all unchanged from the current Approval feature. This is
purely: derive `type_code` instead of hardcoding it, and wire up the three
already-existing-but-unused subject columns with the validation table
above.
