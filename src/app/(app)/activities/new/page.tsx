import { redirect } from 'next/navigation';
import { PlanActivityForm } from '../PlanActivityForm';
import { createPlanActivity } from '../actions';
import { createClient } from '@/lib/supabase/server';
import { isManagerRole } from '@/lib/auth/require-master';

export default async function NewActivityPage() {
  if (await isManagerRole()) {
    redirect('/activities');
  }

  const supabase = await createClient();

  const { data: contractServicesData, error: contractServicesError } = await supabase
    .from('contract_service')
    .select('id, code, shorebase_service(name)')
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

  const contractServices = (contractServicesData ?? []) as unknown as {
    id: number;
    code: string;
    shorebase_service: { name: string } | null;
  }[];
  const timesheetTypes = timesheetTypesData ?? [];
  const subcontractors = (subcontractorsData ?? []) as unknown as {
    id: number;
    company: { name: string } | null;
  }[];

  return (
    <div className="px-6 py-8">
      <p className="font-mono text-xs font-medium tracking-[0.2em] text-zinc-500 dark:text-zinc-400">
        OPERATIONS
      </p>
      <h2 className="mt-1 text-2xl font-semibold text-zinc-950 dark:text-zinc-50">
        Add activity
      </h2>
      <PlanActivityForm
        contractServices={contractServices}
        timesheetTypes={timesheetTypes}
        subcontractors={subcontractors}
        action={createPlanActivity}
        submitLabel="Create activity"
      />
    </div>
  );
}
