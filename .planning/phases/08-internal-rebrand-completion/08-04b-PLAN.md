---
phase: 08-internal-rebrand-completion
plan: 04b
type: execute
wave: 2
depends_on: ["08-00", "08-03", "08-04"]
files_modified:
  - packages/core/migrations/use-workspace-storage-migration.ts
  - packages/core/migrations/use-workspace-storage-migration.test.tsx
  - packages/core/migrations/index.ts
  - apps/web/app/[workspaceSlug]/layout.tsx
  - apps/desktop/src/renderer/src/components/workspace-route-layout.tsx
autonomous: true
requirements: [RBR-08]
must_haves:
  truths:
    - "B-04 fix: workspace-scoped legacy localStorage keys (multica_issue_draft:<slug>, multica_issues_view:<slug>, multica_issues_scope:<slug>, multica_my_issues_view:<slug>, multica_navigation:<slug>, multica:chat:selectedAgentId:<slug>, multica:chat:activeSessionId:<slug>, multica:chat:drafts:<slug>, multica:chat:expanded:<slug>) are migrated to algoplan_*:<slug> / algoplan:*:<slug> on first workspace mount per logged-in session"
    - "Migration runs idempotently — second mount of the same workspace is a no-op (Plan 08-00's helper guarantees this; this plan asserts via integration test)"
    - "Migration runs from a shared hook (useWorkspaceStorageMigration) consumed by BOTH apps' workspace route layouts — DRY per global CLAUDE.md / project no-duplication rule"
    - "An integration test asserts: a workspace-mounted layout with adapter pre-populated with multica_issue_draft:foo=bar boots into algoplan_issue_draft:foo=bar after the layout effect runs (no value lost; legacy key removed)"
    - "Migration runs BEFORE any draft/view-state read (Zustand persistence in chat/store.ts and workspace-storage.ts read these keys via storage.getItem; if they read first, they would seed undefined and overwrite legacy on save). The hook fires inside useEffect with [wsList, currentSlug] deps, before the user can interact with drafts/filters in the new workspace."
  artifacts:
    - path: packages/core/migrations/use-workspace-storage-migration.ts
      provides: "useWorkspaceStorageMigration(workspaceSlugs: readonly string[]) — React hook that calls migrateWorkspaceScopedKeys(storage, slugs) once per process when slug list is non-empty"
      contains: "migrateWorkspaceScopedKeys"
    - path: packages/core/migrations/use-workspace-storage-migration.test.tsx
      provides: "Vitest + jsdom + @testing-library/react: pre-populate adapter with workspace-scoped multica_* keys, render a host component using the hook with a slug list, assert algoplan_*:slug values appear and multica_*:slug values are gone"
    - path: apps/web/app/[workspaceSlug]/layout.tsx
      provides: "Calls useWorkspaceStorageMigration(wsListSlugs) so workspace-scoped legacy keys migrate on first session"
    - path: apps/desktop/src/renderer/src/components/workspace-route-layout.tsx
      provides: "Same hook call as web — DRY enforced via the shared core hook"
  key_links:
    - from: apps/web/app/[workspaceSlug]/layout.tsx
      to: packages/core/migrations/use-workspace-storage-migration.ts
      via: "imports useWorkspaceStorageMigration from @algoplan/core/migrations"
      pattern: "useWorkspaceStorageMigration"
    - from: apps/desktop/src/renderer/src/components/workspace-route-layout.tsx
      to: packages/core/migrations/use-workspace-storage-migration.ts
      via: "imports useWorkspaceStorageMigration from @algoplan/core/migrations"
      pattern: "useWorkspaceStorageMigration"
---

<objective>
Close B-04. Plan 08-04 (sibling, same wave) flips global localStorage keys + wires the boot-time `migrateLocalStorage(storage)` call. This plan ships the workspace-scoped half: a shared React hook (`useWorkspaceStorageMigration`) that calls Plan 08-00's `migrateWorkspaceScopedKeys(storage, slugs)` exactly once per process when the user's workspace list is known. Both `apps/web` and `apps/desktop` workspace route layouts consume the hook — single source of truth.

