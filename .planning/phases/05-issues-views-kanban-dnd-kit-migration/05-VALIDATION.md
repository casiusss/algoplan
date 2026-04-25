---
phase: 5
slug: issues-views-kanban-dnd-kit-migration
status: planned
nyquist_compliant: true
wave_0_complete: false
created: 2026-04-25
updated: 2026-04-25
---

# Phase 5 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.
> Source of truth: `05-RESEARCH.md` §Validation Architecture + `05-UI-SPEC.md` §Validation Architecture.
> Created in response to plan-checker B-2 blocker (05-PLAN-CHECK.md): VALIDATION.md was missing for this phase.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.1.x (jsdom for views/components, node for utils); Playwright (E2E for KBN-01..04) |
| **Config files** | `packages/views/vitest.config.ts`, `packages/core/vitest.config.ts`, `playwright.config.ts` |
| **Quick run command** | `pnpm --filter @multica/views exec vitest run issues/` (~5-8s) |
| **Targeted file run** | `pnpm --filter @multica/views exec vitest run issues/components/<file>.test.tsx` (~2-3s) |
| **Full suite command** | `pnpm test` (Turborepo) + `pnpm exec playwright test` (E2E) |
| **Make-check command** | `make check` (typecheck + all vitest + Go tests + E2E) |
| **Estimated runtime** | quick ~8s, full ~6-9min, make check ~10-12min |

---

## Sampling Rate

