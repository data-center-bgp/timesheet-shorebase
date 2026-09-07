import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { isManagerRole } from '@/lib/auth/require-master';

type PlanActivityRow = {
  id: number;
  code: string;
  active: boolean;
  plan_amount: number;
  plan_date: string;
  contract_service: { code: string; shorebase_service: { name: string } | null } | null;
  timesheet_type: { name: string } | null;
  subcontractors: { company: { name: string } | null } | null;
};

export default async function ActivitiesPage() {
  const isManager = await isManagerRole();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('activity')
    .select(
      'id, code, active, plan_amount, plan_date, contract_service(code, shorebase_service(name)), timesheet_type(name), subcontractors(company(name))',
    )
    .eq('status_code', 'P')
    .order('plan_date', { ascending: true });

  const activities = (data ?? []) as unknown as PlanActivityRow[];

  return (
    <div className="px-6 py-8">
      <div className="flex items-center justify-between">
        <div>
          <p className="font-mono text-xs font-medium tracking-[0.2em] text-zinc-500 dark:text-zinc-400">
            OPERATIONS
          </p>
          <h2 className="mt-1 text-2xl font-semibold text-zinc-950 dark:text-zinc-50">
            Activities
          </h2>
        </div>
        {!isManager && (
          <Link
            href="/activities/new"
            className="rounded-md bg-teal-700 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-teal-800 dark:bg-teal-600 dark:hover:bg-teal-500"
          >
            Add activity
          </Link>
        )}
      </div>

      {error && (
        <p role="alert" className="mt-4 text-sm text-red-600 dark:text-red-400">
          Couldn&apos;t load activities: {error.message}
        </p>
      )}

      {!error && activities.length === 0 && (
        <p className="mt-4 max-w-prose text-zinc-600 dark:text-zinc-400">
          No activities yet. Add your first one to get started.
        </p>
      )}

      {!error && activities.length > 0 && (
        <div className="mt-6 overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800">
          <table className="w-full text-sm">
            <thead className="border-b border-zinc-200 bg-zinc-50 text-left text-xs font-medium uppercase tracking-wide text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
              <tr>
                <th className="px-4 py-2">Code</th>
                <th className="px-4 py-2">Contract Service</th>
                <th className="px-4 py-2">Timesheet Type</th>
                <th className="px-4 py-2">Subcontractor</th>
                <th className="px-4 py-2">Plan amount</th>
                <th className="px-4 py-2">Plan date</th>
                <th className="px-4 py-2">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {activities.map((activity) => {
                const { active } = activity;
                return (
                  <tr key={activity.id}>
                    <td className="px-4 py-2 font-medium text-zinc-900 dark:text-zinc-100">
                      <Link href={`/activities/${activity.id}/edit`} className="hover:underline">
                        {activity.code}
                      </Link>
                    </td>
                    <td className="px-4 py-2 text-zinc-600 dark:text-zinc-400">
                      {activity.contract_service
                        ? `${activity.contract_service.code} — ${activity.contract_service.shorebase_service?.name ?? '—'}`
                        : '—'}
                    </td>
                    <td className="px-4 py-2 text-zinc-600 dark:text-zinc-400">
                      {activity.timesheet_type?.name ?? '—'}
                    </td>
                    <td className="px-4 py-2 text-zinc-600 dark:text-zinc-400">
                      {activity.subcontractors?.company?.name ?? '—'}
                    </td>
                    <td className="px-4 py-2 text-zinc-600 dark:text-zinc-400">{activity.plan_amount}</td>
                    <td className="px-4 py-2 text-zinc-600 dark:text-zinc-400">{activity.plan_date}</td>
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
