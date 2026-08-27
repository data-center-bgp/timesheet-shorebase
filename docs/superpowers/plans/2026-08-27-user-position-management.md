# UserPosition Management Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the thirteenth real CRUD area on the ERD-derived schema — list, create, edit, and deactivate/reactivate `UserPosition` records, each assigning a real `app_user` account to a `JobPosition` over a date range.

**Architecture:** One migration (required fields, `active` column, grants/RLS), then the same Server Component + Server Action pattern proven many times over. `user_id`/`job_position_id` are both independent required dropdowns, written straight from form input — same shape as `Subcontractors`' `contract_id`/`company_id`, no derivation helper. The User dropdown/list-column displays `app_user.name`, falling back to `email` when `name` is null (real accounts can legitimately have a null name — see `Person`/`Users` features). New "User Positions" nav entry in the People group.

**Tech Stack:** Next.js 16 App Router, React 19 (`useActionState`), `@supabase/ssr` server client, plain SQL migration applied via Supabase Studio's SQL editor.

## Global Constraints

- Required fields: User (dropdown), Job Position (dropdown), Start date, End date. No optional fields.
- `user_id`/`job_position_id` are written directly from `formData` — no derivation helper anywhere in this feature's `actions.ts`, same as `Subcontractors`.
- `active boolean not null default true` — Deactivate/Reactivate flips `active` only, never `user_id`/`job_position_id`/`start_date`/`end_date`.
- No new uniqueness constraint — nothing in the ERD specifies one.
- User and Job Position dropdowns show all rows regardless of status — same convention as every prior feature.
- `user_id` is a UUID string (not a number) — same type as `Users`' `id`. The dropdown's `<option value={user.id}>` and the server action's parsing must treat it as a string, never `Number(...)`'d.
- Display label for a user: `user.name ?? user.email` — real accounts can have a null `name` (the `handle_new_auth_user` trigger doesn't always get one from signup metadata).
- `nav.ts` has no existing placeholder for this — add a new entry to the People group, after `Users`: `{ label: 'User Positions', icon: <pick an unused lucide-react icon>, href: '/user-positions' }`.
- No automated test suite — verification is `npm run lint`, a production build, and manual checks against the running dev server.
- Migrations are applied by pasting the SQL into Supabase Studio's SQL editor by the project owner, never via `npx supabase db push` — verify afterward with `psql`.

---

### Task 1: Migration + nav.ts — user_position

**Files:**
- Create: `supabase/migrations/20260827020000_user_position.sql`
- Modify: `src/components/app-shell/nav.ts`

- [ ] **Step 1: Write the migration**

Create `supabase/migrations/20260827020000_user_position.sql`:

```sql
-- Adds UserPosition's schema requirements: required-field constraints
-- matching the fields this feature's form treats as mandatory, and the
-- active-column convention (see CLAUDE.md). user_id and job_position_id
-- are both independent required fields - user_id is the assigned
-- account, job_position_id is the position they're assigned to. No
-- derivation from anywhere.

begin;

alter table timesheet_shorebase.user_position
  alter column user_id set not null;
alter table timesheet_shorebase.user_position
  alter column job_position_id set not null;
alter table timesheet_shorebase.user_position
  alter column start_date set not null;
alter table timesheet_shorebase.user_position
  alter column end_date set not null;

alter table timesheet_shorebase.user_position
  add column active boolean not null default true;

grant select, insert, update on timesheet_shorebase.user_position to authenticated;

alter table timesheet_shorebase.user_position enable row level security;

create policy "authenticated users can read/write user positions"
  on timesheet_shorebase.user_position
  for all
  to authenticated
  using (true)
  with check (true);

commit;
```

- [ ] **Step 2: Ask the project owner to apply the migration**

Paste the full contents into Supabase Studio's SQL editor and run it. Wait for confirmation before continuing.

- [ ] **Step 3: Verify against the real database**

```bash
source <(grep '^DATABASE_URL=' .env.local | sed 's/^/export /')
psql "$DATABASE_URL" -c "\d timesheet_shorebase.user_position"
psql "$DATABASE_URL" -c "select grantee, privilege_type from information_schema.role_table_grants where table_schema = 'timesheet_shorebase' and table_name = 'user_position' and grantee = 'authenticated' order by privilege_type;"
psql "$DATABASE_URL" -c "select policyname, cmd, roles from pg_policies where schemaname = 'timesheet_shorebase' and tablename = 'user_position';"
```

Expected: `user_id`/`job_position_id`/`start_date`/`end_date`/`active` all `not null`, `active` defaulting `true`. Three grants (`INSERT`/`SELECT`/`UPDATE`) for `authenticated`. One RLS policy, `cmd = ALL`, `roles = {authenticated}`.

- [ ] **Step 4: Update the nav**

In `src/components/app-shell/nav.ts`, add ONE new icon to the `lucide-react` import — pick something distinct from every icon already used in this file (check the existing import list first) that reasonably represents "a person in a role/seat" (e.g. `UserCheck`, `IdCardLanyard`, or similar — whatever lucide-react actually exports; verify the name exists in the installed `lucide-react` version before using it). Keep the import list alphabetically sorted.

In the People group, append one entry after `Users`:

```ts
{ label: 'User Positions', icon: <ChosenIcon>, href: '/user-positions' },
```

- [ ] **Step 5: Run lint and build**

```bash
npm run lint
npm run build
```

- [ ] **Step 6: Verify in the browser**

Navigate to `http://localhost:3000`. Confirm the People group now shows "User Positions" after "Users" (still "Coming soon").

- [ ] **Step 7: Commit**

```bash
git add supabase/migrations/20260827020000_user_position.sql "src/components/app-shell/nav.ts"
git commit -m "Add required fields, active column, RLS for user_position, and new People nav entry"
```

---

### Task 2: User Positions list page

**Files:**
- Create: `src/app/(app)/user-positions/page.tsx`

**Interfaces:**
- Consumes: `createClient` from `@/lib/supabase/server`. Requires Task 1's migration to be live.
- Produces: the `UserPositionRow` shape, declared in `page.tsx` only.

- [ ] **Step 1: Write the list page**

Create `src/app/(app)/user-positions/page.tsx`:

```tsx
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';

type UserPositionRow = {
  id: number;
  active: boolean;
  start_date: string;
  end_date: string;
  app_user: { name: string | null; email: string | null } | null;
  job_position: { name: string } | null;
};

export default async function UserPositionsPage() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('user_position')
    .select('id, active, start_date, end_date, app_user(name, email), job_position(name)')
    .order('start_date', { ascending: true });

  const userPositions = (data ?? []) as unknown as UserPositionRow[];

  return (
    <div className="px-6 py-8">
      <div className="flex items-center justify-between">
        <div>
          <p className="font-mono text-xs font-medium tracking-[0.2em] text-zinc-500 dark:text-zinc-400">
            PEOPLE
          </p>
          <h2 className="mt-1 text-2xl font-semibold text-zinc-950 dark:text-zinc-50">
            User Positions
          </h2>
        </div>
        <Link
          href="/user-positions/new"
          className="rounded-md bg-teal-700 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-teal-800 dark:bg-teal-600 dark:hover:bg-teal-500"
        >
          Add user position
        </Link>
      </div>

      {error && (
        <p role="alert" className="mt-4 text-sm text-red-600 dark:text-red-400">
          Couldn&apos;t load user positions: {error.message}
        </p>
      )}

      {!error && userPositions.length === 0 && (
        <p className="mt-4 max-w-prose text-zinc-600 dark:text-zinc-400">
          No user positions yet. Add your first one to get started.
        </p>
      )}

      {!error && userPositions.length > 0 && (
        <div className="mt-6 overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800">
          <table className="w-full text-sm">
            <thead className="border-b border-zinc-200 bg-zinc-50 text-left text-xs font-medium uppercase tracking-wide text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
              <tr>
                <th className="px-4 py-2">User</th>
                <th className="px-4 py-2">Job Position</th>
                <th className="px-4 py-2">Start date</th>
                <th className="px-4 py-2">End date</th>
                <th className="px-4 py-2">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {userPositions.map((userPosition) => {
                const { active } = userPosition;
                return (
                  <tr key={userPosition.id}>
                    <td className="px-4 py-2 font-medium text-zinc-900 dark:text-zinc-100">
                      <Link href={`/user-positions/${userPosition.id}/edit`} className="hover:underline">
                        {userPosition.app_user?.name ?? userPosition.app_user?.email ?? '—'}
                      </Link>
                    </td>
                    <td className="px-4 py-2 text-zinc-600 dark:text-zinc-400">
                      {userPosition.job_position?.name ?? '—'}
                    </td>
                    <td className="px-4 py-2 text-zinc-600 dark:text-zinc-400">{userPosition.start_date}</td>
                    <td className="px-4 py-2 text-zinc-600 dark:text-zinc-400">{userPosition.end_date}</td>
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

`app_user(name, email)` and `job_position(name)` are unaliased embeds — `user_position` has exactly one FK to each. Eyebrow label is "PEOPLE".

- [ ] **Step 2: Run lint and build**

```bash
npm run lint
npm run build
```

- [ ] **Step 3: Verify in the browser**

Navigate to `http://localhost:3000/user-positions`. Expected: "PEOPLE / User Positions", "Add user position" button, empty-state message.

- [ ] **Step 4: Commit**

```bash
git add "src/app/(app)/user-positions/page.tsx"
git commit -m "Add user positions list page"
```

---

### Task 3: Create user position

**Files:**
- Create: `src/app/(app)/user-positions/actions.ts`
- Create: `src/app/(app)/user-positions/UserPositionForm.tsx`
- Create: `src/app/(app)/user-positions/new/page.tsx`

**Interfaces:**
- Consumes: `createClient` from `@/lib/supabase/server`.
- Produces: `UserPositionFormState = { error: string | null }`, `UserPosition`, `UserOption = { id: string; name: string | null; email: string | null }`, `JobPositionOption = { id: number; name: string }` (all exported from `UserPositionForm.tsx`). `createUserPosition(prevState, formData): Promise<UserPositionFormState>` exported from `actions.ts`.

- [ ] **Step 1: Write the Server Actions file**

Create `src/app/(app)/user-positions/actions.ts`:

```ts
'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

export type UserPositionFormState = {
  error: string | null;
};

export async function createUserPosition(
  _prevState: UserPositionFormState,
  formData: FormData,
): Promise<UserPositionFormState> {
  const userId = (formData.get('user_id') as string | null)?.trim();
  if (!userId) {
    return { error: 'User is required.' };
  }

  const jobPositionIdRaw = formData.get('job_position_id') as string | null;
  const jobPositionId = jobPositionIdRaw ? Number(jobPositionIdRaw) : NaN;
  if (!jobPositionIdRaw || Number.isNaN(jobPositionId)) {
    return { error: 'Job position is required.' };
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

  const { error } = await supabase.from('user_position').insert({
    user_id: userId,
    job_position_id: jobPositionId,
    start_date: startDate,
    end_date: endDate,
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath('/user-positions');
  redirect('/user-positions');
}
```

`user_id` stays a plain trimmed string — never `Number(...)`'d, since it's a UUID.

- [ ] **Step 2: Write the shared form component**

Create `src/app/(app)/user-positions/UserPositionForm.tsx`:

```tsx
'use client';

import { useActionState } from 'react';
import type { UserPositionFormState } from './actions';

export type UserPosition = {
  id: number;
  user_id: string;
  job_position_id: number;
  start_date: string;
  end_date: string;
};

export type UserOption = {
  id: string;
  name: string | null;
  email: string | null;
};

export type JobPositionOption = {
  id: number;
  name: string;
};

const initialState: UserPositionFormState = { error: null };

export function UserPositionForm({
  userPosition,
  users,
  jobPositions,
  action,
  submitLabel,
}: {
  userPosition?: UserPosition;
  users: UserOption[];
  jobPositions: JobPositionOption[];
  action: (prevState: UserPositionFormState, formData: FormData) => Promise<UserPositionFormState>;
  submitLabel: string;
}) {
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="mt-6 max-w-md space-y-4">
      <div className="space-y-1">
        <label htmlFor="user_id" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          User
        </label>
        <select
          id="user_id"
          name="user_id"
          required
          defaultValue={userPosition?.user_id ?? ''}
          className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-950 focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-600/40 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
        >
          <option value="" disabled>
            Select a user
          </option>
          {users.map((user) => (
            <option key={user.id} value={user.id}>
              {user.name ?? user.email ?? user.id}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-1">
        <label htmlFor="job_position_id" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Job position
        </label>
        <select
          id="job_position_id"
          name="job_position_id"
          required
          defaultValue={userPosition?.job_position_id ?? ''}
          className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-950 focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-600/40 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
        >
          <option value="" disabled>
            Select a job position
          </option>
          {jobPositions.map((jobPosition) => (
            <option key={jobPosition.id} value={jobPosition.id}>
              {jobPosition.name}
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
            defaultValue={userPosition?.start_date}
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
            defaultValue={userPosition?.end_date}
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

No controlled fields, no `useState` — both dropdowns are fully independent, plain `defaultValue` selects. The User select's option label falls back through `name ?? email ?? id` — the id fallback is a last resort in case an account somehow has neither (shouldn't happen in practice given `email` comes straight from `auth.users`, but keeps the label non-empty regardless).

- [ ] **Step 3: Write the new-user-position route**

Create `src/app/(app)/user-positions/new/page.tsx`:

```tsx
import { UserPositionForm } from '../UserPositionForm';
import { createUserPosition } from '../actions';
import { createClient } from '@/lib/supabase/server';

export default async function NewUserPositionPage() {
  const supabase = await createClient();

  const { data: usersData, error: usersError } = await supabase
    .from('app_user')
    .select('id, name, email')
    .order('email', { ascending: true });

  if (usersError) {
    return (
      <div className="px-6 py-8">
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          Couldn&apos;t load users: {usersError.message}
        </p>
      </div>
    );
  }

  const { data: jobPositionsData, error: jobPositionsError } = await supabase
    .from('job_position')
    .select('id, name')
    .order('name', { ascending: true });

  if (jobPositionsError) {
    return (
      <div className="px-6 py-8">
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          Couldn&apos;t load job positions: {jobPositionsError.message}
        </p>
      </div>
    );
  }

  const users = usersData ?? [];
  const jobPositions = jobPositionsData ?? [];

  return (
    <div className="px-6 py-8">
      <p className="font-mono text-xs font-medium tracking-[0.2em] text-zinc-500 dark:text-zinc-400">
        PEOPLE
      </p>
      <h2 className="mt-1 text-2xl font-semibold text-zinc-950 dark:text-zinc-50">
        Add user position
      </h2>
      <UserPositionForm
        users={users}
        jobPositions={jobPositions}
        action={createUserPosition}
        submitLabel="Create user position"
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

- [ ] **Step 5: Verify in the browser**

With the dev server running (and Task 1's migration confirmed live), check whether at least one `job_position` row exists: `psql "$DATABASE_URL" -c "select count(*) from timesheet_shorebase.job_position;"`. If it's 0, seed one via the app first (`/companies/new` → `/job-titles/new` → `/job-positions/new`, skipping any step whose table already has a usable row — a Company likely already exists from prior feature verification). There are 2 real `app_user` rows already, no seeding needed there.

Navigate to `http://localhost:3000/user-positions/new`, fill in the required fields, submit.

Expected: redirected to `/user-positions`, the new row appears with the correct user display name/email and job position name. Then test required-field validation: go back to `/user-positions/new`, submit with the User left unselected — confirm the inline `{ error: 'User is required.' }` message renders and the page does not redirect.

- [ ] **Step 6: Commit**

```bash
git add "src/app/(app)/user-positions/actions.ts" "src/app/(app)/user-positions/UserPositionForm.tsx" "src/app/(app)/user-positions/new/page.tsx"
git commit -m "Add user position creation form and action"
```

---

### Task 4: Edit user position

**Files:**
- Modify: `src/app/(app)/user-positions/actions.ts`
- Create: `src/app/(app)/user-positions/[id]/edit/page.tsx`

**Interfaces:**
- Consumes: `UserPositionForm`, `UserPosition`, `UserOption`, `JobPositionOption` from `../../UserPositionForm`; `UserPositionFormState` from `../../actions`.
- Produces: `updateUserPosition(id: number, prevState, formData): Promise<UserPositionFormState>`, added to `actions.ts` alongside `createUserPosition`. Task 5 adds `deactivateUserPosition`/`reactivateUserPosition` to this same file and a button to this same edit page.

- [ ] **Step 1: Add `updateUserPosition` to the actions file**

In `src/app/(app)/user-positions/actions.ts`, add below `createUserPosition`:

```ts
export async function updateUserPosition(
  id: number,
  _prevState: UserPositionFormState,
  formData: FormData,
): Promise<UserPositionFormState> {
  const userId = (formData.get('user_id') as string | null)?.trim();
  if (!userId) {
    return { error: 'User is required.' };
  }

  const jobPositionIdRaw = formData.get('job_position_id') as string | null;
  const jobPositionId = jobPositionIdRaw ? Number(jobPositionIdRaw) : NaN;
  if (!jobPositionIdRaw || Number.isNaN(jobPositionId)) {
    return { error: 'Job position is required.' };
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
    .from('user_position')
    .update({
      user_id: userId,
      job_position_id: jobPositionId,
      start_date: startDate,
      end_date: endDate,
    })
    .eq('id', id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath('/user-positions');
  redirect('/user-positions');
}
```

- [ ] **Step 2: Write the edit route**

Create `src/app/(app)/user-positions/[id]/edit/page.tsx`:

```tsx
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { UserPositionForm, type UserPosition } from '../../UserPositionForm';
import { updateUserPosition } from '../../actions';

export default async function EditUserPositionPage(props: PageProps<'/user-positions/[id]/edit'>) {
  const { id } = await props.params;
  const userPositionId = Number(id);

  if (Number.isNaN(userPositionId)) {
    notFound();
  }

  const supabase = await createClient();
  const { data: userPosition, error } = await supabase
    .from('user_position')
    .select('id, user_id, job_position_id, start_date, end_date, active')
    .eq('id', userPositionId)
    .maybeSingle();

  if (error) {
    return (
      <div className="px-6 py-8">
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          Couldn&apos;t load user position: {error.message}
        </p>
      </div>
    );
  }

  if (!userPosition) {
    notFound();
  }

  const { data: usersData, error: usersError } = await supabase
    .from('app_user')
    .select('id, name, email')
    .order('email', { ascending: true });

  if (usersError) {
    return (
      <div className="px-6 py-8">
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          Couldn&apos;t load users: {usersError.message}
        </p>
      </div>
    );
  }

  const { data: jobPositionsData, error: jobPositionsError } = await supabase
    .from('job_position')
    .select('id, name')
    .order('name', { ascending: true });

  if (jobPositionsError) {
    return (
      <div className="px-6 py-8">
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          Couldn&apos;t load job positions: {jobPositionsError.message}
        </p>
      </div>
    );
  }

  const users = usersData ?? [];
  const jobPositions = jobPositionsData ?? [];

  const updateUserPositionWithId = updateUserPosition.bind(null, userPositionId);

  return (
    <div className="px-6 py-8">
      <p className="font-mono text-xs font-medium tracking-[0.2em] text-zinc-500 dark:text-zinc-400">
        PEOPLE
      </p>
      <h2 className="mt-1 text-2xl font-semibold text-zinc-950 dark:text-zinc-50">
        Edit user position
      </h2>
      <UserPositionForm
        userPosition={userPosition as UserPosition}
        users={users}
        jobPositions={jobPositions}
        action={updateUserPositionWithId}
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

- [ ] **Step 4: Verify in the browser**

Navigate to `/user-positions`, click the row from Task 3. Confirm the form pre-fills correctly (User and Job Position dropdowns selected). Change a date and submit — confirm the change shows on `/user-positions`. Confirm `/user-positions/999999/edit` renders a 404.

- [ ] **Step 5: Commit**

```bash
git add "src/app/(app)/user-positions/actions.ts" "src/app/(app)/user-positions/[id]/edit/page.tsx"
git commit -m "Add user position edit form and action"
```

---

### Task 5: Deactivate and reactivate

**Files:**
- Modify: `src/app/(app)/user-positions/actions.ts`
- Modify: `src/app/(app)/user-positions/[id]/edit/page.tsx`

**Interfaces:**
- Consumes: the `updateUserPositionWithId` `.bind(null, id)` pattern from Task 4.
- Produces: `deactivateUserPosition(id): Promise<void>`, `reactivateUserPosition(id): Promise<void>`.

- [ ] **Step 1: Add the two actions**

In `src/app/(app)/user-positions/actions.ts`, add below `updateUserPosition`:

```ts
export async function deactivateUserPosition(id: number) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('user_position')
    .update({ active: false })
    .eq('id', id)
    .select('id');

  if (error) {
    throw new Error(error.message);
  }
  if (!data || data.length === 0) {
    throw new Error('User position not found.');
  }

  revalidatePath('/user-positions');
  revalidatePath(`/user-positions/${id}/edit`);
}

export async function reactivateUserPosition(id: number) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('user_position')
    .update({ active: true })
    .eq('id', id)
    .select('id');

  if (error) {
    throw new Error(error.message);
  }
  if (!data || data.length === 0) {
    throw new Error('User position not found.');
  }

  revalidatePath('/user-positions');
  revalidatePath(`/user-positions/${id}/edit`);
}
```

- [ ] **Step 2: Add the button to the edit page**

In `src/app/(app)/user-positions/[id]/edit/page.tsx`:

```tsx
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { UserPositionForm, type UserPosition } from '../../UserPositionForm';
import { updateUserPosition, deactivateUserPosition, reactivateUserPosition } from '../../actions';
```

Replace the `updateUserPositionWithId` line and everything below with:

```tsx
  const { active } = userPosition;
  const updateUserPositionWithId = updateUserPosition.bind(null, userPositionId);
  const deactivateUserPositionWithId = deactivateUserPosition.bind(null, userPositionId);
  const reactivateUserPositionWithId = reactivateUserPosition.bind(null, userPositionId);

  return (
    <div className="px-6 py-8">
      <p className="font-mono text-xs font-medium tracking-[0.2em] text-zinc-500 dark:text-zinc-400">
        PEOPLE
      </p>
      <div className="mt-1 flex items-center justify-between">
        <h2 className="text-2xl font-semibold text-zinc-950 dark:text-zinc-50">
          Edit user position
        </h2>
        <form action={active ? deactivateUserPositionWithId : reactivateUserPositionWithId}>
          <button
            type="submit"
            className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-900"
          >
            {active ? 'Deactivate' : 'Reactivate'}
          </button>
        </form>
      </div>
      <UserPositionForm
        userPosition={userPosition as UserPosition}
        users={users}
        jobPositions={jobPositions}
        action={updateUserPositionWithId}
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

- [ ] **Step 4: Verify in the browser**

Cycle Deactivate → confirm "Inactive" on `/user-positions` → Reactivate → confirm "Active" again, `user_id`/`job_position_id`/dates unchanged throughout (verify via `psql`).

- [ ] **Step 5: Commit**

```bash
git add "src/app/(app)/user-positions/actions.ts" "src/app/(app)/user-positions/[id]/edit/page.tsx"
git commit -m "Add user position deactivate/reactivate actions"
```

---

## Self-Review Notes

- **Spec coverage:** required-field constraints + `active` column + grants/RLS ✓ (Task 1). New "User Positions" nav entry ✓ (Task 1). List page with joined user (name/email fallback) and job position, "PEOPLE" eyebrow ✓ (Task 2). `user_id`/`job_position_id` both independent, straight from `formData`, no derivation ✓ (Task 3's `createUserPosition`/Task 4's `updateUserPosition`). No auto-fill/controlled-field logic — confirmed `UserPositionForm` uses only `defaultValue` fields, `user_id` never coerced to a number. Deactivate/Reactivate flips `active` only ✓ (Task 5).
- **Placeholder scan:** none — every step has complete, runnable code, except Task 1's icon choice which is deliberately left to the implementer to verify against the actual installed `lucide-react` package rather than guessing a name that might not exist.
- **Type consistency:** `UserPosition` (id/user_id/job_position_id/start_date/end_date) defined once in `UserPositionForm.tsx`, imported by the edit page — deliberately excludes `active`, same handling as every prior status field. `UserOption`/`JobPositionOption` defined once in `UserPositionForm.tsx`, used by both `new/page.tsx` and `[id]/edit/page.tsx`. `UserPositionFormState` defined once in `actions.ts`. `createUserPosition`'s `(prevState, formData)` and `updateUserPosition`'s `(id, prevState, formData)` match `UserPositionForm`'s `action` prop typing and the edit page's `.bind(null, id)` usage. `deactivateUserPosition`/`reactivateUserPosition` take only `id`, matching the proven shape.
