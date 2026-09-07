'use client';

import { useActionState } from 'react';
import type { MaterialHandlingEquipmentFormState } from './actions';

export type MaterialHandlingEquipmentRecord = {
  id: number;
  job_id: number;
  equipment_id: number;
};

export type JobOption = {
  id: number;
  name: string;
};

export type EquipmentOption = {
  id: number;
  code: string;
  name: string;
};

const initialState: MaterialHandlingEquipmentFormState = { error: null };

export function MaterialHandlingEquipmentForm({
  record,
  jobs,
  equipmentOptions,
  action,
  submitLabel,
  readOnly = false,
  defaultJobId,
  returnTo,
}: {
  record?: MaterialHandlingEquipmentRecord;
  jobs: JobOption[];
  equipmentOptions: EquipmentOption[];
  action: (
    prevState: MaterialHandlingEquipmentFormState,
    formData: FormData,
  ) => Promise<MaterialHandlingEquipmentFormState>;
  submitLabel: string;
  readOnly?: boolean;
  defaultJobId?: number;
  returnTo?: string;
}) {
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="mt-6 max-w-md space-y-4">
      <div className="space-y-1">
        <label htmlFor="job_id" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Job
        </label>
        <select
          id="job_id"
          name="job_id"
          required
          disabled={readOnly}
          defaultValue={record?.job_id ?? defaultJobId ?? ''}
          className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-950 focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-600/40 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
        >
          <option value="" disabled>
            Select a job
          </option>
          {jobs.map((job) => (
            <option key={job.id} value={job.id}>
              {job.name}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-1">
        <label htmlFor="equipment_id" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Equipment
        </label>
        <select
          id="equipment_id"
          name="equipment_id"
          required
          disabled={readOnly}
          defaultValue={record?.equipment_id ?? ''}
          className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-950 focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-600/40 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
        >
          <option value="" disabled>
            Select equipment
          </option>
          {equipmentOptions.map((equipmentOption) => (
            <option key={equipmentOption.id} value={equipmentOption.id}>
              {equipmentOption.code} — {equipmentOption.name}
            </option>
          ))}
        </select>
      </div>

      {returnTo && <input type="hidden" name="return_to" value={returnTo} />}

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
