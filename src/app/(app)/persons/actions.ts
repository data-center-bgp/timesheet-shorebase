'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

export type PersonFormState = {
  error: string | null;
};

export async function createPerson(
  _prevState: PersonFormState,
  formData: FormData,
): Promise<PersonFormState> {
  const name = (formData.get('name') as string | null)?.trim();
  if (!name) {
    return { error: 'Name is required.' };
  }

  const companyIdRaw = formData.get('company_id') as string | null;
  const companyId = companyIdRaw ? Number(companyIdRaw) : NaN;
  if (!companyIdRaw || Number.isNaN(companyId)) {
    return { error: 'Company is required.' };
  }

  const staffTypeCode = (formData.get('staff_type_code') as string | null)?.trim();
  if (!staffTypeCode) {
    return { error: 'Staff type is required.' };
  }

  const endedAt = (formData.get('ended_at') as string | null)?.trim() || null;

  const supabase = await createClient();

  const { error } = await supabase.from('person').insert({
    name,
    company_id: companyId,
    staff_type_code: staffTypeCode,
    ended_at: endedAt,
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath('/persons');
  redirect('/persons');
}
