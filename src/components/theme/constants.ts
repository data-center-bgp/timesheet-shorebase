/**
 * Kept free of `'use client'` so the server layout can import the raw value.
 * (A Server Component importing from a client module gets a client reference,
 * not the string — the same trap that silently broke the sidebar cookie.)
 */
export const THEME_COOKIE = 'theme';

export type Theme = 'light' | 'dark';

/**
 * Runs before first paint, and only when no theme cookie is set — i.e. a
 * visitor's very first load. Falls back to the OS preference so someone on a
 * dark desktop doesn't get a white flash before choosing anything. Once they
 * use the toggle, the cookie takes over and this is a no-op.
 */
export const THEME_INIT_SCRIPT = `
(function () {
  try {
    if (document.cookie.indexOf('${THEME_COOKIE}=') !== -1) return;
    if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      document.documentElement.classList.add('dark');
    }
  } catch (e) {}
})();
`;
