import { MaterialHandlingJobForm } from '../MaterialHandlingJobForm';
import { createMaterialHandlingJob } from '../actions';
import { createClient } from '@/lib/supabase/server';

export default async function NewMaterialHandlingJobPage() {
  const supabase = await createClient();

  const { data: contractServicesData, error: contractServicesError } = await supabase
    .from('contract_service')
    .select('id, code')
    .eq('active', true)
    .order('code', { ascending: true });

  if (contractServicesError) {
    return (
      <div className="px-6 py-8">
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          Couldn&apos;t load contract services: {contractServicesError.message}
        </p>
      </div>
    );
  }

  const { data: subcontractorsData, error: subcontractorsError } = await supabase
    .from('subcontractors')
    .select('id, company(name)')
    .eq('active', true)
    .order('id', { ascending: true });

  if (subcontractorsError) {
    return (
      <div className="px-6 py-8">
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          Couldn&apos;t load subcontractors: {subcontractorsError.message}
        </p>
      </div>
    );
  }

  const contractServices = contractServicesData ?? [];
  const subcontractors = (subcontractorsData ?? []) as unknown as {
    id: number;
    company: { name: string } | null;
  }[];

  return (
    <div className="px-6 py-8">
      <p className="font-mono text-xs font-medium tracking-[0.2em] text-zinc-500 dark:text-zinc-400">
        OPERATIONS
      </p>
      <h2 className="mt-1 text-2xl font-semibold text-zinc-950 dark:text-zinc-50">
        Add material handling job
      </h2>
      <MaterialHandlingJobForm
        contractServices={contractServices}
        subcontractors={subcontractors}
        action={createMaterialHandlingJob}
        submitLabel="Create job"
      />
    </div>
  );
}
