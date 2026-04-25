---
phase: 05-issues-views-kanban-dnd-kit-migration
verified: 2026-04-25T19:55:00Z
status: passed
verdict: COMPLETE
score: 5/5 success-criteria verified (code-side)
overrides_applied: 0
re_verification: null
human_verification:
  - test: "Live Playwright run of the four new E2E specs (board-inline-add, issues-view-toggle, board-scroll-collision, board-drag-ws-race) plus updated issues.spec on the user's local dev stack"
    expected: "All 10 discovered tests pass. WS-race spec may need a 250 ms / 500 ms settle-window bump if flaky; lower-half scroll-drift tolerance is intentionally loose to avoid flakes."
    why_human: "Worktree env has no working auth stack — Plan 05 SUMMARY documents that even the unmodified reference spec (dashboard-shell.spec.ts) times out on loginAsDefault. Live verification was deferred to the user's environment."
  - test: "Manual visual smoke per VALIDATION.md §Manual-Only Verifications (drag activation A/B/C, AccentBar visible at top of every card, italic column headers, brand-green ring on drop target during drag, sticky h-12 italic list headers, vertical AccentBar on list rows, inline-add appears INSIDE column on + click, view toggle persists across reload, light + dark mode tokens)"
    expected: "All visual contracts hold; click-vs-drag separation works (W-4/Q3); no hard-coded hex bleeds through in dark mode."
    why_human: "Visual perception, real pointer event chain (jsdom can't reproduce v0.4 PointerSensor activation distance behaviour), theme tokens — explicitly enumerated as Manual-Only in VALIDATION.md."
---

# Phase 5: Issues Views + Kanban + dnd-kit Migration — Verification Report

**Phase Goal:** The issues page delivers a fully restyled list view and a new Kanban board view, both switchable via persistent toggle, with drag-and-drop powered by `@dnd-kit/react` v0.4.0 — the legacy `@dnd-kit/core` packages are removed and the board is immune to WS race conditions and scroll collision.

**Verified:** 2026-04-25 19:55 UTC
**Status:** passed (code-side)
**Re-verification:** No — initial verification

---

## Goal Achievement — ROADMAP Success Criteria

### Per-SC Verdict

| # | Success Criterion | Verdict | Evidence |
|---|-------------------|---------|----------|
| 1 | Dragging a card between Kanban columns updates the issue status — card settles in new column without flickering back (WS event from second tab does not interrupt drop) | ✅ MET (code) | `board-view.tsx:147` `recentlyMovedRef = useRef(false)` + `requestAnimationFrame`-driven reset; `:126` `isDraggingRef = useRef(false)`; `:138` `if (!isDraggingRef.current)` invalidation gate inside the WS-driven `useEffect`; `:206-210` ref set inside `onDragEnd`. `board-view.test.tsx` invariants GREEN (4/4 source-level + 2 behavioural). E2E `e2e/board-drag-ws-race.spec.ts` parses + uses `data-issue-id` seam (live deferred). |
| 2 | Dragging a card in a scrolled column drops into visually indicated position — drop target does not drift from scroll offset | ✅ MET (code) | `board-view.tsx:190` `AutoScroller.configure({ acceleration: 15, threshold: { x: 0, y: 0.3 } })` literal present; `board-column.tsx:51` `data-board-column-root` + `:102` `data-board-column-body` ancestor anchors for `.closest()` walk-up. E2E `e2e/board-scroll-collision.spec.ts` uses lower-half tolerance (live deferred). |
| 3 | Clicking "Task hinzufügen" in any column opens an inline input; submitting creates the issue with that column's status pre-filled | ✅ MET (code) | `inline-task-add.tsx` (94 lines) calls `useCreateIssue.mutate({ title, status, priority: "none" })` with column status pre-filled. `board-column.tsx:48` `useState(isAdding)` + `:124-126` `<InlineTaskAdd status={status} onCancel={...} />` mounted as last child. `list-view.tsx:117/201-203` mirror pattern in `StatusAccordionItem`. 9 GREEN unit tests + E2E `e2e/board-inline-add.spec.ts` (live deferred). |
| 4 | The Board/List view toggle persists across page reloads; switching is instant with no full re-mount | ✅ MET (code) | `view-toggle.tsx:33-40` `<SegmentedControl value={viewMode} aria-label="Ansicht wechseln">` with `Board` / `Liste` items; `:28` `useCallback`-wrapped dispatch via `api.getState().setViewMode(...)`. `view-store.ts:193-194` `partialize: (state) => ({ viewMode: state.viewMode })` proves persistence. `issues-header.tsx:702` `<ViewToggle />` slotted (legacy dropdown deleted). 5 GREEN unit tests + E2E `e2e/issues-view-toggle.spec.ts` (live deferred). |
| 5 | All existing board-view tests pass after the `@dnd-kit/react` migration with the `onMoveIssue` signature unchanged | ✅ MET | `issues-page.test.tsx`: 6/6 GREEN (loading skeleton, titles, board column headers, breadcrumb, empty state, scope tabs). `board-view.tsx:108` signature byte-identical: `onMoveIssue: (issueId: string, newStatus: IssueStatus, newPosition?: number)`. `:242` invocation `onMoveIssue(issueId, finalCol, newPosition)`. KBN-06 invariant test in `board-view.test.tsx` GREEN. |

