---
phase: 05-issues-views-kanban-dnd-kit-migration
plan: 02
subsystem: kanban board visual restyle (board-card + board-column)
tags: [wave-2, kbn-07, accent-bar, italic-headers, ring-brand, german-strings, w-2, w-3, tdd]

dependency_graph:
  requires:
    - "Plan 00 (Wave 0): priorityToAccentColor helper at packages/views/issues/utils/priority-color.ts"
    - "Plan 01 (Wave 1): board-view + board-column + board-card on @dnd-kit/react v0.4 (DraggableBoardCard threading cardIndex)"
    - "Phase 2 atom: AccentBar (frozen, segments=1 horizontal contract)"
    - "Phase 1 OKLCH tokens: --brand, --tag-p0..p3, --muted, ring-brand"
  provides:
    - "Board visual half of KBN-07: AccentBar leading edge atop every card; italic Inter column header label; brand-green drop-target ring"
    - "data-issue-id test seam on board-card outer (consumed by Plan 05 Task 5-05-04 KBN-01 spec — W-2 fix)"
    - "data-board-column-root test seam on board-column outer wrapper (consumed by Plan 05 Task 5-05-03 KBN-02 spec — W-3 fix)"
    - "data-board-column-body test seam on body div (KBN-02 .closest() walk-up anchor)"
    - "German column-level strings: 'Issue hinzufügen', 'Spalte ausblenden', 'Keine Issues', 'Hier ablegen'"
  affects:
    - "Plan 04 (Wave 3) inline-add wiring on board-column — preserves Plan 02's data attributes; only swaps add-button onClick from useModalStore.open to setIsAdding(true)"
    - "Plan 05 (Wave 4) E2E specs — KBN-01 race spec uses data-issue-id; KBN-02 scroll-collision spec uses data-board-column-root + data-board-column-body"

tech_stack:
  added: []
  patterns:
    - "AccentBar atom consumption: segments=1, h-1 horizontal at top with overflow-hidden on parent for corner clipping (RESEARCH Pitfall 9)"
    - "Class-regex test selector (W-1 strategy): [data-slot=accent-bar] + outerHTML regex on (bg|to|from)-{color} — avoids modifying frozen Phase 2 atom"
    - "isDropTarget visual contract upgrade: ring-2 ring-brand ring-offset-2 ring-offset-background bg-accent/40 (was bg-accent/60)"
    - "Italic-only-on-label HC-15: cfg.label wrapped in inner span with italic axis; StatusIcon stays upright"
    - "Empty-state conditional swap: 'Hier ablegen' (text-brand) when isDropTarget && empty; otherwise 'Keine Issues' (text-muted-foreground)"

key_files:
  created: []
  modified:
    - "packages/views/issues/components/board-card.tsx"
    - "packages/views/issues/components/board-card.test.tsx"
    - "packages/views/issues/components/board-column.tsx"
    - "packages/views/issues/components/board-column.test.tsx"

decisions:
  - "Outer card wrapper padding lifted onto inner rows (px-2.5 on identifier, title, sub-issue, description; mt-3 px-2.5 pb-3 on footer) so AccentBar (h-1 w-full) spans the full card width with no horizontal gap. Without this, the existing wrapper's py-3 px-2.5 left an 10px horizontal gap between AccentBar and card edges. Verified via UI-SPEC §Board card visual line 293 ('Title px-2.5'), 294 (sub-issue 'mt-1.5 px-2.5'), 295 (description 'mt-1 px-2.5'), 296 (footer 'mt-3 px-2.5 pb-3') — UI-SPEC explicitly lists all rows as px-2.5, confirming the per-row padding pattern."
  - "data-board-card-identifier seam added (NOT explicit in plan must_haves but test asserts pt-3 selector — needed for the test to address the right node)."
  - "Card padding reorganised: removed py-3 + px-2.5 from outer wrapper (was 'rounded-lg border-[0.5px] bg-card py-3 px-2.5 shadow-...'), kept overflow-hidden + visual classes on outer; pushed padding inline. This matches UI-SPEC §Board card visual lines 290-296 verbatim: outer has no padding, identifier pt-3, footer pb-3."
  - "DraggableBoardCard wrapper UNTOUCHED — Plan 01 territory (per pitfall list)."
  - "useModalStore.getState().open onClick on add-button KEPT — Plan 04 swaps it to setIsAdding(true). Plan 02 only restyles."
  - "Test mock for view-store-context needed both useViewStore (for cardProperties) AND useViewStoreApi (for hideStatus dispatch). board-card.test.tsx + board-column.test.tsx now declare both, mirroring issues-page.test.tsx pattern."

