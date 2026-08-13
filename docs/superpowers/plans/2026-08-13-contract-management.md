# Contract Management Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the second real CRUD feature on the ERD-derived schema — list, create, edit, and deactivate/reactivate `Contract` records, each tied to a `Company` — following the exact pattern Company management established, extended with a company-selection dropdown and a joined company name on the list.

**Architecture:** One SQL migration extending the RLS pattern already applied to `company`, a small shared-helper extraction to stop a duplicated active/inactive computation before it reaches a third copy, then four Next.js App Router pieces mirroring Company's Server Component + Server Action shape exactly.

**Tech Stack:** Next.js 16 App Router, React 19 (`useActionState`), `@supabase/ssr` server client (`src/lib/supabase/server.ts`), plain SQL migration applied via Supabase Studio's SQL editor (per `CLAUDE.md`).

## Global Constraints

- `timesheet_shorebase.contract` already exists (`id`, `company_id` FK to `company.id`, `contract_number`, `start_date`, `end_date`) — no column changes, only a new RLS policy and grants.
- RLS policy is a single, non-role-distinguishing rule: any `authenticated` user can read/write. Schema-level `usage` was already granted to `authenticated` by the Company migration (`20260812000000_company_rls.sql`) — only the table-level grants and policy are new here.
- No hard-delete. "Deactivate" sets `end_date` to today; "Reactivate" clears it to `null`. Active = `end_date` is `null` or `>` today (strictly future — matches the boundary-condition fix already applied to Company).
- No uniqueness enforcement on `contract_number` — required, but duplicates aren't a database constraint in this pass.
- The company dropdown on the Contract form always lists every company, regardless of Active/Inactive status — no filtering.
- No automated test suite — verification is `npm run lint`, a production build, and manual checks against the running dev server.
- Migrations are applied by pasting the SQL into Supabase Studio's SQL editor by the project owner, never via `npx supabase db push` — verify afterward with `psql`, sourcing `DATABASE_URL` from `.env.local` via `source <(grep '^DATABASE_URL=' .env.local | sed 's/^/export /')` and never printing the raw value.
- Never query `auth.users`, never handle the project owner's real password.
- `src/components/app-shell/nav.ts` already has `href: '/contracts'` set — once `src/app/(app)/contracts/page.tsx` exists, Next.js resolves `/contracts` there automatically instead of the `[section]` coming-soon catch-all. No nav.ts change is part of this plan.

---

### Task 1: Contract RLS policy and grants

**Files:**
- Create: `supabase/migrations/20260813000000_contract_rls.sql`

**Interfaces:**
- Consumes: nothing — new migration on top of `supabase/migrations/20260812000000_company_rls.sql`.
- Produces: `authenticated` can `SELECT`/`INSERT`/`UPDATE` on `timesheet_shorebase.contract`, gated by a permissive RLS policy. Tasks 3–6 depend on this being applied to the live database before their browser-verification steps show real data instead of a permission error.

- [ ] **Step 1: Write the migration**

Create `supabase/migrations/20260813000000_contract_rls.sql`:

```sql
-- Extends the RLS pattern already applied to `company` (see
-- 20260812000000_company_rls.sql) to `contract`. Schema-level `usage` was
-- already granted to `authenticated` there - only the table grants and
-- policy are new here.

begin;

grant select, insert, update on timesheet_shorebase.contract to authenticated;

alter table timesheet_shorebase.contract enable row level security;

create policy "authenticated users can read/write contracts"
  on timesheet_shorebase.contract
  for all
  to authenticated
  using (true)
  with check (true);

commit;
```

- [ ] **Step 2: Ask the project owner to apply the migration**

Paste the full contents of `supabase/migrations/20260813000000_contract_rls.sql` into Supabase Studio's SQL editor and run it there. Wait for confirmation it ran without error before continuing to Step 3.

- [ ] **Step 3: Verify against the real database**

