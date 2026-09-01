export type BarDatum = {
  label: string;
  href: string;
  count: number;
};

/**
 * One shared scale across every bar (not re-based per section) - so a
 * reader can honestly compare "18 Contract Services" against "0
 * Timesheets" on the same axis, rather than each section silently
 * getting its own max and looking equally full.
 */
export function DashboardBarChart({ data }: { data: BarDatum[] }) {
  const maxCount = Math.max(...data.map((d) => d.count), 1);

  return (
    <div className="space-y-2">
      {data.map((d) => {
        const widthPct = (d.count / maxCount) * 100;
        return (
          <a
            key={d.href}
            href={d.href}
            className="group flex items-center gap-3 rounded-md px-1 py-0.5 hover:bg-zinc-50 dark:hover:bg-zinc-900"
          >
            <span className="w-40 shrink-0 truncate text-sm text-zinc-600 group-hover:text-zinc-900 dark:text-zinc-400 dark:group-hover:text-zinc-100">
              {d.label}
            </span>
            <span className="relative h-5 flex-1 rounded-full bg-zinc-100 dark:bg-zinc-800">
              <span
                className="absolute inset-y-0 left-0 rounded-full bg-teal-600 dark:bg-teal-500"
                style={{ width: `${Math.max(widthPct, d.count > 0 ? 2 : 0)}%` }}
              />
            </span>
            <span className="w-8 shrink-0 text-right text-sm font-medium tabular-nums text-zinc-900 dark:text-zinc-100">
              {d.count}
            </span>
          </a>
        );
      })}
    </div>
  );
}
