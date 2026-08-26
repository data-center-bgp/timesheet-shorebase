# ContractService Management Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the fourth real CRUD feature on the ERD-derived schema — list, create, edit, and deactivate/reactivate `ContractService` records, each binding a Contract to a Service with its own code, UoM, and aggregation rule.

**Architecture:** One migration (required-field constraints, a unique code constraint, the `active` column, grants/RLS), then the same Server Component + Server Action pattern proven three times over, extended with two new things: `company_id` is never shown on the form and is instead derived server-side from the selected Contract on every write, and the form gains its first piece of live client-side interactivity (selecting a Service pre-fills the UoM dropdown from that service's default, via local React state).

**Tech Stack:** Next.js 16 App Router, React 19 (`useActionState` + `useState`), `@supabase/ssr` server client, plain SQL migration applied via Supabase Studio's SQL editor.

## Global Constraints

- Required fields: Contract, Service, Code (unique), UoM, Summary Calculation Type, Start date, End date. Optional: Timesheet site code.
- `company_id` never appears on the form. Both `createContractService` and `updateContractService` look up the selected `contract_id`'s current `company_id` server-side and write that — it always mirrors whichever contract the row currently points to.
- `timesheet_group_id` stays nullable, omitted from the form entirely — `contract_service_timesheet_group` has no management UI and is out of scope.
- `active boolean not null default true` — same convention as every prior feature. Deactivate/Reactivate flips `active` only, never `start_date`/`end_date` — built correctly from the start, not as a later fix.
- Contract/Service/UoM/Summary-Calculation-Type dropdowns show all rows regardless of status — same convention as Contract's Company dropdown.
- `nav.ts` needs an actual new entry this time — "Contract Services" in the Master Data group, next to "Contracts", at `/contract-services`. No prior placeholder href exists for this (unlike every earlier feature).
- No automated test suite — verification is `npm run lint`, a production build, and manual checks against the running dev server.
- Migrations are applied by pasting the SQL into Supabase Studio's SQL editor by the project owner, never via `npx supabase db push` — verify afterward with `psql`.

---

### Task 1: Migration — required fields, unique code, active column, grants/RLS

**Files:**
- Create: `supabase/migrations/20260817000000_contract_service.sql`

**Interfaces:**
- Consumes: nothing — new migration on top of `supabase/migrations/20260816000000_shorebase_service_code_unique.sql`.
- Produces: `timesheet_shorebase.contract_service` gains required-field constraints on `code`/`contract_id`/`service_id`/`uom_code`/`summary_calculation_type`/`start_date`/`end_date`, a unique constraint on `code`, and `active boolean not null default true`; `authenticated` can `select/insert/update`. Tasks 2–5 depend on this being live.

- [ ] **Step 1: Write the migration**

Create `supabase/migrations/20260817000000_contract_service.sql`:

```sql
-- Adds ContractService's schema requirements: required-field constraints
-- matching the fields this feature's form treats as mandatory, a unique
-- constraint on code (checked upfront this time, after having to add one
-- as a follow-up fix for shorebase_service.code), and the active-column
-- convention (see CLAUDE.md). company_id and timesheet_group_id stay
-- nullable - company_id because the app derives it automatically rather
-- than the user setting it, timesheet_group_id because that table has no
-- management UI yet.

begin;

alter table timesheet_shorebase.contract_service
  alter column code set not null;
alter table timesheet_shorebase.contract_service
  alter column contract_id set not null;
alter table timesheet_shorebase.contract_service
  alter column service_id set not null;
alter table timesheet_shorebase.contract_service
  alter column uom_code set not null;
alter table timesheet_shorebase.contract_service
  alter column summary_calculation_type set not null;
alter table timesheet_shorebase.contract_service
  alter column start_date set not null;
alter table timesheet_shorebase.contract_service
  alter column end_date set not null;

alter table timesheet_shorebase.contract_service
  add constraint uq_contract_service_code unique (code);

alter table timesheet_shorebase.contract_service
  add column active boolean not null default true;

grant select, insert, update on timesheet_shorebase.contract_service to authenticated;

alter table timesheet_shorebase.contract_service enable row level security;

create policy "authenticated users can read/write contract services"
  on timesheet_shorebase.contract_service
  for all
  to authenticated
  using (true)
  with check (true);

commit;
```

- [ ] **Step 2: Ask the project owner to apply the migration**

Paste the full contents of `supabase/migrations/20260817000000_contract_service.sql` into Supabase Studio's SQL editor and run it there. Wait for confirmation it ran without error before continuing to Step 3.

- [ ] **Step 3: Verify against the real database**

```bash
source <(grep '^DATABASE_URL=' .env.local | sed 's/^/export /')
psql "$DATABASE_URL" -c "\d timesheet_shorebase.contract_service"
psql "$DATABASE_URL" -c "select grantee, privilege_type from information_schema.role_table_grants where table_schema = 'timesheet_shorebase' and table_name = 'contract_service' and grantee = 'authenticated' order by privilege_type;"
psql "$DATABASE_URL" -c "select policyname, cmd, roles from pg_policies where schemaname = 'timesheet_shorebase' and tablename = 'contract_service';"
```

Expected:
- First query shows `code`/`contract_id`/`service_id`/`uom_code`/`summary_calculation_type`/`start_date`/`end_date`/`active` all `not null`, `active` defaulting `true`, and a `uq_contract_service_code` unique constraint in the indexes list. `company_id` and `timesheet_group_id` remain nullable.
- Second query returns three rows for `authenticated`: `INSERT`, `SELECT`, `UPDATE`.
- Third query returns one row: `authenticated users can read/write contract services`, `cmd` = `ALL`, `roles` = `{authenticated}`.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260817000000_contract_service.sql
git commit -m "Add required fields, unique code, and active column for contract_service"
```

---

### Task 2: Nav entry and Contract Services list page

**Files:**
- Modify: `src/components/app-shell/nav.ts`
- Create: `src/app/(app)/contract-services/page.tsx`

**Interfaces:**
- Consumes: `createClient` from `@/lib/supabase/server`. Requires Task 1's migration to be live.
- Produces: `nav.ts` gains a new `Layers`-icon "Contract Services" entry at `/contract-services` in the Master Data group, right after "Contracts". The `ContractServiceRow` shape, declared in `page.tsx` only.

- [ ] **Step 1: Add the nav entry**

In `src/components/app-shell/nav.ts`, add `Layers` to the `lucide-react` import (keep the import list alphabetically sorted, so it goes between `Handshake` and `LayoutDashboard`):

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
  UtensilsCrossed,
  Users,
  Wrench,
  type LucideIcon,
} from 'lucide-react';
```

In the `Master Data` group's `items` array, add a new entry right after `Contracts`:

```ts
{
  label: 'Master Data',
  items: [
    { label: 'Companies', icon: Building2, href: '/companies' },
    { label: 'Contracts', icon: FileSignature, href: '/contracts' },
    { label: 'Contract Services', icon: Layers, href: '/contract-services' },
    { label: 'Services', icon: Wrench, href: '/services' },
    { label: 'Periods', icon: CalendarRange, href: '/periods' },
    { label: 'Subcontractors', icon: Handshake, href: '/subcontractors' },
  ],
},
```

- [ ] **Step 2: Write the list page**

Create `src/app/(app)/contract-services/page.tsx`:

```tsx
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';

type ContractServiceRow = {
  id: number;
  code: string;
  active: boolean;
  contract: { contract_number: string } | null;
  shorebase_service: { name: string } | null;
  uom: { name: string } | null;
};

export default async function ContractServicesPage() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('contract_service')
    .select('id, code, active, contract(contract_number), shorebase_service(name), uom(name)')
    .order('code', { ascending: true });

  const contractServices = (data ?? []) as unknown as ContractServiceRow[];

  return (
    <div className="px-6 py-8">
      <div className="flex items-center justify-between">
        <div>
          <p className="font-mono text-xs font-medium tracking-[0.2em] text-zinc-500 dark:text-zinc-400">
            MASTER DATA
          </p>
          <h2 className="mt-1 text-2xl font-semibold text-zinc-950 dark:text-zinc-50">
            Contract Services
          </h2>
        </div>
        <Link
          href="/contract-services/new"
          className="rounded-md bg-teal-700 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-teal-800 dark:bg-teal-600 dark:hover:bg-teal-500"
        >
          Add contract service
        </Link>
      </div>

      {error && (
        <p role="alert" className="mt-4 text-sm text-red-600 dark:text-red-400">
          Couldn&apos;t load contract services: {error.message}
        </p>
      )}

      {!error && contractServices.length === 0 && (
        <p className="mt-4 max-w-prose text-zinc-600 dark:text-zinc-400">
          No contract services yet. Add your first one to get started.
        </p>
      )}

      {!error && contractServices.length > 0 && (
        <div className="mt-6 overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800">
          <table className="w-full text-sm">
            <thead className="border-b border-zinc-200 bg-zinc-50 text-left text-xs font-medium uppercase tracking-wide text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
              <tr>
                <th className="px-4 py-2">Code</th>
                <th className="px-4 py-2">Contract</th>
                <th className="px-4 py-2">Service</th>
                <th className="px-4 py-2">UoM</th>
                <th className="px-4 py-2">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {contractServices.map((contractService) => {
                const { active } = contractService;
                return (
                  <tr key={contractService.id}>
                    <td className="px-4 py-2 font-medium text-zinc-900 dark:text-zinc-100">
                      <Link href={`/contract-services/${contractService.id}/edit`} className="hover:underline">
                        {contractService.code}
                      </Link>
                    </td>
                    <td className="px-4 py-2 text-zinc-600 dark:text-zinc-400">
                      {contractService.contract?.contract_number ?? '—'}
                    </td>
                    <td className="px-4 py-2 text-zinc-600 dark:text-zinc-400">
                      {contractService.shorebase_service?.name ?? '—'}
                    </td>
                    <td className="px-4 py-2 text-zinc-600 dark:text-zinc-400">
                      {contractService.uom?.name ?? '—'}
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

`contract(contract_number)`, `shorebase_service(name)`, and `uom(name)` are all unaliased embeds — `contract_service` has exactly one FK to each of those three tables, so PostgREST resolves them unambiguously by target table name (see `CLAUDE.md`'s note on this, added after `shorebase_service`'s list page hit the opposite bug). Do not add aliases or hints to any of these three.

- [ ] **Step 3: Run lint and build**

```bash
npm run lint
npm run build
```

Expected: both succeed with no errors.

- [ ] **Step 4: Verify in the browser**

Confirm Task 1's migration is live. Navigate to `http://localhost:3000/contract-services`.

Expected: the sidebar now shows a "Contract Services" item (between "Contracts" and "Services") that goes to a real page — no longer "Coming soon" once you click it. The page shows "MASTER DATA / Contract Services", an "Add contract service" button, and "No contract services yet. Add your first one to get started."

- [ ] **Step 5: Commit**

```bash
git add "src/components/app-shell/nav.ts" "src/app/(app)/contract-services/page.tsx"
git commit -m "Add contract-services nav entry and list page"
```

---

### Task 3: Create contract service

**Files:**
- Create: `src/app/(app)/contract-services/actions.ts`
- Create: `src/app/(app)/contract-services/ContractServiceForm.tsx`
- Create: `src/app/(app)/contract-services/new/page.tsx`

**Interfaces:**
- Consumes: `createClient` from `@/lib/supabase/server`.
- Produces: `ContractServiceFormState = { error: string | null }`, `ContractService`, `ContractOption = { id: number; contract_number: string }`, `ServiceOption = { id: number; code: string; name: string; default_uom_code: string }`, `UomOption = { code: string; name: string }`, `SumCalcTypeOption = { code: string; name: string }` (all exported from `ContractServiceForm.tsx`, `ContractService` imported by Task 4's edit page). `createContractService(prevState: ContractServiceFormState, formData: FormData): Promise<ContractServiceFormState>` (exported from `actions.ts`). `ContractServiceForm({ contractService?: ContractService; contracts: ContractOption[]; services: ServiceOption[]; uoms: UomOption[]; sumCalcTypes: SumCalcTypeOption[]; action: (prevState: ContractServiceFormState, formData: FormData) => Promise<ContractServiceFormState>; submitLabel: string })` (exported from `ContractServiceForm.tsx`, reused by Task 4).

- [ ] **Step 1: Write the Server Actions file**

Create `src/app/(app)/contract-services/actions.ts`:

```ts
'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

export type ContractServiceFormState = {
  error: string | null;
};

async function lookupCompanyIdForContract(
  supabase: Awaited<ReturnType<typeof createClient>>,
  contractId: number,
): Promise<number | null> {
  const { data } = await supabase
    .from('contract')
    .select('company_id')
    .eq('id', contractId)
    .maybeSingle();
  return data?.company_id ?? null;
}

export async function createContractService(
  _prevState: ContractServiceFormState,
  formData: FormData,
): Promise<ContractServiceFormState> {
  const code = (formData.get('code') as string | null)?.trim();
  if (!code) {
    return { error: 'Code is required.' };
  }

  const contractIdRaw = formData.get('contract_id') as string | null;
  const contractId = contractIdRaw ? Number(contractIdRaw) : NaN;
  if (!contractIdRaw || Number.isNaN(contractId)) {
    return { error: 'Contract is required.' };
  }

  const serviceIdRaw = formData.get('service_id') as string | null;
  const serviceId = serviceIdRaw ? Number(serviceIdRaw) : NaN;
  if (!serviceIdRaw || Number.isNaN(serviceId)) {
    return { error: 'Service is required.' };
  }

  const uomCode = (formData.get('uom_code') as string | null)?.trim();
  if (!uomCode) {
    return { error: 'UoM is required.' };
  }

  const summaryCalculationType = (formData.get('summary_calculation_type') as string | null)?.trim();
  if (!summaryCalculationType) {
    return { error: 'Summary calculation type is required.' };
  }

  const startDate = (formData.get('start_date') as string | null)?.trim();
  if (!startDate) {
    return { error: 'Start date is required.' };
  }

  const endDate = (formData.get('end_date') as string | null)?.trim();
  if (!endDate) {
    return { error: 'End date is required.' };
  }

  const timesheetSiteCode = (formData.get('timesheet_site_code') as string | null)?.trim() || null;

  const supabase = await createClient();
  const companyId = await lookupCompanyIdForContract(supabase, contractId);

  const { error } = await supabase.from('contract_service').insert({
    code,
    contract_id: contractId,
    service_id: serviceId,
    company_id: companyId,
    uom_code: uomCode,
    summary_calculation_type: summaryCalculationType,
    start_date: startDate,
    end_date: endDate,
    timesheet_site_code: timesheetSiteCode,
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath('/contract-services');
  redirect('/contract-services');
}
```

`lookupCompanyIdForContract` is the mechanism behind the design's "never shown on the form, always derived server-side" rule — it re-reads the selected contract's *current* `company_id` on every write, so the snapshot always mirrors whichever contract the row currently points to.

- [ ] **Step 2: Write the shared form component**

Create `src/app/(app)/contract-services/ContractServiceForm.tsx`:

```tsx
'use client';

import { useActionState, useState, type ChangeEvent } from 'react';
import type { ContractServiceFormState } from './actions';

export type ContractService = {
  id: number;
  code: string;
  contract_id: number;
  service_id: number;
  uom_code: string;
  summary_calculation_type: string;
  start_date: string;
  end_date: string;
  timesheet_site_code: string | null;
};

export type ContractOption = {
  id: number;
  contract_number: string;
};

export type ServiceOption = {
  id: number;
  code: string;
  name: string;
  default_uom_code: string;
};

export type UomOption = {
  code: string;
  name: string;
};

export type SumCalcTypeOption = {
  code: string;
  name: string;
};

const initialState: ContractServiceFormState = { error: null };

export function ContractServiceForm({
  contractService,
  contracts,
  services,
  uoms,
  sumCalcTypes,
  action,
  submitLabel,
}: {
  contractService?: ContractService;
  contracts: ContractOption[];
  services: ServiceOption[];
  uoms: UomOption[];
  sumCalcTypes: SumCalcTypeOption[];
  action: (prevState: ContractServiceFormState, formData: FormData) => Promise<ContractServiceFormState>;
  submitLabel: string;
}) {
  const [state, formAction, pending] = useActionState(action, initialState);
  const [uomCode, setUomCode] = useState(contractService?.uom_code ?? '');

  function handleServiceChange(event: ChangeEvent<HTMLSelectElement>) {
    const selectedService = services.find((service) => String(service.id) === event.target.value);
    if (selectedService) {
      setUomCode(selectedService.default_uom_code);
    }
  }

  return (
    <form action={formAction} className="mt-6 max-w-md space-y-4">
      <div className="space-y-1">
        <label htmlFor="contract_id" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Contract
        </label>
        <select
          id="contract_id"
          name="contract_id"
          required
          defaultValue={contractService?.contract_id ?? ''}
          className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-950 focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-600/40 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
        >
          <option value="" disabled>
            Select a contract
          </option>
          {contracts.map((contract) => (
            <option key={contract.id} value={contract.id}>
              {contract.contract_number}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-1">
        <label htmlFor="service_id" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Service
        </label>
        <select
          id="service_id"
          name="service_id"
          required
          defaultValue={contractService?.service_id ?? ''}
          onChange={handleServiceChange}
          className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-950 focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-600/40 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
        >
          <option value="" disabled>
            Select a service
          </option>
          {services.map((service) => (
            <option key={service.id} value={service.id}>
              {service.code} — {service.name}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-1">
        <label htmlFor="code" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Code
        </label>
        <input
          id="code"
          name="code"
          type="text"
          required
          defaultValue={contractService?.code}
          className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-950 focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-600/40 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
        />
      </div>

      <div className="space-y-1">
        <label htmlFor="uom_code" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          UoM
        </label>
        <select
          id="uom_code"
          name="uom_code"
          required
          value={uomCode}
          onChange={(event) => setUomCode(event.target.value)}
          className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-950 focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-600/40 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
        >
          <option value="" disabled>
            Select a UoM
          </option>
          {uoms.map((uom) => (
            <option key={uom.code} value={uom.code}>
              {uom.name}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-1">
        <label htmlFor="summary_calculation_type" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Summary calculation type
        </label>
        <select
          id="summary_calculation_type"
          name="summary_calculation_type"
          required
          defaultValue={contractService?.summary_calculation_type ?? ''}
          className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-950 focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-600/40 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
        >
          <option value="" disabled>
            Select a calculation type
          </option>
          {sumCalcTypes.map((sumCalcType) => (
            <option key={sumCalcType.code} value={sumCalcType.code}>
              {sumCalcType.name}
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
            defaultValue={contractService?.start_date}
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
            defaultValue={contractService?.end_date}
            className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-950 focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-600/40 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
          />
        </div>
      </div>

      <div className="space-y-1">
        <label htmlFor="timesheet_site_code" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Timesheet site code
        </label>
        <input
          id="timesheet_site_code"
          name="timesheet_site_code"
          type="text"
          defaultValue={contractService?.timesheet_site_code ?? ''}
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

The UoM `<select>` is deliberately controlled (`value={uomCode}` + `onChange`) — the first controlled form field in this codebase; every other select elsewhere uses `defaultValue`. This is required for the Service→UoM auto-fill: picking a Service looks up its `default_uom_code` from the already-fetched `services` list and updates `uomCode` state, while the user can still change the UoM afterward via its own `onChange`. A controlled `<select>` still participates in native form submission via its `name` attribute, so `formData.get('uom_code')` in the Server Action works exactly as it does for every other field.

- [ ] **Step 3: Write the new-contract-service route**

Create `src/app/(app)/contract-services/new/page.tsx`:

```tsx
import { ContractServiceForm } from '../ContractServiceForm';
import { createContractService } from '../actions';
import { createClient } from '@/lib/supabase/server';

export default async function NewContractServicePage() {
  const supabase = await createClient();

  const { data: contractsData, error: contractsError } = await supabase
    .from('contract')
    .select('id, contract_number')
    .order('contract_number', { ascending: true });

  if (contractsError) {
    return (
      <div className="px-6 py-8">
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          Couldn&apos;t load contracts: {contractsError.message}
        </p>
      </div>
    );
  }

  const { data: servicesData, error: servicesError } = await supabase
    .from('shorebase_service')
    .select('id, code, name, default_uom_code')
    .order('code', { ascending: true });

  if (servicesError) {
    return (
      <div className="px-6 py-8">
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          Couldn&apos;t load services: {servicesError.message}
        </p>
      </div>
    );
  }

  const { data: uomsData, error: uomsError } = await supabase
    .from('uom')
    .select('code, name')
    .order('name', { ascending: true });

  if (uomsError) {
    return (
      <div className="px-6 py-8">
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          Couldn&apos;t load UoMs: {uomsError.message}
        </p>
      </div>
    );
  }

  const { data: sumCalcTypesData, error: sumCalcTypesError } = await supabase
    .from('sum_calc_type')
    .select('code, name')
    .order('name', { ascending: true });

  if (sumCalcTypesError) {
    return (
      <div className="px-6 py-8">
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          Couldn&apos;t load calculation types: {sumCalcTypesError.message}
        </p>
      </div>
    );
  }

  const contracts = contractsData ?? [];
  const services = servicesData ?? [];
  const uoms = uomsData ?? [];
  const sumCalcTypes = sumCalcTypesData ?? [];

  return (
    <div className="px-6 py-8">
      <p className="font-mono text-xs font-medium tracking-[0.2em] text-zinc-500 dark:text-zinc-400">
        MASTER DATA
      </p>
      <h2 className="mt-1 text-2xl font-semibold text-zinc-950 dark:text-zinc-50">
        Add contract service
      </h2>
      <ContractServiceForm
        contracts={contracts}
        services={services}
        uoms={uoms}
        sumCalcTypes={sumCalcTypes}
        action={createContractService}
        submitLabel="Create contract service"
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

With the dev server running (and Task 1's migration confirmed live), navigate to `http://localhost:3000/contract-services/new`. There must be at least one real Contract and one real Service in the database for this to be meaningfully testable — if either list is empty, create one first via `/contracts/new` or `/services/new`.

Select a Service and confirm the UoM dropdown automatically jumps to that service's default UoM. Change the UoM to something else manually and confirm it stays changed (not reset). Fill in the remaining required fields and submit.

Expected: redirected to `/contract-services`, the new row appears with the correct contract number, service name, and UoM. Verify `company_id` was correctly derived (not shown in the UI): `psql "$DATABASE_URL" -c "select cs.id, cs.company_id, c.company_id as contract_company_id from timesheet_shorebase.contract_service cs join timesheet_shorebase.contract c on c.id = cs.contract_id;"` — the two `company_id` values must match. Then test server-side validation: go back to `/contract-services/new`, enter a code that's only whitespace with everything else filled in — confirm the inline `{ error: 'Code is required.' }` message renders and the page does not redirect.

- [ ] **Step 6: Commit**

```bash
git add "src/app/(app)/contract-services/actions.ts" "src/app/(app)/contract-services/ContractServiceForm.tsx" "src/app/(app)/contract-services/new/page.tsx"
git commit -m "Add contract service creation form and action"
```

---

### Task 4: Edit contract service

**Files:**
- Modify: `src/app/(app)/contract-services/actions.ts`
- Create: `src/app/(app)/contract-services/[id]/edit/page.tsx`

**Interfaces:**
- Consumes: `ContractServiceForm`, `ContractService`, `ContractOption`, `ServiceOption`, `UomOption`, `SumCalcTypeOption` from `../../ContractServiceForm`; `ContractServiceFormState` from `../../actions`.
- Produces: `updateContractService(id: number, prevState: ContractServiceFormState, formData: FormData): Promise<ContractServiceFormState>`, added to `actions.ts` alongside `createContractService`. Task 5 adds `deactivateContractService`/`reactivateContractService` to this same file and adds a button to this same edit page.

- [ ] **Step 1: Add `updateContractService` to the actions file**

In `src/app/(app)/contract-services/actions.ts`, add below `createContractService`:

```ts
export async function updateContractService(
  id: number,
  _prevState: ContractServiceFormState,
  formData: FormData,
): Promise<ContractServiceFormState> {
  const code = (formData.get('code') as string | null)?.trim();
  if (!code) {
    return { error: 'Code is required.' };
  }

  const contractIdRaw = formData.get('contract_id') as string | null;
  const contractId = contractIdRaw ? Number(contractIdRaw) : NaN;
  if (!contractIdRaw || Number.isNaN(contractId)) {
    return { error: 'Contract is required.' };
  }

  const serviceIdRaw = formData.get('service_id') as string | null;
  const serviceId = serviceIdRaw ? Number(serviceIdRaw) : NaN;
  if (!serviceIdRaw || Number.isNaN(serviceId)) {
    return { error: 'Service is required.' };
  }

  const uomCode = (formData.get('uom_code') as string | null)?.trim();
  if (!uomCode) {
    return { error: 'UoM is required.' };
  }

  const summaryCalculationType = (formData.get('summary_calculation_type') as string | null)?.trim();
  if (!summaryCalculationType) {
    return { error: 'Summary calculation type is required.' };
  }

  const startDate = (formData.get('start_date') as string | null)?.trim();
  if (!startDate) {
    return { error: 'Start date is required.' };
  }

  const endDate = (formData.get('end_date') as string | null)?.trim();
  if (!endDate) {
    return { error: 'End date is required.' };
  }

  const timesheetSiteCode = (formData.get('timesheet_site_code') as string | null)?.trim() || null;

  const supabase = await createClient();
  const companyId = await lookupCompanyIdForContract(supabase, contractId);

  const { error } = await supabase
    .from('contract_service')
    .update({
      code,
      contract_id: contractId,
      service_id: serviceId,
      company_id: companyId,
      uom_code: uomCode,
      summary_calculation_type: summaryCalculationType,
      start_date: startDate,
      end_date: endDate,
      timesheet_site_code: timesheetSiteCode,
    })
    .eq('id', id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath('/contract-services');
  redirect('/contract-services');
}
```

This re-derives `company_id` from whichever contract is currently selected on save — if the contract is changed during an edit, `company_id` is re-snapshotted to match, never left stale.

- [ ] **Step 2: Write the edit route**

Create `src/app/(app)/contract-services/[id]/edit/page.tsx`:

```tsx
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { ContractServiceForm, type ContractService } from '../../ContractServiceForm';
import { updateContractService } from '../../actions';

export default async function EditContractServicePage(props: PageProps<'/contract-services/[id]/edit'>) {
  const { id } = await props.params;
  const contractServiceId = Number(id);

  if (Number.isNaN(contractServiceId)) {
    notFound();
  }

  const supabase = await createClient();
  const { data: contractService, error } = await supabase
    .from('contract_service')
    .select(
      'id, code, contract_id, service_id, uom_code, summary_calculation_type, start_date, end_date, timesheet_site_code, active',
    )
    .eq('id', contractServiceId)
    .maybeSingle();

  if (error) {
    return (
      <div className="px-6 py-8">
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          Couldn&apos;t load contract service: {error.message}
        </p>
      </div>
    );
  }

  if (!contractService) {
    notFound();
  }

  const { data: contractsData, error: contractsError } = await supabase
    .from('contract')
    .select('id, contract_number')
    .order('contract_number', { ascending: true });

  if (contractsError) {
    return (
      <div className="px-6 py-8">
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          Couldn&apos;t load contracts: {contractsError.message}
        </p>
      </div>
    );
  }

  const { data: servicesData, error: servicesError } = await supabase
    .from('shorebase_service')
    .select('id, code, name, default_uom_code')
    .order('code', { ascending: true });

  if (servicesError) {
    return (
      <div className="px-6 py-8">
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          Couldn&apos;t load services: {servicesError.message}
        </p>
      </div>
    );
  }

  const { data: uomsData, error: uomsError } = await supabase
    .from('uom')
    .select('code, name')
    .order('name', { ascending: true });

  if (uomsError) {
    return (
      <div className="px-6 py-8">
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          Couldn&apos;t load UoMs: {uomsError.message}
        </p>
      </div>
    );
  }

  const { data: sumCalcTypesData, error: sumCalcTypesError } = await supabase
    .from('sum_calc_type')
    .select('code, name')
    .order('name', { ascending: true });

  if (sumCalcTypesError) {
    return (
      <div className="px-6 py-8">
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          Couldn&apos;t load calculation types: {sumCalcTypesError.message}
        </p>
      </div>
    );
  }

  const contracts = contractsData ?? [];
  const services = servicesData ?? [];
  const uoms = uomsData ?? [];
  const sumCalcTypes = sumCalcTypesData ?? [];

  const updateContractServiceWithId = updateContractService.bind(null, contractServiceId);

  return (
    <div className="px-6 py-8">
      <p className="font-mono text-xs font-medium tracking-[0.2em] text-zinc-500 dark:text-zinc-400">
        MASTER DATA
      </p>
      <h2 className="mt-1 text-2xl font-semibold text-zinc-950 dark:text-zinc-50">
        Edit contract service
      </h2>
      <ContractServiceForm
        contractService={contractService as ContractService}
        contracts={contracts}
        services={services}
        uoms={uoms}
        sumCalcTypes={sumCalcTypes}
        action={updateContractServiceWithId}
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

Navigate to `http://localhost:3000/contract-services`, click the row created in Task 3. Confirm the form loads pre-filled: Contract and Service dropdowns pre-selected, Code, UoM, Summary Calculation Type, both dates, and Timesheet site code (if set) all correct. Change the Code and submit.

Expected: redirected to `/contract-services`, the row's code reflects the change. Also confirm visiting `/contract-services/999999/edit` (an id that doesn't exist) renders Next.js's 404 page, not a crash.

- [ ] **Step 5: Commit**

```bash
git add "src/app/(app)/contract-services/actions.ts" "src/app/(app)/contract-services/[id]/edit/page.tsx"
git commit -m "Add contract service edit form and action"
```

---

### Task 5: Deactivate and reactivate

**Files:**
- Modify: `src/app/(app)/contract-services/actions.ts`
- Modify: `src/app/(app)/contract-services/[id]/edit/page.tsx`

**Interfaces:**
- Consumes: the `updateContractServiceWithId` `.bind(null, contractServiceId)` pattern already established in Task 4's edit page.
- Produces: `deactivateContractService(id: number): Promise<void>` and `reactivateContractService(id: number): Promise<void>`, added to `actions.ts`. Nothing outside this task depends on these.

- [ ] **Step 1: Add the two actions**

In `src/app/(app)/contract-services/actions.ts`, add below `updateContractService`:

```ts
export async function deactivateContractService(id: number) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('contract_service')
    .update({ active: false })
    .eq('id', id)
    .select('id');

  if (error) {
    throw new Error(error.message);
  }
  if (!data || data.length === 0) {
    throw new Error('Contract service not found.');
  }

  revalidatePath('/contract-services');
  revalidatePath(`/contract-services/${id}/edit`);
}

export async function reactivateContractService(id: number) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('contract_service')
    .update({ active: true })
    .eq('id', id)
    .select('id');

  if (error) {
    throw new Error(error.message);
  }
  if (!data || data.length === 0) {
    throw new Error('Contract service not found.');
  }

  revalidatePath('/contract-services');
  revalidatePath(`/contract-services/${id}/edit`);
}
```

- [ ] **Step 2: Add the button to the edit page**

In `src/app/(app)/contract-services/[id]/edit/page.tsx`, update the imports and the returned JSX:

```tsx
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { ContractServiceForm, type ContractService } from '../../ContractServiceForm';
import { updateContractService, deactivateContractService, reactivateContractService } from '../../actions';
```

Replace the `updateContractServiceWithId` line and everything below it with:

```tsx
  const { active } = contractService;
  const updateContractServiceWithId = updateContractService.bind(null, contractServiceId);
  const deactivateContractServiceWithId = deactivateContractService.bind(null, contractServiceId);
  const reactivateContractServiceWithId = reactivateContractService.bind(null, contractServiceId);

  return (
    <div className="px-6 py-8">
      <p className="font-mono text-xs font-medium tracking-[0.2em] text-zinc-500 dark:text-zinc-400">
        MASTER DATA
      </p>
      <div className="mt-1 flex items-center justify-between">
        <h2 className="text-2xl font-semibold text-zinc-950 dark:text-zinc-50">
          Edit contract service
        </h2>
        <form action={active ? deactivateContractServiceWithId : reactivateContractServiceWithId}>
          <button
            type="submit"
            className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-900"
          >
            {active ? 'Deactivate' : 'Reactivate'}
          </button>
        </form>
      </div>
      <ContractServiceForm
        contractService={contractService as ContractService}
        contracts={contracts}
        services={services}
        uoms={uoms}
        sumCalcTypes={sumCalcTypes}
        action={updateContractServiceWithId}
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

On the contract service's edit page from Task 4, note its Start date/End date and the derived `company_id` (via the same `psql` join query from Task 3's verification). Click "Deactivate". Confirm the button submits, the page reloads, and the button now reads "Reactivate". Navigate to `/contract-services` and confirm the Status column shows "Inactive". Go back to the edit page, click "Reactivate", confirm the button reverts to "Deactivate" and `/contract-services` shows "Active" again — with dates and the derived `company_id` completely unchanged throughout the whole cycle.

- [ ] **Step 5: Commit**

```bash
git add "src/app/(app)/contract-services/actions.ts" "src/app/(app)/contract-services/[id]/edit/page.tsx"
git commit -m "Add contract service deactivate/reactivate actions"
```

---

## Self-Review Notes

- **Spec coverage:** required-field constraints + unique code + `active` column + grants/RLS ✓ (Task 1). New nav entry ✓ (Task 2). List page with joined contract/service/UoM names ✓ (Task 2). `company_id` never on the form, always derived server-side ✓ (Task 3's `lookupCompanyIdForContract`, reused unchanged by Task 4's `updateContractService`). Service→UoM auto-fill via controlled state, still editable ✓ (Task 3's `ContractServiceForm`). `timesheet_group_id` omitted entirely — confirmed no task references it. Deactivate/Reactivate flips `active` only, built correctly from the start ✓ (Task 5).
- **Placeholder scan:** none — every step has complete, runnable code.
- **Type consistency:** `ContractService` (id/code/contract_id/service_id/uom_code/summary_calculation_type/start_date/end_date/timesheet_site_code) defined once in `ContractServiceForm.tsx`, imported by the edit page (Task 4). `ContractOption`/`ServiceOption`/`UomOption`/`SumCalcTypeOption` defined once in `ContractServiceForm.tsx`, used by both `new/page.tsx` and `[id]/edit/page.tsx` for their fetched lists — note `ServiceOption` includes `default_uom_code`, unlike a plain `{code, name}` lookup, since the auto-fill needs it. `ContractServiceFormState` defined once in `actions.ts`, imported by `ContractServiceForm.tsx`. `createContractService`'s signature `(prevState, formData)` and `updateContractService`'s `(id, prevState, formData)` both match how `ContractServiceForm`'s `action` prop is typed and how `.bind(null, id)` is used in the edit page — same shape as every prior feature. `deactivateContractService`/`reactivateContractService` take only `id`, matching the current (post-fix) shape of every prior feature's equivalents exactly — error-checked, zero-rows-affected guard, flips `active` only. `lookupCompanyIdForContract` is defined once in `actions.ts` and called identically by both `createContractService` and `updateContractService` — not duplicated.
