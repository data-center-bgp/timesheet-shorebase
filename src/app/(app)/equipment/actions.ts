'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { isManagerRole } from '@/lib/auth/require-master';

export type EquipmentFormState = {
  error: string | null;
};

export async function createEquipment(
  _prevState: EquipmentFormState,
  formData: FormData,
): Promise<EquipmentFormState> {
  if (await isManagerRole()) {
    return { error: 'Managers have read-only access.' };
  }

  const code = (formData.get('code') as string | null)?.trim();
  if (!code) {
    return { error: 'Code is required.' };
  }

  const name = (formData.get('name') as string | null)?.trim();
  if (!name) {
    return { error: 'Name is required.' };
  }

  const supabase = await createClient();
  const { error } = await supabase.from('equipment').insert({ code, name });

  if (error) {
    return { error: error.message };
  }

  revalidatePath('/equipment');
  redirect('/equipment');
}

export async function updateEquipment(
  id: number,
  _prevState: EquipmentFormState,
  formData: FormData,
): Promise<EquipmentFormState> {
  if (await isManagerRole()) {
    return { error: 'Managers have read-only access.' };
  }

  const code = (formData.get('code') as string | null)?.trim();
  if (!code) {
    return { error: 'Code is required.' };
  }

  const name = (formData.get('name') as string | null)?.trim();
  if (!name) {
    return { error: 'Name is required.' };
  }

  const supabase = await createClient();
  const { error } = await supabase.from('equipment').update({ code, name }).eq('id', id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath('/equipment');
  redirect('/equipment');
}

export async function deactivateEquipment(id: number) {
  if (await isManagerRole()) {
    throw new Error('Managers have read-only access.');
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('equipment')
    .update({ active: false })
    .eq('id', id)
    .select('id');

  if (error) {
    throw new Error(error.message);
  }
  if (!data || data.length === 0) {
    throw new Error('Equipment not found.');
  }

  revalidatePath('/equipment');
  revalidatePath(`/equipment/${id}/edit`);
}

export async function reactivateEquipment(id: number) {
  if (await isManagerRole()) {
    throw new Error('Managers have read-only access.');
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('equipment')
    .update({ active: true })
    .eq('id', id)
    .select('id');

  if (error) {
    throw new Error(error.message);
  }
  if (!data || data.length === 0) {
    throw new Error('Equipment not found.');
  }

  revalidatePath('/equipment');
  revalidatePath(`/equipment/${id}/edit`);
}
