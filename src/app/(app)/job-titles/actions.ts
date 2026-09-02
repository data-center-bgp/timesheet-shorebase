'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { isManagerRole } from '@/lib/auth/require-master';

export type JobTitleFormState = {
  error: string | null;
};

export async function createJobTitle(
  _prevState: JobTitleFormState,
  formData: FormData,
): Promise<JobTitleFormState> {
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

  const startDate = (formData.get('start_date') as string | null)?.trim();
  if (!startDate) {
    return { error: 'Start date is required.' };
  }

  const endDate = (formData.get('end_date') as string | null)?.trim();
  if (!endDate) {
    return { error: 'End date is required.' };
  }

  const supabase = await createClient();
  const { error } = await supabase.from('job_title').insert({
    code,
    name,
    start_date: startDate,
    end_date: endDate,
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath('/job-titles');
  redirect('/job-titles');
}

export async function updateJobTitle(
  id: number,
  _prevState: JobTitleFormState,
  formData: FormData,
): Promise<JobTitleFormState> {
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
    .from('job_title')
    .update({ code, name, start_date: startDate, end_date: endDate })
    .eq('id', id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath('/job-titles');
  redirect('/job-titles');
}

export async function deactivateJobTitle(id: number) {
  if (await isManagerRole()) {
    throw new Error('Managers have read-only access.');
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('job_title')
    .update({ active: false })
    .eq('id', id)
    .select('id');

  if (error) {
    throw new Error(error.message);
  }
  if (!data || data.length === 0) {
    throw new Error('Job title not found.');
  }

  revalidatePath('/job-titles');
  revalidatePath(`/job-titles/${id}/edit`);
}

export async function reactivateJobTitle(id: number) {
  if (await isManagerRole()) {
    throw new Error('Managers have read-only access.');
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('job_title')
    .update({ active: true })
    .eq('id', id)
    .select('id');

  if (error) {
    throw new Error(error.message);
  }
  if (!data || data.length === 0) {
    throw new Error('Job title not found.');
  }

  revalidatePath('/job-titles');
  revalidatePath(`/job-titles/${id}/edit`);
}
