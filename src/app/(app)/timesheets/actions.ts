'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

export type TimesheetFormState = {
  error: string | null;
};

type ReadTimesheetFieldsResult =
  | { error: string }
  | {
      values: {
        period_id: number;
        type_code: string;
        contract_service_id: number;
        timesheet_date: string;
        code: string;
        code_serial_number: number | null;
        total_amount: number;
        subcontractor_id: number | null;
        jetty_ship_id: number | null;
        mh_job_id: number | null;
      };
    };

function readTimesheetFields(formData: FormData): ReadTimesheetFieldsResult {
  const periodIdRaw = formData.get('period_id') as string | null;
  const typeCode = (formData.get('type_code') as string | null)?.trim();
  const contractServiceIdRaw = formData.get('contract_service_id') as string | null;
  const timesheetDate = (formData.get('timesheet_date') as string | null) || null;
  const code = (formData.get('code') as string | null)?.trim();
  const totalAmountRaw = formData.get('total_amount') as string | null;
  const codeSerialNumberRaw = (formData.get('code_serial_number') as string | null)?.trim();
  const subcontractorIdRaw = formData.get('subcontractor_id') as string | null;
  const jettyShipIdRaw = formData.get('jetty_ship_id') as string | null;
  const mhJobIdRaw = formData.get('mh_job_id') as string | null;

  if (!periodIdRaw || !typeCode || !contractServiceIdRaw || !timesheetDate || !code || !totalAmountRaw) {
    return {
      error: 'Period, timesheet type, contract service, timesheet date, code, and total amount are required.',
    };
  }

  const periodId = Number(periodIdRaw);
  const contractServiceId = Number(contractServiceIdRaw);
  const totalAmount = Number(totalAmountRaw);
  if (Number.isNaN(periodId) || Number.isNaN(contractServiceId) || !Number.isFinite(totalAmount) || totalAmount < 0) {
    return { error: 'Invalid period, contract service, or total amount.' };
  }

  const codeSerialNumber = codeSerialNumberRaw ? Number(codeSerialNumberRaw) : null;
  if (codeSerialNumber !== null && (!Number.isFinite(codeSerialNumber) || codeSerialNumber < 0)) {
    return { error: 'Invalid code serial number.' };
  }

  const subcontractorId = subcontractorIdRaw ? Number(subcontractorIdRaw) : null;
  const jettyShipId = jettyShipIdRaw ? Number(jettyShipIdRaw) : null;
  const mhJobId = mhJobIdRaw ? Number(mhJobIdRaw) : null;
  if (
    (subcontractorId !== null && Number.isNaN(subcontractorId)) ||
    (jettyShipId !== null && Number.isNaN(jettyShipId)) ||
    (mhJobId !== null && Number.isNaN(mhJobId))
  ) {
    return { error: 'Invalid subcontractor, jetty/ship, or material handling job.' };
  }

  return {
    values: {
      period_id: periodId,
      type_code: typeCode,
      contract_service_id: contractServiceId,
      timesheet_date: timesheetDate,
      code,
      code_serial_number: codeSerialNumber,
      total_amount: totalAmount,
      subcontractor_id: subcontractorId,
      jetty_ship_id: jettyShipId,
      mh_job_id: mhJobId,
    },
  };
}

async function lookupCompanyServiceUomForTimesheet(
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

export async function createTimesheet(
  _prevState: TimesheetFormState,
  formData: FormData,
): Promise<TimesheetFormState> {
  const parsed = readTimesheetFields(formData);
  if ('error' in parsed) {
    return { error: parsed.error };
  }

  const supabase = await createClient();
  const { companyId, serviceId, uomCode } = await lookupCompanyServiceUomForTimesheet(
    supabase,
    parsed.values.contract_service_id,
  );

  const { error } = await supabase.from('timesheet').insert({
    ...parsed.values,
    company_id: companyId,
    service_id: serviceId,
    uom_code: uomCode,
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath('/timesheets');
  redirect('/timesheets');
}

export async function updateTimesheet(
  id: number,
  _prevState: TimesheetFormState,
  formData: FormData,
): Promise<TimesheetFormState> {
  const parsed = readTimesheetFields(formData);
  if ('error' in parsed) {
    return { error: parsed.error };
  }

  const supabase = await createClient();
  const { companyId, serviceId, uomCode } = await lookupCompanyServiceUomForTimesheet(
    supabase,
    parsed.values.contract_service_id,
  );

  const { error } = await supabase
    .from('timesheet')
    .update({
      ...parsed.values,
      company_id: companyId,
      service_id: serviceId,
      uom_code: uomCode,
    })
    .eq('id', id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath('/timesheets');
  redirect('/timesheets');
}

export async function deactivateTimesheet(id: number) {
  const supabase = await createClient();
  const { data, error } = await supabase.from('timesheet').update({ active: false }).eq('id', id).select('id');

  if (error) {
    throw new Error(error.message);
  }
  if (!data || data.length === 0) {
    throw new Error('Timesheet not found.');
  }

  revalidatePath('/timesheets');
  revalidatePath(`/timesheets/${id}/edit`);
}

export async function reactivateTimesheet(id: number) {
  const supabase = await createClient();
  const { data, error } = await supabase.from('timesheet').update({ active: true }).eq('id', id).select('id');

  if (error) {
    throw new Error(error.message);
  }
  if (!data || data.length === 0) {
    throw new Error('Timesheet not found.');
  }

  revalidatePath('/timesheets');
  revalidatePath(`/timesheets/${id}/edit`);
}
