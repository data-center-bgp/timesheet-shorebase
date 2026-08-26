# PersonMeal Management Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the ninth real CRUD feature on the ERD-derived schema — list, create, edit, and deactivate/reactivate `PersonMeal` records, each assigning a Person a meal time/count/date billed against a ContractService.

**Architecture:** Structurally near-identical to `PersonAccomodation`, built moments before it. One migration (required-field constraints, the `active` column, grants/RLS — this time including the `meal_time` lookup-table grant baked in from the start, after having to fix the equivalent gap as a follow-up for three straight prior features: `sum_calc_type`, `staff_type`, `room_type`), then the same Server Component + Server Action pattern proven eight times over. `company_id`/`staff_type_code` are never shown on the form — both derived server-side from the selected Person via one query, same mechanism as `PersonAccomodation`'s `lookupCompanyAndStaffTypeForPerson`, reimplemented locally here (no cross-feature action imports). No new nav entry is needed (`nav.ts` already has a "Meals" placeholder). No client-side auto-fill interactivity is needed — every field is a plain `defaultValue` input. One date field (`meal_date`), not a start/end pair.

**Tech Stack:** Next.js 16 App Router, React 19 (`useActionState`), `@supabase/ssr` server client, plain SQL migration applied via Supabase Studio's SQL editor.

## Global Constraints

