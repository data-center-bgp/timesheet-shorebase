'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

export type MaterialHandlingEquipmentFormState = {
  error: string | null;
};

type EquipmentFieldsResult =
  | { error: string }
  | {
      values: {
        job_id: number;
        equipment_id: number;
      };
    };

function readEquipmentFields(formData: FormData): EquipmentFieldsResult {
  const jobIdRaw = formData.get('job_id') as string | null;
  const equipmentIdRaw = formData.get('equipment_id') as string | null;

  if (!jobIdRaw || !equipmentIdRaw) {
    return { error: 'Job and equipment are required.' };
  }

  const jobId = Number(jobIdRaw);
  const equipmentId = Number(equipmentIdRaw);
  if (Number.isNaN(jobId) || Number.isNaN(equipmentId)) {
    return { error: 'Invalid job or equipment.' };
  }

  return {
    values: {
      job_id: jobId,
      equipment_id: equipmentId,
    },
  };
}

export async function createMaterialHandlingEquipment(
  _prevState: MaterialHandlingEquipmentFormState,
  formData: FormData,
): Promise<MaterialHandlingEquipmentFormState> {
  const parsed = readEquipmentFields(formData);
  if ('error' in parsed) {
    return { error: parsed.error };
  }

  const supabase = await createClient();
  const { error } = await supabase.from('material_handling_equipment').insert(parsed.values);

  if (error) {
    return { error: error.message };
  }

  revalidatePath('/material-handling-equipment');
  redirect('/material-handling-equipment');
}

export async function updateMaterialHandlingEquipment(
  id: number,
  _prevState: MaterialHandlingEquipmentFormState,
  formData: FormData,
): Promise<MaterialHandlingEquipmentFormState> {
  const parsed = readEquipmentFields(formData);
  if ('error' in parsed) {
    return { error: parsed.error };
  }

  const supabase = await createClient();
  const { error } = await supabase.from('material_handling_equipment').update(parsed.values).eq('id', id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath('/material-handling-equipment');
  redirect('/material-handling-equipment');
}

export async function deactivateMaterialHandlingEquipment(id: number) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('material_handling_equipment')
    .update({ active: false })
    .eq('id', id)
    .select('id');

  if (error) {
    throw new Error(error.message);
  }
  if (!data || data.length === 0) {
    throw new Error('Material handling equipment record not found.');
  }

  revalidatePath('/material-handling-equipment');
  revalidatePath(`/material-handling-equipment/${id}/edit`);
}

export async function reactivateMaterialHandlingEquipment(id: number) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('material_handling_equipment')
    .update({ active: true })
    .eq('id', id)
    .select('id');

  if (error) {
    throw new Error(error.message);
  }
  if (!data || data.length === 0) {
    throw new Error('Material handling equipment record not found.');
  }

  revalidatePath('/material-handling-equipment');
  revalidatePath(`/material-handling-equipment/${id}/edit`);
}
