'use client';

import { useActionState } from 'react';
import type { ApprovalWorkflowFormState } from './actions';

export type ApprovalWorkflow = {
  id: number;
  type_code: string;
  start_date: string;
  end_date: string;
  timesheet_type_code: string | null;
  contract_id: number | null;
  subcontractor_id: number | null;
  company_id: number | null;
};

export type ApprovalTypeOption = { code: string; name: string };
export type TimesheetTypeOption = { code: string; name: string };
export type ContractOption = { id: number; contract_name: string };
export type SubcontractorOption = { id: number; company: { name: string } | null };
export type CompanyOption = { id: number; name: string };

const initialState: ApprovalWorkflowFormState = { error: null };

export function ApprovalWorkflowForm({
  workflow,
  approvalTypes,
  timesheetTypes,
  contracts,
  subcontractors,
  companies,
  action,
  submitLabel,
  readOnly = false,
}: {
  workflow?: ApprovalWorkflow;
  approvalTypes: ApprovalTypeOption[];
  timesheetTypes: TimesheetTypeOption[];
  contracts: ContractOption[];
  subcontractors: SubcontractorOption[];
  companies: CompanyOption[];
  action: (prevState: ApprovalWorkflowFormState, formData: FormData) => Promise<ApprovalWorkflowFormState>;
  submitLabel: string;
  readOnly?: boolean;
}) {
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="mt-6 max-w-md space-y-4">
      <div className="space-y-1">
        <label htmlFor="type_code" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Type
        </label>
        <select
          id="type_code"
          name="type_code"
          required
          defaultValue={workflow?.type_code ?? ''}
          disabled={readOnly}
          className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-950 focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-600/40 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
        >
          <option value="" disabled>
            Select a type
          </option>
          {approvalTypes.map((approvalType) => (
            <option key={approvalType.code} value={approvalType.code}>
              {approvalType.name}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-1">
        <label htmlFor="start_date" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Start date
        </label>
        <input
          id="start_date"
          name="start_date"
          type="date"
          required
          defaultValue={workflow?.start_date}
          disabled={readOnly}
          className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-950 focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-600/40 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
        />
      </div>

      <div className="space-y-1">
        <label htmlFor="end_date" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          End date
        </label>
        <input
          id="end_date"
          name="end_date"
          type="date"
          required
          defaultValue={workflow?.end_date}
          disabled={readOnly}
          className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-950 focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-600/40 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
        />
      </div>

      <div className="space-y-1">
        <label htmlFor="timesheet_type_code" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Timesheet type
        </label>
        <select
          id="timesheet_type_code"
          name="timesheet_type_code"
          defaultValue={workflow?.timesheet_type_code ?? ''}
          disabled={readOnly}
          className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-950 focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-600/40 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
        >
          <option value="">Any timesheet type</option>
          {timesheetTypes.map((timesheetType) => (
            <option key={timesheetType.code} value={timesheetType.code}>
              {timesheetType.name}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-1">
        <label htmlFor="contract_id" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Contract
        </label>
        <select
          id="contract_id"
          name="contract_id"
          defaultValue={workflow?.contract_id ?? ''}
          disabled={readOnly}
          className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-950 focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-600/40 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
        >
          <option value="">Any contract</option>
          {contracts.map((contract) => (
            <option key={contract.id} value={contract.id}>
              {contract.contract_name}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-1">
        <label htmlFor="subcontractor_id" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Subcontractor
        </label>
        <select
          id="subcontractor_id"
          name="subcontractor_id"
          defaultValue={workflow?.subcontractor_id ?? ''}
          disabled={readOnly}
          className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-950 focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-600/40 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
        >
          <option value="">No subcontractor</option>
          {subcontractors.map((subcontractor) => (
            <option key={subcontractor.id} value={subcontractor.id}>
              {subcontractor.company?.name ?? `Subcontractor #${subcontractor.id}`}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-1">
        <label htmlFor="company_id" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Company
        </label>
        <select
          id="company_id"
          name="company_id"
          defaultValue={workflow?.company_id ?? ''}
          disabled={readOnly}
          className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-950 focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-600/40 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
        >
          <option value="">Any company</option>
          {companies.map((company) => (
            <option key={company.id} value={company.id}>
              {company.name}
            </option>
          ))}
        </select>
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
