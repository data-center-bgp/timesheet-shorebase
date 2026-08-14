'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { todayLocal } from '@/lib/date';

export type ContractFormState = {
  error: string | null;
};

export async function createContract(
  _prevState: ContractFormState,
  formData: FormData,
): Promise<ContractFormState> {
  const contractName = (formData.get('contract_name') as string | null)?.trim();
  if (!contractName) {
    return { error: 'Contract name is required.' };
  }

  const contractNumber = (formData.get('contract_number') as string | null)?.trim();
  if (!contractNumber) {
    return { error: 'Contract number is required.' };
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
  const { error } = await supabase.from('contract').insert({
    contract_name: contractName,
    contract_number: contractNumber,
    company_id: companyId,
    start_date: startDate,
    end_date: endDate,
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath('/contracts');
  redirect('/contracts');
}

export async function updateContract(
  id: number,
  _prevState: ContractFormState,
  formData: FormData,
): Promise<ContractFormState> {
  const contractName = (formData.get('contract_name') as string | null)?.trim();
  if (!contractName) {
    return { error: 'Contract name is required.' };
  }

  const contractNumber = (formData.get('contract_number') as string | null)?.trim();
  if (!contractNumber) {
    return { error: 'Contract number is required.' };
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
    .from('contract')
    .update({
      contract_name: contractName,
      contract_number: contractNumber,
      company_id: companyId,
      start_date: startDate,
      end_date: endDate,
    })
    .eq('id', id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath('/contracts');
  redirect('/contracts');
}

export async function deactivateContract(id: number) {
  const supabase = await createClient();
  const today = todayLocal();
  const { data, error } = await supabase
    .from('contract')
    .update({ end_date: today })
    .eq('id', id)
    .select('id');

  if (error) {
    throw new Error(error.message);
  }
  if (!data || data.length === 0) {
    throw new Error('Contract not found.');
  }

  revalidatePath('/contracts');
  revalidatePath(`/contracts/${id}/edit`);
}

export async function reactivateContract(id: number) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('contract')
    .update({ end_date: null })
    .eq('id', id)
    .select('id');

  if (error) {
    throw new Error(error.message);
  }
  if (!data || data.length === 0) {
    throw new Error('Contract not found.');
  }

  revalidatePath('/contracts');
  revalidatePath(`/contracts/${id}/edit`);
}
