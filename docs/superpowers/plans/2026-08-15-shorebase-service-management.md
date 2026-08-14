# ShorebaseService Management Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the third real CRUD feature on the ERD-derived schema — list, create, edit, and deactivate/reactivate `ShorebaseService` records, each with a Service Type and UoM — the last master-data feature `ContractService` needs before it can be built.

**Architecture:** One migration filling the schema gap the legacy-system comparison found (a `service_type` lookup table, plus grants/constraints), then the same Server Component + Server Action pattern already proven for Company and Contract, with two dropdowns on the form instead of one. Unlike Company and Contract's first pass, Deactivate/Reactivate is built correctly from the start here: it flips a real `active` column and never touches `start_date`/`end_date`.

**Tech Stack:** Next.js 16 App Router, React 19 (`useActionState`), `@supabase/ssr` server client, plain SQL migration applied via Supabase Studio's SQL editor.

## Global Constraints

- Required fields (matching the legacy form's asterisked fields): `code`, `name`, `service_type_code`, `default_uom_code`, `default_price_per_uom`. Optional: `start_date`, `end_date`, `description`.
- `active boolean not null default true` — same convention as `company`/`contract` (see `CLAUDE.md`'s Database section). Deactivate/Reactivate must flip `active` only — never `start_date`/`end_date`.
- No "Active" checkbox on the create/edit form — same as Company/Contract: a new service starts active via the DB default, and Deactivate/Reactivate is a button on the edit page only.
- No `ShorebaseServicePrice` management, no `service_type` management UI, no role-based RLS — all explicitly out of scope per the spec.
- `service_type` and `uom` get read-only (`select`-only) grants — they're dropdown sources, not editable through this feature.
- No automated test suite — verification is `npm run lint`, a production build, and manual checks against the running dev server.
- Migrations are applied by pasting the SQL into Supabase Studio's SQL editor by the project owner, never via `npx supabase db push` — verify afterward with `psql`.

---

### Task 1: Migration — service_type, required fields, active column, grants/RLS, uom reseed

**Files:**
- Create: `supabase/migrations/20260815000000_shorebase_service.sql`

**Interfaces:**
- Consumes: nothing — new migration on top of `supabase/migrations/20260814020000_clear_company_end_date_residue.sql`.
- Produces: `timesheet_shorebase.service_type(code, name)` seeded with 3 placeholder rows; `timesheet_shorebase.shorebase_service` gains `service_type_code` (FK to `service_type`), required-field constraints on `code`/`name`/`default_uom_code`/`default_price_per_uom`/`service_type_code`, and `active boolean not null default true`; `authenticated` can `select/insert/update` on `shorebase_service` and `select` on `service_type`/`uom`; `uom`'s seed data is replaced with real values. Tasks 2–5 depend on all of this being live before their browser-verification steps.

- [ ] **Step 1: Write the migration**

Create `supabase/migrations/20260815000000_shorebase_service.sql`:

```sql
-- Adds the ShorebaseService feature's schema requirements, found by
-- comparing against the real legacy production system:
-- 1. service_type - the one field the ERD never modeled at all.
-- 2. Required-field constraints matching the legacy form's asterisked
--    fields (code, name, uom, service type, default price were all
--    required there; nothing here has any existing rows to violate them).
-- 3. The active-column convention (see CLAUDE.md) - shorebase_service
--    already had an `active` column from the ERD, just not enforced as
--    not-null-default-true yet.
-- 4. Grants/RLS so the feature can read/write shorebase_service and read
--    its two dropdown lookups - uom had ZERO grants until this migration.
-- 5. Real uom seed data, replacing the generic placeholders - safe, since
--    every table that references uom.code is still empty.

begin;

create table if not exists timesheet_shorebase.service_type (
  code varchar(32) primary key,
  name varchar(255) not null
);

insert into timesheet_shorebase.service_type (code, name) values
  ('FAC', 'Facility & Equipment'),
  ('MAR', 'Marine Operations'),
  ('PER', 'Personnel Services')
on conflict (code) do nothing;

alter table timesheet_shorebase.shorebase_service
  add column if not exists service_type_code varchar(32);

alter table timesheet_shorebase.shorebase_service
  add constraint fk_shorebase_service_service_type_code
  foreign key (service_type_code) references timesheet_shorebase.service_type (code);

alter table timesheet_shorebase.shorebase_service
  alter column code set not null;
alter table timesheet_shorebase.shorebase_service
  alter column name set not null;
alter table timesheet_shorebase.shorebase_service
  alter column default_uom_code set not null;
alter table timesheet_shorebase.shorebase_service
  alter column default_price_per_uom set not null;
alter table timesheet_shorebase.shorebase_service
  alter column service_type_code set not null;

alter table timesheet_shorebase.shorebase_service
  alter column active set default true;
alter table timesheet_shorebase.shorebase_service
  alter column active set not null;

grant select, insert, update on timesheet_shorebase.shorebase_service to authenticated;
grant select on timesheet_shorebase.service_type to authenticated;
grant select on timesheet_shorebase.uom to authenticated;

alter table timesheet_shorebase.shorebase_service enable row level security;

create policy "authenticated users can read/write shorebase services"
  on timesheet_shorebase.shorebase_service
  for all
  to authenticated
  using (true)
  with check (true);

delete from timesheet_shorebase.uom;

insert into timesheet_shorebase.uom (code, name) values
  ('TON', 'Ton'),
  ('JAM', 'Jam'),
  ('M3', 'Meter Kubik'),
  ('KHR', 'Kamar/Hari'),
  ('LOT', 'Lot'),
  ('M2', 'Meter Persegi'),
  ('AMT', 'Amount')
on conflict (code) do nothing;

commit;
```

- [ ] **Step 2: Ask the project owner to apply the migration**

Paste the full contents of `supabase/migrations/20260815000000_shorebase_service.sql` into Supabase Studio's SQL editor and run it there. Wait for confirmation it ran without error before continuing to Step 3.

- [ ] **Step 3: Verify against the real database**

```bash
source <(grep '^DATABASE_URL=' .env.local | sed 's/^/export /')
psql "$DATABASE_URL" -c "select code, name from timesheet_shorebase.service_type order by code;"
psql "$DATABASE_URL" -c "\d timesheet_shorebase.shorebase_service"
psql "$DATABASE_URL" -c "select grantee, table_name, privilege_type from information_schema.role_table_grants where table_schema = 'timesheet_shorebase' and grantee = 'authenticated' and table_name in ('shorebase_service', 'service_type', 'uom') order by table_name, privilege_type;"
psql "$DATABASE_URL" -c "select code, name from timesheet_shorebase.uom order by code;"
```

Expected:
- First query returns exactly 3 rows: `FAC`, `MAR`, `PER`.
- Second query shows `service_type_code` present with the new FK, and `code`/`name`/`default_uom_code`/`default_price_per_uom`/`service_type_code`/`active` all `not null`, `active` defaulting `true`.
- Third query shows `authenticated` has `INSERT`/`SELECT`/`UPDATE` for `shorebase_service`, and `SELECT` only for `service_type` and `uom`.
- Fourth query returns exactly 7 rows: `AMT`, `JAM`, `KHR`, `LOT`, `M2`, `M3`, `TON`.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260815000000_shorebase_service.sql
git commit -m "Add service_type, required fields, and active column for shorebase_service"
```

---

### Task 2: Services list page

**Files:**
- Create: `src/app/(app)/services/page.tsx`

**Interfaces:**
- Consumes: `createClient` from `@/lib/supabase/server`. Requires Task 1's migration to be live.
- Produces: the `ServiceRow` shape, declared in this file only.

- [ ] **Step 1: Write the list page**

Create `src/app/(app)/services/page.tsx`:

```tsx
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';

type ServiceRow = {
  id: number;
  code: string;
  name: string;
  default_price_per_uom: number;
  active: boolean;
  service_type: { name: string } | null;
  uom: { name: string } | null;
};

export default async function ServicesPage() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('shorebase_service')
    .select('id, code, name, default_price_per_uom, active, service_type(name), uom(name)')
    .order('code', { ascending: true });

  const services = (data ?? []) as unknown as ServiceRow[];

  return (
    <div className="px-6 py-8">
      <div className="flex items-center justify-between">
        <div>
          <p className="font-mono text-xs font-medium tracking-[0.2em] text-zinc-500 dark:text-zinc-400">
            MASTER DATA
          </p>
          <h2 className="mt-1 text-2xl font-semibold text-zinc-950 dark:text-zinc-50">
            Services
          </h2>
        </div>
        <Link
          href="/services/new"
          className="rounded-md bg-teal-700 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-teal-800 dark:bg-teal-600 dark:hover:bg-teal-500"
        >
          Add service
        </Link>
      </div>

      {error && (
        <p role="alert" className="mt-4 text-sm text-red-600 dark:text-red-400">
          Couldn&apos;t load services: {error.message}
        </p>
      )}

      {!error && services.length === 0 && (
        <p className="mt-4 max-w-prose text-zinc-600 dark:text-zinc-400">
          No services yet. Add your first one to get started.
        </p>
      )}

      {!error && services.length > 0 && (
        <div className="mt-6 overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800">
          <table className="w-full text-sm">
            <thead className="border-b border-zinc-200 bg-zinc-50 text-left text-xs font-medium uppercase tracking-wide text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
              <tr>
                <th className="px-4 py-2">Code</th>
                <th className="px-4 py-2">Name</th>
                <th className="px-4 py-2">Type</th>
                <th className="px-4 py-2">UoM</th>
                <th className="px-4 py-2">Default price</th>
                <th className="px-4 py-2">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {services.map((service) => {
                const { active } = service;
                return (
                  <tr key={service.id}>
                    <td className="px-4 py-2 font-medium text-zinc-900 dark:text-zinc-100">
                      <Link href={`/services/${service.id}/edit`} className="hover:underline">
                        {service.code}
                      </Link>
                    </td>
                    <td className="px-4 py-2 text-zinc-600 dark:text-zinc-400">
                      {service.name}
                    </td>
                    <td className="px-4 py-2 text-zinc-600 dark:text-zinc-400">
                      {service.service_type?.name ?? '—'}
                    </td>
                    <td className="px-4 py-2 text-zinc-600 dark:text-zinc-400">
                      {service.uom?.name ?? '—'}
                    </td>
                    <td className="px-4 py-2 text-zinc-600 dark:text-zinc-400">
                      {service.default_price_per_uom}
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

The `service_type(name)` and `uom(name)` embeds rely on PostgREST auto-detecting each FK (`shorebase_service.service_type_code -> service_type.code` and `shorebase_service.default_uom_code -> uom.code`) — there's exactly one FK to each target table from `shorebase_service`, so no ambiguity and no alias/hint is needed for either, exactly matching how Contract's list page embeds `company(name)` with no alias despite the local FK column being `company_id`, not `company`. PostgREST resolves embeds by the FK's *target table name*, never the local column name — an aliased embed's target position must still name an actual table (`alias:target_table(...)`, optionally `alias:target_table!hint(...)` to disambiguate multiple FKs to the same table), never a column. The `as unknown as ServiceRow[]` cast is required for the same reason it was needed for Contract's list page (this Supabase client has no generated `Database` type, so PostgREST's embed typing can't be resolved statically) — do not remove it or replace it with a direct cast.

- [ ] **Step 2: Run lint and build**

```bash
npm run lint
npm run build
```

Expected: both succeed with no errors.

- [ ] **Step 3: Verify in the browser**

Confirm Task 1's migration is live. Navigate to `http://localhost:3000/services`.

Expected: the sidebar's "Services" link now goes to a real page (no longer "Coming soon"), showing "MASTER DATA / Services", an "Add service" button, and "No services yet. Add your first one to get started."

- [ ] **Step 4: Commit**

```bash
git add "src/app/(app)/services/page.tsx"
git commit -m "Add services list page"
```

---

### Task 3: Create service

**Files:**
- Create: `src/app/(app)/services/actions.ts`
- Create: `src/app/(app)/services/ServiceForm.tsx`
- Create: `src/app/(app)/services/new/page.tsx`

**Interfaces:**
- Consumes: `createClient` from `@/lib/supabase/server`.
- Produces: `ServiceFormState = { error: string | null }`, `Service`, `ServiceTypeOption = { code: string; name: string }`, `UomOption = { code: string; name: string }` (all exported from `ServiceForm.tsx`, `Service` imported by Task 4's edit page). `createService(prevState: ServiceFormState, formData: FormData): Promise<ServiceFormState>` (exported from `actions.ts`). `ServiceForm({ service?: Service; serviceTypes: ServiceTypeOption[]; uoms: UomOption[]; action: (prevState: ServiceFormState, formData: FormData) => Promise<ServiceFormState>; submitLabel: string })` (exported from `ServiceForm.tsx`, reused by Task 4).

- [ ] **Step 1: Write the Server Actions file**

Create `src/app/(app)/services/actions.ts`:

```ts
'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

export type ServiceFormState = {
  error: string | null;
};

export async function createService(
  _prevState: ServiceFormState,
  formData: FormData,
): Promise<ServiceFormState> {
  const code = (formData.get('code') as string | null)?.trim();
  if (!code) {
    return { error: 'Code is required.' };
  }

  const name = (formData.get('name') as string | null)?.trim();
  if (!name) {
    return { error: 'Name is required.' };
  }

  const serviceTypeCode = (formData.get('service_type_code') as string | null)?.trim();
  if (!serviceTypeCode) {
    return { error: 'Service type is required.' };
  }

  const defaultUomCode = (formData.get('default_uom_code') as string | null)?.trim();
  if (!defaultUomCode) {
    return { error: 'UoM is required.' };
  }

  const priceRaw = (formData.get('default_price_per_uom') as string | null)?.trim();
  const defaultPricePerUom = priceRaw ? Number(priceRaw) : NaN;
  if (!priceRaw || Number.isNaN(defaultPricePerUom) || defaultPricePerUom < 0) {
    return { error: 'Default price per UoM is required and must be a non-negative number.' };
  }

  const startDate = (formData.get('start_date') as string | null) || null;
  const endDate = (formData.get('end_date') as string | null) || null;
  const description = (formData.get('description') as string | null)?.trim() || null;

  const supabase = await createClient();
  const { error } = await supabase.from('shorebase_service').insert({
    code,
    name,
    service_type_code: serviceTypeCode,
    default_uom_code: defaultUomCode,
    default_price_per_uom: defaultPricePerUom,
    start_date: startDate,
    end_date: endDate,
    description,
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath('/services');
  redirect('/services');
}
```

- [ ] **Step 2: Write the shared form component**

Create `src/app/(app)/services/ServiceForm.tsx`:

```tsx
'use client';

import { useActionState } from 'react';
import type { ServiceFormState } from './actions';

export type Service = {
  id: number;
  code: string;
  name: string;
  description: string | null;
  default_uom_code: string;
  default_price_per_uom: number;
  service_type_code: string;
  start_date: string | null;
  end_date: string | null;
};

export type ServiceTypeOption = {
  code: string;
  name: string;
};

export type UomOption = {
  code: string;
  name: string;
};

const initialState: ServiceFormState = { error: null };

export function ServiceForm({
  service,
  serviceTypes,
  uoms,
  action,
  submitLabel,
}: {
  service?: Service;
  serviceTypes: ServiceTypeOption[];
  uoms: UomOption[];
  action: (prevState: ServiceFormState, formData: FormData) => Promise<ServiceFormState>;
  submitLabel: string;
}) {
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="mt-6 max-w-md space-y-4">
      <div className="space-y-1">
        <label htmlFor="code" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Code
        </label>
        <input
          id="code"
          name="code"
          type="text"
          required
          defaultValue={service?.code}
          className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-950 focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-600/40 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
        />
      </div>

      <div className="space-y-1">
        <label htmlFor="name" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Name
        </label>
        <input
          id="name"
          name="name"
          type="text"
          required
          defaultValue={service?.name}
          className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-950 focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-600/40 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
        />
      </div>

      <div className="space-y-1">
        <label htmlFor="service_type_code" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Service type
        </label>
        <select
          id="service_type_code"
          name="service_type_code"
          required
          defaultValue={service?.service_type_code ?? ''}
          className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-950 focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-600/40 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
        >
          <option value="" disabled>
            Select a service type
          </option>
          {serviceTypes.map((serviceType) => (
            <option key={serviceType.code} value={serviceType.code}>
              {serviceType.name}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-1">
        <label htmlFor="default_uom_code" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          UoM
        </label>
        <select
          id="default_uom_code"
          name="default_uom_code"
          required
          defaultValue={service?.default_uom_code ?? ''}
          className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-950 focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-600/40 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
        >
          <option value="" disabled>
            Select a UoM
          </option>
          {uoms.map((uom) => (
            <option key={uom.code} value={uom.code}>
              {uom.name}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-1">
        <label htmlFor="default_price_per_uom" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Default price per UoM
        </label>
        <input
          id="default_price_per_uom"
          name="default_price_per_uom"
          type="number"
          step="0.0001"
          min="0"
          required
          defaultValue={service?.default_price_per_uom}
          className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-950 focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-600/40 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <label htmlFor="start_date" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Start date
          </label>
          <input
            id="start_date"
            name="start_date"
            type="date"
            defaultValue={service?.start_date ?? ''}
            className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-950 focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-600/40 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
          />
        </div>
        <div className="space-y-1">
          <label htmlFor="end_date" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
            End date
          </label>
          <input
            id="end_date"
            name="end_date"
            type="date"
            defaultValue={service?.end_date ?? ''}
            className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-950 focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-600/40 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
          />
        </div>
      </div>

      <div className="space-y-1">
        <label htmlFor="description" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Description
        </label>
        <textarea
          id="description"
          name="description"
          rows={3}
          defaultValue={service?.description ?? ''}
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

- [ ] **Step 3: Write the new-service route**

Create `src/app/(app)/services/new/page.tsx`:

```tsx
import { ServiceForm } from '../ServiceForm';
import { createService } from '../actions';
import { createClient } from '@/lib/supabase/server';

export default async function NewServicePage() {
  const supabase = await createClient();

  const { data: serviceTypesData, error: serviceTypesError } = await supabase
    .from('service_type')
    .select('code, name')
    .order('name', { ascending: true });

  if (serviceTypesError) {
    return (
      <div className="px-6 py-8">
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          Couldn&apos;t load service types: {serviceTypesError.message}
        </p>
      </div>
    );
  }

  const { data: uomsData, error: uomsError } = await supabase
    .from('uom')
    .select('code, name')
    .order('name', { ascending: true });

  if (uomsError) {
    return (
      <div className="px-6 py-8">
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          Couldn&apos;t load UoMs: {uomsError.message}
        </p>
      </div>
    );
  }

  const serviceTypes = serviceTypesData ?? [];
  const uoms = uomsData ?? [];

  return (
    <div className="px-6 py-8">
      <p className="font-mono text-xs font-medium tracking-[0.2em] text-zinc-500 dark:text-zinc-400">
        MASTER DATA
      </p>
      <h2 className="mt-1 text-2xl font-semibold text-zinc-950 dark:text-zinc-50">
        Add service
      </h2>
      <ServiceForm
        serviceTypes={serviceTypes}
        uoms={uoms}
        action={createService}
        submitLabel="Create service"
      />
    </div>
  );
}
```

- [ ] **Step 4: Run lint and build**

```bash
npm run lint
npm run build
```

Expected: both succeed with no errors.

- [ ] **Step 5: Verify in the browser**

With the dev server running (and Task 1's migration confirmed live), navigate to `http://localhost:3000/services/new`. Confirm both dropdowns list real options (3 service types, 7 UoMs). Fill in code, name, both dropdowns, and a default price, leave dates/description blank, submit.

Expected: redirected to `/services`, the new row appears with the correct type/UoM names and Status "Active". Then test server-side validation: go back to `/services/new`, enter a code that's only whitespace with everything else filled in — the server trims it to empty and returns `{ error: 'Code is required.' }`; confirm that message renders inline and the page does not redirect.

- [ ] **Step 6: Commit**

```bash
git add "src/app/(app)/services/actions.ts" "src/app/(app)/services/ServiceForm.tsx" "src/app/(app)/services/new/page.tsx"
git commit -m "Add service creation form and action"
```

---

### Task 4: Edit service

**Files:**
- Modify: `src/app/(app)/services/actions.ts`
- Create: `src/app/(app)/services/[id]/edit/page.tsx`

**Interfaces:**
- Consumes: `ServiceForm`, `Service`, `ServiceTypeOption`, `UomOption` from `../../ServiceForm`; `ServiceFormState` from `../../actions`.
- Produces: `updateService(id: number, prevState: ServiceFormState, formData: FormData): Promise<ServiceFormState>`, added to `actions.ts` alongside `createService`. Task 5 adds `deactivateService`/`reactivateService` to this same file and adds a button to this same edit page.

- [ ] **Step 1: Add `updateService` to the actions file**

In `src/app/(app)/services/actions.ts`, add below `createService`:

```ts
export async function updateService(
  id: number,
  _prevState: ServiceFormState,
  formData: FormData,
): Promise<ServiceFormState> {
  const code = (formData.get('code') as string | null)?.trim();
  if (!code) {
    return { error: 'Code is required.' };
  }

  const name = (formData.get('name') as string | null)?.trim();
  if (!name) {
    return { error: 'Name is required.' };
  }

  const serviceTypeCode = (formData.get('service_type_code') as string | null)?.trim();
  if (!serviceTypeCode) {
    return { error: 'Service type is required.' };
  }

  const defaultUomCode = (formData.get('default_uom_code') as string | null)?.trim();
  if (!defaultUomCode) {
    return { error: 'UoM is required.' };
  }

  const priceRaw = (formData.get('default_price_per_uom') as string | null)?.trim();
  const defaultPricePerUom = priceRaw ? Number(priceRaw) : NaN;
  if (!priceRaw || Number.isNaN(defaultPricePerUom) || defaultPricePerUom < 0) {
    return { error: 'Default price per UoM is required and must be a non-negative number.' };
  }

  const startDate = (formData.get('start_date') as string | null) || null;
  const endDate = (formData.get('end_date') as string | null) || null;
  const description = (formData.get('description') as string | null)?.trim() || null;

  const supabase = await createClient();
  const { error } = await supabase
    .from('shorebase_service')
    .update({
      code,
      name,
      service_type_code: serviceTypeCode,
      default_uom_code: defaultUomCode,
      default_price_per_uom: defaultPricePerUom,
      start_date: startDate,
      end_date: endDate,
      description,
    })
    .eq('id', id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath('/services');
  redirect('/services');
}
```

- [ ] **Step 2: Write the edit route**

Create `src/app/(app)/services/[id]/edit/page.tsx`:

```tsx
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { ServiceForm, type Service } from '../../ServiceForm';
import { updateService } from '../../actions';

export default async function EditServicePage(props: PageProps<'/services/[id]/edit'>) {
  const { id } = await props.params;
  const serviceId = Number(id);

  if (Number.isNaN(serviceId)) {
    notFound();
  }

  const supabase = await createClient();
  const { data: service, error } = await supabase
    .from('shorebase_service')
    .select(
      'id, code, name, description, default_uom_code, default_price_per_uom, service_type_code, start_date, end_date, active',
    )
    .eq('id', serviceId)
    .maybeSingle();

  if (error) {
    return (
      <div className="px-6 py-8">
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          Couldn&apos;t load service: {error.message}
        </p>
      </div>
    );
  }

  if (!service) {
    notFound();
  }

  const { data: serviceTypesData, error: serviceTypesError } = await supabase
    .from('service_type')
    .select('code, name')
    .order('name', { ascending: true });

  if (serviceTypesError) {
    return (
      <div className="px-6 py-8">
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          Couldn&apos;t load service types: {serviceTypesError.message}
        </p>
      </div>
    );
  }

  const { data: uomsData, error: uomsError } = await supabase
    .from('uom')
    .select('code, name')
    .order('name', { ascending: true });

  if (uomsError) {
    return (
      <div className="px-6 py-8">
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          Couldn&apos;t load UoMs: {uomsError.message}
        </p>
      </div>
    );
  }

  const serviceTypes = serviceTypesData ?? [];
  const uoms = uomsData ?? [];

  const updateServiceWithId = updateService.bind(null, serviceId);

  return (
    <div className="px-6 py-8">
      <p className="font-mono text-xs font-medium tracking-[0.2em] text-zinc-500 dark:text-zinc-400">
        MASTER DATA
      </p>
      <h2 className="mt-1 text-2xl font-semibold text-zinc-950 dark:text-zinc-50">
        Edit service
      </h2>
      <ServiceForm
        service={service as Service}
        serviceTypes={serviceTypes}
        uoms={uoms}
        action={updateServiceWithId}
        submitLabel="Save changes"
      />
    </div>
  );
}
```

- [ ] **Step 3: Run lint and build**

```bash
npm run lint
npm run build
```

Expected: both succeed with no errors.

- [ ] **Step 4: Verify in the browser**

Navigate to `http://localhost:3000/services`, click the service created in Task 3. Confirm the form loads pre-filled with its code, name, both dropdowns pre-selected, and default price. Change the name and submit.

Expected: redirected to `/services`, the row's name reflects the change. Also confirm visiting `/services/999999/edit` (an id that doesn't exist) renders Next.js's 404 page, not a crash.

- [ ] **Step 5: Commit**

```bash
git add "src/app/(app)/services/actions.ts" "src/app/(app)/services/[id]/edit/page.tsx"
git commit -m "Add service edit form and action"
```

---

### Task 5: Deactivate and reactivate

**Files:**
- Modify: `src/app/(app)/services/actions.ts`
- Modify: `src/app/(app)/services/[id]/edit/page.tsx`

**Interfaces:**
- Consumes: the `updateServiceWithId` `.bind(null, serviceId)` pattern already established in Task 4's edit page.
- Produces: `deactivateService(id: number): Promise<void>` and `reactivateService(id: number): Promise<void>`, added to `actions.ts`. Nothing outside this task depends on these.

- [ ] **Step 1: Add the two actions**

In `src/app/(app)/services/actions.ts`, add below `updateService`:

```ts
export async function deactivateService(id: number) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('shorebase_service')
    .update({ active: false })
    .eq('id', id)
    .select('id');

  if (error) {
    throw new Error(error.message);
  }
  if (!data || data.length === 0) {
    throw new Error('Service not found.');
  }

  revalidatePath('/services');
  revalidatePath(`/services/${id}/edit`);
}

export async function reactivateService(id: number) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('shorebase_service')
    .update({ active: true })
    .eq('id', id)
    .select('id');

  if (error) {
    throw new Error(error.message);
  }
  if (!data || data.length === 0) {
    throw new Error('Service not found.');
  }

  revalidatePath('/services');
  revalidatePath(`/services/${id}/edit`);
}
```

- [ ] **Step 2: Add the button to the edit page**

In `src/app/(app)/services/[id]/edit/page.tsx`, update the imports and the returned JSX:

```tsx
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { ServiceForm, type Service } from '../../ServiceForm';
import { updateService, deactivateService, reactivateService } from '../../actions';

export default async function EditServicePage(props: PageProps<'/services/[id]/edit'>) {
  const { id } = await props.params;
  const serviceId = Number(id);

  if (Number.isNaN(serviceId)) {
    notFound();
  }

  const supabase = await createClient();
  const { data: service, error } = await supabase
    .from('shorebase_service')
    .select(
      'id, code, name, description, default_uom_code, default_price_per_uom, service_type_code, start_date, end_date, active',
    )
    .eq('id', serviceId)
    .maybeSingle();

  if (error) {
    return (
      <div className="px-6 py-8">
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          Couldn&apos;t load service: {error.message}
        </p>
      </div>
    );
  }

  if (!service) {
    notFound();
  }

  const { data: serviceTypesData, error: serviceTypesError } = await supabase
    .from('service_type')
    .select('code, name')
    .order('name', { ascending: true });

  if (serviceTypesError) {
    return (
      <div className="px-6 py-8">
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          Couldn&apos;t load service types: {serviceTypesError.message}
        </p>
      </div>
    );
  }

  const { data: uomsData, error: uomsError } = await supabase
    .from('uom')
    .select('code, name')
    .order('name', { ascending: true });

  if (uomsError) {
    return (
      <div className="px-6 py-8">
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          Couldn&apos;t load UoMs: {uomsError.message}
        </p>
      </div>
    );
  }

  const serviceTypes = serviceTypesData ?? [];
  const uoms = uomsData ?? [];

  const { active } = service;
  const updateServiceWithId = updateService.bind(null, serviceId);
  const deactivateServiceWithId = deactivateService.bind(null, serviceId);
  const reactivateServiceWithId = reactivateService.bind(null, serviceId);

  return (
    <div className="px-6 py-8">
      <p className="font-mono text-xs font-medium tracking-[0.2em] text-zinc-500 dark:text-zinc-400">
        MASTER DATA
      </p>
      <div className="mt-1 flex items-center justify-between">
        <h2 className="text-2xl font-semibold text-zinc-950 dark:text-zinc-50">
          Edit service
        </h2>
        <form action={active ? deactivateServiceWithId : reactivateServiceWithId}>
          <button
            type="submit"
            className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-900"
          >
            {active ? 'Deactivate' : 'Reactivate'}
          </button>
        </form>
      </div>
      <ServiceForm
        service={service as Service}
        serviceTypes={serviceTypes}
        uoms={uoms}
        action={updateServiceWithId}
        submitLabel="Save changes"
      />
    </div>
  );
}
```

- [ ] **Step 3: Run lint and build**

```bash
npm run lint
npm run build
```

Expected: both succeed with no errors.

- [ ] **Step 4: Verify in the browser**

On the service's edit page from Task 4, note its Start date/End date values (if any were set). Click "Deactivate". Confirm the button submits, the page reloads, and the button now reads "Reactivate". Navigate to `/services` and confirm the Status column shows "Inactive". Go back to the edit page, click "Reactivate", confirm the button reverts to "Deactivate" and `/services` shows "Active" again — with the dates completely unchanged throughout the whole cycle.

- [ ] **Step 5: Commit**

```bash
git add "src/app/(app)/services/actions.ts" "src/app/(app)/services/[id]/edit/page.tsx"
git commit -m "Add service deactivate/reactivate actions"
```

---

## Self-Review Notes

- **Spec coverage:** `service_type` lookup + required-field constraints + `active` column + grants/RLS + `uom` reseed ✓ (Task 1). List page with joined type/UoM names ✓ (Task 2). Create via shared form + Server Action, two dropdowns ✓ (Task 3). Edit via the same shared form ✓ (Task 4). Deactivate/Reactivate flipping `active`, never touching dates — built correctly from the start, not as a later fix ✓ (Task 5). No "Active" checkbox on the form ✓ (`ServiceForm.tsx` has no such field in Task 3). No `ShorebaseServicePrice`/`service_type` management UI — confirmed no task creates either. Nav — confirmed no task needed, `nav.ts` already has `href: '/services'`.
- **Placeholder scan:** none — every step has complete, runnable code. The `service_type` seed values themselves are explicitly labeled placeholders in the migration's comments and the design spec, which is the intended, accepted tier for this project's lookup-table seeding (not a plan defect).
- **Type consistency:** `Service` (id/code/name/description/default_uom_code/default_price_per_uom/service_type_code/start_date/end_date) defined once in `ServiceForm.tsx`, imported by the edit page (Task 4). `ServiceTypeOption`/`UomOption` (code/name) defined once in `ServiceForm.tsx`, used by both `new/page.tsx` and `[id]/edit/page.tsx` for their fetched lookup lists. `ServiceFormState` defined once in `actions.ts`, imported by `ServiceForm.tsx`. `createService`'s signature `(prevState, formData)` and `updateService`'s `(id, prevState, formData)` both match how `ServiceForm`'s `action` prop is typed and how `.bind(null, id)` is used in the edit page — same shape as Company's/Contract's equivalents. `deactivateService`/`reactivateService` take only `id`, matching the current (post-fix) `deactivateContract`/`reactivateContract` shape exactly — error-checked, zero-rows-affected guard, flips `active` only.
