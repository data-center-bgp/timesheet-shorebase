import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { MaterialHandlingJobForm, type MaterialHandlingJob } from '../../MaterialHandlingJobForm';
import {
  updateMaterialHandlingJob,
  deactivateMaterialHandlingJob,
  reactivateMaterialHandlingJob,
} from '../../actions';

export default async function EditMaterialHandlingJobPage(props: PageProps<'/material-handling-jobs/[id]/edit'>) {
  const { id } = await props.params;
  const jobId = Number(id);

  if (Number.isNaN(jobId)) {
    notFound();
  }

  const supabase = await createClient();

  const { data: job, error } = await supabase
    .from('material_handling_job')
    .select('id, contract_service_id, sub_contractor_id, name, job_date, job_start, job_finish, active')
    .eq('id', jobId)
    .maybeSingle();

  if (error) {
    return (
      <div className="px-6 py-8">
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          Couldn&apos;t load material handling job: {error.message}
        </p>
      </div>
    );
  }

  if (!job) {
    notFound();
  }

  const { data: contractServicesData, error: contractServicesError } = await supabase
    .from('contract_service')
    .select('id, code')
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

  const { active } = job;
  const updateMaterialHandlingJobWithId = updateMaterialHandlingJob.bind(null, jobId);
  const deactivateMaterialHandlingJobWithId = deactivateMaterialHandlingJob.bind(null, jobId);
  const reactivateMaterialHandlingJobWithId = reactivateMaterialHandlingJob.bind(null, jobId);

  return (
    <div className="px-6 py-8">
      <p className="font-mono text-xs font-medium tracking-[0.2em] text-zinc-500 dark:text-zinc-400">
        OPERATIONS
      </p>
      <div className="mt-1 flex items-center justify-between">
        <h2 className="text-2xl font-semibold text-zinc-950 dark:text-zinc-50">
          Edit material handling job
        </h2>
        <form action={active ? deactivateMaterialHandlingJobWithId : reactivateMaterialHandlingJobWithId}>
          <button
            type="submit"
            className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-900"
          >
            {active ? 'Deactivate' : 'Reactivate'}
          </button>
        </form>
      </div>
      <MaterialHandlingJobForm
        job={job as MaterialHandlingJob}
        contractServices={contractServices}
        subcontractors={subcontractors}
        action={updateMaterialHandlingJobWithId}
        submitLabel="Save changes"
      />
    </div>
  );
}
