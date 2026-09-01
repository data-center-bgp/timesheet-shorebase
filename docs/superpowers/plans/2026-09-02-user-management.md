# User Management Implementation Plan

> Implemented directly (not dispatched to a subagent) given the security-sensitive nature (Auth account creation, self-lockout guards) and that it touches shared app-shell infrastructure (nav/layout/sidebar) rather than an isolated feature folder.

**Goal:** Split Users into its own MASTER-only "Administration" nav group, upgrade it to full CRUD backed by real Supabase Auth account creation/deactivation.

## Tasks

1. **Shared auth helper** — `src/lib/auth/require-master.ts`: `requireMasterRole()` reads the session, looks up `app_user.role_code`, throws/redirects if not `'master'`.
2. **Nav + shell wiring** — `nav.ts` gains `masterOnly?: boolean` on `NavGroup`, new `Administration` group (`masterOnly: true`) with `Users` moved out of `People`. `layout.tsx` looks up the current user's `role_code` and passes `isMaster` through `AppShell` → `Sidebar`, which filters out `masterOnly` groups when `!isMaster`.
3. **Users actions.ts** — add `createUser` (admin client `auth.admin.createUser` + follow-up `app_user` update for username/role), `deactivateUser`/`reactivateUser` (admin client `auth.admin.updateUserById` ban toggle), self-lockout guards on `updateUser`/`deactivateUser`. Every action calls `requireMasterRole()` first.
4. **Users pages** — `page.tsx` (Status column via bulk `auth.admin.listUsers()`, "Add user" button, `requireMasterRole()`), `new/page.tsx` (new, Create form), `[id]/edit/page.tsx` (Deactivate/Reactivate button, `requireMasterRole()`), `UserForm.tsx` (Email+Password fields for create only).
5. **Verify**: lint, build, live browser check (create a real account, sign in as it, deactivate/reactivate cycle, self-lockout guard, nav hidden for non-master).
6. **Commit + push** (after user confirmation, as always).