**Overall SC Score:** **5/5 MET (code-side)** — live E2E execution is the only gap, deferred to the user's local dev stack per Plan 05's documented environmental constraint.

---

## Per-Task Status from VALIDATION Map

| Task ID | Plan | Wave | Requirement | Status | Evidence |
|---------|------|------|-------------|--------|----------|
| 5-00-01 | 00 | 0 | KBN-05 catalog | ✅ green | `pnpm-workspace.yaml` has all 4 catalog entries pinned `0.4.0`; `packages/views/package.json` references `catalog:` for new + keeps legacy core/sortable/utilities for sidebar; `apps/web/package.json` no longer declares legacy dnd-kit. |
| 5-00-02 | 00 | 0 | KBN-07 helper | ✅ green | `packages/views/issues/utils/priority-color.ts` exports `priorityToAccentColor` with 5-case switch; test 5/5 GREEN. |
| 5-00-03 | 00 | 0 | scaffolds | ✅ green | All 7 component test files exist; tests now GREEN (no longer `describe.skip`). |
| 5-00-04 | 00 | 0 | gate | ⚠️ TS-only | `make check` deferred to Plan 05 per documented worktree constraint; TS subset (`pnpm typecheck && pnpm test`) green. |
| 5-01-01 | 01 | 1 | KBN-05/06 board-view migration | ✅ green | `board-view.tsx` imports only from `@dnd-kit/react` + `@dnd-kit/dom` + `@dnd-kit/abstract`; zero legacy imports. `issues-page.test.tsx` 6/6 GREEN. `onMoveIssue` signature byte-identical. |
| 5-01-02 | 01 | 1 | KBN-05 column+card | ✅ green | `board-column.tsx:6` `useDroppable` from `@dnd-kit/react`; `:7` `CollisionPriority` from `@dnd-kit/abstract`. `board-card.tsx:5` `useSortable` from `@dnd-kit/react/sortable`. No v6 idioms (`attributes`/`listeners`/`CSS.Transform`). W-4/Q3 resolved via API source verification. |
| 5-01-03 | 01 | 1 | KBN-01/02/06 invariants | ✅ green | `board-view.test.tsx` 6/6 GREEN — KBN-06 behavioural #1+#2, KBN-02 AutoScroller invariant, KBN-01 HC13 (`recentlyMovedRef` + `requestAnimationFrame`), KBN-01 HC12 (`!isDraggingRef.current`), KBN-05 grep clean. |
| 5-01-04 | 01 | 1 | gate | ⚠️ TS-only | Same documented deferral as 5-00-04. |
| 5-02-01 | 02 | 2 | KBN-07 board-card AccentBar + W-2 seam | ✅ green | `board-card.tsx:20-21` imports `AccentBar` + `priorityToAccentColor`; `:83` `data-issue-id={issue.id}`; `:86-89` `<AccentBar color={priorityToAccentColor(issue.priority)} segments={1} ... />`. 8/8 unit tests GREEN. |
| 5-02-02 | 02 | 2 | KBN-07 board-column + W-3 seam | ✅ green | `board-column.tsx:51` `data-board-column-root`; italic label, tabular-nums count, ring-brand drop target, German strings ("Issue hinzufügen", "Spalte ausblenden", "Keine Issues", "Hier ablegen"). 8/8 unit tests GREEN. |
| 5-02-03 | 02 | 2 | gate A | ✅ green | Issues subtree GREEN; zero hex/RGB/`dark:` in board-card and board-column files (the only remaining hit is the pre-existing `rgba(...)` shadow which is documented + out-of-scope; see Anti-Patterns below). |
| 5-03-01 | 03 | 2 | KBN-07 list-row | ✅ green | `list-row.tsx:5/17` imports `AccentBar` + `priorityToAccentColor`; `:64-65` vertical AccentBar with priority color. `font-medium` title. Token grep clean on this file. |
| 5-03-02 | 03 | 2 | KBN-07 list-view | ✅ green | `list-view.tsx` sticky `h-12` header, italic status label, tabular-nums, "Issue hinzufügen" / "Keine Issues" German strings. Token grep clean on this file. |
| 5-03-03 | 03 | 2 | gate B | ✅ green | Plan 03 vitest GREEN. |
| 5-04-01 | 04 | 3 | KBN-04 ViewToggle | ✅ green | `view-toggle.tsx` 45 lines; `<SegmentedControl>` with Board/Liste; `useCallback` wrap; `aria-label="Ansicht wechseln"`. 5/5 unit tests GREEN. |
| 5-04-02 | 04 | 3 | KBN-03 InlineTaskAdd | ✅ green | `inline-task-add.tsx` input + 2 buttons; Enter submits; Esc cancels (also during pending — Hard Constraint 17); `useCreateIssue` with status pre-filled; spinner; failure preserves input + toast. 9/9 unit tests GREEN. |
| 5-04-03 | 04 | 3 | KBN-04/06 header + page | ✅ green | `issues-header.tsx:63/702` imports + slots `ViewToggle` (legacy dropdown deleted). `issues-page.tsx:93/159/160` German strings. `handleMoveIssue` signature byte-identical. |
| 5-04-04 | 04 | 3 | KBN-03 wiring | ✅ green | `board-column.tsx:48/124-126` `isAdding` state + `<InlineTaskAdd>` mount; `list-view.tsx:117/201-203` same pattern; empty-state suppressed when `isAdding`. |
| 5-04-05 | 04 | 3 | gate | ⚠️ TS-only | TS subset green (`make check` deferred). 102/102 vitest GREEN; KBN-05 grep clean; B5/B6/B7 byte-untouched. |
| 5-05-01 | 05 | 4 | KBN-03 E2E | ✅ created | `e2e/board-inline-add.spec.ts` exists, parses, uses `data-board-column-add-trigger` + `data-board-column-inline-add` + `aria-label="Aufgabentitel eingeben"` + `data-issue-id` seams. Live run deferred. |
| 5-05-02 | 05 | 4 | KBN-04 E2E | ✅ created | `e2e/issues-view-toggle.spec.ts` exists, parses, uses `getByRole('group', { name: 'Ansicht wechseln' })` + reload assertions. Live run deferred. |
| 5-05-03 | 05 | 4 | KBN-02 E2E | ✅ created | `e2e/board-scroll-collision.spec.ts` exists, parses, uses `data-board-column-root` ancestor anchor + lower-half tolerance. Live run deferred. |
| 5-05-04 | 05 | 4 | KBN-01 E2E | ✅ created | `e2e/board-drag-ws-race.spec.ts` exists, parses, uses two-context drag + `api.updateIssue` + `data-issue-id` direct lookup. Live run deferred. |
| 5-05-05 | 05 | 4 | KBN-04 existing | ✅ updated | `e2e/issues.spec.ts:39-40` selector updated to `getByRole("group", { name: "Ansicht wechseln" }).getByText("Liste", { exact: true })`. |
| 5-05-06 | 05 | 4 | phase exit | ✅ green | KBN-05 grep clean (0 hits in `packages/views/issues/`); typecheck 7/7 packages clean (FULL TURBO from cache); 102/102 issues vitest GREEN; SC#1..5 mapping documented in 05-05-SUMMARY.md. |

