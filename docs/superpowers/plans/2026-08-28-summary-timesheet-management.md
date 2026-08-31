# Summary Timesheet Management Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Full CRUD (list/create/edit/deactivate-reactivate) for `SummaryTimesheet` — a standalone flat entity, all six fields required, no derivation, no self-reference.

**Architecture:** One migration (required-field constraints, `active` column, grants/RLS), then one task builds the entire CRUD surface — no new UI patterns needed anywhere in this feature, every dropdown shape and the Deactivate/Reactivate toggle have all shipped before.

**Tech Stack:** Next.js 16 App Router, React 19 (`useActionState`), `@supabase/ssr` server client, plain SQL migration applied via Supabase Studio's SQL editor.

## Global Constraints

- `active boolean not null default true` on `summary_timesheet`; Deactivate/Reactivate flips only that column.
- Required: `period_id`, `type_code`, `contract_id`, `company_id`, `code`, `issue_date` — all six, no optional fields on this form.
- No derivation helpers — every field is independently chosen.
- Nav: `nav.ts` already has `{ label: 'Summary Timesheets', icon: FileStack, href: '/summary-timesheets' }` in Approvals & Billing — no nav changes needed.
- Dropdown sources already granted to `authenticated` from prior features: `period`, `timesheet_type`, `contract`, `company`. Only `summary_timesheet` itself needs grants in this migration.
- No automated test suite — verification is `npm run lint`, a production build, and manual checks against the running dev server.
- Migrations are applied by pasting the SQL into Supabase Studio's SQL editor by the project owner, never via `npx supabase db push` — verify afterward with `psql`.
- **Commit the design spec + plan docs themselves** (`docs/superpowers/specs/2026-08-28-summary-timesheet-management-design.md`, this file) as their own commit before or alongside Task 1 — do not let this slip to the end (missed for three features in a row in the prior session).

---

### Task 1: Migration

**Files:**
- Create: `supabase/migrations/20260829000000_summary_timesheet.sql`

- [ ] **Step 1: Write the migration**

Create `supabase/migrations/20260829000000_summary_timesheet.sql`:

```sql
-- Adds required-field constraints matching SummaryTimesheet's form (all
-- six columns are required - a summary timesheet is a concrete
-- generated document, not a broad template like ApprovalWorkflow), plus
-- the active-column convention (see CLAUDE.md).

begin;

alter table timesheet_shorebase.summary_timesheet
  alter column period_id set not null;
alter table timesheet_shorebase.summary_timesheet
  alter column type_code set not null;
alter table timesheet_shorebase.summary_timesheet
  alter column contract_id set not null;
alter table timesheet_shorebase.summary_timesheet
  alter column company_id set not null;
alter table timesheet_shorebase.summary_timesheet
  alter column code set not null;
alter table timesheet_shorebase.summary_timesheet
  alter column issue_date set not null;
alter table timesheet_shorebase.summary_timesheet
  add column active boolean not null default true;
grant select, insert, update on timesheet_shorebase.summary_timesheet to authenticated;
alter table timesheet_shorebase.summary_timesheet enable row level security;
create policy "authenticated users can read/write summary timesheets"
  on timesheet_shorebase.summary_timesheet for all to authenticated using (true) with check (true);

commit;
```

- [ ] **Step 2: Ask the project owner to apply the migration**

Paste the full contents into Supabase Studio's SQL editor and run it. Wait for confirmation before continuing.

- [ ] **Step 3: Verify against the real database**

```bash
source <(grep '^DATABASE_URL=' .env.local | sed 's/^/export /')
psql "$DATABASE_URL" -c "\d timesheet_shorebase.summary_timesheet"
psql "$DATABASE_URL" -c "select tablename, policyname, cmd, roles from pg_policies where schemaname = 'timesheet_shorebase' and tablename = 'summary_timesheet';"
```

