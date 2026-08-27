import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { UserPositionForm, type UserPosition } from '../../UserPositionForm';
import { updateUserPosition, deactivateUserPosition, reactivateUserPosition } from '../../actions';

export default async function EditUserPositionPage(props: PageProps<'/user-positions/[id]/edit'>) {
  const { id } = await props.params;
  const userPositionId = Number(id);

  if (Number.isNaN(userPositionId)) {
    notFound();
  }

  const supabase = await createClient();
  const { data: userPosition, error } = await supabase
    .from('user_position')
    .select('id, user_id, job_position_id, start_date, end_date, active')
    .eq('id', userPositionId)
    .maybeSingle();

  if (error) {
    return (
      <div className="px-6 py-8">
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          Couldn&apos;t load user position: {error.message}
        </p>
      </div>
    );
  }

  if (!userPosition) {
    notFound();
  }

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

  const { active } = userPosition;
  const updateUserPositionWithId = updateUserPosition.bind(null, userPositionId);
  const deactivateUserPositionWithId = deactivateUserPosition.bind(null, userPositionId);
  const reactivateUserPositionWithId = reactivateUserPosition.bind(null, userPositionId);

  return (
    <div className="px-6 py-8">
      <p className="font-mono text-xs font-medium tracking-[0.2em] text-zinc-500 dark:text-zinc-400">
        PEOPLE
      </p>
      <div className="mt-1 flex items-center justify-between">
        <h2 className="text-2xl font-semibold text-zinc-950 dark:text-zinc-50">
          Edit user position
        </h2>
        <form action={active ? deactivateUserPositionWithId : reactivateUserPositionWithId}>
          <button
            type="submit"
            className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-900"
          >
            {active ? 'Deactivate' : 'Reactivate'}
          </button>
        </form>
      </div>
      <UserPositionForm
        userPosition={userPosition as UserPosition}
        users={users}
        jobPositions={jobPositions}
        action={updateUserPositionWithId}
        submitLabel="Save changes"
      />
    </div>
  );
}
