import { SummaryTimesheetForm } from '../SummaryTimesheetForm';
import { createSummaryTimesheet } from '../actions';
import { createClient } from '@/lib/supabase/server';

export default async function NewSummaryTimesheetPage() {
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

  const { data: contractsData, error: contractsError } = await supabase
    .from('contract')
    .select('id, contract_name')
    .eq('active', true)
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
    .eq('active', true)
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

  return (
    <div className="px-6 py-8">
      <p className="font-mono text-xs font-medium tracking-[0.2em] text-zinc-500 dark:text-zinc-400">
        APPROVALS &amp; BILLING
      </p>
      <h2 className="mt-1 text-2xl font-semibold text-zinc-950 dark:text-zinc-50">
        Add summary timesheet
      </h2>
      <SummaryTimesheetForm
        periods={periods}
        timesheetTypes={timesheetTypes}
        contracts={contracts}
        companies={companies}
        action={createSummaryTimesheet}
        submitLabel="Create summary timesheet"
      />
    </div>
  );
}
