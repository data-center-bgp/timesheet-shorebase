'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { isManagerRole } from '@/lib/auth/require-master';

export type SubcontractorFormState = {
  error: string | null;
};

export async function createSubcontractor(
  _prevState: SubcontractorFormState,
  formData: FormData,
): Promise<SubcontractorFormState> {
  if (await isManagerRole()) {
    return { error: 'Managers have read-only access.' };
  }

  const contractIdRaw = formData.get('contract_id') as string | null;
  const contractId = contractIdRaw ? Number(contractIdRaw) : NaN;
  if (!contractIdRaw || Number.isNaN(contractId)) {
    return { error: 'Contract is required.' };
  }

  const companyIdRaw = formData.get('company_id') as string | null;
  const companyId = companyIdRaw ? Number(companyIdRaw) : NaN;
  if (!companyIdRaw || Number.isNaN(companyId)) {
    return { error: 'Company is required.' };
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

  const { error } = await supabase.from('subcontractors').insert({
    contract_id: contractId,
    company_id: companyId,
    start_date: startDate,
    end_date: endDate,
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath('/subcontractors');
  redirect('/subcontractors');
}

export async function updateSubcontractor(
  id: number,
  _prevState: SubcontractorFormState,
  formData: FormData,
): Promise<SubcontractorFormState> {
  if (await isManagerRole()) {
    return { error: 'Managers have read-only access.' };
  }

  const contractIdRaw = formData.get('contract_id') as string | null;
  const contractId = contractIdRaw ? Number(contractIdRaw) : NaN;
  if (!contractIdRaw || Number.isNaN(contractId)) {
    return { error: 'Contract is required.' };
  }

  const companyIdRaw = formData.get('company_id') as string | null;
  const companyId = companyIdRaw ? Number(companyIdRaw) : NaN;
  if (!companyIdRaw || Number.isNaN(companyId)) {
    return { error: 'Company is required.' };
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
    .from('subcontractors')
    .update({
      contract_id: contractId,
      company_id: companyId,
      start_date: startDate,
      end_date: endDate,
    })
    .eq('id', id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath('/subcontractors');
  redirect('/subcontractors');
}

export async function deactivateSubcontractor(id: number) {
  if (await isManagerRole()) {
    throw new Error('Managers have read-only access.');
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('subcontractors')
    .update({ active: false })
    .eq('id', id)
    .select('id');

  if (error) {
    throw new Error(error.message);
  }
  if (!data || data.length === 0) {
    throw new Error('Subcontractor not found.');
  }

  revalidatePath('/subcontractors');
  revalidatePath(`/subcontractors/${id}/edit`);
}

export async function reactivateSubcontractor(id: number) {
  if (await isManagerRole()) {
    throw new Error('Managers have read-only access.');
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('subcontractors')
    .update({ active: true })
    .eq('id', id)
    .select('id');

  if (error) {
    throw new Error(error.message);
  }
  if (!data || data.length === 0) {
    throw new Error('Subcontractor not found.');
  }

  revalidatePath('/subcontractors');
  revalidatePath(`/subcontractors/${id}/edit`);
}
