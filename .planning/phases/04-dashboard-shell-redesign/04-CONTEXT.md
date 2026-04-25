# Phase 4: Dashboard Shell Redesign - Context

**Gathered:** 2026-04-25
**Status:** Ready for planning
**Mode:** Auto-generated (discuss skipped via workflow.skip_discuss)

<domain>
## Phase Boundary

The dashboard layout wraps every workspace page in the new AlgoPlan chrome — new sidebar (wordmark, priority grid, collapse, dark-mode toggle, notifications badge) and topbar (filter chips, search, primary CTA) — with the slot system that lets desktop inject DragStrip without duplicating layout code.

**Requirements:** SHL-01, SHL-02, SHL-03, SHL-04, SHL-05
**Depends on:** Phase 3 (Showroom validates atoms; this phase consumes them in real layouts)

</domain>

<decisions>
## Implementation Decisions

### Claude's Discretion
All implementation choices are at Claude's discretion. Key constraints from CLAUDE.md:
- Shared layout/views in `packages/views/`, never `next/*` or `react-router-dom`
- DragStrip injection via `topSlot` prop — already an established pattern in the codebase
- Sidebar hooks that need workspace context MUST accept `wsId` as parameter (not `useWorkspaceId()` internally) — sidebar renders before WorkspaceIdProvider
- Zustand selectors must return stable references (no infinite re-render cascade — explicit test for each new selector)

</decisions>

<code_context>
## Existing Code Insights

Codebase context will be gathered during plan-phase research. Likely touch points:
- `packages/views/layout/` (DashboardGuard, shared layout)
- `packages/views/sidebar/` or new `packages/views/dashboard-shell/`
- `apps/web/app/(workspace)/layout.tsx`
- `apps/desktop/src/renderer/src/routes.tsx` (WorkspaceRouteLayout)
- `packages/core/stores/` for any new client-state stores (theme persistence already in Phase 1)

</code_context>

<specifics>
## Specific Ideas

Success criteria from ROADMAP:

1. Sidebar renders AlgoPlan wordmark, collapses/expands via toggle, dark-mode toggle persists across page loads on both apps
2. Desktop injects `<DragStrip />` via `topSlot` prop — macOS drag works; web leaves `topSlot` empty with no visual gap
3. Every new Zustand selector passes a stability assertion test (same input → same reference)
4. Sidebar hooks that run before WorkspaceIdProvider accept `wsId` as parameter — no `useWorkspaceId()` call in sidebar code

</specifics>

<deferred>
## Deferred Ideas

None — discuss phase skipped.

</deferred>
