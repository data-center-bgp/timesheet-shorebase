'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { isManagerRole } from '@/lib/auth/require-master';

export type SummaryTimesheetFormState = {
  error: string | null;
};

type ReadSummaryTimesheetFieldsResult =
  | { error: string }
  | {
      values: {
        period_id: number;
        type_code: string;
        contract_id: number;
        company_id: number;
        code: string;
        issue_date: string;
      };
    };

function readSummaryTimesheetFields(formData: FormData): ReadSummaryTimesheetFieldsResult {
  const periodIdRaw = formData.get('period_id') as string | null;
  const typeCode = (formData.get('type_code') as string | null)?.trim();
  const contractIdRaw = formData.get('contract_id') as string | null;
  const companyIdRaw = formData.get('company_id') as string | null;
  const code = (formData.get('code') as string | null)?.trim();
  const issueDate = (formData.get('issue_date') as string | null) || null;

  if (!periodIdRaw || !typeCode || !contractIdRaw || !companyIdRaw || !code || !issueDate) {
    return { error: 'Period, timesheet type, contract, company, code, and issue date are all required.' };
  }

  const periodId = Number(periodIdRaw);
  const contractId = Number(contractIdRaw);
  const companyId = Number(companyIdRaw);
  if (Number.isNaN(periodId) || Number.isNaN(contractId) || Number.isNaN(companyId)) {
    return { error: 'Invalid period, contract, or company.' };
  }

  return {
    values: {
      period_id: periodId,
      type_code: typeCode,
      contract_id: contractId,
      company_id: companyId,
      code,
      issue_date: issueDate,
    },
  };
}

export async function createSummaryTimesheet(
  _prevState: SummaryTimesheetFormState,
  formData: FormData,
): Promise<SummaryTimesheetFormState> {
  if (await isManagerRole()) {
    return { error: 'Managers have read-only access.' };
  }

  const parsed = readSummaryTimesheetFields(formData);
  if ('error' in parsed) {
    return { error: parsed.error };
  }

  const supabase = await createClient();
  const { error } = await supabase.from('summary_timesheet').insert(parsed.values);

  if (error) {
    return { error: error.message };
  }

  revalidatePath('/summary-timesheets');
  redirect('/summary-timesheets');
}

export async function updateSummaryTimesheet(
  id: number,
  _prevState: SummaryTimesheetFormState,
  formData: FormData,
): Promise<SummaryTimesheetFormState> {
  if (await isManagerRole()) {
    return { error: 'Managers have read-only access.' };
  }

  const parsed = readSummaryTimesheetFields(formData);
  if ('error' in parsed) {
    return { error: parsed.error };
  }

  const supabase = await createClient();
  const { error } = await supabase.from('summary_timesheet').update(parsed.values).eq('id', id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath('/summary-timesheets');
  redirect('/summary-timesheets');
}

export async function deactivateSummaryTimesheet(id: number) {
  if (await isManagerRole()) {
    throw new Error('Managers have read-only access.');
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('summary_timesheet')
    .update({ active: false })
    .eq('id', id)
    .select('id');

  if (error) {
    throw new Error(error.message);
  }
  if (!data || data.length === 0) {
    throw new Error('Summary timesheet not found.');
  }

  revalidatePath('/summary-timesheets');
  revalidatePath(`/summary-timesheets/${id}/edit`);
}

export async function reactivateSummaryTimesheet(id: number) {
  if (await isManagerRole()) {
    throw new Error('Managers have read-only access.');
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('summary_timesheet')
    .update({ active: true })
    .eq('id', id)
    .select('id');

  if (error) {
    throw new Error(error.message);
  }
  if (!data || data.length === 0) {
    throw new Error('Summary timesheet not found.');
  }

  revalidatePath('/summary-timesheets');
  revalidatePath(`/summary-timesheets/${id}/edit`);
}
