# Material Handling Management Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Full CRUD (list/create/edit/deactivate-reactivate) for `MaterialHandlingJob`, `MaterialHandlingItem`, and `MaterialHandlingEquipment` — three flat, separately-navigable pages, with Item/Equipment linking back to their Job via a dropdown (no nested master-detail UI).

**Architecture:** One migration for all three tables (required-field constraints, `active` column, grants/RLS), then `nav.ts` swaps its single `/material-handling` placeholder for three real entries. One task per entity's entire CRUD surface (list + create + edit + deactivate/reactivate together), same granularity precedent as `Equipment`/`JettyShip`/`Product`, but each entity here has real FK dropdowns so each task is fully spelled out rather than "copy with substitutions".

**Tech Stack:** Next.js 16 App Router, React 19 (`useActionState`), `@supabase/ssr` server client, plain SQL migration applied via Supabase Studio's SQL editor.

## Global Constraints

- `active boolean not null default true` on all three tables; Deactivate/Reactivate flips only that column.
- `material_handling_job`: `contract_service_id`, `sub_contractor_id`, `name`, `job_date` required; `job_start`/`job_finish` stay optional.
- `material_handling_item`: `job_id`, `product_id`, `quantity`, `uom` required; `unit_size` stays optional.
- `material_handling_equipment`: `job_id`, `equipment_id` required (its only two non-PK columns).
- `job_start`/`job_finish` are `timestamptz` — same `datetime-local` input + UTC-getter round-trip pattern as `Person.ended_at` (`toDatetimeLocalValue`, duplicated locally in this feature's own form file per this codebase's per-route-folder convention).
- `material_handling_item.uom` is a plain `varchar` column (not `uom_code`) FK'd to `uom(code)` — submit/store the code, display the name in the dropdown, same as every other `uom` usage in this codebase.
- Dropdown sources already granted to `authenticated` from prior features: `equipment`, `product`, `subcontractors`, `uom`, `contract_service`. Only the three new tables need grants in this migration.
- Nav: replace the single existing `{ label: 'Material Handling', icon: Container, href: '/material-handling' }` placeholder in the Operations group with three entries — **MH Jobs** (`/material-handling-jobs`, `Container`), **MH Items** (`/material-handling-items`, `PackageSearch`), **MH Equipment** (`/material-handling-equipment`, `HardHat`). All three icons are already imported in `nav.ts` — no import changes needed.
- No automated test suite — verification is `npm run lint`, a production build, and manual checks against the running dev server.
- Migrations are applied by pasting the SQL into Supabase Studio's SQL editor by the project owner, never via `npx supabase db push` — verify afterward with `psql`.

---

### Task 1: Migration + nav.ts

**Files:**
- Create: `supabase/migrations/20260828000000_material_handling.sql`
- Modify: `src/components/app-shell/nav.ts`

- [ ] **Step 1: Write the migration**

Create `supabase/migrations/20260828000000_material_handling.sql`:

```sql
-- Adds required-field constraints matching each of the three Material
-- Handling tables' forms, plus the active-column convention (see
-- CLAUDE.md) for all three. Job's job_start/job_finish stay optional (a
-- job can be scheduled before it starts/finishes); Item's unit_size
-- stays optional (not always applicable). Checked via psql before
-- writing this migration: none of the three tables had any grants to
-- authenticated yet, and their dropdown sources (equipment, product,
-- subcontractors, uom, contract_service) already do from prior features.

begin;

alter table timesheet_shorebase.material_handling_job
  alter column contract_service_id set not null;
alter table timesheet_shorebase.material_handling_job
  alter column sub_contractor_id set not null;
alter table timesheet_shorebase.material_handling_job
  alter column name set not null;
alter table timesheet_shorebase.material_handling_job
  alter column job_date set not null;
alter table timesheet_shorebase.material_handling_job
  add column active boolean not null default true;
grant select, insert, update on timesheet_shorebase.material_handling_job to authenticated;
alter table timesheet_shorebase.material_handling_job enable row level security;
create policy "authenticated users can read/write material handling jobs"
  on timesheet_shorebase.material_handling_job for all to authenticated using (true) with check (true);

alter table timesheet_shorebase.material_handling_item
  alter column job_id set not null;
alter table timesheet_shorebase.material_handling_item
  alter column product_id set not null;
alter table timesheet_shorebase.material_handling_item
  alter column quantity set not null;
alter table timesheet_shorebase.material_handling_item
  alter column uom set not null;
alter table timesheet_shorebase.material_handling_item
  add column active boolean not null default true;
grant select, insert, update on timesheet_shorebase.material_handling_item to authenticated;
alter table timesheet_shorebase.material_handling_item enable row level security;
create policy "authenticated users can read/write material handling items"
  on timesheet_shorebase.material_handling_item for all to authenticated using (true) with check (true);

alter table timesheet_shorebase.material_handling_equipment
  alter column job_id set not null;
alter table timesheet_shorebase.material_handling_equipment
  alter column equipment_id set not null;
alter table timesheet_shorebase.material_handling_equipment
  add column active boolean not null default true;
grant select, insert, update on timesheet_shorebase.material_handling_equipment to authenticated;
alter table timesheet_shorebase.material_handling_equipment enable row level security;
create policy "authenticated users can read/write material handling equipment"
  on timesheet_shorebase.material_handling_equipment for all to authenticated using (true) with check (true);

commit;
```

- [ ] **Step 2: Ask the project owner to apply the migration**

Paste the full contents into Supabase Studio's SQL editor and run it. Wait for confirmation before continuing.

- [ ] **Step 3: Verify against the real database**

```bash
source <(grep '^DATABASE_URL=' .env.local | sed 's/^/export /')
psql "$DATABASE_URL" -c "\d timesheet_shorebase.material_handling_job"
psql "$DATABASE_URL" -c "\d timesheet_shorebase.material_handling_item"
psql "$DATABASE_URL" -c "\d timesheet_shorebase.material_handling_equipment"
psql "$DATABASE_URL" -c "select tablename, policyname, cmd, roles from pg_policies where schemaname = 'timesheet_shorebase' and tablename like 'material_handling%';"
```

Expected: each table's required columns `not null`, `active` present and defaulting `true`; three RLS policies, one per table, `cmd = ALL`, `roles = {authenticated}`.

- [ ] **Step 4: Update the nav**

In `src/components/app-shell/nav.ts`, replace the single Material Handling placeholder in the Operations group with three entries (no new icon imports needed — `Container`, `PackageSearch`, `HardHat` are all already imported):

