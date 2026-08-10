import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { DEV_AUTH_BYPASS } from '@/lib/dev-auth';
import { LoginForm } from './LoginForm';

export default async function LoginPage() {
  // With the bypass on, treat the stub identity as already signed in so
  // /login and / stay consistent. See src/lib/dev-auth.ts.
  if (DEV_AUTH_BYPASS) {
    redirect('/');
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect('/');
  }

  return <LoginForm />;
}
