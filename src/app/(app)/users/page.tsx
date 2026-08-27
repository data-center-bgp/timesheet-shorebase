import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';

type AppUserRow = {
  id: string;
  name: string | null;
  email: string | null;
  role_code: string;
  app_role: { name: string } | null;
};

export default async function UsersPage() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('app_user')
    .select('id, name, email, role_code, app_role(name)')
    .order('email', { ascending: true });

  const users = (data ?? []) as unknown as AppUserRow[];

  return (
    <div className="px-6 py-8">
      <div>
        <p className="font-mono text-xs font-medium tracking-[0.2em] text-zinc-500 dark:text-zinc-400">
          PEOPLE
        </p>
        <h2 className="mt-1 text-2xl font-semibold text-zinc-950 dark:text-zinc-50">
          Users
        </h2>
      </div>

      {error && (
        <p role="alert" className="mt-4 text-sm text-red-600 dark:text-red-400">
          Couldn&apos;t load users: {error.message}
        </p>
      )}

      {!error && users.length === 0 && (
        <p className="mt-4 max-w-prose text-zinc-600 dark:text-zinc-400">
          No users yet. Accounts are created automatically when someone signs in.
        </p>
      )}

      {!error && users.length > 0 && (
        <div className="mt-6 overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800">
          <table className="w-full text-sm">
            <thead className="border-b border-zinc-200 bg-zinc-50 text-left text-xs font-medium uppercase tracking-wide text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
              <tr>
                <th className="px-4 py-2">Name</th>
                <th className="px-4 py-2">Email</th>
                <th className="px-4 py-2">Role</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {users.map((user) => (
                <tr key={user.id}>
                  <td className="px-4 py-2 font-medium text-zinc-900 dark:text-zinc-100">
                    <Link href={`/users/${user.id}/edit`} className="hover:underline">
                      {user.name ?? '—'}
                    </Link>
                  </td>
                  <td className="px-4 py-2 text-zinc-600 dark:text-zinc-400">{user.email ?? '—'}</td>
                  <td className="px-4 py-2 text-zinc-600 dark:text-zinc-400">
                    {user.app_role?.name ?? user.role_code}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
