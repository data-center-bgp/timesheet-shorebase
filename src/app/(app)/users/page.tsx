import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireMasterRole } from '@/lib/auth/require-master';

type AppUserRow = {
  id: string;
  name: string | null;
  username: string | null;
  email: string | null;
  role_code: string;
  app_role: { name: string } | null;
};

function isCurrentlyBanned(bannedUntil: string | null | undefined): boolean {
  return !!bannedUntil && new Date(bannedUntil).getTime() > Date.now();
}

export default async function UsersPage() {
  await requireMasterRole();

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('app_user')
    .select('id, name, username, email, role_code, app_role(name)')
    .order('email', { ascending: true });

  const users = (data ?? []) as unknown as AppUserRow[];

  const adminClient = createAdminClient();
  const { data: authData } = await adminClient.auth.admin.listUsers();
  const bannedIds = new Set(
    (authData?.users ?? [])
      .filter((authUser) => isCurrentlyBanned(authUser.banned_until))
      .map((authUser) => authUser.id),
  );

  return (
    <div className="px-6 py-8">
      <div className="flex items-center justify-between">
        <div>
          <p className="font-mono text-xs font-medium tracking-[0.2em] text-zinc-500 dark:text-zinc-400">
            ADMINISTRATION
          </p>
          <h2 className="mt-1 text-2xl font-semibold text-zinc-950 dark:text-zinc-50">
            Users
          </h2>
        </div>
        <Link
          href="/users/new"
          className="rounded-md bg-teal-700 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-teal-800 dark:bg-teal-600 dark:hover:bg-teal-500"
        >
          Add user
        </Link>
      </div>

      {error && (
        <p role="alert" className="mt-4 text-sm text-red-600 dark:text-red-400">
          Couldn&apos;t load users: {error.message}
        </p>
      )}

      {!error && users.length === 0 && (
        <p className="mt-4 max-w-prose text-zinc-600 dark:text-zinc-400">
          No users yet. Add your first one to get started.
        </p>
      )}

      {!error && users.length > 0 && (
        <div className="mt-6 overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800">
          <table className="w-full text-sm">
            <thead className="border-b border-zinc-200 bg-zinc-50 text-left text-xs font-medium uppercase tracking-wide text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
              <tr>
                <th className="px-4 py-2">Name</th>
                <th className="px-4 py-2">Username</th>
                <th className="px-4 py-2">Email</th>
                <th className="px-4 py-2">Role</th>
                <th className="px-4 py-2">Status</th>
                <th className="px-4 py-2"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {users.map((user) => {
                const active = !bannedIds.has(user.id);
                return (
                  <tr key={user.id}>
                    <td className="px-4 py-2 font-medium text-zinc-900 dark:text-zinc-100">
                      <Link href={`/users/${user.id}/edit`} className="hover:underline">
                        {user.name ?? '—'}
                      </Link>
                    </td>
                    <td className="px-4 py-2 text-zinc-600 dark:text-zinc-400">{user.username ?? '—'}</td>
                    <td className="px-4 py-2 text-zinc-600 dark:text-zinc-400">{user.email ?? '—'}</td>
                    <td className="px-4 py-2 text-zinc-600 dark:text-zinc-400">
                      {user.app_role?.name ?? user.role_code}
                    </td>
                    <td className="px-4 py-2">
                      <span
                        className={
                          active
                            ? 'rounded-full bg-teal-50 px-2 py-0.5 text-xs font-medium text-teal-800 dark:bg-teal-950/40 dark:text-teal-300'
                            : 'rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400'
                        }
                      >
                        {active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-right">
                      <Link
                        href={`/users/${user.id}/edit`}
                        className="text-sm font-medium text-teal-700 hover:underline dark:text-teal-400"
                      >
                        Edit
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
