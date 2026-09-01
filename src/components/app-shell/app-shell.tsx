'use client';

import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { Sidebar } from './sidebar';
import { Topbar } from './topbar';
import { SIDEBAR_COOKIE } from './constants';
import type { Theme } from '@/components/theme/constants';

export function AppShell({
  children,
  displayName,
  initialCollapsed,
  signOut,
  serverTheme,
  isMaster,
}: {
  children: ReactNode;
  displayName: string | undefined;
  /** Server-rendered from the cookie, so the first paint is already correct. */
  initialCollapsed: boolean;
  signOut: () => Promise<void>;
  serverTheme: Theme;
  isMaster: boolean;
}) {
  const [collapsed, setCollapsed] = useState(initialCollapsed);

  const toggle = useCallback(() => {
    setCollapsed((current) => {
      const next = !current;
      // Persist locally rather than via a Server Action — toggling the sidebar
      // shouldn't cost a server round trip. One year, root path.
      document.cookie = `${SIDEBAR_COOKIE}=${next}; path=/; max-age=31536000; SameSite=Lax`;
      return next;
    });
  }, []);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'b') {
        event.preventDefault();
        toggle();
      }
    }

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [toggle]);

  return (
    <div className="flex h-screen overflow-hidden bg-zinc-50 dark:bg-black">
      <Sidebar collapsed={collapsed} isMaster={isMaster} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar
          displayName={displayName}
          collapsed={collapsed}
          onToggle={toggle}
          signOut={signOut}
          serverTheme={serverTheme}
        />
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
