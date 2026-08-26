# Person Management Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the seventh real CRUD feature on the ERD-derived schema, and the first entity in the People group — list, create, edit, and deactivate/reactivate `Person` records, each representing an individual belonging to a Company with a Staff Type.

**Architecture:** One migration (required-field constraints, `is_active` default/not-null, `created_at` default/not-null, grants/RLS), then the same Server Component + Server Action pattern proven six times over. `company_id`/`staff_type_code` are independent, user-selected required dropdowns written straight from form input — same as `Subcontractors`, no derivation helper. This is the first feature to expose a genuine timestamp (not just a date) field: `ended_at` is optional and independently editable via a `datetime-local` input, kept strictly separate from the `is_active` status column that Deactivate/Reactivate flips — `person` ships with both an `is_active` boolean and an `ended_at` timestamp already, the same two-field shape that caused the Contract/Company `end_date` bug, so this plan is explicit about which action touches which field. No new nav entry is needed (`nav.ts` already has a "Persons" placeholder).

**Tech Stack:** Next.js 16 App Router, React 19 (`useActionState`), `@supabase/ssr` server client, plain SQL migration applied via Supabase Studio's SQL editor.

## Global Constraints

- Required fields: Name (text), Company (dropdown), Staff Type (dropdown). Optional: Ended at (datetime-local).
- `company_id`/`staff_type_code` are written directly from `formData` — there is NO derivation helper in this feature's `actions.ts`, same as `subcontractors/actions.ts`.
- `is_active boolean not null default true` is the ONLY field Deactivate/Reactivate ever touches. `ended_at` and `created_at` must NEVER be written by `deactivatePerson`/`reactivatePerson` — this is the exact class of bug that shipped twice before (Contract, then Company) for a mutable business date, and `person` ships with the same two-field trap (`is_active` + `ended_at`) already present in its ERD-derived schema. Do not conflate them.
- `ended_at` stays nullable and is a plain optional form field, unrelated to the Deactivate/Reactivate action. It uses an HTML `datetime-local` input — the first timestamp (not date) field in this codebase, so `PersonForm.tsx` needs a small local helper to format the fetched ISO timestamp into the `YYYY-MM-DDTHH:mm` shape that input requires. No existing shared date/time formatting utility exists in this codebase to reuse (the old `src/lib/date.ts` was deleted as dead code during the Company fix) — write the helper locally in `PersonForm.tsx`, scoped to this one use.
- `created_at` is never on the form — it's set once by the database default (`now()`) at insert time.
- Company and Staff Type dropdowns show all rows regardless of status — same convention as every prior feature.
- `nav.ts` already has a "Persons" entry at `/persons` in the People group — no nav changes needed.
- No automated test suite — verification is `npm run lint`, a production build, and manual checks against the running dev server.
- Migrations are applied by pasting the SQL into Supabase Studio's SQL editor by the project owner, never via `npx supabase db push` — verify afterward with `psql`.

---

### Task 1: Migration — required fields, is_active/created_at defaults, grants/RLS

**Files:**
- Create: `supabase/migrations/20260826040000_person.sql`

**Interfaces:**
- Consumes: nothing — new migration on top of `supabase/migrations/20260826030000_clear_subcontractor_test_rows.sql`.
- Produces: `timesheet_shorebase.person` gains required-field constraints on `name`/`company_id`/`staff_type_code`, `is_active` defaults `true`/`not null`, `created_at` defaults `now()`/`not null`; `authenticated` can `select/insert/update`. Tasks 2–5 depend on this being live.

- [ ] **Step 1: Write the migration**

Create `supabase/migrations/20260826040000_person.sql`:

