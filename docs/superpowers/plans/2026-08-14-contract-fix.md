# Contract Fix Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix two problems in the already-built Contract feature, found by comparing it against the real legacy production system: add the missing `contract_name` field, and stop Deactivate/Reactivate from overwriting real contract dates.

**Architecture:** One migration (new columns, new NOT NULL constraints, delete of a throwaway test row), then two focused changes to the existing Contract files: adding the name field across form/actions/list/edit, and swapping the deactivate mechanism from `end_date` mutation to a new `active` boolean column.

**Tech Stack:** Next.js 16 App Router, React 19, `@supabase/ssr` server client, plain SQL migration applied via Supabase Studio's SQL editor.

## Global Constraints

- `contract_name` is required, matching the legacy system's "Nama Kontrak" field exactly — no task in this plan makes it optional.
- `start_date`/`end_date` become required (`not null` in the DB, `required` on the form) — they are real business dates now that they no longer double as a deactivation flag.
- The new `active boolean not null default true` column matches this schema's existing boolean-naming convention (`company.internal`, `invoice_status.locked`) — no `is_` prefix.
- `deactivateContract`/`reactivateContract` must never touch `end_date` again — they flip `active` only, keeping the existing error-check + zero-rows-affected guard shape unchanged.
- The status badge relabels from "Active"/"Expired" to "Active"/"Inactive" (no longer date-derived, so "Expired" no longer fits).
- Not touching Company's own `end_date`/deactivate pattern, the "Lokasi" table, or ShorebaseService — out of scope for this plan.
- No automated test suite — verification is `npm run lint`, a production build, and manual checks against the running dev server.
- Migrations are applied by pasting the SQL into Supabase Studio's SQL editor by the project owner, never via `npx supabase db push` — verify afterward with `psql`.

---

### Task 1: Migration — contract_name, active, required dates

**Files:**
- Create: `supabase/migrations/20260814000000_contract_name_and_active.sql`

**Interfaces:**
- Consumes: nothing — new migration on top of `supabase/migrations/20260813000000_contract_rls.sql`.
- Produces: `timesheet_shorebase.contract` gains `contract_name varchar(255) not null` and `active boolean not null default true`; `start_date`/`end_date` become `not null`. Tasks 2–3 depend on these columns existing before their browser-verification steps.

- [ ] **Step 1: Write the migration**

Create `supabase/migrations/20260814000000_contract_name_and_active.sql`:

```sql
-- Two fixes found by comparing this feature against the real legacy
-- production system:
-- 1. contract_name ("Nama Kontrak") was missing entirely - the original
--    ERD only ever had contract_number ("Nomor Kontrak").
-- 2. Deactivate/Reactivate was overwriting end_date, which the legacy
--    system treats as required, immutable business data. Adds a separate
--    `active` flag instead, so end_date is never touched by status changes.

begin;

-- The only existing row is a throwaway test contract created during this
-- feature's own Task 4 verification (blank dates, placeholder number) -
-- nothing real depends on it, so it's removed rather than backfilled with
-- invented data.
delete from timesheet_shorebase.contract where contract_number = 'CONTRACT-2026-001';

alter table timesheet_shorebase.contract
  add column contract_name varchar(255) not null;

alter table timesheet_shorebase.contract
  add column active boolean not null default true;

alter table timesheet_shorebase.contract
  alter column start_date set not null;

alter table timesheet_shorebase.contract
  alter column end_date set not null;

commit;
```

- [ ] **Step 2: Ask the project owner to apply the migration**

Paste the full contents of `supabase/migrations/20260814000000_contract_name_and_active.sql` into Supabase Studio's SQL editor and run it there. Wait for confirmation it ran without error before continuing to Step 3.

- [ ] **Step 3: Verify against the real database**

```bash
source <(grep '^DATABASE_URL=' .env.local | sed 's/^/export /')
psql "$DATABASE_URL" -c "select count(*) from timesheet_shorebase.contract;"
psql "$DATABASE_URL" -c "\d timesheet_shorebase.contract"
```

