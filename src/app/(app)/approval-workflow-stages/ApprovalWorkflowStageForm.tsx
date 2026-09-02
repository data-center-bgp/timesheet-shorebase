'use client';

import { useActionState } from 'react';
import type { ApprovalWorkflowStageFormState } from './actions';

export type ApprovalWorkflowStage = {
  id: number;
  workflow_id: number;
  level: number;
  job_position_id: number | null;
  user_position_id: number | null;
};

export type WorkflowOption = { id: number; type_code: string };
export type JobPositionOption = { id: number; name: string };
export type UserPositionOption = {
  id: number;
  app_user: { name: string | null; email: string | null } | null;
  job_position: { name: string } | null;
};

const initialState: ApprovalWorkflowStageFormState = { error: null };

function userPositionLabel(userPosition: UserPositionOption): string {
  const userLabel = userPosition.app_user?.name ?? userPosition.app_user?.email ?? `User Position #${userPosition.id}`;
  const positionLabel = userPosition.job_position?.name ?? '—';
  return `${userLabel} — ${positionLabel}`;
}

export function ApprovalWorkflowStageForm({
  stage,
  workflows,
  jobPositions,
  userPositions,
  action,
  submitLabel,
  readOnly = false,
}: {
  stage?: ApprovalWorkflowStage;
  workflows: WorkflowOption[];
  jobPositions: JobPositionOption[];
  userPositions: UserPositionOption[];
  action: (
    prevState: ApprovalWorkflowStageFormState,
    formData: FormData,
  ) => Promise<ApprovalWorkflowStageFormState>;
  submitLabel: string;
  readOnly?: boolean;
}) {
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="mt-6 max-w-md space-y-4">
      <div className="space-y-1">
        <label htmlFor="workflow_id" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Workflow
        </label>
        <select
          id="workflow_id"
          name="workflow_id"
          required
          defaultValue={stage?.workflow_id ?? ''}
          disabled={readOnly}
          className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-950 focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-600/40 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
        >
          <option value="" disabled>
            Select a workflow
          </option>
          {workflows.map((workflow) => (
            <option key={workflow.id} value={workflow.id}>
              Workflow #{workflow.id} ({workflow.type_code})
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-1">
        <label htmlFor="level" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Level
        </label>
        <input
          id="level"
          name="level"
          type="number"
          step="1"
          min="0"
          required
          defaultValue={stage?.level}
          disabled={readOnly}
          className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-950 focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-600/40 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
        />
      </div>

      <div className="space-y-1">
        <label htmlFor="job_position_id" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Job position
        </label>
        <select
          id="job_position_id"
          name="job_position_id"
          defaultValue={stage?.job_position_id ?? ''}
          disabled={readOnly}
          className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-950 focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-600/40 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
        >
          <option value="">No job position</option>
          {jobPositions.map((jobPosition) => (
            <option key={jobPosition.id} value={jobPosition.id}>
              {jobPosition.name}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-1">
        <label htmlFor="user_position_id" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          User position
        </label>
        <select
          id="user_position_id"
          name="user_position_id"
          defaultValue={stage?.user_position_id ?? ''}
          disabled={readOnly}
          className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-950 focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-600/40 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
        >
          <option value="">No user position</option>
          {userPositions.map((userPosition) => (
            <option key={userPosition.id} value={userPosition.id}>
              {userPositionLabel(userPosition)}
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
