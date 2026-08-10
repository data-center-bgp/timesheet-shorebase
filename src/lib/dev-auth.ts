/**
 * TEMPORARY development-only auth bypass.
 *
 * The self-hosted Supabase API is currently returning 504 Gateway Timeout on
 * every request (Postgres is fine — it's the Kong/GoTrue layer that's down),
 * so no real login is possible. Setting `DEV_AUTH_BYPASS=true` in `.env.local`
 * lets protected pages render with a stub identity so UI work can continue.
 *
 * Hard-gated on `NODE_ENV !== 'production'`, so this cannot activate in a
 * production build even if the env var is set there.
 *
 * DELETE THIS FILE and its call sites (`src/app/page.tsx`,
 * `src/app/login/page.tsx`) once the Supabase API is healthy again.
 */
export const DEV_AUTH_BYPASS =
  process.env.NODE_ENV !== 'production' &&
  process.env.DEV_AUTH_BYPASS === 'true';

/** Stub identity used only when DEV_AUTH_BYPASS is active. */
export const DEV_STUB_EMAIL = 'superadmin@barokahperkasagroup.com';
