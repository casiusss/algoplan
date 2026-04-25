---
phase: 04-dashboard-shell-redesign
plan: 03
subsystem: dashboard-shell-topbar-atoms
tags: [atoms, topbar, wave-2, tdd, parallel]
requires:
  - "04-00 (dashboard-shell directory + grep CI hook + RED test scaffolds)"
provides:
  - "packages/views/dashboard-shell/filter-chip-row.tsx (state-aware active-filter chip row)"
  - "packages/views/dashboard-shell/blocker-badge.tsx (with PHASE-4-INLINE-STUB)"
  - "packages/views/dashboard-shell/search-input.tsx (presentational search shell)"
  - "packages/views/dashboard-shell/primary-cta.tsx (modal-bound +New issue button)"
affects:
  - "Plan 04 (composes these four atoms inside <AppTopbar>; passes wsId from parent)"
  - "Plan 05 (deletes the PHASE-4-INLINE-STUB block in blocker-badge.tsx and rewires the import to @multica/core/issues/derived/use-blocker-count, AND drops the __blockerCountForTesting export and switches blocker-badge.test.tsx to vi.mock the real hook)"
tech-stack:
  added: []
  patterns:
    - "vi.hoisted() + Object.assign() Zustand mock pattern (selector-callable + .getState()) reused from Plan 01 for useIssueViewStore"
    - "PHASE-4-INLINE-STUB delimited by start/end markers, with __blockerCountForTesting mutable as the test-only seam (Plan 05 deletes both)"
    - "Individual primitive selectors (useIssueViewStore(s => s.priorityFilters), etc.) — UI-SPEC §9 stability rule"
    - "PopoverTrigger with `render` prop wrapping a Button to keep both Base UI primitive semantics and Phase 1 button styling/sizing"
key-files:
  created:
    - "packages/views/dashboard-shell/filter-chip-row.tsx"
    - "packages/views/dashboard-shell/filter-chip-row.test.tsx"
    - "packages/views/dashboard-shell/blocker-badge.tsx"
    - "packages/views/dashboard-shell/blocker-badge.test.tsx"
    - "packages/views/dashboard-shell/search-input.tsx"
    - "packages/views/dashboard-shell/primary-cta.tsx"
    - "packages/views/dashboard-shell/primary-cta.test.tsx"
  modified: []
decisions:
  - "FilterChipRow excludes the 'none' priority from the chip output — it has no matching tag-pN color and PriorityGrid does not surface it as a togglable cell either; rendering a chip for it would be visually inconsistent."
  - "assigneeFilters typed as ActorFilterValue[] (NOT string[]) per Warning W-1 from PLAN-CHECK; chip key derives from `${type}:${id}`, label uses `id` for v1 (Plan 04+ may swap to display name once member/agent stores expose one), onRemove forwards the full ActorFilterValue object back to toggleAssigneeFilter."
  - "Status chip labels use a snake_case → Title Case helper (`statusLabel`) so `in_progress` reads as `In Progress`. The capitalization rule is co-located with the chip-building logic instead of importing from a config layer — keeps the atom standalone and the helper trivially inlined when the chip-building loop changes."
  - "BlockerBadge uses Popover's `render` prop (Base UI polymorphic seam) to wrap a Button rather than wrapping a Button inside `<PopoverTrigger asChild>` — the project's Popover wrapper does not pass `asChild`, so `render` is the supported polymorphic seam. This keeps Phase 1 brand styling, focus rings, and `size=\"icon-sm\"` sizing while preserving the popover's anchor semantics."
  - "Import path corrected from @multica/core/modals/store (plan-suggested) to @multica/core/modals (project convention used by app-sidebar.tsx, board-column.tsx, issue-detail.tsx, help-launcher.tsx) — the /store sub-path is not in the package's exports map. Same bug fix applied to the test mock."
  - "FilterChipRow path-gate uses `useNavigation().pathname` (existing seam) and matches `/{slug}/{issues|my-issues}` via a small regex; no React state, no derived store. The atom returns null off-issues paths so the topbar appears 'invisible' when filters are not relevant."
  - "Test for BlockerBadge count > 0 uses the exported __blockerCountForTesting mutable (per the plan's recommended approach for the inline stub) instead of vi.mock — Plan 05 deletes both the mutable AND the test reliance on it as part of the wire-to-real-hook swap. Documented inline in blocker-badge.tsx so the cleanup is unambiguous."
  - "Tests assert chip color via `closest(\"span\")` because TagChip renders as a `<span>` (defaultTagName via Base UI useRender). The CVA-generated bg-tag-pN class lands on that span, so the assertion is a literal class scan."
metrics:
  duration: "~5m"
  tasks_completed: 2
  files_created: 7
  files_modified: 0
  commits: 2
  completed: 2026-04-25T14:28:44Z
---

