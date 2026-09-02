import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { InvoiceForm, type Invoice } from '../../InvoiceForm';
import { updateInvoice, finalizeInvoice } from '../../actions';
import { isManagerRole } from '@/lib/auth/require-master';

export default async function EditInvoicePage(props: PageProps<'/invoices/[id]/edit'>) {
  const { id } = await props.params;
  const invoiceId = Number(id);

  if (Number.isNaN(invoiceId)) {
    notFound();
  }

  const isManager = await isManagerRole();
  const supabase = await createClient();

  const { data: invoice, error } = await supabase
    .from('invoice')
    .select('id, proforma_invoice_id, period_id, code, issue_date, tax_percentage, status_code')
    .eq('id', invoiceId)
    .eq('type_code', 'I')
    .maybeSingle();

  if (error) {
    return (
      <div className="px-6 py-8">
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          Couldn&apos;t load invoice: {error.message}
        </p>
      </div>
    );
  }

  if (!invoice) {
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

  const { data: proformaInvoicesData, error: proformaInvoicesError } = await supabase
    .from('invoice')
    .select('id, code')
    .eq('type_code', 'P')
    .order('code', { ascending: true });

  if (proformaInvoicesError) {
    return (
      <div className="px-6 py-8">
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          Couldn&apos;t load proforma invoices: {proformaInvoicesError.message}
        </p>
      </div>
    );
  }

  const periods = periodsData ?? [];
  let proformaInvoices = proformaInvoicesData ?? [];
  if (
    invoice.proforma_invoice_id &&
    !proformaInvoices.some((p) => p.id === invoice.proforma_invoice_id)
  ) {
    const { data: currentProformaInvoice } = await supabase
      .from('invoice')
      .select('id, code')
      .eq('id', invoice.proforma_invoice_id)
      .maybeSingle();
    if (currentProformaInvoice) proformaInvoices = [...proformaInvoices, currentProformaInvoice];
  }

  const isFinalized = invoice.status_code === 'F';
  const updateInvoiceWithId = updateInvoice.bind(null, invoiceId);
  const finalizeInvoiceWithId = finalizeInvoice.bind(null, invoiceId);

  return (
    <div className="px-6 py-8">
      <p className="font-mono text-xs font-medium tracking-[0.2em] text-zinc-500 dark:text-zinc-400">
        APPROVALS &amp; BILLING
      </p>
      <div className="mt-1 flex items-center justify-between">
        <h2 className="text-2xl font-semibold text-zinc-950 dark:text-zinc-50">
          Edit invoice
        </h2>
        {!isFinalized && !isManager && (
          <form action={finalizeInvoiceWithId}>
            <button
              type="submit"
              className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-900"
            >
              Finalize
            </button>
          </form>
        )}
      </div>
      <InvoiceForm
        invoice={invoice as Invoice}
        periods={periods}
        proformaInvoices={proformaInvoices}
        action={updateInvoiceWithId}
        submitLabel="Save changes"
        readOnly={isManager || isFinalized}
        readOnlyMessage={
          isManager
            ? 'Managers have read-only access.'
            : 'This invoice has been finalized and can no longer be edited.'
        }
      />
    </div>
  );
}
