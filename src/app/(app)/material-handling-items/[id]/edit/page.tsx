import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { MaterialHandlingItemForm, type MaterialHandlingItem } from '../../MaterialHandlingItemForm';
import {
  updateMaterialHandlingItem,
  deactivateMaterialHandlingItem,
  reactivateMaterialHandlingItem,
} from '../../actions';

export default async function EditMaterialHandlingItemPage(props: PageProps<'/material-handling-items/[id]/edit'>) {
  const { id } = await props.params;
  const itemId = Number(id);

  if (Number.isNaN(itemId)) {
    notFound();
  }

  const supabase = await createClient();

  const { data: item, error } = await supabase
    .from('material_handling_item')
    .select('id, job_id, product_id, quantity, uom, unit_size, active')
    .eq('id', itemId)
    .maybeSingle();

  if (error) {
    return (
      <div className="px-6 py-8">
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          Couldn&apos;t load material handling item: {error.message}
        </p>
      </div>
    );
  }

  if (!item) {
    notFound();
  }

  const { data: jobsData, error: jobsError } = await supabase
    .from('material_handling_job')
    .select('id, name')
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

  const { active } = item;
  const updateMaterialHandlingItemWithId = updateMaterialHandlingItem.bind(null, itemId);
  const deactivateMaterialHandlingItemWithId = deactivateMaterialHandlingItem.bind(null, itemId);
  const reactivateMaterialHandlingItemWithId = reactivateMaterialHandlingItem.bind(null, itemId);

  return (
    <div className="px-6 py-8">
      <p className="font-mono text-xs font-medium tracking-[0.2em] text-zinc-500 dark:text-zinc-400">
        OPERATIONS
      </p>
      <div className="mt-1 flex items-center justify-between">
        <h2 className="text-2xl font-semibold text-zinc-950 dark:text-zinc-50">
          Edit material handling item
        </h2>
        <form action={active ? deactivateMaterialHandlingItemWithId : reactivateMaterialHandlingItemWithId}>
          <button
            type="submit"
            className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-900"
          >
            {active ? 'Deactivate' : 'Reactivate'}
          </button>
        </form>
      </div>
      <MaterialHandlingItemForm
        item={item as MaterialHandlingItem}
        jobs={jobs}
        products={products}
        uoms={uoms}
        action={updateMaterialHandlingItemWithId}
        submitLabel="Save changes"
      />
    </div>
  );
}
