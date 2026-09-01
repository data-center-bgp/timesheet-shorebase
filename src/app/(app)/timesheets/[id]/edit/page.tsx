import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { TimesheetForm, type Timesheet } from '../../TimesheetForm';
import { updateTimesheet, deactivateTimesheet, reactivateTimesheet } from '../../actions';

export default async function EditTimesheetPage(props: PageProps<'/timesheets/[id]/edit'>) {
  const { id } = await props.params;
  const timesheetId = Number(id);

  if (Number.isNaN(timesheetId)) {
    notFound();
  }

  const supabase = await createClient();

  const { data: timesheet, error } = await supabase
    .from('timesheet')
    .select(
      'id, period_id, type_code, contract_service_id, timesheet_date, code, code_serial_number, total_amount, subcontractor_id, jetty_ship_id, mh_job_id, active',
    )
    .eq('id', timesheetId)
    .maybeSingle();

  if (error) {
    return (
      <div className="px-6 py-8">
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          Couldn&apos;t load timesheet: {error.message}
        </p>
      </div>
    );
  }

  if (!timesheet) {
    notFound();
  }

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

  let contractServices = contractServicesData ?? [];
  if (
    timesheet.contract_service_id &&
    !contractServices.some((c) => c.id === timesheet.contract_service_id)
  ) {
    const { data: currentContractService } = await supabase
      .from('contract_service')
      .select('id, code')
      .eq('id', timesheet.contract_service_id)
      .maybeSingle();
    if (currentContractService) contractServices = [...contractServices, currentContractService];
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

  let subcontractors = (subcontractorsData ?? []) as unknown as {
    id: number;
    company: { name: string } | null;
  }[];
  if (
    timesheet.subcontractor_id &&
    !subcontractors.some((s) => s.id === timesheet.subcontractor_id)
  ) {
    const { data: currentSubcontractor } = await supabase
      .from('subcontractors')
      .select('id, company(name)')
      .eq('id', timesheet.subcontractor_id)
      .maybeSingle();
    if (currentSubcontractor) {
      subcontractors = [
        ...subcontractors,
        currentSubcontractor as unknown as { id: number; company: { name: string } | null },
      ];
    }
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

  let jettyShips = jettyShipsData ?? [];
  if (timesheet.jetty_ship_id && !jettyShips.some((j) => j.id === timesheet.jetty_ship_id)) {
    const { data: currentJettyShip } = await supabase
      .from('jetty_ship')
      .select('id, name')
      .eq('id', timesheet.jetty_ship_id)
      .maybeSingle();
    if (currentJettyShip) jettyShips = [...jettyShips, currentJettyShip];
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

  let materialHandlingJobs = mhJobsData ?? [];
  if (
    timesheet.mh_job_id &&
    !materialHandlingJobs.some((m) => m.id === timesheet.mh_job_id)
  ) {
    const { data: currentMhJob } = await supabase
      .from('material_handling_job')
      .select('id, name')
      .eq('id', timesheet.mh_job_id)
      .maybeSingle();
    if (currentMhJob) materialHandlingJobs = [...materialHandlingJobs, currentMhJob];
  }

  const periods = periodsData ?? [];
  const timesheetTypes = timesheetTypesData ?? [];

  const { active } = timesheet;
  const updateTimesheetWithId = updateTimesheet.bind(null, timesheetId);
  const deactivateTimesheetWithId = deactivateTimesheet.bind(null, timesheetId);
  const reactivateTimesheetWithId = reactivateTimesheet.bind(null, timesheetId);

  return (
    <div className="px-6 py-8">
      <p className="font-mono text-xs font-medium tracking-[0.2em] text-zinc-500 dark:text-zinc-400">
        OPERATIONS
      </p>
      <div className="mt-1 flex items-center justify-between">
        <h2 className="text-2xl font-semibold text-zinc-950 dark:text-zinc-50">
          Edit timesheet
        </h2>
        <form action={active ? deactivateTimesheetWithId : reactivateTimesheetWithId}>
          <button
            type="submit"
            className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-900"
          >
            {active ? 'Deactivate' : 'Reactivate'}
          </button>
        </form>
      </div>
      <TimesheetForm
        timesheet={timesheet as Timesheet}
        periods={periods}
        timesheetTypes={timesheetTypes}
        contractServices={contractServices}
        subcontractors={subcontractors}
        jettyShips={jettyShips}
        materialHandlingJobs={materialHandlingJobs}
        action={updateTimesheetWithId}
        submitLabel="Save changes"
      />
    </div>
  );
}
