# Login Page + Simple Homepage Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Working email/password login against the self-hosted Supabase instance, and a minimal protected homepage that proves the session round-trips correctly.

**Architecture:** Client Component login form (browser Supabase client, inline error on failure) → Server Component homepage that checks the session server-side and redirects to `/login` if absent → logout via an inline Server Action (no client JS needed for that piece). `src/proxy.ts` already refreshes the session cookie on every request; it is not modified.

**Tech Stack:** Next.js 16 (App Router, Server Actions), React 19, TypeScript, Tailwind CSS v4, `@supabase/ssr` + `@supabase/supabase-js`.

## Global Constraints

- Email + password only — no magic link, OAuth, or password-reset flow in this pass.
- No role/permission logic — "master role" is not stored anywhere yet.
- No nav shell, no business data on the homepage — bare welcome shell only.
- No backfill of the `app_user` row for the existing pre-trigger account — out of scope.
- Use the existing `createClient` from `src/lib/supabase/client.ts` (browser) and `src/lib/supabase/server.ts` (server) — both are already scoped to the `timesheet_shorebase` schema; do not create new Supabase client instances.
- No automated tests for this pass (per approved spec) — verification is manual, via the dev server, with exact steps and expected results given in each task.
- Design language for this pass: Tailwind's built-in `teal` scale as the one accent color (evokes shorebase/marine operations, avoids the generic indigo/blue SaaS default), `zinc` for neutrals, the existing Geist Sans/Mono fonts (already loaded in `src/app/layout.tsx`, exposed as Tailwind's `font-sans`/`font-mono`). The one deliberate signature touch: identity (the "SHOREBASE" wordmark, and the signed-in user's email) is set in `font-mono` with tracked-out uppercase labels, echoing an operations manifest rather than a generic "Welcome, {email}" sentence. Do not introduce additional colors, fonts, animation, or decorative elements beyond what's specified in the tasks below.

---

### Task 1: Fix body font-family bug, build the login page

**Files:**
- Modify: `src/app/globals.css:22-26`
- Create: `src/app/login/page.tsx`

**Interfaces:**
- Consumes: `createClient` from `src/lib/supabase/client.ts` — a zero-argument function returning a `SupabaseClient`. Relevant method: `client.auth.signInWithPassword({ email, password })`, resolving to `{ data, error }` where `error` is `AuthError | null` with a `.message` string.
- Produces: the route `/login`. Not imported by any other file in this plan — Task 2 reaches it only via browser navigation/redirect, not an import.

- [ ] **Step 1: Fix the body font-family bug**

The Geist Sans font is loaded in `src/app/layout.tsx` and exposed as the `--font-sans` CSS variable (see `globals.css:11`), but the `body` rule hardcodes a plain fallback stack instead of using it — so Geist Sans currently never actually renders; the app silently falls back to Arial/Helvetica.

In `src/app/globals.css`, change:

```css
body {
  background: var(--background);
  color: var(--foreground);
  font-family: Arial, Helvetica, sans-serif;
}
```

to:

```css
body {
  background: var(--background);
  color: var(--foreground);
  font-family: var(--font-sans), Arial, Helvetica, sans-serif;
}
```

- [ ] **Step 2: Create the login page**

Create `src/app/login/page.tsx`:

```tsx
'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = createClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      setError(signInError.message);
      setLoading(false);
      return;
    }

    router.push('/');
    router.refresh();
  }

  return (
    <div className="flex min-h-screen flex-1 items-center justify-center bg-zinc-50 px-4 dark:bg-black">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm rounded-lg border border-zinc-200 bg-white p-8 shadow-sm dark:border-zinc-800 dark:bg-zinc-950"
      >
        <p className="font-mono text-xs font-medium tracking-[0.2em] text-teal-700 dark:text-teal-400">
          SHOREBASE
        </p>
        <h1 className="mt-1 text-xl font-semibold text-zinc-950 dark:text-zinc-50">
          Sign in
        </h1>

        <div className="mt-6 space-y-4">
          <div className="space-y-1">
            <label
              htmlFor="email"
              className="text-sm font-medium text-zinc-700 dark:text-zinc-300"
            >
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-950 focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-600/40 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
            />
          </div>

          <div className="space-y-1">
            <label
              htmlFor="password"
              className="text-sm font-medium text-zinc-700 dark:text-zinc-300"
            >
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-950 focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-600/40 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
            />
          </div>

          {error && (
            <p role="alert" className="text-sm text-red-600 dark:text-red-400">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-md bg-teal-700 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-teal-800 focus:outline-none focus:ring-2 focus:ring-teal-600/40 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-teal-600 dark:hover:bg-teal-500"
          >
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </div>
      </form>
    </div>
  );
}
```

- [ ] **Step 3: Verify manually**

Run: `npm run dev`, then open `http://localhost:3000/login` in a browser.

Expected:
- Page renders a centered card: "SHOREBASE" in small tracked uppercase teal mono text, "Sign in" heading, email and password fields, a teal "Sign in" button.
- Tab through the form — both inputs and the button show a visible teal focus ring.
- Submit with an email/password that doesn't match any account: an inline red error message appears below the password field (e.g. "Invalid login credentials"); the page does not navigate away; the button returns to its enabled "Sign in" state.
- View page source or inspect computed styles on `<body>` — `font-family` should resolve to Geist Sans (not Arial).

- [ ] **Step 4: Commit**

```bash
git add src/app/globals.css src/app/login/page.tsx
git commit -m "Add login page, fix body font-family fallback bug"
```

---

### Task 2: Protected homepage with logout

**Files:**
- Modify: `src/app/page.tsx` (replace entirely — currently the Create Next App boilerplate)

**Interfaces:**
- Consumes: `createClient` from `src/lib/supabase/server.ts` — an async function resolving to a `SupabaseClient`. Relevant methods: `client.auth.getUser()` resolving to `{ data: { user } }` where `user` is `User | null`; `client.auth.signOut()`, which clears the session.
- Produces: the route `/` — the protected homepage. Nothing in this plan imports from it.

- [ ] **Step 1: Replace the homepage**

Replace the full contents of `src/app/page.tsx` with:

```tsx
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  async function signOut() {
    'use server';

    const supabase = await createClient();
    await supabase.auth.signOut();
    redirect('/login');
  }

  return (
    <div className="flex min-h-screen flex-1 flex-col bg-zinc-50 dark:bg-black">
      <header className="flex items-center justify-between border-b border-zinc-200 px-6 py-4 dark:border-zinc-800">
        <p className="font-mono text-xs font-medium tracking-[0.2em] text-teal-700 dark:text-teal-400">
          SHOREBASE
        </p>
        <form action={signOut}>
          <button
            type="submit"
            className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100 focus:outline-none focus:ring-2 focus:ring-teal-600/40 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-900"
          >
            Log out
          </button>
        </form>
      </header>

      <main className="flex flex-1 flex-col items-start justify-center px-6">
        <p className="font-mono text-xs font-medium tracking-[0.2em] text-zinc-500 dark:text-zinc-400">
          SIGNED IN AS
        </p>
        <p className="mt-1 font-mono text-lg text-zinc-950 dark:text-zinc-50">
          {user.email}
        </p>
        <p className="mt-6 max-w-md text-zinc-600 dark:text-zinc-400">
          You&apos;re signed in. This is a placeholder homepage — the real
          Shorebase Timesheet features build on top of this.
        </p>
      </main>
    </div>
  );
}
```

- [ ] **Step 2: Verify manually**

With `npm run dev` still running (or restarted):

1. In a fresh/incognito browser window, visit `http://localhost:3000/`.
   Expected: immediately redirected to `/login` (no session exists).
2. On `/login`, sign in with your existing `auth.users` account's real email and password.
   Expected: redirected to `/`, showing the header (SHOREBASE wordmark + "Log out" button), "SIGNED IN AS" label, your account's email in monospace, and the placeholder welcome text.
3. Click "Log out".
   Expected: redirected back to `/login`.
4. Visit `http://localhost:3000/` directly again (same window).
   Expected: redirected to `/login` again — confirms the session was actually cleared, not just the UI.

- [ ] **Step 3: Commit**

```bash
git add src/app/page.tsx
git commit -m "Add protected homepage with server-side auth check and logout"
```

---

## Self-Review Notes

- **Spec coverage:** Login page (Task 1) ✓, homepage with server-side redirect (Task 2, Step 1) ✓, logout via Server Action (Task 2, Step 1) ✓, `proxy.ts` left unmodified ✓, manual testing steps matching the spec's four bullet points ✓, `app_user` backfill explicitly called out as out-of-scope in Global Constraints ✓.
- **Placeholder scan:** none found — every step has complete, runnable code or a fully specified manual verification procedure.
- **Type consistency:** both tasks import `createClient` under the same name from different modules (`.../client` vs `.../server`) but never in the same file, so there's no collision; call signatures used (`signInWithPassword`, `getUser`, `signOut`) match the `@supabase/supabase-js` API and are used consistently with how `src/lib/supabase/*.ts` already wraps them elsewhere in the codebase.
