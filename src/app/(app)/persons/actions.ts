'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { isManagerRole } from '@/lib/auth/require-master';

export type PersonFormState = {
  error: string | null;
};

export async function createPerson(
  _prevState: PersonFormState,
  formData: FormData,
): Promise<PersonFormState> {
  if (await isManagerRole()) {
    return { error: 'Managers have read-only access.' };
  }

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

export async function updatePerson(
  id: number,
  _prevState: PersonFormState,
  formData: FormData,
): Promise<PersonFormState> {
  if (await isManagerRole()) {
    return { error: 'Managers have read-only access.' };
  }

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

  const { error } = await supabase
    .from('person')
    .update({
      name,
      company_id: companyId,
      staff_type_code: staffTypeCode,
      ended_at: endedAt,
    })
    .eq('id', id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath('/persons');
  redirect('/persons');
}

export async function deactivatePerson(id: number) {
  if (await isManagerRole()) {
    throw new Error('Managers have read-only access.');
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('person')
    .update({ is_active: false })
    .eq('id', id)
    .select('id');

  if (error) {
    throw new Error(error.message);
  }
  if (!data || data.length === 0) {
    throw new Error('Person not found.');
  }

  revalidatePath('/persons');
  revalidatePath(`/persons/${id}/edit`);
}

export async function reactivatePerson(id: number) {
  if (await isManagerRole()) {
    throw new Error('Managers have read-only access.');
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('person')
    .update({ is_active: true })
    .eq('id', id)
    .select('id');

  if (error) {
    throw new Error(error.message);
  }
  if (!data || data.length === 0) {
    throw new Error('Person not found.');
  }

  revalidatePath('/persons');
  revalidatePath(`/persons/${id}/edit`);
}
