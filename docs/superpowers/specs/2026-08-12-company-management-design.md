# Company management — design

## Purpose

Build the first real CRUD feature on top of the ERD-derived schema, starting with `Company` because every downstream table (`Contract`, `ContractService`, and everything that follows) references it — nothing else in the workflow can be built meaningfully until it exists. This also introduces two things the codebase doesn't have yet: a Row Level Security policy, and a reusable create/edit form pattern for a business table.

## Non-goals

- No role-based access control on `company` yet. RLS is added, but with a single "any authenticated user can read/write" policy — no `role_code` distinction. That refinement is a separate, later piece of work.
- No hard-delete. "Deactivate" is the only removal mechanism, via `end_date`.
- No enforcement that exactly one company is marked `internal`. A plain checkbox, no validation rule.
- No automated tests, consistent with the rest of the project so far.

## Approaches considered

1. **Server Components + Server Actions, dedicated routes (chosen).** `/companies` lists via a Server Component query. `/companies/new` and `/companies/[id]/edit` share one Client Component form, submitting to Server Actions validated with React's `useActionState`. Deactivate/reactivate are inline Server Action buttons, same shape as the existing logout button. Matches the login/homepage pattern already built and reviewed — no new dependency, no new fetching pattern introduced into a codebase that currently leans entirely on Server Components for reads.
2. **Client-heavy with a data-fetching library (React Query/SWR).** More interactive (optimistic updates, no navigation between list and form), but introduces both a new dependency and a fetching pattern that doesn't match anything else in the codebase.
3. **Modal-based create/edit instead of dedicated routes.** Nicer polish — no page navigation to add a company — but real added complexity (modal state, focus trapping) to take on for the very first CRUD feature, before it's known whether that's the UX wanted across the other ~17 sections.

Chosen: **Approach 1.** Revisit approach 3 once a few sections exist and navigation-per-edit friction is actually felt.

## RLS gap

No Row Level Security policies exist on any table today — by Postgres default, that means the `anon`/`authenticated` roles (what real logged-in users connect as) have zero access to any table; only the service-role client (`admin.ts`) can read/write anything. Building Company management against that as-is would fail silently: empty lists, permission-denied on insert.

This feature adds one minimal policy on `company`:

```sql
alter table timesheet_shorebase.company enable row level security;

create policy "authenticated users can read/write companies"
  on timesheet_shorebase.company
  for all
  to authenticated
  using (true)
  with check (true);
```

No role distinction yet — this is the real enforcement mechanism (RLS, not the service-role bypass), refined later with `role_code`-based checks (`master`/`admin` vs. `manager` read-only, etc.) once those business rules are confirmed.

## Design

### Schema

`timesheet_shorebase.company` already exists: `id`, `name`, `internal` (boolean), `start_date`, `end_date`. No schema changes beyond the RLS policy above.

**Active/Inactive** is computed, not stored: a company is active if `end_date` is null or in the future. "Deactivate" sets `end_date` to today; "Reactivate" clears it back to null.

**Internal flag**: a plain "This is our own company" checkbox on the form. No enforcement of how many companies can be marked internal — kept simple until a real business rule comes up.

### Routes

- `src/app/(app)/companies/page.tsx` — Server Component. Table of all companies: Name, Type (Internal/External, from `internal`), Status (Active/Inactive, computed from `end_date`), Start/End Date. Links to edit each row and to `/companies/new`.
- `src/app/(app)/companies/new/page.tsx` — thin wrapper rendering `<CompanyForm>` in create mode.
- `src/app/(app)/companies/[id]/edit/page.tsx` — thin wrapper rendering `<CompanyForm>` in edit mode, pre-populated from the row, plus Deactivate/Reactivate action buttons.
- `src/app/(app)/companies/CompanyForm.tsx` — Client Component: name (required), internal checkbox, start date, end date. Submits via `useActionState` to the appropriate Server Action.
- `src/app/(app)/companies/actions.ts` — `createCompany`, `updateCompany`, `deactivateCompany` (sets `end_date` to today), `reactivateCompany` (clears `end_date`).

### Nav

`src/components/app-shell/nav.ts` already has `href: '/companies'` on the Companies item (set when every nav item was given a real href pointing at the `[section]` coming-soon catch-all). Once this route exists, Next.js resolves it there instead of the catch-all automatically — no nav.ts change needed. Companies becomes the first sidebar item to go from "Coming soon" to a real page.

### Data flow

1. `/companies` — Server Component queries `timesheet_shorebase.company` via the server client (RLS now permits this for any authenticated user), renders the table.
2. Create — form on `/companies/new` submits to `createCompany`, which inserts a row and redirects to `/companies`.
3. Edit — form on `/companies/[id]/edit` submits to `updateCompany`, which updates the row and redirects to `/companies`.
4. Deactivate/Reactivate — buttons on the edit page (or inline on the list) call their Server Action directly, no form fields needed, then revalidate/redirect back to `/companies`.

### Error handling

Server-side validation (name required) surfaced via `useActionState`, same inline-error pattern as the login form — errors returned from the action re-render the form with the message, no page reload.

## Testing

No automated tests, consistent with the rest of the project. Manual verification: create a company, see it in the list, edit it, deactivate it and confirm it shows Inactive, reactivate it and confirm it shows Active again.
