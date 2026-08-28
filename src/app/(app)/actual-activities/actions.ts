'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

export type ActualActivityFormState = {
  error: string | null;
};

async function lookupActivitySnapshotFromPlan(
  supabase: Awaited<ReturnType<typeof createClient>>,
  planActivityId: number,
): Promise<{
  code: string | null;
  contractServiceId: number | null;
  timesheetTypeCode: string | null;
  subcontractorId: number | null;
  companyId: number | null;
  serviceId: number | null;
  uomCode: string | null;
  planAmount: number | null;
  planDate: string | null;
}> {
  const { data } = await supabase
    .from('activity')
    .select(
      'code, contract_service_id, timesheet_type_code, subcontractor_id, company_id, service_id, uom_code, plan_amount, plan_date',
    )
    .eq('id', planActivityId)
    .maybeSingle();
  return {
    code: data?.code ?? null,
    contractServiceId: data?.contract_service_id ?? null,
    timesheetTypeCode: data?.timesheet_type_code ?? null,
    subcontractorId: data?.subcontractor_id ?? null,
    companyId: data?.company_id ?? null,
    serviceId: data?.service_id ?? null,
    uomCode: data?.uom_code ?? null,
    planAmount: data?.plan_amount ?? null,
    planDate: data?.plan_date ?? null,
  };
}

export async function createActualActivity(
  _prevState: ActualActivityFormState,
  formData: FormData,
): Promise<ActualActivityFormState> {
  const planActivityIdRaw = formData.get('plan_activity_id') as string | null;
  const planActivityId = planActivityIdRaw ? Number(planActivityIdRaw) : NaN;
  if (!planActivityIdRaw || Number.isNaN(planActivityId)) {
    return { error: 'Plan activity is required.' };
  }

  const actualAmountRaw = (formData.get('actual_amount') as string | null)?.trim();
  const actualAmount = actualAmountRaw ? Number(actualAmountRaw) : NaN;
  if (!actualAmountRaw || !Number.isFinite(actualAmount) || actualAmount < 0) {
    return { error: 'Actual amount is required and must be a non-negative number.' };
  }

  const actualRemark = (formData.get('actual_remark') as string | null)?.trim() || null;
  const actualDescription = (formData.get('actual_description') as string | null)?.trim() || null;

  const supabase = await createClient();
  const snapshot = await lookupActivitySnapshotFromPlan(supabase, planActivityId);

  const { error } = await supabase.from('activity').insert({
    status_code: 'A',
    plan_activity_id: planActivityId,
    code: snapshot.code,
    contract_service_id: snapshot.contractServiceId,
    timesheet_type_code: snapshot.timesheetTypeCode,
    subcontractor_id: snapshot.subcontractorId,
    company_id: snapshot.companyId,
    service_id: snapshot.serviceId,
    uom_code: snapshot.uomCode,
    plan_amount: snapshot.planAmount,
    plan_date: snapshot.planDate,
    actual_amount: actualAmount,
    actual_remark: actualRemark,
    actual_description: actualDescription,
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath('/actual-activities');
  redirect('/actual-activities');
}

export async function updateActualActivity(
  id: number,
  _prevState: ActualActivityFormState,
  formData: FormData,
): Promise<ActualActivityFormState> {
  const planActivityIdRaw = formData.get('plan_activity_id') as string | null;
  const planActivityId = planActivityIdRaw ? Number(planActivityIdRaw) : NaN;
  if (!planActivityIdRaw || Number.isNaN(planActivityId)) {
    return { error: 'Plan activity is required.' };
  }

  const actualAmountRaw = (formData.get('actual_amount') as string | null)?.trim();
  const actualAmount = actualAmountRaw ? Number(actualAmountRaw) : NaN;
  if (!actualAmountRaw || !Number.isFinite(actualAmount) || actualAmount < 0) {
    return { error: 'Actual amount is required and must be a non-negative number.' };
  }

  const actualRemark = (formData.get('actual_remark') as string | null)?.trim() || null;
  const actualDescription = (formData.get('actual_description') as string | null)?.trim() || null;

  const supabase = await createClient();
  const snapshot = await lookupActivitySnapshotFromPlan(supabase, planActivityId);

  const { error } = await supabase
    .from('activity')
    .update({
      plan_activity_id: planActivityId,
      code: snapshot.code,
      contract_service_id: snapshot.contractServiceId,
      timesheet_type_code: snapshot.timesheetTypeCode,
      subcontractor_id: snapshot.subcontractorId,
      company_id: snapshot.companyId,
      service_id: snapshot.serviceId,
      uom_code: snapshot.uomCode,
      plan_amount: snapshot.planAmount,
      plan_date: snapshot.planDate,
      actual_amount: actualAmount,
      actual_remark: actualRemark,
      actual_description: actualDescription,
    })
    .eq('id', id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath('/actual-activities');
  redirect('/actual-activities');
}

export async function deactivateActualActivity(id: number) {
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
    throw new Error('Actual activity not found.');
  }

  revalidatePath('/actual-activities');
  revalidatePath(`/actual-activities/${id}/edit`);
}

export async function reactivateActualActivity(id: number) {
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
    throw new Error('Actual activity not found.');
  }

  revalidatePath('/actual-activities');
  revalidatePath(`/actual-activities/${id}/edit`);
}
