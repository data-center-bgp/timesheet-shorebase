import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';

type ContractServiceRow = {
  id: number;
  code: string;
  active: boolean;
  contract: { contract_number: string } | null;
  shorebase_service: { name: string } | null;
  uom: { name: string } | null;
};

export default async function ContractServicesPage() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('contract_service')
    .select('id, code, active, contract(contract_number), shorebase_service(name), uom(name)')
    .order('code', { ascending: true });

  const contractServices = (data ?? []) as unknown as ContractServiceRow[];

  return (
    <div className="px-6 py-8">
      <div className="flex items-center justify-between">
        <div>
          <p className="font-mono text-xs font-medium tracking-[0.2em] text-zinc-500 dark:text-zinc-400">
            MASTER DATA
          </p>
          <h2 className="mt-1 text-2xl font-semibold text-zinc-950 dark:text-zinc-50">
            Contract Services
          </h2>
        </div>
        <Link
          href="/contract-services/new"
          className="rounded-md bg-teal-700 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-teal-800 dark:bg-teal-600 dark:hover:bg-teal-500"
        >
          Add contract service
        </Link>
      </div>

      {error && (
        <p role="alert" className="mt-4 text-sm text-red-600 dark:text-red-400">
          Couldn&apos;t load contract services: {error.message}
        </p>
      )}

      {!error && contractServices.length === 0 && (
        <p className="mt-4 max-w-prose text-zinc-600 dark:text-zinc-400">
          No contract services yet. Add your first one to get started.
        </p>
      )}

      {!error && contractServices.length > 0 && (
        <div className="mt-6 overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800">
          <table className="w-full text-sm">
            <thead className="border-b border-zinc-200 bg-zinc-50 text-left text-xs font-medium uppercase tracking-wide text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
              <tr>
                <th className="px-4 py-2">Code</th>
                <th className="px-4 py-2">Contract</th>
                <th className="px-4 py-2">Service</th>
                <th className="px-4 py-2">UoM</th>
                <th className="px-4 py-2">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {contractServices.map((contractService) => {
                const { active } = contractService;
                return (
                  <tr key={contractService.id}>
                    <td className="px-4 py-2 font-medium text-zinc-900 dark:text-zinc-100">
                      <Link href={`/contract-services/${contractService.id}/edit`} className="hover:underline">
                        {contractService.code}
                      </Link>
                    </td>
                    <td className="px-4 py-2 text-zinc-600 dark:text-zinc-400">
                      {contractService.contract?.contract_number ?? '—'}
                    </td>
                    <td className="px-4 py-2 text-zinc-600 dark:text-zinc-400">
                      {contractService.shorebase_service?.name ?? '—'}
                    </td>
                    <td className="px-4 py-2 text-zinc-600 dark:text-zinc-400">
                      {contractService.uom?.name ?? '—'}
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
