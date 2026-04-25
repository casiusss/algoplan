---
phase: 04-dashboard-shell-redesign
plan: 04
subsystem: dashboard-shell-topbar-composition
tags: [composition, topbar, wave-3, tdd]
requires:
  - "04-03 (FilterChipRow + BlockerBadge + SearchInput + PrimaryCTA atoms)"
provides:
  - "packages/views/dashboard-shell/app-topbar.tsx (AppTopbar composition + searchSlot replacement contract)"
  - "packages/views/dashboard-shell/index.ts (barrel — adds AppTopbar + AppTopbarProps + the four topbar atoms)"
affects:
  - "Plan 05 (DashboardShell imports AppTopbar from this barrel and slots it inside SidebarInset alongside AppSidebar; passes through searchSlot from its own props)"
  - "Plan 06 (Web app injects its existing <SearchTrigger> Cmd+K trigger via DashboardShell's searchSlot; Desktop leaves searchSlot undefined → default SearchInput)"
tech-stack:
  added: []
  patterns:
    - "vi.mock per child atom inside the test file — isolates AppTopbar's composition from each atom's internal store wiring (cheaper than the full hoisted-mock pattern used in app-sidebar.test.tsx; sufficient because composition tests don't exercise atom internals)"
    - "ReactNode slot prop with `?? default` fallback — the searchSlot REPLACES the default <SearchInput> when supplied, rather than appending alongside it (matches DashboardShell's later topSlot semantics)"
    - "DOM-order assertion via `Array.from(header.children)` index lookup — no testid scattering inside production code; mocks attach the testids"
key-files:
  created:
    - "packages/views/dashboard-shell/app-topbar.tsx"
    - "packages/views/dashboard-shell/app-topbar.test.tsx"
    - ".planning/phases/04-dashboard-shell-redesign/04-04-SUMMARY.md"
  modified:
    - "packages/views/dashboard-shell/index.ts"
decisions:
  - "Test file mocks the four child atoms directly via vi.mock instead of reusing app-sidebar.test.tsx's hoisted-mock-graph — composition tests only need to assert that the right atoms render in the right place, not exercise each atom's store-driven behavior. Cheaper, clearer, and the four atoms already have full per-atom test coverage from Plan 03."
  - "AppTopbarProps.wsId is `string | undefined` (optional `?`) — matches BlockerBadge's `wsId: string | undefined` exactly, with no `?? ''` coercion in between, so undefined flows through cleanly. The test 'when wsId is undefined' locks this contract; the test 'when wsId prop is omitted entirely' locks the default value."
  - "Initial JSDoc draft contained the literal substring `useWorkspaceId()` inside a comment that explained why the atom doesn't call it. The Wave 0 grep CI hook (scripts/grep-no-useworkspaceid-in-shell.sh) matches the literal substring across all .ts/.tsx files, so the comment tripped the hook. Rephrased the comment to 'never read workspace context themselves' — keeps the intent, satisfies the hook. (Tracked as Rule 3 — Blocking — below.)"
  - "Barrel exports `type AppTopbarProps` alongside the component — Plan 05's DashboardShell needs to spread/pass through `searchSlot` to AppTopbar and the type is the cleanest way to keep that wiring honest at the type system level."
metrics:
  duration: "~5m"
  tasks_completed: 1
  files_created: 3
  files_modified: 1
  commits: 2
  completed: 2026-04-25T14:45:00Z
---

# Phase 4 Plan 04: AppTopbar Composition Summary

Wave 3 lands the AppTopbar composition wrapping the four Plan 03 topbar atoms (FilterChipRow + BlockerBadge + flex-1 spacer + SearchInput + PrimaryCTA) inside a 48px (`h-12`) `<header>` with `border-b border-border` + `bg-background` + `px-4`. The `searchSlot` prop, when provided, REPLACES the default `<SearchInput>` so Plan 06's Web app can slot its existing Cmd+K `<SearchTrigger>` here without churn. Six new tests cover DOM order, header layout classes, slot replacement, wsId pass-through to BlockerBadge, undefined-wsId tolerance, and the prop-omitted-entirely path. Full dashboard-shell test sweep is 70/70 across nine files; typecheck clean across all packages; grep CI hook for `useWorkspaceId()` exits 0.

