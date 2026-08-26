# Subcontractor Management Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the sixth real CRUD feature on the ERD-derived schema, and the last remaining Master Data entity — list, create, edit, and deactivate/reactivate `Subcontractors` records, each recording which external Company is subcontracted under a given Contract for a date range.

**Architecture:** One migration (required-field constraints, the `active` column, grants/RLS), then the same Server Component + Server Action pattern proven five times over. Unlike `ContractService`/`Period`, `company_id` here is an **independent, user-selected dropdown** — not derived from the Contract — because `subcontractors.company_id` represents the subcontracted company itself, a genuinely different company than the contract's own client company. No client-side auto-fill interactivity is needed. No new nav entry is needed (`nav.ts` already has a "Subcontractors" placeholder).

**Tech Stack:** Next.js 16 App Router, React 19 (`useActionState`), `@supabase/ssr` server client, plain SQL migration applied via Supabase Studio's SQL editor.

## Global Constraints

- Required fields: Contract (dropdown), Company (dropdown), Start date, End date. No optional fields.
- `company_id` is written directly from `formData` — there is NO `lookupCompanyIdForContract`-style derivation helper in this feature's `actions.ts`, unlike `contract-services/actions.ts` and `periods/actions.ts`. Do not add one; this is a deliberate break from that pattern (see the design spec's rationale).
- `active boolean not null default true` — same convention as every prior feature except `Period`. Deactivate/Reactivate flips `active` only, never `start_date`/`end_date`/`company_id`/`contract_id` — built correctly from the start.
- No new uniqueness constraint — nothing in the ERD specifies one.
- Contract and Company dropdowns show all rows regardless of status — same convention as every prior feature (including no filtering by `company.internal`).
- There is no natural "title" field on this table (no code/name, unlike every prior feature) — the list page identifies each row by its Contract + Company pair.
- `nav.ts` already has a "Subcontractors" entry at `/subcontractors` in the Master Data group — no nav changes needed.
- No automated test suite — verification is `npm run lint`, a production build, and manual checks against the running dev server.
- Migrations are applied by pasting the SQL into Supabase Studio's SQL editor by the project owner, never via `npx supabase db push` — verify afterward with `psql`.

---

### Task 1: Migration — required fields, active column, grants/RLS

**Files:**
- Create: `supabase/migrations/20260826020000_subcontractors.sql`

**Interfaces:**
- Consumes: nothing — new migration on top of `supabase/migrations/20260826010000_clear_period_test_row.sql`.
- Produces: `timesheet_shorebase.subcontractors` gains required-field constraints on `contract_id`/`company_id`/`start_date`/`end_date`, and `active boolean not null default true`; `authenticated` can `select/insert/update`. Tasks 2–5 depend on this being live.

- [ ] **Step 1: Write the migration**

Create `supabase/migrations/20260826020000_subcontractors.sql`:

```sql
-- Adds Subcontractors' schema requirements: required-field constraints
-- matching the fields this feature's form treats as mandatory, and the
-- active-column convention (see CLAUDE.md). Unlike contract_service and
-- period, company_id here is NOT auto-derived from the contract - it
-- represents the subcontracted company itself (an independent selection),
-- so it becomes required rather than staying nullable.

begin;

alter table timesheet_shorebase.subcontractors
  alter column contract_id set not null;
alter table timesheet_shorebase.subcontractors
  alter column company_id set not null;
alter table timesheet_shorebase.subcontractors
  alter column start_date set not null;
alter table timesheet_shorebase.subcontractors
  alter column end_date set not null;

alter table timesheet_shorebase.subcontractors
  add column active boolean not null default true;

grant select, insert, update on timesheet_shorebase.subcontractors to authenticated;

alter table timesheet_shorebase.subcontractors enable row level security;

create policy "authenticated users can read/write subcontractors"
  on timesheet_shorebase.subcontractors
  for all
  to authenticated
  using (true)
  with check (true);

commit;
```

- [ ] **Step 2: Ask the project owner to apply the migration**

Paste the full contents of `supabase/migrations/20260826020000_subcontractors.sql` into Supabase Studio's SQL editor and run it there. Wait for confirmation it ran without error before continuing to Step 3.

- [ ] **Step 3: Verify against the real database**

