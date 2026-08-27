# Plan Activity Management Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the twelfth real CRUD area on the ERD-derived schema, and the first entity in the Operations group — list, create, edit, and deactivate/reactivate `Activity` records with `status_code` hardcoded to `'P'` (Plan). Actual-recording (the `A` status, `plan_activity_id` linkage, `actual_*` fields) is explicitly out of scope — see the design spec's Non-goals.

**Architecture:** One migration (required fields, unique `code`, `active` column, grants/RLS for `activity` plus proactive grants for its two new dropdown-source lookup tables `timesheet_type`/`activity_status`), then the same Server Component + Server Action pattern proven many times over. `company_id`/`service_id`/`uom_code` are never shown on the form — all three derived server-side from the selected Contract Service via one query, extending the two-field derivation pattern (`PersonAccomodation`'s `lookupCompanyAndStaffTypeForPerson`) to three fields. `status_code` is hardcoded to `'P'` in the create action, never read from `formData`; the list page explicitly filters `.eq('status_code', 'P')` so it stays correct once a future feature starts writing `'A'` rows. The Subcontractor dropdown/column needs a nested embed (`subcontractors` has no name of its own — it's identified via its subcontracted company), a pattern not used before. `plan_remark` is this app's first `<textarea>` (the column is `varchar(1023)`, notably longer than every other text field).

**Tech Stack:** Next.js 16 App Router, React 19 (`useActionState`), `@supabase/ssr` server client, plain SQL migration applied via Supabase Studio's SQL editor.

## Global Constraints

