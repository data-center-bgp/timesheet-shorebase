import { redirect } from 'next/navigation';
import { TimesheetForm } from '../TimesheetForm';
import { createTimesheet } from '../actions';
import { createClient } from '@/lib/supabase/server';
import { isManagerRole } from '@/lib/auth/require-master';

export default async function NewTimesheetPage() {
  if (await isManagerRole()) {
    redirect('/timesheets');
  }

  const supabase = await createClient();

  const { data: periodsData, error: periodsError } = await supabase
    .from('period')
    .select('id, name')
    .order('name', { ascending: true });
  if (periodsError) {
    return (
      <div className="px-6 py-8">
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          Couldn&apos;t load periods: {periodsError.message}
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

  const { data: jettyShipsData, error: jettyShipsError } = await supabase
    .from('jetty_ship')
    .select('id, name')
    .eq('active', true)
    .order('name', { ascending: true });
  if (jettyShipsError) {
    return (
      <div className="px-6 py-8">
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          Couldn&apos;t load jetty/ships: {jettyShipsError.message}
        </p>
      </div>
    );
  }

  const { data: mhJobsData, error: mhJobsError } = await supabase
    .from('material_handling_job')
    .select('id, name')
    .eq('active', true)
    .order('name', { ascending: true });
  if (mhJobsError) {
    return (
      <div className="px-6 py-8">
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          Couldn&apos;t load material handling jobs: {mhJobsError.message}
        </p>
      </div>
    );
  }

  const periods = periodsData ?? [];
  const timesheetTypes = timesheetTypesData ?? [];
  const contractServices = contractServicesData ?? [];
  const subcontractors = (subcontractorsData ?? []) as unknown as {
    id: number;
    company: { name: string } | null;
  }[];
  const jettyShips = jettyShipsData ?? [];
  const materialHandlingJobs = mhJobsData ?? [];

  return (
    <div className="px-6 py-8">
      <p className="font-mono text-xs font-medium tracking-[0.2em] text-zinc-500 dark:text-zinc-400">
        OPERATIONS
      </p>
      <h2 className="mt-1 text-2xl font-semibold text-zinc-950 dark:text-zinc-50">
        Add timesheet
      </h2>
      <TimesheetForm
        periods={periods}
        timesheetTypes={timesheetTypes}
        contractServices={contractServices}
        subcontractors={subcontractors}
        jettyShips={jettyShips}
        materialHandlingJobs={materialHandlingJobs}
        action={createTimesheet}
        submitLabel="Create timesheet"
      />
    </div>
  );
}
