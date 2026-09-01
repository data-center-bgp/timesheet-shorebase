import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { PlanActivityForm, type PlanActivity } from '../../PlanActivityForm';
import { updatePlanActivity, deactivateActivity, reactivateActivity } from '../../actions';

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
    .eq('active', true)
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

  let contractServices = contractServicesData ?? [];
  if (
    activity.contract_service_id &&
    !contractServices.some((c) => c.id === activity.contract_service_id)
  ) {
    const { data: currentContractService } = await supabase
      .from('contract_service')
      .select('id, code')
      .eq('id', activity.contract_service_id)
      .maybeSingle();
    if (currentContractService) contractServices = [...contractServices, currentContractService];
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
    .eq('active', true)
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

  const timesheetTypes = timesheetTypesData ?? [];
  let subcontractors = (subcontractorsData ?? []) as unknown as {
    id: number;
    company: { name: string } | null;
  }[];
  if (
    activity.subcontractor_id &&
    !subcontractors.some((s) => s.id === activity.subcontractor_id)
  ) {
    const { data: currentSubcontractor } = await supabase
      .from('subcontractors')
      .select('id, company(name)')
      .eq('id', activity.subcontractor_id)
      .maybeSingle();
    if (currentSubcontractor) {
      subcontractors = [
        ...subcontractors,
        currentSubcontractor as unknown as { id: number; company: { name: string } | null },
      ];
    }
  }

  const { active } = activity;
  const updatePlanActivityWithId = updatePlanActivity.bind(null, activityId);
  const deactivateActivityWithId = deactivateActivity.bind(null, activityId);
  const reactivateActivityWithId = reactivateActivity.bind(null, activityId);

  return (
    <div className="px-6 py-8">
      <p className="font-mono text-xs font-medium tracking-[0.2em] text-zinc-500 dark:text-zinc-400">
        OPERATIONS
      </p>
      <div className="mt-1 flex items-center justify-between">
        <h2 className="text-2xl font-semibold text-zinc-950 dark:text-zinc-50">
          Edit activity
        </h2>
        <form action={active ? deactivateActivityWithId : reactivateActivityWithId}>
          <button
            type="submit"
            className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-900"
          >
            {active ? 'Deactivate' : 'Reactivate'}
          </button>
        </form>
      </div>
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
