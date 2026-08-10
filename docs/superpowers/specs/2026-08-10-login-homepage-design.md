# Login page + simple homepage — design

## Purpose

Get end-to-end authentication working against the self-hosted Supabase instance: a login page backed by an existing `auth.users` account (email + password), and a minimal homepage that proves a session survives and can be read server-side. This is the first real feature built on top of the Supabase backend wiring — it deliberately does not touch any `timesheet_shorebase` business tables yet.

## Non-goals

- No role/permission logic. The "master role" mentioned for the existing account isn't stored anywhere yet (confirmed with the project owner) — out of scope here.
- No password reset / magic link / OAuth. Email + password only.
- No nav shell, no business data on the homepage. Just enough to confirm the logged-in user's identity and let them log out.
- No backfill of the `app_user` row for the existing pre-trigger account. Flagged below as a follow-up, not part of this feature.

## Approaches considered

1. **Client-side login form + Server Action logout + page-level route protection (chosen).** Login page is a Client Component using the browser Supabase client (`src/lib/supabase/client.ts`) directly, so failed logins show an inline error without a full page reload. Logout is a plain `<form>` with a Server Action — no client JS needed for that piece. Each protected page checks its own session via the server client (`src/lib/supabase/server.ts`) and redirects if absent. Matches Supabase's own Next.js integration guidance and requires no changes to `src/proxy.ts` beyond what's already there (session-cookie refresh).
2. **Centralize route protection in `src/proxy.ts`.** Same login/logout mechanics, but the proxy itself inspects the session and redirects unauthenticated requests before they reach a page. Better once there are many protected routes; overkill for the two routes that exist today, and hides the redirect logic from anyone reading an individual page.
3. **Server Action for login too.** No client JS anywhere, but error feedback requires a redirect-with-query-param round trip (e.g. `/login?error=invalid`) instead of instant inline feedback.

Chosen: **Approach 1.** Revisit approach 2 once there are more than a couple of protected routes.

## Design

### `src/app/login/page.tsx`
Client Component (`'use client'`). Controlled email + password inputs, a submit handler that calls:

```ts
const supabase = createClient(); // src/lib/supabase/client.ts
const { error } = await supabase.auth.signInWithPassword({ email, password });
```

- On success: `router.push('/')` then `router.refresh()` (so the server-rendered homepage picks up the new session on next render).
- On error: show the returned error message inline (e.g. "Invalid login credentials"); stay on the page; no navigation.
- Local `loading` state disables the submit button while the request is in flight.

### `src/app/page.tsx`
Server Component. On every request:

```ts
const supabase = await createClient(); // src/lib/supabase/server.ts
const { data: { user } } = await supabase.auth.getUser();
if (!user) redirect('/login');
```

Renders the "bare welcome shell" once a user is present: the user's email, a short welcome message, and a logout form (see below). No other data is fetched.

### Logout
A `<form action={signOut}>` on the homepage, where `signOut` is a Server Action (co-located in `src/app/page.tsx` or a small `src/app/actions.ts` if it needs reuse later):

```ts
'use server';
async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect('/login');
}
```

No client component required for this piece.

### `src/proxy.ts`
Unchanged. It already refreshes the session cookie on every request (see `CLAUDE.md` / existing implementation), which is what keeps the server-side `getUser()` check above accurate without any additional wiring.

## Data flow summary

1. Unauthenticated visit to `/` → server-side `getUser()` returns no user → redirect to `/login`.
2. `/login` form submits credentials via the browser client → Supabase Auth validates against `auth.users` → success sets the session cookie (via `@supabase/ssr`) and the client navigates to `/`.
3. `/` now finds a user server-side and renders the welcome shell.
4. Logout form submits to a Server Action → session cleared → redirect to `/login`.

## Error handling

- Invalid credentials: inline message on the login page, sourced from Supabase's own error (`error.message`), no page reload.
- Any other/unexpected error during sign-in: generic fallback message ("Something went wrong — try again").
- Homepage never renders without a valid session; there's no "logged out but somehow on `/`" state to handle beyond the redirect.

## Testing

No automated tests for this first pass — verification is manual, via the dev server:

- Visiting `/` while logged out redirects to `/login`.
- Correct credentials log in and land on `/`.
- Incorrect credentials show an inline error and stay on `/login`.
- Logout returns to `/login`, and `/` immediately redirects again if visited directly afterward.

## Follow-up (not part of this feature)

The project owner's existing `auth.users` account predates the `handle_new_auth_user` trigger (added in the initial schema migration), so it very likely has no corresponding `app_user` row — the trigger only fires on new sign-ups. This login/homepage feature only reads `auth.users` directly and doesn't need that row, but any future feature that joins against `app_user` (name, job position, etc.) will need it backfilled first.
