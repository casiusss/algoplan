# Phase 5: Issues Views + Kanban + dnd-kit Migration — Research

**Researched:** 2026-04-25
**Domain:** React drag-and-drop migration (`@dnd-kit/core` v6 → `@dnd-kit/react` v0.4.0) + Kanban/List view restyle
**Confidence:** HIGH

## Summary

Phase 5 has three layered surfaces: (1) **DnD plumbing** rewrite — 5 files leave the legacy v6 `@dnd-kit/core/sortable/utilities` family and adopt the unified `@dnd-kit/react` v0.4.0 API (`DragDropProvider`, `useSortable` from `/sortable`, `useDroppable` from root, `AutoScroller` from `@dnd-kit/dom`, `move` + `isSortable` helpers). (2) **Visual restyle** — italic Inter column headers, AccentBar leading edges on cards + list rows, German strings, sticky `h-12` list headers, brand-green ring drop targets. (3) **Interaction additions** — inline `+ Task hinzufügen` per column, `SegmentedControl`-based view toggle replacing the dropdown, scroll-collision fix via the `AutoScroller` plugin.

`@dnd-kit/react@0.4.0` is **stable and current** — published 2026-04-13 (12 days old), `@dnd-kit/{dom,abstract,helpers}@0.4.0` are the matching companion releases. The v0.4 cross-column `group` pattern is officially documented; the React `useSortable` returns just `{ref, isDragging, isDropTarget, isDragSource, isDropping}` (no `attributes`/`listeners`/`transform`/`transition` — the `ref` callback wires everything via internal data attrs and CSS variables). The optimistic mutation contract on `useUpdateIssue` is unchanged.

**Migration touch-point count:** 9 source files in scope (7 modified + 2 new) plus 1 test file plus 3 `package.json` updates plus `pnpm-workspace.yaml` catalog additions. **Out of scope (legacy v6 stays):** sidebar (`packages/views/dashboard-shell/app-sidebar.tsx`), desktop tab-bar (`apps/desktop/src/renderer/src/components/tab-bar.tsx`), desktop tab-store (`apps/desktop/src/renderer/src/stores/tab-store.ts`).