```sql
-- Adds Person's schema requirements: required-field constraints matching
-- the fields this feature's form treats as mandatory, is_active
-- defaulting to true (the only field Deactivate/Reactivate touches), and
-- created_at defaulting to now() and set once at insert time. ended_at
-- stays nullable - it's an independent, optional business fact exposed on
-- the form, never written by the deactivate/reactivate action.

begin;

alter table timesheet_shorebase.person
  alter column name set not null;
alter table timesheet_shorebase.person
  alter column company_id set not null;
alter table timesheet_shorebase.person
  alter column staff_type_code set not null;
alter table timesheet_shorebase.person
  alter column is_active set default true;
alter table timesheet_shorebase.person
  alter column is_active set not null;
alter table timesheet_shorebase.person
  alter column created_at set default now();
alter table timesheet_shorebase.person
  alter column created_at set not null;

grant select, insert, update on timesheet_shorebase.person to authenticated;

alter table timesheet_shorebase.person enable row level security;

create policy "authenticated users can read/write persons"
  on timesheet_shorebase.person
  for all
  to authenticated
  using (true)
  with check (true);

commit;
```

- [ ] **Step 2: Ask the project owner to apply the migration**

Paste the full contents of `supabase/migrations/20260826040000_person.sql` into Supabase Studio's SQL editor and run it there. Wait for confirmation it ran without error before continuing to Step 3.

- [ ] **Step 3: Verify against the real database**

```bash
source <(grep '^DATABASE_URL=' .env.local | sed 's/^/export /')
psql "$DATABASE_URL" -c "\d timesheet_shorebase.person"
psql "$DATABASE_URL" -c "select grantee, privilege_type from information_schema.role_table_grants where table_schema = 'timesheet_shorebase' and table_name = 'person' and grantee = 'authenticated' order by privilege_type;"
psql "$DATABASE_URL" -c "select policyname, cmd, roles from pg_policies where schemaname = 'timesheet_shorebase' and tablename = 'person';"
```

Expected:
- First query shows `name`/`company_id`/`staff_type_code`/`is_active`/`created_at` all `not null`, `is_active` defaulting `true`, `created_at` defaulting `now()`. `ended_at` remains nullable.
- Second query returns three rows for `authenticated`: `INSERT`, `SELECT`, `UPDATE`.
- Third query returns one row: `authenticated users can read/write persons`, `cmd` = `ALL`, `roles` = `{authenticated}`.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260826040000_person.sql
git commit -m "Add required fields, is_active/created_at defaults, and RLS for person"
```

---

### Task 2: Persons list page

**Files:**
- Create: `src/app/(app)/persons/page.tsx`

**Interfaces:**
- Consumes: `createClient` from `@/lib/supabase/server`. Requires Task 1's migration to be live.
- Produces: the `PersonRow` shape, declared in `page.tsx` only. No `nav.ts` changes — the "Persons" entry already exists.

- [ ] **Step 1: Write the list page**

Create `src/app/(app)/persons/page.tsx`:

```tsx
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';

type PersonRow = {
  id: number;
  name: string;
  is_active: boolean;
  company: { name: string } | null;
  staff_type: { name: string } | null;
};