```ts
  {
    label: 'Operations',
    items: [
      { label: 'Dashboard', icon: LayoutDashboard, href: '/' },
      { label: 'Timesheets', icon: ClipboardList, href: '/timesheets' },
      { label: 'Activities', icon: Activity, href: '/activities' },
      { label: 'Actual Activities', icon: ClipboardCheck, href: '/actual-activities' },
      { label: 'MH Jobs', icon: Container, href: '/material-handling-jobs' },
      { label: 'MH Items', icon: PackageSearch, href: '/material-handling-items' },
      { label: 'MH Equipment', icon: HardHat, href: '/material-handling-equipment' },
    ],
  },
```

- [ ] **Step 5: Run lint and build**

```bash
npm run lint
npm run build
```

- [ ] **Step 6: Verify in the browser**

Navigate to `http://localhost:3000`. Confirm the Operations group now shows "MH Jobs", "MH Items", "MH Equipment" in place of the old single "Material Handling" entry (each still "Coming soon").

- [ ] **Step 7: Commit**

```bash
git add supabase/migrations/20260828000000_material_handling.sql "src/components/app-shell/nav.ts"
git commit -m "Add material handling schema changes and split nav entry into three"
```

---

### Task 2: Material Handling Jobs — full CRUD

**Files:**
- Create: `src/app/(app)/material-handling-jobs/page.tsx`
- Create: `src/app/(app)/material-handling-jobs/actions.ts`
- Create: `src/app/(app)/material-handling-jobs/MaterialHandlingJobForm.tsx`
- Create: `src/app/(app)/material-handling-jobs/new/page.tsx`
- Create: `src/app/(app)/material-handling-jobs/[id]/edit/page.tsx`

**Interfaces:**
- Produces: `MaterialHandlingJobFormState = { error: string | null }`, `MaterialHandlingJob`, `ContractServiceOption`, `SubcontractorOption`, all in `MaterialHandlingJobForm.tsx`. `createMaterialHandlingJob`, `updateMaterialHandlingJob`, `deactivateMaterialHandlingJob`, `reactivateMaterialHandlingJob` in `actions.ts`.

- [ ] **Step 1: List page**

Create `src/app/(app)/material-handling-jobs/page.tsx`:

```tsx
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';

type MaterialHandlingJobRow = {
  id: number;
  name: string;
  job_date: string;
  active: boolean;
  contract_service: { code: string } | null;
  subcontractors: { company: { name: string } | null } | null;
};

export default async function MaterialHandlingJobsPage() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('material_handling_job')
    .select('id, name, job_date, active, contract_service(code), subcontractors(company(name))')
    .order('job_date', { ascending: true });

  const jobs = (data ?? []) as unknown as MaterialHandlingJobRow[];

  return (
    <div className="px-6 py-8">
      <div className="flex items-center justify-between">
        <div>
          <p className="font-mono text-xs font-medium tracking-[0.2em] text-zinc-500 dark:text-zinc-400">
            OPERATIONS
          </p>
          <h2 className="mt-1 text-2xl font-semibold text-zinc-950 dark:text-zinc-50">
            Material Handling Jobs
          </h2>
        </div>
        <Link
          href="/material-handling-jobs/new"
          className="rounded-md bg-teal-700 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-teal-800 dark:bg-teal-600 dark:hover:bg-teal-500"
        >
          Add job
        </Link>
      </div>

      {error && (
        <p role="alert" className="mt-4 text-sm text-red-600 dark:text-red-400">
          Couldn&apos;t load material handling jobs: {error.message}
        </p>
      )}

      {!error && jobs.length === 0 && (
        <p className="mt-4 max-w-prose text-zinc-600 dark:text-zinc-400">
          No material handling jobs yet. Add your first one to get started.
        </p>
      )}

      {!error && jobs.length > 0 && (
        <div className="mt-6 overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800">
          <table className="w-full text-sm">
            <thead className="border-b border-zinc-200 bg-zinc-50 text-left text-xs font-medium uppercase tracking-wide text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
              <tr>
                <th className="px-4 py-2">Name</th>
                <th className="px-4 py-2">Contract Service</th>
                <th className="px-4 py-2">Subcontractor</th>
                <th className="px-4 py-2">Job date</th>
                <th className="px-4 py-2">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {jobs.map((job) => {
                const { active } = job;
                return (
                  <tr key={job.id}>
                    <td className="px-4 py-2 font-medium text-zinc-900 dark:text-zinc-100">
                      <Link href={`/material-handling-jobs/${job.id}/edit`} className="hover:underline">
                        {job.name}
                      </Link>
                    </td>
                    <td className="px-4 py-2 text-zinc-600 dark:text-zinc-400">
                      {job.contract_service?.code ?? '—'}
                    </td>
                    <td className="px-4 py-2 text-zinc-600 dark:text-zinc-400">
                      {job.subcontractors?.company?.name ?? '—'}
                    </td>
                    <td className="px-4 py-2 text-zinc-600 dark:text-zinc-400">{job.job_date}</td>
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

Create `src/app/(app)/material-handling-jobs/actions.ts`:

```ts
'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

export type MaterialHandlingJobFormState = {
  error: string | null;
};

function readJobFields(formData: FormData) {
  const contractServiceIdRaw = formData.get('contract_service_id') as string | null;
  const subContractorIdRaw = formData.get('sub_contractor_id') as string | null;
  const name = (formData.get('name') as string | null)?.trim();
  const jobDate = (formData.get('job_date') as string | null) || null;
  const jobStart = (formData.get('job_start') as string | null) || null;
  const jobFinish = (formData.get('job_finish') as string | null) || null;

  if (!contractServiceIdRaw || !subContractorIdRaw || !name || !jobDate) {
    return { error: 'Contract service, subcontractor, name, and job date are required.' } as const;
  }

  const contractServiceId = Number(contractServiceIdRaw);
  const subContractorId = Number(subContractorIdRaw);
  if (Number.isNaN(contractServiceId) || Number.isNaN(subContractorId)) {
    return { error: 'Invalid contract service or subcontractor.' } as const;
  }

  return {
    values: {
      contract_service_id: contractServiceId,
      sub_contractor_id: subContractorId,
      name,
      job_date: jobDate,
      job_start: jobStart,
      job_finish: jobFinish,
    },
  } as const;
}

export async function createMaterialHandlingJob(
  _prevState: MaterialHandlingJobFormState,
  formData: FormData,
): Promise<MaterialHandlingJobFormState> {
  const parsed = readJobFields(formData);
  if ('error' in parsed) {
    return { error: parsed.error };
  }

  const supabase = await createClient();
  const { error } = await supabase.from('material_handling_job').insert(parsed.values);

  if (error) {
    return { error: error.message };
  }

  revalidatePath('/material-handling-jobs');
  redirect('/material-handling-jobs');
}

