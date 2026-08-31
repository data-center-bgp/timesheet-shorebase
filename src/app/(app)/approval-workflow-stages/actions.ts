'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

export type ApprovalWorkflowStageFormState = {
  error: string | null;
};

type ReadStageFieldsResult =
  | { error: string }
  | {
      values: {
        workflow_id: number;
        level: number;
        job_position_id: number | null;
        user_position_id: number | null;
      };
    };

function readStageFields(formData: FormData): ReadStageFieldsResult {
  const workflowIdRaw = formData.get('workflow_id') as string | null;
  const levelRaw = formData.get('level') as string | null;
  const jobPositionIdRaw = formData.get('job_position_id') as string | null;
  const userPositionIdRaw = formData.get('user_position_id') as string | null;

  if (!workflowIdRaw || !levelRaw) {
    return { error: 'Workflow and level are required.' };
  }

  const workflowId = Number(workflowIdRaw);
  const level = Number(levelRaw);
  if (Number.isNaN(workflowId) || !Number.isFinite(level) || level < 0) {
    return { error: 'Invalid workflow or level.' };
  }

  const jobPositionId = jobPositionIdRaw ? Number(jobPositionIdRaw) : null;
  const userPositionId = userPositionIdRaw ? Number(userPositionIdRaw) : null;
  if (
    (jobPositionId !== null && Number.isNaN(jobPositionId)) ||
    (userPositionId !== null && Number.isNaN(userPositionId))
  ) {
    return { error: 'Invalid job position or user position.' };
  }

  return {
    values: {
      workflow_id: workflowId,
      level,
      job_position_id: jobPositionId,
      user_position_id: userPositionId,
    },
  };
}

export async function createApprovalWorkflowStage(
  _prevState: ApprovalWorkflowStageFormState,
  formData: FormData,
): Promise<ApprovalWorkflowStageFormState> {
  const parsed = readStageFields(formData);
  if ('error' in parsed) {
    return { error: parsed.error };
  }

  const supabase = await createClient();
  const { error } = await supabase.from('approval_workflow_stage').insert(parsed.values);

  if (error) {
    return { error: error.message };
  }

  revalidatePath('/approval-workflow-stages');
  redirect('/approval-workflow-stages');
}

export async function updateApprovalWorkflowStage(
  id: number,
  _prevState: ApprovalWorkflowStageFormState,
  formData: FormData,
): Promise<ApprovalWorkflowStageFormState> {
  const parsed = readStageFields(formData);
  if ('error' in parsed) {
    return { error: parsed.error };
  }

  const supabase = await createClient();
  const { error } = await supabase.from('approval_workflow_stage').update(parsed.values).eq('id', id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath('/approval-workflow-stages');
  redirect('/approval-workflow-stages');
}

export async function deactivateApprovalWorkflowStage(id: number) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('approval_workflow_stage')
    .update({ active: false })
    .eq('id', id)
    .select('id');

  if (error) {
    throw new Error(error.message);
  }
  if (!data || data.length === 0) {
    throw new Error('Approval workflow stage not found.');
  }

  revalidatePath('/approval-workflow-stages');
  revalidatePath(`/approval-workflow-stages/${id}/edit`);
}

export async function reactivateApprovalWorkflowStage(id: number) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('approval_workflow_stage')
    .update({ active: true })
    .eq('id', id)
    .select('id');

  if (error) {
    throw new Error(error.message);
  }
  if (!data || data.length === 0) {
    throw new Error('Approval workflow stage not found.');
  }

  revalidatePath('/approval-workflow-stages');
  revalidatePath(`/approval-workflow-stages/${id}/edit`);
}
