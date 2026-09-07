'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { isManagerRole } from '@/lib/auth/require-master';

export type MaterialHandlingItemFormState = {
  error: string | null;
};

type ReadItemFieldsResult =
  | { error: string }
  | {
      values: {
        job_id: number;
        product_id: number;
        quantity: number;
        uom: string;
        unit_size: number | null;
      };
    };

function readItemFields(formData: FormData): ReadItemFieldsResult {
  const jobIdRaw = formData.get('job_id') as string | null;
  const productIdRaw = formData.get('product_id') as string | null;
  const quantityRaw = formData.get('quantity') as string | null;
  const uom = (formData.get('uom') as string | null)?.trim();
  const unitSizeRaw = (formData.get('unit_size') as string | null)?.trim();

  if (!jobIdRaw || !productIdRaw || !quantityRaw || !uom) {
    return { error: 'Job, product, quantity, and UoM are required.' };
  }

  const jobId = Number(jobIdRaw);
  const productId = Number(productIdRaw);
  const quantity = Number(quantityRaw);
  if (Number.isNaN(jobId) || Number.isNaN(productId) || !Number.isFinite(quantity) || quantity < 0) {
    return { error: 'Invalid job, product, or quantity.' };
  }

  const unitSize = unitSizeRaw ? Number(unitSizeRaw) : null;
  if (unitSize !== null && (!Number.isFinite(unitSize) || unitSize < 0)) {
    return { error: 'Invalid unit size.' };
  }

  return {
    values: {
      job_id: jobId,
      product_id: productId,
      quantity,
      uom,
      unit_size: unitSize,
    },
  };
}

export async function createMaterialHandlingItem(
  _prevState: MaterialHandlingItemFormState,
  formData: FormData,
): Promise<MaterialHandlingItemFormState> {
  if (await isManagerRole()) {
    return { error: 'Managers have read-only access.' };
  }

  const parsed = readItemFields(formData);
  if ('error' in parsed) {
    return { error: parsed.error };
  }

  const supabase = await createClient();
  const { error } = await supabase.from('material_handling_item').insert(parsed.values);

  if (error) {
    return { error: error.message };
  }

  const returnTo = (formData.get('return_to') as string | null)?.trim() || '/material-handling-items';
  revalidatePath('/material-handling-items');
  revalidatePath(returnTo);
  redirect(returnTo);
}

export async function updateMaterialHandlingItem(
  id: number,
  _prevState: MaterialHandlingItemFormState,
  formData: FormData,
): Promise<MaterialHandlingItemFormState> {
  if (await isManagerRole()) {
    return { error: 'Managers have read-only access.' };
  }

  const parsed = readItemFields(formData);
  if ('error' in parsed) {
    return { error: parsed.error };
  }

  const supabase = await createClient();
  const { error } = await supabase.from('material_handling_item').update(parsed.values).eq('id', id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath('/material-handling-items');
  redirect('/material-handling-items');
}

export async function deactivateMaterialHandlingItem(id: number) {
  if (await isManagerRole()) {
    throw new Error('Managers have read-only access.');
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('material_handling_item')
    .update({ active: false })
    .eq('id', id)
    .select('id');

  if (error) {
    throw new Error(error.message);
  }
  if (!data || data.length === 0) {
    throw new Error('Material handling item not found.');
  }

  revalidatePath('/material-handling-items');
  revalidatePath(`/material-handling-items/${id}/edit`);
}

export async function reactivateMaterialHandlingItem(id: number) {
  if (await isManagerRole()) {
    throw new Error('Managers have read-only access.');
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('material_handling_item')
    .update({ active: true })
    .eq('id', id)
    .select('id');

  if (error) {
    throw new Error(error.message);
  }
  if (!data || data.length === 0) {
    throw new Error('Material handling item not found.');
  }

  revalidatePath('/material-handling-items');
  revalidatePath(`/material-handling-items/${id}/edit`);
}
