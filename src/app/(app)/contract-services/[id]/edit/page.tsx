import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { ContractServiceForm, type ContractService } from '../../ContractServiceForm';
import { updateContractService } from '../../actions';

export default async function EditContractServicePage(props: PageProps<'/contract-services/[id]/edit'>) {
  const { id } = await props.params;
  const contractServiceId = Number(id);

  if (Number.isNaN(contractServiceId)) {
    notFound();
  }

  const supabase = await createClient();
  const { data: contractService, error } = await supabase
    .from('contract_service')
    .select(
      'id, code, contract_id, service_id, uom_code, summary_calculation_type, start_date, end_date, timesheet_site_code, active',
    )
    .eq('id', contractServiceId)
    .maybeSingle();

  if (error) {
    return (
      <div className="px-6 py-8">
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          Couldn&apos;t load contract service: {error.message}
        </p>
      </div>
    );
  }

  if (!contractService) {
    notFound();
  }

  const { data: contractsData, error: contractsError } = await supabase
    .from('contract')
    .select('id, contract_number')
    .order('contract_number', { ascending: true });

  if (contractsError) {
    return (
      <div className="px-6 py-8">
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          Couldn&apos;t load contracts: {contractsError.message}
        </p>
      </div>
    );
  }

  const { data: servicesData, error: servicesError } = await supabase
    .from('shorebase_service')
    .select('id, code, name, default_uom_code')
    .order('code', { ascending: true });

  if (servicesError) {
    return (
      <div className="px-6 py-8">
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          Couldn&apos;t load services: {servicesError.message}
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

  const { data: sumCalcTypesData, error: sumCalcTypesError } = await supabase
    .from('sum_calc_type')
    .select('code, name')
    .order('name', { ascending: true });

  if (sumCalcTypesError) {
    return (
      <div className="px-6 py-8">
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          Couldn&apos;t load calculation types: {sumCalcTypesError.message}
        </p>
      </div>
    );
  }

  const contracts = contractsData ?? [];
  const services = servicesData ?? [];
  const uoms = uomsData ?? [];
  const sumCalcTypes = sumCalcTypesData ?? [];

  const updateContractServiceWithId = updateContractService.bind(null, contractServiceId);

  return (
    <div className="px-6 py-8">
      <p className="font-mono text-xs font-medium tracking-[0.2em] text-zinc-500 dark:text-zinc-400">
        MASTER DATA
      </p>
      <h2 className="mt-1 text-2xl font-semibold text-zinc-950 dark:text-zinc-50">
        Edit contract service
      </h2>
      <ContractServiceForm
        contractService={contractService as ContractService}
        contracts={contracts}
        services={services}
        uoms={uoms}
        sumCalcTypes={sumCalcTypes}
        action={updateContractServiceWithId}
        submitLabel="Save changes"
      />
    </div>
  );
}
