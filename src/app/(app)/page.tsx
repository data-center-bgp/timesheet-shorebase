export default function Home() {
  return (
    <div className="px-6 py-8">
      <p className="font-mono text-xs font-medium tracking-[0.2em] text-zinc-500 dark:text-zinc-400">
        DASHBOARD
      </p>
      <h2 className="mt-1 text-2xl font-semibold text-zinc-950 dark:text-zinc-50">
        Shorebase Timesheet
      </h2>
      <p className="mt-4 max-w-prose text-zinc-600 dark:text-zinc-400">
        Navigation is in place. Sections appear in the sidebar as they&apos;re
        built — greyed-out items aren&apos;t available yet.
      </p>
    </div>
  );
}
