# Company Management Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the first real CRUD feature on the ERD-derived schema — list, create, edit, and deactivate/reactivate `Company` records — wired to the real self-hosted Supabase instance through Row Level Security (not the service-role bypass).

**Architecture:** One SQL migration (grants + RLS policy on `timesheet_shorebase.company`), then four Next.js App Router pieces following the codebase's existing Server Component + Server Action pattern (same shape as the login/logout code): a list page, a shared client-side form used for both create and edit, a `Server Actions` file, and two thin route wrappers (`new`, `[id]/edit`).

**Tech Stack:** Next.js 16 App Router, React 19 (`useActionState` for form state), `@supabase/ssr` server client (`src/lib/supabase/server.ts`), plain SQL migration applied via Supabase Studio's SQL editor (per `CLAUDE.md` — `supabase db push` does not work against this instance).

## Global Constraints

- `timesheet_shorebase.company` already exists (`id`, `name`, `internal`, `start_date`, `end_date`) — no column changes, only a new RLS policy and grants.
- RLS policy is a single, non-role-distinguishing rule: any `authenticated` user can read/write. No `role_code` checks yet — that is explicitly out of scope (design spec's non-goals).
- No hard-delete. "Deactivate" sets `end_date` to today; "Reactivate" clears it to `null`. Active = `end_date` is `null` or `>=` today.
- `internal` is a plain checkbox with no uniqueness enforcement (design spec's non-goals).
- No automated test suite in this project — verification is `npm run lint`, a production build, and manual checks against the running dev server (same convention as every prior feature in this codebase).
- Migrations are applied by pasting the SQL into Supabase Studio's SQL editor by the project owner, never via `npx supabase db push` (documented limitation in `CLAUDE.md`) — verify afterward with `psql`, sourcing `DATABASE_URL` from `.env.local` via `source <(grep '^DATABASE_URL=' .env.local | sed 's/^/export /')` and never printing the raw value.
- Never query `auth.users` directly, never handle the project owner's real password.
- `src/components/app-shell/nav.ts` already has `href: '/companies'` set — once `src/app/(app)/companies/page.tsx` exists, Next.js resolves `/companies` there automatically instead of the `[section]` coming-soon catch-all (confirmed: static routes take precedence over sibling dynamic routes). No nav.ts change is part of this plan.

---

### Task 1: Company RLS policy and grants

**Files:**
- Create: `supabase/migrations/20260812000000_company_rls.sql`

**Interfaces:**
- Consumes: nothing — new migration on top of `supabase/migrations/20260810000000_add_app_role.sql`.
- Produces: `authenticated` Postgres role can `SELECT`/`INSERT`/`UPDATE` on `timesheet_shorebase.company`, gated by a permissive RLS policy. Tasks 2–5 depend on this being applied to the live database before their browser-verification steps will show real data instead of a permission error.

The design spec's SQL only showed `enable row level security` + the policy. That alone is **not sufficient**: no migration in this project has ever granted `authenticated` any privilege on the `timesheet_shorebase` schema at all (confirmed by grepping every existing migration for `grant` — zero matches). This is the exact same root cause already diagnosed earlier in this project as a `42501 permission denied for schema` error when testing the `anon` role directly. Without the `grant` statements below, enabling RLS with a permissive policy still leaves `authenticated` unable to touch the table at all.

- [ ] **Step 1: Write the migration**

Create `supabase/migrations/20260812000000_company_rls.sql`:

```sql
-- First Row Level Security policy in this schema, scoped to `company` only.
-- Every other table remains inaccessible to anon/authenticated until it gets
-- its own migration (see CLAUDE.md's "Not yet done: RLS"). No role_code
-- distinction yet - any authenticated user can read/write, refined later.

begin;

grant usage on schema timesheet_shorebase to authenticated;
grant select, insert, update on timesheet_shorebase.company to authenticated;

alter table timesheet_shorebase.company enable row level security;

create policy "authenticated users can read/write companies"
  on timesheet_shorebase.company
  for all
  to authenticated
  using (true)
  with check (true);

commit;
```

- [ ] **Step 2: Ask the project owner to apply the migration**

Paste the full contents of `supabase/migrations/20260812000000_company_rls.sql` into Supabase Studio's SQL editor and run it there (this instance cannot be migrated via `supabase db push` — see `CLAUDE.md`). Wait for confirmation it ran without error before continuing to Step 3.

- [ ] **Step 3: Verify against the real database**

```bash
source <(grep '^DATABASE_URL=' .env.local | sed 's/^/export /')
psql "$DATABASE_URL" -c "select grantee, privilege_type from information_schema.role_table_grants where table_schema = 'timesheet_shorebase' and table_name = 'company' and grantee = 'authenticated' order by privilege_type;"
psql "$DATABASE_URL" -c "select policyname, cmd, roles from pg_policies where schemaname = 'timesheet_shorebase' and tablename = 'company';"
psql "$DATABASE_URL" -c "select relrowsecurity from pg_class where relname = 'company' and relnamespace = 'timesheet_shorebase'::regnamespace;"
```

Expected:
- First query returns exactly three rows for `authenticated`: `INSERT`, `SELECT`, `UPDATE`.
- Second query returns one row: `policyname` = `authenticated users can read/write companies`, `cmd` = `ALL`, `roles` = `{authenticated}`.
- Third query returns `t`.

Do not query `auth.users` at any point.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260812000000_company_rls.sql
git commit -m "Add RLS policy and grants for timesheet_shorebase.company"
```

---

### Task 2: Companies list page

**Files:**
- Create: `src/app/(app)/companies/page.tsx`

**Interfaces:**
- Consumes: `createClient` from `@/lib/supabase/server` (existing). Requires Task 1's migration to be live for the query to return data instead of a permission error.
- Produces: the `CompanyRow` shape (`id: number`, `name: string`, `internal: boolean`, `start_date: string | null`, `end_date: string | null`) and the `isActive(company)` computation, both re-declared identically in Task 4's edit page (same literal logic — no shared module needed for two call sites in this codebase's current size).

- [ ] **Step 1: Write the list page**

Create `src/app/(app)/companies/page.tsx`:

```tsx
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';

type CompanyRow = {
  id: number;
  name: string;
  internal: boolean;
  start_date: string | null;
  end_date: string | null;
};

function isActive(company: CompanyRow): boolean {
  if (!company.end_date) return true;
  const today = new Date().toISOString().slice(0, 10);
  return company.end_date >= today;
}

export default async function CompaniesPage() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('company')
    .select('id, name, internal, start_date, end_date')
    .order('name', { ascending: true });

  const companies = (data ?? []) as CompanyRow[];

  return (
    <div className="px-6 py-8">
      <div className="flex items-center justify-between">
        <div>
          <p className="font-mono text-xs font-medium tracking-[0.2em] text-zinc-500 dark:text-zinc-400">
            MASTER DATA
          </p>
          <h2 className="mt-1 text-2xl font-semibold text-zinc-950 dark:text-zinc-50">
            Companies
          </h2>
        </div>
        <Link
          href="/companies/new"
          className="rounded-md bg-teal-700 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-teal-800 dark:bg-teal-600 dark:hover:bg-teal-500"
        >
          Add company
        </Link>
      </div>

      {error && (
        <p role="alert" className="mt-4 text-sm text-red-600 dark:text-red-400">
          Couldn&apos;t load companies: {error.message}
        </p>
      )}

      {!error && companies.length === 0 && (
        <p className="mt-4 max-w-prose text-zinc-600 dark:text-zinc-400">
          No companies yet. Add your first one to get started.
        </p>
      )}

      {!error && companies.length > 0 && (
        <div className="mt-6 overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800">
          <table className="w-full text-sm">
            <thead className="border-b border-zinc-200 bg-zinc-50 text-left text-xs font-medium uppercase tracking-wide text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
              <tr>
                <th className="px-4 py-2">Name</th>
                <th className="px-4 py-2">Type</th>
                <th className="px-4 py-2">Status</th>
                <th className="px-4 py-2">Start date</th>
                <th className="px-4 py-2">End date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {companies.map((company) => {
                const active = isActive(company);
                return (
                  <tr key={company.id}>
                    <td className="px-4 py-2 font-medium text-zinc-900 dark:text-zinc-100">
                      <Link href={`/companies/${company.id}/edit`} className="hover:underline">
                        {company.name}
                      </Link>
                    </td>
                    <td className="px-4 py-2 text-zinc-600 dark:text-zinc-400">
                      {company.internal ? 'Internal' : 'External'}
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
                    <td className="px-4 py-2 text-zinc-600 dark:text-zinc-400">
                      {company.start_date ?? '—'}
                    </td>
                    <td className="px-4 py-2 text-zinc-600 dark:text-zinc-400">
                      {company.end_date ?? '—'}
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

- [ ] **Step 2: Run lint and build**

```bash
npm run lint
npm run build
```

Expected: both succeed with no errors.

- [ ] **Step 3: Verify in the browser**

Confirm Task 1's migration is live (ask the project owner if unsure — this page will render the red "Couldn't load companies" error instead of the empty state if it isn't). With the dev server running, navigate to `http://localhost:3000/companies`.

Expected: the sidebar's "Companies" link now goes to a real page (no longer "Coming soon"), showing the "MASTER DATA / Companies" header, an "Add company" button, and "No companies yet. Add your first one to get started." (the `company` table has zero rows at this point).

- [ ] **Step 4: Commit**

```bash
git add "src/app/(app)/companies/page.tsx"
git commit -m "Add companies list page"
```

---

### Task 3: Create company

**Files:**
- Create: `src/app/(app)/companies/actions.ts`
- Create: `src/app/(app)/companies/CompanyForm.tsx`
- Create: `src/app/(app)/companies/new/page.tsx`

**Interfaces:**
- Consumes: `createClient` from `@/lib/supabase/server`.
- Produces: `CompanyFormState = { error: string | null }` and `Company = { id: number; name: string; internal: boolean; start_date: string | null; end_date: string | null }` (exported from `CompanyForm.tsx`, imported by Task 4's edit page). `createCompany(prevState: CompanyFormState, formData: FormData): Promise<CompanyFormState>` (exported from `actions.ts`). `CompanyForm({ company?: Company; action: (prevState: CompanyFormState, formData: FormData) => Promise<CompanyFormState>; submitLabel: string })` (exported from `CompanyForm.tsx`, reused by Task 4 for editing).

- [ ] **Step 1: Write the Server Actions file**

Create `src/app/(app)/companies/actions.ts`:

```ts
'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

export type CompanyFormState = {
  error: string | null;
};

export async function createCompany(
  _prevState: CompanyFormState,
  formData: FormData,
): Promise<CompanyFormState> {
  const name = (formData.get('name') as string | null)?.trim();
  if (!name) {
    return { error: 'Name is required.' };
  }

  const internal = formData.get('internal') === 'on';
  const startDate = (formData.get('start_date') as string | null) || null;
  const endDate = (formData.get('end_date') as string | null) || null;

  const supabase = await createClient();
  const { error } = await supabase.from('company').insert({
    name,
    internal,
    start_date: startDate,
    end_date: endDate,
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath('/companies');
  redirect('/companies');
}
```

- [ ] **Step 2: Write the shared form component**

Create `src/app/(app)/companies/CompanyForm.tsx`:

```tsx
'use client';

import { useActionState } from 'react';
import type { CompanyFormState } from './actions';

export type Company = {
  id: number;
  name: string;
  internal: boolean;
  start_date: string | null;
  end_date: string | null;
};

const initialState: CompanyFormState = { error: null };

export function CompanyForm({
  company,
  action,
  submitLabel,
}: {
  company?: Company;
  action: (prevState: CompanyFormState, formData: FormData) => Promise<CompanyFormState>;
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
          defaultValue={company?.name}
          className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-950 focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-600/40 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
        />
      </div>

      <div className="flex items-center gap-2">
        <input
          id="internal"
          name="internal"
          type="checkbox"
          defaultChecked={company?.internal}
          className="size-4 rounded border-zinc-300 text-teal-600 focus:ring-teal-600/40 dark:border-zinc-700"
        />
        <label htmlFor="internal" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          This is our own company
        </label>
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
            defaultValue={company?.start_date ?? ''}
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
            defaultValue={company?.end_date ?? ''}
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

- [ ] **Step 3: Write the new-company route**

Create `src/app/(app)/companies/new/page.tsx`:

```tsx
import { CompanyForm } from '../CompanyForm';
import { createCompany } from '../actions';

export default function NewCompanyPage() {
  return (
    <div className="px-6 py-8">
      <p className="font-mono text-xs font-medium tracking-[0.2em] text-zinc-500 dark:text-zinc-400">
        MASTER DATA
      </p>
      <h2 className="mt-1 text-2xl font-semibold text-zinc-950 dark:text-zinc-50">
        Add company
      </h2>
      <CompanyForm action={createCompany} submitLabel="Create company" />
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

With the dev server running (and Task 1's migration confirmed live), navigate to `http://localhost:3000/companies/new`. Fill in "Name" (e.g. "Test Company"), leave the rest default, submit.

Expected: redirected to `/companies`, and the new row now appears in the table with Type "External" and Status "Active" (no `end_date` set). Then test the validation path: go back to `/companies/new`, submit with the Name field cleared via devtools or by removing the `required` attribute temporarily in devtools — or simpler, confirm the browser's native `required` validation blocks empty submission (expected, since `name` has `required` on the input). To exercise the server-side branch instead, submit a name that's only whitespace (e.g. a single space) — the native `required` check passes (non-empty string) but the server trims it to empty and returns `{ error: 'Name is required.' }`; confirm that message renders inline and the page does not redirect.

- [ ] **Step 6: Commit**

```bash
git add "src/app/(app)/companies/actions.ts" "src/app/(app)/companies/CompanyForm.tsx" "src/app/(app)/companies/new/page.tsx"
git commit -m "Add company creation form and action"
```

---

### Task 4: Edit company

**Files:**
- Modify: `src/app/(app)/companies/actions.ts`
- Create: `src/app/(app)/companies/[id]/edit/page.tsx`

**Interfaces:**
- Consumes: `CompanyForm`, `Company` from `../../CompanyForm`; `CompanyFormState` from `../../actions`.
- Produces: `updateCompany(id: number, prevState: CompanyFormState, formData: FormData): Promise<CompanyFormState>`, added to `actions.ts` alongside `createCompany`. Task 5 adds `deactivateCompany`/`reactivateCompany` to this same file and adds buttons to this same edit page.

- [ ] **Step 1: Add `updateCompany` to the actions file**

In `src/app/(app)/companies/actions.ts`, add below `createCompany`:

```ts
export async function updateCompany(
  id: number,
  _prevState: CompanyFormState,
  formData: FormData,
): Promise<CompanyFormState> {
  const name = (formData.get('name') as string | null)?.trim();
  if (!name) {
    return { error: 'Name is required.' };
  }

  const internal = formData.get('internal') === 'on';
  const startDate = (formData.get('start_date') as string | null) || null;
  const endDate = (formData.get('end_date') as string | null) || null;

  const supabase = await createClient();
  const { error } = await supabase
    .from('company')
    .update({ name, internal, start_date: startDate, end_date: endDate })
    .eq('id', id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath('/companies');
  redirect('/companies');
}
```

- [ ] **Step 2: Write the edit route**

Create `src/app/(app)/companies/[id]/edit/page.tsx`:

```tsx
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { CompanyForm, type Company } from '../../CompanyForm';
import { updateCompany } from '../../actions';

export default async function EditCompanyPage(props: PageProps<'/companies/[id]/edit'>) {
  const { id } = await props.params;
  const companyId = Number(id);

  if (Number.isNaN(companyId)) {
    notFound();
  }

  const supabase = await createClient();
  const { data: company } = await supabase
    .from('company')
    .select('id, name, internal, start_date, end_date')
    .eq('id', companyId)
    .maybeSingle();

  if (!company) {
    notFound();
  }

  const updateCompanyWithId = updateCompany.bind(null, companyId);

  return (
    <div className="px-6 py-8">
      <p className="font-mono text-xs font-medium tracking-[0.2em] text-zinc-500 dark:text-zinc-400">
        MASTER DATA
      </p>
      <h2 className="mt-1 text-2xl font-semibold text-zinc-950 dark:text-zinc-50">
        Edit company
      </h2>
      <CompanyForm
        company={company as Company}
        action={updateCompanyWithId}
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

Navigate to `http://localhost:3000/companies`, click the "Test Company" row created in Task 3. Confirm the form loads pre-filled with its current name. Change the name (e.g. append " Ltd") and submit.

Expected: redirected to `/companies`, the row's name now reflects the change. Also confirm visiting `/companies/999999/edit` (an id that doesn't exist) renders Next.js's 404 page, not a crash.

- [ ] **Step 5: Commit**

```bash
git add "src/app/(app)/companies/actions.ts" "src/app/(app)/companies/[id]/edit/page.tsx"
git commit -m "Add company edit form and action"
```

---

### Task 5: Deactivate and reactivate

**Files:**
- Modify: `src/app/(app)/companies/actions.ts`
- Modify: `src/app/(app)/companies/[id]/edit/page.tsx`

**Interfaces:**
- Consumes: `updateCompanyWithId` pattern already established in Task 4's edit page (same `.bind(null, companyId)` shape).
- Produces: `deactivateCompany(id: number): Promise<void>` and `reactivateCompany(id: number): Promise<void>`, added to `actions.ts`. Nothing outside this task depends on these.

- [ ] **Step 1: Add the two actions**

In `src/app/(app)/companies/actions.ts`, add below `updateCompany`:

```ts
export async function deactivateCompany(id: number) {
  const supabase = await createClient();
  const today = new Date().toISOString().slice(0, 10);
  await supabase.from('company').update({ end_date: today }).eq('id', id);
  revalidatePath('/companies');
  revalidatePath(`/companies/${id}/edit`);
}

export async function reactivateCompany(id: number) {
  const supabase = await createClient();
  await supabase.from('company').update({ end_date: null }).eq('id', id);
  revalidatePath('/companies');
  revalidatePath(`/companies/${id}/edit`);
}
```

- [ ] **Step 2: Add the buttons to the edit page**

In `src/app/(app)/companies/[id]/edit/page.tsx`, update the imports and the returned JSX:

```tsx
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { CompanyForm, type Company } from '../../CompanyForm';
import { updateCompany, deactivateCompany, reactivateCompany } from '../../actions';

export default async function EditCompanyPage(props: PageProps<'/companies/[id]/edit'>) {
  const { id } = await props.params;
  const companyId = Number(id);

  if (Number.isNaN(companyId)) {
    notFound();
  }

  const supabase = await createClient();
  const { data: company } = await supabase
    .from('company')
    .select('id, name, internal, start_date, end_date')
    .eq('id', companyId)
    .maybeSingle();

  if (!company) {
    notFound();
  }

  const today = new Date().toISOString().slice(0, 10);
  const active = !company.end_date || company.end_date >= today;
  const updateCompanyWithId = updateCompany.bind(null, companyId);
  const deactivateCompanyWithId = deactivateCompany.bind(null, companyId);
  const reactivateCompanyWithId = reactivateCompany.bind(null, companyId);

  return (
    <div className="px-6 py-8">
      <p className="font-mono text-xs font-medium tracking-[0.2em] text-zinc-500 dark:text-zinc-400">
        MASTER DATA
      </p>
      <div className="mt-1 flex items-center justify-between">
        <h2 className="text-2xl font-semibold text-zinc-950 dark:text-zinc-50">
          Edit company
        </h2>
        <form action={active ? deactivateCompanyWithId : reactivateCompanyWithId}>
          <button
            type="submit"
            className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-900"
          >
            {active ? 'Deactivate' : 'Reactivate'}
          </button>
        </form>
      </div>
      <CompanyForm
        company={company as Company}
        action={updateCompanyWithId}
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

On the "Test Company Ltd" edit page from Task 4, click "Deactivate". Confirm the button submits, the page reloads, and the button now reads "Reactivate". Navigate to `/companies` and confirm the Status column shows "Inactive" and End date shows today's date. Go back to the edit page, click "Reactivate", confirm the button reverts to "Deactivate" and `/companies` shows "Active" with End date back to "—".

- [ ] **Step 5: Commit**

```bash
git add "src/app/(app)/companies/actions.ts" "src/app/(app)/companies/[id]/edit/page.tsx"
git commit -m "Add company deactivate/reactivate actions"
```

---

## Self-Review Notes

- **Spec coverage:** RLS policy + grants ✓ (Task 1, with the grants gap the design spec omitted made explicit). List page (Name/Type/Status/Start/End, computed Active/Inactive, link to new + edit) ✓ (Task 2). Create via shared form + Server Action ✓ (Task 3). Edit via the same shared form ✓ (Task 4). Deactivate/Reactivate via `end_date` ✓ (Task 5). Server-side validation surfaced via `useActionState` ✓ (Task 3's `CompanyForm`). Nav flip to a real route — confirmed as automatic (no task needed) per the design spec's own note that `nav.ts` already has the href set.
- **Placeholder scan:** none — every step has complete, runnable code.
- **Type consistency:** `Company` (id/name/internal/start_date/end_date) defined once in `CompanyForm.tsx` and imported by the edit page (Task 4); `CompanyRow` in the list page (Task 2) is a separately-declared but structurally identical type, since the list page has no reason to import a Client Component module for a type. `CompanyFormState` defined once in `actions.ts` and imported by `CompanyForm.tsx`. `createCompany`'s signature `(prevState, formData)` and `updateCompany`'s `(id, prevState, formData)` both match how `CompanyForm`'s `action` prop is typed and how `.bind(null, id)` is used in the edit page. `deactivateCompany`/`reactivateCompany` take only `id`, matching the existing `signOut` Server Action's zero-argument-beyond-bind pattern already in `src/app/actions.ts`, and are assignable to `<form action>` because TypeScript allows a function with fewer parameters to satisfy a callback type expecting more.
