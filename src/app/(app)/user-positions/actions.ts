'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

export type UserPositionFormState = {
  error: string | null;
};

export async function createUserPosition(
  _prevState: UserPositionFormState,
  formData: FormData,
): Promise<UserPositionFormState> {
  const userId = (formData.get('user_id') as string | null)?.trim();
  if (!userId) {
    return { error: 'User is required.' };
  }

  const jobPositionIdRaw = formData.get('job_position_id') as string | null;
  const jobPositionId = jobPositionIdRaw ? Number(jobPositionIdRaw) : NaN;
  if (!jobPositionIdRaw || Number.isNaN(jobPositionId)) {
    return { error: 'Job position is required.' };
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

  const { error } = await supabase.from('user_position').insert({
    user_id: userId,
    job_position_id: jobPositionId,
    start_date: startDate,
    end_date: endDate,
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath('/user-positions');
  redirect('/user-positions');
}
