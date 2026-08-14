# Company Fix Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stop Company's Deactivate/Reactivate from overwriting `end_date`, mirroring the fix already applied and proven for Contract.

**Architecture:** One migration adding an `active` boolean column, then a single focused change swapping `deactivateCompany`/`reactivateCompany` from mutating `end_date` to flipping `active`, and updating the list/edit pages to read that column directly instead of computing status from a date.

**Tech Stack:** Next.js 16 App Router, React 19, `@supabase/ssr` server client, plain SQL migration applied via Supabase Studio's SQL editor.

## Global Constraints

- `active boolean not null default true` matches this schema's existing boolean-naming convention (`company.internal`, `invoice_status.locked`, and Contract's own `active` column) — no `is_` prefix.
- `deactivateCompany`/`reactivateCompany` must never touch `end_date` again — they flip `active` only, keeping the existing error-check + zero-rows-affected guard shape unchanged.
- No label change — Company already displays "Active"/"Inactive"; this plan only changes what *computes* that label, not the words.
- `start_date`/`end_date` stay exactly as they are today: nullable, optional on the form. Not in scope.
- `isActiveByEndDate` (in `src/lib/date.ts`) is not deleted — nothing in this plan removes it, only Company's *use* of it goes away.
- No automated test suite — verification is `npm run lint`, a production build, and manual checks against the running dev server.
- Migrations are applied by pasting the SQL into Supabase Studio's SQL editor by the project owner, never via `npx supabase db push` — verify afterward with `psql`.

---

### Task 1: Migration — add `active` column to company

**Files:**
- Create: `supabase/migrations/20260814010000_company_active.sql`

**Interfaces:**
- Consumes: nothing — new migration on top of `supabase/migrations/20260814000000_contract_name_and_active.sql`.
- Produces: `timesheet_shorebase.company` gains `active boolean not null default true`. Task 2 depends on this column existing before its browser-verification step.

- [ ] **Step 1: Write the migration**

Create `supabase/migrations/20260814010000_company_active.sql`:

```sql
-- Mirrors the Contract fix (20260814000000_contract_name_and_active.sql):
-- deactivateCompany/reactivateCompany currently overwrite end_date instead
-- of using a dedicated status flag. This adds that flag so Task 2 can stop
-- touching end_date. Unlike Contract, start_date/end_date stay nullable
-- here - the legacy system's Company form has no date fields at all, so
-- there's no evidence to require them.

begin;

alter table timesheet_shorebase.company
  add column active boolean not null default true;

commit;
```

- [ ] **Step 2: Ask the project owner to apply the migration**

Paste the full contents of `supabase/migrations/20260814010000_company_active.sql` into Supabase Studio's SQL editor and run it there. Wait for confirmation it ran without error before continuing to Step 3.

- [ ] **Step 3: Verify against the real database**

```bash
source <(grep '^DATABASE_URL=' .env.local | sed 's/^/export /')
psql "$DATABASE_URL" -c "\d timesheet_shorebase.company"
```

Expected: output shows `active` as `boolean`, `not null`, default `true`.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260814010000_company_active.sql
git commit -m "Add active column to timesheet_shorebase.company"
```

---

### Task 2: Swap Deactivate/Reactivate to use the `active` column

**Files:**
- Modify: `src/app/(app)/companies/actions.ts`
- Modify: `src/app/(app)/companies/page.tsx`
- Modify: `src/app/(app)/companies/[id]/edit/page.tsx`

**Interfaces:**
- Consumes: Task 1's `active` column being live.
- Produces: `deactivateCompany`/`reactivateCompany` no longer touch `end_date`. The list page's `CompanyRow` type and the edit page's query both include `active`, read directly instead of via `isActiveByEndDate`. Nothing outside this task depends on these.

- [ ] **Step 1: Rewrite `deactivateCompany`/`reactivateCompany`**

In `src/app/(app)/companies/actions.ts`, replace both functions:

```ts
export async function deactivateCompany(id: number) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('company')
    .update({ active: false })
    .eq('id', id)
    .select('id');

  if (error) {
    throw new Error(error.message);
  }
  if (!data || data.length === 0) {
    throw new Error('Company not found.');
  }

  revalidatePath('/companies');
  revalidatePath(`/companies/${id}/edit`);
}

export async function reactivateCompany(id: number) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('company')
    .update({ active: true })
    .eq('id', id)
    .select('id');

  if (error) {
    throw new Error(error.message);
  }
  if (!data || data.length === 0) {
    throw new Error('Company not found.');
  }

  revalidatePath('/companies');
  revalidatePath(`/companies/${id}/edit`);
}
```

Remove the now-unused `import { todayLocal } from '@/lib/date';` line at the top of this file — nothing in it calls `todayLocal` anymore. `createCompany`/`updateCompany` are untouched.

- [ ] **Step 2: Update the list page's status logic**

In `src/app/(app)/companies/page.tsx`:

Remove `import { isActiveByEndDate } from '@/lib/date';`.

Add `active: boolean;` to the `CompanyRow` type, and add `active` to the query's `select`:

```ts
.select('id, name, internal, start_date, end_date, active')
```

Replace:

```ts
const active = isActiveByEndDate(company.end_date);
```

with:

```ts
const { active } = company;
```

The rendered label stays `{active ? 'Active' : 'Inactive'}` — unchanged.

- [ ] **Step 3: Update the edit page's status logic**

In `src/app/(app)/companies/[id]/edit/page.tsx`:

Remove `import { isActiveByEndDate } from '@/lib/date';`.

Add `active` to the company query's `select`:

```ts
.select('id, name, internal, start_date, end_date, active')
```

Replace:

```ts
const active = isActiveByEndDate(company.end_date);
```

with:

```ts
const { active } = company;
```

- [ ] **Step 4: Run lint and build**

```bash
npm run lint
npm run build
```

Expected: both succeed with no errors.

- [ ] **Step 5: Verify in the browser — this is the regression test that matters most**

Navigate to an existing company's edit page. Note its current Start date and End date values (if any). Click "Deactivate".

Expected: button flips to "Reactivate"; navigating to `/companies` shows Status "Inactive" for that row, **with Start date and End date completely unchanged** — not overwritten to today's date. Click "Reactivate" and confirm the button flips back to "Deactivate", `/companies` shows "Active" again, and the dates are still the same values throughout.

- [ ] **Step 6: Commit**

```bash
git add "src/app/(app)/companies/actions.ts" "src/app/(app)/companies/page.tsx" "src/app/(app)/companies/[id]/edit/page.tsx"
git commit -m "Stop Deactivate/Reactivate from overwriting company end_date"
```

---

## Self-Review Notes

- **Spec coverage:** `active` column added ✓ (Task 1). Deactivate/Reactivate stop touching `end_date` ✓ (Task 2). List/edit pages read `active` directly, no label change (Company already said Active/Inactive) ✓ (Task 2). `start_date`/`end_date` nullability and form presence untouched ✓ (no task changes `CompanyForm.tsx` or the date fields). `isActiveByEndDate` not deleted, only its import in these two Company files ✓.
- **Placeholder scan:** none — every step has complete, runnable code.
- **Type consistency:** `deactivateCompany`/`reactivateCompany` keep their existing `(id: number): Promise<void>` shape and `.bind(null, id)` usage in the edit page — untouched by this plan, matching the exact pattern already proven for Contract's equivalent fix.
