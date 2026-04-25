---
phase: 04-dashboard-shell-redesign
plan: 05
subsystem: dashboard-shell-composition
tags: [composition, derived-hooks, wave-4, tdd, shl-02, shl-05]
requires:
  - "04-02 (AppSidebar composition)"
  - "04-04 (AppTopbar composition)"
  - "04-00 (Wave-0 RED scaffolds for derived hooks)"
provides:
  - "packages/views/dashboard-shell/dashboard-shell.tsx (DashboardShell + dual-topSlot composition)"
  - "packages/core/issues/derived/use-issue-count-by-priority.ts (SHL-05 stable selector)"
  - "packages/core/issues/derived/use-blocker-count.ts (v1 stub, FTR-03 deferred)"
  - "packages/core/issues/derived/index.ts (barrel)"
  - "packages/core/package.json -> ./issues/derived export entry"
affects:
  - "Plan 06 (consumes <DashboardShell> from @multica/views/dashboard-shell; deletes packages/views/layout/dashboard-layout.tsx + the legacy packages/views/layout/app-sidebar.tsx)"
  - "PriorityGrid + BlockerBadge (now import the real derived hooks; PHASE-4-INLINE-STUB blocks deleted)"
tech-stack:
  added:
    - "@testing-library/react devDep on packages/core (catalog: ^16.3.2)"
    - "jsdom devDep on packages/core (catalog: ^29.0.1)"
    - "react / react-dom devDeps on packages/core (needed by renderHook)"
  patterns:
    - "Frozen module-level singleton + useMemo dependency = SHL-05 stable selector. Object.freeze on the EMPTY constant prevents accidental in-place mutation; useMemo over the issues array reference returns the same object identity across renders with stable input."
    - "Bare {topSlot} in JSX (no <div> wrapper) = zero-DOM rendering when the slot is undefined. The SC#2 contract is enforced by a regression test that asserts SidebarProvider.firstElementChild === AppSidebar when no topSlot is passed."
    - "Dual-slot pattern: shell-level topSlot (full window-top edge — Desktop DragStrip) + sidebar-level sidebarTopSlot (in-sidebar back/forward chrome — Desktop SidebarTopBar). Each app picks the slot it needs without overloading a single prop."
    - "vi.mock @multica/core/issues/derived in views tests = clean decoupling from issue-list query internals. Tests that exercise PriorityGrid or BlockerBadge mock the derived hook module directly instead of mocking issueListOptions."
key-files:
  created:
    - "packages/views/dashboard-shell/dashboard-shell.tsx"
    - "packages/views/dashboard-shell/dashboard-shell.test.tsx"
    - "packages/core/issues/derived/use-issue-count-by-priority.ts"
    - "packages/core/issues/derived/use-blocker-count.ts"
    - "packages/core/issues/derived/index.ts"
    - ".planning/phases/04-dashboard-shell-redesign/04-05-SUMMARY.md"
  modified:
    - "packages/views/dashboard-shell/index.ts (added DashboardShell + DashboardShellProps exports)"
    - "packages/views/dashboard-shell/priority-grid.tsx (deleted PHASE-4-INLINE-STUB; imports from @multica/core/issues/derived)"
    - "packages/views/dashboard-shell/blocker-badge.tsx (deleted PHASE-4-INLINE-STUB + __blockerCountForTesting; imports from @multica/core/issues/derived)"
    - "packages/views/dashboard-shell/priority-grid.test.tsx (mocks @multica/core/issues/derived; adds positive-counts case)"
    - "packages/views/dashboard-shell/blocker-badge.test.tsx (mocks useBlockerCount via vi.hoisted; adds wsId-forwarding case)"
    - "packages/views/dashboard-shell/app-sidebar.test.tsx (added @multica/core/issues/derived mock so transitive PriorityGrid query stays inert)"
    - "packages/core/issues/derived/use-issue-count-by-priority.test.tsx (Plan 00 RED scaffold → 6 GREEN cases)"
    - "packages/core/issues/derived/use-blocker-count.test.tsx (Plan 00 RED scaffold → 3 GREEN cases)"
    - "packages/core/package.json (added ./issues/derived export entry + 4 devDeps for hook testing)"
