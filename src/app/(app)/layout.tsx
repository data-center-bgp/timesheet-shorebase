import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { AppShell } from '@/components/app-shell/app-shell';
import { SIDEBAR_COOKIE } from '@/components/app-shell/constants';
import { THEME_COOKIE, type Theme } from '@/components/theme/constants';
import { signOut } from '@/app/actions';

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Auth gate for everything inside this route group.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const email = user.email;

  const cookieStore = await cookies();
  const collapsed = cookieStore.get(SIDEBAR_COOKIE)?.value === 'true';
  // Matches what the root layout put on <html>. When no cookie is set the
  // init script may flip this after paint; useSyncExternalStore reconciles it.
  const serverTheme: Theme =
    cookieStore.get(THEME_COOKIE)?.value === 'dark' ? 'dark' : 'light';

  return (
    <AppShell
      email={email}
      initialCollapsed={collapsed}
      signOut={signOut}
      serverTheme={serverTheme}
    >
      {children}
    </AppShell>
  );
}