- Required fields: Code (text, unique), Contract Service (dropdown), Timesheet Type (dropdown), Plan amount (number, decimals allowed), Plan date. Optional: Subcontractor (dropdown), Plan remark (textarea), Plan description (text).
- `company_id`/`service_id`/`uom_code` never appear on the form. Both `createPlanActivity` and `updatePlanActivity` look up the selected `contract_service_id`'s current `company_id`/`service_id`/`uom_code` server-side (ONE query, all three fields) and write them into the row.
- `status_code` is written as the literal string `'P'` in `createPlanActivity`, never read from `formData`, never present as a form field. `updatePlanActivity` does NOT touch `status_code` either (an update to an existing Plan row must stay a Plan row in this pass — there's no path to promote it to Actual yet).
- `mh_product_id`, `ss_type_code`, `plan_activity_id`, and every `actual_*` column are NEVER written by this feature — not in `createPlanActivity`, not in `updatePlanActivity`, not in the deactivate/reactivate actions. They stay whatever the DB default is (`null`).
- `active boolean not null default true` — Deactivate/Reactivate flips `active` only, never any other column.
- No new uniqueness constraint beyond `code` — nothing else in the ERD specifies one.
- Contract Service, Timesheet Type, and Subcontractor dropdowns show all rows regardless of status — same convention as every prior feature.
- `timesheet_type` and `activity_status` both currently have zero grants to `authenticated` and RLS disabled — this plan's Task 1 migration grants `select` on both proactively (checked live before this plan was written), so no follow-up fix is needed mid-build like it was for `sum_calc_type`/`staff_type`/`room_type`.
- `nav.ts` already has an "Activities" entry at `/activities` in the Operations group — no nav changes needed.
- The Subcontractor dropdown/list-column needs a NESTED embed: `subcontractors` has no `name`/`code` of its own, so display goes through to the subcontracted company: `subcontractors(company(name))`. This is a new pattern — every prior embed in this codebase has been one level deep.
- No automated test suite — verification is `npm run lint`, a production build, and manual checks against the running dev server.
- Migrations are applied by pasting the SQL into Supabase Studio's SQL editor by the project owner, never via `npx supabase db push` — verify afterward with `psql`.

---

### Task 1: Migration — required fields, unique code, active column, grants/RLS

**Files:**
- Create: `supabase/migrations/20260827000000_activity.sql`

**Interfaces:**
- Consumes: nothing — new migration on top of `supabase/migrations/20260826130000_clear_equipment_jetty_ship_product_test_rows.sql`.
- Produces: `timesheet_shorebase.activity` gains required-field constraints on `code`/`contract_service_id`/`timesheet_type_code`/`plan_amount`/`plan_date`, a unique constraint on `code`, and `active boolean not null default true`; `authenticated` can `select/insert/update`. `timesheet_type`/`activity_status` gain `select` grants. Tasks 2–5 depend on this being live.

- [ ] **Step 1: Write the migration**

Create `supabase/migrations/20260827000000_activity.sql`:

```sql
-- Adds Plan Activity's schema requirements: required-field constraints
-- for the fields this feature's form treats as mandatory, a unique
-- constraint on code, and the active-column convention (see CLAUDE.md).
-- status_code/company_id/service_id/uom_code stay nullable - status_code
-- is always written as 'P' by the app (never left to the user), and the
-- other three are derived server-side from the selected contract_service.
-- subcontractor_id/mh_product_id/ss_type_code/plan_activity_id and every
-- actual_* column stay untouched by this feature.
--
-- Also grants select on timesheet_type and activity_status up front -
-- both currently have zero grants to authenticated (checked via psql
-- before writing this migration), the same class of gap that had to be
-- fixed as a follow-up for several tables in prior features.

begin;

alter table timesheet_shorebase.activity
  alter column code set not null;
alter table timesheet_shorebase.activity
  alter column contract_service_id set not null;
alter table timesheet_shorebase.activity
  alter column timesheet_type_code set not null;
alter table timesheet_shorebase.activity
  alter column plan_amount set not null;
alter table timesheet_shorebase.activity
  alter column plan_date set not null;

alter table timesheet_shorebase.activity
  add constraint uq_activity_code unique (code);

alter table timesheet_shorebase.activity
  add column active boolean not null default true;

grant select, insert, update on timesheet_shorebase.activity to authenticated;

alter table timesheet_shorebase.activity enable row level security;

create policy "authenticated users can read/write activities"
  on timesheet_shorebase.activity
  for all
  to authenticated
  using (true)
  with check (true);

grant select on timesheet_shorebase.timesheet_type to authenticated;
grant select on timesheet_shorebase.activity_status to authenticated;

commit;
```

- [ ] **Step 2: Ask the project owner to apply the migration**

Paste the full contents into Supabase Studio's SQL editor and run it. Wait for confirmation before continuing.

- [ ] **Step 3: Verify against the real database**

```bash
source <(grep '^DATABASE_URL=' .env.local | sed 's/^/export /')
psql "$DATABASE_URL" -c "\d timesheet_shorebase.activity"
psql "$DATABASE_URL" -c "select grantee, privilege_type from information_schema.role_table_grants where table_schema = 'timesheet_shorebase' and table_name = 'activity' and grantee = 'authenticated' order by privilege_type;"
psql "$DATABASE_URL" -c "select policyname, cmd, roles from pg_policies where schemaname = 'timesheet_shorebase' and tablename = 'activity';"
psql "$DATABASE_URL" -c "select grantee, privilege_type from information_schema.role_table_grants where table_schema = 'timesheet_shorebase' and table_name in ('timesheet_type','activity_status') and grantee = 'authenticated';"
```

Expected:
- `code`/`contract_service_id`/`timesheet_type_code`/`plan_amount`/`plan_date`/`active` all `not null`, `active` defaults `true`, `uq_activity_code` unique constraint present. `status_code`/`company_id`/`service_id`/`uom_code`/`subcontractor_id`/`mh_product_id`/`ss_type_code`/`plan_activity_id` all remain nullable.
- Grants: `INSERT`/`SELECT`/`UPDATE` for `authenticated` on `activity`.
- One RLS policy on `activity`, `cmd = ALL`, `roles = {authenticated}`.
- `SELECT` for `authenticated` on both `timesheet_type` and `activity_status`.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260827000000_activity.sql
git commit -m "Add required fields, unique code, active column, and RLS for activity (Plan scope)"
```

---

### Task 2: Plan Activities list page

**Files:**
- Create: `src/app/(app)/activities/page.tsx`

**Interfaces:**
- Consumes: `createClient` from `@/lib/supabase/server`. Requires Task 1's migration to be live.
- Produces: the `PlanActivityRow` shape, declared in `page.tsx` only.

- [ ] **Step 1: Write the list page**

Create `src/app/(app)/activities/page.tsx`:

```tsx
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';

type PlanActivityRow = {
  id: number;
  code: string;
  active: boolean;
  plan_amount: number;
  plan_date: string;
  contract_service: { code: string } | null;
  timesheet_type: { name: string } | null;
  subcontractors: { company: { name: string } | null } | null;
};

export default async function ActivitiesPage() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('activity')
    .select(
      'id, code, active, plan_amount, plan_date, contract_service(code), timesheet_type(name), subcontractors(company(name))',
    )
    .eq('status_code', 'P')
    .order('plan_date', { ascending: true });

  const activities = (data ?? []) as unknown as PlanActivityRow[];

  return (
    <div className="px-6 py-8">
      <div className="flex items-center justify-between">
        <div>
          <p className="font-mono text-xs font-medium tracking-[0.2em] text-zinc-500 dark:text-zinc-400">
            OPERATIONS
          </p>
          <h2 className="mt-1 text-2xl font-semibold text-zinc-950 dark:text-zinc-50">
            Activities
          </h2>
        </div>
        <Link
          href="/activities/new"
          className="rounded-md bg-teal-700 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-teal-800 dark:bg-teal-600 dark:hover:bg-teal-500"
        >
          Add activity
        </Link>
      </div>

      {error && (
        <p role="alert" className="mt-4 text-sm text-red-600 dark:text-red-400">
          Couldn&apos;t load activities: {error.message}
        </p>
      )}

      {!error && activities.length === 0 && (
        <p className="mt-4 max-w-prose text-zinc-600 dark:text-zinc-400">
          No activities yet. Add your first one to get started.
        </p>
      )}

      {!error && activities.length > 0 && (
        <div className="mt-6 overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800">
          <table className="w-full text-sm">
            <thead className="border-b border-zinc-200 bg-zinc-50 text-left text-xs font-medium uppercase tracking-wide text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
              <tr>
                <th className="px-4 py-2">Code</th>
                <th className="px-4 py-2">Contract Service</th>
                <th className="px-4 py-2">Timesheet Type</th>
                <th className="px-4 py-2">Subcontractor</th>
                <th className="px-4 py-2">Plan amount</th>
                <th className="px-4 py-2">Plan date</th>
                <th className="px-4 py-2">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {activities.map((activity) => {
                const { active } = activity;
                return (
                  <tr key={activity.id}>
                    <td className="px-4 py-2 font-medium text-zinc-900 dark:text-zinc-100">
                      <Link href={`/activities/${activity.id}/edit`} className="hover:underline">
                        {activity.code}
                      </Link>
                    </td>
                    <td className="px-4 py-2 text-zinc-600 dark:text-zinc-400">
                      {activity.contract_service?.code ?? '—'}
                    </td>
                    <td className="px-4 py-2 text-zinc-600 dark:text-zinc-400">
                      {activity.timesheet_type?.name ?? '—'}
                    </td>
                    <td className="px-4 py-2 text-zinc-600 dark:text-zinc-400">
                      {activity.subcontractors?.company?.name ?? '—'}
                    </td>
                    <td className="px-4 py-2 text-zinc-600 dark:text-zinc-400">{activity.plan_amount}</td>
                    <td className="px-4 py-2 text-zinc-600 dark:text-zinc-400">{activity.plan_date}</td>
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

`contract_service(code)` and `timesheet_type(name)` are unaliased one-level embeds — `activity` has exactly one FK to each. `subcontractors(company(name))` is a NESTED two-level embed: `activity.subcontractor_id` → `subcontractors` (unaliased, target table name), then `subcontractors.company_id` → `company` (also unaliased, nested inside). This is the first two-level embed in this codebase; PostgREST supports arbitrary nesting as long as each level follows the same FK-target-table-name rule. `.eq('status_code', 'P')` is the explicit filter that keeps this list Plan-only regardless of what a future Actual-recording feature writes into the same table.

Eyebrow label is "OPERATIONS" — this is the first feature in the Operations nav group, a new eyebrow value (every prior feature has used "MASTER DATA" or "PEOPLE").

- [ ] **Step 2: Run lint and build**

```bash
npm run lint
npm run build
```

- [ ] **Step 3: Verify in the browser**

Navigate to `http://localhost:3000/activities`. Expected: the sidebar's existing "Activities" item now goes to a real page — no longer "Coming soon". Page shows "OPERATIONS / Activities", "Add activity" button, empty-state message.

- [ ] **Step 4: Commit**

```bash
git add "src/app/(app)/activities/page.tsx"
git commit -m "Add activities list page"
```

---

### Task 3: Create plan activity

**Files:**
- Create: `src/app/(app)/activities/actions.ts`
- Create: `src/app/(app)/activities/PlanActivityForm.tsx`
- Create: `src/app/(app)/activities/new/page.tsx`

**Interfaces:**
- Consumes: `createClient` from `@/lib/supabase/server`.
- Produces: `PlanActivityFormState = { error: string | null }`, `PlanActivity`, `ContractServiceOption = { id: number; code: string }`, `TimesheetTypeOption = { code: string; name: string }`, `SubcontractorOption = { id: number; company: { name: string } | null }` (all exported from `PlanActivityForm.tsx`, `PlanActivity` imported by Task 4's edit page). `createPlanActivity(prevState, formData): Promise<PlanActivityFormState>` exported from `actions.ts`. `PlanActivityForm({ activity?; contractServices; timesheetTypes; subcontractors; action; submitLabel })` exported from `PlanActivityForm.tsx`, reused by Task 4.

- [ ] **Step 1: Write the Server Actions file**

Create `src/app/(app)/activities/actions.ts`:

```ts
'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

export type PlanActivityFormState = {
  error: string | null;
};

async function lookupCompanyServiceUomForContractService(
  supabase: Awaited<ReturnType<typeof createClient>>,
  contractServiceId: number,
): Promise<{ companyId: number | null; serviceId: number | null; uomCode: string | null }> {
  const { data } = await supabase
    .from('contract_service')
    .select('company_id, service_id, uom_code')
    .eq('id', contractServiceId)
    .maybeSingle();
  return {
    companyId: data?.company_id ?? null,
    serviceId: data?.service_id ?? null,
    uomCode: data?.uom_code ?? null,
  };
}

export async function createPlanActivity(
  _prevState: PlanActivityFormState,
  formData: FormData,
): Promise<PlanActivityFormState> {
  const code = (formData.get('code') as string | null)?.trim();
  if (!code) {
    return { error: 'Code is required.' };
  }

  const contractServiceIdRaw = formData.get('contract_service_id') as string | null;
  const contractServiceId = contractServiceIdRaw ? Number(contractServiceIdRaw) : NaN;
  if (!contractServiceIdRaw || Number.isNaN(contractServiceId)) {
    return { error: 'Contract service is required.' };
  }

  const timesheetTypeCode = (formData.get('timesheet_type_code') as string | null)?.trim();
  if (!timesheetTypeCode) {
    return { error: 'Timesheet type is required.' };
  }

  const subcontractorIdRaw = (formData.get('subcontractor_id') as string | null)?.trim();
  const subcontractorId = subcontractorIdRaw ? Number(subcontractorIdRaw) : null;
  if (subcontractorIdRaw && Number.isNaN(subcontractorId)) {
    return { error: 'Subcontractor is invalid.' };
  }

  const planAmountRaw = (formData.get('plan_amount') as string | null)?.trim();
  const planAmount = planAmountRaw ? Number(planAmountRaw) : NaN;
  if (!planAmountRaw || !Number.isFinite(planAmount) || planAmount < 0) {
    return { error: 'Plan amount is required and must be a non-negative number.' };
  }

  const planDate = (formData.get('plan_date') as string | null)?.trim();
  if (!planDate) {
    return { error: 'Plan date is required.' };
  }

  const planRemark = (formData.get('plan_remark') as string | null)?.trim() || null;
  const planDescription = (formData.get('plan_description') as string | null)?.trim() || null;

  const supabase = await createClient();
  const { companyId, serviceId, uomCode } = await lookupCompanyServiceUomForContractService(
    supabase,
    contractServiceId,
  );

  const { error } = await supabase.from('activity').insert({
    code,
    status_code: 'P',
    contract_service_id: contractServiceId,
    timesheet_type_code: timesheetTypeCode,
    subcontractor_id: subcontractorId,
    company_id: companyId,
    service_id: serviceId,
    uom_code: uomCode,
    plan_amount: planAmount,
    plan_date: planDate,
    plan_remark: planRemark,
    plan_description: planDescription,
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath('/activities');
  redirect('/activities');
}
```

`status_code: 'P'` is a literal string, never derived from `formData` — this is the mechanism behind the "Plan scope" rule. `lookupCompanyServiceUomForContractService` extends the two-field derivation pattern (`PersonAccomodation`'s helper) to three fields, all sourced from one `contract_service` row.

- [ ] **Step 2: Write the shared form component**

Create `src/app/(app)/activities/PlanActivityForm.tsx`:

```tsx
'use client';

import { useActionState } from 'react';
import type { PlanActivityFormState } from './actions';

export type PlanActivity = {
  id: number;
  code: string;
  contract_service_id: number;
  timesheet_type_code: string;
  subcontractor_id: number | null;
  plan_amount: number;
  plan_date: string;
  plan_remark: string | null;
  plan_description: string | null;
};

export type ContractServiceOption = {
  id: number;
  code: string;
};

export type TimesheetTypeOption = {
  code: string;
  name: string;
};

export type SubcontractorOption = {
  id: number;
  company: { name: string } | null;
};

const initialState: PlanActivityFormState = { error: null };

export function PlanActivityForm({
  activity,
  contractServices,
  timesheetTypes,
  subcontractors,
  action,
  submitLabel,
}: {
  activity?: PlanActivity;
  contractServices: ContractServiceOption[];
  timesheetTypes: TimesheetTypeOption[];
  subcontractors: SubcontractorOption[];
  action: (prevState: PlanActivityFormState, formData: FormData) => Promise<PlanActivityFormState>;
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
          defaultValue={activity?.code}
          className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-950 focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-600/40 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
        />
      </div>

      <div className="space-y-1">
        <label htmlFor="contract_service_id" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Contract service
        </label>
        <select
          id="contract_service_id"
          name="contract_service_id"
          required
          defaultValue={activity?.contract_service_id ?? ''}
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
        <label htmlFor="timesheet_type_code" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Timesheet type
        </label>
        <select
          id="timesheet_type_code"
          name="timesheet_type_code"
          required
          defaultValue={activity?.timesheet_type_code ?? ''}
          className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-950 focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-600/40 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
        >
          <option value="" disabled>
            Select a timesheet type
          </option>
          {timesheetTypes.map((timesheetType) => (
            <option key={timesheetType.code} value={timesheetType.code}>
              {timesheetType.name}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-1">
        <label htmlFor="subcontractor_id" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Subcontractor
        </label>
        <select
          id="subcontractor_id"
          name="subcontractor_id"
          defaultValue={activity?.subcontractor_id ?? ''}
          className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-950 focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-600/40 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
        >
          <option value="">No subcontractor</option>
          {subcontractors.map((subcontractor) => (
            <option key={subcontractor.id} value={subcontractor.id}>
              {subcontractor.company?.name ?? `Subcontractor #${subcontractor.id}`}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-1">
        <label htmlFor="plan_amount" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Plan amount
        </label>
        <input
          id="plan_amount"
          name="plan_amount"
          type="number"
          step="any"
          min="0"
          required
          defaultValue={activity?.plan_amount}
          className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-950 focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-600/40 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
        />
      </div>

      <div className="space-y-1">
        <label htmlFor="plan_date" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Plan date
        </label>
        <input
          id="plan_date"
          name="plan_date"
          type="date"
          required
          defaultValue={activity?.plan_date}
          className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-950 focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-600/40 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
        />
      </div>

      <div className="space-y-1">
        <label htmlFor="plan_description" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Plan description
        </label>
        <input
          id="plan_description"
          name="plan_description"
          type="text"
          defaultValue={activity?.plan_description ?? ''}
          className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-950 focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-600/40 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
        />
      </div>

      <div className="space-y-1">
        <label htmlFor="plan_remark" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Plan remark
        </label>
        <textarea
          id="plan_remark"
          name="plan_remark"
          rows={3}
          defaultValue={activity?.plan_remark ?? ''}
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

`plan_remark` uses `<textarea>` — the first one in this codebase — matching the `className` styling pattern of every other field (just without the fixed single-line height). The Subcontractor select is optional (no `required`, blank option reads "No subcontractor" as real selectable text, same non-required-dropdown pattern as `JobPosition`'s Parent position). `plan_amount` uses `step="any"` since the column is `double precision`, not an integer count like `PersonAccomodation`/`PersonMeal`'s `count` field.

- [ ] **Step 3: Write the new-activity route**

Create `src/app/(app)/activities/new/page.tsx`:

```tsx
import { PlanActivityForm } from '../PlanActivityForm';
import { createPlanActivity } from '../actions';
import { createClient } from '@/lib/supabase/server';

export default async function NewActivityPage() {
  const supabase = await createClient();

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

  const { data: timesheetTypesData, error: timesheetTypesError } = await supabase
    .from('timesheet_type')
    .select('code, name')
    .order('name', { ascending: true });

  if (timesheetTypesError) {
    return (
      <div className="px-6 py-8">
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          Couldn&apos;t load timesheet types: {timesheetTypesError.message}
        </p>
      </div>
    );
  }

  const { data: subcontractorsData, error: subcontractorsError } = await supabase
    .from('subcontractors')
    .select('id, company(name)')
    .order('id', { ascending: true });

  if (subcontractorsError) {
    return (
      <div className="px-6 py-8">
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          Couldn&apos;t load subcontractors: {subcontractorsError.message}
        </p>
      </div>
    );
  }

  const contractServices = contractServicesData ?? [];
  const timesheetTypes = timesheetTypesData ?? [];
  const subcontractors = (subcontractorsData ?? []) as unknown as {
    id: number;
    company: { name: string } | null;
  }[];

  return (
    <div className="px-6 py-8">
      <p className="font-mono text-xs font-medium tracking-[0.2em] text-zinc-500 dark:text-zinc-400">
        OPERATIONS
      </p>
      <h2 className="mt-1 text-2xl font-semibold text-zinc-950 dark:text-zinc-50">
        Add activity
      </h2>
      <PlanActivityForm
        contractServices={contractServices}
        timesheetTypes={timesheetTypes}
        subcontractors={subcontractors}
        action={createPlanActivity}
        submitLabel="Create activity"
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

With the dev server running (and Task 1's migration confirmed live), check whether at least one `contract_service` row exists: `psql "$DATABASE_URL" -c "select count(*) from timesheet_shorebase.contract_service;"`. If it's 0, seed one via the app first (`/companies/new` → `/contracts/new` → `/services/new` → `/contract-services/new`, skipping any step whose table already has a usable row). A `subcontractors` row is optional for this test (the dropdown legitimately supports "No subcontractor").

Navigate to `http://localhost:3000/activities/new`, fill in the required fields (leave Subcontractor as "No subcontractor" for the first test), submit.

Expected: redirected to `/activities`, new row appears with the correct contract service code and timesheet type name. Verify `company_id`/`service_id`/`uom_code` were correctly derived: `psql "$DATABASE_URL" -c "select a.id, a.status_code, a.company_id, a.service_id, a.uom_code, cs.company_id as cs_company_id, cs.service_id as cs_service_id, cs.uom_code as cs_uom_code from timesheet_shorebase.activity a join timesheet_shorebase.contract_service cs on cs.id = a.contract_service_id;"` — all three pairs must match, and `status_code` must be `'P'`. Then test the unique `code` constraint (submit the same code again — confirm the inline Postgres unique-violation error via `state.error`, no crash). Then test the required-field validation (whitespace-only Code with everything else filled — confirm `{ error: 'Code is required.' }` and no redirect).

If a `subcontractors` row exists, also create a second activity WITH a subcontractor selected, and confirm the list page's Subcontractor column shows the subcontracted company's name (proving the nested `subcontractors(company(name))` embed works).

- [ ] **Step 6: Commit**

```bash
git add "src/app/(app)/activities/actions.ts" "src/app/(app)/activities/PlanActivityForm.tsx" "src/app/(app)/activities/new/page.tsx"
git commit -m "Add plan activity creation form and action"
```

---

### Task 4: Edit plan activity

**Files:**
- Modify: `src/app/(app)/activities/actions.ts`
- Create: `src/app/(app)/activities/[id]/edit/page.tsx`

**Interfaces:**
- Consumes: `PlanActivityForm`, `PlanActivity`, `ContractServiceOption`, `TimesheetTypeOption`, `SubcontractorOption` from `../../PlanActivityForm`; `PlanActivityFormState` from `../../actions`.
- Produces: `updatePlanActivity(id: number, prevState, formData): Promise<PlanActivityFormState>`, added to `actions.ts` alongside `createPlanActivity`. Task 5 adds `deactivateActivity`/`reactivateActivity` to this same file and a button to this same edit page.

- [ ] **Step 1: Add `updatePlanActivity` to the actions file**

In `src/app/(app)/activities/actions.ts`, add below `createPlanActivity`:

```ts
export async function updatePlanActivity(
  id: number,
  _prevState: PlanActivityFormState,
  formData: FormData,
): Promise<PlanActivityFormState> {
  const code = (formData.get('code') as string | null)?.trim();
  if (!code) {
    return { error: 'Code is required.' };
  }

  const contractServiceIdRaw = formData.get('contract_service_id') as string | null;
  const contractServiceId = contractServiceIdRaw ? Number(contractServiceIdRaw) : NaN;
  if (!contractServiceIdRaw || Number.isNaN(contractServiceId)) {
    return { error: 'Contract service is required.' };
  }

  const timesheetTypeCode = (formData.get('timesheet_type_code') as string | null)?.trim();
  if (!timesheetTypeCode) {
    return { error: 'Timesheet type is required.' };
  }

  const subcontractorIdRaw = (formData.get('subcontractor_id') as string | null)?.trim();
  const subcontractorId = subcontractorIdRaw ? Number(subcontractorIdRaw) : null;
  if (subcontractorIdRaw && Number.isNaN(subcontractorId)) {
    return { error: 'Subcontractor is invalid.' };
  }

  const planAmountRaw = (formData.get('plan_amount') as string | null)?.trim();
  const planAmount = planAmountRaw ? Number(planAmountRaw) : NaN;
  if (!planAmountRaw || !Number.isFinite(planAmount) || planAmount < 0) {
    return { error: 'Plan amount is required and must be a non-negative number.' };
  }

  const planDate = (formData.get('plan_date') as string | null)?.trim();
  if (!planDate) {
    return { error: 'Plan date is required.' };
  }

  const planRemark = (formData.get('plan_remark') as string | null)?.trim() || null;
  const planDescription = (formData.get('plan_description') as string | null)?.trim() || null;

  const supabase = await createClient();
  const { companyId, serviceId, uomCode } = await lookupCompanyServiceUomForContractService(
    supabase,
    contractServiceId,
  );

  const { error } = await supabase
    .from('activity')
    .update({
      code,
      contract_service_id: contractServiceId,
      timesheet_type_code: timesheetTypeCode,
      subcontractor_id: subcontractorId,
      company_id: companyId,
      service_id: serviceId,
      uom_code: uomCode,
      plan_amount: planAmount,
      plan_date: planDate,
      plan_remark: planRemark,
      plan_description: planDescription,
    })
    .eq('id', id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath('/activities');
  redirect('/activities');
}
```

Deliberately does NOT include `status_code` in the update payload — an existing Plan row stays a Plan row through this form, no path to change it here.

- [ ] **Step 2: Write the edit route**

Create `src/app/(app)/activities/[id]/edit/page.tsx`:

```tsx
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { PlanActivityForm, type PlanActivity } from '../../PlanActivityForm';
import { updatePlanActivity } from '../../actions';

export default async function EditActivityPage(props: PageProps<'/activities/[id]/edit'>) {
  const { id } = await props.params;
  const activityId = Number(id);

  if (Number.isNaN(activityId)) {
    notFound();
  }

  const supabase = await createClient();
  const { data: activity, error } = await supabase
    .from('activity')
    .select(
      'id, code, contract_service_id, timesheet_type_code, subcontractor_id, plan_amount, plan_date, plan_remark, plan_description, active',
    )
    .eq('id', activityId)
    .eq('status_code', 'P')
    .maybeSingle();

  if (error) {
    return (
      <div className="px-6 py-8">
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          Couldn&apos;t load activity: {error.message}
        </p>
      </div>
    );
  }

  if (!activity) {
    notFound();
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

  const { data: timesheetTypesData, error: timesheetTypesError } = await supabase
    .from('timesheet_type')
    .select('code, name')
    .order('name', { ascending: true });

  if (timesheetTypesError) {
    return (
      <div className="px-6 py-8">
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          Couldn&apos;t load timesheet types: {timesheetTypesError.message}
        </p>
      </div>
    );
  }

  const { data: subcontractorsData, error: subcontractorsError } = await supabase
    .from('subcontractors')
    .select('id, company(name)')
    .order('id', { ascending: true });

  if (subcontractorsError) {
    return (
      <div className="px-6 py-8">
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          Couldn&apos;t load subcontractors: {subcontractorsError.message}
        </p>
      </div>
    );
  }

  const contractServices = contractServicesData ?? [];
  const timesheetTypes = timesheetTypesData ?? [];
  const subcontractors = (subcontractorsData ?? []) as unknown as {
    id: number;
    company: { name: string } | null;
  }[];

  const updatePlanActivityWithId = updatePlanActivity.bind(null, activityId);

  return (
    <div className="px-6 py-8">
      <p className="font-mono text-xs font-medium tracking-[0.2em] text-zinc-500 dark:text-zinc-400">
        OPERATIONS
      </p>
      <h2 className="mt-1 text-2xl font-semibold text-zinc-950 dark:text-zinc-50">
        Edit activity
      </h2>
      <PlanActivityForm
        activity={activity as PlanActivity}
        contractServices={contractServices}
        timesheetTypes={timesheetTypes}
        subcontractors={subcontractors}
        action={updatePlanActivityWithId}
        submitLabel="Save changes"
      />
    </div>
  );
}
```

The `.eq('status_code', 'P')` on the fetch means this edit page 404s on any future Actual (`'A'`) row's id too — correct, since this feature has no business editing Actual rows. No Deactivate/Reactivate button yet — that's Task 5.

- [ ] **Step 3: Run lint and build**

```bash
npm run lint
npm run build
```

- [ ] **Step 4: Verify in the browser**

Navigate to `/activities`, click the row from Task 3. Confirm the form pre-fills correctly (including Subcontractor showing "No subcontractor" or the correct company name). Change the Code and submit — confirm the change shows on `/activities`. Confirm `/activities/999999/edit` renders a 404.

- [ ] **Step 5: Commit**

```bash
git add "src/app/(app)/activities/actions.ts" "src/app/(app)/activities/[id]/edit/page.tsx"
git commit -m "Add plan activity edit form and action"
```

---

### Task 5: Deactivate and reactivate

**Files:**
- Modify: `src/app/(app)/activities/actions.ts`
- Modify: `src/app/(app)/activities/[id]/edit/page.tsx`

**Interfaces:**
- Consumes: the `updatePlanActivityWithId` `.bind(null, id)` pattern from Task 4.
- Produces: `deactivateActivity(id): Promise<void>`, `reactivateActivity(id): Promise<void>`.

- [ ] **Step 1: Add the two actions**

In `src/app/(app)/activities/actions.ts`, add below `updatePlanActivity`:

```ts
export async function deactivateActivity(id: number) {
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
    throw new Error('Activity not found.');
  }

  revalidatePath('/activities');
  revalidatePath(`/activities/${id}/edit`);
}

export async function reactivateActivity(id: number) {
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
    throw new Error('Activity not found.');
  }

  revalidatePath('/activities');
  revalidatePath(`/activities/${id}/edit`);
}
```

**Critical constraint**: these must ONLY touch `active` — never `status_code`, `plan_activity_id`, or any other column.

- [ ] **Step 2: Add the button to the edit page**

In `src/app/(app)/activities/[id]/edit/page.tsx`:

```tsx
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { PlanActivityForm, type PlanActivity } from '../../PlanActivityForm';
import { updatePlanActivity, deactivateActivity, reactivateActivity } from '../../actions';
```

Replace the `updatePlanActivityWithId` line and everything below with:

```tsx
  const { active } = activity;
  const updatePlanActivityWithId = updatePlanActivity.bind(null, activityId);
  const deactivateActivityWithId = deactivateActivity.bind(null, activityId);
  const reactivateActivityWithId = reactivateActivity.bind(null, activityId);

  return (
    <div className="px-6 py-8">
      <p className="font-mono text-xs font-medium tracking-[0.2em] text-zinc-500 dark:text-zinc-400">
        OPERATIONS
      </p>
      <div className="mt-1 flex items-center justify-between">
        <h2 className="text-2xl font-semibold text-zinc-950 dark:text-zinc-50">
          Edit activity
        </h2>
        <form action={active ? deactivateActivityWithId : reactivateActivityWithId}>
          <button
            type="submit"
            className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-900"
          >
            {active ? 'Deactivate' : 'Reactivate'}
          </button>
        </form>
      </div>
      <PlanActivityForm
        activity={activity as PlanActivity}
        contractServices={contractServices}
        timesheetTypes={timesheetTypes}
        subcontractors={subcontractors}
        action={updatePlanActivityWithId}
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

Note the activity's current field values and derived `company_id`/`service_id`/`uom_code` (via the Task 3 `psql` join query). Deactivate → confirm "Inactive" on `/activities` → Reactivate → confirm "Active" again, with every other field (including the three derived ones and `status_code`) unchanged throughout — verify via `psql`.

- [ ] **Step 5: Commit**

```bash
git add "src/app/(app)/activities/actions.ts" "src/app/(app)/activities/[id]/edit/page.tsx"
git commit -m "Add plan activity deactivate/reactivate actions"
```

---

## Self-Review Notes

- **Spec coverage:** required-field constraints + unique `code` + `active` column + grants/RLS for `activity`, plus proactive `timesheet_type`/`activity_status` grants, all in Task 1 ✓. No nav changes — confirmed `nav.ts` already has an "Activities" placeholder. List page filtered to `status_code = 'P'`, "OPERATIONS" eyebrow ✓ (Task 2). `company_id`/`service_id`/`uom_code` never on the form, always derived server-side via one query ✓ (Task 3's `lookupCompanyServiceUomForContractService`, reused unchanged by Task 4). `status_code` hardcoded `'P'` on create, never touched on update ✓. `mh_product_id`/`ss_type_code`/`plan_activity_id`/`actual_*` never written anywhere in this feature ✓ (confirmed absent from both insert and update payloads). Nested `subcontractors(company(name))` embed used consistently in the list page and both dropdown-source fetches ✓. Deactivate/Reactivate flips `active` only ✓ (Task 5).
- **Placeholder scan:** none — every step has complete, runnable code.
- **Type consistency:** `PlanActivity` (id/code/contract_service_id/timesheet_type_code/subcontractor_id/plan_amount/plan_date/plan_remark/plan_description) defined once in `PlanActivityForm.tsx`, imported by the edit page — deliberately excludes `active` (destructured from the raw fetched row, matching every prior status field's handling) and `status_code` (never exposed to the form at all). `ContractServiceOption`/`TimesheetTypeOption`/`SubcontractorOption` defined once in `PlanActivityForm.tsx`, used by both `new/page.tsx` and `[id]/edit/page.tsx`. `PlanActivityFormState` defined once in `actions.ts`. `createPlanActivity`'s `(prevState, formData)` and `updatePlanActivity`'s `(id, prevState, formData)` match `PlanActivityForm`'s `action` prop typing and the edit page's `.bind(null, id)` usage. `deactivateActivity`/`reactivateActivity` take only `id`, matching the proven shape. `lookupCompanyServiceUomForContractService` defined once, called identically by both create and update.
