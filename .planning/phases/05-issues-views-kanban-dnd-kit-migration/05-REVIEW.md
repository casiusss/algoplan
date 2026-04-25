---
phase: 05-issues-views-kanban-dnd-kit-migration
reviewed: 2026-04-25T00:00:00Z
depth: deep
files_reviewed: 19
files_reviewed_list:
  - packages/views/issues/utils/priority-color.ts
  - packages/views/issues/utils/priority-color.test.ts
  - packages/views/issues/components/board-view.tsx
  - packages/views/issues/components/board-view.test.tsx
  - packages/views/issues/components/board-column.tsx
  - packages/views/issues/components/board-column.test.tsx
  - packages/views/issues/components/board-card.tsx
  - packages/views/issues/components/board-card.test.tsx
  - packages/views/issues/components/list-view.tsx
  - packages/views/issues/components/list-view.test.tsx
  - packages/views/issues/components/list-row.tsx
  - packages/views/issues/components/list-row.test.tsx
  - packages/views/issues/components/issues-page.tsx
  - packages/views/issues/components/issues-page.test.tsx
  - packages/views/issues/components/issues-header.tsx
  - packages/views/issues/components/view-toggle.tsx
  - packages/views/issues/components/view-toggle.test.tsx
  - packages/views/issues/components/inline-task-add.tsx
  - packages/views/issues/components/inline-task-add.test.tsx
  - pnpm-workspace.yaml
  - packages/views/package.json
  - apps/web/package.json
  - apps/desktop/package.json
  - e2e/board-drag-ws-race.spec.ts
  - e2e/board-scroll-collision.spec.ts
  - e2e/board-inline-add.spec.ts
  - e2e/issues-view-toggle.spec.ts
  - e2e/issues.spec.ts
  - e2e/fixtures.ts
findings:
  critical: 0
  warning: 3
  info: 2
  total: 5
status: issues_found
---

# Phase 5 — Code Review Report

**Reviewed:** 2026-04-25
**Depth:** deep
**Files Reviewed:** 19 source + 10 supporting
**Status:** issues_found

## Summary

The Phase 5 dnd-kit v0.4 migration is overall sound and well-tested. The new
`@dnd-kit/react` v0.4 contract is respected throughout (`useSortable` returns
only `{ref, isDragging, isDropTarget, isDragSource, isDropping}`; no `attributes`,
`listeners`, `transform`, `transition`, `CSS.Transform`, or
`defaultAnimateLayoutChanges` references remain). The `cross-column` `group`
pattern is used, AutoScroller is configured `{acceleration: 15, threshold:
{x: 0, y: 0.3}}`, and `onDragEnd` uses a hand-rolled splice via
`computeFinalColumnIds` (NOT `move()`). Test seams (`data-issue-id`,
`data-board-column-root`, `data-list-row-leading`) are present and consumed
by E2E specs. KBN-03 InlineTaskAdd correctly uses `useCreateIssue` with
status pre-filled, Esc cancel is always active even during pending mutation
(Hard Constraint 17), German strings are in place. KBN-04 ViewToggle wraps
SegmentedControl, reads `useViewStore((s) => s.viewMode)`, writes via
`useViewStoreApi().getState().setViewMode(...)`, uses `useCallback` (Pitfall
10), and persists via Zustand `partialize` (line 194 of view-store.ts).

`useUpdateIssue` and `view-store.ts` are byte-untouched (git log confirms no
Phase 5 commits to either file).

Three MEDIUM and two LOW/INFO findings were identified — none are CRITICAL,
none are HIGH. One is a documented-but-unimplemented WS-race-immunity layer,
one is a likely visual bug in the list-view add button (Plus icon misplaced
under TooltipTrigger), and one is invalid HTML (div inside span) that will
trigger hydration warnings.

## Per-Rule Verdict (10 Hard Rules)