export async function updateMaterialHandlingJob(
  id: number,
  _prevState: MaterialHandlingJobFormState,
  formData: FormData,
): Promise<MaterialHandlingJobFormState> {
  const parsed = readJobFields(formData);
  if ('error' in parsed) {
    return { error: parsed.error };
  }

  const supabase = await createClient();
  const { error } = await supabase.from('material_handling_job').update(parsed.values).eq('id', id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath('/material-handling-jobs');
  redirect('/material-handling-jobs');
}

export async function deactivateMaterialHandlingJob(id: number) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('material_handling_job')
    .update({ active: false })
    .eq('id', id)
    .select('id');

  if (error) {
    throw new Error(error.message);
  }
  if (!data || data.length === 0) {
    throw new Error('Material handling job not found.');
  }

  revalidatePath('/material-handling-jobs');
  revalidatePath(`/material-handling-jobs/${id}/edit`);
}

export async function reactivateMaterialHandlingJob(id: number) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('material_handling_job')
    .update({ active: true })
    .eq('id', id)
    .select('id');

  if (error) {
    throw new Error(error.message);
  }
  if (!data || data.length === 0) {
    throw new Error('Material handling job not found.');
  }

  revalidatePath('/material-handling-jobs');
  revalidatePath(`/material-handling-jobs/${id}/edit`);
}
```

- [ ] **Step 3: Form component**

Create `src/app/(app)/material-handling-jobs/MaterialHandlingJobForm.tsx`:

```tsx
'use client';

import { useActionState } from 'react';
import type { MaterialHandlingJobFormState } from './actions';

export type MaterialHandlingJob = {
  id: number;
  contract_service_id: number;
  sub_contractor_id: number;
  name: string;
  job_date: string;
  job_start: string | null;
  job_finish: string | null;
};

export type ContractServiceOption = {
  id: number;
  code: string;
};

export type SubcontractorOption = {
  id: number;
  company: { name: string } | null;
};

function toDatetimeLocalValue(isoString: string | null): string {
  if (!isoString) return '';
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  // The write side sends the datetime-local input's value straight to
  // Postgres with no timezone offset, so it's stored as the literal typed
  // wall-clock numbers interpreted in the DB session's UTC timezone - not
  // a real instant conversion. Reading it back must undo that the same
  // literal way (UTC getters), not via the browser's local timezone, or
  // the displayed value drifts by the browser's UTC offset on every
  // re-fetch.
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}T${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())}`;
}

const initialState: MaterialHandlingJobFormState = { error: null };

export function MaterialHandlingJobForm({
  job,
  contractServices,
  subcontractors,
  action,
  submitLabel,
}: {
  job?: MaterialHandlingJob;
  contractServices: ContractServiceOption[];
  subcontractors: SubcontractorOption[];
  action: (prevState: MaterialHandlingJobFormState, formData: FormData) => Promise<MaterialHandlingJobFormState>;
  submitLabel: string;
}) {
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="mt-6 max-w-md space-y-4">
      <div className="space-y-1">
        <label htmlFor="contract_service_id" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Contract service
        </label>
        <select
          id="contract_service_id"
          name="contract_service_id"
          required
          defaultValue={job?.contract_service_id ?? ''}
          className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-950 focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-600/40 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
        >
          <option value="" disabled>
            Select a contract service
          </option>
          {contractServices.map((contractService) => (
            <option key={contractService.id} value={contractService.id}>
              {contractService.code}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-1">
        <label htmlFor="sub_contractor_id" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Subcontractor
        </label>
        <select
          id="sub_contractor_id"
          name="sub_contractor_id"
          required
          defaultValue={job?.sub_contractor_id ?? ''}
          className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-950 focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-600/40 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
        >
          <option value="" disabled>
            Select a subcontractor
          </option>
          {subcontractors.map((subcontractor) => (
            <option key={subcontractor.id} value={subcontractor.id}>
              {subcontractor.company?.name ?? `Subcontractor #${subcontractor.id}`}
            </option>
          ))}
        </select>
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
          defaultValue={job?.name}
          className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-950 focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-600/40 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
        />
      </div>

      <div className="space-y-1">
        <label htmlFor="job_date" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Job date
        </label>
        <input
          id="job_date"
          name="job_date"
          type="date"
          required
          defaultValue={job?.job_date}
          className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-950 focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-600/40 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
        />
      </div>

      <div className="space-y-1">
        <label htmlFor="job_start" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Job start
        </label>
        <input
          id="job_start"
          name="job_start"
          type="datetime-local"
          defaultValue={toDatetimeLocalValue(job?.job_start ?? null)}
          className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-950 focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-600/40 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
        />
      </div>

      <div className="space-y-1">
        <label htmlFor="job_finish" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Job finish
        </label>
        <input
          id="job_finish"
          name="job_finish"
          type="datetime-local"
          defaultValue={toDatetimeLocalValue(job?.job_finish ?? null)}
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

Create `src/app/(app)/material-handling-jobs/new/page.tsx`:

```tsx
import { MaterialHandlingJobForm } from '../MaterialHandlingJobForm';
import { createMaterialHandlingJob } from '../actions';
import { createClient } from '@/lib/supabase/server';

export default async function NewMaterialHandlingJobPage() {
  const supabase = await createClient();

  const { data: contractServicesData, error: contractServicesError } = await supabase
    .from('contract_service')
    .select('id, code')
    .order('code', { ascending: true });

  if (contractServicesError) {
    return (
      <div className="px-6 py-8">
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          Couldn&apos;t load contract services: {contractServicesError.message}
        </p>
      </div>
    );
  }

  const { data: subcontractorsData, error: subcontractorsError } = await supabase
    .from('subcontractors')
    .select('id, company(name)')
    .order('id', { ascending: true });

  if (subcontractorsError) {
    return (
      <div className="px-6 py-8">
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          Couldn&apos;t load subcontractors: {subcontractorsError.message}
        </p>
      </div>
    );
  }

  const contractServices = contractServicesData ?? [];
  const subcontractors = (subcontractorsData ?? []) as unknown as {
    id: number;
    company: { name: string } | null;
  }[];

  return (
    <div className="px-6 py-8">
      <p className="font-mono text-xs font-medium tracking-[0.2em] text-zinc-500 dark:text-zinc-400">
        OPERATIONS
      </p>
      <h2 className="mt-1 text-2xl font-semibold text-zinc-950 dark:text-zinc-50">
        Add material handling job
      </h2>
      <MaterialHandlingJobForm
        contractServices={contractServices}
        subcontractors={subcontractors}
        action={createMaterialHandlingJob}
        submitLabel="Create job"
      />
    </div>
  );
}
```

