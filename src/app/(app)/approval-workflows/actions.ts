'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

export type ApprovalWorkflowFormState = {
  error: string | null;
};

type ReadApprovalWorkflowFieldsResult =
  | { error: string }
  | {
      values: {
        type_code: string;
        start_date: string;
        end_date: string;
        timesheet_type_code: string | null;
        contract_id: number | null;
        subcontractor_id: number | null;
        company_id: number | null;
      };
    };

function readApprovalWorkflowFields(formData: FormData): ReadApprovalWorkflowFieldsResult {
  const typeCode = (formData.get('type_code') as string | null)?.trim();
  const startDate = (formData.get('start_date') as string | null) || null;
  const endDate = (formData.get('end_date') as string | null) || null;
  const timesheetTypeCodeRaw = (formData.get('timesheet_type_code') as string | null)?.trim();
  const contractIdRaw = formData.get('contract_id') as string | null;
  const subcontractorIdRaw = formData.get('subcontractor_id') as string | null;
  const companyIdRaw = formData.get('company_id') as string | null;

  if (!typeCode || !startDate || !endDate) {
    return { error: 'Type, start date, and end date are required.' };
  }

  const contractId = contractIdRaw ? Number(contractIdRaw) : null;
  const subcontractorId = subcontractorIdRaw ? Number(subcontractorIdRaw) : null;
  const companyId = companyIdRaw ? Number(companyIdRaw) : null;
  if (
    (contractId !== null && Number.isNaN(contractId)) ||
    (subcontractorId !== null && Number.isNaN(subcontractorId)) ||
    (companyId !== null && Number.isNaN(companyId))
  ) {
    return { error: 'Invalid contract, subcontractor, or company.' };
  }

  return {
    values: {
      type_code: typeCode,
      start_date: startDate,
      end_date: endDate,
      timesheet_type_code: timesheetTypeCodeRaw || null,
      contract_id: contractId,
      subcontractor_id: subcontractorId,
      company_id: companyId,
    },
  };
}

export async function createApprovalWorkflow(
  _prevState: ApprovalWorkflowFormState,
  formData: FormData,
): Promise<ApprovalWorkflowFormState> {
  const parsed = readApprovalWorkflowFields(formData);
  if ('error' in parsed) {
    return { error: parsed.error };
  }

  const supabase = await createClient();
  const { error } = await supabase.from('approval_workflow').insert(parsed.values);

  if (error) {
    return { error: error.message };
  }

  revalidatePath('/approval-workflows');
  redirect('/approval-workflows');
}

export async function updateApprovalWorkflow(
  id: number,
  _prevState: ApprovalWorkflowFormState,
  formData: FormData,
): Promise<ApprovalWorkflowFormState> {
  const parsed = readApprovalWorkflowFields(formData);
  if ('error' in parsed) {
    return { error: parsed.error };
  }

  const supabase = await createClient();
  const { error } = await supabase.from('approval_workflow').update(parsed.values).eq('id', id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath('/approval-workflows');
  redirect('/approval-workflows');
}

export async function deactivateApprovalWorkflow(id: number) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('approval_workflow')
    .update({ active: false })
    .eq('id', id)
    .select('id');

  if (error) {
    throw new Error(error.message);
  }
  if (!data || data.length === 0) {
    throw new Error('Approval workflow not found.');
  }

  revalidatePath('/approval-workflows');
  revalidatePath(`/approval-workflows/${id}/edit`);
}

export async function reactivateApprovalWorkflow(id: number) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('approval_workflow')
    .update({ active: true })
    .eq('id', id)
    .select('id');

  if (error) {
    throw new Error(error.message);
  }
  if (!data || data.length === 0) {
    throw new Error('Approval workflow not found.');
  }

  revalidatePath('/approval-workflows');
  revalidatePath(`/approval-workflows/${id}/edit`);
}
