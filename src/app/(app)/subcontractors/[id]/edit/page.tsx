import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { isManagerRole } from '@/lib/auth/require-master';
import { SubcontractorForm, type Subcontractor } from '../../SubcontractorForm';
import { updateSubcontractor, deactivateSubcontractor, reactivateSubcontractor } from '../../actions';

export default async function EditSubcontractorPage(props: PageProps<'/subcontractors/[id]/edit'>) {
  const isManager = await isManagerRole();
  const { id } = await props.params;
  const subcontractorId = Number(id);

  if (Number.isNaN(subcontractorId)) {
    notFound();
  }

  const supabase = await createClient();
  const { data: subcontractor, error } = await supabase
    .from('subcontractors')
    .select('id, contract_id, company_id, start_date, end_date, active')
    .eq('id', subcontractorId)
    .maybeSingle();

  if (error) {
    return (
      <div className="px-6 py-8">
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          Couldn&apos;t load subcontractor: {error.message}
        </p>
      </div>
    );
  }

  if (!subcontractor) {
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

  let contracts = contractsData ?? [];
  if (subcontractor.contract_id && !contracts.some((c) => c.id === subcontractor.contract_id)) {
    const { data: currentContract } = await supabase
      .from('contract')
      .select('id, contract_number')
      .eq('id', subcontractor.contract_id)
      .maybeSingle();
    if (currentContract) contracts = [...contracts, currentContract];
  }

  let companies = companiesData ?? [];
  if (subcontractor.company_id && !companies.some((c) => c.id === subcontractor.company_id)) {
    const { data: currentCompany } = await supabase
      .from('company')
      .select('id, name')
      .eq('id', subcontractor.company_id)
      .maybeSingle();
    if (currentCompany) companies = [...companies, currentCompany];
  }

  const { active } = subcontractor;
  const updateSubcontractorWithId = updateSubcontractor.bind(null, subcontractorId);
  const deactivateSubcontractorWithId = deactivateSubcontractor.bind(null, subcontractorId);
  const reactivateSubcontractorWithId = reactivateSubcontractor.bind(null, subcontractorId);

  return (
    <div className="px-6 py-8">
      <p className="font-mono text-xs font-medium tracking-[0.2em] text-zinc-500 dark:text-zinc-400">
        MASTER DATA
      </p>
      <div className="mt-1 flex items-center justify-between">
        <h2 className="text-2xl font-semibold text-zinc-950 dark:text-zinc-50">
          Edit subcontractor
        </h2>
        {!isManager && (
          <form action={active ? deactivateSubcontractorWithId : reactivateSubcontractorWithId}>
            <button
              type="submit"
              className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-900"
            >
              {active ? 'Deactivate' : 'Reactivate'}
            </button>
          </form>
        )}
      </div>
      <SubcontractorForm
        subcontractor={subcontractor as Subcontractor}
        contracts={contracts}
        companies={companies}
        action={updateSubcontractorWithId}
        submitLabel="Save changes"
        readOnly={isManager}
      />
    </div>
  );
}