| # | Rule | Verdict | Notes |
|---|------|---------|-------|
| 1 | Token discipline (no hex/RGB/dark in NEW Phase 5 code) | PASS | Only the pre-existing `rgba()` shadow on `board-card.tsx:84` was found, and the prompt explicitly notes it as deferred. No `dark:*` overrides in NEW Phase 5 code. |
| 2 | dnd-kit migration completeness (KBN-05) | PASS | Zero `@dnd-kit/{core,sortable,utilities}` imports anywhere in `packages/views/issues/`. `dashboard-shell/app-sidebar.tsx` still uses legacy (per F1 — sidebar/dashboard-shell allowed). `packages/views/package.json` retains both legacy + new entries (per Wave 0 plan). |
| 3 | `@dnd-kit/react` v0.4 contract correctness | PASS | `useSortable` destructure in `board-card.tsx:242` returns only `{ref, isDragging}`. No v6 idioms (`attributes`, `listeners`, `transform`, `transition`, `CSS.Transform`, `defaultAnimateLayoutChanges`) anywhere. AutoScroller config correct (`{x: 0, y: 0.3}`, acceleration 15). Hand-rolled splice in `computeFinalColumnIds` (board-view.tsx:69-92). |
| 4 | `onMoveIssue` signature preserved (KBN-06) | PASS | Signature `(issueId: string, newStatus: IssueStatus, newPosition?: number) => void` is byte-identical at `board-view.tsx:108-112` and `issues-page.tsx:77-78`. |
| 5 | `useUpdateIssue` byte-untouched (B5) | PASS | `git log -- packages/core/issues/mutations.ts` shows no Phase 5 commits (last touch was #1422 paginate-every-status before Phase 5). Layer 1 (fire-and-forget cancelQueries) is preserved at line 136. |
| 6 | `view-store.ts` byte-untouched (B6/B7) | PASS | `git log -- packages/core/issues/stores/view-store.ts` shows no Phase 5 commits. `viewMode` is at line 48 (state def) and line 194 (partialize allowlist) — both pre-existing. |
| 7 | WS Race Immunity 3-layer | **PARTIAL FAIL** | Layer 1 (cancelQueries fire-and-forget in `useUpdateIssue.onMutate` line 136) PASS. Layer 2 (`isDraggingRef.current` gate on useEffect line 138 + `issueMapRef` freeze line 165) PASS. Layer 3 (`recentlyMovedRef` 1-frame freeze) **NOT IMPLEMENTED** — the ref is set and reset but **never read** anywhere. See WR-01. |
| 8 | Test seams | PASS | `data-issue-id={issue.id}` on board-card outer (board-card.tsx:83). `data-board-column-root` on board-column outer wrapper (board-column.tsx:51). `data-list-row-leading` wrapper around AccentBar in list-row (list-row.tsx:63). E2E specs consume all three correctly. |
| 9 | Inline Task Add (KBN-03) | PASS | Uses `useCreateIssue` (no re-implementation, line 33). Esc-to-cancel always active even during pending (line 63-66; not gated on `canSubmit`). Enter-to-submit (line 59-62). `column.status` pre-filled (line 40). German strings ("Aufgabentitel eingeben…", "Hinzufügen", "Abbrechen", "Issue konnte nicht erstellt werden"). |
| 10 | View Toggle (KBN-04) | PASS | Wraps `<SegmentedControl>` (view-toggle.tsx:33). Reads `useViewStore((s) => s.viewMode)` (line 25). Writes via `useViewStoreApi().getState().setViewMode(...)` (line 28). Memoised with `useCallback` (Pitfall 10). Persists via existing `partialize` allowlist at view-store.ts:194. |

**Overall verdict:** 9/10 PASS, 1/10 PARTIAL FAIL (Hard Rule 7 Layer 3). FIXES NEEDED.

---

## Critical Issues

_None._

## Warnings

### WR-01: WS Race Immunity Layer 3 (`recentlyMovedRef`) is documented but never enforced

**File:** `packages/views/issues/components/board-view.tsx:147-153, 210`
**Issue:**
The "1-frame freeze gate" described as Hard Constraint 13 (and verified at
`board-view.test.tsx:278-281` with a source-string match) is implemented as
follows:

```ts
const recentlyMovedRef = useRef(false);
useEffect(() => {
  const id = requestAnimationFrame(() => {
    recentlyMovedRef.current = false;
  });
  return () => cancelAnimationFrame(id);
}, [columns]);
// ...
onDragEnd: (event) => {
  // ...
  recentlyMovedRef.current = true;
  // ...
}
```

`grep -rn "recentlyMovedRef" packages/views/issues/` shows the ref is set
(line 210), reset (line 150), and that's it. **It is never read** — neither
in the `useEffect` derivation gate (line 137-141 where Layer 2 lives), nor
anywhere else. The "freeze" therefore has zero behavioural effect; only
Layer 1 (`cancelQueries` in mutations) and Layer 2 (`isDraggingRef` gate)
actually protect against the WS race.

The companion test (`board-view.test.tsx:278-281`) only matches the source
string `recentlyMovedRef = useRef` and the presence of
`requestAnimationFrame(`. It does not assert behavior, so it passes
vacuously.

In practice, the optimistic update in `useUpdateIssue.onMutate` runs
synchronously and `cancelQueries` aborts in-flight refetches, so the
WS-race window between drop and TQ settle is narrow. But the documented
3-layer defense is missing its third leg. The two-context E2E
(`e2e/board-drag-ws-race.spec.ts`) actually races mid-drag (where Layer 2
applies), not mid-rAF post-drop, so it can't catch this gap either.

**Fix (Option A — implement Layer 3):**

```diff
 useEffect(() => {
-  if (!isDraggingRef.current) {
+  if (!isDraggingRef.current && !recentlyMovedRef.current) {
     setColumns(buildColumns(issues, visibleStatuses, sortBy, sortDirection));
   }
 }, [issues, visibleStatuses, sortBy, sortDirection]);
```

Plus extend the source-level invariant test in `board-view.test.tsx` to
assert the read:

```diff
+it("KBN-01 Hard Constraint 13: recentlyMovedRef is READ as a useEffect gate", () => {
+  expect(SRC).toMatch(/!\s*recentlyMovedRef\.current/);
+});
```

**Fix (Option B — drop Layer 3 and update docs):**

If empirical analysis (which Wave 4 E2E coverage may already imply) shows
Layers 1+2 are sufficient, delete the dead ref + its test invariant and
amend `05-05-SUMMARY.md` (and 05-UI-SPEC.md Hard Constraint 13) to
document Layer 3 as deemed unnecessary.

Either fix is acceptable; the current state (claim Layer 3, ship dead
code) is not.

### WR-02: List-view add button likely does not render the `+` icon (Plus misplaced under TooltipTrigger instead of inside Button)

**File:** `packages/views/issues/components/list-view.tsx:162-181`
**Issue:**

```tsx
<Tooltip>
  <TooltipTrigger
    render={
      <Button
        data-list-view-add-trigger
        aria-label="Issue hinzufügen"
        variant="ghost"
        size="icon-sm"
        ...
        onClick={(e) => { e.stopPropagation(); setIsAdding(true); }}
      />            ← self-closing Button (no children)
    }
  >
    <Plus className="size-3.5" />   ← Plus is TooltipTrigger child, NOT Button child
  </TooltipTrigger>
  <TooltipContent>Issue hinzufügen</TooltipContent>
</Tooltip>
```

Compare to the equivalent in `board-column.tsx:82-97`, where `<Plus />` is
correctly placed **inside** the rendered `<Button>` children:

```tsx
<TooltipTrigger
  render={
    <Button data-board-column-add-trigger ...>
      <Plus className="size-3.5" />     ← inside Button
    </Button>
  }
/>
<TooltipContent>Issue hinzufügen</TooltipContent>
```

In Base UI's render-prop / slot pattern, the trigger's children are NOT
automatically merged into the rendered element when `render` provides its
own self-closing element. The `<Plus />` will therefore likely be dropped
or rendered in an unintended position (depending on Slot merge logic
implementation).

The list-view test (`list-view.test.tsx:271-276`) only asserts the
`aria-label` and the presence of the `data-list-view-add-trigger`
attribute — it does NOT assert the Plus icon renders, so the test passes
even if the visual `+` is missing.

**Fix:** Match the board-column pattern exactly:

```diff
-<TooltipTrigger
-  render={
-    <Button
-      data-list-view-add-trigger
-      aria-label="Issue hinzufügen"
-      variant="ghost"
-      size="icon-sm"
-      className="rounded-full text-muted-foreground opacity-0 group-hover/header:opacity-100 transition-opacity"
-      onClick={(e) => {
-        e.stopPropagation();
-        setIsAdding(true);
-      }}
-    />
-  }
->
-  <Plus className="size-3.5" />
-</TooltipTrigger>
+<TooltipTrigger
+  render={
+    <Button
+      data-list-view-add-trigger
+      aria-label="Issue hinzufügen"
+      variant="ghost"
+      size="icon-sm"
+      className="rounded-full text-muted-foreground opacity-0 group-hover/header:opacity-100 transition-opacity"
+      onClick={(e) => {
+        e.stopPropagation();
+        setIsAdding(true);
+      }}
+    >
+      <Plus className="size-3.5" />
+    </Button>
+  }
+/>
```

Also strengthen the test:

```diff
+it("add-button trigger renders the Plus icon", () => {
+  const { container } = renderListView();
+  const trigger = container.querySelector("[data-list-view-add-trigger]");
+  expect(trigger?.querySelector("svg")).toBeTruthy();
+});
```

### WR-03: Invalid HTML — `<div>` rendered inside `<span>` in list-row leading wrapper

**File:** `packages/views/issues/components/list-row.tsx:62-70`
**Issue:**

```tsx
{!selected && (
  <span data-list-row-leading>          ← inline element
    <AccentBar
      color={priorityToAccentColor(issue.priority)}
      orientation="vertical"
      className="absolute inset-y-0 left-0 w-1"
    />                                  ← AccentBar root is <div role="presentation">
  </span>
)}
```

The `AccentBar` atom (see `packages/ui/components/ui/accent-bar.tsx:62-72`)
renders as a `<div role="presentation">`. Wrapping a `<div>` inside a
`<span>` violates HTML5 content-model rules (span is "phrasing content"
and may not contain "flow content" like div). Browsers will auto-close the
`<span>` before encountering the `<div>`, and React will emit a hydration
warning during SSR ("Warning: validateDOMNesting(...): `<div>` cannot
appear as a child of `<span>`").

The test selector `container.querySelector("[data-list-row-leading]")`
still works because the auto-closed span keeps the data attribute.

**Fix:** Replace `<span>` with a block element (`<div>`) — semantics are
"presentation only" so any wrapper works. Or drop the wrapper entirely
and put the seam attribute on a `data-list-row-leading` prop forwarded to
AccentBar (or just on the AccentBar root if you can pass extra HTML
attrs through):

```diff
 {!selected && (
-  <span data-list-row-leading>
+  <div data-list-row-leading>
     <AccentBar
       color={priorityToAccentColor(issue.priority)}
       orientation="vertical"
       className="absolute inset-y-0 left-0 w-1"
     />
-  </span>
+  </div>
 )}
```

The W-1 selector strategy in `list-row.test.tsx:155-172`
(`leading?.querySelector('[data-slot="accent-bar"]')`) continues to work
unchanged.

---

## Info

### IN-01: Dead-import lint-bypass in board-view.tsx

**File:** `packages/views/issues/components/board-view.tsx:18, 28-29`
**Issue:**

```ts
import { ALL_STATUSES, STATUS_CONFIG } from "@multica/core/issues/config";
// Retained for typing; kept intentionally so future column-id helpers stay close to ALL_STATUSES.
void ALL_STATUSES;
```

`ALL_STATUSES` is imported and immediately voided to silence
`no-unused-vars`. The comment "Retained for typing" is misleading — no
type derivation references it. This is a minor maintainability smell.

**Fix:** Either remove the import entirely (the file works without it) or
delete the `void` and the comment and find a real type usage. If you're
genuinely planning a near-term column-id helper, leave a `TODO:` with a
concrete reference instead of `void`:

```diff
-import { ALL_STATUSES, STATUS_CONFIG } from "@multica/core/issues/config";
-// Retained for typing; kept intentionally so future column-id helpers stay close to ALL_STATUSES.
-void ALL_STATUSES;
+import { STATUS_CONFIG } from "@multica/core/issues/config";
```

### IN-02: View-toggle test mock will throw if any consumer calls `useViewStore()` without a selector

**File:** `packages/views/issues/components/view-toggle.test.tsx:13-14`
**Issue:**

```ts
vi.mock("@multica/core/issues/stores/view-store-context", () => ({
  useViewStore: (selector: (s: { viewMode: "board" | "list" }) => unknown) =>
    selector({ viewMode: mockViewMode }),
  ...
}));
```

The mock assumes a selector is always passed. Today's `view-toggle.tsx:25`
always uses one (`useViewStore((s) => s.viewMode)`), but if a future
refactor adds a no-arg call (debugging, devtools), the mock will throw
`selector is not a function`. All other Phase 5 mocks (e.g.
`view-store-context` mocks in `list-row.test.tsx:63`,
`list-view.test.tsx:69`, `board-card.test.tsx:75`) defensively use
`(selector?: any) => selector ? selector(state) : state`.

**Fix:** Match the defensive pattern used elsewhere:

```diff
 vi.mock("@multica/core/issues/stores/view-store-context", () => ({
-  useViewStore: (selector: (s: { viewMode: "board" | "list" }) => unknown) =>
-    selector({ viewMode: mockViewMode }),
+  useViewStore: (selector?: (s: { viewMode: "board" | "list" }) => unknown) => {
+    const state = { viewMode: mockViewMode };
+    return selector ? selector(state) : state;
+  },
   ...
 }));
```

---

_Reviewed: 2026-04-25_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: deep_
