# User Management (separated nav + full CRUD + MASTER-only access) — design

## Purpose

Split `Users` out of the People nav group into its own new **Administration** group, and upgrade it from edit-only to full CRUD (create/edit/deactivate-reactivate) — restricted entirely to users whose own `app_user.role_code = 'master'`. This is the first feature in the app with real access control; every prior feature explicitly declared "no RBAC" as a non-goal. Also the first feature that creates a real Supabase Auth account rather than just an `app_user` data row.

## Non-goals

- No hard-delete of a user (cascades to `auth.users` via `ON DELETE CASCADE` and would orphan their historical `approval.approver_user_id`/`user_position.user_id`/`user_signature.user_id` references) — deactivate only, same precedent as every other feature.
- No password-reset/change-password flow for existing users — out of scope, this feature only sets the initial password at creation time.
- No email-invite flow (would require confirming this self-hosted instance's SMTP is actually configured, untested) — confirmed with the project owner: the MASTER admin sets the initial password directly in the Create form instead.
- No UI for managing `app_role` itself (master/admin/manager) — those three already exist and are correct; this feature only assigns an existing role to a user, doesn't create new roles.

## Design

### Access control: MASTER-only, enforced server-side, hidden from nav for everyone else

A new shared helper, `src/lib/auth/require-master.ts`, exports `requireMasterRole()`: reads the current session via `supabase.auth.getUser()`, looks up their `app_user.role_code`, and throws/redirects if it isn't `'master'`. This is called at the top of every `/users/*` page (`page.tsx`, `new/page.tsx`, `[id]/edit/page.tsx`) and every Server Action in `users/actions.ts`. **This is a deliberate exception to this codebase's usual "no shared helpers, duplicate per feature" convention** — security checks must never drift between copies, unlike ordinary business validation.

The sidebar (`src/components/app-shell/sidebar.tsx`) also hides the whole Administration group for non-MASTER users, so it's not just blocked but invisible — `src/app/(app)/layout.tsx` already fetches the current user for the login gate; it will also look up their `role_code` there and pass `isMaster: boolean` down through `AppShell` → `Sidebar`. `NavGroup` gets a new optional `masterOnly?: boolean` field in `nav.ts`; `Sidebar` filters out any `masterOnly` group when `!isMaster`. This is enforcement-in-depth: the nav hide is a UX nicety, the real gate is server-side in every page/action.

**Self-lockout guard**: `updateUser` and `deactivateUser` both reject an attempt to change your own account in a way that would remove your own MASTER access (changing your own `role_code` away from `master`, or deactivating yourself) — there's currently only one MASTER user, and losing that role by accident would lock the whole Administration section.

### Creating a user actually creates a Supabase Auth account

`createUser` uses `src/lib/supabase/admin.ts`'s service-role client to call `auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { name } })`. This fires the existing `handle_new_auth_user` trigger, which auto-inserts `app_user (id, email, name)` with `role_code` defaulting to `'manager'`. The action then does a normal `app_user` update (via the regular server client, same as `updateUser` already does) to set `username` and the actually-selected `role_code`. `email_confirm: true` skips any confirmation-email dependency.

### Deactivating a user actually disables their login — no `active` column added

Unlike every other feature, `app_user` does **not** get an `active` column. The real authority over whether an account can log in is Supabase Auth itself, not a column in this app's own table — adding a redundant `active` flag risks silently drifting from the real state if an account is ever banned/unbanned directly through Supabase's own tooling outside this app. Instead:
- `deactivateUser`/`reactivateUser` call the admin client's `auth.admin.updateUserById(id, { ban_duration: '87600h' })` (~10 years, effectively indefinite) / `{ ban_duration: 'none' }`.
- The list and edit pages display Active/Inactive by calling the admin client's `auth.admin.listUsers()` once per page load (a single bulk call, not one per row) and cross-referencing each `app_user.id` against `banned_until` in the returned Auth user records.

### Fields

**Create**: Email (text, required — becomes the Auth login), Password (password input, required, becomes the initial login password), Name (text, required), Username (text, optional), Role (dropdown: master/admin/manager, required).
**Edit**: Name, Username, Role (email is never editable here — changing an Auth account's email is a separate, riskier operation, out of scope). Not on form: Active (its own Deactivate/Reactivate button, blocked for your own account).

### Navigation

New nav group **Administration**, `masterOnly: true`, containing `{ label: 'Users', icon: UserCog, href: '/users' }` (reusing the existing `UserCog` icon already imported for this same link under People). Removed from the People group.

### Routes (existing routes, upgraded)

- `src/app/(app)/users/page.tsx` — list (Name/Email/Role/Status), gains a "Status" column and an "Add user" button.
- `src/app/(app)/users/new/page.tsx` — new file, the Create form.
- `src/app/(app)/users/[id]/edit/page.tsx` — gains Deactivate/Reactivate button.
- `src/app/(app)/users/UserForm.tsx` — gains Email + Password fields for create (conditionally rendered — Password only shown when creating, not editing; Email shown but disabled/read-only when editing).
- `src/app/(app)/users/actions.ts` — gains `createUser`, `deactivateUser`, `reactivateUser`; `updateUser` gains the self-demotion guard.
- `src/lib/auth/require-master.ts` — new shared helper (see Access control above).

## Testing

No automated tests. Manual verification: as the existing MASTER user, confirm the People group no longer shows Users and a new Administration group does; create a new user with a real password, sign out, sign back in as that new user to confirm the password actually works; confirm the new user's role/name/username are correct; attempt to deactivate/change-role on your OWN account and confirm both are blocked with a clear error; deactivate a *different* test account, confirm it can no longer sign in, then reactivate and confirm it can again; log in as a non-MASTER user (e.g. the existing `manager`-role account) and confirm Administration is invisible in the nav AND that navigating to `/users` directly redirects/blocks.
