# Manager role: view-only across the app — design spec

## Goal

Users with `app_user.role_code = 'manager'` should be able to view every page
they currently can, but never create, edit, deactivate, or reactivate a
record anywhere in the app (outside of Administration, which is already
`master`-only and therefore already fully closed to `manager`).

## Why this needs two layers, not one

Checked live against the database: every business table except `app_user`
currently has a single permissive RLS policy —
`for all using (true) with check (true)` for `authenticated` — plus a
blanket `GRANT INSERT, SELECT, UPDATE` to `authenticated`. This is exactly
the same shape as the privilege-escalation bug found and fixed for
`app_user` on 2026-09-02: gating only the Next.js Server Action layer would
stop the UI from offering write actions, but a `manager` user could still
call PostgREST directly with their own session JWT and write to any table,
completely bypassing the app. So this has to be fixed at the data layer,
with the app layer as the second, defense-in-depth layer (and the one that
also drives hiding write UI).

## Layer 1 — Database (RLS)

Add one helper function:

```sql
create or replace function timesheet_shorebase.is_manager()
returns boolean
language sql
stable
security definer
set search_path = timesheet_shorebase, public
as $$
  select coalesce(
    (select role_code = 'manager' from timesheet_shorebase.app_user where id = auth.uid()),
    false
  );
$$;
```

For every table currently holding the permissive `for all` policy (25
tables — every business table except `app_user`, which already has its own
SELECT-only policy from the 2026-09-02 lockdown), replace it with:

- `for select using (true)` — unchanged, everyone authenticated can still read.
- `for insert with check (not timesheet_shorebase.is_manager())`
- `for update using (not timesheet_shorebase.is_manager()) with check (not timesheet_shorebase.is_manager())`
- `for delete using (not timesheet_shorebase.is_manager())`

(Nothing in this schema currently issues a hard `DELETE` from the app —
every "delete" is really the deactivate/reactivate `UPDATE` — but the
`DELETE` policy is included for completeness/defense-in-depth since the
table still grants it.)

Since this is the same 4-policy shape repeated 25 times, the migration
generates it with a `DO` block looping over an explicit array of table
names rather than being hand-written 100 times over — less surface area
for a copy-paste mistake across that many tables.

Affected tables (25): `activity`, `approval`, `approval_workflow`,
`approval_workflow_stage`, `company`, `contract`, `contract_service`,
`contract_service_timesheet_group`, `equipment`, `jetty_ship`,
`job_position`, `job_title`, `material_handling_equipment`,
`material_handling_item`, `material_handling_job`, `period`, `person`,
`person_accomodation`, `person_meal`, `product`, `shorebase_service`,
`subcontractors`, `summary_timesheet`, `timesheet`, `user_position`.

`app_user` is untouched (already locked down; `manager` has no direct nav
access to `/users` anyway since that section is `masterOnly`).

## Layer 2 — App (Server Actions + UI)

New shared helper, alongside the existing `requireMasterRole` (same file,
`src/lib/auth/require-master.ts`, renamed in spirit to cover both — the
established exception to "duplicate per feature" in this codebase, since
security checks must never drift between copies):

```ts
export async function isManagerRole(): Promise<boolean> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;
  const { data: appUser } = await supabase
    .from('app_user')
    .select('role_code')
    .eq('id', user.id)
    .maybeSingle();
  return appUser?.role_code === 'manager';
}
```

Every `create*`/`update*` action across all 25 features' `actions.ts` gets
this added as its first check, returning the same `{ error }` shape the
feature's form already expects:

```ts
if (await isManagerRole()) {
  return { error: 'Managers have read-only access.' };
}
```

Every `deactivate*`/`reactivate*` action (which throw rather than return
`{ error }`) gets:

```ts
if (await isManagerRole()) {
  throw new Error('Managers have read-only access.');
}
```

## Layer 3 — UI (hide write affordances, but keep view access)

Partial precedent from `/users` (hide the affordance rather than show a
disabled control), with one correction: in every feature except Users, the
row link on the list page (e.g. the company name in `companies/page.tsx`)
is the *only* way to open a record's full detail — there's no separate
view-only page. Hiding that link for `manager` would remove their ability
to view a record at all, which contradicts the goal. So:

- **List page**: hide the "+ New" / "Add X" button only. The per-row link
  into the edit page stays — that's how a `manager` views a record's full
  detail, same as everyone else.
- **`new/page.tsx`**: hiding the button doesn't stop direct navigation to
  `/companies/new` (etc.) by URL. A blank create form has nothing to
  "view", so for `manager` this page redirects straight back to the list
  page instead of rendering.
- **Edit page**: stays reachable and still shows the record's data, but
  for `manager`:
  - the Deactivate/Reactivate button hidden
  - the shared `XForm` component (`CompanyForm`, `ContractForm`, etc.)
    gets a new `readOnly?: boolean` prop — when true, every input/select/
    checkbox renders `disabled`, and the submit button is replaced with a
    small inline notice ("Managers have read-only access.") instead of a
    disabled button that looks clickable.

This keeps "view everything, change nothing" honest: a `manager` can still
open any record and read every field, they just can't submit a change from
that page — and Layers 1–2 mean even a direct API call can't either.

This touches, per feature: `actions.ts`, `page.tsx` (list), `new/page.tsx`,
`[id]/edit/page.tsx`, and the shared `XForm.tsx` component — roughly
five files × 26 features. Mechanical and repetitive rather than
conceptually hard, which is why it's dispatched to background agents by
nav cluster rather than built by hand one feature at a time.

## Non-goals / unaffected

- **Administration (`/users`)** — already `master`-only, `manager` already
  has zero access (nav hidden, direct navigation redirected). No change.
- **Dashboard** — read-only already, no write actions exist there.
- **Invoices / Reference Data (unbuilt)** — not yet built; when they are,
  apply this same gate as part of that feature's own build rather than
  retrofitting later.

## Rollout

Task 1 (migration) is done directly, applied via Supabase Studio, verified
live via `psql` — same as every prior migration. Tasks 2+ (wiring
`isManagerRole()` into every `actions.ts` + hiding UI affordances) are
dispatched as background agents split by nav cluster (Operations,
Approvals & Billing, Master Data, People — the same four clusters used for
the 2026-08-31 active-filter fix), since the change is the same mechanical
shape repeated ~25 times rather than one coherent new feature.

Verification: since there's no existing `manager`-role test account, live
verification will need either a temporary test account with `role_code =
'manager'` (cleaned up afterward, same as any other test data) or a direct
`psql`/PostgREST check that a manager-role JWT gets rejected on write —
whichever the user prefers to set up.