Expected:
- First query returns `0` (the throwaway test row is gone).
- Second query's output shows `contract_name` as `character varying(255)`, `not null`; `active` as `boolean`, `not null`, default `true`; `start_date` and `end_date` both `not null`.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260814000000_contract_name_and_active.sql
git commit -m "Add contract_name and active columns, require contract dates"
```

---

### Task 2: Add contract_name field to the form, actions, list, and edit page

**Files:**
- Modify: `src/app/(app)/contracts/ContractForm.tsx`
- Modify: `src/app/(app)/contracts/actions.ts`
- Modify: `src/app/(app)/contracts/page.tsx`
- Modify: `src/app/(app)/contracts/[id]/edit/page.tsx`

**Interfaces:**
- Consumes: Task 1's `contract_name`/required-dates columns being live.
- Produces: `Contract` type (in `ContractForm.tsx`) gains `contract_name: string`, and `start_date`/`end_date` change from `string | null` to `string` (no longer nullable). `createContract`/`updateContract` validate and persist `contract_name`, and now require `start_date`/`end_date` to be non-empty. Task 3 continues to use these same signatures unchanged.

- [ ] **Step 1: Update `ContractForm.tsx`**

Replace the full file content of `src/app/(app)/contracts/ContractForm.tsx` with:

```tsx
'use client';

import { useActionState } from 'react';
import type { ContractFormState } from './actions';

