import { notFound } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { MaterialHandlingJobForm, type MaterialHandlingJob } from '../../MaterialHandlingJobForm';
import {
  updateMaterialHandlingJob,
  deactivateMaterialHandlingJob,
  reactivateMaterialHandlingJob,
} from '../../actions';
import { isManagerRole } from '@/lib/auth/require-master';

export default async function EditMaterialHandlingJobPage(props: PageProps<'/material-handling-jobs/[id]/edit'>) {
  const { id } = await props.params;
  const jobId = Number(id);

  if (Number.isNaN(jobId)) {
    notFound();
  }

  const isManager = await isManagerRole();
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
    .select('id, code, shorebase_service(name)')
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

  let contractServices = (contractServicesData ?? []) as unknown as {
    id: number;
    code: string;
    shorebase_service: { name: string } | null;
  }[];
  if (job.contract_service_id && !contractServices.some((c) => c.id === job.contract_service_id)) {
    const { data: currentContractService } = await supabase
      .from('contract_service')
      .select('id, code, shorebase_service(name)')
      .eq('id', job.contract_service_id)
      .maybeSingle();
    if (currentContractService) {
      contractServices = [
        ...contractServices,
        currentContractService as unknown as {
          id: number;
          code: string;
          shorebase_service: { name: string } | null;
        },
      ];
    }
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

  let subcontractors = (subcontractorsData ?? []) as unknown as {
    id: number;
    company: { name: string } | null;
  }[];
  if (job.sub_contractor_id && !subcontractors.some((s) => s.id === job.sub_contractor_id)) {
    const { data: currentSubcontractor } = await supabase
      .from('subcontractors')
      .select('id, company(name)')
      .eq('id', job.sub_contractor_id)
      .maybeSingle();
    if (currentSubcontractor) {
      subcontractors = [
        ...subcontractors,
        currentSubcontractor as unknown as { id: number; company: { name: string } | null },
      ];
    }
  }

  const { data: itemsData, error: itemsError } = await supabase
    .from('material_handling_item')
    .select('id, product(name), quantity, uom(name), unit_size, active')
    .eq('job_id', jobId)
    .order('id', { ascending: true });

  if (itemsError) {
    return (
      <div className="px-6 py-8">
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          Couldn&apos;t load material handling items: {itemsError.message}
        </p>
      </div>
    );
  }

  const items = (itemsData ?? []) as unknown as {
    id: number;
    product: { name: string } | null;
    quantity: number;
    uom: { name: string } | null;
    unit_size: number | null;
    active: boolean;
  }[];

  const { data: equipmentData, error: equipmentError } = await supabase
    .from('material_handling_equipment')
    .select('id, equipment(code, name), active')
    .eq('job_id', jobId)
    .order('id', { ascending: true });

  if (equipmentError) {
    return (
      <div className="px-6 py-8">
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          Couldn&apos;t load material handling equipment: {equipmentError.message}
        </p>
      </div>
    );
  }

  const equipmentRecords = (equipmentData ?? []) as unknown as {
    id: number;
    equipment: { code: string; name: string } | null;
    active: boolean;
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
        {!isManager && (
          <form action={active ? deactivateMaterialHandlingJobWithId : reactivateMaterialHandlingJobWithId}>
            <button
              type="submit"
              className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-900"
            >
              {active ? 'Deactivate' : 'Reactivate'}
            </button>
          </form>
        )}
      </div>
      <MaterialHandlingJobForm
        job={job as MaterialHandlingJob}
        contractServices={contractServices}
        subcontractors={subcontractors}
        action={updateMaterialHandlingJobWithId}
        submitLabel="Save changes"
        readOnly={isManager}
      />

      <div className="mt-8">
        <div className="flex items-center justify-between">
          <p className="font-mono text-xs font-medium tracking-[0.18em] text-zinc-400 dark:text-zinc-500">
            ITEMS
          </p>
          <Link
            href={`/material-handling-items/new?job_id=${jobId}`}
            className="text-sm font-medium text-teal-700 hover:underline dark:text-teal-400"
          >
            + Add item
          </Link>
        </div>
        {items.length === 0 ? (
          <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">No items yet.</p>
        ) : (
          <div className="mt-2 space-y-2">
            {items.map((item) => (
              <details
                key={item.id}
                className="rounded-md border border-zinc-200 px-3 py-2 dark:border-zinc-800"
              >
                <summary className="flex cursor-pointer items-center justify-between text-sm">
                  <span className="font-medium text-zinc-900 dark:text-zinc-100">
                    {item.product?.name ?? '—'} — {item.quantity} {item.uom?.name ?? '—'}
                  </span>
                  <span
                    className={
                      item.active
                        ? 'rounded-full bg-teal-50 px-2 py-0.5 text-xs font-medium text-teal-800 dark:bg-teal-950/40 dark:text-teal-300'
                        : 'rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400'
                    }
                  >
                    {item.active ? 'Active' : 'Inactive'}
                  </span>
                </summary>
                <div className="mt-2 flex items-center justify-between text-sm text-zinc-600 dark:text-zinc-400">
                  <span>Unit size: {item.unit_size ?? '—'}</span>
                  <Link
                    href={`/material-handling-items/${item.id}/edit`}
                    className="font-medium text-teal-700 hover:underline dark:text-teal-400"
                  >
                    Edit →
                  </Link>
                </div>
              </details>
            ))}
          </div>
        )}
      </div>

      <div className="mt-8">
        <div className="flex items-center justify-between">
          <p className="font-mono text-xs font-medium tracking-[0.18em] text-zinc-400 dark:text-zinc-500">
            EQUIPMENT
          </p>
          <Link
            href={`/material-handling-equipment/new?job_id=${jobId}`}
            className="text-sm font-medium text-teal-700 hover:underline dark:text-teal-400"
          >
            + Add equipment
          </Link>
        </div>
        {equipmentRecords.length === 0 ? (
          <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">No equipment yet.</p>
        ) : (
          <div className="mt-2 space-y-2">
            {equipmentRecords.map((equipmentRecord) => (
              <details
                key={equipmentRecord.id}
                className="rounded-md border border-zinc-200 px-3 py-2 dark:border-zinc-800"
              >
                <summary className="flex cursor-pointer items-center justify-between text-sm">
                  <span className="font-medium text-zinc-900 dark:text-zinc-100">
                    {equipmentRecord.equipment?.code ?? '—'} — {equipmentRecord.equipment?.name ?? '—'}
                  </span>
                  <span
                    className={
                      equipmentRecord.active
                        ? 'rounded-full bg-teal-50 px-2 py-0.5 text-xs font-medium text-teal-800 dark:bg-teal-950/40 dark:text-teal-300'
                        : 'rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400'
                    }
                  >
                    {equipmentRecord.active ? 'Active' : 'Inactive'}
                  </span>
                </summary>
                <div className="mt-2 flex items-center justify-end text-sm text-zinc-600 dark:text-zinc-400">
                  <Link
                    href={`/material-handling-equipment/${equipmentRecord.id}/edit`}
                    className="font-medium text-teal-700 hover:underline dark:text-teal-400"
                  >
                    Edit →
                  </Link>
                </div>
              </details>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
