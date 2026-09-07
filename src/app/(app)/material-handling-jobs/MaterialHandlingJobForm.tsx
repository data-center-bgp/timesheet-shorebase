'use client';

import { useActionState } from 'react';
import type { MaterialHandlingJobFormState } from './actions';

export type MaterialHandlingJob = {
  id: number;
  contract_service_id: number;
  sub_contractor_id: number;
  name: string;
  job_date: string;
  job_start: string | null;
  job_finish: string | null;
};

export type ContractServiceOption = {
  id: number;
  code: string;
  shorebase_service: { name: string } | null;
};

export type SubcontractorOption = {
  id: number;
  company: { name: string } | null;
};

function toDatetimeLocalValue(isoString: string | null): string {
  if (!isoString) return '';
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  // The write side sends the datetime-local input's value straight to
  // Postgres with no timezone offset, so it's stored as the literal typed
  // wall-clock numbers interpreted in the DB session's UTC timezone - not
  // a real instant conversion. Reading it back must undo that the same
  // literal way (UTC getters), not via the browser's local timezone, or
  // the displayed value drifts by the browser's UTC offset on every
  // re-fetch.
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}T${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())}`;
}

const initialState: MaterialHandlingJobFormState = { error: null };

export function MaterialHandlingJobForm({
  job,
  contractServices,
  subcontractors,
  action,
  submitLabel,
  readOnly = false,
}: {
  job?: MaterialHandlingJob;
  contractServices: ContractServiceOption[];
  subcontractors: SubcontractorOption[];
  action: (prevState: MaterialHandlingJobFormState, formData: FormData) => Promise<MaterialHandlingJobFormState>;
  submitLabel: string;
  readOnly?: boolean;
}) {
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="mt-6 max-w-md space-y-4">
      <div className="space-y-1">
        <label htmlFor="contract_service_id" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Contract service
        </label>
        <select
          id="contract_service_id"
          name="contract_service_id"
          required
          disabled={readOnly}
          defaultValue={job?.contract_service_id ?? ''}
          className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-950 focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-600/40 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
        >
          <option value="" disabled>
            Select a contract service
          </option>
          {contractServices.map((contractService) => (
            <option key={contractService.id} value={contractService.id}>
              {`${contractService.code} — ${contractService.shorebase_service?.name ?? '—'}`}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-1">
        <label htmlFor="sub_contractor_id" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Subcontractor
        </label>
        <select
          id="sub_contractor_id"
          name="sub_contractor_id"
          required
          disabled={readOnly}
          defaultValue={job?.sub_contractor_id ?? ''}
          className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-950 focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-600/40 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
        >
          <option value="" disabled>
            Select a subcontractor
          </option>
          {subcontractors.map((subcontractor) => (
            <option key={subcontractor.id} value={subcontractor.id}>
              {subcontractor.company?.name ?? `Subcontractor #${subcontractor.id}`}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-1">
        <label htmlFor="name" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Name
        </label>
        <input
          id="name"
          name="name"
          type="text"
          required
          disabled={readOnly}
          defaultValue={job?.name}
          className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-950 focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-600/40 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
        />
      </div>

      <div className="space-y-1">
        <label htmlFor="job_date" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Job date
        </label>
        <input
          id="job_date"
          name="job_date"
          type="date"
          required
          disabled={readOnly}
          defaultValue={job?.job_date}
          className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-950 focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-600/40 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
        />
      </div>

      <div className="space-y-1">
        <label htmlFor="job_start" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Job start
        </label>
        <input
          id="job_start"
          name="job_start"
          type="datetime-local"
          disabled={readOnly}
          defaultValue={toDatetimeLocalValue(job?.job_start ?? null)}
          className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-950 focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-600/40 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
        />
      </div>

      <div className="space-y-1">
        <label htmlFor="job_finish" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Job finish
        </label>
        <input
          id="job_finish"
          name="job_finish"
          type="datetime-local"
          disabled={readOnly}
          defaultValue={toDatetimeLocalValue(job?.job_finish ?? null)}
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