Purpose: Without this plan, an existing user with `multica_issue_draft:acme=My-draft` in their browser localStorage loses that draft on first boot of v0.5.0 (the Zustand persistence in `packages/core/chat/store.ts` and the workspace-storage helpers read `algoplan_*:slug` per Plan 08-04 Task 1, see nothing, and the user starts with empty drafts/filters/views). D-2 in CONTEXT.md says migration "MUST migrate, never replace silently." This plan honors that contract for workspace-scoped keys.

Output: A shared `useWorkspaceStorageMigration` hook in `packages/core/migrations/`, an integration test in the same directory, and 2-line wire-ups in both apps' workspace route layouts. Plan 08-08's verify-rebrand.sh ship-gate (B-04 fix) will grep for any remaining `multica_*:` or `multica:*:` literal references in production source — must be zero.

This plan is Wave 2 — depends on 08-00 (helper exists), 08-03 (package rename so import path is `@algoplan/core/migrations`), and 08-04 (the shared `migrateLocalStorage` boot wire-up — keeps the lifecycle ordering clear: global keys migrate in initCore; workspace-scoped keys migrate in workspace mount). 08-04b runs strictly after 08-04 to avoid any race in the rare case both hooks fire before the first storage read.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/ROADMAP.md
@.planning/STATE.md
@.planning/phases/08-internal-rebrand-completion/08-CONTEXT.md
@.planning/phases/08-internal-rebrand-completion/08-00-SUMMARY.md
@.planning/phases/08-internal-rebrand-completion/08-03-SUMMARY.md
@.planning/phases/08-internal-rebrand-completion/08-04-SUMMARY.md
@CLAUDE.md
@packages/core/migrations/localstorage.ts
@packages/core/platform/storage-cleanup.ts
@packages/core/platform/storage.ts
@apps/web/app/[workspaceSlug]/layout.tsx
@apps/desktop/src/renderer/src/components/workspace-route-layout.tsx

