import { notFound } from 'next/navigation';
import { findNavItem } from '@/components/app-shell/nav';

/**
 * Catches every sidebar item that doesn't have a real page yet. As real
 * pages get built (e.g. src/app/(app)/companies/page.tsx), Next.js routes
 * their exact path there instead of here automatically - nothing to clean
 * up in this file when that happens.
 *
 * Paths that aren't a known nav item (a typo, an old bookmark) 404 instead
 * of silently showing "coming soon".
 */
export default async function ComingSoonPage(props: PageProps<'/[section]'>) {
  const { section } = await props.params;
  const item = findNavItem(`/${section}`);

  if (!item) {
    notFound();
  }

  return (
    <div className="px-6 py-8">
      <p className="font-mono text-xs font-medium tracking-[0.2em] text-zinc-500 dark:text-zinc-400">
        {item.label.toUpperCase()}
      </p>
      <h2 className="mt-1 text-2xl font-semibold text-zinc-950 dark:text-zinc-50">
        Coming soon
      </h2>
      <p className="mt-4 max-w-prose text-zinc-600 dark:text-zinc-400">
        {item.label} hasn&apos;t been built yet.
      </p>
    </div>
  );
}
