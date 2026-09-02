# Manager role: view-only across the app — implementation plan

Spec: `docs/superpowers/specs/2026-09-02-manager-read-only-design.md`

## Task 1 — Migration: `is_manager()` + RLS policy split (main session)

New file `supabase/migrations/20260902030000_manager_read_only_rls.sql`.

1. Create `timesheet_shorebase.is_manager()` (see spec for body).
2. `DO` block looping over this table array, for each: `drop policy` the
   existing `"authenticated users can read/write ..."` policy, then create
   the four replacement policies (select/insert/update/delete) per the
   spec:

   ```
   activity, approval, approval_workflow, approval_workflow_stage, company,
   contract, contract_service, contract_service_timesheet_group, equipment,
   jetty_ship, job_position, job_title, material_handling_equipment,
   material_handling_item, material_handling_job, period, person,
   person_accomodation, person_meal, product, shorebase_service,
   subcontractors, summary_timesheet, timesheet, user_position
   ```

3. Paste into Supabase Studio (never `supabase db push`), then verify live:
   ```sql
   select tablename, policyname, cmd from pg_policies
   where schemaname = 'timesheet_shorebase' order by tablename, cmd;
   ```
   Expect exactly 4 rows per table above, `app_user` untouched at 1.
4. Commit alone: "Add manager-role RLS split across all business tables".

## Task 2 — Shared app helper (main session)

Edit `src/lib/auth/require-master.ts`: add and export `isManagerRole()`
(body in the spec). Keep `requireMasterRole` unchanged. No behavior change
yet — this just makes the helper available for Tasks 3–6.

Commit bundled with Task 1, or its own small commit — either is fine, just
don't let it slip to the end (per this project's standing rule about
design-doc commits never slipping — same applies here).

## Tasks 3–6 — Wire the gate into every feature, by nav cluster

Each is a background `Agent` call. All four are independent (no shared
files between clusters) so dispatch them in parallel. Each agent:

- Imports `isManagerRole` from `@/lib/auth/require-master`.
- For every feature in its cluster, edits exactly these files:
  - **`actions.ts`**: first line of every `create*`/`update*` function —
    `if (await isManagerRole()) return { error: 'Managers have read-only access.' };`
    First line of every `deactivate*`/`reactivate*` function —
    `if (await isManagerRole()) throw new Error('Managers have read-only access.');`
  - **`page.tsx`** (list): call `isManagerRole()` once at the top; wrap the
    "+ New"/"Add X" link in `{!isManager && (...)}`. Leave the per-row link
    to the edit page untouched.
  - **`new/page.tsx`**: call `isManagerRole()` at the top; if true,
    `redirect('/the-list-path')` before doing anything else (no point
    querying dropdown sources for a page that won't render).
  - **`[id]/edit/page.tsx`**: call `isManagerRole()`; wrap the
    Deactivate/Reactivate `<form>` in `{!isManager && (...)}`; pass
    `readOnly={isManager}` to the `XForm` component.
  - **`XForm.tsx`**: accept `readOnly?: boolean` (default `false`). Add
    `disabled={readOnly}` to every `<input>`/`<select>`/`<textarea>`/
    checkbox. Replace the submit `<button>` with, when `readOnly`, a
    `<p className="text-sm text-zinc-500 dark:text-zinc-400">Managers have
    read-only access.</p>` instead (keep the existing `state.error` block
    as-is — it just won't ever fire for a `manager` since the button is
    gone).
- Runs `npm run lint` and `npm run build` after all edits in its cluster.
- Live-verifies at least 2 of its features end-to-end using the existing
  manager-role test account the user already created: log in as that
  account, confirm the "+ New" button is gone, confirm `/feature/new`
  redirects, confirm an edit page shows disabled fields and no Save
  button, confirm Deactivate/Reactivate is gone. Use `get_page_text`/
  `read_page` as ground truth (per this project's standing note about
  parallel agents racing the shared Browser tab) rather than assuming
  another cluster's navigation didn't just clobber the tab.

**Cluster assignments** (matches the nav groups, same split used for the
2026-08-31 active-filter fix):

- **Task 3 — Operations** (6): `timesheets`, `activities`,
  `actual-activities`, `material-handling-jobs`, `material-handling-items`,
  `material-handling-equipment`.
- **Task 4 — Approvals & Billing** (4): `approval-workflows`,
  `approval-workflow-stages`, `approvals`, `summary-timesheets`.
- **Task 5 — Master Data** (10): `companies`, `contracts`,
  `contract-services`, `contract-service-timesheet-groups`, `services`,
  `periods`, `subcontractors`, `equipment`, `jetty-ships`, `products`.
- **Task 6 — People** (6): `persons`, `accommodation`, `meals`,
  `job-titles`, `job-positions`, `user-positions`.

`users` (Administration) is explicitly out of scope — already
`master`-only, `manager` has zero access there already.

## Task 7 — Review (main session dispatches one more background agent)

After Tasks 3–6 all land, one review agent checks the full diff against
this plan: every one of the 26 features actually got all five touch
points (not just some), no feature's `XForm` was missed, no cluster
accidentally skipped a `deactivate`/`reactivate` function, RLS policies
match the plan's table list exactly (no typo'd table name silently
skipped). Tailor the checklist to what's riskiest here specifically:
completeness across 26 near-identical repetitions, since the risk isn't
conceptual mistakes but a missed file in one or two features.

## Task 8 — Live verification pass (main session or one more agent)

Full pass logged in as the existing manager-role test account across
every nav group, confirming: every list page's Add-button is gone, every
`/new` route redirects, every edit page is fully disabled with no Save/
Deactivate, and — the actual data-layer check — a direct PostgREST
`PATCH`/`POST` against one table (e.g. `company`) using the manager
account's own session token returns a permission-denied/RLS error, not a
200. Confirm as `master` (or any non-manager role) that all 26 features still
work normally (create/edit/deactivate all still succeed) — this is the one
place a mistake would be easy to miss (blocking everyone, not just
managers).

## Push

After Task 8 confirms clean, ask "confirm and I'll push" before
`git push origin main` — same as always.
