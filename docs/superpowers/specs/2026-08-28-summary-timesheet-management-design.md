# Summary Timesheet management — design

## Purpose

Build the 24th real CRUD area: `SummaryTimesheet`, a period/contract/company-scoped rollup document (`period_id`/`type_code`/`contract_id`/`company_id`/`code`/`issue_date`). This is a standalone flat entity — no self-reference, no Plan/Actual-style duality, and (per the schema) no explicit join table linking individual `Timesheet` rows into a summary; the only existing reference to it is `Approval.summary_timesheet_id`, left deferred until now.

## Non-goals

- **No wiring of `Approval.summary_timesheet_id`.** Confirmed out of scope for this feature — `Approval` stays hardcoded to `type_code = 'T'` (Timesheet-only) as decided in the Approvals design spec. Revisit once there's a clear business need to approve Summary Timesheets directly, since that would also mean relaxing `Approval`'s hardcoded type.
- No role-based access control, no hard-delete (deactivate via `active`) — same precedent as every prior feature.

## Design

### All fields required, `active` column added

Unlike `ApprovalWorkflow`'s optional scoping filters, `SummaryTimesheet`'s fields are the concrete identity of a generated document, not broad filters — `period_id`, `type_code`, `contract_id`, `company_id`, `code`, `issue_date` are all required. `active boolean not null default true` added per the universal convention (no ERD status field distinct from soft-delete), Deactivate/Reactivate touching only that column.

### No derivation — every field is independently chosen

Unlike `Timesheet` (which derives `company_id`/`service_id`/`uom_code` from a chosen Contract Service), `SummaryTimesheet` has no contract-service-shaped source row to derive from — `contract_id` and `company_id` are both plain independent dropdowns, same as `ApprovalWorkflow`'s.

### Dropdown sources (all previously-established shapes, no new syntax)

- **Period** → `id, name` (plain query) — reused exactly as `Timesheet`'s own Period dropdown.
- **Timesheet type** → `code, name` (plain query) — reused exactly as `Timesheet`/`ApprovalWorkflow`'s own Timesheet type dropdown.
- **Contract** → `id, contract_name` (plain query) — reused exactly as `ApprovalWorkflow`'s own Contract dropdown (first-established there).
- **Company** → `id, name` (plain query) — reused exactly as `ApprovalWorkflow`'s own Company dropdown.
- **List page's own embeds** (read-only, one-level, standard no-hint rule — verified via `pg_constraint` that `summary_timesheet` has exactly one FK to each target): `period(name)`, `contract(contract_name)`, `company(name)`.

### Grants

`summary_timesheet` currently has zero grants to `authenticated` — needs `grant select, insert, update` in the migration. Every dropdown source (`period`, `timesheet_type`, `contract`, `company`) is already granted from prior features — verified, no gap.

### Fields

**Required**: Period (dropdown), Timesheet type (dropdown), Contract (dropdown), Company (dropdown), Code (text), Issue date (date).
**Not on form**: Active (its own Deactivate/Reactivate button).

### Routes

- `src/app/(app)/summary-timesheets/{page.tsx, new/page.tsx, [id]/edit/page.tsx, SummaryTimesheetForm.tsx, actions.ts}`

Nav: `nav.ts` already has `{ label: 'Summary Timesheets', icon: FileStack, href: '/summary-timesheets' }` in Approvals & Billing — no nav changes needed, it just stops resolving to "Coming soon" once the real route exists.

## Testing

No automated tests. Manual verification: create a Summary Timesheet against real Period/Contract/Company, confirm the list shows all three names correctly; edit it, change the linked Contract, confirm it persists; deactivate/reactivate, confirm every other field stays untouched.
