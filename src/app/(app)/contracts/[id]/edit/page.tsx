import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { ContractForm, type Contract } from '../../ContractForm';
import { updateContract, deactivateContract, reactivateContract } from '../../actions';

export default async function EditContractPage(props: PageProps<'/contracts/[id]/edit'>) {
  const { id } = await props.params;
  const contractId = Number(id);

  if (Number.isNaN(contractId)) {
    notFound();
  }

  const supabase = await createClient();
  const { data: contract, error } = await supabase
    .from('contract')
    .select('id, contract_name, contract_number, company_id, start_date, end_date, active')
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

  const companies = companiesData ?? [];

  const { active } = contract;
  const updateContractWithId = updateContract.bind(null, contractId);
  const deactivateContractWithId = deactivateContract.bind(null, contractId);
  const reactivateContractWithId = reactivateContract.bind(null, contractId);

  return (
    <div className="px-6 py-8">
      <p className="font-mono text-xs font-medium tracking-[0.2em] text-zinc-500 dark:text-zinc-400">
        MASTER DATA
      </p>
      <div className="mt-1 flex items-center justify-between">
        <h2 className="text-2xl font-semibold text-zinc-950 dark:text-zinc-50">
          Edit contract
        </h2>
        <form action={active ? deactivateContractWithId : reactivateContractWithId}>
          <button
            type="submit"
            className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-900"
          >
            {active ? 'Deactivate' : 'Reactivate'}
          </button>
        </form>
      </div>
      <ContractForm
        contract={contract as Contract}
        companies={companies}
        action={updateContractWithId}
        submitLabel="Save changes"
      />
    </div>
  );
}
