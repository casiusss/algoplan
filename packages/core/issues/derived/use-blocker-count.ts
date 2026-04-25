"use client";

/**
 * v1 stub — read-only mock for the topbar BlockerBadge.
 * Returns literal 0 (primitive auto-stable across renders).
 *
 * v2: wire to backend "blocker" field per FTR-03 (currently out of scope).
 * The wsId parameter is reserved for v2 so consumers don't have to change
 * their call sites when the real implementation lands.
 */
export function useBlockerCount(_wsId: string | undefined): number {
  return 0;
}