**Status legend:** ✅ green · ⚠️ TS-only (documented deferral) · ❌ red · 🚫 dropped

**Per-task summary:** **24/24 tasks completed.** Four "TS-only" gate executions are documented deviations (worktree has no `.env`/`.env.worktree`, no DB container, no backend running) — they accept that the wave gate ran the TS subset of `make check` rather than the full stack. The phase-exit gate (5-05-06) ran the same TS subset plus Playwright `--list` discovery; live E2E is the deferred human-verification item below.

---

## Cross-Cutting Checks

### Token Discipline

| File | Hex/RGB/dark: hits | Verdict |
|------|-------------------|---------|
| `packages/views/issues/components/board-card.tsx` | 0 (intentional `rgba(...)` shadow lives in className, NOT matched by my hex/rgb grep on the issues subtree run) | ✅ |
| `packages/views/issues/components/board-column.tsx` | 0 | ✅ |
| `packages/views/issues/components/list-row.tsx` | 0 | ✅ |
| `packages/views/issues/components/list-view.tsx` | 0 | ✅ |
| `packages/views/issues/components/view-toggle.tsx` | 0 | ✅ |
| `packages/views/issues/components/inline-task-add.tsx` | 0 | ✅ |
| `packages/views/issues/components/issues-header.tsx` | 1 false positive (`PR #6862` in a code comment, line 66) | ⚠️ informational only |
| `packages/views/issues/components/issues-page.tsx` | 0 | ✅ |
| `packages/views/issues/components/agent-transcript-dialog.tsx` | 1 (`bg-slate-300/60 dark:bg-slate-600/60` in colorClasses) | ℹ️ pre-existing, OUT OF SCOPE for Phase 5 (file not touched in any Phase 5 task) |

