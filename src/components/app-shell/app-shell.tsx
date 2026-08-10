'use client';

import { useState, type ReactNode } from 'react';
import { Sidebar } from './sidebar';
import { Topbar } from './topbar';
import { SIDEBAR_COOKIE } from './constants';

export function AppShell({
  children,
  email,
  initialCollapsed,
  signOut,
}: {
  children: ReactNode;
  email: string | undefined;
  /** Server-rendered from the cookie, so the first paint is already correct. */
  initialCollapsed: boolean;
  signOut: () => Promise<void>;
}) {
  const [collapsed, setCollapsed] = useState(initialCollapsed);

  function toggle() {
    const next = !collapsed;
    setCollapsed(next);
    // Persist locally rather than via a Server Action — toggling the sidebar
    // shouldn't cost a server round trip. One year, root path.
    document.cookie = `${SIDEBAR_COOKIE}=${next}; path=/; max-age=31536000; SameSite=Lax`;
  }

  return (
    <div className="flex h-screen overflow-hidden bg-zinc-50 dark:bg-black">
      <Sidebar collapsed={collapsed} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar
          email={email}
          collapsed={collapsed}
          onToggle={toggle}
          signOut={signOut}
        />
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
