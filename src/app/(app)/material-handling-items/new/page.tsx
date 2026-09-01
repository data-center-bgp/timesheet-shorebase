import { MaterialHandlingItemForm } from '../MaterialHandlingItemForm';
import { createMaterialHandlingItem } from '../actions';
import { createClient } from '@/lib/supabase/server';

export default async function NewMaterialHandlingItemPage() {
  const supabase = await createClient();

  const { data: jobsData, error: jobsError } = await supabase
    .from('material_handling_job')
    .select('id, name')
    .eq('active', true)
    .order('name', { ascending: true });

  if (jobsError) {
    return (
      <div className="px-6 py-8">
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          Couldn&apos;t load material handling jobs: {jobsError.message}
        </p>
      </div>
    );
  }

  const { data: productsData, error: productsError } = await supabase
    .from('product')
    .select('id, name')
    .eq('active', true)
    .order('name', { ascending: true });

  if (productsError) {
    return (
      <div className="px-6 py-8">
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          Couldn&apos;t load products: {productsError.message}
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

  const jobs = jobsData ?? [];
  const products = productsData ?? [];
  const uoms = uomsData ?? [];

  return (
    <div className="px-6 py-8">
      <p className="font-mono text-xs font-medium tracking-[0.2em] text-zinc-500 dark:text-zinc-400">
        OPERATIONS
      </p>
      <h2 className="mt-1 text-2xl font-semibold text-zinc-950 dark:text-zinc-50">
        Add material handling item
      </h2>
      <MaterialHandlingItemForm
        jobs={jobs}
        products={products}
        uoms={uoms}
        action={createMaterialHandlingItem}
        submitLabel="Create item"
      />
    </div>
  );
}
