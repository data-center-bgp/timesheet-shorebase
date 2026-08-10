'use client';

import { usePathname } from 'next/navigation';
import { LogOut, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { ThemeToggle } from '@/components/theme/theme-toggle';
import type { Theme } from '@/components/theme/constants';
import { sectionTitle } from './nav';

export function Topbar({
  email,
  collapsed,
  onToggle,
  signOut,
  serverTheme,
}: {
  email: string | undefined;
  collapsed: boolean;
  onToggle: () => void;
  /** Server Action, passed down from the layout. */
  signOut: () => Promise<void>;
  serverTheme: Theme;
}) {
  const pathname = usePathname();
  const ToggleIcon = collapsed ? PanelLeftOpen : PanelLeftClose;

  return (
    <header className="flex h-14 shrink-0 items-center justify-between gap-4 border-b border-zinc-200 bg-white px-4 dark:border-zinc-800 dark:bg-zinc-950">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <button
          type="button"
          onClick={onToggle}
          title={`${collapsed ? 'Expand' : 'Collapse'} sidebar  (Ctrl+B)`}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          aria-expanded={!collapsed}
          aria-keyshortcuts="Control+B"
          className="shrink-0 rounded-md border border-zinc-300 p-1.5 text-zinc-600 transition-colors hover:bg-zinc-100 hover:text-zinc-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600/40 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-900 dark:hover:text-zinc-100"
        >
          <ToggleIcon className="size-4" aria-hidden="true" />
        </button>
        <h1 className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-100">
          {sectionTitle(pathname)}
        </h1>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        {email && (
          <span className="hidden max-w-[18rem] truncate font-mono text-xs text-zinc-500 lg:inline dark:text-zinc-400">
            {email}
          </span>
        )}
        <ThemeToggle serverTheme={serverTheme} />
        <form action={signOut}>
          <button
            type="submit"
            className="flex items-center gap-1.5 whitespace-nowrap rounded-md border border-zinc-300 px-2.5 py-1.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600/40 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-900"
          >
            <LogOut className="size-3.5" aria-hidden="true" />
            <span className="hidden sm:inline">Log out</span>
          </button>
        </form>
      </div>
    </header>
  );
}
