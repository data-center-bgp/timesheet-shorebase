import { createClient } from '@/lib/supabase/server';

type StatCard = {
  label: string;
  href: string;
  count: number | null;
  error: string | null;
};

type StatSection = {
  label: string;
  cards: StatCard[];
};

async function countActive(
  supabase: Awaited<ReturnType<typeof createClient>>,
  table: string,
  activeColumn: string,
  statusFilter?: { column: string; value: string },
): Promise<{ count: number | null; error: string | null }> {
  let query = supabase.from(table).select('*', { count: 'exact', head: true }).eq(activeColumn, true);
  if (statusFilter) {
    query = query.eq(statusFilter.column, statusFilter.value);
  }
  const { count, error } = await query;
  return { count: count ?? null, error: error?.message ?? null };
}

export default async function Home() {
  const supabase = await createClient();

  const [
    timesheets,
    planActivities,
    actualActivities,
    materialHandlingJobs,
    approvalWorkflows,
    approvals,
    summaryTimesheets,
    companies,
    contracts,
    contractServices,
    subcontractors,
    equipment,
    jettyShips,
    products,
    persons,
    jobPositions,
    userPositions,
  ] = await Promise.all([
    countActive(supabase, 'timesheet', 'active'),
    countActive(supabase, 'activity', 'active', { column: 'status_code', value: 'P' }),
    countActive(supabase, 'activity', 'active', { column: 'status_code', value: 'A' }),
    countActive(supabase, 'material_handling_job', 'active'),
    countActive(supabase, 'approval_workflow', 'active'),
    countActive(supabase, 'approval', 'active'),
    countActive(supabase, 'summary_timesheet', 'active'),
    countActive(supabase, 'company', 'active'),
    countActive(supabase, 'contract', 'active'),
    countActive(supabase, 'contract_service', 'active'),
    countActive(supabase, 'subcontractors', 'active'),
    countActive(supabase, 'equipment', 'active'),
    countActive(supabase, 'jetty_ship', 'active'),
    countActive(supabase, 'product', 'active'),
    countActive(supabase, 'person', 'is_active'),
    countActive(supabase, 'job_position', 'active'),
    countActive(supabase, 'user_position', 'active'),
  ]);

  const sections: StatSection[] = [
    {
      label: 'Operations',
      cards: [
        { label: 'Timesheets', href: '/timesheets', ...timesheets },
        { label: 'Plan Activities', href: '/activities', ...planActivities },
        { label: 'Actual Activities', href: '/actual-activities', ...actualActivities },
        { label: 'Material Handling Jobs', href: '/material-handling-jobs', ...materialHandlingJobs },
      ],
    },
    {
      label: 'Approvals & Billing',
      cards: [
        { label: 'Approval Workflows', href: '/approval-workflows', ...approvalWorkflows },
        { label: 'Approvals', href: '/approvals', ...approvals },
        { label: 'Summary Timesheets', href: '/summary-timesheets', ...summaryTimesheets },
      ],
    },
    {
      label: 'Master Data',
      cards: [
        { label: 'Companies', href: '/companies', ...companies },
        { label: 'Contracts', href: '/contracts', ...contracts },
        { label: 'Contract Services', href: '/contract-services', ...contractServices },
        { label: 'Subcontractors', href: '/subcontractors', ...subcontractors },
        { label: 'Equipment', href: '/equipment', ...equipment },
        { label: 'Jetty & Ship', href: '/jetty-ships', ...jettyShips },
        { label: 'Products', href: '/products', ...products },
      ],
    },
    {
      label: 'People',
      cards: [
        { label: 'Persons', href: '/persons', ...persons },
        { label: 'Job Positions', href: '/job-positions', ...jobPositions },
        { label: 'User Positions', href: '/user-positions', ...userPositions },
      ],
    },
  ];

  return (
    <div className="px-6 py-8">
      <p className="font-mono text-xs font-medium tracking-[0.2em] text-zinc-500 dark:text-zinc-400">
        DASHBOARD
      </p>
      <h2 className="mt-1 text-2xl font-semibold text-zinc-950 dark:text-zinc-50">
        Shorebase Timesheet
      </h2>
      <p className="mt-4 max-w-prose text-zinc-600 dark:text-zinc-400">
        Active-record counts across every built section. Zero counts are expected wherever no real
        data has been entered yet.
      </p>

      <div className="mt-8 space-y-8">
        {sections.map((section) => (
          <div key={section.label}>
            <p className="mb-3 font-mono text-xs font-medium tracking-[0.18em] text-zinc-400 dark:text-zinc-500">
              {section.label.toUpperCase()}
            </p>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {section.cards.map((card) => (
                <a
                  key={card.href}
                  href={card.href}
                  className="rounded-lg border border-zinc-200 bg-white px-4 py-3 transition-colors hover:border-teal-300 hover:bg-teal-50/40 dark:border-zinc-800 dark:bg-zinc-950 dark:hover:border-teal-800 dark:hover:bg-teal-950/20"
                >
                  <p className="text-2xl font-semibold text-zinc-950 dark:text-zinc-50">
                    {card.error ? (
                      <span className="text-base font-normal text-red-600 dark:text-red-400">Error</span>
                    ) : (
                      (card.count ?? 0)
                    )}
                  </p>
                  <p className="mt-0.5 text-sm text-zinc-600 dark:text-zinc-400">{card.label}</p>
                </a>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