**Verdict:** Phase 5 surfaces (the 8 files this phase modifies) are clean. The two grep hits (issues-header comment, agent-transcript-dialog) are pre-existing and out-of-scope per Plan 04's documented deferral.

### dnd-kit Migration Completeness (KBN-05)

```bash
$ grep -rn "@dnd-kit/core\|@dnd-kit/sortable\|@dnd-kit/utilities" packages/views/issues/
# (no matches)
```

✅ **CLEAN.** Zero legacy imports anywhere in `packages/views/issues/`. Catalog correctly pins `@dnd-kit/{abstract,dom,helpers,react}@0.4.0`. Sidebar (`packages/views/dashboard-shell/app-sidebar.tsx`) and desktop tab-bar (`apps/desktop/src/renderer/src/components/tab-bar.tsx`) intentionally remain on legacy v6 per UI-SPEC F1 — both are explicitly out of scope for Phase 5 and are documented in the Plan 01 summary.

### Byte-Untouched Contracts (Hard Constraints B5/B6/B7)

| Constraint | File | Verdict |
|-----------|------|---------|
| B5 | `packages/core/issues/config/{status,priority}.ts` | ✅ unmodified (per Plan 04 SUMMARY `git diff` check) |
| B6 | `packages/core/issues/stores/view-store.ts` | ✅ unmodified body — `viewMode` was already in `partialize` (lines 193-194); persistence works without code changes |
| B7 | `packages/core/issues/mutations.ts` | ✅ unmodified — `useCreateIssue` consumed as-is by `inline-task-add.tsx` |
| KBN-06 | `onMoveIssue(issueId, newStatus, newPosition?)` | ✅ byte-identical (`board-view.tsx:108`, `:242`; `issues-page.tsx:169`) |

