# Invoice management — design spec

## Schema recap

`invoice` has the same self-referential Plan/Actual-style duality as
`activity`: `type_code` (`P`=Proforma, `I`=Invoice) discriminates the row,
and `proforma_invoice_id` (self-FK to `invoice.id`) is only ever set on a
Final Invoice row, pointing back to the Proforma it was created from —
structurally identical to `activity.plan_activity_id`. `status_code`
(`D`=Draft/unlocked, `F`=Finalized/locked, from `invoice_status`) is the
same "locked" shape as `period.locked`. Both `invoice` and
`invoice_component` are currently empty (greenfield).

`invoice_component` is a child table: `invoice_id`, `contract_service_id`,
`shorebase_service_id`, `company_id`, `uom_code`, three manually-entered
price fields (`price_per_uom_contract`/`price_per_uom_independent` are the
intentional non-FK value snapshots already documented in `CLAUDE.md`,
`actual_price_per_uom` is a third plain number), `remark`, `agg_amount`.
**It has no `active` column at all** — the first child table in this
codebase without one — so it's create/update/list only, no deactivate/
reactivate concept exists to build.

**Gotcha caught before writing the migration**: `invoice` and
`invoice_component` have zero grants to `authenticated` and RLS isn't even
enabled on them (`relrowsecurity = false`) — they were part of the initial
43-table schema but never got the RLS/grant treatment every other table
received, because no feature ever touched them until now. The migration
goes straight to the current (manager-aware) RLS shape rather than the old
permissive-then-fixed-later shape, since that's now the standing
requirement for anything new.

## Decisions from discussion

- **Split into two nav items**, mirroring Activity: **Proforma Invoices**
  (`/proforma-invoices`, `type_code` hardcoded `'P'`) and **Invoices**
  (`/invoices`, `type_code` hardcoded `'I'`, requires picking its
  originating Proforma via a `proforma_invoice_id` dropdown) — both share
  the `invoice` table, same pattern as `/activities` + `/actual-activities`
  sharing `activity`.
- **Finalize is one-way.** A "Finalize" button moves `status_code` from
  `D` to `F` (no Un-finalize) on either Proforma or Invoice rows
  independently — each row has its own lifecycle. Once `status_code = 'F'`,
  the edit page renders fully disabled (reusing the same `readOnly`
  mechanism already built for managers, with a different message: "This
  {proforma invoice / invoice} has been finalized and can no longer be
  edited.") and the action layer itself also rejects an update against an
  already-finalized row (defense in depth — unlike `period.locked`, which
  today is informational only and doesn't block `updatePeriod`, this one
  actually must block edits per the discussion, so it can't just copy that
  precedent as-is).
- **Approval linkage deferred.** `approval.invoice_id`/`proforma_invoice_id`
  stay unwired for now — revisit in one pass later alongside
  `approval.summary_timesheet_id` (already flagged in the roadmap), not as
  part of this build.
- **`invoice_component` stays flat CRUD** with an `invoice_id` dropdown
  (labeled by a composed string, same convention as ApprovalWorkflow/Stage
  since `invoice` has no natural unique name: `{code ?? 'Invoice #' + id}
  ({Proforma|Invoice})`), matching the Material Handling Item/Equipment
  precedent (flat pages + FK dropdown, not nested master-detail).

## Fields per form

**Proforma Invoice** (`ProformaInvoiceForm.tsx`): `period_id` (dropdown —
`period` has no `active` column, so this is plain/unfiltered, same
convention already used by `summary-timesheets`' own period dropdown),
`code` (text, required — the
one identifying field, same convention as every other feature's primary
text field), `issue_date` (date, optional), `tax_percentage` (number,
optional, `>= 0` if present). `type_code` hardcoded `'P'`, `status_code`
hardcoded `'D'` at creation — neither is a form field. `signed_at`
deliberately left off the form: it implies a captured signature, and
`UserSignature` (the feature that would produce one) is still deferred
pending a file-storage decision — same treatment as other fields blocked
on an unbuilt dependency.

**Invoice** (`InvoiceForm.tsx`): everything above, plus `proforma_invoice_id`
(dropdown, required, lists all Proforma Invoices ordered by `code` — no
dedup/one-Proforma-per-Invoice enforcement in this first pass, revisit if
it becomes a real problem). `type_code` hardcoded `'I'`.

**Invoice Component** (`InvoiceComponentForm.tsx`): `invoice_id` (dropdown,
required, composed-string label as above, no active-filtering since
`invoice` has no `active` column), `contract_service_id` (dropdown,
active-filtered + fallback), `shorebase_service_id` (dropdown,
active-filtered + fallback), `company_id` (dropdown, active-filtered +
fallback), `uom_code` (dropdown, plain/unfiltered — `uom` has no `active`
column, same as every other UoM dropdown in this app), `price_per_uom_contract`/
`price_per_uom_independent`/`actual_price_per_uom` (number, optional, `>= 0`
if present), `agg_amount` (integer, optional, `>= 0` if present), `remark`
(textarea, optional).

## Nav

Both new Invoice items join the existing **Approvals & Billing** group,
replacing the current "Coming soon" `Invoices` placeholder and adding
`Proforma Invoices` right before it (draft-then-final ordering, matching
`Activities` before `Actual Activities`). `Invoice Components` goes after
`Invoices` in the same group — it's the line-item detail of an invoice,
not master data.

## Rollout

Task 1 (migration: enable RLS + grants + manager-aware policies on both
tables, same shape as the 2026-09-02 RLS split) done directly, applied via
Studio, verified via `psql`. Tasks 2+ (Proforma Invoice, Invoice, Invoice
Component — three roughly-equal-sized features) dispatched as background
agents, one per task given they build on each other (Invoice's form needs
Proforma Invoices to exist first for its dropdown; Invoice Component needs
both). Each new `actions.ts` gets `isManagerRole()` guards from the start
(no retrofit needed, unlike the original 26 features). Final review +
live verification + push, same cadence as every other feature.
