import { ServiceForm } from '../ServiceForm';
import { createService } from '../actions';
import { createClient } from '@/lib/supabase/server';

export default async function NewServicePage() {
  const supabase = await createClient();

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

  return (
    <div className="px-6 py-8">
      <p className="font-mono text-xs font-medium tracking-[0.2em] text-zinc-500 dark:text-zinc-400">
        MASTER DATA
      </p>
      <h2 className="mt-1 text-2xl font-semibold text-zinc-950 dark:text-zinc-50">
        Add service
      </h2>
      <ServiceForm
        serviceTypes={serviceTypes}
        uoms={uoms}
        action={createService}
        submitLabel="Create service"
      />
    </div>
  );
}