**Primary recommendation:** Decompose into 5 plans across 4 waves. Land the dnd-kit API migration FIRST (Wave 1, single plan, file-isolated to `board-view.tsx` + `board-column.tsx` + `board-card.tsx` + `issues-page.test.tsx` + 3 package.json + workspace.yaml) so existing tests (KBN-06) prove green before any visual work begins. Then visual restyle (Wave 2 — list and board can run parallel because they touch disjoint files). Then interaction additions (Wave 3 — `view-toggle.tsx`, `inline-task-add.tsx`, `issues-header.tsx` editor cut). Then E2E race + scroll specs (Wave 4).

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
All implementation choices are at Claude's discretion (CONTEXT.md `## Implementation Decisions → Claude's Discretion`). Key project-level constraints from CLAUDE.md:
- Shared business pages/components in `packages/views/`, never `next/*` or `react-router-dom`
- Headless logic + stores in `packages/core/`
- Atomic UI primitives in `packages/ui/`
- TanStack Query owns server state — no duplication into Zustand
- WS events invalidate queries, never write to stores directly
- Workspace-scoped queries must key on `wsId`
- Mutations are optimistic by default

### Phase Annotation (from ROADMAP)
Phase 5 requires phase-specific research on `@dnd-kit/react` v0.4.0 migration before implementation. Recommended commit split within phase:
1. API migration with existing tests passing
2. Visual restyle
3. Inline task add and WS/scroll fixes

### Claude's Discretion
Everything not explicitly locked above is Claude's call — package versions, sub-decomposition, helper file placement, test fixtures.

### Deferred Ideas (OUT OF SCOPE)
- **Sidebar dnd-kit migration** (UI-SPEC F1) — `packages/views/dashboard-shell/app-sidebar.tsx` stays on legacy `@dnd-kit/core/sortable/utilities`.
- **Desktop tab-bar dnd-kit migration** (UI-SPEC F1) — `apps/desktop/src/renderer/src/components/tab-bar.tsx` + `tab-store.ts` stay on legacy.
- **Multi-segment AccentBar on cards** (Hard Constraint 16) — `segments={1}` only in Phase 5.
- **`cardProperties.tags` field** (UI-CHECK FL3, UI-SPEC F2) — Phase 5 does NOT add a `tags` toggle to the view-store. The TagChip-on-card visual is dropped from this phase. (See decision in §Pitfalls.)
- **Strings in `issues-header.tsx` filter dropdowns** — Phase 7 owns the broader RBR pass.
- **Issue deletion / detail RBR** — Phase 6.

</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| KBN-01 | Drag card between columns updates status; survives WS event from another tab without flickering back | §WS Race Immunity 3-Layer Mechanism (lines below); v0.4 owns visual transforms via refs not React state, eliminating one race source |
| KBN-02 | Drag in scrolled column drops where indicated; drop target does NOT drift from scroll offset | §AutoScroller plugin section; replaces v6 manual collision logic with auto-detected scrollable-ancestor re-measurement |
| KBN-03 | "Task hinzufügen" inline input per column; submit creates issue with column's status pre-filled | §Inline Task Add (UI-SPEC §Inline Task Add) + `useCreateIssue` already exists in `mutations.ts:101-123` |
| KBN-04 | Board/List toggle persists across reload; switch is instant with no full page-chrome remount | §View Toggle (UI-SPEC §View Toggle) + `view-store.ts:193-207` `partialize` already includes `viewMode` |
| KBN-05 | Legacy `@dnd-kit/core` packages removed (scoped to issues page DnD usage per F1; sidebar + tab-bar stay on legacy) | §Migration Touch Points; package.json updates remove from `apps/web/package.json`, `apps/desktop/package.json` (those don't import sidebar/tab-bar transitively for legacy usage); KEEP in `packages/views/package.json` because sidebar inside views still consumes legacy |
| KBN-06 | Existing board-view tests pass; `onMoveIssue(issueId, newStatus, newPosition?)` signature unchanged | `issues-page.tsx:77-97` callsite unchanged; `BoardView` props type unchanged; only the test file's `vi.mock` blocks swap libraries |
| KBN-07 | Restyled list view + new Kanban board view (italic headers, AccentBar, brand-green drop ring, sticky h-12 list headers) | §Visual Restyle (UI-SPEC §Board View, §List View); consumes Phase 1 tokens + Phase 2 atoms only |

</phase_requirements>

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Drag detection / collision / activator | Browser (DOM event listeners) | — | `@dnd-kit/dom` plugin attaches to scrollable ancestors; pointer events are browser-tier |
| Optimistic state patch (issue.status) | Client (TanStack Query cache) | API | `qc.setQueryData` patches list cache locally; API confirms async via `api.updateIssue` |
| Server persistence of status / position | API (Go backend) | Database | Backend owns position float assignment via `PUT /issues/{id}` |
| WS event broadcast (other tabs) | API (Go gorilla/websocket) | — | Backend pushes `issue.updated` events; client invalidates the relevant query |
| View mode persistence (board vs list) | Client (Zustand persist → localStorage) | — | UI preference; never travels to server. `view-store.ts` `partialize` allowlist already covers this |
| Inline-add submit (create issue) | Client (mutation) → API | DB | `useCreateIssue` POST `/issues`; cache patches optimistically via `addIssueToBuckets` |
| AccentBar / italic header rendering | Browser (CSS) | — | Pure visual, no business logic, no API |

## Standard Stack

### Core (NEW for Phase 5)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@dnd-kit/react` | `0.4.0` | React adapter — `DragDropProvider`, `useDraggable`, `useDroppable`, `useSortable` (from `/sortable` sub-import) | [VERIFIED: npm registry] Latest stable, published 2026-04-13. Official replacement for the v6 `@dnd-kit/core/sortable/utilities` triad. |
| `@dnd-kit/dom` | `0.4.0` | DOM-tier plumbing — `AutoScroller` plugin, `Feedback` plugin, modifiers like `RestrictToWindow` | [VERIFIED: npm registry] Companion to `/react@0.4.0`. AutoScroller replaces v6 manual scroll-collision logic. |
| `@dnd-kit/abstract` | `0.4.0` | Type exports — `CollisionPriority`, `Sortable`, `Draggable`, `Droppable` types | [VERIFIED: npm registry] Used for `CollisionPriority.Low` constant in `useDroppable` config. |
| `@dnd-kit/helpers` | `0.4.0` | `move()`, `arrayMove()`, `isSortable` helpers | [VERIFIED: npm registry] `arrayMove` lives here in v0.4 (was `@dnd-kit/sortable` in v6). `move()` is the kanban-friendly helper that handles cross-group transfers automatically. `isSortable` is also re-exported from `@dnd-kit/react/sortable` per the docs. |

**Version verification (run before implementation):**
```bash
npm view @dnd-kit/react version    # Expected: 0.4.0
npm view @dnd-kit/dom version      # Expected: 0.4.0
npm view @dnd-kit/abstract version # Expected: 0.4.0
npm view @dnd-kit/helpers version  # Expected: 0.4.0
```
[VERIFIED: npm registry, 2026-04-25] All four resolve to `0.4.0` stable. v0.4.1 betas exist (latest `0.4.1-beta-20260419222523`) but **pin to `0.4.0`** — not `^0.4.0` — because Phase 5 is the only consumer and we own the migration.

### Supporting (already in catalog or app deps — no change)

| Library | Version | Purpose | Used By |
|---------|---------|---------|---------|
| `@base-ui/react` | `^1.3.0` | `Accordion`, `Toggle`, `ToggleGroup` (the SegmentedControl primitive) | List view, ViewToggle |
| `lucide-react` | catalog (`^1.0.1`) | `Plus`, `MoreHorizontal`, `EyeOff`, `Eye`, `ChevronRight`, `Loader2` | All Phase 5 components |
| `class-variance-authority` | catalog (`^0.7.1`) | Variant CSS in `accent-bar.tsx` (consumed, not authored in Phase 5) | AccentBar |
| `sonner` | `^2.0.7` | `toast.error("Issue konnte nicht …")` | Failure paths |
| `@tanstack/react-query` | catalog (`^5.96.2`) | `useMutation`, `useQuery`, `useQueryClient` for `useUpdateIssue` / `useCreateIssue` | All cache work |
| `zustand` | catalog (`^5.0.0`) | View store + persist middleware (already wired) | `view-store.ts` |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `@dnd-kit/react` | Stay on `@dnd-kit/core` v6 | KBN-05 explicitly removes legacy from issues; v6 also has the scroll-collision drift bug (KBN-02). Not viable. |
| `@dnd-kit/react` | `@hello-pangea/dnd` | Migration cost equivalent; loses the WS-race-friendly ref-driven transform model that v0.4 provides. Out of scope. |
| `move()` helper from `@dnd-kit/helpers` | Hand-rolled splice logic per the `isSortable` example | The hand-rolled path (using `initialIndex`/`index`/`initialGroup`/`group`) gives finer control over the WS race scenario — we mutate state ONLY in `onDragEnd`, not during `onDragOver`. UI-SPEC §WS Race Immunity #2 explicitly requires "No optimistic columns mutation during drag." **Decision: hand-rolled, not `move()`.** |
| Inline-add component | Open the existing `create-issue` modal with `status` prefilled | KBN-03 requirement; the modal flow loses board context. Inline is the requirement. |
| `<SegmentedControl>` toggle | Keep the dropdown | Phase 4 already uses `<SegmentedControl>` for similar two-state UI; UI-SPEC §View Toggle replaces dropdown. Hard Constraint 18. |

**Installation (catalog-first per CLAUDE.md):**
```yaml
# pnpm-workspace.yaml — add under existing catalog:
catalog:
  # ... existing entries ...
  # Drag and drop (v0.4 migration in Phase 5)
  "@dnd-kit/react": "0.4.0"
  "@dnd-kit/dom": "0.4.0"
  "@dnd-kit/abstract": "0.4.0"
  "@dnd-kit/helpers": "0.4.0"
```

```jsonc
// packages/views/package.json — REPLACE the three legacy entries
// (legacy STAYS for sidebar — see §Pitfalls "Sidebar legacy keep")
"dependencies": {
  "@dnd-kit/core": "^6.3.1",        // KEEP — sidebar still uses
  "@dnd-kit/sortable": "^10.0.0",   // KEEP — sidebar still uses
  "@dnd-kit/utilities": "^3.2.2",   // KEEP — sidebar still uses
  "@dnd-kit/react": "catalog:",     // ADD
  "@dnd-kit/dom": "catalog:",       // ADD
  "@dnd-kit/abstract": "catalog:",  // ADD
  "@dnd-kit/helpers": "catalog:",   // ADD
}
```

```jsonc
// apps/web/package.json — REMOVE legacy, ADD nothing (web pulls dnd transitively via @multica/views)
"dependencies": {
  // REMOVE: "@dnd-kit/core": "^6.3.1",
  // REMOVE: "@dnd-kit/sortable": "^10.0.0",
  // REMOVE: "@dnd-kit/utilities": "^3.2.2",
}
```

```jsonc
// apps/desktop/package.json — REMOVE legacy, ADD nothing
"dependencies": {
  // REMOVE: "@dnd-kit/core": "^6.3.1",
  // REMOVE: "@dnd-kit/modifiers": "^9.0.0",
  // REMOVE: "@dnd-kit/sortable": "^10.0.0",
  // REMOVE: "@dnd-kit/utilities": "^3.2.2",
}
```

**Settles UI-CHECK FL4.** Decision: app-level `package.json`s should NOT directly declare dnd-kit deps — they get them transitively from `@multica/views` (which still owns both legacy and new for the duration of the migration window). The desktop tab-bar imports `@dnd-kit/*` directly from `node_modules` via app code → those imports resolve through pnpm's workspace hoisting because `packages/views` declares them. **Verify after install:** `pnpm --filter @multica/desktop build` must still resolve `@dnd-kit/core`, `@dnd-kit/modifiers` for tab-bar.

**Risk note on transitive resolution:** If pnpm strict mode (`shamefully-hoist=false`) blocks the desktop tab-bar from finding `@dnd-kit/core` after we drop it from `apps/desktop/package.json`, planner must re-add the legacy entries to `apps/desktop/package.json` (not `apps/web/package.json` — web has no direct legacy consumer). [ASSUMED: hoist behavior — needs verification at install time. Project's `npmrc` warning about `shamefully-hoist` suggests this WAS configured; planner must check `.npmrc` during plan phase.]

## Architecture Patterns

### System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│  IssuesPage (packages/views/issues/components/issues-page.tsx)      │
│  - useQuery(issueListOptions)  ─────────────► TQ cache (server)     │
│  - useUpdateIssue() (handleMoveIssue)                               │
│  - viewMode = "board" | "list"                                      │
└────────────┬────────────────────────────────────────────┬───────────┘
             │ if "board"                                  │ if "list"
             ▼                                             ▼
┌─────────────────────────────────────┐   ┌──────────────────────────┐
│  BoardView                          │   │  ListView                │
│  ┌───────────────────────────────┐  │   │  ┌────────────────────┐  │
│  │ DragDropProvider              │  │   │  │ Accordion (Base UI)│  │
│  │  plugins: [AutoScroller]      │  │   │  │  - sticky h-12     │  │
│  │  onDragStart  → snapshotRef   │  │   │  │  - italic header   │  │
│  │  onDragEnd    → onMoveIssue() │  │   │  │  - AccentBar rows  │  │
│  │                               │  │   │  └─────────┬──────────┘  │
│  │  ┌──────────────────────────┐ │  │   │            │             │
│  │  │ BoardColumn × 6          │ │  │   │            ▼             │
│  │  │  useDroppable({          │ │  │   │  ListRow × N             │
│  │  │   id: status,            │ │  │   │   - AccentBar (vertical) │
│  │  │   accept: "card",        │ │  │   │   - PriorityIcon ↔ ☐     │
│  │  │   collisionPriority:Low})│ │  │   │   - identifier / title   │
│  │  │                          │ │  │   └──────────────────────────┘
│  │  │  ┌───────────────────┐   │ │  │
│  │  │  │ BoardCard × N     │   │ │  │
│  │  │  │  useSortable({    │   │ │  │
│  │  │  │   id, index,      │   │ │  │
│  │  │  │   group: status,  │   │ │  │
│  │  │  │   type/accept })  │   │ │  │
│  │  │  │  + AccentBar(top) │   │ │  │
│  │  │  └───────────────────┘   │ │  │
│  │  │  InlineTaskAdd row       │ │  │
│  │  └──────────────────────────┘ │  │
│  └───────────────────────────────┘  │
└─────────────────────────────────────┘
                                                ▲
                                                │
┌───────────────────────────────────────────────┴─────────────────────┐
│  IssuesHeader (packages/views/issues/components/issues-header.tsx)  │
│  - <ViewToggle> (NEW — replaces Dropdown at lines 702-737)          │
│    └─ <SegmentedControl> from @multica/ui (Phase 2 atom)            │
│        ├─ "Board"                                                   │
│        └─ "Liste"                                                   │
└─────────────────────────────────────────────────────────────────────┘

         WS events (other tab/user)
                 │
                 ▼
         ws-updaters.ts → qc.setQueryData() → BoardView re-derives
         columns AFTER recentlyMovedRef freeze (1 frame)
```

### Recommended Project Structure (post-Phase-5)

```
packages/views/issues/
├── components/
│   ├── board-view.tsx          # REWRITE — DragDropProvider host
│   ├── board-column.tsx        # RESTYLE + DnD migrate — useDroppable
│   ├── board-card.tsx          # RESTYLE + DnD migrate — useSortable + AccentBar
│   ├── list-view.tsx           # RESTYLE — sticky h-12 italic headers
│   ├── list-row.tsx            # RESTYLE — vertical AccentBar leading edge
│   ├── inline-task-add.tsx     # NEW — shared by board column + list panel
│   ├── view-toggle.tsx         # NEW — SegmentedControl wrapper
│   ├── issues-header.tsx       # EDIT — replace dropdown with <ViewToggle>
│   ├── issues-page.tsx         # EDIT — German empty-state strings + toast
│   ├── issues-page.test.tsx    # EDIT — swap dnd-kit mocks
│   ├── board-view.test.tsx     # NEW (Wave 0)
│   ├── board-column.test.tsx   # NEW (Wave 0)
│   ├── board-card.test.tsx     # NEW (Wave 0)
│   ├── list-view.test.tsx      # NEW (Wave 0)
│   ├── list-row.test.tsx       # NEW (Wave 0)
│   ├── inline-task-add.test.tsx# NEW (Wave 0)
│   └── view-toggle.test.tsx    # NEW (Wave 0)
└── utils/
    ├── priority-color.ts       # NEW — priorityToAccentColor helper
    └── priority-color.test.ts  # NEW — one assertion per priority enum value
```

### Pattern 1: `useSortable` cross-column with `group`

**What:** v0.4's `group` parameter on `useSortable` enables cross-column drags WITHOUT a wrapping `SortableContext`. Items with the same `type` + `accept` between groups are interchangeable.
**When to use:** Every kanban-style multi-list reorder.
**Example (from official docs — verbatim):**
```tsx
// Source: https://github.com/clauderic/dnd-kit/blob/main/apps/docs/docs/react/guides/sortable-state-management.mdx
import {useSortable} from '@dnd-kit/react/sortable';

function SortableTask({id, index, column}) {
  const {ref, isDragging} = useSortable({
    id,
    index,
    type: 'task',
    accept: 'task',
    group: column,  // KEY — enables cross-column moves
  });

  return (
    <div ref={ref} data-dragging={isDragging}>
      {id}
    </div>
  );
}
```

**Critical for Phase 5:** `useSortable` returns just `{ref, isDragging, isDropTarget, isDragSource, isDropping}` (callback ref + state booleans). There is **no** `attributes`, `listeners`, `transform`, or `transition` — those lived in v6. The single ref callback wires everything via internal data attributes and CSS variables. Spread no listeners; the wrapper `<div>` just attaches `ref={ref}` plus className based on `isDragging`. (This **resolves UI-SPEC F4** — the "verify if listeners are returned" flag is settled: in the React adapter, they are not.)
[CITED: https://github.com/clauderic/dnd-kit/blob/main/apps/docs/docs/react/hooks/use-sortable.mdx — "useSortable Hook Output → Refs (ref, targetRef, sourceRef, handleRef) + State Properties (isDropTarget, isDragSource, isDragging, isDropping)"]

### Pattern 2: Hand-rolled cross-group splice in `onDragEnd`

**What:** Phase 5 deliberately does NOT use the `move()` helper or call `setColumns` during `onDragOver`. Instead, the visual reorder happens automatically via v0.4's ref-driven transforms (the `useSortable` `index`/`group` props). Our state mutation fires once at `onDragEnd`.
**When to use:** When you need WS-race immunity — keeping React state in sync with the cache without competing with v0.4's internal visual layer.
**Example (Phase 5 implementation contract):**
```tsx
// Source: synthesis of UI-SPEC §DragDropProvider wiring + official isSortable docs
// (https://github.com/clauderic/dnd-kit/blob/main/apps/docs/docs/react/guides/sortable-state-management.mdx)
import {DragDropProvider} from '@dnd-kit/react';
import {useSortable, isSortable} from '@dnd-kit/react/sortable';
import {AutoScroller} from '@dnd-kit/dom';

<DragDropProvider
  plugins={(defaults) => [
    ...defaults,
    AutoScroller.configure({acceleration: 15, threshold: {x: 0, y: 0.3}}),
  ]}
  onDragStart={({source}) => {
    snapshotRef.current = structuredClone(columnsRef.current);
    isDraggingRef.current = true;
    setActiveIssue(issueMapRef.current.get(source.id as string) ?? null);
  }}
  onDragEnd={({source, canceled}) => {
    isDraggingRef.current = false;
    setActiveIssue(null);
    if (canceled) return;
    if (!isSortable(source)) return;

    const {initialIndex, index, initialGroup, group} = source;
    if (initialGroup == null || group == null) return;

    const finalCol = group as IssueStatus;
    const finalIds = currentColumnIdsForGroup(group);
    const newPosition = computePosition(finalIds, source.id as string, issueMapRef.current);
    onMoveIssue(source.id as string, finalCol, newPosition);
  }}
>
```

### Pattern 3: AutoScroller plugin (replaces v6 manual scroll-collision)

**What:** `AutoScroller.configure({acceleration, threshold})` plugin auto-detects scrollable ancestors and re-measures collision rects every frame relative to scroll position.
**When to use:** Any scrollable column container.
**Example (from official docs — verbatim):**
```tsx
// Source: https://github.com/clauderic/dnd-kit/blob/main/apps/docs/docs/extend/plugins/auto-scroller.mdx
import {DragDropProvider} from '@dnd-kit/react';
import {AutoScroller} from '@dnd-kit/dom';

<DragDropProvider
  plugins={(defaults) => [
    ...defaults,
    AutoScroller.configure({
      acceleration: 15,
      threshold: { x: 0, y: 0.3 },  // y: 0.3 = 30% from top/bottom triggers vertical scroll
    }),
  ]}
>
```

### Pattern 4: Event signature destructuring

**What:** v0.4's drag event handlers receive `(event, manager)` where event is `{operation, canceled}` and operation is `{source, target, position}`. Direct destructuring of `{source, target, canceled}` works because the React adapter spreads operation properties to the event.
**Example (from official docs):**
```tsx
// Source: https://github.com/clauderic/dnd-kit/blob/main/apps/docs/docs/react/components/drag-drop-provider.mdx
onDragOver={({source, target}) => { /* ... */ }}
onDragEnd={({source, target, canceled}) => {
  if (canceled) return;
  // ...
}}
```

### Anti-Patterns to Avoid

- **DO NOT spread `listeners` or `attributes` from `useSortable`** — they don't exist in the React adapter. Just attach `ref={sortable.ref}`. Spreading would attach `undefined` and break TS strict mode.
- **DO NOT mutate `columns` state during `onDragOver`** — let v0.4 own the visual transform. Mutating React state mid-drag is the v6 source of WS races; the whole point of the v0.4 migration is to eliminate it.
- **DO NOT use `useSortable.transform` / `transition` / `CSS.Transform.toString()`** — those are v6 patterns; v0.4 owns the CSS layer via internal CSS vars on the `data-dnd-*` attributes.
- **DO NOT use the `move()` helper from `@dnd-kit/helpers`** — it's friendlier but mutates on `onDragOver`, defeating the WS race immunity contract.
- **DO NOT wrap the column body in `<SortableContext>`** — `SortableContext` + `verticalListSortingStrategy` are v6 concepts. v0.4 has no `SortableContext`; sortables are self-contained per the `useSortable({id, index, group})` config.
- **DO NOT introduce horizontal AutoScroll on the column body** — `threshold.x: 0` keeps horizontal scroll inert during vertical column drags. The board's outer `overflow-x-auto` does its own thing (auto-detected by AutoScroller because it's a scrollable ancestor of the cards).
- **DO NOT call `useViewStore` inside the `BoardView`'s render closure to read `viewMode`** — `viewMode` is read in `IssuesPage` once. Re-reading it inside BoardView would double-subscribe.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Cross-column drag-and-drop | A custom `Sortable` from scratch | `@dnd-kit/react` `useSortable({group})` | Pointer-vs-touch-vs-keyboard activator handling, accessibility ARIA live regions, scroll detection — months of edge cases. |
| Auto-scroll on edge | A manual `addEventListener('mousemove')` + `scrollBy` loop | `AutoScroller` plugin from `@dnd-kit/dom` | Re-measures collision rects every frame; without this, KBN-02 regresses on every browser resize. |
| Cross-column item move | A hand-rolled `splice + setState` in `onDragOver` | `useSortable`'s built-in `index`/`group` (visual) + once-at-end `onDragEnd` (state) | The `move()` helper exists for the simple case; we explicitly opt out for WS race immunity. But avoid duplicating the position-tracking logic — read `source.initialIndex/index/initialGroup/group` from the event. |
| Optimistic mutation rollback | A custom snapshot-and-restore on `onError` | `useUpdateIssue` already implements `onMutate`/`onError`/`onSettled` (mutations.ts:125-197) | Battle-tested; do NOT touch this hook in Phase 5 (Hard Constraint B7). |
| Inline-add input loading state | Roll your own `pending`/`disabled` UI | `useCreateIssue().status === "pending"` + Phase 2 `<Button>` `<Loader2 className="size-3 animate-spin" />` | TanStack Query already exposes the state; inline-add just consumes it. |
| SegmentedControl for view toggle | Hand-roll the active-pill animation | Phase 2 `<SegmentedControl>` (`packages/ui/components/ui/segmented-control.tsx`) | Already shipped, keyboard-accessible (Arrow keys per Base UI ToggleGroup), single-select adapter solves the empty-array deselect problem. |
| AccentBar on cards | Hand-roll a 4px-tall colored stripe | Phase 2 `<AccentBar>` atom (`packages/ui/components/ui/accent-bar.tsx`) | Already supports `segments=1`, `orientation="horizontal" | "vertical"`, color tokens (`tag-p0..p3`, `brand`, `muted`). |

**Key insight:** Phase 5's value is the integration — wiring v0.4's `group` pattern to the existing `STATUS_CONFIG`, threading `useUpdateIssue` through to drag-end, replacing the dropdown with the SegmentedControl. Every line of new code that doesn't add integration value is a regression risk.

## Runtime State Inventory

> Phase 5 is a code refactor + visual restyle. No runtime state migration is required; however, two pre-existing persistence surfaces deserve explicit confirmation.

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| Stored data | None — Phase 5 changes no API contracts, no DB schema, no cache key shape. | None |
| Live service config | None | None |
| OS-registered state | None | None |
| Secrets/env vars | None | None |
| Build artifacts | `node_modules/@dnd-kit/{core,sortable,utilities,modifiers}/` will remain on disk after `pnpm install` because the sidebar + tab-bar still import them. Confirmed expected. | None — `pnpm install` after dep changes will keep legacy + add new. |
| **localStorage (browser persist)** | `multica_issues_view` (per `view-store.ts:220`) — already includes `viewMode` in the `partialize` allowlist (line 193-194). Existing users have a stored value. | **None — verified.** Phase 5's view-store changes are zero (Hard Constraint B6); existing persisted `viewMode: "board" | "list"` survives unchanged. |

**The canonical question:** *After all 9 source files are updated, what runtime systems still have the old API/strings cached?* Answer: Test mocks in `issues-page.test.tsx` mock the legacy library names — these MUST be updated atomically with the implementation file changes (otherwise tests fail at import resolution). The fix is part of Plan 01 in the proposed wave structure.

## Common Pitfalls

### Pitfall 1: useSortable returns `{ref}` only, not `{ref, attributes, listeners, transform, transition}`

**What goes wrong:** Code spreads `{...attributes} {...listeners}` from `useSortable` (v6 idiom) and TypeScript silently passes them as `undefined`. At runtime drag activator is missing because v0.4 wires it via the ref callback's data attrs. Drag never starts.
**Why it happens:** Three-year-old StackOverflow answers, Cursor IDE auto-complete, and the existing `board-card.tsx` lines 213-216 all use the v6 pattern. UI-SPEC §useSortable wiring (board-card.tsx) shows the correct contract.
**How to avoid:** Strict spec adherence — only `ref={sortable.ref}` + className based on `sortable.isDragging`. No `attributes`/`listeners`/`transform`.
**Warning signs:** Cards visually mounted but no drag responds; isDragging never goes true.

### Pitfall 2: `accept` (singular) vs `accepts` (plural)

**What goes wrong:** v0.4 documentation has BOTH `accept` (singular, on `useSortable`) and `accepts` (plural, on `useDroppable`) in different examples. Mixing them silently disables type filtering.
**Why it happens:** The official kanban example uses `accept: "card"` on `useSortable` AND `accept: "card"` on `useDroppable` (singular). The general `useDroppable` doc page shows `accepts: "file"` (plural). Both forms appear to exist; the singular `accept` is consistent across the kanban examples.
**How to avoid:** **Use `accept: "card"` consistently** in Phase 5 — both `useSortable` and `useDroppable` get the singular form per the official kanban guide. Verify with first impl + test; if `isDropTarget` never fires, switch to `accepts`.
[CITED: https://github.com/clauderic/dnd-kit/blob/main/apps/docs/docs/react/guides/multiple-sortable-lists.mdx — kanban example uses `accept: 'task'`]

### Pitfall 3: `arrayMove` import path changed

**What goes wrong:** v6: `import {arrayMove} from '@dnd-kit/sortable'`. v0.4: `import {arrayMove} from '@dnd-kit/helpers'`. Implicit fallback to legacy package is silent because legacy stays in package.json.
**Why it happens:** Sidebar still imports from `@dnd-kit/sortable` so the legacy package resolves; if a board-view file forgets to update its import, it works but uses two different copies of the helper.
**How to avoid:** During Wave 1 migration, grep `packages/views/issues/` for `@dnd-kit/sortable` after the rewrite — every hit must be migrated. (Sidebar lives outside `issues/` so the grep is safe.)

### Pitfall 4: Spreading `(active, over)` from event handlers (v6 destructure)

**What goes wrong:** v6: `onDragEnd={(event) => { const {active, over} = event; ... }}`. v0.4: `onDragEnd={({source, target, canceled}) => { ... }}`. Same field, new name. TS strict mode flags it; non-strict silently breaks.
**Why it happens:** Mass find-and-replace overlooks the property names.
**How to avoid:** UI-SPEC §DragDropProvider wiring is the canonical signature — copy verbatim, don't paraphrase.

### Pitfall 5: Cross-workspace drag-during-WS-event race (KBN-01)

**What goes wrong:** User A drags issue in Tab 1; Tab 2 (same user, different browser tab) refetches `issueListOptions` mid-drag; the cache update flips `issue.status` back; React re-renders the dragging card at the OLD position; v0.4's transform stops applying because the `index`/`group` props change — visual snap-back. Original test that proved this scenario (KBN-01) regresses.
**Why it happens:** v6 was vulnerable because `setColumns` mutated React state during drag. v0.4 is structurally protected (transforms via refs, not React state derived from `issues`) but only IF the implementation honors the contract: no `setColumns` during drag.
**How to avoid:** Hard Constraint 12 — "No `setColumns` mutation during drag." Enforced by: no `setColumns` call inside `onDragOver` handler, plus `useEffect` gate `if (!isDraggingRef.current) setColumns(buildColumns(...))`.
**Warning signs:** Manual repro = open same workspace in two browser tabs; on tab 2, edit a tag of any issue mid-drag-on-tab-1; observe whether card snaps back. E2E test `e2e/board-drag-ws-race.spec.ts` automates this (UI-SPEC §Race immunity test).

### Pitfall 6: `recentlyMovedRef` removal regression

**What goes wrong:** Plan author "cleans up" the existing `recentlyMovedRef` because v0.4 "owns visual transforms." But the ref also gates the `useEffect` that re-derives columns from `issues` after a WS-event invalidation lands in the SAME frame as `onDragEnd`. Without it, the column momentarily renders with the OLD ID list (server hasn't confirmed yet) before the optimistic patch propagates.
**Why it happens:** "v0.4 doesn't need it because of refs" is half-true — the visual is safe, but the React `useEffect` chain is not.
**How to avoid:** Hard Constraint 13 — `recentlyMovedRef` is preserved. Plan must explicitly state: "keep `recentlyMovedRef` and its `requestAnimationFrame` reset."

### Pitfall 7: Sidebar legacy keep — DO NOT remove `@dnd-kit/core` from `packages/views/package.json`

**What goes wrong:** Plan author obeys KBN-05 too literally and drops `@dnd-kit/core/sortable/utilities` from `packages/views/package.json`. The sidebar (`packages/views/dashboard-shell/app-sidebar.tsx`) breaks at next build because it imports from those packages.
**Why it happens:** UI-SPEC F1 explicitly scopes KBN-05 to issues-page DnD; planner skims and sees "remove legacy packages."
**How to avoid:** Three-way diff: legacy STAYS in `packages/views/package.json` (sidebar consumer); legacy MIGHT need to STAY in `apps/desktop/package.json` for tab-bar (verify pnpm hoist behavior at install time — see §Standard Stack risk note); legacy is REMOVED from `apps/web/package.json` (web has zero direct legacy consumers).

### Pitfall 8: `cardProperties.tags` does not exist (FL3 resolution)

**What goes wrong:** UI-SPEC §Component Inventory line for `board-card.tsx` mentions adding `<TagChip>` "when `cardProperties.tags === true`". But `view-store.ts:88-95` shows `CardProperties` only has `priority/description/assignee/dueDate/project/childProgress` — no `tags`. Implementing the TagChip behind `cardProperties.tags` results in dead code.
**Why it happens:** The TagChip-on-card visual was carried over from a future-work draft.
**How to avoid:** **Decision: drop the TagChip visual from Phase 5.** Phase 5 board card has NO tag rendering. (Verbatim per CONTEXT.md "Deferred Ideas" — and explicit here for the planner.)

### Pitfall 9: AccentBar on card collides with `bg-card` overflow

**What goes wrong:** AccentBar is placed at top of card with `h-1`. The card's `rounded-lg` (10px corner radius) clips the bar's outer 10px corners — but only IF the card has `overflow-hidden`. The current `board-card.tsx` line 81 has NO `overflow-hidden`. Without it, the AccentBar renders as a sharp-cornered 4px stripe inside the card border.
**Why it happens:** Easy to miss when visually scanning.
**How to avoid:** UI-SPEC §Board card visual line 290 — "`overflow-hidden` is NEW." Plan task for board-card.tsx restyle MUST add `overflow-hidden` to the outermost card div.

### Pitfall 10: ViewToggle re-render storm via inline arrow function

**What goes wrong:** `<SegmentedControl onValueChange={(v) => setViewMode(v as ViewMode)}>` creates a new function reference every render. Base UI's ToggleGroup may re-subscribe its internal listeners. With Zustand on top, this can cause tiny jank on view switch — not a correctness bug but visible on slower machines.
**Why it happens:** Idiomatic but suboptimal.
**How to avoid:** Use `useCallback`: `const onValueChange = useCallback((v: string) => setViewMode(v as ViewMode), [setViewMode])`. Cheap.

## Code Examples

Verified patterns from official sources, ready for the planner to copy:

### Cross-column kanban with `group` (board-view.tsx + board-column.tsx + board-card.tsx)

```tsx
// Source: https://github.com/clauderic/dnd-kit/blob/main/apps/docs/docs/react/guides/sortable-state-management.mdx
// Adapted for Phase 5: hand-rolled state mutation in onDragEnd (NOT move() helper) for WS race immunity.
import {DragDropProvider} from '@dnd-kit/react';
import {useDroppable} from '@dnd-kit/react';
import {useSortable, isSortable} from '@dnd-kit/react/sortable';
import {AutoScroller} from '@dnd-kit/dom';
import {CollisionPriority} from '@dnd-kit/abstract';

