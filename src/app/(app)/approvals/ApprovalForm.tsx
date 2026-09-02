'use client';

import { useActionState } from 'react';
import type { ApprovalFormState } from './actions';
import { APPROVAL_TYPE_NAMES } from './approval-types';

export type Approval = {
  id: number;
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

export type WorkflowStageOption = { id: number; workflow_id: number; level: number; type_code: string };
export type TimesheetOption = { id: number; code: string };
export type ApprovalStatusOption = { code: string; name: string };
export type AppUserOption = { id: string; name: string | null; email: string | null };
export type UserPositionOption = {
  id: number;
  app_user: { name: string | null; email: string | null } | null;
  job_position: { name: string } | null;
};
export type SummaryTimesheetOption = { id: number; code: string };
export type InvoiceOption = { id: number; code: string | null };

const initialState: ApprovalFormState = { error: null };

function userPositionLabel(userPosition: UserPositionOption): string {
  const userLabel = userPosition.app_user?.name ?? userPosition.app_user?.email ?? `User Position #${userPosition.id}`;
  const positionLabel = userPosition.job_position?.name ?? '—';
  return `${userLabel} — ${positionLabel}`;
}

export function ApprovalForm({
  approval,
  workflowStages,
  timesheets,
  approvalStatuses,
  appUsers,
  userPositions,
  summaryTimesheets,
  proformaInvoices,
  invoices,
  action,
  submitLabel,
  readOnly = false,
}: {
  approval?: Approval;
  workflowStages: WorkflowStageOption[];
  timesheets: TimesheetOption[];
  approvalStatuses: ApprovalStatusOption[];
  appUsers: AppUserOption[];
  userPositions: UserPositionOption[];
  summaryTimesheets: SummaryTimesheetOption[];
  proformaInvoices: InvoiceOption[];
  invoices: InvoiceOption[];
  action: (prevState: ApprovalFormState, formData: FormData) => Promise<ApprovalFormState>;
  submitLabel: string;
  readOnly?: boolean;
}) {
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="mt-6 max-w-md space-y-4">
      <div className="space-y-1">
        <label htmlFor="workflow_stage_id" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Workflow stage
        </label>
        <select
          id="workflow_stage_id"
          name="workflow_stage_id"
          required
          defaultValue={approval?.workflow_stage_id ?? ''}
          disabled={readOnly}
          className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-950 focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-600/40 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
        >
          <option value="" disabled>
            Select a workflow stage
          </option>
          {workflowStages.map((stage) => (
            <option key={stage.id} value={stage.id}>
              {`Level ${stage.level} — Workflow #${stage.workflow_id} (${APPROVAL_TYPE_NAMES[stage.type_code] ?? stage.type_code})`}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-1">
        <label htmlFor="timesheet_id" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Timesheet
        </label>
        <select
          id="timesheet_id"
          name="timesheet_id"
          required
          defaultValue={approval?.timesheet_id ?? ''}
          disabled={readOnly}
          className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-950 focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-600/40 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
        >
          <option value="" disabled>
            Select a timesheet
          </option>
          {timesheets.map((timesheet) => (
            <option key={timesheet.id} value={timesheet.id}>
              {timesheet.code}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-1">
        <label htmlFor="summary_timesheet_id" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Summary timesheet
        </label>
        <select
          id="summary_timesheet_id"
          name="summary_timesheet_id"
          defaultValue={approval?.summary_timesheet_id ?? ''}
          disabled={readOnly}
          className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-950 focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-600/40 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
        >
          <option value="">No summary timesheet</option>
          {summaryTimesheets.map((summaryTimesheet) => (
            <option key={summaryTimesheet.id} value={summaryTimesheet.id}>
              {summaryTimesheet.code}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-1">
        <label htmlFor="proforma_invoice_id" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Proforma invoice
        </label>
        <select
          id="proforma_invoice_id"
          name="proforma_invoice_id"
          defaultValue={approval?.proforma_invoice_id ?? ''}
          disabled={readOnly}
          className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-950 focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-600/40 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
        >
          <option value="">No proforma invoice</option>
          {proformaInvoices.map((proformaInvoice) => (
            <option key={proformaInvoice.id} value={proformaInvoice.id}>
              {proformaInvoice.code ?? `Proforma Invoice #${proformaInvoice.id}`}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-1">
        <label htmlFor="invoice_id" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Invoice
        </label>
        <select
          id="invoice_id"
          name="invoice_id"
          defaultValue={approval?.invoice_id ?? ''}
          disabled={readOnly}
          className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-950 focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-600/40 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
        >
          <option value="">No invoice</option>
          {invoices.map((invoice) => (
            <option key={invoice.id} value={invoice.id}>
              {invoice.code ?? `Invoice #${invoice.id}`}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-1">
        <label htmlFor="status_code" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Status
        </label>
        <select
          id="status_code"
          name="status_code"
          required
          defaultValue={approval?.status_code ?? ''}
          disabled={readOnly}
          className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-950 focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-600/40 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
        >
          <option value="" disabled>
            Select a status
          </option>
          {approvalStatuses.map((approvalStatus) => (
            <option key={approvalStatus.code} value={approvalStatus.code}>
              {approvalStatus.name}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-1">
        <label htmlFor="approver_user_id" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Approver user
        </label>
        <select
          id="approver_user_id"
          name="approver_user_id"
          defaultValue={approval?.approver_user_id ?? ''}
          disabled={readOnly}
          className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-950 focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-600/40 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
        >
          <option value="">No approver user</option>
          {appUsers.map((appUser) => (
            <option key={appUser.id} value={appUser.id}>
              {appUser.name ?? appUser.email ?? appUser.id}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-1">
        <label htmlFor="approver_user_pos_id" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Approver user position
        </label>
        <select
          id="approver_user_pos_id"
          name="approver_user_pos_id"
          defaultValue={approval?.approver_user_pos_id ?? ''}
          disabled={readOnly}
          className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-950 focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-600/40 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
        >
          <option value="">No approver user position</option>
          {userPositions.map((userPosition) => (
            <option key={userPosition.id} value={userPosition.id}>
              {userPositionLabel(userPosition)}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-1">
        <label htmlFor="remark" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Remark
        </label>
        <input
          id="remark"
          name="remark"
          type="text"
          defaultValue={approval?.remark ?? ''}
          disabled={readOnly}
          className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-950 focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-600/40 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
        />
      </div>

      {state.error && (
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          {state.error}
        </p>
      )}

      {readOnly ? (
        <p className="text-sm text-zinc-500 dark:text-zinc-400">Managers have read-only access.</p>
      ) : (
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-teal-700 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-teal-800 focus:outline-none focus:ring-2 focus:ring-teal-600/40 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-teal-600 dark:hover:bg-teal-500"
        >
          {pending ? 'Saving…' : submitLabel}
        </button>
      )}
    </form>
  );
}
