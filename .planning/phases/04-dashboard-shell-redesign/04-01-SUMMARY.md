---
phase: 04-dashboard-shell-redesign
plan: 01
subsystem: dashboard-shell-atoms
tags: [atoms, sidebar, wave-1, tdd]
requires:
  - "04-00 (dashboard-shell directory + grep CI hook + RED test scaffolds)"
provides:
  - "packages/views/dashboard-shell/wordmark.tsx (+ WordmarkText constant)"
  - "packages/views/dashboard-shell/priority-grid.tsx (with PHASE-4-INLINE-STUB)"
  - "packages/views/dashboard-shell/notifications-badge.tsx"
  - "packages/views/dashboard-shell/dark-mode-toggle.tsx"
  - "packages/views/dashboard-shell/collapse-toggle.tsx"
affects:
  - "Plan 02 (composes these atoms inside <AppSidebar>)"
  - "Plan 05 (deletes the PHASE-4-INLINE-STUB inside priority-grid.tsx and rewires the import to @multica/core/issues/derived/use-issue-count-by-priority)"
tech-stack:
  added: []
  patterns:
    - "vi.hoisted() + Object.assign() pattern for mocking the Zustand-style useIssueViewStore (callable selector + .getState())"
    - "QueryClientProvider wrapping for testing TanStack Query consumers in jsdom"
    - "Hydration-safe theme toggle: useState/useEffect mounted gate + generic pre-mount aria-label"
    - "PHASE-4-INLINE-STUB pattern for derived hooks that ship in a later plan"
key-files:
  created:
    - "packages/views/dashboard-shell/wordmark.tsx"
    - "packages/views/dashboard-shell/wordmark.test.tsx"
    - "packages/views/dashboard-shell/dark-mode-toggle.tsx"
    - "packages/views/dashboard-shell/dark-mode-toggle.test.tsx"
    - "packages/views/dashboard-shell/collapse-toggle.tsx"
    - "packages/views/dashboard-shell/priority-grid.tsx"
    - "packages/views/dashboard-shell/priority-grid.test.tsx"
    - "packages/views/dashboard-shell/notifications-badge.tsx"
    - "packages/views/dashboard-shell/notifications-badge.test.tsx"
    - ".planning/phases/04-dashboard-shell-redesign/deferred-items.md"
  modified: []
decisions:
  - "PriorityGrid inline-stubs useIssueCountByPriority returning Object.frozen({p0:0,p1:0,p2:0,p3:0}); Plan 05 deletes the stub block (clearly delimited by `// PHASE-4-INLINE-STUB` start + `// END PHASE-4-INLINE-STUB` end markers) and adds an import from @multica/core/issues/derived/use-issue-count-by-priority."
  - "Wordmark exports a presentational primitive only — no DropdownMenu wiring (Plan 02 owns that). The optional `workspaceName` prop lets Plan 02 pass the active workspace name through to the trigger position while WordmarkText stays the source-of-truth string for the dropdown header."
  - "DarkModeToggle pre-mount renders Moon + aria-label 'Toggle theme' (generic) — matches the safe SSR default from RESEARCH §Pitfall 5 and avoids screen readers announcing the wrong directional action before next-themes hydrates."
  - "PriorityGrid click handler uses `useIssueViewStore.getState().togglePriorityFilter(...)` instead of subscribing to the action via the store hook — keeps the priorityFilters selector subscription stable and avoids spurious re-renders when other store fields change."
  - "NotificationsBadge query keyed on `wsId ? inboxKeys.list(wsId) : ['inbox','disabled']` with `enabled: !!wsId`. Mitigates threat T-04-01-01 — when wsId is undefined no API request fires; the badge degrades gracefully to its zero-count form."
  - "Doc comments inside the new files were rephrased from `useWorkspaceId()` to `the useWorkspaceId hook` so the grep CI hook (which matches the literal string `useWorkspaceId(`) does not self-trigger on documentation. Same fix Plan 00 applied to the barrel placeholder."
  - "PriorityGrid renders cells via the lucide-free Button (variant=ghost, size=sm); cells are NOT SidebarMenuButton because they are a 2x2 grid, not nav rows — placing them inside SidebarMenu would inherit the wrong size + active styling."
metrics:
  duration: "~5m"
  tasks_completed: 2
  files_created: 10
  files_modified: 0
  commits: 2
  completed: 2026-04-25T14:17:48Z
---

# Phase 4 Plan 01: Dashboard Shell Sidebar Atoms Summary

