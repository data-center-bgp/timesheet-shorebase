import { redirect } from 'next/navigation';
import { InvoiceForm } from '../InvoiceForm';
import { createInvoice } from '../actions';
import { createClient } from '@/lib/supabase/server';
import { isManagerRole } from '@/lib/auth/require-master';

export default async function NewInvoicePage() {
  if (await isManagerRole()) {
    redirect('/invoices');
  }

  const supabase = await createClient();

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
  const proformaInvoices = proformaInvoicesData ?? [];

  return (
    <div className="px-6 py-8">
      <p className="font-mono text-xs font-medium tracking-[0.2em] text-zinc-500 dark:text-zinc-400">
        APPROVALS &amp; BILLING
      </p>
      <h2 className="mt-1 text-2xl font-semibold text-zinc-950 dark:text-zinc-50">
        Add invoice
      </h2>
      <InvoiceForm
        periods={periods}
        proformaInvoices={proformaInvoices}
        action={createInvoice}
        submitLabel="Create invoice"
      />
    </div>
  );
}