- [ ] **Step 5: Edit route (with Deactivate/Reactivate from the start)**

Create `src/app/(app)/material-handling-jobs/[id]/edit/page.tsx`:

```tsx
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { MaterialHandlingJobForm, type MaterialHandlingJob } from '../../MaterialHandlingJobForm';
import {
  updateMaterialHandlingJob,
  deactivateMaterialHandlingJob,
  reactivateMaterialHandlingJob,
} from '../../actions';

export default async function EditMaterialHandlingJobPage(props: PageProps<'/material-handling-jobs/[id]/edit'>) {
  const { id } = await props.params;
  const jobId = Number(id);

  if (Number.isNaN(jobId)) {
    notFound();
  }

  const supabase = await createClient();

  const { data: job, error } = await supabase
    .from('material_handling_job')
    .select('id, contract_service_id, sub_contractor_id, name, job_date, job_start, job_finish, active')
    .eq('id', jobId)
    .maybeSingle();

  if (error) {
    return (
      <div className="px-6 py-8">
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          Couldn&apos;t load material handling job: {error.message}
        </p>
      </div>
    );
  }

  if (!job) {
    notFound();
  }

  const { data: contractServicesData, error: contractServicesError } = await supabase
    .from('contract_service')
    .select('id, code')
    .order('code', { ascending: true });

  if (contractServicesError) {
    return (
      <div className="px-6 py-8">
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          Couldn&apos;t load contract services: {contractServicesError.message}
        </p>
      </div>
    );
  }

  const { data: subcontractorsData, error: subcontractorsError } = await supabase
    .from('subcontractors')
    .select('id, company(name)')
    .order('id', { ascending: true });

  if (subcontractorsError) {
    return (
      <div className="px-6 py-8">
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          Couldn&apos;t load subcontractors: {subcontractorsError.message}
        </p>
      </div>
    );
  }

  const contractServices = contractServicesData ?? [];
  const subcontractors = (subcontractorsData ?? []) as unknown as {
    id: number;
    company: { name: string } | null;
  }[];

  const { active } = job;
  const updateMaterialHandlingJobWithId = updateMaterialHandlingJob.bind(null, jobId);
  const deactivateMaterialHandlingJobWithId = deactivateMaterialHandlingJob.bind(null, jobId);
  const reactivateMaterialHandlingJobWithId = reactivateMaterialHandlingJob.bind(null, jobId);

  return (
    <div className="px-6 py-8">
      <p className="font-mono text-xs font-medium tracking-[0.2em] text-zinc-500 dark:text-zinc-400">
        OPERATIONS
      </p>
      <div className="mt-1 flex items-center justify-between">
        <h2 className="text-2xl font-semibold text-zinc-950 dark:text-zinc-50">
          Edit material handling job
        </h2>
        <form action={active ? deactivateMaterialHandlingJobWithId : reactivateMaterialHandlingJobWithId}>
          <button
            type="submit"
            className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-900"
          >
            {active ? 'Deactivate' : 'Reactivate'}
          </button>
        </form>
      </div>
      <MaterialHandlingJobForm
        job={job as MaterialHandlingJob}
        contractServices={contractServices}
        subcontractors={subcontractors}
        action={updateMaterialHandlingJobWithId}
        submitLabel="Save changes"
      />
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

Create a job (pick a contract service and subcontractor, set name/job date, leave start/finish blank). Confirm it appears in the list with the right Contract Service/Subcontractor names. Edit it, set job start/finish, confirm the datetime-local values round-trip without drifting (check against `psql`, same check as `Person.ended_at`). Cycle Deactivate → Reactivate. Confirm `/material-handling-jobs/999999/edit` 404s.

- [ ] **Step 8: Commit**

```bash
git add "src/app/(app)/material-handling-jobs/"
git commit -m "Add material handling job management (list, create, edit, deactivate/reactivate)"
```

---

### Task 3: Material Handling Items — full CRUD

**Files:**
- Create: `src/app/(app)/material-handling-items/page.tsx`
- Create: `src/app/(app)/material-handling-items/actions.ts`
- Create: `src/app/(app)/material-handling-items/MaterialHandlingItemForm.tsx`
- Create: `src/app/(app)/material-handling-items/new/page.tsx`
- Create: `src/app/(app)/material-handling-items/[id]/edit/page.tsx`

**Interfaces:**
- Produces: `MaterialHandlingItemFormState = { error: string | null }`, `MaterialHandlingItem`, `JobOption`, `ProductOption`, `UomOption`, all in `MaterialHandlingItemForm.tsx`. `createMaterialHandlingItem`, `updateMaterialHandlingItem`, `deactivateMaterialHandlingItem`, `reactivateMaterialHandlingItem` in `actions.ts`.

- [ ] **Step 1: List page**

Create `src/app/(app)/material-handling-items/page.tsx`:

```tsx
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';

type MaterialHandlingItemRow = {
  id: number;
  quantity: number;
  uom: string;
  active: boolean;
  material_handling_job: { name: string } | null;
  product: { name: string } | null;
};

