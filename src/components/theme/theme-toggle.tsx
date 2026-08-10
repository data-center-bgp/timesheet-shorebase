'use client';

import { useSyncExternalStore } from 'react';
import { Moon, Sun } from 'lucide-react';
import { THEME_COOKIE, type Theme } from './constants';

/**
 * The `.dark` class on <html> is the source of truth — it can be set by the
 * server (from the cookie) or by the pre-paint init script (from the OS
 * setting), neither of which React controls. Subscribing to it rather than
 * mirroring it into state keeps the button honest if it changes underneath us.
 */
function subscribe(onChange: () => void) {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['class'],
  });
  return () => observer.disconnect();
}

function getSnapshot(): Theme {
  return document.documentElement.classList.contains('dark') ? 'dark' : 'light';
}

export function ThemeToggle({ serverTheme }: { serverTheme: Theme }) {
  const theme = useSyncExternalStore(subscribe, getSnapshot, () => serverTheme);
  const nextTheme: Theme = theme === 'dark' ? 'light' : 'dark';

  function toggle() {
    // Read the class at click time rather than trusting `nextTheme` from the
    // last render — the observer-driven re-render is async, so back-to-back
    // clicks would otherwise both compute the same target and stick.
    const next: Theme = document.documentElement.classList.contains('dark')
      ? 'light'
      : 'dark';
    document.documentElement.classList.toggle('dark', next === 'dark');
    document.cookie = `${THEME_COOKIE}=${next}; path=/; max-age=31536000; SameSite=Lax`;
  }

  const Icon = theme === 'dark' ? Sun : Moon;

  return (
    <button
      type="button"
      onClick={toggle}
      title={`Switch to ${nextTheme} mode`}
      aria-label={`Switch to ${nextTheme} mode`}
      className="shrink-0 rounded-md border border-zinc-300 p-1.5 text-zinc-600 transition-colors hover:bg-zinc-100 hover:text-zinc-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600/40 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-900 dark:hover:text-zinc-100"
    >
      <Icon className="size-4" aria-hidden="true" />
    </button>
  );
}
