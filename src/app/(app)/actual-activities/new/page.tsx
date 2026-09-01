import { ActualActivityForm } from '../ActualActivityForm';
import { createActualActivity } from '../actions';
import { createClient } from '@/lib/supabase/server';

export default async function NewActualActivityPage() {
  const supabase = await createClient();

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

  const planActivities = planActivitiesData ?? [];

  return (
    <div className="px-6 py-8">
      <p className="font-mono text-xs font-medium tracking-[0.2em] text-zinc-500 dark:text-zinc-400">
        OPERATIONS
      </p>
      <h2 className="mt-1 text-2xl font-semibold text-zinc-950 dark:text-zinc-50">
        Add actual activity
      </h2>
      <ActualActivityForm
        planActivities={planActivities}
        action={createActualActivity}
        submitLabel="Create actual activity"
      />
    </div>
  );
}
