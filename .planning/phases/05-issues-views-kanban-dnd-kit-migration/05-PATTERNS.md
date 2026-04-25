# Phase 5: Issues Views + Kanban + dnd-kit Migration — Pattern Map

**Mapped:** 2026-04-25
**Files analyzed:** 9 source files (7 modified + 2 new) + 1 utility + 1 test mock update + new test files
**Analogs found:** 11 / 11 (every target has a strong, in-repo analog)
**No 04-PATTERNS.md exists** — patterns sourced directly from the live codebase.

---

## Hinweis (DE)

Phase 5 ist primär ein **Refactor + Restyle**. Jede neue Datei hat ein direktes Analog im selben Verzeichnis (`packages/views/issues/components/`); die zwei wirklich neuen Dateien (`inline-task-add.tsx`, `view-toggle.tsx`) finden ihre nächsten Vorbilder bei `comment-input.tsx` (input-mit-submit-Flow) bzw. bei der existierenden Dropdown-Toggle in `issues-header.tsx` Zeilen 702-737 (gleiche Daten, neuer Atom).

---

## File Classification

| Target File | Status | Role | Data Flow | Closest Analog | Match Quality |
|-------------|--------|------|-----------|----------------|---------------|
| `packages/views/issues/components/board-view.tsx` | REWRITE | view-host (DnD provider, columns state owner) | event-driven (drag) + request-response (mutation) | `packages/views/issues/components/board-view.tsx` (current self) | exact (file edited in place) |
| `packages/views/issues/components/board-column.tsx` | RESTYLE + DnD migrate | view-component (sortable container) | event-driven | `packages/views/issues/components/board-column.tsx` (current self) | exact (file edited in place) |
| `packages/views/issues/components/board-card.tsx` | RESTYLE + DnD migrate | view-component (sortable item) | event-driven | `packages/views/issues/components/board-card.tsx` (current self) | exact (file edited in place) |
| `packages/views/issues/components/list-view.tsx` | RESTYLE | view-component (accordion) | request-response | `packages/views/issues/components/list-view.tsx` (current self) | exact (file edited in place) |
| `packages/views/issues/components/list-row.tsx` | RESTYLE | view-component (row) | request-response | `packages/views/issues/components/list-row.tsx` (current self) | exact (file edited in place) |
| `packages/views/issues/components/issues-page.tsx` | EDIT (small) | page-host | request-response | `packages/views/issues/components/issues-page.tsx` (current self) | exact (file edited in place) |
| `packages/views/issues/components/issues-header.tsx` | EDIT (small) | toolbar | event-driven (UI) | self (Z. 702-737 dropdown is excised; ViewToggle slotted) | exact |
| `packages/views/issues/components/inline-task-add.tsx` | NEW | view-component (inline form) | request-response (create mutation) | `packages/views/issues/components/comment-input.tsx` | role+flow match |
| `packages/views/issues/components/view-toggle.tsx` | NEW | view-component (segmented control wrapper) | event-driven (UI) | `packages/views/issues/components/issues-header.tsx` Z. 702-737 (dropdown view picker — being replaced) + `packages/ui/components/ui/segmented-control.tsx` (atom) | role+flow match |
| `packages/views/issues/components/utils/priority-to-accent-color.ts` (or `utils/priority-color.ts` per RESEARCH) | NEW utility | utility (pure mapping fn) | transform | `packages/views/issues/utils/sort.ts` (pure fn over Issue + config) | role match |
| `packages/views/issues/components/issues-page.test.tsx` | EDIT (small) | test (component) | — | self (existing `vi.mock` blocks for `@dnd-kit/*`) | exact |
| `packages/views/issues/components/{board-view,board-column,board-card,list-view,list-row,inline-task-add,view-toggle}.test.tsx` (NEW per RESEARCH Wave 0) | NEW | tests | — | `packages/ui/components/ui/segmented-control.test.tsx` (Harness pattern) + `packages/views/issues/utils/filter.test.ts` (pure-fn pattern) | role match |

