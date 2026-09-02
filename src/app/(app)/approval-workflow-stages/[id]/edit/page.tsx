import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { ApprovalWorkflowStageForm, type ApprovalWorkflowStage } from '../../ApprovalWorkflowStageForm';
import {
  updateApprovalWorkflowStage,
  deactivateApprovalWorkflowStage,
  reactivateApprovalWorkflowStage,
} from '../../actions';
import { isManagerRole } from '@/lib/auth/require-master';

export default async function EditApprovalWorkflowStagePage(
  props: PageProps<'/approval-workflow-stages/[id]/edit'>,
) {
  const { id } = await props.params;
  const stageId = Number(id);

  if (Number.isNaN(stageId)) {
    notFound();
  }

  const isManager = await isManagerRole();
  const supabase = await createClient();

  const { data: stage, error } = await supabase
    .from('approval_workflow_stage')
    .select('id, workflow_id, level, job_position_id, user_position_id, active')
    .eq('id', stageId)
    .maybeSingle();

  if (error) {
    return (
      <div className="px-6 py-8">
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          Couldn&apos;t load workflow stage: {error.message}
        </p>
      </div>
    );
  }

  if (!stage) {
    notFound();
  }

  const { data: workflowsData, error: workflowsError } = await supabase
    .from('approval_workflow')
    .select('id, type_code')
    .eq('active', true)
    .order('id', { ascending: true });
  if (workflowsError) {
    return (
      <div className="px-6 py-8">
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          Couldn&apos;t load approval workflows: {workflowsError.message}
        </p>
      </div>
    );
  }

  const { data: jobPositionsData, error: jobPositionsError } = await supabase
    .from('job_position')
    .select('id, name')
    .eq('active', true)
    .order('name', { ascending: true });
  if (jobPositionsError) {
    return (
      <div className="px-6 py-8">
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          Couldn&apos;t load job positions: {jobPositionsError.message}
        </p>
      </div>
    );
  }

  const { data: userPositionsData, error: userPositionsError } = await supabase
    .from('user_position')
    .select('id, app_user(name, email), job_position(name)')
    .eq('active', true)
    .order('id', { ascending: true });
  if (userPositionsError) {
    return (
      <div className="px-6 py-8">
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          Couldn&apos;t load user positions: {userPositionsError.message}
        </p>
      </div>
    );
  }

  let workflows = workflowsData ?? [];
  let jobPositions = jobPositionsData ?? [];
  let userPositions = (userPositionsData ?? []) as unknown as {
    id: number;
    app_user: { name: string | null; email: string | null } | null;
    job_position: { name: string } | null;
  }[];

  if (stage.workflow_id && !workflows.some((w) => w.id === stage.workflow_id)) {
    const { data: currentWorkflow } = await supabase
      .from('approval_workflow')
      .select('id, type_code')
      .eq('id', stage.workflow_id)
      .maybeSingle();
    if (currentWorkflow) workflows = [...workflows, currentWorkflow];
  }

  if (stage.job_position_id && !jobPositions.some((jp) => jp.id === stage.job_position_id)) {
    const { data: currentJobPosition } = await supabase
      .from('job_position')
      .select('id, name')
      .eq('id', stage.job_position_id)
      .maybeSingle();
    if (currentJobPosition) jobPositions = [...jobPositions, currentJobPosition];
  }

  if (stage.user_position_id && !userPositions.some((up) => up.id === stage.user_position_id)) {
    const { data: currentUserPosition } = await supabase
      .from('user_position')
      .select('id, app_user(name, email), job_position(name)')
      .eq('id', stage.user_position_id)
      .maybeSingle();
    if (currentUserPosition) {
      userPositions = [
        ...userPositions,
        currentUserPosition as unknown as {
          id: number;
          app_user: { name: string | null; email: string | null } | null;
          job_position: { name: string } | null;
        },
      ];
    }
  }

  const { active } = stage;
  const updateApprovalWorkflowStageWithId = updateApprovalWorkflowStage.bind(null, stageId);
  const deactivateApprovalWorkflowStageWithId = deactivateApprovalWorkflowStage.bind(null, stageId);
  const reactivateApprovalWorkflowStageWithId = reactivateApprovalWorkflowStage.bind(null, stageId);

  return (
    <div className="px-6 py-8">
      <p className="font-mono text-xs font-medium tracking-[0.2em] text-zinc-500 dark:text-zinc-400">
        APPROVALS &amp; BILLING
      </p>
      <div className="mt-1 flex items-center justify-between">
        <h2 className="text-2xl font-semibold text-zinc-950 dark:text-zinc-50">
          Edit workflow stage
        </h2>
        {!isManager && (
          <form action={active ? deactivateApprovalWorkflowStageWithId : reactivateApprovalWorkflowStageWithId}>
            <button
              type="submit"
              className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-900"
            >
              {active ? 'Deactivate' : 'Reactivate'}
            </button>
          </form>
        )}
      </div>
      <ApprovalWorkflowStageForm
        stage={stage as ApprovalWorkflowStage}
        workflows={workflows}
        jobPositions={jobPositions}
        userPositions={userPositions}
        action={updateApprovalWorkflowStageWithId}
        submitLabel="Save changes"
        readOnly={isManager}
      />
    </div>
  );
}
