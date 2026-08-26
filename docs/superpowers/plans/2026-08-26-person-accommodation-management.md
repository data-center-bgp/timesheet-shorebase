# PersonAccomodation Management Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the eighth real CRUD feature on the ERD-derived schema — list, create, edit, and deactivate/reactivate `PersonAccomodation` records, each assigning a Person a room type/count/date-range accommodation billed against a ContractService.

**Architecture:** One migration (required-field constraints, the `active` column, grants/RLS), then the same Server Component + Server Action pattern proven seven times over. `company_id`/`staff_type_code` are never shown on the form — both are derived server-side from the selected Person, extending `ContractService`'s single-field derivation helper pattern to return two fields from one source row. Routes/labels use the correct "Accommodation" spelling (matching `nav.ts`'s existing entry); every underlying table/column reference keeps the ERD's `person_accomodation`/`accomodation` spelling. No new nav entry is needed. No client-side auto-fill interactivity is needed — every field is a plain `defaultValue` input.

**Tech Stack:** Next.js 16 App Router, React 19 (`useActionState`), `@supabase/ssr` server client, plain SQL migration applied via Supabase Studio's SQL editor.

## Global Constraints

- Required fields: Person (dropdown), Contract Service (dropdown), Room Type (dropdown), Count (number), Start date, End date. No optional fields.
- `company_id`/`staff_type_code` never appear on the form. Both `createPersonAccomodation` and `updatePersonAccomodation` look up the selected `person_id`'s current `company_id`/`staff_type_code` server-side (ONE query, both fields — they share a source row) and write both into the row.
- `active boolean not null default true` — same convention as every prior feature except `Period`. Deactivate/Reactivate flips `active` only, never `start_date`/`end_date`/`count`/`company_id`/`staff_type_code`/`person_id`/`contract_service_id`/`room_type_code` — built correctly from the start.
- No new uniqueness constraint — nothing in the ERD specifies one.
- Person/ContractService/Room Type dropdowns show all rows regardless of status — same convention as every prior feature.
- `nav.ts` already has an "Accommodation" entry at `/accommodation` in the People group — no nav changes needed. ALL routes/directories/display labels use "accommodation"/"Accommodation" (correct spelling); ALL Supabase table/column references use `person_accomodation` (the ERD's spelling, one `m`) — do not mix these up in either direction.
- `person` and `contract_service` currently have 0 rows each — verification tasks that need live data must seed one of each first (via `/persons/new` and `/contract-services/new`, which requires a `/contracts/new` and `/companies/new` row to exist first if not already present).
- No automated test suite — verification is `npm run lint`, a production build, and manual checks against the running dev server.
- Migrations are applied by pasting the SQL into Supabase Studio's SQL editor by the project owner, never via `npx supabase db push` — verify afterward with `psql`.

---

### Task 1: Migration — required fields, active column, grants/RLS

**Files:**
- Create: `supabase/migrations/20260826060000_person_accomodation.sql`

**Interfaces:**
- Consumes: nothing — new migration on top of `supabase/migrations/20260826050000_clear_person_test_row.sql`.
- Produces: `timesheet_shorebase.person_accomodation` gains required-field constraints on `person_id`/`room_type_code`/`contract_service_id`/`count`/`start_date`/`end_date`, and `active boolean not null default true`; `authenticated` can `select/insert/update`. Tasks 2–5 depend on this being live.

- [ ] **Step 1: Write the migration**

Create `supabase/migrations/20260826060000_person_accomodation.sql`:

```sql
-- Adds PersonAccomodation's schema requirements: required-field
-- constraints matching the fields this feature's form treats as
-- mandatory, and the active-column convention (see CLAUDE.md).
-- company_id and staff_type_code stay nullable - both are derived
-- automatically from the selected person rather than the user setting
-- them, extending the same denormalized-snapshot pattern used by
-- contract_service.company_id, but sourced from Person instead of
-- Contract and covering two fields instead of one.

begin;

alter table timesheet_shorebase.person_accomodation
  alter column person_id set not null;
alter table timesheet_shorebase.person_accomodation
  alter column room_type_code set not null;
alter table timesheet_shorebase.person_accomodation
  alter column contract_service_id set not null;
alter table timesheet_shorebase.person_accomodation
  alter column count set not null;
alter table timesheet_shorebase.person_accomodation
  alter column start_date set not null;
alter table timesheet_shorebase.person_accomodation
  alter column end_date set not null;

alter table timesheet_shorebase.person_accomodation
  add column active boolean not null default true;

grant select, insert, update on timesheet_shorebase.person_accomodation to authenticated;

alter table timesheet_shorebase.person_accomodation enable row level security;

create policy "authenticated users can read/write person accomodations"
  on timesheet_shorebase.person_accomodation
  for all
  to authenticated
  using (true)
  with check (true);

commit;
```

- [ ] **Step 2: Ask the project owner to apply the migration**

Paste the full contents of `supabase/migrations/20260826060000_person_accomodation.sql` into Supabase Studio's SQL editor and run it there. Wait for confirmation it ran without error before continuing to Step 3.

- [ ] **Step 3: Verify against the real database**

```bash
source <(grep '^DATABASE_URL=' .env.local | sed 's/^/export /')
psql "$DATABASE_URL" -c "\d timesheet_shorebase.person_accomodation"
psql "$DATABASE_URL" -c "select grantee, privilege_type from information_schema.role_table_grants where table_schema = 'timesheet_shorebase' and table_name = 'person_accomodation' and grantee = 'authenticated' order by privilege_type;"
psql "$DATABASE_URL" -c "select policyname, cmd, roles from pg_policies where schemaname = 'timesheet_shorebase' and tablename = 'person_accomodation';"
```

Expected:
- First query shows `person_id`/`room_type_code`/`contract_service_id`/`count`/`start_date`/`end_date`/`active` all `not null`, `active` defaulting `true`. `company_id`/`staff_type_code` remain nullable.
- Second query returns three rows for `authenticated`: `INSERT`, `SELECT`, `UPDATE`.
- Third query returns one row: `authenticated users can read/write person accomodations`, `cmd` = `ALL`, `roles` = `{authenticated}`.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260826060000_person_accomodation.sql
git commit -m "Add required fields, active column, and RLS for person_accomodation"
```

---

### Task 2: Accommodation list page

**Files:**
- Create: `src/app/(app)/accommodation/page.tsx`

**Interfaces:**
- Consumes: `createClient` from `@/lib/supabase/server`. Requires Task 1's migration to be live.
- Produces: the `PersonAccomodationRow` shape, declared in `page.tsx` only. No `nav.ts` changes — the "Accommodation" entry already exists.

- [ ] **Step 1: Write the list page**

Create `src/app/(app)/accommodation/page.tsx`:

```tsx
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';

type PersonAccomodationRow = {
  id: number;
  count: number;
  start_date: string;
  end_date: string;
  active: boolean;
  person: { name: string } | null;
  contract_service: { code: string } | null;
  room_type: { name: string } | null;
};

export default async function AccommodationPage() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('person_accomodation')
    .select('id, count, start_date, end_date, active, person(name), contract_service(code), room_type(name)')
    .order('start_date', { ascending: true });

  const accommodations = (data ?? []) as unknown as PersonAccomodationRow[];

  return (
    <div className="px-6 py-8">
      <div className="flex items-center justify-between">
        <div>
          <p className="font-mono text-xs font-medium tracking-[0.2em] text-zinc-500 dark:text-zinc-400">
            PEOPLE
          </p>
          <h2 className="mt-1 text-2xl font-semibold text-zinc-950 dark:text-zinc-50">
            Accommodation
          </h2>
        </div>
        <Link
          href="/accommodation/new"
          className="rounded-md bg-teal-700 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-teal-800 dark:bg-teal-600 dark:hover:bg-teal-500"
        >
          Add accommodation
        </Link>
      </div>

      {error && (
        <p role="alert" className="mt-4 text-sm text-red-600 dark:text-red-400">
          Couldn&apos;t load accommodation records: {error.message}
        </p>
      )}

      {!error && accommodations.length === 0 && (
        <p className="mt-4 max-w-prose text-zinc-600 dark:text-zinc-400">
          No accommodation records yet. Add your first one to get started.
        </p>
      )}

      {!error && accommodations.length > 0 && (
        <div className="mt-6 overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800">
          <table className="w-full text-sm">
            <thead className="border-b border-zinc-200 bg-zinc-50 text-left text-xs font-medium uppercase tracking-wide text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
              <tr>
                <th className="px-4 py-2">Person</th>
                <th className="px-4 py-2">Contract Service</th>
                <th className="px-4 py-2">Room Type</th>
                <th className="px-4 py-2">Count</th>
                <th className="px-4 py-2">Start date</th>
                <th className="px-4 py-2">End date</th>
                <th className="px-4 py-2">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {accommodations.map((accommodation) => {
                const { active } = accommodation;
                return (
                  <tr key={accommodation.id}>
                    <td className="px-4 py-2 font-medium text-zinc-900 dark:text-zinc-100">
                      <Link href={`/accommodation/${accommodation.id}/edit`} className="hover:underline">
                        {accommodation.person?.name ?? '—'}
                      </Link>
                    </td>
                    <td className="px-4 py-2 text-zinc-600 dark:text-zinc-400">
                      {accommodation.contract_service?.code ?? '—'}
                    </td>
                    <td className="px-4 py-2 text-zinc-600 dark:text-zinc-400">
                      {accommodation.room_type?.name ?? '—'}
                    </td>
                    <td className="px-4 py-2 text-zinc-600 dark:text-zinc-400">{accommodation.count}</td>
                    <td className="px-4 py-2 text-zinc-600 dark:text-zinc-400">{accommodation.start_date}</td>
                    <td className="px-4 py-2 text-zinc-600 dark:text-zinc-400">{accommodation.end_date}</td>
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

`person(name)`, `contract_service(code)`, and `room_type(name)` are all unaliased embeds — `person_accomodation` has exactly one FK to each of `person`, `contract_service`, and `room_type`, so PostgREST resolves them unambiguously by target table name. Do not add aliases or hints to any of these three. Eyebrow label is "PEOPLE", matching `Person`'s list page (this is the People nav group, not Master Data).

- [ ] **Step 2: Run lint and build**

```bash
npm run lint
npm run build
```

Expected: both succeed with no errors.

- [ ] **Step 3: Verify in the browser**

Confirm Task 1's migration is live. Navigate to `http://localhost:3000/accommodation`.

Expected: the sidebar's existing "Accommodation" item now goes to a real page — no longer "Coming soon". The page shows "PEOPLE / Accommodation", an "Add accommodation" button, and "No accommodation records yet. Add your first one to get started."

- [ ] **Step 4: Commit**

```bash
git add "src/app/(app)/accommodation/page.tsx"
git commit -m "Add accommodation list page"
```

---

### Task 3: Create accommodation record

**Files:**
- Create: `src/app/(app)/accommodation/actions.ts`
- Create: `src/app/(app)/accommodation/PersonAccomodationForm.tsx`
- Create: `src/app/(app)/accommodation/new/page.tsx`

**Interfaces:**
- Consumes: `createClient` from `@/lib/supabase/server`.
- Produces: `PersonAccomodationFormState = { error: string | null }`, `PersonAccomodation`, `PersonOption = { id: number; name: string }`, `ContractServiceOption = { id: number; code: string }`, `RoomTypeOption = { code: string; name: string }` (all exported from `PersonAccomodationForm.tsx`, `PersonAccomodation` imported by Task 4's edit page). `createPersonAccomodation(prevState: PersonAccomodationFormState, formData: FormData): Promise<PersonAccomodationFormState>` (exported from `actions.ts`). `PersonAccomodationForm({ accomodation?: PersonAccomodation; persons: PersonOption[]; contractServices: ContractServiceOption[]; roomTypes: RoomTypeOption[]; action: (prevState: PersonAccomodationFormState, formData: FormData) => Promise<PersonAccomodationFormState>; submitLabel: string })` (exported from `PersonAccomodationForm.tsx`, reused by Task 4).

- [ ] **Step 1: Write the Server Actions file**

Create `src/app/(app)/accommodation/actions.ts`:

```ts
'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

export type PersonAccomodationFormState = {
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

export async function createPersonAccomodation(
  _prevState: PersonAccomodationFormState,
  formData: FormData,
): Promise<PersonAccomodationFormState> {
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

  const roomTypeCode = (formData.get('room_type_code') as string | null)?.trim();
  if (!roomTypeCode) {
    return { error: 'Room type is required.' };
  }

  const countRaw = (formData.get('count') as string | null)?.trim();
  const count = countRaw ? Number(countRaw) : NaN;
  if (!countRaw || !Number.isInteger(count) || count < 1) {
    return { error: 'Count is required and must be a positive whole number.' };
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
  const { companyId, staffTypeCode } = await lookupCompanyAndStaffTypeForPerson(supabase, personId);

  const { error } = await supabase.from('person_accomodation').insert({
    person_id: personId,
    contract_service_id: contractServiceId,
    room_type_code: roomTypeCode,
    company_id: companyId,
    staff_type_code: staffTypeCode,
    count,
    start_date: startDate,
    end_date: endDate,
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath('/accommodation');
  redirect('/accommodation');
}
```

`lookupCompanyAndStaffTypeForPerson` extends `ContractService`'s single-field `lookupCompanyIdForContract` pattern to return two fields from one source row — both `company_id` and `staff_type_code` come from the same selected `Person`, so one query covers both instead of two separate lookups.

- [ ] **Step 2: Write the shared form component**

Create `src/app/(app)/accommodation/PersonAccomodationForm.tsx`:

```tsx
'use client';

import { useActionState } from 'react';
import type { PersonAccomodationFormState } from './actions';

export type PersonAccomodation = {
  id: number;
  person_id: number;
  contract_service_id: number;
  room_type_code: string;
  count: number;
  start_date: string;
  end_date: string;
};

export type PersonOption = {
  id: number;
  name: string;
};

export type ContractServiceOption = {
  id: number;
  code: string;
};

export type RoomTypeOption = {
  code: string;
  name: string;
};

const initialState: PersonAccomodationFormState = { error: null };

export function PersonAccomodationForm({
  accomodation,
  persons,
  contractServices,
  roomTypes,
  action,
  submitLabel,
}: {
  accomodation?: PersonAccomodation;
  persons: PersonOption[];
  contractServices: ContractServiceOption[];
  roomTypes: RoomTypeOption[];
  action: (prevState: PersonAccomodationFormState, formData: FormData) => Promise<PersonAccomodationFormState>;
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
          defaultValue={accomodation?.person_id ?? ''}
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
          defaultValue={accomodation?.contract_service_id ?? ''}
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
        <label htmlFor="room_type_code" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Room type
        </label>
        <select
          id="room_type_code"
          name="room_type_code"
          required
          defaultValue={accomodation?.room_type_code ?? ''}
          className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-950 focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-600/40 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
        >
          <option value="" disabled>
            Select a room type
          </option>
          {roomTypes.map((roomType) => (
            <option key={roomType.code} value={roomType.code}>
              {roomType.name}
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
          defaultValue={accomodation?.count}
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
            defaultValue={accomodation?.start_date}
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
            defaultValue={accomodation?.end_date}
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

No controlled fields, no `useState` — every field is a plain `defaultValue`, same as `Period`/`Subcontractors`.

- [ ] **Step 3: Write the new-accommodation route**

Create `src/app/(app)/accommodation/new/page.tsx`:

```tsx
import { PersonAccomodationForm } from '../PersonAccomodationForm';
import { createPersonAccomodation } from '../actions';
import { createClient } from '@/lib/supabase/server';

export default async function NewAccommodationPage() {
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

  const { data: roomTypesData, error: roomTypesError } = await supabase
    .from('room_type')
    .select('code, name')
    .order('name', { ascending: true });

  if (roomTypesError) {
    return (
      <div className="px-6 py-8">
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          Couldn&apos;t load room types: {roomTypesError.message}
        </p>
      </div>
    );
  }

  const persons = personsData ?? [];
  const contractServices = contractServicesData ?? [];
  const roomTypes = roomTypesData ?? [];

  return (
    <div className="px-6 py-8">
      <p className="font-mono text-xs font-medium tracking-[0.2em] text-zinc-500 dark:text-zinc-400">
        PEOPLE
      </p>
      <h2 className="mt-1 text-2xl font-semibold text-zinc-950 dark:text-zinc-50">
        Add accommodation
      </h2>
      <PersonAccomodationForm
        persons={persons}
        contractServices={contractServices}
        roomTypes={roomTypes}
        action={createPersonAccomodation}
        submitLabel="Create accommodation"
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

With the dev server running (and Task 1's migration confirmed live), check whether at least one `person` and one `contract_service` row exist: `psql "$DATABASE_URL" -c "select count(*) from timesheet_shorebase.person;" -c "select count(*) from timesheet_shorebase.contract_service;"`. If either is 0, seed one via the app itself first (`/persons/new`, and if needed `/companies/new` → `/contracts/new` → `/contract-services/new`, in that dependency order) — note any rows you create for the final reviewer.

Navigate to `http://localhost:3000/accommodation/new`, fill in the required fields, and submit.

Expected: redirected to `/accommodation`, the new row appears with the correct person name, contract service code, and room type. Verify `company_id`/`staff_type_code` were correctly derived (not shown in the UI): `psql "$DATABASE_URL" -c "select pa.id, pa.company_id, pa.staff_type_code, p.company_id as person_company_id, p.staff_type_code as person_staff_type_code from timesheet_shorebase.person_accomodation pa join timesheet_shorebase.person p on p.id = pa.person_id;"` — both pairs must match. Then test server-side validation: go back to `/accommodation/new`, enter `0` for Count with everything else filled in — confirm the inline `{ error: 'Count is required and must be a positive whole number.' }` message renders and the page does not redirect.

- [ ] **Step 6: Commit**

```bash
git add "src/app/(app)/accommodation/actions.ts" "src/app/(app)/accommodation/PersonAccomodationForm.tsx" "src/app/(app)/accommodation/new/page.tsx"
git commit -m "Add accommodation creation form and action"
```

---

### Task 4: Edit accommodation record

**Files:**
- Modify: `src/app/(app)/accommodation/actions.ts`
- Create: `src/app/(app)/accommodation/[id]/edit/page.tsx`

**Interfaces:**
- Consumes: `PersonAccomodationForm`, `PersonAccomodation`, `PersonOption`, `ContractServiceOption`, `RoomTypeOption` from `../../PersonAccomodationForm`; `PersonAccomodationFormState` from `../../actions`.
- Produces: `updatePersonAccomodation(id: number, prevState: PersonAccomodationFormState, formData: FormData): Promise<PersonAccomodationFormState>`, added to `actions.ts` alongside `createPersonAccomodation`. Task 5 adds `deactivatePersonAccomodation`/`reactivatePersonAccomodation` to this same file and adds a button to this same edit page.

- [ ] **Step 1: Add `updatePersonAccomodation` to the actions file**

In `src/app/(app)/accommodation/actions.ts`, add below `createPersonAccomodation`:

```ts
export async function updatePersonAccomodation(
  id: number,
  _prevState: PersonAccomodationFormState,
  formData: FormData,
): Promise<PersonAccomodationFormState> {
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

  const roomTypeCode = (formData.get('room_type_code') as string | null)?.trim();
  if (!roomTypeCode) {
    return { error: 'Room type is required.' };
  }

  const countRaw = (formData.get('count') as string | null)?.trim();
  const count = countRaw ? Number(countRaw) : NaN;
  if (!countRaw || !Number.isInteger(count) || count < 1) {
    return { error: 'Count is required and must be a positive whole number.' };
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
  const { companyId, staffTypeCode } = await lookupCompanyAndStaffTypeForPerson(supabase, personId);

  const { error } = await supabase
    .from('person_accomodation')
    .update({
      person_id: personId,
      contract_service_id: contractServiceId,
      room_type_code: roomTypeCode,
      company_id: companyId,
      staff_type_code: staffTypeCode,
      count,
      start_date: startDate,
      end_date: endDate,
    })
    .eq('id', id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath('/accommodation');
  redirect('/accommodation');
}
```

This re-derives `company_id`/`staff_type_code` from whichever person is currently selected on save — if the person is changed during an edit, both fields are re-snapshotted to match, never left stale.

- [ ] **Step 2: Write the edit route**

Create `src/app/(app)/accommodation/[id]/edit/page.tsx`:

```tsx
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { PersonAccomodationForm, type PersonAccomodation } from '../../PersonAccomodationForm';
import { updatePersonAccomodation } from '../../actions';

export default async function EditAccommodationPage(props: PageProps<'/accommodation/[id]/edit'>) {
  const { id } = await props.params;
  const accomodationId = Number(id);

  if (Number.isNaN(accomodationId)) {
    notFound();
  }

  const supabase = await createClient();
  const { data: accomodation, error } = await supabase
    .from('person_accomodation')
    .select('id, person_id, contract_service_id, room_type_code, count, start_date, end_date, active')
    .eq('id', accomodationId)
    .maybeSingle();

  if (error) {
    return (
      <div className="px-6 py-8">
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          Couldn&apos;t load accommodation record: {error.message}
        </p>
      </div>
    );
  }

  if (!accomodation) {
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

  const { data: roomTypesData, error: roomTypesError } = await supabase
    .from('room_type')
    .select('code, name')
    .order('name', { ascending: true });

  if (roomTypesError) {
    return (
      <div className="px-6 py-8">
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          Couldn&apos;t load room types: {roomTypesError.message}
        </p>
      </div>
    );
  }

  const persons = personsData ?? [];
  const contractServices = contractServicesData ?? [];
  const roomTypes = roomTypesData ?? [];

  const updatePersonAccomodationWithId = updatePersonAccomodation.bind(null, accomodationId);

  return (
    <div className="px-6 py-8">
      <p className="font-mono text-xs font-medium tracking-[0.2em] text-zinc-500 dark:text-zinc-400">
        PEOPLE
      </p>
      <h2 className="mt-1 text-2xl font-semibold text-zinc-950 dark:text-zinc-50">
        Edit accommodation
      </h2>
      <PersonAccomodationForm
        accomodation={accomodation as PersonAccomodation}
        persons={persons}
        contractServices={contractServices}
        roomTypes={roomTypes}
        action={updatePersonAccomodationWithId}
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

Navigate to `http://localhost:3000/accommodation`, click the row created in Task 3. Confirm the form loads pre-filled: Person/Contract Service/Room Type dropdowns pre-selected, Count and both dates correct. Change the Count and submit.

Expected: redirected to `/accommodation`, the row's count reflects the change. Also confirm visiting `/accommodation/999999/edit` (an id that doesn't exist) renders Next.js's 404 page, not a crash.

- [ ] **Step 5: Commit**

```bash
git add "src/app/(app)/accommodation/actions.ts" "src/app/(app)/accommodation/[id]/edit/page.tsx"
git commit -m "Add accommodation edit form and action"
```

---

### Task 5: Deactivate and reactivate

**Files:**
- Modify: `src/app/(app)/accommodation/actions.ts`
- Modify: `src/app/(app)/accommodation/[id]/edit/page.tsx`

**Interfaces:**
- Consumes: the `updatePersonAccomodationWithId` `.bind(null, accomodationId)` pattern already established in Task 4's edit page.
- Produces: `deactivatePersonAccomodation(id: number): Promise<void>` and `reactivatePersonAccomodation(id: number): Promise<void>`, added to `actions.ts`. Nothing outside this task depends on these.

- [ ] **Step 1: Add the two actions**

In `src/app/(app)/accommodation/actions.ts`, add below `updatePersonAccomodation`:

```ts
export async function deactivatePersonAccomodation(id: number) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('person_accomodation')
    .update({ active: false })
    .eq('id', id)
    .select('id');

  if (error) {
    throw new Error(error.message);
  }
  if (!data || data.length === 0) {
    throw new Error('Accommodation record not found.');
  }

  revalidatePath('/accommodation');
  revalidatePath(`/accommodation/${id}/edit`);
}

export async function reactivatePersonAccomodation(id: number) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('person_accomodation')
    .update({ active: true })
    .eq('id', id)
    .select('id');

  if (error) {
    throw new Error(error.message);
  }
  if (!data || data.length === 0) {
    throw new Error('Accommodation record not found.');
  }

  revalidatePath('/accommodation');
  revalidatePath(`/accommodation/${id}/edit`);
}
```

- [ ] **Step 2: Add the button to the edit page**

In `src/app/(app)/accommodation/[id]/edit/page.tsx`, update the imports and the returned JSX:

```tsx
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { PersonAccomodationForm, type PersonAccomodation } from '../../PersonAccomodationForm';
import { updatePersonAccomodation, deactivatePersonAccomodation, reactivatePersonAccomodation } from '../../actions';
```

Replace the `updatePersonAccomodationWithId` line and everything below it with:

```tsx
  const { active } = accomodation;
  const updatePersonAccomodationWithId = updatePersonAccomodation.bind(null, accomodationId);
  const deactivatePersonAccomodationWithId = deactivatePersonAccomodation.bind(null, accomodationId);
  const reactivatePersonAccomodationWithId = reactivatePersonAccomodation.bind(null, accomodationId);

  return (
    <div className="px-6 py-8">
      <p className="font-mono text-xs font-medium tracking-[0.2em] text-zinc-500 dark:text-zinc-400">
        PEOPLE
      </p>
      <div className="mt-1 flex items-center justify-between">
        <h2 className="text-2xl font-semibold text-zinc-950 dark:text-zinc-50">
          Edit accommodation
        </h2>
        <form action={active ? deactivatePersonAccomodationWithId : reactivatePersonAccomodationWithId}>
          <button
            type="submit"
            className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-900"
          >
            {active ? 'Deactivate' : 'Reactivate'}
          </button>
        </form>
      </div>
      <PersonAccomodationForm
        accomodation={accomodation as PersonAccomodation}
        persons={persons}
        contractServices={contractServices}
        roomTypes={roomTypes}
        action={updatePersonAccomodationWithId}
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

On the accommodation record's edit page from Task 4, note its Count/Start date/End date and the derived `company_id`/`staff_type_code` (via the same `psql` join query from Task 3's verification). Click "Deactivate". Confirm the button submits, the page reloads, and the button now reads "Reactivate". Navigate to `/accommodation` and confirm the Status column shows "Inactive". Go back to the edit page, click "Reactivate", confirm the button reverts to "Deactivate" and `/accommodation` shows "Active" again — with dates, count, and the derived `company_id`/`staff_type_code` completely unchanged throughout the whole cycle.

- [ ] **Step 5: Commit**

```bash
git add "src/app/(app)/accommodation/actions.ts" "src/app/(app)/accommodation/[id]/edit/page.tsx"
git commit -m "Add accommodation deactivate/reactivate actions"
```

---

## Self-Review Notes

- **Spec coverage:** required-field constraints + `active` column + grants/RLS ✓ (Task 1). No new nav entry — confirmed `nav.ts` already has an "Accommodation" placeholder, no task touches `nav.ts`. List page with joined person/contract-service/room-type, "PEOPLE" eyebrow ✓ (Task 2). `company_id`/`staff_type_code` never on the form, always derived server-side from the selected Person via one query returning both fields ✓ (Task 3's `lookupCompanyAndStaffTypeForPerson`, reused unchanged by Task 4's `updatePersonAccomodation`). No auto-fill/controlled-field logic — confirmed `PersonAccomodationForm` uses only `defaultValue` fields. Deactivate/Reactivate flips `active` only, built correctly from the start ✓ (Task 5). Route/label spelling is "accommodation"/"Accommodation" throughout; table/column spelling is `person_accomodation`/`accomodation` throughout — confirmed no cross-contamination in either direction across all 5 tasks' code.
- **Placeholder scan:** none — every step has complete, runnable code.
- **Type consistency:** `PersonAccomodation` (id/person_id/contract_service_id/room_type_code/count/start_date/end_date) defined once in `PersonAccomodationForm.tsx`, imported by the edit page (Task 4) — deliberately excludes `active`, handled the same way every prior status field was: destructured from the raw fetched row in the edit page, not part of the form's typed prop shape. `PersonOption`/`ContractServiceOption`/`RoomTypeOption` defined once in `PersonAccomodationForm.tsx`, used by both `new/page.tsx` and `[id]/edit/page.tsx`. `PersonAccomodationFormState` defined once in `actions.ts`, imported by `PersonAccomodationForm.tsx`. `createPersonAccomodation`'s signature `(prevState, formData)` and `updatePersonAccomodation`'s `(id, prevState, formData)` both match how `PersonAccomodationForm`'s `action` prop is typed and how `.bind(null, id)` is used in the edit page — same shape as every prior feature. `deactivatePersonAccomodation`/`reactivatePersonAccomodation` take only `id`, matching the proven shape exactly. `lookupCompanyAndStaffTypeForPerson` is defined once in `actions.ts` and called identically by both `createPersonAccomodation` and `updatePersonAccomodation` — not duplicated.
