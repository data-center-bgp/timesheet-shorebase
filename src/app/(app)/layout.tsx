import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { DEV_AUTH_BYPASS, DEV_STUB_EMAIL } from '@/lib/dev-auth';
import { AppShell } from '@/components/app-shell/app-shell';
import { SIDEBAR_COOKIE } from '@/components/app-shell/constants';
import { signOut } from '@/app/actions';

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Auth gate for everything inside this route group. Short-circuits before
  // getUser() so we don't wait on the (currently unresponsive) auth API.
  // See src/lib/dev-auth.ts — remove the bypass once it's back.
  let email: string | undefined;

  if (DEV_AUTH_BYPASS) {
    email = DEV_STUB_EMAIL;
  } else {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      redirect('/login');
    }

    email = user.email;
  }

  const cookieStore = await cookies();
  const collapsed = cookieStore.get(SIDEBAR_COOKIE)?.value === 'true';

  return (
    <AppShell email={email} initialCollapsed={collapsed} signOut={signOut}>
      {children}
    </AppShell>
  );
}
