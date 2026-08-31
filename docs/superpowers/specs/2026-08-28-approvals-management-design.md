# Approvals management — design

## Purpose

Build the 21st–23rd real CRUD areas: `ApprovalWorkflow` (a template — which contract/subcontractor/timesheet-type an approval chain applies to, and its effective date range), `ApprovalWorkflowStage` (ordered steps within a workflow, each naming an approver — by Job Position role or by a specific User Position), and `Approval` (an actual approval action/record against one specific stage). This starts the **Approvals & Billing** nav group.

## Non-goals

- **`Approval` is scoped to Timesheets only.** Confirmed with the project owner: `approval.summary_timesheet_id`/`proforma_invoice_id`/`invoice_id` all stay off the form and unwired — `summary_timesheet` and `invoice` have zero rows and no CRUD yet (the rest of this nav group). `approval.type_code` is hardcoded to `'T'` (Timesheet) in `createApproval`, never form-derived — same pattern as `Activity`'s hardcoded `status_code`. Revisit once Summary Timesheets/Invoices exist.
- **`approval.signature_id` stays off the form.** References `user_signature`, already deferred codebase-wide pending a file-storage decision (see roadmap memory) — same reasoning, not re-litigated here.
- **No mutual-exclusivity enforcement between `ApprovalWorkflowStage.job_position_id` and `user_position_id`.** Both are independent optional dropdowns (a stage can name a role, a specific person's position, both, or neither) — no uniqueness/XOR constraint invented without a confirmed business rule, same precedent as every other under-specified nullable pair in this codebase.
- **No CRUD pages for `approval_status`/`approval_type`.** Both are small lookup tables, already seeded with real data (`approval_status`: Approved/Rejected; `approval_type`: Timesheet/Summary Timesheet/Proforma Invoice/Invoice) — same treatment as `timesheet_type`: a dropdown source only, eventually a candidate for the `Reference Data` catch-all page, not a dedicated feature.
- No role-based access control, no hard-delete (deactivate via `active`) — same precedent as every prior feature.

## Design

### Three tables, one nav group, three separate flat pages

Same "separate flat CRUD pages linked by dropdown, no nested master-detail" call as Material Handling — `ApprovalWorkflowStage` links back to its `ApprovalWorkflow` via a dropdown, `Approval` links to its `ApprovalWorkflowStage` via a dropdown. Nothing here is more novel than what Material Handling already proved out.

### `active` column on all three tables

None of the three have an ERD status field distinct from soft-delete (Approval's own `status_code` — Approved/Rejected — is the *outcome* of the approval decision, business data, not a deactivation flag). All three get `active boolean not null default true` per the universal convention, Deactivate/Reactivate touching only that column.

### Required fields, decided per table

- **`approval_workflow`**: `type_code`, `start_date`, `end_date` required (an effective date range, same required-both-dates precedent as `Period`/`Contract`/`Company`). `timesheet_type_code`/`contract_id`/`subcontractor_id`/`company_id` stay optional — scoping filters that can be left broad/blank, no business rule confirmed requiring them.
- **`approval_workflow_stage`**: `workflow_id`, `level` required (the stage's position in the chain, e.g. 1, 2, 3). `job_position_id`/`user_position_id` both optional.
- **`approval`**: `workflow_stage_id`, `timesheet_id`, `status_code` required. `approver_user_id`, `approver_user_pos_id`, `remark` optional. `type_code` required at the DB level but always written as the literal `'T'` by the server action, never form-derived.

### Labeling `ApprovalWorkflow`/`ApprovalWorkflowStage` — neither has a name or code

Unlike every previous entity, `ApprovalWorkflow` has no natural display column (no `name`/`code`) — its list rows and its dropdown options are labeled by composing available context: **`Workflow #{id} ({type_code})`**. `ApprovalWorkflowStage` similarly composes **`Level {level} — Workflow #{workflow_id}`**. Both compositions happen client-side from plain (non-embedded) fields already on the row — no new PostgREST syntax involved.

### Dropdown sources (all previously-established shapes, no new syntax)

- **Approval type** → `code, name` (plain query, labeled by `name`) — for `ApprovalWorkflow.type_code`.
- **Timesheet type** → `code, name` (plain query, reusing the same shape `Activity`/`Timesheet` already use) — for `ApprovalWorkflow.timesheet_type_code`.
- **Contract** → `id, contract_name` (plain query) — for `ApprovalWorkflow.contract_id` (first use of `Contract` as a dropdown source; `contract_name` is its NOT NULL identifying column — `contract_number` is nullable and less reliable as a label — confirmed via `\d`).
- **Subcontractor** → `id, company(name)` (one-level embed, same as every prior feature) — for `ApprovalWorkflow.subcontractor_id`.
- **Company** → `id, name` (plain query) — for `ApprovalWorkflow.company_id`.
- **ApprovalWorkflow** → `id, type_code` (plain query, composed to `Workflow #{id} ({type_code})` client-side) — for `ApprovalWorkflowStage.workflow_id`.
- **Job Position** → `id, name` (plain query) — for `ApprovalWorkflowStage.job_position_id` (check exact column name via `\d job_position` before building — likely `name`, mirroring `JobTitle`/`JobPosition`'s existing shape).
- **User Position** → `id, app_user(name, email), job_position(name)` — reuse `UserPosition`'s existing list-page embed exactly, labeled `` `${app_user?.name ?? app_user?.email ?? 'User #' + id} — ${job_position?.name ?? '—'}` `` — for `ApprovalWorkflowStage.user_position_id` and `Approval.approver_user_pos_id`.
- **ApprovalWorkflowStage** → `id, workflow_id, level` (plain query, composed to `Level {level} — Workflow #{workflow_id}` client-side) — for `Approval.workflow_stage_id`.
- **Timesheet** → `id, code` (plain query) — for `Approval.timesheet_id`.
- **Approval status** → `code, name` (plain query, labeled by `name`) — for `Approval.status_code`.
- **App user** → `id, name, email` (plain query, labeled `name ?? email ?? id`, same fallback and query shape as `UserPosition`'s own user dropdown) — for `Approval.approver_user_id`.
- **List pages' own embeds** (read-only, one-level, standard no-hint rule — verified via `pg_constraint` that each of these FKs is the only one from its source table to that target): `approval_workflow`'s list embeds `contract(contract_name)`, `subcontractors(company(name))`, `company(name)`, `timesheet_type(name)`. `approval`'s list embeds `timesheet(code)`, `approval_status(name)`.

### Grants

`approval`, `approval_workflow`, `approval_workflow_stage` currently have zero grants to `authenticated` — need `grant select, insert, update` in the migration. `approval_status` and `approval_type` also currently have zero grants despite already holding real seed data (checked via `psql`) — need `grant select` (read-only, they're reference lookups with no CRUD UI, same treatment as `timesheet_type`). Every other dropdown source (`contract`, `subcontractors`, `company`, `job_position`, `user_position`, `timesheet`, `app_user`, `timesheet_type`) is already granted from prior features — verified, no gap.

### Fields

**ApprovalWorkflow** — Required: Type (dropdown), Start date, End date. Optional: Timesheet type (dropdown), Contract (dropdown), Subcontractor (dropdown), Company (dropdown). Not on form: Active.

**ApprovalWorkflowStage** — Required: Workflow (dropdown), Level (number). Optional: Job position (dropdown), User position (dropdown). Not on form: Active.

**Approval** — Required: Workflow stage (dropdown), Timesheet (dropdown), Status (dropdown). Optional: Approver user (dropdown), Approver user position (dropdown), Remark (text). Not on form: Type (hardcoded `'T'`), summary_timesheet_id/proforma_invoice_id/invoice_id/signature_id (all deferred), Active.

### Navigation

`nav.ts` currently has a single `{ label: 'Approvals', icon: Stamp, href: '/approvals' }` placeholder in Approvals & Billing. Split into three, same treatment as Material Handling's split:

- `{ label: 'Approval Workflows', icon: Workflow, href: '/approval-workflows' }` (new `Workflow` icon import)
- `{ label: 'Workflow Stages', icon: ListOrdered, href: '/approval-workflow-stages' }` (new `ListOrdered` icon import)
- `{ label: 'Approvals', icon: Stamp, href: '/approvals' }` (unchanged — reuses the existing placeholder's route and icon)

### Routes (×3)

- `src/app/(app)/approval-workflows/{page.tsx, new/page.tsx, [id]/edit/page.tsx, ApprovalWorkflowForm.tsx, actions.ts}`
- `src/app/(app)/approval-workflow-stages/{page.tsx, new/page.tsx, [id]/edit/page.tsx, ApprovalWorkflowStageForm.tsx, actions.ts}`
- `src/app/(app)/approvals/{page.tsx, new/page.tsx, [id]/edit/page.tsx, ApprovalForm.tsx, actions.ts}`

No derivation helpers anywhere in this feature — every field is either independently chosen or hardcoded (`Approval.type_code`), nothing snapshots from a linked row.

## Testing

No automated tests. Manual verification: create an ApprovalWorkflow (pick a type, dates, leave scoping fields blank), confirm it appears in the Stage's Workflow dropdown labeled `Workflow #{id} ({type_code})`; create a Stage against it with a level and a Job Position; confirm it appears in Approval's Workflow Stage dropdown labeled `Level {level} — Workflow #{id}`; create an Approval against a real Timesheet and that Stage, picking a status; confirm the list shows the linked Timesheet code and Status name; edit each of the three, confirm links can change; deactivate/reactivate each independently, confirm no cross-table side effects.
