import { ContractForm } from '../ContractForm';
import { createContract } from '../actions';
import { createClient } from '@/lib/supabase/server';

export default async function NewContractPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from('company')
    .select('id, name')
    .order('name', { ascending: true });

  const companies = data ?? [];

  return (
    <div className="px-6 py-8">
      <p className="font-mono text-xs font-medium tracking-[0.2em] text-zinc-500 dark:text-zinc-400">
        MASTER DATA
      </p>
      <h2 className="mt-1 text-2xl font-semibold text-zinc-950 dark:text-zinc-50">
        Add contract
      </h2>
      <ContractForm companies={companies} action={createContract} submitLabel="Create contract" />
    </div>
  );
}