Wave 1 ships the five sidebar leaf components — Wordmark, PriorityGrid, NotificationsBadge, DarkModeToggle, CollapseToggle — each in isolation with co-located vitest specs (4 test files, 29 assertions, all green) and the strict `wsId`-as-prop discipline enforced by the Wave 0 grep CI hook. PriorityGrid carries a delimited PHASE-4-INLINE-STUB for `useIssueCountByPriority` that Plan 05 will delete and rewire.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Wordmark + DarkModeToggle + CollapseToggle (small leaf atoms) | `7fd39a80` | 5 created |
| 2 | PriorityGrid + NotificationsBadge (workspace-data-aware atoms) | `0de19ec5` | 4 created |

## Files Created

| Path | Purpose | Lines |
|------|---------|-------|
| `packages/views/dashboard-shell/wordmark.tsx` | Brand identity surface; exports `Wordmark` component + `WordmarkText` source-of-truth string | 53 |
| `packages/views/dashboard-shell/wordmark.test.tsx` | 7 cases — text, workspace-name override, brand dot + chevron, no italic, semibold/leading-tight typography, collapsed-mode tooltip | 49 |
| `packages/views/dashboard-shell/dark-mode-toggle.tsx` | Hydration-safe Sun/Moon theme toggle | 40 |
| `packages/views/dashboard-shell/dark-mode-toggle.test.tsx` | 5 cases — Moon/Sun rendering by theme, click handlers in both directions, title mirrors aria-label | 86 |
| `packages/views/dashboard-shell/collapse-toggle.tsx` | One-line re-export alias of `SidebarTrigger` | 6 |
| `packages/views/dashboard-shell/priority-grid.tsx` | 2x2 quick-filter grid + `PHASE-4-INLINE-STUB` for `useIssueCountByPriority` | 162 |
| `packages/views/dashboard-shell/priority-grid.test.tsx` | 9 cases — order, labels, no-count empty state, active ring, all 4 toggle priority mappings, collapsed hide class, undefined-wsId safety | 96 |
| `packages/views/dashboard-shell/notifications-badge.tsx` | Inbox row with conditional bg-destructive mini-badge | 67 |
| `packages/views/dashboard-shell/notifications-badge.test.tsx` | 8 cases — Inbox label, no-badge zero state, undefined-wsId safety (no API call), 5/150-count rendering, '99+' clamp, singular/plural aria-label, plain 'Inbox' aria when zero | 167 |
| `.planning/phases/04-dashboard-shell-redesign/deferred-items.md` | Out-of-scope discovery log (1 entry: pre-existing calendar.tsx typecheck error) | 9 |

## Public Prop Signatures

```ts
// wordmark.tsx
export const WordmarkText = "AlgoPlan";
export interface WordmarkProps {
  workspaceName?: string;
  collapsed?: boolean;
  className?: string;
}
export function Wordmark(props: WordmarkProps): JSX.Element;

// dark-mode-toggle.tsx
export function DarkModeToggle(): JSX.Element;

// collapse-toggle.tsx
export { SidebarTrigger as CollapseToggle } from "@multica/ui/components/ui/sidebar";

// priority-grid.tsx
export interface PriorityGridProps {
  wsId: string | undefined;
}
export function PriorityGrid(props: PriorityGridProps): JSX.Element;

// notifications-badge.tsx
export interface NotificationsBadgeProps {
  wsId: string | undefined;
}
export function NotificationsBadge(props: NotificationsBadgeProps): JSX.Element;
```

## PHASE-4-INLINE-STUB Location for Plan 05

File: `packages/views/dashboard-shell/priority-grid.tsx`

The stub is delimited by:

```typescript
// PHASE-4-INLINE-STUB: Plan 05 deletes this stub and rewires the import to
// `@multica/core/issues/derived/use-issue-count-by-priority`. Until then the
// grid renders zero counts so the rest of the chrome can land safely.
interface PriorityCountMap { p0: number; p1: number; p2: number; p3: number; }
const EMPTY_COUNTS: PriorityCountMap = Object.freeze({ p0: 0, p1: 0, p2: 0, p3: 0 });
function useIssueCountByPriority(_wsId: string | undefined): PriorityCountMap {
  return EMPTY_COUNTS;
}
// END PHASE-4-INLINE-STUB
```

Plan 05 should:
1. Delete the entire block between `// PHASE-4-INLINE-STUB` and `// END PHASE-4-INLINE-STUB` (inclusive of both marker comments).
2. Add `import { useIssueCountByPriority } from "@multica/core/issues/derived/use-issue-count-by-priority";` to the existing import block.
3. The exported `PriorityCountMap` type from the new derived module replaces the local interface — verify shape parity (`{p0,p1,p2,p3}: number`) and adjust if the public type uses a different name.

