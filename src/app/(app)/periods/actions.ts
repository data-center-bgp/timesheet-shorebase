'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

export type PeriodFormState = {
  error: string | null;
};

async function lookupCompanyIdForContract(
  supabase: Awaited<ReturnType<typeof createClient>>,
  contractId: number,
): Promise<number | null> {
  const { data } = await supabase
    .from('contract')
    .select('company_id')
    .eq('id', contractId)
    .maybeSingle();
  return data?.company_id ?? null;
}

export async function createPeriod(
  _prevState: PeriodFormState,
  formData: FormData,
): Promise<PeriodFormState> {
  const contractIdRaw = formData.get('contract_id') as string | null;
  const contractId = contractIdRaw ? Number(contractIdRaw) : NaN;
  if (!contractIdRaw || Number.isNaN(contractId)) {
    return { error: 'Contract is required.' };
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
  const companyId = await lookupCompanyIdForContract(supabase, contractId);

  const { error } = await supabase.from('period').insert({
    contract_id: contractId,
    company_id: companyId,
    name,
    start_date: startDate,
    end_date: endDate,
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath('/periods');
  redirect('/periods');
}

export async function updatePeriod(
  id: number,
  _prevState: PeriodFormState,
  formData: FormData,
): Promise<PeriodFormState> {
  const contractIdRaw = formData.get('contract_id') as string | null;
  const contractId = contractIdRaw ? Number(contractIdRaw) : NaN;
  if (!contractIdRaw || Number.isNaN(contractId)) {
    return { error: 'Contract is required.' };
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
  const companyId = await lookupCompanyIdForContract(supabase, contractId);

  const { error } = await supabase
    .from('period')
    .update({
      contract_id: contractId,
      company_id: companyId,
      name,
      start_date: startDate,
      end_date: endDate,
    })
    .eq('id', id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath('/periods');
  redirect('/periods');
}

export async function lockPeriod(id: number) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('period')
    .update({ locked: true })
    .eq('id', id)
    .select('id');

  if (error) {
    throw new Error(error.message);
  }
  if (!data || data.length === 0) {
    throw new Error('Period not found.');
  }

  revalidatePath('/periods');
  revalidatePath(`/periods/${id}/edit`);
}

export async function unlockPeriod(id: number) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('period')
    .update({ locked: false })
    .eq('id', id)
    .select('id');

  if (error) {
    throw new Error(error.message);
  }
  if (!data || data.length === 0) {
    throw new Error('Period not found.');
  }

  revalidatePath('/periods');
  revalidatePath(`/periods/${id}/edit`);
}