**File-count summary:** 7 modified + 2 NEW components + 1 NEW utility + 1 modified test + 7 NEW component tests = 18 total files in scope.

---

## Pattern Assignments

### `board-view.tsx` (REWRITE — DnD migration)

**Analog:** `packages/views/issues/components/board-view.tsx` (current self) — RESEARCH §Pattern 1, 2, 3 give the v0.4 idioms.

**Imports pattern — REPLACE (Z. 4-17):**

```typescript
// REMOVE:
import {
  DndContext, DragOverlay, PointerSensor, useSensor, useSensors,
  pointerWithin, closestCenter,
  type CollisionDetection, type DragStartEvent, type DragEndEvent, type DragOverEvent,
} from "@dnd-kit/core";
import { arrayMove } from "@dnd-kit/sortable";

// ADD:
import { DragDropProvider } from "@dnd-kit/react";
import { isSortable } from "@dnd-kit/react/sortable";
import { AutoScroller } from "@dnd-kit/dom";
```

**State + ref pattern (KEEP — Z. 128-156):**
The `isDraggingRef`, `columnsRef`, `recentlyMovedRef`, `issueMapRef` snapshot pattern is the WS race-immunity contract. Keep it verbatim — it survives the migration. The `useEffect` that re-builds columns from issues only when `!isDraggingRef.current` (Z. 141-145) is the load-bearing rule.

**Provider replacement (Z. 274-309 → see RESEARCH lines 377-400):**

```typescript
// REPLACE:
<DndContext sensors={sensors} collisionDetection={kanbanCollision}
            onDragStart={...} onDragOver={...} onDragEnd={...}>
  <DragOverlay dropAnimation={null}>...</DragOverlay>
</DndContext>

// WITH:
<DragDropProvider
  plugins={(defaults) => [...defaults, AutoScroller.configure({ acceleration: 15, threshold: { x: 0, y: 0.3 } })]}
  onDragStart={({ source }) => { snapshotRef.current = structuredClone(columnsRef.current); isDraggingRef.current = true; setActiveIssue(issueMapRef.current.get(source.id as string) ?? null); }}
  onDragEnd={({ source, canceled }) => { isDraggingRef.current = false; setActiveIssue(null); if (canceled) return; if (!isSortable(source)) return; const { initialIndex, index, initialGroup, group } = source; if (initialGroup == null || group == null) return; const finalCol = group as IssueStatus; const finalIds = currentColumnIdsForGroup(group); const newPosition = computePosition(finalIds, source.id as string, issueMapRef.current); onMoveIssue(source.id as string, finalCol, newPosition); }}
>
```

**Helpers to KEEP unchanged (Z. 75-96):** `buildColumns`, `computePosition`, `findColumn` are pure, library-agnostic — keep verbatim.

**Helper to REMOVE (Z. 41-53):** `kanbanCollision` — v0.4 owns collision via `useDroppable({ collisionPriority })` per `useDroppable` config. Delete.

**Helper to REMOVE (Z. 187-210):** `handleDragOver` mutating `setColumns` — RESEARCH Anti-Pattern: state mutation during drag breaks WS immunity. Delete; v0.4 handles visual reorder via internal CSS vars.

**Helper to ADAPT (Z. 212-272):** `handleDragEnd` keeps the snapshot-restore + `computePosition` + `onMoveIssue` chain but reads `source.initialIndex/index/initialGroup/group` from the v0.4 event instead of `over.id`/`active.id`.

**DragOverlay (Z. 302-308):** v0.4 has no `<DragOverlay>` primitive at the same API surface — use `<Feedback>` plugin from `@dnd-kit/dom` OR keep the ad-hoc clone via `activeIssue` state + render at portal. The current `DragOverlay` clone reads from `activeIssue` state — port to a `<Feedback>` plugin clone or render via portal under `<DragDropProvider>`. Verify in implementation.

---

### `board-column.tsx` (RESTYLE + DnD migrate)

**Analog:** `packages/views/issues/components/board-column.tsx` (current self).

