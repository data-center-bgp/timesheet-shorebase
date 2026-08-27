# Job Title, Job Position & User Management Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the single "Positions & Users" nav placeholder with three real features — full CRUD for `JobTitle` (a simple lookup) and `JobPosition` (a self-referential org chart), plus an edit-only view onto `app_user` (`Users`). `UserPosition` and `UserSignature` are explicitly deferred to later passes.

**Architecture:** One migration covering all three tables' schema changes plus `app_role`'s grant, then `nav.ts` swaps one placeholder for three real entries. `JobTitle` and `JobPosition` follow the exact proven Server Component + Server Action + `active` column pattern used by every entity since `ContractService`. `Users` is a deliberate break from that pattern: no create route (accounts come from Supabase Auth signup via an existing trigger), no deactivate/reactivate (deferred — real auth implications), and no DB-level `not null` on `name`/`username` (the trigger can legitimately insert `null`). `JobPosition`'s self-referential `parent_position_id` needs one new thing no prior feature has needed: excluding the row being edited from its own dropdown of parent options.

**Tech Stack:** Next.js 16 App Router, React 19 (`useActionState`), `@supabase/ssr` server client, plain SQL migration applied via Supabase Studio's SQL editor.

## Global Constraints

- `job_title`: required `code`/`name`/`start_date`/`end_date`, unique `code`, `active boolean not null default true`, full CRUD (list/create/edit/deactivate-reactivate).
- `job_position`: required `company_id`/`job_title_id`/`name`/`start_date`/`end_date`, `parent_position_id` stays nullable and optional (top-level position = no parent), `active boolean not null default true`, full CRUD. The "Parent Position" dropdown on the EDIT page must exclude the position currently being edited from its own option list — a position can never select itself as its parent. No deeper cycle prevention (see design spec's Non-goals).
- `app_user`: NO `not null` added to `name`/`username` — the `handle_new_auth_user` trigger can insert `null` for both, and a stricter constraint would risk breaking future signups. Instead, "Name" is required only at the form-validation level (client + server action), not the database level. NO create route, NO deactivate/reactivate button — this feature is edit-only (Name/Username/Role). `email` and `start_date`/`end_date` are never on the form.
- `app_user` and `app_role` both currently have zero grants and RLS disabled on `app_user` — fixed in Task 1's migration, not discovered mid-build this time.
- `nav.ts`'s People group's single `{ label: 'Positions & Users', icon: Network, href: '/positions-users' }` entry is replaced with three entries: `Job Titles` (new `Tag` icon), `Job Positions` (reuses the existing `Network` icon), `Users` (new `UserCog` icon) — in that order.
- Dropdowns (Company, Job Title, Parent Position, Role) show all rows regardless of status — same convention as every prior feature.
- No automated test suite — verification is `npm run lint`, a production build, and manual checks against the running dev server.
- Migrations are applied by pasting the SQL into Supabase Studio's SQL editor by the project owner, never via `npx supabase db push` — verify afterward with `psql`.

---

### Task 1: Migration + nav.ts — job_title, job_position, app_user/app_role grants, three new nav entries

**Files:**
- Create: `supabase/migrations/20260826100000_job_title_job_position_app_user.sql`
- Modify: `src/components/app-shell/nav.ts`

**Interfaces:**
- Consumes: nothing — new migration on top of `supabase/migrations/20260826090000_clear_meal_test_rows.sql`.
- Produces: `job_title` gains required fields + unique `code` + `active` + grants/RLS. `job_position` gains required fields + `active` + grants/RLS. `app_user` gains `select`/`update` grants + RLS policy (no `insert`). `app_role` gains a `select` grant. `nav.ts`'s People group has three new items instead of one. All later tasks depend on this being live.

- [ ] **Step 1: Write the migration**

Create `supabase/migrations/20260826100000_job_title_job_position_app_user.sql`:

```sql
-- Adds required-field constraints, active columns, and grants/RLS for
-- job_title and job_position (same convention as every prior feature),
-- plus fixes app_user/app_role's grants up front - both currently have
-- zero grants to authenticated (app_user also has RLS disabled), the
-- same class of gap caught proactively for meal_time in the previous
-- feature after having to fix it as a follow-up three times before that.
--
-- app_user gets NO not-null constraint on name/username: the
-- handle_new_auth_user trigger (see the init migration) inserts name
-- from auth signup metadata, which can legitimately be null - a
-- stricter constraint here would risk breaking future signups. Only
-- select/update are granted, no insert - this feature never creates
-- app_user rows, those come exclusively from the auth trigger.

begin;

alter table timesheet_shorebase.job_title
  alter column code set not null;
alter table timesheet_shorebase.job_title
  alter column name set not null;
alter table timesheet_shorebase.job_title
  alter column start_date set not null;
alter table timesheet_shorebase.job_title
  alter column end_date set not null;

alter table timesheet_shorebase.job_title
  add constraint uq_job_title_code unique (code);

alter table timesheet_shorebase.job_title
  add column active boolean not null default true;

grant select, insert, update on timesheet_shorebase.job_title to authenticated;
alter table timesheet_shorebase.job_title enable row level security;
create policy "authenticated users can read/write job titles"
  on timesheet_shorebase.job_title
  for all
  to authenticated
  using (true)
  with check (true);

alter table timesheet_shorebase.job_position
  alter column company_id set not null;
alter table timesheet_shorebase.job_position
  alter column job_title_id set not null;
alter table timesheet_shorebase.job_position
  alter column name set not null;
alter table timesheet_shorebase.job_position
  alter column start_date set not null;
alter table timesheet_shorebase.job_position
  alter column end_date set not null;

alter table timesheet_shorebase.job_position
  add column active boolean not null default true;

grant select, insert, update on timesheet_shorebase.job_position to authenticated;
alter table timesheet_shorebase.job_position enable row level security;
create policy "authenticated users can read/write job positions"
  on timesheet_shorebase.job_position
  for all
  to authenticated
  using (true)
  with check (true);

grant select, update on timesheet_shorebase.app_user to authenticated;
alter table timesheet_shorebase.app_user enable row level security;
create policy "authenticated users can read/write app users"
  on timesheet_shorebase.app_user
  for all
  to authenticated
  using (true)
  with check (true);

grant select on timesheet_shorebase.app_role to authenticated;

commit;
```

- [ ] **Step 2: Ask the project owner to apply the migration**

Paste the full contents into Supabase Studio's SQL editor and run it there. Wait for confirmation it ran without error before continuing to Step 3.

- [ ] **Step 3: Verify against the real database**

```bash
source <(grep '^DATABASE_URL=' .env.local | sed 's/^/export /')
psql "$DATABASE_URL" -c "\d timesheet_shorebase.job_title"
psql "$DATABASE_URL" -c "\d timesheet_shorebase.job_position"
psql "$DATABASE_URL" -c "select grantee, privilege_type from information_schema.role_table_grants where table_schema = 'timesheet_shorebase' and table_name = 'app_user' and grantee = 'authenticated' order by privilege_type;"
psql "$DATABASE_URL" -c "select policyname, cmd, roles from pg_policies where schemaname = 'timesheet_shorebase' and tablename in ('job_title','job_position','app_user');"
psql "$DATABASE_URL" -c "select grantee, privilege_type from information_schema.role_table_grants where table_schema = 'timesheet_shorebase' and table_name = 'app_role' and grantee = 'authenticated';"
```

Expected:
- `job_title`: `code`/`name`/`start_date`/`end_date`/`active` all `not null`, `active` defaults `true`, `uq_job_title_code` unique constraint present.
- `job_position`: `company_id`/`job_title_id`/`name`/`start_date`/`end_date`/`active` all `not null`, `active` defaults `true`, `parent_position_id` remains nullable.
- `app_user`: exactly `SELECT`, `UPDATE` for `authenticated` (no `INSERT`).
- Three RLS policies, one per table, each `cmd = ALL`, `roles = {authenticated}`.
- `app_role`: exactly `SELECT` for `authenticated`.

- [ ] **Step 4: Update the nav**

In `src/components/app-shell/nav.ts`, add `Tag` and `UserCog` to the `lucide-react` import (keep the list alphabetically sorted — `Tag` goes between `Stamp` and `UtensilsCrossed`, `UserCog` goes between `UtensilsCrossed` and `Users`):

```ts
import {
  Activity,
  BedDouble,
  Building2,
  CalendarRange,
  ClipboardList,
  Container,
  FileSignature,
  FileStack,
  Handshake,
  Layers,
  LayoutDashboard,
  Network,
  Receipt,
  Settings2,
  Stamp,
  Tag,
  UserCog,
  UtensilsCrossed,
  Users,
  Wrench,
  type LucideIcon,
} from 'lucide-react';
```

Replace the People group's single `Positions & Users` entry with three:

```ts
  {
    label: 'People',
    items: [
      { label: 'Persons', icon: Users, href: '/persons' },
      { label: 'Accommodation', icon: BedDouble, href: '/accommodation' },
      { label: 'Meals', icon: UtensilsCrossed, href: '/meals' },
      { label: 'Job Titles', icon: Tag, href: '/job-titles' },
      { label: 'Job Positions', icon: Network, href: '/job-positions' },
      { label: 'Users', icon: UserCog, href: '/users' },
    ],
  },
```

- [ ] **Step 5: Run lint and build**

```bash
npm run lint
npm run build
```

Expected: both succeed with no errors (routes don't exist yet, so `/job-titles` etc. will still resolve to the `[section]` "Coming soon" catch-all — that's expected until later tasks).

- [ ] **Step 6: Verify in the browser**

Navigate to `http://localhost:3000`. Confirm the sidebar's People group now shows "Job Titles", "Job Positions", "Users" (each still "Coming soon" for now) instead of "Positions & Users".

- [ ] **Step 7: Commit**

```bash
git add supabase/migrations/20260826100000_job_title_job_position_app_user.sql "src/components/app-shell/nav.ts"
git commit -m "Add job_title/job_position/app_user schema changes and split Positions & Users nav entry"
```

---

### Task 2: Job Titles list page

**Files:**
- Create: `src/app/(app)/job-titles/page.tsx`

**Interfaces:**
- Consumes: `createClient` from `@/lib/supabase/server`. Requires Task 1's migration and nav change to be live.
- Produces: the `JobTitleRow` shape, declared in `page.tsx` only.

- [ ] **Step 1: Write the list page**

Create `src/app/(app)/job-titles/page.tsx`:

```tsx
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';

type JobTitleRow = {
  id: number;
  code: string;
  name: string;
  active: boolean;
};

export default async function JobTitlesPage() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('job_title')
    .select('id, code, name, active')
    .order('name', { ascending: true });

  const jobTitles = (data ?? []) as unknown as JobTitleRow[];

  return (
    <div className="px-6 py-8">
      <div className="flex items-center justify-between">
        <div>
          <p className="font-mono text-xs font-medium tracking-[0.2em] text-zinc-500 dark:text-zinc-400">
            PEOPLE
          </p>
          <h2 className="mt-1 text-2xl font-semibold text-zinc-950 dark:text-zinc-50">
            Job Titles
          </h2>
        </div>
        <Link
          href="/job-titles/new"
          className="rounded-md bg-teal-700 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-teal-800 dark:bg-teal-600 dark:hover:bg-teal-500"
        >
          Add job title
        </Link>
      </div>

      {error && (
        <p role="alert" className="mt-4 text-sm text-red-600 dark:text-red-400">
          Couldn&apos;t load job titles: {error.message}
        </p>
      )}

      {!error && jobTitles.length === 0 && (
        <p className="mt-4 max-w-prose text-zinc-600 dark:text-zinc-400">
          No job titles yet. Add your first one to get started.
        </p>
      )}

      {!error && jobTitles.length > 0 && (
        <div className="mt-6 overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800">
          <table className="w-full text-sm">
            <thead className="border-b border-zinc-200 bg-zinc-50 text-left text-xs font-medium uppercase tracking-wide text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
              <tr>
                <th className="px-4 py-2">Code</th>
                <th className="px-4 py-2">Name</th>
                <th className="px-4 py-2">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {jobTitles.map((jobTitle) => {
                const { active } = jobTitle;
                return (
                  <tr key={jobTitle.id}>
                    <td className="px-4 py-2 font-medium text-zinc-900 dark:text-zinc-100">
                      <Link href={`/job-titles/${jobTitle.id}/edit`} className="hover:underline">
                        {jobTitle.code}
                      </Link>
                    </td>
                    <td className="px-4 py-2 text-zinc-600 dark:text-zinc-400">{jobTitle.name}</td>
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

No embeds needed — `job_title` has no FK dependencies of its own.

- [ ] **Step 2: Run lint and build**

```bash
npm run lint
npm run build
```

- [ ] **Step 3: Verify in the browser**

Navigate to `http://localhost:3000/job-titles`. Expected: "PEOPLE / Job Titles", an "Add job title" button, and "No job titles yet. Add your first one to get started."

- [ ] **Step 4: Commit**

```bash
git add "src/app/(app)/job-titles/page.tsx"
git commit -m "Add job titles list page"
```

---

### Task 3: Create job title

**Files:**
- Create: `src/app/(app)/job-titles/actions.ts`
- Create: `src/app/(app)/job-titles/JobTitleForm.tsx`
- Create: `src/app/(app)/job-titles/new/page.tsx`

**Interfaces:**
- Consumes: `createClient` from `@/lib/supabase/server`.
- Produces: `JobTitleFormState = { error: string | null }`, `JobTitle`, both exported from `JobTitleForm.tsx`. `createJobTitle(prevState, formData): Promise<JobTitleFormState>` exported from `actions.ts`. `JobTitleForm({ jobTitle?: JobTitle; action; submitLabel })` exported from `JobTitleForm.tsx`, reused by Task 4.

- [ ] **Step 1: Write the Server Actions file**

Create `src/app/(app)/job-titles/actions.ts`:

```ts
'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

export type JobTitleFormState = {
  error: string | null;
};

export async function createJobTitle(
  _prevState: JobTitleFormState,
  formData: FormData,
): Promise<JobTitleFormState> {
  const code = (formData.get('code') as string | null)?.trim();
  if (!code) {
    return { error: 'Code is required.' };
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
  const { error } = await supabase.from('job_title').insert({
    code,
    name,
    start_date: startDate,
    end_date: endDate,
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath('/job-titles');
  redirect('/job-titles');
}
```

- [ ] **Step 2: Write the shared form component**

Create `src/app/(app)/job-titles/JobTitleForm.tsx`:

```tsx
'use client';

import { useActionState } from 'react';
import type { JobTitleFormState } from './actions';

export type JobTitle = {
  id: number;
  code: string;
  name: string;
  start_date: string;
  end_date: string;
};

const initialState: JobTitleFormState = { error: null };

export function JobTitleForm({
  jobTitle,
  action,
  submitLabel,
}: {
  jobTitle?: JobTitle;
  action: (prevState: JobTitleFormState, formData: FormData) => Promise<JobTitleFormState>;
  submitLabel: string;
}) {
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="mt-6 max-w-md space-y-4">
      <div className="space-y-1">
        <label htmlFor="code" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Code
        </label>
        <input
          id="code"
          name="code"
          type="text"
          required
          defaultValue={jobTitle?.code}
          className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-950 focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-600/40 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
        />
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
          defaultValue={jobTitle?.name}
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
            defaultValue={jobTitle?.start_date}
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
            defaultValue={jobTitle?.end_date}
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

- [ ] **Step 3: Write the new-job-title route**

Create `src/app/(app)/job-titles/new/page.tsx`:

```tsx
import { JobTitleForm } from '../JobTitleForm';
import { createJobTitle } from '../actions';

export default function NewJobTitlePage() {
  return (
    <div className="px-6 py-8">
      <p className="font-mono text-xs font-medium tracking-[0.2em] text-zinc-500 dark:text-zinc-400">
        PEOPLE
      </p>
      <h2 className="mt-1 text-2xl font-semibold text-zinc-950 dark:text-zinc-50">
        Add job title
      </h2>
      <JobTitleForm action={createJobTitle} submitLabel="Create job title" />
    </div>
  );
}
```

No dropdown-source fetches needed — `job_title` has no FK dependencies, so unlike every prior "new" page this one needs no `createClient()` call and isn't `async`.

- [ ] **Step 4: Run lint and build**

```bash
npm run lint
npm run build
```

- [ ] **Step 5: Verify in the browser**

Navigate to `http://localhost:3000/job-titles/new`, fill in Code/Name/dates, submit. Expected: redirected to `/job-titles`, new row appears. Go back and try submitting the same Code again — confirm the unique constraint produces a clear inline error (the raw Postgres error message via `error.message`, same as every other unique-constraint case in this app — no special-casing needed). Then test whitespace-only Name — confirm `{ error: 'Name is required.' }` and no redirect.

- [ ] **Step 6: Commit**

```bash
git add "src/app/(app)/job-titles/actions.ts" "src/app/(app)/job-titles/JobTitleForm.tsx" "src/app/(app)/job-titles/new/page.tsx"
git commit -m "Add job title creation form and action"
```

---

### Task 4: Edit job title

**Files:**
- Modify: `src/app/(app)/job-titles/actions.ts`
- Create: `src/app/(app)/job-titles/[id]/edit/page.tsx`

**Interfaces:**
- Consumes: `JobTitleForm`, `JobTitle` from `../../JobTitleForm`; `JobTitleFormState` from `../../actions`.
- Produces: `updateJobTitle(id, prevState, formData): Promise<JobTitleFormState>`, added to `actions.ts`. Task 5 adds deactivate/reactivate to this same file and a button to this same page.

- [ ] **Step 1: Add `updateJobTitle`**

In `src/app/(app)/job-titles/actions.ts`, add below `createJobTitle`:

```ts
export async function updateJobTitle(
  id: number,
  _prevState: JobTitleFormState,
  formData: FormData,
): Promise<JobTitleFormState> {
  const code = (formData.get('code') as string | null)?.trim();
  if (!code) {
    return { error: 'Code is required.' };
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
  const { error } = await supabase
    .from('job_title')
    .update({ code, name, start_date: startDate, end_date: endDate })
    .eq('id', id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath('/job-titles');
  redirect('/job-titles');
}
```

- [ ] **Step 2: Write the edit route**

Create `src/app/(app)/job-titles/[id]/edit/page.tsx`:

```tsx
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { JobTitleForm, type JobTitle } from '../../JobTitleForm';
import { updateJobTitle } from '../../actions';

export default async function EditJobTitlePage(props: PageProps<'/job-titles/[id]/edit'>) {
  const { id } = await props.params;
  const jobTitleId = Number(id);

  if (Number.isNaN(jobTitleId)) {
    notFound();
  }

  const supabase = await createClient();
  const { data: jobTitle, error } = await supabase
    .from('job_title')
    .select('id, code, name, start_date, end_date, active')
    .eq('id', jobTitleId)
    .maybeSingle();

  if (error) {
    return (
      <div className="px-6 py-8">
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          Couldn&apos;t load job title: {error.message}
        </p>
      </div>
    );
  }

  if (!jobTitle) {
    notFound();
  }

  const updateJobTitleWithId = updateJobTitle.bind(null, jobTitleId);

  return (
    <div className="px-6 py-8">
      <p className="font-mono text-xs font-medium tracking-[0.2em] text-zinc-500 dark:text-zinc-400">
        PEOPLE
      </p>
      <h2 className="mt-1 text-2xl font-semibold text-zinc-950 dark:text-zinc-50">
        Edit job title
      </h2>
      <JobTitleForm jobTitle={jobTitle as JobTitle} action={updateJobTitleWithId} submitLabel="Save changes" />
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

Navigate to `/job-titles`, click the row from Task 3. Confirm the form pre-fills. Change the Name and submit — confirm the change shows on `/job-titles`. Confirm `/job-titles/999999/edit` renders a 404.

- [ ] **Step 5: Commit**

```bash
git add "src/app/(app)/job-titles/actions.ts" "src/app/(app)/job-titles/[id]/edit/page.tsx"
git commit -m "Add job title edit form and action"
```

---

### Task 5: Deactivate and reactivate job title

**Files:**
- Modify: `src/app/(app)/job-titles/actions.ts`
- Modify: `src/app/(app)/job-titles/[id]/edit/page.tsx`

**Interfaces:**
- Consumes: the `updateJobTitleWithId` `.bind(null, id)` pattern from Task 4.
- Produces: `deactivateJobTitle(id): Promise<void>`, `reactivateJobTitle(id): Promise<void>`.

- [ ] **Step 1: Add the two actions**

In `src/app/(app)/job-titles/actions.ts`, add below `updateJobTitle`:

```ts
export async function deactivateJobTitle(id: number) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('job_title')
    .update({ active: false })
    .eq('id', id)
    .select('id');

  if (error) {
    throw new Error(error.message);
  }
  if (!data || data.length === 0) {
    throw new Error('Job title not found.');
  }

  revalidatePath('/job-titles');
  revalidatePath(`/job-titles/${id}/edit`);
}

