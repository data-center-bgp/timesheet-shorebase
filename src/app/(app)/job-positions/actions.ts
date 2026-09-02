'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { isManagerRole } from '@/lib/auth/require-master';

export type JobPositionFormState = {
  error: string | null;
};

export async function createJobPosition(
  _prevState: JobPositionFormState,
  formData: FormData,
): Promise<JobPositionFormState> {
  if (await isManagerRole()) {
    return { error: 'Managers have read-only access.' };
  }

  const companyIdRaw = formData.get('company_id') as string | null;
  const companyId = companyIdRaw ? Number(companyIdRaw) : NaN;
  if (!companyIdRaw || Number.isNaN(companyId)) {
    return { error: 'Company is required.' };
  }

  const jobTitleIdRaw = formData.get('job_title_id') as string | null;
  const jobTitleId = jobTitleIdRaw ? Number(jobTitleIdRaw) : NaN;
  if (!jobTitleIdRaw || Number.isNaN(jobTitleId)) {
    return { error: 'Job title is required.' };
  }

  const parentPositionIdRaw = (formData.get('parent_position_id') as string | null)?.trim();
  const parentPositionId = parentPositionIdRaw ? Number(parentPositionIdRaw) : null;
  if (parentPositionIdRaw && Number.isNaN(parentPositionId)) {
    return { error: 'Parent position is invalid.' };
  }

  const name = (formData.get('name') as string | null)?.trim();
  if (!name) {
    return { error: 'Name is required.' };
  }

  const startDate = (formData.get('start_date') as string | null)?.trim();
  if (!startDate) {
    return { error: 'Start date is required.' };
  }

  const endDate = (formData.get('end_date') as string | null)?.trim();
  if (!endDate) {
    return { error: 'End date is required.' };
  }

  const supabase = await createClient();
  const { error } = await supabase.from('job_position').insert({
    company_id: companyId,
    job_title_id: jobTitleId,
    parent_position_id: parentPositionId,
    name,
    start_date: startDate,
    end_date: endDate,
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath('/job-positions');
  redirect('/job-positions');
}

export async function updateJobPosition(
  id: number,
  _prevState: JobPositionFormState,
  formData: FormData,
): Promise<JobPositionFormState> {
  if (await isManagerRole()) {
    return { error: 'Managers have read-only access.' };
  }

  const companyIdRaw = formData.get('company_id') as string | null;
  const companyId = companyIdRaw ? Number(companyIdRaw) : NaN;
  if (!companyIdRaw || Number.isNaN(companyId)) {
    return { error: 'Company is required.' };
  }

  const jobTitleIdRaw = formData.get('job_title_id') as string | null;
  const jobTitleId = jobTitleIdRaw ? Number(jobTitleIdRaw) : NaN;
  if (!jobTitleIdRaw || Number.isNaN(jobTitleId)) {
    return { error: 'Job title is required.' };
  }

  const parentPositionIdRaw = (formData.get('parent_position_id') as string | null)?.trim();
  const parentPositionId = parentPositionIdRaw ? Number(parentPositionIdRaw) : null;
  if (parentPositionIdRaw && Number.isNaN(parentPositionId)) {
    return { error: 'Parent position is invalid.' };
  }
  if (parentPositionId === id) {
    return { error: 'A position cannot be its own parent.' };
  }

  if (parentPositionId !== null) {
    const supabaseForCycleCheck = await createClient();
    let ancestorId: number | null = parentPositionId;
    const visited = new Set<number>();
    while (ancestorId !== null) {
      if (ancestorId === id) {
        return { error: 'That would make this position an ancestor of its own parent (a cycle).' };
      }
      if (visited.has(ancestorId)) break;
      visited.add(ancestorId);
      const { data: ancestor }: { data: { parent_position_id: number | null } | null } = await supabaseForCycleCheck
        .from('job_position')
        .select('parent_position_id')
        .eq('id', ancestorId)
        .maybeSingle();
      const nextAncestorId: number | null = ancestor?.parent_position_id ?? null;
      ancestorId = nextAncestorId;
    }
  }

  const name = (formData.get('name') as string | null)?.trim();
  if (!name) {
    return { error: 'Name is required.' };
  }

  const startDate = (formData.get('start_date') as string | null)?.trim();
  if (!startDate) {
    return { error: 'Start date is required.' };
  }

  const endDate = (formData.get('end_date') as string | null)?.trim();
  if (!endDate) {
    return { error: 'End date is required.' };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from('job_position')
    .update({
      company_id: companyId,
      job_title_id: jobTitleId,
      parent_position_id: parentPositionId,
      name,
      start_date: startDate,
      end_date: endDate,
    })
    .eq('id', id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath('/job-positions');
  redirect('/job-positions');
}

export async function deactivateJobPosition(id: number) {
  if (await isManagerRole()) {
    throw new Error('Managers have read-only access.');
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('job_position')
    .update({ active: false })
    .eq('id', id)
    .select('id');

  if (error) {
    throw new Error(error.message);
  }
  if (!data || data.length === 0) {
    throw new Error('Job position not found.');
  }

  revalidatePath('/job-positions');
  revalidatePath(`/job-positions/${id}/edit`);
}

export async function reactivateJobPosition(id: number) {
  if (await isManagerRole()) {
    throw new Error('Managers have read-only access.');
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('job_position')
    .update({ active: true })
    .eq('id', id)
    .select('id');

  if (error) {
    throw new Error(error.message);
  }
  if (!data || data.length === 0) {
    throw new Error('Job position not found.');
  }

  revalidatePath('/job-positions');
  revalidatePath(`/job-positions/${id}/edit`);
}
