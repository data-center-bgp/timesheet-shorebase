import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { ApprovalForm, type Approval } from '../../ApprovalForm';
import { updateApproval, deactivateApproval, reactivateApproval } from '../../actions';
import { isManagerRole } from '@/lib/auth/require-master';

export default async function EditApprovalPage(props: PageProps<'/approvals/[id]/edit'>) {
  const { id } = await props.params;
  const approvalId = Number(id);

  if (Number.isNaN(approvalId)) {
    notFound();
  }

  const isManager = await isManagerRole();
  const supabase = await createClient();

  const { data: approval, error } = await supabase
    .from('approval')
    .select('id, workflow_stage_id, timesheet_id, status_code, approver_user_id, approver_user_pos_id, remark, active')
    .eq('id', approvalId)
    .maybeSingle();

  if (error) {
    return (
      <div className="px-6 py-8">
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          Couldn&apos;t load approval: {error.message}
        </p>
      </div>
    );
  }

  if (!approval) {
    notFound();
  }

  const { data: workflowStagesData, error: workflowStagesError } = await supabase
    .from('approval_workflow_stage')
    .select('id, workflow_id, level')
    .eq('active', true)
    .order('workflow_id', { ascending: true })
    .order('level', { ascending: true });
  if (workflowStagesError) {
    return (
      <div className="px-6 py-8">
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          Couldn&apos;t load workflow stages: {workflowStagesError.message}
        </p>
      </div>
    );
  }

  const { data: timesheetsData, error: timesheetsError } = await supabase
    .from('timesheet')
    .select('id, code')
    .eq('active', true)
    .order('code', { ascending: true });
  if (timesheetsError) {
    return (
      <div className="px-6 py-8">
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          Couldn&apos;t load timesheets: {timesheetsError.message}
        </p>
      </div>
    );
  }

  const { data: approvalStatusesData, error: approvalStatusesError } = await supabase
    .from('approval_status')
    .select('code, name')
    .order('name', { ascending: true });
  if (approvalStatusesError) {
    return (
      <div className="px-6 py-8">
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          Couldn&apos;t load approval statuses: {approvalStatusesError.message}
        </p>
      </div>
    );
  }

  const { data: appUsersData, error: appUsersError } = await supabase
    .from('app_user')
    .select('id, name, email')
    .order('email', { ascending: true });
  if (appUsersError) {
    return (
      <div className="px-6 py-8">
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          Couldn&apos;t load users: {appUsersError.message}
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

  let workflowStages = workflowStagesData ?? [];
  let timesheets = timesheetsData ?? [];
  const approvalStatuses = approvalStatusesData ?? [];
  const appUsers = appUsersData ?? [];
  let userPositions = (userPositionsData ?? []) as unknown as {
    id: number;
    app_user: { name: string | null; email: string | null } | null;
    job_position: { name: string } | null;
  }[];

  if (approval.workflow_stage_id && !workflowStages.some((ws) => ws.id === approval.workflow_stage_id)) {
    const { data: currentWorkflowStage } = await supabase
      .from('approval_workflow_stage')
      .select('id, workflow_id, level')
      .eq('id', approval.workflow_stage_id)
      .maybeSingle();
    if (currentWorkflowStage) workflowStages = [...workflowStages, currentWorkflowStage];
  }

  if (approval.timesheet_id && !timesheets.some((t) => t.id === approval.timesheet_id)) {
    const { data: currentTimesheet } = await supabase
      .from('timesheet')
      .select('id, code')
      .eq('id', approval.timesheet_id)
      .maybeSingle();
    if (currentTimesheet) timesheets = [...timesheets, currentTimesheet];
  }

  if (
    approval.approver_user_pos_id &&
    !userPositions.some((up) => up.id === approval.approver_user_pos_id)
  ) {
    const { data: currentUserPosition } = await supabase
      .from('user_position')
      .select('id, app_user(name, email), job_position(name)')
      .eq('id', approval.approver_user_pos_id)
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

  const { active } = approval;
  const updateApprovalWithId = updateApproval.bind(null, approvalId);
  const deactivateApprovalWithId = deactivateApproval.bind(null, approvalId);
  const reactivateApprovalWithId = reactivateApproval.bind(null, approvalId);

  return (
    <div className="px-6 py-8">
      <p className="font-mono text-xs font-medium tracking-[0.2em] text-zinc-500 dark:text-zinc-400">
        APPROVALS &amp; BILLING
      </p>
      <div className="mt-1 flex items-center justify-between">
        <h2 className="text-2xl font-semibold text-zinc-950 dark:text-zinc-50">
          Edit approval
        </h2>
        {!isManager && (
          <form action={active ? deactivateApprovalWithId : reactivateApprovalWithId}>
            <button
              type="submit"
              className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-900"
            >
              {active ? 'Deactivate' : 'Reactivate'}
            </button>
          </form>
        )}
      </div>
      <ApprovalForm
        approval={approval as Approval}
        workflowStages={workflowStages}
        timesheets={timesheets}
        approvalStatuses={approvalStatuses}
        appUsers={appUsers}
        userPositions={userPositions}
        action={updateApprovalWithId}
        submitLabel="Save changes"
        readOnly={isManager}
      />
    </div>
  );
}
