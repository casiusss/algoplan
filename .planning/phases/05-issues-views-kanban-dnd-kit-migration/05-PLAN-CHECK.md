---
phase: 05-issues-views-kanban-dnd-kit-migration
status: revision_required
verdict: REVISION REQUIRED
created: 2026-04-25
plans_checked: 6
blockers: 2
warnings: 4
info: 2
---

# Phase 5 — Plan Verification Report

**Verdict: REVISION REQUIRED — 2 blockers must be fixed before execution; 4 warnings recommended.**

The plan set is exceptionally well-researched and largely faithful to UI-SPEC + RESEARCH. The KBN-01..07 requirements all have at least one covering task, the architectural responsibility map is honoured (browser/client tier work stays in browser/client; API and DB untouched), and the load-bearing invariants (`onMoveIssue` signature, `recentlyMovedRef`, `mutations.ts`/`view-store.ts` byte-untouched, F1 sidebar/tab-bar excluded) are explicit and consistently re-asserted across plans.

The two blockers are genuine wave-graph issues that will cause execution failures, not stylistic concerns.

---

## Per-Dimension Verdicts

| Dim | Name | Verdict | Notes |
|-----|------|---------|-------|
| 1 | Requirement Coverage | PASS | KBN-01..07 each map to ≥1 task; ROADMAP SC#1..5 all delivered (mapping table in Plan 05 Task 06). |
| 2 | Task Completeness | PASS | All `<task>` blocks have files/action/verify/done; checkpoints not used (autonomous workflow). |
| 3 | Dependency Correctness | **FAIL** | **Blocker B-1**: Plan 03 `depends_on: ["05-01"]` contradicts its own pitfalls. It imports `priority-color.ts` created in Plan 02. |
| 4 | Key Links Planned | PASS | All `key_links` have implementing tasks (e.g. `board-view → board-column` cardIndex threading; `view-toggle → view-store` selector dispatch; `inline-task-add → mutations` createIssue). |
| 5 | Scope Sanity | WARN | Plan 04 has 5 tasks + 9 files modified (over the warning threshold). Plan 01 has 4 tasks + 5 files. Both are intentional given atomic-rewrite constraints; not a hard fail but worth surfacing. |
| 6 | must_haves Derivation | PASS | Truths are user-observable or load-bearing source-level invariants (e.g. "AccentBar visible at top of card"; "no setColumns mutation in onDragOver"); artifacts have `min_lines` + `contains` regex; key_links have `pattern` regex. |
| 7 | Context Compliance | PASS | CONTEXT.md is auto-generated (discuss skipped per `workflow.skip_discuss`). All "Claude's Discretion" guidance honoured. The 3-commit split recommendation is reflected in the wave structure (Wave 1 = API migration, Wave 2 = visual restyle, Wave 3 = inline-add + view-toggle, Wave 4 = E2E). |
| 7c | Architectural Tier Compliance | PASS | Responsibility Map honoured: drag detection stays in browser, optimistic patch stays in TanStack Query cache, view-mode persistence stays client-side via Zustand+localStorage, server persistence and WS broadcast remain unchanged. No tier mismatches. |
| 8 | Nyquist Compliance | **FAIL** | **Blocker B-2**: VALIDATION.md does not exist for this phase, even though `nyquist_validation: true` and RESEARCH has a "Validation Architecture" section. |
| 9 | Cross-Plan Data Contracts | PASS | No conflicting transforms on shared data. The shared `priority-color.ts` helper is a one-way pure function consumed by both Plans 02 and 03 (and is the trigger for B-1, not a data-contract issue itself). |
| 10 | CLAUDE.md Compliance | PASS | Catalog: discipline followed; package boundaries respected (no `next/*` in `packages/views/`; `useUpdateIssue` mutation pattern preserved; Zustand store discipline maintained); test placement follows the "tests follow the code" rule (component tests live next to components). The `useCallback` wrap on SegmentedControl onValueChange is explicitly called out (Pitfall 10), matching the CLAUDE.md "Selectors must return stable references" rule. |
| 11 | Research Resolution | **WARN** | RESEARCH.md `## Open Questions` section is NOT marked `(RESOLVED)`. Q1 (DragOverlay → Feedback plugin) is partially addressed in Plan 01 Step 4 ("Path A or Path B"); Q2 (provider portal position) is implicitly settled by Plan 01's wrapping pattern; **Q3 (touch / pointer activation distance — click-vs-drag confusion on cards that are also `<AppLink>` navigation)** is NOT addressed in any plan. |
| 12 | Pattern Compliance | PASS | Every file in PATTERNS.md `## File Classification` has its analog referenced in the corresponding plan's action section. The `comment-input.tsx` analog for `inline-task-add.tsx` is referenced in Plan 04. The `segmented-control.test.tsx` Harness pattern is referenced in Plan 04 view-toggle test. |