## Tasks Completed

| Task | Name                                                            | Commit     | Files                                       |
| ---- | --------------------------------------------------------------- | ---------- | ------------------------------------------- |
| 1    | AppTopbar composition + searchSlot replacement + barrel update  | RED `cdce9a69` / GREEN `bf9588e9` | 2 created + 1 modified |

## Files Created

| Path                                                       | Purpose                                                                                                                                                  | Lines |
| ---------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- | ----- |
| `packages/views/dashboard-shell/app-topbar.tsx`            | Topbar composition wrapping the four Plan 03 atoms; documents prop contract for wsId + searchSlot                                                        | 41    |
| `packages/views/dashboard-shell/app-topbar.test.tsx`       | 6 cases — DOM order, header layout/token classes, searchSlot replacement, wsId pass-through, undefined-wsId tolerance, omitted-prop fallback              | 101   |
| `.planning/phases/04-dashboard-shell-redesign/04-04-SUMMARY.md` | This summary                                                                                                                                       | —     |

## Files Modified

| Path                                                | Change                                                                                                                          |
| --------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| `packages/views/dashboard-shell/index.ts`           | Added: `AppTopbar` + `type AppTopbarProps` + `FilterChipRow` + `BlockerBadge` + `SearchInput` + `PrimaryCTA` exports             |

## Public Prop Signatures

```ts
// app-topbar.tsx
export interface AppTopbarProps {
  /** Workspace id forwarded to wsId-aware children (BlockerBadge). */
  wsId?: string;
  /** When provided, REPLACES the default <SearchInput>. */
  searchSlot?: ReactNode;
}

export function AppTopbar(props: AppTopbarProps): JSX.Element;
```

## DOM Contract (UI-SPEC §8)

```html
<header class="h-12 shrink-0 flex items-center gap-2 border-b border-border bg-background px-4">
  <FilterChipRow />        <!-- left -->
  <BlockerBadge wsId={wsId} />
  <div class="flex-1" />   <!-- spacer -->
  <SearchInput />          <!-- OR searchSlot when provided -->
  <PrimaryCTA />           <!-- rightmost -->
</header>
```

Five direct children, in this exact order. The `flex-1` spacer is what keeps filter chips left-aligned and the CTA right-aligned regardless of how many chips are active.

## searchSlot Replacement Contract — Verified

Test case: `when searchSlot is provided, the default <SearchInput> is NOT rendered and the custom element appears in its position`. The test:

1. Renders `<AppTopbar wsId="ws-1" searchSlot={<div data-testid="custom-search">custom</div>} />`.
2. Asserts `screen.queryByTestId("search-input")` is `null` (the default SearchInput mock did NOT mount).
3. Asserts `screen.getByTestId("custom-search")` is in the DOM.
4. Asserts the custom slot occupies index 3 of `header.children` (the SearchInput position) and PrimaryCTA still occupies index 4.

This is the contract Plan 06 relies on: Web's `apps/web/.../layout.tsx` will pass `<SearchTrigger />` as `searchSlot` to `<DashboardShell>`, which forwards it to `<AppTopbar>`. Desktop omits `searchSlot` and gets the default inline `<SearchInput>`.

## Updated Barrel Surface

`packages/views/dashboard-shell/index.ts` now exports:

```ts
export { AppSidebar } from "./app-sidebar";                    // Plan 02
export { AppTopbar, type AppTopbarProps } from "./app-topbar"; // Plan 04 (new)
export { Wordmark, WordmarkText } from "./wordmark";           // Plan 01
export { PriorityGrid } from "./priority-grid";                // Plan 01
export { NotificationsBadge } from "./notifications-badge";    // Plan 01
export { DarkModeToggle } from "./dark-mode-toggle";           // Plan 01
export { CollapseToggle } from "./collapse-toggle";            // Plan 01
export { FilterChipRow } from "./filter-chip-row";             // Plan 03 (new export)
export { BlockerBadge } from "./blocker-badge";                // Plan 03 (new export)
export { SearchInput } from "./search-input";                  // Plan 03 (new export)
export { PrimaryCTA } from "./primary-cta";                    // Plan 03 (new export)
```

Plan 05 can now import `AppSidebar` + `AppTopbar` together in a single `from "./dashboard-shell"` line (as the index path inside the package, or `from "@multica/views/dashboard-shell"` from outside).

