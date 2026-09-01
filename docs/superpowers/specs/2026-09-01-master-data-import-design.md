# Master data import from staging system — design

## Purpose

Import real business master data from the company's existing staging system (`staging-shorebase.barokahmarineconsulting.com`) into Companies, Contracts, Subcontractors, Equipment, Jetty & Ship, Products, Room Type, Meal Time, and Contract Services — plus two small feature changes the real data requires: an `equipment`/`jetty_ship` code field, and a new `ContractServiceTimesheetGroup` feature.

## Non-goals

- No import of Job Title, Job Position, User Position (empty on the source), Lokasi (empty, unclear it maps to anything in our schema), Contract Service Price / Shorebase Service Price (both empty).
- No Invoice import — explicitly deferred per the user's earlier direction.
- No change to Activity Status or Timesheet Type — both already match the source exactly.

## Design

### Equipment gets a required, unique `code` column

Source data has genuinely unique per-item codes (`FD30NT`, `SCC600A`, etc.). Added as `code varchar(255) not null unique`, wired into `EquipmentForm`/`actions.ts`/list page/edit page, and into every dropdown that lists equipment (Material Handling Equipment's Equipment dropdown) — option labels become `${code} — ${name}`.

### Jetty & Ship gets a required `type` column (not `code`, not unique)

Confirmed with the user: the source's "code" for ships (`MT`/`TK`/`LCT`/`AHTS`/`SPOB`/`TONGKANG`) is a vessel-type classification shared across multiple ships (two ships are both `MT`), not a per-ship identifier — naming it `code` would misleadingly imply uniqueness. Added as `type varchar(255) not null`, no unique constraint, plain text (no separate lookup table — the source has no dedicated "ship type" master-data page). Wired the same way as Equipment's code, option labels become `${type} — ${name}`.

### New feature: ContractServiceTimesheetGroup

Real data exists (`contract_service_timesheet_group`, currently `id, name` only, no `active`). Built as a trivial single-field CRUD — same shape as `Equipment`/`JettyShip`/`Product`'s original build: `name` required+unique, `active` column, full CRUD, new Master Data nav entry ("Contract Service Groups").

### ContractService gets its deferred `timesheet_group_id` wired in

Real Contract Service data uses this (2 of the 18 rows belong to the "Jetty" group). Added as an optional dropdown to `ContractServiceForm` (blank = "No timesheet group"), following the now-standard active-filtered-dropdown-with-current-value-fallback pattern.

### Master data import, in dependency order

Company (8) → Contract (1) → Subcontractors (3) → Equipment (6, with code) → Jetty & Ship (7, with type) → Product (1) → Room Type (2, direct insert, no CRUD UI) → Meal Time (4, direct insert, no CRUD UI) → ContractServiceTimesheetGroup (1: "Jetty") → ContractService (18, two of them linked to the Jetty group).

Confirmed with the user: the leftover test fixtures (Company "NewCorp Inc Ltd", Contract "Test Services Contract", its Subcontractor) get deleted first — nothing currently references them.

FK lookups in the import migration resolve by name/code via subqueries rather than hardcoded IDs, since this repo's migrations are applied by hand and row IDs aren't guaranteed to match across environments.

This is real, permanent business data — no cleanup migration follows.

## Testing

Live-verify: confirm Equipment/Jetty & Ship's new fields render in their list pages and forms; confirm Material Handling Equipment's dropdown shows the new code-prefixed labels; create/verify ContractServiceTimesheetGroup CRUD works; confirm Contract Service's new Timesheet Group dropdown persists correctly on the two Jetty rows; spot-check the imported data (company/contract/subcontractor/equipment/ship/product/contract-service counts and a few real values) via `psql` against the source screenshots taken during this session.
