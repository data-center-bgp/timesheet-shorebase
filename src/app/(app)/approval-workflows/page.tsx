import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { isManagerRole } from '@/lib/auth/require-master';

type ApprovalWorkflowRow = {
  id: number;
  type_code: string;
  start_date: string;
  end_date: string;
  active: boolean;
  timesheet_type: { name: string } | null;
  contract: { contract_name: string } | null;
  subcontractors: { company: { name: string } | null } | null;
  company: { name: string } | null;
};

export default async function ApprovalWorkflowsPage() {
  const isManager = await isManagerRole();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('approval_workflow')
    .select(
      'id, type_code, start_date, end_date, active, timesheet_type(name), contract(contract_name), subcontractors(company(name)), company(name)',
    )
    .order('id', { ascending: true });

  const workflows = (data ?? []) as unknown as ApprovalWorkflowRow[];

  return (
    <div className="px-6 py-8">
      <div className="flex items-center justify-between">
        <div>
          <p className="font-mono text-xs font-medium tracking-[0.2em] text-zinc-500 dark:text-zinc-400">
            APPROVALS &amp; BILLING
          </p>
          <h2 className="mt-1 text-2xl font-semibold text-zinc-950 dark:text-zinc-50">
            Approval Workflows
          </h2>
        </div>
        {!isManager && (
          <Link
            href="/approval-workflows/new"
            className="rounded-md bg-teal-700 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-teal-800 dark:bg-teal-600 dark:hover:bg-teal-500"
          >
            Add workflow
          </Link>
        )}
      </div>

      {error && (
        <p role="alert" className="mt-4 text-sm text-red-600 dark:text-red-400">
          Couldn&apos;t load approval workflows: {error.message}
        </p>
      )}

      {!error && workflows.length === 0 && (
        <p className="mt-4 max-w-prose text-zinc-600 dark:text-zinc-400">
          No approval workflows yet. Add your first one to get started.
        </p>
      )}

      {!error && workflows.length > 0 && (
        <div className="mt-6 overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800">
          <table className="w-full text-sm">
            <thead className="border-b border-zinc-200 bg-zinc-50 text-left text-xs font-medium uppercase tracking-wide text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
              <tr>
                <th className="px-4 py-2">Workflow</th>
                <th className="px-4 py-2">Timesheet Type</th>
                <th className="px-4 py-2">Contract</th>
                <th className="px-4 py-2">Subcontractor</th>
                <th className="px-4 py-2">Company</th>
                <th className="px-4 py-2">Effective</th>
                <th className="px-4 py-2">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {workflows.map((workflow) => {
                const { active } = workflow;
                return (
                  <tr key={workflow.id}>
                    <td className="px-4 py-2 font-medium text-zinc-900 dark:text-zinc-100">
                      <Link href={`/approval-workflows/${workflow.id}/edit`} className="hover:underline">
                        Workflow #{workflow.id} ({workflow.type_code})
                      </Link>
                    </td>
                    <td className="px-4 py-2 text-zinc-600 dark:text-zinc-400">
                      {workflow.timesheet_type?.name ?? '—'}
                    </td>
                    <td className="px-4 py-2 text-zinc-600 dark:text-zinc-400">
                      {workflow.contract?.contract_name ?? '—'}
                    </td>
                    <td className="px-4 py-2 text-zinc-600 dark:text-zinc-400">
                      {workflow.subcontractors?.company?.name ?? '—'}
                    </td>
                    <td className="px-4 py-2 text-zinc-600 dark:text-zinc-400">
                      {workflow.company?.name ?? '—'}
                    </td>
                    <td className="px-4 py-2 text-zinc-600 dark:text-zinc-400">
                      {workflow.start_date} – {workflow.end_date}
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
