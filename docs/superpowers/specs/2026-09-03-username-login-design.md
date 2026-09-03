# Username login — design spec

## Problem

Login only accepts email (`supabase.auth.signInWithPassword({ email, password })`,
called client-side from `src/app/login/LoginForm.tsx`). Supabase Auth
(GoTrue) only ever authenticates by email — it has no username concept.
`app_user.username`/`app_user.email` are both plain columns on our own
table, unrelated to GoTrue's identity model.

## Design

Single "Username or email" input, replacing the current "Email" field.
On submit:

1. If the typed value contains `@`, treat it as an email — sign in
   directly with `signInWithPassword({ email: value, password })`,
   exactly the current behavior, no lookup needed.
2. Otherwise, treat it as a username. Call a new Server Action
   (`resolveLoginEmail`, `src/app/login/actions.ts`) that uses the
   **service-role client** (`createAdminClient()` from
   `@/lib/supabase/admin`) to look up `app_user.email` where
   `username ilike <value>` (case-insensitive — usernames aren't meant to
   be case-sensitive identifiers). Service-role is required here because
   the login page has no session yet, and `app_user`'s RLS policy only
   grants SELECT to `authenticated` — an anonymous request has zero
   access, by design, so this can't be done with the regular anon-key
   client.
3. If no matching username is found, return a generic error —
   **the same wording as a wrong-password failure** (`'Invalid username/
   email or password.'`) — so the login form never reveals whether the
   username itself was wrong versus the password. Don't attempt
   `signInWithPassword` in this case (there's no email to try).
4. If found, sign in with the resolved email exactly as step 1.

This keeps the existing client-side sign-in architecture intact — the
browser is still the one calling `signInWithPassword` and writing the
non-HttpOnly session cookies `@supabase/ssr` needs (the documented,
deliberate `CLAUDE.md` trade-off) — it just adds one lookup round-trip
beforehand when the input isn't already an email.

## Non-goals

- No rate-limiting on the lookup (matches this app's existing posture —
  no rate-limiting exists anywhere else either).
- No change to `createUser`/`updateUser` in `src/app/(app)/users/actions.ts`
  — `username` is already a field there, nothing about account creation
  changes.
