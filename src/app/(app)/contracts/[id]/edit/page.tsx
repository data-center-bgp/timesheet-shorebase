import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { ContractForm, type Contract } from '../../ContractForm';
import { updateContract } from '../../actions';

export default async function EditContractPage(props: PageProps<'/contracts/[id]/edit'>) {
  const { id } = await props.params;
  const contractId = Number(id);

  if (Number.isNaN(contractId)) {
    notFound();
  }

  const supabase = await createClient();
  const { data: contract, error } = await supabase
    .from('contract')
    .select('id, contract_number, company_id, start_date, end_date')
    .eq('id', contractId)
    .maybeSingle();

  if (error) {
    return (
      <div className="px-6 py-8">
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          Couldn&apos;t load contract: {error.message}
        </p>
      </div>
    );
  }

  if (!contract) {
    notFound();
  }

  const { data: companiesData } = await supabase
    .from('company')
    .select('id, name')
    .order('name', { ascending: true });
  const companies = companiesData ?? [];

  const updateContractWithId = updateContract.bind(null, contractId);

  return (
    <div className="px-6 py-8">
      <p className="font-mono text-xs font-medium tracking-[0.2em] text-zinc-500 dark:text-zinc-400">
        MASTER DATA
      </p>
      <h2 className="mt-1 text-2xl font-semibold text-zinc-950 dark:text-zinc-50">
        Edit contract
      </h2>
      <ContractForm
        contract={contract as Contract}
        companies={companies}
        action={updateContractWithId}
        submitLabel="Save changes"
      />
    </div>
  );
}
