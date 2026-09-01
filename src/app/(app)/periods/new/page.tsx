import { PeriodForm } from '../PeriodForm';
import { createPeriod } from '../actions';
import { createClient } from '@/lib/supabase/server';

export default async function NewPeriodPage() {
  const supabase = await createClient();

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

  const contracts = contractsData ?? [];

  return (
    <div className="px-6 py-8">
      <p className="font-mono text-xs font-medium tracking-[0.2em] text-zinc-500 dark:text-zinc-400">
        MASTER DATA
      </p>
      <h2 className="mt-1 text-2xl font-semibold text-zinc-950 dark:text-zinc-50">
        Add period
      </h2>
      <PeriodForm contracts={contracts} action={createPeriod} submitLabel="Create period" />
    </div>
  );
}