**Imports pattern — REPLACE (Z. 6-7):**

```typescript
// REMOVE:
import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";

// ADD:
import { useDroppable } from "@dnd-kit/react";
import { CollisionPriority } from "@dnd-kit/abstract";
import { InlineTaskAdd } from "./inline-task-add"; // NEW
```

**`useDroppable` call (Z. 39):**

```typescript
// REPLACE:
const { setNodeRef, isOver } = useDroppable({ id: status });

// WITH:
const { ref, isDropTarget } = useDroppable({
  id: status,
  type: "status-column",
  accept: "task",
  collisionPriority: CollisionPriority.Low,
});
```

**SortableContext removal (Z. 106-110):** `<SortableContext items={...} strategy={verticalListSortingStrategy}>` is GONE in v0.4. Render `resolvedIssues.map(...)` directly inside the body div. Sortable items declare their own `index` + `group` per the new `useSortable` hook (RESEARCH §Pattern 1).

**Drop target visual (Z. 100-104):**

```typescript
// REPLACE: isOver ? "bg-accent/60" : ""
// WITH: isDropTarget ? "ring-2 ring-brand ring-offset-2 ring-offset-background bg-accent/40" : ""
```

**Empty state (Z. 111-115):**

```typescript
// REPLACE: "No issues" → "Keine Issues"
// ADD conditional: when (isDropTarget && issueIds.length === 0) → "Hier ablegen" mit text-brand font-medium
```

**Add button click handler (Z. 88-93):** Replace `useModalStore.getState().open("create-issue", { status })` with `setIsAdding(true)` (NEW local state). Mount `<InlineTaskAdd status={status} onCancel={() => setIsAdding(false)} />` as the LAST child inside the body when `isAdding === true`. Tooltip text: `"Issue hinzufügen"`. Dropdown menu item: `"Spalte ausblenden"`.

**Header italic styling (Z. 57-60):** Keep the badge structure; the label inside `cfg.label` becomes `text-xs italic font-semibold` per UI-SPEC Typography. Wrap or restructure so the italic axis applies only to the label text, not the icon.

---

### `board-card.tsx` (RESTYLE + DnD migrate)

**Analog:** `packages/views/issues/components/board-card.tsx` (current self).

**Imports pattern — REPLACE (Z. 5-7):**

```typescript
// REMOVE:
import { useSortable, defaultAnimateLayoutChanges } from "@dnd-kit/sortable";
import type { AnimateLayoutChanges } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

// ADD:
import { useSortable } from "@dnd-kit/react/sortable";
import { AccentBar } from "@multica/ui/components/ui/accent-bar";
import { priorityToAccentColor } from "../utils/priority-color"; // NEW utility
```

**`useSortable` call (Z. 212-223):**

```typescript
// REPLACE the v6 destructure:
const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
  id: issue.id,
  data: { status: issue.status },
  animateLayoutChanges,
});
const style = { transform: CSS.Transform.toString(transform), transition };

// WITH the v0.4 minimal API (RESEARCH §Pitfall 1 — strict spec adherence):
const { ref, isDragging } = useSortable({
  id: issue.id,
  index,                  // index within column — passed from parent BoardColumn map
  type: "task",
  accept: "task",
  group: issue.status,    // KEY: enables cross-column moves
});
```

**Wrapper element (Z. 230-237):**

```typescript
// REPLACE:
<div ref={setNodeRef} style={style} {...attributes} {...listeners} className={isDragging ? "opacity-30" : ""}>

// WITH:
<div ref={ref} className={isDragging ? "opacity-30" : ""}>
```

**Remove `animateLayoutChanges` helper (Z. 204-208).**

**AccentBar addition (Z. 81 inside `BoardCardContent`):**

```typescript
// ADD overflow-hidden to outer div, then prepend:
<div className="rounded-lg border-[0.5px] bg-card overflow-hidden shadow-...">
  <AccentBar color={priorityToAccentColor(issue.priority)} segments={1} className="h-1 w-full rounded-none" />
  <p className="pt-3 px-2.5 text-xs text-muted-foreground">{issue.identifier}</p>
  ...
```

