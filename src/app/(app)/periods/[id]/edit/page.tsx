import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { PeriodForm, type Period } from '../../PeriodForm';
import { updatePeriod } from '../../actions';

export default async function EditPeriodPage(props: PageProps<'/periods/[id]/edit'>) {
  const { id } = await props.params;
  const periodId = Number(id);

  if (Number.isNaN(periodId)) {
    notFound();
  }

  const supabase = await createClient();
  const { data: period, error } = await supabase
    .from('period')
    .select('id, contract_id, name, start_date, end_date, locked')
    .eq('id', periodId)
    .maybeSingle();

  if (error) {
    return (
      <div className="px-6 py-8">
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          Couldn&apos;t load period: {error.message}
        </p>
      </div>
    );
  }

  if (!period) {
    notFound();
  }

  const { data: contractsData, error: contractsError } = await supabase
    .from('contract')
    .select('id, contract_number')
    .order('contract_number', { ascending: true });

  if (contractsError) {
    return (
      <div className="px-6 py-8">
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          Couldn&apos;t load contracts: {contractsError.message}
        </p>
      </div>
    );
  }

  const contracts = contractsData ?? [];

  const updatePeriodWithId = updatePeriod.bind(null, periodId);

  return (
    <div className="px-6 py-8">
      <p className="font-mono text-xs font-medium tracking-[0.2em] text-zinc-500 dark:text-zinc-400">
        MASTER DATA
      </p>
      <h2 className="mt-1 text-2xl font-semibold text-zinc-950 dark:text-zinc-50">
        Edit period
      </h2>
      <PeriodForm
        period={period as Period}
        contracts={contracts}
        action={updatePeriodWithId}
        submitLabel="Save changes"
      />
    </div>
  );
}
