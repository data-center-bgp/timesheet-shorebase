# Period Management Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the fifth real CRUD feature on the ERD-derived schema — list, create, edit, and lock/unlock `Period` records, each scoping a billing/timesheet window to a Contract.

**Architecture:** One migration (required-field constraints, `locked` default/not-null, grants/RLS), then the same Server Component + Server Action pattern proven four times over. `company_id` is never shown on the form and is instead derived server-side from the selected Contract on every write (same pattern as `ContractService`). Unlike every prior feature, there is no `active` column — `locked` is Period's only lifecycle field, exposed as a Lock/Unlock button. No new nav entry is needed (`nav.ts` already has a "Periods" placeholder). No client-side auto-fill interactivity is needed (unlike `ContractService`'s UoM auto-fill) — every field is a plain `defaultValue` input.

**Tech Stack:** Next.js 16 App Router, React 19 (`useActionState`), `@supabase/ssr` server client, plain SQL migration applied via Supabase Studio's SQL editor.

## Global Constraints

- Required fields: Contract (dropdown), Name (text), Start date, End date. Optional: none.
- `company_id` never appears on the form. Both `createPeriod` and `updatePeriod` look up the selected `contract_id`'s current `company_id` server-side and write that — it always mirrors whichever contract the row currently points to. Same helper shape as `contract-services/actions.ts`'s `lookupCompanyIdForContract`, reimplemented locally in `periods/actions.ts` (no cross-feature action imports, matching existing conventions).
- `locked boolean not null default false` — Period's only lifecycle field. Lock/Unlock flips `locked` only, never `start_date`/`end_date`/`company_id`. This is NOT the `active` column pattern used by every prior feature — periods aren't soft-deleted, they're locked. Do not add an `active` column to this table.
- No new uniqueness constraint — nothing in the ERD specifies one and there's no obvious natural key on this table.
- Contract dropdown shows all rows regardless of status — same convention as every prior feature's Contract/Company dropdowns.
- `nav.ts` already has a "Periods" entry at `/periods` in the Master Data group — no nav changes needed.
- No automated test suite — verification is `npm run lint`, a production build, and manual checks against the running dev server.
- Migrations are applied by pasting the SQL into Supabase Studio's SQL editor by the project owner, never via `npx supabase db push` — verify afterward with `psql`.

---

### Task 1: Migration — required fields, locked default, grants/RLS

**Files:**
- Create: `supabase/migrations/20260826000000_period.sql`

**Interfaces:**
- Consumes: nothing — new migration on top of `supabase/migrations/20260817020000_clear_contract_service_test_rows.sql`.
- Produces: `timesheet_shorebase.period` gains required-field constraints on `contract_id`/`name`/`start_date`/`end_date`/`locked`, `locked` defaults `false`; `authenticated` can `select/insert/update`. Tasks 2–5 depend on this being live.

- [ ] **Step 1: Write the migration**

Create `supabase/migrations/20260826000000_period.sql`:

```sql
-- Adds Period's schema requirements: required-field constraints matching
-- the fields this feature's form treats as mandatory, and locked defaulting
-- to false. company_id stays nullable - the app derives it automatically
-- from the selected contract rather than the user setting it, same pattern
-- as contract_service.company_id. locked is Period's own lifecycle field
-- (a workflow lock, not a soft-delete status) - no active column is added.

begin;

alter table timesheet_shorebase.period
  alter column contract_id set not null;
alter table timesheet_shorebase.period
  alter column name set not null;
alter table timesheet_shorebase.period
  alter column start_date set not null;
alter table timesheet_shorebase.period
  alter column end_date set not null;
alter table timesheet_shorebase.period
  alter column locked set default false;
alter table timesheet_shorebase.period
  alter column locked set not null;

grant select, insert, update on timesheet_shorebase.period to authenticated;

alter table timesheet_shorebase.period enable row level security;

create policy "authenticated users can read/write periods"
  on timesheet_shorebase.period
  for all
  to authenticated
  using (true)
  with check (true);

commit;
```

