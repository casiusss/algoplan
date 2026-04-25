# Phase 5: Issues Views + Kanban + dnd-kit Migration - Context

**Gathered:** 2026-04-25
**Status:** Ready for UI design contract
**Mode:** Auto-generated (discuss skipped via workflow.skip_discuss)

<domain>
## Phase Boundary

The issues page delivers a fully restyled list view and a new Kanban board view, both switchable via persistent toggle, with drag-and-drop powered by `@dnd-kit/react` v0.4.0 — the legacy `@dnd-kit/core` packages are removed and the board is immune to WS race conditions and scroll collision.

**Requirements:** KBN-01, KBN-02, KBN-03, KBN-04, KBN-05, KBN-06, KBN-07
**Depends on:** Phase 4 (DashboardShell + AppTopbar slot for view toggle)

</domain>

<decisions>
## Implementation Decisions

### Claude's Discretion
All implementation choices are at Claude's discretion. Key constraints from CLAUDE.md:
- Shared business pages/components in `packages/views/`, never `next/*` or `react-router-dom`
- Headless logic + stores in `packages/core/`
- Atomic UI primitives in `packages/ui/`
- TanStack Query owns server state — no duplication into Zustand
- WS events invalidate queries, never write to stores directly
- Workspace-scoped queries must key on `wsId`
- Mutations are optimistic by default

### Phase Annotation (from ROADMAP)
Phase 5 requires phase-specific research on `@dnd-kit/react` v0.4.0 migration before implementation. The cross-column `group` pattern and optimistic mutation handling under the new event system have potential undocumented edge cases.

Recommended commit split within phase:
1. API migration with existing tests passing
2. Visual restyle
3. Inline task add and WS/scroll fixes

</decisions>

<code_context>
## Existing Code Insights

Codebase context will be gathered during plan-phase research. Likely touch points:
- `packages/views/issues/` — issues list + board views
- `packages/core/issues/` — issues stores, queries, derived hooks (Phase 4 added `derived/`)
- `packages/core/issues/view-store.ts` — view mode + filters store
- `apps/web/app/[workspaceSlug]/issues/` — page wiring
- `apps/desktop/src/renderer/src/...` — desktop board view
- `pnpm-lock.yaml` — `@dnd-kit/core` (legacy) → `@dnd-kit/react` (v0.4.0) migration

</code_context>

<specifics>
## Specific Ideas

Success criteria from ROADMAP:

1. Dragging a card between Kanban columns updates the issue status — the card settles in the new column without flickering back (WS event from a second browser tab does not interrupt the drop)
2. Dragging a card in a scrolled column drops into the visually indicated position — the drop target does not drift from scroll offset
3. Clicking "Task hinzufügen" in any column opens an inline input; submitting creates the issue with that column's status pre-filled
4. The Board/List view toggle persists across page reloads; switching is instant with no full re-mount
5. All existing board-view tests pass after the `@dnd-kit/react` migration with the `onMoveIssue` signature unchanged

</specifics>

<deferred>
## Deferred Ideas

None — discuss phase skipped.

</deferred>
