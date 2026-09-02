import { redirect } from 'next/navigation';
import { ProformaInvoiceForm } from '../ProformaInvoiceForm';
import { createProformaInvoice } from '../actions';
import { createClient } from '@/lib/supabase/server';
import { isManagerRole } from '@/lib/auth/require-master';

export default async function NewProformaInvoicePage() {
  if (await isManagerRole()) {
    redirect('/proforma-invoices');
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

  const periods = periodsData ?? [];

  return (
    <div className="px-6 py-8">
      <p className="font-mono text-xs font-medium tracking-[0.2em] text-zinc-500 dark:text-zinc-400">
        APPROVALS &amp; BILLING
      </p>
      <h2 className="mt-1 text-2xl font-semibold text-zinc-950 dark:text-zinc-50">
        Add proforma invoice
      </h2>
      <ProformaInvoiceForm
        periods={periods}
        action={createProformaInvoice}
        submitLabel="Create proforma invoice"
      />
    </div>
  );
}
