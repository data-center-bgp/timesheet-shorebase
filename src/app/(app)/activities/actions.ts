'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { isManagerRole } from '@/lib/auth/require-master';

export type PlanActivityFormState = {
  error: string | null;
};

async function lookupCompanyServiceUomForContractService(
  supabase: Awaited<ReturnType<typeof createClient>>,
  contractServiceId: number,
): Promise<{ companyId: number | null; serviceId: number | null; uomCode: string | null }> {
  const { data } = await supabase
    .from('contract_service')
    .select('company_id, service_id, uom_code')
    .eq('id', contractServiceId)
    .maybeSingle();
  return {
    companyId: data?.company_id ?? null,
    serviceId: data?.service_id ?? null,
    uomCode: data?.uom_code ?? null,
  };
}

export async function createPlanActivity(
  _prevState: PlanActivityFormState,
  formData: FormData,
): Promise<PlanActivityFormState> {
  if (await isManagerRole()) {
    return { error: 'Managers have read-only access.' };
  }

  const code = (formData.get('code') as string | null)?.trim();
  if (!code) {
    return { error: 'Code is required.' };
  }

  const contractServiceIdRaw = formData.get('contract_service_id') as string | null;
  const contractServiceId = contractServiceIdRaw ? Number(contractServiceIdRaw) : NaN;
  if (!contractServiceIdRaw || Number.isNaN(contractServiceId)) {
    return { error: 'Contract service is required.' };
  }

  const timesheetTypeCode = (formData.get('timesheet_type_code') as string | null)?.trim();
  if (!timesheetTypeCode) {
    return { error: 'Timesheet type is required.' };
  }

  const subcontractorIdRaw = (formData.get('subcontractor_id') as string | null)?.trim();
  const subcontractorId = subcontractorIdRaw ? Number(subcontractorIdRaw) : null;
  if (subcontractorIdRaw && Number.isNaN(subcontractorId)) {
    return { error: 'Subcontractor is invalid.' };
  }

  const planAmountRaw = (formData.get('plan_amount') as string | null)?.trim();
  const planAmount = planAmountRaw ? Number(planAmountRaw) : NaN;
  if (!planAmountRaw || !Number.isFinite(planAmount) || planAmount < 0) {
    return { error: 'Plan amount is required and must be a non-negative number.' };
  }

  const planDate = (formData.get('plan_date') as string | null)?.trim();
  if (!planDate) {
    return { error: 'Plan date is required.' };
  }

  const planRemark = (formData.get('plan_remark') as string | null)?.trim() || null;
  const planDescription = (formData.get('plan_description') as string | null)?.trim() || null;

  const supabase = await createClient();
  const { companyId, serviceId, uomCode } = await lookupCompanyServiceUomForContractService(
    supabase,
    contractServiceId,
  );

  const { error } = await supabase.from('activity').insert({
    code,
    status_code: 'P',
    contract_service_id: contractServiceId,
    timesheet_type_code: timesheetTypeCode,
    subcontractor_id: subcontractorId,
    company_id: companyId,
    service_id: serviceId,
    uom_code: uomCode,
    plan_amount: planAmount,
    plan_date: planDate,
    plan_remark: planRemark,
    plan_description: planDescription,
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath('/activities');
  redirect('/activities');
}

export async function updatePlanActivity(
  id: number,
  _prevState: PlanActivityFormState,
  formData: FormData,
): Promise<PlanActivityFormState> {
  if (await isManagerRole()) {
    return { error: 'Managers have read-only access.' };
  }

  const code = (formData.get('code') as string | null)?.trim();
  if (!code) {
    return { error: 'Code is required.' };
  }

  const contractServiceIdRaw = formData.get('contract_service_id') as string | null;
  const contractServiceId = contractServiceIdRaw ? Number(contractServiceIdRaw) : NaN;
  if (!contractServiceIdRaw || Number.isNaN(contractServiceId)) {
    return { error: 'Contract service is required.' };
  }

  const timesheetTypeCode = (formData.get('timesheet_type_code') as string | null)?.trim();
  if (!timesheetTypeCode) {
    return { error: 'Timesheet type is required.' };
  }

  const subcontractorIdRaw = (formData.get('subcontractor_id') as string | null)?.trim();
  const subcontractorId = subcontractorIdRaw ? Number(subcontractorIdRaw) : null;
  if (subcontractorIdRaw && Number.isNaN(subcontractorId)) {
    return { error: 'Subcontractor is invalid.' };
  }

  const planAmountRaw = (formData.get('plan_amount') as string | null)?.trim();
  const planAmount = planAmountRaw ? Number(planAmountRaw) : NaN;
  if (!planAmountRaw || !Number.isFinite(planAmount) || planAmount < 0) {
    return { error: 'Plan amount is required and must be a non-negative number.' };
  }

  const planDate = (formData.get('plan_date') as string | null)?.trim();
  if (!planDate) {
    return { error: 'Plan date is required.' };
  }

  const planRemark = (formData.get('plan_remark') as string | null)?.trim() || null;
  const planDescription = (formData.get('plan_description') as string | null)?.trim() || null;

  const supabase = await createClient();
  const { companyId, serviceId, uomCode } = await lookupCompanyServiceUomForContractService(
    supabase,
    contractServiceId,
  );

  const { error } = await supabase
    .from('activity')
    .update({
      code,
      contract_service_id: contractServiceId,
      timesheet_type_code: timesheetTypeCode,
      subcontractor_id: subcontractorId,
      company_id: companyId,
      service_id: serviceId,
      uom_code: uomCode,
      plan_amount: planAmount,
      plan_date: planDate,
      plan_remark: planRemark,
      plan_description: planDescription,
    })
    .eq('id', id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath('/activities');
  redirect('/activities');
}

export async function deactivateActivity(id: number) {
  if (await isManagerRole()) {
    throw new Error('Managers have read-only access.');
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('activity')
    .update({ active: false })
    .eq('id', id)
    .select('id');

  if (error) {
    throw new Error(error.message);
  }
  if (!data || data.length === 0) {
    throw new Error('Activity not found.');
  }

  revalidatePath('/activities');
  revalidatePath(`/activities/${id}/edit`);
}

export async function reactivateActivity(id: number) {
  if (await isManagerRole()) {
    throw new Error('Managers have read-only access.');
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('activity')
    .update({ active: true })
    .eq('id', id)
    .select('id');

  if (error) {
    throw new Error(error.message);
  }
  if (!data || data.length === 0) {
    throw new Error('Activity not found.');
  }

  revalidatePath('/activities');
  revalidatePath(`/activities/${id}/edit`);
}
