import { redirect } from 'next/navigation';
import { ApprovalForm } from '../ApprovalForm';
import { createApproval } from '../actions';
import { createClient } from '@/lib/supabase/server';
import { isManagerRole } from '@/lib/auth/require-master';

export default async function NewApprovalPage() {
  if (await isManagerRole()) {
    redirect('/approvals');
  }

  const supabase = await createClient();

  const { data: workflowStagesData, error: workflowStagesError } = await supabase
    .from('approval_workflow_stage')
    .select('id, workflow_id, level, approval_workflow(type_code)')
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

  const { data: summaryTimesheetsData, error: summaryTimesheetsError } = await supabase
    .from('summary_timesheet')
    .select('id, code')
    .eq('active', true)
    .order('code', { ascending: true });
  if (summaryTimesheetsError) {
    return (
      <div className="px-6 py-8">
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          Couldn&apos;t load summary timesheets: {summaryTimesheetsError.message}
        </p>
      </div>
    );
  }

  const { data: proformaInvoicesData, error: proformaInvoicesError } = await supabase
    .from('invoice')
    .select('id, code')
    .eq('type_code', 'P')
    .order('code', { ascending: true });
  if (proformaInvoicesError) {
    return (
      <div className="px-6 py-8">
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          Couldn&apos;t load proforma invoices: {proformaInvoicesError.message}
        </p>
      </div>
    );
  }

  const { data: invoicesData, error: invoicesError } = await supabase
    .from('invoice')
    .select('id, code')
    .eq('type_code', 'I')
    .order('code', { ascending: true });
  if (invoicesError) {
    return (
      <div className="px-6 py-8">
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          Couldn&apos;t load invoices: {invoicesError.message}
        </p>
      </div>
    );
  }

  const workflowStages = (workflowStagesData ?? []).map((stage) => {
    const stageRow = stage as unknown as {
      id: number;
      workflow_id: number;
      level: number;
      approval_workflow: { type_code: string } | null;
    };
    return {
      id: stageRow.id,
      workflow_id: stageRow.workflow_id,
      level: stageRow.level,
      type_code: stageRow.approval_workflow?.type_code ?? '',
    };
  });
  const timesheets = timesheetsData ?? [];
  const approvalStatuses = approvalStatusesData ?? [];
  const appUsers = appUsersData ?? [];
  const userPositions = (userPositionsData ?? []) as unknown as {
    id: number;
    app_user: { name: string | null; email: string | null } | null;
    job_position: { name: string } | null;
  }[];
  const summaryTimesheets = summaryTimesheetsData ?? [];
  const proformaInvoices = proformaInvoicesData ?? [];
  const invoices = invoicesData ?? [];

  return (
    <div className="px-6 py-8">
      <p className="font-mono text-xs font-medium tracking-[0.2em] text-zinc-500 dark:text-zinc-400">
        APPROVALS &amp; BILLING
      </p>
      <h2 className="mt-1 text-2xl font-semibold text-zinc-950 dark:text-zinc-50">
        Add approval
      </h2>
      <ApprovalForm
        workflowStages={workflowStages}
        timesheets={timesheets}
        approvalStatuses={approvalStatuses}
        appUsers={appUsers}
        userPositions={userPositions}
        summaryTimesheets={summaryTimesheets}
        proformaInvoices={proformaInvoices}
        invoices={invoices}
        action={createApproval}
        submitLabel="Create approval"
      />
    </div>
  );
}