Expected: all six columns `not null`; `active` present, defaulting `true`; one RLS policy, `cmd = ALL`, `roles = {authenticated}`.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260829000000_summary_timesheet.sql
git commit -m "Add summary timesheet schema changes (required fields, active column, grants/RLS)"
```

---

### Task 2: Summary Timesheet — full CRUD

**Files:**
- Create: `src/app/(app)/summary-timesheets/page.tsx`
- Create: `src/app/(app)/summary-timesheets/actions.ts`
- Create: `src/app/(app)/summary-timesheets/SummaryTimesheetForm.tsx`
- Create: `src/app/(app)/summary-timesheets/new/page.tsx`
- Create: `src/app/(app)/summary-timesheets/[id]/edit/page.tsx`

**Interfaces:**
- Produces: `SummaryTimesheetFormState = { error: string | null }`, `SummaryTimesheet`, `PeriodOption`, `TimesheetTypeOption`, `ContractOption`, `CompanyOption`, all in `SummaryTimesheetForm.tsx`. `createSummaryTimesheet`, `updateSummaryTimesheet`, `deactivateSummaryTimesheet`, `reactivateSummaryTimesheet` in `actions.ts`.

- [ ] **Step 1: List page**

Create `src/app/(app)/summary-timesheets/page.tsx`:

```tsx
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';

type SummaryTimesheetRow = {
  id: number;
  code: string;
  issue_date: string;
  active: boolean;
  period: { name: string } | null;
  contract: { contract_name: string } | null;
  company: { name: string } | null;
};

