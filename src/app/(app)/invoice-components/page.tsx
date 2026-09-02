import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { isManagerRole } from '@/lib/auth/require-master';

type InvoiceComponentRow = {
  id: number;
  agg_amount: number | null;
  invoice: { code: string | null; type_code: string | null } | null;
  contract_service: { code: string | null } | null;
  company: { name: string | null } | null;
  uom: { name: string | null } | null;
};

function invoiceLabel(invoice: { code: string | null; type_code: string | null } | null, id: number | null) {
  if (!invoice) return '—';
  const code = invoice.code ?? (id !== null ? `Invoice #${id}` : 'Invoice');
  const type = invoice.type_code === 'P' ? 'Proforma' : 'Invoice';
  return `${code} (${type})`;
}

export default async function InvoiceComponentsPage() {
  const isManager = await isManagerRole();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('invoice_component')
    .select(
      'id, agg_amount, invoice_id, invoice(code, type_code), contract_service(code), company(name), uom(name)',
    )
    .order('id', { ascending: true });

  const components = (data ?? []) as unknown as (InvoiceComponentRow & { invoice_id: number | null })[];

  return (
    <div className="px-6 py-8">
      <div className="flex items-center justify-between">
        <div>
          <p className="font-mono text-xs font-medium tracking-[0.2em] text-zinc-500 dark:text-zinc-400">
            APPROVALS &amp; BILLING
          </p>
          <h2 className="mt-1 text-2xl font-semibold text-zinc-950 dark:text-zinc-50">
            Invoice Components
          </h2>
        </div>
        {!isManager && (
          <Link
            href="/invoice-components/new"
            className="rounded-md bg-teal-700 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-teal-800 dark:bg-teal-600 dark:hover:bg-teal-500"
          >
            Add invoice component
          </Link>
        )}
      </div>

      {error && (
        <p role="alert" className="mt-4 text-sm text-red-600 dark:text-red-400">
          Couldn&apos;t load invoice components: {error.message}
        </p>
      )}

      {!error && components.length === 0 && (
        <p className="mt-4 max-w-prose text-zinc-600 dark:text-zinc-400">
          No invoice components yet. Add your first one to get started.
        </p>
      )}

      {!error && components.length > 0 && (
        <div className="mt-6 overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800">
          <table className="w-full text-sm">
            <thead className="border-b border-zinc-200 bg-zinc-50 text-left text-xs font-medium uppercase tracking-wide text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
              <tr>
                <th className="px-4 py-2">Invoice</th>
                <th className="px-4 py-2">Contract Service</th>
                <th className="px-4 py-2">Company</th>
                <th className="px-4 py-2">UoM</th>
                <th className="px-4 py-2">Aggregate amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {components.map((component) => (
                <tr key={component.id}>
                  <td className="px-4 py-2 font-medium text-zinc-900 dark:text-zinc-100">
                    <Link href={`/invoice-components/${component.id}/edit`} className="hover:underline">
                      {invoiceLabel(component.invoice, component.invoice_id)}
                    </Link>
                  </td>
                  <td className="px-4 py-2 text-zinc-600 dark:text-zinc-400">
                    {component.contract_service?.code ?? '—'}
                  </td>
                  <td className="px-4 py-2 text-zinc-600 dark:text-zinc-400">
                    {component.company?.name ?? '—'}
                  </td>
                  <td className="px-4 py-2 text-zinc-600 dark:text-zinc-400">{component.uom?.name ?? '—'}</td>
                  <td className="px-4 py-2 text-zinc-600 dark:text-zinc-400">
                    {component.agg_amount ?? '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
