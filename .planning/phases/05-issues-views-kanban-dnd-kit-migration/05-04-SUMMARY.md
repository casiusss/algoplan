---
phase: 05-issues-views-kanban-dnd-kit-migration
plan: 04
subsystem: issues-views
tags: [kbn-03, kbn-04, view-toggle, inline-task-add, segmented-control, german-strings]
requires:
  - "@multica/ui/components/ui/segmented-control (Phase 2 atom)"
  - "@multica/core/issues/stores/view-store-context (useViewStore + useViewStoreApi)"
  - "@multica/core/issues/mutations.useCreateIssue (Hard Constraint B7 — unmodified)"
  - "Wave 2 board/list visual restyle (Plans 02 + 03 — data-* test seams)"
provides:
  - "ViewToggle (SegmentedControl wrapper around viewMode — KBN-04)"
  - "InlineTaskAdd (per-column / per-status inline issue creation row — KBN-03)"
  - "issues-header.tsx wired to ViewToggle (dropdown view picker deleted)"
  - "issues-page.tsx Germanised empty-state + move-failure toast strings"
  - "board-column.tsx + list-view.tsx mounting InlineTaskAdd on add-trigger click"
affects:
  - "packages/views/issues/components (8 files modified, 4 tests touched)"
tech-stack:
  added: []
  patterns:
    - "useCallback wrap on SegmentedControl onValueChange (Pitfall 10 — re-render storm)"
    - "vi.hoisted spies for vi.mock factory closures"
    - "ephemeral local useState for isAdding (never persisted — CLAUDE.md state rule)"
key-files:
  created:
    - packages/views/issues/components/view-toggle.tsx
    - packages/views/issues/components/inline-task-add.tsx
  modified:
    - packages/views/issues/components/view-toggle.test.tsx
    - packages/views/issues/components/inline-task-add.test.tsx
    - packages/views/issues/components/issues-header.tsx
    - packages/views/issues/components/issues-page.tsx
    - packages/views/issues/components/issues-page.test.tsx
    - packages/views/issues/components/board-column.tsx
    - packages/views/issues/components/board-column.test.tsx
    - packages/views/issues/components/list-view.tsx
    - packages/views/issues/components/list-view.test.tsx
decisions:
  - "useCreateIssue receives only { title, status, priority } — workspace_id is sourced inside the hook from useWorkspaceId() (the plan's <interfaces> example was descriptively wrong; mutations.ts:101-123 is the source of truth, B7 frozen)"
  - "Empty-state suppression while isAdding is true — prevents the 'Keine Issues' label from rendering above the inline input on an empty column"
  - "Mock InlineTaskAdd in board-column.test.tsx + list-view.test.tsx as a passive textbox — keeps integration tests focused on mount/unmount semantics and avoids re-pulling the mutation stack"
metrics:
  duration_minutes: 11
  tasks_completed: 4
  files_modified: 9
  commits_count: 4
  tests_added: 16
  tests_total_views: 341
  tests_total_issues: 102
  completed_date: "2026-04-25"
---

# Phase 5 Plan 04: ViewToggle + InlineTaskAdd + header/page wiring Summary

SegmentedControl-based view toggle (Board / Liste) and per-column inline task-add row land on the issues views; the legacy dropdown view picker is removed; page-level strings Germanised. KBN-03 and KBN-04 satisfied without touching the optimistic mutation contract or the view-store body (B6 / B7 byte-identical).

## What was built

### Task 5-04-01 — ViewToggle (KBN-04) — commit `3b3481a5`

`view-toggle.tsx` (45 lines) wraps `SegmentedControl` with two items (`Board`, `Liste`), `aria-label="Ansicht wechseln"`. Reads `viewMode` via `useViewStore((s) => s.viewMode)` (single primitive selector — stable reference). Dispatches via `useViewStoreApi().getState().setViewMode(...)` wrapped in `useCallback` to defeat Pitfall 10 (Base UI ToggleGroup re-subscribes its handlers on every parent render without a memoised callback, producing a re-render storm under fast filter typing).

Persistence is automatic — `viewMode` is already in the view-store's `partialize` allowlist (lines 193-194). Zero new persistence wiring needed.

`view-toggle.test.tsx` — 5 GREEN tests:
- Renders Board + Liste items
- aria-label = "Ansicht wechseln"
- Clicking "Liste" calls setViewMode("list")
- Clicking "Board" (when on list) calls setViewMode("board")
- ArrowRight from Board focuses Liste (Phase 2 ToggleGroup keyboard contract)

### Task 5-04-02 — InlineTaskAdd (KBN-03) — commit `ce71de19`

