# Equipment, Jetty/Ship & Product Management Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Full CRUD (list/create/edit/deactivate-reactivate) for three trivially simple reference tables — `Equipment`, `JettyShip`, `Product` — each just `name` + `active`, with new Master Data nav entries.

**Architecture:** One migration for all three tables (required `name`, unique `name`, `active` column, grants/RLS), then `nav.ts` gains three new Master Data entries. Unlike every prior multi-entity plan in this codebase, **task granularity here is coarser**: one task builds an entity's ENTIRE CRUD surface (list + create + edit + deactivate/reactivate) instead of splitting those into four separate tasks. This is a deliberate scope call, not an oversight — each entity has exactly one field (`name`) and zero FK dependencies, so the four steps that would normally be separate tasks are each only a few lines different from `JobTitle`'s already-proven pattern (this session's most recent full-CRUD-no-FK entity). Still commit after each entity finishes, so the git history stays reviewable per-entity even though it isn't reviewable per-CRUD-step.

**Tech Stack:** Next.js 16 App Router, React 19 (`useActionState`), `@supabase/ssr` server client, plain SQL migration applied via Supabase Studio's SQL editor.

## Global Constraints

- Each table: `name` required, unique, `active boolean not null default true`, full CRUD.
- Deactivate/Reactivate flips `active` only, never `name`.
- None of the three tables have an existing nav placeholder — all three join the Master Data group, appended after `Subcontractors`: **Equipment** (`/equipment`), **Jetty & Ship** (`/jetty-ships`), **Products** (`/products`).
- No dropdown-source fetches anywhere in this feature — no entity has an FK. Every `new/page.tsx` is a plain non-async component, same as `JobTitle`'s.
- No automated test suite — verification is `npm run lint`, a production build, and manual checks against the running dev server.
- Migrations are applied by pasting the SQL into Supabase Studio's SQL editor by the project owner, never via `npx supabase db push` — verify afterward with `psql`.

---

### Task 1: Migration + nav.ts — equipment, jetty_ship, product

**Files:**
- Create: `supabase/migrations/20260826120000_equipment_jetty_ship_product.sql`
- Modify: `src/components/app-shell/nav.ts`

- [ ] **Step 1: Write the migration**

Create `supabase/migrations/20260826120000_equipment_jetty_ship_product.sql`:

```sql
-- Adds required/unique name and the active-column convention (see
-- CLAUDE.md) for equipment, jetty_ship, and product - three trivially
-- simple reference tables (name only) that will later be dropdown
-- sources for MaterialHandlingEquipment/Timesheet/Activity respectively.

begin;

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

commit;
```

- [ ] **Step 2: Ask the project owner to apply the migration**

Paste the full contents into Supabase Studio's SQL editor and run it. Wait for confirmation before continuing.

- [ ] **Step 3: Verify against the real database**

```bash
source <(grep '^DATABASE_URL=' .env.local | sed 's/^/export /')
psql "$DATABASE_URL" -c "\d timesheet_shorebase.equipment"
psql "$DATABASE_URL" -c "\d timesheet_shorebase.jetty_ship"
psql "$DATABASE_URL" -c "\d timesheet_shorebase.product"
psql "$DATABASE_URL" -c "select tablename, policyname, cmd, roles from pg_policies where schemaname = 'timesheet_shorebase' and tablename in ('equipment','jetty_ship','product');"
```

Expected: each table shows `name`/`active` `not null`, `active` defaults `true`, a `uq_<table>_name` unique constraint present; three RLS policies, one per table, `cmd = ALL`, `roles = {authenticated}`.

- [ ] **Step 4: Update the nav**

In `src/components/app-shell/nav.ts`, add three new icons to the `lucide-react` import (keep alphabetically sorted): `HardHat` (for Equipment — goes between `Handshake` and `Layers`), `PackageSearch` (for Products — goes between `Network` and `Receipt`), `Ship` (for Jetty & Ship — goes between `Settings2` and `Stamp`):

```ts
import {
  Activity,
  BedDouble,
  Building2,
  CalendarRange,
  ClipboardList,
  Container,
  FileSignature,
  FileStack,
  HardHat,
  Handshake,
  Layers,
  LayoutDashboard,
  Network,
  PackageSearch,
  Receipt,
  Settings2,
  Ship,
  Stamp,
  Tag,
  UserCog,
  UtensilsCrossed,
  Users,
  Wrench,
  type LucideIcon,
} from 'lucide-react';
```

In the Master Data group, append three entries after `Subcontractors`:

```ts
  {
    label: 'Master Data',
    items: [
      { label: 'Companies', icon: Building2, href: '/companies' },
      { label: 'Contracts', icon: FileSignature, href: '/contracts' },
      { label: 'Contract Services', icon: Layers, href: '/contract-services' },
      { label: 'Services', icon: Wrench, href: '/services' },
      { label: 'Periods', icon: CalendarRange, href: '/periods' },
      { label: 'Subcontractors', icon: Handshake, href: '/subcontractors' },
      { label: 'Equipment', icon: HardHat, href: '/equipment' },
      { label: 'Jetty & Ship', icon: Ship, href: '/jetty-ships' },
      { label: 'Products', icon: PackageSearch, href: '/products' },
    ],
  },
```

- [ ] **Step 5: Run lint and build**

```bash
npm run lint
npm run build
```

- [ ] **Step 6: Verify in the browser**

Navigate to `http://localhost:3000`. Confirm the Master Data group now shows "Equipment", "Jetty & Ship", "Products" after "Subcontractors" (each still "Coming soon").

- [ ] **Step 7: Commit**

```bash
git add supabase/migrations/20260826120000_equipment_jetty_ship_product.sql "src/components/app-shell/nav.ts"
git commit -m "Add equipment/jetty_ship/product schema changes and new Master Data nav entries"
```

---

### Task 2: Equipment — full CRUD

**Files:**
- Create: `src/app/(app)/equipment/page.tsx`
- Create: `src/app/(app)/equipment/actions.ts`
- Create: `src/app/(app)/equipment/EquipmentForm.tsx`
- Create: `src/app/(app)/equipment/new/page.tsx`
- Create: `src/app/(app)/equipment/[id]/edit/page.tsx`

**Interfaces:**
- Produces: `EquipmentFormState = { error: string | null }`, `Equipment`, all in `EquipmentForm.tsx`. `createEquipment`, `updateEquipment`, `deactivateEquipment`, `reactivateEquipment` in `actions.ts`.

- [ ] **Step 1: List page**

Create `src/app/(app)/equipment/page.tsx`:

```tsx
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';

type EquipmentRow = {
  id: number;
  name: string;
  active: boolean;
};

export default async function EquipmentPage() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('equipment')
    .select('id, name, active')
    .order('name', { ascending: true });

  const equipment = (data ?? []) as unknown as EquipmentRow[];

  return (
    <div className="px-6 py-8">
      <div className="flex items-center justify-between">
        <div>
          <p className="font-mono text-xs font-medium tracking-[0.2em] text-zinc-500 dark:text-zinc-400">
            MASTER DATA
          </p>
          <h2 className="mt-1 text-2xl font-semibold text-zinc-950 dark:text-zinc-50">
            Equipment
          </h2>
        </div>
        <Link
          href="/equipment/new"
          className="rounded-md bg-teal-700 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-teal-800 dark:bg-teal-600 dark:hover:bg-teal-500"
        >
          Add equipment
        </Link>
      </div>

      {error && (
        <p role="alert" className="mt-4 text-sm text-red-600 dark:text-red-400">
          Couldn&apos;t load equipment: {error.message}
        </p>
      )}

      {!error && equipment.length === 0 && (
        <p className="mt-4 max-w-prose text-zinc-600 dark:text-zinc-400">
          No equipment yet. Add your first one to get started.
        </p>
      )}

      {!error && equipment.length > 0 && (
        <div className="mt-6 overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800">
          <table className="w-full text-sm">
            <thead className="border-b border-zinc-200 bg-zinc-50 text-left text-xs font-medium uppercase tracking-wide text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
              <tr>
                <th className="px-4 py-2">Name</th>
                <th className="px-4 py-2">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {equipment.map((item) => {
                const { active } = item;
                return (
                  <tr key={item.id}>
                    <td className="px-4 py-2 font-medium text-zinc-900 dark:text-zinc-100">
                      <Link href={`/equipment/${item.id}/edit`} className="hover:underline">
                        {item.name}
                      </Link>
                    </td>
                    <td className="px-4 py-2">
                      <span
                        className={
                          active
                            ? 'rounded-full bg-teal-50 px-2 py-0.5 text-xs font-medium text-teal-800 dark:bg-teal-950/40 dark:text-teal-300'
                            : 'rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400'
                        }
                      >
                        {active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Actions**

Create `src/app/(app)/equipment/actions.ts`:

```ts
'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

export type EquipmentFormState = {
  error: string | null;
};

export async function createEquipment(
  _prevState: EquipmentFormState,
  formData: FormData,
): Promise<EquipmentFormState> {
  const name = (formData.get('name') as string | null)?.trim();
  if (!name) {
    return { error: 'Name is required.' };
  }

  const supabase = await createClient();
  const { error } = await supabase.from('equipment').insert({ name });

  if (error) {
    return { error: error.message };
  }

  revalidatePath('/equipment');
  redirect('/equipment');
}

export async function updateEquipment(
  id: number,
  _prevState: EquipmentFormState,
  formData: FormData,
): Promise<EquipmentFormState> {
  const name = (formData.get('name') as string | null)?.trim();
  if (!name) {
    return { error: 'Name is required.' };
  }

  const supabase = await createClient();
  const { error } = await supabase.from('equipment').update({ name }).eq('id', id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath('/equipment');
  redirect('/equipment');
}

export async function deactivateEquipment(id: number) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('equipment')
    .update({ active: false })
    .eq('id', id)
    .select('id');

  if (error) {
    throw new Error(error.message);
  }
  if (!data || data.length === 0) {
    throw new Error('Equipment not found.');
  }

  revalidatePath('/equipment');
  revalidatePath(`/equipment/${id}/edit`);
}

export async function reactivateEquipment(id: number) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('equipment')
    .update({ active: true })
    .eq('id', id)
    .select('id');

  if (error) {
    throw new Error(error.message);
  }
  if (!data || data.length === 0) {
    throw new Error('Equipment not found.');
  }

  revalidatePath('/equipment');
  revalidatePath(`/equipment/${id}/edit`);
}
```

- [ ] **Step 3: Form component**

Create `src/app/(app)/equipment/EquipmentForm.tsx`:

```tsx
'use client';