// In BoardView:
<DragDropProvider
  plugins={(defaults) => [
    ...defaults,
    AutoScroller.configure({acceleration: 15, threshold: {x: 0, y: 0.3}}),
  ]}
  onDragStart={({source}) => {
    snapshotRef.current = structuredClone(columnsRef.current);
    isDraggingRef.current = true;
    setActiveIssue(issueMapRef.current.get(source.id as string) ?? null);
  }}
  onDragEnd={({source, canceled}) => {
    isDraggingRef.current = false;
    setActiveIssue(null);
    if (canceled) return;
    if (!isSortable(source)) return;

    const {initialIndex, index, initialGroup, group} = source;
    if (initialGroup == null || group == null) return;
    if (initialGroup === group && initialIndex === index) return;

    const finalCol = group as IssueStatus;
    const finalIds = computeFinalColumnIds(initialGroup, group, initialIndex, index);
    const newPosition = computePosition(finalIds, source.id as string, issueMapRef.current);
    onMoveIssue(source.id as string, finalCol, newPosition);
  }}
>
  {/* columns */}
</DragDropProvider>

// In BoardColumn:
const {ref, isDropTarget} = useDroppable({
  id: status,
  type: 'column',
  accept: 'card',
  collisionPriority: CollisionPriority.Low,
});