`inline-task-add.tsx` (94 lines) — props `{ status, onCancel, autoFocus? }`. Renders a card with `<input>` + Abbrechen / Hinzufügen buttons. Submit button disabled when input empty/whitespace OR mutation pending; cancel button stays enabled during pending (Hard Constraint 17). On success: clears input + calls onCancel. On error: `toast.error("Issue konnte nicht erstellt werden")` + preserves input value. `Loader2` spinner with `data-loader-spinner` shown on submit during pending. `e.preventDefault()` on Enter/Esc to keep keyboard semantics deterministic.

Calls `useCreateIssue.mutate({ title, status, priority: "none" }, { onSuccess, onError })` — the workspace_id is supplied inside `useCreateIssue` itself (it reads `useWorkspaceId()` from context). The plan's `<interfaces>` example listed `workspace_id` as a vars field, but the actual `CreateIssueRequest` (api.ts:6-17) does not include it; the hook contract from `mutations.ts:101-123` is the source of truth and B7 is frozen.

`inline-task-add.test.tsx` — 9 GREEN tests using `vi.hoisted` for the spies and a `pendingRef` so each test can flip `isPending` without a `vi.fn().mockReturnValue(...)` dance:
- Renders input + 2 buttons
- Submit disabled when input empty
- Enter submits with `{ title, status, priority: "none" }` shape
- Esc calls onCancel
- Pending shows Loader2 + disables submit
- Esc still works during pending (Constraint 17)
- Failure: toast + input preserved
- Success: clears input + calls onCancel
- Whitespace-only input keeps submit disabled

### Task 5-04-03 — issues-header wiring + Germanise issues-page — commit `23a85e7c`

`issues-header.tsx`: removed `Columns3` and `List` lucide icons from import (verified via grep — only used inside the deleted dropdown). Removed the `viewMode` selector call and `act.setViewMode` references (only used inside the deleted dropdown). The entire 35-line dropdown block (former lines 702-737) is replaced with a single `<ViewToggle />` element, slotted in the same position (right side, after the display popover).

`issues-page.tsx` — two string updates only; signature of `handleMoveIssue` (and every other callback) is BYTE-IDENTICAL (Hard Constraint B2 / KBN-06):
- `toast.error("Failed to move issue")` → `toast.error("Issue konnte nicht verschoben werden")`
- `<p>No issues yet</p>` → `<p>Noch keine Issues</p>`
- `<p>Create an issue to get started.</p>` → `<p>Erstelle ein Issue, um zu starten.</p>`

`issues-page.test.tsx`: empty-state assertion updated from English to German strings. All 6 existing tests stay GREEN.

### Task 5-04-04 — board-column + list-view InlineTaskAdd integration — commit `f23a87f4`

`board-column.tsx`:
- Replaced `useModalStore` import with `useState` + `InlineTaskAdd` imports
- Local `const [isAdding, setIsAdding] = useState(false);` — ephemeral, never persisted
- Add-button onClick: `() => useModalStore.getState().open(...)` → `() => setIsAdding(true)`
- Mounted `<InlineTaskAdd status={status} onCancel={() => setIsAdding(false)} />` as the LAST child of the column body, wrapped in `<div data-board-column-inline-add className="mt-2 px-1">` (UI-SPEC §Board column visual)
- Suppressed the "Keine Issues" / "Hier ablegen" empty label when `isAdding` is true (avoids label sandwiching the inline input)

`list-view.tsx`: identical pattern but lives in the `StatusAccordionItem` sub-component (one `isAdding` state per status):
- Add-button onClick: `e.stopPropagation()` (preserved from before) + `setIsAdding(true)` (replaces modal open)
- Mounted `<InlineTaskAdd ... />` inside `<Accordion.Panel>` as the LAST row, wrapped in `<div data-list-view-inline-add className="px-2 py-1">`
- Suppressed the "Keine Issues" empty label when `isAdding` is true

Tests added (one per file):
- `board-column.test.tsx`: clicking `[data-board-column-add-trigger]` mounts `[data-testid="inline-task-add"]`; Esc on the input unmounts it. Mocks `./inline-task-add` as a passive textbox to keep the test scoped to mount/unmount.
- `list-view.test.tsx`: clicking `[data-list-view-add-trigger]` mounts `[data-testid="inline-task-add"]` inside the panel.

Total view tests went from 100 → 102 in `issues/` (16 new tests across the four files added in this plan).

## Verification