export type Contract = {
  id: number;
  contract_name: string;
  contract_number: string;
  company_id: number;
  start_date: string;
  end_date: string;
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

      <div className="space-y-1">
        <label htmlFor="contract_name" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Contract name
        </label>
        <input
          id="contract_name"
          name="contract_name"
          type="text"
          required
          defaultValue={contract?.contract_name}
          className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-950 focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-600/40 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
        />
      </div>

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
            defaultValue={contract?.start_date}
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
            defaultValue={contract?.end_date}
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

Field order now matches the legacy form: Company, Contract name, Contract number, Start date, End date.

- [ ] **Step 2: Update validation in `actions.ts`**

In `src/app/(app)/contracts/actions.ts`, replace `createContract` and `updateContract` with:

```ts
export async function createContract(
  _prevState: ContractFormState,
  formData: FormData,
): Promise<ContractFormState> {
  const contractName = (formData.get('contract_name') as string | null)?.trim();
  if (!contractName) {
    return { error: 'Contract name is required.' };
  }

  const contractNumber = (formData.get('contract_number') as string | null)?.trim();
  if (!contractNumber) {
    return { error: 'Contract number is required.' };
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
  const { error } = await supabase.from('contract').insert({
    contract_name: contractName,
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

export async function updateContract(
  id: number,
  _prevState: ContractFormState,
  formData: FormData,
): Promise<ContractFormState> {
  const contractName = (formData.get('contract_name') as string | null)?.trim();
  if (!contractName) {
    return { error: 'Contract name is required.' };
  }

  const contractNumber = (formData.get('contract_number') as string | null)?.trim();
  if (!contractNumber) {
    return { error: 'Contract number is required.' };
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
    .from('contract')
    .update({
      contract_name: contractName,
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

Leave `deactivateContract`/`reactivateContract` untouched in this task — Task 3 changes them.

- [ ] **Step 3: Add `contract_name` to the list page**

In `src/app/(app)/contracts/page.tsx`, update the `ContractRow` type and the query's `select`, and add a "Contract Name" column to the table (before "Contract number"):

```ts
type ContractRow = {
  id: number;
  contract_name: string;
  contract_number: string;
  start_date: string;
  end_date: string;
  company: { name: string } | null;
};
```

```ts
.select('id, contract_name, contract_number, start_date, end_date, company(name)')
```

In the `<thead>`, add a new `<th>` before "Contract number":

```tsx
<th className="px-4 py-2">Contract name</th>
```

In the `<tbody>` row, add a new `<td>` before the existing contract-number cell (which keeps its link to the edit page — only the name column is new, not a change to which field is clickable):

```tsx
<td className="px-4 py-2 text-zinc-600 dark:text-zinc-400">
  {contract.contract_name}
</td>
```

- [ ] **Step 4: Add `contract_name` to the edit page's query**

In `src/app/(app)/contracts/[id]/edit/page.tsx`, update the contract query's `select`:

```ts
.select('id, contract_name, contract_number, company_id, start_date, end_date')
```

(No other change needed in this file for this task — `ContractForm`'s `Contract` type already covers the new field via the import from Task 2 Step 1, and the JSX doesn't reference `contract_name` directly outside the form.)

- [ ] **Step 5: Run lint and build**

```bash
npm run lint
npm run build
```

Expected: both succeed with no errors.

- [ ] **Step 6: Verify in the browser**

Confirm Task 1's migration is live. Navigate to `http://localhost:3000/contracts/new`. Confirm the field order is Company, Contract name, Contract number, Start date, End date, all marked required. Fill in all five fields (pick the existing company, e.g. "NewCorp Inc Ltd") and submit.

Expected: redirected to `/contracts`, the new row shows both the contract name and contract number columns correctly. Click into its edit page and confirm all five fields — including Contract name — are pre-filled correctly.

- [ ] **Step 7: Commit**

```bash
git add "src/app/(app)/contracts/ContractForm.tsx" "src/app/(app)/contracts/actions.ts" "src/app/(app)/contracts/page.tsx" "src/app/(app)/contracts/[id]/edit/page.tsx"
git commit -m "Add contract_name field, require contract dates"
```

---

### Task 3: Swap Deactivate/Reactivate to use the `active` column

**Files:**
- Modify: `src/app/(app)/contracts/actions.ts`
- Modify: `src/app/(app)/contracts/page.tsx`
- Modify: `src/app/(app)/contracts/[id]/edit/page.tsx`

**Interfaces:**
- Consumes: Task 1's `active` column being live.
- Produces: `deactivateContract`/`reactivateContract` no longer touch `end_date`. `ContractRow` (list page) and the edit page both read `contract.active` directly instead of calling `isActiveByEndDate`. Nothing outside this task depends on these.

- [ ] **Step 1: Rewrite `deactivateContract`/`reactivateContract`**

In `src/app/(app)/contracts/actions.ts`, replace both functions:

```ts
export async function deactivateContract(id: number) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('contract')
    .update({ active: false })
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
    .update({ active: true })
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

Remove the now-unused `import { todayLocal } from '@/lib/date';` line at the top of this file — nothing in it calls `todayLocal` anymore.

- [ ] **Step 2: Update the list page's status logic**

In `src/app/(app)/contracts/page.tsx`:

Remove `import { isActiveByEndDate } from '@/lib/date';`.

Add `active: boolean;` to the `ContractRow` type, and add `active` to the query's `select`:

```ts
.select('id, contract_name, contract_number, start_date, end_date, active, company(name)')
```

Replace:

```ts
const active = isActiveByEndDate(contract.end_date);
```

with:

```ts
const { active } = contract;
```

Replace the status label:

```tsx
{active ? 'Active' : 'Expired'}
```

with:

```tsx
{active ? 'Active' : 'Inactive'}
```

- [ ] **Step 3: Update the edit page's status logic**

In `src/app/(app)/contracts/[id]/edit/page.tsx`:

Remove `import { isActiveByEndDate } from '@/lib/date';`.

Add `active` to the contract query's `select`:

```ts
.select('id, contract_name, contract_number, company_id, start_date, end_date, active')
```

Replace:

```ts
const active = isActiveByEndDate(contract.end_date);
```

with:

```ts
const { active } = contract;
```

- [ ] **Step 4: Run lint and build**

```bash
npm run lint
npm run build
```

Expected: both succeed with no errors.

- [ ] **Step 5: Verify in the browser — this is the regression test that matters most**

Navigate to the edit page of the contract created in Task 2's verification. Note its current Start date and End date values. Click "Deactivate".

Expected: button flips to "Reactivate"; navigating to `/contracts` shows Status "Inactive" for that row, **with Start date and End date completely unchanged** — not overwritten to today's date (this is the exact bug being fixed). Click "Reactivate" and confirm the button flips back to "Deactivate", `/contracts` shows "Active" again, and the dates are still the same real values throughout — never blanked, never touched.

- [ ] **Step 6: Commit**

```bash
git add "src/app/(app)/contracts/actions.ts" "src/app/(app)/contracts/page.tsx" "src/app/(app)/contracts/[id]/edit/page.tsx"
git commit -m "Stop Deactivate/Reactivate from overwriting contract end_date"
```

---

## Self-Review Notes

- **Spec coverage:** `contract_name` column + required dates + `active` column ✓ (Task 1). Field reordering to match legacy, `contract_name` validated and persisted, both dates required ✓ (Task 2). Deactivate/Reactivate no longer touches `end_date`, status relabeled Active/Inactive ✓ (Task 3). Throwaway test row removed rather than backfilled ✓ (Task 1). `isActiveByEndDate` left untouched in `src/lib/date.ts` for Company's continued use ✓ (Task 3, only removes the *import*, not the helper itself).
- **Placeholder scan:** none — every step has complete, runnable code.
- **Type consistency:** `Contract` type (Task 2) has `contract_name: string`, `start_date: string`, `end_date: string` (no longer nullable) — matches the new NOT NULL columns from Task 1. `ContractRow` (Task 2/3) gains `contract_name: string` and `active: boolean`, matching the same underlying columns. `createContract`/`updateContract` signatures unchanged from the existing codebase (`(prevState, formData)` / `(id, prevState, formData)`) — only their validation logic and insert/update payloads changed. `deactivateContract`/`reactivateContract` keep their existing `(id: number): Promise<void>` shape and `.bind(null, id)` usage in the edit page — untouched by this plan.
