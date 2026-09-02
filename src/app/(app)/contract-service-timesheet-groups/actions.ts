'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { isManagerRole } from '@/lib/auth/require-master';

export type ContractServiceTimesheetGroupFormState = {
  error: string | null;
};

export async function createContractServiceTimesheetGroup(
  _prevState: ContractServiceTimesheetGroupFormState,
  formData: FormData,
): Promise<ContractServiceTimesheetGroupFormState> {
  if (await isManagerRole()) {
    return { error: 'Managers have read-only access.' };
  }

  const name = (formData.get('name') as string | null)?.trim();
  if (!name) {
    return { error: 'Name is required.' };
  }

  const supabase = await createClient();
  const { error } = await supabase.from('contract_service_timesheet_group').insert({ name });

  if (error) {
    return { error: error.message };
  }

  revalidatePath('/contract-service-timesheet-groups');
  redirect('/contract-service-timesheet-groups');
}

export async function updateContractServiceTimesheetGroup(
  id: number,
  _prevState: ContractServiceTimesheetGroupFormState,
  formData: FormData,
): Promise<ContractServiceTimesheetGroupFormState> {
  if (await isManagerRole()) {
    return { error: 'Managers have read-only access.' };
  }

  const name = (formData.get('name') as string | null)?.trim();
  if (!name) {
    return { error: 'Name is required.' };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from('contract_service_timesheet_group')
    .update({ name })
    .eq('id', id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath('/contract-service-timesheet-groups');
  redirect('/contract-service-timesheet-groups');
}

export async function deactivateContractServiceTimesheetGroup(id: number) {
  if (await isManagerRole()) {
    throw new Error('Managers have read-only access.');
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('contract_service_timesheet_group')
    .update({ active: false })
    .eq('id', id)
    .select('id');

  if (error) {
    throw new Error(error.message);
  }
  if (!data || data.length === 0) {
    throw new Error('Contract service group not found.');
  }

  revalidatePath('/contract-service-timesheet-groups');
  revalidatePath(`/contract-service-timesheet-groups/${id}/edit`);
}

export async function reactivateContractServiceTimesheetGroup(id: number) {
  if (await isManagerRole()) {
    throw new Error('Managers have read-only access.');
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('contract_service_timesheet_group')
    .update({ active: true })
    .eq('id', id)
    .select('id');

  if (error) {
    throw new Error(error.message);
  }
  if (!data || data.length === 0) {
    throw new Error('Contract service group not found.');
  }

  revalidatePath('/contract-service-timesheet-groups');
  revalidatePath(`/contract-service-timesheet-groups/${id}/edit`);
}