export default async function PersonsPage() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('person')
    .select('id, name, is_active, company(name), staff_type(name)')
    .order('name', { ascending: true });

  const persons = (data ?? []) as unknown as PersonRow[];

  return (
    <div className="px-6 py-8">
      <div className="flex items-center justify-between">
        <div>
          <p className="font-mono text-xs font-medium tracking-[0.2em] text-zinc-500 dark:text-zinc-400">
            PEOPLE
          </p>
          <h2 className="mt-1 text-2xl font-semibold text-zinc-950 dark:text-zinc-50">
            Persons
          </h2>
        </div>
        <Link
          href="/persons/new"
          className="rounded-md bg-teal-700 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-teal-800 dark:bg-teal-600 dark:hover:bg-teal-500"
        >
          Add person
        </Link>
      </div>

      {error && (
        <p role="alert" className="mt-4 text-sm text-red-600 dark:text-red-400">
          Couldn&apos;t load persons: {error.message}
        </p>
      )}

      {!error && persons.length === 0 && (
        <p className="mt-4 max-w-prose text-zinc-600 dark:text-zinc-400">
          No persons yet. Add your first one to get started.
        </p>
      )}

      {!error && persons.length > 0 && (
        <div className="mt-6 overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800">
          <table className="w-full text-sm">
            <thead className="border-b border-zinc-200 bg-zinc-50 text-left text-xs font-medium uppercase tracking-wide text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
              <tr>
                <th className="px-4 py-2">Name</th>
                <th className="px-4 py-2">Company</th>
                <th className="px-4 py-2">Staff Type</th>
                <th className="px-4 py-2">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {persons.map((person) => {
                const { is_active } = person;
                return (
                  <tr key={person.id}>
                    <td className="px-4 py-2 font-medium text-zinc-900 dark:text-zinc-100">
                      <Link href={`/persons/${person.id}/edit`} className="hover:underline">
                        {person.name}
                      </Link>
                    </td>
                    <td className="px-4 py-2 text-zinc-600 dark:text-zinc-400">
                      {person.company?.name ?? '—'}
                    </td>
                    <td className="px-4 py-2 text-zinc-600 dark:text-zinc-400">
                      {person.staff_type?.name ?? '—'}
                    </td>
                    <td className="px-4 py-2">
                      <span
                        className={
                          is_active
                            ? 'rounded-full bg-teal-50 px-2 py-0.5 text-xs font-medium text-teal-800 dark:bg-teal-950/40 dark:text-teal-300'
                            : 'rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400'
                        }
                      >
                        {is_active ? 'Active' : 'Inactive'}
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

`company(name)` and `staff_type(name)` are both unaliased embeds — `person` has exactly one FK to each of `company` and `staff_type`, so PostgREST resolves them unambiguously by target table name. Do not add aliases or hints to either.

Note the eyebrow label is "PEOPLE", not "MASTER DATA" — this is the first feature in the People nav group; match the group label, not the prior group's.

- [ ] **Step 2: Run lint and build**

```bash
npm run lint
npm run build
```

Expected: both succeed with no errors.

- [ ] **Step 3: Verify in the browser**

Confirm Task 1's migration is live. Navigate to `http://localhost:3000/persons`.

Expected: the sidebar's existing "Persons" item now goes to a real page — no longer "Coming soon". The page shows "PEOPLE / Persons", an "Add person" button, and "No persons yet. Add your first one to get started."

- [ ] **Step 4: Commit**

```bash
git add "src/app/(app)/persons/page.tsx"
git commit -m "Add persons list page"
```

---

### Task 3: Create person

**Files:**
- Create: `src/app/(app)/persons/actions.ts`
- Create: `src/app/(app)/persons/PersonForm.tsx`
- Create: `src/app/(app)/persons/new/page.tsx`

**Interfaces:**
- Consumes: `createClient` from `@/lib/supabase/server`.
- Produces: `PersonFormState = { error: string | null }`, `Person`, `CompanyOption = { id: number; name: string }`, `StaffTypeOption = { code: string; name: string }` (all exported from `PersonForm.tsx`, `Person` imported by Task 4's edit page). `createPerson(prevState: PersonFormState, formData: FormData): Promise<PersonFormState>` (exported from `actions.ts`). `PersonForm({ person?: Person; companies: CompanyOption[]; staffTypes: StaffTypeOption[]; action: (prevState: PersonFormState, formData: FormData) => Promise<PersonFormState>; submitLabel: string })` (exported from `PersonForm.tsx`, reused by Task 4).

- [ ] **Step 1: Write the Server Actions file**

Create `src/app/(app)/persons/actions.ts`:

```ts
'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

export type PersonFormState = {
  error: string | null;
};

export async function createPerson(
  _prevState: PersonFormState,
  formData: FormData,
): Promise<PersonFormState> {
  const name = (formData.get('name') as string | null)?.trim();
  if (!name) {
    return { error: 'Name is required.' };
  }

  const companyIdRaw = formData.get('company_id') as string | null;
  const companyId = companyIdRaw ? Number(companyIdRaw) : NaN;
  if (!companyIdRaw || Number.isNaN(companyId)) {
    return { error: 'Company is required.' };
  }

  const staffTypeCode = (formData.get('staff_type_code') as string | null)?.trim();
  if (!staffTypeCode) {
    return { error: 'Staff type is required.' };
  }

  const endedAt = (formData.get('ended_at') as string | null)?.trim() || null;

  const supabase = await createClient();

  const { error } = await supabase.from('person').insert({
    name,
    company_id: companyId,
    staff_type_code: staffTypeCode,
    ended_at: endedAt,
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath('/persons');
  redirect('/persons');
}
```

`ended_at` is optional — an empty string from the form becomes `null`, matching the pattern already used for optional text fields elsewhere (e.g. `shorebase_service`'s `description`). No derivation helper for `company_id`/`staff_type_code` — both come straight from `formData`, same as `subcontractors/actions.ts`.

- [ ] **Step 2: Write the shared form component**

Create `src/app/(app)/persons/PersonForm.tsx`:

```tsx
'use client';

import { useActionState } from 'react';
import type { PersonFormState } from './actions';

export type Person = {
  id: number;
  name: string;
  company_id: number;
  staff_type_code: string;
  ended_at: string | null;
};

export type CompanyOption = {
  id: number;
  name: string;
};

export type StaffTypeOption = {
  code: string;
  name: string;
};

const initialState: PersonFormState = { error: null };

function toDatetimeLocalValue(isoString: string | null): string {
  if (!isoString) return '';
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function PersonForm({
  person,
  companies,
  staffTypes,
  action,
  submitLabel,
}: {
  person?: Person;
  companies: CompanyOption[];
  staffTypes: StaffTypeOption[];
  action: (prevState: PersonFormState, formData: FormData) => Promise<PersonFormState>;
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
          defaultValue={person?.name}
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
          defaultValue={person?.company_id ?? ''}
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
        <label htmlFor="staff_type_code" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Staff type
        </label>
        <select
          id="staff_type_code"
          name="staff_type_code"
          required
          defaultValue={person?.staff_type_code ?? ''}
          className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-950 focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-600/40 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
        >
          <option value="" disabled>
            Select a staff type
          </option>
          {staffTypes.map((staffType) => (
            <option key={staffType.code} value={staffType.code}>
              {staffType.name}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-1">
        <label htmlFor="ended_at" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Ended at
        </label>
        <input
          id="ended_at"
          name="ended_at"
          type="datetime-local"
          defaultValue={toDatetimeLocalValue(person?.ended_at ?? null)}
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

`toDatetimeLocalValue` is a small local helper, not a shared utility — it's the only place in the codebase that needs to format a timestamp (not just a date) for an HTML input, so it lives right next to its one caller rather than in a shared module. It converts the fetched ISO timestamp into the browser's local time components, matching what a `datetime-local` input displays and expects back on submit.

- [ ] **Step 3: Write the new-person route**

Create `src/app/(app)/persons/new/page.tsx`:

```tsx
import { PersonForm } from '../PersonForm';
import { createPerson } from '../actions';
import { createClient } from '@/lib/supabase/server';

export default async function NewPersonPage() {
  const supabase = await createClient();

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

  const { data: staffTypesData, error: staffTypesError } = await supabase
    .from('staff_type')
    .select('code, name')
    .order('name', { ascending: true });

  if (staffTypesError) {
    return (
      <div className="px-6 py-8">
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          Couldn&apos;t load staff types: {staffTypesError.message}
        </p>
      </div>
    );
  }

  const companies = companiesData ?? [];
  const staffTypes = staffTypesData ?? [];

  return (
    <div className="px-6 py-8">
      <p className="font-mono text-xs font-medium tracking-[0.2em] text-zinc-500 dark:text-zinc-400">
        PEOPLE
      </p>
      <h2 className="mt-1 text-2xl font-semibold text-zinc-950 dark:text-zinc-50">
        Add person
      </h2>
      <PersonForm
        companies={companies}
        staffTypes={staffTypes}
        action={createPerson}
        submitLabel="Create person"
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

With the dev server running (and Task 1's migration confirmed live), navigate to `http://localhost:3000/persons/new`. Fill in Name, Company, Staff Type, leave "Ended at" blank, and submit.

Expected: redirected to `/persons`, the new row appears with the correct company and staff type names. Verify via `psql` that `ended_at` saved as `null`: `psql "$DATABASE_URL" -c "select id, name, ended_at, created_at from timesheet_shorebase.person;"` — also confirm `created_at` was auto-populated by the database default even though it was never sent from the form. Then edit that same person, set "Ended at" to a real date/time, save, and confirm via the same query that `ended_at` now has a real timestamp value that round-trips correctly (re-open the edit page and confirm the datetime-local input shows the same value you set, not shifted or truncated). Then test server-side validation: go back to `/persons/new`, enter a name that's only whitespace with everything else filled in — confirm the inline `{ error: 'Name is required.' }` message renders and the page does not redirect.

- [ ] **Step 6: Commit**

```bash
git add "src/app/(app)/persons/actions.ts" "src/app/(app)/persons/PersonForm.tsx" "src/app/(app)/persons/new/page.tsx"
git commit -m "Add person creation form and action"
```

---

### Task 4: Edit person

**Files:**
- Modify: `src/app/(app)/persons/actions.ts`
- Create: `src/app/(app)/persons/[id]/edit/page.tsx`

**Interfaces:**
- Consumes: `PersonForm`, `Person`, `CompanyOption`, `StaffTypeOption` from `../../PersonForm`; `PersonFormState` from `../../actions`.
- Produces: `updatePerson(id: number, prevState: PersonFormState, formData: FormData): Promise<PersonFormState>`, added to `actions.ts` alongside `createPerson`. Task 5 adds `deactivatePerson`/`reactivatePerson` to this same file and adds a button to this same edit page.

- [ ] **Step 1: Add `updatePerson` to the actions file**

In `src/app/(app)/persons/actions.ts`, add below `createPerson`:

```ts
export async function updatePerson(
  id: number,
  _prevState: PersonFormState,
  formData: FormData,
): Promise<PersonFormState> {
  const name = (formData.get('name') as string | null)?.trim();
  if (!name) {
    return { error: 'Name is required.' };
  }

  const companyIdRaw = formData.get('company_id') as string | null;
  const companyId = companyIdRaw ? Number(companyIdRaw) : NaN;
  if (!companyIdRaw || Number.isNaN(companyId)) {
    return { error: 'Company is required.' };
  }

  const staffTypeCode = (formData.get('staff_type_code') as string | null)?.trim();
  if (!staffTypeCode) {
    return { error: 'Staff type is required.' };
  }

  const endedAt = (formData.get('ended_at') as string | null)?.trim() || null;

  const supabase = await createClient();

  const { error } = await supabase
    .from('person')
    .update({
      name,
      company_id: companyId,
      staff_type_code: staffTypeCode,
      ended_at: endedAt,
    })
    .eq('id', id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath('/persons');
  redirect('/persons');
}
```

- [ ] **Step 2: Write the edit route**

Create `src/app/(app)/persons/[id]/edit/page.tsx`:

```tsx
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { PersonForm, type Person } from '../../PersonForm';
import { updatePerson } from '../../actions';

export default async function EditPersonPage(props: PageProps<'/persons/[id]/edit'>) {
  const { id } = await props.params;
  const personId = Number(id);

  if (Number.isNaN(personId)) {
    notFound();
  }

  const supabase = await createClient();
  const { data: person, error } = await supabase
    .from('person')
    .select('id, name, company_id, staff_type_code, ended_at, is_active')
    .eq('id', personId)
    .maybeSingle();

  if (error) {
    return (
      <div className="px-6 py-8">
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          Couldn&apos;t load person: {error.message}
        </p>
      </div>
    );
  }

  if (!person) {
    notFound();
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

  const { data: staffTypesData, error: staffTypesError } = await supabase
    .from('staff_type')
    .select('code, name')
    .order('name', { ascending: true });

  if (staffTypesError) {
    return (
      <div className="px-6 py-8">
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          Couldn&apos;t load staff types: {staffTypesError.message}
        </p>
      </div>
    );
  }

  const companies = companiesData ?? [];
  const staffTypes = staffTypesData ?? [];

  const updatePersonWithId = updatePerson.bind(null, personId);

  return (
    <div className="px-6 py-8">
      <p className="font-mono text-xs font-medium tracking-[0.2em] text-zinc-500 dark:text-zinc-400">
        PEOPLE
      </p>
      <h2 className="mt-1 text-2xl font-semibold text-zinc-950 dark:text-zinc-50">
        Edit person
      </h2>
      <PersonForm
        person={person as Person}
        companies={companies}
        staffTypes={staffTypes}
        action={updatePersonWithId}
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

Navigate to `http://localhost:3000/persons`, click the row created in Task 3. Confirm the form loads pre-filled: Name, Company, Staff Type, and Ended at (if set) all correct. Change the Name and submit.

Expected: redirected to `/persons`, the row's name reflects the change. Also confirm visiting `/persons/999999/edit` (an id that doesn't exist) renders Next.js's 404 page, not a crash.

- [ ] **Step 5: Commit**

```bash
git add "src/app/(app)/persons/actions.ts" "src/app/(app)/persons/[id]/edit/page.tsx"
git commit -m "Add person edit form and action"
```

---

### Task 5: Deactivate and reactivate

**Files:**
- Modify: `src/app/(app)/persons/actions.ts`
- Modify: `src/app/(app)/persons/[id]/edit/page.tsx`

**Interfaces:**
- Consumes: the `updatePersonWithId` `.bind(null, personId)` pattern already established in Task 4's edit page.
- Produces: `deactivatePerson(id: number): Promise<void>` and `reactivatePerson(id: number): Promise<void>`, added to `actions.ts`. Nothing outside this task depends on these.

- [ ] **Step 1: Add the two actions**

In `src/app/(app)/persons/actions.ts`, add below `updatePerson`:

```ts
export async function deactivatePerson(id: number) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('person')
    .update({ is_active: false })
    .eq('id', id)
    .select('id');

  if (error) {
    throw new Error(error.message);
  }
  if (!data || data.length === 0) {
    throw new Error('Person not found.');
  }

  revalidatePath('/persons');
  revalidatePath(`/persons/${id}/edit`);
}

export async function reactivatePerson(id: number) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('person')
    .update({ is_active: true })
    .eq('id', id)
    .select('id');

  if (error) {
    throw new Error(error.message);
  }
  if (!data || data.length === 0) {
    throw new Error('Person not found.');
  }

  revalidatePath('/persons');
  revalidatePath(`/persons/${id}/edit`);
}
```

**Critical constraint**: these must ONLY touch `is_active` — never `ended_at`, `created_at`, `company_id`, or `staff_type_code`. This is the exact class of bug that shipped twice before for a mutable business date; `person` has the same two-field trap already built into its schema, so this is the moment to get it right, not fix it later.

- [ ] **Step 2: Add the button to the edit page**

In `src/app/(app)/persons/[id]/edit/page.tsx`, update the imports and the returned JSX:

```tsx
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { PersonForm, type Person } from '../../PersonForm';
import { updatePerson, deactivatePerson, reactivatePerson } from '../../actions';
```

Replace the `updatePersonWithId` line and everything below it with:

```tsx
  const { is_active } = person;
  const updatePersonWithId = updatePerson.bind(null, personId);
  const deactivatePersonWithId = deactivatePerson.bind(null, personId);
  const reactivatePersonWithId = reactivatePerson.bind(null, personId);

  return (
    <div className="px-6 py-8">
      <p className="font-mono text-xs font-medium tracking-[0.2em] text-zinc-500 dark:text-zinc-400">
        PEOPLE
      </p>
      <div className="mt-1 flex items-center justify-between">
        <h2 className="text-2xl font-semibold text-zinc-950 dark:text-zinc-50">
          Edit person
        </h2>
        <form action={is_active ? deactivatePersonWithId : reactivatePersonWithId}>
          <button
            type="submit"
            className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-900"
          >
            {is_active ? 'Deactivate' : 'Reactivate'}
          </button>
        </form>
      </div>
      <PersonForm
        person={person as Person}
        companies={companies}
        staffTypes={staffTypes}
        action={updatePersonWithId}
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

On the person's edit page from Task 4, note the current `ended_at` value (set one first if it's still blank, via a Save) and the Company/Staff Type selections. Click "Deactivate". Confirm the button submits, the page reloads, and the button now reads "Reactivate". Navigate to `/persons` and confirm the Status column shows "Inactive". Go back to the edit page, click "Reactivate", confirm the button reverts to "Deactivate" and `/persons` shows "Active" again — with `ended_at`, Company, and Staff Type completely unchanged throughout the whole cycle (verify via `psql`: `select id, is_active, ended_at, company_id, staff_type_code from timesheet_shorebase.person where id = <id>;` before and after both toggles).

- [ ] **Step 5: Commit**

```bash
git add "src/app/(app)/persons/actions.ts" "src/app/(app)/persons/[id]/edit/page.tsx"
git commit -m "Add person deactivate/reactivate actions"
```

---

## Self-Review Notes

- **Spec coverage:** required-field constraints + `is_active`/`created_at` defaults + grants/RLS ✓ (Task 1). No new nav entry — confirmed `nav.ts` already has a "Persons" placeholder, no task touches `nav.ts`. List page with joined company/staff-type names, "PEOPLE" eyebrow (not "MASTER DATA") ✓ (Task 2). `company_id`/`staff_type_code` independent, straight from `formData`, no derivation helper ✓ (Task 3's `createPerson`/Task 4's `updatePerson`). `ended_at` optional, independently editable via `datetime-local`, converted via the local `toDatetimeLocalValue` helper ✓ (Task 3's `PersonForm`). `created_at` never on the form, DB-managed only ✓ (confirmed absent from both `createPerson` and `updatePerson`'s writes). Deactivate/Reactivate flips `is_active` only, never `ended_at`/`created_at`/`company_id`/`staff_type_code` ✓ (Task 5).
- **Placeholder scan:** none — every step has complete, runnable code.
- **Type consistency:** `Person` (id/name/company_id/staff_type_code/ended_at) defined once in `PersonForm.tsx`, imported by the edit page (Task 4) — deliberately excludes `is_active`, handled the same way `ContractService`'s `active`/`Period`'s `locked`/`Subcontractor`'s `active` were: destructured from the raw fetched row in the edit page, not part of the form's typed prop shape. `CompanyOption`/`StaffTypeOption` defined once in `PersonForm.tsx`, used by both `new/page.tsx` and `[id]/edit/page.tsx`. `PersonFormState` defined once in `actions.ts`, imported by `PersonForm.tsx`. `createPerson`'s signature `(prevState, formData)` and `updatePerson`'s `(id, prevState, formData)` both match how `PersonForm`'s `action` prop is typed and how `.bind(null, id)` is used in the edit page — same shape as every prior feature. `deactivatePerson`/`reactivatePerson` take only `id`, matching the proven shape exactly — error-checked, zero-rows-affected guard, flips `is_active` only. `toDatetimeLocalValue` defined once in `PersonForm.tsx`, used only by that file's own `defaultValue` — not duplicated anywhere, no shared utility module touched.