decisions:
  - "Mock @multica/core/issues/derived instead of issueListOptions in views tests. PriorityGrid now reaches into issueListOptions transitively via the derived hook; mocking at the derived-hook layer keeps the AppSidebar / PriorityGrid tests free of QueryClient setup and decoupled from issue-list query internals."
  - "Bare {topSlot} in JSX (no wrapper) was chosen over conditional rendering with a fragment. React's reconciler renders nothing for {undefined}, so the SC#2 zero-DOM contract is satisfied by the most idiomatic JSX pattern. Locked by the firstElementChild === AppSidebar regression test."
  - "useBlockerCount keeps the wsId parameter even though v1 returns literal 0. This avoids a breaking signature change in v2 when FTR-03 wires the real backend count — call sites stay identical."
  - "The legacy __blockerCountForTesting mutable export was deleted along with the stub. blocker-badge.test.tsx now mocks useBlockerCount via vi.hoisted + vi.mock — the same Zustand-store mocking pattern used elsewhere in this monorepo per CLAUDE.md."
  - "EMPTY is exported only as a typed value (not a separate constant export). Tests assert reference identity by re-invoking the hook in two separate renderHook calls; the singleton lives at module scope and React's useMemo carries it across renders inside a single mount."
metrics:
  duration: "~10m"
  tasks_completed: 2
  files_created: 5
  files_modified: 8
  commits: 4
  completed: 2026-04-25T16:58:00Z
---

# Phase 4 Plan 05: DashboardShell + Derived Issue Hooks Summary

Wave 4 ships the top-level `<DashboardShell>` composition (DashboardGuard + SidebarProvider + AppSidebar + SidebarInset { AppTopbar + children + ModalRegistry + extra }) with the strict SC#2 zero-DOM-when-topSlot-undefined contract; ships two SHL-05 derived hooks (`useIssueCountByPriority` + `useBlockerCount`) under a new `@multica/core/issues/derived` export; deletes both `PHASE-4-INLINE-STUB` blocks from `priority-grid.tsx` + `blocker-badge.tsx`; and upgrades Plan 00's RED `it.todo` scaffolds into 9 passing assertions covering the verified Plan-00 priority enum mapping (`urgent→p0`, `high→p1`, `medium→p2`, `low→p3`, `none` excluded). The full dashboard-shell sweep is 81/81 green across 10 files; the two derived-hook test files are 9/9 green; typecheck is clean across all 7 packages; the grep CI hook for `useWorkspaceId(` exits 0; zero `PHASE-4-INLINE-STUB` markers remain.

## Tasks Completed

| Task | Name                                                                       | Commit (RED)  | Commit (GREEN) | Files                            |
| ---- | -------------------------------------------------------------------------- | ------------- | -------------- | -------------------------------- |
| 1    | Ship two derived hooks + GREEN their tests + delete the inline stubs       | `0fe91423`    | `564b79d3`     | 3 created + 4 modified + deps    |
| 2    | DashboardShell composition + topSlot semantics test                        | `8a39a302`    | `f6dcc876`     | 2 created + 2 modified           |

## Public Prop Signatures

```ts
// packages/views/dashboard-shell/dashboard-shell.tsx
export interface DashboardShellProps {
  children: ReactNode;
  /** Workspace id forwarded to AppSidebar + AppTopbar. */
  wsId?: string;
  /**
   * FIRST child of <SidebarProvider>. Desktop injects <DragStrip />.
   * When omitted, NO DOM is rendered above the topbar. SC#2 contract.
   */
  topSlot?: ReactNode;
  /** Replaces default <SearchInput> in <AppTopbar>; also forwarded to AppSidebar. */
  searchSlot?: ReactNode;
  /** Sidebar-internal topSlot pass-through (Pitfall 2 dual-slot). */
  sidebarTopSlot?: ReactNode;
  /** After children + ModalRegistry inside <SidebarInset> (overlays). */
  extra?: ReactNode;
  /** Loading indicator passed to DashboardGuard.loadingFallback. */
  loadingIndicator?: ReactNode;
}
export function DashboardShell(props: DashboardShellProps): JSX.Element;
```

```ts
// packages/core/issues/derived/use-issue-count-by-priority.ts
export interface PriorityCountMap {
  readonly p0: number;
  readonly p1: number;
  readonly p2: number;
  readonly p3: number;
}
export function useIssueCountByPriority(wsId: string | undefined): PriorityCountMap;
```

```ts
// packages/core/issues/derived/use-blocker-count.ts
export function useBlockerCount(_wsId: string | undefined): number;
```

## Dual topSlot Pattern (Pitfall 2)

The shell exposes TWO topSlot props that target different DOM positions:

| Prop             | Position                                  | Use Case                                          |
| ---------------- | ----------------------------------------- | ------------------------------------------------- |
| `topSlot`        | First child of `<SidebarProvider>`         | Desktop `<DragStrip />` (full window-top edge)    |
| `sidebarTopSlot` | Forwarded as `AppSidebar.topSlot`          | Desktop in-sidebar `<SidebarTopBar />` (back/fwd) |

