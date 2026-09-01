import { createClient } from '@/lib/supabase/server';
import { requireMasterRole } from '@/lib/auth/require-master';
import { UserForm } from '../UserForm';
import { createUser } from '../actions';

export default async function NewUserPage() {
  await requireMasterRole();

  const supabase = await createClient();
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

  return (
    <div className="px-6 py-8">
      <p className="font-mono text-xs font-medium tracking-[0.2em] text-zinc-500 dark:text-zinc-400">
        ADMINISTRATION
      </p>
      <h2 className="mt-1 text-2xl font-semibold text-zinc-950 dark:text-zinc-50">
        Add user
      </h2>
      <UserForm roles={roles} action={createUser} submitLabel="Create user" />
    </div>
  );
}
