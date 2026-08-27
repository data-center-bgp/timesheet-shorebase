# Equipment, Jetty/Ship & Product management — design

## Purpose

Build the eleventh real CRUD area on the ERD-derived schema: three trivially simple reference tables — `Equipment`, `JettyShip`, `Product` — each currently just `id` + `name` with no other columns. They're grouped into one feature because they're structurally identical and small, not because they're related to each other. Each will later be a dropdown source for an Operations-group entity: `Equipment` for `MaterialHandlingEquipment`, `JettyShip` for `Timesheet`, `Product` for `Activity`/`MaterialHandlingItem`.

## Non-goals

- No filtering/relationship logic — these are pure name-only lookups.
- No role-based access control — same single permissive RLS policy pattern as every prior feature.
- No hard-delete — deactivate via `active`, same precedent as every table without an ERD status field (`Subcontractors`, `PersonAccomodation`, `PersonMeal`, `JobTitle`, `JobPosition`).

## Design

### Schema (same shape, three times)

Each table gets: `name` required, a unique constraint on `name` (these are pure name-identified lookups — same rationale as `ShorebaseService.code`/`JobTitle.code`, just using `name` itself as the identifier since there's no separate code column here), and `active boolean not null default true`.

```sql
alter table timesheet_shorebase.equipment alter column name set not null;
alter table timesheet_shorebase.equipment add constraint uq_equipment_name unique (name);
alter table timesheet_shorebase.equipment add column active boolean not null default true;
grant select, insert, update on timesheet_shorebase.equipment to authenticated;
alter table timesheet_shorebase.equipment enable row level security;
create policy "authenticated users can read/write equipment"
  on timesheet_shorebase.equipment for all to authenticated using (true) with check (true);

alter table timesheet_shorebase.jetty_ship alter column name set not null;
alter table timesheet_shorebase.jetty_ship add constraint uq_jetty_ship_name unique (name);
alter table timesheet_shorebase.jetty_ship add column active boolean not null default true;
grant select, insert, update on timesheet_shorebase.jetty_ship to authenticated;
alter table timesheet_shorebase.jetty_ship enable row level security;
create policy "authenticated users can read/write jetty ships"
  on timesheet_shorebase.jetty_ship for all to authenticated using (true) with check (true);

alter table timesheet_shorebase.product alter column name set not null;
alter table timesheet_shorebase.product add constraint uq_product_name unique (name);
alter table timesheet_shorebase.product add column active boolean not null default true;
grant select, insert, update on timesheet_shorebase.product to authenticated;
alter table timesheet_shorebase.product enable row level security;
create policy "authenticated users can read/write products"
  on timesheet_shorebase.product for all to authenticated using (true) with check (true);
```

### Fields

**Required**: Name (text) — the only field on any of these forms, besides Active (its own Deactivate/Reactivate button).

### Navigation

None of the three have an existing nav placeholder (unlike every People-group feature this session). All three join the **Master Data** group (the existing home for simple reference/lookup entities — Companies, Contracts, Contract Services, Services, Periods, Subcontractors), appended after Subcontractors: **Equipment** (`/equipment`), **Jetty & Ship** (`/jetty-ships`), **Products** (`/products`).

### Routes (×3, identical shape)

- `/equipment`, `/equipment/new`, `/equipment/[id]/edit`
- `/jetty-ships`, `/jetty-ships/new`, `/jetty-ships/[id]/edit`
- `/products`, `/products/new`, `/products/[id]/edit`

Each: list (Name, Status), create (Name only), edit, Deactivate/Reactivate — the simplest full-CRUD shape in this codebase, no FK dropdowns anywhere.

## Testing

No automated tests. Manual verification per entity: create, confirm the unique `name` constraint produces a clear error on a duplicate; edit; deactivate/reactivate, confirm `name` stays untouched.
