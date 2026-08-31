# Approvals Management Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Full CRUD (list/create/edit/deactivate-reactivate) for `ApprovalWorkflow`, `ApprovalWorkflowStage`, and `Approval` — three flat, separately-navigable pages, `ApprovalWorkflowStage` linking to `ApprovalWorkflow` via dropdown, `Approval` linking to `ApprovalWorkflowStage` via dropdown. `Approval` is scoped to Timesheets only (see design spec's Non-goals).

**Architecture:** One migration for all three tables plus grants for the two already-seeded lookup tables (`approval_status`/`approval_type`), then `nav.ts` splits its single `/approvals` placeholder into three. One task per entity's entire CRUD surface, same granularity as Material Handling.

**Tech Stack:** Next.js 16 App Router, React 19 (`useActionState`), `@supabase/ssr` server client, plain SQL migration applied via Supabase Studio's SQL editor.

## Global Constraints

- `active boolean not null default true` on all three tables; Deactivate/Reactivate flips only that column.
- `approval_workflow`: `type_code`, `start_date`, `end_date` required; `timesheet_type_code`/`contract_id`/`subcontractor_id`/`company_id` optional.
- `approval_workflow_stage`: `workflow_id`, `level` required; `job_position_id`/`user_position_id` both optional, no XOR enforcement.
- `approval`: `workflow_stage_id`, `timesheet_id`, `status_code` required; `approver_user_id`/`approver_user_pos_id`/`remark` optional. `type_code` required at the DB level but ALWAYS written as the literal `'T'` by `createApproval`/`updateApproval` — never a form field. `summary_timesheet_id`/`proforma_invoice_id`/`invoice_id`/`signature_id` stay untouched (not on the form, no constraint added).
- `ApprovalWorkflow`/`ApprovalWorkflowStage` have no natural name/code column — list rows and dropdown options are labeled by composing available fields client-side: `Workflow #{id} ({type_code})` and `Level {level} — Workflow #{workflow_id}` respectively. This is plain string composition in the React component, not a PostgREST embed.
- Nav: replace the single `{ label: 'Approvals', icon: Stamp, href: '/approvals' }` placeholder in Approvals & Billing with three entries — **Approval Workflows** (`/approval-workflows`, new `Workflow` icon import), **Workflow Stages** (`/approval-workflow-stages`, new `ListOrdered` icon import), **Approvals** (`/approvals`, unchanged `Stamp` icon, same route). Both new icons confirmed to exist in the installed `lucide-react` version.
- Dropdown sources already granted to `authenticated` from prior features: `contract`, `subcontractors`, `company`, `job_position`, `user_position`, `app_user`, `timesheet`, `timesheet_type`. `approval_status`/`approval_type` currently have ZERO grants despite already holding real seed data — this migration must grant `select` on both. `approval`/`approval_workflow`/`approval_workflow_stage` also need full grants (they're brand new to this feature).
- No automated test suite — verification is `npm run lint`, a production build, and manual checks against the running dev server.
- Migrations are applied by pasting the SQL into Supabase Studio's SQL editor by the project owner, never via `npx supabase db push` — verify afterward with `psql`.

---

### Task 1: Migration + nav.ts

**Files:**
- Create: `supabase/migrations/20260828040000_approvals.sql`
- Modify: `src/components/app-shell/nav.ts`

- [ ] **Step 1: Write the migration**

Create `supabase/migrations/20260828040000_approvals.sql`:

```sql
-- Adds required-field constraints matching each of the three Approval
-- tables' forms, the active-column convention (see CLAUDE.md) for all
-- three, and read grants for approval_status/approval_type - two
-- lookup tables that already hold real seed data (Approved/Rejected;
-- Timesheet/Summary Timesheet/Proforma Invoice/Invoice) but had zero
-- grants to authenticated, checked via psql before writing this
-- migration (same recurring gotcha as sum_calc_type/staff_type/etc in
-- earlier features).

begin;

grant select on timesheet_shorebase.approval_status to authenticated;
grant select on timesheet_shorebase.approval_type to authenticated;

alter table timesheet_shorebase.approval_workflow
  alter column type_code set not null;
alter table timesheet_shorebase.approval_workflow
  alter column start_date set not null;
alter table timesheet_shorebase.approval_workflow
  alter column end_date set not null;
alter table timesheet_shorebase.approval_workflow
  add column active boolean not null default true;
grant select, insert, update on timesheet_shorebase.approval_workflow to authenticated;
alter table timesheet_shorebase.approval_workflow enable row level security;
create policy "authenticated users can read/write approval workflows"
  on timesheet_shorebase.approval_workflow for all to authenticated using (true) with check (true);

alter table timesheet_shorebase.approval_workflow_stage
  alter column workflow_id set not null;
alter table timesheet_shorebase.approval_workflow_stage
  alter column level set not null;
alter table timesheet_shorebase.approval_workflow_stage
  add column active boolean not null default true;
grant select, insert, update on timesheet_shorebase.approval_workflow_stage to authenticated;
alter table timesheet_shorebase.approval_workflow_stage enable row level security;
create policy "authenticated users can read/write approval workflow stages"
  on timesheet_shorebase.approval_workflow_stage for all to authenticated using (true) with check (true);

alter table timesheet_shorebase.approval
  alter column workflow_stage_id set not null;
alter table timesheet_shorebase.approval
  alter column timesheet_id set not null;
alter table timesheet_shorebase.approval
  alter column status_code set not null;
alter table timesheet_shorebase.approval
  alter column type_code set not null;
alter table timesheet_shorebase.approval
  add column active boolean not null default true;
grant select, insert, update on timesheet_shorebase.approval to authenticated;
alter table timesheet_shorebase.approval enable row level security;
create policy "authenticated users can read/write approvals"
  on timesheet_shorebase.approval for all to authenticated using (true) with check (true);

commit;
```

- [ ] **Step 2: Ask the project owner to apply the migration**

Paste the full contents into Supabase Studio's SQL editor and run it. Wait for confirmation before continuing.

- [ ] **Step 3: Verify against the real database**

```bash
source <(grep '^DATABASE_URL=' .env.local | sed 's/^/export /')
psql "$DATABASE_URL" -c "\d timesheet_shorebase.approval_workflow"
psql "$DATABASE_URL" -c "\d timesheet_shorebase.approval_workflow_stage"
psql "$DATABASE_URL" -c "\d timesheet_shorebase.approval"
psql "$DATABASE_URL" -c "select tablename, policyname, cmd, roles from pg_policies where schemaname = 'timesheet_shorebase' and tablename like 'approval%';"
psql "$DATABASE_URL" -c "select table_name, privilege_type from information_schema.role_table_grants where table_schema='timesheet_shorebase' and grantee='authenticated' and table_name in ('approval_status','approval_type');"
```

Expected: each table's required columns `not null`, `active` present defaulting `true`; three RLS policies (`approval_workflow`/`approval_workflow_stage`/`approval`), `cmd = ALL`, `roles = {authenticated}`; `approval_status`/`approval_type` each show a `SELECT` grant row.

- [ ] **Step 4: Update the nav**

In `src/components/app-shell/nav.ts`, add `Workflow` and `ListOrdered` to the `lucide-react` import (keep alphabetically sorted — `ListOrdered` goes between `Layers` and `LayoutDashboard`, `Workflow` goes after `Wrench`):

```ts
import {
  Activity,
  BedDouble,
  Building2,
  CalendarRange,
  ClipboardCheck,
  ClipboardList,
  Container,
  FileSignature,
  FileStack,
  HardHat,
  Handshake,
  Layers,
  LayoutDashboard,
  ListOrdered,
  Network,
  PackageSearch,
  Receipt,
  Settings2,
  Ship,
  Stamp,
  Tag,
  UserCheck,
  UserCog,
  UtensilsCrossed,
  Users,
  Workflow,
  Wrench,
  type LucideIcon,
} from 'lucide-react';
```

Replace the single Approvals placeholder in the Approvals & Billing group with three entries:

```ts
  {
    label: 'Approvals & Billing',
    items: [
      { label: 'Approval Workflows', icon: Workflow, href: '/approval-workflows' },
      { label: 'Workflow Stages', icon: ListOrdered, href: '/approval-workflow-stages' },
      { label: 'Approvals', icon: Stamp, href: '/approvals' },
      { label: 'Summary Timesheets', icon: FileStack, href: '/summary-timesheets' },
      { label: 'Invoices', icon: Receipt, href: '/invoices' },
    ],
  },
```

- [ ] **Step 5: Run lint and build**

```bash
npm run lint
npm run build
```

- [ ] **Step 6: Verify in the browser**

Navigate to `http://localhost:3000`. Confirm Approvals & Billing now shows "Approval Workflows", "Workflow Stages", "Approvals" (in that order, before "Summary Timesheets"), each still "Coming soon" until their real routes exist.

- [ ] **Step 7: Commit**

```bash
git add supabase/migrations/20260828040000_approvals.sql "src/components/app-shell/nav.ts"
git commit -m "Add approvals schema changes and split nav entry into three"
```

---

### Task 2: Approval Workflows — full CRUD

**Files:**
- Create: `src/app/(app)/approval-workflows/page.tsx`
- Create: `src/app/(app)/approval-workflows/actions.ts`
- Create: `src/app/(app)/approval-workflows/ApprovalWorkflowForm.tsx`
- Create: `src/app/(app)/approval-workflows/new/page.tsx`
- Create: `src/app/(app)/approval-workflows/[id]/edit/page.tsx`

**Interfaces:**
- Produces: `ApprovalWorkflowFormState = { error: string | null }`, `ApprovalWorkflow`, `ApprovalTypeOption`, `TimesheetTypeOption`, `ContractOption`, `SubcontractorOption`, `CompanyOption`, all in `ApprovalWorkflowForm.tsx`. `createApprovalWorkflow`, `updateApprovalWorkflow`, `deactivateApprovalWorkflow`, `reactivateApprovalWorkflow` in `actions.ts`.

- [ ] **Step 1: List page**

Create `src/app/(app)/approval-workflows/page.tsx`:

```tsx
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';

type ApprovalWorkflowRow = {
  id: number;
  type_code: string;
  start_date: string;
  end_date: string;
  active: boolean;
  timesheet_type: { name: string } | null;
  contract: { contract_name: string } | null;
  subcontractors: { company: { name: string } | null } | null;
  company: { name: string } | null;
};

export default async function ApprovalWorkflowsPage() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('approval_workflow')
    .select(
      'id, type_code, start_date, end_date, active, timesheet_type(name), contract(contract_name), subcontractors(company(name)), company(name)',
    )
    .order('id', { ascending: true });

  const workflows = (data ?? []) as unknown as ApprovalWorkflowRow[];

  return (
    <div className="px-6 py-8">
      <div className="flex items-center justify-between">
        <div>
          <p className="font-mono text-xs font-medium tracking-[0.2em] text-zinc-500 dark:text-zinc-400">
            APPROVALS &amp; BILLING
          </p>
          <h2 className="mt-1 text-2xl font-semibold text-zinc-950 dark:text-zinc-50">
            Approval Workflows
          </h2>
        </div>
        <Link
          href="/approval-workflows/new"
          className="rounded-md bg-teal-700 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-teal-800 dark:bg-teal-600 dark:hover:bg-teal-500"
        >
          Add workflow
        </Link>
      </div>

      {error && (
        <p role="alert" className="mt-4 text-sm text-red-600 dark:text-red-400">
          Couldn&apos;t load approval workflows: {error.message}
        </p>
      )}

      {!error && workflows.length === 0 && (
        <p className="mt-4 max-w-prose text-zinc-600 dark:text-zinc-400">
          No approval workflows yet. Add your first one to get started.
        </p>
      )}

      {!error && workflows.length > 0 && (
        <div className="mt-6 overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800">
          <table className="w-full text-sm">
            <thead className="border-b border-zinc-200 bg-zinc-50 text-left text-xs font-medium uppercase tracking-wide text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
              <tr>
                <th className="px-4 py-2">Workflow</th>
                <th className="px-4 py-2">Timesheet Type</th>
                <th className="px-4 py-2">Contract</th>
                <th className="px-4 py-2">Subcontractor</th>
                <th className="px-4 py-2">Company</th>
                <th className="px-4 py-2">Effective</th>
                <th className="px-4 py-2">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {workflows.map((workflow) => {
                const { active } = workflow;
                return (
                  <tr key={workflow.id}>
                    <td className="px-4 py-2 font-medium text-zinc-900 dark:text-zinc-100">
                      <Link href={`/approval-workflows/${workflow.id}/edit`} className="hover:underline">
                        Workflow #{workflow.id} ({workflow.type_code})
                      </Link>
                    </td>
                    <td className="px-4 py-2 text-zinc-600 dark:text-zinc-400">
                      {workflow.timesheet_type?.name ?? '—'}
                    </td>
                    <td className="px-4 py-2 text-zinc-600 dark:text-zinc-400">
                      {workflow.contract?.contract_name ?? '—'}
                    </td>
                    <td className="px-4 py-2 text-zinc-600 dark:text-zinc-400">
                      {workflow.subcontractors?.company?.name ?? '—'}
                    </td>
                    <td className="px-4 py-2 text-zinc-600 dark:text-zinc-400">
                      {workflow.company?.name ?? '—'}
                    </td>
                    <td className="px-4 py-2 text-zinc-600 dark:text-zinc-400">
                      {workflow.start_date} – {workflow.end_date}
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

- [ ] **Step 2: Actions**

Create `src/app/(app)/approval-workflows/actions.ts`:

```ts
'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

export type ApprovalWorkflowFormState = {
  error: string | null;
};

type ReadApprovalWorkflowFieldsResult =
  | { error: string }
  | {
      values: {
        type_code: string;
        start_date: string;
        end_date: string;
        timesheet_type_code: string | null;
        contract_id: number | null;
        subcontractor_id: number | null;
        company_id: number | null;
      };
    };

function readApprovalWorkflowFields(formData: FormData): ReadApprovalWorkflowFieldsResult {
  const typeCode = (formData.get('type_code') as string | null)?.trim();
  const startDate = (formData.get('start_date') as string | null) || null;
  const endDate = (formData.get('end_date') as string | null) || null;
  const timesheetTypeCodeRaw = (formData.get('timesheet_type_code') as string | null)?.trim();
  const contractIdRaw = formData.get('contract_id') as string | null;
  const subcontractorIdRaw = formData.get('subcontractor_id') as string | null;
  const companyIdRaw = formData.get('company_id') as string | null;

  if (!typeCode || !startDate || !endDate) {
    return { error: 'Type, start date, and end date are required.' };
  }

  const contractId = contractIdRaw ? Number(contractIdRaw) : null;
  const subcontractorId = subcontractorIdRaw ? Number(subcontractorIdRaw) : null;
  const companyId = companyIdRaw ? Number(companyIdRaw) : null;
  if (
    (contractId !== null && Number.isNaN(contractId)) ||
    (subcontractorId !== null && Number.isNaN(subcontractorId)) ||
    (companyId !== null && Number.isNaN(companyId))
  ) {
    return { error: 'Invalid contract, subcontractor, or company.' };
  }

  return {
    values: {
      type_code: typeCode,
      start_date: startDate,
      end_date: endDate,
      timesheet_type_code: timesheetTypeCodeRaw || null,
      contract_id: contractId,
      subcontractor_id: subcontractorId,
      company_id: companyId,
    },
  };
}

export async function createApprovalWorkflow(
  _prevState: ApprovalWorkflowFormState,
  formData: FormData,
): Promise<ApprovalWorkflowFormState> {
  const parsed = readApprovalWorkflowFields(formData);
  if ('error' in parsed) {
    return { error: parsed.error };
  }

  const supabase = await createClient();
  const { error } = await supabase.from('approval_workflow').insert(parsed.values);

  if (error) {
    return { error: error.message };
  }

  revalidatePath('/approval-workflows');
  redirect('/approval-workflows');
}

export async function updateApprovalWorkflow(
  id: number,
  _prevState: ApprovalWorkflowFormState,
  formData: FormData,
): Promise<ApprovalWorkflowFormState> {
  const parsed = readApprovalWorkflowFields(formData);
  if ('error' in parsed) {
    return { error: parsed.error };
  }

  const supabase = await createClient();
  const { error } = await supabase.from('approval_workflow').update(parsed.values).eq('id', id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath('/approval-workflows');
  redirect('/approval-workflows');
}

export async function deactivateApprovalWorkflow(id: number) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('approval_workflow')
    .update({ active: false })
    .eq('id', id)
    .select('id');

  if (error) {
    throw new Error(error.message);
  }
  if (!data || data.length === 0) {
    throw new Error('Approval workflow not found.');
  }

  revalidatePath('/approval-workflows');
  revalidatePath(`/approval-workflows/${id}/edit`);
}

export async function reactivateApprovalWorkflow(id: number) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('approval_workflow')
    .update({ active: true })
    .eq('id', id)
    .select('id');

  if (error) {
    throw new Error(error.message);
  }
  if (!data || data.length === 0) {
    throw new Error('Approval workflow not found.');
  }

  revalidatePath('/approval-workflows');
  revalidatePath(`/approval-workflows/${id}/edit`);
}
```

- [ ] **Step 3: Form component**

Create `src/app/(app)/approval-workflows/ApprovalWorkflowForm.tsx`:

```tsx
'use client';