metrics:
  duration_seconds: 599
  completed_date: "2026-04-25"
  tasks_total: 3
  tasks_completed: 3
  files_created: 0
  files_modified: 4
---

# Phase 5 Plan 02: Wave 2A — Board visual restyle (KBN-07 board half) Summary

Restyled `board-card` (AccentBar leading edge + overflow-hidden + per-row padding) and `board-column` (italic Inter header label + tabular-nums count + brand-green drop-target ring + German strings) consuming Plan 00's `priorityToAccentColor` helper and the Phase 2 frozen `AccentBar` atom; landed two test seams (`data-issue-id`, `data-board-column-root`) within Plan 02's natural touch window so Plan 05 E2E specs (KBN-01, KBN-02) consume them in Wave 4 without surprise edits.

## Tasks Completed

| Task | Name | Commit | Files |
| ---- | ---- | ------ | ----- |
| 5-02-01 | board-card.tsx restyle — AccentBar + overflow-hidden + pt-3 + data-issue-id seam + GREEN tests | `10bebd0f` | board-card.tsx, board-card.test.tsx |
| 5-02-02 | board-column.tsx restyle — italic header + tabular-nums + ring-brand drop + German strings + data-board-column-root seam + GREEN tests | `e8481259` | board-column.tsx, board-column.test.tsx |
| 5-02-03 | Wave 2A gate — pnpm vitest issues/ + token-grep + pnpm typecheck | _no commit — gate only_ | _none_ |

## Visual Contract Delta

### `board-card.tsx` (Container + Identifier)

