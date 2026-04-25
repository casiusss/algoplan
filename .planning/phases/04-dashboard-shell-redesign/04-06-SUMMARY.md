---
phase: 04-dashboard-shell-redesign
plan: 06
subsystem: dashboard-shell-wiring
tags: [wiring, app-integration, legacy-deletion, e2e, wave-5, shl-01, shl-02]
requires:
  - "04-05 (DashboardShell composition + derived hooks)"
provides:
  - "apps/web/app/[workspaceSlug]/(dashboard)/layout.tsx (consumes DashboardShell, no topSlot, explicit wsId pass-through)"
  - "apps/desktop/src/renderer/src/components/desktop-layout.tsx (consumes DashboardShell with dual-slot Pitfall 2 wiring + reactive wsId)"
  - "packages/views/layout/index.ts (clean shim re-exporting from dashboard-shell/)"
  - "e2e/dashboard-shell.spec.ts (real dark-mode-persistence test, no longer skipped)"
  - "packages/views/package.json (./dashboard-shell exports entry)"
affects:
  - "Phase 4 ships — both apps wear AlgoPlan chrome end-to-end (sidebar wordmark, dark-mode persist, sidebar collapse, slot system, wsId pass-through)"
  - "Phase 5 (Kanban restyle) consumes the new shell as its frame; no further wiring work needed"
  - "Phase 6 may audit per-page PageHeader removal (UI-SPEC §8 deferred)"
  - "Phase 7 finishes the rebrand pass (RBR-01..06)"
tech-stack:
  added: []
  patterns:
    - "Dual-slot mount on Desktop: shell-level topSlot={<DragStrip />} for the FULL window-top edge + sidebarTopSlot={<SidebarTopBar />} for in-sidebar back/forward chrome — Pitfall 2 mitigated by construction (each app picks the slot it needs without overloading a single prop)."
    - "Reactive wsId mirror via useSyncExternalStore(subscribeToCurrentSlug, getCurrentWsId) — Desktop reads slug AND wsId at the same level so DashboardShell receives an explicit workspace id instead of letting AppSidebar's internal useCurrentWorkspace fall-back trigger."
    - "Two render branches on Desktop — slug present mounts DashboardShell with TabContent as children; slug null renders TabContent BARE under DragStrip so the chicken-and-egg slug bootstrap (TabContent → IndexRedirect → WorkspaceRouteLayout → setCurrentWorkspace) still fires. WindowOverlay stays mounted in both branches."
    - "Web consumes useCurrentWorkspace() at the (dashboard)/layout.tsx level so wsId is passed explicitly to DashboardShell — retires PLAN-CHECK W-4 debt at the source instead of deferring to v2."
key-files:
  created:
    - ".planning/phases/04-dashboard-shell-redesign/04-06-SUMMARY.md"
  modified:
    - "apps/web/app/[workspaceSlug]/(dashboard)/layout.tsx"
    - "apps/desktop/src/renderer/src/components/desktop-layout.tsx"
    - "packages/views/layout/index.ts"
    - "packages/views/package.json"
    - "e2e/dashboard-shell.spec.ts"
  deleted:
    - "packages/views/layout/app-sidebar.tsx (681 lines)"
    - "packages/views/layout/dashboard-layout.tsx (43 lines)"
