'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

export type ContractServiceFormState = {
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

export async function createContractService(
  _prevState: ContractServiceFormState,
  formData: FormData,
): Promise<ContractServiceFormState> {
  const code = (formData.get('code') as string | null)?.trim();
  if (!code) {
    return { error: 'Code is required.' };
  }

  const contractIdRaw = formData.get('contract_id') as string | null;
  const contractId = contractIdRaw ? Number(contractIdRaw) : NaN;
  if (!contractIdRaw || Number.isNaN(contractId)) {
    return { error: 'Contract is required.' };
  }

  const serviceIdRaw = formData.get('service_id') as string | null;
  const serviceId = serviceIdRaw ? Number(serviceIdRaw) : NaN;
  if (!serviceIdRaw || Number.isNaN(serviceId)) {
    return { error: 'Service is required.' };
  }

  const uomCode = (formData.get('uom_code') as string | null)?.trim();
  if (!uomCode) {
    return { error: 'UoM is required.' };
  }

  const summaryCalculationType = (formData.get('summary_calculation_type') as string | null)?.trim();
  if (!summaryCalculationType) {
    return { error: 'Summary calculation type is required.' };
  }

  const startDate = (formData.get('start_date') as string | null)?.trim();
  if (!startDate) {
    return { error: 'Start date is required.' };
  }

  const endDate = (formData.get('end_date') as string | null)?.trim();
  if (!endDate) {
    return { error: 'End date is required.' };
  }

  const timesheetSiteCode = (formData.get('timesheet_site_code') as string | null)?.trim() || null;

  const timesheetGroupIdRaw = formData.get('timesheet_group_id') as string | null;
  const timesheetGroupId = timesheetGroupIdRaw ? Number(timesheetGroupIdRaw) : null;
  if (timesheetGroupId !== null && Number.isNaN(timesheetGroupId)) {
    return { error: 'Invalid timesheet group.' };
  }

  const supabase = await createClient();
  const companyId = await lookupCompanyIdForContract(supabase, contractId);

  const { error } = await supabase.from('contract_service').insert({
    code,
    contract_id: contractId,
    service_id: serviceId,
    company_id: companyId,
    uom_code: uomCode,
    summary_calculation_type: summaryCalculationType,
    start_date: startDate,
    end_date: endDate,
    timesheet_site_code: timesheetSiteCode,
    timesheet_group_id: timesheetGroupId,
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath('/contract-services');
  redirect('/contract-services');
}

export async function updateContractService(
  id: number,
  _prevState: ContractServiceFormState,
  formData: FormData,
): Promise<ContractServiceFormState> {
  const code = (formData.get('code') as string | null)?.trim();
  if (!code) {
    return { error: 'Code is required.' };
  }

  const contractIdRaw = formData.get('contract_id') as string | null;
  const contractId = contractIdRaw ? Number(contractIdRaw) : NaN;
  if (!contractIdRaw || Number.isNaN(contractId)) {
    return { error: 'Contract is required.' };
  }

  const serviceIdRaw = formData.get('service_id') as string | null;
  const serviceId = serviceIdRaw ? Number(serviceIdRaw) : NaN;
  if (!serviceIdRaw || Number.isNaN(serviceId)) {
    return { error: 'Service is required.' };
  }

  const uomCode = (formData.get('uom_code') as string | null)?.trim();
  if (!uomCode) {
    return { error: 'UoM is required.' };
  }

  const summaryCalculationType = (formData.get('summary_calculation_type') as string | null)?.trim();
  if (!summaryCalculationType) {
    return { error: 'Summary calculation type is required.' };
  }

  const startDate = (formData.get('start_date') as string | null)?.trim();
  if (!startDate) {
    return { error: 'Start date is required.' };
  }

  const endDate = (formData.get('end_date') as string | null)?.trim();
  if (!endDate) {
    return { error: 'End date is required.' };
  }

  const timesheetSiteCode = (formData.get('timesheet_site_code') as string | null)?.trim() || null;

  const timesheetGroupIdRaw = formData.get('timesheet_group_id') as string | null;
  const timesheetGroupId = timesheetGroupIdRaw ? Number(timesheetGroupIdRaw) : null;
  if (timesheetGroupId !== null && Number.isNaN(timesheetGroupId)) {
    return { error: 'Invalid timesheet group.' };
  }

  const supabase = await createClient();
  const companyId = await lookupCompanyIdForContract(supabase, contractId);

  const { error } = await supabase
    .from('contract_service')
    .update({
      code,
      contract_id: contractId,
      service_id: serviceId,
      company_id: companyId,
      uom_code: uomCode,
      summary_calculation_type: summaryCalculationType,
      start_date: startDate,
      end_date: endDate,
      timesheet_site_code: timesheetSiteCode,
      timesheet_group_id: timesheetGroupId,
    })
    .eq('id', id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath('/contract-services');
  redirect('/contract-services');
}

export async function deactivateContractService(id: number) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('contract_service')
    .update({ active: false })
    .eq('id', id)
    .select('id');

  if (error) {
    throw new Error(error.message);
  }
  if (!data || data.length === 0) {
    throw new Error('Contract service not found.');
  }

  revalidatePath('/contract-services');
  revalidatePath(`/contract-services/${id}/edit`);
}

export async function reactivateContractService(id: number) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('contract_service')
    .update({ active: true })
    .eq('id', id)
    .select('id');

  if (error) {
    throw new Error(error.message);
  }
  if (!data || data.length === 0) {
    throw new Error('Contract service not found.');
  }

  revalidatePath('/contract-services');
  revalidatePath(`/contract-services/${id}/edit`);
}