export default async function SummaryTimesheetsPage() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('summary_timesheet')
    .select('id, code, issue_date, active, period(name), contract(contract_name), company(name)')
    .order('issue_date', { ascending: true });

  const summaryTimesheets = (data ?? []) as unknown as SummaryTimesheetRow[];

  return (
    <div className="px-6 py-8">
      <div className="flex items-center justify-between">
        <div>
          <p className="font-mono text-xs font-medium tracking-[0.2em] text-zinc-500 dark:text-zinc-400">
            APPROVALS &amp; BILLING
          </p>
          <h2 className="mt-1 text-2xl font-semibold text-zinc-950 dark:text-zinc-50">
            Summary Timesheets
          </h2>
        </div>
        <Link
          href="/summary-timesheets/new"
          className="rounded-md bg-teal-700 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-teal-800 dark:bg-teal-600 dark:hover:bg-teal-500"
        >
          Add summary timesheet
        </Link>
      </div>

      {error && (
        <p role="alert" className="mt-4 text-sm text-red-600 dark:text-red-400">
          Couldn&apos;t load summary timesheets: {error.message}
        </p>
      )}

      {!error && summaryTimesheets.length === 0 && (
        <p className="mt-4 max-w-prose text-zinc-600 dark:text-zinc-400">
          No summary timesheets yet. Add your first one to get started.
        </p>
      )}

      {!error && summaryTimesheets.length > 0 && (
        <div className="mt-6 overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800">
          <table className="w-full text-sm">
            <thead className="border-b border-zinc-200 bg-zinc-50 text-left text-xs font-medium uppercase tracking-wide text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
              <tr>
                <th className="px-4 py-2">Code</th>
                <th className="px-4 py-2">Period</th>
                <th className="px-4 py-2">Contract</th>
                <th className="px-4 py-2">Company</th>
                <th className="px-4 py-2">Issue date</th>
                <th className="px-4 py-2">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {summaryTimesheets.map((summaryTimesheet) => {
                const { active } = summaryTimesheet;
                return (
                  <tr key={summaryTimesheet.id}>
                    <td className="px-4 py-2 font-medium text-zinc-900 dark:text-zinc-100">
                      <Link href={`/summary-timesheets/${summaryTimesheet.id}/edit`} className="hover:underline">
                        {summaryTimesheet.code}
                      </Link>
                    </td>
                    <td className="px-4 py-2 text-zinc-600 dark:text-zinc-400">
                      {summaryTimesheet.period?.name ?? '—'}
                    </td>
                    <td className="px-4 py-2 text-zinc-600 dark:text-zinc-400">
                      {summaryTimesheet.contract?.contract_name ?? '—'}
                    </td>
                    <td className="px-4 py-2 text-zinc-600 dark:text-zinc-400">
                      {summaryTimesheet.company?.name ?? '—'}
                    </td>
                    <td className="px-4 py-2 text-zinc-600 dark:text-zinc-400">{summaryTimesheet.issue_date}</td>
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

Create `src/app/(app)/summary-timesheets/actions.ts`:

```ts
'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

export type SummaryTimesheetFormState = {
  error: string | null;
};

type ReadSummaryTimesheetFieldsResult =
  | { error: string }
  | {
      values: {
        period_id: number;
        type_code: string;
        contract_id: number;
        company_id: number;
        code: string;
        issue_date: string;
      };
    };

function readSummaryTimesheetFields(formData: FormData): ReadSummaryTimesheetFieldsResult {
  const periodIdRaw = formData.get('period_id') as string | null;
  const typeCode = (formData.get('type_code') as string | null)?.trim();
  const contractIdRaw = formData.get('contract_id') as string | null;
  const companyIdRaw = formData.get('company_id') as string | null;
  const code = (formData.get('code') as string | null)?.trim();
  const issueDate = (formData.get('issue_date') as string | null) || null;

  if (!periodIdRaw || !typeCode || !contractIdRaw || !companyIdRaw || !code || !issueDate) {
    return { error: 'Period, timesheet type, contract, company, code, and issue date are all required.' };
  }

  const periodId = Number(periodIdRaw);
  const contractId = Number(contractIdRaw);
  const companyId = Number(companyIdRaw);
  if (Number.isNaN(periodId) || Number.isNaN(contractId) || Number.isNaN(companyId)) {
    return { error: 'Invalid period, contract, or company.' };
  }

  return {
    values: {
      period_id: periodId,
      type_code: typeCode,
      contract_id: contractId,
      company_id: companyId,
      code,
      issue_date: issueDate,
    },
  };
}

export async function createSummaryTimesheet(
  _prevState: SummaryTimesheetFormState,
  formData: FormData,
): Promise<SummaryTimesheetFormState> {
  const parsed = readSummaryTimesheetFields(formData);
  if ('error' in parsed) {
    return { error: parsed.error };
  }

  const supabase = await createClient();
  const { error } = await supabase.from('summary_timesheet').insert(parsed.values);

  if (error) {
    return { error: error.message };
  }

  revalidatePath('/summary-timesheets');
  redirect('/summary-timesheets');
}

export async function updateSummaryTimesheet(
  id: number,
  _prevState: SummaryTimesheetFormState,
  formData: FormData,
): Promise<SummaryTimesheetFormState> {
  const parsed = readSummaryTimesheetFields(formData);
  if ('error' in parsed) {
    return { error: parsed.error };
  }

  const supabase = await createClient();
  const { error } = await supabase.from('summary_timesheet').update(parsed.values).eq('id', id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath('/summary-timesheets');
  redirect('/summary-timesheets');
}

export async function deactivateSummaryTimesheet(id: number) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('summary_timesheet')
    .update({ active: false })
    .eq('id', id)
    .select('id');

  if (error) {
    throw new Error(error.message);
  }
  if (!data || data.length === 0) {
    throw new Error('Summary timesheet not found.');
  }

  revalidatePath('/summary-timesheets');
  revalidatePath(`/summary-timesheets/${id}/edit`);
}

export async function reactivateSummaryTimesheet(id: number) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('summary_timesheet')
    .update({ active: true })
    .eq('id', id)
    .select('id');

  if (error) {
    throw new Error(error.message);
  }
  if (!data || data.length === 0) {
    throw new Error('Summary timesheet not found.');
  }

  revalidatePath('/summary-timesheets');
  revalidatePath(`/summary-timesheets/${id}/edit`);
}
```

- [ ] **Step 3: Form component**

Create `src/app/(app)/summary-timesheets/SummaryTimesheetForm.tsx`:

```tsx
'use client';

import { useActionState } from 'react';
import type { SummaryTimesheetFormState } from './actions';

export type SummaryTimesheet = {
  id: number;
  period_id: number;
  type_code: string;
  contract_id: number;
  company_id: number;
  code: string;
  issue_date: string;
};

export type PeriodOption = { id: number; name: string };
export type TimesheetTypeOption = { code: string; name: string };
export type ContractOption = { id: number; contract_name: string };
export type CompanyOption = { id: number; name: string };

const initialState: SummaryTimesheetFormState = { error: null };

export function SummaryTimesheetForm({
  summaryTimesheet,
  periods,
  timesheetTypes,
  contracts,
  companies,
  action,
  submitLabel,
}: {
  summaryTimesheet?: SummaryTimesheet;
  periods: PeriodOption[];
  timesheetTypes: TimesheetTypeOption[];
  contracts: ContractOption[];
  companies: CompanyOption[];
  action: (prevState: SummaryTimesheetFormState, formData: FormData) => Promise<SummaryTimesheetFormState>;
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
          defaultValue={summaryTimesheet?.period_id ?? ''}
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
          defaultValue={summaryTimesheet?.type_code ?? ''}
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
        <label htmlFor="contract_id" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Contract
        </label>
        <select
          id="contract_id"
          name="contract_id"
          required
          defaultValue={summaryTimesheet?.contract_id ?? ''}
          className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-950 focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-600/40 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
        >
          <option value="" disabled>
            Select a contract
          </option>
          {contracts.map((contract) => (
            <option key={contract.id} value={contract.id}>
              {contract.contract_name}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-1">
        <label htmlFor="company_id" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Company
        </label>
        <select
          id="company_id"
          name="company_id"
          required
          defaultValue={summaryTimesheet?.company_id ?? ''}
          className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-950 focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-600/40 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
        >
          <option value="" disabled>
            Select a company
          </option>
          {companies.map((company) => (
            <option key={company.id} value={company.id}>
              {company.name}
            </option>
          ))}
        </select>
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
          defaultValue={summaryTimesheet?.code}
          className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-950 focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-600/40 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
        />
      </div>

      <div className="space-y-1">
        <label htmlFor="issue_date" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Issue date
        </label>
        <input
          id="issue_date"
          name="issue_date"
          type="date"
          required
          defaultValue={summaryTimesheet?.issue_date}
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

Create `src/app/(app)/summary-timesheets/new/page.tsx`:

```tsx
import { SummaryTimesheetForm } from '../SummaryTimesheetForm';
import { createSummaryTimesheet } from '../actions';
import { createClient } from '@/lib/supabase/server';

export default async function NewSummaryTimesheetPage() {
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

  const { data: contractsData, error: contractsError } = await supabase
    .from('contract')
    .select('id, contract_name')
    .order('contract_name', { ascending: true });
  if (contractsError) {
    return (
      <div className="px-6 py-8">
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          Couldn&apos;t load contracts: {contractsError.message}
        </p>
      </div>
    );
  }

  const { data: companiesData, error: companiesError } = await supabase
    .from('company')
    .select('id, name')
    .order('name', { ascending: true });
  if (companiesError) {
    return (
      <div className="px-6 py-8">
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          Couldn&apos;t load companies: {companiesError.message}
        </p>
      </div>
    );
  }

  const periods = periodsData ?? [];
  const timesheetTypes = timesheetTypesData ?? [];
  const contracts = contractsData ?? [];
  const companies = companiesData ?? [];

  return (
    <div className="px-6 py-8">
      <p className="font-mono text-xs font-medium tracking-[0.2em] text-zinc-500 dark:text-zinc-400">
        APPROVALS &amp; BILLING
      </p>
      <h2 className="mt-1 text-2xl font-semibold text-zinc-950 dark:text-zinc-50">
        Add summary timesheet
      </h2>
      <SummaryTimesheetForm
        periods={periods}
        timesheetTypes={timesheetTypes}
        contracts={contracts}
        companies={companies}
        action={createSummaryTimesheet}
        submitLabel="Create summary timesheet"
      />
    </div>
  );
}
```

- [ ] **Step 5: Edit route (with Deactivate/Reactivate from the start)**

Create `src/app/(app)/summary-timesheets/[id]/edit/page.tsx`:

```tsx
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { SummaryTimesheetForm, type SummaryTimesheet } from '../../SummaryTimesheetForm';
import {
  updateSummaryTimesheet,
  deactivateSummaryTimesheet,
  reactivateSummaryTimesheet,
} from '../../actions';

export default async function EditSummaryTimesheetPage(props: PageProps<'/summary-timesheets/[id]/edit'>) {
  const { id } = await props.params;
  const summaryTimesheetId = Number(id);

  if (Number.isNaN(summaryTimesheetId)) {
    notFound();
  }

  const supabase = await createClient();

  const { data: summaryTimesheet, error } = await supabase
    .from('summary_timesheet')
    .select('id, period_id, type_code, contract_id, company_id, code, issue_date, active')
    .eq('id', summaryTimesheetId)
    .maybeSingle();

  if (error) {
    return (
      <div className="px-6 py-8">
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          Couldn&apos;t load summary timesheet: {error.message}
        </p>
      </div>
    );
  }

  if (!summaryTimesheet) {
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

  const { data: contractsData, error: contractsError } = await supabase
    .from('contract')
    .select('id, contract_name')
    .order('contract_name', { ascending: true });
  if (contractsError) {
    return (
      <div className="px-6 py-8">
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          Couldn&apos;t load contracts: {contractsError.message}
        </p>
      </div>
    );
  }

  const { data: companiesData, error: companiesError } = await supabase
    .from('company')
    .select('id, name')
    .order('name', { ascending: true });
  if (companiesError) {
    return (
      <div className="px-6 py-8">
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          Couldn&apos;t load companies: {companiesError.message}
        </p>
      </div>
    );
  }

  const periods = periodsData ?? [];
  const timesheetTypes = timesheetTypesData ?? [];
  const contracts = contractsData ?? [];
  const companies = companiesData ?? [];

  const { active } = summaryTimesheet;
  const updateSummaryTimesheetWithId = updateSummaryTimesheet.bind(null, summaryTimesheetId);
  const deactivateSummaryTimesheetWithId = deactivateSummaryTimesheet.bind(null, summaryTimesheetId);
  const reactivateSummaryTimesheetWithId = reactivateSummaryTimesheet.bind(null, summaryTimesheetId);

  return (
    <div className="px-6 py-8">
      <p className="font-mono text-xs font-medium tracking-[0.2em] text-zinc-500 dark:text-zinc-400">
        APPROVALS &amp; BILLING
      </p>
      <div className="mt-1 flex items-center justify-between">
        <h2 className="text-2xl font-semibold text-zinc-950 dark:text-zinc-50">
          Edit summary timesheet
        </h2>
        <form action={active ? deactivateSummaryTimesheetWithId : reactivateSummaryTimesheetWithId}>
          <button
            type="submit"
            className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-900"
          >
            {active ? 'Deactivate' : 'Reactivate'}
          </button>
        </form>
      </div>
      <SummaryTimesheetForm
        summaryTimesheet={summaryTimesheet as SummaryTimesheet}
        periods={periods}
        timesheetTypes={timesheetTypes}
        contracts={contracts}
        companies={companies}
        action={updateSummaryTimesheetWithId}
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

Create a summary timesheet against real Period/Contract/Company, picking a Timesheet type, setting Code and Issue date. Confirm the list shows all three linked names correctly. Edit it, change the linked Contract, save, confirm it persists. Cycle Deactivate → confirm Inactive → Reactivate → confirm Active, confirm via `psql` no other column changed. Confirm `/summary-timesheets/999999/edit` renders a 404.

- [ ] **Step 8: Commit**

```bash
git add "src/app/(app)/summary-timesheets/"
git commit -m "Add summary timesheet management (list, create, edit, deactivate/reactivate)"
```

---

## Self-Review Notes

- **Spec coverage:** all six required fields ✓, `active` column ✓, grants/RLS ✓ (Task 1). Full CRUD with Deactivate/Reactivate built in from the start ✓ (Task 2). No derivation helpers, matching the spec's explicit call-out that none are needed ✓.
- **Placeholder scan:** Task 2 has complete, non-elided code for all five files.
- **Type consistency:** `readSummaryTimesheetFields` given an explicit discriminated-union return type from the start, matching the pattern established across every recent feature (Material Handling, Timesheet, Approvals) to avoid the `TS2322` narrowing issue.
- **Naming note for the implementer:** `contract.contract_name` (not `name`) is Contract's identifying column, same as `ApprovalWorkflow`'s Contract dropdown — don't second-guess it.
