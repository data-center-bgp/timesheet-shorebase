import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { ApprovalWorkflowForm, type ApprovalWorkflow } from '../../ApprovalWorkflowForm';
import {
  updateApprovalWorkflow,
  deactivateApprovalWorkflow,
  reactivateApprovalWorkflow,
} from '../../actions';

export default async function EditApprovalWorkflowPage(props: PageProps<'/approval-workflows/[id]/edit'>) {
  const { id } = await props.params;
  const workflowId = Number(id);

  if (Number.isNaN(workflowId)) {
    notFound();
  }

  const supabase = await createClient();

  const { data: workflow, error } = await supabase
    .from('approval_workflow')
    .select('id, type_code, start_date, end_date, timesheet_type_code, contract_id, subcontractor_id, company_id, active')
    .eq('id', workflowId)
    .maybeSingle();

  if (error) {
    return (
      <div className="px-6 py-8">
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          Couldn&apos;t load approval workflow: {error.message}
        </p>
      </div>
    );
  }

  if (!workflow) {
    notFound();
  }

  const { data: approvalTypesData, error: approvalTypesError } = await supabase
    .from('approval_type')
    .select('code, name')
    .order('name', { ascending: true });
  if (approvalTypesError) {
    return (
      <div className="px-6 py-8">
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          Couldn&apos;t load approval types: {approvalTypesError.message}
        </p>
      </div>
    );
  }

  const { data: timesheetTypesData, error: timesheetTypesError } = await supabase
    .from('timesheet_type')
    .select('code, name')
    .order('name', { ascending: true });
  if (timesheetTypesError) {
    return (
      <div className="px-6 py-8">
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          Couldn&apos;t load timesheet types: {timesheetTypesError.message}
        </p>
      </div>
    );
  }

  const { data: contractsData, error: contractsError } = await supabase
    .from('contract')
    .select('id, contract_name')
    .order('contract_name', { ascending: true });
  if (contractsError) {
    return (
      <div className="px-6 py-8">
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          Couldn&apos;t load contracts: {contractsError.message}
        </p>
      </div>
    );
  }

  const { data: subcontractorsData, error: subcontractorsError } = await supabase
    .from('subcontractors')
    .select('id, company(name)')
    .order('id', { ascending: true });
  if (subcontractorsError) {
    return (
      <div className="px-6 py-8">
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          Couldn&apos;t load subcontractors: {subcontractorsError.message}
        </p>
      </div>
    );
  }

  const { data: companiesData, error: companiesError } = await supabase
    .from('company')
    .select('id, name')
    .order('name', { ascending: true });
  if (companiesError) {
    return (
      <div className="px-6 py-8">
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          Couldn&apos;t load companies: {companiesError.message}
        </p>
      </div>
    );
  }

  const approvalTypes = approvalTypesData ?? [];
  const timesheetTypes = timesheetTypesData ?? [];
  const contracts = contractsData ?? [];
  const subcontractors = (subcontractorsData ?? []) as unknown as {
    id: number;
    company: { name: string } | null;
  }[];
  const companies = companiesData ?? [];

  const { active } = workflow;
  const updateApprovalWorkflowWithId = updateApprovalWorkflow.bind(null, workflowId);
  const deactivateApprovalWorkflowWithId = deactivateApprovalWorkflow.bind(null, workflowId);
  const reactivateApprovalWorkflowWithId = reactivateApprovalWorkflow.bind(null, workflowId);

  return (
    <div className="px-6 py-8">
      <p className="font-mono text-xs font-medium tracking-[0.2em] text-zinc-500 dark:text-zinc-400">
        APPROVALS &amp; BILLING
      </p>
      <div className="mt-1 flex items-center justify-between">
        <h2 className="text-2xl font-semibold text-zinc-950 dark:text-zinc-50">
          Edit approval workflow
        </h2>
        <form action={active ? deactivateApprovalWorkflowWithId : reactivateApprovalWorkflowWithId}>
          <button
            type="submit"
            className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-900"
          >
            {active ? 'Deactivate' : 'Reactivate'}
          </button>
        </form>
      </div>
      <ApprovalWorkflowForm
        workflow={workflow as ApprovalWorkflow}
        approvalTypes={approvalTypes}
        timesheetTypes={timesheetTypes}
        contracts={contracts}
        subcontractors={subcontractors}
        companies={companies}
        action={updateApprovalWorkflowWithId}
        submitLabel="Save changes"
      />
    </div>
  );
}
