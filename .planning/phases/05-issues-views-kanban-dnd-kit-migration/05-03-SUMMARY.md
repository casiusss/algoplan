---
phase: 05-issues-views-kanban-dnd-kit-migration
plan: 03
status: complete
tasks_completed: 2/2
commits:
  - 3e8728c6 feat(05-03): list-row leading AccentBar + font-medium title + data-list-row-* seams
  - ad6433a4 feat(05-03): list-view sticky h-12 header with italic status label + tabular-nums + German strings
created: 2026-04-25
note: SUMMARY written by orchestrator after worktree merge (Plan 03 wrote SUMMARY only into main checkout, deleted before merge to avoid conflict).
---

# Plan 05-03 — List Visual Restyle

## Tasks

- 5-03-01 — list-row leading-edge AccentBar + data-list-row-* test seams — DONE
- 5-03-02 — list-view sticky h-12 header + italic status + tabular-nums + German strings — DONE

## What landed

### `list-row.tsx`
- Leading vertical `<AccentBar orientation="vertical" segments={1}>` consuming `priorityToAccentColor(issue.priority)` from Wave 0 helper
- `font-medium` title
- Test seams: `data-list-row-root`, `data-list-row-leading`, `data-list-row-title`

### `list-view.tsx`
- `h-12` sticky header on `Accordion.Header`
- Italic `font-semibold` status label (StatusIcon stays upright per HC-15)
- `tabular-nums` count span (no drag-jitter)
- German strings: `"Issue hinzufügen"` (CTA), `"Keine Issues"` (empty)
- Test seams: `data-list-view-header`, `data-list-view-status-label`, `data-list-view-count`, `data-list-view-add-trigger`

## W-1 selector strategy

- Tests query via `[data-slot="accent-bar"]` (real existing seam in frozen Phase 2 atom)
- Anchored under `[data-list-row-leading]` wrapper for deterministic scope
- ClassName regex: `/absolute/`, `/inset-y-0/`, `/left-0/`, `/w-1/` for orientation; `(bg|to|from)-{color}` for color
- Phase 2 `accent-bar.tsx` byte-untouched

## Verification

- 13 new GREEN tests
- Issues subtree: 70 passed / 4 skipped (Plan-02/04 scaffolds)
- Token discipline grep: zero hex/RGB/`dark:*` hits in both files

## Boundary respected

- board-* files untouched (Plan 02 owns them, parallel)
- dnd-kit logic untouched (Plan 01 done)
- `priorityToAccentColor` only imported from Wave 0, never re-created
- `accent-bar.tsx` (Phase 2 atom) frozen — not modified