Note: change `py-3` → `pt-3` because the AccentBar provides 4px top space (UI-SPEC Card section).

---

### `list-view.tsx` (RESTYLE)

**Analog:** `packages/views/issues/components/list-view.tsx` (current self).

**Header height + sticky (Z. 123):**

```typescript
// REPLACE: "group/header flex h-10 items-center rounded-lg bg-muted/40 transition-colors hover:bg-accent/30"
// WITH: "group/header sticky top-0 z-10 flex h-12 items-center rounded-lg bg-card border-b border-border transition-colors hover:bg-accent/30"
```

**Italic label inside badge (Z. 143-146):** Same as board-column — wrap `cfg.label` so it picks up `text-xs italic font-semibold` while the icon stays upright.

**Inline-add wiring (Z. 149-169):** Replace the Plus button's `onClick` from `useModalStore.getState().open(...)` to `setIsAdding(true)` (local state in `StatusAccordionItem`). Mount `<InlineTaskAdd status={status} onCancel={() => setIsAdding(false)} />` as the LAST child in `Accordion.Panel` (Z. 171-186), after the `issues.map(...)` render. Tooltip: `"Issue hinzufügen"`.

**Strings (Z. 167, 182-184):**
- Tooltip: `"Add issue"` → `"Issue hinzufügen"`
- Empty state: `"No issues"` → `"Keine Issues"`

**Count `tabular-nums` (Z. 147):** Add `tabular-nums` class.

---

### `list-row.tsx` (RESTYLE)

**Analog:** `packages/views/issues/components/list-row.tsx` (current self).

**Imports addition (Z. 1-14):**

```typescript
import { AccentBar } from "@multica/ui/components/ui/accent-bar";
import { priorityToAccentColor } from "../utils/priority-color";
```

**Container layout change (Z. 51-55):** Add `relative` to outer `<div>`. Insert leading AccentBar BEFORE the priority/checkbox cluster:

```typescript
<div className={`group/row relative flex h-9 items-center gap-2 px-4 ...`}>
  {!selected && (
    <AccentBar
      color={priorityToAccentColor(issue.priority)}
      orientation="vertical"
      className="absolute inset-y-0 left-0 w-1"
    />
  )}
  ...
```

Per UI-SPEC List Row contract: "Bar disappears when row is selected (selection ring takes over)."

**Title weight (Z. 79):** Change `<span className="truncate">` → `<span className="truncate font-medium">` per Typography contract.

---

### `issues-page.tsx` (EDIT — small)

**Analog:** self.

**Strings only (Z. 159-160):**
- `"No issues yet"` → `"Noch keine Issues"`
- `"Create an issue to get started."` → `"Erstelle ein Issue, um zu starten."`

**Toast (Z. 93):**
- `toast.error("Failed to move issue")` → `toast.error("Issue konnte nicht verschoben werden")`

`handleMoveIssue` signature stays unchanged per KBN-06. No structural changes.

---

### `issues-header.tsx` (EDIT — small)

**Analog:** self (Z. 702-737 = the dropdown view picker being replaced).

**Imports addition:**

```typescript
import { ViewToggle } from "./view-toggle"; // NEW
```

**Imports removal (in same module):** Remove `Columns3`, `List` from the lucide-react import block (Z. 8, 14) IF they're not used elsewhere in the file (verify with grep before removing).

**Replace Z. 702-737 with:**

```typescript
<ViewToggle />
```

Drop the entire `<DropdownMenu>` + `<Tooltip>` + `<DropdownMenuContent>` block. Keep all other filter/sort/display dropdowns intact.

---

### `inline-task-add.tsx` (NEW)

**Closest analog:** `packages/views/issues/components/comment-input.tsx` — submit-on-Enter, loading state via mutation `pending`, disabled-when-empty pattern.

**Reused patterns from `comment-input.tsx`:**

