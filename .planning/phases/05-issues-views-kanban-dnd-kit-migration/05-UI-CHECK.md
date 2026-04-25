---
phase: 05-issues-views-kanban-dnd-kit-migration
status: approved
verdict: APPROVED
created: 2026-04-25
block: 0
flag: 4
pass: 6
---

# Phase 5 — UI-SPEC Verification

**Verdict: APPROVED — no revisions required before plan-phase**

## Per-Dimension Verdicts

| Dim | Name | Verdict |
|-----|------|---------|
| 1 | Token Discipline | PASS |
| 2 | Composition Clarity | PASS |
| 3 | Drag-Drop Contract Specificity | PASS |
| 4 | Optimistic Mutation Pattern Clarity | PASS |
| 5 | Validation Architecture Coverage | PASS |
| 6 | Hard Constraints Completeness | PASS |

## BLOCK Findings

**None.**

## FLAG Findings (non-blocking)

- **FL1** — Path drift: UI-SPEC text refers to `packages/core/issues/view-store.ts`. Actual location: `packages/core/issues/stores/view-store.ts`. Planner should canonicalize path in implementation tasks.
- **FL2** — UI-SPEC line 354 cites "line 194-195 of view-store.ts" for `partialize`. Verified to be lines 193–194. Re-anchor when planner cuts tasks.
- **FL3** — F2 in spec: `cardProperties.tags` mention on board card is conditional/aspirational. Planner should explicitly drop or wire it during planning.
- **FL4** — B1 in spec leaves `apps/web/package.json` and `apps/desktop/package.json` dependency additions as conditional ("verify"). Plan-phase research should resolve and lock in plan.

## Hard Constraint → Requirement Coverage

| Req | Constraints | Test Path |
|-----|-------------|-----------|
| KBN-01 | 12, 13, 14 | `e2e/board-drag-ws-race.spec.ts` |
| KBN-02 | 9, 15 + AutoScroller threshold | E2E SC#2 |
| KBN-03 | 17 | E2E SC#3 |
| KBN-04 | 7 | E2E SC#4 |
| KBN-05 | 11, 20 | constraint check |
| KBN-06 | 1 + B2 | `<BoardView>` test "calls onMoveIssue with correct signature" |
| KBN-07 | 15, 16 + AccentBar contracts | List View / Board View test specs |

## Quality Summary

12 sections, 9 component files (7 modified + 2 NEW), 20 Hard Constraints, all KBN-01..07 covered, `@dnd-kit/react` v0.4.0 contracts documented concretely (DragDropProvider + useSortable group pattern + AutoScroller plugin), WS race immunity 3-layer mechanism explicit. Planner can proceed.