- **After every task commit:** `pnpm --filter @multica/views exec vitest run issues/<targeted-file>` (~3s) — Nyquist sampling at the task granularity.
- **After every plan wave:** `pnpm typecheck && pnpm --filter @multica/views exec vitest run issues/` (~30s).
- **Before `/gsd-verify-work`:** `make check` must be green (full suite + Go + E2E).
- **Max feedback latency:** ~5s per task commit.

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 5-00-01 | 00 | 0 | KBN-05 (catalog) | — | dnd-kit v0.4 catalog entries pinned + lockfile reproducible | infra | `pnpm install --frozen-lockfile && pnpm --filter @multica/desktop typecheck && grep -q "@dnd-kit/react" pnpm-workspace.yaml` | ❌ W0 | ⬜ pending |
| 5-00-02 | 00 | 0 | KBN-07 (helper) | — | priorityToAccentColor pure switch — 5 GREEN cases (urgent/high/medium/low/none) | unit | `pnpm --filter @multica/views exec vitest run issues/utils/priority-color.test.ts` | ❌ W0 | ⬜ pending |
| 5-00-03 | 00 | 0 | infra (scaffolds) | — | 7 component test scaffolds discovered as describe.skip | infra | `pnpm --filter @multica/views exec vitest run issues/ --reporter=verbose 2>&1 \| grep -E "(board-view\|board-column\|board-card\|list-view\|list-row\|inline-task-add\|view-toggle)\.test"` | ❌ W0 | ⬜ pending |
| 5-00-04 | 00 | 0 | infra (gate) | — | full make check baseline green | infra | `make check` | — | ⬜ pending |
| 5-01-01 | 01 | 1 | KBN-05, KBN-06 | T-05-01-01 (drag race) | board-view.tsx migrated to v0.4; 6 existing issues-page.test.tsx tests still green; onMoveIssue signature byte-identical | unit | `pnpm --filter @multica/views exec vitest run issues/components/issues-page.test.tsx && ! grep -E "@dnd-kit/(core\|sortable\|utilities)" packages/views/issues/components/board-view.tsx` | ❌ W0 | ⬜ pending |
| 5-01-02 | 01 | 1 | KBN-05 (column+card), W-4/Q3 (activation distance) | — | board-column + board-card v0.4; cardIndex threaded; no v6 idioms; manual smoke A/B/C confirms drag works AND click-to-navigate works (W-4 fix) | unit + manual | `pnpm --filter @multica/views exec vitest run issues/ && pnpm --filter @multica/views typecheck && ! grep -E "(attributes\|listeners\|CSS\.Transform\|defaultAnimateLayoutChanges)" packages/views/issues/components/board-card.tsx` | ❌ W0 | ⬜ pending |
| 5-01-03 | 01 | 1 | KBN-01, KBN-02, KBN-06 | T-05-01-01 | board-view.test.tsx GREEN — 2 behavioural + 4 source-level invariants (recentlyMovedRef freeze, AutoScroller config, isDraggingRef gate, no legacy imports) | unit | `pnpm --filter @multica/views exec vitest run issues/components/board-view.test.tsx` | ❌ W0 | ⬜ pending |
| 5-01-04 | 01 | 1 | KBN-05 (gate) | — | Wave 1 gate: full make check + KBN-05 grep clean for issues/ subtree | gate | `make check && ! grep -rn "@dnd-kit/core\|@dnd-kit/sortable\|@dnd-kit/utilities" packages/views/issues/` | — | ⬜ pending |
| 5-02-01 | 02 | 2 | KBN-07 (board card) | — | AccentBar prepended; overflow-hidden; pt-3 identifier; data-issue-id seam (W-2); class-regex AccentBar selector strategy | unit | `pnpm --filter @multica/views exec vitest run issues/components/board-card.test.tsx && grep -q "data-issue-id" packages/views/issues/components/board-card.tsx` | ❌ W0 | ⬜ pending |
| 5-02-02 | 02 | 2 | KBN-07 (board column) | — | data-board-column-root seam (W-3); italic label; tabular-nums; ring-brand drop; "Issue hinzufügen", "Spalte ausblenden", "Keine Issues", "Hier ablegen" | unit | `pnpm --filter @multica/views exec vitest run issues/components/board-column.test.tsx && grep -q "data-board-column-root" packages/views/issues/components/board-column.tsx` | ❌ W0 | ⬜ pending |
| 5-02-03 | 02 | 2 | KBN-07 (gate A) | — | Plan 02 vitest GREEN; zero hex/RGB/dark: in board-card + board-column | gate | `pnpm --filter @multica/views exec vitest run issues/` | — | ⬜ pending |
| 5-03-01 | 03 | 2 | KBN-07 (list row) | — | leading vertical AccentBar (suppressed when selected); font-medium title; relative outer; W-1 selector strategy ([data-slot="accent-bar"] + className regex) | unit | `pnpm --filter @multica/views exec vitest run issues/components/list-row.test.tsx && ! grep -E "(#[0-9a-fA-F]{3,8}\|rgb\(\|rgba\(\|dark:)" packages/views/issues/components/list-row.tsx` | ❌ W0 | ⬜ pending |
| 5-03-02 | 03 | 2 | KBN-07 (list view) | — | sticky h-12 italic header; tabular-nums; "Issue hinzufügen" tooltip; "Keine Issues" empty | unit | `pnpm --filter @multica/views exec vitest run issues/components/list-view.test.tsx && ! grep -E "(#[0-9a-fA-F]{3,8}\|rgb\(\|rgba\(\|dark:)" packages/views/issues/components/list-view.tsx` | ❌ W0 | ⬜ pending |
| 5-03-03 | 03 | 2 | KBN-07 (gate B) | — | Plan 03 vitest GREEN | gate | `pnpm --filter @multica/views exec vitest run issues/components/list-view.test.tsx issues/components/list-row.test.tsx` | — | ⬜ pending |
| 5-04-01 | 04 | 3 | KBN-04 (toggle) | — | ViewToggle SegmentedControl with Board/Liste; useCallback wrap (Pitfall 10); aria-label "Ansicht wechseln" | unit | `pnpm --filter @multica/views exec vitest run issues/components/view-toggle.test.tsx` | ❌ W0 | ⬜ pending |
| 5-04-02 | 04 | 3 | KBN-03 (inline add) | — | InlineTaskAdd input + 2 buttons; Enter submits; Esc always cancels (Hard Constraint 17); useCreateIssue with status pre-filled; loading spinner; failure preserves input + toast | unit | `pnpm --filter @multica/views exec vitest run issues/components/inline-task-add.test.tsx` | ❌ W0 | ⬜ pending |
| 5-04-03 | 04 | 3 | KBN-04, KBN-06 | — | issues-header dropdown deleted; ViewToggle slotted; issues-page German strings ("Noch keine Issues", "Issue konnte nicht verschoben werden"); handleMoveIssue signature byte-identical | unit | `pnpm --filter @multica/views exec vitest run issues/ && grep -q "ViewToggle" packages/views/issues/components/issues-header.tsx && grep -q "Noch keine Issues" packages/views/issues/components/issues-page.tsx` | ❌ W0 | ⬜ pending |
| 5-04-04 | 04 | 3 | KBN-03 (wiring) | — | board-column + list-view: + button → InlineTaskAdd mount; Esc closes; second touch this phase | unit | `pnpm --filter @multica/views exec vitest run issues/ && grep -q "InlineTaskAdd" packages/views/issues/components/board-column.tsx && grep -q "InlineTaskAdd" packages/views/issues/components/list-view.tsx` | ❌ W0 | ⬜ pending |
| 5-04-05 | 04 | 3 | KBN-03..06 (gate) | — | Wave 3 gate: make check + KBN-05 grep + Hard Constraint B5/B6/B7 git diff invariants | gate | `make check` | — | ⬜ pending |
| 5-05-01 | 05 | 4 | KBN-03 (E2E) | — | inline + button opens input; Enter creates issue with status pre-filled; Esc cancels without create | E2E | `pnpm exec playwright test e2e/board-inline-add.spec.ts` | ❌ W0 | ⬜ pending |
| 5-05-02 | 05 | 4 | KBN-04 (E2E) | — | view toggle persists across page reload (Board↔Liste both directions) | E2E | `pnpm exec playwright test e2e/issues-view-toggle.spec.ts` | ❌ W0 | ⬜ pending |
| 5-05-03 | 05 | 4 | KBN-02 (E2E) | — | drop in scrolled column lands adjacent to visually targeted card (NOT scroll drift) — uses data-board-column-root anchor (W-3) | E2E | `pnpm exec playwright test e2e/board-scroll-collision.spec.ts` | ❌ W0 | ⬜ pending |
| 5-05-04 | 05 | 4 | KBN-01 (E2E) | T-05-01-01 | two-context drag survives mid-drag remote update; uses data-issue-id (W-2) to look up card without API list | E2E | `pnpm exec playwright test e2e/board-drag-ws-race.spec.ts` | ❌ W0 | ⬜ pending |
| 5-05-05 | 05 | 4 | KBN-04 (existing) | — | e2e/issues.spec.ts updated for SegmentedControl "Liste" label (was text=List) | E2E | `pnpm exec playwright test e2e/issues.spec.ts` | — | ⬜ pending |
| 5-05-06 | 05 | 4 | ALL (phase exit) | — | Phase exit gate: make check + KBN-05 grep clean + ROADMAP SC#1..5 mapping documented | gate | `make check && ! grep -rn "@dnd-kit/core\|@dnd-kit/sortable\|@dnd-kit/utilities" packages/views/issues/` | — | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky · 🚫 dropped*