- **Local state for input value** (`comment-input.tsx` Z. 19-23): `useRef` for editor, `useState` for `isEmpty` and `submitting`. For the simpler `inline-task-add`, use `useState<string>("")` for the title.
- **Disabled submit button gated by emptiness + pending** (Z. 99-100): `disabled={isEmpty || submitting}`.
- **Loader2 spinner pattern** (Z. 102-106):
  ```typescript
  {submitting ? <Loader2 className="animate-spin" /> : <ArrowUp />}
  ```
  For Phase 5, swap `ArrowUp` for the German label `"Hinzufügen"` and use `<Loader2 className="size-3 animate-spin" />` per UI-SPEC.
- **handleSubmit pattern** (Z. 37-54): `try/finally` around the async mutation, clearing input on success. For Phase 5, replace the imperative `onSubmit` prop with the `useCreateIssue` hook (RESEARCH lines 101-123).

**Reused mutation pattern from `useCreateIssue` (`packages/core/issues/mutations.ts` Z. 101-123):**

```typescript
const wsId = useWorkspaceId();
const createMutation = useCreateIssue();
const handleSubmit = () => {
  const trimmed = title.trim();
  if (!trimmed || createMutation.isPending) return;
  createMutation.mutate(
    { workspace_id: wsId, title: trimmed, status, priority: "none" },
    {
      onSuccess: () => onCancel(),
      onError: () => toast.error("Issue konnte nicht erstellt werden"),
    },
  );
};
```

The optimistic cache update (`addIssueToBuckets`) already happens inside `useCreateIssue.onSuccess` (Z. 106-109) — no additional cache work needed in the component.

**Layout pattern from UI-SPEC §Inline Task Add:**

```typescript
<div className="rounded-lg border bg-card p-2 space-y-2">
  <input
    type="text"
    value={title}
    onChange={(e) => setTitle(e.target.value)}
    onKeyDown={(e) => {
      if (e.key === "Enter") handleSubmit();
      if (e.key === "Escape") onCancel();
    }}
    placeholder="Aufgabentitel eingeben…"
    aria-label="Aufgabentitel eingeben"
    autoFocus
    disabled={createMutation.isPending}
    className="w-full text-sm bg-transparent border-0 outline-none placeholder:text-muted-foreground"
  />
  <div className="flex items-center gap-2 justify-end">
    <Button variant="ghost" size="sm" onClick={onCancel}>Abbrechen</Button>
    <Button
      variant="default"
      size="sm"
      disabled={!title.trim() || createMutation.isPending}
      onClick={handleSubmit}
    >
      {createMutation.isPending ? <Loader2 className="size-3 animate-spin" /> : "Hinzufügen"}
    </Button>
  </div>
</div>
```

**`useWorkspaceId` access pattern** (`board-card.tsx` Z. 15, 55): `import { useWorkspaceId } from "@multica/core/hooks";` — never read from URL directly.

---

### `view-toggle.tsx` (NEW)

**Closest analog (data flow):** `issues-header.tsx` Z. 702-737 — the dropdown picker being replaced. Reads `viewMode` from `useViewStore`, dispatches `act.setViewMode(...)` (where `act` is `useViewStoreApi().getState()`).

**Closest analog (composition):** `packages/ui/components/ui/segmented-control.tsx` — the atom being wrapped. Note its strict API: `value: string`, `onValueChange: (v: string) => void`, `aria-label` required.

**Reused patterns:**

- **`useViewStore` selector** (board-view.tsx Z. 122-123, list-view.tsx Z. 36-37): `const viewMode = useViewStore((s) => s.viewMode);` — single primitive selector, stable reference per CLAUDE.md state rules.
- **`useViewStoreApi` for dispatching** (board-view.tsx Z. 381 / board-column.tsx Z. 40, 77): `const api = useViewStoreApi(); api.getState().setViewMode("board");` — never call `api.setState({...})` directly; use the existing setter on the store.
- **SegmentedControl wrapping pattern** from `packages/ui/components/ui/segmented-control.tsx` JSDoc Z. 9-30: aria-label required, the atom already swallows deselect.