return (
  <div ref={ref} className={cn('min-h-[200px] flex-1 ...', isDropTarget && 'ring-2 ring-brand bg-accent/40')}>
    {/* cards */}
  </div>
);

// In BoardCard:
const sortable = useSortable({
  id: issue.id,
  index: cardIndex,
  group: issue.status,
  type: 'card',
  accept: 'card',
  data: {status: issue.status},
});

return (
  <div ref={sortable.ref} className={sortable.isDragging ? 'opacity-30' : ''}>
    <BoardCardContent issue={issue} editable />
  </div>
);
```

### View toggle (view-toggle.tsx)

```tsx
// NEW: packages/views/issues/components/view-toggle.tsx
"use client";

import {useCallback} from "react";
import {SegmentedControl, SegmentedControlItem} from "@multica/ui/components/ui/segmented-control";
import {useViewStore, useViewStoreApi} from "@multica/core/issues/stores/view-store-context";
import type {ViewMode} from "@multica/core/issues/stores/view-store";

export function ViewToggle() {
  const viewMode = useViewStore((s) => s.viewMode);
  const api = useViewStoreApi();
  const onValueChange = useCallback(
    (v: string) => api.getState().setViewMode(v as ViewMode),
    [api],
  );

  return (
    <SegmentedControl
      value={viewMode}
      onValueChange={onValueChange}
      aria-label="Ansicht wechseln"
    >
      <SegmentedControlItem value="board">Board</SegmentedControlItem>
      <SegmentedControlItem value="list">Liste</SegmentedControlItem>
    </SegmentedControl>
  );
}
```

### Inline task add (inline-task-add.tsx)

```tsx
// NEW: packages/views/issues/components/inline-task-add.tsx
"use client";

import {useCallback, useState} from "react";
import {Loader2} from "lucide-react";
import {toast} from "sonner";
import {Button} from "@multica/ui/components/ui/button";
import {useCreateIssue} from "@multica/core/issues/mutations";
import {useWorkspaceId} from "@multica/core/hooks";
import type {IssueStatus} from "@multica/core/types";

