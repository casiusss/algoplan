// PHASE-8 D-2 / B-04: workspace-scoped localStorage migration hook.
//
// Companion to Plan 08-00's migrateWorkspaceScopedKeys helper. Wired from
// each app's workspace route layout (apps/web, apps/desktop) so legacy
// multica_*:<slug> and multica:*:<slug> keys migrate to algoplan_*:<slug>
// once the user's workspace list is known.
//
// Idempotent at TWO levels:
//   1. Plan 08-00 helper itself (set-then-delete; conflict rule keeps new)
//   2. This hook's module-level processedSlugs Set (skip already-migrated slugs)
//
// SAFE TO CALL ON EVERY RENDER. The hook short-circuits when slugs is empty
// and when every slug has already been processed in this process.

import { useEffect } from "react";
import type { StorageAdapter } from "../types/storage";
import { migrateWorkspaceScopedKeys } from "./localstorage";
import { defaultStorage } from "../platform/storage";

/** Module-level Set tracks slugs processed in this process lifetime. */
const processedSlugs = new Set<string>();

/**
 * One-shot per-slug migration of workspace-scoped legacy localStorage keys.
 *
 * Called from WorkspaceRouteLayout (web + desktop). Without an explicit
 * adapterOverride, uses the shared defaultStorage singleton (wraps
 * window.localStorage in browsers; in-memory/null in SSR).
 *
 * @param workspaceSlugs - Slug list from the workspace list query.
 * @param adapterOverride - TEST-ONLY: inject a custom storage adapter.
 */
export function useWorkspaceStorageMigration(
  workspaceSlugs: readonly string[],
  adapterOverride?: StorageAdapter,
): void {
  useEffect(() => {
    const slugsToMigrate = workspaceSlugs.filter((s) => !processedSlugs.has(s));
    if (slugsToMigrate.length === 0) return;

    const adapter = adapterOverride ?? defaultStorage;
    migrateWorkspaceScopedKeys(adapter, slugsToMigrate);

    for (const slug of slugsToMigrate) {
      processedSlugs.add(slug);
    }
  }, [workspaceSlugs, adapterOverride]);
}

/** TEST-ONLY: clear the per-process dedupe state. NEVER call from production. */
export function __resetMigrationState(): void {
  processedSlugs.clear();
}
