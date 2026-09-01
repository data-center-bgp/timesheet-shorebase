import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { ContractServiceForm, type ContractService } from '../../ContractServiceForm';
import { updateContractService, deactivateContractService, reactivateContractService } from '../../actions';

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
    .eq('active', true)
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
    .eq('active', true)
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

  let contracts = contractsData ?? [];
  if (
    contractService.contract_id &&
    !contracts.some((c) => c.id === contractService.contract_id)
  ) {
    const { data: currentContract } = await supabase
      .from('contract')
      .select('id, contract_number')
      .eq('id', contractService.contract_id)
      .maybeSingle();
    if (currentContract) contracts = [...contracts, currentContract];
  }

  let services = servicesData ?? [];
  if (
    contractService.service_id &&
    !services.some((s) => s.id === contractService.service_id)
  ) {
    const { data: currentService } = await supabase
      .from('shorebase_service')
      .select('id, code, name, default_uom_code')
      .eq('id', contractService.service_id)
      .maybeSingle();
    if (currentService) services = [...services, currentService];
  }

  const uoms = uomsData ?? [];
  const sumCalcTypes = sumCalcTypesData ?? [];

  const { active } = contractService;
  const updateContractServiceWithId = updateContractService.bind(null, contractServiceId);
  const deactivateContractServiceWithId = deactivateContractService.bind(null, contractServiceId);
  const reactivateContractServiceWithId = reactivateContractService.bind(null, contractServiceId);

  return (
    <div className="px-6 py-8">
      <p className="font-mono text-xs font-medium tracking-[0.2em] text-zinc-500 dark:text-zinc-400">
        MASTER DATA
      </p>
      <div className="mt-1 flex items-center justify-between">
        <h2 className="text-2xl font-semibold text-zinc-950 dark:text-zinc-50">
          Edit contract service
        </h2>
        <form action={active ? deactivateContractServiceWithId : reactivateContractServiceWithId}>
          <button
            type="submit"
            className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-900"
          >
            {active ? 'Deactivate' : 'Reactivate'}
          </button>
        </form>
      </div>
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