export function InlineTaskAdd({
  status,
  onCancel,
  autoFocus = true,
}: {
  status: IssueStatus;
  onCancel: () => void;
  autoFocus?: boolean;
}) {
  const wsId = useWorkspaceId();
  const [title, setTitle] = useState("");
  const createIssue = useCreateIssue();
  const trimmed = title.trim();
  const canSubmit = trimmed.length > 0 && !createIssue.isPending;

  const handleSubmit = useCallback(() => {
    if (!canSubmit) return;
    createIssue.mutate(
      {workspace_id: wsId, title: trimmed, status, priority: "none"},
      {
        onSuccess: () => {
          setTitle("");
          onCancel();
        },
        onError: () => toast.error("Issue konnte nicht erstellt werden"),
      },
    );
  }, [canSubmit, createIssue, wsId, trimmed, status, onCancel]);

  return (
    <div className="rounded-lg border bg-card p-2 space-y-2">
      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") handleSubmit();
          if (e.key === "Escape") onCancel();
        }}
        autoFocus={autoFocus}
        disabled={createIssue.isPending}
        placeholder="Aufgabentitel eingeben…"
        aria-label="Aufgabentitel eingeben"
        className="w-full text-sm bg-transparent border-0 outline-none placeholder:text-muted-foreground"
      />
      <span className="sr-only">Drücke Enter zum Speichern, Esc zum Abbrechen</span>
      <div className="flex items-center gap-2 justify-end">
        <Button variant="ghost" size="sm" onClick={onCancel}>
          Abbrechen
        </Button>
        <Button
          variant="default"
          size="sm"
          disabled={!canSubmit}
          onClick={handleSubmit}
        >
          {createIssue.isPending && <Loader2 className="size-3 animate-spin" />}
          Hinzufügen
        </Button>
      </div>
    </div>
  );
}
```

### Priority → AccentBar color helper (priority-color.ts)

```tsx
// NEW: packages/views/issues/utils/priority-color.ts
import type {IssuePriority} from "@multica/core/types";
import type {AccentBarColor} from "@multica/ui/components/ui/accent-bar";

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

### Test mock swap (issues-page.test.tsx)

```tsx
// REPLACE lines 208-236 of issues-page.test.tsx with:
vi.mock("@dnd-kit/react", () => ({
  DragDropProvider: ({children}: any) => children,
  useDroppable: () => ({ref: vi.fn(), isDropTarget: false}),
  useDraggable: () => ({ref: vi.fn(), isDragging: false}),
}));

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

vi.mock("@dnd-kit/dom", () => ({
  AutoScroller: {configure: () => ({})},
}));

vi.mock("@dnd-kit/abstract", () => ({
  CollisionPriority: {Low: 1, Normal: 2, High: 3},
}));
```

## Codebase Touch-Point Map

### Files MODIFIED (7)

| File | Current LoC | Current key deps | Migration delta |
|------|-------------|------------------|-----------------|
| `packages/views/issues/components/board-view.tsx` | 416 | `@dnd-kit/core` (DndContext, DragOverlay, PointerSensor, pointerWithin, closestCenter, types), `@dnd-kit/sortable` (arrayMove) | **REWRITE.** Replace `DndContext` → `DragDropProvider`. Drop `kanbanCollision` (lines 41-53) — AutoScroller handles it. Drop `PointerSensor` + `useSensors` (lines 172-176) — v0.4 uses internal sensors. Replace `arrayMove` import to `@dnd-kit/helpers`. Drop `setColumns` mutation in `handleDragOver` (lines 187-210) — v0.4 owns visual via refs (Hard Constraint 12). `handleDragEnd` reads from `event.operation.source` (initialGroup/group/initialIndex/index) instead of legacy `(active, over)`. Keep `recentlyMovedRef` + `requestAnimationFrame` (lines 150-156) — Hard Constraint 13. Keep `columnsRef`, `issueMapRef`, `isDraggingRef`, `useEffect` gate. Replace `<DragOverlay>` with v0.4's built-in feedback OR keep custom render — research the `Feedback` plugin from `@dnd-kit/dom` if needed. Update `HiddenColumnsPanel` strings (line 357 `"Hidden columns"` → `"Ausgeblendete Spalten"`; line 408 `"Show column"` → `"Spalte einblenden"`). |
| `packages/views/issues/components/board-column.tsx` | 121 | `@dnd-kit/core` (useDroppable), `@dnd-kit/sortable` (SortableContext, verticalListSortingStrategy) | **RESTYLE + DnD migrate.** Migrate `useDroppable` from `@dnd-kit/core` → `@dnd-kit/react`. Add `type: "column"`, `accept: "card"`, `collisionPriority: CollisionPriority.Low` (Hard Constraint 10). Rename `setNodeRef` → `ref`, `isOver` → `isDropTarget`. **DELETE** `<SortableContext>` + `verticalListSortingStrategy` wrappers (lines 106, 110) — v0.4 doesn't use them. Cards become direct children of the droppable div. Add `ring-2 ring-brand ring-offset-2` styling when `isDropTarget` (replaces `bg-accent/60`). Italic on status badge label (line 59 — add `italic` class). German strings: line 80 `"Hide column"` → `"Spalte ausblenden"`; line 96 `"Add issue"` → `"Issue hinzufügen"`; line 113 `"No issues"` → `"Keine Issues"`; add empty-during-drag swap to `"Hier ablegen"`. Add inline-add row at bottom of column body (mount when local `isAdding` state is true). Replace the current `+` button's onClick (line 90 `useModalStore.getState().open("create-issue", {status})`) with `setIsAdding(true)`. Add `tabular-nums` to count span line 61. |
| `packages/views/issues/components/board-card.tsx` | 247 | `@dnd-kit/sortable` (useSortable, defaultAnimateLayoutChanges, AnimateLayoutChanges), `@dnd-kit/utilities` (CSS) | **RESTYLE + DnD migrate.** `DraggableBoardCard` (lines 210-246): replace `useSortable` import to `@dnd-kit/react/sortable`. **DELETE** `transform`, `transition`, `attributes`, `listeners`, `defaultAnimateLayoutChanges`, `animateLayoutChanges`, `CSS.Transform.toString()` — none exist in v0.4. Wrapper becomes `<div ref={sortable.ref} className={sortable.isDragging ? "opacity-30" : ""}>`. Pass `index` and `group: issue.status` to `useSortable` (parent must thread `cardIndex` prop). Add `type: "card"`, `accept: "card"`, `data: {status: issue.status}` (Hard Constraint 11). `BoardCardContent` (lines 44-202): add `overflow-hidden` to outer `<div>` line 81. Add `<AccentBar color={priorityToAccentColor(issue.priority)} segments={1} className="h-1 w-full rounded-none" />` as FIRST child (above identifier). Adjust identifier row from `py-3` to `pt-3` (AccentBar provides 4px top space). Update `toast.error("Failed to update issue")` → keep English (out of Phase 5 scope per UI-SPEC §Copywriting Contract). |
| `packages/views/issues/components/list-view.tsx` | 189 | none dnd-kit | **RESTYLE.** Accordion header (line 123): change `h-10` → `h-12`; change `bg-muted/40` → `bg-card`; add `sticky top-0 z-10`; add `border-b border-border`. Status label (line 145): wrap with italic — `<span class="... italic ...">{cfg.label}</span>`. Tooltip text (line 167): `"Add issue"` → `"Issue hinzufügen"`. Empty state (line 183): `"No issues"` → `"Keine Issues"`. Replace `+` button onClick (line 157-161 — `useModalStore.getState().open("create-issue", {status})`) with toggle of local `isAdding` state per panel. Mount `<InlineTaskAdd>` as last row of expanded panel when `isAdding === true`. Add `tabular-nums` to count span line 147. |
| `packages/views/issues/components/list-row.tsx` | 110 | none dnd-kit | **RESTYLE.** Add `relative` to outer div line 53. Add absolute-positioned `<AccentBar color={priorityToAccentColor(issue.priority)} orientation="vertical" />` as first child with `className="absolute inset-y-0 left-0 w-1"`. Bar suppressed when `selected` (per UI-SPEC §List row visual line 236). All other content untouched. |
| `packages/views/issues/components/issues-header.tsx` | 742 | none dnd-kit | **EDIT (small).** DELETE lines 702-737 (the dropdown View block). REPLACE with `<ViewToggle />`. Drop `Columns3, List` from icon imports if no longer used. Drop `viewMode` selector at line 387 if only the deleted dropdown consumed it. |
| `packages/views/issues/components/issues-page.tsx` | 181 | none dnd-kit | **EDIT (small).** Line 93 — `toast.error("Failed to move issue")` → `toast.error("Issue konnte nicht verschoben werden")`. Lines 159-160 — `"No issues yet"` → `"Noch keine Issues"`; `"Create an issue to get started."` → `"Erstelle ein Issue, um zu starten."`. NO signature changes (Hard Constraint B2 — `handleMoveIssue` signature unchanged). |

### Files NEW (2 + 1 helper + 7 tests)

| File | Purpose |
|------|---------|
| `packages/views/issues/components/inline-task-add.tsx` | NEW — see Code Example above |
| `packages/views/issues/components/view-toggle.tsx` | NEW — see Code Example above |
| `packages/views/issues/utils/priority-color.ts` | NEW — see Code Example above |
| `packages/views/issues/utils/priority-color.test.ts` | NEW (Wave 0) — one assertion per priority enum |
| `packages/views/issues/components/board-view.test.tsx` | NEW (Wave 0) — see Required Test Cases below |
| `packages/views/issues/components/board-column.test.tsx` | NEW (Wave 0) |
| `packages/views/issues/components/board-card.test.tsx` | NEW (Wave 0) |
| `packages/views/issues/components/list-view.test.tsx` | NEW (Wave 0) |
| `packages/views/issues/components/list-row.test.tsx` | NEW (Wave 0) |
| `packages/views/issues/components/inline-task-add.test.tsx` | NEW (Wave 0) |
| `packages/views/issues/components/view-toggle.test.tsx` | NEW (Wave 0) |

### Files NOT MODIFIED (locked)

| File | Reason |
|------|--------|
| `packages/core/issues/stores/view-store.ts` | Hard Constraint B6 — `partialize` (lines 193-194; **resolves UI-CHECK FL2** — actual line numbers are 193-194, not the 194-195 the spec said) keeps `viewMode` in allowlist. Storage key `multica_issues_view` (line 220) unchanged. **Resolves UI-CHECK FL1** — canonical path is `packages/core/issues/stores/view-store.ts`. |
| `packages/core/issues/mutations.ts` | Hard Constraint B7 — `useUpdateIssue` (lines 125-197) unmodified. The `cancelQueries` fire-and-forget at line 136 IS THE SOURCE for WS race immunity Layer 1. |
| `packages/core/issues/config/status.ts` | Hard Constraint B5 — `STATUS_CONFIG` table (lines 33-52) unmodified. Status colors flow from here. |
| `packages/core/issues/config/priority.ts` | Hard Constraint B5 — `PRIORITY_CONFIG` table (lines 11-20) unmodified. The new `priorityToAccentColor` helper lives in `packages/views/issues/utils/`, not here, because it maps to a UI-token name (`tag-p0`) not a `bg-` class. |
| `packages/views/dashboard-shell/app-sidebar.tsx` | UI-SPEC F1 — sidebar stays on legacy `@dnd-kit/core/sortable/utilities`. |
| `apps/desktop/src/renderer/src/components/tab-bar.tsx` | UI-SPEC F1 — desktop tab-bar stays on legacy `@dnd-kit/core/sortable/utilities/modifiers`. |
| `apps/desktop/src/renderer/src/stores/tab-store.ts` | Imports `arrayMove` from `@dnd-kit/sortable` — out of Phase 5 scope. |

