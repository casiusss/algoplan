---
phase: 05-issues-views-kanban-dnd-kit-migration
status: passed
verdict: PASSED
created: 2026-04-25
revision: 2
plans_checked: 6
blockers_resolved: 2
warnings_resolved: 4
new_blockers: 0
---

# Phase 5 — Plan Verification Report (Revision V2)

**Verdict: PASSED — all 2 prior blockers cleared, all 4 prior warnings addressed, no new blockers introduced. Plans are ready for execution.**

This V2 report supplements `05-PLAN-CHECK.md` (V1) and confirms the planner's revisions in response to its findings.

---

## Per-Fix Confirmation

### B-1 RESOLVED — Plan 03 dependency drift on `priority-color.ts`

**Original finding:** Plan 03 declared `depends_on: ["05-01"]` but imported `priorityToAccentColor` from `priority-color.ts`, which Plan 02 created. Wave-2 parallelism would have failed at the import resolution step.

**Verification of fix (Option 2 — Wave-0 lift):**
- `05-00-PLAN.md` Task 5-00-02 now creates `packages/views/issues/utils/priority-color.ts` + `priority-color.test.ts` (5 GREEN per-priority assertions, RED→GREEN cycle within Plan 00). `files_modified` lists both files. `must_haves.artifacts` declares the helper with `min_lines: 14` + `contains: "priorityToAccentColor"`. Wave 0 commit message: "feat(05): add priorityToAccentColor helper + per-case tests (Wave 0 — shared by Plans 02+03)".
- `05-02-PLAN.md` no longer creates the helper. `must_haves.truths` line 17 explicitly states "imports priorityToAccentColor from ../utils/priority-color (helper landed in Plan 00 per B-1 fix)". Pitfalls line 528: "DO NOT re-create `priority-color.ts` — Plan 00 already shipped it. Re-creation will collide with Plan 00's commit."
- `05-03-PLAN.md` similarly references Plan 00 as the source. Pitfalls line 455: "B-1 RESOLVED: Plan 03 no longer needs to wait for Plan 02. The `priorityToAccentColor` helper is in Plan 00 (Wave 0) and is already merged before Wave 2 starts. Plan 02 + Plan 03 run truly parallel in Wave 2 (zero file overlap, both consume Wave-0 helper)."
- Wave structure preserved: Plan 02 (`depends_on: ["05-01"]`, wave 2) + Plan 03 (`depends_on: ["05-01"]`, wave 2) → both depend transitively on Plan 00 via Plan 01 (which `depends_on: ["05-00"]`). The Wave-2 parallel pair is now sound.
- File-disjoint check: Plan 02 touches `board-card.{tsx,test.tsx}` + `board-column.{tsx,test.tsx}`; Plan 03 touches `list-view.{tsx,test.tsx}` + `list-row.{tsx,test.tsx}`. **Zero file overlap.** Wave 2 is fully parallel-safe.

**Status: B-1 fully resolved.**

### B-2 RESOLVED — Missing `05-VALIDATION.md`

**Original finding:** `nyquist_validation: true` and RESEARCH.md has a `## Validation Architecture` section, but no `05-VALIDATION.md` existed. Dimension 8e was a blocking fail.

**Verification of fix:**
- `05-VALIDATION.md` exists (15 KB).
- Frontmatter: `phase: 5`, `slug: issues-views-kanban-dnd-kit-migration`, `status: planned`, `nyquist_compliant: true`, `wave_0_complete: false`. All required fields present.
- `## Per-Task Verification Map` table contains 24 tasks across 6 plans (5-00-01..04, 5-01-01..04, 5-02-01..03, 5-03-01..03, 5-04-01..05, 5-05-01..06). Each row has Task ID, Plan, Wave, Requirement, Threat Ref (for KBN-01 race spec → T-05-01-01), Secure Behavior, Test Type, Automated Command, File Exists, Status. Cross-checked: every `<verify><automated>` command in the plans appears verbatim in the table.
- `## Wave 0 Requirements` lists 13 file artifacts (catalog edit, helper + test, 7 component scaffolds) with explicit note: "`priority-color.{ts,test.ts}` was lifted from Plan 02 → Plan 00 per plan-checker B-1 fix" — confirms B-1 fix is reflected here too.
- `## Manual-Only Verifications` table lists 12 visual/perception/timing checks including the W-4 Q3 click-to-navigate matrix B with explicit fallback instructions (`PointerSensor.configure({ activationConstraint: { distance: 5 } })`).
- `## Validation Sign-Off` checklist marks all 12 items checked, including: `[x] B-1 fix reflected`, `[x] B-2 fix: this VALIDATION.md exists`, `[x] W-1 fix reflected`, `[x] W-2 fix reflected`, `[x] W-3 fix reflected`, `[x] W-4 fix reflected`. Approval signed 2026-04-25.

