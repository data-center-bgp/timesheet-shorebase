import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';

type ApprovalWorkflowStageRow = {
  id: number;
  workflow_id: number;
  level: number;
  active: boolean;
  job_position: { name: string } | null;
  user_position: { app_user: { name: string | null; email: string | null } | null } | null;
};

export default async function ApprovalWorkflowStagesPage() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('approval_workflow_stage')
    .select('id, workflow_id, level, active, job_position(name), user_position(app_user(name, email))')
    .order('workflow_id', { ascending: true })
    .order('level', { ascending: true });

  const stages = (data ?? []) as unknown as ApprovalWorkflowStageRow[];

  return (
    <div className="px-6 py-8">
      <div className="flex items-center justify-between">
        <div>
          <p className="font-mono text-xs font-medium tracking-[0.2em] text-zinc-500 dark:text-zinc-400">
            APPROVALS &amp; BILLING
          </p>
          <h2 className="mt-1 text-2xl font-semibold text-zinc-950 dark:text-zinc-50">
            Workflow Stages
          </h2>
        </div>
        <Link
          href="/approval-workflow-stages/new"
          className="rounded-md bg-teal-700 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-teal-800 dark:bg-teal-600 dark:hover:bg-teal-500"
        >
          Add stage
        </Link>
      </div>

      {error && (
        <p role="alert" className="mt-4 text-sm text-red-600 dark:text-red-400">
          Couldn&apos;t load workflow stages: {error.message}
        </p>
      )}

      {!error && stages.length === 0 && (
        <p className="mt-4 max-w-prose text-zinc-600 dark:text-zinc-400">
          No workflow stages yet. Add your first one to get started.
        </p>
      )}

      {!error && stages.length > 0 && (
        <div className="mt-6 overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800">
          <table className="w-full text-sm">
            <thead className="border-b border-zinc-200 bg-zinc-50 text-left text-xs font-medium uppercase tracking-wide text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
              <tr>
                <th className="px-4 py-2">Stage</th>
                <th className="px-4 py-2">Job Position</th>
                <th className="px-4 py-2">User Position</th>
                <th className="px-4 py-2">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {stages.map((stage) => {
                const { active } = stage;
                return (
                  <tr key={stage.id}>
                    <td className="px-4 py-2 font-medium text-zinc-900 dark:text-zinc-100">
                      <Link href={`/approval-workflow-stages/${stage.id}/edit`} className="hover:underline">
                        Level {stage.level} — Workflow #{stage.workflow_id}
                      </Link>
                    </td>
                    <td className="px-4 py-2 text-zinc-600 dark:text-zinc-400">
                      {stage.job_position?.name ?? '—'}
                    </td>
                    <td className="px-4 py-2 text-zinc-600 dark:text-zinc-400">
                      {stage.user_position?.app_user?.name ?? stage.user_position?.app_user?.email ?? '—'}
                    </td>
                    <td className="px-4 py-2">
                      <span
                        className={
                          active
                            ? 'rounded-full bg-teal-50 px-2 py-0.5 text-xs font-medium text-teal-800 dark:bg-teal-950/40 dark:text-teal-300'
                            : 'rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400'
                        }
                      >
                        {active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
