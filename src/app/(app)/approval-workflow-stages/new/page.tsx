import { ApprovalWorkflowStageForm } from '../ApprovalWorkflowStageForm';
import { createApprovalWorkflowStage } from '../actions';
import { createClient } from '@/lib/supabase/server';

export default async function NewApprovalWorkflowStagePage() {
  const supabase = await createClient();

  const { data: workflowsData, error: workflowsError } = await supabase
    .from('approval_workflow')
    .select('id, type_code')
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

  const workflows = workflowsData ?? [];
  const jobPositions = jobPositionsData ?? [];
  const userPositions = (userPositionsData ?? []) as unknown as {
    id: number;
    app_user: { name: string | null; email: string | null } | null;
    job_position: { name: string } | null;
  }[];

  return (
    <div className="px-6 py-8">
      <p className="font-mono text-xs font-medium tracking-[0.2em] text-zinc-500 dark:text-zinc-400">
        APPROVALS &amp; BILLING
      </p>
      <h2 className="mt-1 text-2xl font-semibold text-zinc-950 dark:text-zinc-50">
        Add workflow stage
      </h2>
      <ApprovalWorkflowStageForm
        workflows={workflows}
        jobPositions={jobPositions}
        userPositions={userPositions}
        action={createApprovalWorkflowStage}
        submitLabel="Create stage"
      />
    </div>
  );
}
