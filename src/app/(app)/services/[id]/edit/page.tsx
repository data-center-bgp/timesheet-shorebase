import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { ServiceForm, type Service } from '../../ServiceForm';
import { updateService, deactivateService, reactivateService } from '../../actions';

export default async function EditServicePage(props: PageProps<'/services/[id]/edit'>) {
  const { id } = await props.params;
  const serviceId = Number(id);

  if (Number.isNaN(serviceId)) {
    notFound();
  }

  const supabase = await createClient();
  const { data: service, error } = await supabase
    .from('shorebase_service')
    .select(
      'id, code, name, description, default_uom_code, default_price_per_uom, service_type_code, start_date, end_date, active',
    )
    .eq('id', serviceId)
    .maybeSingle();

  if (error) {
    return (
      <div className="px-6 py-8">
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          Couldn&apos;t load service: {error.message}
        </p>
      </div>
    );
  }

  if (!service) {
    notFound();
  }

  const { data: serviceTypesData, error: serviceTypesError } = await supabase
    .from('service_type')
    .select('code, name')
    .order('name', { ascending: true });

  if (serviceTypesError) {
    return (
      <div className="px-6 py-8">
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          Couldn&apos;t load service types: {serviceTypesError.message}
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

  const serviceTypes = serviceTypesData ?? [];
  const uoms = uomsData ?? [];

  const { active } = service;
  const updateServiceWithId = updateService.bind(null, serviceId);
  const deactivateServiceWithId = deactivateService.bind(null, serviceId);
  const reactivateServiceWithId = reactivateService.bind(null, serviceId);

  return (
    <div className="px-6 py-8">
      <p className="font-mono text-xs font-medium tracking-[0.2em] text-zinc-500 dark:text-zinc-400">
        MASTER DATA
      </p>
      <div className="mt-1 flex items-center justify-between">
        <h2 className="text-2xl font-semibold text-zinc-950 dark:text-zinc-50">
          Edit service
        </h2>
        <form action={active ? deactivateServiceWithId : reactivateServiceWithId}>
          <button
            type="submit"
            className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-900"
          >
            {active ? 'Deactivate' : 'Reactivate'}
          </button>
        </form>
      </div>
      <ServiceForm
        service={service as Service}
        serviceTypes={serviceTypes}
        uoms={uoms}
        action={updateServiceWithId}
        submitLabel="Save changes"
      />
    </div>
  );
}
