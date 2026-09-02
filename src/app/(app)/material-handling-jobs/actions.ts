'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { isManagerRole } from '@/lib/auth/require-master';

export type MaterialHandlingJobFormState = {
  error: string | null;
};

type JobFieldsResult =
  | { error: string }
  | {
      values: {
        contract_service_id: number;
        sub_contractor_id: number;
        name: string;
        job_date: string;
        job_start: string | null;
        job_finish: string | null;
      };
    };

function readJobFields(formData: FormData): JobFieldsResult {
  const contractServiceIdRaw = formData.get('contract_service_id') as string | null;
  const subContractorIdRaw = formData.get('sub_contractor_id') as string | null;
  const name = (formData.get('name') as string | null)?.trim();
  const jobDate = (formData.get('job_date') as string | null) || null;
  const jobStart = (formData.get('job_start') as string | null) || null;
  const jobFinish = (formData.get('job_finish') as string | null) || null;

  if (!contractServiceIdRaw || !subContractorIdRaw || !name || !jobDate) {
    return { error: 'Contract service, subcontractor, name, and job date are required.' };
  }

  const contractServiceId = Number(contractServiceIdRaw);
  const subContractorId = Number(subContractorIdRaw);
  if (Number.isNaN(contractServiceId) || Number.isNaN(subContractorId)) {
    return { error: 'Invalid contract service or subcontractor.' };
  }

  return {
    values: {
      contract_service_id: contractServiceId,
      sub_contractor_id: subContractorId,
      name,
      job_date: jobDate,
      job_start: jobStart,
      job_finish: jobFinish,
    },
  };
}

export async function createMaterialHandlingJob(
  _prevState: MaterialHandlingJobFormState,
  formData: FormData,
): Promise<MaterialHandlingJobFormState> {
  if (await isManagerRole()) {
    return { error: 'Managers have read-only access.' };
  }

  const parsed = readJobFields(formData);
  if ('error' in parsed) {
    return { error: parsed.error };
  }

  const supabase = await createClient();
  const { error } = await supabase.from('material_handling_job').insert(parsed.values);

  if (error) {
    return { error: error.message };
  }

  revalidatePath('/material-handling-jobs');
  redirect('/material-handling-jobs');
}

export async function updateMaterialHandlingJob(
  id: number,
  _prevState: MaterialHandlingJobFormState,
  formData: FormData,
): Promise<MaterialHandlingJobFormState> {
  if (await isManagerRole()) {
    return { error: 'Managers have read-only access.' };
  }

  const parsed = readJobFields(formData);
  if ('error' in parsed) {
    return { error: parsed.error };
  }

  const supabase = await createClient();
  const { error } = await supabase.from('material_handling_job').update(parsed.values).eq('id', id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath('/material-handling-jobs');
  redirect('/material-handling-jobs');
}

export async function deactivateMaterialHandlingJob(id: number) {
  if (await isManagerRole()) {
    throw new Error('Managers have read-only access.');
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('material_handling_job')
    .update({ active: false })
    .eq('id', id)
    .select('id');

  if (error) {
    throw new Error(error.message);
  }
  if (!data || data.length === 0) {
    throw new Error('Material handling job not found.');
  }

  revalidatePath('/material-handling-jobs');
  revalidatePath(`/material-handling-jobs/${id}/edit`);
}

export async function reactivateMaterialHandlingJob(id: number) {
  if (await isManagerRole()) {
    throw new Error('Managers have read-only access.');
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('material_handling_job')
    .update({ active: true })
    .eq('id', id)
    .select('id');

  if (error) {
    throw new Error(error.message);
  }
  if (!data || data.length === 0) {
    throw new Error('Material handling job not found.');
  }

  revalidatePath('/material-handling-jobs');
  revalidatePath(`/material-handling-jobs/${id}/edit`);
}
