import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { UserForm, type AppUser } from '../../UserForm';
import { updateUser } from '../../actions';

export default async function EditUserPage(props: PageProps<'/users/[id]/edit'>) {
  const { id } = await props.params;

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
  const updateUserWithId = updateUser.bind(null, id);

  return (
    <div className="px-6 py-8">
      <p className="font-mono text-xs font-medium tracking-[0.2em] text-zinc-500 dark:text-zinc-400">
        PEOPLE
      </p>
      <h2 className="mt-1 text-2xl font-semibold text-zinc-950 dark:text-zinc-50">
        Edit user
      </h2>
      <UserForm user={user as AppUser} roles={roles} action={updateUserWithId} submitLabel="Save changes" />
    </div>
  );
}