# Phase 4 Plan 03: Dashboard Shell Topbar Atoms Summary

Wave 2 ships the four topbar leaf components — FilterChipRow, BlockerBadge, SearchInput, PrimaryCTA — in parallel with Plan 02 (sidebar composition) on disjoint files. 28 new tests across three co-located vitest specs (all green; full dashboard-shell sweep is 57/57 across 7 files), token-only styling, the `wsId`-as-prop discipline enforced by the Wave 0 grep CI hook, and a clearly delimited PHASE-4-INLINE-STUB in `blocker-badge.tsx` that Plan 05 will swap for the real `useBlockerCount` hook from `@multica/core/issues/derived/`.

## Tasks Completed

| Task | Name                                      | Commit     | Files                                         |
| ---- | ----------------------------------------- | ---------- | --------------------------------------------- |
| 1    | FilterChipRow + BlockerBadge atoms        | `d414de5c` | 4 created (2 components + 2 tests)            |
| 2    | SearchInput + PrimaryCTA atoms            | `8241ff50` | 3 created (2 components + 1 test)             |

## Files Created

| Path                                                                | Purpose                                                                       | Lines |
| ------------------------------------------------------------------- | ----------------------------------------------------------------------------- | ----- |
| `packages/views/dashboard-shell/filter-chip-row.tsx`                | Active-filter row reading useIssueViewStore via individual primitive selectors | 130   |
| `packages/views/dashboard-shell/filter-chip-row.test.tsx`           | 14 cases — path gate, empty, single/multi/none-priority filter, status capitalization, assignee object, Clear all, layout classes | 206   |
| `packages/views/dashboard-shell/blocker-badge.tsx`                  | Read-only blocker count badge with PHASE-4-INLINE-STUB for useBlockerCount    | 69    |
| `packages/views/dashboard-shell/blocker-badge.test.tsx`             | 9 cases — icon-only at 0, badge at >0, singular/plural aria, popover open, undefined-wsId safety | 80    |
| `packages/views/dashboard-shell/search-input.tsx`                   | Presentational inline search input (replaceable via AppTopbar searchSlot)     | 25    |
| `packages/views/dashboard-shell/primary-cta.tsx`                    | + New issue button hooked to useModalStore                                    | 23    |
| `packages/views/dashboard-shell/primary-cta.test.tsx`               | 4 cases — exact label, click-to-open with 'create-issue', no-icon assertion   | 42    |

## Public Prop Signatures

```ts
// filter-chip-row.tsx
export function FilterChipRow(): JSX.Element | null;

// blocker-badge.tsx
export interface BlockerBadgeProps {
  /** Workspace id, passed as a prop so the atom never calls the useWorkspaceId hook. */
  wsId: string | undefined;
}
export function BlockerBadge(props: BlockerBadgeProps): JSX.Element;
// PHASE-4-INLINE-STUB test seam — REMOVED by Plan 05:
export const __blockerCountForTesting: { current: number };

// search-input.tsx
export function SearchInput(): JSX.Element;

// primary-cta.tsx
export function PrimaryCTA(): JSX.Element;
```

## PHASE-4-INLINE-STUB Location for Plan 05

File: `packages/views/dashboard-shell/blocker-badge.tsx`

The stub is delimited by:

```typescript
// PHASE-4-INLINE-STUB: Plan 05 deletes this stub and rewires the import to
// `@multica/core/issues/derived/use-blocker-count`. Until then the badge
// renders a literal 0 so the rest of the topbar can land safely.
//
// `__blockerCountForTesting` is exported ONLY so tests can drive the stub
// from `count = 0` (default) into `count > 0` without mocking the module.
// Plan 05 deletes this mutable AND the `__blockerCountForTesting` export
// AND updates blocker-badge.test.tsx to mock the real hook via vi.mock.
export const __blockerCountForTesting = { current: 0 };
function useBlockerCount(_wsId: string | undefined): number {
  return __blockerCountForTesting.current;
}
// END PHASE-4-INLINE-STUB
```

Plan 05 should:

1. Delete the entire block between `// PHASE-4-INLINE-STUB` and `// END PHASE-4-INLINE-STUB` (inclusive of both marker comments).
2. Add `import { useBlockerCount } from "@multica/core/issues/derived/use-blocker-count";` to the existing import block.
3. Update `blocker-badge.test.tsx`:
   - Remove the `__blockerCountForTesting` import.
   - Replace the `beforeEach` mutation with a `vi.mock("@multica/core/issues/derived/use-blocker-count", () => ({ useBlockerCount: vi.fn() }))` and drive the count via `vi.mocked(useBlockerCount).mockReturnValue(...)`.
4. Verify: `! grep -rn "PHASE-4-INLINE-STUB" packages/views/dashboard-shell/` is the Wave 4 acceptance gate.

## Selector Stability Strategy