Each app picks the slot it needs:
- Web: omits both. The shell renders zero DOM above the topbar (SC#2).
- Desktop: passes `<DragStrip />` to `topSlot` AND `<SidebarTopBar />` to `sidebarTopSlot`.

## Derived Hook Contracts

**`useIssueCountByPriority(wsId)`**
- Returns `Object.freeze({p0:0,p1:0,p2:0,p3:0})` (the EMPTY singleton) when `wsId` is undefined, when the query data is undefined, or when the issues array is empty.
- Otherwise returns `{p0,p1,p2,p3}` derived via the verified Plan-00 enum mapping: `urgent→p0`, `high→p1`, `medium→p2`, `low→p3`, `none` excluded.
- SHL-05 stability: same input → same `Object.is` reference across renders (locked by the `useMemo` dependency on the issues array reference + the EMPTY singleton for zero-data branches).

**`useBlockerCount(wsId)`**
- v1: returns the literal `0` for any `wsId`. Primitive return is auto-stable.
- v2: FTR-03 backend wiring will populate from a real "blocker" field — call sites stay identical because the signature is reserved.

## PHASE-4-INLINE-STUB Confirmation

```bash
$ grep -rn "PHASE-4-INLINE-STUB" packages/views/dashboard-shell/
$ echo $?
1   # zero matches
```

The two stub blocks (and the `__blockerCountForTesting` mutable export) are gone. PriorityGrid + BlockerBadge import the real hooks from `@multica/core/issues/derived`.

## Plan 06 Hand-Off

```ts
// Plan 06: import path Web + Desktop should use
import { DashboardShell } from "@multica/views/dashboard-shell";
```

Plan 06 actions:
1. Wire `<DashboardShell>` into `apps/web/.../layout.tsx` (omit `topSlot`; pass `<SearchTrigger />` as `searchSlot`).
2. Wire `<DashboardShell>` into `apps/desktop/.../layout.tsx` (pass `<DragStrip />` as `topSlot` + `<SidebarTopBar />` as `sidebarTopSlot`).
3. Delete `packages/views/layout/dashboard-layout.tsx` (replaced by `DashboardShell`).
4. Delete the legacy `packages/views/layout/app-sidebar.tsx` (replaced by `packages/views/dashboard-shell/app-sidebar.tsx` since Plan 02).
5. Update `packages/views/layout/index.ts` re-export shim if anything else still points at the legacy paths.
6. Run the E2E spec (`e2e/dashboard-shell.spec.ts`) for dark-mode persistence (Plan 06 Task 2 fills the existing skeleton).

## Verification Results

| Check                                                                              | Result                                              |
| ---------------------------------------------------------------------------------- | --------------------------------------------------- |
| `pnpm --filter @multica/core exec vitest run issues/derived`                       | 9/9 passed (~0.4s)                                  |
| `pnpm --filter @multica/views exec vitest run dashboard-shell`                     | 81/81 passed across 10 files (~1s)                  |
| `pnpm --filter @multica/views exec vitest run dashboard-shell/dashboard-shell.test.tsx` | 9/9 passed (~0.4s)                              |
| `pnpm --filter @multica/views exec vitest run dashboard-shell/priority-grid.test.tsx dashboard-shell/blocker-badge.test.tsx` | 20/20 passed (~0.8s) |
| `pnpm typecheck`                                                                   | green (7 packages, 4 cached)                        |
| `bash scripts/grep-no-useworkspaceid-in-shell.sh`                                  | exit 0                                              |
| `! grep -rn "PHASE-4-INLINE-STUB" packages/views/dashboard-shell/`                 | exit 1 (zero matches)                               |
| `! grep -rnE '#[0-9a-fA-F]{3,8}\|rgb\(\|dark:' .../dashboard-shell.tsx`            | exit 1 (token-only)                                 |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 — Bug] AppSidebar test broke when PriorityGrid started consuming the real `useIssueCountByPriority`**

- **Found during:** Task 2 verification (full dashboard-shell sweep)
- **Issue:** Plan 02's `app-sidebar.test.tsx` mocks `@multica/core/issues/queries` but only exposes `issueDetailOptions`. After Task 1 swapped PriorityGrid's stub for the real `useIssueCountByPriority`, the transitive call to `issueListOptions` failed with `No "issueListOptions" export is defined on the "@multica/core/issues/queries" mock`. Seven AppSidebar test cases failed.
- **Fix:** Added a `vi.mock("@multica/core/issues/derived", ...)` block to `app-sidebar.test.tsx` returning EMPTY counts + `0` blockers. This decouples the AppSidebar test from issue-list query internals and matches the same pattern PriorityGrid + BlockerBadge tests use.
- **Files modified:** `packages/views/dashboard-shell/app-sidebar.test.tsx`
- **Commit:** Folded into the Task 2 GREEN commit `f6dcc876` (the failure surfaced during Task 2 verification, was fixed in the same commit window).

**2. [Rule 3 — Blocking] `packages/core` lacked devDeps for `renderHook` + jsdom**