---

## Wave 0 Requirements

Files / artifacts that MUST exist before Wave 1 can begin (per Plan 00):

- [ ] `pnpm-workspace.yaml` lists `@dnd-kit/{abstract,dom,helpers,react}: "0.4.0"` in catalog (NEW)
- [ ] `packages/views/package.json` has both legacy + new dnd-kit catalog refs (UPDATE)
- [ ] `apps/web/package.json` no longer declares legacy dnd-kit (UPDATE)
- [ ] `apps/desktop/package.json` matches hoist-verification outcome (UPDATE — conditional)
- [ ] `packages/views/issues/utils/priority-color.ts` (NEW — moved here from Plan 02 per B-1 fix; GREEN with 5-case test)
- [ ] `packages/views/issues/utils/priority-color.test.ts` (NEW — GREEN, 5 per-priority assertions)
- [ ] `packages/views/issues/components/board-view.test.tsx` (NEW — RED scaffold for Plan 01)
- [ ] `packages/views/issues/components/board-column.test.tsx` (NEW — RED scaffold for Plans 01/02/04)
- [ ] `packages/views/issues/components/board-card.test.tsx` (NEW — RED scaffold for Plans 01/02)
- [ ] `packages/views/issues/components/list-view.test.tsx` (NEW — RED scaffold for Plans 03/04)
- [ ] `packages/views/issues/components/list-row.test.tsx` (NEW — RED scaffold for Plan 03)
- [ ] `packages/views/issues/components/inline-task-add.test.tsx` (NEW — RED scaffold for Plan 04)
- [ ] `packages/views/issues/components/view-toggle.test.tsx` (NEW — RED scaffold for Plan 04)

