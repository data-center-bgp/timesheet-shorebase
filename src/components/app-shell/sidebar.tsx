'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { NAV_GROUPS, type NavItem } from './nav';

function ItemRow({
  item,
  collapsed,
  active,
}: {
  item: NavItem;
  collapsed: boolean;
  active: boolean;
}) {
  const Icon = item.icon;

  const shared = [
    'flex items-center gap-3 rounded-md px-3 py-1.5 text-sm transition-colors',
    collapsed ? 'justify-center px-0' : '',
  ].join(' ');

  // The teal left edge marks the current line, like a checked row on a manifest.
  const marker = active
    ? 'before:absolute before:left-0 before:top-1.5 before:bottom-1.5 before:w-0.5 before:rounded-full before:bg-teal-600 dark:before:bg-teal-400'
    : '';

  if (!item.href) {
    return (
      <span
        aria-disabled="true"
        title={collapsed ? `${item.label} (not built yet)` : 'Not built yet'}
        className={`${shared} cursor-not-allowed text-zinc-400 dark:text-zinc-600`}
      >
        <Icon className="size-4 shrink-0" aria-hidden="true" />
        {!collapsed && <span className="truncate">{item.label}</span>}
      </span>
    );
  }

  return (
    <Link
      href={item.href}
      aria-current={active ? 'page' : undefined}
      title={collapsed ? item.label : undefined}
      className={`relative ${shared} ${marker} ${
        active
          ? 'bg-teal-50 font-medium text-teal-800 dark:bg-teal-950/40 dark:text-teal-300'
          : 'text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-900'
      } focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600/40`}
    >
      <Icon className="size-4 shrink-0" aria-hidden="true" />
      {!collapsed && <span className="truncate">{item.label}</span>}
    </Link>
  );
}

export function Sidebar({ collapsed }: { collapsed: boolean }) {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Main"
      className={`${
        collapsed ? 'w-16' : 'w-60'
      } scrollbar-subtle shrink-0 overflow-y-auto border-r border-zinc-200 bg-white transition-[width] duration-200 dark:border-zinc-800 dark:bg-zinc-950`}
    >
      <div
        className={`sticky top-0 z-10 flex h-14 items-center border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950 ${
          collapsed ? 'justify-center' : 'px-4'
        }`}
      >
        <span className="font-mono text-xs font-medium tracking-[0.2em] text-teal-700 dark:text-teal-400">
          {collapsed ? 'SB' : 'SHOREBASE'}
        </span>
      </div>

      <div className="space-y-5 px-2 py-3">
        {NAV_GROUPS.map((group) => (
          <div key={group.label}>
            {collapsed ? (
              <div
                aria-hidden="true"
                className="mx-3 mb-2 border-t border-zinc-200 dark:border-zinc-800"
              />
            ) : (
              <p className="mb-1 px-3 font-mono text-[10px] font-medium uppercase tracking-[0.18em] text-zinc-400 dark:text-zinc-500">
                {group.label}
              </p>
            )}
            <div className="space-y-0.5">
              {group.items.map((item) => (
                <ItemRow
                  key={item.label}
                  item={item}
                  collapsed={collapsed}
                  active={!!item.href && item.href === pathname}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </nav>
  );
}