---

## Per-Plan Assessment

### Plan 05-00 (Wave 0) — Foundation: catalog + scaffolds
**Verdict: PASS**

- Task 1 atomic catalog edit + hoist verification + desktop typecheck (smart early signal for the A1 risk).
- Task 2 creates 8 RED scaffolds with explicit Plan attribution per file (prevents accidental over-write).
- Task 3 baseline `make check` documented as the "before" state.
- Pinned versions to bare `0.4.0` (no caret) per RESEARCH.
- Honours F1: legacy `@dnd-kit/{core,sortable,utilities}` kept in `packages/views/package.json` for sidebar; conditional handling for `apps/desktop/package.json` based on hoist verification.
- KBN-05 partial-removal claim correctly framed (legacy stays in workspace; only the issues subtree is migrated).

**Minor info:** Step 4 conditional `apps/desktop/package.json` outcome is correctly deferred to runtime hoist verification — the plan does not over-commit. This is good engineering hygiene.

### Plan 05-01 (Wave 1) — dnd-kit API rewrite
**Verdict: PASS** (with one info-level note)

- Atomic 3-file rewrite (board-view + board-column + board-card) with the test-mock swap done in the same wave to keep the 6 existing tests passing.
- Hand-rolled splice in `onDragEnd` (NOT `move()` helper) — explicitly documented and grep-tested in Task 03 source-invariants.
- `AutoScroller` configured with `threshold: { x: 0, y: 0.3 }` — explicit and grep-tested.
- `recentlyMovedRef` + `requestAnimationFrame` + `useEffect` gate retained verbatim — explicit and grep-tested.
- `onMoveIssue(id, status, position?)` byte-identical signature; KBN-06 contract preserved.
- DragOverlay strategy: Path A (Feedback plugin) preferred, Path B (custom portal) fallback — flexible without being vague (executor must document choice).

**Info I-1:** Step 4 invokes `Feedback` from `@dnd-kit/dom` but the imports listed in Step 2 do not include `Feedback`. Executor must add it conditionally per chosen path. This is documented in the test-mock block ("Add Feedback if Path A was chosen") but not in the production-code import block. Suggest: add a single sentence in Step 2 noting "if Path A is chosen in Step 4, add `Feedback` to the `@dnd-kit/dom` import".

### Plan 05-02 (Wave 2) — Board visual restyle
**Verdict: PASS**

- TDD-strict: RED tests written before each helper/component edit.
- AccentBar `segments=1` + `overflow-hidden` + `pt-3` identifier — all per Hard Constraint 16 + Pitfall 9.
- German strings on board: "Issue hinzufügen", "Spalte ausblenden", "Keine Issues", "Hier ablegen" — all per UI-SPEC Copywriting Contract.
- Defensive test seam strategy: tries `data-accent-bar-color` first, falls back to className regex (matches reality — the AccentBar atom only exposes `data-slot="accent-bar"`).
- Token-discipline grep in every task `<verify>` (Hard Constraints 2/3/4).
- Add-button onClick deliberately NOT changed in Plan 02 — left as `useModalStore` call until Plan 04 wires inline-add. This is a clean separation of concerns that prevents wave-2/wave-3 rework conflicts.

### Plan 05-03 (Wave 2) — List visual restyle
**Verdict: REVISION REQUIRED — see Blocker B-1**

Excluding the dep declaration, this plan is well-formed: TDD-strict, list-row vertical AccentBar with selection-suppression, sticky `h-12` headers, German strings, token-discipline grep.