## Mock Patterns Used

### `useTheme` (next-themes wrapper) — `dark-mode-toggle.test.tsx`

```ts
const { mockTheme, mockSetTheme } = vi.hoisted(() => ({
  mockTheme: { current: "light" as "light" | "dark" | "system" },
  mockSetTheme: vi.fn(),
}));

vi.mock("@multica/ui/components/common/theme-provider", () => ({
  useTheme: () => ({
    theme: mockTheme.current,
    resolvedTheme: mockTheme.current,
    setTheme: mockSetTheme,
  }),
}));
```

### `useIssueViewStore` (Zustand selector + .getState()) — `priority-grid.test.tsx`

```ts
vi.mock("@multica/core/issues/stores/view-store", () => {
  const useIssueViewStore = Object.assign(
    (selector?: (s: ...) => unknown) => {
      const state = { ...mockState.current, togglePriorityFilter: mockToggle };
      return selector ? selector(state) : state;
    },
    {
      getState: () => ({ ...mockState.current, togglePriorityFilter: mockToggle }),
    },
  );
  return { useIssueViewStore };
});
```

This is the canonical pattern from CLAUDE.md (Zustand stores are both callable selectors AND have `.getState()`).

### TanStack Query + SidebarProvider wrapping — `notifications-badge.test.tsx`

```tsx
const qc = new QueryClient({
  defaultOptions: { queries: { retry: false, gcTime: 0, staleTime: 0 } },
});
render(
  <QueryClientProvider client={qc}>
    <SidebarProvider>
      <SidebarMenu>
        <NotificationsBadge wsId={props.wsId} />
      </SidebarMenu>
    </SidebarProvider>
  </QueryClientProvider>,
);
```

`SidebarProvider` is required because `SidebarMenuButton` calls `useSidebar()` to read `state` for tooltip behavior; rendering it bare throws "useSidebar must be used within a SidebarProvider". `SidebarMenu` (`<ul>` wrapper) is required because the badge renders an `<li>` (`SidebarMenuItem`) which needs a list parent for valid HTML.

## Validation Results

| Check | Command | Result |
|-------|---------|--------|
| Task 1 tests green | `pnpm --filter @multica/views exec vitest run dashboard-shell/wordmark.test.tsx dashboard-shell/dark-mode-toggle.test.tsx` | 12/12 PASS (0.6s) |
| Task 2 tests green | `pnpm --filter @multica/views exec vitest run dashboard-shell/priority-grid.test.tsx dashboard-shell/notifications-badge.test.tsx` | 17/17 PASS (0.6s) |
| Combined | `pnpm --filter @multica/views exec vitest run dashboard-shell` | 29/29 PASS across 4 test files |
| Grep CI hook | `bash scripts/grep-no-useworkspaceid-in-shell.sh` | `OK: no useWorkspaceId() calls in dashboard-shell/` (exit 0) |
| Hex / RGB / `dark:` scan | `grep -rnE '#[0-9a-fA-F]{3,8}\|rgb\(\|dark:[a-z]' packages/views/dashboard-shell/` | exit 1 (no matches) |
| `pnpm typecheck` (views) | `pnpm --filter @multica/views exec tsc --noEmit` | 1 pre-existing error in `packages/ui/components/ui/calendar.tsx:141` (NOT triggered by Plan 01); see `deferred-items.md`. Zero errors in dashboard-shell/. |

## Key Decisions

### Doc-comment grep self-match avoidance

The Wave 0 grep hook matches the literal string `useWorkspaceId(` (with the opening parenthesis) in any `*.ts`/`*.tsx` file under `packages/views/dashboard-shell/`. Doc comments documenting "the prop arrives so the atom never calls `useWorkspaceId()`" themselves contain that literal pattern and trigger the hook. Resolved exactly as Plan 00 did: rewrite the comment to "the useWorkspaceId hook" (no parenthesis). The invariant is still clearly documented; the hook stays passing.

### `togglePriorityFilter` via `getState()` not via store subscription

Calling `useIssueViewStore(s => s.togglePriorityFilter)` would subscribe the component to *that field* of the store. The action function reference is stable in Zustand, so the practical effect is the same — but the click handler shouldn't re-render the grid when the action reference equality is the only thing that changed. Using `useIssueViewStore.getState().togglePriorityFilter(...)` inside the click handler keeps the priorityFilters selector as the only subscription, which is exactly the SHL-05 stability discipline the phase is enforcing.