## Existing Test Inventory

Tests that exercise board / list views and MUST continue to pass after the Phase 5 migration (KBN-06):

| Test file | Path | Phase 5 impact |
|-----------|------|----------------|
| `issues-page.test.tsx` | `packages/views/issues/components/` | **MUST UPDATE** — 5 of the 6 test cases (loading skeleton, renders titles, board column headers, breadcrumb, empty state, scope tabs) are content-level and unchanged BUT the dnd-kit mocks (lines 208-236) MUST swap libraries. After: mock `@dnd-kit/react`, `@dnd-kit/react/sortable`, `@dnd-kit/dom`, `@dnd-kit/abstract`. Empty-state assertion (line 412) `"No issues yet"` → `"Noch keine Issues"`. |
| `issue-detail.test.tsx` | `packages/views/issues/components/` | Out of scope — issue detail. NO Phase 5 changes. |
| `filter.test.ts` | `packages/views/issues/utils/` | Out of scope — pure filter utility. NO Phase 5 changes. |
| `redact.test.ts` | `packages/views/issues/utils/` | Out of scope — pure redact utility. NO Phase 5 changes. |
| `use-blocker-count.test.tsx` | `packages/core/issues/derived/` | Out of scope — derived hook. NO Phase 5 changes. |
| `use-issue-count-by-priority.test.tsx` | `packages/core/issues/derived/` | Out of scope — derived hook. NO Phase 5 changes. |

E2E:

| E2E spec | Path | Phase 5 impact |
|----------|------|----------------|
| `e2e/issues.spec.ts` | top-level `e2e/` | **MUST UPDATE.** Test "can switch from board to list view" (line 29) clicks `text=List` — but the new SegmentedControl renders the German label `"Liste"`. Update selector to `text=Liste`. Also: test "issues page loads with board view" (line 19) checks `text=Backlog/Todo/In Progress` — those status labels are unchanged (English), so test passes as-is. |
| `e2e/dashboard-shell.spec.ts` | top-level `e2e/` | NO Phase 5 changes — Phase 4 territory. |
| Other E2E specs | top-level `e2e/` | NO Phase 5 changes. |

**KBN-06 verification:** After Wave 1 lands the dnd-kit migration, run `pnpm --filter @multica/views exec vitest run issues/components/issues-page.test.tsx` — all 6 tests must pass green. The `onMoveIssue` signature in `issues-page.tsx:77` (`(issueId: string, newStatus: IssueStatus, newPosition?: number) => void`) is byte-identical pre/post migration; the existing tests assert behavior, not internal dnd-kit calls.

## WS Race Immunity 3-Layer Mechanism

Each layer cites the file/line where it must be implemented or already exists:

### Layer 1 — Synchronous fire-and-forget `cancelQueries` in `onMutate`

**Location:** `packages/core/issues/mutations.ts:131-136` (existing, unchanged in Phase 5)

```typescript
onMutate: ({ id, ...data }) => {
  // Fire-and-forget cancelQueries — keeps onMutate synchronous so the
  // cache update happens in the same tick as mutate(). Awaiting would
  // yield to the event loop, letting @dnd-kit reset its visual state
  // before the optimistic update lands.
  qc.cancelQueries({ queryKey: issueKeys.list(wsId) });
  // ...
}
```

**Hard Constraint 14:** `qc.cancelQueries` MUST be called synchronously (no `await`). The inline comment at line 132-135 documents this. Phase 5 plan must NOT suggest awaiting it for "correctness" — that breaks KBN-01.

### Layer 2 — Ref-driven transforms in v0.4 (different from v6 setActivatorNodeRef)

**Location (NEW in Phase 5):** `packages/views/issues/components/board-card.tsx` — the `useSortable` hook from `@dnd-kit/react/sortable` returns a `ref` callback. v0.4 internally tracks the dragging element via this ref and applies transforms via CSS variables on the data attributes. There is no React state involved in the visual position during drag.

```typescript
// board-card.tsx (Phase 5 implementation)
const sortable = useSortable({id: issue.id, index: cardIndex, group: issue.status, ...});
return <div ref={sortable.ref} className={sortable.isDragging ? "opacity-30" : ""}>...</div>;
```

**Why this matters:** When a WS event lands during drag and triggers `qc.setQueryData(issueKeys.list(wsId), patched)`, the new `issues` array reference flows through `IssuesPage` → `BoardView`. The `useEffect` in `board-view.tsx` that derives `columns` from `issues` runs — but its visual effect is invisible because the dragging card's position is owned by the ref-managed transform, NOT by where it sits in the `columns[status]` array. **In v6, this same scenario caused the snap-back bug.**

**Hard Constraint 12:** No `setColumns` mutation during drag. Enforced by `if (!isDraggingRef.current)` gate on the `useEffect` (line 142 of current `board-view.tsx`, retained in rewrite).

### Layer 3 — `recentlyMovedRef` 1-frame freeze

**Location (existing):** `packages/views/issues/components/board-view.tsx:150-156` (kept in rewrite, Hard Constraint 13)

```typescript
const recentlyMovedRef = useRef(false);
useEffect(() => {
  const id = requestAnimationFrame(() => {
    recentlyMovedRef.current = false;
  });
  return () => cancelAnimationFrame(id);
}, [columns]);
```

**Why this matters:** After `onDragEnd` calls `onMoveIssue` (which fires `useUpdateIssue.mutate`), the optimistic patch lands in the cache → `issues` array reference changes → `useEffect` derives new `columns`. If a WS event from another tab also lands in the SAME microtask queue, both updates compete. The ref + `requestAnimationFrame` create a 1-frame window where the column derivation is gated, giving the optimistic patch time to propagate before any WS-event-driven re-derivation kicks in.

**Critical:** This layer is NOT made redundant by Layer 2. Layer 2 protects the visual mid-drag; Layer 3 protects the FRAME after drag-end when the visual position transitions from "drag transform" back to "DOM order." Without Layer 3, KBN-01 regresses on the post-drop frame.

**Verification of all three:** `e2e/board-drag-ws-race.spec.ts` (NEW in Phase 5 Wave 4) opens two browser contexts, triggers a drag in one, fires a WS-triggering update in the other mid-drag, asserts the dragged card lands and stays in the target column. If any of layers 1/2/3 is missing, this test fails.

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 4.1 + jsdom 29 (already configured for `packages/views`) + `@testing-library/react` 16.3 + `@testing-library/user-event` 14.6 |
| Config file | `packages/views/vitest.config.ts` (existing — no changes needed) |
| Quick run command | `pnpm --filter @multica/views exec vitest run issues/components/<file>.test.tsx` |
| Full suite command | `pnpm test` (Turborepo discovers all packages) |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| KBN-01 | WS event mid-drag does not snap card back | E2E | `pnpm exec playwright test e2e/board-drag-ws-race.spec.ts` | ❌ Wave 4 |
| KBN-01 | `recentlyMovedRef` freeze gates `useEffect` | unit | `pnpm --filter @multica/views exec vitest run issues/components/board-view.test.tsx -t "freezes columns derivation"` | ❌ Wave 0 |
| KBN-02 | AutoScroller prevents drift in scrolled column | E2E | `pnpm exec playwright test e2e/board-scroll-collision.spec.ts` | ❌ Wave 4 |
| KBN-02 | AutoScroller plugin is configured with threshold | unit | board-view.test.tsx — assertion that `AutoScroller.configure` is called with `{acceleration: 15, threshold: {x: 0, y: 0.3}}` | ❌ Wave 0 |
| KBN-03 | Inline-add per column creates issue with status pre-filled | E2E | `pnpm exec playwright test e2e/board-inline-add.spec.ts` | ❌ Wave 4 |
| KBN-03 | InlineTaskAdd renders + Enter submits + Esc cancels | unit | `pnpm --filter @multica/views exec vitest run issues/components/inline-task-add.test.tsx` | ❌ Wave 0 |
| KBN-04 | View toggle persists across reload | E2E | `pnpm exec playwright test e2e/issues-view-toggle.spec.ts` | ❌ Wave 4 |
| KBN-04 | ViewToggle calls setViewMode + reflects current mode | unit | `pnpm --filter @multica/views exec vitest run issues/components/view-toggle.test.tsx` | ❌ Wave 0 |
| KBN-05 | Legacy `@dnd-kit/core` removed from issues files | smoke | `! grep -rn "@dnd-kit/core\|@dnd-kit/sortable\|@dnd-kit/utilities" packages/views/issues/` (must return zero hits) | ✅ shell |
| KBN-06 | `onMoveIssue` signature unchanged + existing tests pass | unit | `pnpm --filter @multica/views exec vitest run issues/components/issues-page.test.tsx` | ✅ exists, mocks update |
| KBN-07 | Italic column headers, AccentBar, brand-green ring, sticky list headers | unit | board-column.test.tsx + list-view.test.tsx + board-card.test.tsx | ❌ Wave 0 |

### Sampling Rate

- **Per task commit:** `pnpm --filter @multica/views exec vitest run issues/` (~30s, all touched test files)
- **Per wave merge:** `pnpm test` (~2-3 min, full TS test suite via Turborepo)
- **Phase gate (`/gsd-verify-work`):** `pnpm test` + `pnpm exec playwright test e2e/board-*.spec.ts e2e/issues-view-toggle.spec.ts e2e/issues.spec.ts` green; `pnpm typecheck` zero errors; `pnpm lint` zero errors; `make check` end-to-end.

### Wave 0 Gaps

