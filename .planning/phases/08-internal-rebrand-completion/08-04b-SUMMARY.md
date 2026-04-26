---
phase: 08-internal-rebrand-completion
plan: 04b
subsystem: storage-migration
tags: [localStorage, migration, workspace-scoped, react-hook, DRY]
dependency_graph:
  requires: [08-00, 08-03, 08-04]
  provides: [useWorkspaceStorageMigration, workspace-scoped-localStorage-migration]
  affects: [apps/web, apps/desktop, packages/core/chat, packages/core/platform]
tech_stack:
  added: []
  patterns: [module-level-Set-dedup, TDD-jsdom, StorageAdapter-override-test-seam]
key_files:
  created:
    - packages/core/migrations/use-workspace-storage-migration.ts
    - packages/core/migrations/use-workspace-storage-migration.test.tsx
  modified:
    - packages/core/migrations/index.ts
    - packages/core/package.json
    - apps/web/app/[workspaceSlug]/layout.tsx
    - apps/desktop/src/renderer/src/components/workspace-route-layout.tsx
    - packages/core/chat/store.ts
    - packages/core/platform/storage-cleanup.ts
    - packages/core/navigation/use-navigation-flash.ts
    - packages/views/modals/create-issue.tsx
    - packages/views/issues/components/issue-detail.tsx
    - packages/views/editor/utils/link-handler.ts
    - apps/desktop/src/renderer/src/components/desktop-layout.tsx
    - apps/web/app/manifest.ts
decisions:
  - useWorkspaceStorageMigration uses module-level Set<string> for per-slug dedup (not React state) so the idempotency guarantee survives re-renders without causing re-effects
  - adapterOverride test seam allows injecting a RecordingAdapter without importing the platform module — keeps the hook pure in tests
  - Test 6 (__resetMigrationState) tests isolation via two separate adapter instances because Plan 08-00 helper's conflict rule prevents overwriting an already-migrated destination key
metrics:
  duration: ~10min
  completed: "2026-04-26"
  tasks_completed: 2
  files_changed: 12
---

# Phase 8 Plan 04b: Workspace-Scoped localStorage Migration Hook Summary

Shared `useWorkspaceStorageMigration` hook wired into both app workspace route layouts — migrates 9 workspace-scoped multica_*:<slug> / multica:*:<slug> legacy keys to algoplan_*:<slug> once per process on first workspace mount.

## What Was Built

### Task 1: useWorkspaceStorageMigration hook + integration tests

- `packages/core/migrations/use-workspace-storage-migration.ts` — React hook that calls Plan 08-00's `migrateWorkspaceScopedKeys(adapter, slugs)` with a module-level `Set<string>` tracking already-processed slugs. Safe to call on every render — short-circuits when slug list is empty or fully-processed.
- `packages/core/migrations/use-workspace-storage-migration.test.tsx` — 6 integration tests (jsdom + @testing-library/react): no-op guard, basic migration (includes chat-prefix keys), idempotency, incremental slug addition, chat-prefix verbatim, __resetMigrationState isolation.
- `packages/core/migrations/index.ts` — barrel updated to export the new hook and test-only reset function.

**Commit:** `28671640`

### Task 2: Wire into apps + fix remaining legacy key literals

- `apps/web/app/[workspaceSlug]/layout.tsx` — imports `useWorkspaceStorageMigration` from `@algoplan/core/migrations`, adds `workspaceListOptions` query (cache hit), wraps slug array in `useMemo`, calls hook.
- `apps/desktop/src/renderer/src/components/workspace-route-layout.tsx` — same wire-up; reuses existing `wsList` query already present in the component.
- Added `"./migrations": "./migrations/index.ts"` to `packages/core/package.json` exports (blocked typecheck until fixed).
- All remaining `multica_*:` / `multica:*:` literal references in production source cleaned up (see Deviations).

**Commit:** `bb714a18`

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Missing ./migrations export in core package.json**
- **Found during:** Task 2 typecheck
- **Issue:** `@algoplan/core/migrations` unresolvable — TS2307 in web layout
- **Fix:** Added `"./migrations": "./migrations/index.ts"` to `packages/core/package.json` exports
- **Files modified:** `packages/core/package.json`
- **Commit:** bb714a18