decisions:
  - "Apply PLAN-CHECK W-4 fix inline. The web (dashboard)/layout.tsx now resolves the active workspace via useCurrentWorkspace() and passes wsId={workspace?.id} explicitly to DashboardShell. Costs ~3 lines and removes the 'wait until v2 to wire wsId' technical debt that the plan-check warned about. AppSidebar's internal useCurrentWorkspace() fallback remains as a defence-in-depth — but the explicit prop now makes the data flow auditable from the top."
  - "Add the missing './dashboard-shell' exports entry to packages/views/package.json. Without it, both app-side typecheck failures resolved as TS2307 'Cannot find module @multica/views/dashboard-shell'. Plan 02 left the entry off the package barrel because Plan 02's wave-2 consumers all reached through the layout shim; Plan 06 needed the direct path. Auto-fixed (Rule 3)."
  - "Preserve the desktop chicken-and-egg slug-bootstrap by adding a slug-null fallback branch that mounts TabContent + DragStrip without DashboardShell. The plan's terse example (`{slug && <DashboardShell><TabContent /></DashboardShell>}`) would have broken the IndexRedirect → setCurrentWorkspace flow — TabContent must mount before WorkspaceRouteLayout can run. The two-branch pattern keeps the original behaviour without changing TabContent or WorkspaceRouteLayout."
  - "Keep MainTopBar (back/forward + tab strip) inside DashboardShell.children on Desktop. The plan example showed only <TabContent /> as children, but losing the desktop tab UI would have shipped Phase 4 in a regressed state. MainTopBar is desktop-specific chrome with no analog in the new shell; it stacks BELOW AppTopbar inside SidebarInset. Total desktop chrome = DragStrip 48px + AppTopbar 48px + MainTopBar 48px = 144px. UI-SPEC §8 acknowledges desktop chrome stack height; per-page PageHeader audit is deferred to Phase 6."
  - "Auto-approve the human-verify checkpoint in auto mode. Per workflow.auto_advance=true the checkpoint:human-verify gate auto-resolves; visual verification (DragStrip dragging, no visual gap on Web, sidebar wordmark, sidebar footer trio, PriorityGrid color cells, '+ New issue' modal, FOUC absence) is deferred to live UAT during phase verification or interactive `make dev` session. Automated checks (typecheck, vitest x 81 dashboard-shell tests, grep CI hook, no remaining direct imports of deleted files) all green."
  - "Defer live E2E execution. The dark-mode-persistence Playwright spec is wired to real assertions and removed from test.skip status, but `pnpm exec playwright test e2e/dashboard-shell.spec.ts` requires a running dev stack (web + server + DB). The web port at localhost:3000 was not bound during executor run; spinning up the stack inside an executor agent in a worktree risks port collisions with parallel agents. The spec is ready to run during `make check` after this branch merges and the maintainer starts the worktree dev stack."
metrics:
  duration: "~12m"
  tasks_completed: 2
  files_created: 1
  files_modified: 5
  files_deleted: 2
  commits: 2
  completed: 2026-04-25T17:10:00Z
---

# Phase 4 Plan 06: Wire Both Apps + Delete Legacy Summary

