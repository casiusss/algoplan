// PHASE-8 D-2: Storage key migration shim (local storage adapter). Idempotent + value-preserving.
// Consumed once at boot from packages/core/platform/core-provider.tsx (Plan 08-04).
// SAFE TO RE-RUN — second call is a no-op.

import type { StorageAdapter } from "../types/storage";

/**
 * Legacy → new key mapping. Source-of-truth list — Plan 08-04 must not add or
 * remove entries without coordinated update to packages/core/platform/storage-cleanup.ts.
 *
 * Underscore-prefixed: were `multica_*`. Colon-prefixed: were `multica:*`.
 */
export const LEGACY_KEY_MAP: ReadonlyArray<readonly [legacy: string, current: string]> = [
  // Global (not workspace-scoped)
  ["multica_theme", "algoplan_theme"],
  ["multica_token", "algoplan_token"],
  ["multica:chat:width", "algoplan:chat:width"],
  ["multica:chat:height", "algoplan:chat:height"],
  ["multica:chat:focusMode", "algoplan:chat:focusMode"],
] as const;

/**
 * Workspace-scoped legacy keys. Stored on disk as `${legacy}:${workspaceSlug}`.
 * Plan 08-04 calls migrateWorkspaceScopedKeys(adapter, slugs) once it has the
 * authenticated user's workspace list.
 */
export const WORKSPACE_SCOPED_LEGACY_KEY_MAP: ReadonlyArray<readonly [legacy: string, current: string]> = [
  ["multica_issue_draft", "algoplan_issue_draft"],
  ["multica_issues_view", "algoplan_issues_view"],
  ["multica_issues_scope", "algoplan_issues_scope"],
  ["multica_my_issues_view", "algoplan_my_issues_view"],
  ["multica_navigation", "algoplan_navigation"],
  ["multica:chat:selectedAgentId", "algoplan:chat:selectedAgentId"],
  ["multica:chat:activeSessionId", "algoplan:chat:activeSessionId"],
  ["multica:chat:drafts", "algoplan:chat:drafts"],
  ["multica:chat:expanded", "algoplan:chat:expanded"],
] as const;

export interface MigrationReport {
  migrated: string[];                          // new key names that were written
  skipped: { key: string; reason: string }[];  // legacy keys NOT migrated, with reason
  total: number;                               // migrated.length + skipped.length
}

/**
 * Migrate global (non-workspace-scoped) legacy keys. Idempotent.
 *
 * Conflict rule: if both legacy and new key exist, KEEP new, DELETE legacy,
 * report as skipped (reason "destination exists"). Rationale: a value already
 * exists under the new name → boot order has already populated it; legacy is stale.
 */
export function migrateLocalStorage(adapter: StorageAdapter): MigrationReport {
  const report: MigrationReport = { migrated: [], skipped: [], total: 0 };
  for (const [legacy, current] of LEGACY_KEY_MAP) {
    const legacyValue = adapter.getItem(legacy);
    if (legacyValue === null) continue; // nothing to migrate
    report.total += 1;
    const currentValue = adapter.getItem(current);
    if (currentValue !== null) {
      adapter.removeItem(legacy);
      report.skipped.push({ key: legacy, reason: "destination exists" });
      continue;
    }
    adapter.setItem(current, legacyValue);
    adapter.removeItem(legacy);
    report.migrated.push(current);
  }
  return report;
}

/**
 * Migrate workspace-scoped legacy keys for a known set of workspace slugs.
 * Same conflict + idempotency semantics as migrateLocalStorage.
 */
export function migrateWorkspaceScopedKeys(
  adapter: StorageAdapter,
  workspaceSlugs: readonly string[],
): MigrationReport {
  const report: MigrationReport = { migrated: [], skipped: [], total: 0 };
  for (const [legacyBase, currentBase] of WORKSPACE_SCOPED_LEGACY_KEY_MAP) {
    for (const slug of workspaceSlugs) {
      const legacy = `${legacyBase}:${slug}`;
      const current = `${currentBase}:${slug}`;
      const legacyValue = adapter.getItem(legacy);
      if (legacyValue === null) continue;
      report.total += 1;
      const currentValue = adapter.getItem(current);
      if (currentValue !== null) {
        adapter.removeItem(legacy);
        report.skipped.push({ key: legacy, reason: "destination exists" });
        continue;
      }
      adapter.setItem(current, legacyValue);
      adapter.removeItem(legacy);
      report.migrated.push(current);
    }
  }
  return report;
}
