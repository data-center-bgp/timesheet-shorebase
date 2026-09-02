import { redirect } from 'next/navigation';
import { InvoiceComponentForm, type InvoiceOption } from '../InvoiceComponentForm';
import { createInvoiceComponent } from '../actions';
import { createClient } from '@/lib/supabase/server';
import { isManagerRole } from '@/lib/auth/require-master';

export default async function NewInvoiceComponentPage() {
  if (await isManagerRole()) {
    redirect('/invoice-components');
  }

  const supabase = await createClient();

  const { data: invoicesData, error: invoicesError } = await supabase
    .from('invoice')
    .select('id, code, type_code')
    .order('id', { ascending: true });

  if (invoicesError) {
    return (
      <div className="px-6 py-8">
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          Couldn&apos;t load invoices: {invoicesError.message}
        </p>
      </div>
    );
  }

  const { data: contractServicesData, error: contractServicesError } = await supabase
    .from('contract_service')
    .select('id, code')
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

  const { data: shorebaseServicesData, error: shorebaseServicesError } = await supabase
    .from('shorebase_service')
    .select('id, code, name')
    .eq('active', true)
    .order('code', { ascending: true });

  if (shorebaseServicesError) {
    return (
      <div className="px-6 py-8">
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          Couldn&apos;t load services: {shorebaseServicesError.message}
        </p>
      </div>
    );
  }

  const { data: companiesData, error: companiesError } = await supabase
    .from('company')
    .select('id, name')
    .eq('active', true)
    .order('name', { ascending: true });

  if (companiesError) {
    return (
      <div className="px-6 py-8">
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          Couldn&apos;t load companies: {companiesError.message}
        </p>
      </div>
    );
  }

  const { data: uomsData, error: uomsError } = await supabase
    .from('uom')
    .select('code, name')
    .order('name', { ascending: true });

  if (uomsError) {
    return (
      <div className="px-6 py-8">
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          Couldn&apos;t load UoMs: {uomsError.message}
        </p>
      </div>
    );
  }

  const invoices: InvoiceOption[] = (invoicesData ?? []).map((row) => ({
    id: row.id,
    label: `${row.code ?? 'Invoice #' + row.id} (${row.type_code === 'P' ? 'Proforma' : 'Invoice'})`,
  }));
  const contractServices = contractServicesData ?? [];
  const shorebaseServices = shorebaseServicesData ?? [];
  const companies = companiesData ?? [];
  const uoms = uomsData ?? [];

  return (
    <div className="px-6 py-8">
      <p className="font-mono text-xs font-medium tracking-[0.2em] text-zinc-500 dark:text-zinc-400">
        APPROVALS &amp; BILLING
      </p>
      <h2 className="mt-1 text-2xl font-semibold text-zinc-950 dark:text-zinc-50">
        Add invoice component
      </h2>
      <InvoiceComponentForm
        invoices={invoices}
        contractServices={contractServices}
        shorebaseServices={shorebaseServices}
        companies={companies}
        uoms={uoms}
        action={createInvoiceComponent}
        submitLabel="Create invoice component"
      />
    </div>
  );
}