**2. [Rule 1 - Bug] chat/store.ts still writing under multica:chat:* keys**
- **Found during:** Task 2 B-04 ship-gate preview grep
- **Issue:** Plan 08-04 renamed the imports/consumers but missed the constant definitions in chat/store.ts — after migration the store would immediately write back under the old key prefix, undoing the migration effect
- **Fix:** Renamed `AGENT_STORAGE_KEY`, `SESSION_STORAGE_KEY`, `DRAFTS_KEY`, `CHAT_WIDTH_KEY`, `CHAT_HEIGHT_KEY`, `CHAT_EXPANDED_KEY`, `FOCUS_MODE_KEY` constants from `multica:chat:*` to `algoplan:chat:*`
- **Files modified:** `packages/core/chat/store.ts`
- **Commit:** bb714a18

**3. [Rule 1 - Bug] storage-cleanup.ts listed old workspace-scoped key names**
- **Found during:** Task 2 B-04 ship-gate preview grep
- **Issue:** `clearWorkspaceStorage()` was deleting `multica_issue_draft:slug` etc. instead of the new `algoplan_issue_draft:slug` keys — workspace deletion cleanup would be a no-op
- **Fix:** Updated `WORKSPACE_SCOPED_KEYS` array to use `algoplan_*` / `algoplan:chat:*` names
- **Files modified:** `packages/core/platform/storage-cleanup.ts`
- **Commit:** bb714a18

**4. [Rule 2 - Missing] Remaining multica:* literal references would trip B-04 ship gate**
- **Found during:** Task 2 B-04 ship-gate preview grep
- **Issue:** `multica_flash:` prefix in navigation hook, `multica:backlog-agent-hint-dismissed` localStorage key in views, `multica:navigate` CustomEvent name in link-handler + desktop-layout, stale comment in manifest.ts
- **Fix:** Renamed all to `algoplan:*` equivalents. The CustomEvent rename is a coordinated change (dispatch in link-handler.ts + listener in desktop-layout.tsx updated atomically)
- **Files modified:** `packages/core/navigation/use-navigation-flash.ts`, `packages/views/modals/create-issue.tsx`, `packages/views/issues/components/issue-detail.tsx`, `packages/views/editor/utils/link-handler.ts`, `apps/desktop/src/renderer/src/components/desktop-layout.tsx`, `apps/web/app/manifest.ts`
- **Commit:** bb714a18

**5. [Rule 1 - Bug] Test 6 conceptually incorrect due to conflict rule**
- **Found during:** Task 1 TDD GREEN phase
- **Issue:** Test asserted `__resetMigrationState` → re-migration overwrites existing destination key. Plan 08-00 helper's conflict rule says "if destination exists, keep it and skip". Test was wrong.
- **Fix:** Rewrote test to use two separate adapter instances — first adapter proves the initial migration ran; second adapter proves migration is skipped without reset; after `__resetMigrationState()` the second adapter receives the expected migration
- **Files modified:** `packages/core/migrations/use-workspace-storage-migration.test.tsx`
- **Commit:** 28671640

## Known Stubs

None — all plan goals achieved. No placeholder values or unwired data sources.

## Threat Flags

| Flag | File | Description |
|------|------|-------------|
| threat_flag: event-rename | `packages/views/editor/utils/link-handler.ts` + `apps/desktop/src/renderer/src/components/desktop-layout.tsx` | `multica:navigate` CustomEvent renamed to `algoplan:navigate`. Any third-party code or browser extensions listening for the old event name will stop receiving it. Acceptable: this is an internal desktop-only IPC mechanism, not a public API. |

## Test Results

- `cd packages/core && pnpm exec vitest run migrations/` — 17 tests passed (2 files)
- `pnpm typecheck` — 0 new errors (pre-existing error in pageview-tracker.tsx unrelated to this plan)
- B-04 ship-gate preview — 0 `multica_*:` / `multica:*:` literals in production source

## Self-Check: PASSED

Files created:
- [x] packages/core/migrations/use-workspace-storage-migration.ts — FOUND
- [x] packages/core/migrations/use-workspace-storage-migration.test.tsx — FOUND

Commits:
- [x] 28671640 — FOUND
- [x] bb714a18 — FOUND
