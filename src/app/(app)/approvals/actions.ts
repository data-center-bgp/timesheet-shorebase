'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { isManagerRole } from '@/lib/auth/require-master';
import { APPROVAL_TYPE_NAMES } from './approval-types';

export type ApprovalFormState = {
  error: string | null;
};

const REQUIRED_FIELD: Record<string, 'summary_timesheet_id' | 'proforma_invoice_id' | 'invoice_id' | null> = {
  T: null,
  ST: 'summary_timesheet_id',
  PIN: 'proforma_invoice_id',
  IN: 'invoice_id',
};

const SUBJECT_FIELD_LABELS: Record<'summary_timesheet_id' | 'proforma_invoice_id' | 'invoice_id', string> = {
  summary_timesheet_id: 'Summary Timesheet',
  proforma_invoice_id: 'Proforma Invoice',
  invoice_id: 'Invoice',
};

async function deriveApprovalType(
  supabase: Awaited<ReturnType<typeof createClient>>,
  workflowStageId: number,
): Promise<string | null> {
  const { data } = await supabase
    .from('approval_workflow_stage')
    .select('approval_workflow(type_code)')
    .eq('id', workflowStageId)
    .maybeSingle();
  const workflow = data?.approval_workflow as unknown as { type_code: string } | null;
  return workflow?.type_code ?? null;
}

type ReadApprovalFieldsResult =
  | { error: string }
  | {
      values: {
        workflow_stage_id: number;
        timesheet_id: number;
        status_code: string;
        approver_user_id: string | null;
        approver_user_pos_id: number | null;
        remark: string | null;
        summary_timesheet_id: number | null;
        proforma_invoice_id: number | null;
        invoice_id: number | null;
      };
    };

function readApprovalFields(formData: FormData): ReadApprovalFieldsResult {
  const workflowStageIdRaw = formData.get('workflow_stage_id') as string | null;
  const timesheetIdRaw = formData.get('timesheet_id') as string | null;
  const statusCode = (formData.get('status_code') as string | null)?.trim();
  const approverUserId = (formData.get('approver_user_id') as string | null)?.trim();
  const approverUserPosIdRaw = formData.get('approver_user_pos_id') as string | null;
  const remark = (formData.get('remark') as string | null)?.trim();
  const summaryTimesheetIdRaw = formData.get('summary_timesheet_id') as string | null;
  const proformaInvoiceIdRaw = formData.get('proforma_invoice_id') as string | null;
  const invoiceIdRaw = formData.get('invoice_id') as string | null;

  if (!workflowStageIdRaw || !timesheetIdRaw || !statusCode) {
    return { error: 'Workflow stage, timesheet, and status are required.' };
  }

  const workflowStageId = Number(workflowStageIdRaw);
  const timesheetId = Number(timesheetIdRaw);
  if (Number.isNaN(workflowStageId) || Number.isNaN(timesheetId)) {
    return { error: 'Invalid workflow stage or timesheet.' };
  }

  const approverUserPosId = approverUserPosIdRaw ? Number(approverUserPosIdRaw) : null;
  if (approverUserPosId !== null && Number.isNaN(approverUserPosId)) {
    return { error: 'Invalid approver user position.' };
  }

  const summaryTimesheetId = summaryTimesheetIdRaw ? Number(summaryTimesheetIdRaw) : null;
  if (summaryTimesheetId !== null && Number.isNaN(summaryTimesheetId)) {
    return { error: 'Invalid summary timesheet.' };
  }

  const proformaInvoiceId = proformaInvoiceIdRaw ? Number(proformaInvoiceIdRaw) : null;
  if (proformaInvoiceId !== null && Number.isNaN(proformaInvoiceId)) {
    return { error: 'Invalid proforma invoice.' };
  }

  const invoiceId = invoiceIdRaw ? Number(invoiceIdRaw) : null;
  if (invoiceId !== null && Number.isNaN(invoiceId)) {
    return { error: 'Invalid invoice.' };
  }

  return {
    values: {
      workflow_stage_id: workflowStageId,
      timesheet_id: timesheetId,
      status_code: statusCode,
      approver_user_id: approverUserId || null,
      approver_user_pos_id: approverUserPosId,
      remark: remark || null,
      summary_timesheet_id: summaryTimesheetId,
      proforma_invoice_id: proformaInvoiceId,
      invoice_id: invoiceId,
    },
  };
}