export async function reactivateJobTitle(id: number) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('job_title')
    .update({ active: true })
    .eq('id', id)
    .select('id');

  if (error) {
    throw new Error(error.message);
  }
  if (!data || data.length === 0) {
    throw new Error('Job title not found.');
  }

  revalidatePath('/job-titles');
  revalidatePath(`/job-titles/${id}/edit`);
}
```

- [ ] **Step 2: Add the button to the edit page**

In `src/app/(app)/job-titles/[id]/edit/page.tsx`:

```tsx
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { JobTitleForm, type JobTitle } from '../../JobTitleForm';
import { updateJobTitle, deactivateJobTitle, reactivateJobTitle } from '../../actions';
```

Replace the `updateJobTitleWithId` line and everything below with:

```tsx
  const { active } = jobTitle;
  const updateJobTitleWithId = updateJobTitle.bind(null, jobTitleId);
  const deactivateJobTitleWithId = deactivateJobTitle.bind(null, jobTitleId);
  const reactivateJobTitleWithId = reactivateJobTitle.bind(null, jobTitleId);

  return (
    <div className="px-6 py-8">
      <p className="font-mono text-xs font-medium tracking-[0.2em] text-zinc-500 dark:text-zinc-400">
        PEOPLE
      </p>
      <div className="mt-1 flex items-center justify-between">
        <h2 className="text-2xl font-semibold text-zinc-950 dark:text-zinc-50">
          Edit job title
        </h2>
        <form action={active ? deactivateJobTitleWithId : reactivateJobTitleWithId}>
          <button
            type="submit"
            className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-900"
          >
            {active ? 'Deactivate' : 'Reactivate'}
          </button>
        </form>
      </div>
      <JobTitleForm jobTitle={jobTitle as JobTitle} action={updateJobTitleWithId} submitLabel="Save changes" />
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

Cycle Deactivate → confirm "Inactive" on `/job-titles` → Reactivate → confirm "Active" again, dates/code/name unchanged throughout (verify via `psql`).

- [ ] **Step 5: Commit**

```bash
git add "src/app/(app)/job-titles/actions.ts" "src/app/(app)/job-titles/[id]/edit/page.tsx"
git commit -m "Add job title deactivate/reactivate actions"
```

---

### Task 6: Job Positions list page

**Files:**
- Create: `src/app/(app)/job-positions/page.tsx`

**Interfaces:**
- Consumes: `createClient` from `@/lib/supabase/server`. Requires Task 1's migration to be live.
- Produces: the `JobPositionRow` shape, declared in `page.tsx` only.

- [ ] **Step 1: Write the list page**

Create `src/app/(app)/job-positions/page.tsx`:

```tsx
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';

type JobPositionRow = {
  id: number;
  name: string;
  active: boolean;
  company: { name: string } | null;
  job_title: { name: string } | null;
};

export default async function JobPositionsPage() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('job_position')
    .select('id, name, active, company(name), job_title(name)')
    .order('name', { ascending: true });

  const jobPositions = (data ?? []) as unknown as JobPositionRow[];

  return (
    <div className="px-6 py-8">
      <div className="flex items-center justify-between">
        <div>
          <p className="font-mono text-xs font-medium tracking-[0.2em] text-zinc-500 dark:text-zinc-400">
            PEOPLE
          </p>
          <h2 className="mt-1 text-2xl font-semibold text-zinc-950 dark:text-zinc-50">
            Job Positions
          </h2>
        </div>
        <Link
          href="/job-positions/new"
          className="rounded-md bg-teal-700 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-teal-800 dark:bg-teal-600 dark:hover:bg-teal-500"
        >
          Add job position
        </Link>
      </div>

      {error && (
        <p role="alert" className="mt-4 text-sm text-red-600 dark:text-red-400">
          Couldn&apos;t load job positions: {error.message}
        </p>
      )}

      {!error && jobPositions.length === 0 && (
        <p className="mt-4 max-w-prose text-zinc-600 dark:text-zinc-400">
          No job positions yet. Add your first one to get started.
        </p>
      )}

      {!error && jobPositions.length > 0 && (
        <div className="mt-6 overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800">
          <table className="w-full text-sm">
            <thead className="border-b border-zinc-200 bg-zinc-50 text-left text-xs font-medium uppercase tracking-wide text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
              <tr>
                <th className="px-4 py-2">Name</th>
                <th className="px-4 py-2">Company</th>
                <th className="px-4 py-2">Job Title</th>
                <th className="px-4 py-2">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {jobPositions.map((jobPosition) => {
                const { active } = jobPosition;
                return (
                  <tr key={jobPosition.id}>
                    <td className="px-4 py-2 font-medium text-zinc-900 dark:text-zinc-100">
                      <Link href={`/job-positions/${jobPosition.id}/edit`} className="hover:underline">
                        {jobPosition.name}
                      </Link>
                    </td>
                    <td className="px-4 py-2 text-zinc-600 dark:text-zinc-400">
                      {jobPosition.company?.name ?? '—'}
                    </td>
                    <td className="px-4 py-2 text-zinc-600 dark:text-zinc-400">
                      {jobPosition.job_title?.name ?? '—'}
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

`company(name)` and `job_title(name)` are unaliased embeds — `job_position` has exactly one FK to each. `parent_position_id` is deliberately NOT shown on the list page (would need a self-join alias like `parent:job_position!parent_position_id(name)` since `job_position` has two FKs pointing at itself conceptually — the PK and the self-FK — which is out of scope for a simple list column; the org-chart relationship is visible on the edit page instead).

- [ ] **Step 2: Run lint and build**

```bash
npm run lint
npm run build
```

- [ ] **Step 3: Verify in the browser**

Navigate to `http://localhost:3000/job-positions`. Expected: "PEOPLE / Job Positions", "Add job position" button, empty-state message.

- [ ] **Step 4: Commit**

```bash
git add "src/app/(app)/job-positions/page.tsx"
git commit -m "Add job positions list page"
```

---

### Task 7: Create job position

**Files:**
- Create: `src/app/(app)/job-positions/actions.ts`
- Create: `src/app/(app)/job-positions/JobPositionForm.tsx`
- Create: `src/app/(app)/job-positions/new/page.tsx`

**Interfaces:**
- Consumes: `createClient` from `@/lib/supabase/server`.
- Produces: `JobPositionFormState = { error: string | null }`, `JobPosition`, `CompanyOption = { id: number; name: string }`, `JobTitleOption = { id: number; name: string }`, `ParentPositionOption = { id: number; name: string }` (all exported from `JobPositionForm.tsx`). `createJobPosition(prevState, formData): Promise<JobPositionFormState>` exported from `actions.ts`. `JobPositionForm({ jobPosition?; companies; jobTitles; parentPositionOptions; action; submitLabel })` exported from `JobPositionForm.tsx`, reused by Task 8.

- [ ] **Step 1: Write the Server Actions file**

Create `src/app/(app)/job-positions/actions.ts`:

```ts
'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

export type JobPositionFormState = {
  error: string | null;
};

export async function createJobPosition(
  _prevState: JobPositionFormState,
  formData: FormData,
): Promise<JobPositionFormState> {
  const companyIdRaw = formData.get('company_id') as string | null;
  const companyId = companyIdRaw ? Number(companyIdRaw) : NaN;
  if (!companyIdRaw || Number.isNaN(companyId)) {
    return { error: 'Company is required.' };
  }

  const jobTitleIdRaw = formData.get('job_title_id') as string | null;
  const jobTitleId = jobTitleIdRaw ? Number(jobTitleIdRaw) : NaN;
  if (!jobTitleIdRaw || Number.isNaN(jobTitleId)) {
    return { error: 'Job title is required.' };
  }

  const parentPositionIdRaw = (formData.get('parent_position_id') as string | null)?.trim();
  const parentPositionId = parentPositionIdRaw ? Number(parentPositionIdRaw) : null;
  if (parentPositionIdRaw && Number.isNaN(parentPositionId)) {
    return { error: 'Parent position is invalid.' };
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
  const { error } = await supabase.from('job_position').insert({
    company_id: companyId,
    job_title_id: jobTitleId,
    parent_position_id: parentPositionId,
    name,
    start_date: startDate,
    end_date: endDate,
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath('/job-positions');
  redirect('/job-positions');
}
```

`parent_position_id` is the first genuinely optional dropdown in this codebase (every prior dropdown has been required) — empty string from the form becomes `null`, matching how optional text fields are already handled elsewhere.

- [ ] **Step 2: Write the shared form component**

Create `src/app/(app)/job-positions/JobPositionForm.tsx`:

```tsx
'use client';

import { useActionState } from 'react';
import type { JobPositionFormState } from './actions';

export type JobPosition = {
  id: number;
  company_id: number;
  job_title_id: number;
  parent_position_id: number | null;
  name: string;
  start_date: string;
  end_date: string;
};

export type CompanyOption = {
  id: number;
  name: string;
};

export type JobTitleOption = {
  id: number;
  name: string;
};

export type ParentPositionOption = {
  id: number;
  name: string;
};

const initialState: JobPositionFormState = { error: null };

export function JobPositionForm({
  jobPosition,
  companies,
  jobTitles,
  parentPositionOptions,
  action,
  submitLabel,
}: {
  jobPosition?: JobPosition;
  companies: CompanyOption[];
  jobTitles: JobTitleOption[];
  parentPositionOptions: ParentPositionOption[];
  action: (prevState: JobPositionFormState, formData: FormData) => Promise<JobPositionFormState>;
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
          defaultValue={jobPosition?.company_id ?? ''}
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
        <label htmlFor="job_title_id" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Job title
        </label>
        <select
          id="job_title_id"
          name="job_title_id"
          required
          defaultValue={jobPosition?.job_title_id ?? ''}
          className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-950 focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-600/40 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
        >
          <option value="" disabled>
            Select a job title
          </option>
          {jobTitles.map((jobTitle) => (
            <option key={jobTitle.id} value={jobTitle.id}>
              {jobTitle.name}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-1">
        <label htmlFor="parent_position_id" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Parent position
        </label>
        <select
          id="parent_position_id"
          name="parent_position_id"
          defaultValue={jobPosition?.parent_position_id ?? ''}
          className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-950 focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-600/40 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
        >
          <option value="">No parent (top-level position)</option>
          {parentPositionOptions.map((position) => (
            <option key={position.id} value={position.id}>
              {position.name}
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
          defaultValue={jobPosition?.name}
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
            defaultValue={jobPosition?.start_date}
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
            defaultValue={jobPosition?.end_date}
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

The "Parent position" select has NO `required` attribute (the only non-required dropdown in this codebase) and its blank option has real, selectable text ("No parent (top-level position)") rather than a disabled placeholder — because "no parent" is a legitimate, meaningful value here, not an unselected state.

- [ ] **Step 3: Write the new-job-position route**

Create `src/app/(app)/job-positions/new/page.tsx`:

```tsx
import { JobPositionForm } from '../JobPositionForm';
import { createJobPosition } from '../actions';
import { createClient } from '@/lib/supabase/server';

export default async function NewJobPositionPage() {
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

  const { data: jobTitlesData, error: jobTitlesError } = await supabase
    .from('job_title')
    .select('id, name')
    .order('name', { ascending: true });

  if (jobTitlesError) {
    return (
      <div className="px-6 py-8">
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          Couldn&apos;t load job titles: {jobTitlesError.message}
        </p>
      </div>
    );
  }

  const { data: parentPositionsData, error: parentPositionsError } = await supabase
    .from('job_position')
    .select('id, name')
    .order('name', { ascending: true });

  if (parentPositionsError) {
    return (
      <div className="px-6 py-8">
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          Couldn&apos;t load parent positions: {parentPositionsError.message}
        </p>
      </div>
    );
  }

  const companies = companiesData ?? [];
  const jobTitles = jobTitlesData ?? [];
  const parentPositionOptions = parentPositionsData ?? [];

  return (
    <div className="px-6 py-8">
      <p className="font-mono text-xs font-medium tracking-[0.2em] text-zinc-500 dark:text-zinc-400">
        PEOPLE
      </p>
      <h2 className="mt-1 text-2xl font-semibold text-zinc-950 dark:text-zinc-50">
        Add job position
      </h2>
      <JobPositionForm
        companies={companies}
        jobTitles={jobTitles}
        parentPositionOptions={parentPositionOptions}
        action={createJobPosition}
        submitLabel="Create job position"
      />
    </div>
  );
}
```

On create, the parent-position options list is every existing `job_position` row — there's no "self" to exclude yet, since the row being created doesn't exist. Self-exclusion only matters on edit (Task 8).

- [ ] **Step 4: Run lint and build**

```bash
npm run lint
npm run build
```

- [ ] **Step 5: Verify in the browser**

Navigate to `/job-positions/new`. There must be at least one Company (should already exist from prior feature verification) and one Job Title (from Task 3) available. Create a top-level position (leave Parent position as "No parent"). Confirm it saves with a `null` `parent_position_id` (verify via `psql`). Create a second position and set its Parent position to the first one — confirm the parent relationship saves correctly (`psql`).

- [ ] **Step 6: Commit**

```bash
git add "src/app/(app)/job-positions/actions.ts" "src/app/(app)/job-positions/JobPositionForm.tsx" "src/app/(app)/job-positions/new/page.tsx"
git commit -m "Add job position creation form and action"
```

---

### Task 8: Edit job position

**Files:**
- Modify: `src/app/(app)/job-positions/actions.ts`
- Create: `src/app/(app)/job-positions/[id]/edit/page.tsx`

**Interfaces:**
- Consumes: `JobPositionForm`, `JobPosition`, `CompanyOption`, `JobTitleOption`, `ParentPositionOption` from `../../JobPositionForm`; `JobPositionFormState` from `../../actions`.
- Produces: `updateJobPosition(id, prevState, formData): Promise<JobPositionFormState>`, added to `actions.ts`. Task 9 adds deactivate/reactivate to this same file and a button to this same page.

- [ ] **Step 1: Add `updateJobPosition`**

In `src/app/(app)/job-positions/actions.ts`, add below `createJobPosition`:

```ts
export async function updateJobPosition(
  id: number,
  _prevState: JobPositionFormState,
  formData: FormData,
): Promise<JobPositionFormState> {
  const companyIdRaw = formData.get('company_id') as string | null;
  const companyId = companyIdRaw ? Number(companyIdRaw) : NaN;
  if (!companyIdRaw || Number.isNaN(companyId)) {
    return { error: 'Company is required.' };
  }

  const jobTitleIdRaw = formData.get('job_title_id') as string | null;
  const jobTitleId = jobTitleIdRaw ? Number(jobTitleIdRaw) : NaN;
  if (!jobTitleIdRaw || Number.isNaN(jobTitleId)) {
    return { error: 'Job title is required.' };
  }

  const parentPositionIdRaw = (formData.get('parent_position_id') as string | null)?.trim();
  const parentPositionId = parentPositionIdRaw ? Number(parentPositionIdRaw) : null;
  if (parentPositionIdRaw && Number.isNaN(parentPositionId)) {
    return { error: 'Parent position is invalid.' };
  }
  if (parentPositionId === id) {
    return { error: 'A position cannot be its own parent.' };
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
  const { error } = await supabase
    .from('job_position')
    .update({
      company_id: companyId,
      job_title_id: jobTitleId,
      parent_position_id: parentPositionId,
      name,
      start_date: startDate,
      end_date: endDate,
    })
    .eq('id', id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath('/job-positions');
  redirect('/job-positions');
}
```

The `parentPositionId === id` check is a server-side backstop (in case the excluded option were ever bypassed, e.g. a stale page or a direct form submission) — the primary guard is excluding the option from the dropdown in Step 2 below.

- [ ] **Step 2: Write the edit route**

Create `src/app/(app)/job-positions/[id]/edit/page.tsx`:

```tsx
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { JobPositionForm, type JobPosition } from '../../JobPositionForm';
import { updateJobPosition } from '../../actions';

export default async function EditJobPositionPage(props: PageProps<'/job-positions/[id]/edit'>) {
  const { id } = await props.params;
  const jobPositionId = Number(id);

  if (Number.isNaN(jobPositionId)) {
    notFound();
  }

  const supabase = await createClient();
  const { data: jobPosition, error } = await supabase
    .from('job_position')
    .select('id, company_id, job_title_id, parent_position_id, name, start_date, end_date, active')
    .eq('id', jobPositionId)
    .maybeSingle();

  if (error) {
    return (
      <div className="px-6 py-8">
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          Couldn&apos;t load job position: {error.message}
        </p>
      </div>
    );
  }

  if (!jobPosition) {
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

  const { data: jobTitlesData, error: jobTitlesError } = await supabase
    .from('job_title')
    .select('id, name')
    .order('name', { ascending: true });

  if (jobTitlesError) {
    return (
      <div className="px-6 py-8">
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          Couldn&apos;t load job titles: {jobTitlesError.message}
        </p>
      </div>
    );
  }

  const { data: parentPositionsData, error: parentPositionsError } = await supabase
    .from('job_position')
    .select('id, name')
    .order('name', { ascending: true });

  if (parentPositionsError) {
    return (
      <div className="px-6 py-8">
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          Couldn&apos;t load parent positions: {parentPositionsError.message}
        </p>
      </div>
    );
  }

  const companies = companiesData ?? [];
  const jobTitles = jobTitlesData ?? [];
  // Exclude this position from its own "Parent position" dropdown — a
  // position can never be selected as its own parent. See actions.ts's
  // updateJobPosition for the server-side backstop of the same rule.
  const parentPositionOptions = (parentPositionsData ?? []).filter(
    (position) => position.id !== jobPositionId,
  );

  const updateJobPositionWithId = updateJobPosition.bind(null, jobPositionId);

  return (
    <div className="px-6 py-8">
      <p className="font-mono text-xs font-medium tracking-[0.2em] text-zinc-500 dark:text-zinc-400">
        PEOPLE
      </p>
      <h2 className="mt-1 text-2xl font-semibold text-zinc-950 dark:text-zinc-50">
        Edit job position
      </h2>
      <JobPositionForm
        jobPosition={jobPosition as JobPosition}
        companies={companies}
        jobTitles={jobTitles}
        parentPositionOptions={parentPositionOptions}
        action={updateJobPositionWithId}
        submitLabel="Save changes"
      />
    </div>
  );
}
```

No Deactivate/Reactivate button yet — that's Task 9.

- [ ] **Step 3: Run lint and build**

```bash
npm run lint
npm run build
```

- [ ] **Step 4: Verify in the browser**

Navigate to `/job-positions`, click the child position created in Task 7 (the one with a parent set). Confirm the form pre-fills, including "Parent position" showing the correct selected parent, and confirm that position's own name does NOT appear anywhere in its own "Parent position" dropdown options. Now edit the FIRST (top-level) position — confirm ITS "Parent position" dropdown correctly excludes itself but still includes the second position as a selectable (if slightly unusual) option. Change the Name and submit, confirm the change shows. Confirm `/job-positions/999999/edit` renders a 404.

- [ ] **Step 5: Commit**

```bash
git add "src/app/(app)/job-positions/actions.ts" "src/app/(app)/job-positions/[id]/edit/page.tsx"
git commit -m "Add job position edit form and action"
```

---

### Task 9: Deactivate and reactivate job position

**Files:**
- Modify: `src/app/(app)/job-positions/actions.ts`
- Modify: `src/app/(app)/job-positions/[id]/edit/page.tsx`

**Interfaces:**
- Consumes: the `updateJobPositionWithId` `.bind(null, id)` pattern from Task 8.
- Produces: `deactivateJobPosition(id): Promise<void>`, `reactivateJobPosition(id): Promise<void>`.

- [ ] **Step 1: Add the two actions**

In `src/app/(app)/job-positions/actions.ts`, add below `updateJobPosition`:

```ts
export async function deactivateJobPosition(id: number) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('job_position')
    .update({ active: false })
    .eq('id', id)
    .select('id');

  if (error) {
    throw new Error(error.message);
  }
  if (!data || data.length === 0) {
    throw new Error('Job position not found.');
  }

  revalidatePath('/job-positions');
  revalidatePath(`/job-positions/${id}/edit`);
}

export async function reactivateJobPosition(id: number) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('job_position')
    .update({ active: true })
    .eq('id', id)
    .select('id');

  if (error) {
    throw new Error(error.message);
  }
  if (!data || data.length === 0) {
    throw new Error('Job position not found.');
  }

  revalidatePath('/job-positions');
  revalidatePath(`/job-positions/${id}/edit`);
}
```

- [ ] **Step 2: Add the button to the edit page**

In `src/app/(app)/job-positions/[id]/edit/page.tsx`:

```tsx
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { JobPositionForm, type JobPosition } from '../../JobPositionForm';
import { updateJobPosition, deactivateJobPosition, reactivateJobPosition } from '../../actions';
```

Replace the `updateJobPositionWithId` line and everything below with:

```tsx
  const { active } = jobPosition;
  const updateJobPositionWithId = updateJobPosition.bind(null, jobPositionId);
  const deactivateJobPositionWithId = deactivateJobPosition.bind(null, jobPositionId);
  const reactivateJobPositionWithId = reactivateJobPosition.bind(null, jobPositionId);

  return (
    <div className="px-6 py-8">
      <p className="font-mono text-xs font-medium tracking-[0.2em] text-zinc-500 dark:text-zinc-400">
        PEOPLE
      </p>
      <div className="mt-1 flex items-center justify-between">
        <h2 className="text-2xl font-semibold text-zinc-950 dark:text-zinc-50">
          Edit job position
        </h2>
        <form action={active ? deactivateJobPositionWithId : reactivateJobPositionWithId}>
          <button
            type="submit"
            className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-900"
          >
            {active ? 'Deactivate' : 'Reactivate'}
          </button>
        </form>
      </div>
      <JobPositionForm
        jobPosition={jobPosition as JobPosition}
        companies={companies}
        jobTitles={jobTitles}
        parentPositionOptions={parentPositionOptions}
        action={updateJobPositionWithId}
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

Cycle Deactivate → confirm "Inactive" on `/job-positions` → Reactivate → confirm "Active" again, all other fields (including `parent_position_id`) unchanged throughout (verify via `psql`).

- [ ] **Step 5: Commit**

```bash
git add "src/app/(app)/job-positions/actions.ts" "src/app/(app)/job-positions/[id]/edit/page.tsx"
git commit -m "Add job position deactivate/reactivate actions"
```

---

### Task 10: Users list page

**Files:**
- Create: `src/app/(app)/users/page.tsx`

**Interfaces:**
- Consumes: `createClient` from `@/lib/supabase/server`. Requires Task 1's migration to be live.
- Produces: the `AppUserRow` shape, declared in `page.tsx` only.

- [ ] **Step 1: Write the list page**

Create `src/app/(app)/users/page.tsx`:

```tsx
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';

type AppUserRow = {
  id: string;
  name: string | null;
  email: string | null;
  role_code: string;
  app_role: { name: string } | null;
};

export default async function UsersPage() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('app_user')
    .select('id, name, email, role_code, app_role(name)')
    .order('email', { ascending: true });

  const users = (data ?? []) as unknown as AppUserRow[];

  return (
    <div className="px-6 py-8">
      <div>
        <p className="font-mono text-xs font-medium tracking-[0.2em] text-zinc-500 dark:text-zinc-400">
          PEOPLE
        </p>
        <h2 className="mt-1 text-2xl font-semibold text-zinc-950 dark:text-zinc-50">
          Users
        </h2>
      </div>

      {error && (
        <p role="alert" className="mt-4 text-sm text-red-600 dark:text-red-400">
          Couldn&apos;t load users: {error.message}
        </p>
      )}

      {!error && users.length === 0 && (
        <p className="mt-4 max-w-prose text-zinc-600 dark:text-zinc-400">
          No users yet. Accounts are created automatically when someone signs in.
        </p>
      )}

      {!error && users.length > 0 && (
        <div className="mt-6 overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800">
          <table className="w-full text-sm">
            <thead className="border-b border-zinc-200 bg-zinc-50 text-left text-xs font-medium uppercase tracking-wide text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
              <tr>
                <th className="px-4 py-2">Name</th>
                <th className="px-4 py-2">Email</th>
                <th className="px-4 py-2">Role</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {users.map((user) => (
                <tr key={user.id}>
                  <td className="px-4 py-2 font-medium text-zinc-900 dark:text-zinc-100">
                    <Link href={`/users/${user.id}/edit`} className="hover:underline">
                      {user.name ?? '—'}
                    </Link>
                  </td>
                  <td className="px-4 py-2 text-zinc-600 dark:text-zinc-400">{user.email ?? '—'}</td>
                  <td className="px-4 py-2 text-zinc-600 dark:text-zinc-400">
                    {user.app_role?.name ?? user.role_code}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
```

No "Add user" button — see the design spec's Non-goals (accounts come exclusively from Supabase Auth signup). No Status column — no status field exists on this feature. `app_role(name)` is an unaliased embed (one FK from `app_user` to `app_role`); its name falls back to the raw `role_code` if the embed somehow returns null, which shouldn't happen given the FK, but costs nothing to guard.

Note `id` here is a `string` (UUID), not `number` — the first entity in this codebase whose primary key isn't an integer identity column, since `app_user.id` IS `auth.users.id` (see `CLAUDE.md`'s Auth section).

- [ ] **Step 2: Run lint and build**

```bash
npm run lint
npm run build
```

- [ ] **Step 3: Verify in the browser**

Navigate to `http://localhost:3000/users`. Expected: "PEOPLE / Users", no "Add user" button, a table with the real existing user(s) — Name will show "—" for both (since both currently have `null` names), Email populated, Role showing the role name.

- [ ] **Step 4: Commit**

```bash
git add "src/app/(app)/users/page.tsx"
git commit -m "Add users list page"
```

---

### Task 11: Edit user

**Files:**
- Create: `src/app/(app)/users/actions.ts`
- Create: `src/app/(app)/users/UserForm.tsx`
- Create: `src/app/(app)/users/[id]/edit/page.tsx`

**Interfaces:**
- Consumes: `createClient` from `@/lib/supabase/server`.
- Produces: `UserFormState = { error: string | null }`, `AppUser`, `RoleOption = { code: string; name: string }` (all exported from `UserForm.tsx`). `updateUser(id: string, prevState, formData): Promise<UserFormState>` exported from `actions.ts`. `UserForm({ user; roles; action; submitLabel })` exported from `UserForm.tsx`.

- [ ] **Step 1: Write the Server Actions file**

Create `src/app/(app)/users/actions.ts`:

```ts
'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

export type UserFormState = {
  error: string | null;
};

export async function updateUser(
  id: string,
  _prevState: UserFormState,
  formData: FormData,
): Promise<UserFormState> {
  const name = (formData.get('name') as string | null)?.trim();
  if (!name) {
    return { error: 'Name is required.' };
  }

  const username = (formData.get('username') as string | null)?.trim() || null;

  const roleCode = (formData.get('role_code') as string | null)?.trim();
  if (!roleCode) {
    return { error: 'Role is required.' };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from('app_user')
    .update({ name, username, role_code: roleCode })
    .eq('id', id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath('/users');
  redirect('/users');
}
```

`id` is a `string` (UUID), matching `app_user.id`'s type — every prior feature's `id` parameter has been `number`. No `createUser` — this file has exactly one exported action, unlike every prior feature's `actions.ts`.

- [ ] **Step 2: Write the shared form component**

Create `src/app/(app)/users/UserForm.tsx`:

```tsx
'use client';

import { useActionState } from 'react';
import type { UserFormState } from './actions';

export type AppUser = {
  id: string;
  name: string | null;
  username: string | null;
  role_code: string;
};

export type RoleOption = {
  code: string;
  name: string;
};

const initialState: UserFormState = { error: null };

export function UserForm({
  user,
  roles,
  action,
  submitLabel,
}: {
  user: AppUser;
  roles: RoleOption[];
  action: (prevState: UserFormState, formData: FormData) => Promise<UserFormState>;
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
          defaultValue={user.name ?? ''}
          className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-950 focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-600/40 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
        />
      </div>

      <div className="space-y-1">
        <label htmlFor="username" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Username
        </label>
        <input
          id="username"
          name="username"
          type="text"
          defaultValue={user.username ?? ''}
          className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-950 focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-600/40 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
        />
      </div>

      <div className="space-y-1">
        <label htmlFor="role_code" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Role
        </label>
        <select
          id="role_code"
          name="role_code"
          required
          defaultValue={user.role_code}
          className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-950 focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-600/40 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
        >
          {roles.map((role) => (
            <option key={role.code} value={role.code}>
              {role.name}
            </option>
          ))}
        </select>
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

Unlike every prior form, `user` here is a required prop (not `user?`) — there's no "create" mode for this form, it's always editing an existing row. The "Role" select has no "Select a role" placeholder option (unlike every other required dropdown) — `role_code` is never null on any real row (it has a DB default), so there's always a valid current value to show as selected, with no empty/unset state to represent.

- [ ] **Step 3: Write the edit route**

Create `src/app/(app)/users/[id]/edit/page.tsx`:

```tsx
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { UserForm, type AppUser } from '../../UserForm';
import { updateUser } from '../../actions';

export default async function EditUserPage(props: PageProps<'/users/[id]/edit'>) {
  const { id } = await props.params;

  const supabase = await createClient();
  const { data: user, error } = await supabase
    .from('app_user')
    .select('id, name, username, role_code')
    .eq('id', id)
    .maybeSingle();

  if (error) {
    return (
      <div className="px-6 py-8">
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          Couldn&apos;t load user: {error.message}
        </p>
      </div>
    );
  }

  if (!user) {
    notFound();
  }

  const { data: rolesData, error: rolesError } = await supabase
    .from('app_role')
    .select('code, name')
    .order('name', { ascending: true });

  if (rolesError) {
    return (
      <div className="px-6 py-8">
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          Couldn&apos;t load roles: {rolesError.message}
        </p>
      </div>
    );
  }

  const roles = rolesData ?? [];
  const updateUserWithId = updateUser.bind(null, id);

  return (
    <div className="px-6 py-8">
      <p className="font-mono text-xs font-medium tracking-[0.2em] text-zinc-500 dark:text-zinc-400">
        PEOPLE
      </p>
      <h2 className="mt-1 text-2xl font-semibold text-zinc-950 dark:text-zinc-50">
        Edit user
      </h2>
      <UserForm user={user as AppUser} roles={roles} action={updateUserWithId} submitLabel="Save changes" />
    </div>
  );
}
```

No `Number.isNaN` guard on `id` — it's a UUID string route param, not a numeric one, so there's nothing to parse; an invalid UUID simply won't match any row and falls through to the `!user` → `notFound()` branch below, same end result. No Deactivate/Reactivate button — see the design spec's Non-goals.

- [ ] **Step 4: Run lint and build**

```bash
npm run lint
npm run build
```

- [ ] **Step 5: Verify in the browser**

Navigate to `/users`, click one of the two real users. Confirm the form pre-fills (Name/Username blank since both are currently `null`, Role showing the correct current role). Set the Name to something real, submit. Confirm redirect to `/users` and the new Name shows in the list (no longer "—"). Confirm there is no "Add user" button anywhere and no `/users/new` route (navigating there directly should hit the `[section]` "Coming soon" catch-all, same as any other undefined route). Confirm no Deactivate/Reactivate button appears on the edit page.

- [ ] **Step 6: Commit**

```bash
git add "src/app/(app)/users/actions.ts" "src/app/(app)/users/UserForm.tsx" "src/app/(app)/users/[id]/edit/page.tsx"
git commit -m "Add user edit form and action"
```

---

## Self-Review Notes

- **Spec coverage:** `job_title`/`job_position` required fields + `active` + grants/RLS, `job_title.code` unique, `app_user`/`app_role` grants fixed proactively, all in Task 1's single migration ✓. Nav split into three items ✓ (Task 1). Job Title full CRUD (Tasks 2-5), Job Position full CRUD with self-exclusion on the parent dropdown (Tasks 6-9), Users edit-only with no create/no deactivate/no `not null` on name/username (Tasks 10-11) ✓.
- **Placeholder scan:** none — every step has complete, runnable code.
- **Type consistency:** `JobTitle`/`JobTitleFormState` (Job Title feature), `JobPosition`/`CompanyOption`/`JobTitleOption`/`ParentPositionOption`/`JobPositionFormState` (Job Position feature), `AppUser`/`RoleOption`/`UserFormState` (Users feature) — each defined exactly once in its own feature's Form component or `actions.ts`, imported consistently by that feature's own `new/page.tsx`/`[id]/edit/page.tsx`. No cross-feature type sharing (matching every prior feature's convention of not importing across route-folder boundaries). `updateUser`'s `id: string` parameter is deliberately typed differently from every other feature's `id: number` — matches `app_user.id`'s real UUID type, not a copy-paste oversight.
- **Self-reference guard:** `parent_position_id` exclusion happens in two places by design — the dropdown options list (`[id]/edit/page.tsx`, primary UX guard) and a server-side `parentPositionId === id` check (`updateJobPosition`, backstop) — not duplicated logic, two different layers of the same rule.