```bash
source <(grep '^DATABASE_URL=' .env.local | sed 's/^/export /')
psql "$DATABASE_URL" -c "\d timesheet_shorebase.subcontractors"
psql "$DATABASE_URL" -c "select grantee, privilege_type from information_schema.role_table_grants where table_schema = 'timesheet_shorebase' and table_name = 'subcontractors' and grantee = 'authenticated' order by privilege_type;"
psql "$DATABASE_URL" -c "select policyname, cmd, roles from pg_policies where schemaname = 'timesheet_shorebase' and tablename = 'subcontractors';"
```

Expected:
- First query shows `contract_id`/`company_id`/`start_date`/`end_date`/`active` all `not null`, `active` defaulting `true`.
- Second query returns three rows for `authenticated`: `INSERT`, `SELECT`, `UPDATE`.
- Third query returns one row: `authenticated users can read/write subcontractors`, `cmd` = `ALL`, `roles` = `{authenticated}`.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260826020000_subcontractors.sql
git commit -m "Add required fields, active column, and RLS for subcontractors"
```

---

### Task 2: Subcontractors list page

**Files:**
- Create: `src/app/(app)/subcontractors/page.tsx`

**Interfaces:**
- Consumes: `createClient` from `@/lib/supabase/server`. Requires Task 1's migration to be live.
- Produces: the `SubcontractorRow` shape, declared in `page.tsx` only. No `nav.ts` changes — the "Subcontractors" entry already exists.

- [ ] **Step 1: Write the list page**

Create `src/app/(app)/subcontractors/page.tsx`:

```tsx
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';

type SubcontractorRow = {
  id: number;
  active: boolean;
  start_date: string;
  end_date: string;
  contract: { contract_number: string } | null;
  company: { name: string } | null;
};

