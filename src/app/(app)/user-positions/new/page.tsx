import { redirect } from 'next/navigation';
import { UserPositionForm } from '../UserPositionForm';
import { createUserPosition } from '../actions';
import { createClient } from '@/lib/supabase/server';
import { isManagerRole } from '@/lib/auth/require-master';

export default async function NewUserPositionPage() {
  if (await isManagerRole()) {
    redirect('/user-positions');
  }

  const supabase = await createClient();

  const { data: usersData, error: usersError } = await supabase
    .from('app_user')
    .select('id, name, email')
    .order('email', { ascending: true });

  if (usersError) {
    return (
      <div className="px-6 py-8">
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          Couldn&apos;t load users: {usersError.message}
        </p>
      </div>
    );
  }

  const { data: jobPositionsData, error: jobPositionsError } = await supabase
    .from('job_position')
    .select('id, name')
    .eq('active', true)
    .order('name', { ascending: true });

  if (jobPositionsError) {
    return (
      <div className="px-6 py-8">
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          Couldn&apos;t load job positions: {jobPositionsError.message}
        </p>
      </div>
    );
  }

  const users = usersData ?? [];
  const jobPositions = jobPositionsData ?? [];

  return (
    <div className="px-6 py-8">
      <p className="font-mono text-xs font-medium tracking-[0.2em] text-zinc-500 dark:text-zinc-400">
        PEOPLE
      </p>
      <h2 className="mt-1 text-2xl font-semibold text-zinc-950 dark:text-zinc-50">
        Add user position
      </h2>
      <UserPositionForm
        users={users}
        jobPositions={jobPositions}
        action={createUserPosition}
        submitLabel="Create user position"
      />
    </div>
  );
}