**Dimension 8 re-evaluation (8a-8d):**
- 8a (Automated Verify Presence): All 24 tasks have `<automated>` commands or Wave 0 dependency references. Every Plan 00 scaffold reference resolves to a Wave 0 task.
- 8b (Feedback Latency): All commands target `pnpm --filter @multica/views exec vitest run issues/...` (~3-30s). E2E commands are scoped (single `.spec.ts`). No watch-mode flags. No delays > 30s.
- 8c (Sampling Continuity): Per wave, ratio of tasks with `<automated>` verify is ≥2/3: Wave 0 = 4/4, Wave 1 = 4/4, Wave 2 = 6/6, Wave 3 = 5/5, Wave 4 = 6/6. PASS.
- 8d (Wave 0 Completeness): All 7 component scaffolds + priority-color helper referenced downstream are created in Plan 00 Tasks 5-00-02 + 5-00-03. PASS.

**Status: B-2 fully resolved. Dimension 8 now PASSES.**

### W-1 RESOLVED — Plan 03 used non-existent `data-accent-bar-orientation` selector

**Original finding:** `list-row.test.tsx` queried `[data-accent-bar-orientation="vertical"]` as primary selector. The AccentBar atom only exposes `data-slot="accent-bar"`. Test would fail on first query.

**Verification of fix:**
- `05-03-PLAN.md` Task 5-03-01 test cases (lines 147-194) now use `[data-slot="accent-bar"]` scoped to `[data-list-row-leading]` — the new wrapper element added in this task. Disambiguation by className regex: `/absolute/`, `/inset-y-0/`, `/left-0/`, `/w-1/` for vertical orientation; `(bg|to|from)-${expectedColor}` for color.
- New test seam `<span data-list-row-leading>` wraps the AccentBar (line 218-225 of plan). Provides deterministic anchor for `querySelector`. Acknowledged in must_haves.truths line 27: "GREEN tests for sticky header, italic label, German strings, AccentBar presence/suppression — using [data-slot='accent-bar'] + className regex (W-1 fix; AccentBar atom is FROZEN with no data-accent-bar-* attrs)".
- Pitfalls explicitly forbid the original anti-pattern (line 446): "DO NOT add `data-accent-bar-orientation` or `data-accent-bar-color` attributes."
- W-1 fix is also reflected in Plan 02 Task 5-02-01 (line 216: same defensive pattern using class-regex on `(bg|to|from)-{color}`) — consistency across both Wave-2 plans.

**Status: W-1 fully resolved.**

### W-2 RESOLVED — `data-issue-id` test seam not added in upstream plans

**Original finding:** Plan 05 KBN-01 race spec referenced `data-issue-id` on board-card-root, but no upstream plan added it. Required surprise edit in Wave 4.

**Verification of fix:**
- `05-02-PLAN.md` Task 5-02-01 outer card div (line 230-234) now declares `data-issue-id={issue.id}` alongside the existing `data-board-card-root`. must_haves.truths line 20 asserts: "board-card.tsx outer card div has data-board-card-root AND data-issue-id={issue.id} (W-2 fix — Plan 05 KBN-01 race spec consumer)".
- Test case (line 201-206) verifies the attribute: `expect(outer?.getAttribute("data-issue-id")).toBe("issue-test-123")`.
- key_links explicitly declares the cross-file consumption (lines 54-57): `from: board-card.tsx → to: e2e/board-drag-ws-race.spec.ts via: data-issue-id test seam consumed by Plan 05 KBN-01 race spec`. Pattern grep: `data-issue-id`.
- Verify command (line 279): `grep -q "data-issue-id" packages/views/issues/components/board-card.tsx` — automated invariant check.