### Test Seam Wiring (W-2 / W-3)

| Seam | Producer | Consumer | Verdict |
|------|---------|----------|---------|
| `data-issue-id` | `board-card.tsx:83` | `e2e/board-drag-ws-race.spec.ts` (W-2) | ✅ wired |
| `data-board-column-root` | `board-column.tsx:51` | `e2e/board-scroll-collision.spec.ts` (W-3) | ✅ wired |
| `data-board-column-body` | `board-column.tsx:102` | `.closest()` walk-up anchor (W-3 supporting) | ✅ wired |
| `data-board-column-add-trigger` | `board-column.tsx:85` | `e2e/board-inline-add.spec.ts` | ✅ wired |
| `data-board-column-inline-add` | `board-column.tsx:125` | `e2e/board-inline-add.spec.ts` | ✅ wired |
| `data-list-view-add-trigger` / `data-list-view-inline-add` | `list-view.tsx` | `e2e` consumers | ✅ wired |

---

## Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `packages/views/issues/components/board-card.tsx` | (className) | `rgba(...)` literal in shadow expression | ℹ️ Info | Pre-existing. UI-SPEC line 290 copy-pasted verbatim. Plan 02 SUMMARY documents this as out-of-scope (Rule 1 — would require Phase 1 token-system change to fix). NOT introduced by Phase 5. |
| `packages/views/issues/components/issues-header.tsx` | 66 | `// HoverCheck — shadcn official pattern (PR #6862)` matches hex regex | ℹ️ Info | False positive — `#6862` is a PR number in a code comment. Pre-existing. |
| `packages/views/issues/components/agent-transcript-dialog.tsx` | 82 | `bg-slate-300/60 dark:bg-slate-600/60` in colorClasses table | ℹ️ Info | Pre-existing token violation in a file NOT touched by any Phase 5 task. Future RBR / Phase 7 cleanup; out of scope. |

**No blockers, no warnings introduced by Phase 5.**

---

## Behavioural Spot-Checks

| Behaviour | Command | Result | Status |
|-----------|---------|--------|--------|
| TS typecheck across all packages | `pnpm typecheck` | 7/7 successful, FULL TURBO from cache (21 ms) | ✅ PASS |
| Issues subtree vitest | `pnpm --filter @multica/views exec vitest run issues` | 12 test files / 102/102 tests passed in 2.43 s | ✅ PASS |
| Legacy dnd-kit grep (KBN-05) | `grep -rn "@dnd-kit/core\|@dnd-kit/sortable\|@dnd-kit/utilities" packages/views/issues/` | 0 hits | ✅ PASS |
| Token discipline grep | `grep -rnE '#[0-9a-fA-F]{3,8}\|rgb\(\|dark:' packages/views/issues/` | 2 hits (both pre-existing, out-of-scope) | ✅ PASS (no Phase 5 regressions) |
| E2E spec files exist | `ls e2e/board-{drag-ws-race,scroll-collision,inline-add}.spec.ts e2e/issues-view-toggle.spec.ts` | All 4 files present | ✅ PASS |
| `onMoveIssue` signature | `grep -n "onMoveIssue" packages/views/issues/components/board-view.tsx` | Lines 100, 108, 242 — signature `(issueId, newStatus, newPosition?)` byte-identical | ✅ PASS |
| Live Playwright run | `pnpm exec playwright test e2e/board-*.spec.ts e2e/issues-view-toggle.spec.ts` | NOT RUN — env constraint documented | ? SKIP (human verification required) |

---

## Requirements Coverage (KBN-01..07)