**Component contract:**

```typescript
"use client";

import { SegmentedControl, SegmentedControlItem } from "@multica/ui/components/ui/segmented-control";
import { useViewStore, useViewStoreApi } from "@multica/core/issues/stores/view-store-context";

export function ViewToggle() {
  const viewMode = useViewStore((s) => s.viewMode);
  const api = useViewStoreApi();
  return (
    <SegmentedControl
      value={viewMode}
      onValueChange={(v) => api.getState().setViewMode(v as "board" | "list")}
      aria-label="Ansicht wechseln"
    >
      <SegmentedControlItem value="board">Board</SegmentedControlItem>
      <SegmentedControlItem value="list">Liste</SegmentedControlItem>
    </SegmentedControl>
  );
}
```

**Persistence:** Inherited automatically from `view-store.ts` Z. 193-194 (`viewMode` already in `partialize` allowlist) — zero new code.

---

### `utils/priority-color.ts` (NEW utility)

**Closest analog:** `packages/views/issues/utils/sort.ts` — pure fn over Issue + config, no React, no async, single named export. The same shape `Issue → derived value` used everywhere in this folder.

**Patterns reused:**

- **Single-purpose pure module** (sort.ts Z. 1-5): top-level imports of types from `@multica/core/types` + config from `@multica/core/issues/config`, no side effects, no default export, single public function.
- **Type imports** (sort.ts Z. 1, 3): `import type { Issue } from "@multica/core/types"; import type { ... } from "@multica/core/issues/stores/view-store";`. For Phase 5 we import `IssuePriority` from `@multica/core/types` and `AccentBarColor` from `@multica/ui/components/ui/accent-bar`.

**Implementation per RESEARCH/UI-SPEC Z. 303-317:**

```typescript
import type { IssuePriority } from "@multica/core/types";
import type { AccentBarColor } from "@multica/ui/components/ui/accent-bar";

export function priorityToAccentColor(p: IssuePriority): AccentBarColor {
  switch (p) {
    case "urgent": return "tag-p0";
    case "high":   return "tag-p1";
    case "medium": return "tag-p2";
    case "low":    return "tag-p3";
    case "none":   return "muted";
  }
}
```

**Path note:** UI-SPEC says `packages/views/issues/components/utils/priority-to-accent-color.ts`; RESEARCH Recommended Project Structure (Z. 244-247) says `packages/views/issues/utils/priority-color.ts`. The latter aligns with the existing `packages/views/issues/utils/{sort,filter,redact}.ts` convention — **planner should pick `packages/views/issues/utils/priority-color.ts`** to keep the utils directory cohesive. Note this in the plan.

---

### `issues-page.test.tsx` (EDIT — small)

**Analog:** self (Z. 209-236 — the existing `vi.mock("@dnd-kit/*", ...)` blocks).

**Replace Z. 209-218 (`@dnd-kit/core` mock):**

```typescript
vi.mock("@dnd-kit/react", () => ({
  DragDropProvider: ({ children }: any) => children,
  useDroppable: () => ({ ref: vi.fn(), isDropTarget: false }),
}));
```

**Replace Z. 220-232 (`@dnd-kit/sortable` mock):**

```typescript
vi.mock("@dnd-kit/react/sortable", () => ({
  useSortable: () => ({
    ref: vi.fn(),
    isDragging: false,
    isDropTarget: false,
    isDragSource: false,
    isDropping: false,
  }),
  isSortable: () => true,
}));
```

**Replace Z. 234-236 (`@dnd-kit/utilities` mock):**

```typescript
vi.mock("@dnd-kit/dom", () => ({
  AutoScroller: { configure: () => ({}) },
}));
```

All other mocks (auth, paths, navigation, view-store, scope-store, selection-store, modals, sonner, accordion, hooks) stay untouched. Test fixtures `mockIssues` (Z. 256-317) stay valid.

---

## Shared Patterns

