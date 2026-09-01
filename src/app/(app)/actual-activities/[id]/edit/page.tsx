import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { ActualActivityForm, type ActualActivity } from '../../ActualActivityForm';
import { updateActualActivity, deactivateActualActivity, reactivateActualActivity } from '../../actions';

export default async function EditActualActivityPage(props: PageProps<'/actual-activities/[id]/edit'>) {
  const { id } = await props.params;
  const actualActivityId = Number(id);

  if (Number.isNaN(actualActivityId)) {
    notFound();
  }

  const supabase = await createClient();
  const { data: actualActivity, error } = await supabase
    .from('activity')
    .select('id, plan_activity_id, actual_amount, actual_remark, actual_description, active')
    .eq('id', actualActivityId)
    .eq('status_code', 'A')
    .maybeSingle();

  if (error) {
    return (
      <div className="px-6 py-8">
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          Couldn&apos;t load actual activity: {error.message}
        </p>
      </div>
    );
  }

  if (!actualActivity) {
    notFound();
  }

  const { data: planActivitiesData, error: planActivitiesError } = await supabase
    .from('activity')
    .select('id, code')
    .eq('status_code', 'P')
    .eq('active', true)
    .order('code', { ascending: true });

  if (planActivitiesError) {
    return (
      <div className="px-6 py-8">
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          Couldn&apos;t load plan activities: {planActivitiesError.message}
        </p>
      </div>
    );
  }

  let planActivities = planActivitiesData ?? [];
  if (
    actualActivity.plan_activity_id &&
    !planActivities.some((p) => p.id === actualActivity.plan_activity_id)
  ) {
    const { data: currentPlanActivity } = await supabase
      .from('activity')
      .select('id, code')
      .eq('id', actualActivity.plan_activity_id)
      .maybeSingle();
    if (currentPlanActivity) planActivities = [...planActivities, currentPlanActivity];
  }

  const { active } = actualActivity;
  const updateActualActivityWithId = updateActualActivity.bind(null, actualActivityId);
  const deactivateActualActivityWithId = deactivateActualActivity.bind(null, actualActivityId);
  const reactivateActualActivityWithId = reactivateActualActivity.bind(null, actualActivityId);

  return (
    <div className="px-6 py-8">
      <p className="font-mono text-xs font-medium tracking-[0.2em] text-zinc-500 dark:text-zinc-400">
        OPERATIONS
      </p>
      <div className="mt-1 flex items-center justify-between">
        <h2 className="text-2xl font-semibold text-zinc-950 dark:text-zinc-50">
          Edit actual activity
        </h2>
        <form action={active ? deactivateActualActivityWithId : reactivateActualActivityWithId}>
          <button
            type="submit"
            className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-900"
          >
            {active ? 'Deactivate' : 'Reactivate'}
          </button>
        </form>
      </div>
      <ActualActivityForm
        actualActivity={actualActivity as ActualActivity}
        planActivities={planActivities}
        action={updateActualActivityWithId}
        submitLabel="Save changes"
      />
    </div>
  );
}