import { useActionState } from 'react';
import type { EquipmentFormState } from './actions';

export type Equipment = {
  id: number;
  name: string;
};

const initialState: EquipmentFormState = { error: null };

export function EquipmentForm({
  equipment,
  action,
  submitLabel,
}: {
  equipment?: Equipment;
  action: (prevState: EquipmentFormState, formData: FormData) => Promise<EquipmentFormState>;
  submitLabel: string;
}) {
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="mt-6 max-w-md space-y-4">
      <div className="space-y-1">
        <label htmlFor="name" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Name
        </label>
        <input
          id="name"
          name="name"
          type="text"
          required
          defaultValue={equipment?.name}
          className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-950 focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-600/40 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
        />
      </div>

      {state.error && (
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          {state.error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-teal-700 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-teal-800 focus:outline-none focus:ring-2 focus:ring-teal-600/40 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-teal-600 dark:hover:bg-teal-500"
      >
        {pending ? 'Saving…' : submitLabel}
      </button>
    </form>
  );
}
```

- [ ] **Step 4: New route**

Create `src/app/(app)/equipment/new/page.tsx`:

```tsx
import { EquipmentForm } from '../EquipmentForm';
import { createEquipment } from '../actions';

export default function NewEquipmentPage() {
  return (
    <div className="px-6 py-8">
      <p className="font-mono text-xs font-medium tracking-[0.2em] text-zinc-500 dark:text-zinc-400">
        MASTER DATA
      </p>
      <h2 className="mt-1 text-2xl font-semibold text-zinc-950 dark:text-zinc-50">
        Add equipment
      </h2>
      <EquipmentForm action={createEquipment} submitLabel="Create equipment" />
    </div>
  );
}
```

- [ ] **Step 5: Edit route (with Deactivate/Reactivate from the start — no separate later task this time)**

Create `src/app/(app)/equipment/[id]/edit/page.tsx`:

```tsx
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { EquipmentForm, type Equipment } from '../../EquipmentForm';
import { updateEquipment, deactivateEquipment, reactivateEquipment } from '../../actions';

export default async function EditEquipmentPage(props: PageProps<'/equipment/[id]/edit'>) {
  const { id } = await props.params;
  const equipmentId = Number(id);

  if (Number.isNaN(equipmentId)) {
    notFound();
  }

  const supabase = await createClient();
  const { data: equipment, error } = await supabase
    .from('equipment')
    .select('id, name, active')
    .eq('id', equipmentId)
    .maybeSingle();

  if (error) {
    return (
      <div className="px-6 py-8">
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          Couldn&apos;t load equipment: {error.message}
        </p>
      </div>
    );
  }

  if (!equipment) {
    notFound();
  }

  const { active } = equipment;
  const updateEquipmentWithId = updateEquipment.bind(null, equipmentId);
  const deactivateEquipmentWithId = deactivateEquipment.bind(null, equipmentId);
  const reactivateEquipmentWithId = reactivateEquipment.bind(null, equipmentId);

  return (
    <div className="px-6 py-8">
      <p className="font-mono text-xs font-medium tracking-[0.2em] text-zinc-500 dark:text-zinc-400">
        MASTER DATA
      </p>
      <div className="mt-1 flex items-center justify-between">
        <h2 className="text-2xl font-semibold text-zinc-950 dark:text-zinc-50">
          Edit equipment
        </h2>
        <form action={active ? deactivateEquipmentWithId : reactivateEquipmentWithId}>
          <button
            type="submit"
            className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-900"
          >
            {active ? 'Deactivate' : 'Reactivate'}
          </button>
        </form>
      </div>
      <EquipmentForm equipment={equipment as Equipment} action={updateEquipmentWithId} submitLabel="Save changes" />
    </div>
  );
}
```

- [ ] **Step 6: Run lint and build**

```bash
npm run lint
npm run build
```

- [ ] **Step 7: Verify in the browser**

Navigate to `/equipment/new`, create one (e.g. "Test Excavator"). Confirm redirect and row appears. Submit the same name again — confirm the unique-constraint error surfaces via `state.error`, no crash. Edit the row, change the name, confirm it saves. Cycle Deactivate → confirm "Inactive" → Reactivate → confirm "Active", name unchanged throughout (verify via `psql`). Confirm `/equipment/999999/edit` renders a 404.

- [ ] **Step 8: Commit**

```bash
git add "src/app/(app)/equipment/"
git commit -m "Add equipment management (list, create, edit, deactivate/reactivate)"
```

---

### Task 3: Jetty & Ship — full CRUD

**Files:**
- Create: `src/app/(app)/jetty-ships/page.tsx`
- Create: `src/app/(app)/jetty-ships/actions.ts`
- Create: `src/app/(app)/jetty-ships/JettyShipForm.tsx`
- Create: `src/app/(app)/jetty-ships/new/page.tsx`
- Create: `src/app/(app)/jetty-ships/[id]/edit/page.tsx`

Identical shape to Task 2's Equipment feature — copy that exact structure with these substitutions: `equipment` → `jetty_ship` (Supabase table name), `Equipment`/`equipment` → `JettyShip`/`jettyShip` (types/variables), route segment `/equipment` → `/jetty-ships`, page heading "Equipment"/"Add equipment"/"Edit equipment" → "Jetty & Ship"/"Add jetty/ship"/"Edit jetty/ship", not-found messages "Equipment not found."/"Couldn't load equipment" → "Jetty/ship not found."/"Couldn't load jetty/ship", empty-state "No equipment yet." → "No jetty/ship records yet.". Eyebrow stays "MASTER DATA".

- [ ] **Step 1-6: Build all five files following Task 2's exact structure with the substitutions above.**

- [ ] **Step 7: Run lint and build**

```bash
npm run lint
npm run build
```

- [ ] **Step 8: Verify in the browser**

Same verification shape as Task 2: create (e.g. "Test Ship One"), confirm duplicate-name error, edit, deactivate/reactivate cycle, 404 check.

- [ ] **Step 9: Commit**

```bash
git add "src/app/(app)/jetty-ships/"
git commit -m "Add jetty/ship management (list, create, edit, deactivate/reactivate)"
```

---

### Task 4: Products — full CRUD

**Files:**
- Create: `src/app/(app)/products/page.tsx`
- Create: `src/app/(app)/products/actions.ts`
- Create: `src/app/(app)/products/ProductForm.tsx`
- Create: `src/app/(app)/products/new/page.tsx`
- Create: `src/app/(app)/products/[id]/edit/page.tsx`

Identical shape to Task 2's Equipment feature — copy that exact structure with these substitutions: `equipment` → `product` (Supabase table name), `Equipment`/`equipment` → `Product`/`product` (types/variables), route segment `/equipment` → `/products`, page heading/labels "Equipment"/"Add equipment"/"Edit equipment" → "Products"/"Add product"/"Edit product", not-found messages → "Product not found."/"Couldn't load product", empty-state → "No products yet.". Eyebrow stays "MASTER DATA".

- [ ] **Step 1-6: Build all five files following Task 2's exact structure with the substitutions above.**

- [ ] **Step 7: Run lint and build**

```bash
npm run lint
npm run build
```

- [ ] **Step 8: Verify in the browser**

Same verification shape as Task 2: create (e.g. "Test Product One"), confirm duplicate-name error, edit, deactivate/reactivate cycle, 404 check.

- [ ] **Step 9: Commit**

```bash
git add "src/app/(app)/products/"
git commit -m "Add product management (list, create, edit, deactivate/reactivate)"
```

---

## Self-Review Notes

- **Spec coverage:** all three tables get required+unique `name`, `active` column, grants/RLS ✓ (Task 1). Three new Master Data nav entries with distinct icons ✓ (Task 1). Full CRUD per entity, Deactivate/Reactivate built into the edit page from the start (no separate task, given the coarser granularity for this feature) ✓ (Tasks 2-4).
- **Placeholder scan:** Task 2 has complete code for all five files. Tasks 3-4 are specified as "copy Task 2's structure with these substitutions" rather than repeating ~450 lines of near-identical code three times — the substitution table is exhaustive (every string that differs is named), so this is a complete spec, not a placeholder, even though it isn't literally inlined.
- **Type consistency:** `Equipment`/`EquipmentFormState` (equipment feature), `JettyShip`/`JettyShipFormState` (jetty-ships feature), `Product`/`ProductFormState` (products feature) — each defined once within its own feature, no cross-feature imports, matching every prior feature's per-route-folder convention.
- **Naming note for the implementer:** table name is `jetty_ship` (singular), route is `/jetty-ships` (plural, matching the nav label "Jetty & Ship" conceptually covering both a jetty and a ship) — don't let the route's plural leak into the Supabase `.from('jetty_ship')` calls, which must stay singular to match the real table name.
