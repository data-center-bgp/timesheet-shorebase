import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { PlanActivityForm, type PlanActivity } from '../../PlanActivityForm';
import { updatePlanActivity } from '../../actions';

export default async function EditActivityPage(props: PageProps<'/activities/[id]/edit'>) {
  const { id } = await props.params;
  const activityId = Number(id);

  if (Number.isNaN(activityId)) {
    notFound();
  }

  const supabase = await createClient();
  const { data: activity, error } = await supabase
    .from('activity')
    .select(
      'id, code, contract_service_id, timesheet_type_code, subcontractor_id, plan_amount, plan_date, plan_remark, plan_description, active',
    )
    .eq('id', activityId)
    .eq('status_code', 'P')
    .maybeSingle();

  if (error) {
    return (
      <div className="px-6 py-8">
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          Couldn&apos;t load activity: {error.message}
        </p>
      </div>
    );
  }

  if (!activity) {
    notFound();
  }

  const { data: contractServicesData, error: contractServicesError } = await supabase
    .from('contract_service')
    .select('id, code')
    .order('code', { ascending: true });

  if (contractServicesError) {
    return (
      <div className="px-6 py-8">
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          Couldn&apos;t load contract services: {contractServicesError.message}
        </p>
      </div>
    );
  }

  const { data: timesheetTypesData, error: timesheetTypesError } = await supabase
    .from('timesheet_type')
    .select('code, name')
    .order('name', { ascending: true });

  if (timesheetTypesError) {
    return (
      <div className="px-6 py-8">
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          Couldn&apos;t load timesheet types: {timesheetTypesError.message}
        </p>
      </div>
    );
  }

  const { data: subcontractorsData, error: subcontractorsError } = await supabase
    .from('subcontractors')
    .select('id, company(name)')
    .order('id', { ascending: true });

  if (subcontractorsError) {
    return (
      <div className="px-6 py-8">
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          Couldn&apos;t load subcontractors: {subcontractorsError.message}
        </p>
      </div>
    );
  }

  const contractServices = contractServicesData ?? [];
  const timesheetTypes = timesheetTypesData ?? [];
  const subcontractors = (subcontractorsData ?? []) as unknown as {
    id: number;
    company: { name: string } | null;
  }[];

  const updatePlanActivityWithId = updatePlanActivity.bind(null, activityId);

  return (
    <div className="px-6 py-8">
      <p className="font-mono text-xs font-medium tracking-[0.2em] text-zinc-500 dark:text-zinc-400">
        OPERATIONS
      </p>
      <h2 className="mt-1 text-2xl font-semibold text-zinc-950 dark:text-zinc-50">
        Edit activity
      </h2>
      <PlanActivityForm
        activity={activity as PlanActivity}
        contractServices={contractServices}
        timesheetTypes={timesheetTypes}
        subcontractors={subcontractors}
        action={updatePlanActivityWithId}
        submitLabel="Save changes"
      />
    </div>
  );
}
