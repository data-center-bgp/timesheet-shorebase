import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { isManagerRole } from '@/lib/auth/require-master';

type ProformaInvoiceRow = {
  id: number;
  code: string | null;
  status_code: string | null;
  issue_date: string | null;
  period: { name: string } | null;
};

export default async function ProformaInvoicesPage() {
  const isManager = await isManagerRole();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('invoice')
    .select('id, code, status_code, issue_date, period(name)')
    .eq('type_code', 'P')
    .order('id', { ascending: true });

  const proformaInvoices = (data ?? []) as unknown as ProformaInvoiceRow[];

  return (
    <div className="px-6 py-8">
      <div className="flex items-center justify-between">
        <div>
          <p className="font-mono text-xs font-medium tracking-[0.2em] text-zinc-500 dark:text-zinc-400">
            APPROVALS &amp; BILLING
          </p>
          <h2 className="mt-1 text-2xl font-semibold text-zinc-950 dark:text-zinc-50">
            Proforma Invoices
          </h2>
        </div>
        {!isManager && (
          <Link
            href="/proforma-invoices/new"
            className="rounded-md bg-teal-700 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-teal-800 dark:bg-teal-600 dark:hover:bg-teal-500"
          >
            Add proforma invoice
          </Link>
        )}
      </div>

      {error && (
        <p role="alert" className="mt-4 text-sm text-red-600 dark:text-red-400">
          Couldn&apos;t load proforma invoices: {error.message}
        </p>
      )}

      {!error && proformaInvoices.length === 0 && (
        <p className="mt-4 max-w-prose text-zinc-600 dark:text-zinc-400">
          No proforma invoices yet. Add your first one to get started.
        </p>
      )}

      {!error && proformaInvoices.length > 0 && (
        <div className="mt-6 overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800">
          <table className="w-full text-sm">
            <thead className="border-b border-zinc-200 bg-zinc-50 text-left text-xs font-medium uppercase tracking-wide text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
              <tr>
                <th className="px-4 py-2">Code</th>
                <th className="px-4 py-2">Period</th>
                <th className="px-4 py-2">Status</th>
                <th className="px-4 py-2">Issue date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {proformaInvoices.map((invoice) => {
                const isFinalized = invoice.status_code === 'F';
                return (
                  <tr key={invoice.id}>
                    <td className="px-4 py-2 font-medium text-zinc-900 dark:text-zinc-100">
                      <Link href={`/proforma-invoices/${invoice.id}/edit`} className="hover:underline">
                        {invoice.code ?? `Invoice #${invoice.id}`}
                      </Link>
                    </td>
                    <td className="px-4 py-2 text-zinc-600 dark:text-zinc-400">
                      {invoice.period?.name ?? '—'}
                    </td>
                    <td className="px-4 py-2">
                      <span
                        className={
                          isFinalized
                            ? 'rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400'
                            : 'rounded-full bg-teal-50 px-2 py-0.5 text-xs font-medium text-teal-800 dark:bg-teal-950/40 dark:text-teal-300'
                        }
                      >
                        {isFinalized ? 'Finalized' : 'Draft'}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-zinc-600 dark:text-zinc-400">
                      {invoice.issue_date ?? '—'}
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
