# Material Handling management — design

## Purpose

Build the sixteenth real CRUD area on the ERD-derived schema: `MaterialHandlingJob` (a job performed by a subcontractor against a contract service), and its two child tables, `MaterialHandlingItem` (products moved, with quantity/uom/unit size) and `MaterialHandlingEquipment` (equipment used on the job). All three tables are currently empty.

## Non-goals

- **No nested master-detail UI.** Confirmed with the project owner: Job, Item, and Equipment each get their own flat top-level CRUD page — Item and Equipment link back to their Job via a "Job" dropdown, the same pattern `Actual Activity` uses to link back to `Plan Activity`. This is a genuine departure from a more "natural" nested form, but keeps the UI consistent with every other feature in this codebase (all flat single-table forms with FK dropdowns), and is a smaller build. Revisit only if real usage proves the dropdown-based linking too awkward.
- No one-to-one enforcement between a Job and its Items/Equipment counts — a Job's dropdown shows every Job regardless of how many Items/Equipment already reference it, same "no new uniqueness without a clear business rule" precedent as `Subcontractors`/`PersonAccomodation`/`PersonMeal`/`Actual Activity`.
- No role-based access control — same single permissive RLS policy pattern as every prior feature.
- No hard-delete — deactivate via `active`, same precedent as every prior feature.
- `activity.mh_product_id` stays unwired (already noted as deferred in the ERD roadmap) — Material Handling's own `material_handling_item.product_id` is a separate, unrelated FK to `product` and is in scope here.

## Design

### Schema: `active` column on all three tables

None of the three tables have an ERD status field. Per the established convention, all three get `active boolean not null default true`, with Deactivate/Reactivate touching only that column — consistent even though Item/Equipment are logically "child" rows, matching how `PersonAccomodation`/`PersonMeal`/`UserPosition` (all logically subordinate to another entity) still each got their own independent `active` column.

### Required fields, decided per table

No NOT NULL constraints exist yet beyond primary keys. Adding constraints matching what each form treats as mandatory, same process as every prior feature:

- **`material_handling_job`**: `contract_service_id`, `sub_contractor_id`, `name`, `job_date` required. `job_start`/`job_finish` stay optional — a job can be scheduled (has a `job_date`) before it has actually started or finished.
- **`material_handling_item`**: `job_id`, `product_id`, `quantity`, `uom` required (all four are the substance of "what moved and how much"). `unit_size` stays optional — a per-unit size/weight figure, not always applicable.
- **`material_handling_equipment`**: `job_id`, `equipment_id` required — the table has no other columns, so both are the whole record.

### `uom` column naming: exception carried over, not new

`material_handling_item.uom` (not `uom_code`) is a plain `varchar` FK to `uom(code)` — same naming quirk as `activity.uom_code` being the odd one out elsewhere, just the reverse: here the ERD's column is literally named `uom`. The FK constraint (`fk_material_handling_item_uom`) already exists. No embed needed for the list page (Item's list shows quantity/uom text directly, not a joined name) but the **form**'s dropdown needs `uom(code, name)` fetched as a plain query, labeled by `name`, submitted as `code`.

### Dropdown sources and embeds (all previously-established patterns, no new syntax)

- **Job's own dropdowns**: `contract_service` → `id, code` (plain query, labeled by `code`, same as `Plan Activity`'s contract service dropdown); `subcontractors` → `id, company(name)` (one-level embed, labeled `company?.name ?? Subcontractor #{id}`, same as `Plan Activity`'s subcontractor dropdown).
- **Item's own dropdowns**: `material_handling_job` → `id, name` (plain query, labeled by `name`); `product` → `id, name` (plain query); `uom` → `code, name` (plain query, labeled by `name`, submitted as `code`).
- **Equipment's own dropdowns**: `material_handling_job` → `id, name` (plain query); `equipment` → `id, name` (plain query).
- **List pages' own embeds** (read-only display, one-level, standard "no hint needed" rule — none of these tables have more than one FK to the same target): Item's list embeds `material_handling_job(name)` to show which job each item belongs to; Equipment's list embeds `material_handling_job(name)` and `equipment(name)` the same way.

### Grants

`material_handling_job`, `material_handling_item`, `material_handling_equipment` currently have zero grants to `authenticated` (checked via `psql` before writing this spec) — all three need `grant select, insert, update` in the migration. Their dropdown sources (`equipment`, `product`, `subcontractors`, `uom`, `contract_service`) are already granted from prior features — verified, no gap there.

### Fields

**Material Handling Job** — Required: Contract service (dropdown), Subcontractor (dropdown), Name (text), Job date (date). Optional: Job start (datetime-local), Job finish (datetime-local). Not on the form: Active (its own Deactivate/Reactivate button).

**Material Handling Item** — Required: Job (dropdown), Product (dropdown), Quantity (number, decimals allowed), UoM (dropdown). Optional: Unit size (number, decimals allowed). Not on the form: Active.

**Material Handling Equipment** — Required: Job (dropdown), Equipment (dropdown). Not on the form: Active.

### Navigation

`nav.ts` already carries a single placeholder `{ label: 'Material Handling', icon: Container, href: '/material-handling' }` in the Operations group. This gets replaced with three items, same treatment as the `Equipment`/`Jetty & Ship`/`Products` split:

- `{ label: 'MH Jobs', icon: Container, href: '/material-handling-jobs' }`
- `{ label: 'MH Items', icon: PackageSearch, href: '/material-handling-items' }` (reusing Product's icon makes sense since items are products-in-motion; a distinct icon will be picked at build time if a clash reads poorly)
- `{ label: 'MH Equipment', icon: HardHat, href: '/material-handling-equipment' }` (reusing Equipment's icon, same reasoning)

Shortened "MH" prefix used in the nav label only (matches this codebase's existing pattern of favoring short nav labels — e.g. "Accommodation", not "Person Accommodation"); routes, page titles, and code stay fully spelled out ("Material Handling Jobs", etc.).

### Routes (×3, same shape as every prior flat entity)

- `src/app/(app)/material-handling-jobs/{page.tsx, new/page.tsx, [id]/edit/page.tsx, MaterialHandlingJobForm.tsx, actions.ts}`
- `src/app/(app)/material-handling-items/{page.tsx, new/page.tsx, [id]/edit/page.tsx, MaterialHandlingItemForm.tsx, actions.ts}`
- `src/app/(app)/material-handling-equipment/{page.tsx, new/page.tsx, [id]/edit/page.tsx, MaterialHandlingEquipmentForm.tsx, actions.ts}`

Each `actions.ts` exports `create*`, `update*`, `deactivate*`, `reactivate*` — no derivation helpers needed anywhere in this feature (unlike `Activity`/`PersonAccomodation`), since none of these tables snapshot values from a linked row.

## Testing

No automated tests. Manual verification: create a Job, confirm it appears in Item's and Equipment's Job dropdowns; create an Item and an Equipment row against it; confirm each list page's embedded Job/Product/Equipment names render correctly; edit each row and confirm the Job link can be changed; deactivate/reactivate each of the three independently and confirm no cross-table side effects (e.g. deactivating a Job does not touch its Items/Equipment rows, consistent with "no cascading state" everywhere else in this codebase).