```bash
source <(grep '^DATABASE_URL=' .env.local | sed 's/^/export /')
psql "$DATABASE_URL" -c "select grantee, privilege_type from information_schema.role_table_grants where table_schema = 'timesheet_shorebase' and table_name = 'contract' and grantee = 'authenticated' order by privilege_type;"
psql "$DATABASE_URL" -c "select policyname, cmd, roles from pg_policies where schemaname = 'timesheet_shorebase' and tablename = 'contract';"
psql "$DATABASE_URL" -c "select relrowsecurity from pg_class where relname = 'contract' and relnamespace = 'timesheet_shorebase'::regnamespace;"
```

Expected:
- First query returns exactly three rows for `authenticated`: `INSERT`, `SELECT`, `UPDATE`.
- Second query returns one row: `policyname` = `authenticated users can read/write contracts`, `cmd` = `ALL`, `roles` = `{authenticated}`.
- Third query returns `t`.

Do not query `auth.users` at any point.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260813000000_contract_rls.sql
git commit -m "Add RLS policy and grants for timesheet_shorebase.contract"
```

---

### Task 2: Shared `isActiveByEndDate` helper

**Files:**
- Modify: `src/lib/date.ts`
- Modify: `src/app/(app)/companies/page.tsx`
- Modify: `src/app/(app)/companies/[id]/edit/page.tsx`

**Interfaces:**
- Consumes: nothing new.
- Produces: `isActiveByEndDate(endDate: string | null): boolean`, exported from `src/lib/date.ts`. Task 3 (contracts list page) and Task 6 (contract edit page) both call this instead of writing a third copy of the same logic.

This task is a pure refactor — Company's active/inactive behavior must not change. It exists because Company's list and edit pages currently each have their own copy of "is this row active" (`end_date` null or `> today`), and Contract needs the identical logic; extracting it now stops the duplication at two call sites instead of letting it reach a third.

- [ ] **Step 1: Add the helper**

`src/lib/date.ts` currently contains only `todayLocal`. Add below it:

```ts
export function isActiveByEndDate(endDate: string | null): boolean {
  if (!endDate) return true;
  return endDate > todayLocal();
}
```

- [ ] **Step 2: Refactor the companies list page to use it**

In `src/app/(app)/companies/page.tsx`, change the import from:

```ts
import { todayLocal } from '@/lib/date';
```

to:

```ts
import { isActiveByEndDate } from '@/lib/date';
```

Delete the local `isActive` function entirely (the block below the `CompanyRow` type):

```ts
function isActive(company: CompanyRow): boolean {
  if (!company.end_date) return true;
  const today = todayLocal();
  return company.end_date > today;
}
```

In the component body, change:

```ts
const active = isActive(company);
```

to:

```ts
const active = isActiveByEndDate(company.end_date);
```

- [ ] **Step 3: Refactor the company edit page to use it**

In `src/app/(app)/companies/[id]/edit/page.tsx`, change the import from:

```ts
import { todayLocal } from '@/lib/date';
```

to:

```ts
import { isActiveByEndDate } from '@/lib/date';
```

Change:

```ts
const today = todayLocal();
const active = !company.end_date || company.end_date > today;
```

to:

```ts
const active = isActiveByEndDate(company.end_date);
```

- [ ] **Step 4: Run lint and build**

```bash
npm run lint
npm run build
```

Expected: both succeed with no errors.

- [ ] **Step 5: Verify Company's behavior is unchanged**

With the dev server running and an authenticated session, navigate to `/companies`. Confirm the existing company row(s) still show the same Active/Inactive status they showed before this refactor (this is a pure refactor — nothing about Company's displayed data should differ). Open an existing company's edit page and confirm its Deactivate/Reactivate button still shows the correct label and still works.

- [ ] **Step 6: Commit**

```bash
git add src/lib/date.ts "src/app/(app)/companies/page.tsx" "src/app/(app)/companies/[id]/edit/page.tsx"
git commit -m "Extract isActiveByEndDate helper, use it in Company pages"
```

---

### Task 3: Contracts list page

**Files:**
- Create: `src/app/(app)/contracts/page.tsx`

**Interfaces:**
- Consumes: `createClient` from `@/lib/supabase/server`; `isActiveByEndDate` from `@/lib/date` (Task 2). Requires Task 1's migration to be live for the query to return data instead of a permission error.
- Produces: the `ContractRow` shape (`id: number`, `contract_number: string`, `start_date: string | null`, `end_date: string | null`, `company: { name: string } | null`), declared in this file only — no other task imports it.

- [ ] **Step 1: Write the list page**

Create `src/app/(app)/contracts/page.tsx`:

```tsx
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { isActiveByEndDate } from '@/lib/date';