- **Found during:** Task 1 RED (first test run)
- **Issue:** The Plan 00 scaffolds used `// @vitest-environment jsdom` and ran fine because they only contained `it.todo` cases (no actual imports of testing-library). Filling them in required `@testing-library/react` (for `renderHook`) and `react`/`react-dom` (peer of testing-library) and a real `jsdom` install. None were declared in `packages/core/package.json`.
- **Fix:** Added 4 devDeps to `packages/core/package.json` (`@testing-library/react`, `jsdom`, `react`, `react-dom`), all referencing the existing pnpm catalog versions. Ran `pnpm install`.
- **Files modified:** `packages/core/package.json`, `pnpm-lock.yaml`
- **Commit:** Folded into the Task 1 RED commit `0fe91423`.

No other deviations. Plan executed as written for the actual code shape.

## Authentication Gates

None. Plan is pure shared-package composition + derived hook implementation; no auth flows touched.

## Threat Mitigation Status

| Threat ID    | Disposition | Status                                                                                                                                              |
| ------------ | ----------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| T-04-05-01   | mitigate    | MITIGATED — `dashboard-shell.test.tsx` asserts SC#2 contract: empty topSlot → AppSidebar is `firstElementChild` of SidebarProvider; no `<div>` wrapper. compareDocumentPosition test locks DOM order when topSlot IS provided. |
| T-04-05-02   | mitigate    | MITIGATED — EMPTY is `Object.freeze`-d module-level singleton. Two test cases (`returns frozen EMPTY when wsId is undefined — same reference across rerenders` + `returns same object reference across renders with stable input (SHL-05)`) assert `Object.is(prev, next) === true`. The "different input → different output" sanity case prevents accidental over-memoization. |
| T-04-05-03   | accept      | ACCEPTED — Future enum extensions (e.g. "blocker") fall through the if/else chain unhandled. Test coverage of existing 5 enum values locks current behavior; planner re-opens the contract when enum extends. |
| T-04-05-04   | accept      | ACCEPTED — O(n) linear scan over issues array. Acceptable for v1 workspace sizes; revisit if 10k+ issues per workspace become common. |

## Threat Flags

None. Plan 05 introduces no new network endpoints, auth paths, file access, or schema changes. The new `./issues/derived` export entry is a pure-function module barrel.

## Known Stubs

- `useBlockerCount` returns literal `0` (intentional v1 stub — FTR-03 deferred to v2 backend wiring). Documented in the hook's JSDoc + the `<threat_model>` of this plan + the v2 reservation comment in `useBlockerCount.ts`. The stub does NOT prevent the plan's goal; the topbar BlockerBadge renders correctly in its zero-state visual variant (icon-only, muted-foreground), and Plan 06 + the live app will display this neutral state until FTR-03 lands.

## TDD Gate Compliance

| Task | RED Commit | GREEN Commit | Evidence                                                                                                                                                       |
| ---- | ---------- | ------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1    | `0fe91423` | `564b79d3`   | RED: `vitest` reports 2 test files failed to resolve `./use-issue-count-by-priority` and `./use-blocker-count`. GREEN: 9/9 cases pass; PHASE-4-INLINE-STUB markers gone. |
| 2    | `8a39a302` | `f6dcc876`   | RED: `vitest` reports `Failed to resolve import "./dashboard-shell"`. GREEN: 9/9 cases pass; full dashboard-shell sweep 81/81; typecheck green.                |

Sequence verified in `git log HEAD~4..HEAD`: RED → GREEN → RED → GREEN, with each GREEN immediately following its RED.

## Self-Check: PASSED

Files asserted exist on disk:

- `packages/views/dashboard-shell/dashboard-shell.tsx` — FOUND
- `packages/views/dashboard-shell/dashboard-shell.test.tsx` — FOUND
- `packages/core/issues/derived/use-issue-count-by-priority.ts` — FOUND
- `packages/core/issues/derived/use-blocker-count.ts` — FOUND
- `packages/core/issues/derived/index.ts` — FOUND
- `packages/views/dashboard-shell/index.ts` — modified (DashboardShell + DashboardShellProps exports added)
- `packages/views/dashboard-shell/priority-grid.tsx` — modified (PHASE-4-INLINE-STUB removed)
- `packages/views/dashboard-shell/blocker-badge.tsx` — modified (PHASE-4-INLINE-STUB + __blockerCountForTesting removed)

Commits asserted exist in git log:

- `0fe91423` (RED Task 1) — FOUND
- `564b79d3` (GREEN Task 1) — FOUND
- `8a39a302` (RED Task 2) — FOUND
- `f6dcc876` (GREEN Task 2) — FOUND

No unintentional deletions in commit range (`git diff --diff-filter=D --name-only HEAD~4 HEAD` shows zero file deletions; the `__blockerCountForTesting` export removal is intentional and documented above).
