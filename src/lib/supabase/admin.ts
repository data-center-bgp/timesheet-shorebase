import { createClient as createSupabaseClient } from '@supabase/supabase-js';

// Service-role client - bypasses Row Level Security entirely.
// Server-only: never import this from a Client Component or anything that
// ends up in the browser bundle. Use src/lib/supabase/server.ts instead for
// anything that should respect the logged-in user's permissions.
export function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false }, db: { schema: 'timesheet_shorebase' } },
  );
}
