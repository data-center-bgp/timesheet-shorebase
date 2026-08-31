# Timesheet Management Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Full CRUD (list/create/edit/deactivate-reactivate) for `Timesheet` — the header table only (`timesheet_activity_daily` is explicitly deferred, see the design spec's Non-goals). Eleven FKs total, but `company_id`/`service_id`/`uom_code` are derived server-side from the chosen Contract Service, not independently chosen — same shape as `Activity`'s existing derivation helper.

**Architecture:** One migration (required-field constraints, `active` column, grants/RLS), then one task builds the entire CRUD surface — no new UI patterns are needed anywhere in this feature (every dropdown shape, the derivation-helper pattern, and the Deactivate/Reactivate toggle have all shipped before), so it's scoped as a single task like `Equipment`/`JettyShip`/`Product` and each Material Handling entity, not split into separate list/create/edit tasks like the more novel `Actual Activity` build was.

**Tech Stack:** Next.js 16 App Router, React 19 (`useActionState`), `@supabase/ssr` server client, plain SQL migration applied via Supabase Studio's SQL editor.

## Global Constraints

- `active boolean not null default true` on `timesheet`; Deactivate/Reactivate flips only that column.
- Required: `period_id`, `type_code`, `contract_service_id`, `timesheet_date`, `code`, `total_amount`. Nullable/not-on-form: everything else (see design spec's Non-goals for `timesheet_group_id`/`invoice_component_id`/`created_at`).
- `company_id`, `service_id`, `uom_code` are NEVER form fields — always derived server-side from the selected `contract_service_id` via `lookupCompanyServiceUomForTimesheet`, mirroring `Activity`'s existing `lookupCompanyServiceUomForContractService`. Re-derives on every edit from whichever Contract Service is currently selected.
- `subcontractor_id`, `jetty_ship_id`, `mh_job_id` are independent optional dropdowns (not derivable from Contract Service — it has no columns for any of them). Blank option's real display text: "No subcontractor" / "No jetty/ship" / "No material handling job".
- `code_serial_number` is an optional plain number field, no derivation.
- Nav: `nav.ts` already has `{ label: 'Timesheets', icon: ClipboardList, href: '/timesheets' }` in the Operations group — no nav changes needed in this feature.
- Dropdown sources already granted to `authenticated` from prior features: `period`, `timesheet_type`, `contract_service`, `subcontractors`, `jetty_ship`, `material_handling_job`. Only `timesheet` itself needs grants in this migration.
- No automated test suite — verification is `npm run lint`, a production build, and manual checks against the running dev server.
- Migrations are applied by pasting the SQL into Supabase Studio's SQL editor by the project owner, never via `npx supabase db push` — verify afterward with `psql`.

---

### Task 1: Migration

**Files:**
- Create: `supabase/migrations/20260828020000_timesheet.sql`

- [ ] **Step 1: Write the migration**

Create `supabase/migrations/20260828020000_timesheet.sql`:

```sql
-- Adds required-field constraints matching Timesheet's form, plus the
-- active-column convention (see CLAUDE.md). company_id/service_id/uom_code
-- stay nullable at the DB level even though they're always populated in
-- practice - they're written by the server action's derivation helper,
-- never independently required by a form field, so a DB-level NOT NULL
-- here would be redundant with (and could drift from) that derivation
-- logic. timesheet_group_id/invoice_component_id/created_at are left
-- fully alone - all three are deferred (see design spec's Non-goals):
-- their dependency tables have zero rows and no CRUD built yet, or (for
-- created_at) no precedent for wiring it exists anywhere in this codebase.

begin;

alter table timesheet_shorebase.timesheet
  alter column period_id set not null;
alter table timesheet_shorebase.timesheet
  alter column type_code set not null;
alter table timesheet_shorebase.timesheet
  alter column contract_service_id set not null;
alter table timesheet_shorebase.timesheet
  alter column timesheet_date set not null;
alter table timesheet_shorebase.timesheet
  alter column code set not null;
alter table timesheet_shorebase.timesheet
  alter column total_amount set not null;
alter table timesheet_shorebase.timesheet
  add column active boolean not null default true;
grant select, insert, update on timesheet_shorebase.timesheet to authenticated;
alter table timesheet_shorebase.timesheet enable row level security;
create policy "authenticated users can read/write timesheets"
  on timesheet_shorebase.timesheet for all to authenticated using (true) with check (true);

commit;
```

- [ ] **Step 2: Ask the project owner to apply the migration**

Paste the full contents into Supabase Studio's SQL editor and run it. Wait for confirmation before continuing.

- [ ] **Step 3: Verify against the real database**

```bash
source <(grep '^DATABASE_URL=' .env.local | sed 's/^/export /')
psql "$DATABASE_URL" -c "\d timesheet_shorebase.timesheet"
psql "$DATABASE_URL" -c "select tablename, policyname, cmd, roles from pg_policies where schemaname = 'timesheet_shorebase' and tablename = 'timesheet';"
```

Expected: `period_id`/`type_code`/`contract_service_id`/`timesheet_date`/`code`/`total_amount` all `not null`; `active` present, defaulting `true`; one RLS policy, `cmd = ALL`, `roles = {authenticated}`.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260828020000_timesheet.sql
git commit -m "Add timesheet schema changes (required fields, active column, grants/RLS)"
```

---

### Task 2: Timesheet — full CRUD

**Files:**
- Create: `src/app/(app)/timesheets/page.tsx`
- Create: `src/app/(app)/timesheets/actions.ts`
- Create: `src/app/(app)/timesheets/TimesheetForm.tsx`
- Create: `src/app/(app)/timesheets/new/page.tsx`
- Create: `src/app/(app)/timesheets/[id]/edit/page.tsx`

**Interfaces:**
- Produces: `TimesheetFormState = { error: string | null }`, `Timesheet`, `PeriodOption`, `TimesheetTypeOption`, `ContractServiceOption`, `SubcontractorOption`, `JettyShipOption`, `MaterialHandlingJobOption`, all in `TimesheetForm.tsx`. `createTimesheet`, `updateTimesheet`, `deactivateTimesheet`, `reactivateTimesheet` in `actions.ts`.

- [ ] **Step 1: List page**

Create `src/app/(app)/timesheets/page.tsx`:

```tsx
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';

type TimesheetRow = {
  id: number;
  code: string;
  timesheet_date: string;
  total_amount: number;
  active: boolean;
  period: { name: string } | null;
  contract_service: { code: string } | null;
};

export default async function TimesheetsPage() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('timesheet')
    .select('id, code, timesheet_date, total_amount, active, period(name), contract_service(code)')
    .order('timesheet_date', { ascending: true });

  const timesheets = (data ?? []) as unknown as TimesheetRow[];

  return (
    <div className="px-6 py-8">
      <div className="flex items-center justify-between">
        <div>
          <p className="font-mono text-xs font-medium tracking-[0.2em] text-zinc-500 dark:text-zinc-400">
            OPERATIONS
          </p>
          <h2 className="mt-1 text-2xl font-semibold text-zinc-950 dark:text-zinc-50">
            Timesheets
          </h2>
        </div>
        <Link
          href="/timesheets/new"
          className="rounded-md bg-teal-700 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-teal-800 dark:bg-teal-600 dark:hover:bg-teal-500"
        >
          Add timesheet
        </Link>
      </div>

      {error && (
        <p role="alert" className="mt-4 text-sm text-red-600 dark:text-red-400">
          Couldn&apos;t load timesheets: {error.message}
        </p>
      )}

      {!error && timesheets.length === 0 && (
        <p className="mt-4 max-w-prose text-zinc-600 dark:text-zinc-400">
          No timesheets yet. Add your first one to get started.
        </p>
      )}

      {!error && timesheets.length > 0 && (
        <div className="mt-6 overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800">
          <table className="w-full text-sm">
            <thead className="border-b border-zinc-200 bg-zinc-50 text-left text-xs font-medium uppercase tracking-wide text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
              <tr>
                <th className="px-4 py-2">Code</th>
                <th className="px-4 py-2">Period</th>
                <th className="px-4 py-2">Contract Service</th>
                <th className="px-4 py-2">Timesheet date</th>
                <th className="px-4 py-2">Total amount</th>
                <th className="px-4 py-2">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {timesheets.map((timesheet) => {
                const { active } = timesheet;
                return (
                  <tr key={timesheet.id}>
                    <td className="px-4 py-2 font-medium text-zinc-900 dark:text-zinc-100">
                      <Link href={`/timesheets/${timesheet.id}/edit`} className="hover:underline">
                        {timesheet.code}
                      </Link>
                    </td>
                    <td className="px-4 py-2 text-zinc-600 dark:text-zinc-400">
                      {timesheet.period?.name ?? '—'}
                    </td>
                    <td className="px-4 py-2 text-zinc-600 dark:text-zinc-400">
                      {timesheet.contract_service?.code ?? '—'}
                    </td>
                    <td className="px-4 py-2 text-zinc-600 dark:text-zinc-400">{timesheet.timesheet_date}</td>
                    <td className="px-4 py-2 text-zinc-600 dark:text-zinc-400">{timesheet.total_amount}</td>
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

Create `src/app/(app)/timesheets/actions.ts`:

```ts
'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

export type TimesheetFormState = {
  error: string | null;
};

type ReadTimesheetFieldsResult =
  | { error: string }
  | {
      values: {
        period_id: number;
        type_code: string;
        contract_service_id: number;
        timesheet_date: string;
        code: string;
        code_serial_number: number | null;
        total_amount: number;
        subcontractor_id: number | null;
        jetty_ship_id: number | null;
        mh_job_id: number | null;
      };
    };

function readTimesheetFields(formData: FormData): ReadTimesheetFieldsResult {
  const periodIdRaw = formData.get('period_id') as string | null;
  const typeCode = (formData.get('type_code') as string | null)?.trim();
  const contractServiceIdRaw = formData.get('contract_service_id') as string | null;
  const timesheetDate = (formData.get('timesheet_date') as string | null) || null;
  const code = (formData.get('code') as string | null)?.trim();
  const totalAmountRaw = formData.get('total_amount') as string | null;
  const codeSerialNumberRaw = (formData.get('code_serial_number') as string | null)?.trim();
  const subcontractorIdRaw = formData.get('subcontractor_id') as string | null;
  const jettyShipIdRaw = formData.get('jetty_ship_id') as string | null;
  const mhJobIdRaw = formData.get('mh_job_id') as string | null;

  if (!periodIdRaw || !typeCode || !contractServiceIdRaw || !timesheetDate || !code || !totalAmountRaw) {
    return {
      error: 'Period, timesheet type, contract service, timesheet date, code, and total amount are required.',
    };
  }

  const periodId = Number(periodIdRaw);
  const contractServiceId = Number(contractServiceIdRaw);
  const totalAmount = Number(totalAmountRaw);
  if (Number.isNaN(periodId) || Number.isNaN(contractServiceId) || !Number.isFinite(totalAmount) || totalAmount < 0) {
    return { error: 'Invalid period, contract service, or total amount.' };
  }

  const codeSerialNumber = codeSerialNumberRaw ? Number(codeSerialNumberRaw) : null;
  if (codeSerialNumber !== null && (!Number.isFinite(codeSerialNumber) || codeSerialNumber < 0)) {
    return { error: 'Invalid code serial number.' };
  }

  const subcontractorId = subcontractorIdRaw ? Number(subcontractorIdRaw) : null;
  const jettyShipId = jettyShipIdRaw ? Number(jettyShipIdRaw) : null;
  const mhJobId = mhJobIdRaw ? Number(mhJobIdRaw) : null;
  if (
    (subcontractorId !== null && Number.isNaN(subcontractorId)) ||
    (jettyShipId !== null && Number.isNaN(jettyShipId)) ||
    (mhJobId !== null && Number.isNaN(mhJobId))
  ) {
    return { error: 'Invalid subcontractor, jetty/ship, or material handling job.' };
  }

  return {
    values: {
      period_id: periodId,
      type_code: typeCode,
      contract_service_id: contractServiceId,
      timesheet_date: timesheetDate,
      code,
      code_serial_number: codeSerialNumber,
      total_amount: totalAmount,
      subcontractor_id: subcontractorId,
      jetty_ship_id: jettyShipId,
      mh_job_id: mhJobId,
    },
  };
}

async function lookupCompanyServiceUomForTimesheet(
  supabase: Awaited<ReturnType<typeof createClient>>,
  contractServiceId: number,
): Promise<{ companyId: number | null; serviceId: number | null; uomCode: string | null }> {
  const { data } = await supabase
    .from('contract_service')
    .select('company_id, service_id, uom_code')
    .eq('id', contractServiceId)
    .maybeSingle();

  return {
    companyId: data?.company_id ?? null,
    serviceId: data?.service_id ?? null,
    uomCode: data?.uom_code ?? null,
  };
}

export async function createTimesheet(
  _prevState: TimesheetFormState,
  formData: FormData,
): Promise<TimesheetFormState> {
  const parsed = readTimesheetFields(formData);
  if ('error' in parsed) {
    return { error: parsed.error };
  }

  const supabase = await createClient();
  const { companyId, serviceId, uomCode } = await lookupCompanyServiceUomForTimesheet(
    supabase,
    parsed.values.contract_service_id,
  );

  const { error } = await supabase.from('timesheet').insert({
    ...parsed.values,
    company_id: companyId,
    service_id: serviceId,
    uom_code: uomCode,
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath('/timesheets');
  redirect('/timesheets');
}

export async function updateTimesheet(
  id: number,
  _prevState: TimesheetFormState,
  formData: FormData,
): Promise<TimesheetFormState> {
  const parsed = readTimesheetFields(formData);
  if ('error' in parsed) {
    return { error: parsed.error };
  }

  const supabase = await createClient();
  const { companyId, serviceId, uomCode } = await lookupCompanyServiceUomForTimesheet(
    supabase,
    parsed.values.contract_service_id,
  );

  const { error } = await supabase
    .from('timesheet')
    .update({
      ...parsed.values,
      company_id: companyId,
      service_id: serviceId,
      uom_code: uomCode,
    })
    .eq('id', id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath('/timesheets');
  redirect('/timesheets');
}

export async function deactivateTimesheet(id: number) {
  const supabase = await createClient();
  const { data, error } = await supabase.from('timesheet').update({ active: false }).eq('id', id).select('id');

  if (error) {
    throw new Error(error.message);
  }
  if (!data || data.length === 0) {
    throw new Error('Timesheet not found.');
  }

  revalidatePath('/timesheets');
  revalidatePath(`/timesheets/${id}/edit`);
}

export async function reactivateTimesheet(id: number) {
  const supabase = await createClient();
  const { data, error } = await supabase.from('timesheet').update({ active: true }).eq('id', id).select('id');

  if (error) {
    throw new Error(error.message);
  }
  if (!data || data.length === 0) {
    throw new Error('Timesheet not found.');
  }

  revalidatePath('/timesheets');
  revalidatePath(`/timesheets/${id}/edit`);
}
```

- [ ] **Step 3: Form component**

Create `src/app/(app)/timesheets/TimesheetForm.tsx`:

```tsx
'use client';

import { useActionState } from 'react';
import type { TimesheetFormState } from './actions';

export type Timesheet = {
  id: number;
  period_id: number;
  type_code: string;
  contract_service_id: number;
  timesheet_date: string;
  code: string;
  code_serial_number: number | null;
  total_amount: number;
  subcontractor_id: number | null;
  jetty_ship_id: number | null;
  mh_job_id: number | null;
};

export type PeriodOption = { id: number; name: string };
export type TimesheetTypeOption = { code: string; name: string };
export type ContractServiceOption = { id: number; code: string };
export type SubcontractorOption = { id: number; company: { name: string } | null };
export type JettyShipOption = { id: number; name: string };
export type MaterialHandlingJobOption = { id: number; name: string };

const initialState: TimesheetFormState = { error: null };

export function TimesheetForm({
  timesheet,
  periods,
  timesheetTypes,
  contractServices,
  subcontractors,
  jettyShips,
  materialHandlingJobs,
  action,
  submitLabel,
}: {
  timesheet?: Timesheet;
  periods: PeriodOption[];
  timesheetTypes: TimesheetTypeOption[];
  contractServices: ContractServiceOption[];
  subcontractors: SubcontractorOption[];
  jettyShips: JettyShipOption[];
  materialHandlingJobs: MaterialHandlingJobOption[];
  action: (prevState: TimesheetFormState, formData: FormData) => Promise<TimesheetFormState>;
  submitLabel: string;
}) {
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="mt-6 max-w-md space-y-4">
      <div className="space-y-1">
        <label htmlFor="period_id" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Period
        </label>
        <select
          id="period_id"
          name="period_id"
          required
          defaultValue={timesheet?.period_id ?? ''}
          className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-950 focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-600/40 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
        >
          <option value="" disabled>
            Select a period
          </option>
          {periods.map((period) => (
            <option key={period.id} value={period.id}>
              {period.name}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-1">
        <label htmlFor="type_code" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Timesheet type
        </label>
        <select
          id="type_code"
          name="type_code"
          required
          defaultValue={timesheet?.type_code ?? ''}
          className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-950 focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-600/40 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
        >
          <option value="" disabled>
            Select a timesheet type
          </option>
          {timesheetTypes.map((timesheetType) => (
            <option key={timesheetType.code} value={timesheetType.code}>
              {timesheetType.name}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-1">
        <label htmlFor="contract_service_id" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Contract service
        </label>
        <select
          id="contract_service_id"
          name="contract_service_id"
          required
          defaultValue={timesheet?.contract_service_id ?? ''}
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
        <label htmlFor="timesheet_date" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Timesheet date
        </label>
        <input
          id="timesheet_date"
          name="timesheet_date"
          type="date"
          required
          defaultValue={timesheet?.timesheet_date}
          className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-950 focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-600/40 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
        />
      </div>

      <div className="space-y-1">
        <label htmlFor="code" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Code
        </label>
        <input
          id="code"
          name="code"
          type="text"
          required
          defaultValue={timesheet?.code}
          className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-950 focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-600/40 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
        />
      </div>

      <div className="space-y-1">
        <label htmlFor="code_serial_number" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Code serial number
        </label>
        <input
          id="code_serial_number"
          name="code_serial_number"
          type="number"
          step="1"
          min="0"
          defaultValue={timesheet?.code_serial_number ?? ''}
          className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-950 focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-600/40 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
        />
      </div>

      <div className="space-y-1">
        <label htmlFor="total_amount" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Total amount
        </label>
        <input
          id="total_amount"
          name="total_amount"
          type="number"
          step="any"
          min="0"
          required
          defaultValue={timesheet?.total_amount}
          className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-950 focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-600/40 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
        />
      </div>

      <div className="space-y-1">
        <label htmlFor="subcontractor_id" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Subcontractor
        </label>
        <select
          id="subcontractor_id"
          name="subcontractor_id"
          defaultValue={timesheet?.subcontractor_id ?? ''}
          className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-950 focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-600/40 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
        >
          <option value="">No subcontractor</option>
          {subcontractors.map((subcontractor) => (
            <option key={subcontractor.id} value={subcontractor.id}>
              {subcontractor.company?.name ?? `Subcontractor #${subcontractor.id}`}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-1">
        <label htmlFor="jetty_ship_id" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Jetty/Ship
        </label>
        <select
          id="jetty_ship_id"
          name="jetty_ship_id"
          defaultValue={timesheet?.jetty_ship_id ?? ''}
          className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-950 focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-600/40 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
        >
          <option value="">No jetty/ship</option>
          {jettyShips.map((jettyShip) => (
            <option key={jettyShip.id} value={jettyShip.id}>
              {jettyShip.name}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-1">
        <label htmlFor="mh_job_id" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Material handling job
        </label>
        <select
          id="mh_job_id"
          name="mh_job_id"
          defaultValue={timesheet?.mh_job_id ?? ''}
          className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-950 focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-600/40 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
        >
          <option value="">No material handling job</option>
          {materialHandlingJobs.map((job) => (
            <option key={job.id} value={job.id}>
              {job.name}
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

Create `src/app/(app)/timesheets/new/page.tsx`:

```tsx
import { TimesheetForm } from '../TimesheetForm';
import { createTimesheet } from '../actions';
import { createClient } from '@/lib/supabase/server';

export default async function NewTimesheetPage() {
  const supabase = await createClient();

  const { data: periodsData, error: periodsError } = await supabase
    .from('period')
    .select('id, name')
    .order('name', { ascending: true });
  if (periodsError) {
    return (
      <div className="px-6 py-8">
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          Couldn&apos;t load periods: {periodsError.message}
        </p>
      </div>
    );
  }

  const { data: timesheetTypesData, error: timesheetTypesError } = await supabase
    .from('timesheet_type')
    .select('code, name')
    .order('name', { ascending: true });
  if (timesheetTypesError) {
    return (
      <div className="px-6 py-8">
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          Couldn&apos;t load timesheet types: {timesheetTypesError.message}
        </p>
      </div>
    );
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

  const { data: jettyShipsData, error: jettyShipsError } = await supabase
    .from('jetty_ship')
    .select('id, name')
    .order('name', { ascending: true });
  if (jettyShipsError) {
    return (
      <div className="px-6 py-8">
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          Couldn&apos;t load jetty/ships: {jettyShipsError.message}
        </p>
      </div>
    );
  }

  const { data: mhJobsData, error: mhJobsError } = await supabase
    .from('material_handling_job')
    .select('id, name')
    .order('name', { ascending: true });
  if (mhJobsError) {
    return (
      <div className="px-6 py-8">
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          Couldn&apos;t load material handling jobs: {mhJobsError.message}
        </p>
      </div>
    );
  }

  const periods = periodsData ?? [];
  const timesheetTypes = timesheetTypesData ?? [];
  const contractServices = contractServicesData ?? [];
  const subcontractors = (subcontractorsData ?? []) as unknown as {
    id: number;
    company: { name: string } | null;
  }[];
  const jettyShips = jettyShipsData ?? [];
  const materialHandlingJobs = mhJobsData ?? [];

  return (
    <div className="px-6 py-8">
      <p className="font-mono text-xs font-medium tracking-[0.2em] text-zinc-500 dark:text-zinc-400">
        OPERATIONS
      </p>
      <h2 className="mt-1 text-2xl font-semibold text-zinc-950 dark:text-zinc-50">
        Add timesheet
      </h2>
      <TimesheetForm
        periods={periods}
        timesheetTypes={timesheetTypes}
        contractServices={contractServices}
        subcontractors={subcontractors}
        jettyShips={jettyShips}
        materialHandlingJobs={materialHandlingJobs}
        action={createTimesheet}
        submitLabel="Create timesheet"
      />
    </div>
  );
}
```

- [ ] **Step 5: Edit route (with Deactivate/Reactivate from the start)**

Create `src/app/(app)/timesheets/[id]/edit/page.tsx`:

```tsx
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { TimesheetForm, type Timesheet } from '../../TimesheetForm';
import { updateTimesheet, deactivateTimesheet, reactivateTimesheet } from '../../actions';

export default async function EditTimesheetPage(props: PageProps<'/timesheets/[id]/edit'>) {
  const { id } = await props.params;
  const timesheetId = Number(id);

  if (Number.isNaN(timesheetId)) {
    notFound();
  }

  const supabase = await createClient();

  const { data: timesheet, error } = await supabase
    .from('timesheet')
    .select(
      'id, period_id, type_code, contract_service_id, timesheet_date, code, code_serial_number, total_amount, subcontractor_id, jetty_ship_id, mh_job_id, active',
    )
    .eq('id', timesheetId)
    .maybeSingle();

  if (error) {
    return (
      <div className="px-6 py-8">
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          Couldn&apos;t load timesheet: {error.message}
        </p>
      </div>
    );
  }

  if (!timesheet) {
    notFound();
  }

  const { data: periodsData, error: periodsError } = await supabase
    .from('period')
    .select('id, name')
    .order('name', { ascending: true });
  if (periodsError) {
    return (
      <div className="px-6 py-8">
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          Couldn&apos;t load periods: {periodsError.message}
        </p>
      </div>
    );
  }

  const { data: timesheetTypesData, error: timesheetTypesError } = await supabase
    .from('timesheet_type')
    .select('code, name')
    .order('name', { ascending: true });
  if (timesheetTypesError) {
    return (
      <div className="px-6 py-8">
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          Couldn&apos;t load timesheet types: {timesheetTypesError.message}
        </p>
      </div>
    );
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

  const { data: jettyShipsData, error: jettyShipsError } = await supabase
    .from('jetty_ship')
    .select('id, name')
    .order('name', { ascending: true });
  if (jettyShipsError) {
    return (
      <div className="px-6 py-8">
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          Couldn&apos;t load jetty/ships: {jettyShipsError.message}
        </p>
      </div>
    );
  }

  const { data: mhJobsData, error: mhJobsError } = await supabase
    .from('material_handling_job')
    .select('id, name')
    .order('name', { ascending: true });
  if (mhJobsError) {
    return (
      <div className="px-6 py-8">
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          Couldn&apos;t load material handling jobs: {mhJobsError.message}
        </p>
      </div>
    );
  }

  const periods = periodsData ?? [];
  const timesheetTypes = timesheetTypesData ?? [];
  const contractServices = contractServicesData ?? [];
  const subcontractors = (subcontractorsData ?? []) as unknown as {
    id: number;
    company: { name: string } | null;
  }[];
  const jettyShips = jettyShipsData ?? [];
  const materialHandlingJobs = mhJobsData ?? [];

  const { active } = timesheet;
  const updateTimesheetWithId = updateTimesheet.bind(null, timesheetId);
  const deactivateTimesheetWithId = deactivateTimesheet.bind(null, timesheetId);
  const reactivateTimesheetWithId = reactivateTimesheet.bind(null, timesheetId);

  return (
    <div className="px-6 py-8">
      <p className="font-mono text-xs font-medium tracking-[0.2em] text-zinc-500 dark:text-zinc-400">
        OPERATIONS
      </p>
      <div className="mt-1 flex items-center justify-between">
        <h2 className="text-2xl font-semibold text-zinc-950 dark:text-zinc-50">
          Edit timesheet
        </h2>
        <form action={active ? deactivateTimesheetWithId : reactivateTimesheetWithId}>
          <button
            type="submit"
            className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-900"
          >
            {active ? 'Deactivate' : 'Reactivate'}
          </button>
        </form>
      </div>
      <TimesheetForm
        timesheet={timesheet as Timesheet}
        periods={periods}
        timesheetTypes={timesheetTypes}
        contractServices={contractServices}
        subcontractors={subcontractors}
        jettyShips={jettyShips}
        materialHandlingJobs={materialHandlingJobs}
        action={updateTimesheetWithId}
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

Create a Period first if none exist yet (via `/periods/new`), then create a Timesheet against a real Contract Service, picking a Timesheet type, leaving Subcontractor/Jetty-Ship/MH Job blank. Confirm the list shows the right Period name, Contract Service code, date, and amount. Via `psql`, confirm `company_id`/`service_id`/`uom_code` on the new row match the selected Contract Service's own values exactly (these are never shown in the UI, so this MUST be checked at the DB level, not eyeballed). Edit the Timesheet: change the linked Contract Service to a different one, save, and confirm via `psql` that `company_id`/`service_id`/`uom_code` re-derived to match the NEW Contract Service, not the old one. Set a Subcontractor/Jetty-Ship/MH Job, save, confirm they persist. Cycle Deactivate → confirm Inactive → Reactivate → confirm Active, confirm via `psql` no other column changed. Confirm `/timesheets/999999/edit` renders a 404.

- [ ] **Step 8: Commit**

```bash
git add "src/app/(app)/timesheets/"
git commit -m "Add timesheet management (list, create, edit, deactivate/reactivate)"
```

---

## Self-Review Notes

- **Spec coverage:** required-field constraints, `active` column, grants/RLS ✓ (Task 1). Full CRUD with Deactivate/Reactivate built in from the start ✓ (Task 2). `company_id`/`service_id`/`uom_code` derived server-side via `lookupCompanyServiceUomForTimesheet`, never form fields ✓. `timesheet_group_id`/`invoice_component_id`/`created_at` correctly absent from both the migration's NOT NULL list and the form ✓.
- **Placeholder scan:** Task 2 has complete, non-elided code for all five files.
- **Type consistency:** `readTimesheetFields` is given an explicit discriminated-union return type from the start (`ReadTimesheetFieldsResult`), avoiding the `TS2322` narrowing issue three separate Material Handling subagents each had to independently discover and fix — learned forward into this plan directly.
- **Consistency check against `Activity`'s existing derivation helper:** `lookupCompanyServiceUomForTimesheet` is structurally identical to `lookupCompanyServiceUomForContractService` (same three fields, same `.maybeSingle()` shape, same `?? null` fallback) — intentional, no invented variation.
- **Naming note for the implementer:** `timesheet.mh_job_id` (not `material_handling_job_id`) is the real column name — keep the form field/action key as `mh_job_id`.
