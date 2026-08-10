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