## Verification Results

| Check                                                                    | Result |
| ------------------------------------------------------------------------ | ------ |
| `pnpm --filter @multica/views exec vitest run dashboard-shell/app-topbar.test.tsx` | 6/6 passed (~0.4s) |
| `pnpm --filter @multica/views exec vitest run dashboard-shell` (full sweep) | 70/70 passed across 9 files (~0.9s) |
| `pnpm typecheck` (turbo, all packages + apps)                            | green (7 tasks, 4 cached) |
| `bash scripts/grep-no-useworkspaceid-in-shell.sh`                        | exit 0 (after Rule 3 comment fix) |
| `! grep -rnE '#[0-9a-fA-F]{3,8}\|rgb\(\|dark:' app-topbar.tsx`           | exit 1 (no matches — token-only) |
| Done criteria: app-topbar.tsx + test exist; tests pass; DOM order verified | met |
| Done criteria: barrel exports updated for all topbar atoms + AppTopbar    | met |
| Done criteria: searchSlot replacement contract verified by test           | met |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 — Blocking] JSDoc comment containing literal `useWorkspaceId()` tripped the Wave 0 grep CI hook**

- **Found during:** Task 1 (verification step, after writing the GREEN implementation)
- **Issue:** The first JSDoc draft on `AppTopbarProps.wsId` read `Atoms in packages/views/dashboard-shell/ never call useWorkspaceId() themselves`. The Wave 0 hook (`scripts/grep-no-useworkspaceid-in-shell.sh`) matches the literal substring across all `.ts`/`.tsx` files — comments included — so the explanatory line itself failed the invariant check.
- **Fix:** Rephrased the comment to `Atoms in packages/views/dashboard-shell/ never read workspace context themselves`. Same intent, no forbidden substring.
- **Files modified:** `packages/views/dashboard-shell/app-topbar.tsx` (comment-only)
- **Commit:** Folded into the GREEN commit `bf9588e9` (the GREEN run discovered the hook violation immediately and was iterated to a passing state in the same task).

No other deviations. Plan executed exactly as written for the actual code changes.

## Authentication Gates

None. Plan is pure shared-package composition; no auth flows touched.

## Threat Flags

None. The threat model in 04-04-PLAN.md (T-04-04-01 caller-supplied `searchSlot` is `accept`d as caller responsibility; T-04-04-02 DOM-order spoofing mitigated by ordering test) is fully covered. The composition introduces no new network endpoints, auth paths, file access, or schema changes.

## Known Stubs

None. All four child atoms are real (Plan 03), and AppTopbar itself is pure composition with no placeholder data flows. The PHASE-4-INLINE-STUB inside `blocker-badge.tsx` (count = 0 hardcoded) is owned by Plan 03 and tracked there; Plan 05 swaps it for the real `useBlockerCount` hook from `@multica/core/issues/derived/`.

## TDD Gate Compliance

| Gate     | Commit     | Evidence                                                         |
| -------- | ---------- | ---------------------------------------------------------------- |
| RED      | `cdce9a69` | `test(04-04): add failing test for AppTopbar composition` — vitest reports `Failed to resolve import "./app-topbar"` (suite cannot load) |
| GREEN    | `bf9588e9` | `feat(04-04): compose AppTopbar in dashboard-shell with four Plan 03 atoms` — 6/6 tests pass, full sweep 70/70, typecheck clean |
| REFACTOR | (skipped)  | Composition is 41 lines and trivial; no cleanup pass needed.    |

Sequence verified in `git log HEAD~2..HEAD`: RED → GREEN with the GREEN commit immediately following.

## Self-Check: PASSED

Files asserted exist on disk:

- `packages/views/dashboard-shell/app-topbar.tsx` — FOUND
- `packages/views/dashboard-shell/app-topbar.test.tsx` — FOUND
- `packages/views/dashboard-shell/index.ts` — FOUND (barrel updated; verified `AppTopbar` export string is present)

Commits asserted exist in git log:

- `cdce9a69` (RED) — FOUND
- `bf9588e9` (GREEN) — FOUND

No deletions in commit range (`git diff --diff-filter=D --name-only HEAD~2 HEAD` empty).
