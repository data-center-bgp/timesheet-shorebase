# Approval linkage expansion — implementation plan

Spec: `docs/superpowers/specs/2026-09-02-approval-linkage-expansion-design.md`
— read it fully first.

**Goal:** Wire up `approval.summary_timesheet_id`/`proforma_invoice_id`/
`invoice_id` (already on the table, never used) and derive `type_code`
from the selected Workflow Stage instead of hardcoding `'T'`.

**Scope:** Modify the existing `src/app/(app)/approvals/` feature only —
no migration, no new nav entry, no new files except none (all 5 existing
files get edited). No client-side conditional rendering (confirmed:
always show all three subject dropdowns, server validates).

## Files to modify

- `src/app/(app)/approvals/actions.ts`
- `src/app/(app)/approvals/ApprovalForm.tsx`
- `src/app/(app)/approvals/page.tsx`
- `src/app/(app)/approvals/new/page.tsx`
- `src/app/(app)/approvals/[id]/edit/page.tsx`

## `actions.ts`

Add a helper:
```ts
const APPROVAL_TYPE_NAMES: Record<string, string> = {
  T: 'Timesheet',
  ST: 'Summary Timesheet',
  PIN: 'Proforma Invoice',
  IN: 'Invoice',
};

async function deriveApprovalType(
  supabase: Awaited<ReturnType<typeof createClient>>,
  workflowStageId: number,
): Promise<string | null> {
  const { data } = await supabase
    .from('approval_workflow_stage')
    .select('approval_workflow(type_code)')
    .eq('id', workflowStageId)
    .maybeSingle();
  const workflow = data?.approval_workflow as unknown as { type_code: string } | null;
  return workflow?.type_code ?? null;
}
```

Rewrite `readApprovalFields` (or inline into `createApproval`/`updateApproval`
directly, whichever reads cleaner) to also read `summary_timesheet_id`,
`proforma_invoice_id`, `invoice_id` from `formData` (all optional/blank
allowed at the parse stage — the type-matching check happens after the
derived type is known). Both `createApproval` and `updateApproval`:

1. Manager guard (unchanged, stays first).
2. Parse `workflow_stage_id`, `timesheet_id`, `status_code` as required
   (unchanged validation). Parse the three subject fields as optional
   numbers-or-null.
3. Call `deriveApprovalType(supabase, workflowStageId)`. If it returns
   `null` (stage not found / workflow missing its type somehow), return
   `{ error: 'Could not determine this workflow stage\'s approval type.' }`.