function validateSubjectFields(
  derivedType: string,
  values: { summary_timesheet_id: number | null; proforma_invoice_id: number | null; invoice_id: number | null },
): string | null {
  const requiredField = REQUIRED_FIELD[derivedType];
  const allFields = ['summary_timesheet_id', 'proforma_invoice_id', 'invoice_id'] as const;
  const otherFields = allFields.filter((field) => field !== requiredField);

  if (requiredField && !values[requiredField]) {
    return `This workflow stage is for ${APPROVAL_TYPE_NAMES[derivedType]} approvals — select a ${SUBJECT_FIELD_LABELS[requiredField]}.`;
  }

  for (const field of otherFields) {
    if (values[field] !== null) {
      const label = requiredField ? SUBJECT_FIELD_LABELS[requiredField] : null;
      return label
        ? `Only ${label} should be filled in for a ${APPROVAL_TYPE_NAMES[derivedType]} approval.`
        : `No Summary Timesheet, Proforma Invoice, or Invoice should be filled in for a ${APPROVAL_TYPE_NAMES[derivedType]} approval.`;
    }
  }

  return null;
}

export async function createApproval(
  _prevState: ApprovalFormState,
  formData: FormData,
): Promise<ApprovalFormState> {
  if (await isManagerRole()) {
    return { error: 'Managers have read-only access.' };
  }

  const parsed = readApprovalFields(formData);
  if ('error' in parsed) {
    return { error: parsed.error };
  }

  const supabase = await createClient();

  const derivedType = await deriveApprovalType(supabase, parsed.values.workflow_stage_id);
  if (!derivedType) {
    return { error: "Could not determine this workflow stage's approval type." };
  }

  const subjectError = validateSubjectFields(derivedType, parsed.values);
  if (subjectError) {
    return { error: subjectError };
  }

  const { error } = await supabase.from('approval').insert({ ...parsed.values, type_code: derivedType });

  if (error) {
    return { error: error.message };
  }

  revalidatePath('/approvals');
  redirect('/approvals');
}

export async function updateApproval(
  id: number,
  _prevState: ApprovalFormState,
  formData: FormData,
): Promise<ApprovalFormState> {
  if (await isManagerRole()) {
    return { error: 'Managers have read-only access.' };
  }

  const parsed = readApprovalFields(formData);
  if ('error' in parsed) {
    return { error: parsed.error };
  }

  const supabase = await createClient();

  const derivedType = await deriveApprovalType(supabase, parsed.values.workflow_stage_id);
  if (!derivedType) {
    return { error: "Could not determine this workflow stage's approval type." };
  }

  const subjectError = validateSubjectFields(derivedType, parsed.values);
  if (subjectError) {
    return { error: subjectError };
  }

  const { error } = await supabase
    .from('approval')
    .update({ ...parsed.values, type_code: derivedType })
    .eq('id', id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath('/approvals');
  redirect('/approvals');
}

export async function deactivateApproval(id: number) {
  if (await isManagerRole()) {
    throw new Error('Managers have read-only access.');
  }

  const supabase = await createClient();
  const { data, error } = await supabase.from('approval').update({ active: false }).eq('id', id).select('id');

  if (error) {
    throw new Error(error.message);
  }
  if (!data || data.length === 0) {
    throw new Error('Approval not found.');
  }

  revalidatePath('/approvals');
  revalidatePath(`/approvals/${id}/edit`);
}

export async function reactivateApproval(id: number) {
  if (await isManagerRole()) {
    throw new Error('Managers have read-only access.');
  }

  const supabase = await createClient();
  const { data, error } = await supabase.from('approval').update({ active: true }).eq('id', id).select('id');

  if (error) {
    throw new Error(error.message);
  }
  if (!data || data.length === 0) {
    throw new Error('Approval not found.');
  }

  revalidatePath('/approvals');
  revalidatePath(`/approvals/${id}/edit`);
}
