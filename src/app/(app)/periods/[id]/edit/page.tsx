import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { PeriodForm, type Period } from '../../PeriodForm';
import { updatePeriod, lockPeriod, unlockPeriod } from '../../actions';

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
    .eq('active', true)
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

  let contracts = contractsData ?? [];
  if (period.contract_id && !contracts.some((c) => c.id === period.contract_id)) {
    const { data: currentContract } = await supabase
      .from('contract')
      .select('id, contract_number')
      .eq('id', period.contract_id)
      .maybeSingle();
    if (currentContract) contracts = [...contracts, currentContract];
  }

  const { locked } = period;
  const updatePeriodWithId = updatePeriod.bind(null, periodId);
  const lockPeriodWithId = lockPeriod.bind(null, periodId);
  const unlockPeriodWithId = unlockPeriod.bind(null, periodId);

  return (
    <div className="px-6 py-8">
      <p className="font-mono text-xs font-medium tracking-[0.2em] text-zinc-500 dark:text-zinc-400">
        MASTER DATA
      </p>
      <div className="mt-1 flex items-center justify-between">
        <h2 className="text-2xl font-semibold text-zinc-950 dark:text-zinc-50">
          Edit period
        </h2>
        <form action={locked ? unlockPeriodWithId : lockPeriodWithId}>
          <button
            type="submit"
            className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-900"
          >
            {locked ? 'Unlock' : 'Lock'}
          </button>
        </form>
      </div>
      <PeriodForm
        period={period as Period}
        contracts={contracts}
        action={updatePeriodWithId}
        submitLabel="Save changes"
      />
    </div>
  );
}
