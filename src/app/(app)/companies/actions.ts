'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { todayLocal } from '@/lib/date';

export type CompanyFormState = {
  error: string | null;
};

export async function createCompany(
  _prevState: CompanyFormState,
  formData: FormData,
): Promise<CompanyFormState> {
  const name = (formData.get('name') as string | null)?.trim();
  if (!name) {
    return { error: 'Name is required.' };
  }

  const internal = formData.get('internal') === 'on';
  const startDate = (formData.get('start_date') as string | null) || null;
  const endDate = (formData.get('end_date') as string | null) || null;

  const supabase = await createClient();
  const { error } = await supabase.from('company').insert({
    name,
    internal,
    start_date: startDate,
    end_date: endDate,
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath('/companies');
  redirect('/companies');
}

export async function updateCompany(
  id: number,
  _prevState: CompanyFormState,
  formData: FormData,
): Promise<CompanyFormState> {
  const name = (formData.get('name') as string | null)?.trim();
  if (!name) {
    return { error: 'Name is required.' };
  }

  const internal = formData.get('internal') === 'on';
  const startDate = (formData.get('start_date') as string | null) || null;
  const endDate = (formData.get('end_date') as string | null) || null;

  const supabase = await createClient();
  const { error } = await supabase
    .from('company')
    .update({ name, internal, start_date: startDate, end_date: endDate })
    .eq('id', id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath('/companies');
  redirect('/companies');
}

export async function deactivateCompany(id: number) {
  const supabase = await createClient();
  const today = todayLocal();
  const { data, error } = await supabase
    .from('company')
    .update({ end_date: today })
    .eq('id', id)
    .select('id');

  if (error) {
    throw new Error(error.message);
  }
  if (!data || data.length === 0) {
    throw new Error('Company not found.');
  }

  revalidatePath('/companies');
  revalidatePath(`/companies/${id}/edit`);
}

export async function reactivateCompany(id: number) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('company')
    .update({ end_date: null })
    .eq('id', id)
    .select('id');

  if (error) {
    throw new Error(error.message);
  }
  if (!data || data.length === 0) {
    throw new Error('Company not found.');
  }

  revalidatePath('/companies');
  revalidatePath(`/companies/${id}/edit`);
}