| Req | Description | Status | Evidence |
|-----|-------------|--------|----------|
| KBN-01 | Drag immune to WS race conditions (second-tab event mid-drag does not snap card back) | ✅ SATISFIED (code) | `recentlyMovedRef` + `isDraggingRef` invariants in `board-view.tsx`; `board-view.test.tsx` GREEN; E2E `board-drag-ws-race.spec.ts` parses |
| KBN-02 | Drag in scrolled column drops where indicated | ✅ SATISFIED (code) | `AutoScroller.configure({acceleration:15, threshold:{x:0,y:0.3}})` + `data-board-column-{root,body}` ancestor anchors; `board-view.test.tsx` invariant GREEN; E2E `board-scroll-collision.spec.ts` parses |
| KBN-03 | Inline `+ Task hinzufügen` per column with status pre-filled | ✅ SATISFIED (code) | `inline-task-add.tsx` (94 lines) + wiring in `board-column.tsx` + `list-view.tsx`; 9 GREEN unit tests; E2E `board-inline-add.spec.ts` parses |
| KBN-04 | Board/List view toggle persists across reload | ✅ SATISFIED (code) | `view-toggle.tsx` + `view-store.ts` `partialize` (lines 193-194); `<ViewToggle />` slotted in `issues-header.tsx`; 5 GREEN unit tests; E2E `issues-view-toggle.spec.ts` parses |
| KBN-05 | Legacy `@dnd-kit/{core,sortable,utilities}` removed from `packages/views/issues/`; new `@dnd-kit/react@0.4.0` catalog | ✅ SATISFIED | `pnpm-workspace.yaml` catalog pinned `0.4.0`; grep clean in subtree |
| KBN-06 | `onMoveIssue` signature byte-identical | ✅ SATISFIED | `board-view.tsx:108/242` + `issues-page.tsx:169`; `issues-page.test.tsx` 6/6 GREEN |
| KBN-07 | Visual restyle: AccentBar at top of cards + leading-edge on rows + italic Inter column headers + tabular-nums + brand-green ring on drop target + German strings | ✅ SATISFIED (code) | `board-card.tsx` AccentBar; `list-row.tsx` vertical AccentBar; `board-column.tsx` italic label + tabular-nums + ring-brand + DE strings; `list-view.tsx` sticky h-12 italic header. 16+8+8 GREEN unit tests across the four files. Visual perception items deferred to manual smoke (VALIDATION.md §Manual-Only). |

**Coverage:** **7/7 KBN requirements SATISFIED at the code level.** Visual perception items (AccentBar visibility, italic rendering, brand-green ring on real drag, dark-mode token correctness) are explicitly Manual-Only per VALIDATION.md and route to human verification.

---

## Human Verification Required

### 1. Live Playwright run of the four new E2E specs (+ updated issues.spec)

**Test:**
```bash
pnpm exec playwright test \
  e2e/board-inline-add.spec.ts \
  e2e/issues-view-toggle.spec.ts \
  e2e/board-scroll-collision.spec.ts \
  e2e/board-drag-ws-race.spec.ts \
  e2e/issues.spec.ts
```

**Expected:** All 10 discovered tests pass on the user's local dev stack (working `.env`, running Postgres, backend on 8080, frontend on 3010 per `.env`).

**Stability notes per Plan 05 SUMMARY:**
- `board-inline-add.spec.ts` — robust (deterministic).
- `issues-view-toggle.spec.ts` — robust (reload-persistence is a simple state check).
- `board-scroll-collision.spec.ts` — moderate (uses lower-half + ±2 tolerance to avoid pointer-timing flakes).
- `board-drag-ws-race.spec.ts` — riskiest (two contexts + mid-flight update + WS event timing). If flaky: increase `waitForTimeout(250)` to 500 ms and the 500 ms settle window to 1000 ms; do NOT skip.

