import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';

type MaterialHandlingEquipmentRow = {
  id: number;
  active: boolean;
  material_handling_job: { name: string } | null;
  equipment: { name: string } | null;
};

export default async function MaterialHandlingEquipmentPage() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('material_handling_equipment')
    .select('id, active, material_handling_job(name), equipment(name)')
    .order('id', { ascending: true });

  const rows = (data ?? []) as unknown as MaterialHandlingEquipmentRow[];

  return (
    <div className="px-6 py-8">
      <div className="flex items-center justify-between">
        <div>
          <p className="font-mono text-xs font-medium tracking-[0.2em] text-zinc-500 dark:text-zinc-400">
            OPERATIONS
          </p>
          <h2 className="mt-1 text-2xl font-semibold text-zinc-950 dark:text-zinc-50">
            Material Handling Equipment
          </h2>
        </div>
        <Link
          href="/material-handling-equipment/new"
          className="rounded-md bg-teal-700 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-teal-800 dark:bg-teal-600 dark:hover:bg-teal-500"
        >
          Add equipment usage
        </Link>
      </div>

      {error && (
        <p role="alert" className="mt-4 text-sm text-red-600 dark:text-red-400">
          Couldn&apos;t load material handling equipment: {error.message}
        </p>
      )}

      {!error && rows.length === 0 && (
        <p className="mt-4 max-w-prose text-zinc-600 dark:text-zinc-400">
          No material handling equipment usage yet. Add your first one to get started.
        </p>
      )}

      {!error && rows.length > 0 && (
        <div className="mt-6 overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800">
          <table className="w-full text-sm">
            <thead className="border-b border-zinc-200 bg-zinc-50 text-left text-xs font-medium uppercase tracking-wide text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
              <tr>
                <th className="px-4 py-2">Job</th>
                <th className="px-4 py-2">Equipment</th>
                <th className="px-4 py-2">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {rows.map((row) => {
                const { active } = row;
                return (
                  <tr key={row.id}>
                    <td className="px-4 py-2 font-medium text-zinc-900 dark:text-zinc-100">
                      <Link href={`/material-handling-equipment/${row.id}/edit`} className="hover:underline">
                        {row.material_handling_job?.name ?? '—'}
                      </Link>
                    </td>
                    <td className="px-4 py-2 text-zinc-600 dark:text-zinc-400">
                      {row.equipment?.name ?? '—'}
                    </td>
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
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