- [ ] `packages/views/issues/utils/priority-color.test.ts` — covers KBN-07 priority-to-color contract
- [ ] `packages/views/issues/components/board-view.test.tsx` — covers KBN-01 (recentlyMovedRef gate), KBN-02 (AutoScroller config), KBN-06 (onMoveIssue signature)
- [ ] `packages/views/issues/components/board-column.test.tsx` — covers KBN-03 (inline-add toggle), KBN-07 (italic header, drop-target ring)
- [ ] `packages/views/issues/components/board-card.test.tsx` — covers KBN-07 (AccentBar mapping), KBN-06 (useSortable group prop)
- [ ] `packages/views/issues/components/list-view.test.tsx` — covers KBN-07 (sticky h-12 italic header), KBN-03 (inline-add in panel)
- [ ] `packages/views/issues/components/list-row.test.tsx` — covers KBN-07 (vertical AccentBar)
- [ ] `packages/views/issues/components/inline-task-add.test.tsx` — covers KBN-03 (full inline-add behavior matrix)
- [ ] `packages/views/issues/components/view-toggle.test.tsx` — covers KBN-04 (ViewToggle behavior)
- [ ] `e2e/board-drag-ws-race.spec.ts` — KBN-01
- [ ] `e2e/board-scroll-collision.spec.ts` — KBN-02
- [ ] `e2e/board-inline-add.spec.ts` — KBN-03
- [ ] `e2e/issues-view-toggle.spec.ts` — KBN-04
- [ ] **No framework install needed** — Vitest + Playwright already configured.

## Wave Decomposition Recommendation

Phase 5 has 9 source files + tests + package.json changes. The proposed wave structure minimizes intra-wave file collisions and lands the highest-risk change (dnd-kit API rewrite) FIRST so KBN-06 proves green before any visual work begins.

### Plan 00 — Wave 0: Test scaffolds + package.json + catalog deps

Single plan, no parallelism. Lays foundation.

- Add 4 entries to `pnpm-workspace.yaml` catalog (`@dnd-kit/{react,dom,abstract,helpers}: 0.4.0`).
- Update `packages/views/package.json` (ADD 4 catalog refs; KEEP 3 legacy entries for sidebar).
- Update `apps/web/package.json` (REMOVE 3 legacy entries).
- Update `apps/desktop/package.json` (REMOVE 4 legacy entries; pending hoist verification per §Standard Stack risk note).
- Run `pnpm install` to regenerate lockfile.
- Verify: `pnpm --filter @multica/desktop build` resolves dnd-kit imports for tab-bar (sanity check on hoist).
- Create empty test scaffolds (8 new `*.test.tsx` files) with `describe.skip` shells so Vitest discovers them.

**Files:** `pnpm-workspace.yaml`, `apps/web/package.json`, `apps/desktop/package.json`, `packages/views/package.json`, 8 new test file shells.

### Plan 01 — Wave 1: dnd-kit API migration (board-view + board-column + board-card + test mocks)

**Single plan because all three files compile together — `board-card`'s new `useSortable` signature requires the parent `board-column` to thread `cardIndex` + the parent `board-view` to drop `SortableContext`. Atomic.**

- Rewrite `board-view.tsx`: `DndContext` → `DragDropProvider`, drop sensors/collision/sortable-context/arrayMove imports, keep `recentlyMovedRef` + `columnsRef` + `isDraggingRef` + `useEffect` gate, hand-rolled splice in `onDragEnd`, AutoScroller plugin config, drop `setColumns` from `onDragOver`. Update `HiddenColumnsPanel` German strings.
- Rewrite `board-column.tsx`: migrate `useDroppable` to `@dnd-kit/react`, drop `SortableContext`/`verticalListSortingStrategy`, add `type/accept/collisionPriority`, change `setNodeRef`→`ref`, `isOver`→`isDropTarget`. Thread `cardIndex` to children via `.map((issue, idx) => <DraggableBoardCard ... cardIndex={idx} />)`.
- Rewrite `board-card.tsx`: migrate `useSortable` to `@dnd-kit/react/sortable`, add `index`/`group`/`type`/`accept`/`data` props, drop `transform`/`transition`/`attributes`/`listeners`/`CSS.Transform`/`animateLayoutChanges`. Wrapper `<div ref={sortable.ref}>`.
- Update `issues-page.test.tsx` mock blocks (replace `vi.mock("@dnd-kit/core/sortable/utilities", ...)` with `vi.mock("@dnd-kit/react/...")` etc.).

**Files (collision-isolated within plan; NO other plan in this wave):**
- `packages/views/issues/components/board-view.tsx`
- `packages/views/issues/components/board-column.tsx`
- `packages/views/issues/components/board-card.tsx`
- `packages/views/issues/components/issues-page.test.tsx`

**Wave gate:** `pnpm --filter @multica/views exec vitest run issues/components/issues-page.test.tsx` GREEN. KBN-06 satisfied.

### Plan 02..03 — Wave 2: Visual restyle (parallel-safe, disjoint files)

Two plans run in parallel. NO file overlap between them.

**Plan 02 — Board visual restyle (board-card AccentBar + board-column italic + helpers):**
- Add `priorityToAccentColor` to `packages/views/issues/utils/priority-color.ts` + test.
- `board-card.tsx`: add `<AccentBar>` top edge, add `overflow-hidden`, change `py-3` → `pt-3` + `pb-3` split.
- `board-column.tsx`: add italic to status badge label, add `tabular-nums` to count, ring-2 ring-brand on `isDropTarget`, German strings (Hide/Add/No issues/Hier ablegen).
- Update tests: `board-card.test.tsx`, `board-column.test.tsx`, `priority-color.test.ts`.

**Plan 03 — List visual restyle (list-view + list-row):**
- `list-view.tsx`: `h-10`→`h-12`, sticky/bg-card/border-b, italic on status label, German "Issue hinzufügen" / "Keine Issues", `tabular-nums` on count.
- `list-row.tsx`: vertical `<AccentBar>` leading edge, `relative` positioning, `font-medium` on title.
- Update tests: `list-view.test.tsx`, `list-row.test.tsx`.

**Files (disjoint):**
- Plan 02: `board-card.tsx`, `board-column.tsx`, `priority-color.ts`, `priority-color.test.ts`, `board-card.test.tsx`, `board-column.test.tsx`
- Plan 03: `list-view.tsx`, `list-row.tsx`, `list-view.test.tsx`, `list-row.test.tsx`

**Note collision risk:** Both plans 02 and 03 sit AFTER plan 01 (sequential). Plan 02 touches `board-card.tsx` and `board-column.tsx` which plan 01 also touched. The wave boundary between Wave 1 (plan 01) and Wave 2 (plans 02+03) ensures plan 01 fully merges before plan 02 starts. Within Wave 2, plans 02 and 03 are disjoint and parallel-safe.

### Plan 04 — Wave 3: Interaction additions (view-toggle + inline-task-add + issues-header edit + issues-page edit)

Single plan. The `view-toggle.tsx` is a leaf, `inline-task-add.tsx` is a leaf, but both must be wired into `board-column.tsx` (uses `<InlineTaskAdd>`) and `list-view.tsx` (uses `<InlineTaskAdd>`) and `issues-header.tsx` (uses `<ViewToggle>`). Combining keeps the wiring atomic.

- Create `view-toggle.tsx` + `view-toggle.test.tsx`.
- Create `inline-task-add.tsx` + `inline-task-add.test.tsx`.
- Edit `issues-header.tsx`: delete lines 702-737 (dropdown), add `<ViewToggle />` import + render at the same slot. Drop `Columns3, List` icon imports + `viewMode` selector if no longer used.
- Edit `issues-page.tsx`: German empty-state strings ("Noch keine Issues" / "Erstelle ein Issue, um zu starten."), German toast on move-failure.
- Edit `board-column.tsx`: add `isAdding` local state + render `<InlineTaskAdd>` when true (collision with Wave 2 plan 02 — plan 04 starts AFTER plan 02 merges).
- Edit `list-view.tsx`: add `isAdding` per-panel state + render `<InlineTaskAdd>` when true (collision with Wave 2 plan 03 — sequential).

**Files:**
- `view-toggle.tsx` + test (NEW)
- `inline-task-add.tsx` + test (NEW)
- `issues-header.tsx` (EDIT)
- `issues-page.tsx` (EDIT)
- `board-column.tsx` (EDIT — second touch this phase, after Wave 2)
- `list-view.tsx` (EDIT — second touch this phase, after Wave 2)

### Plan 05 — Wave 4: E2E specs

Single plan. Pure additions, no production-code touches.

- `e2e/board-drag-ws-race.spec.ts` (KBN-01)
- `e2e/board-scroll-collision.spec.ts` (KBN-02)
- `e2e/board-inline-add.spec.ts` (KBN-03)
- `e2e/issues-view-toggle.spec.ts` (KBN-04)
- Update `e2e/issues.spec.ts` line 36: `text=List` → `text=Liste`.

**Wave gate (phase exit):** All E2E green; full `make check` green; manual visual review of board + list in light + dark mode per UI-SPEC §Light + Dark Mode Verification.

### Same-file collision summary

| File | Touched by plans | Wave order needed |
|------|------------------|-------------------|
| `board-view.tsx` | Plan 01 (Wave 1) | Single touch — Wave 1 only |
| `board-column.tsx` | Plan 01 (Wave 1), Plan 02 (Wave 2), Plan 04 (Wave 3) | Wave 1 → Wave 2 → Wave 3 sequential |
| `board-card.tsx` | Plan 01 (Wave 1), Plan 02 (Wave 2) | Wave 1 → Wave 2 sequential |
| `list-view.tsx` | Plan 03 (Wave 2), Plan 04 (Wave 3) | Wave 2 → Wave 3 sequential |
| `list-row.tsx` | Plan 03 (Wave 2) | Single touch — Wave 2 only |
| `issues-page.tsx` | Plan 04 (Wave 3) | Single touch |
| `issues-header.tsx` | Plan 04 (Wave 3) | Single touch |
| `issues-page.test.tsx` | Plan 01 (Wave 1) | Single touch |
| All NEW files | one plan each | no collisions |