import { useActionState } from 'react';
import type { ApprovalWorkflowFormState } from './actions';

export type ApprovalWorkflow = {
  id: number;
  type_code: string;
  start_date: string;
  end_date: string;
  timesheet_type_code: string | null;
  contract_id: number | null;
  subcontractor_id: number | null;
  company_id: number | null;
};

export type ApprovalTypeOption = { code: string; name: string };
export type TimesheetTypeOption = { code: string; name: string };
export type ContractOption = { id: number; contract_name: string };
export type SubcontractorOption = { id: number; company: { name: string } | null };
export type CompanyOption = { id: number; name: string };

const initialState: ApprovalWorkflowFormState = { error: null };

export function ApprovalWorkflowForm({
  workflow,
  approvalTypes,
  timesheetTypes,
  contracts,
  subcontractors,
  companies,
  action,
  submitLabel,
}: {
  workflow?: ApprovalWorkflow;
  approvalTypes: ApprovalTypeOption[];
  timesheetTypes: TimesheetTypeOption[];
  contracts: ContractOption[];
  subcontractors: SubcontractorOption[];
  companies: CompanyOption[];
  action: (prevState: ApprovalWorkflowFormState, formData: FormData) => Promise<ApprovalWorkflowFormState>;
  submitLabel: string;
}) {
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="mt-6 max-w-md space-y-4">
      <div className="space-y-1">
        <label htmlFor="type_code" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Type
        </label>
        <select
          id="type_code"
          name="type_code"
          required
          defaultValue={workflow?.type_code ?? ''}
          className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-950 focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-600/40 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
        >
          <option value="" disabled>
            Select a type
          </option>
          {approvalTypes.map((approvalType) => (
            <option key={approvalType.code} value={approvalType.code}>
              {approvalType.name}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-1">
        <label htmlFor="start_date" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Start date
        </label>
        <input
          id="start_date"
          name="start_date"
          type="date"
          required
          defaultValue={workflow?.start_date}
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
          defaultValue={workflow?.end_date}
          className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-950 focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-600/40 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
        />
      </div>

      <div className="space-y-1">
        <label htmlFor="timesheet_type_code" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Timesheet type
        </label>
        <select
          id="timesheet_type_code"
          name="timesheet_type_code"
          defaultValue={workflow?.timesheet_type_code ?? ''}
          className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-950 focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-600/40 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
        >
          <option value="">Any timesheet type</option>
          {timesheetTypes.map((timesheetType) => (
            <option key={timesheetType.code} value={timesheetType.code}>
              {timesheetType.name}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-1">
        <label htmlFor="contract_id" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Contract
        </label>
        <select
          id="contract_id"
          name="contract_id"
          defaultValue={workflow?.contract_id ?? ''}
          className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-950 focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-600/40 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
        >
          <option value="">Any contract</option>
          {contracts.map((contract) => (
            <option key={contract.id} value={contract.id}>
              {contract.contract_name}
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
          defaultValue={workflow?.subcontractor_id ?? ''}
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
        <label htmlFor="company_id" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Company
        </label>
        <select
          id="company_id"
          name="company_id"
          defaultValue={workflow?.company_id ?? ''}
          className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-950 focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-600/40 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
        >
          <option value="">Any company</option>
          {companies.map((company) => (
            <option key={company.id} value={company.id}>
              {company.name}
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

- [ ] **Step 4: New route**

Create `src/app/(app)/approval-workflows/new/page.tsx`:

```tsx
import { ApprovalWorkflowForm } from '../ApprovalWorkflowForm';
import { createApprovalWorkflow } from '../actions';
import { createClient } from '@/lib/supabase/server';

export default async function NewApprovalWorkflowPage() {
  const supabase = await createClient();

  const { data: approvalTypesData, error: approvalTypesError } = await supabase
    .from('approval_type')
    .select('code, name')
    .order('name', { ascending: true });
  if (approvalTypesError) {
    return (
      <div className="px-6 py-8">
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          Couldn&apos;t load approval types: {approvalTypesError.message}
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

  const { data: contractsData, error: contractsError } = await supabase
    .from('contract')
    .select('id, contract_name')
    .order('contract_name', { ascending: true });
  if (contractsError) {
    return (
      <div className="px-6 py-8">
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          Couldn&apos;t load contracts: {contractsError.message}
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

  const approvalTypes = approvalTypesData ?? [];
  const timesheetTypes = timesheetTypesData ?? [];
  const contracts = contractsData ?? [];
  const subcontractors = (subcontractorsData ?? []) as unknown as {
    id: number;
    company: { name: string } | null;
  }[];
  const companies = companiesData ?? [];

  return (
    <div className="px-6 py-8">
      <p className="font-mono text-xs font-medium tracking-[0.2em] text-zinc-500 dark:text-zinc-400">
        APPROVALS &amp; BILLING
      </p>
      <h2 className="mt-1 text-2xl font-semibold text-zinc-950 dark:text-zinc-50">
        Add approval workflow
      </h2>
      <ApprovalWorkflowForm
        approvalTypes={approvalTypes}
        timesheetTypes={timesheetTypes}
        contracts={contracts}
        subcontractors={subcontractors}
        companies={companies}
        action={createApprovalWorkflow}
        submitLabel="Create workflow"
      />
    </div>
  );
}
```

- [ ] **Step 5: Edit route (with Deactivate/Reactivate from the start)**

Create `src/app/(app)/approval-workflows/[id]/edit/page.tsx`:

```tsx
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { ApprovalWorkflowForm, type ApprovalWorkflow } from '../../ApprovalWorkflowForm';
import {
  updateApprovalWorkflow,
  deactivateApprovalWorkflow,
  reactivateApprovalWorkflow,
} from '../../actions';

export default async function EditApprovalWorkflowPage(props: PageProps<'/approval-workflows/[id]/edit'>) {
  const { id } = await props.params;
  const workflowId = Number(id);

  if (Number.isNaN(workflowId)) {
    notFound();
  }

  const supabase = await createClient();

  const { data: workflow, error } = await supabase
    .from('approval_workflow')
    .select('id, type_code, start_date, end_date, timesheet_type_code, contract_id, subcontractor_id, company_id, active')
    .eq('id', workflowId)
    .maybeSingle();

  if (error) {
    return (
      <div className="px-6 py-8">
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          Couldn&apos;t load approval workflow: {error.message}
        </p>
      </div>
    );
  }

  if (!workflow) {
    notFound();
  }

  const { data: approvalTypesData, error: approvalTypesError } = await supabase
    .from('approval_type')
    .select('code, name')
    .order('name', { ascending: true });
  if (approvalTypesError) {
    return (
      <div className="px-6 py-8">
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          Couldn&apos;t load approval types: {approvalTypesError.message}
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

  const { data: contractsData, error: contractsError } = await supabase
    .from('contract')
    .select('id, contract_name')
    .order('contract_name', { ascending: true });
  if (contractsError) {
    return (
      <div className="px-6 py-8">
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          Couldn&apos;t load contracts: {contractsError.message}
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

  const approvalTypes = approvalTypesData ?? [];
  const timesheetTypes = timesheetTypesData ?? [];
  const contracts = contractsData ?? [];
  const subcontractors = (subcontractorsData ?? []) as unknown as {
    id: number;
    company: { name: string } | null;
  }[];
  const companies = companiesData ?? [];

  const { active } = workflow;
  const updateApprovalWorkflowWithId = updateApprovalWorkflow.bind(null, workflowId);
  const deactivateApprovalWorkflowWithId = deactivateApprovalWorkflow.bind(null, workflowId);
  const reactivateApprovalWorkflowWithId = reactivateApprovalWorkflow.bind(null, workflowId);

  return (
    <div className="px-6 py-8">
      <p className="font-mono text-xs font-medium tracking-[0.2em] text-zinc-500 dark:text-zinc-400">
        APPROVALS &amp; BILLING
      </p>
      <div className="mt-1 flex items-center justify-between">
        <h2 className="text-2xl font-semibold text-zinc-950 dark:text-zinc-50">
          Edit approval workflow
        </h2>
        <form action={active ? deactivateApprovalWorkflowWithId : reactivateApprovalWorkflowWithId}>
          <button
            type="submit"
            className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-900"
          >
            {active ? 'Deactivate' : 'Reactivate'}
          </button>
        </form>
      </div>
      <ApprovalWorkflowForm
        workflow={workflow as ApprovalWorkflow}
        approvalTypes={approvalTypes}
        timesheetTypes={timesheetTypes}
        contracts={contracts}
        subcontractors={subcontractors}
        companies={companies}
        action={updateApprovalWorkflowWithId}
        submitLabel="Save changes"
      />
    </div>
  );
}
```

- [ ] **Step 6: Run lint and build**

```bash
npm run lint
npm run build
```

- [ ] **Step 7: Verify in the browser**

Create a workflow picking a Type and dates, leave the four scoping dropdowns blank. Confirm the list shows "Workflow #{id} ({type_code})" and "—" for the blank scoping columns. Edit it, set Contract/Subcontractor/Company/Timesheet type, save, reload, confirm all four persisted and render correctly in the list. Cycle Deactivate → Reactivate. Confirm `/approval-workflows/999999/edit` 404s.

- [ ] **Step 8: Commit**

```bash
git add "src/app/(app)/approval-workflows/"
git commit -m "Add approval workflow management (list, create, edit, deactivate/reactivate)"
```

---

### Task 3: Workflow Stages — full CRUD

**Files:**
- Create: `src/app/(app)/approval-workflow-stages/page.tsx`
- Create: `src/app/(app)/approval-workflow-stages/actions.ts`
- Create: `src/app/(app)/approval-workflow-stages/ApprovalWorkflowStageForm.tsx`
- Create: `src/app/(app)/approval-workflow-stages/new/page.tsx`
- Create: `src/app/(app)/approval-workflow-stages/[id]/edit/page.tsx`

**Interfaces:**
- Produces: `ApprovalWorkflowStageFormState = { error: string | null }`, `ApprovalWorkflowStage`, `WorkflowOption`, `JobPositionOption`, `UserPositionOption`, all in `ApprovalWorkflowStageForm.tsx`. `createApprovalWorkflowStage`, `updateApprovalWorkflowStage`, `deactivateApprovalWorkflowStage`, `reactivateApprovalWorkflowStage` in `actions.ts`.

- [ ] **Step 1: List page**

Create `src/app/(app)/approval-workflow-stages/page.tsx`:

```tsx
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';

type ApprovalWorkflowStageRow = {
  id: number;
  workflow_id: number;
  level: number;
  active: boolean;
  job_position: { name: string } | null;
  user_position: { app_user: { name: string | null; email: string | null } | null } | null;
};

export default async function ApprovalWorkflowStagesPage() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('approval_workflow_stage')
    .select('id, workflow_id, level, active, job_position(name), user_position(app_user(name, email))')
    .order('workflow_id', { ascending: true })
    .order('level', { ascending: true });

  const stages = (data ?? []) as unknown as ApprovalWorkflowStageRow[];

  return (
    <div className="px-6 py-8">
      <div className="flex items-center justify-between">
        <div>
          <p className="font-mono text-xs font-medium tracking-[0.2em] text-zinc-500 dark:text-zinc-400">
            APPROVALS &amp; BILLING
          </p>
          <h2 className="mt-1 text-2xl font-semibold text-zinc-950 dark:text-zinc-50">
            Workflow Stages
          </h2>
        </div>
        <Link
          href="/approval-workflow-stages/new"
          className="rounded-md bg-teal-700 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-teal-800 dark:bg-teal-600 dark:hover:bg-teal-500"
        >
          Add stage
        </Link>
      </div>

      {error && (
        <p role="alert" className="mt-4 text-sm text-red-600 dark:text-red-400">
          Couldn&apos;t load workflow stages: {error.message}
        </p>
      )}

      {!error && stages.length === 0 && (
        <p className="mt-4 max-w-prose text-zinc-600 dark:text-zinc-400">
          No workflow stages yet. Add your first one to get started.
        </p>
      )}

      {!error && stages.length > 0 && (
        <div className="mt-6 overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800">
          <table className="w-full text-sm">
            <thead className="border-b border-zinc-200 bg-zinc-50 text-left text-xs font-medium uppercase tracking-wide text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
              <tr>
                <th className="px-4 py-2">Stage</th>
                <th className="px-4 py-2">Job Position</th>
                <th className="px-4 py-2">User Position</th>
                <th className="px-4 py-2">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {stages.map((stage) => {
                const { active } = stage;
                return (
                  <tr key={stage.id}>
                    <td className="px-4 py-2 font-medium text-zinc-900 dark:text-zinc-100">
                      <Link href={`/approval-workflow-stages/${stage.id}/edit`} className="hover:underline">
                        Level {stage.level} — Workflow #{stage.workflow_id}
                      </Link>
                    </td>
                    <td className="px-4 py-2 text-zinc-600 dark:text-zinc-400">
                      {stage.job_position?.name ?? '—'}
                    </td>
                    <td className="px-4 py-2 text-zinc-600 dark:text-zinc-400">
                      {stage.user_position?.app_user?.name ?? stage.user_position?.app_user?.email ?? '—'}
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

- [ ] **Step 2: Actions**

Create `src/app/(app)/approval-workflow-stages/actions.ts`:

```ts
'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

export type ApprovalWorkflowStageFormState = {
  error: string | null;
};

type ReadStageFieldsResult =
  | { error: string }
  | {
      values: {
        workflow_id: number;
        level: number;
        job_position_id: number | null;
        user_position_id: number | null;
      };
    };

function readStageFields(formData: FormData): ReadStageFieldsResult {
  const workflowIdRaw = formData.get('workflow_id') as string | null;
  const levelRaw = formData.get('level') as string | null;
  const jobPositionIdRaw = formData.get('job_position_id') as string | null;
  const userPositionIdRaw = formData.get('user_position_id') as string | null;

  if (!workflowIdRaw || !levelRaw) {
    return { error: 'Workflow and level are required.' };
  }

  const workflowId = Number(workflowIdRaw);
  const level = Number(levelRaw);
  if (Number.isNaN(workflowId) || !Number.isFinite(level) || level < 0) {
    return { error: 'Invalid workflow or level.' };
  }

  const jobPositionId = jobPositionIdRaw ? Number(jobPositionIdRaw) : null;
  const userPositionId = userPositionIdRaw ? Number(userPositionIdRaw) : null;
  if (
    (jobPositionId !== null && Number.isNaN(jobPositionId)) ||
    (userPositionId !== null && Number.isNaN(userPositionId))
  ) {
    return { error: 'Invalid job position or user position.' };
  }

  return {
    values: {
      workflow_id: workflowId,
      level,
      job_position_id: jobPositionId,
      user_position_id: userPositionId,
    },
  };
}

export async function createApprovalWorkflowStage(
  _prevState: ApprovalWorkflowStageFormState,
  formData: FormData,
): Promise<ApprovalWorkflowStageFormState> {
  const parsed = readStageFields(formData);
  if ('error' in parsed) {
    return { error: parsed.error };
  }

  const supabase = await createClient();
  const { error } = await supabase.from('approval_workflow_stage').insert(parsed.values);

  if (error) {
    return { error: error.message };
  }

  revalidatePath('/approval-workflow-stages');
  redirect('/approval-workflow-stages');
}

export async function updateApprovalWorkflowStage(
  id: number,
  _prevState: ApprovalWorkflowStageFormState,
  formData: FormData,
): Promise<ApprovalWorkflowStageFormState> {
  const parsed = readStageFields(formData);
  if ('error' in parsed) {
    return { error: parsed.error };
  }

  const supabase = await createClient();
  const { error } = await supabase.from('approval_workflow_stage').update(parsed.values).eq('id', id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath('/approval-workflow-stages');
  redirect('/approval-workflow-stages');
}

export async function deactivateApprovalWorkflowStage(id: number) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('approval_workflow_stage')
    .update({ active: false })
    .eq('id', id)
    .select('id');

  if (error) {
    throw new Error(error.message);
  }
  if (!data || data.length === 0) {
    throw new Error('Approval workflow stage not found.');
  }

  revalidatePath('/approval-workflow-stages');
  revalidatePath(`/approval-workflow-stages/${id}/edit`);
}

export async function reactivateApprovalWorkflowStage(id: number) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('approval_workflow_stage')
    .update({ active: true })
    .eq('id', id)
    .select('id');

  if (error) {
    throw new Error(error.message);
  }
  if (!data || data.length === 0) {
    throw new Error('Approval workflow stage not found.');
  }

  revalidatePath('/approval-workflow-stages');
  revalidatePath(`/approval-workflow-stages/${id}/edit`);
}
```

- [ ] **Step 3: Form component**

Create `src/app/(app)/approval-workflow-stages/ApprovalWorkflowStageForm.tsx`:

```tsx
'use client';

import { useActionState } from 'react';
import type { ApprovalWorkflowStageFormState } from './actions';

export type ApprovalWorkflowStage = {
  id: number;
  workflow_id: number;
  level: number;
  job_position_id: number | null;
  user_position_id: number | null;
};

export type WorkflowOption = { id: number; type_code: string };
export type JobPositionOption = { id: number; name: string };
export type UserPositionOption = {
  id: number;
  app_user: { name: string | null; email: string | null } | null;
  job_position: { name: string } | null;
};

const initialState: ApprovalWorkflowStageFormState = { error: null };

function userPositionLabel(userPosition: UserPositionOption): string {
  const userLabel = userPosition.app_user?.name ?? userPosition.app_user?.email ?? `User Position #${userPosition.id}`;
  const positionLabel = userPosition.job_position?.name ?? '—';
  return `${userLabel} — ${positionLabel}`;
}

export function ApprovalWorkflowStageForm({
  stage,
  workflows,
  jobPositions,
  userPositions,
  action,
  submitLabel,
}: {
  stage?: ApprovalWorkflowStage;
  workflows: WorkflowOption[];
  jobPositions: JobPositionOption[];
  userPositions: UserPositionOption[];
  action: (
    prevState: ApprovalWorkflowStageFormState,
    formData: FormData,
  ) => Promise<ApprovalWorkflowStageFormState>;
  submitLabel: string;
}) {
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="mt-6 max-w-md space-y-4">
      <div className="space-y-1">
        <label htmlFor="workflow_id" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Workflow
        </label>
        <select
          id="workflow_id"
          name="workflow_id"
          required
          defaultValue={stage?.workflow_id ?? ''}
          className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-950 focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-600/40 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
        >
          <option value="" disabled>
            Select a workflow
          </option>
          {workflows.map((workflow) => (
            <option key={workflow.id} value={workflow.id}>
              Workflow #{workflow.id} ({workflow.type_code})
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-1">
        <label htmlFor="level" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Level
        </label>
        <input
          id="level"
          name="level"
          type="number"
          step="1"
          min="0"
          required
          defaultValue={stage?.level}
          className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-950 focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-600/40 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
        />
      </div>

      <div className="space-y-1">
        <label htmlFor="job_position_id" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Job position
        </label>
        <select
          id="job_position_id"
          name="job_position_id"
          defaultValue={stage?.job_position_id ?? ''}
          className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-950 focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-600/40 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
        >
          <option value="">No job position</option>
          {jobPositions.map((jobPosition) => (
            <option key={jobPosition.id} value={jobPosition.id}>
              {jobPosition.name}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-1">
        <label htmlFor="user_position_id" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          User position
        </label>
        <select
          id="user_position_id"
          name="user_position_id"
          defaultValue={stage?.user_position_id ?? ''}
          className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-950 focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-600/40 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
        >
          <option value="">No user position</option>
          {userPositions.map((userPosition) => (
            <option key={userPosition.id} value={userPosition.id}>
              {userPositionLabel(userPosition)}
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

- [ ] **Step 4: New route**

Create `src/app/(app)/approval-workflow-stages/new/page.tsx`:

```tsx
import { ApprovalWorkflowStageForm } from '../ApprovalWorkflowStageForm';
import { createApprovalWorkflowStage } from '../actions';
import { createClient } from '@/lib/supabase/server';

export default async function NewApprovalWorkflowStagePage() {
  const supabase = await createClient();

  const { data: workflowsData, error: workflowsError } = await supabase
    .from('approval_workflow')
    .select('id, type_code')
    .order('id', { ascending: true });
  if (workflowsError) {
    return (
      <div className="px-6 py-8">
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          Couldn&apos;t load approval workflows: {workflowsError.message}
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

  const { data: userPositionsData, error: userPositionsError } = await supabase
    .from('user_position')
    .select('id, app_user(name, email), job_position(name)')
    .order('id', { ascending: true });
  if (userPositionsError) {
    return (
      <div className="px-6 py-8">
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          Couldn&apos;t load user positions: {userPositionsError.message}
        </p>
      </div>
    );
  }

  const workflows = workflowsData ?? [];
  const jobPositions = jobPositionsData ?? [];
  const userPositions = (userPositionsData ?? []) as unknown as {
    id: number;
    app_user: { name: string | null; email: string | null } | null;
    job_position: { name: string } | null;
  }[];

  return (
    <div className="px-6 py-8">
      <p className="font-mono text-xs font-medium tracking-[0.2em] text-zinc-500 dark:text-zinc-400">
        APPROVALS &amp; BILLING
      </p>
      <h2 className="mt-1 text-2xl font-semibold text-zinc-950 dark:text-zinc-50">
        Add workflow stage
      </h2>
      <ApprovalWorkflowStageForm
        workflows={workflows}
        jobPositions={jobPositions}
        userPositions={userPositions}
        action={createApprovalWorkflowStage}
        submitLabel="Create stage"
      />
    </div>
  );
}
```

- [ ] **Step 5: Edit route (with Deactivate/Reactivate from the start)**

Create `src/app/(app)/approval-workflow-stages/[id]/edit/page.tsx`:

```tsx
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { ApprovalWorkflowStageForm, type ApprovalWorkflowStage } from '../../ApprovalWorkflowStageForm';
import {
  updateApprovalWorkflowStage,
  deactivateApprovalWorkflowStage,
  reactivateApprovalWorkflowStage,
} from '../../actions';

export default async function EditApprovalWorkflowStagePage(
  props: PageProps<'/approval-workflow-stages/[id]/edit'>,
) {
  const { id } = await props.params;
  const stageId = Number(id);

  if (Number.isNaN(stageId)) {
    notFound();
  }

  const supabase = await createClient();

  const { data: stage, error } = await supabase
    .from('approval_workflow_stage')
    .select('id, workflow_id, level, job_position_id, user_position_id, active')
    .eq('id', stageId)
    .maybeSingle();

  if (error) {
    return (
      <div className="px-6 py-8">
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          Couldn&apos;t load workflow stage: {error.message}
        </p>
      </div>
    );
  }

  if (!stage) {
    notFound();
  }

  const { data: workflowsData, error: workflowsError } = await supabase
    .from('approval_workflow')
    .select('id, type_code')
    .order('id', { ascending: true });
  if (workflowsError) {
    return (
      <div className="px-6 py-8">
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          Couldn&apos;t load approval workflows: {workflowsError.message}
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

  const { data: userPositionsData, error: userPositionsError } = await supabase
    .from('user_position')
    .select('id, app_user(name, email), job_position(name)')
    .order('id', { ascending: true });
  if (userPositionsError) {
    return (
      <div className="px-6 py-8">
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          Couldn&apos;t load user positions: {userPositionsError.message}
        </p>
      </div>
    );
  }

  const workflows = workflowsData ?? [];
  const jobPositions = jobPositionsData ?? [];
  const userPositions = (userPositionsData ?? []) as unknown as {
    id: number;
    app_user: { name: string | null; email: string | null } | null;
    job_position: { name: string } | null;
  }[];

  const { active } = stage;
  const updateApprovalWorkflowStageWithId = updateApprovalWorkflowStage.bind(null, stageId);
  const deactivateApprovalWorkflowStageWithId = deactivateApprovalWorkflowStage.bind(null, stageId);
  const reactivateApprovalWorkflowStageWithId = reactivateApprovalWorkflowStage.bind(null, stageId);

  return (
    <div className="px-6 py-8">
      <p className="font-mono text-xs font-medium tracking-[0.2em] text-zinc-500 dark:text-zinc-400">
        APPROVALS &amp; BILLING
      </p>
      <div className="mt-1 flex items-center justify-between">
        <h2 className="text-2xl font-semibold text-zinc-950 dark:text-zinc-50">
          Edit workflow stage
        </h2>
        <form action={active ? deactivateApprovalWorkflowStageWithId : reactivateApprovalWorkflowStageWithId}>
          <button
            type="submit"
            className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-900"
          >
            {active ? 'Deactivate' : 'Reactivate'}
          </button>
        </form>
      </div>
      <ApprovalWorkflowStageForm
        stage={stage as ApprovalWorkflowStage}
        workflows={workflows}
        jobPositions={jobPositions}
        userPositions={userPositions}
        action={updateApprovalWorkflowStageWithId}
        submitLabel="Save changes"
      />
    </div>
  );
}
```

- [ ] **Step 6: Run lint and build**

```bash
npm run lint
npm run build
```

- [ ] **Step 7: Verify in the browser**

Create a stage against the Approval Workflow created in Task 2, level 1, picking a Job Position. Confirm the list shows "Level 1 — Workflow #{id}" and the Job Position name. Edit it, add a User Position too, save, confirm both render. Cycle Deactivate → Reactivate. Confirm `/approval-workflow-stages/999999/edit` 404s.

- [ ] **Step 8: Commit**

```bash
git add "src/app/(app)/approval-workflow-stages/"
git commit -m "Add approval workflow stage management (list, create, edit, deactivate/reactivate)"
```

---

### Task 4: Approvals — full CRUD (Timesheet-scoped)

**Files:**
- Create: `src/app/(app)/approvals/page.tsx`
- Create: `src/app/(app)/approvals/actions.ts`
- Create: `src/app/(app)/approvals/ApprovalForm.tsx`
- Create: `src/app/(app)/approvals/new/page.tsx`
- Create: `src/app/(app)/approvals/[id]/edit/page.tsx`

**Interfaces:**
- Produces: `ApprovalFormState = { error: string | null }`, `Approval`, `WorkflowStageOption`, `TimesheetOption`, `ApprovalStatusOption`, `AppUserOption`, `UserPositionOption`, all in `ApprovalForm.tsx`. `createApproval`, `updateApproval`, `deactivateApproval`, `reactivateApproval` in `actions.ts`.

- [ ] **Step 1: List page**

Create `src/app/(app)/approvals/page.tsx`:

```tsx
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';

type ApprovalRow = {
  id: number;
  active: boolean;
  remark: string | null;
  timesheet: { code: string } | null;
  approval_status: { name: string } | null;
};

export default async function ApprovalsPage() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('approval')
    .select('id, active, remark, timesheet(code), approval_status(name)')
    .order('id', { ascending: true });

  const approvals = (data ?? []) as unknown as ApprovalRow[];

  return (
    <div className="px-6 py-8">
      <div className="flex items-center justify-between">
        <div>
          <p className="font-mono text-xs font-medium tracking-[0.2em] text-zinc-500 dark:text-zinc-400">
            APPROVALS &amp; BILLING
          </p>
          <h2 className="mt-1 text-2xl font-semibold text-zinc-950 dark:text-zinc-50">
            Approvals
          </h2>
        </div>
        <Link
          href="/approvals/new"
          className="rounded-md bg-teal-700 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-teal-800 dark:bg-teal-600 dark:hover:bg-teal-500"
        >
          Add approval
        </Link>
      </div>

      {error && (
        <p role="alert" className="mt-4 text-sm text-red-600 dark:text-red-400">
          Couldn&apos;t load approvals: {error.message}
        </p>
      )}

      {!error && approvals.length === 0 && (
        <p className="mt-4 max-w-prose text-zinc-600 dark:text-zinc-400">
          No approvals yet. Add your first one to get started.
        </p>
      )}

      {!error && approvals.length > 0 && (
        <div className="mt-6 overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800">
          <table className="w-full text-sm">
            <thead className="border-b border-zinc-200 bg-zinc-50 text-left text-xs font-medium uppercase tracking-wide text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
              <tr>
                <th className="px-4 py-2">Timesheet</th>
                <th className="px-4 py-2">Approval Status</th>
                <th className="px-4 py-2">Remark</th>
                <th className="px-4 py-2">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {approvals.map((approval) => {
                const { active } = approval;
                return (
                  <tr key={approval.id}>
                    <td className="px-4 py-2 font-medium text-zinc-900 dark:text-zinc-100">
                      <Link href={`/approvals/${approval.id}/edit`} className="hover:underline">
                        {approval.timesheet?.code ?? '—'}
                      </Link>
                    </td>
                    <td className="px-4 py-2 text-zinc-600 dark:text-zinc-400">
                      {approval.approval_status?.name ?? '—'}
                    </td>
                    <td className="px-4 py-2 text-zinc-600 dark:text-zinc-400">{approval.remark ?? '—'}</td>
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

- [ ] **Step 2: Actions**

Create `src/app/(app)/approvals/actions.ts`:

```ts
'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

export type ApprovalFormState = {
  error: string | null;
};

type ReadApprovalFieldsResult =
  | { error: string }
  | {
      values: {
        workflow_stage_id: number;
        timesheet_id: number;
        status_code: string;
        approver_user_id: string | null;
        approver_user_pos_id: number | null;
        remark: string | null;
      };
    };

function readApprovalFields(formData: FormData): ReadApprovalFieldsResult {
  const workflowStageIdRaw = formData.get('workflow_stage_id') as string | null;
  const timesheetIdRaw = formData.get('timesheet_id') as string | null;
  const statusCode = (formData.get('status_code') as string | null)?.trim();
  const approverUserId = (formData.get('approver_user_id') as string | null)?.trim();
  const approverUserPosIdRaw = formData.get('approver_user_pos_id') as string | null;
  const remark = (formData.get('remark') as string | null)?.trim();

  if (!workflowStageIdRaw || !timesheetIdRaw || !statusCode) {
    return { error: 'Workflow stage, timesheet, and status are required.' };
  }

  const workflowStageId = Number(workflowStageIdRaw);
  const timesheetId = Number(timesheetIdRaw);
  if (Number.isNaN(workflowStageId) || Number.isNaN(timesheetId)) {
    return { error: 'Invalid workflow stage or timesheet.' };
  }

  const approverUserPosId = approverUserPosIdRaw ? Number(approverUserPosIdRaw) : null;
  if (approverUserPosId !== null && Number.isNaN(approverUserPosId)) {
    return { error: 'Invalid approver user position.' };
  }

  return {
    values: {
      workflow_stage_id: workflowStageId,
      timesheet_id: timesheetId,
      status_code: statusCode,
      approver_user_id: approverUserId || null,
      approver_user_pos_id: approverUserPosId,
      remark: remark || null,
    },
  };
}

export async function createApproval(
  _prevState: ApprovalFormState,
  formData: FormData,
): Promise<ApprovalFormState> {
  const parsed = readApprovalFields(formData);
  if ('error' in parsed) {
    return { error: parsed.error };
  }

  const supabase = await createClient();
  const { error } = await supabase.from('approval').insert({ ...parsed.values, type_code: 'T' });

  if (error) {
    return { error: error.message };
  }

  revalidatePath('/approvals');
  redirect('/approvals');
}

export async function updateApproval(
  id: number,
  _prevState: ApprovalFormState,
  formData: FormData,
): Promise<ApprovalFormState> {
  const parsed = readApprovalFields(formData);
  if ('error' in parsed) {
    return { error: parsed.error };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from('approval')
    .update({ ...parsed.values, type_code: 'T' })
    .eq('id', id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath('/approvals');
  redirect('/approvals');
}

export async function deactivateApproval(id: number) {
  const supabase = await createClient();
  const { data, error } = await supabase.from('approval').update({ active: false }).eq('id', id).select('id');

  if (error) {
    throw new Error(error.message);
  }
  if (!data || data.length === 0) {
    throw new Error('Approval not found.');
  }

  revalidatePath('/approvals');
  revalidatePath(`/approvals/${id}/edit`);
}

export async function reactivateApproval(id: number) {
  const supabase = await createClient();
  const { data, error } = await supabase.from('approval').update({ active: true }).eq('id', id).select('id');

  if (error) {
    throw new Error(error.message);
  }
  if (!data || data.length === 0) {
    throw new Error('Approval not found.');
  }

  revalidatePath('/approvals');
  revalidatePath(`/approvals/${id}/edit`);
}
```

- [ ] **Step 3: Form component**

Create `src/app/(app)/approvals/ApprovalForm.tsx`:

```tsx
'use client';

import { useActionState } from 'react';
import type { ApprovalFormState } from './actions';

export type Approval = {
  id: number;
  workflow_stage_id: number;
  timesheet_id: number;
  status_code: string;
  approver_user_id: string | null;
  approver_user_pos_id: number | null;
  remark: string | null;
};

export type WorkflowStageOption = { id: number; workflow_id: number; level: number };
export type TimesheetOption = { id: number; code: string };
export type ApprovalStatusOption = { code: string; name: string };
export type AppUserOption = { id: string; name: string | null; email: string | null };
export type UserPositionOption = {
  id: number;
  app_user: { name: string | null; email: string | null } | null;
  job_position: { name: string } | null;
};

const initialState: ApprovalFormState = { error: null };

function userPositionLabel(userPosition: UserPositionOption): string {
  const userLabel = userPosition.app_user?.name ?? userPosition.app_user?.email ?? `User Position #${userPosition.id}`;
  const positionLabel = userPosition.job_position?.name ?? '—';
  return `${userLabel} — ${positionLabel}`;
}

export function ApprovalForm({
  approval,
  workflowStages,
  timesheets,
  approvalStatuses,
  appUsers,
  userPositions,
  action,
  submitLabel,
}: {
  approval?: Approval;
  workflowStages: WorkflowStageOption[];
  timesheets: TimesheetOption[];
  approvalStatuses: ApprovalStatusOption[];
  appUsers: AppUserOption[];
  userPositions: UserPositionOption[];
  action: (prevState: ApprovalFormState, formData: FormData) => Promise<ApprovalFormState>;
  submitLabel: string;
}) {
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="mt-6 max-w-md space-y-4">
      <div className="space-y-1">
        <label htmlFor="workflow_stage_id" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Workflow stage
        </label>
        <select
          id="workflow_stage_id"
          name="workflow_stage_id"
          required
          defaultValue={approval?.workflow_stage_id ?? ''}
          className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-950 focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-600/40 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
        >
          <option value="" disabled>
            Select a workflow stage
          </option>
          {workflowStages.map((stage) => (
            <option key={stage.id} value={stage.id}>
              Level {stage.level} — Workflow #{stage.workflow_id}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-1">
        <label htmlFor="timesheet_id" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Timesheet
        </label>
        <select
          id="timesheet_id"
          name="timesheet_id"
          required
          defaultValue={approval?.timesheet_id ?? ''}
          className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-950 focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-600/40 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
        >
          <option value="" disabled>
            Select a timesheet
          </option>
          {timesheets.map((timesheet) => (
            <option key={timesheet.id} value={timesheet.id}>
              {timesheet.code}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-1">
        <label htmlFor="status_code" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Status
        </label>
        <select
          id="status_code"
          name="status_code"
          required
          defaultValue={approval?.status_code ?? ''}
          className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-950 focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-600/40 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
        >
          <option value="" disabled>
            Select a status
          </option>
          {approvalStatuses.map((approvalStatus) => (
            <option key={approvalStatus.code} value={approvalStatus.code}>
              {approvalStatus.name}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-1">
        <label htmlFor="approver_user_id" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Approver user
        </label>
        <select
          id="approver_user_id"
          name="approver_user_id"
          defaultValue={approval?.approver_user_id ?? ''}
          className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-950 focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-600/40 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
        >
          <option value="">No approver user</option>
          {appUsers.map((appUser) => (
            <option key={appUser.id} value={appUser.id}>
              {appUser.name ?? appUser.email ?? appUser.id}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-1">
        <label htmlFor="approver_user_pos_id" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Approver user position
        </label>
        <select
          id="approver_user_pos_id"
          name="approver_user_pos_id"
          defaultValue={approval?.approver_user_pos_id ?? ''}
          className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-950 focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-600/40 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
        >
          <option value="">No approver user position</option>
          {userPositions.map((userPosition) => (
            <option key={userPosition.id} value={userPosition.id}>
              {userPositionLabel(userPosition)}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-1">
        <label htmlFor="remark" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Remark
        </label>
        <input
          id="remark"
          name="remark"
          type="text"
          defaultValue={approval?.remark ?? ''}
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

- [ ] **Step 4: New route**

Create `src/app/(app)/approvals/new/page.tsx`:

```tsx
import { ApprovalForm } from '../ApprovalForm';
import { createApproval } from '../actions';
import { createClient } from '@/lib/supabase/server';

export default async function NewApprovalPage() {
  const supabase = await createClient();

  const { data: workflowStagesData, error: workflowStagesError } = await supabase
    .from('approval_workflow_stage')
    .select('id, workflow_id, level')
    .order('workflow_id', { ascending: true })
    .order('level', { ascending: true });
  if (workflowStagesError) {
    return (
      <div className="px-6 py-8">
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          Couldn&apos;t load workflow stages: {workflowStagesError.message}
        </p>
      </div>
    );
  }

  const { data: timesheetsData, error: timesheetsError } = await supabase
    .from('timesheet')
    .select('id, code')
    .order('code', { ascending: true });
  if (timesheetsError) {
    return (
      <div className="px-6 py-8">
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          Couldn&apos;t load timesheets: {timesheetsError.message}
        </p>
      </div>
    );
  }

  const { data: approvalStatusesData, error: approvalStatusesError } = await supabase
    .from('approval_status')
    .select('code, name')
    .order('name', { ascending: true });
  if (approvalStatusesError) {
    return (
      <div className="px-6 py-8">
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          Couldn&apos;t load approval statuses: {approvalStatusesError.message}
        </p>
      </div>
    );
  }

  const { data: appUsersData, error: appUsersError } = await supabase
    .from('app_user')
    .select('id, name, email')
    .order('email', { ascending: true });
  if (appUsersError) {
    return (
      <div className="px-6 py-8">
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          Couldn&apos;t load users: {appUsersError.message}
        </p>
      </div>
    );
  }

  const { data: userPositionsData, error: userPositionsError } = await supabase
    .from('user_position')
    .select('id, app_user(name, email), job_position(name)')
    .order('id', { ascending: true });
  if (userPositionsError) {
    return (
      <div className="px-6 py-8">
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          Couldn&apos;t load user positions: {userPositionsError.message}
        </p>
      </div>
    );
  }

  const workflowStages = workflowStagesData ?? [];
  const timesheets = timesheetsData ?? [];
  const approvalStatuses = approvalStatusesData ?? [];
  const appUsers = appUsersData ?? [];
  const userPositions = (userPositionsData ?? []) as unknown as {
    id: number;
    app_user: { name: string | null; email: string | null } | null;
    job_position: { name: string } | null;
  }[];

  return (
    <div className="px-6 py-8">
      <p className="font-mono text-xs font-medium tracking-[0.2em] text-zinc-500 dark:text-zinc-400">
        APPROVALS &amp; BILLING
      </p>
      <h2 className="mt-1 text-2xl font-semibold text-zinc-950 dark:text-zinc-50">
        Add approval
      </h2>
      <ApprovalForm
        workflowStages={workflowStages}
        timesheets={timesheets}
        approvalStatuses={approvalStatuses}
        appUsers={appUsers}
        userPositions={userPositions}
        action={createApproval}
        submitLabel="Create approval"
      />
    </div>
  );
}
```

- [ ] **Step 5: Edit route (with Deactivate/Reactivate from the start)**

Create `src/app/(app)/approvals/[id]/edit/page.tsx`:

```tsx
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { ApprovalForm, type Approval } from '../../ApprovalForm';
import { updateApproval, deactivateApproval, reactivateApproval } from '../../actions';

export default async function EditApprovalPage(props: PageProps<'/approvals/[id]/edit'>) {
  const { id } = await props.params;
  const approvalId = Number(id);

  if (Number.isNaN(approvalId)) {
    notFound();
  }

  const supabase = await createClient();

  const { data: approval, error } = await supabase
    .from('approval')
    .select('id, workflow_stage_id, timesheet_id, status_code, approver_user_id, approver_user_pos_id, remark, active')
    .eq('id', approvalId)
    .maybeSingle();

  if (error) {
    return (
      <div className="px-6 py-8">
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          Couldn&apos;t load approval: {error.message}
        </p>
      </div>
    );
  }

  if (!approval) {
    notFound();
  }

  const { data: workflowStagesData, error: workflowStagesError } = await supabase
    .from('approval_workflow_stage')
    .select('id, workflow_id, level')
    .order('workflow_id', { ascending: true })
    .order('level', { ascending: true });
  if (workflowStagesError) {
    return (
      <div className="px-6 py-8">
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          Couldn&apos;t load workflow stages: {workflowStagesError.message}
        </p>
      </div>
    );
  }

  const { data: timesheetsData, error: timesheetsError } = await supabase
    .from('timesheet')
    .select('id, code')
    .order('code', { ascending: true });
  if (timesheetsError) {
    return (
      <div className="px-6 py-8">
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          Couldn&apos;t load timesheets: {timesheetsError.message}
        </p>
      </div>
    );
  }

  const { data: approvalStatusesData, error: approvalStatusesError } = await supabase
    .from('approval_status')
    .select('code, name')
    .order('name', { ascending: true });
  if (approvalStatusesError) {
    return (
      <div className="px-6 py-8">
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          Couldn&apos;t load approval statuses: {approvalStatusesError.message}
        </p>
      </div>
    );
  }

  const { data: appUsersData, error: appUsersError } = await supabase
    .from('app_user')
    .select('id, name, email')
    .order('email', { ascending: true });
  if (appUsersError) {
    return (
      <div className="px-6 py-8">
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          Couldn&apos;t load users: {appUsersError.message}
        </p>
      </div>
    );
  }

  const { data: userPositionsData, error: userPositionsError } = await supabase
    .from('user_position')
    .select('id, app_user(name, email), job_position(name)')
    .order('id', { ascending: true });
  if (userPositionsError) {
    return (
      <div className="px-6 py-8">
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          Couldn&apos;t load user positions: {userPositionsError.message}
        </p>
      </div>
    );
  }

  const workflowStages = workflowStagesData ?? [];
  const timesheets = timesheetsData ?? [];
  const approvalStatuses = approvalStatusesData ?? [];
  const appUsers = appUsersData ?? [];
  const userPositions = (userPositionsData ?? []) as unknown as {
    id: number;
    app_user: { name: string | null; email: string | null } | null;
    job_position: { name: string } | null;
  }[];

  const { active } = approval;
  const updateApprovalWithId = updateApproval.bind(null, approvalId);
  const deactivateApprovalWithId = deactivateApproval.bind(null, approvalId);
  const reactivateApprovalWithId = reactivateApproval.bind(null, approvalId);

  return (
    <div className="px-6 py-8">
      <p className="font-mono text-xs font-medium tracking-[0.2em] text-zinc-500 dark:text-zinc-400">
        APPROVALS &amp; BILLING
      </p>
      <div className="mt-1 flex items-center justify-between">
        <h2 className="text-2xl font-semibold text-zinc-950 dark:text-zinc-50">
          Edit approval
        </h2>
        <form action={active ? deactivateApprovalWithId : reactivateApprovalWithId}>
          <button
            type="submit"
            className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-900"
          >
            {active ? 'Deactivate' : 'Reactivate'}
          </button>
        </form>
      </div>
      <ApprovalForm
        approval={approval as Approval}
        workflowStages={workflowStages}
        timesheets={timesheets}
        approvalStatuses={approvalStatuses}
        appUsers={appUsers}
        userPositions={userPositions}
        action={updateApprovalWithId}
        submitLabel="Save changes"
      />
    </div>
  );
}
```

- [ ] **Step 6: Run lint and build**

```bash
npm run lint
npm run build
```

- [ ] **Step 7: Verify in the browser**

Create an approval against the Workflow Stage created in Task 3 and a real Timesheet (reuse an existing one, or create one via `/timesheets/new` if none exist), picking a Status (Approved or Rejected). Confirm the list shows the linked Timesheet code and Status name. Edit it, set an Approver user and Approver user position, add a Remark, save, confirm all persist. Via `psql`, confirm `type_code = 'T'` on the row even though it was never shown on the form. Cycle Deactivate → Reactivate. Confirm `/approvals/999999/edit` 404s.

- [ ] **Step 8: Commit**

```bash
git add "src/app/(app)/approvals/"
git commit -m "Add approval management (list, create, edit, deactivate/reactivate)"
```

---

## Self-Review Notes

- **Spec coverage:** required-field constraints, `active` column, grants/RLS for all three new tables, plus the missing `approval_status`/`approval_type` read grants ✓ (Task 1). Nav placeholder split into three with two new (verified-to-exist) icon imports ✓ (Task 1). Full CRUD per entity with Deactivate/Reactivate built in from the start ✓ (Tasks 2-4). `Approval.type_code` hardcoded `'T'` server-side, never a form field ✓ (Task 4).
- **Placeholder scan:** all four tasks have complete, non-elided code for every file.
- **Type consistency:** every `actions.ts` in this plan gives its `readXFields` helper an explicit discriminated-union return type from the start (learned forward from Material Handling/Timesheet), avoiding the `TS2322` narrowing issue entirely rather than fixing it after the fact.
- **Composed-label consistency:** `Workflow #{id} ({type_code})` and `Level {level} — Workflow #{workflow_id}` are each defined identically in three places per entity (list page, form's own dropdown option when applicable, and any OTHER form that dropdowns into it) — Task 3's stage dropdown and Task 4's workflow-stage dropdown both reuse the exact same composition as Task 2/3's own list pages, so a workflow/stage looks identical no matter where it's referenced from.
- **Naming notes for the implementer:** `contract.contract_name` (not `name`) is Contract's identifying column — first-ever use of `Contract` as a dropdown source in this codebase. `approval.approver_user_id` is a `uuid` (FK to `app_user`, itself keyed to `auth.users`) — keep it typed as `string`, never `Number(...)`'d, same convention as every other `app_user`-referencing FK (`Users`, `UserPosition`).