- Required fields: Person (dropdown), Contract Service (dropdown), Meal Time (dropdown), Count (number), Meal date. No optional fields.
- `company_id`/`staff_type_code` never appear on the form. Both `createPersonMeal` and `updatePersonMeal` look up the selected `person_id`'s current `company_id`/`staff_type_code` server-side (ONE query, both fields) and write both into the row.
- `active boolean not null default true` — same convention as `PersonAccomodation`/`Subcontractors`/`Person`. Deactivate/Reactivate flips `active` only, never `meal_date`/`count`/`company_id`/`staff_type_code`/`person_id`/`contract_service_id`/`meal_time_code` — built correctly from the start.
- No new uniqueness constraint — nothing in the ERD specifies one.
- Person/ContractService/Meal Time dropdowns show all rows regardless of status — same convention as every prior feature.
- `nav.ts` already has a "Meals" entry at `/meals` in the People group — no nav changes needed.
- `meal_time` needs a `select` grant to `authenticated` in Task 1's migration itself — do not wait to discover this as a follow-up fix, unlike the three prior features that hit this exact gap for a different lookup table each time (`sum_calc_type`, `staff_type`, `room_type`). `meal_time` has zero grants and RLS disabled today (confirmed via `psql` before this plan was written) — grant `select` only, do not enable RLS (no policy would exist for it, matching `uom`/`staff_type`/`room_type`'s precedent).
- `person` and `contract_service` currently have 0 rows each (both were emptied by `PersonAccomodation`'s test-data cleanup) — verification tasks that need live data must seed one of each first.
- No automated test suite — verification is `npm run lint`, a production build, and manual checks against the running dev server.
- Migrations are applied by pasting the SQL into Supabase Studio's SQL editor by the project owner, never via `npx supabase db push` — verify afterward with `psql`.

---

### Task 1: Migration — required fields, active column, meal_time grant, person_meal grants/RLS

**Files:**
- Create: `supabase/migrations/20260826080000_person_meal.sql`

**Interfaces:**
- Consumes: nothing — new migration on top of `supabase/migrations/20260826070000_clear_accommodation_test_rows.sql`.
- Produces: `timesheet_shorebase.person_meal` gains required-field constraints on `person_id`/`meal_time_code`/`contract_service_id`/`count`/`meal_date`, and `active boolean not null default true`; `authenticated` can `select/insert/update` on `person_meal`; `authenticated` gains `select` on `meal_time`. Tasks 2–5 depend on this being live.

- [ ] **Step 1: Write the migration**

Create `supabase/migrations/20260826080000_person_meal.sql`:

```sql
-- Adds PersonMeal's schema requirements: required-field constraints
-- matching the fields this feature's form treats as mandatory, and the
-- active-column convention (see CLAUDE.md). company_id and
-- staff_type_code stay nullable - both are derived automatically from
-- the selected person, same pattern as person_accomodation. This
-- migration also grants select on meal_time up front - the equivalent
-- gap (a dropdown-source lookup table with zero grants) had to be
-- fixed as a follow-up for sum_calc_type, staff_type, and room_type in
-- three straight prior features; catching it here avoids a fourth.

begin;

alter table timesheet_shorebase.person_meal
  alter column person_id set not null;
alter table timesheet_shorebase.person_meal
  alter column meal_time_code set not null;
alter table timesheet_shorebase.person_meal
  alter column contract_service_id set not null;
alter table timesheet_shorebase.person_meal
  alter column count set not null;
alter table timesheet_shorebase.person_meal
  alter column meal_date set not null;

alter table timesheet_shorebase.person_meal
  add column active boolean not null default true;

grant select, insert, update on timesheet_shorebase.person_meal to authenticated;

alter table timesheet_shorebase.person_meal enable row level security;

create policy "authenticated users can read/write person meals"
  on timesheet_shorebase.person_meal
  for all
  to authenticated
  using (true)
  with check (true);

grant select on timesheet_shorebase.meal_time to authenticated;

commit;
```

- [ ] **Step 2: Ask the project owner to apply the migration**

Paste the full contents of `supabase/migrations/20260826080000_person_meal.sql` into Supabase Studio's SQL editor and run it there. Wait for confirmation it ran without error before continuing to Step 3.

- [ ] **Step 3: Verify against the real database**

```bash
source <(grep '^DATABASE_URL=' .env.local | sed 's/^/export /')
psql "$DATABASE_URL" -c "\d timesheet_shorebase.person_meal"
psql "$DATABASE_URL" -c "select grantee, privilege_type from information_schema.role_table_grants where table_schema = 'timesheet_shorebase' and table_name = 'person_meal' and grantee = 'authenticated' order by privilege_type;"
psql "$DATABASE_URL" -c "select policyname, cmd, roles from pg_policies where schemaname = 'timesheet_shorebase' and tablename = 'person_meal';"
psql "$DATABASE_URL" -c "select grantee, privilege_type from information_schema.role_table_grants where table_schema = 'timesheet_shorebase' and table_name = 'meal_time' and grantee = 'authenticated';"
```

Expected:
- First query shows `person_id`/`meal_time_code`/`contract_service_id`/`count`/`meal_date`/`active` all `not null`, `active` defaulting `true`. `company_id`/`staff_type_code` remain nullable.
- Second query returns three rows for `authenticated`: `INSERT`, `SELECT`, `UPDATE`.
- Third query returns one row: `authenticated users can read/write person meals`, `cmd` = `ALL`, `roles` = `{authenticated}`.
- Fourth query returns one row: `authenticated`, `SELECT`.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260826080000_person_meal.sql
git commit -m "Add required fields, active column, and RLS for person_meal; grant meal_time"
```

---

### Task 2: Meals list page

**Files:**
- Create: `src/app/(app)/meals/page.tsx`

**Interfaces:**
- Consumes: `createClient` from `@/lib/supabase/server`. Requires Task 1's migration to be live.
- Produces: the `PersonMealRow` shape, declared in `page.tsx` only. No `nav.ts` changes — the "Meals" entry already exists.

- [ ] **Step 1: Write the list page**

Create `src/app/(app)/meals/page.tsx`:

```tsx
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';

type PersonMealRow = {
  id: number;
  count: number;
  meal_date: string;
  active: boolean;
  person: { name: string } | null;
  contract_service: { code: string } | null;
  meal_time: { name: string } | null;
};

export default async function MealsPage() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('person_meal')
    .select('id, count, meal_date, active, person(name), contract_service(code), meal_time(name)')
    .order('meal_date', { ascending: true });

  const meals = (data ?? []) as unknown as PersonMealRow[];

  return (
    <div className="px-6 py-8">
      <div className="flex items-center justify-between">
        <div>
          <p className="font-mono text-xs font-medium tracking-[0.2em] text-zinc-500 dark:text-zinc-400">
            PEOPLE
          </p>
          <h2 className="mt-1 text-2xl font-semibold text-zinc-950 dark:text-zinc-50">
            Meals
          </h2>
        </div>
        <Link
          href="/meals/new"
          className="rounded-md bg-teal-700 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-teal-800 dark:bg-teal-600 dark:hover:bg-teal-500"
        >
          Add meal
        </Link>
      </div>

      {error && (
        <p role="alert" className="mt-4 text-sm text-red-600 dark:text-red-400">
          Couldn&apos;t load meal records: {error.message}
        </p>
      )}

      {!error && meals.length === 0 && (
        <p className="mt-4 max-w-prose text-zinc-600 dark:text-zinc-400">
          No meal records yet. Add your first one to get started.
        </p>
      )}

      {!error && meals.length > 0 && (
        <div className="mt-6 overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800">
          <table className="w-full text-sm">
            <thead className="border-b border-zinc-200 bg-zinc-50 text-left text-xs font-medium uppercase tracking-wide text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
              <tr>
                <th className="px-4 py-2">Person</th>
                <th className="px-4 py-2">Contract Service</th>
                <th className="px-4 py-2">Meal Time</th>
                <th className="px-4 py-2">Count</th>
                <th className="px-4 py-2">Meal date</th>
                <th className="px-4 py-2">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {meals.map((meal) => {
                const { active } = meal;
                return (
                  <tr key={meal.id}>
                    <td className="px-4 py-2 font-medium text-zinc-900 dark:text-zinc-100">
                      <Link href={`/meals/${meal.id}/edit`} className="hover:underline">
                        {meal.person?.name ?? '—'}
                      </Link>
                    </td>
                    <td className="px-4 py-2 text-zinc-600 dark:text-zinc-400">
                      {meal.contract_service?.code ?? '—'}
                    </td>
                    <td className="px-4 py-2 text-zinc-600 dark:text-zinc-400">
                      {meal.meal_time?.name ?? '—'}
                    </td>
                    <td className="px-4 py-2 text-zinc-600 dark:text-zinc-400">{meal.count}</td>
                    <td className="px-4 py-2 text-zinc-600 dark:text-zinc-400">{meal.meal_date}</td>
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

`person(name)`, `contract_service(code)`, and `meal_time(name)` are all unaliased embeds — `person_meal` has exactly one FK to each of `person`, `contract_service`, and `meal_time`, so PostgREST resolves them unambiguously by target table name. Do not add aliases or hints to any of these three. Eyebrow label is "PEOPLE".

- [ ] **Step 2: Run lint and build**

```bash
npm run lint
npm run build
```

Expected: both succeed with no errors.

- [ ] **Step 3: Verify in the browser**

Confirm Task 1's migration is live. Navigate to `http://localhost:3000/meals`.

Expected: the sidebar's existing "Meals" item now goes to a real page — no longer "Coming soon". The page shows "PEOPLE / Meals", an "Add meal" button, and "No meal records yet. Add your first one to get started."

- [ ] **Step 4: Commit**

```bash
git add "src/app/(app)/meals/page.tsx"
git commit -m "Add meals list page"
```

---

### Task 3: Create meal record

**Files:**
- Create: `src/app/(app)/meals/actions.ts`
- Create: `src/app/(app)/meals/PersonMealForm.tsx`
- Create: `src/app/(app)/meals/new/page.tsx`

**Interfaces:**
- Consumes: `createClient` from `@/lib/supabase/server`.
- Produces: `PersonMealFormState = { error: string | null }`, `PersonMeal`, `PersonOption = { id: number; name: string }`, `ContractServiceOption = { id: number; code: string }`, `MealTimeOption = { code: string; name: string }` (all exported from `PersonMealForm.tsx`, `PersonMeal` imported by Task 4's edit page). `createPersonMeal(prevState: PersonMealFormState, formData: FormData): Promise<PersonMealFormState>` (exported from `actions.ts`). `PersonMealForm({ meal?: PersonMeal; persons: PersonOption[]; contractServices: ContractServiceOption[]; mealTimes: MealTimeOption[]; action: (prevState: PersonMealFormState, formData: FormData) => Promise<PersonMealFormState>; submitLabel: string })` (exported from `PersonMealForm.tsx`, reused by Task 4).

- [ ] **Step 1: Write the Server Actions file**

Create `src/app/(app)/meals/actions.ts`:

```ts
'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

export type PersonMealFormState = {
  error: string | null;
};

async function lookupCompanyAndStaffTypeForPerson(
  supabase: Awaited<ReturnType<typeof createClient>>,
  personId: number,
): Promise<{ companyId: number | null; staffTypeCode: string | null }> {
  const { data } = await supabase
    .from('person')
    .select('company_id, staff_type_code')
    .eq('id', personId)
    .maybeSingle();
  return {
    companyId: data?.company_id ?? null,
    staffTypeCode: data?.staff_type_code ?? null,
  };
}

export async function createPersonMeal(
  _prevState: PersonMealFormState,
  formData: FormData,
): Promise<PersonMealFormState> {
  const personIdRaw = formData.get('person_id') as string | null;
  const personId = personIdRaw ? Number(personIdRaw) : NaN;
  if (!personIdRaw || Number.isNaN(personId)) {
    return { error: 'Person is required.' };
  }

  const contractServiceIdRaw = formData.get('contract_service_id') as string | null;
  const contractServiceId = contractServiceIdRaw ? Number(contractServiceIdRaw) : NaN;
  if (!contractServiceIdRaw || Number.isNaN(contractServiceId)) {
    return { error: 'Contract service is required.' };
  }

  const mealTimeCode = (formData.get('meal_time_code') as string | null)?.trim();
  if (!mealTimeCode) {
    return { error: 'Meal time is required.' };
  }

  const countRaw = (formData.get('count') as string | null)?.trim();
  const count = countRaw ? Number(countRaw) : NaN;
  if (!countRaw || !Number.isInteger(count) || count < 1) {
    return { error: 'Count is required and must be a positive whole number.' };
  }

  const mealDate = (formData.get('meal_date') as string | null)?.trim();
  if (!mealDate) {
    return { error: 'Meal date is required.' };
  }

  const supabase = await createClient();
  const { companyId, staffTypeCode } = await lookupCompanyAndStaffTypeForPerson(supabase, personId);

  const { error } = await supabase.from('person_meal').insert({
    person_id: personId,
    contract_service_id: contractServiceId,
    meal_time_code: mealTimeCode,
    company_id: companyId,
    staff_type_code: staffTypeCode,
    count,
    meal_date: mealDate,
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath('/meals');
  redirect('/meals');
}
```

`lookupCompanyAndStaffTypeForPerson` is a local reimplementation of `PersonAccomodation`'s helper of the same name and shape — not imported cross-feature, consistent with every prior feature's convention.

- [ ] **Step 2: Write the shared form component**

Create `src/app/(app)/meals/PersonMealForm.tsx`:

```tsx
'use client';

import { useActionState } from 'react';
import type { PersonMealFormState } from './actions';

export type PersonMeal = {
  id: number;
  person_id: number;
  contract_service_id: number;
  meal_time_code: string;
  count: number;
  meal_date: string;
};

export type PersonOption = {
  id: number;
  name: string;
};

export type ContractServiceOption = {
  id: number;
  code: string;
};

export type MealTimeOption = {
  code: string;
  name: string;
};

const initialState: PersonMealFormState = { error: null };

export function PersonMealForm({
  meal,
  persons,
  contractServices,
  mealTimes,
  action,
  submitLabel,
}: {
  meal?: PersonMeal;
  persons: PersonOption[];
  contractServices: ContractServiceOption[];
  mealTimes: MealTimeOption[];
  action: (prevState: PersonMealFormState, formData: FormData) => Promise<PersonMealFormState>;
  submitLabel: string;
}) {
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="mt-6 max-w-md space-y-4">
      <div className="space-y-1">
        <label htmlFor="person_id" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Person
        </label>
        <select
          id="person_id"
          name="person_id"
          required
          defaultValue={meal?.person_id ?? ''}
          className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-950 focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-600/40 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
        >
          <option value="" disabled>
            Select a person
          </option>
          {persons.map((person) => (
            <option key={person.id} value={person.id}>
              {person.name}
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
          defaultValue={meal?.contract_service_id ?? ''}
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
        <label htmlFor="meal_time_code" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Meal time
        </label>
        <select
          id="meal_time_code"
          name="meal_time_code"
          required
          defaultValue={meal?.meal_time_code ?? ''}
          className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-950 focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-600/40 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
        >
          <option value="" disabled>
            Select a meal time
          </option>
          {mealTimes.map((mealTime) => (
            <option key={mealTime.code} value={mealTime.code}>
              {mealTime.name}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-1">
        <label htmlFor="count" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Count
        </label>
        <input
          id="count"
          name="count"
          type="number"
          min="1"
          step="1"
          required
          defaultValue={meal?.count}
          className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-950 focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-600/40 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
        />
      </div>

      <div className="space-y-1">
        <label htmlFor="meal_date" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Meal date
        </label>
        <input
          id="meal_date"
          name="meal_date"
          type="date"
          required
          defaultValue={meal?.meal_date}
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

No controlled fields, no `useState` — every field is a plain `defaultValue`, including a single `meal_date` field (no start/end pair, unlike `PersonAccomodation`).

- [ ] **Step 3: Write the new-meal route**

Create `src/app/(app)/meals/new/page.tsx`:

```tsx
import { PersonMealForm } from '../PersonMealForm';
import { createPersonMeal } from '../actions';
import { createClient } from '@/lib/supabase/server';

export default async function NewMealPage() {
  const supabase = await createClient();

  const { data: personsData, error: personsError } = await supabase
    .from('person')
    .select('id, name')
    .order('name', { ascending: true });

  if (personsError) {
    return (
      <div className="px-6 py-8">
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          Couldn&apos;t load persons: {personsError.message}
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

  const { data: mealTimesData, error: mealTimesError } = await supabase
    .from('meal_time')
    .select('code, name')
    .order('name', { ascending: true });

  if (mealTimesError) {
    return (
      <div className="px-6 py-8">
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          Couldn&apos;t load meal times: {mealTimesError.message}
        </p>
      </div>
    );
  }

  const persons = personsData ?? [];
  const contractServices = contractServicesData ?? [];
  const mealTimes = mealTimesData ?? [];

  return (
    <div className="px-6 py-8">
      <p className="font-mono text-xs font-medium tracking-[0.2em] text-zinc-500 dark:text-zinc-400">
        PEOPLE
      </p>
      <h2 className="mt-1 text-2xl font-semibold text-zinc-950 dark:text-zinc-50">
        Add meal
      </h2>
      <PersonMealForm
        persons={persons}
        contractServices={contractServices}
        mealTimes={mealTimes}
        action={createPersonMeal}
        submitLabel="Create meal"
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

With the dev server running (and Task 1's migration confirmed live), check whether at least one `person` and one `contract_service` row exist: `psql "$DATABASE_URL" -c "select count(*) from timesheet_shorebase.person;" -c "select count(*) from timesheet_shorebase.contract_service;"`. Both are currently 0 (emptied by `PersonAccomodation`'s cleanup) — seed one of each via the app itself first (`/companies/new` → `/contracts/new` → `/services/new` → `/contract-services/new` → `/persons/new`, in that dependency order, skipping any step whose table already has a usable row). Note any rows you create for the final reviewer.

Navigate to `http://localhost:3000/meals/new`, fill in the required fields, and submit.

Expected: redirected to `/meals`, the new row appears with the correct person name, contract service code, and meal time. Verify `company_id`/`staff_type_code` were correctly derived (not shown in the UI): `psql "$DATABASE_URL" -c "select pm.id, pm.company_id, pm.staff_type_code, p.company_id as person_company_id, p.staff_type_code as person_staff_type_code from timesheet_shorebase.person_meal pm join timesheet_shorebase.person p on p.id = pm.person_id;"` — both pairs must match. Then test server-side validation: go back to `/meals/new`, enter `0` for Count with everything else filled in — confirm the inline `{ error: 'Count is required and must be a positive whole number.' }` message renders and the page does not redirect (note: the `min="1"` HTML attribute may intercept this before it reaches the server action, same as observed during `PersonAccomodation`'s Task 3 — that's fine, the important thing is no redirect and no bad row).

- [ ] **Step 6: Commit**

```bash
git add "src/app/(app)/meals/actions.ts" "src/app/(app)/meals/PersonMealForm.tsx" "src/app/(app)/meals/new/page.tsx"
git commit -m "Add meal creation form and action"
```

---

### Task 4: Edit meal record

**Files:**
- Modify: `src/app/(app)/meals/actions.ts`
- Create: `src/app/(app)/meals/[id]/edit/page.tsx`

**Interfaces:**
- Consumes: `PersonMealForm`, `PersonMeal`, `PersonOption`, `ContractServiceOption`, `MealTimeOption` from `../../PersonMealForm`; `PersonMealFormState` from `../../actions`.
- Produces: `updatePersonMeal(id: number, prevState: PersonMealFormState, formData: FormData): Promise<PersonMealFormState>`, added to `actions.ts` alongside `createPersonMeal`. Task 5 adds `deactivatePersonMeal`/`reactivatePersonMeal` to this same file and adds a button to this same edit page.

- [ ] **Step 1: Add `updatePersonMeal` to the actions file**

In `src/app/(app)/meals/actions.ts`, add below `createPersonMeal`:

```ts
export async function updatePersonMeal(
  id: number,
  _prevState: PersonMealFormState,
  formData: FormData,
): Promise<PersonMealFormState> {
  const personIdRaw = formData.get('person_id') as string | null;
  const personId = personIdRaw ? Number(personIdRaw) : NaN;
  if (!personIdRaw || Number.isNaN(personId)) {
    return { error: 'Person is required.' };
  }

  const contractServiceIdRaw = formData.get('contract_service_id') as string | null;
  const contractServiceId = contractServiceIdRaw ? Number(contractServiceIdRaw) : NaN;
  if (!contractServiceIdRaw || Number.isNaN(contractServiceId)) {
    return { error: 'Contract service is required.' };
  }

  const mealTimeCode = (formData.get('meal_time_code') as string | null)?.trim();
  if (!mealTimeCode) {
    return { error: 'Meal time is required.' };
  }

  const countRaw = (formData.get('count') as string | null)?.trim();
  const count = countRaw ? Number(countRaw) : NaN;
  if (!countRaw || !Number.isInteger(count) || count < 1) {
    return { error: 'Count is required and must be a positive whole number.' };
  }

  const mealDate = (formData.get('meal_date') as string | null)?.trim();
  if (!mealDate) {
    return { error: 'Meal date is required.' };
  }

  const supabase = await createClient();
  const { companyId, staffTypeCode } = await lookupCompanyAndStaffTypeForPerson(supabase, personId);

  const { error } = await supabase
    .from('person_meal')
    .update({
      person_id: personId,
      contract_service_id: contractServiceId,
      meal_time_code: mealTimeCode,
      company_id: companyId,
      staff_type_code: staffTypeCode,
      count,
      meal_date: mealDate,
    })
    .eq('id', id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath('/meals');
  redirect('/meals');
}
```

- [ ] **Step 2: Write the edit route**

Create `src/app/(app)/meals/[id]/edit/page.tsx`:

```tsx
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { PersonMealForm, type PersonMeal } from '../../PersonMealForm';
import { updatePersonMeal } from '../../actions';

export default async function EditMealPage(props: PageProps<'/meals/[id]/edit'>) {
  const { id } = await props.params;
  const mealId = Number(id);

  if (Number.isNaN(mealId)) {
    notFound();
  }

  const supabase = await createClient();
  const { data: meal, error } = await supabase
    .from('person_meal')
    .select('id, person_id, contract_service_id, meal_time_code, count, meal_date, active')
    .eq('id', mealId)
    .maybeSingle();

  if (error) {
    return (
      <div className="px-6 py-8">
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          Couldn&apos;t load meal record: {error.message}
        </p>
      </div>
    );
  }

  if (!meal) {
    notFound();
  }

  const { data: personsData, error: personsError } = await supabase
    .from('person')
    .select('id, name')
    .order('name', { ascending: true });

  if (personsError) {
    return (
      <div className="px-6 py-8">
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          Couldn&apos;t load persons: {personsError.message}
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

  const { data: mealTimesData, error: mealTimesError } = await supabase
    .from('meal_time')
    .select('code, name')
    .order('name', { ascending: true });

  if (mealTimesError) {
    return (
      <div className="px-6 py-8">
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          Couldn&apos;t load meal times: {mealTimesError.message}
        </p>
      </div>
    );
  }

  const persons = personsData ?? [];
  const contractServices = contractServicesData ?? [];
  const mealTimes = mealTimesData ?? [];

  const updatePersonMealWithId = updatePersonMeal.bind(null, mealId);

  return (
    <div className="px-6 py-8">
      <p className="font-mono text-xs font-medium tracking-[0.2em] text-zinc-500 dark:text-zinc-400">
        PEOPLE
      </p>
      <h2 className="mt-1 text-2xl font-semibold text-zinc-950 dark:text-zinc-50">
        Edit meal
      </h2>
      <PersonMealForm
        meal={meal as PersonMeal}
        persons={persons}
        contractServices={contractServices}
        mealTimes={mealTimes}
        action={updatePersonMealWithId}
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

Navigate to `http://localhost:3000/meals`, click the row created in Task 3. Confirm the form loads pre-filled: Person/Contract Service/Meal Time dropdowns pre-selected, Count and Meal date correct. Change the Count and submit.

Expected: redirected to `/meals`, the row's count reflects the change. Also confirm visiting `/meals/999999/edit` (an id that doesn't exist) renders Next.js's 404 page, not a crash.

- [ ] **Step 5: Commit**

```bash
git add "src/app/(app)/meals/actions.ts" "src/app/(app)/meals/[id]/edit/page.tsx"
git commit -m "Add meal edit form and action"
```

---

### Task 5: Deactivate and reactivate

**Files:**
- Modify: `src/app/(app)/meals/actions.ts`
- Modify: `src/app/(app)/meals/[id]/edit/page.tsx`

**Interfaces:**
- Consumes: the `updatePersonMealWithId` `.bind(null, mealId)` pattern already established in Task 4's edit page.
- Produces: `deactivatePersonMeal(id: number): Promise<void>` and `reactivatePersonMeal(id: number): Promise<void>`, added to `actions.ts`. Nothing outside this task depends on these.

- [ ] **Step 1: Add the two actions**

In `src/app/(app)/meals/actions.ts`, add below `updatePersonMeal`:

```ts
export async function deactivatePersonMeal(id: number) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('person_meal')
    .update({ active: false })
    .eq('id', id)
    .select('id');

  if (error) {
    throw new Error(error.message);
  }
  if (!data || data.length === 0) {
    throw new Error('Meal record not found.');
  }

  revalidatePath('/meals');
  revalidatePath(`/meals/${id}/edit`);
}

export async function reactivatePersonMeal(id: number) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('person_meal')
    .update({ active: true })
    .eq('id', id)
    .select('id');

  if (error) {
    throw new Error(error.message);
  }
  if (!data || data.length === 0) {
    throw new Error('Meal record not found.');
  }

  revalidatePath('/meals');
  revalidatePath(`/meals/${id}/edit`);
}
```

**Critical constraint**: these must ONLY touch `active` — never `meal_date`, `count`, `company_id`, `staff_type_code`, `person_id`, `contract_service_id`, or `meal_time_code`.

- [ ] **Step 2: Add the button to the edit page**

In `src/app/(app)/meals/[id]/edit/page.tsx`, update the imports and the returned JSX:

```tsx
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { PersonMealForm, type PersonMeal } from '../../PersonMealForm';
import { updatePersonMeal, deactivatePersonMeal, reactivatePersonMeal } from '../../actions';
```

Replace the `updatePersonMealWithId` line and everything below it with:

```tsx
  const { active } = meal;
  const updatePersonMealWithId = updatePersonMeal.bind(null, mealId);
  const deactivatePersonMealWithId = deactivatePersonMeal.bind(null, mealId);
  const reactivatePersonMealWithId = reactivatePersonMeal.bind(null, mealId);

  return (
    <div className="px-6 py-8">
      <p className="font-mono text-xs font-medium tracking-[0.2em] text-zinc-500 dark:text-zinc-400">
        PEOPLE
      </p>
      <div className="mt-1 flex items-center justify-between">
        <h2 className="text-2xl font-semibold text-zinc-950 dark:text-zinc-50">
          Edit meal
        </h2>
        <form action={active ? deactivatePersonMealWithId : reactivatePersonMealWithId}>
          <button
            type="submit"
            className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-900"
          >
            {active ? 'Deactivate' : 'Reactivate'}
          </button>
        </form>
      </div>
      <PersonMealForm
        meal={meal as PersonMeal}
        persons={persons}
        contractServices={contractServices}
        mealTimes={mealTimes}
        action={updatePersonMealWithId}
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

On the meal record's edit page from Task 4, note its Count/Meal date and the derived `company_id`/`staff_type_code` (via the same `psql` join query from Task 3's verification). Click "Deactivate". Confirm the button submits, the page reloads, and the button now reads "Reactivate". Navigate to `/meals` and confirm the Status column shows "Inactive". Go back to the edit page, click "Reactivate", confirm the button reverts to "Deactivate" and `/meals` shows "Active" again — with meal date, count, and the derived `company_id`/`staff_type_code` completely unchanged throughout the whole cycle.

- [ ] **Step 5: Commit**

```bash
git add "src/app/(app)/meals/actions.ts" "src/app/(app)/meals/[id]/edit/page.tsx"
git commit -m "Add meal deactivate/reactivate actions"
```

---

## Self-Review Notes

- **Spec coverage:** required-field constraints + `active` column + grants/RLS + `meal_time` grant, all in Task 1's migration up front ✓. No new nav entry — confirmed `nav.ts` already has a "Meals" placeholder, no task touches `nav.ts`. List page with joined person/contract-service/meal-time, "PEOPLE" eyebrow ✓ (Task 2). `company_id`/`staff_type_code` never on the form, always derived server-side from the selected Person via one query returning both fields ✓ (Task 3's `lookupCompanyAndStaffTypeForPerson`, reused unchanged by Task 4's `updatePersonMeal`). No auto-fill/controlled-field logic — confirmed `PersonMealForm` uses only `defaultValue` fields, single `meal_date` (not a range). Deactivate/Reactivate flips `active` only, built correctly from the start ✓ (Task 5).
- **Placeholder scan:** none — every step has complete, runnable code.
- **Type consistency:** `PersonMeal` (id/person_id/contract_service_id/meal_time_code/count/meal_date) defined once in `PersonMealForm.tsx`, imported by the edit page (Task 4) — deliberately excludes `active`, same handling as every prior status field. `PersonOption`/`ContractServiceOption`/`MealTimeOption` defined once in `PersonMealForm.tsx`, used by both `new/page.tsx` and `[id]/edit/page.tsx`. `PersonMealFormState` defined once in `actions.ts`, imported by `PersonMealForm.tsx`. `createPersonMeal`'s signature `(prevState, formData)` and `updatePersonMeal`'s `(id, prevState, formData)` both match how `PersonMealForm`'s `action` prop is typed and how `.bind(null, id)` is used in the edit page — same shape as every prior feature. `deactivatePersonMeal`/`reactivatePersonMeal` take only `id`, matching the proven shape exactly. `lookupCompanyAndStaffTypeForPerson` is defined once in `actions.ts` and called identically by both `createPersonMeal` and `updatePersonMeal` — not duplicated.
