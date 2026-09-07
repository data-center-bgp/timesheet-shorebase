import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import {
  InvoiceComponentForm,
  type InvoiceComponent,
  type InvoiceOption,
} from '../../InvoiceComponentForm';
import { updateInvoiceComponent } from '../../actions';
import { isManagerRole } from '@/lib/auth/require-master';

export default async function EditInvoiceComponentPage(props: PageProps<'/invoice-components/[id]/edit'>) {
  const { id } = await props.params;
  const invoiceComponentId = Number(id);

  if (Number.isNaN(invoiceComponentId)) {
    notFound();
  }

  const isManager = await isManagerRole();
  const supabase = await createClient();

  const { data: invoiceComponent, error } = await supabase
    .from('invoice_component')
    .select(
      'id, invoice_id, contract_service_id, shorebase_service_id, company_id, uom_code, price_per_uom_contract, price_per_uom_independent, actual_price_per_uom, agg_amount, remark',
    )
    .eq('id', invoiceComponentId)
    .maybeSingle();

  if (error) {
    return (
      <div className="px-6 py-8">
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          Couldn&apos;t load invoice component: {error.message}
        </p>
      </div>
    );
  }

  if (!invoiceComponent) {
    notFound();
  }

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
    .select('id, code, shorebase_service(name)')
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

  let contractServices = (contractServicesData ?? []) as unknown as {
    id: number;
    code: string;
    shorebase_service: { name: string } | null;
  }[];
  if (
    invoiceComponent.contract_service_id &&
    !contractServices.some((cs) => cs.id === invoiceComponent.contract_service_id)
  ) {
    const { data: currentContractService } = await supabase
      .from('contract_service')
      .select('id, code, shorebase_service(name)')
      .eq('id', invoiceComponent.contract_service_id)
      .maybeSingle();
    if (currentContractService) {
      contractServices = [
        ...contractServices,
        currentContractService as unknown as {
          id: number;
          code: string;
          shorebase_service: { name: string } | null;
        },
      ];
    }
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

  let shorebaseServices = shorebaseServicesData ?? [];
  if (
    invoiceComponent.shorebase_service_id &&
    !shorebaseServices.some((s) => s.id === invoiceComponent.shorebase_service_id)
  ) {
    const { data: currentShorebaseService } = await supabase
      .from('shorebase_service')
      .select('id, code, name')
      .eq('id', invoiceComponent.shorebase_service_id)
      .maybeSingle();
    if (currentShorebaseService) shorebaseServices = [...shorebaseServices, currentShorebaseService];
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

  let companies = companiesData ?? [];
  if (invoiceComponent.company_id && !companies.some((c) => c.id === invoiceComponent.company_id)) {
    const { data: currentCompany } = await supabase
      .from('company')
      .select('id, name')
      .eq('id', invoiceComponent.company_id)
      .maybeSingle();
    if (currentCompany) companies = [...companies, currentCompany];
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
  const uoms = uomsData ?? [];

  const updateInvoiceComponentWithId = updateInvoiceComponent.bind(null, invoiceComponentId);

  return (
    <div className="px-6 py-8">
      <p className="font-mono text-xs font-medium tracking-[0.2em] text-zinc-500 dark:text-zinc-400">
        APPROVALS &amp; BILLING
      </p>
      <h2 className="mt-1 text-2xl font-semibold text-zinc-950 dark:text-zinc-50">
        Edit invoice component
      </h2>
      <InvoiceComponentForm
        invoiceComponent={invoiceComponent as InvoiceComponent}
        invoices={invoices}
        contractServices={contractServices}
        shorebaseServices={shorebaseServices}
        companies={companies}
        uoms={uoms}
        action={updateInvoiceComponentWithId}
        submitLabel="Save changes"
        readOnly={isManager}
      />
    </div>
  );
}