**Status: W-2 fully resolved within Plan 02's natural touch window.**

### W-3 RESOLVED — `data-board-column-root` test seam not added in upstream plans

**Original finding:** Plan 05 KBN-02 scroll-collision spec used `el.closest('[data-board-column-root]')`, but no upstream plan added the attribute.

**Verification of fix:**
- `05-02-PLAN.md` Task 5-02-02 outer column wrapper (line 372-377) now declares `data-board-column-root` on the top-level wrapper. must_haves.truths line 22: "board-column.tsx outer column wrapper has data-board-column-root (W-3 fix — Plan 05 KBN-02 scroll-collision spec consumer)".
- Test case (line 308-315) verifies: `expect(container.querySelector('[data-board-column-root]')).toBeTruthy()` AND that `[data-board-column-body]` lives INSIDE it (the spec walks up via `.closest()`).
- key_links declares cross-file consumption (lines 58-61): `from: board-column.tsx → to: e2e/board-scroll-collision.spec.ts via: data-board-column-root test seam consumed by Plan 05 KBN-02 scroll-collision spec`.
- Verify command (line 478): `grep -q "data-board-column-root" packages/views/issues/components/board-column.tsx` — automated invariant check.

**Status: W-3 fully resolved within Plan 02's natural touch window.**

### W-4 RESOLVED — RESEARCH Q3 (touch/pointer activation distance) unaddressed

**Original finding:** RESEARCH Q3 asked whether v0.4 default sensors handle click-vs-drag confusion on cards-as-AppLinks. No plan addressed it. Risk: clicks would never navigate.

**Verification of fix:**
- `05-01-PLAN.md` must_haves.truths line 30: "Pointer activation distance for cards is documented + verified manually so click-to-navigate (cards are <AppLink>) does NOT accidentally trigger drag (W-4 fix — RESEARCH Open Question Q3)".
- Task 5-01-02 Step 11 (line 449-473) defines explicit smoke matrix:
  - **Matrix A**: Drag activation works.
  - **Matrix B**: Click-to-navigate works (<2px pointer movement → MUST navigate, MUST NOT trigger drag).
  - **Matrix C**: Hover state works.
  - If A/B/C pass → document "Q3 RESOLVED: v0.4 default activation distance (≈5px) is sufficient" in 05-01-SUMMARY.md.
  - If B fails → add explicit `PointerSensor.configure({ activationConstraint: { distance: 5 } })` to DragDropProvider plugins; re-run smoke; document "Q3 RESOLVED: explicit PointerSensor with distance=5 added".
- Inline code comment in plan (lines 150-154) documents the strategy in board-view.tsx itself.
- Pitfalls line 640: "DO NOT skip the W-4 / Q3 manual smoke matrix in Task 5-01-02 Step 11 — it is the only gate that catches click-vs-drag confusion before users hit it."
- VALIDATION.md `## Manual-Only Verifications` row 2 documents the matrix B verification with explicit fallback instructions.
- Plan 01 success_criteria line 626: "W-4 / RESEARCH Q3 resolved: cards-as-AppLinks navigate on click; drag activates only at ≥5px pointer movement."

**Status: W-4 fully resolved with concrete manual verification gate + automatic fallback configuration.**

---

## No-New-Blockers Audit

Re-ran all 12 dimensions against the revised plans:

| Dim | Name | V1 Verdict | V2 Verdict | Notes |
|-----|------|------------|------------|-------|
| 1 | Requirement Coverage | PASS | PASS | KBN-01..07 still all covered |
| 2 | Task Completeness | PASS | PASS | All `<task>` blocks have files/action/verify/done; Plan 00 +1 task (priority-color) cleanly declared |
| 3 | Dependency Correctness | FAIL | **PASS** | B-1 fix moved priority-color to Plan 00 (Wave 0); both Plan 02 + Plan 03 consume from Wave 0; wave structure now valid |
| 4 | Key Links Planned | PASS | PASS | New key_links added for the test seams (data-issue-id, data-board-column-root) — both have implementing tasks AND downstream consumers |
| 5 | Scope Sanity | WARN | WARN | Plan 04 still 5 tasks/9 files (acknowledged as upper-edge but cohesive); unchanged from V1; non-blocking |
| 6 | must_haves Derivation | PASS | PASS | All truths user-observable or load-bearing source-level invariants; new ones (W-2/W-3 seams) included |
| 7 | Context Compliance | PASS | PASS | CONTEXT.md auto-generated; revisions stayed within original scope |
| 7c | Architectural Tier Compliance | PASS | PASS | All work stays in browser/client tier; mutations.ts + view-store.ts byte-untouched |
| 8 | Nyquist Compliance | FAIL | **PASS** | B-2 fix: VALIDATION.md exists with all required sections (8a-8e all PASS) |
| 9 | Cross-Plan Data Contracts | PASS | PASS | priority-color now lives in Wave 0 — both consumers (Plan 02, Plan 03) get the same source; no transformation conflicts |
| 10 | CLAUDE.md Compliance | PASS | PASS | catalog: discipline preserved; package boundaries respected; useCallback wrap on SegmentedControl onValueChange explicit |
| 11 | Research Resolution | WARN | **PASS (provisional)** | W-4 fix addresses Q3 inside Plan 01; Q1/Q2 still need an inline RESOLVED marker in RESEARCH.md but planner's W-4 fix path explicitly documents Q3 resolution flows into 05-01-SUMMARY.md. NOT a blocker. |
| 12 | Pattern Compliance | PASS | PASS | All file analogs still referenced |

**No new blockers introduced.** The two prior blockers (B-1, B-2) are resolved. All four prior warnings (W-1, W-2, W-3, W-4) are addressed. Scope-sanity warning on Plan 04 is unchanged (acknowledged as upper-edge, non-blocking).

---

## Wave Structure (Post-Revision)

```
Wave 0 — Plan 00 (no deps)
  files: pnpm-workspace.yaml + 3 package.json + priority-color.{ts,test.ts} + 7 RED scaffolds
  outputs: dnd-kit catalog + GREEN priority-color helper + RED test scaffolds for Plans 01-04

Wave 1 — Plan 01 (depends_on: ["05-00"])
  files: board-view.tsx + board-column.tsx + board-card.tsx + issues-page.test.tsx + board-view.test.tsx + DragOverlay.tsx
  outputs: dnd-kit v0.4 API rewrite; W-4 / Q3 resolved with smoke matrix A/B/C

Wave 2 — Plan 02 (depends_on: ["05-01"]) || Plan 03 (depends_on: ["05-01"])  [PARALLEL — zero file overlap]
  Plan 02 files: board-card.{tsx,test.tsx} + board-column.{tsx,test.tsx}  (W-2/W-3 seams added here)
  Plan 03 files: list-view.{tsx,test.tsx} + list-row.{tsx,test.tsx}        (W-1 fix applied here)
  Both consume priorityToAccentColor from Plan 00 (Wave 0, already merged)

Wave 3 — Plan 04 (depends_on: ["05-02", "05-03"])
  files: view-toggle.{tsx,test.tsx} + inline-task-add.{tsx,test.tsx} + issues-header.tsx + issues-page.{tsx,test.tsx} + board-column.tsx + list-view.tsx
  outputs: ViewToggle SegmentedControl + InlineTaskAdd + wiring

Wave 4 — Plan 05 (depends_on: ["05-04"])
  files: 4 new e2e specs + 1 updated e2e spec
  outputs: KBN-01..04 E2E coverage; consumes data-issue-id (W-2) + data-board-column-root (W-3)
```

Wave structure is sound. No same-wave file collisions. No circular dependencies. No forward references.

---

## Recommendation

**APPROVED for execution.** Run `/gsd-execute-phase 5` to proceed.

Optional follow-ups (non-blocking):
- RESEARCH.md `## Open Questions` heading could be marked `(RESOLVED)` with inline `RESOLVED:` markers on Q1/Q2/Q3 once Plan 01 SUMMARY documents the chosen activation-distance path. The W-4 fix in Plan 01 covers Q3 operationally; the heading marker is bookkeeping only.
- Plan 05 Task 04 still contains residual conditional language ("if data-issue-id absent, look up via API") — now technically dead because Plan 02 guarantees the attribute. Cosmetic cleanup for the executor; non-blocking.

