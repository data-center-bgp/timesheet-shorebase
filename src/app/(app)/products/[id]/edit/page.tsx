import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { ProductForm, type Product } from '../../ProductForm';
import { updateProduct, deactivateProduct, reactivateProduct } from '../../actions';

export default async function EditProductPage(props: PageProps<'/products/[id]/edit'>) {
  const { id } = await props.params;
  const productId = Number(id);

  if (Number.isNaN(productId)) {
    notFound();
  }

  const supabase = await createClient();
  const { data: product, error } = await supabase
    .from('product')
    .select('id, name, active')
    .eq('id', productId)
    .maybeSingle();

  if (error) {
    return (
      <div className="px-6 py-8">
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          Couldn&apos;t load product: {error.message}
        </p>
      </div>
    );
  }

  if (!product) {
    notFound();
  }

  const { active } = product;
  const updateProductWithId = updateProduct.bind(null, productId);
  const deactivateProductWithId = deactivateProduct.bind(null, productId);
  const reactivateProductWithId = reactivateProduct.bind(null, productId);

  return (
    <div className="px-6 py-8">
      <p className="font-mono text-xs font-medium tracking-[0.2em] text-zinc-500 dark:text-zinc-400">
        MASTER DATA
      </p>
      <div className="mt-1 flex items-center justify-between">
        <h2 className="text-2xl font-semibold text-zinc-950 dark:text-zinc-50">
          Edit product
        </h2>
        <form action={active ? deactivateProductWithId : reactivateProductWithId}>
          <button
            type="submit"
            className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-900"
          >
            {active ? 'Deactivate' : 'Reactivate'}
          </button>
        </form>
      </div>
      <ProductForm product={product as Product} action={updateProductWithId} submitLabel="Save changes" />
    </div>
  );
}
