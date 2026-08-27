'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

export type JobTitleFormState = {
  error: string | null;
};

export async function createJobTitle(
  _prevState: JobTitleFormState,
  formData: FormData,
): Promise<JobTitleFormState> {
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