**Blocker B-1 (dependency_correctness):** `depends_on: ["05-01"]` is wrong. `list-row.tsx` imports `priorityToAccentColor` from `../utils/priority-color`, which is created in Plan 02. The plan's own `<pitfalls>` block explicitly acknowledges this:

> Plan 03 depends ONLY on Plan 01 (NOT Plan 02). The `priority-color.ts` helper is added in Plan 02 — if Plan 03 starts before Plan 02 merges, the import will fail. Either: (a) wait for Plan 02 to merge before starting Plan 03 OR (b) duplicate the priority-color helper inline temporarily and rebase. Recommendation: serialise — let Plan 02 merge first, then start Plan 03.

The orchestrator (`gsd-execute-phase`) reads `depends_on` from frontmatter to schedule waves. With the current declaration, Plan 03 is scheduled in parallel with Plan 02 in Wave 2, which the plan itself says will fail.

**Required fix (choose one):**
1. Change `depends_on: ["05-01", "05-02"]` and bump `wave: 3` (Plan 04 then becomes Wave 4, Plan 05 Wave 5). This is the cleanest fix.
2. Keep Wave 2 parallelism but move the `priority-color.ts` creation into Plan 00 (Wave 0). Both Plans 02 and 03 then consume it from Wave 0.
3. Inline-duplicate the helper in `list-row.tsx` temporarily (option (b) in the plan's pitfalls), then dedupe in Plan 04 — fragile, NOT recommended.

**Warning W-1 (test seam fragility):** `list-row.test.tsx` queries `[data-accent-bar-orientation="vertical"]` as the PRIMARY selector. The AccentBar atom does not expose this attribute (only `data-slot="accent-bar"`). The test has a fallback for `data-accent-bar-color` but not for `data-accent-bar-orientation`. The test will fail on the first query. Apply the same defensive pattern as Plan 02: query `[data-slot="accent-bar"]` and disambiguate orientation by className (`absolute inset-y-0 left-0 w-1` vs. `h-1 w-full rounded-none`).

### Plan 05-04 (Wave 3) — ViewToggle + InlineTaskAdd + wiring
**Verdict: PASS** (with one warning)

- ViewToggle uses `useCallback`-wrapped `onValueChange` per Pitfall 10 — explicit and tested.
- InlineTaskAdd full keyboard contract: Enter submits, Esc cancels (always, even during pending — Hard Constraint 17).
- `useCreateIssue({ workspace_id, title, status, priority: "none" })` per RESEARCH; mutation untouched (B7).
- Dropdown view picker explicitly removed (lines 702-737 of issues-header.tsx); ViewToggle slotted in same position.
- German empty-state + toast strings landed in issues-page.tsx; `handleMoveIssue` signature byte-identical (B2).
- `isAdding` state per-column AND per-list-panel (correctly local, not persisted — UI-SPEC explicitly excludes ephemeral UI state).
- Task 5 phase-gate explicitly greps for `git diff` against `mutations.ts`, `view-store.ts`, `STATUS_CONFIG`, `PRIORITY_CONFIG` — proves B5/B6/B7 invariants automatically.

**Warning W-2 (scope_sanity):** Plan 04 has 5 tasks and modifies 9 files (re-touches `board-column.tsx` and `list-view.tsx` from Plans 02 and 03). The thresholds in the plan-checker reference 5+ tasks/15+ files as warnings. This plan stays within the file-count budget but is at the upper edge of the task-count budget. The split is logical (one task per concern: ViewToggle, InlineTaskAdd, header+page wiring, column+list wiring, gate), and the work is genuinely cohesive. Acceptable as-is, but the executor should monitor context budget.

### Plan 05-05 (Wave 4) — E2E specs
**Verdict: PASS** (with two warnings)

- Four new specs cover SC#1..4; existing `issues.spec.ts` updated for "Liste" label (SC#5 indirectly).
- ROADMAP SC mapping table embedded in Task 06 — satisfies the goal-backward checklist requirement.
- TestApiClient fixture used for setup/teardown per CLAUDE.md e2e convention.
- Realistic acknowledgment that `dragTo` may not work with @dnd-kit's pointer events; manual `mouse.down/move/up` fallback documented.
- Tolerance window `Math.abs(actual - expected) <= 1` for KBN-02 drop accuracy — pragmatic.

**Warning W-3 (test seam dependency):** The KBN-01 race spec uses `data-issue-id` on `board-card-root`, which does NOT exist after Plans 01-04. The plan acknowledges this and asks the executor to add it in this task. This adds a 6th plan to the chain that touches `board-card.tsx`, but it's a low-risk additive change. Suggest: move the `data-issue-id` addition into Plan 02 Task 02 (board-card.tsx restyle) so it's set during the natural touch window.

**Warning W-4 (KBN-02 selector path):** The scroll-collision spec walks up from `[data-board-column-body]` to its closest scrollable ancestor via `data-board-column-root`, but no plan adds `data-board-column-root`. Either add it in Plan 02 Task 03 (board-column.tsx restyle) or change the spec to use `el.closest('[class*="overflow-y-auto"]')`. Suggest: add the attribute in Plan 02 — small additive change, big debug gain.

---

## Goal-Backward Verification (ROADMAP SC#1..5)

| SC | Description | Delivering Task(s) | Verdict |
|----|-------------|-------------------|---------|
| SC#1 | Drag updates status; survives WS event from second tab | Plan 01 Task 03 (recentlyMovedRef invariant) + Plan 05 Task 04 (e2e/board-drag-ws-race.spec.ts) | COVERED |
| SC#2 | Drag in scrolled column drops where indicated | Plan 01 Task 03 (AutoScroller config invariant) + Plan 05 Task 03 (e2e/board-scroll-collision.spec.ts) | COVERED |
| SC#3 | "Task hinzufügen" inline input creates issue with status | Plan 04 Task 02 (inline-task-add.test.tsx) + Plan 05 Task 01 (e2e/board-inline-add.spec.ts) | COVERED |
| SC#4 | View toggle persists across reload | Plan 04 Task 01 (view-toggle.test.tsx) + Plan 05 Task 02 (e2e/issues-view-toggle.spec.ts) | COVERED |
| SC#5 | Existing board-view tests pass; onMoveIssue signature unchanged | Plan 01 Task 01 (issues-page.test.tsx mock swap) + Plan 01 Task 03 (KBN-06 source invariant) | COVERED |

Every ROADMAP success criterion has at least one delivering task. Goal-backward chain is complete.

## KBN-01..07 Coverage

| Req | Plans | Verdict |
|-----|-------|---------|
| KBN-01 (WS race immunity) | 01 (recentlyMovedRef + ref-driven transforms), 05 (E2E) | COVERED |
| KBN-02 (scroll-collision drift fix) | 01 (AutoScroller config), 05 (E2E) | COVERED |
| KBN-03 (inline task add per column) | 04 (component + wiring), 05 (E2E) | COVERED |
| KBN-04 (persistent view toggle) | 04 (ViewToggle + view-store partialize), 05 (E2E) | COVERED |
| KBN-05 (legacy dnd-kit removed from issues subtree) | 00 (catalog), 01 (rewrite), 04 (gate grep) | COVERED |
| KBN-06 (onMoveIssue signature unchanged) | 01 (Tasks 01 + 03 source invariant) | COVERED |
| KBN-07 (italic headers + AccentBar) | 02 (board half), 03 (list half) | COVERED |

---

## Hard Constraint Cross-Check

| Constraint | Verified Where | Status |
|-----------|---------------|--------|
| B2: onMoveIssue signature byte-identical | Plan 01 Task 01 + 03 + Plan 04 Task 03 | OK |
| B5: STATUS_CONFIG / PRIORITY_CONFIG untouched | Plan 04 Task 05 git diff gate | OK |
| B6: view-store.ts partialize untouched | Plan 04 Task 05 git diff gate | OK |
| B7: mutations.ts / useUpdateIssue untouched | Plan 04 Task 05 git diff gate | OK |
| F1: sidebar + tab-bar stay on legacy | Plan 00 (legacy KEPT in views/package.json) + Plan 01 explicit pitfall | OK |
| 9: AutoScroller threshold {x:0, y:0.3} | Plan 01 Task 01 + Task 03 grep test | OK |
| 11: useSortable group=issue.status | Plan 01 Task 02 explicit | OK |
| 12: No setColumns mutation in onDragOver | Plan 01 Task 01 (empty onDragOver) + comment | OK |
| 13: recentlyMovedRef freeze frame retained | Plan 01 Task 01 + Task 03 grep test | OK |
| 14: qc.cancelQueries fire-and-forget (not awaited) | Plan 01 (do-not-touch mutations.ts) | OK |
| 15: Italic only on column/accordion-header status labels | Plan 02 Task 03 + Plan 03 Task 02 | OK |
| 16: AccentBar segments=1 only | Plan 02 Task 02 + Plan 03 Task 01 | OK |
| 17: InlineTaskAdd Esc always works during pending | Plan 04 Task 02 (test "Esc still works during pending") | OK |
| 18: ViewToggle replaces dropdown | Plan 04 Task 03 explicit | OK |
| 19: German strings limited to UI-SPEC list | Pitfalls in Plans 02/03/04 | OK |
| 20: Legacy packages REMAIN in workspace | Plan 00 explicit | OK |

All 20 Hard Constraints from UI-SPEC are accounted for in at least one plan.

---

## Required Revisions

### BLOCKER B-1 — Plan 03 dependency declaration is wrong (dependency_correctness)

**Plan:** 05-03
**Task:** Plan-level frontmatter
**Issue:** `depends_on: ["05-01"]` while `list-row.tsx` imports `priorityToAccentColor` from `packages/views/issues/utils/priority-color.ts`, which is created in Plan 02.
**Impact:** Orchestrator schedules Plan 03 in parallel with Plan 02 in Wave 2 → import resolution fails when Plan 03's executor runs `pnpm --filter @multica/views typecheck` or its vitest. The plan's own `<pitfalls>` section acknowledges the conflict.

**Fix:** Choose one of:
- **(Recommended)** Update `depends_on: ["05-01", "05-02"]` and `wave: 3`. Re-number downstream: Plan 04 → wave 4, Plan 05 → wave 5. Update `depends_on` of Plans 04/05 accordingly.
- Move `priority-color.ts` creation (Plan 02 Task 01) into Plan 00 as a Wave-0 task. Both Plan 02 and Plan 03 then consume it from Wave 0; Wave 2 parallelism is preserved.

### BLOCKER B-2 — VALIDATION.md missing (nyquist_compliance)

**File:** `.planning/phases/05-issues-views-kanban-dnd-kit-migration/05-VALIDATION.md`
**Issue:** `nyquist_validation: true` in `.planning/config.json` and RESEARCH.md has a `## Validation Architecture` section, but no `05-VALIDATION.md` exists in the phase directory. Per Dimension 8e of the plan-checker contract, this is a blocking failure.
**Impact:** Plan-checker Dimension 8a-8d cannot run; the Nyquist sampling-continuity gate is unverified.

**Fix:** Re-run `/gsd-plan-phase 5 --research` to regenerate VALIDATION.md from RESEARCH.md's Validation Architecture section. Alternatively, manually author it from the per-component test-command table already documented in UI-SPEC §Validation Architecture (lines 567-603) — it lists every test command for every component plus the four E2E specs.

### WARNING W-1 — Plan 03 test selector uses non-existent attribute

**Plan:** 05-03 Task 01
**Issue:** Test queries `container.querySelector('[data-accent-bar-orientation="vertical"]')` as primary selector. The `AccentBar` atom (`packages/ui/components/ui/accent-bar.tsx`) only exposes `data-slot="accent-bar"`, not `data-accent-bar-orientation`. Plan 02 Task 02 already documents the defensive fallback strategy.
**Fix:** Change the primary selector to `[data-slot="accent-bar"]` (or query within the leading-edge container `data-list-row-leading`) and disambiguate orientation by className regex (`absolute inset-y-0 left-0 w-1` for vertical vs `h-1 w-full rounded-none` for horizontal). Or: explicitly add a `data-orientation={orientation}` attribute to the AccentBar atom — but that violates the plan's own constraint ("DO NOT modify accent-bar.tsx — it's a Phase 2 atom, finalised").

### WARNING W-2 — Test seams `data-issue-id` and `data-board-column-root` not added in upstream plans

**Plan:** 05-05 Tasks 03 + 04
**Issue:** E2E specs reference `data-issue-id` on board-card-root (KBN-01 spec) and `data-board-column-root` for the scrollable ancestor (KBN-02 spec), but no upstream plan (01/02) adds them. Plan 05 Task 04 acknowledges and asks executor to add inline.
**Fix (recommended):** Add both attributes in Plan 02:
- Plan 02 Task 02 (board-card.tsx): add `data-issue-id={issue.id}` next to `data-board-card-root`.
- Plan 02 Task 03 (board-column.tsx): add `data-board-column-root` to the column outer wrapper (`<div class="flex w-[280px] shrink-0 flex-col rounded-xl ...">`).

This keeps additive seam changes within the natural touch window of the visual restyle and avoids surprise edits in Wave 4.

### WARNING W-3 — Research Open Question Q3 not addressed (research_resolution)

**File:** RESEARCH.md `## Open Questions` Q3 (touch / pointer activation distance)
**Issue:** Q3 asks whether v0.4 default sensors handle click-vs-drag confusion on cards (which are ALSO `<AppLink>` navigation targets). Plans do not address this.
**Impact:** If the default v0.4 activation distance is too short, every click on a card may accidentally trigger a drag — clicks would not navigate to the issue detail page.
**Fix:** Either (a) Plan 01 Task 02 should add a manual smoke test step "click a card and verify it navigates to issue detail (drag does NOT activate)", with a fallback to configure activation distance via the v0.4 sensor config API; or (b) RESEARCH.md should be updated to mark Q3 as RESOLVED based on a documentation lookup.

### WARNING W-4 — Open Questions section heading missing (RESOLVED) marker (research_resolution)

**File:** RESEARCH.md
**Issue:** `## Open Questions` heading does not have `(RESOLVED)` suffix; individual questions Q1/Q2 are not marked `RESOLVED:` inline.
**Impact:** Per Dimension 11, this is a soft fail. Plan 01 implicitly resolves Q1 (DragOverlay → Feedback plugin or portal fallback) and Q2 (provider position), but the resolution is not documented in RESEARCH.md.
**Fix:** Update RESEARCH.md to:
- Q1 RESOLVED: "Try Feedback plugin first (Path A); fall back to React portal if visuals don't match (Path B). Decision documented in Plan 01 Task 01 Step 4."
- Q2 RESOLVED: "Provider mounted at current `BoardView` depth — Plan 01 verifies via manual smoke; if Feedback portal needs hoisting, document in 05-01-SUMMARY.md."
- Q3 RESOLVED (after addressing W-3): document the chosen activation-distance strategy.
- Change heading to `## Open Questions (RESOLVED)`.

### INFO I-1 — Plan 01 Step 2 import block does not include conditional `Feedback` import

**Plan:** 05-01 Task 01 Step 2
**Issue:** Step 2 lists imports to add but doesn't note that `Feedback` from `@dnd-kit/dom` may need to be added depending on Step 4's path choice.
**Fix:** Append to Step 2: "If Path A is chosen in Step 4 below, also import `Feedback` from `@dnd-kit/dom` and add it to the `plugins` callback."

### INFO I-2 — Plan 04 boundary on scope budget

**Plan:** 05-04
**Issue:** 5 tasks + 9 files modified — at the upper edge of the scope-sanity warning band. The split is logical and the work is cohesive (all interaction wiring), so no revision is required, but the executor should be context-aware.
**Fix:** None required. Noted for awareness.

---

## Recommendation

Address the 2 blockers before execution. The 4 warnings are highly recommended but technically non-blocking (the executor can fix them in flight; however, fixing them now prevents Wave-4 surprise work). The 2 info items are quality-of-life suggestions.

After the fixes:
- Plan 03 frontmatter: `depends_on: ["05-01", "05-02"]`, `wave: 3` (and re-number Plans 04/05 accordingly).
- Generate `05-VALIDATION.md` from RESEARCH.md's Validation Architecture table.
- Plan 02 Tasks 02 + 03: add `data-issue-id` and `data-board-column-root` test seams.
- Plan 03 Task 01: rewrite test selector to use `[data-slot="accent-bar"]` + className regex.
- RESEARCH.md: resolve Q3 (touch/pointer activation) and mark Open Questions section RESOLVED.

Re-run `/gsd-plan-phase 5` (or directly invoke `gsd-plan-checker`) after revisions to confirm all blockers cleared.

