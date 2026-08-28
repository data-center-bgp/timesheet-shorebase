'use client';

import { useActionState } from 'react';
import type { TimesheetFormState } from './actions';

export type Timesheet = {
  id: number;
  period_id: number;
  type_code: string;
  contract_service_id: number;
  timesheet_date: string;
  code: string;
  code_serial_number: number | null;
  total_amount: number;
  subcontractor_id: number | null;
  jetty_ship_id: number | null;
  mh_job_id: number | null;
};

export type PeriodOption = { id: number; name: string };
export type TimesheetTypeOption = { code: string; name: string };
export type ContractServiceOption = { id: number; code: string };
export type SubcontractorOption = { id: number; company: { name: string } | null };
export type JettyShipOption = { id: number; name: string };
export type MaterialHandlingJobOption = { id: number; name: string };

const initialState: TimesheetFormState = { error: null };

export function TimesheetForm({
  timesheet,
  periods,
  timesheetTypes,
  contractServices,
  subcontractors,
  jettyShips,
  materialHandlingJobs,
  action,
  submitLabel,
}: {
  timesheet?: Timesheet;
  periods: PeriodOption[];
  timesheetTypes: TimesheetTypeOption[];
  contractServices: ContractServiceOption[];
  subcontractors: SubcontractorOption[];
  jettyShips: JettyShipOption[];
  materialHandlingJobs: MaterialHandlingJobOption[];
  action: (prevState: TimesheetFormState, formData: FormData) => Promise<TimesheetFormState>;
  submitLabel: string;
}) {
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="mt-6 max-w-md space-y-4">
      <div className="space-y-1">
        <label htmlFor="period_id" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Period
        </label>
        <select
          id="period_id"
          name="period_id"
          required
          defaultValue={timesheet?.period_id ?? ''}
          className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-950 focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-600/40 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
        >
          <option value="" disabled>
            Select a period
          </option>
          {periods.map((period) => (
            <option key={period.id} value={period.id}>
              {period.name}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-1">
        <label htmlFor="type_code" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Timesheet type
        </label>
        <select
          id="type_code"
          name="type_code"
          required
          defaultValue={timesheet?.type_code ?? ''}
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
        <label htmlFor="contract_service_id" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Contract service
        </label>
        <select
          id="contract_service_id"
          name="contract_service_id"
          required
          defaultValue={timesheet?.contract_service_id ?? ''}
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
        <label htmlFor="timesheet_date" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Timesheet date
        </label>
        <input
          id="timesheet_date"
          name="timesheet_date"
          type="date"
          required
          defaultValue={timesheet?.timesheet_date}
          className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-950 focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-600/40 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
        />
      </div>

      <div className="space-y-1">
        <label htmlFor="code" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Code
        </label>
        <input
          id="code"
          name="code"
          type="text"
          required
          defaultValue={timesheet?.code}
          className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-950 focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-600/40 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
        />
      </div>

      <div className="space-y-1">
        <label htmlFor="code_serial_number" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Code serial number
        </label>
        <input
          id="code_serial_number"
          name="code_serial_number"
          type="number"
          step="1"
          min="0"
          defaultValue={timesheet?.code_serial_number ?? ''}
          className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-950 focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-600/40 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
        />
      </div>

      <div className="space-y-1">
        <label htmlFor="total_amount" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Total amount
        </label>
        <input
          id="total_amount"
          name="total_amount"
          type="number"
          step="any"
          min="0"
          required
          defaultValue={timesheet?.total_amount}
          className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-950 focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-600/40 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
        />
      </div>

      <div className="space-y-1">
        <label htmlFor="subcontractor_id" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Subcontractor
        </label>
        <select
          id="subcontractor_id"
          name="subcontractor_id"
          defaultValue={timesheet?.subcontractor_id ?? ''}
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
        <label htmlFor="jetty_ship_id" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Jetty/Ship
        </label>
        <select
          id="jetty_ship_id"
          name="jetty_ship_id"
          defaultValue={timesheet?.jetty_ship_id ?? ''}
          className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-950 focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-600/40 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
        >
          <option value="">No jetty/ship</option>
          {jettyShips.map((jettyShip) => (
            <option key={jettyShip.id} value={jettyShip.id}>
              {jettyShip.name}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-1">
        <label htmlFor="mh_job_id" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Material handling job
        </label>
        <select
          id="mh_job_id"
          name="mh_job_id"
          defaultValue={timesheet?.mh_job_id ?? ''}
          className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-950 focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-600/40 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
        >
          <option value="">No material handling job</option>
          {materialHandlingJobs.map((job) => (
            <option key={job.id} value={job.id}>
              {job.name}
            </option>
          ))}
        </select>
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
