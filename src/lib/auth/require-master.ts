import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

/**
 * Gate for the Administration section. Unlike ordinary per-feature
 * validation, this MUST stay identical everywhere it's used - security
 * checks are the one thing in this codebase deliberately shared rather
 * than duplicated per route.
 */
export async function requireMasterRole() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const { data: appUser } = await supabase
    .from('app_user')
    .select('id, role_code')
    .eq('id', user.id)
    .maybeSingle();

  if (appUser?.role_code !== 'master') {
    redirect('/');
  }

  return { id: user.id };
}

/**
 * True when the signed-in user is 'manager' - the one role that's view-only
 * across the whole app. Called from every feature's actions.ts (to reject
 * writes) and page.tsx (to hide write UI) - shared for the same reason as
 * requireMasterRole: security checks must never drift between copies.
 */
export async function isManagerRole(): Promise<boolean> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return false;

  const { data: appUser } = await supabase
    .from('app_user')
    .select('role_code')
    .eq('id', user.id)
    .maybeSingle();

  return appUser?.role_code === 'manager';
}
