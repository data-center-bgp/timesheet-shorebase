/**
 * Shared by the server layout (which reads it) and the client shell (which
 * writes it). Kept in its own module with no `'use client'` directive — a
 * Server Component importing this from a client module gets a client
 * reference instead of the string, silently breaking the cookie lookup.
 */
export const SIDEBAR_COOKIE = 'sidebar-collapsed';
