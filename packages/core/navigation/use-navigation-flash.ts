import { useEffect } from "react";
import { toast } from "sonner";

/**
 * `useNavigationFlash` — sessionStorage-backed flash toasts that survive a
 * single navigation.
 *
 * Set a flash before navigating (`setFlash(key, message)`); the destination
 * page calls `useNavigationFlash(key)` and the message is consumed once on
 * mount and shown via Sonner. Use it for "Passwort aktualisiert. Bitte melde
 * dich an." after `/auth/reset-password` → `/auth/login`, where the toast
 * must outlive the route change.
 *
 * **CLAUDE.md note:** `packages/core/` forbids direct DOM access. We bend
 * that rule here for two reasons:
 *  1. Sonner already requires a browser DOM, so the function is browser-only
 *     by transitive dependency.
 *  2. All sessionStorage calls are guarded with `typeof window !== "undefined"`
 *     so SSR (Next.js server components) never trips on a missing global.
 *
 * The functions are intentionally non-store: a Zustand store would persist
 * across navigations indefinitely, defeating the "consume on mount" semantics
 * we want for one-shot toasts.
 */

const FLASH_PREFIX = "algoplan_flash:";

function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof sessionStorage !== "undefined";
}

/** Stash a message under `key` until the next consumer reads it. */
export function setFlash(key: string, message: string): void {
  if (!isBrowser()) return;
  sessionStorage.setItem(`${FLASH_PREFIX}${key}`, message);
}

/** Read-and-remove the flash for `key`. Returns `null` when nothing is set. */
export function consumeFlash(key: string): string | null {
  if (!isBrowser()) return null;
  const fullKey = `${FLASH_PREFIX}${key}`;
  const value = sessionStorage.getItem(fullKey);
  if (value !== null) sessionStorage.removeItem(fullKey);
  return value;
}

/**
 * Hook variant: consumes the flash for `key` on mount and fires a Sonner
 * toast if a message was present. Re-runs only when `key` changes.
 */
export function useNavigationFlash(key: string): void {
  useEffect(() => {
    const message = consumeFlash(key);
    if (message) toast(message);
  }, [key]);
}
