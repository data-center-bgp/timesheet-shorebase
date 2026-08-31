'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

export type ApprovalFormState = {
  error: string | null;
};

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
      };
    };

function readApprovalFields(formData: FormData): ReadApprovalFieldsResult {
  const workflowStageIdRaw = formData.get('workflow_stage_id') as string | null;
  const timesheetIdRaw = formData.get('timesheet_id') as string | null;
  const statusCode = (formData.get('status_code') as string | null)?.trim();
  const approverUserId = (formData.get('approver_user_id') as string | null)?.trim();
  const approverUserPosIdRaw = formData.get('approver_user_pos_id') as string | null;
  const remark = (formData.get('remark') as string | null)?.trim();

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

  return {
    values: {
      workflow_stage_id: workflowStageId,
      timesheet_id: timesheetId,
      status_code: statusCode,
      approver_user_id: approverUserId || null,
      approver_user_pos_id: approverUserPosId,
      remark: remark || null,
    },
  };
}

export async function createApproval(
  _prevState: ApprovalFormState,
  formData: FormData,
): Promise<ApprovalFormState> {
  const parsed = readApprovalFields(formData);
  if ('error' in parsed) {
    return { error: parsed.error };
  }

  const supabase = await createClient();
  const { error } = await supabase.from('approval').insert({ ...parsed.values, type_code: 'T' });

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
  const parsed = readApprovalFields(formData);
  if ('error' in parsed) {
    return { error: parsed.error };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from('approval')
    .update({ ...parsed.values, type_code: 'T' })
    .eq('id', id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath('/approvals');
  redirect('/approvals');
}

export async function deactivateApproval(id: number) {
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
