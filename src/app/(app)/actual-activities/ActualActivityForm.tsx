'use client';

import { useActionState } from 'react';
import type { ActualActivityFormState } from './actions';

export type ActualActivity = {
  id: number;
  plan_activity_id: number;
  actual_amount: number;
  actual_remark: string | null;
  actual_description: string | null;
};

export type PlanActivityOption = {
  id: number;
  code: string;
};

const initialState: ActualActivityFormState = { error: null };

export function ActualActivityForm({
  actualActivity,
  planActivities,
  action,
  submitLabel,
}: {
  actualActivity?: ActualActivity;
  planActivities: PlanActivityOption[];
  action: (prevState: ActualActivityFormState, formData: FormData) => Promise<ActualActivityFormState>;
  submitLabel: string;
}) {
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="mt-6 max-w-md space-y-4">
      <div className="space-y-1">
        <label htmlFor="plan_activity_id" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Plan activity
        </label>
        <select
          id="plan_activity_id"
          name="plan_activity_id"
          required
          defaultValue={actualActivity?.plan_activity_id ?? ''}
          className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-950 focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-600/40 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
        >
          <option value="" disabled>
            Select a plan activity
          </option>
          {planActivities.map((planActivity) => (
            <option key={planActivity.id} value={planActivity.id}>
              {planActivity.code}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-1">
        <label htmlFor="actual_amount" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Actual amount
        </label>
        <input
          id="actual_amount"
          name="actual_amount"
          type="number"
          step="any"
          min="0"
          required
          defaultValue={actualActivity?.actual_amount}
          className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-950 focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-600/40 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
        />
      </div>

      <div className="space-y-1">
        <label htmlFor="actual_description" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Actual description
        </label>
        <input
          id="actual_description"
          name="actual_description"
          type="text"
          defaultValue={actualActivity?.actual_description ?? ''}
          className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-950 focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-600/40 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
        />
      </div>

      <div className="space-y-1">
        <label htmlFor="actual_remark" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Actual remark
        </label>
        <textarea
          id="actual_remark"
          name="actual_remark"
          rows={3}
          defaultValue={actualActivity?.actual_remark ?? ''}
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