Note: `alter column locked set default false` must run before `alter column locked set not null` — any existing rows with a null `locked` value would otherwise fail the `not null` constraint. (Live data currently has 0 rows in `period`, but the migration should be correct regardless of what's live when it runs.)

- [ ] **Step 2: Ask the project owner to apply the migration**

Paste the full contents of `supabase/migrations/20260826000000_period.sql` into Supabase Studio's SQL editor and run it there. Wait for confirmation it ran without error before continuing to Step 3.

- [ ] **Step 3: Verify against the real database**

```bash
source <(grep '^DATABASE_URL=' .env.local | sed 's/^/export /')
psql "$DATABASE_URL" -c "\d timesheet_shorebase.period"
psql "$DATABASE_URL" -c "select grantee, privilege_type from information_schema.role_table_grants where table_schema = 'timesheet_shorebase' and table_name = 'period' and grantee = 'authenticated' order by privilege_type;"
psql "$DATABASE_URL" -c "select policyname, cmd, roles from pg_policies where schemaname = 'timesheet_shorebase' and tablename = 'period';"
```

Expected:
- First query shows `contract_id`/`name`/`start_date`/`end_date`/`locked` all `not null`, `locked` defaulting `false`. `company_id` remains nullable.
- Second query returns three rows for `authenticated`: `INSERT`, `SELECT`, `UPDATE`.
- Third query returns one row: `authenticated users can read/write periods`, `cmd` = `ALL`, `roles` = `{authenticated}`.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260826000000_period.sql
git commit -m "Add required fields, locked default, and RLS for period"
```

---

### Task 2: Periods list page

**Files:**
- Create: `src/app/(app)/periods/page.tsx`

**Interfaces:**
- Consumes: `createClient` from `@/lib/supabase/server`. Requires Task 1's migration to be live.
- Produces: the `PeriodRow` shape, declared in `page.tsx` only. No `nav.ts` changes — the "Periods" entry already exists.

- [ ] **Step 1: Write the list page**

Create `src/app/(app)/periods/page.tsx`:

```tsx
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';

type PeriodRow = {
  id: number;
  name: string;
  start_date: string;
  end_date: string;
  locked: boolean;
  contract: { contract_number: string } | null;
};

export default async function PeriodsPage() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('period')
    .select('id, name, start_date, end_date, locked, contract(contract_number)')
    .order('start_date', { ascending: true });

  const periods = (data ?? []) as unknown as PeriodRow[];

  return (
    <div className="px-6 py-8">
      <div className="flex items-center justify-between">
        <div>
          <p className="font-mono text-xs font-medium tracking-[0.2em] text-zinc-500 dark:text-zinc-400">
            MASTER DATA
          </p>
          <h2 className="mt-1 text-2xl font-semibold text-zinc-950 dark:text-zinc-50">
            Periods
          </h2>
        </div>
        <Link
          href="/periods/new"
          className="rounded-md bg-teal-700 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-teal-800 dark:bg-teal-600 dark:hover:bg-teal-500"
        >
          Add period
        </Link>
      </div>

      {error && (
        <p role="alert" className="mt-4 text-sm text-red-600 dark:text-red-400">
          Couldn&apos;t load periods: {error.message}
        </p>
      )}

      {!error && periods.length === 0 && (
        <p className="mt-4 max-w-prose text-zinc-600 dark:text-zinc-400">
          No periods yet. Add your first one to get started.
        </p>
      )}

      {!error && periods.length > 0 && (
        <div className="mt-6 overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800">
          <table className="w-full text-sm">
            <thead className="border-b border-zinc-200 bg-zinc-50 text-left text-xs font-medium uppercase tracking-wide text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
              <tr>
                <th className="px-4 py-2">Name</th>
                <th className="px-4 py-2">Contract</th>
                <th className="px-4 py-2">Start date</th>
                <th className="px-4 py-2">End date</th>
                <th className="px-4 py-2">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {periods.map((period) => {
                const { locked } = period;
                return (
                  <tr key={period.id}>
                    <td className="px-4 py-2 font-medium text-zinc-900 dark:text-zinc-100">
                      <Link href={`/periods/${period.id}/edit`} className="hover:underline">
                        {period.name}
                      </Link>
                    </td>
                    <td className="px-4 py-2 text-zinc-600 dark:text-zinc-400">
                      {period.contract?.contract_number ?? '—'}
                    </td>
                    <td className="px-4 py-2 text-zinc-600 dark:text-zinc-400">{period.start_date}</td>
                    <td className="px-4 py-2 text-zinc-600 dark:text-zinc-400">{period.end_date}</td>
                    <td className="px-4 py-2">
                      <span
                        className={
                          locked
                            ? 'rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400'
                            : 'rounded-full bg-teal-50 px-2 py-0.5 text-xs font-medium text-teal-800 dark:bg-teal-950/40 dark:text-teal-300'
                        }
                      >
                        {locked ? 'Locked' : 'Open'}
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

`contract(contract_number)` is an unaliased embed — `period` has exactly one FK to `contract`, so PostgREST resolves it unambiguously by target table name (see `CLAUDE.md`'s note on this). Do not add an alias or hint.

- [ ] **Step 2: Run lint and build**

```bash
npm run lint
npm run build
```

Expected: both succeed with no errors.

- [ ] **Step 3: Verify in the browser**

Confirm Task 1's migration is live. Navigate to `http://localhost:3000/periods`.

Expected: the sidebar's existing "Periods" item now goes to a real page — no longer "Coming soon". The page shows "MASTER DATA / Periods", an "Add period" button, and "No periods yet. Add your first one to get started."

- [ ] **Step 4: Commit**

```bash
git add "src/app/(app)/periods/page.tsx"
git commit -m "Add periods list page"
```

---

### Task 3: Create period

**Files:**
- Create: `src/app/(app)/periods/actions.ts`
- Create: `src/app/(app)/periods/PeriodForm.tsx`
- Create: `src/app/(app)/periods/new/page.tsx`

**Interfaces:**
- Consumes: `createClient` from `@/lib/supabase/server`.
- Produces: `PeriodFormState = { error: string | null }`, `Period`, `ContractOption = { id: number; contract_number: string }` (all exported from `PeriodForm.tsx`, `Period` imported by Task 4's edit page). `createPeriod(prevState: PeriodFormState, formData: FormData): Promise<PeriodFormState>` (exported from `actions.ts`). `PeriodForm({ period?: Period; contracts: ContractOption[]; action: (prevState: PeriodFormState, formData: FormData) => Promise<PeriodFormState>; submitLabel: string })` (exported from `PeriodForm.tsx`, reused by Task 4).

- [ ] **Step 1: Write the Server Actions file**

Create `src/app/(app)/periods/actions.ts`:

```ts
'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

export type PeriodFormState = {
  error: string | null;
};

async function lookupCompanyIdForContract(
  supabase: Awaited<ReturnType<typeof createClient>>,
  contractId: number,
): Promise<number | null> {
  const { data } = await supabase
    .from('contract')
    .select('company_id')
    .eq('id', contractId)
    .maybeSingle();
  return data?.company_id ?? null;
}

export async function createPeriod(
  _prevState: PeriodFormState,
  formData: FormData,
): Promise<PeriodFormState> {
  const contractIdRaw = formData.get('contract_id') as string | null;
  const contractId = contractIdRaw ? Number(contractIdRaw) : NaN;
  if (!contractIdRaw || Number.isNaN(contractId)) {
    return { error: 'Contract is required.' };
  }

  const name = (formData.get('name') as string | null)?.trim();
  if (!name) {
    return { error: 'Name is required.' };
  }

  const startDate = (formData.get('start_date') as string | null)?.trim();
  if (!startDate) {
    return { error: 'Start date is required.' };
  }

  const endDate = (formData.get('end_date') as string | null)?.trim();
  if (!endDate) {
    return { error: 'End date is required.' };
  }

  const supabase = await createClient();
  const companyId = await lookupCompanyIdForContract(supabase, contractId);

  const { error } = await supabase.from('period').insert({
    contract_id: contractId,
    company_id: companyId,
    name,
    start_date: startDate,
    end_date: endDate,
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath('/periods');
  redirect('/periods');
}
```

`lookupCompanyIdForContract` is the mechanism behind the design's "never shown on the form, always derived server-side" rule — same shape as `contract-services/actions.ts`'s helper of the same name, reimplemented here rather than imported (no cross-feature action imports exist anywhere in this codebase).

- [ ] **Step 2: Write the shared form component**

Create `src/app/(app)/periods/PeriodForm.tsx`:

```tsx
'use client';

import { useActionState } from 'react';
import type { PeriodFormState } from './actions';

export type Period = {
  id: number;
  contract_id: number;
  name: string;
  start_date: string;
  end_date: string;
};

export type ContractOption = {
  id: number;
  contract_number: string;
};

const initialState: PeriodFormState = { error: null };

export function PeriodForm({
  period,
  contracts,
  action,
  submitLabel,
}: {
  period?: Period;
  contracts: ContractOption[];
  action: (prevState: PeriodFormState, formData: FormData) => Promise<PeriodFormState>;
  submitLabel: string;
}) {
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="mt-6 max-w-md space-y-4">
      <div className="space-y-1">
        <label htmlFor="contract_id" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Contract
        </label>
        <select
          id="contract_id"
          name="contract_id"
          required
          defaultValue={period?.contract_id ?? ''}
          className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-950 focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-600/40 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
        >
          <option value="" disabled>
            Select a contract
          </option>
          {contracts.map((contract) => (
            <option key={contract.id} value={contract.id}>
              {contract.contract_number}
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
          defaultValue={period?.name}
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
            required
            defaultValue={period?.start_date}
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
            required
            defaultValue={period?.end_date}
            className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-950 focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-600/40 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
          />
        </div>
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

No controlled fields, no `useState` — every field uses plain `defaultValue`, matching the majority pattern (`ContractServiceForm`'s controlled UoM select was a one-off need specific to that feature's auto-fill; Period has no equivalent cross-field dependency).

- [ ] **Step 3: Write the new-period route**

Create `src/app/(app)/periods/new/page.tsx`:

```tsx
import { PeriodForm } from '../PeriodForm';
import { createPeriod } from '../actions';
import { createClient } from '@/lib/supabase/server';

export default async function NewPeriodPage() {
  const supabase = await createClient();

  const { data: contractsData, error: contractsError } = await supabase
    .from('contract')
    .select('id, contract_number')
    .order('contract_number', { ascending: true });

  if (contractsError) {
    return (
      <div className="px-6 py-8">
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          Couldn&apos;t load contracts: {contractsError.message}
        </p>
      </div>
    );
  }

  const contracts = contractsData ?? [];

  return (
    <div className="px-6 py-8">
      <p className="font-mono text-xs font-medium tracking-[0.2em] text-zinc-500 dark:text-zinc-400">
        MASTER DATA
      </p>
      <h2 className="mt-1 text-2xl font-semibold text-zinc-950 dark:text-zinc-50">
        Add period
      </h2>
      <PeriodForm contracts={contracts} action={createPeriod} submitLabel="Create period" />
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

With the dev server running (and Task 1's migration confirmed live), navigate to `http://localhost:3000/periods/new`. There must be at least one real Contract in the database for this to be meaningfully testable — if the list is empty, create one first via `/contracts/new`.

Fill in the required fields and submit.

Expected: redirected to `/periods`, the new row appears with the correct contract number. Verify `company_id` was correctly derived (not shown in the UI): `psql "$DATABASE_URL" -c "select p.id, p.company_id, c.company_id as contract_company_id from timesheet_shorebase.period p join timesheet_shorebase.contract c on c.id = p.contract_id;"` — the two `company_id` values must match. Then test server-side validation: go back to `/periods/new`, enter a name that's only whitespace with everything else filled in — confirm the inline `{ error: 'Name is required.' }` message renders and the page does not redirect.

- [ ] **Step 6: Commit**

```bash
git add "src/app/(app)/periods/actions.ts" "src/app/(app)/periods/PeriodForm.tsx" "src/app/(app)/periods/new/page.tsx"
git commit -m "Add period creation form and action"
```

---

### Task 4: Edit period

**Files:**
- Modify: `src/app/(app)/periods/actions.ts`
- Create: `src/app/(app)/periods/[id]/edit/page.tsx`

**Interfaces:**
- Consumes: `PeriodForm`, `Period`, `ContractOption` from `../../PeriodForm`; `PeriodFormState` from `../../actions`.
- Produces: `updatePeriod(id: number, prevState: PeriodFormState, formData: FormData): Promise<PeriodFormState>`, added to `actions.ts` alongside `createPeriod`. Task 5 adds `lockPeriod`/`unlockPeriod` to this same file and adds a button to this same edit page.

- [ ] **Step 1: Add `updatePeriod` to the actions file**

In `src/app/(app)/periods/actions.ts`, add below `createPeriod`:

```ts
export async function updatePeriod(
  id: number,
  _prevState: PeriodFormState,
  formData: FormData,
): Promise<PeriodFormState> {
  const contractIdRaw = formData.get('contract_id') as string | null;
  const contractId = contractIdRaw ? Number(contractIdRaw) : NaN;
  if (!contractIdRaw || Number.isNaN(contractId)) {
    return { error: 'Contract is required.' };
  }

  const name = (formData.get('name') as string | null)?.trim();
  if (!name) {
    return { error: 'Name is required.' };
  }

  const startDate = (formData.get('start_date') as string | null)?.trim();
  if (!startDate) {
    return { error: 'Start date is required.' };
  }

  const endDate = (formData.get('end_date') as string | null)?.trim();
  if (!endDate) {
    return { error: 'End date is required.' };
  }

  const supabase = await createClient();
  const companyId = await lookupCompanyIdForContract(supabase, contractId);

  const { error } = await supabase
    .from('period')
    .update({
      contract_id: contractId,
      company_id: companyId,
      name,
      start_date: startDate,
      end_date: endDate,
    })
    .eq('id', id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath('/periods');
  redirect('/periods');
}
```

This re-derives `company_id` from whichever contract is currently selected on save — if the contract is changed during an edit, `company_id` is re-snapshotted to match, never left stale.

- [ ] **Step 2: Write the edit route**

Create `src/app/(app)/periods/[id]/edit/page.tsx`:

```tsx
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { PeriodForm, type Period } from '../../PeriodForm';
import { updatePeriod } from '../../actions';

export default async function EditPeriodPage(props: PageProps<'/periods/[id]/edit'>) {
  const { id } = await props.params;
  const periodId = Number(id);

  if (Number.isNaN(periodId)) {
    notFound();
  }

  const supabase = await createClient();
  const { data: period, error } = await supabase
    .from('period')
    .select('id, contract_id, name, start_date, end_date, locked')
    .eq('id', periodId)
    .maybeSingle();

  if (error) {
    return (
      <div className="px-6 py-8">
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          Couldn&apos;t load period: {error.message}
        </p>
      </div>
    );
  }

  if (!period) {
    notFound();
  }

  const { data: contractsData, error: contractsError } = await supabase
    .from('contract')
    .select('id, contract_number')
    .order('contract_number', { ascending: true });

  if (contractsError) {
    return (
      <div className="px-6 py-8">
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          Couldn&apos;t load contracts: {contractsError.message}
        </p>
      </div>
    );
  }

  const contracts = contractsData ?? [];

  const updatePeriodWithId = updatePeriod.bind(null, periodId);

  return (
    <div className="px-6 py-8">
      <p className="font-mono text-xs font-medium tracking-[0.2em] text-zinc-500 dark:text-zinc-400">
        MASTER DATA
      </p>
      <h2 className="mt-1 text-2xl font-semibold text-zinc-950 dark:text-zinc-50">
        Edit period
      </h2>
      <PeriodForm
        period={period as Period}
        contracts={contracts}
        action={updatePeriodWithId}
        submitLabel="Save changes"
      />
    </div>
  );
}
```

No Lock/Unlock button yet — that's Task 5.

- [ ] **Step 3: Run lint and build**

```bash
npm run lint
npm run build
```

Expected: both succeed with no errors.

- [ ] **Step 4: Verify in the browser**

Navigate to `http://localhost:3000/periods`, click the row created in Task 3. Confirm the form loads pre-filled: Contract dropdown pre-selected, Name and both dates correct. Change the Name and submit.

Expected: redirected to `/periods`, the row's name reflects the change. Also confirm visiting `/periods/999999/edit` (an id that doesn't exist) renders Next.js's 404 page, not a crash.

- [ ] **Step 5: Commit**

```bash
git add "src/app/(app)/periods/actions.ts" "src/app/(app)/periods/[id]/edit/page.tsx"
git commit -m "Add period edit form and action"
```

---

### Task 5: Lock and unlock

**Files:**
- Modify: `src/app/(app)/periods/actions.ts`
- Modify: `src/app/(app)/periods/[id]/edit/page.tsx`

**Interfaces:**
- Consumes: the `updatePeriodWithId` `.bind(null, periodId)` pattern already established in Task 4's edit page.
- Produces: `lockPeriod(id: number): Promise<void>` and `unlockPeriod(id: number): Promise<void>`, added to `actions.ts`. Nothing outside this task depends on these.

- [ ] **Step 1: Add the two actions**

In `src/app/(app)/periods/actions.ts`, add below `updatePeriod`:

```ts
export async function lockPeriod(id: number) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('period')
    .update({ locked: true })
    .eq('id', id)
    .select('id');

  if (error) {
    throw new Error(error.message);
  }
  if (!data || data.length === 0) {
    throw new Error('Period not found.');
  }

  revalidatePath('/periods');
  revalidatePath(`/periods/${id}/edit`);
}

export async function unlockPeriod(id: number) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('period')
    .update({ locked: false })
    .eq('id', id)
    .select('id');

  if (error) {
    throw new Error(error.message);
  }
  if (!data || data.length === 0) {
    throw new Error('Period not found.');
  }

  revalidatePath('/periods');
  revalidatePath(`/periods/${id}/edit`);
}
```

Same error-checked + zero-rows-affected guard shape as every prior feature's deactivate/reactivate pair — but flips `locked`, not `active`. These must ONLY touch the `locked` column — never `start_date`/`end_date`/`company_id`.

- [ ] **Step 2: Add the button to the edit page**

In `src/app/(app)/periods/[id]/edit/page.tsx`, update the imports and the returned JSX:

```tsx
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { PeriodForm, type Period } from '../../PeriodForm';
import { updatePeriod, lockPeriod, unlockPeriod } from '../../actions';
```

Replace the `updatePeriodWithId` line and everything below it with:

```tsx
  const { locked } = period;
  const updatePeriodWithId = updatePeriod.bind(null, periodId);
  const lockPeriodWithId = lockPeriod.bind(null, periodId);
  const unlockPeriodWithId = unlockPeriod.bind(null, periodId);

  return (
    <div className="px-6 py-8">
      <p className="font-mono text-xs font-medium tracking-[0.2em] text-zinc-500 dark:text-zinc-400">
        MASTER DATA
      </p>
      <div className="mt-1 flex items-center justify-between">
        <h2 className="text-2xl font-semibold text-zinc-950 dark:text-zinc-50">
          Edit period
        </h2>
        <form action={locked ? unlockPeriodWithId : lockPeriodWithId}>
          <button
            type="submit"
            className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-900"
          >
            {locked ? 'Unlock' : 'Lock'}
          </button>
        </form>
      </div>
      <PeriodForm
        period={period as Period}
        contracts={contracts}
        action={updatePeriodWithId}
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

On the period's edit page from Task 4, note its Start date/End date and the derived `company_id` (via the same `psql` join query from Task 3's verification). Click "Lock". Confirm the button submits, the page reloads, and the button now reads "Unlock". Navigate to `/periods` and confirm the Status column shows "Locked". Go back to the edit page, click "Unlock", confirm the button reverts to "Lock" and `/periods` shows "Open" again — with dates and the derived `company_id` completely unchanged throughout the whole cycle.

- [ ] **Step 5: Commit**

```bash
git add "src/app/(app)/periods/actions.ts" "src/app/(app)/periods/[id]/edit/page.tsx"
git commit -m "Add period lock/unlock actions"
```

---

## Self-Review Notes

- **Spec coverage:** required-field constraints + `locked` default/not-null + grants/RLS ✓ (Task 1). No new nav entry — confirmed `nav.ts` already has a "Periods" placeholder, no task touches `nav.ts`. List page with joined contract name and Locked/Open status ✓ (Task 2). `company_id` never on the form, always derived server-side ✓ (Task 3's `lookupCompanyIdForContract`, reused unchanged by Task 4's `updatePeriod`). No auto-fill/controlled-field logic — confirmed Period has no cross-field dependency like ContractService's UoM, so `PeriodForm` uses only `defaultValue` fields. Lock/Unlock flips `locked` only, built correctly from the start, no `active` column added ✓ (Task 5).
- **Placeholder scan:** none — every step has complete, runnable code.
- **Type consistency:** `Period` (id/contract_id/name/start_date/end_date) defined once in `PeriodForm.tsx`, imported by the edit page (Task 4) — deliberately excludes `locked`, since `locked` is read directly off the fetched row in the edit page rather than being part of the form's typed prop shape (matching how `ContractService`'s `active` field was handled: destructured from the raw fetched row, not part of the `ContractService` type in `ContractServiceForm.tsx`). `ContractOption` defined once in `PeriodForm.tsx`, used by both `new/page.tsx` and `[id]/edit/page.tsx`. `PeriodFormState` defined once in `actions.ts`, imported by `PeriodForm.tsx`. `createPeriod`'s signature `(prevState, formData)` and `updatePeriod`'s `(id, prevState, formData)` both match how `PeriodForm`'s `action` prop is typed and how `.bind(null, id)` is used in the edit page — same shape as every prior feature. `lockPeriod`/`unlockPeriod` take only `id`, matching the proven deactivate/reactivate shape exactly — error-checked, zero-rows-affected guard, flips one column only. `lookupCompanyIdForContract` is defined once in `actions.ts` and called identically by both `createPeriod` and `updatePeriod` — not duplicated.