Per UI-SPEC §9 + SHL-05, FilterChipRow reads from `useIssueViewStore` via three individual primitive selectors:

```typescript
const priorityFilters = useIssueViewStore((s) => s.priorityFilters);
const statusFilters = useIssueViewStore((s) => s.statusFilters);
const assigneeFilters = useIssueViewStore((s) => s.assigneeFilters);
```

Each selector subscribes only to its own array reference. The downstream chip array is built inside a `useMemo` keyed on those three references — same input arrays → same chip output array. Plan 05 will add the explicit Object.is reference test against the derived hooks (`useIssueCountByPriority`, `useBlockerCount`); for FilterChipRow itself the stability is implicit in the primitive-selector + useMemo combination.

Action callbacks are read via `useIssueViewStore.getState().togglePriorityFilter(...)` (and the status / assignee equivalents) inside the chip's onRemove handler — same approach as Plan 01's PriorityGrid: the click handler does NOT subscribe to the action reference, so unrelated store updates can't trigger a chip re-render.

## Mock Patterns Used

### `useIssueViewStore` (callable selector + .getState()) — `filter-chip-row.test.tsx`

Same `vi.hoisted()` + `Object.assign()` pattern as Plan 01's PriorityGrid spec, extended to expose three filter arrays + four action functions:

```typescript
vi.mock("@multica/core/issues/stores/view-store", () => {
  const actions = {
    togglePriorityFilter: mockTogglePriority,
    toggleStatusFilter: mockToggleStatus,
    toggleAssigneeFilter: mockToggleAssignee,
    clearFilters: mockClearFilters,
  };
  const useIssueViewStore = Object.assign(
    (selector?: (s: typeof mockState.current & typeof actions) => unknown) => {
      const state = { ...mockState.current, ...actions };
      return selector ? selector(state) : state;
    },
    { getState: () => ({ ...mockState.current, ...actions }) },
  );
  return { useIssueViewStore };
});
```

### `useNavigation` — `filter-chip-row.test.tsx`

Local mock of the `../navigation` package returning a controllable pathname for the path-gate cases:

```typescript
vi.mock("../navigation", () => ({
  useNavigation: () => ({
    pathname: mockPathname.current,
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
    searchParams: new URLSearchParams(),
  }),
}));
```

### `useModalStore` — `primary-cta.test.tsx`

```typescript
const { mockOpen } = vi.hoisted(() => ({ mockOpen: vi.fn() }));
vi.mock("@multica/core/modals", () => ({
  useModalStore: { getState: () => ({ open: mockOpen }) },
}));
```

## Validation Results

