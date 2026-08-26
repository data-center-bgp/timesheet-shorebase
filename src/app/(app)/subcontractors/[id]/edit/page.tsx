import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { SubcontractorForm, type Subcontractor } from '../../SubcontractorForm';
import { updateSubcontractor } from '../../actions';

export default async function EditSubcontractorPage(props: PageProps<'/subcontractors/[id]/edit'>) {
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

  const contracts = contractsData ?? [];
  const companies = companiesData ?? [];

  const updateSubcontractorWithId = updateSubcontractor.bind(null, subcontractorId);

  return (
    <div className="px-6 py-8">
      <p className="font-mono text-xs font-medium tracking-[0.2em] text-zinc-500 dark:text-zinc-400">
        MASTER DATA
      </p>
      <h2 className="mt-1 text-2xl font-semibold text-zinc-950 dark:text-zinc-50">
        Edit subcontractor
      </h2>
      <SubcontractorForm
        subcontractor={subcontractor as Subcontractor}
        contracts={contracts}
        companies={companies}
        action={updateSubcontractorWithId}
        submitLabel="Save changes"
      />
    </div>
  );
}
