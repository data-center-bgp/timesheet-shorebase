'use client';

import { useActionState } from 'react';
import type { PlanActivityFormState } from './actions';

export type PlanActivity = {
  id: number;
  code: string;
  contract_service_id: number;
  timesheet_type_code: string;
  subcontractor_id: number | null;
  plan_amount: number;
  plan_date: string;
  plan_remark: string | null;
  plan_description: string | null;
};

export type ContractServiceOption = {
  id: number;
  code: string;
};

export type TimesheetTypeOption = {
  code: string;
  name: string;
};

export type SubcontractorOption = {
  id: number;
  company: { name: string } | null;
};

const initialState: PlanActivityFormState = { error: null };

export function PlanActivityForm({
  activity,
  contractServices,
  timesheetTypes,
  subcontractors,
  action,
  submitLabel,
}: {
  activity?: PlanActivity;
  contractServices: ContractServiceOption[];
  timesheetTypes: TimesheetTypeOption[];
  subcontractors: SubcontractorOption[];
  action: (prevState: PlanActivityFormState, formData: FormData) => Promise<PlanActivityFormState>;
  submitLabel: string;
}) {
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="mt-6 max-w-md space-y-4">
      <div className="space-y-1">
        <label htmlFor="code" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Code
        </label>
        <input
          id="code"
          name="code"
          type="text"
          required
          defaultValue={activity?.code}
          className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-950 focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-600/40 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
        />
      </div>

      <div className="space-y-1">
        <label htmlFor="contract_service_id" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Contract service
        </label>
        <select
          id="contract_service_id"
          name="contract_service_id"
          required
          defaultValue={activity?.contract_service_id ?? ''}
          className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-950 focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-600/40 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
        >
          <option value="" disabled>
            Select a contract service
          </option>
          {contractServices.map((contractService) => (
            <option key={contractService.id} value={contractService.id}>
              {contractService.code}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-1">
        <label htmlFor="timesheet_type_code" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Timesheet type
        </label>
        <select
          id="timesheet_type_code"
          name="timesheet_type_code"
          required
          defaultValue={activity?.timesheet_type_code ?? ''}
          className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-950 focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-600/40 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
        >
          <option value="" disabled>
            Select a timesheet type
          </option>
          {timesheetTypes.map((timesheetType) => (
            <option key={timesheetType.code} value={timesheetType.code}>
              {timesheetType.name}
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
          defaultValue={activity?.subcontractor_id ?? ''}
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
        <label htmlFor="plan_amount" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Plan amount
        </label>
        <input
          id="plan_amount"
          name="plan_amount"
          type="number"
          step="any"
          min="0"
          required
          defaultValue={activity?.plan_amount}
          className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-950 focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-600/40 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
        />
      </div>

      <div className="space-y-1">
        <label htmlFor="plan_date" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Plan date
        </label>
        <input
          id="plan_date"
          name="plan_date"
          type="date"
          required
          defaultValue={activity?.plan_date}
          className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-950 focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-600/40 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
        />
      </div>

      <div className="space-y-1">
        <label htmlFor="plan_description" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Plan description
        </label>
        <input
          id="plan_description"
          name="plan_description"
          type="text"
          defaultValue={activity?.plan_description ?? ''}
          className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-950 focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-600/40 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
        />
      </div>

      <div className="space-y-1">
        <label htmlFor="plan_remark" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Plan remark
        </label>
        <textarea
          id="plan_remark"
          name="plan_remark"
          rows={3}
          defaultValue={activity?.plan_remark ?? ''}
          className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-950 focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-600/40 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
        />
      </div>

      {state.error && (
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          {state.error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-teal-700 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-teal-800 focus:outline-none focus:ring-2 focus:ring-teal-600/40 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-teal-600 dark:hover:bg-teal-500"
      >
        {pending ? 'Saving…' : submitLabel}
      </button>
    </form>
  );
}