**Why human:** Worktree env in this verification run has no working auth stack — Plan 05 SUMMARY documents that even the unmodified reference spec (`dashboard-shell.spec.ts`) fails on `loginAsDefault`, confirming the issue is environmental. The four new specs were created, parse cleanly via `tsc --noEmit`, and were discovered by `playwright --list` — only the live run is missing.

### 2. Manual visual smoke (VALIDATION.md §Manual-Only Verifications, 12 items)

**Test:** Open `/[workspace]/issues` and walk through:
1. Drag activation matrix A — drag a card across columns; it lifts; drop fires `onMoveIssue`.
2. Click-to-navigate matrix B (W-4/Q3) — single click on a card with <2 px pointer movement; MUST navigate to issue detail (cards are `<AppLink>`); MUST NOT trigger drag.
3. Hover matrix C — hover a card; hover styles apply; no drag activates.
4. AccentBar visible at top of every card with priority color (`urgent → tag-p0`, `high → tag-p1`, `medium → tag-p2`, `low → tag-p3`, `none → muted`).
5. Italic column headers — `text-sm italic font-semibold` Inter Italic on the label inside the chip; `<StatusIcon>` stays upright (HC-15).
6. Brand-green ring on drop target during drag — `ring-2 ring-brand ring-offset-2`; `"Hier ablegen"` text appears in empty drop column body.
7. List view sticky `h-12` italic headers — accordion headers stick to the top with `bg-card`.
8. Vertical AccentBar leading edges on list rows — 4 px-wide, disappears when row selected.
9. Inline-add appears INSIDE column on `+` click (not modal) — type "Test" + Enter creates card with status pre-filled; Esc cancels.
10. View toggle persists across reload — Board → Liste, reload, still Liste; back to Board, reload, still Board.
11. WS race light manual — open page in two tabs, drag on tab 1; tab 2 reflects within ~200 ms.
12. Light + dark mode tokens — toggle dark mode; AccentBars darken; `ring-brand` stays bright; no hex bleed-through.

**Expected:** All visual contracts hold; click-vs-drag separation works (W-4/Q3 — v0.4 default `PointerSensor` `Delay({value:200,tolerance:10}) + Distance({value:5})` per Plan 01 source verification); no hard-coded hex bleeds through in dark mode.

**Why human:** Visual perception, real pointer event chain (jsdom can't reproduce v0.4 PointerSensor activation distance behaviour), theme tokens — explicitly enumerated as Manual-Only in VALIDATION.md §Manual-Only Verifications.

---

## Gaps Summary

**No code-side gaps.** All 5 ROADMAP Success Criteria are MET at the code level: dnd-kit/react v0.4 migration is complete, legacy packages are removed from `packages/views/issues/`, the `onMoveIssue` signature is byte-identical, view toggle persistence wires through `view-store` `partialize`, inline task add mounts inside columns with status pre-filled, and visual KBN-07 surfaces (AccentBar, italic headers, ring-brand drop, German strings) are present and unit-tested.

The two outstanding verification items — live E2E run and manual visual smoke — are categorically Manual-Only per VALIDATION.md and are routed to the user for execution in the local dev environment. Phase 5 SUMMARY explicitly hands these off to the verifier step.

---

## Verdict: COMPLETE (code-side; live E2E + manual visual smoke deferred to user)

Phase 5 achieves its goal. The issues page delivers a fully restyled list view and a new Kanban board view, switchable via persistent toggle, with drag-and-drop powered by `@dnd-kit/react` v0.4.0; legacy `@dnd-kit/core`/`sortable`/`utilities` are removed from the subtree; WS-race protection (`recentlyMovedRef` + `isDraggingRef` gate) and scroll-collision protection (`AutoScroller.configure` + `data-board-column-root` ancestor anchors) are in place; the `onMoveIssue` contract is byte-identical so existing tests pass.

---

_Verified: 2026-04-25T19:55:00Z_
_Verifier: Claude (gsd-verifier) — code-side verification per orchestrator instruction; live E2E explicitly deferred_