4. Validate against the derived type using the table from the spec:
   ```ts
   const REQUIRED_FIELD: Record<string, 'summary_timesheet_id' | 'proforma_invoice_id' | 'invoice_id' | null> = {
     T: null,
     ST: 'summary_timesheet_id',
     PIN: 'proforma_invoice_id',
     IN: 'invoice_id',
   };
   ```
   For the derived type's required field (if any): error if blank, naming
   the field and `APPROVAL_TYPE_NAMES[derivedType]` (e.g. "This workflow
   stage is for Summary Timesheet approvals — select a Summary Timesheet.").
   For the other two subject fields (whichever aren't the required one,
   including all three when the required field is `null` for type `T`):
   error if any has a value ("Only Summary Timesheet should be filled in
   for a Summary Timesheet approval." — adapt the field name per type).
5. Insert/update with `type_code: derivedType` (never from `formData`) and
   the three subject fields set to their parsed values (the two
   non-applicable ones will be `null` per the validation above — write
   them explicitly as `null`, don't omit them from the payload, so an
   edit that changes `workflow_stage_id` to a different type correctly
   clears out a previously-set subject field instead of leaving it stale).

`deactivateApproval`/`reactivateApproval` are untouched.

## `ApprovalForm.tsx`

- Extend `WorkflowStageOption` to `{ id: number; workflow_id: number; level: number; type_code: string }`.
  In the `<select>`, change the option label to:
  ```tsx
  {`Level ${stage.level} — Workflow #${stage.workflow_id} (${APPROVAL_TYPE_NAMES[stage.type_code] ?? stage.type_code})`}
  ```
  (define `APPROVAL_TYPE_NAMES` once in this file too, or export/import it
  from `actions.ts` — either is fine, just don't duplicate the literal
  object with different values in two places; importing from `actions.ts`
  is cleaner since it's already defined there).
- Add three new dropdowns, same shape/styling as the existing ones, each
  with an empty/blank default option (`<option value="">No summary timesheet</option>`
  style, matching how `approver_user_id` already does this — NOT `required`,
  since only one of the three is actually required and that's enforced
  server-side, not via HTML `required`):
  - `summary_timesheet_id` → `SummaryTimesheetOption = { id: number; code: string }`
  - `proforma_invoice_id` → `InvoiceOption = { id: number; code: string | null }` (label:
    `option.code ?? 'Proforma Invoice #' + option.id`)
  - `invoice_id` → same `InvoiceOption` shape (label: `option.code ?? 'Invoice #' + option.id`)
- Extend the `Approval` type with `summary_timesheet_id: number | null`,
  `proforma_invoice_id: number | null`, `invoice_id: number | null`.
- Extend the component's props to accept `summaryTimesheets: SummaryTimesheetOption[]`,
  `proformaInvoices: InvoiceOption[]`, `invoices: InvoiceOption[]`.

## `page.tsx` (list)

Add `type_code` to the select (`'id, active, remark, type_code, timesheet(code), approval_status(name)'`)
and a new "Type" column showing `APPROVAL_TYPE_NAMES[approval.type_code] ?? approval.type_code`
(import the map from `../actions` or redeclare — same duplication call as
above, prefer importing). Place it right after the Timesheet column.

## `new/page.tsx`

Add three more fetches alongside the existing ones:
- Workflow stages: extend the select to `'id, workflow_id, level, approval_workflow(type_code)'`,
  then flatten the embed into the flat `{ id, workflow_id, level, type_code }`
  shape `ApprovalForm` expects (the embed comes back nested, e.g.
  `stage.approval_workflow.type_code` — map it before passing down).
- Summary Timesheets: `.from('summary_timesheet').select('id, code').eq('active', true).order('code')`.
- Proforma Invoices: `.from('invoice').select('id, code').eq('type_code', 'P').order('code')`.
- Invoices: `.from('invoice').select('id, code').eq('type_code', 'I').order('code')`.

Pass all three new lists down to `ApprovalForm`.

## `[id]/edit/page.tsx`

Same three new fetches as `new/page.tsx`. Extend the `approval` select to
include `summary_timesheet_id, proforma_invoice_id, invoice_id`. Extend
the workflow-stage embed + flatten the same way. Add current-value
fallback for `summary_timesheet_id` (mirrors the existing
`workflow_stage_id`/`timesheet_id` fallback blocks already in this file —
`summary_timesheet` has `active`, so this fallback is meaningful the same
way). Skip a fallback for `proforma_invoice_id`/`invoice_id` — `invoice`
has no `active` column so nothing can silently exclude a row's own current
value from an otherwise-unfiltered list (same reasoning already applied
throughout the Invoice feature). Pass all three new lists + the flattened
workflow stages down to `ApprovalForm`.

## Verification

1. `npm run lint` / `npm run build` clean.
2. Live in the browser (check login state first, don't attempt to log in
   yourself if logged out — use a substitute service-role Node script
   instead, same fallback as the Invoice builds):
   - Create an Approval against a `T`-type workflow stage with all three
     subject fields blank — should succeed, row shows `type_code='T'`.
   - Attempt one against an `ST`-type stage with `summary_timesheet_id`
     left blank — should fail with the specific error naming Summary
     Timesheet.
   - Attempt one against a `PIN`-type stage with `invoice_id` also filled
     in (in addition to `proforma_invoice_id`) — should fail with the
     "only one field" error.
   - Successfully create one against each of the 4 types with exactly the
     right field filled in — confirm the list page's Type column and
     stored `type_code` are correct for each.
   - If no Approval Workflow/Stage exists yet for a given type in the DB,
     create a throwaway one first (Approval Workflows → Workflow Stages,
     picking that `type_code`) — clean it up alongside the Approval test
     rows afterward.
3. Delete all test rows created during verification before reporting back
   (`approval` rows, and any throwaway `approval_workflow`/
   `approval_workflow_stage` rows created solely to get a stage of a given
   type — check first whether one already existed for that type before
   creating a new one, to avoid deleting something that predates this
   task).

## Commit

One commit: "Wire up Approval's Summary Timesheet/Invoice linkage and
derive type_code from workflow stage".