### PriorityCell uses `Button` not `SidebarMenuButton`

The cells live inside a CSS grid, not a list. SidebarMenuButton inherits `h-8` + nav-row active styling that doesn't fit a 2x2 grid layout. Using the standard `Button` (`variant=ghost`, `size=sm`) gives correct sizing, hover/focus states, and accessibility while leaving the active visual to the explicit `ring-2 ring-tag-pN` class.

### Wordmark stays presentational (Plan 02 wires the dropdown)

Plan 01 ships `<Wordmark>` as a presentational primitive — a `<span>` with the brand dot, label and chevron, plus a `title` attribute for the collapsed-mode tooltip. The dropdown trigger wiring (clicking opens the workspace switcher) lives in Plan 02, where the wordmark slots into a `<SidebarMenuButton>` inside `<DropdownMenuTrigger>`. The `WordmarkText` constant is exported so Plan 02's dropdown header reuses the literal string without copy-pasting it.

## Threat Mitigation Status

| Threat ID | Disposition | Status |
|-----------|-------------|--------|
| T-04-01-01 (DoS — NotificationsBadge with undefined wsId) | mitigate | MITIGATED — `enabled: !!wsId` plus disabled-key fallback `["inbox","disabled"]`; verified by `notifications-badge.test.tsx` "disables query when wsId is undefined" case |
| T-04-01-02 (Info disclosure — DarkModeToggle pre-hydration aria-label) | mitigate | MITIGATED — pre-mount `label = "Toggle theme"` (generic); verified by reading the implementation; existing test asserts the post-mount labels match exactly the directional copy |
| T-04-01-03 (Tampering — useWorkspaceId leak in shell) | mitigate | MITIGATED — grep CI hook exits 0; all 5 atoms accept `wsId` as a prop or take no workspace input |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Doc comments self-matched the grep CI hook**

- **Found during:** Task 2 verification run
- **Issue:** Two newly-added doc comments contained the literal string `useWorkspaceId()` (with the opening paren). The Wave 0 grep hook matches that exact pattern in any `*.ts`/`*.tsx` file under `packages/views/dashboard-shell/`, causing the hook to fail on its own documentation.
- **Fix:** Rewrote both comments to `the useWorkspaceId hook` (no parenthesis). Same fix Plan 00 applied to the barrel placeholder.
- **Files modified:** `packages/views/dashboard-shell/priority-grid.tsx`, `packages/views/dashboard-shell/notifications-badge.tsx` (comment text only — production code unchanged)
- **Commit:** Folded into `0de19ec5` before commit

### Out-of-Scope Discoveries (logged, NOT fixed)

**1. Pre-existing typecheck error in `packages/ui/components/ui/calendar.tsx:141`**

- **Found during:** post-Task-2 typecheck
- **Issue:** `error TS2322: Type 'React.Ref<HTMLDivElement>' is not assignable…` ("Two different types with this name exist, but they are unrelated") — looks like duplicate `@types/react` package version drift in the lockfile
- **Reproduces without Plan 01 changes** — verified by inspecting `git stash` ↔ `tsc` cycle
- **Action:** Logged in `.planning/phases/04-dashboard-shell-redesign/deferred-items.md`. Out of scope per the SCOPE BOUNDARY (only auto-fix issues DIRECTLY caused by the current plan's changes).

## Self-Check: PASSED

Verified after writing this SUMMARY:

- `packages/views/dashboard-shell/wordmark.tsx` — FOUND
- `packages/views/dashboard-shell/wordmark.test.tsx` — FOUND
- `packages/views/dashboard-shell/dark-mode-toggle.tsx` — FOUND
- `packages/views/dashboard-shell/dark-mode-toggle.test.tsx` — FOUND
- `packages/views/dashboard-shell/collapse-toggle.tsx` — FOUND
- `packages/views/dashboard-shell/priority-grid.tsx` — FOUND (contains `PHASE-4-INLINE-STUB` markers verified)
- `packages/views/dashboard-shell/priority-grid.test.tsx` — FOUND
- `packages/views/dashboard-shell/notifications-badge.tsx` — FOUND
- `packages/views/dashboard-shell/notifications-badge.test.tsx` — FOUND
- `.planning/phases/04-dashboard-shell-redesign/deferred-items.md` — FOUND
- Commit `7fd39a80` — FOUND in `git log`
- Commit `0de19ec5` — FOUND in `git log`
