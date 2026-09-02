'use client';

import { useActionState } from 'react';
import type { UserPositionFormState } from './actions';

export type UserPosition = {
  id: number;
  user_id: string;
  job_position_id: number;
  start_date: string;
  end_date: string;
};

export type UserOption = {
  id: string;
  name: string | null;
  email: string | null;
};

export type JobPositionOption = {
  id: number;
  name: string;
};

const initialState: UserPositionFormState = { error: null };

export function UserPositionForm({
  userPosition,
  users,
  jobPositions,
  action,
  submitLabel,
  readOnly = false,
}: {
  userPosition?: UserPosition;
  users: UserOption[];
  jobPositions: JobPositionOption[];
  action: (prevState: UserPositionFormState, formData: FormData) => Promise<UserPositionFormState>;
  submitLabel: string;
  readOnly?: boolean;
}) {
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="mt-6 max-w-md space-y-4">
      <div className="space-y-1">
        <label htmlFor="user_id" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          User
        </label>
        <select
          id="user_id"
          name="user_id"
          required
          defaultValue={userPosition?.user_id ?? ''}
          disabled={readOnly}
          className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-950 focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-600/40 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
        >
          <option value="" disabled>
            Select a user
          </option>
          {users.map((user) => (
            <option key={user.id} value={user.id}>
              {user.name ?? user.email ?? user.id}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-1">
        <label htmlFor="job_position_id" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Job position
        </label>
        <select
          id="job_position_id"
          name="job_position_id"
          required
          defaultValue={userPosition?.job_position_id ?? ''}
          disabled={readOnly}
          className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-950 focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-600/40 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
        >
          <option value="" disabled>
            Select a job position
          </option>
          {jobPositions.map((jobPosition) => (
            <option key={jobPosition.id} value={jobPosition.id}>
              {jobPosition.name}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <label htmlFor="start_date" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Start date
          </label>
          <input
            id="start_date"
            name="start_date"
            type="date"
            required
            defaultValue={userPosition?.start_date}
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
            defaultValue={userPosition?.end_date}
            disabled={readOnly}
            className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-950 focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-600/40 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
          />
        </div>
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