type ContractRow = {
  id: number;
  contract_number: string;
  start_date: string | null;
  end_date: string | null;
  company: { name: string } | null;
};

export default async function ContractsPage() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('contract')
    .select('id, contract_number, start_date, end_date, company(name)')
    .order('contract_number', { ascending: true });

  const contracts = (data ?? []) as ContractRow[];

  return (
    <div className="px-6 py-8">
      <div className="flex items-center justify-between">
        <div>
          <p className="font-mono text-xs font-medium tracking-[0.2em] text-zinc-500 dark:text-zinc-400">
            MASTER DATA
          </p>
          <h2 className="mt-1 text-2xl font-semibold text-zinc-950 dark:text-zinc-50">
            Contracts
          </h2>
        </div>
        <Link
          href="/contracts/new"
          className="rounded-md bg-teal-700 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-teal-800 dark:bg-teal-600 dark:hover:bg-teal-500"
        >
          Add contract
        </Link>
      </div>

      {error && (
        <p role="alert" className="mt-4 text-sm text-red-600 dark:text-red-400">
          Couldn&apos;t load contracts: {error.message}
        </p>
      )}

      {!error && contracts.length === 0 && (
        <p className="mt-4 max-w-prose text-zinc-600 dark:text-zinc-400">
          No contracts yet. Add your first one to get started.
        </p>
      )}

      {!error && contracts.length > 0 && (
        <div className="mt-6 overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800">
          <table className="w-full text-sm">
            <thead className="border-b border-zinc-200 bg-zinc-50 text-left text-xs font-medium uppercase tracking-wide text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
              <tr>
                <th className="px-4 py-2">Contract number</th>
                <th className="px-4 py-2">Company</th>
                <th className="px-4 py-2">Status</th>
                <th className="px-4 py-2">Start date</th>
                <th className="px-4 py-2">End date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {contracts.map((contract) => {
                const active = isActiveByEndDate(contract.end_date);
                return (
                  <tr key={contract.id}>
                    <td className="px-4 py-2 font-medium text-zinc-900 dark:text-zinc-100">
                      <Link href={`/contracts/${contract.id}/edit`} className="hover:underline">
                        {contract.contract_number}
                      </Link>
                    </td>
                    <td className="px-4 py-2 text-zinc-600 dark:text-zinc-400">
                      {contract.company?.name ?? '—'}
                    </td>
                    <td className="px-4 py-2">
                      <span
                        className={
                          active
                            ? 'rounded-full bg-teal-50 px-2 py-0.5 text-xs font-medium text-teal-800 dark:bg-teal-950/40 dark:text-teal-300'
                            : 'rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400'
                        }
                      >
                        {active ? 'Active' : 'Expired'}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-zinc-600 dark:text-zinc-400">
                      {contract.start_date ?? '—'}
                    </td>
                    <td className="px-4 py-2 text-zinc-600 dark:text-zinc-400">
                      {contract.end_date ?? '—'}
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

The `company(name)` embed in `.select(...)` relies on PostgREST auto-detecting the single foreign key from `contract.company_id` to `company.id` (`fk_contract_company_id`, added in the init migration) — no explicit relationship hint is needed since there is exactly one such FK between these two tables.

- [ ] **Step 2: Run lint and build**

```bash
npm run lint
npm run build
```

Expected: both succeed with no errors.

- [ ] **Step 3: Verify in the browser**

Confirm Task 1's migration is live (ask the project owner if unsure). With the dev server running, navigate to `http://localhost:3000/contracts`.

Expected: the sidebar's "Contracts" link now goes to a real page (no longer "Coming soon"), showing "MASTER DATA / Contracts", an "Add contract" button, and "No contracts yet. Add your first one to get started." (the `contract` table has zero rows at this point).

- [ ] **Step 4: Commit**

```bash
git add "src/app/(app)/contracts/page.tsx"
git commit -m "Add contracts list page"
```

---

### Task 4: Create contract

**Files:**
- Create: `src/app/(app)/contracts/actions.ts`
- Create: `src/app/(app)/contracts/ContractForm.tsx`
- Create: `src/app/(app)/contracts/new/page.tsx`

**Interfaces:**
- Consumes: `createClient` from `@/lib/supabase/server`.
- Produces: `ContractFormState = { error: string | null }` and `Contract = { id: number; contract_number: string; company_id: number; start_date: string | null; end_date: string | null }` and `CompanyOption = { id: number; name: string }` (exported from `ContractForm.tsx`, imported by Task 5's edit page). `createContract(prevState: ContractFormState, formData: FormData): Promise<ContractFormState>` (exported from `actions.ts`). `ContractForm({ contract?: Contract; companies: CompanyOption[]; action: (prevState: ContractFormState, formData: FormData) => Promise<ContractFormState>; submitLabel: string })` (exported from `ContractForm.tsx`, reused by Task 5).

- [ ] **Step 1: Write the Server Actions file**

Create `src/app/(app)/contracts/actions.ts`:

```ts
'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

export type ContractFormState = {
  error: string | null;
};

export async function createContract(
  _prevState: ContractFormState,
  formData: FormData,
): Promise<ContractFormState> {
  const contractNumber = (formData.get('contract_number') as string | null)?.trim();
  if (!contractNumber) {
    return { error: 'Contract number is required.' };
  }

  const companyIdRaw = formData.get('company_id') as string | null;
  const companyId = companyIdRaw ? Number(companyIdRaw) : NaN;
  if (!companyIdRaw || Number.isNaN(companyId)) {
    return { error: 'Company is required.' };
  }

  const startDate = (formData.get('start_date') as string | null) || null;
  const endDate = (formData.get('end_date') as string | null) || null;

  const supabase = await createClient();
  const { error } = await supabase.from('contract').insert({
    contract_number: contractNumber,
    company_id: companyId,
    start_date: startDate,
    end_date: endDate,
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath('/contracts');
  redirect('/contracts');
}
```

- [ ] **Step 2: Write the shared form component**

Create `src/app/(app)/contracts/ContractForm.tsx`:

```tsx
'use client';

import { useActionState } from 'react';
import type { ContractFormState } from './actions';

export type Contract = {
  id: number;
  contract_number: string;
  company_id: number;
  start_date: string | null;
  end_date: string | null;
};

export type CompanyOption = {
  id: number;
  name: string;
};

const initialState: ContractFormState = { error: null };

export function ContractForm({
  contract,
  companies,
  action,
  submitLabel,
}: {
  contract?: Contract;
  companies: CompanyOption[];
  action: (prevState: ContractFormState, formData: FormData) => Promise<ContractFormState>;
  submitLabel: string;
}) {
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="mt-6 max-w-md space-y-4">
      <div className="space-y-1">
        <label htmlFor="contract_number" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Contract number
        </label>
        <input
          id="contract_number"
          name="contract_number"
          type="text"
          required
          defaultValue={contract?.contract_number}
          className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-950 focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-600/40 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
        />
      </div>

      <div className="space-y-1">
        <label htmlFor="company_id" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Company
        </label>
        <select
          id="company_id"
          name="company_id"
          required
          defaultValue={contract?.company_id ?? ''}
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

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <label htmlFor="start_date" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Start date
          </label>
          <input
            id="start_date"
            name="start_date"
            type="date"
            defaultValue={contract?.start_date ?? ''}
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
            defaultValue={contract?.end_date ?? ''}
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

- [ ] **Step 3: Write the new-contract route**

Create `src/app/(app)/contracts/new/page.tsx`:

```tsx
import { ContractForm } from '../ContractForm';
import { createContract } from '../actions';
import { createClient } from '@/lib/supabase/server';

export default async function NewContractPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from('company')
    .select('id, name')
    .order('name', { ascending: true });

  const companies = data ?? [];

  return (
    <div className="px-6 py-8">
      <p className="font-mono text-xs font-medium tracking-[0.2em] text-zinc-500 dark:text-zinc-400">
        MASTER DATA
      </p>
      <h2 className="mt-1 text-2xl font-semibold text-zinc-950 dark:text-zinc-50">
        Add contract
      </h2>
      <ContractForm companies={companies} action={createContract} submitLabel="Create contract" />
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

With the dev server running (and Task 1's migration confirmed live), navigate to `http://localhost:3000/contracts/new`. Confirm the "Company" dropdown lists the existing company (e.g. "NewCorp Inc Ltd"). Fill in a contract number, select that company, leave dates blank, submit.

Expected: redirected to `/contracts`, and the new row appears in the table with the correct contract number, the selected company's name, and Status "Active" (no `end_date` set). Then test server-side validation: go back to `/contracts/new`, enter a contract number that's only whitespace (e.g. a single space) with a company selected — the native `required` check on the text input passes (non-empty), but the server trims it to empty and returns `{ error: 'Contract number is required.' }`; confirm that message renders inline and the page does not redirect.

- [ ] **Step 6: Commit**

```bash
git add "src/app/(app)/contracts/actions.ts" "src/app/(app)/contracts/ContractForm.tsx" "src/app/(app)/contracts/new/page.tsx"
git commit -m "Add contract creation form and action"
```

---

### Task 5: Edit contract

**Files:**
- Modify: `src/app/(app)/contracts/actions.ts`
- Create: `src/app/(app)/contracts/[id]/edit/page.tsx`

**Interfaces:**
- Consumes: `ContractForm`, `Contract`, `CompanyOption` from `../../ContractForm`; `ContractFormState` from `../../actions`.
- Produces: `updateContract(id: number, prevState: ContractFormState, formData: FormData): Promise<ContractFormState>`, added to `actions.ts` alongside `createContract`. Task 6 adds `deactivateContract`/`reactivateContract` to this same file and adds buttons to this same edit page.

- [ ] **Step 1: Add `updateContract` to the actions file**

In `src/app/(app)/contracts/actions.ts`, add below `createContract`:

```ts
export async function updateContract(
  id: number,
  _prevState: ContractFormState,
  formData: FormData,
): Promise<ContractFormState> {
  const contractNumber = (formData.get('contract_number') as string | null)?.trim();
  if (!contractNumber) {
    return { error: 'Contract number is required.' };
  }

  const companyIdRaw = formData.get('company_id') as string | null;
  const companyId = companyIdRaw ? Number(companyIdRaw) : NaN;
  if (!companyIdRaw || Number.isNaN(companyId)) {
    return { error: 'Company is required.' };
  }

  const startDate = (formData.get('start_date') as string | null) || null;
  const endDate = (formData.get('end_date') as string | null) || null;

  const supabase = await createClient();
  const { error } = await supabase
    .from('contract')
    .update({
      contract_number: contractNumber,
      company_id: companyId,
      start_date: startDate,
      end_date: endDate,
    })
    .eq('id', id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath('/contracts');
  redirect('/contracts');
}
```

- [ ] **Step 2: Write the edit route**

Create `src/app/(app)/contracts/[id]/edit/page.tsx`:

```tsx
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { ContractForm, type Contract } from '../../ContractForm';
import { updateContract } from '../../actions';

export default async function EditContractPage(props: PageProps<'/contracts/[id]/edit'>) {
  const { id } = await props.params;
  const contractId = Number(id);

  if (Number.isNaN(contractId)) {
    notFound();
  }

  const supabase = await createClient();
  const { data: contract, error } = await supabase
    .from('contract')
    .select('id, contract_number, company_id, start_date, end_date')
    .eq('id', contractId)
    .maybeSingle();

  if (error) {
    return (
      <div className="px-6 py-8">
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          Couldn&apos;t load contract: {error.message}
        </p>
      </div>
    );
  }

  if (!contract) {
    notFound();
  }

  const { data: companiesData } = await supabase
    .from('company')
    .select('id, name')
    .order('name', { ascending: true });
  const companies = companiesData ?? [];

  const updateContractWithId = updateContract.bind(null, contractId);

  return (
    <div className="px-6 py-8">
      <p className="font-mono text-xs font-medium tracking-[0.2em] text-zinc-500 dark:text-zinc-400">
        MASTER DATA
      </p>
      <h2 className="mt-1 text-2xl font-semibold text-zinc-950 dark:text-zinc-50">
        Edit contract
      </h2>
      <ContractForm
        contract={contract as Contract}
        companies={companies}
        action={updateContractWithId}
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

Navigate to `http://localhost:3000/contracts`, click the contract created in Task 4. Confirm the form loads pre-filled with its contract number and the correct company pre-selected in the dropdown. Change the contract number (e.g. append "-A") and submit.

Expected: redirected to `/contracts`, the row's contract number now reflects the change. Also confirm visiting `/contracts/999999/edit` (an id that doesn't exist) renders Next.js's 404 page, not a crash.

- [ ] **Step 5: Commit**

```bash
git add "src/app/(app)/contracts/actions.ts" "src/app/(app)/contracts/[id]/edit/page.tsx"
git commit -m "Add contract edit form and action"
```

---

### Task 6: Deactivate and reactivate

**Files:**
- Modify: `src/app/(app)/contracts/actions.ts`
- Modify: `src/app/(app)/contracts/[id]/edit/page.tsx`

**Interfaces:**
- Consumes: `isActiveByEndDate` from `@/lib/date` (Task 2); the `updateContractWithId` `.bind(null, contractId)` pattern already established in Task 5's edit page.
- Produces: `deactivateContract(id: number): Promise<void>` and `reactivateContract(id: number): Promise<void>`, added to `actions.ts`. Nothing outside this task depends on these.

- [ ] **Step 1: Add the two actions**

In `src/app/(app)/contracts/actions.ts`, add `todayLocal` to the existing `createClient` import line's neighboring import (add a new import line), then add both functions below `updateContract`:

```ts
import { todayLocal } from '@/lib/date';
```

```ts
export async function deactivateContract(id: number) {
  const supabase = await createClient();
  const today = todayLocal();
  const { data, error } = await supabase
    .from('contract')
    .update({ end_date: today })
    .eq('id', id)
    .select('id');

  if (error) {
    throw new Error(error.message);
  }
  if (!data || data.length === 0) {
    throw new Error('Contract not found.');
  }

  revalidatePath('/contracts');
  revalidatePath(`/contracts/${id}/edit`);
}

export async function reactivateContract(id: number) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('contract')
    .update({ end_date: null })
    .eq('id', id)
    .select('id');

  if (error) {
    throw new Error(error.message);
  }
  if (!data || data.length === 0) {
    throw new Error('Contract not found.');
  }

  revalidatePath('/contracts');
  revalidatePath(`/contracts/${id}/edit`);
}
```

- [ ] **Step 2: Add the button to the edit page**

In `src/app/(app)/contracts/[id]/edit/page.tsx`, update the imports and the returned JSX:

```tsx
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { isActiveByEndDate } from '@/lib/date';
import { ContractForm, type Contract } from '../../ContractForm';
import { updateContract, deactivateContract, reactivateContract } from '../../actions';

export default async function EditContractPage(props: PageProps<'/contracts/[id]/edit'>) {
  const { id } = await props.params;
  const contractId = Number(id);

  if (Number.isNaN(contractId)) {
    notFound();
  }

  const supabase = await createClient();
  const { data: contract, error } = await supabase
    .from('contract')
    .select('id, contract_number, company_id, start_date, end_date')
    .eq('id', contractId)
    .maybeSingle();

  if (error) {
    return (
      <div className="px-6 py-8">
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          Couldn&apos;t load contract: {error.message}
        </p>
      </div>
    );
  }

  if (!contract) {
    notFound();
  }

  const { data: companiesData } = await supabase
    .from('company')
    .select('id, name')
    .order('name', { ascending: true });
  const companies = companiesData ?? [];

  const active = isActiveByEndDate(contract.end_date);
  const updateContractWithId = updateContract.bind(null, contractId);
  const deactivateContractWithId = deactivateContract.bind(null, contractId);
  const reactivateContractWithId = reactivateContract.bind(null, contractId);

  return (
    <div className="px-6 py-8">
      <p className="font-mono text-xs font-medium tracking-[0.2em] text-zinc-500 dark:text-zinc-400">
        MASTER DATA
      </p>
      <div className="mt-1 flex items-center justify-between">
        <h2 className="text-2xl font-semibold text-zinc-950 dark:text-zinc-50">
          Edit contract
        </h2>
        <form action={active ? deactivateContractWithId : reactivateContractWithId}>
          <button
            type="submit"
            className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-900"
          >
            {active ? 'Deactivate' : 'Reactivate'}
          </button>
        </form>
      </div>
      <ContractForm
        contract={contract as Contract}
        companies={companies}
        action={updateContractWithId}
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

On the contract's edit page from Task 5, click "Deactivate". Confirm the button submits, the page reloads, and the button now reads "Reactivate". Navigate to `/contracts` and confirm the Status column shows "Expired" and End date shows today's date. Go back to the edit page, click "Reactivate", confirm the button reverts to "Deactivate" and `/contracts` shows "Active" with End date back to "—".

- [ ] **Step 5: Commit**

```bash
git add "src/app/(app)/contracts/actions.ts" "src/app/(app)/contracts/[id]/edit/page.tsx"
git commit -m "Add contract deactivate/reactivate actions"
```

---

## Self-Review Notes

- **Spec coverage:** RLS policy + grants ✓ (Task 1). Shared `isActiveByEndDate` extraction, applied to both Company and Contract ✓ (Task 2, 3, 6). List page (Contract Number/Company/Status/Start/End, joined company name, computed Active/Expired, link to new + edit) ✓ (Task 3). Create via shared form + Server Action, company dropdown from all companies regardless of status ✓ (Task 4). Edit via the same shared form, dropdown pre-selected ✓ (Task 5). Deactivate/Reactivate via `end_date`, same error-checked pattern as Company's post-final-review version ✓ (Task 6). Server-side validation surfaced via `useActionState` ✓ (Task 4's `ContractForm`). Nav — confirmed no task needed, `nav.ts` already has the href set.
- **Placeholder scan:** none — every step has complete, runnable code.
- **Type consistency:** `Contract` (id/contract_number/company_id/start_date/end_date) defined once in `ContractForm.tsx`, imported by the edit page (Task 5). `CompanyOption` (id/name) defined once in `ContractForm.tsx`, used by both `new/page.tsx` and `[id]/edit/page.tsx` for the fetched company list (those pages don't import the type explicitly since the fetched `data` is passed straight through — TypeScript structurally accepts it). `ContractFormState` defined once in `actions.ts`, imported by `ContractForm.tsx`. `createContract`'s signature `(prevState, formData)` and `updateContract`'s `(id, prevState, formData)` both match how `ContractForm`'s `action` prop is typed and how `.bind(null, id)` is used in the edit page — same shape as Company's `createCompany`/`updateCompany`. `deactivateContract`/`reactivateContract` take only `id`, matching `deactivateCompany`/`reactivateCompany`'s post-final-review shape (error-checked, zero-rows-affected guard), not the earlier silent-failure version Company shipped before its fix.
