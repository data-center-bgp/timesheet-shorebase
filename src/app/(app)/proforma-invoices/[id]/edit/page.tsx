import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { ProformaInvoiceForm, type ProformaInvoice } from '../../ProformaInvoiceForm';
import { updateProformaInvoice, finalizeProformaInvoice } from '../../actions';
import { isManagerRole } from '@/lib/auth/require-master';

export default async function EditProformaInvoicePage(props: PageProps<'/proforma-invoices/[id]/edit'>) {
  const { id } = await props.params;
  const proformaInvoiceId = Number(id);

  if (Number.isNaN(proformaInvoiceId)) {
    notFound();
  }

  const isManager = await isManagerRole();
  const supabase = await createClient();

  const { data: proformaInvoice, error } = await supabase
    .from('invoice')
    .select('id, period_id, code, issue_date, tax_percentage, status_code')
    .eq('id', proformaInvoiceId)
    .eq('type_code', 'P')
    .maybeSingle();

  if (error) {
    return (
      <div className="px-6 py-8">
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          Couldn&apos;t load proforma invoice: {error.message}
        </p>
      </div>
    );
  }

  if (!proformaInvoice) {
    notFound();
  }

  const { data: periodsData, error: periodsError } = await supabase
    .from('period')
    .select('id, name')
    .order('name', { ascending: true });

  if (periodsError) {
    return (
      <div className="px-6 py-8">
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          Couldn&apos;t load periods: {periodsError.message}
        </p>
      </div>
    );
  }

  const periods = periodsData ?? [];

  const isFinalized = proformaInvoice.status_code === 'F';
  const updateProformaInvoiceWithId = updateProformaInvoice.bind(null, proformaInvoiceId);
  const finalizeProformaInvoiceWithId = finalizeProformaInvoice.bind(null, proformaInvoiceId);

  return (
    <div className="px-6 py-8">
      <p className="font-mono text-xs font-medium tracking-[0.2em] text-zinc-500 dark:text-zinc-400">
        APPROVALS &amp; BILLING
      </p>
      <div className="mt-1 flex items-center justify-between">
        <h2 className="text-2xl font-semibold text-zinc-950 dark:text-zinc-50">
          Edit proforma invoice
        </h2>
        {!isFinalized && !isManager && (
          <form action={finalizeProformaInvoiceWithId}>
            <button
              type="submit"
              className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-900"
            >
              Finalize
            </button>
          </form>
        )}
      </div>
      <ProformaInvoiceForm
        proformaInvoice={proformaInvoice as ProformaInvoice}
        periods={periods}
        action={updateProformaInvoiceWithId}
        submitLabel="Save changes"
        readOnly={isManager || isFinalized}
        readOnlyMessage={
          isManager
            ? 'Managers have read-only access.'
            : 'This proforma invoice has been finalized and can no longer be edited.'
        }
      />
    </div>
  );
}
