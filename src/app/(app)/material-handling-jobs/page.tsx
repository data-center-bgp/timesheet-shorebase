import { Fragment } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { isManagerRole } from '@/lib/auth/require-master';

type MaterialHandlingJobRow = {
  id: number;
  name: string;
  job_date: string;
  active: boolean;
  contract_service: { code: string; shorebase_service: { name: string } | null } | null;
  subcontractors: { company: { name: string } | null } | null;
  material_handling_item: {
    id: number;
    product: { name: string } | null;
    quantity: number;
    uom: { name: string } | null;
    active: boolean;
  }[];
  material_handling_equipment: {
    id: number;
    equipment: { code: string; name: string } | null;
    active: boolean;
  }[];
};

export default async function MaterialHandlingJobsPage() {
  const isManager = await isManagerRole();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('material_handling_job')
    .select(
      'id, name, job_date, active, contract_service(code, shorebase_service(name)), subcontractors(company(name)), material_handling_item(id, product(name), quantity, uom(name), active), material_handling_equipment(id, equipment(code, name), active)',
    )
    .order('job_date', { ascending: true });

  const jobs = (data ?? []) as unknown as MaterialHandlingJobRow[];

  return (
    <div className="px-6 py-8">
      <div className="flex items-center justify-between">
        <div>
          <p className="font-mono text-xs font-medium tracking-[0.2em] text-zinc-500 dark:text-zinc-400">
            OPERATIONS
          </p>
          <h2 className="mt-1 text-2xl font-semibold text-zinc-950 dark:text-zinc-50">
            Material Handling Jobs
          </h2>
        </div>
        {!isManager && (
          <Link
            href="/material-handling-jobs/new"
            className="rounded-md bg-teal-700 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-teal-800 dark:bg-teal-600 dark:hover:bg-teal-500"
          >
            Add job
          </Link>
        )}
      </div>

      {error && (
        <p role="alert" className="mt-4 text-sm text-red-600 dark:text-red-400">
          Couldn&apos;t load material handling jobs: {error.message}
        </p>
      )}

      {!error && jobs.length === 0 && (
        <p className="mt-4 max-w-prose text-zinc-600 dark:text-zinc-400">
          No material handling jobs yet. Add your first one to get started.
        </p>
      )}

      {!error && jobs.length > 0 && (
        <div className="mt-6 overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800">
          <table className="w-full text-sm">
            <thead className="border-b border-zinc-200 bg-zinc-50 text-left text-xs font-medium uppercase tracking-wide text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
              <tr>
                <th className="px-4 py-2">Name</th>
                <th className="px-4 py-2">Contract Service</th>
                <th className="px-4 py-2">Subcontractor</th>
                <th className="px-4 py-2">Job date</th>
                <th className="px-4 py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {jobs.map((job) => {
                const { active } = job;
                const hasChildren =
                  job.material_handling_item.length > 0 || job.material_handling_equipment.length > 0;
                return (
                  <Fragment key={job.id}>
                    <tr
                      className={
                        hasChildren ? undefined : 'border-b border-zinc-200 dark:border-zinc-800'
                      }
                    >
                      <td className="px-4 py-2 font-medium text-zinc-900 dark:text-zinc-100">
                        <Link href={`/material-handling-jobs/${job.id}/edit`} className="hover:underline">
                          {job.name}
                        </Link>
                      </td>
                      <td className="px-4 py-2 text-zinc-600 dark:text-zinc-400">
                        {job.contract_service
                          ? `${job.contract_service.code} — ${job.contract_service.shorebase_service?.name ?? '—'}`
                          : '—'}
                      </td>
                      <td className="px-4 py-2 text-zinc-600 dark:text-zinc-400">
                        {job.subcontractors?.company?.name ?? '—'}
                      </td>
                      <td className="px-4 py-2 text-zinc-600 dark:text-zinc-400">{job.job_date}</td>
                      <td className="px-4 py-2">
                        <span
                          className={
                            active
                              ? 'rounded-full bg-teal-50 px-2 py-0.5 text-xs font-medium text-teal-800 dark:bg-teal-950/40 dark:text-teal-300'
                              : 'rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400'
                          }
                        >
                          {active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                    </tr>
                    {hasChildren && (
                      <tr className="border-b border-zinc-200 dark:border-zinc-800">
                        <td colSpan={5} className="bg-zinc-50 px-4 py-2 dark:bg-zinc-900/40">
                          <details>
                            <summary className="cursor-pointer text-sm font-medium text-teal-700 hover:underline dark:text-teal-400">
                              {job.material_handling_item.length} item
                              {job.material_handling_item.length === 1 ? '' : 's'},{' '}
                              {job.material_handling_equipment.length} equipment
                            </summary>
                            <div className="mt-2 grid grid-cols-1 gap-4 text-sm sm:grid-cols-2">
                              {job.material_handling_item.length > 0 && (
                                <div>
                                  <p className="font-medium text-zinc-700 dark:text-zinc-300">Items</p>
                                  <ul className="mt-1 space-y-0.5 text-zinc-600 dark:text-zinc-400">
                                    {job.material_handling_item.map((item) => (
                                      <li key={item.id}>
                                        {item.product?.name ?? '—'} — {item.quantity} {item.uom?.name ?? '—'}
                                        {!item.active && ' (Inactive)'}
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                              {job.material_handling_equipment.length > 0 && (
                                <div>
                                  <p className="font-medium text-zinc-700 dark:text-zinc-300">Equipment</p>
                                  <ul className="mt-1 space-y-0.5 text-zinc-600 dark:text-zinc-400">
                                    {job.material_handling_equipment.map((equipmentRecord) => (
                                      <li key={equipmentRecord.id}>
                                        {equipmentRecord.equipment?.code ?? '—'} —{' '}
                                        {equipmentRecord.equipment?.name ?? '—'}
                                        {!equipmentRecord.active && ' (Inactive)'}
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                            </div>
                          </details>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