| Check                              | Command                                                                                                                                                                                                                              | Result                                |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------- |
| Task 1 tests green                 | `pnpm --filter @multica/views exec vitest run dashboard-shell/filter-chip-row.test.tsx dashboard-shell/blocker-badge.test.tsx`                                                                                                       | 24/24 PASS (~0.8s)                    |
| Task 2 tests green                 | `pnpm --filter @multica/views exec vitest run dashboard-shell/primary-cta.test.tsx`                                                                                                                                                  | 4/4 PASS (~0.5s)                      |
| Combined dashboard-shell sweep     | `pnpm --filter @multica/views exec vitest run dashboard-shell`                                                                                                                                                                       | 57/57 PASS across 7 test files (~0.8s) |
| Grep CI hook                       | `bash scripts/grep-no-useworkspaceid-in-shell.sh`                                                                                                                                                                                    | `OK: no useWorkspaceId() calls in dashboard-shell/` (exit 0) |
| Hex / RGB / `dark:` scan (4 files) | `grep -rnE '#[0-9a-fA-F]{3,8}\|rgb\(\|dark:' filter-chip-row.tsx blocker-badge.tsx search-input.tsx primary-cta.tsx`                                                                                                                  | exit 1 (no matches)                   |
| `pnpm typecheck` (views)           | `pnpm --filter @multica/views exec tsc --noEmit`                                                                                                                                                                                     | exit 0 (zero errors — Plan 01's pre-existing calendar.tsx error is gone too) |
| PHASE-4-INLINE-STUB markers        | `grep -n "PHASE-4-INLINE-STUB" packages/views/dashboard-shell/blocker-badge.tsx`                                                                                                                                                     | Lines 12 + 24 (start + END markers present) |

## Parallel Wave 2 Confirmation

Plan 03 ran in parallel with Plan 02 on disjoint file sets per PLAN-CHECK §"Wave Dependency Graph":

- **Plan 02 owns:** `packages/views/dashboard-shell/app-sidebar.{tsx,test.tsx}`, `packages/views/dashboard-shell/index.ts`, `packages/views/layout/index.ts`
- **Plan 03 owns:** `packages/views/dashboard-shell/{filter-chip-row,blocker-badge,search-input,primary-cta}.{tsx,test.tsx}` (no test for SearchInput per plan)

Zero file overlap. Plan 03 did not touch sidebar files, the dashboard-shell barrel, or the layout shim.

## Threat Mitigation Status

| Threat ID                                          | Disposition | Status                                                                                                                                                                                                                                       |
| -------------------------------------------------- | ----------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| T-04-03-01 (Tampering — FilterChipRow store reads) | mitigate    | MITIGATED — three individual primitive selectors per UI-SPEC §9; chip array built inside useMemo keyed on those three array references; action callbacks read via `useIssueViewStore.getState()` so click handlers do not subscribe         |
| T-04-03-02 (Info disclosure — BlockerBadge popover)| accept      | ACCEPTED — popover content is the hardcoded literal "No blockers right now."; no data flow                                                                                                                                                   |
| T-04-03-03 (DoS — useModalStore.getState)          | accept      | ACCEPTED — same call surface used by the existing sidebar New Issue button, board column add buttons, issue detail child-issue buttons, and the global C shortcut                                                                            |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Wrong package sub-path for useModalStore**

- **Found during:** Task 2 GREEN phase verification
- **Issue:** Plan 03 specified `import { useModalStore } from "@multica/core/modals/store"` but `@multica/core` only exposes `./modals` (which re-exports `useModalStore` from `./store`). The `/store` sub-path is not in the package's exports map, so vitest threw `"./modals/store" is not exported under the conditions ["node", "development", "import"]`.
- **Fix:** Switched both the production import in `primary-cta.tsx` AND the `vi.mock` target in `primary-cta.test.tsx` to `@multica/core/modals` — the canonical path used by `app-sidebar.tsx`, `board-column.tsx`, `issue-detail.tsx`, and `help-launcher.tsx`.
- **Files modified:** `packages/views/dashboard-shell/primary-cta.tsx`, `packages/views/dashboard-shell/primary-cta.test.tsx` (folded into Task 2 commit before commit)
- **Commit:** `8241ff50`

**2. [Rule 2 - Critical functionality] assigneeFilters type discipline (Warning W-1 from PLAN-CHECK)**

- **Found during:** Task 1 RED-test authoring
- **Issue:** Plan 03's `<interfaces>` block claimed `assigneeFilters: string[]` but `view-store.ts:51` defines `assigneeFilters: ActorFilterValue[]` where `ActorFilterValue = { type: "member" | "agent"; id: string }`. Treating the value as a string would have produced runtime renderer errors (the chip label would be `[object Object]`) AND would have broken the `toggleAssigneeFilter` callback (which expects the full object, not a string).
- **Fix:** Imported `ActorFilterValue` from `@multica/core/issues/stores/view-store`, derived chip key from `${type}:${id}`, used the `id` as the v1 chip label, forwarded the full ActorFilterValue object back to `toggleAssigneeFilter`. Test case 11 verifies the toggle is called with the full object.
- **Files modified:** `packages/views/dashboard-shell/filter-chip-row.tsx`, `packages/views/dashboard-shell/filter-chip-row.test.tsx`
- **Commit:** Folded into `d414de5c`

**3. [Plan-Check W-3] Test mutable kept (not deferred)**

- **Note:** PLAN-CHECK W-3 recommended skipping the `count > 0` test case in Plan 03 to avoid the mutable-stub pattern. Decision: kept the mutable + the count > 0 test case because (a) the SUMMARY+inline doc-comment make the Plan 05 cleanup unambiguous, (b) the test surface is more complete now, and (c) Plan 05's bullet 3 above explicitly walks the cleanup. The pattern is brittle in the abstract but well-isolated and clearly delimited in practice.

### Out-of-Scope Discoveries (logged, NOT fixed)

None this plan. The pre-existing calendar.tsx typecheck error noted in Plan 01's deferred-items.md no longer reproduces under `pnpm typecheck` from this worktree (Plan 01's deferred-items entry was checked against this commit base — the underlying types resolution appears to have stabilized).

## Self-Check: PASSED

Verified after writing this SUMMARY:

- `packages/views/dashboard-shell/filter-chip-row.tsx` — FOUND
- `packages/views/dashboard-shell/filter-chip-row.test.tsx` — FOUND
- `packages/views/dashboard-shell/blocker-badge.tsx` — FOUND (PHASE-4-INLINE-STUB markers verified at lines 12 + 24)
- `packages/views/dashboard-shell/blocker-badge.test.tsx` — FOUND
- `packages/views/dashboard-shell/search-input.tsx` — FOUND
- `packages/views/dashboard-shell/primary-cta.tsx` — FOUND
- `packages/views/dashboard-shell/primary-cta.test.tsx` — FOUND
- Commit `d414de5c` — FOUND in `git log`
- Commit `8241ff50` — FOUND in `git log`
