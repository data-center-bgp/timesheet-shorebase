import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireMasterRole } from '@/lib/auth/require-master';
import { UserForm, type AppUser } from '../../UserForm';
import { updateUser, deactivateUser, reactivateUser } from '../../actions';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isCurrentlyActive(bannedUntil: string | null | undefined): boolean {
  return !bannedUntil || new Date(bannedUntil).getTime() <= Date.now();
}

export default async function EditUserPage(props: PageProps<'/users/[id]/edit'>) {
  const { id } = await props.params;

  if (!UUID_PATTERN.test(id)) {
    notFound();
  }

  const currentUser = await requireMasterRole();

  const supabase = await createClient();
  const { data: user, error } = await supabase
    .from('app_user')
    .select('id, name, username, role_code')
    .eq('id', id)
    .maybeSingle();

  if (error) {
    return (
      <div className="px-6 py-8">
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          Couldn&apos;t load user: {error.message}
        </p>
      </div>
    );
  }

  if (!user) {
    notFound();
  }

  const { data: rolesData, error: rolesError } = await supabase
    .from('app_role')
    .select('code, name')
    .order('name', { ascending: true });

  if (rolesError) {
    return (
      <div className="px-6 py-8">
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          Couldn&apos;t load roles: {rolesError.message}
        </p>
      </div>
    );
  }

  const roles = rolesData ?? [];

  const adminClient = createAdminClient();
  const { data: authUserData } = await adminClient.auth.admin.getUserById(id);
  const active = isCurrentlyActive(authUserData?.user?.banned_until);

  const isSelf = id === currentUser.id;
  const updateUserWithId = updateUser.bind(null, id);
  const deactivateUserWithId = deactivateUser.bind(null, id);
  const reactivateUserWithId = reactivateUser.bind(null, id);

  return (
    <div className="px-6 py-8">
      <p className="font-mono text-xs font-medium tracking-[0.2em] text-zinc-500 dark:text-zinc-400">
        ADMINISTRATION
      </p>
      <div className="mt-1 flex items-center justify-between">
        <h2 className="text-2xl font-semibold text-zinc-950 dark:text-zinc-50">
          Edit user
        </h2>
        {!isSelf && (
          <form action={active ? deactivateUserWithId : reactivateUserWithId}>
            <button
              type="submit"
              className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-900"
            >
              {active ? 'Deactivate' : 'Reactivate'}
            </button>
          </form>
        )}
      </div>
      <UserForm user={user as AppUser} roles={roles} action={updateUserWithId} submitLabel="Save changes" />
    </div>
  );
}
