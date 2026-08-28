# Actual Activity Management Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the fifteenth real CRUD area on the ERD-derived schema, completing `Activity`'s Plan/Actual duality — list, create, edit, and deactivate/reactivate `status_code = 'A'` rows, each linked to the Plan row it fulfills via `plan_activity_id`.

**Architecture:** One migration (relax `code`'s uniqueness from `unique(code)` to `unique(code, status_code)`, since a Plan row and its Actual now deliberately share a `code`). Then the same Server Component + Server Action pattern proven many times over, extended to its largest derivation yet: `lookupActivitySnapshotFromPlan` reads SEVEN fields (`code`, `contract_service_id`, `timesheet_type_code`, `subcontractor_id`, `company_id`, `service_id`, `uom_code`) off the selected Plan Activity and writes all seven into the Actual row — the only field the user actually picks is which Plan Activity to link. `status_code` is hardcoded `'A'`, mirroring `Plan Activity`'s own `'P'` hardcoding. The list page needs a self-referential embed (`activity` embedding `activity` via `plan_activity_id`) — this is the ONE documented exception to this codebase's "no alias needed" embed convention; see the Global Constraints below before writing that query. New "Actual Activities" nav entry in Operations, after "Activities."

**Tech Stack:** Next.js 16 App Router, React 19 (`useActionState`), `@supabase/ssr` server client, plain SQL migration applied via Supabase Studio's SQL editor.

## Global Constraints

- Required fields: Plan Activity (dropdown). Actual amount (number, decimals allowed). Optional: Actual remark (textarea), Actual description (text).
- `code`/`contract_service_id`/`timesheet_type_code`/`subcontractor_id`/`company_id`/`service_id`/`uom_code` never appear on the form. Both `createActualActivity` and `updateActualActivity` look up the selected `plan_activity_id`'s current values for all seven server-side (ONE query) and write them into the row.
- `status_code` is written as the literal string `'A'` in `createActualActivity`, never read from `formData`. `updateActualActivity` does NOT touch `status_code` either — an existing Actual row stays an Actual row through this form.
- `plan_activity_id` IS a form field (the "Plan Activity" dropdown) — the one user-chosen value everything else derives from. If it's changed on an edit, all seven derived fields re-snapshot from whichever Plan is now selected.
- **THE SELF-REFERENTIAL EMBED EXCEPTION — read this before writing the list page query.** `activity.plan_activity_id` points at `activity` itself. Every other embed in this codebase resolves by target-table-name with NO alias, because that's sufficient to disambiguate when there's exactly one FK to that target. Self-joins are different: PostgREST requires an explicit alias + FK hint for a self-referencing embed regardless of FK count, because the target table name is literally identical to the base query's own table name. The correct, REQUIRED syntax here is:
  ```
  plan_activity:plan_activity_id(code)
  ```
  Do NOT write a bare `activity(code)` by analogy with every other embed in this plan/codebase — that would be ambiguous/incorrect for a self-join specifically. This is the first embed alias used anywhere in this app, and it is correct precisely because this is the one self-referential case.
- `active boolean not null default true` — Deactivate/Reactivate flips `active` only, never any of the seven derived fields, `status_code`, `plan_activity_id`, or the `actual_*` fields.
- No new uniqueness beyond the relaxed `(code, status_code)` pair — a Plan row may have multiple Actuals linked to it, no enforcement otherwise.
- The Plan Activity dropdown shows ALL `status_code = 'P'` rows regardless of their own `active` status — same convention as every prior feature.
- `nav.ts` has no existing placeholder — add a new entry to the Operations group, after `Activities`: `{ label: 'Actual Activities', icon: <pick an unused lucide-react icon>, href: '/actual-activities' }`.
- No automated test suite — verification is `npm run lint`, a production build, and manual checks against the running dev server.
- Migrations are applied by pasting the SQL into Supabase Studio's SQL editor by the project owner, never via `npx supabase db push` — verify afterward with `psql`.

---

### Task 1: Migration + nav.ts — relax activity.code uniqueness, add Actual Activities nav entry

**Files:**
- Create: `supabase/migrations/20260827040000_actual_activity.sql`
- Modify: `src/components/app-shell/nav.ts`

- [ ] **Step 1: Write the migration**

Create `supabase/migrations/20260827040000_actual_activity.sql`:

```sql
-- Relaxes activity.code's uniqueness from unique(code) to unique(code,
-- status_code), so an Actual row can share its linked Plan row's code
-- (confirmed with the project owner: an Actual represents the real-world
-- execution of that specific Plan line item, not a separate identity).
-- Still prevents two Plan rows, or two Actual rows, from sharing a code.

begin;

alter table timesheet_shorebase.activity
  drop constraint uq_activity_code;

alter table timesheet_shorebase.activity
  add constraint uq_activity_code_status unique (code, status_code);

commit;
```

- [ ] **Step 2: Ask the project owner to apply the migration**

Paste the full contents into Supabase Studio's SQL editor and run it. Wait for confirmation before continuing.

- [ ] **Step 3: Verify against the real database**

```bash
source <(grep '^DATABASE_URL=' .env.local | sed 's/^/export /')
psql "$DATABASE_URL" -c "\d timesheet_shorebase.activity"
```

Expected: `uq_activity_code` is gone, replaced by `uq_activity_code_status` as a unique constraint on `(code, status_code)`.

- [ ] **Step 4: Update the nav**

In `src/components/app-shell/nav.ts`, add ONE new icon to the `lucide-react` import — pick something distinct from every icon already used in this file (check the existing import list first; do not reuse `Activity`, which is already `Activities`' icon) that reasonably represents "a completed/actual record" (e.g. `CheckCircle2`, `ClipboardCheck`, or similar — verify the name actually exists in the installed `lucide-react` version before using it, e.g. via `node -e "console.log('IconName' in require('lucide-react'))"`). Keep the import list alphabetically sorted.

In the Operations group, append one entry after `Activities`:

```ts
{ label: 'Actual Activities', icon: <ChosenIcon>, href: '/actual-activities' },
```

- [ ] **Step 5: Run lint and build**

```bash
npm run lint
npm run build
```

- [ ] **Step 6: Verify in the browser**

Navigate to `http://localhost:3000`. Confirm the Operations group now shows "Actual Activities" after "Activities" (still "Coming soon").

- [ ] **Step 7: Commit**

```bash
git add supabase/migrations/20260827040000_actual_activity.sql "src/components/app-shell/nav.ts"
git commit -m "Relax activity.code uniqueness to (code, status_code) and add Actual Activities nav entry"
```

---

### Task 2: Actual Activities list page

**Files:**
- Create: `src/app/(app)/actual-activities/page.tsx`

**Interfaces:**
- Consumes: `createClient` from `@/lib/supabase/server`. Requires Task 1's migration to be live.
- Produces: the `ActualActivityRow` shape, declared in `page.tsx` only.

- [ ] **Step 1: Write the list page**

Create `src/app/(app)/actual-activities/page.tsx`:

```tsx
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';

type ActualActivityRow = {
  id: number;
  active: boolean;
  actual_amount: number;
  plan_activity: { code: string } | null;
};

export default async function ActualActivitiesPage() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('activity')
    .select('id, active, actual_amount, plan_activity:plan_activity_id(code)')
    .eq('status_code', 'A')
    .order('id', { ascending: true });

  const actualActivities = (data ?? []) as unknown as ActualActivityRow[];

  return (
    <div className="px-6 py-8">
      <div className="flex items-center justify-between">
        <div>
          <p className="font-mono text-xs font-medium tracking-[0.2em] text-zinc-500 dark:text-zinc-400">
            OPERATIONS
          </p>
          <h2 className="mt-1 text-2xl font-semibold text-zinc-950 dark:text-zinc-50">
            Actual Activities
          </h2>
        </div>
        <Link
          href="/actual-activities/new"
          className="rounded-md bg-teal-700 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-teal-800 dark:bg-teal-600 dark:hover:bg-teal-500"
        >
          Add actual activity
        </Link>
      </div>

      {error && (
        <p role="alert" className="mt-4 text-sm text-red-600 dark:text-red-400">
          Couldn&apos;t load actual activities: {error.message}
        </p>
      )}

      {!error && actualActivities.length === 0 && (
        <p className="mt-4 max-w-prose text-zinc-600 dark:text-zinc-400">
          No actual activities yet. Add your first one to get started.
        </p>
      )}

      {!error && actualActivities.length > 0 && (
        <div className="mt-6 overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800">
          <table className="w-full text-sm">
            <thead className="border-b border-zinc-200 bg-zinc-50 text-left text-xs font-medium uppercase tracking-wide text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
              <tr>
                <th className="px-4 py-2">Plan Activity</th>
                <th className="px-4 py-2">Actual amount</th>
                <th className="px-4 py-2">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {actualActivities.map((actualActivity) => {
                const { active } = actualActivity;
                return (
                  <tr key={actualActivity.id}>
                    <td className="px-4 py-2 font-medium text-zinc-900 dark:text-zinc-100">
                      <Link href={`/actual-activities/${actualActivity.id}/edit`} className="hover:underline">
                        {actualActivity.plan_activity?.code ?? '—'}
                      </Link>
                    </td>
                    <td className="px-4 py-2 text-zinc-600 dark:text-zinc-400">{actualActivity.actual_amount}</td>
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

`plan_activity:plan_activity_id(code)` is the self-referential embed exception explained in the Global Constraints above — an ALIASED embed keyed directly by the FK column name (no target-table prefix), unlike every other embed in this codebase. Do not remove the alias or rewrite this as `activity!plan_activity_id(code)` — that form resolves as the reverse one-to-many direction instead of the forward parent lookup. Ordered by `id` ascending — there's no date column on Actual rows to order by (unlike `Plan Activity`'s `plan_date`). Eyebrow label is "OPERATIONS".

- [ ] **Step 2: Run lint and build**

```bash
npm run lint
npm run build
```

- [ ] **Step 3: Verify in the browser**

Navigate to `http://localhost:3000/actual-activities`. Expected: the sidebar's new "Actual Activities" item now goes to a real page — no longer "Coming soon". Page shows "OPERATIONS / Actual Activities", "Add actual activity" button, empty-state message.

- [ ] **Step 4: Commit**

```bash
git add "src/app/(app)/actual-activities/page.tsx"
git commit -m "Add actual activities list page"
```

---

### Task 3: Create actual activity

**Files:**
- Create: `src/app/(app)/actual-activities/actions.ts`
- Create: `src/app/(app)/actual-activities/ActualActivityForm.tsx`
- Create: `src/app/(app)/actual-activities/new/page.tsx`

**Interfaces:**
- Consumes: `createClient` from `@/lib/supabase/server`.
- Produces: `ActualActivityFormState = { error: string | null }`, `ActualActivity`, `PlanActivityOption = { id: number; code: string }` (all exported from `ActualActivityForm.tsx`). `createActualActivity(prevState, formData): Promise<ActualActivityFormState>` exported from `actions.ts`.

- [ ] **Step 1: Write the Server Actions file**

Create `src/app/(app)/actual-activities/actions.ts`:

```ts
'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

export type ActualActivityFormState = {
  error: string | null;
};

async function lookupActivitySnapshotFromPlan(
  supabase: Awaited<ReturnType<typeof createClient>>,
  planActivityId: number,
): Promise<{
  code: string | null;
  contractServiceId: number | null;
  timesheetTypeCode: string | null;
  subcontractorId: number | null;
  companyId: number | null;
  serviceId: number | null;
  uomCode: string | null;
}> {
  const { data } = await supabase
    .from('activity')
    .select('code, contract_service_id, timesheet_type_code, subcontractor_id, company_id, service_id, uom_code')
    .eq('id', planActivityId)
    .maybeSingle();
  return {
    code: data?.code ?? null,
    contractServiceId: data?.contract_service_id ?? null,
    timesheetTypeCode: data?.timesheet_type_code ?? null,
    subcontractorId: data?.subcontractor_id ?? null,
    companyId: data?.company_id ?? null,
    serviceId: data?.service_id ?? null,
    uomCode: data?.uom_code ?? null,
  };
}

export async function createActualActivity(
  _prevState: ActualActivityFormState,
  formData: FormData,
): Promise<ActualActivityFormState> {
  const planActivityIdRaw = formData.get('plan_activity_id') as string | null;
  const planActivityId = planActivityIdRaw ? Number(planActivityIdRaw) : NaN;
  if (!planActivityIdRaw || Number.isNaN(planActivityId)) {
    return { error: 'Plan activity is required.' };
  }

  const actualAmountRaw = (formData.get('actual_amount') as string | null)?.trim();
  const actualAmount = actualAmountRaw ? Number(actualAmountRaw) : NaN;
  if (!actualAmountRaw || !Number.isFinite(actualAmount) || actualAmount < 0) {
    return { error: 'Actual amount is required and must be a non-negative number.' };
  }

  const actualRemark = (formData.get('actual_remark') as string | null)?.trim() || null;
  const actualDescription = (formData.get('actual_description') as string | null)?.trim() || null;

  const supabase = await createClient();
  const snapshot = await lookupActivitySnapshotFromPlan(supabase, planActivityId);

  const { error } = await supabase.from('activity').insert({
    status_code: 'A',
    plan_activity_id: planActivityId,
    code: snapshot.code,
    contract_service_id: snapshot.contractServiceId,
    timesheet_type_code: snapshot.timesheetTypeCode,
    subcontractor_id: snapshot.subcontractorId,
    company_id: snapshot.companyId,
    service_id: snapshot.serviceId,
    uom_code: snapshot.uomCode,
    actual_amount: actualAmount,
    actual_remark: actualRemark,
    actual_description: actualDescription,
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath('/actual-activities');
  redirect('/actual-activities');
}
```

`lookupActivitySnapshotFromPlan` is the largest derivation helper in this codebase — 7 fields from one source row, extending `PlanActivity`'s own 3-field helper (`company_id`/`service_id`/`uom_code` from `contract_service`) by also carrying forward `code`/`contract_service_id`/`timesheet_type_code`/`subcontractor_id` from the Plan row itself.

- [ ] **Step 2: Write the shared form component**

Create `src/app/(app)/actual-activities/ActualActivityForm.tsx`:

```tsx
'use client';

import { useActionState } from 'react';
import type { ActualActivityFormState } from './actions';

export type ActualActivity = {
  id: number;
  plan_activity_id: number;
  actual_amount: number;
  actual_remark: string | null;
  actual_description: string | null;
};

export type PlanActivityOption = {
  id: number;
  code: string;
};

const initialState: ActualActivityFormState = { error: null };

export function ActualActivityForm({
  actualActivity,
  planActivities,
  action,
  submitLabel,
}: {
  actualActivity?: ActualActivity;
  planActivities: PlanActivityOption[];
  action: (prevState: ActualActivityFormState, formData: FormData) => Promise<ActualActivityFormState>;
  submitLabel: string;
}) {
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="mt-6 max-w-md space-y-4">
      <div className="space-y-1">
        <label htmlFor="plan_activity_id" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Plan activity
        </label>
        <select
          id="plan_activity_id"
          name="plan_activity_id"
          required
          defaultValue={actualActivity?.plan_activity_id ?? ''}
          className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-950 focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-600/40 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
        >
          <option value="" disabled>
            Select a plan activity
          </option>
          {planActivities.map((planActivity) => (
            <option key={planActivity.id} value={planActivity.id}>
              {planActivity.code}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-1">
        <label htmlFor="actual_amount" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Actual amount
        </label>
        <input
          id="actual_amount"
          name="actual_amount"
          type="number"
          step="any"
          min="0"
          required
          defaultValue={actualActivity?.actual_amount}
          className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-950 focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-600/40 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
        />
      </div>

      <div className="space-y-1">
        <label htmlFor="actual_description" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Actual description
        </label>
        <input
          id="actual_description"
          name="actual_description"
          type="text"
          defaultValue={actualActivity?.actual_description ?? ''}
          className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-950 focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-600/40 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
        />
      </div>

      <div className="space-y-1">
        <label htmlFor="actual_remark" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Actual remark
        </label>
        <textarea
          id="actual_remark"
          name="actual_remark"
          rows={3}
          defaultValue={actualActivity?.actual_remark ?? ''}
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

No controlled fields, no `useState` — plain `defaultValue` throughout, including a second `<textarea>` in this codebase (after `PlanActivityForm`'s `plan_remark`).

- [ ] **Step 3: Write the new-actual-activity route**

Create `src/app/(app)/actual-activities/new/page.tsx`:

```tsx
import { ActualActivityForm } from '../ActualActivityForm';
import { createActualActivity } from '../actions';
import { createClient } from '@/lib/supabase/server';

export default async function NewActualActivityPage() {
  const supabase = await createClient();

  const { data: planActivitiesData, error: planActivitiesError } = await supabase
    .from('activity')
    .select('id, code')
    .eq('status_code', 'P')
    .order('code', { ascending: true });

  if (planActivitiesError) {
    return (
      <div className="px-6 py-8">
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          Couldn&apos;t load plan activities: {planActivitiesError.message}
        </p>
      </div>
    );
  }

  const planActivities = planActivitiesData ?? [];

  return (
    <div className="px-6 py-8">
      <p className="font-mono text-xs font-medium tracking-[0.2em] text-zinc-500 dark:text-zinc-400">
        OPERATIONS
      </p>
      <h2 className="mt-1 text-2xl font-semibold text-zinc-950 dark:text-zinc-50">
        Add actual activity
      </h2>
      <ActualActivityForm
        planActivities={planActivities}
        action={createActualActivity}
        submitLabel="Create actual activity"
      />
    </div>
  );
}
```

This is a PLAIN (non-embedded) query for the dropdown source, unlike Task 2's list-page query — fetching Plan Activities directly `.from('activity').select('id, code').eq('status_code', 'P')` needs no self-embed at all, since it's not joining `activity` to itself, just filtering it.

- [ ] **Step 4: Run lint and build**

```bash
npm run lint
npm run build
```

- [ ] **Step 5: Verify in the browser**

With the dev server running (and Task 1's migration confirmed live), check whether at least one `status_code = 'P'` activity row exists: `psql "$DATABASE_URL" -c "select id, code from timesheet_shorebase.activity where status_code = 'P';"`. If it's 0, seed one via `/activities/new` first (needs a Contract Service — check `select count(*) from timesheet_shorebase.contract_service;` and seed the whole chain via `/companies/new` → `/contracts/new` → `/services/new` → `/contract-services/new` if empty, skipping any step whose table already has a usable row).

Navigate to `http://localhost:3000/actual-activities/new`, select the Plan Activity, fill in Actual amount, submit.

Expected: redirected to `/actual-activities`, new row appears showing the linked Plan's code. Verify all seven derived fields via `psql`: `psql "$DATABASE_URL" -c "select a.id, a.status_code, a.code, a.contract_service_id, a.timesheet_type_code, a.subcontractor_id, a.company_id, a.service_id, a.uom_code, p.code as plan_code, p.contract_service_id as plan_contract_service_id, p.timesheet_type_code as plan_timesheet_type_code, p.subcontractor_id as plan_subcontractor_id, p.company_id as plan_company_id, p.service_id as plan_service_id, p.uom_code as plan_uom_code from timesheet_shorebase.activity a join timesheet_shorebase.activity p on p.id = a.plan_activity_id where a.status_code = 'A';"` — every `a.*` column must exactly match its `plan_*` counterpart, and `a.status_code` must be `'A'`. Then test required-field validation: go back to `/actual-activities/new`, leave Actual amount blank with a Plan Activity selected — confirm `{ error: 'Actual amount is required and must be a non-negative number.' }` renders and no redirect occurs.

- [ ] **Step 6: Commit**

```bash
git add "src/app/(app)/actual-activities/actions.ts" "src/app/(app)/actual-activities/ActualActivityForm.tsx" "src/app/(app)/actual-activities/new/page.tsx"
git commit -m "Add actual activity creation form and action"
```

---

### Task 4: Edit actual activity

**Files:**
- Modify: `src/app/(app)/actual-activities/actions.ts`
- Create: `src/app/(app)/actual-activities/[id]/edit/page.tsx`

**Interfaces:**
- Consumes: `ActualActivityForm`, `ActualActivity`, `PlanActivityOption` from `../../ActualActivityForm`; `ActualActivityFormState` from `../../actions`.
- Produces: `updateActualActivity(id: number, prevState, formData): Promise<ActualActivityFormState>`, added to `actions.ts` alongside `createActualActivity`. Task 5 adds `deactivateActualActivity`/`reactivateActualActivity` to this same file and a button to this same edit page.

- [ ] **Step 1: Add `updateActualActivity` to the actions file**

In `src/app/(app)/actual-activities/actions.ts`, add below `createActualActivity`:

```ts
export async function updateActualActivity(
  id: number,
  _prevState: ActualActivityFormState,
  formData: FormData,
): Promise<ActualActivityFormState> {
  const planActivityIdRaw = formData.get('plan_activity_id') as string | null;
  const planActivityId = planActivityIdRaw ? Number(planActivityIdRaw) : NaN;
  if (!planActivityIdRaw || Number.isNaN(planActivityId)) {
    return { error: 'Plan activity is required.' };
  }

  const actualAmountRaw = (formData.get('actual_amount') as string | null)?.trim();
  const actualAmount = actualAmountRaw ? Number(actualAmountRaw) : NaN;
  if (!actualAmountRaw || !Number.isFinite(actualAmount) || actualAmount < 0) {
    return { error: 'Actual amount is required and must be a non-negative number.' };
  }

  const actualRemark = (formData.get('actual_remark') as string | null)?.trim() || null;
  const actualDescription = (formData.get('actual_description') as string | null)?.trim() || null;

  const supabase = await createClient();
  const snapshot = await lookupActivitySnapshotFromPlan(supabase, planActivityId);

  const { error } = await supabase
    .from('activity')
    .update({
      plan_activity_id: planActivityId,
      code: snapshot.code,
      contract_service_id: snapshot.contractServiceId,
      timesheet_type_code: snapshot.timesheetTypeCode,
      subcontractor_id: snapshot.subcontractorId,
      company_id: snapshot.companyId,
      service_id: snapshot.serviceId,
      uom_code: snapshot.uomCode,
      actual_amount: actualAmount,
      actual_remark: actualRemark,
      actual_description: actualDescription,
    })
    .eq('id', id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath('/actual-activities');
  redirect('/actual-activities');
}
```

Deliberately does NOT include `status_code` in the update payload — an existing Actual row stays an Actual row through this form. Re-derives all seven fields from whichever Plan is currently selected, same "always mirrors the current source" rule as every prior derivation.

- [ ] **Step 2: Write the edit route**

Create `src/app/(app)/actual-activities/[id]/edit/page.tsx`:

```tsx
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { ActualActivityForm, type ActualActivity } from '../../ActualActivityForm';
import { updateActualActivity } from '../../actions';

export default async function EditActualActivityPage(props: PageProps<'/actual-activities/[id]/edit'>) {
  const { id } = await props.params;
  const actualActivityId = Number(id);

  if (Number.isNaN(actualActivityId)) {
    notFound();
  }

  const supabase = await createClient();
  const { data: actualActivity, error } = await supabase
    .from('activity')
    .select('id, plan_activity_id, actual_amount, actual_remark, actual_description, active')
    .eq('id', actualActivityId)
    .eq('status_code', 'A')
    .maybeSingle();

  if (error) {
    return (
      <div className="px-6 py-8">
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          Couldn&apos;t load actual activity: {error.message}
        </p>
      </div>
    );
  }

  if (!actualActivity) {
    notFound();
  }

  const { data: planActivitiesData, error: planActivitiesError } = await supabase
    .from('activity')
    .select('id, code')
    .eq('status_code', 'P')
    .order('code', { ascending: true });

  if (planActivitiesError) {
    return (
      <div className="px-6 py-8">
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          Couldn&apos;t load plan activities: {planActivitiesError.message}
        </p>
      </div>
    );
  }

  const planActivities = planActivitiesData ?? [];

  const updateActualActivityWithId = updateActualActivity.bind(null, actualActivityId);

  return (
    <div className="px-6 py-8">
      <p className="font-mono text-xs font-medium tracking-[0.2em] text-zinc-500 dark:text-zinc-400">
        OPERATIONS
      </p>
      <h2 className="mt-1 text-2xl font-semibold text-zinc-950 dark:text-zinc-50">
        Edit actual activity
      </h2>
      <ActualActivityForm
        actualActivity={actualActivity as ActualActivity}
        planActivities={planActivities}
        action={updateActualActivityWithId}
        submitLabel="Save changes"
      />
    </div>
  );
}
```

`.eq('status_code', 'A')` on the fetch means this edit page correctly 404s on a Plan row's id too — symmetric with `Plan Activity`'s own edit page filtering out Actual rows. No Deactivate/Reactivate button yet — that's Task 5.

- [ ] **Step 3: Run lint and build**

```bash
npm run lint
npm run build
```

- [ ] **Step 4: Verify in the browser**

Navigate to `/actual-activities`, click the row from Task 3. Confirm the form pre-fills correctly (Plan Activity dropdown showing the linked Plan's code selected, Actual amount/description/remark correct). Change the Actual amount and submit — confirm the change shows on `/actual-activities`. Confirm `/actual-activities/999999/edit` renders a 404. Also confirm that navigating to the PLAN activity's own id under `/actual-activities/[id]/edit` (i.e. a Plan row's id, not an Actual row's) also renders a 404 — proving the `.eq('status_code', 'A')` filter is doing real work, not just coincidentally passing.

- [ ] **Step 5: Commit**

```bash
git add "src/app/(app)/actual-activities/actions.ts" "src/app/(app)/actual-activities/[id]/edit/page.tsx"
git commit -m "Add actual activity edit form and action"
```

---

### Task 5: Deactivate and reactivate

**Files:**
- Modify: `src/app/(app)/actual-activities/actions.ts`
- Modify: `src/app/(app)/actual-activities/[id]/edit/page.tsx`

**Interfaces:**
- Consumes: the `updateActualActivityWithId` `.bind(null, id)` pattern from Task 4.
- Produces: `deactivateActualActivity(id): Promise<void>`, `reactivateActualActivity(id): Promise<void>`.

- [ ] **Step 1: Add the two actions**

In `src/app/(app)/actual-activities/actions.ts`, add below `updateActualActivity`:

```ts
export async function deactivateActualActivity(id: number) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('activity')
    .update({ active: false })
    .eq('id', id)
    .select('id');

  if (error) {
    throw new Error(error.message);
  }
  if (!data || data.length === 0) {
    throw new Error('Actual activity not found.');
  }

  revalidatePath('/actual-activities');
  revalidatePath(`/actual-activities/${id}/edit`);
}

export async function reactivateActualActivity(id: number) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('activity')
    .update({ active: true })
    .eq('id', id)
    .select('id');

  if (error) {
    throw new Error(error.message);
  }
  if (!data || data.length === 0) {
    throw new Error('Actual activity not found.');
  }

  revalidatePath('/actual-activities');
  revalidatePath(`/actual-activities/${id}/edit`);
}
```

**Critical constraint**: these must ONLY touch `active` — never `status_code`, `plan_activity_id`, any of the seven derived fields, or any `actual_*` field.

- [ ] **Step 2: Add the button to the edit page**

In `src/app/(app)/actual-activities/[id]/edit/page.tsx`:

```tsx
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { ActualActivityForm, type ActualActivity } from '../../ActualActivityForm';
import { updateActualActivity, deactivateActualActivity, reactivateActualActivity } from '../../actions';
```

Replace the `updateActualActivityWithId` line and everything below with:

```tsx
  const { active } = actualActivity;
  const updateActualActivityWithId = updateActualActivity.bind(null, actualActivityId);
  const deactivateActualActivityWithId = deactivateActualActivity.bind(null, actualActivityId);
  const reactivateActualActivityWithId = reactivateActualActivity.bind(null, actualActivityId);

  return (
    <div className="px-6 py-8">
      <p className="font-mono text-xs font-medium tracking-[0.2em] text-zinc-500 dark:text-zinc-400">
        OPERATIONS
      </p>
      <div className="mt-1 flex items-center justify-between">
        <h2 className="text-2xl font-semibold text-zinc-950 dark:text-zinc-50">
          Edit actual activity
        </h2>
        <form action={active ? deactivateActualActivityWithId : reactivateActualActivityWithId}>
          <button
            type="submit"
            className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-900"
          >
            {active ? 'Deactivate' : 'Reactivate'}
          </button>
        </form>
      </div>
      <ActualActivityForm
        actualActivity={actualActivity as ActualActivity}
        planActivities={planActivities}
        action={updateActualActivityWithId}
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

Note the row's current field values and all seven derived fields (via the Task 3 `psql` join query). Deactivate → confirm "Inactive" on `/actual-activities` → Reactivate → confirm "Active" again, with `status_code`, `plan_activity_id`, all seven derived fields, and the `actual_*` fields completely unchanged throughout — verify via `psql`.

- [ ] **Step 5: Commit**

```bash
git add "src/app/(app)/actual-activities/actions.ts" "src/app/(app)/actual-activities/[id]/edit/page.tsx"
git commit -m "Add actual activity deactivate/reactivate actions"
```

---

## Self-Review Notes

- **Spec coverage:** `code` uniqueness relaxed to `(code, status_code)` ✓ (Task 1). New "Actual Activities" nav entry ✓ (Task 1). List page uses the self-referential embed exception correctly (aliased, hinted) ✓ (Task 2). All seven fields derived server-side from the selected Plan Activity via one query, `status_code` hardcoded `'A'` on create and untouched on update ✓ (Task 3's `lookupActivitySnapshotFromPlan`, reused unchanged by Task 4's `updateActualActivity`). Edit page's fetch filtered to `status_code = 'A'`, symmetric with Plan Activity's own `'P'` filter ✓ (Task 4). Deactivate/Reactivate flips `active` only ✓ (Task 5).
- **Placeholder scan:** none — every step has complete, runnable code, except Task 1's icon choice, deliberately left for the implementer to verify against the actual installed `lucide-react` package.
- **Type consistency:** `ActualActivity` (id/plan_activity_id/actual_amount/actual_remark/actual_description) defined once in `ActualActivityForm.tsx` — deliberately excludes `active`, same handling as every prior status field. `PlanActivityOption` defined once, used by both `new/page.tsx` and `[id]/edit/page.tsx`. `ActualActivityFormState` defined once in `actions.ts`. `createActualActivity`'s `(prevState, formData)` and `updateActualActivity`'s `(id, prevState, formData)` match `ActualActivityForm`'s `action` prop typing and the edit page's `.bind(null, id)` usage. `deactivateActualActivity`/`reactivateActualActivity` take only `id`. `lookupActivitySnapshotFromPlan` defined once, called identically by both create and update.
