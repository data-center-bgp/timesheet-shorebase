import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { SummaryTimesheetForm, type SummaryTimesheet } from '../../SummaryTimesheetForm';
import {
  updateSummaryTimesheet,
  deactivateSummaryTimesheet,
  reactivateSummaryTimesheet,
} from '../../actions';

export default async function EditSummaryTimesheetPage(props: PageProps<'/summary-timesheets/[id]/edit'>) {
  const { id } = await props.params;
  const summaryTimesheetId = Number(id);

  if (Number.isNaN(summaryTimesheetId)) {
    notFound();
  }

  const supabase = await createClient();

  const { data: summaryTimesheet, error } = await supabase
    .from('summary_timesheet')
    .select('id, period_id, type_code, contract_id, company_id, code, issue_date, active')
    .eq('id', summaryTimesheetId)
    .maybeSingle();

  if (error) {
    return (
      <div className="px-6 py-8">
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          Couldn&apos;t load summary timesheet: {error.message}
        </p>
      </div>
    );
  }

  if (!summaryTimesheet) {
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

  const { data: contractsData, error: contractsError } = await supabase
    .from('contract')
    .select('id, contract_name')
    .order('contract_name', { ascending: true });
  if (contractsError) {
    return (
      <div className="px-6 py-8">
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          Couldn&apos;t load contracts: {contractsError.message}
        </p>
      </div>
    );
  }

  const { data: companiesData, error: companiesError } = await supabase
    .from('company')
    .select('id, name')
    .order('name', { ascending: true });
  if (companiesError) {
    return (
      <div className="px-6 py-8">
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          Couldn&apos;t load companies: {companiesError.message}
        </p>
      </div>
    );
  }

  const periods = periodsData ?? [];
  const timesheetTypes = timesheetTypesData ?? [];
  const contracts = contractsData ?? [];
  const companies = companiesData ?? [];

  const { active } = summaryTimesheet;
  const updateSummaryTimesheetWithId = updateSummaryTimesheet.bind(null, summaryTimesheetId);
  const deactivateSummaryTimesheetWithId = deactivateSummaryTimesheet.bind(null, summaryTimesheetId);
  const reactivateSummaryTimesheetWithId = reactivateSummaryTimesheet.bind(null, summaryTimesheetId);

  return (
    <div className="px-6 py-8">
      <p className="font-mono text-xs font-medium tracking-[0.2em] text-zinc-500 dark:text-zinc-400">
        APPROVALS &amp; BILLING
      </p>
      <div className="mt-1 flex items-center justify-between">
        <h2 className="text-2xl font-semibold text-zinc-950 dark:text-zinc-50">
          Edit summary timesheet
        </h2>
        <form action={active ? deactivateSummaryTimesheetWithId : reactivateSummaryTimesheetWithId}>
          <button
            type="submit"
            className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-900"
          >
            {active ? 'Deactivate' : 'Reactivate'}
          </button>
        </form>
      </div>
      <SummaryTimesheetForm
        summaryTimesheet={summaryTimesheet as SummaryTimesheet}
        periods={periods}
        timesheetTypes={timesheetTypes}
        contracts={contracts}
        companies={companies}
        action={updateSummaryTimesheetWithId}
        submitLabel="Save changes"
      />
    </div>
  );
}