export default async function MaterialHandlingItemsPage() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('material_handling_item')
    .select('id, quantity, uom, active, material_handling_job(name), product(name)')
    .order('id', { ascending: true });

  const items = (data ?? []) as unknown as MaterialHandlingItemRow[];

  return (
    <div className="px-6 py-8">
      <div className="flex items-center justify-between">
        <div>
          <p className="font-mono text-xs font-medium tracking-[0.2em] text-zinc-500 dark:text-zinc-400">
            OPERATIONS
          </p>
          <h2 className="mt-1 text-2xl font-semibold text-zinc-950 dark:text-zinc-50">
            Material Handling Items
          </h2>
        </div>
        <Link
          href="/material-handling-items/new"
          className="rounded-md bg-teal-700 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-teal-800 dark:bg-teal-600 dark:hover:bg-teal-500"
        >
          Add item
        </Link>
      </div>

      {error && (
        <p role="alert" className="mt-4 text-sm text-red-600 dark:text-red-400">
          Couldn&apos;t load material handling items: {error.message}
        </p>
      )}

      {!error && items.length === 0 && (
        <p className="mt-4 max-w-prose text-zinc-600 dark:text-zinc-400">
          No material handling items yet. Add your first one to get started.
        </p>
      )}

      {!error && items.length > 0 && (
        <div className="mt-6 overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800">
          <table className="w-full text-sm">
            <thead className="border-b border-zinc-200 bg-zinc-50 text-left text-xs font-medium uppercase tracking-wide text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
              <tr>
                <th className="px-4 py-2">Job</th>
                <th className="px-4 py-2">Product</th>
                <th className="px-4 py-2">Quantity</th>
                <th className="px-4 py-2">UoM</th>
                <th className="px-4 py-2">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {items.map((item) => {
                const { active } = item;
                return (
                  <tr key={item.id}>
                    <td className="px-4 py-2 font-medium text-zinc-900 dark:text-zinc-100">
                      <Link href={`/material-handling-items/${item.id}/edit`} className="hover:underline">
                        {item.material_handling_job?.name ?? '—'}
                      </Link>
                    </td>
                    <td className="px-4 py-2 text-zinc-600 dark:text-zinc-400">
                      {item.product?.name ?? '—'}
                    </td>
                    <td className="px-4 py-2 text-zinc-600 dark:text-zinc-400">{item.quantity}</td>
                    <td className="px-4 py-2 text-zinc-600 dark:text-zinc-400">{item.uom}</td>
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

Create `src/app/(app)/material-handling-items/actions.ts`:

```ts
'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

export type MaterialHandlingItemFormState = {
  error: string | null;
};

function readItemFields(formData: FormData) {
  const jobIdRaw = formData.get('job_id') as string | null;
  const productIdRaw = formData.get('product_id') as string | null;
  const quantityRaw = formData.get('quantity') as string | null;
  const uom = (formData.get('uom') as string | null)?.trim();
  const unitSizeRaw = (formData.get('unit_size') as string | null)?.trim();

  if (!jobIdRaw || !productIdRaw || !quantityRaw || !uom) {
    return { error: 'Job, product, quantity, and UoM are required.' } as const;
  }

  const jobId = Number(jobIdRaw);
  const productId = Number(productIdRaw);
  const quantity = Number(quantityRaw);
  if (Number.isNaN(jobId) || Number.isNaN(productId) || Number.isNaN(quantity)) {
    return { error: 'Invalid job, product, or quantity.' } as const;
  }

  const unitSize = unitSizeRaw ? Number(unitSizeRaw) : null;
  if (unitSizeRaw && Number.isNaN(unitSize)) {
    return { error: 'Invalid unit size.' } as const;
  }

  return {
    values: {
      job_id: jobId,
      product_id: productId,
      quantity,
      uom,
      unit_size: unitSize,
    },
  } as const;
}

export async function createMaterialHandlingItem(
  _prevState: MaterialHandlingItemFormState,
  formData: FormData,
): Promise<MaterialHandlingItemFormState> {
  const parsed = readItemFields(formData);
  if ('error' in parsed) {
    return { error: parsed.error };
  }

  const supabase = await createClient();
  const { error } = await supabase.from('material_handling_item').insert(parsed.values);

  if (error) {
    return { error: error.message };
  }

  revalidatePath('/material-handling-items');
  redirect('/material-handling-items');
}

export async function updateMaterialHandlingItem(
  id: number,
  _prevState: MaterialHandlingItemFormState,
  formData: FormData,
): Promise<MaterialHandlingItemFormState> {
  const parsed = readItemFields(formData);
  if ('error' in parsed) {
    return { error: parsed.error };
  }

  const supabase = await createClient();
  const { error } = await supabase.from('material_handling_item').update(parsed.values).eq('id', id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath('/material-handling-items');
  redirect('/material-handling-items');
}

export async function deactivateMaterialHandlingItem(id: number) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('material_handling_item')
    .update({ active: false })
    .eq('id', id)
    .select('id');

  if (error) {
    throw new Error(error.message);
  }
  if (!data || data.length === 0) {
    throw new Error('Material handling item not found.');
  }

  revalidatePath('/material-handling-items');
  revalidatePath(`/material-handling-items/${id}/edit`);
}

export async function reactivateMaterialHandlingItem(id: number) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('material_handling_item')
    .update({ active: true })
    .eq('id', id)
    .select('id');

  if (error) {
    throw new Error(error.message);
  }
  if (!data || data.length === 0) {
    throw new Error('Material handling item not found.');
  }

  revalidatePath('/material-handling-items');
  revalidatePath(`/material-handling-items/${id}/edit`);
}
```

- [ ] **Step 3: Form component**

Create `src/app/(app)/material-handling-items/MaterialHandlingItemForm.tsx`:

```tsx
'use client';

import { useActionState } from 'react';
import type { MaterialHandlingItemFormState } from './actions';

export type MaterialHandlingItem = {
  id: number;
  job_id: number;
  product_id: number;
  quantity: number;
  uom: string;
  unit_size: number | null;
};

export type JobOption = {
  id: number;
  name: string;
};

export type ProductOption = {
  id: number;
  name: string;
};

export type UomOption = {
  code: string;
  name: string;
};

const initialState: MaterialHandlingItemFormState = { error: null };

export function MaterialHandlingItemForm({
  item,
  jobs,
  products,
  uoms,
  action,
  submitLabel,
}: {
  item?: MaterialHandlingItem;
  jobs: JobOption[];
  products: ProductOption[];
  uoms: UomOption[];
  action: (prevState: MaterialHandlingItemFormState, formData: FormData) => Promise<MaterialHandlingItemFormState>;
  submitLabel: string;
}) {
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="mt-6 max-w-md space-y-4">
      <div className="space-y-1">
        <label htmlFor="job_id" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Job
        </label>
        <select
          id="job_id"
          name="job_id"
          required
          defaultValue={item?.job_id ?? ''}
          className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-950 focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-600/40 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
        >
          <option value="" disabled>
            Select a job
          </option>
          {jobs.map((job) => (
            <option key={job.id} value={job.id}>
              {job.name}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-1">
        <label htmlFor="product_id" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Product
        </label>
        <select
          id="product_id"
          name="product_id"
          required
          defaultValue={item?.product_id ?? ''}
          className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-950 focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-600/40 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
        >
          <option value="" disabled>
            Select a product
          </option>
          {products.map((product) => (
            <option key={product.id} value={product.id}>
              {product.name}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-1">
        <label htmlFor="quantity" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Quantity
        </label>
        <input
          id="quantity"
          name="quantity"
          type="number"
          step="any"
          min="0"
          required
          defaultValue={item?.quantity}
          className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-950 focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-600/40 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
        />
      </div>

      <div className="space-y-1">
        <label htmlFor="uom" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          UoM
        </label>
        <select
          id="uom"
          name="uom"
          required
          defaultValue={item?.uom ?? ''}
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
        <label htmlFor="unit_size" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Unit size
        </label>
        <input
          id="unit_size"
          name="unit_size"
          type="number"
          step="any"
          min="0"
          defaultValue={item?.unit_size ?? ''}
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

Create `src/app/(app)/material-handling-items/new/page.tsx`:

```tsx
import { MaterialHandlingItemForm } from '../MaterialHandlingItemForm';
import { createMaterialHandlingItem } from '../actions';
import { createClient } from '@/lib/supabase/server';

export default async function NewMaterialHandlingItemPage() {
  const supabase = await createClient();

  const { data: jobsData, error: jobsError } = await supabase
    .from('material_handling_job')
    .select('id, name')
    .order('name', { ascending: true });

  if (jobsError) {
    return (
      <div className="px-6 py-8">
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          Couldn&apos;t load material handling jobs: {jobsError.message}
        </p>
      </div>
    );
  }

  const { data: productsData, error: productsError } = await supabase
    .from('product')
    .select('id, name')
    .order('name', { ascending: true });

  if (productsError) {
    return (
      <div className="px-6 py-8">
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          Couldn&apos;t load products: {productsError.message}
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

  const jobs = jobsData ?? [];
  const products = productsData ?? [];
  const uoms = uomsData ?? [];

  return (
    <div className="px-6 py-8">
      <p className="font-mono text-xs font-medium tracking-[0.2em] text-zinc-500 dark:text-zinc-400">
        OPERATIONS
      </p>
      <h2 className="mt-1 text-2xl font-semibold text-zinc-950 dark:text-zinc-50">
        Add material handling item
      </h2>
      <MaterialHandlingItemForm
        jobs={jobs}
        products={products}
        uoms={uoms}
        action={createMaterialHandlingItem}
        submitLabel="Create item"
      />
    </div>
  );
}
```

- [ ] **Step 5: Edit route (with Deactivate/Reactivate from the start)**

Create `src/app/(app)/material-handling-items/[id]/edit/page.tsx`:

```tsx
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { MaterialHandlingItemForm, type MaterialHandlingItem } from '../../MaterialHandlingItemForm';
import {
  updateMaterialHandlingItem,
  deactivateMaterialHandlingItem,
  reactivateMaterialHandlingItem,
} from '../../actions';

export default async function EditMaterialHandlingItemPage(props: PageProps<'/material-handling-items/[id]/edit'>) {
  const { id } = await props.params;
  const itemId = Number(id);

  if (Number.isNaN(itemId)) {
    notFound();
  }

  const supabase = await createClient();

  const { data: item, error } = await supabase
    .from('material_handling_item')
    .select('id, job_id, product_id, quantity, uom, unit_size, active')
    .eq('id', itemId)
    .maybeSingle();

  if (error) {
    return (
      <div className="px-6 py-8">
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          Couldn&apos;t load material handling item: {error.message}
        </p>
      </div>
    );
  }

  if (!item) {
    notFound();
  }

  const { data: jobsData, error: jobsError } = await supabase
    .from('material_handling_job')
    .select('id, name')
    .order('name', { ascending: true });

  if (jobsError) {
    return (
      <div className="px-6 py-8">
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          Couldn&apos;t load material handling jobs: {jobsError.message}
        </p>
      </div>
    );
  }

  const { data: productsData, error: productsError } = await supabase
    .from('product')
    .select('id, name')
    .order('name', { ascending: true });

  if (productsError) {
    return (
      <div className="px-6 py-8">
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          Couldn&apos;t load products: {productsError.message}
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

  const jobs = jobsData ?? [];
  const products = productsData ?? [];
  const uoms = uomsData ?? [];

  const { active } = item;
  const updateMaterialHandlingItemWithId = updateMaterialHandlingItem.bind(null, itemId);
  const deactivateMaterialHandlingItemWithId = deactivateMaterialHandlingItem.bind(null, itemId);
  const reactivateMaterialHandlingItemWithId = reactivateMaterialHandlingItem.bind(null, itemId);

  return (
    <div className="px-6 py-8">
      <p className="font-mono text-xs font-medium tracking-[0.2em] text-zinc-500 dark:text-zinc-400">
        OPERATIONS
      </p>
      <div className="mt-1 flex items-center justify-between">
        <h2 className="text-2xl font-semibold text-zinc-950 dark:text-zinc-50">
          Edit material handling item
        </h2>
        <form action={active ? deactivateMaterialHandlingItemWithId : reactivateMaterialHandlingItemWithId}>
          <button
            type="submit"
            className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-900"
          >
            {active ? 'Deactivate' : 'Reactivate'}
          </button>
        </form>
      </div>
      <MaterialHandlingItemForm
        item={item as MaterialHandlingItem}
        jobs={jobs}
        products={products}
        uoms={uoms}
        action={updateMaterialHandlingItemWithId}
        submitLabel="Save changes"
      />
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

Create an item against the Job created in Task 2, picking a product and UoM, entering quantity, leaving unit size blank. Confirm the list shows the linked Job and Product names, quantity, and UoM code. Edit it, set a unit size, change the linked Job, confirm it saves. Cycle Deactivate → Reactivate. Confirm `/material-handling-items/999999/edit` 404s.

- [ ] **Step 8: Commit**

```bash
git add "src/app/(app)/material-handling-items/"
git commit -m "Add material handling item management (list, create, edit, deactivate/reactivate)"
```

---

### Task 4: Material Handling Equipment — full CRUD

**Files:**
- Create: `src/app/(app)/material-handling-equipment/page.tsx`
- Create: `src/app/(app)/material-handling-equipment/actions.ts`
- Create: `src/app/(app)/material-handling-equipment/MaterialHandlingEquipmentForm.tsx`
- Create: `src/app/(app)/material-handling-equipment/new/page.tsx`
- Create: `src/app/(app)/material-handling-equipment/[id]/edit/page.tsx`

**Interfaces:**
- Produces: `MaterialHandlingEquipmentFormState = { error: string | null }`, `MaterialHandlingEquipmentRecord`, `JobOption`, `EquipmentOption`, all in `MaterialHandlingEquipmentForm.tsx`. `createMaterialHandlingEquipment`, `updateMaterialHandlingEquipment`, `deactivateMaterialHandlingEquipment`, `reactivateMaterialHandlingEquipment` in `actions.ts`.

- [ ] **Step 1: List page**

Create `src/app/(app)/material-handling-equipment/page.tsx`:

```tsx
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';

type MaterialHandlingEquipmentRow = {
  id: number;
  active: boolean;
  material_handling_job: { name: string } | null;
  equipment: { name: string } | null;
};

export default async function MaterialHandlingEquipmentPage() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('material_handling_equipment')
    .select('id, active, material_handling_job(name), equipment(name)')
    .order('id', { ascending: true });

  const rows = (data ?? []) as unknown as MaterialHandlingEquipmentRow[];

  return (
    <div className="px-6 py-8">
      <div className="flex items-center justify-between">
        <div>
          <p className="font-mono text-xs font-medium tracking-[0.2em] text-zinc-500 dark:text-zinc-400">
            OPERATIONS
          </p>
          <h2 className="mt-1 text-2xl font-semibold text-zinc-950 dark:text-zinc-50">
            Material Handling Equipment
          </h2>
        </div>
        <Link
          href="/material-handling-equipment/new"
          className="rounded-md bg-teal-700 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-teal-800 dark:bg-teal-600 dark:hover:bg-teal-500"
        >
          Add equipment usage
        </Link>
      </div>

      {error && (
        <p role="alert" className="mt-4 text-sm text-red-600 dark:text-red-400">
          Couldn&apos;t load material handling equipment: {error.message}
        </p>
      )}

      {!error && rows.length === 0 && (
        <p className="mt-4 max-w-prose text-zinc-600 dark:text-zinc-400">
          No material handling equipment usage yet. Add your first one to get started.
        </p>
      )}

      {!error && rows.length > 0 && (
        <div className="mt-6 overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800">
          <table className="w-full text-sm">
            <thead className="border-b border-zinc-200 bg-zinc-50 text-left text-xs font-medium uppercase tracking-wide text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
              <tr>
                <th className="px-4 py-2">Job</th>
                <th className="px-4 py-2">Equipment</th>
                <th className="px-4 py-2">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {rows.map((row) => {
                const { active } = row;
                return (
                  <tr key={row.id}>
                    <td className="px-4 py-2 font-medium text-zinc-900 dark:text-zinc-100">
                      <Link href={`/material-handling-equipment/${row.id}/edit`} className="hover:underline">
                        {row.material_handling_job?.name ?? '—'}
                      </Link>
                    </td>
                    <td className="px-4 py-2 text-zinc-600 dark:text-zinc-400">
                      {row.equipment?.name ?? '—'}
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

Create `src/app/(app)/material-handling-equipment/actions.ts`:

```ts
'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

export type MaterialHandlingEquipmentFormState = {
  error: string | null;
};

function readEquipmentFields(formData: FormData) {
  const jobIdRaw = formData.get('job_id') as string | null;
  const equipmentIdRaw = formData.get('equipment_id') as string | null;

  if (!jobIdRaw || !equipmentIdRaw) {
    return { error: 'Job and equipment are required.' } as const;
  }

  const jobId = Number(jobIdRaw);
  const equipmentId = Number(equipmentIdRaw);
  if (Number.isNaN(jobId) || Number.isNaN(equipmentId)) {
    return { error: 'Invalid job or equipment.' } as const;
  }

  return {
    values: {
      job_id: jobId,
      equipment_id: equipmentId,
    },
  } as const;
}

export async function createMaterialHandlingEquipment(
  _prevState: MaterialHandlingEquipmentFormState,
  formData: FormData,
): Promise<MaterialHandlingEquipmentFormState> {
  const parsed = readEquipmentFields(formData);
  if ('error' in parsed) {
    return { error: parsed.error };
  }

  const supabase = await createClient();
  const { error } = await supabase.from('material_handling_equipment').insert(parsed.values);

  if (error) {
    return { error: error.message };
  }

  revalidatePath('/material-handling-equipment');
  redirect('/material-handling-equipment');
}

export async function updateMaterialHandlingEquipment(
  id: number,
  _prevState: MaterialHandlingEquipmentFormState,
  formData: FormData,
): Promise<MaterialHandlingEquipmentFormState> {
  const parsed = readEquipmentFields(formData);
  if ('error' in parsed) {
    return { error: parsed.error };
  }

  const supabase = await createClient();
  const { error } = await supabase.from('material_handling_equipment').update(parsed.values).eq('id', id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath('/material-handling-equipment');
  redirect('/material-handling-equipment');
}

export async function deactivateMaterialHandlingEquipment(id: number) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('material_handling_equipment')
    .update({ active: false })
    .eq('id', id)
    .select('id');

  if (error) {
    throw new Error(error.message);
  }
  if (!data || data.length === 0) {
    throw new Error('Material handling equipment record not found.');
  }

  revalidatePath('/material-handling-equipment');
  revalidatePath(`/material-handling-equipment/${id}/edit`);
}

export async function reactivateMaterialHandlingEquipment(id: number) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('material_handling_equipment')
    .update({ active: true })
    .eq('id', id)
    .select('id');

  if (error) {
    throw new Error(error.message);
  }
  if (!data || data.length === 0) {
    throw new Error('Material handling equipment record not found.');
  }

  revalidatePath('/material-handling-equipment');
  revalidatePath(`/material-handling-equipment/${id}/edit`);
}
```

- [ ] **Step 3: Form component**

Create `src/app/(app)/material-handling-equipment/MaterialHandlingEquipmentForm.tsx`:

```tsx
'use client';

import { useActionState } from 'react';
import type { MaterialHandlingEquipmentFormState } from './actions';

export type MaterialHandlingEquipmentRecord = {
  id: number;
  job_id: number;
  equipment_id: number;
};

export type JobOption = {
  id: number;
  name: string;
};

export type EquipmentOption = {
  id: number;
  name: string;
};

const initialState: MaterialHandlingEquipmentFormState = { error: null };

export function MaterialHandlingEquipmentForm({
  record,
  jobs,
  equipmentOptions,
  action,
  submitLabel,
}: {
  record?: MaterialHandlingEquipmentRecord;
  jobs: JobOption[];
  equipmentOptions: EquipmentOption[];
  action: (
    prevState: MaterialHandlingEquipmentFormState,
    formData: FormData,
  ) => Promise<MaterialHandlingEquipmentFormState>;
  submitLabel: string;
}) {
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="mt-6 max-w-md space-y-4">
      <div className="space-y-1">
        <label htmlFor="job_id" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Job
        </label>
        <select
          id="job_id"
          name="job_id"
          required
          defaultValue={record?.job_id ?? ''}
          className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-950 focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-600/40 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
        >
          <option value="" disabled>
            Select a job
          </option>
          {jobs.map((job) => (
            <option key={job.id} value={job.id}>
              {job.name}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-1">
        <label htmlFor="equipment_id" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Equipment
        </label>
        <select
          id="equipment_id"
          name="equipment_id"
          required
          defaultValue={record?.equipment_id ?? ''}
          className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-950 focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-600/40 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
        >
          <option value="" disabled>
            Select equipment
          </option>
          {equipmentOptions.map((equipmentOption) => (
            <option key={equipmentOption.id} value={equipmentOption.id}>
              {equipmentOption.name}
            </option>
          ))}
        </select>
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

Create `src/app/(app)/material-handling-equipment/new/page.tsx`:

```tsx
import { MaterialHandlingEquipmentForm } from '../MaterialHandlingEquipmentForm';
import { createMaterialHandlingEquipment } from '../actions';
import { createClient } from '@/lib/supabase/server';

export default async function NewMaterialHandlingEquipmentPage() {
  const supabase = await createClient();

  const { data: jobsData, error: jobsError } = await supabase
    .from('material_handling_job')
    .select('id, name')
    .order('name', { ascending: true });

  if (jobsError) {
    return (
      <div className="px-6 py-8">
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          Couldn&apos;t load material handling jobs: {jobsError.message}
        </p>
      </div>
    );
  }

  const { data: equipmentData, error: equipmentError } = await supabase
    .from('equipment')
    .select('id, name')
    .order('name', { ascending: true });

  if (equipmentError) {
    return (
      <div className="px-6 py-8">
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          Couldn&apos;t load equipment: {equipmentError.message}
        </p>
      </div>
    );
  }

  const jobs = jobsData ?? [];
  const equipmentOptions = equipmentData ?? [];

  return (
    <div className="px-6 py-8">
      <p className="font-mono text-xs font-medium tracking-[0.2em] text-zinc-500 dark:text-zinc-400">
        OPERATIONS
      </p>
      <h2 className="mt-1 text-2xl font-semibold text-zinc-950 dark:text-zinc-50">
        Add material handling equipment usage
      </h2>
      <MaterialHandlingEquipmentForm
        jobs={jobs}
        equipmentOptions={equipmentOptions}
        action={createMaterialHandlingEquipment}
        submitLabel="Create equipment usage"
      />
    </div>
  );
}
```

- [ ] **Step 5: Edit route (with Deactivate/Reactivate from the start)**

Create `src/app/(app)/material-handling-equipment/[id]/edit/page.tsx`:

```tsx
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { MaterialHandlingEquipmentForm, type MaterialHandlingEquipmentRecord } from '../../MaterialHandlingEquipmentForm';
import {
  updateMaterialHandlingEquipment,
  deactivateMaterialHandlingEquipment,
  reactivateMaterialHandlingEquipment,
} from '../../actions';

export default async function EditMaterialHandlingEquipmentPage(
  props: PageProps<'/material-handling-equipment/[id]/edit'>,
) {
  const { id } = await props.params;
  const recordId = Number(id);

  if (Number.isNaN(recordId)) {
    notFound();
  }

  const supabase = await createClient();

  const { data: record, error } = await supabase
    .from('material_handling_equipment')
    .select('id, job_id, equipment_id, active')
    .eq('id', recordId)
    .maybeSingle();

  if (error) {
    return (
      <div className="px-6 py-8">
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          Couldn&apos;t load material handling equipment: {error.message}
        </p>
      </div>
    );
  }

  if (!record) {
    notFound();
  }

  const { data: jobsData, error: jobsError } = await supabase
    .from('material_handling_job')
    .select('id, name')
    .order('name', { ascending: true });

  if (jobsError) {
    return (
      <div className="px-6 py-8">
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          Couldn&apos;t load material handling jobs: {jobsError.message}
        </p>
      </div>
    );
  }

  const { data: equipmentData, error: equipmentError } = await supabase
    .from('equipment')
    .select('id, name')
    .order('name', { ascending: true });

  if (equipmentError) {
    return (
      <div className="px-6 py-8">
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          Couldn&apos;t load equipment: {equipmentError.message}
        </p>
      </div>
    );
  }

  const jobs = jobsData ?? [];
  const equipmentOptions = equipmentData ?? [];

  const { active } = record;
  const updateMaterialHandlingEquipmentWithId = updateMaterialHandlingEquipment.bind(null, recordId);
  const deactivateMaterialHandlingEquipmentWithId = deactivateMaterialHandlingEquipment.bind(null, recordId);
  const reactivateMaterialHandlingEquipmentWithId = reactivateMaterialHandlingEquipment.bind(null, recordId);

  return (
    <div className="px-6 py-8">
      <p className="font-mono text-xs font-medium tracking-[0.2em] text-zinc-500 dark:text-zinc-400">
        OPERATIONS
      </p>
      <div className="mt-1 flex items-center justify-between">
        <h2 className="text-2xl font-semibold text-zinc-950 dark:text-zinc-50">
          Edit material handling equipment
        </h2>
        <form
          action={active ? deactivateMaterialHandlingEquipmentWithId : reactivateMaterialHandlingEquipmentWithId}
        >
          <button
            type="submit"
            className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-900"
          >
            {active ? 'Deactivate' : 'Reactivate'}
          </button>
        </form>
      </div>
      <MaterialHandlingEquipmentForm
        record={record as MaterialHandlingEquipmentRecord}
        jobs={jobs}
        equipmentOptions={equipmentOptions}
        action={updateMaterialHandlingEquipmentWithId}
        submitLabel="Save changes"
      />
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

Create an equipment usage row against the Job created in Task 2, picking a piece of equipment. Confirm the list shows the linked Job and Equipment names. Edit it, change the linked equipment, confirm it saves. Cycle Deactivate → Reactivate. Confirm `/material-handling-equipment/999999/edit` 404s.

- [ ] **Step 8: Commit**

```bash
git add "src/app/(app)/material-handling-equipment/"
git commit -m "Add material handling equipment management (list, create, edit, deactivate/reactivate)"
```

---

## Self-Review Notes

- **Spec coverage:** all three tables get their spec'd required-field constraints, `active` column, grants/RLS ✓ (Task 1). Nav placeholder split into three real entries with existing icons, no new imports ✓ (Task 1). Full CRUD per entity with Deactivate/Reactivate built in from the start ✓ (Tasks 2-4). All dropdown embeds use the established no-hint convention (verified via `pg_constraint` before writing the spec: no table here has more than one FK to the same target) ✓.
- **Placeholder scan:** all four tasks have complete, non-elided code for every file.
- **Type consistency:** each feature defines its own `MaterialHandling*FormState`/record/option types locally in its own form file, no cross-feature imports — matching every prior feature's per-route-folder convention.
- **Naming notes for the implementer:** `material_handling_item.uom` is a plain column named `uom` (not `uom_code`) — the form field name, action's `formData.get`, and the insert/update payload key must all be `uom`, not `uom_code`. `material_handling_job.sub_contractor_id` (with the underscore after "sub") is the real column name — don't "fix" it to `subcontractor_id` when writing the migration or actions.