| Aspect | Before (Plan 01 dnd-kit) | After (Plan 02 visual) |
| --- | --- | --- |
| Outer wrapper className | `rounded-lg border-[0.5px] bg-card py-3 px-2.5 shadow-... transition-shadow group-hover:shadow-sm` | `rounded-lg border-[0.5px] bg-card overflow-hidden shadow-... transition-shadow group-hover:shadow-sm` (added `overflow-hidden`; removed `py-3 px-2.5`) |
| Outer wrapper data-attrs | `data-board-card-root` (existing test seam, set by Plan 01 expectation but never landed) | `data-board-card-root` + `data-issue-id={issue.id}` (W-2 fix — KBN-01 spec consumer) |
| First child of outer | `<p>{issue.identifier}</p>` | `<AccentBar color={priorityToAccentColor(issue.priority)} segments={1} className="h-1 w-full rounded-none" />` (NEW); identifier becomes second child |
| Identifier `<p>` className | `text-xs text-muted-foreground` (with outer providing py-3 px-2.5) | `pt-3 px-2.5 text-xs text-muted-foreground` + `data-board-card-identifier` |
| Title `<p>` className | `mt-1 text-sm font-medium leading-snug line-clamp-2` | `mt-1 px-2.5 text-sm font-medium leading-snug line-clamp-2` (inline px-2.5 since outer no longer has it) |
| Sub-issue progress + project row | `mt-1.5 flex items-center gap-1.5 flex-wrap` | `mt-1.5 px-2.5 flex items-center gap-1.5 flex-wrap` |
| Description `<p>` | `mt-1 text-xs text-muted-foreground line-clamp-1` | `mt-1 px-2.5 text-xs text-muted-foreground line-clamp-1` |
| Footer row | `mt-3 flex items-center gap-2` | `mt-3 px-2.5 pb-3 flex items-center gap-2` (inline px-2.5 + pb-3 — was provided by outer's py-3 px-2.5) |

### `board-column.tsx` (Header + Body + Empty State + Drop Target)

| Aspect | Before (Plan 01 dnd-kit) | After (Plan 02 visual) |
| --- | --- | --- |
| Outer wrapper data-attrs | _none_ | `data-board-column-root` (W-3 — KBN-02 .closest() ancestor anchor) |
| Status badge label | inline string inside the chip span (italic NOT applied) | `<span data-board-column-status-label className="text-xs italic font-semibold">{cfg.label}</span>` — chip's outer span no longer carries `text-xs font-semibold` (moved to inner label) so StatusIcon stays upright per HC-15 |
| Count span | `text-xs text-muted-foreground` (no test seam, no tabular-nums) | `data-board-column-count className="text-xs text-muted-foreground tabular-nums"` |
| Dropdown trigger button | (no data-attr) | `data-board-column-menu-trigger` |
| Dropdown item label | `Hide column` | `Spalte ausblenden` |
| Add-button | (no data-attr, no aria-label) | `data-board-column-add-trigger aria-label="Issue hinzufügen"` |
| Tooltip content | `Add issue` | `Issue hinzufügen` |
| Body div data-attr | _none_ | `data-board-column-body` |
| isDropTarget body className | `bg-accent/60` | `ring-2 ring-brand ring-offset-2 ring-offset-background bg-accent/40` |
| Empty state | `<p ...>No issues</p>` (single path) | conditional: `isDropTarget` → `<p ...text-brand font-medium>Hier ablegen</p>` else `<p ...text-muted-foreground>Keine Issues</p>` |

## priorityToAccentColor — Imported, Not Re-Created

Plan 02 imports the helper from `../utils/priority-color` (Plan 00 Wave 0 artefact). Per Plan 00 SUMMARY.md decision (B-1 fix), this helper was lifted from Plan 02 → Plan 00 so Plans 02 + 03 (parallel Wave 2) consume it without same-wave file collision. No file under `packages/views/issues/utils/` is touched by Plan 02 — only the import in `board-card.tsx` consumes it.

```typescript
// packages/views/issues/components/board-card.tsx (line ~21)
import { priorityToAccentColor } from "../utils/priority-color";

// Used inside BoardCardContent:
<AccentBar
  color={priorityToAccentColor(issue.priority)}
  segments={1}
  className="h-1 w-full rounded-none"
/>
```

## Validation Results

### Task 5-02-01 — board-card.test.tsx

```
pnpm --filter @multica/views exec vitest run issues/components/board-card.test.tsx
```

- RED: 8 tests failing (AccentBar absent, no data-issue-id, no data-board-card-identifier, etc.).
- GREEN: 8/8 tests passing in 482ms.

Test breakdown:
- 5 priority cases via `it.each([...])` and class-regex on `[data-slot="accent-bar"]` outerHTML — `urgent → bg-tag-p0`, `high → bg-tag-p1`, `medium → bg-tag-p2`, `low → bg-tag-p3`, `none → bg-muted` (W-1 fallback strategy honoured).
- 1 case: outer card has `overflow-hidden` (RESEARCH Pitfall 9 invariant).
- 1 case: outer card has `data-issue-id={fixture.id}` (W-2 — Plan 05 KBN-01 spec consumer).
- 1 case: identifier row has `pt-3` and NOT `py-3`.

### Task 5-02-02 — board-column.test.tsx

```
pnpm --filter @multica/views exec vitest run issues/components/board-column.test.tsx
```

- RED: 8 tests failing (no data-attrs, no italic class, "No issues" string instead of "Keine Issues", etc.).
- GREEN: 8/8 tests passing in 634ms.

Test breakdown:
- `data-board-column-root` exists on the outer wrapper AND `data-board-column-body` lives inside (W-3 invariant for `.closest()` walk-up).
- Status badge label has `italic` AND `font-semibold` classes.
- Count span has `tabular-nums` class.
- Drop-target body has `ring-2` and `ring-brand` classes when `isDropTarget`.
- Empty column shows `Keine Issues`.
- Empty + drop-target shows `Hier ablegen` and NOT `Keine Issues`.
- Add-button has `aria-label="Issue hinzufügen"`.
- Dropdown menu item label is `Spalte ausblenden` (clicked menu trigger to mount the menu, then verified text).

### Task 5-02-03 — Wave 2A Gate

| Phase | Command | Result |
| --- | --- | --- |
| Issues subtree GREEN | `pnpm --filter @multica/views exec vitest run issues/` | 8 test files passed, 4 skipped (12 total); 73 tests passed, 4 skipped (77 total) — 2.55s |
| Token-grep board-column | `grep -E "(#[0-9a-fA-F]{3,8}\|rgb\(\|rgba\(\|dark:)" packages/views/issues/components/board-column.tsx` | exit 1 — zero hits ✓ |
| Token-grep board-card | same regex on `board-card.tsx` | exit 0 — 1 hit (pre-existing `rgba(...)` in shadow — see Deviation 1 below) |
| Full typecheck | `pnpm typecheck` | 7/7 packages successful — 10.831s ✓ |

Issues subtree count progression (sanity):
- Pre-Plan-02 baseline (Plan 01 SUMMARY): 51 passed, 7 skipped (58 total).
- After Task 5-02-01: 65 passed, 5 skipped (70 total) — added 8 board-card tests + Plan 01's 6 board-view tests already there; net +14 vs pre-Plan-01 since Plan 01 SUMMARY was off by Plan 01's own additions. (Trace: 51 + 8 board-card + 6 board-view + minor = 65.)
- After Task 5-02-02: 73 passed, 4 skipped (77 total) — added 8 board-column tests.

## Deviations from Plan

### Auto-resolved Issues

**1. [Rule 1 — Pre-existing token violation kept (out of scope)] `rgba(...)` in board-card outer shadow**

- **Found during:** Task 5-02-01 Step 4 (token-discipline grep).
- **Issue:** `board-card.tsx` outer wrapper className includes the inherited shadow `shadow-[0_3px_6px_-2px_rgba(0,0,0,0.02),0_1px_1px_0_rgba(0,0,0,0.04)]` — the literal `rgba(...)` triggers the strict token grep (`grep -E "rgba\("` returns exit 0).
- **Why it stays:** The shadow IS the UI-SPEC §Board card visual line 290 contract — copy-pasted verbatim into the spec. It pre-dates Plan 02 (present at Plan 01's HEAD). Plan 02 introduces ZERO new violations. The plan's `<verify>` block does NOT actually fail on this — only the discipline grep in `<action>` Step 4 does, and that grep is a guard against NEW additions. Per the SCOPE BOUNDARY rule ("Only auto-fix issues DIRECTLY caused by the current task's changes"), this is out of scope.
- **Fix not applied:** would require swapping the shadow expression to a token-only construct (e.g. `shadow-card` token), which is a Phase 1 token-system change — not a Phase 5 visual restyle. Logged here for the verifier; Phase 1 RBR or a future shadow-token pass owns it.
- **Files affected:** none (no change made).
- **Commit:** none.

**2. [Rule 3 — Blocking] Worktree branch realigned onto `feat/repos-per-project` HEAD before execution**

- **Found during:** initial branch state inspection.
- **Issue:** The worktree branch `worktree-agent-a87a1fdb` was sitting at `6107211a` (a `main`-tip commit) and was missing the entire Phase 5 lineage (Wave 0 helper, Wave 1 dnd-kit migration, all `.planning/` docs). The orchestrator prompt explicitly stated "Branch: feat/repos-per-project (Wave 0+1 merged)" — without realignment, `priorityToAccentColor` would not exist and `priority-color.ts` import would fail.
- **Fix:** Reset the worktree branch onto `feat/repos-per-project` HEAD via the agent-startup `worktree_branch_check` allowance (`git reset --hard feat/repos-per-project`). This is the ONE place reset --hard is permitted. Verified `priority-color.ts` present and Wave 1 commits in `git log`.
- **Files affected:** none (branch realignment, not code change).
- **Commit:** none.

**3. [Rule 3 — Blocking] Card outer-wrapper padding moved onto child rows**

- **Found during:** Task 5-02-01 Step 3.
- **Issue:** The pre-Plan-02 outer wrapper was `rounded-lg border-[0.5px] bg-card py-3 px-2.5 shadow-... transition-shadow group-hover:shadow-sm` — i.e. it owned both vertical AND horizontal padding. Per UI-SPEC §Board card visual the AccentBar must span `h-1 w-full` and the card outer must have `overflow-hidden` to clip the bar's top corners. With the original `px-2.5` on the outer, the AccentBar would inherit a 10px horizontal inset and float visually inside the card with two 10px gaps on left/right — breaking UI-SPEC line 291.
- **Fix:** Removed `py-3 px-2.5` from outer wrapper; pushed `px-2.5` onto each inner row (identifier, title, sub-issue progress, description, footer) AND `pt-3` onto identifier (replacing the outer's py-3 top half) AND `pb-3` onto footer (replacing the outer's py-3 bottom half). This matches UI-SPEC lines 292-296 verbatim where each row is explicitly listed with `px-2.5`. The plan's `<action>` for Task 5-02-01 only mentioned identifier `pt-3` — Rule 3 mandated finishing the layout to honour the spec.
- **Files affected:** `packages/views/issues/components/board-card.tsx` — title, sub-issue, description, footer rows additionally edited.
- **Commit:** `10bebd0f` (folded into Task 5-02-01).

**4. [Rule 1 — Bug] Removed redundant `text-xs font-semibold` from outer chip span**

- **Found during:** Task 5-02-02 Step 3.
- **Issue:** Per HC-15 the italic axis must apply ONLY to the label text, not the StatusIcon. The original chip `<span className="... text-xs font-semibold ...">` carried both classes outside, so wrapping the label in an inner `<span className="text-xs italic font-semibold">` would have stacked `text-xs font-semibold` twice (parent and child). The icon would still be unaffected (icons render via SVG, not text), but the duplicated classes would be dead noise.
- **Fix:** Stripped `text-xs font-semibold` from the chip's outer span; only the inner label span owns those typography classes now. The chip span keeps `inline-flex items-center gap-1.5 rounded px-2 py-0.5 ${cfg.badgeBg} ${cfg.badgeText}` for layout + colour. Tests verify `italic` and `font-semibold` ARE on the label span (the only place they should be).
- **Files affected:** `packages/views/issues/components/board-column.tsx`.
- **Commit:** `e8481259` (folded into Task 5-02-02).

### Test infrastructure deviations

The plan's test pseudocode used `userEvent` and `it.each` directly without specifying mock surfaces. Filling in mocks required:

- **`@multica/core/issues/stores/view-store-context`** — both `useViewStore` (selector) AND `useViewStoreApi` (`{getState, setState, subscribe}`) needed; the column's dropdown handler dispatches `viewStoreApi.getState().hideStatus(status)`.
- **`./board-card`** — `DraggableBoardCard` mocked as a passive renderer (`<div data-testid={card-${id}}>{title}</div>`) so column tests don't need the full card mock graph.
- **`./status-icon`** — mocked to `null` since icon visuals aren't under test here.
- **droppable closure (`droppableState.isDropTarget`)** — the `useDroppable` mock reads from a closure variable mutated per-test before render, so `isDropTarget` toggles between `false` (default), `true` (drop-target tests).

These mock additions did NOT require changes to existing files (`issues-page.test.tsx` keeps its own complete mock block; the new tests are isolated).

## Plan 03 Parallel-Status

Plan 03 (list-view + list-row visual restyle) was scheduled to run in parallel with this plan. As of this SUMMARY's commit, Plan 03 is **NOT yet merged** on `feat/repos-per-project` — `git log feat/repos-per-project --oneline | head -10` shows the most recent Phase 5 commit is `2e5db5e4 docs(05-01): complete Wave-1 dnd-kit migration plan`. Plan 03 will land its own atomic commits on a sibling worktree branch; Plan 04 (Wave 3) will gate the merged union of Plan 02 + Plan 03 vitest runs.

Plans 02 and 03 are file-disjoint by design:
- **Plan 02 (this plan):** `board-card.{tsx,test.tsx}`, `board-column.{tsx,test.tsx}`.
- **Plan 03:** `list-row.{tsx,test.tsx}`, `list-view.{tsx,test.tsx}`.

Both consume the same `priorityToAccentColor` import from Plan 00. There is no shared writable state between the plans — no merge conflict expected.

## Pitfalls Honored

- ✅ Did NOT modify `STATUS_CONFIG` or `PRIORITY_CONFIG` (Hard Constraint B5).
- ✅ Did NOT modify `accent-bar.tsx` — Phase 2 atom finalised. No `data-accent-bar-color` / `data-accent-bar-orientation` added (W-1).
- ✅ Used `[data-slot="accent-bar"]` + className regex on `(bg|to|from)-{color}` for AccentBar identification (W-1 fallback).
- ✅ Italicised ONLY the column-header label text, not the StatusIcon (HC-15).
- ✅ Did NOT use `cardProperties.tags` — that field doesn't exist (RESEARCH Pitfall 8 / FL3). No TagChip on cards in Plan 02.
- ✅ Did NOT swap the add-button onClick to inline-add — Plan 04 owns that wiring.
- ✅ Did NOT change strings outside the explicit list (HC-19).
- ✅ Did NOT use `multiple={true}` or `accents` plural on AccentBar — passed `segments={1}`.
- ✅ Did NOT strip `data-issue-id` or `data-board-column-root` (W-2 / W-3 — Plan 05 consumers).
- ✅ Did NOT re-create `priority-color.ts` — imported from Plan 00 Wave 0 artefact.
- ✅ All commits used `git commit --no-verify` (worktree convention).
- ✅ Did NOT touch `list-view.tsx` or `list-row.tsx` (Plan 03 territory — file-disjoint).
- ✅ Did NOT touch dnd-kit logic (Plan 01 territory — purely visual).

## Hand-off to Plan 04 (Wave 3 — view toggle + inline-add)

Plan 04 can begin once Plan 03 lands (Wave 3 depends on union of Wave 2). The data-attrs Plan 02 added are stable — Plan 04's modifications to `board-column.tsx`:

1. **Inline-add wiring** — Plan 04 will add a local `useState<boolean>("isAdding")` in `BoardColumn`, swap the add-button onClick from `useModalStore.getState().open("create-issue", { status })` to `setIsAdding(true)`, and mount `<InlineTaskAdd status={status} onCancel={() => setIsAdding(false)} />` as the LAST child inside the body div (between the cards/empty-state and the existing `{footer}` slot).
2. **Data attrs preserved** — `data-board-column-root`, `data-board-column-body`, `data-board-column-add-trigger`, `data-board-column-menu-trigger`, `data-board-column-status-label`, `data-board-column-count` MUST stay (Plan 05 specs depend on them).
3. **add-trigger aria-label preserved** — `aria-label="Issue hinzufügen"` MUST stay (Plan 05 KBN-03 spec uses it to find the trigger).

## Self-Check: PASSED

All claimed files exist:

- ✅ `packages/views/issues/components/board-card.tsx` (modified — AccentBar import + outer attrs + per-row padding)
- ✅ `packages/views/issues/components/board-card.test.tsx` (modified — full vitest suite)
- ✅ `packages/views/issues/components/board-column.tsx` (modified — italic label + ring-brand + DE strings + data attrs)
- ✅ `packages/views/issues/components/board-column.test.tsx` (modified — full vitest suite)

All claimed commits exist on `worktree-agent-a87a1fdb`:

- ✅ `10bebd0f` feat(05): board-card AccentBar + overflow-hidden + data-issue-id seam (KBN-07)
- ✅ `e8481259` feat(05): board-column italic header + ring-brand drop + German strings + data-board-column-root seam (KBN-07)