Note: `priority-color.{ts,test.ts}` was lifted from Plan 02 → Plan 00 per plan-checker B-1 fix so that Plans 02 (board-card AccentBar) and 03 (list-row AccentBar) can both consume it in parallel Wave 2 without a same-wave file collision.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Drag activation works (matrix A) | KBN-05/06 + W-4/Q3 | Native pointer event chain not feasible in jsdom | Open `/[workspace]/issues`, click+drag a card; it lifts; dropping in another column triggers move. |
| Click-to-navigate works (matrix B — W-4 / RESEARCH Q3) | KBN-06 (no regression) + RESEARCH Q3 | jsdom can't reproduce pointer activation distance behavior | Click a card with <2px pointer movement; the card MUST navigate to issue detail (cards are `<AppLink>`). MUST NOT trigger drag. If fails: add `PointerSensor.configure({ activationConstraint: { distance: 5 } })` to board-view's plugins callback per Plan 01 Task 5-01-02 Step 11. |
| Hover state works (matrix C) | KBN-07 | Visual perception | Hover a card; hover styles apply; no drag activates. |
| AccentBar visible at top of every card with priority color | KBN-07 | Visual perception | Open board view; verify each card has a 4px AccentBar at top in its priority color (urgent=p0, high=p1, medium=p2, low=p3, none=muted). |
| Italic column headers (board) | KBN-07 / Hard Constraint 15 | Type rendering perception | Verify column header status labels render in italic Inter; StatusIcon stays upright. |
| Brand-green ring on drop target during drag | KBN-07 | Animation perception | Drag a card over an empty column; verify ring-2 ring-brand surrounds the column body, "Hier ablegen" text appears. |
| List view sticky h-12 italic headers | KBN-07 | Visual + scroll perception | Toggle to List; scroll the page; verify accordion headers stick to the top with bg-card and italic labels. |
| Vertical AccentBar leading edges on list rows | KBN-07 | Visual perception | List view: each row has a 4px-wide vertical bar on the left; bar disappears when row selected. |
| Inline-add appears INSIDE column on `+` click (not modal) | KBN-03 | UX flow | Click `+` on board column header → inline input mounts at column body bottom. Type "Test", Enter → card appears with status pre-filled. Esc closes input without creating. |
| View toggle persists across reload | KBN-04 | Persistence behavior | Toggle Board → Liste; reload page; Liste is still active. Toggle back to Board; reload; Board still active. |
| WS race immunity (light manual) | KBN-01 | Real WS event timing | Open issues page in two tabs; drag a card on tab 1 to a new column; tab 2 should reflect the move within ~200ms. (E2E covers the harder mid-drag race in Plan 05 Task 5-05-04.) |
| Light + dark mode tokens | KBN-07 + Phase 4 dark-mode | Visual + theme perception | Toggle dark mode (Phase 4 toggle in topbar); verify AccentBars darken; ring-brand stays bright; no hard-coded hex bleeds through. |

---

## Validation Sign-Off

- [x] All tasks have automated verify or Wave 0 dependencies listed
- [x] Sampling continuity: vitest per commit, pnpm test per wave, make check before verify-work
- [x] Wave 0 covers all MISSING references (priority-color helper + 7 component scaffolds)
- [x] No watch-mode flags
- [x] Feedback latency < 30s per task
- [x] `nyquist_compliant: true` set in frontmatter
- [x] B-1 fix reflected (priority-color in Plan 00 — both Plan 02 and Plan 03 consume in parallel Wave 2)
- [x] B-2 fix: this VALIDATION.md exists
- [x] W-1 fix reflected (Plan 03 selectors use `[data-slot="accent-bar"]` + className regex, not `data-accent-bar-orientation`)
- [x] W-2 fix reflected (Plan 02 board-card.tsx adds `data-issue-id`)
- [x] W-3 fix reflected (Plan 02 board-column.tsx adds `data-board-column-root`)
- [x] W-4 fix reflected (Plan 01 Task 5-01-02 Step 11 manual smoke matrix B verifies click-to-navigate)

**Approval:** APPROVED 2026-04-25 by gsd-planner orchestrator (revision in response to 05-PLAN-CHECK.md B-1, B-2, W-1, W-2, W-3, W-4).
</content>
</invoke>
