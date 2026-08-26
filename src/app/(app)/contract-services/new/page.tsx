import { ContractServiceForm } from '../ContractServiceForm';
import { createContractService } from '../actions';
import { createClient } from '@/lib/supabase/server';

export default async function NewContractServicePage() {
  const supabase = await createClient();

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

  return (
    <div className="px-6 py-8">
      <p className="font-mono text-xs font-medium tracking-[0.2em] text-zinc-500 dark:text-zinc-400">
        MASTER DATA
      </p>
      <h2 className="mt-1 text-2xl font-semibold text-zinc-950 dark:text-zinc-50">
        Add contract service
      </h2>
      <ContractServiceForm
        contracts={contracts}
        services={services}
        uoms={uoms}
        sumCalcTypes={sumCalcTypes}
        action={createContractService}
        submitLabel="Create contract service"
      />
    </div>
  );
}