<interfaces>
<!-- From Plan 08-00 (already shipped at this plan's wave): -->
```typescript
// packages/core/migrations/localstorage.ts
export function migrateWorkspaceScopedKeys(
  adapter: StorageAdapter,
  workspaceSlugs: readonly string[],
): MigrationReport;

export const WORKSPACE_SCOPED_LEGACY_KEY_MAP: ReadonlyArray<readonly [legacy: string, current: string]>;
```

<!-- The platform storage adapter (already in place): -->
```typescript
// packages/core/platform/storage.ts (or wherever default storage lives)
export const defaultStorage: StorageAdapter; // wraps window.localStorage in browser, in-memory in tests/SSR
```

<!-- The two host layouts that mount workspace context: -->
```typescript
// apps/web/app/[workspaceSlug]/layout.tsx — already fetches workspace list via React Query
// apps/desktop/src/renderer/src/components/workspace-route-layout.tsx — same
// Both have access to wsList from useQuery(workspaceListOptions()) and currentSlug.
// The shared hook accepts the slug array and dedupes per-process via a module-level boolean.
```

<!-- One-shot semantics: -->
<!-- The hook uses a module-level Set<string> to track which slug+wsId pairs have already been processed.
     Module-level state is fine because both apps reload the module on full-page reload (web: route change, desktop: app restart) — there is no hot-module-replacement state surviving a real boot.
     Test isolation: the hook exports a __resetMigrationState test-only function. -->
</interfaces>
</context>

<tasks>

<task type="auto" tdd="true">
  <name>Task 1: Create useWorkspaceStorageMigration hook + integration test, export from migrations barrel</name>
  <files>packages/core/migrations/use-workspace-storage-migration.ts, packages/core/migrations/use-workspace-storage-migration.test.tsx, packages/core/migrations/index.ts</files>
  <read_first>
    - packages/core/migrations/localstorage.ts (Plan 08-00 helper — confirms migrateWorkspaceScopedKeys signature and report shape)
    - packages/core/migrations/index.ts (barrel — must add the new hook export)
    - packages/core/platform/storage.ts (defaultStorage export)
    - packages/core/platform/workspace-storage.test.ts (reference pattern for testing workspace-scoped storage helpers — uses makeAdapter pattern)
    - packages/core/auth/store.test.ts (reference pattern for makeStorage / snapshot / vitest)
  </read_first>
  <behavior>
    - Test 1: empty slug list → hook is a no-op (no setItem/removeItem calls on adapter)
    - Test 2: slug list ["acme"] + adapter pre-populated with multica_issue_draft:acme="my-draft" → after first render, adapter has algoplan_issue_draft:acme="my-draft" AND multica_issue_draft:acme is removed
    - Test 3: idempotency — re-rendering the host component with the same slug list a second time does NOT trigger another migration (module-level dedup; hook returns early)
    - Test 4: slug list grows ["acme"] → ["acme", "beta"] — second render migrates ONLY the new "beta" workspace's keys; "acme" is not re-processed
    - Test 5: chat-prefix variant — multica:chat:drafts:acme="{}" migrates to algoplan:chat:drafts:acme="{}" (value verbatim)
    - Test 6: hook's __resetMigrationState (test-only) clears module-level state so each test starts fresh
  </behavior>
  <action>
**Step 1 — Create `packages/core/migrations/use-workspace-storage-migration.ts`:**

```typescript
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

const processedSlugs = new Set<string>();

/**
 * One-shot per-slug migration of workspace-scoped legacy localStorage keys.
 *
 * Called from WorkspaceRouteLayout (web + desktop). The hook does NOT take
 * the storage adapter as an argument — it imports the platform default so
 * both apps share the same storage instance (defaultStorage wraps
 * window.localStorage in browser; in SSR/tests it's an in-memory adapter).
 *
 * Test seam: pass an explicit adapter to override (test-only path).
 */
export function useWorkspaceStorageMigration(
  workspaceSlugs: readonly string[],
  adapterOverride?: StorageAdapter,
): void {
  useEffect(() => {
    const slugsToMigrate = workspaceSlugs.filter((s) => !processedSlugs.has(s));
    if (slugsToMigrate.length === 0) return;

    const adapter = adapterOverride ?? getDefaultStorageOrNull();
    if (adapter === null) return; // SSR / no platform storage — nothing to migrate

    migrateWorkspaceScopedKeys(adapter, slugsToMigrate);
    for (const slug of slugsToMigrate) processedSlugs.add(slug);
  }, [workspaceSlugs, adapterOverride]);
}

// Resolve defaultStorage lazily. Importing it at module top-level would couple
// this file to a side-effect-heavy import chain; the lazy require lets tests
// inject adapterOverride without paying for the platform import.
function getDefaultStorageOrNull(): StorageAdapter | null {
  try {
    // Dynamic require avoids ESM cycle issues; the platform module exports
    // defaultStorage as a singleton.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const platform = require("../platform/storage");
    return platform.defaultStorage ?? null;
  } catch {
    return null;
  }
}

/** TEST-ONLY: clear the per-process dedupe state. NEVER call from production. */
export function __resetMigrationState(): void {
  processedSlugs.clear();
}
```

If `require()` is not available in the project's ESM/Vite setup, replace `getDefaultStorageOrNull()` with a top-level `import { defaultStorage } from "../platform/storage"` — the platform module is safe to import (no react-dom, no DOM access at module load). Verify by reading `packages/core/platform/storage.ts` first; pick whichever import style matches the existing pattern.

**Step 2 — Create the integration test `packages/core/migrations/use-workspace-storage-migration.test.tsx`:**

```typescript
import { describe, expect, it, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";
import type { StorageAdapter } from "../types/storage";
import {
  useWorkspaceStorageMigration,
  __resetMigrationState,
} from "./use-workspace-storage-migration";

interface RecordingAdapter extends StorageAdapter {
  snapshot(): Record<string, string>;
}

function makeAdapter(initial: Record<string, string> = {}): RecordingAdapter {
  const data = { ...initial };
  return {
    getItem: (k) => data[k] ?? null,
    setItem: (k, v) => {
      data[k] = v;
    },
    removeItem: (k) => {
      delete data[k];
    },
    snapshot: () => ({ ...data }),
  };
}

beforeEach(() => {
  __resetMigrationState();
});

describe("useWorkspaceStorageMigration", () => {
  it("is a no-op when slug list is empty", () => {
    const adapter = makeAdapter({ multica_issue_draft: "should-stay-untouched" });
    renderHook(() => useWorkspaceStorageMigration([], adapter));
    expect(adapter.snapshot()).toEqual({ multica_issue_draft: "should-stay-untouched" });
  });

  it("migrates workspace-scoped legacy keys for the provided slugs", () => {
    const adapter = makeAdapter({
      "multica_issue_draft:acme": "my-draft",
      "multica_issues_view:acme": "kanban",
      "multica:chat:drafts:acme": '{"hello":"world"}',
      "untouched_key": "untouched-value",
    });
    renderHook(() => useWorkspaceStorageMigration(["acme"], adapter));
    const snap = adapter.snapshot();
    expect(snap["algoplan_issue_draft:acme"]).toBe("my-draft");
    expect(snap["algoplan_issues_view:acme"]).toBe("kanban");
    expect(snap["algoplan:chat:drafts:acme"]).toBe('{"hello":"world"}');
    expect(snap["multica_issue_draft:acme"]).toBeUndefined();
    expect(snap["multica_issues_view:acme"]).toBeUndefined();
    expect(snap["multica:chat:drafts:acme"]).toBeUndefined();
    expect(snap["untouched_key"]).toBe("untouched-value");
  });

  it("is idempotent — second render with same slug list does not re-process", () => {
    const adapter = makeAdapter({ "multica_navigation:acme": "/issues" });
    const { rerender } = renderHook(
      ({ slugs }) => useWorkspaceStorageMigration(slugs, adapter),
      { initialProps: { slugs: ["acme"] } },
    );
    expect(adapter.snapshot()["algoplan_navigation:acme"]).toBe("/issues");
    // Mutate adapter to simulate a stale-write that should NOT be reverted by a second migration call.
    adapter.setItem("multica_navigation:acme", "stale-write-after-migration");
    rerender({ slugs: ["acme"] });
    // The stale-write must remain, proving the second render skipped the already-processed slug.
    expect(adapter.snapshot()["multica_navigation:acme"]).toBe("stale-write-after-migration");
  });

  it("processes only newly-added slugs on subsequent renders", () => {
    const adapter = makeAdapter({
      "multica_issue_draft:acme": "draft-a",
      "multica_issue_draft:beta": "draft-b",
    });
    const { rerender } = renderHook(
      ({ slugs }) => useWorkspaceStorageMigration(slugs, adapter),
      { initialProps: { slugs: ["acme"] as readonly string[] } },
    );
    expect(adapter.snapshot()["algoplan_issue_draft:acme"]).toBe("draft-a");
    expect(adapter.snapshot()["multica_issue_draft:beta"]).toBe("draft-b"); // not yet migrated
    rerender({ slugs: ["acme", "beta"] });
    expect(adapter.snapshot()["algoplan_issue_draft:beta"]).toBe("draft-b");
    expect(adapter.snapshot()["multica_issue_draft:beta"]).toBeUndefined();
  });
});
```

**Step 3 — Update `packages/core/migrations/index.ts` barrel:**

Add the new hook to the existing exports created in Plan 08-00:

```typescript
export {
  migrateLocalStorage,
  migrateWorkspaceScopedKeys,
  LEGACY_KEY_MAP,
  WORKSPACE_SCOPED_LEGACY_KEY_MAP,
} from "./localstorage";
export type { MigrationReport } from "./localstorage";
export {
  useWorkspaceStorageMigration,
  __resetMigrationState,
} from "./use-workspace-storage-migration";
```

**Step 4 — Run the tests:**

```bash
cd packages/core && pnpm exec vitest run migrations/use-workspace-storage-migration.test.tsx --reporter=verbose
```

Expected: 4+ passing tests, zero failures.
  </action>
  <verify>
    <automated>cd packages/core && pnpm exec vitest run migrations/use-workspace-storage-migration.test.tsx</automated>
  </verify>
  <acceptance_criteria>
    - File `packages/core/migrations/use-workspace-storage-migration.ts` exists and exports `useWorkspaceStorageMigration` + `__resetMigrationState` (verify with `grep -cE 'export (function|const)' packages/core/migrations/use-workspace-storage-migration.ts` returns >= 2)
    - File imports `migrateWorkspaceScopedKeys` from sibling localstorage module (verify with `grep "migrateWorkspaceScopedKeys" packages/core/migrations/use-workspace-storage-migration.ts` returns >= 1)
    - File uses `useEffect` for the side effect (verify with `grep "useEffect" packages/core/migrations/use-workspace-storage-migration.ts` returns >= 1)
    - File does NOT import from `react-dom`, `next/*`, `react-router-dom` (package boundary rules — verify with `! grep -E '(from \"react-dom|from \"next/|from \"react-router-dom\")' packages/core/migrations/use-workspace-storage-migration.ts`)
    - Test file exists with at least 4 `it(` blocks (verify with `grep -c '  it(' packages/core/migrations/use-workspace-storage-migration.test.tsx` returns >= 4)
    - Vitest run passes (verify with `cd packages/core && pnpm exec vitest run migrations/use-workspace-storage-migration.test.tsx`)
    - Barrel `packages/core/migrations/index.ts` re-exports the new hook (verify with `grep "useWorkspaceStorageMigration" packages/core/migrations/index.ts` returns >= 1)
  </acceptance_criteria>
  <done>
    Shared hook exists with comprehensive test coverage (empty list, basic migration, idempotency, incremental slug list, value-verbatim preservation). Plan 08-08's verify-rebrand.sh B-04 grep gate will rely on the hook's wire-up in Task 2 — at this task's end, the hook is built and tested but not yet consumed.
  </done>
</task>

<task type="auto">
  <name>Task 2: Wire useWorkspaceStorageMigration into apps/web and apps/desktop workspace route layouts</name>
  <files>apps/web/app/[workspaceSlug]/layout.tsx, apps/desktop/src/renderer/src/components/workspace-route-layout.tsx</files>
  <read_first>
    - apps/web/app/[workspaceSlug]/layout.tsx (full file — find the existing useQuery for workspace list to know how to access wsList slugs)
    - apps/desktop/src/renderer/src/components/workspace-route-layout.tsx (full file — same)
    - packages/core/migrations/index.ts (confirm useWorkspaceStorageMigration export name)
    - packages/core/workspace/index.ts (or wherever workspaceListOptions is exported — confirms the wsList shape, specifically that each item has a `.slug` field)
  </read_first>
  <action>
**Step 1 — apps/web/app/[workspaceSlug]/layout.tsx:**

Both apps already call `useQuery({ ...workspaceListOptions(), enabled: !!user })` (or fetch the workspace list elsewhere). The layout currently:
- Resolves the URL slug to a workspace via `workspaceBySlugOptions`
- Calls `setCurrentWorkspace(slug, uuid)` once the workspace is available

ADD ONE import + ONE hook call:

```typescript
// At the top, alongside the other @algoplan/core imports (post Plan 08-03 rename):
import { useWorkspaceStorageMigration } from "@algoplan/core/migrations";

// Inside WorkspaceLayout, after the existing useQuery for the workspace list (or fetch wsList if not already present).
// Web layout already queries workspaceBySlugOptions; the wsList may not be queried at this layer.
// If wsList is NOT already available in this layout, add:
//
// import { workspaceListOptions } from "@algoplan/core/workspace";
// const { data: wsList } = useQuery({ ...workspaceListOptions(), enabled: !!user });
//
// Otherwise reuse the existing wsList variable.

const wsListSlugs = useMemo(
  () => (wsList ?? []).map((w) => w.slug),
  [wsList],
);
useWorkspaceStorageMigration(wsListSlugs);
```

`useMemo` keeps the slug-array reference stable across renders so the hook's `useEffect` deps don't churn. Without `useMemo`, every render produces a new array → infinite re-effect (one of the Zustand-style footguns the project's CLAUDE.md warns about).

If the file doesn't already import `useMemo`, add it: `import { use, useEffect, useMemo } from "react";`.

If the web layout doesn't fetch the workspace LIST (it currently fetches workspaceBySlug), add the list query. The list is cached by the rest of the app and adding this query is a cache hit (no extra network call).

**Step 2 — apps/desktop/src/renderer/src/components/workspace-route-layout.tsx:**

Same wire-up:

```typescript
import { useWorkspaceStorageMigration } from "@algoplan/core/migrations";
import { useMemo } from "react";  // if not already imported

// Inside WorkspaceRouteLayout component, after the existing wsList useQuery:
const wsListSlugs = useMemo(
  () => (wsList ?? []).map((w) => w.slug),
  [wsList],
);
useWorkspaceStorageMigration(wsListSlugs);
```

The desktop layout already queries `workspaceListOptions` (line 47-50 of the existing file per the read-first inspection), so wsList is already available — just consume it.

**Step 3 — Build + tests:**

```bash
pnpm typecheck
cd packages/core && pnpm exec vitest run migrations/
```

The new hook addition does not change any rendered output; existing layout snapshot/integration tests should still pass without modification. If any test fails because of the new useEffect, audit whether the test mocked `@algoplan/core/migrations` — if so, extend the mock to stub `useWorkspaceStorageMigration` as a no-op.

**Step 4 — Verify the B-04 ship-gate (preview before Plan 08-08 runs end-to-end):**

```bash
# Manual: confirm production source is free of workspace-scoped legacy literals.
! grep -rEn 'multica_[a-z_]+:|multica:[a-z_:]+' packages apps --include='*.ts' --include='*.tsx' 2>/dev/null \
  | grep -v -E '(\.test\.|migrations/localstorage|/test-)'
```

Expected: empty output (zero hits). If non-zero, the offending file is a production-source legacy literal that Plan 08-04 Task 1 missed — fix it in this task.
  </action>
  <verify>
    <automated>pnpm typecheck 2>&1 | tail -5 && cd packages/core && pnpm exec vitest run migrations/</automated>
  </verify>
  <acceptance_criteria>
    - `apps/web/app/[workspaceSlug]/layout.tsx` imports `useWorkspaceStorageMigration` from `@algoplan/core/migrations` (verify with `grep -c "useWorkspaceStorageMigration" apps/web/app/\[workspaceSlug\]/layout.tsx` returns >= 2 — one import + one call)
    - `apps/desktop/src/renderer/src/components/workspace-route-layout.tsx` imports and calls the hook (verify with `grep -c "useWorkspaceStorageMigration" apps/desktop/src/renderer/src/components/workspace-route-layout.tsx` returns >= 2)
    - Both layouts use `useMemo` to stabilize the slug array (verify with `grep -E "useMemo.*\\(\\(\\) => .*\\.slug\\)" apps/web/app/\[workspaceSlug\]/layout.tsx apps/desktop/src/renderer/src/components/workspace-route-layout.tsx | wc -l` returns >= 2)
    - `pnpm typecheck` exits 0
    - `cd packages/core && pnpm exec vitest run migrations/` exits 0 (existing migrations tests + new hook test all pass)
    - B-04 ship-gate preview: zero workspace-scoped legacy literals in production source (verify with `! grep -rEn 'multica_[a-z_]+:|multica:[a-z_:]+' packages apps --include='*.ts' --include='*.tsx' 2>/dev/null | grep -v -E '(\\.test\\.|migrations/localstorage|/test-)'`)
  </acceptance_criteria>
  <done>
    Both apps' workspace route layouts call useWorkspaceStorageMigration with the user's workspace slug list. Workspace-scoped legacy keys migrate on first mount, idempotently. D-2's "MUST migrate, never replace silently" contract is now fully satisfied (Plan 08-04 = global keys; Plan 08-04b = workspace-scoped). Plan 08-08's ship gate will assert zero workspace-scoped legacy literals remain in production source.
  </done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| browser localStorage → app workspace mount | Migration runs once per slug per process inside useEffect; idempotent shim handles repeat mounts |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-08-04b-01 | Tampering | Race between useWorkspaceStorageMigration and Zustand persistence reads | mitigate | Hook fires inside useEffect after the slug list resolves; Plan 08-04 already wires the GLOBAL migrateLocalStorage in initCore (runs synchronously before any auth/Zustand init). Workspace-scoped Zustand stores (chat/store.ts, workspace-storage.ts) only read their slug-suffixed keys when the user actively switches workspaces — the workspace mount fires the migration BEFORE any user interaction with that workspace's drafts. |
| T-08-04b-02 | Information Disclosure | Migration log line leaks key values | mitigate | Plan 08-00's helper returns counts only; this hook does not log the report (silent migration is correct for workspace-scoped keys — they are ephemeral, no need to surface) |
| T-08-04b-03 | Denial of Service | Migration error throws and prevents workspace mount | accept | Plan 08-00's helper is pure and well-tested; the only failure mode is a StorageAdapter that throws on setItem/removeItem (browser quota exceeded), which would equally break the existing app — fail-loud, not a Phase-8-introduced bug |
| T-08-04b-04 | Tampering | useMemo dep instability causes infinite re-migration loop | mitigate | The slug array is wrapped in useMemo with `[wsList]` deps; wsList is from React Query cache (stable reference until cache update). Test 3 in the integration suite asserts idempotency: re-rendering with the same slug list does NOT re-process. |
</threat_model>

<verification>
- `pnpm typecheck` exits 0
- `cd packages/core && pnpm exec vitest run migrations/` exits 0 (Plan 08-00 tests + this plan's new hook tests all pass)
- Zero workspace-scoped `multica_*:` or `multica:*:` literals in production source (preview of Plan 08-08's B-04 ship gate)
- Hook is consumed by BOTH apps' workspace route layouts (DRY: one source of truth in packages/core/migrations/)
</verification>

<success_criteria>
1. useWorkspaceStorageMigration hook exists in packages/core/migrations/ — pure, idempotent, dedup'd per-slug per-process
2. Integration test asserts: empty list = no-op; populated adapter migrates correctly; idempotency holds; incremental slug additions migrate only new slugs
3. apps/web and apps/desktop workspace route layouts call the hook — single source of truth, no duplication
4. Plan 08-08's verify-rebrand.sh B-04 grep gate (added in 08-08 revision) returns zero hits
5. D-2's "MUST migrate, never replace silently" contract is fully satisfied for both global (Plan 08-04) and workspace-scoped (this plan) keys
6. All packages/core tests GREEN; pnpm typecheck GREEN
</success_criteria>

<output>
After completion, create `.planning/phases/08-internal-rebrand-completion/08-04b-SUMMARY.md`
</output>
</content>
</invoke>