**No intra-wave file collisions exist.** Plan 02 and Plan 03 in Wave 2 are disjoint by file. The sequential gate between waves handles inter-wave collisions safely.

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `DndContext` + `useSensors(useSensor(PointerSensor))` + manual `collisionDetection` | `DragDropProvider` (sensors are internal; collision via plugin) | v0.4.0 (2026-04-13) | -50% boilerplate; better defaults |
| `SortableContext` + `verticalListSortingStrategy` wrapper | `useSortable({id, index, group})` self-contained | v0.4.0 | No wrappers — sortables are flat children of any container |
| `useSortable.transform` + `CSS.Transform.toString()` style injection | `useSortable.ref` callback wires CSS via internal data attrs | v0.4.0 | No React state in the visual position layer → WS race immune |
| Manual scroll-collision via `closestCenter` fallback | `AutoScroller` plugin from `@dnd-kit/dom` | v0.4.0 | Auto-detects scrollable ancestors; eliminates KBN-02 drift |
| Cross-column = `setColumns` mutation in `onDragOver` | `useSortable({group})` cross-group transfer; React state mutated only at `onDragEnd` | v0.4.0 | Single source of truth for visual; eliminates flickering |
| `arrayMove` from `@dnd-kit/sortable` | `arrayMove` from `@dnd-kit/helpers` (and new `move()` helper) | v0.4.0 | Helper consolidation |
| `(active, over)` in event handlers | `({source, target, canceled})` in event handlers | v0.4.0 | Naming change; shape similar |
| `@dnd-kit/sortable.useSortable` import path | `@dnd-kit/react/sortable` sub-import | v0.4.0 | Single root package + sub-paths |

**Deprecated/outdated:**
- `@dnd-kit/core` v6.x — works but no longer the recommended path for new projects. KEPT in this monorepo only for sidebar + tab-bar (UI-SPEC F1).
- `@dnd-kit/sortable` v10.x — same.
- `@dnd-kit/utilities` v3.x — same.
- `@dnd-kit/modifiers` v9.x — same (only used by desktop tab-bar).

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | pnpm hoist is configured loosely enough that removing `@dnd-kit/core` from `apps/desktop/package.json` still lets the tab-bar resolve it transitively via `packages/views/package.json` | §Standard Stack — Installation | Tab-bar fails to build; planner must re-add direct dep to `apps/desktop/package.json` |
| A2 | `accept` (singular) works on both `useSortable` AND `useDroppable` per the official kanban example | §Pitfall 2 | If implementation finds `isDropTarget` never fires, switch to `accepts` plural |
| A3 | v0.4's React `useSortable` returns ref-only (no `attributes`/`listeners`/`transform`/`transition`) | §Pattern 1, §Pitfall 1 | If a 0.4.1 patch reintroduces these, code still works (just with unused destructure); minimal risk |
| A4 | `DragDropProvider` accepts the `DragOverlay`-equivalent via `Feedback` plugin OR via custom render — current `<DragOverlay>` usage in board-view.tsx will need investigation during implementation | §Migration Touch Points | If no v0.4 equivalent exists, custom drag overlay must be re-implemented as a portal child of DragDropProvider |
| A5 | Existing `multica_issues_view` localStorage with `viewMode: "board" | "list"` survives the Phase 5 changes unchanged because no view-store schema modification is in scope | §Runtime State Inventory | Hard Constraint B6 enforces this — risk is zero if implementation respects the constraint |
| A6 | The `move()` helper from `@dnd-kit/helpers` mutates state during `onDragOver` per the docs example, which conflicts with WS race immunity Hard Constraint 12 | §Alternatives Considered | Decision = hand-rolled splice. If implementation finds `move()` can be deferred to `onDragEnd`, may simplify; not on the critical path |

**If this table grows during implementation:** the planner should pause and re-confirm with the user before locking decisions. None of these assumptions block planning; all of them have safe fallback paths documented above.

## Open Questions

1. **DragOverlay equivalent in v0.4** — The current `board-view.tsx` lines 302-308 render a custom `<DragOverlay>` with the active card clone. v0.4's `DragDropProvider` does NOT export a `DragOverlay` component; instead, the `Feedback` plugin in `@dnd-kit/dom` provides this. Plan 01 must research whether `Feedback.configure({feedback: 'clone'})` (per the official quickstart docs) gives equivalent visuals OR whether a custom DOM portal is needed. **Mitigation:** if `Feedback` plugin gives the rotate/scale/shadow visual cheaply, use it. If not, render a portal with the active card content gated on `isDraggingRef`. Either path is one Wave-1 task.

2. **`<DragDropProvider>` portal requirements** — v0.4's `Feedback` may require the provider to be mounted at a specific tree position to render the drag clone. The current `BoardView` lives 4 levels deep (IssuesPage → ViewStoreProvider → flex container → BoardView). Investigate if hoisting is needed.

3. **Touch / pointer activation distance** — v6's `PointerSensor` was configured with `activationConstraint: {distance: 5}` to prevent click-vs-drag confusion. v0.4's internal sensors have defaults; confirm the default is acceptable for click-vs-drag on cards (cards are also navigation links via `<AppLink>`). If clicks accidentally trigger drags, look up the v0.4 sensor configuration API.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Frontend build + tests | ✓ | (CI: 22; local: per `make check`) | — |
| pnpm | Workspace + install | ✓ | per project | — |
| Vitest | Unit tests | ✓ | catalog `^4.1.0` | — |
| jsdom | Test DOM | ✓ | catalog `^29.0.1` | — |
| @testing-library/react | Test rendering | ✓ | catalog `^16.3.2` | — |
| @testing-library/user-event | Drag simulation in unit tests | ✓ | catalog `^14.6.1` | — |
| Playwright | E2E | ✓ | (existing — used by other E2E specs) | — |
| `@dnd-kit/react@0.4.0` | Phase 5 implementation | ✗ | needs install | — |
| `@dnd-kit/dom@0.4.0` | AutoScroller plugin | ✗ | needs install | — |
| `@dnd-kit/abstract@0.4.0` | CollisionPriority constant | ✗ | needs install | — |
| `@dnd-kit/helpers@0.4.0` | `arrayMove`, `isSortable` | ✗ | needs install | — |
| Phase 1 tokens (tokens.css) | All visual restyle | ✓ | merged | — |
| Phase 2 atoms (`AccentBar`, `SegmentedControl`) | Visual restyle + ViewToggle | ✓ | confirmed (`packages/ui/components/ui/{accent-bar,segmented-control}.{tsx,test.tsx}`) | — |
| Phase 4 DashboardShell | Sets the chrome around `IssuesPage` | ✓ | merged (per ROADMAP Phase 4 = "Done") | — |

**Missing dependencies with no fallback:**
- The four `@dnd-kit/{react,dom,abstract,helpers}@0.4.0` packages — must be installed via Plan 00 (Wave 0) before any Wave 1 implementation work begins. Blocking dependency.

**Missing dependencies with fallback:** None.

## Sources

### Primary (HIGH confidence)
- `@dnd-kit/react` v0.4 official docs (Context7 ID `/clauderic/dnd-kit`):
  - https://github.com/clauderic/dnd-kit/blob/main/apps/docs/docs/react/guides/migration.mdx — `DndContext` → `DragDropProvider` migration
  - https://github.com/clauderic/dnd-kit/blob/main/apps/docs/docs/react/guides/sortable-state-management.mdx — `isSortable` + `initialIndex/index/initialGroup/group` pattern; canonical kanban implementation
  - https://github.com/clauderic/dnd-kit/blob/main/apps/docs/docs/react/guides/multiple-sortable-lists.mdx — cross-column `group` parameter
  - https://github.com/clauderic/dnd-kit/blob/main/apps/docs/docs/react/hooks/use-sortable.mdx — `useSortable` return value (ref-only)
  - https://github.com/clauderic/dnd-kit/blob/main/apps/docs/docs/react/hooks/use-droppable.mdx — `useDroppable` API
  - https://github.com/clauderic/dnd-kit/blob/main/apps/docs/docs/react/components/drag-drop-provider.mdx — event handlers + plugin/modifier slots
  - https://github.com/clauderic/dnd-kit/blob/main/apps/docs/docs/extend/plugins/auto-scroller.mdx — AutoScroller plugin API + threshold semantics
- npm registry queries (2026-04-25):
  - `@dnd-kit/react` versions → `0.4.0` published 2026-04-13
  - `@dnd-kit/dom`, `@dnd-kit/abstract`, `@dnd-kit/helpers` versions → all `0.4.0` stable
- Project source files (verified via direct read):
  - `packages/views/issues/components/board-view.tsx` (current v6 implementation)
  - `packages/views/issues/components/board-column.tsx` (current v6 implementation)
  - `packages/views/issues/components/board-card.tsx` (current v6 implementation)
  - `packages/views/issues/components/issues-page.tsx` + `issues-page.test.tsx` (existing tests + signature)
  - `packages/core/issues/stores/view-store.ts` (verified `partialize` lines 193-194; resolves UI-CHECK FL2)
  - `packages/core/issues/mutations.ts` (verified `useUpdateIssue` lines 125-197 + `cancelQueries` comment at 132-135)
  - `packages/core/issues/config/{status,priority}.ts` (verified `STATUS_CONFIG` + `PRIORITY_CONFIG` shapes)
  - `packages/ui/components/ui/{accent-bar,segmented-control}.tsx` (verified Phase 2 atoms)
  - `pnpm-workspace.yaml` (no existing `@dnd-kit/*` catalog entries)
  - `packages/views/package.json`, `apps/web/package.json`, `apps/desktop/package.json` (current dnd-kit deps)

### Secondary (MEDIUM confidence)
- Phase 5 UI-SPEC `05-UI-SPEC.md` — design contract (locked, verbatim consumed)
- Phase 5 UI-CHECK `05-UI-CHECK.md` — checker verdicts + 4 FLAGs (FL1 path, FL2 line, FL3 tags, FL4 deps — all resolved in this research)
- Phase 5 CONTEXT `05-CONTEXT.md` — phase boundary

### Tertiary (LOW confidence)
- None — every claim in this research is either VERIFIED (npm/source-read) or CITED (official dnd-kit docs).

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — npm registry confirms all four packages stable at `0.4.0`
- Architecture / migration patterns: HIGH — official dnd-kit docs explicitly cover the kanban + cross-column group pattern with verbatim code we can copy
- Codebase touch-points: HIGH — every cited line and import was directly read from the working tree
- WS race immunity 3-layer model: HIGH — Layers 1 + 3 already exist in source; Layer 2 is structural to v0.4's design (per docs)
- Pitfalls + assumptions: MEDIUM — A1 (pnpm hoist), A2 (accept singular vs plural), A4 (DragOverlay equivalent) need implementation-time verification

**Research date:** 2026-04-25
**Valid until:** 2026-05-25 (30 days for stable packages; v0.4.1 betas exist, monitor for stable promotion before phase exit)