export default async function SubcontractorsPage() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('subcontractors')
    .select('id, active, start_date, end_date, contract(contract_number), company(name)')
    .order('start_date', { ascending: true });

  const subcontractors = (data ?? []) as unknown as SubcontractorRow[];

  return (
    <div className="px-6 py-8">
      <div className="flex items-center justify-between">
        <div>
          <p className="font-mono text-xs font-medium tracking-[0.2em] text-zinc-500 dark:text-zinc-400">
            MASTER DATA
          </p>
          <h2 className="mt-1 text-2xl font-semibold text-zinc-950 dark:text-zinc-50">
            Subcontractors
          </h2>
        </div>
        <Link
          href="/subcontractors/new"
          className="rounded-md bg-teal-700 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-teal-800 dark:bg-teal-600 dark:hover:bg-teal-500"
        >
          Add subcontractor
        </Link>
      </div>

      {error && (
        <p role="alert" className="mt-4 text-sm text-red-600 dark:text-red-400">
          Couldn&apos;t load subcontractors: {error.message}
        </p>
      )}

      {!error && subcontractors.length === 0 && (
        <p className="mt-4 max-w-prose text-zinc-600 dark:text-zinc-400">
          No subcontractors yet. Add your first one to get started.
        </p>
      )}

      {!error && subcontractors.length > 0 && (
        <div className="mt-6 overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800">
          <table className="w-full text-sm">
            <thead className="border-b border-zinc-200 bg-zinc-50 text-left text-xs font-medium uppercase tracking-wide text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
              <tr>
                <th className="px-4 py-2">Contract</th>
                <th className="px-4 py-2">Company</th>
                <th className="px-4 py-2">Start date</th>
                <th className="px-4 py-2">End date</th>
                <th className="px-4 py-2">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {subcontractors.map((subcontractor) => {
                const { active } = subcontractor;
                return (
                  <tr key={subcontractor.id}>
                    <td className="px-4 py-2 font-medium text-zinc-900 dark:text-zinc-100">
                      <Link href={`/subcontractors/${subcontractor.id}/edit`} className="hover:underline">
                        {subcontractor.contract?.contract_number ?? '—'}
                      </Link>
                    </td>
                    <td className="px-4 py-2 text-zinc-600 dark:text-zinc-400">
                      {subcontractor.company?.name ?? '—'}
                    </td>
                    <td className="px-4 py-2 text-zinc-600 dark:text-zinc-400">{subcontractor.start_date}</td>
                    <td className="px-4 py-2 text-zinc-600 dark:text-zinc-400">{subcontractor.end_date}</td>
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

`contract(contract_number)` and `company(name)` are both unaliased embeds — `subcontractors` has exactly one FK to each of `contract` and `company`, so PostgREST resolves them unambiguously by target table name. Do not add aliases or hints to either.

The Contract cell is the row's link to its edit page (in place of every prior feature's code/name column, which this table doesn't have).

- [ ] **Step 2: Run lint and build**

```bash
npm run lint
npm run build
```

Expected: both succeed with no errors.

- [ ] **Step 3: Verify in the browser**

Confirm Task 1's migration is live. Navigate to `http://localhost:3000/subcontractors`.

Expected: the sidebar's existing "Subcontractors" item now goes to a real page — no longer "Coming soon". The page shows "MASTER DATA / Subcontractors", an "Add subcontractor" button, and "No subcontractors yet. Add your first one to get started."

- [ ] **Step 4: Commit**

```bash
git add "src/app/(app)/subcontractors/page.tsx"
git commit -m "Add subcontractors list page"
```

---

### Task 3: Create subcontractor

**Files:**
- Create: `src/app/(app)/subcontractors/actions.ts`
- Create: `src/app/(app)/subcontractors/SubcontractorForm.tsx`
- Create: `src/app/(app)/subcontractors/new/page.tsx`

**Interfaces:**
- Consumes: `createClient` from `@/lib/supabase/server`.
- Produces: `SubcontractorFormState = { error: string | null }`, `Subcontractor`, `ContractOption = { id: number; contract_number: string }`, `CompanyOption = { id: number; name: string }` (all exported from `SubcontractorForm.tsx`, `Subcontractor` imported by Task 4's edit page). `createSubcontractor(prevState: SubcontractorFormState, formData: FormData): Promise<SubcontractorFormState>` (exported from `actions.ts`). `SubcontractorForm({ subcontractor?: Subcontractor; contracts: ContractOption[]; companies: CompanyOption[]; action: (prevState: SubcontractorFormState, formData: FormData) => Promise<SubcontractorFormState>; submitLabel: string })` (exported from `SubcontractorForm.tsx`, reused by Task 4).

- [ ] **Step 1: Write the Server Actions file**

Create `src/app/(app)/subcontractors/actions.ts`:

```ts
'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

export type SubcontractorFormState = {
  error: string | null;
};

export async function createSubcontractor(
  _prevState: SubcontractorFormState,
  formData: FormData,
): Promise<SubcontractorFormState> {
  const contractIdRaw = formData.get('contract_id') as string | null;
  const contractId = contractIdRaw ? Number(contractIdRaw) : NaN;
  if (!contractIdRaw || Number.isNaN(contractId)) {
    return { error: 'Contract is required.' };
  }

  const companyIdRaw = formData.get('company_id') as string | null;
  const companyId = companyIdRaw ? Number(companyIdRaw) : NaN;
  if (!companyIdRaw || Number.isNaN(companyId)) {
    return { error: 'Company is required.' };
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

  const { error } = await supabase.from('subcontractors').insert({
    contract_id: contractId,
    company_id: companyId,
    start_date: startDate,
    end_date: endDate,
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath('/subcontractors');
  redirect('/subcontractors');
}
```

Unlike `contract-services/actions.ts` and `periods/actions.ts`, there is no `lookupCompanyIdForContract` helper here — `company_id` comes straight from `formData`, validated the same way `contract_id` is, because it's an independent field (see the design spec's rationale on `company.internal`).

- [ ] **Step 2: Write the shared form component**

Create `src/app/(app)/subcontractors/SubcontractorForm.tsx`:

```tsx
'use client';

import { useActionState } from 'react';
import type { SubcontractorFormState } from './actions';

export type Subcontractor = {
  id: number;
  contract_id: number;
  company_id: number;
  start_date: string;
  end_date: string;
};

export type ContractOption = {
  id: number;
  contract_number: string;
};

export type CompanyOption = {
  id: number;
  name: string;
};

const initialState: SubcontractorFormState = { error: null };

export function SubcontractorForm({
  subcontractor,
  contracts,
  companies,
  action,
  submitLabel,
}: {
  subcontractor?: Subcontractor;
  contracts: ContractOption[];
  companies: CompanyOption[];
  action: (prevState: SubcontractorFormState, formData: FormData) => Promise<SubcontractorFormState>;
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
          defaultValue={subcontractor?.contract_id ?? ''}
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
        <label htmlFor="company_id" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Company
        </label>
        <select
          id="company_id"
          name="company_id"
          required
          defaultValue={subcontractor?.company_id ?? ''}
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
            required
            defaultValue={subcontractor?.start_date}
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
            defaultValue={subcontractor?.end_date}
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

No controlled fields, no `useState` — both dropdowns are fully independent, plain `defaultValue` selects.

- [ ] **Step 3: Write the new-subcontractor route**

Create `src/app/(app)/subcontractors/new/page.tsx`:

```tsx
import { SubcontractorForm } from '../SubcontractorForm';
import { createSubcontractor } from '../actions';
import { createClient } from '@/lib/supabase/server';

export default async function NewSubcontractorPage() {
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

  const contracts = contractsData ?? [];
  const companies = companiesData ?? [];

  return (
    <div className="px-6 py-8">
      <p className="font-mono text-xs font-medium tracking-[0.2em] text-zinc-500 dark:text-zinc-400">
        MASTER DATA
      </p>
      <h2 className="mt-1 text-2xl font-semibold text-zinc-950 dark:text-zinc-50">
        Add subcontractor
      </h2>
      <SubcontractorForm
        contracts={contracts}
        companies={companies}
        action={createSubcontractor}
        submitLabel="Create subcontractor"
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

With the dev server running (and Task 1's migration confirmed live), navigate to `http://localhost:3000/subcontractors/new`. There must be at least one real Contract and one real Company in the database for this to be meaningfully testable.

Fill in the required fields — pick a Company that is genuinely independent of the selected Contract's own company (if only one Company row exists in the database, this specific independence check can't be exercised; note that in your verification report rather than skipping the rest of the flow) — and submit.

Expected: redirected to `/subcontractors`, the new row appears with the correct contract number and company name. If more than one Company exists, verify via `psql` that the saved `company_id` is exactly the one you picked, not `contract.company_id`: `psql "$DATABASE_URL" -c "select s.id, s.company_id, c.company_id as contract_company_id from timesheet_shorebase.subcontractors s join timesheet_shorebase.contract c on c.id = s.contract_id;"`. Then test server-side validation: go back to `/subcontractors/new`, submit with the Company left unselected — confirm the inline `{ error: 'Company is required.' }` message renders and the page does not redirect.

- [ ] **Step 6: Commit**

```bash
git add "src/app/(app)/subcontractors/actions.ts" "src/app/(app)/subcontractors/SubcontractorForm.tsx" "src/app/(app)/subcontractors/new/page.tsx"
git commit -m "Add subcontractor creation form and action"
```

---

### Task 4: Edit subcontractor

**Files:**
- Modify: `src/app/(app)/subcontractors/actions.ts`
- Create: `src/app/(app)/subcontractors/[id]/edit/page.tsx`

**Interfaces:**
- Consumes: `SubcontractorForm`, `Subcontractor`, `ContractOption`, `CompanyOption` from `../../SubcontractorForm`; `SubcontractorFormState` from `../../actions`.
- Produces: `updateSubcontractor(id: number, prevState: SubcontractorFormState, formData: FormData): Promise<SubcontractorFormState>`, added to `actions.ts` alongside `createSubcontractor`. Task 5 adds `deactivateSubcontractor`/`reactivateSubcontractor` to this same file and adds a button to this same edit page.

- [ ] **Step 1: Add `updateSubcontractor` to the actions file**

In `src/app/(app)/subcontractors/actions.ts`, add below `createSubcontractor`:

```ts
export async function updateSubcontractor(
  id: number,
  _prevState: SubcontractorFormState,
  formData: FormData,
): Promise<SubcontractorFormState> {
  const contractIdRaw = formData.get('contract_id') as string | null;
  const contractId = contractIdRaw ? Number(contractIdRaw) : NaN;
  if (!contractIdRaw || Number.isNaN(contractId)) {
    return { error: 'Contract is required.' };
  }

  const companyIdRaw = formData.get('company_id') as string | null;
  const companyId = companyIdRaw ? Number(companyIdRaw) : NaN;
  if (!companyIdRaw || Number.isNaN(companyId)) {
    return { error: 'Company is required.' };
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

  const { error } = await supabase
    .from('subcontractors')
    .update({
      contract_id: contractId,
      company_id: companyId,
      start_date: startDate,
      end_date: endDate,
    })
    .eq('id', id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath('/subcontractors');
  redirect('/subcontractors');
}
```

- [ ] **Step 2: Write the edit route**

Create `src/app/(app)/subcontractors/[id]/edit/page.tsx`:

```tsx
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { SubcontractorForm, type Subcontractor } from '../../SubcontractorForm';
import { updateSubcontractor } from '../../actions';

export default async function EditSubcontractorPage(props: PageProps<'/subcontractors/[id]/edit'>) {
  const { id } = await props.params;
  const subcontractorId = Number(id);

  if (Number.isNaN(subcontractorId)) {
    notFound();
  }

  const supabase = await createClient();
  const { data: subcontractor, error } = await supabase
    .from('subcontractors')
    .select('id, contract_id, company_id, start_date, end_date, active')
    .eq('id', subcontractorId)
    .maybeSingle();

  if (error) {
    return (
      <div className="px-6 py-8">
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          Couldn&apos;t load subcontractor: {error.message}
        </p>
      </div>
    );
  }

  if (!subcontractor) {
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

  const contracts = contractsData ?? [];
  const companies = companiesData ?? [];

  const updateSubcontractorWithId = updateSubcontractor.bind(null, subcontractorId);

  return (
    <div className="px-6 py-8">
      <p className="font-mono text-xs font-medium tracking-[0.2em] text-zinc-500 dark:text-zinc-400">
        MASTER DATA
      </p>
      <h2 className="mt-1 text-2xl font-semibold text-zinc-950 dark:text-zinc-50">
        Edit subcontractor
      </h2>
      <SubcontractorForm
        subcontractor={subcontractor as Subcontractor}
        contracts={contracts}
        companies={companies}
        action={updateSubcontractorWithId}
        submitLabel="Save changes"
      />
    </div>
  );
}
```

No Deactivate/Reactivate button yet — that's Task 5.

- [ ] **Step 3: Run lint and build**

```bash
npm run lint
npm run build
```

Expected: both succeed with no errors.

- [ ] **Step 4: Verify in the browser**

Navigate to `http://localhost:3000/subcontractors`, click the row created in Task 3. Confirm the form loads pre-filled: Contract and Company dropdowns pre-selected, both dates correct. Change the Company (if more than one exists) or a date and submit.

Expected: redirected to `/subcontractors`, the row reflects the change. Also confirm visiting `/subcontractors/999999/edit` (an id that doesn't exist) renders Next.js's 404 page, not a crash.

- [ ] **Step 5: Commit**

```bash
git add "src/app/(app)/subcontractors/actions.ts" "src/app/(app)/subcontractors/[id]/edit/page.tsx"
git commit -m "Add subcontractor edit form and action"
```

---

### Task 5: Deactivate and reactivate

**Files:**
- Modify: `src/app/(app)/subcontractors/actions.ts`
- Modify: `src/app/(app)/subcontractors/[id]/edit/page.tsx`

**Interfaces:**
- Consumes: the `updateSubcontractorWithId` `.bind(null, subcontractorId)` pattern already established in Task 4's edit page.
- Produces: `deactivateSubcontractor(id: number): Promise<void>` and `reactivateSubcontractor(id: number): Promise<void>`, added to `actions.ts`. Nothing outside this task depends on these.

- [ ] **Step 1: Add the two actions**

In `src/app/(app)/subcontractors/actions.ts`, add below `updateSubcontractor`:

```ts
export async function deactivateSubcontractor(id: number) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('subcontractors')
    .update({ active: false })
    .eq('id', id)
    .select('id');

  if (error) {
    throw new Error(error.message);
  }
  if (!data || data.length === 0) {
    throw new Error('Subcontractor not found.');
  }

  revalidatePath('/subcontractors');
  revalidatePath(`/subcontractors/${id}/edit`);
}

export async function reactivateSubcontractor(id: number) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('subcontractors')
    .update({ active: true })
    .eq('id', id)
    .select('id');

  if (error) {
    throw new Error(error.message);
  }
  if (!data || data.length === 0) {
    throw new Error('Subcontractor not found.');
  }

  revalidatePath('/subcontractors');
  revalidatePath(`/subcontractors/${id}/edit`);
}
```

- [ ] **Step 2: Add the button to the edit page**

In `src/app/(app)/subcontractors/[id]/edit/page.tsx`, update the imports and the returned JSX:

```tsx
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { SubcontractorForm, type Subcontractor } from '../../SubcontractorForm';
import { updateSubcontractor, deactivateSubcontractor, reactivateSubcontractor } from '../../actions';
```

Replace the `updateSubcontractorWithId` line and everything below it with:

```tsx
  const { active } = subcontractor;
  const updateSubcontractorWithId = updateSubcontractor.bind(null, subcontractorId);
  const deactivateSubcontractorWithId = deactivateSubcontractor.bind(null, subcontractorId);
  const reactivateSubcontractorWithId = reactivateSubcontractor.bind(null, subcontractorId);

  return (
    <div className="px-6 py-8">
      <p className="font-mono text-xs font-medium tracking-[0.2em] text-zinc-500 dark:text-zinc-400">
        MASTER DATA
      </p>
      <div className="mt-1 flex items-center justify-between">
        <h2 className="text-2xl font-semibold text-zinc-950 dark:text-zinc-50">
          Edit subcontractor
        </h2>
        <form action={active ? deactivateSubcontractorWithId : reactivateSubcontractorWithId}>
          <button
            type="submit"
            className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-900"
          >
            {active ? 'Deactivate' : 'Reactivate'}
          </button>
        </form>
      </div>
      <SubcontractorForm
        subcontractor={subcontractor as Subcontractor}
        contracts={contracts}
        companies={companies}
        action={updateSubcontractorWithId}
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

On the subcontractor's edit page from Task 4, note its Start date/End date and Company/Contract selections. Click "Deactivate". Confirm the button submits, the page reloads, and the button now reads "Reactivate". Navigate to `/subcontractors` and confirm the Status column shows "Inactive". Go back to the edit page, click "Reactivate", confirm the button reverts to "Deactivate" and `/subcontractors` shows "Active" again — with dates, Contract, and Company completely unchanged throughout the whole cycle.

- [ ] **Step 5: Commit**

```bash
git add "src/app/(app)/subcontractors/actions.ts" "src/app/(app)/subcontractors/[id]/edit/page.tsx"
git commit -m "Add subcontractor deactivate/reactivate actions"
```

---

## Self-Review Notes

- **Spec coverage:** required-field constraints + `active` column + grants/RLS ✓ (Task 1). No new nav entry — confirmed `nav.ts` already has a "Subcontractors" placeholder, no task touches `nav.ts`. List page with joined contract/company names, no code/name column since none exists on this table ✓ (Task 2). `company_id` is an independent required dropdown, written straight from `formData`, NOT derived from Contract ✓ (Task 3's `createSubcontractor`/Task 4's `updateSubcontractor` — no `lookupCompanyIdForContract`-style helper exists anywhere in this feature). No auto-fill/controlled-field logic — confirmed `SubcontractorForm` uses only `defaultValue` fields, both dropdowns fully independent. Deactivate/Reactivate flips `active` only, built correctly from the start ✓ (Task 5).
- **Placeholder scan:** none — every step has complete, runnable code.
- **Type consistency:** `Subcontractor` (id/contract_id/company_id/start_date/end_date) defined once in `SubcontractorForm.tsx`, imported by the edit page (Task 4) — deliberately excludes `active`, handled the same way `ContractService`'s `active` and `Period`'s `locked` were: destructured from the raw fetched row in the edit page, not part of the form's typed prop shape. `ContractOption`/`CompanyOption` defined once in `SubcontractorForm.tsx`, used by both `new/page.tsx` and `[id]/edit/page.tsx`. `SubcontractorFormState` defined once in `actions.ts`, imported by `SubcontractorForm.tsx`. `createSubcontractor`'s signature `(prevState, formData)` and `updateSubcontractor`'s `(id, prevState, formData)` both match how `SubcontractorForm`'s `action` prop is typed and how `.bind(null, id)` is used in the edit page — same shape as every prior feature. `deactivateSubcontractor`/`reactivateSubcontractor` take only `id`, matching the proven shape exactly — error-checked, zero-rows-affected guard, flips `active` only.