### TanStack Query mutation wrapping (all writes)

**Source:** `packages/core/issues/mutations.ts` Z. 101-197 (`useCreateIssue`, `useUpdateIssue`).
**Apply to:** `inline-task-add.tsx` (uses `useCreateIssue`), `board-view.tsx` indirectly (uses `useUpdateIssue` via `handleMoveIssue` in `issues-page.tsx`).

**Concrete pattern:** components NEVER touch the cache directly; they call the mutation and let `onMutate` / `onSuccess` / `onSettled` manage cache invalidation. Errors surface via component-level `onError` callback that calls `toast.error(...)` with the German string (UI-SPEC Copy table). The mutation is **already optimistic** (Z. 131-165) — no additional optimistic logic in components.

### Zustand store access (read = selector, write = api.getState)

**Source:** `packages/views/issues/components/board-view.tsx` Z. 122-123 (read) + Z. 381 (write); `packages/views/issues/components/board-column.tsx` Z. 40 + Z. 77.
**Apply to:** `view-toggle.tsx`, `board-column.tsx` (modified add-button click), `list-view.tsx` (modified add-button click).

**Concrete pattern:**

```typescript
// READ — single-primitive selector for stable ref:
const viewMode = useViewStore((s) => s.viewMode);

// WRITE — via context api:
const api = useViewStoreApi();
api.getState().setViewMode("board");
```

Per CLAUDE.md state rules: "Selectors must return stable references." Single primitive selectors are safe; never return objects/arrays from a selector.

### Workspace-scoped queries / mutations

**Source:** `packages/views/issues/components/board-card.tsx` Z. 15, 55 (`useWorkspaceId` then pass to `projectListOptions(wsId)`).
**Apply to:** `inline-task-add.tsx` (must read `wsId` to pass into `useCreateIssue` mutation context, even though `useCreateIssue` reads it internally — for pre-flight assertions).

**Concrete pattern:**

```typescript
import { useWorkspaceId } from "@multica/core/hooks";
const wsId = useWorkspaceId();
```

### Base UI primitive composition with `useRender`/`render` prop

**Source:** `packages/views/issues/components/board-column.tsx` Z. 68-82 (DropdownMenuTrigger + render Button); `packages/views/issues/components/list-view.tsx` Z. 150-168 (TooltipTrigger + render Button).
**Apply to:** `board-column.tsx` modifications (Add button tooltip+button), `list-view.tsx` modifications (same).

**Concrete pattern:**

```typescript
<Tooltip>
  <TooltipTrigger
    render={
      <Button variant="ghost" size="icon-sm" onClick={...}>
        <Plus className="size-3.5" />
      </Button>
    }
  />
  <TooltipContent>Issue hinzufügen</TooltipContent>
</Tooltip>
```

This is the project-wide Base UI pattern — never use the slot/asChild syntax from Radix. The `render` prop accepts a fully-typed React element.

### `cva` variant composition (consumed, not authored in Phase 5)

**Source:** `packages/ui/components/ui/accent-bar.tsx` Z. 5-15 (cva variants for orientation).
**Apply to:** `board-card.tsx` (consume `<AccentBar orientation="horizontal">`), `list-row.tsx` (consume `<AccentBar orientation="vertical">`).

Phase 5 authors **zero new cva variants**. All atom variants already exist; views consume them by passing `orientation` / `color` / `segments` props.

### `cn` class merging

