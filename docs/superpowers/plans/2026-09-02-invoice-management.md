# Invoice Management Implementation Plan

Spec: `docs/superpowers/specs/2026-09-02-invoice-management-design.md` — read
it fully before starting any task below; it has the complete field lists,
rationale, and the decisions already confirmed with the project owner.

**Goal:** Build Invoice's Plan/Actual-style duality (Proforma Invoice /
Invoice, sharing the `invoice` table via `type_code`) plus its child
`invoice_component` table — the last unbuilt major entity on the ERD.

**Architecture:** One migration enabling RLS + grants + the manager-aware
4-policy shape on `invoice` and `invoice_component` (currently at zero —
see spec's "gotcha" section). Then three features built in dependency
order: Proforma Invoice (independent), Invoice (needs Proforma Invoices to
exist for its dropdown), Invoice Component (needs both, for its `invoice_id`
dropdown spanning both types). Each new `actions.ts` includes
`isManagerRole()` guards from the start — this is now standing practice for
every new feature, not a retrofit.

**Tech stack:** same as every other feature — Next.js 16 App Router,
`useActionState`, `@supabase/ssr` server client, plain SQL migration
applied via Supabase Studio.

## Global constraints (apply to every task below)

- Every `create*`/`update*` action: `isManagerRole()` guard as the literal
  first line, returning `{ error: 'Managers have read-only access.' }`.
- Every `finalize*` action (Proforma Invoice's and Invoice's own): same
  guard, but `throw new Error(...)` (matches the deactivate/reactivate
  throw-shape convention, since there's no form state to return into).
- **Finalize is one-way and actually enforced**, unlike `period.locked`
  (informational only today). `finalize*` sets `status_code = 'F'` and
  `status_at = new Date().toISOString()`. `update*` must ALSO reject the
  write server-side if the row's current `status_code` is already `'F'`
  (`return { error: 'This {proforma invoice/invoice} has been finalized and can no longer be edited.' }`)
  — check this via a `select` before the `update`, not by relying on RLS
  (RLS only guards against `manager`, not against a finalized row; this is
  a business-rule lock, not a security boundary, so app-layer enforcement
  is the intentional final word here, matching how this spec explicitly
  chose NOT to add DB-layer enforcement for it).
- Edit pages: pass `readOnly={isManager || isFinalized}` to the shared form
  component, but the notice text must reflect WHICH reason applies —
  `isManager ? 'Managers have read-only access.' : 'This {x} has been finalized and can no longer be edited.'`
  — add this as a `readOnlyMessage?: string` prop (default falls back to
  the manager message) rather than a bare boolean, so the edit page can
  pick the right copy.
- No `active` column on `invoice` or `invoice_component` — neither table
  gets a Deactivate/Reactivate concept. `invoice_component` in particular
  has no lifecycle at all (create/update/list only).
- `code` required on both Proforma Invoice and Invoice forms; `issue_date`/
  `tax_percentage` optional (`tax_percentage >= 0` if present).
  `signed_at` is NOT a form field on either (deferred — see spec).
- Dropdown sourcing follows the established convention: FK targets that
  have `active` (`contract_service`, `shorebase_service`, `company`) get
  the active-filter + current-value-fallback pattern from every prior
  feature; `uom` has no `active` column, so `uom_code` is a plain
  unfiltered dropdown (same as every other UoM dropdown in this app).
- Migrations are applied by the project owner pasting into Supabase
  Studio, verified after via `psql` — never `supabase db push`.

---

## Task 1 — Migration + nav (main session, not delegated)

**Files:** `supabase/migrations/20260902040000_invoice_rls.sql` (new),
`src/components/app-shell/nav.ts` (modify).

Migration: enable RLS on `invoice` and `invoice_component`, grant
`authenticated` the standard `select`/`insert`/`update`/`delete`
privileges (they currently have none at all — this is the gap flagged in
the spec), then create the same 4-policy shape used everywhere else
(select-all, insert/update/delete blocked for `is_manager()`). Reuse
`timesheet_shorebase.is_manager()` — already exists, don't recreate it.

```sql
begin;

grant select, insert, update, delete on timesheet_shorebase.invoice to authenticated;
grant select, insert, update, delete on timesheet_shorebase.invoice_component to authenticated;

alter table timesheet_shorebase.invoice enable row level security;
alter table timesheet_shorebase.invoice_component enable row level security;

create policy "invoice_select_all" on timesheet_shorebase.invoice for select to authenticated using (true);
create policy "invoice_insert_non_manager" on timesheet_shorebase.invoice for insert to authenticated with check (not timesheet_shorebase.is_manager());
create policy "invoice_update_non_manager" on timesheet_shorebase.invoice for update to authenticated using (not timesheet_shorebase.is_manager()) with check (not timesheet_shorebase.is_manager());
create policy "invoice_delete_non_manager" on timesheet_shorebase.invoice for delete to authenticated using (not timesheet_shorebase.is_manager());

create policy "invoice_component_select_all" on timesheet_shorebase.invoice_component for select to authenticated using (true);
create policy "invoice_component_insert_non_manager" on timesheet_shorebase.invoice_component for insert to authenticated with check (not timesheet_shorebase.is_manager());
create policy "invoice_component_update_non_manager" on timesheet_shorebase.invoice_component for update to authenticated using (not timesheet_shorebase.is_manager()) with check (not timesheet_shorebase.is_manager());
create policy "invoice_component_delete_non_manager" on timesheet_shorebase.invoice_component for delete to authenticated using (not timesheet_shorebase.is_manager());

commit;
```

Verify after applying:
```sql
select relrowsecurity from pg_class where relnamespace='timesheet_shorebase'::regnamespace and relname in ('invoice','invoice_component');
select tablename, count(*) from pg_policies where schemaname='timesheet_shorebase' and tablename in ('invoice','invoice_component') group by tablename;
```
Expect `t`/`t` and 4/4.

Nav: in `src/components/app-shell/nav.ts`'s Approvals & Billing group,
replace the existing `Invoices` placeholder entry with, in this exact
order:
```ts
{ label: 'Proforma Invoices', icon: FileClock, href: '/proforma-invoices' },
{ label: 'Invoices', icon: Receipt, href: '/invoices' },
```
and add, after it:
```ts
{ label: 'Invoice Components', icon: FileDigit, href: '/invoice-components' },
```
`FileClock` and `FileDigit` are both confirmed to exist in the installed
`lucide-react` package already — use them as named. Keep the
`lucide-react` import list alphabetically sorted.

Commit alone: "Add invoice RLS/grants and nav entries".

---

## Task 2 — Proforma Invoice (background agent)

**Files (all new):** `src/app/(app)/proforma-invoices/actions.ts`,
`ProformaInvoiceForm.tsx`, `page.tsx`, `new/page.tsx`, `[id]/edit/page.tsx`.

Model the overall shape directly on `src/app/(app)/periods/` (closest
sibling: a lookup-backed dropdown, a lock-like status field, no
deactivate/reactivate) — but note `periods`' lock is NOT enforced against
edits, and this one MUST be (see Global Constraints above).

- **Fields**: `period_id` (dropdown, active-filtered + fallback, required),
  `code` (text, required), `issue_date` (date, optional), `tax_percentage`
  (number, optional, `>= 0` if present).
- `createProformaInvoice`: inserts with `type_code: 'P'`, `status_code: 'D'`
  hardcoded — neither is a form field.
- `updateProformaInvoice`: first re-selects the row's current `status_code`;
  if `'F'`, return the finalized-error described above before validating
  anything else. Otherwise validates + updates the four fields (never
  touches `type_code`/`status_code`/`proforma_invoice_id`).
- `finalizeProformaInvoice(id)`: manager guard, then re-selects current
  `status_code` — if already `'F'`, throw `'This proforma invoice has already been finalized.'`
  (defensive; the button will be hidden once finalized, but the action
  itself must not silently no-op). Otherwise `update({ status_code: 'F', status_at: new Date().toISOString() })`.
  No `unfinalize`.
- List page (`page.tsx`): columns Code, Period (embed `period(name)` — a
  normal, non-self-referential embed, standard `target_table(name)` form),
  Status (Draft/Finalized badge from `status_code`), Issue date. "Add
  proforma invoice" button hidden for `manager`. Row link → edit page,
  untouched.
- `new/page.tsx`: manager redirect first; loads active Periods for the
  dropdown.
- `[id]/edit/page.tsx`: loads the row + Periods (active-filter + fallback
  on the record's own `period_id` if now inactive); computes
  `isManager`/`isFinalized = status_code === 'F'`; shows the "Finalize"
  button only when `!isFinalized && !isManager`; passes
  `readOnly={isManager || isFinalized}` and the matching `readOnlyMessage`
  to `ProformaInvoiceForm`.
- `ProformaInvoiceForm.tsx`: same `readOnly`/`disabled` pattern as every
  other form in this codebase (see any of the 26 recently-touched forms,
  e.g. `periods/PeriodForm.tsx`), extended with the `readOnlyMessage?: string`
  prop (default `'Managers have read-only access.'`) shown instead of the
  submit button when `readOnly` is true.

Verify live: create 2-3 Proforma Invoices, edit one, Finalize one, confirm
the Finalized row's edit page is fully disabled with the correct message
and the Finalize button is gone, confirm `updateProformaInvoice` against
that same row's id via a re-submitted stale form (or by re-checking the
action rejects it) actually returns the finalized error rather than
silently succeeding.

Commit: "Add proforma invoice management".

---

## Task 3 — Invoice (background agent, after Task 2 lands)

**Files (all new):** `src/app/(app)/invoices/actions.ts`, `InvoiceForm.tsx`,
`page.tsx`, `new/page.tsx`, `[id]/edit/page.tsx`.

Same shape as Task 2, plus one addition: `proforma_invoice_id` (dropdown,
required, lists ALL Proforma Invoices ordered by `code` — no active
filter, since `invoice` has no `active` column; current-value fallback on
edit still applies in case the linked Proforma somehow gets excluded from
a future filtered query, though none exists yet).

- `createInvoice`: inserts with `type_code: 'I'`, `status_code: 'D'`
  hardcoded, plus the picked `proforma_invoice_id`.
- `updateInvoice`: same finalized-guard pattern as `updateProformaInvoice`.
  Allows changing `proforma_invoice_id` on edit (no lock on which Proforma
  it's tied to pre-finalization).
- `finalizeInvoice(id)`: identical shape to `finalizeProformaInvoice`.
- List page: columns Code, **Proforma invoice** (this IS a self-referential
  embed — `invoice` embedding `invoice` via `proforma_invoice_id`. Per
  `CLAUDE.md`'s documented exception, this does NOT use the normal
  `target_table!fk_column(...)` hint form (`invoice!proforma_invoice_id(code)`
  silently resolves as the reverse one-to-many direction — wrong, no
  error). The correct form: `proforma:proforma_invoice_id(code)` — alias
  required, keyed directly by the FK column name, no table-name prefix.
  Spot-check this against a real linked row once at least one exists, not
  just an empty table — this bug shipped once already on Actual Activity's
  list page for exactly this reason.), Period, Status, Issue date.
- `new/page.tsx`: manager redirect first; loads active Periods AND all
  Proforma Invoices (plain query, `.from('invoice').select('id, code').eq('type_code', 'P').order('code')`
  — no self-embed needed here, just a filtered fetch, same as how Actual
  Activity's own `new/page.tsx` fetches Plan Activities as a plain filtered
  list rather than an embed).
- `[id]/edit/page.tsx`: `.eq('type_code', 'I')` on the fetch (so this page
  404s on a Proforma's id, symmetric with Actual Activity's `status_code`
  filter) plus everything from Task 2's edit page pattern.

Verify live: finalize the Proforma created in Task 2's verification (if
not already), create an Invoice against it, confirm the list page's
Proforma column shows the real linked code (not blank/wrong — the exact
failure mode the self-ref embed bug produces), edit it, Finalize it,
confirm disabled state. Confirm `/invoices/<a-proforma's-id>/edit` 404s.

Commit: "Add invoice management".

---

## Task 4 — Invoice Component (background agent, after Task 3 lands)

**Files (all new):** `src/app/(app)/invoice-components/actions.ts`,
`InvoiceComponentForm.tsx`, `page.tsx`, `new/page.tsx`, `[id]/edit/page.tsx`.

No deactivate/reactivate anywhere in this feature — `invoice_component`
has no `active` column. Model the flat-CRUD-plus-FK-dropdown shape on
`material-handling-items` (closest sibling: a child table linking back to
its parent via a plain dropdown, several other FK dropdowns, numeric
fields), but drop everything about active/reactivate from that template.

- **Fields**: `invoice_id` (dropdown, required — see labeling below),
  `contract_service_id` (dropdown, active-filtered + fallback, required),
  `shorebase_service_id` (dropdown, active-filtered + fallback, required),
  `company_id` (dropdown, active-filtered + fallback, required), `uom_code`
  (dropdown, plain/unfiltered, required), `price_per_uom_contract` /
  `price_per_uom_independent` / `actual_price_per_uom` (number, optional,
  `>= 0` if present), `agg_amount` (integer, optional, `>= 0` if present),
  `remark` (textarea, optional).
- **`invoice_id` dropdown labeling**: `invoice` has no unique name column,
  so build the label server-side when fetching options: fetch
  `id, code, type_code` from `invoice` (no filter — spans BOTH Proforma and
  Invoice rows, per the spec), then label each option
  `` `${row.code ?? 'Invoice #' + row.id} (${row.type_code === 'P' ? 'Proforma' : 'Invoice'})` ``
  — same composed-string convention already used for
  `ApprovalWorkflow`/`ApprovalWorkflowStage` (`Workflow #{id} ({type_code})`),
  applied here.
- `createInvoiceComponent`/`updateInvoiceComponent`: standard validate +
  insert/update, manager guard first line, no finalized-concept at all
  (that lives on `invoice`, not this table).
- List page: columns Invoice (the composed label, or just show `code`/`id`
  directly if simpler — no self-embed needed since this is a plain FK
  from a different table, not `invoice` embedding itself), Contract
  Service, Company, UoM, aggregate amount.
- `new/page.tsx` / `[id]/edit/page.tsx`: load all four dropdown sources
  (Invoices unfiltered per above, Contract Services/Shorebase
  Services/Companies active-filtered + fallback, UoM unfiltered).

Verify live: create 2-3 Invoice Components against the Proforma/Invoice
rows from Tasks 2-3, edit one, confirm the Invoice dropdown correctly
shows both a Proforma-labeled and an Invoice-labeled option.

Commit: "Add invoice component management".

---

## Task 5 — Review (background agent, after Task 4 lands)

Check the full diff against this plan and the spec: every guard placed
correctly (manager first, then finalized-check inside `update*` before
other validation), the self-referential embed in Task 3's list page uses
the `proforma:proforma_invoice_id(code)` form exactly (not the
`invoice!proforma_invoice_id` hint form), dropdown active-filtering applied
where it should be and correctly omitted for `invoice`/`uom` (no `active`
column on either), `invoice_component` genuinely has no deactivate/
reactivate anywhere, nav entries land in the right order, `readOnlyMessage`
correctly distinguishes manager-blocked from finalized-locked in both
Proforma Invoice's and Invoice's edit pages.

---

## Task 6 — Live verification, test-data cleanup, push (main session)

Full click-through as a non-manager account per the plan's verify steps
above (skip the manager-blocked recheck — Tasks 2-4's `isManagerRole()`
guards are the same helper already proven correct 26 times over; no need
to re-litigate that this session, just confirm each new feature's own
create/edit/finalize logic). Delete every test row created during
verification (`invoice_component` rows first, since they FK to `invoice`,
then `invoice` rows) via `psql`, confirm empty, then ask "confirm and I'll
push" before `git push origin main`.