- `pnpm --filter @multica/views exec vitest run issues/` — **102/102 GREEN**
- `pnpm --filter @multica/views exec vitest run` — **341/341 GREEN** (full views package)
- `pnpm --filter @multica/views typecheck` — **clean**
- KBN-05 invariant grep — no legacy `@dnd-kit/{core,sortable,utilities}` in `packages/views/issues/`
- B5 invariant — `git diff main..HEAD packages/core/issues/config/` — 0 files changed
- B6 invariant — `git diff main..HEAD packages/core/issues/stores/view-store.ts` — empty
- B7 invariant — `git diff main..HEAD packages/core/issues/mutations.ts` — empty
- KBN-06 invariant — `handleMoveIssue` signature in `issues-page.tsx` byte-identical (only string literals changed)
- Token discipline grep on Plan 04 surfaces (`view-toggle.tsx`, `inline-task-add.tsx`, `issues-header.tsx`, `issues-page.tsx`, `board-column.tsx`, `list-view.tsx`) — zero hex/RGB/dark: hits

## Deviations from Plan

### [Rule 1 — Bug] InlineTaskAdd vars shape

- **Found during:** Task 5-04-02
- **Issue:** Plan's `<interfaces>` example shows `useCreateIssue` taking `{ workspace_id, title, status, priority }`, but the real `CreateIssueRequest` (packages/core/types/api.ts:6-17) has no `workspace_id` field — the hook reads it internally via `useWorkspaceId()` (`mutations.ts:103`).
- **Fix:** Pass `{ title, status, priority: "none" }` from the component. The hook contract from `mutations.ts:101-123` is the source of truth (Hard Constraint B7 — frozen).
- **Files modified:** packages/views/issues/components/inline-task-add.tsx
- **Commit:** ce71de19

### [Rule 2 — Critical functionality] Suppress empty-state label while inline-add is open

- **Found during:** Task 5-04-04
- **Issue:** Without suppression, `BoardColumn` would render "Keine Issues" / "Hier ablegen" stacked on top of the open InlineTaskAdd input on an empty column — confusing visual state where the user sees both the empty placeholder AND the active form simultaneously.
- **Fix:** Wrap the empty-state branch with `&& !isAdding` so it disappears the moment the inline input mounts. Same fix applied per-status in `list-view.tsx`.
- **Files modified:** packages/views/issues/components/board-column.tsx, packages/views/issues/components/list-view.tsx
- **Commit:** f23a87f4

### [Rule 2 — Critical functionality] e.preventDefault on Enter/Esc

- **Found during:** Task 5-04-02
- **Issue:** Without `preventDefault`, Enter inside an input nested in a form-like container could submit a parent form (none here today, but the inline-add lives inside an Accordion.Panel which proxies keyboard events; better to be explicit). Esc inside Base UI tooltip-anchored inputs can bubble up and close the surrounding popover/menu unexpectedly.
- **Fix:** Call `e.preventDefault()` on both Enter and Escape paths in the keydown handler.
- **Files modified:** packages/views/issues/components/inline-task-add.tsx
- **Commit:** ce71de19

## Deferred Issues (out of scope)

These pre-existing token-discipline hits live in files OUTSIDE Plan 04's `files_modified` scope:

- `packages/views/issues/components/board-card.tsx` — uses `shadow-[0_3px_6px_-2px_rgba(0,0,0,0.02),...]`. Landed in Plan 02 commit `10bebd0f` and was approved by that plan's verifier. Not introduced by Plan 04.
- `packages/views/issues/components/issues-header.tsx` line 66 — comment text `// HoverCheck — shadcn official pattern (PR #6862)` matches the hex regex on `#6862` (false positive — it's a PR number reference inside a code comment, not a styling token). Pre-existing; was already there before Plan 04.

Both flagged here for future Phase 5 / Phase 7 cleanup but explicitly NOT remediated in this plan per the SCOPE BOUNDARY rule.

## Hand-off to Plan 05

Plan 05 (E2E) can now consume:
- `[data-board-column-inline-add]` / `[data-list-view-inline-add]` — new test seams pinpointing where the inline input mounts
- ViewToggle (text "Liste" / "Board") for the persistence E2E (KBN-04)
- InlineTaskAdd `aria-label="Aufgabentitel eingeben"` for typing in the inline-add E2E (KBN-03)
- Existing seams from Plans 02/03 are preserved: `data-board-column-add-trigger`, `data-list-view-add-trigger`, `data-board-column-root`, `data-issue-id`, `data-list-view-status-label`

The KBN-06 contract (handleMoveIssue signature) is byte-identical, so any drag-and-drop E2E specs Plan 05 writes can rely on the existing optimistic update path.

## Self-Check: PASSED

Created files:
- `packages/views/issues/components/view-toggle.tsx` — FOUND
- `packages/views/issues/components/inline-task-add.tsx` — FOUND

Commit hashes:
- `3b3481a5` — FOUND
- `ce71de19` — FOUND
- `23a85e7c` — FOUND
- `f23a87f4` — FOUND