**Source:** `packages/ui/components/ui/segmented-control.tsx` Z. 7, 61-64, 90-97. Used in every UI atom for className merging.
**Apply to:** `inline-task-add.tsx`, `view-toggle.tsx`, `list-row.tsx` (when AccentBar's `className` is composed).

```typescript
import { cn } from "@multica/ui/lib/utils";
className={cn("base classes", conditionalClass && "extra", props.className)}
```

### German strings (Phase 5 only — not a project-wide RBR pass)

**Source:** UI-SPEC §Copywriting Contract Z. 140-164.
**Apply to:** every modified/new view component listed above.

Strings are plain literals in source; no i18n framework introduced. The `aria-live` template strings should be wrapped in tiny string-builder helpers (e.g. `formatDropAnnouncement(title, columnLabel)`) for future i18n swap — UI-SPEC explicitly calls this out.

---

## Test Pattern Assignments

### Component test analog: `packages/ui/components/ui/segmented-control.test.tsx`

**Apply to:** `view-toggle.test.tsx`, `inline-task-add.test.tsx`, `board-column.test.tsx`, `board-card.test.tsx`, `list-row.test.tsx`.

**Patterns to copy:**

- **Test harness pattern** (Z. 8-44): a local `Harness` component owning the controlled state via `useState`, wired to the component under test. Lets every `describe` block render the same fixture without repetition.
- **`describe` blocks per concern** (Z. 46, 63, 84, 128, 145): split tests into render / interaction / keyboard / disabled / source-invariants groups. Phase 5's component tests follow the same shape.
- **`@testing-library/user-event` for interactions** (Z. 3): `await userEvent.click(...)`, `await userEvent.keyboard("{Enter}")` — never raw `fireEvent`.
- **Source-level invariants** (Z. 145-166): for any pattern with a known footgun (e.g. `multiple={false}` instead of `toggleMultiple`, or `useSortable` returning only `{ref}` not `{ref, attributes, listeners}`), add a `readSource()` assertion that greps the component source for the pattern. RESEARCH Pitfall 1 explicitly recommends this for `board-card.tsx`.

### Pure-function test analog: `packages/views/issues/utils/filter.test.ts`

**Apply to:** `priority-color.test.ts`.

**Patterns to copy:**

- **No React** (Z. 1-3): just `vitest` + the function under test. No `render`, no `@testing-library/react`.
- **Per-case assertion** (similar to AccentBar test Z. 16-23 with `for (const color of COLORS)`): one `it(...)` per priority enum value (`urgent`, `high`, `medium`, `low`, `none`), asserting the expected `AccentBarColor` token.

### Component test analog with hoisted mocks: `packages/views/issues/components/issues-page.test.tsx`

**Apply to:** `board-view.test.tsx` (full DnD provider mocking), `list-view.test.tsx` (Accordion mocking).

**Patterns to copy:**

- **`vi.hoisted` for shared mock fns** (Z. 58): `const mockListIssues = vi.hoisted(() => vi.fn().mockResolvedValue(...))`.
- **Zustand store mock with selector + getState** (Z. 16-25, 134-137): `Object.assign(selectorFn, { getState, setState })` — Zustand stores are both callable and have a `.getState()` method, so the mock must satisfy both shapes.
- **Mock `@multica/core/api`** (Z. 59-73) and **`@multica/core/paths`** (Z. 30-39) — these are the workspace-scoped seams; never let real network or URL code into a unit test.

---

## No Analog Found

None — every target file in Phase 5 has a strong, in-repo analog. The closest "no-analog" call is the `<DragDropProvider>` v0.4 wiring itself, but RESEARCH §Pattern 1-4 (Z. 252-350) and the official dnd-kit docs cited there fully cover the gap.

---

## Metadata

**Analog search scope:**
- `packages/views/issues/components/` (all `.tsx` and `.test.tsx`)
- `packages/views/issues/utils/` (sort.ts, filter.ts, filter.test.ts as test analog)
- `packages/ui/components/ui/` (accent-bar, segmented-control, accent-bar.test, segmented-control.test)
- `packages/core/issues/mutations.ts` (useCreateIssue, useUpdateIssue patterns)
- `packages/core/issues/stores/view-store.ts` + `view-store-context.tsx` (selector/api patterns)

**Files scanned in detail:** 13 (board-view, board-column, board-card, list-view, list-row, issues-page, issues-page.test, issues-header [partial], comment-input, segmented-control, segmented-control.test, accent-bar, accent-bar.test [partial], filter.test [partial], mutations [Z. 90-200], sort.ts header).

**Pattern extraction date:** 2026-04-25
