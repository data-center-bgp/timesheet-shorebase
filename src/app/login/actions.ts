'use server';

import { createAdminClient } from '@/lib/supabase/admin';

export type ResolveLoginEmailResult = { email: string } | { error: string };

const INVALID_CREDENTIALS_ERROR = 'Invalid username/email or password.';

/**
 * Login only ever authenticates by email (Supabase Auth has no username
 * concept) - this resolves a typed username to its account's email via
 * the service-role client, since app_user has no RLS access for an
 * unauthenticated request. Returns the same generic error whether the
 * username doesn't exist or anything else goes wrong, so the login form
 * never reveals which part of "username or password" was wrong.
 */
export async function resolveLoginEmail(username: string): Promise<ResolveLoginEmailResult> {
  const trimmed = username.trim();
  if (!trimmed) {
    return { error: INVALID_CREDENTIALS_ERROR };
  }

  const adminClient = createAdminClient();
  const { data, error } = await adminClient
    .from('app_user')
    .select('email')
    .ilike('username', trimmed)
    .maybeSingle();

  if (error || !data?.email) {
    return { error: INVALID_CREDENTIALS_ERROR };
  }

  return { email: data.email };
}
