'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { isManagerRole } from '@/lib/auth/require-master';

export type ProductFormState = {
  error: string | null;
};

export async function createProduct(
  _prevState: ProductFormState,
  formData: FormData,
): Promise<ProductFormState> {
  if (await isManagerRole()) {
    return { error: 'Managers have read-only access.' };
  }

  const name = (formData.get('name') as string | null)?.trim();
  if (!name) {
    return { error: 'Name is required.' };
  }

  const supabase = await createClient();
  const { error } = await supabase.from('product').insert({ name });

  if (error) {
    return { error: error.message };
  }

  revalidatePath('/products');
  redirect('/products');
}

export async function updateProduct(
  id: number,
  _prevState: ProductFormState,
  formData: FormData,
): Promise<ProductFormState> {
  if (await isManagerRole()) {
    return { error: 'Managers have read-only access.' };
  }

  const name = (formData.get('name') as string | null)?.trim();
  if (!name) {
    return { error: 'Name is required.' };
  }

  const supabase = await createClient();
  const { error } = await supabase.from('product').update({ name }).eq('id', id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath('/products');
  redirect('/products');
}

export async function deactivateProduct(id: number) {
  if (await isManagerRole()) {
    throw new Error('Managers have read-only access.');
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('product')
    .update({ active: false })
    .eq('id', id)
    .select('id');

  if (error) {
    throw new Error(error.message);
  }
  if (!data || data.length === 0) {
    throw new Error('Product not found.');
  }

  revalidatePath('/products');
  revalidatePath(`/products/${id}/edit`);
}

export async function reactivateProduct(id: number) {
  if (await isManagerRole()) {
    throw new Error('Managers have read-only access.');
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('product')
    .update({ active: true })
    .eq('id', id)
    .select('id');

  if (error) {
    throw new Error(error.message);
  }
  if (!data || data.length === 0) {
    throw new Error('Product not found.');
  }

  revalidatePath('/products');
  revalidatePath(`/products/${id}/edit`);
}