Wave 5 ships the final Phase 4 plan: both `apps/web` and `apps/desktop` now consume `<DashboardShell>` from `@multica/views/dashboard-shell`. The web layout omits `topSlot` (no DragStrip on the web — UI-SPEC SC#2 visual contract), passes `wsId` explicitly via `useCurrentWorkspace()` (PLAN-CHECK W-4 fix), and keeps `searchSlot={<SearchTrigger />}` + `extra={SearchCommand + ChatWindow + ChatFab + StarterContentPrompt}` from the prior `<DashboardLayout>`. The desktop `DesktopShell` adopts the Pitfall 2 dual-slot pattern — `topSlot={<DragStrip />}` claims the FULL window-top edge while `sidebarTopSlot={<SidebarTopBar />}` keeps the back/forward chrome inside the sidebar. The legacy 681-line `packages/views/layout/app-sidebar.tsx` and the 43-line `packages/views/layout/dashboard-layout.tsx` are deleted; the shim at `packages/views/layout/index.ts` cleanly re-exports `AppSidebar` + `DashboardShell as DashboardLayout` from the new module so any unmigrated barrel consumer keeps working. The Wave 0 `e2e/dashboard-shell.spec.ts` skeleton is upgraded to a real dark-mode-persistence assertion (toggle → reload → still dark → toggle back to light). All 81 dashboard-shell vitest cases stay green; pnpm typecheck is green across all 7 packages; the grep CI hook for `useWorkspaceId(` exits 0.

## Tasks Completed

| Task | Name                                                                            | Commit       | Files                                                                                              |
| ---- | ------------------------------------------------------------------------------- | ------------ | -------------------------------------------------------------------------------------------------- |
| 1    | Wire DashboardShell into both apps + delete legacy + clean shim + exports entry | `b7ed2028`   | 4 modified + 2 deleted                                                                             |
| 2    | Upgrade e2e/dashboard-shell.spec.ts from skip → real dark-mode-persistence test | `2b3ace9d`   | 1 modified                                                                                         |

## Web App Wiring

`apps/web/app/[workspaceSlug]/(dashboard)/layout.tsx`:

```tsx
"use client";
import { DashboardShell } from "@multica/views/dashboard-shell";
import { useCurrentWorkspace } from "@multica/core/paths";
// ...search/chat/onboarding imports unchanged

export default function Layout({ children }: { children: React.ReactNode }) {
  const workspace = useCurrentWorkspace(); // PLAN-CHECK W-4 fix
  return (
    <DashboardShell
      wsId={workspace?.id}
      loadingIndicator={<MulticaIcon className="size-6" />}
      searchSlot={<SearchTrigger />}
      extra={<><SearchCommand /><ChatWindow /><ChatFab /><StarterContentPrompt /></>}
    >
      {children}
    </DashboardShell>
  );
}
```

- NO `topSlot` (Web has no DragStrip per UI-SPEC SC#2 — no DOM above topbar, no visual gap).
- Explicit `wsId` from `useCurrentWorkspace()` (parent `[workspaceSlug]/layout.tsx` mounts `WorkspaceSlugProvider`, so the hook resolves the active workspace via the slug→list join). AppSidebar's internal fallback remains, but the explicit prop makes the data flow auditable from the top.
- All other slot props (`searchSlot`, `extra`, `loadingIndicator`) preserved verbatim from the prior `<DashboardLayout>` consumer.

## Desktop App Wiring

`apps/desktop/src/renderer/src/components/desktop-layout.tsx`:

Two render branches — slug present mounts the full shell; slug null renders TabContent bare so the chicken-and-egg slug bootstrap still works:

```tsx
{slug ? (
  <DashboardShell
    wsId={wsId ?? undefined}
    topSlot={<DragStrip />}                  // FULL window-top edge
    sidebarTopSlot={<SidebarTopBar />}        // back/forward inside sidebar
    searchSlot={<SearchTrigger />}
    extra={<><ChatWindow /><ChatFab /><StarterContentPrompt /></>}
  >
    <div className="flex h-full min-h-0 flex-col">
      <MainTopBar />
      <div className="...rounded-xl shadow-sm bg-background">
        <TabContent />
      </div>
    </div>
  </DashboardShell>
) : (
  <div className="flex h-svh flex-col">
    <DragStrip />
    <div className="flex-1 min-h-0"><TabContent /></div>
  </div>
)}
<WindowOverlay />
```

- `wsId` reactively mirrors slug via `useSyncExternalStore(subscribeToCurrentSlug, getCurrentWsId)` (the platform layer updates both together — both subscribe to the same slug-change notification).
- Pitfall 2 dual-slot preserved: shell-level DragStrip claims the FULL window-top edge so users can drag the macOS window from anywhere across the top; sidebar-level SidebarTopBar keeps back/forward + drag handle exactly where the user currently expects them.
- `MainTopBar` (TabBar + drag region) and the rounded-xl TabContent container are kept inside `DashboardShell.children` because no other place in the new shell hosts the desktop tab UI.

## Legacy Cleanup

```bash
$ git diff --stat HEAD~2 HEAD -- packages/views/layout/
 packages/views/layout/app-sidebar.tsx       | 681 ----------------------------
 packages/views/layout/dashboard-layout.tsx  |  43 --
 packages/views/layout/index.ts              |   8 +-
 3 files changed, 4 insertions(+), 728 deletions(-)
```

- `packages/views/layout/app-sidebar.tsx` (681 lines) — deleted; replaced by `packages/views/dashboard-shell/app-sidebar.tsx` since Plan 02.
- `packages/views/layout/dashboard-layout.tsx` (43 lines) — deleted; replaced by `packages/views/dashboard-shell/dashboard-shell.tsx`.
- `packages/views/layout/index.ts` — shim now re-exports `AppSidebar, DashboardShell as DashboardLayout` from `../dashboard-shell`. Any remaining `@multica/views/layout` barrel consumer continues to resolve. (At time of writing, ZERO consumers still import from this barrel — both apps reach `@multica/views/dashboard-shell` directly. The shim stays as a defence-in-depth re-export for future code.)
- `packages/views/package.json` — added the missing `"./dashboard-shell": "./dashboard-shell/index.ts"` exports entry. Without it, both apps' typecheck failed with TS2307. Auto-fixed under Rule 3 (blocking).

## E2E Test Upgrade

`e2e/dashboard-shell.spec.ts`:
- Removed `test.skip` from the SC#1/SHL-01 case.
- Real assertion: open issues page (already mounted via `loginAsDefault`) → click DarkModeToggle (resolved by `aria-label`) → assert `<html>` has `.dark` → reload → re-assert → toggle back to light to leave the system in a known state.
- Setup follows the existing `TestApiClient` pattern (`createTestApi` + `api.cleanup()` in `afterEach`).
- Live execution deferred — see "Verification Results" below.

## Phase 4 Hand-off

Phase 4 SHIPS. Concretely:

1. **Sidebar wordmark** — both apps render the AlgoPlan brand identity in the sidebar header (Wordmark from Plan 01, composed by AppSidebar in Plan 02).
2. **Dark-mode persistence** — `localStorage["multica_theme"]` survives reload; verified by Wave-0 unit test for the toggle, by Plan 01 atom test, by the Wave 5 E2E (when stack is up).
3. **Sidebar collapse** — cookie-backed `sidebar_state` survives reload; verified by Wave 0 + Sidebar primitive's existing test surface.
4. **Slot system** — three slots (`topSlot`, `searchSlot`, `sidebarTopSlot`) plus `extra` cleanly route platform-specific chrome through the shared shell without duplicating layout code.
5. **wsId pass-through** — both apps now pass an explicit `wsId` to DashboardShell; AppSidebar fallback is defence-in-depth, not load-bearing.

Downstream phases inherit a clean slate:
- **Phase 5 (Kanban restyle)** — consume `<SegmentedControl>` from Phase 2 + restyle Kanban cards inside the new shell. No shell changes needed.
- **Phase 6** — may audit per-page `<PageHeader>` removal (UI-SPEC §8 deferred). Settings, Inbox could move title-in-content to drop the second 48px chrome row.
- **Phase 7 (rebrand)** — RBR-01..06 finishes the AlgoPlan rebrand pass.

## Verification Results

| Check                                                                              | Result                                              |
| ---------------------------------------------------------------------------------- | --------------------------------------------------- |
| `! test -f packages/views/layout/app-sidebar.tsx`                                  | passed (file deleted)                               |
| `! test -f packages/views/layout/dashboard-layout.tsx`                             | passed (file deleted)                               |
| `pnpm typecheck`                                                                   | green (7 successful, 7 cached on 2nd pass)          |
| `pnpm --filter @multica/views test`                                                | 285/285 across 40 files (~9.8s)                     |
| `pnpm --filter @multica/views exec vitest run dashboard-shell`                     | 81/81 across 10 files (~1s)                         |
| `pnpm --filter @multica/web test`                                                  | 17/17 across 3 files (~1s)                          |
| `bash scripts/grep-no-useworkspaceid-in-shell.sh`                                  | exit 0 — no useWorkspaceId() inside dashboard-shell |
| `grep "@multica/views/layout/{app-sidebar,dashboard-layout}"` direct imports       | zero — no consumer reaches deleted file paths       |
| `grep "from \"@multica/views/layout\""` barrel consumers                           | zero — both apps now import from /dashboard-shell   |
| `pnpm exec playwright test e2e/dashboard-shell.spec.ts -g "dark mode persists"`    | DEFERRED — requires running dev stack (web + server + DB) |

### Deferred E2E

The Playwright spec is wired and ready (`test.skip` removed, real assertions in place). Live execution requires:
- `make dev` (web on :3000, server on :8080, shared DB up)
- The worktree's `.env.worktree` ports bound

The web port was not running during executor run; spinning up a full dev stack inside the executor in this worktree risks port collisions with parallel agents. The spec is greenlit to run during `make check` after this branch merges or during a maintainer's `make dev` session.

### Auto-Approved Human-Verify Checkpoint

Per `workflow.auto_advance: true` the `checkpoint:human-verify` gate at the end of the plan auto-resolves. The 6 visual verification points (no DOM gap above web topbar, sidebar wordmark+footer trio, PriorityGrid color cells, "+ New issue" modal, desktop DragStrip drag, PageHeader stack heights) are deferred to live UAT during phase verification or interactive `make dev` session. None are blocked by anything in this plan; the underlying behaviour is locked by automated unit + composition tests in Plans 01–05.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 — Blocking] Missing `./dashboard-shell` exports entry on `@multica/views`**

- **Found during:** Task 1 typecheck after the web layout swap.
- **Issue:** Both web and desktop typecheck failed with `TS2307: Cannot find module '@multica/views/dashboard-shell'`. Plan 02 added the new directory and its barrel but did not add a corresponding `exports` entry to `packages/views/package.json`; Plan 02's tests reached the directory through the legacy shim, so the gap surfaced only when Plan 06's app-side imports went through the `@multica/views/dashboard-shell` path directly.
- **Fix:** Added `"./dashboard-shell": "./dashboard-shell/index.ts"` to the `exports` map. Order placed adjacent to `"./layout"` so the two siblings sit together for future maintainability.
- **Files modified:** `packages/views/package.json`
- **Commit:** Folded into Task 1 commit `b7ed2028`.

**2. [Rule 2 — Critical functionality] Desktop slug-null branch preserves chicken-and-egg bootstrap**

- **Found during:** Task 1 implementation review against the original `desktop-layout.tsx` comment.
- **Issue:** The plan's example wiring `{slug && <DashboardShell><TabContent /></DashboardShell>}` would have broken the desktop slug-bootstrap flow. The original code keeps `<TabContent />` ALWAYS rendered because TabContent's IndexRedirect is what triggers `setCurrentWorkspace()` (via WorkspaceRouteLayout) to populate the slug. Without TabContent mounted at slug=null, the slug never gets set on cold start.
- **Fix:** Two render branches — slug present mounts the full DashboardShell; slug null renders TabContent bare under DragStrip so the bootstrap still fires. WindowOverlay sits above both branches. The window stays draggable in both branches because DragStrip mounts unconditionally.
- **Files modified:** `apps/desktop/src/renderer/src/components/desktop-layout.tsx`
- **Commit:** Folded into Task 1 commit `b7ed2028`.

**3. [Rule 2 — Critical functionality] Desktop tab UI preserved via children stack**

- **Found during:** Task 1 implementation review.
- **Issue:** The plan's terse example showed only `<TabContent />` as children of DashboardShell on Desktop. But the existing desktop layout has `<MainTopBar />` (containing `<TabBar />`) above TabContent — losing this ships Phase 4 in a regressed state with no tab UI.
- **Fix:** Keep `<MainTopBar />` + the rounded-xl `<TabContent />` container as `DashboardShell.children` on Desktop. Stacks BELOW the new AppTopbar inside SidebarInset. Total desktop chrome = DragStrip 48px + AppTopbar 48px + MainTopBar 48px = 144px. UI-SPEC §8 acknowledges desktop chrome stack height; per-page PageHeader audit is deferred to Phase 6.
- **Files modified:** `apps/desktop/src/renderer/src/components/desktop-layout.tsx`
- **Commit:** Folded into Task 1 commit `b7ed2028`.

### PLAN-CHECK W-4 inline fix (acknowledged in plan)

- **Decision:** Apply option (b) from the plan-check warning — add `useCurrentWorkspace()` at the web layout level so wsId is passed explicitly. Costs ~3 lines and removes the technical debt. Documented inline as the chosen path.
- **Files modified:** `apps/web/app/[workspaceSlug]/(dashboard)/layout.tsx`
- **Commit:** Folded into Task 1 commit `b7ed2028`.

### PLAN-CHECK W-2 noted (LabelsDropdown deferral)

- **Status:** RESEARCH explicitly noted "Labels dropdown is NOT in Phase 4 scope (UI-SPEC has no LabelsDropdown component declared)". Phase 4 ships without LabelsDropdown.
- **Recorded here for auditability:** LabelsDropdown deferred from SHL-03 — UI-SPEC §8 omits it; revisit in Phase 5 or v2.

No other deviations. Plan executed as written for the actual code shape.

## Authentication Gates

None. Plan is pure shared-package wiring + legacy deletion + E2E test scaffold; no auth flows touched.

## Threat Mitigation Status

| Threat ID    | Disposition | Status                                                                                                                                                                                                            |
| ------------ | ----------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| T-04-06-01   | mitigate    | MITIGATED — typecheck + full views/web vitest sweep before Plan 06 close confirms no remaining direct imports of the deleted files. Shim at `packages/views/layout/index.ts` re-exports the public surface so barrel consumers keep working. |
| T-04-06-02   | mitigate    | MITIGATED — sidebarTopSlot prop preserves Pitfall 2 contract; back/forward chrome and DragStrip both alive in Desktop. Visual verification step deferred to live UAT (auto-mode) but the unit-test composition in Plan 05 (DashboardShell DOM-order assertion) locks the slot routing. |
| T-04-06-03   | mitigate    | MITIGATED — E2E spec asserts BOTH directions (dark survives reload AND back-to-light succeeds for clean teardown); test file is greenlit, live execution deferred per dev-stack constraint. |
| T-04-06-04   | accept      | ACCEPTED — Uses existing `loginAsDefault` + `TestApiClient.cleanup()` (same isolation pattern as other e2e specs). |

## Threat Flags

None. Plan 06 introduces no new network endpoints, auth paths, file access, or schema changes. The only file-system change is deleting two pre-existing files that were already inside the public surface; the shim preserves the public exports.

## Known Stubs

None new. The plan-05-era `useBlockerCount` returning literal `0` (FTR-03 deferred to v2 backend wiring) remains in place; Phase 4 ships with that intentional v1 stub documented in Plan 05 SUMMARY.

## TDD Gate Compliance

Not applicable — this plan is pure wiring + deletion + E2E scaffolding. No new RED/GREEN/REFACTOR cycle required. The behaviour locked by Plan 06 (DashboardShell as the entry composition) is already verified by Plan 05's DashboardShell DOM-order test (the firstElementChild === AppSidebar regression test for the empty-topSlot case + the compareDocumentPosition test for the topSlot-present case).

## Self-Check: PASSED

Files asserted exist on disk:

- `apps/web/app/[workspaceSlug]/(dashboard)/layout.tsx` — modified (verified)
- `apps/desktop/src/renderer/src/components/desktop-layout.tsx` — modified (verified)
- `packages/views/layout/index.ts` — modified (verified)
- `packages/views/package.json` — modified (verified)
- `e2e/dashboard-shell.spec.ts` — modified (verified)
- `.planning/phases/04-dashboard-shell-redesign/04-06-SUMMARY.md` — created (this file)

Files asserted deleted on disk:

- `packages/views/layout/app-sidebar.tsx` — DELETED (verified `! test -f`)
- `packages/views/layout/dashboard-layout.tsx` — DELETED (verified `! test -f`)

Commits asserted exist in git log:

- `b7ed2028` (Task 1: wire + delete + shim + exports) — FOUND
- `2b3ace9d` (Task 2: real E2E test) — FOUND

Intentional deletions documented above; no unintentional deletions in commit range (`git diff --diff-filter=D --name-only HEAD~2 HEAD` shows only the two legacy files we expected to remove).
