---
phase: 06-issue-detail-remaining-views
plan: 01
subsystem: ui
tags: [react, vitest, segmented-control, oklch, alert-dialog, modal-footer, german-i18n, issue-detail]

# Dependency graph
requires:
  - phase: 02-atoms-primitives
    provides: SegmentedControl atom (extended here with `colorByValue`)
  - phase: 06-issue-detail-remaining-views
    plan: 00
    provides: Wave-0 atoms (no direct atom consumed in 06-01, but the
      automated dragstrip-coverage gate is honored — left untouched)
provides:
  - SegmentedControl `colorByValue?: Record<string, string>` extension
    (active item carries per-value text class via React Context +
    `data-[pressed]:` Tailwind variant)
  - IssuePrioritySegmentedControl wrapper (P0..P3 with `none` excluded
    + separate "Priorität entfernen" affordance)
  - IssueDetailFooter atom (48px sticky band — Löschen + Esc + Fertig)
  - IssueDetail.tsx wired to the new components + full German DTL
    Copywriting Contract translation
  - IssueDetail gains `onClose?: () => void` prop (modal-mode signal —
    caller defines it to render Fertig)
affects:
  - 06-04, 06-05, 06-06 plans may reuse SegmentedControl `colorByValue`
    for their own per-value color rules without further atom extension
  - Phase 7 (RBR) — the German DTL strings landed here are stable;
    rebrand pass will not need to retranslate

# Tech tracking
tech-stack:
  added:
    - "(none — no new dependencies)"
  patterns:
    - "Atom extension via module-private React Context + data-[pressed]:
       Tailwind variant — colorByValue map injected into provider, items
       read their own class through the context. Strict additive change
       to the Phase 2 SegmentedControl signature (`colorByValue?:` is
       optional)."
    - "Mapping-table wrapper component — IssuePrioritySegmentedControl
       holds two const tables (ENUM_TO_LABEL, LABEL_TO_ENUM). The atom
       sees only opaque P0..P3 values; the wrapper translates to/from
       the IssuePriority enum at the boundary. Keeps the atom domain-
       free and the enum mapping in a single co-located place."
    - "Modal-mode signal via optional `onClose?: () => void` prop on
       IssueDetail — Fertig button renders only when caller defines
       the handler. No new context, no new store."

key-files:
  created:
    - packages/views/issues/components/issue-priority-segmented-control.tsx
    - packages/views/issues/components/issue-priority-segmented-control.test.tsx
    - packages/views/issues/components/issue-detail-footer.tsx
    - packages/views/issues/components/issue-detail-footer.test.tsx
  modified:
    - packages/ui/components/ui/segmented-control.tsx (colorByValue prop +
      ColorByValueContext)
    - packages/ui/components/ui/segmented-control.test.tsx (3 new
      colorByValue tests; 12 existing tests preserved GREEN)
    - packages/views/issues/components/issue-detail.tsx
      (onClose prop, German DTL strings, SegmentedControl swap,
      modal-footer mount, German AlertDialog/toasts, mobile-only Delete
      in More-actions)
    - packages/views/issues/components/issue-detail.test.tsx
      (8 new assertions + 3 updated to German labels)
    - packages/views/issues/components/index.ts
      (export IssuePrioritySegmentedControl + IssueDetailFooter)

key-decisions:
  - "Atom extension over wrapper-class hack — added `colorByValue?:
     Record<string, string>` to SegmentedControlProps, plumbed via a
     module-private React Context. The alternative (item-level
     className override repeating the priority→class mapping in every
     call site) was rejected because it duplicates the mapping and
     loses the data-[pressed]: variant scoping (the color must apply
     ONLY when the item is active)."
  - "Mobile fallback — IssueDetailFooter is HIDDEN on mobile (no room
     in 320px-wide viewports) and the More-actions dropdown KEEPS its
     Delete entry there. Desktop sees Löschen exclusively in the
     modal-footer band; mobile sees Löschen exclusively in More-actions.
     This gives every viewport a single canonical destructive entry-
     point, matching UI-SPEC §Sub-Phase DTL §Mobile fallback."
  - "Modal-mode signal — added `onClose?: () => void` prop to
     IssueDetailProps instead of a context-based isModal flag.
     Reasoning: every existing call site (inbox-page split-pane,
     web /[workspaceSlug]/(dashboard)/issues/[id]/page.tsx, desktop
     issue-detail-page.tsx) is a routed-page mount that does NOT need
     the Fertig button. None of them need to change. A future popover
     mount adds `onClose` and gets Fertig automatically."
  - "PriorityPicker call-site removed from IssueDetail right pane but
     the component itself stays exported from
     packages/views/issues/components/index.ts — UI-SPEC §Sub-Phase DTL
     §Priority SegmentedControl explicitly mandates: 'The dropdown
     component remains in the codebase for use in More-actions menu
     and inline pickers — NOT deleted.'"
  - "PropRow column width preserved at w-16 (64px) — the SegmentedControl
     P0..P3 pills are tight enough to fit alongside this label width
     in the 280..420px right-pane without truncation. No PropRow
     restructure was needed."

patterns-established:
  - "SegmentedControl `colorByValue` is now a reusable atom contract.
     Future per-value color rules (status colors, agent-runtime colors,
     etc.) should add a colorByValue map at the call site rather than
     forking the atom or adding bespoke className props on items."
  - "Mapping-table wrapper for SegmentedControl when the underlying
     domain enum has more values than the visible tab set — wrapper
     handles the translate-to/translate-from + provides a separate
     'clear' affordance when the unmapped value is set."
  - "Modal-vs-routed detection via optional close-handler prop — no new
     context, no new store, zero impact on existing call sites."

requirements-completed: [DTL-01, DTL-02, DTL-04]

# Metrics
duration: 12m
completed: 2026-04-26
---

# Phase 6 Plan 01: Issue Detail Modal Restyle Summary

**DTL-02 priority dropdown → SegmentedControl P0..P3 (active pill carries text-tag-pN), DTL-04 sticky 48px modal-footer band (Löschen + Esc-hint + Fertig with conditional render), and the full German DTL Copywriting Contract translation across the right pane / Activity / sub-issues / AlertDialog / toasts — all wired into the existing two-pane IssueDetail without adding tokens, stores, or contexts.**

## Performance

- **Duration:** ~12 min (start 2026-04-26T10:05:26Z, end 2026-04-26T10:17:29Z)
- **Tasks:** 3
- **Files created:** 4 (2 atoms + 2 atom tests)
- **Files modified:** 5 (segmented-control + its test, issue-detail + its test, index.ts)
- **Test counts:** 60/60 GREEN
  - `packages/ui/components/ui/segmented-control.test.tsx` — 15/15 (12 pre-existing + 3 new colorByValue)
  - `packages/views/issues/components/issue-priority-segmented-control.test.tsx` — 16/16 (NEW)
  - `packages/views/issues/components/issue-detail-footer.test.tsx` — 10/10 (NEW)
  - `packages/views/issues/components/issue-detail.test.tsx` — 19/19 (11 pre-existing kept GREEN, 3 updated to German labels, 8 new for SegmentedControl + modal-footer + AlertDialog + Fertig conditional)

## Accomplishments

- **DTL-01 (two-pane layout)** — preserved the existing `<ResizablePanelGroup horizontal>` verbatim. The IssueDetailFooter mounts as the last child of the LEFT pane's flex column (sibling of the `flex-1 overflow-y-auto` scrollable container), giving it the sticky-bottom anchor required by UI-SPEC.
- **DTL-02 (Priority SegmentedControl)** — replaced `<PriorityPicker>` in the right pane with `<IssuePrioritySegmentedControl>`. Mapping is exhaustive and fixed (urgent→P0, high→P1, medium→P2, low→P3, none→excluded). When `priority === "none"` no item is active and a separate `[× Priorität entfernen]` button replaces the active pill below the control. Active P0..P3 pills carry their `text-tag-pN` color via the new `colorByValue` extension on the Phase 2 atom.
- **DTL-04 (modal-footer)** — new 48px sticky band at the bottom of the LEFT pane: Löschen (variant=destructive) on the left, "Esc zum Schließen" hint + Fertig (variant=default, brand-green) on the right. Fertig only renders when the caller passes `onClose`, hiding it in routed-page mode. Löschen opens the existing AlertDialog confirmation (NEVER deletes inline — UI-SPEC Hard Constraint #10).
- **German DTL Copywriting Contract** — every label in the right pane (Eigenschaften, Status, Priorität, Verantwortlich, Fällig, Projekt, Übergeordnetes Issue, Token-Verbrauch, Erstellt von, Erstellt, Aktualisiert), Activity area (Aktivität, Abonnieren/Abbestellen), sub-issues area (Unter-Issues, + Unter-Issue hinzufügen, Unter-Issue von), AlertDialog (Issue löschen?, dauerhaft gelöscht…, Abbrechen, Löschen, Wird gelöscht…), and toasts (Issue gelöscht, Issue konnte nicht gelöscht werden) translated. Sanity-grep returns "No English literals remaining" for the Copywriting Contract DTL set.
- **Atom-extension discipline** — the Phase 2 SegmentedControl received an additive `colorByValue?: Record<string, string>` prop plumbed via a module-private `ColorByValueContext`. Every existing call site is unaffected; the wrapper-class hack alternative was rejected because it would duplicate the priority→class mapping at the call site and lose the data-[pressed]: scoping that disappears the color when another item becomes active.
- **Mobile fallback honored** — desktop sees Löschen exclusively in the modal-footer; mobile sees Löschen exclusively in the More-actions dropdown. Each viewport has a single canonical destructive entry-point.

## Task Commits

Each task was committed atomically. Note Task 1's commit landed under a parallel-agent commit message due to a concurrent commit-collision on `feat/repos-per-project` (see Issues Encountered §1) — the diff is correct and contains exactly Task 1's files.

1. **Task 1: Extend SegmentedControl with colorByValue + IssuePrioritySegmentedControl** — `a1552fa1` (commit message says "06-03 AppearanceTab" due to parallel-commit collision; the diff for `segmented-control.tsx`, `segmented-control.test.tsx`, `issue-priority-segmented-control.tsx`, `issue-priority-segmented-control.test.tsx`, and `index.ts` is verifiably present in this commit)
2. **Task 2: IssueDetailFooter atom (Löschen + Esc + Fertig)** — `2a742d19` (clean, single-message)
3. **Task 3: Wire IssueDetail (footer + SegmentedControl + German DTL strings)** — `14c2ca54` (clean, single-message)

## Files Created (4) / Modified (5)

### Created

- `packages/views/issues/components/issue-priority-segmented-control.tsx` — wrapper mapping IssuePriority enum to P0..P3 SegmentedControl items with separate "Priorität entfernen" affordance
- `packages/views/issues/components/issue-priority-segmented-control.test.tsx` — 16 assertions: render (4 P-items + aria-label), exhaustive enum mapping (5 enum values), change handler, clear-affordance presence/click, colorByValue per-item classes, disabled state
- `packages/views/issues/components/issue-detail-footer.tsx` — 48px sticky band, Löschen LEFT + Esc-hint/Fertig RIGHT, conditional Fertig render
- `packages/views/issues/components/issue-detail-footer.test.tsx` — 10 assertions: button presence, conditional Fertig (defined vs undefined onDone), click handlers, root container classes, trash icon, contentinfo landmark

### Modified

- `packages/ui/components/ui/segmented-control.tsx` — added `colorByValue?: Record<string, string>` to props, ColorByValueContext provider, item consumer that conditionally appends `data-[pressed]:${colorClass}`
- `packages/ui/components/ui/segmented-control.test.tsx` — 3 new colorByValue tests appended (without map → no class; with map → matching items get data-[pressed]:text-tag-pN; unknown keys harmless)
- `packages/views/issues/components/issue-detail.tsx` — IssuePrioritySegmentedControl + IssueDetailFooter imports; new `onClose?` prop; right-pane labels translated to German; PriorityPicker call-site replaced; AlertDialog strings German; toasts German; mobile-only Delete in More-actions; modal-footer mount as last child of left-pane flex column; sub-issues/Activity/sub-issue-of strings translated
- `packages/views/issues/components/issue-detail.test.tsx` — userEvent import; renderIssueDetail signature accepts `onClose`; 3 existing assertions updated to German (Eigenschaften/Priorität/Verantwortlich/Fällig/Projekt; Erstellt von/Erstellt/Aktualisiert; Aktivität); 8 new assertions for SegmentedControl presence + active mapping, modal-footer Löschen, More-actions Delete-removed, AlertDialog German strings, Fertig hidden routed/visible+wired modal
- `packages/views/issues/components/index.ts` — re-exports IssuePrioritySegmentedControl + IssueDetailFooter

## Decisions Made

See key-decisions in frontmatter. Five decisions:
1. Atom extension via Context (vs. wrapper-class hack)
2. Mobile fallback (desktop modal-footer / mobile More-actions split)
3. Modal-mode signal via optional onClose prop (vs. context-based isModal)
4. PriorityPicker stays exported (per UI-SPEC mandate) but call-site removed
5. PropRow w-16 column-width preserved (no restructure needed)

## Final Mapping Table (enum ↔ P-label)

For future-phase reference. Mapping is FIXED per UI-SPEC §Hard Constraints #3 — DO NOT change in subsequent plans.

| `IssuePriority` enum | SegmentedControl item value | Display label | Active text color |
|---------------------|----------------------------|---------------|-------------------|
| `urgent`            | `p0`                        | `P0`          | `text-tag-p0`     |
| `high`              | `p1`                        | `P1`          | `text-tag-p1`     |
| `medium`            | `p2`                        | `P2`          | `text-tag-p2`     |
| `low`               | `p3`                        | `P3`          | `text-tag-p3`     |
| `none`              | (no active item)            | —             | —                 |

The `none` value renders the SegmentedControl with no `data-pressed` item AND surfaces a small `[× Priorität entfernen]` button BELOW the control — but only when the current value is NOT already `none`. Clicking that button fires `onChange("none")`.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 — Missing critical functionality] Untranslated "Sub-issue of" label in DTL surface**

- **Found during:** Task 3 sanity-grep (after first GREEN pass)
- **Issue:** UI-SPEC §Copywriting Contract DTL mandates German translation for every DTL label, but the breadcrumb label "Sub-issue of" inside the IssueDetail TitleEditor area was not in the explicit table. The natural German translation aligns with the table's "Sub-issues → Unter-Issues" and "Übergeordnetes Issue" patterns.
- **Fix:** Translated to "Unter-Issue von" (parallel construction with "Übergeordnetes Issue" + "Unter-Issues"). Vitest stayed GREEN; no test referenced this string.
- **Files modified:** `packages/views/issues/components/issue-detail.tsx` (line 1042)
- **Committed in:** `14c2ca54` (Task 3 commit)

**2. [Rule 3 — Blocking] Removed unused PriorityPicker import after replacing call-site**

- **Found during:** Task 3 implementation (after replacing `<PriorityPicker>` with `<IssuePrioritySegmentedControl>` in the right pane)
- **Issue:** With the call-site gone, `PriorityPicker` became an unused import in `issue-detail.tsx`. The package-wide `noUnusedLocals: true` (in `packages/tsconfig/base.json`) would flag this on typecheck.
- **Fix:** Removed `PriorityPicker` from the named-imports list of `from "."`. The component itself is still exported from `packages/views/issues/components/index.ts` for other call sites per UI-SPEC §Sub-Phase DTL §Priority SegmentedControl ("dropdown component remains in the codebase for use in More-actions menu and inline pickers — NOT deleted").
- **Files modified:** `packages/views/issues/components/issue-detail.tsx`
- **Committed in:** `14c2ca54` (Task 3 commit)

---

**Total deviations:** 2 auto-fixed (1 missing-critical, 1 blocking). No Rule 4 architectural questions. No auth gates.

## Issues Encountered

**1. Parallel-agent commit collision on Task 1 commit message**

While Task 1 was being committed, two parallel agents (executing 06-02 and 06-03 plans concurrently on the same `feat/repos-per-project` branch) raced into the commit queue. The result: my Task 1 staged changes (segmented-control extension + IssuePrioritySegmentedControl wrapper + index.ts re-export) ended up landing as part of commit `a1552fa1` whose message says "feat(06-03): German labels + brand-green check overlay in AppearanceTab". The diff is verifiably correct — `git show --stat a1552fa1` lists both my plan-01 files AND the parallel agent's plan-03 file (`appearance-tab.tsx` + its test).

This is a process collision, NOT a content collision: my files are byte-correct as I wrote them and the wrapper/atom extension behaviors test GREEN. The misleading commit message is documented here so future archaeology can find Task 1's changes by file rather than by message.

Tasks 2 and 3 committed with clean isolated messages (`2a742d19`, `14c2ca54`).

**2. Pre-existing typecheck errors in unrelated parallel-plan files**

`pnpm --filter @multica/views exec tsc --noEmit` fails with errors in:
- `auth/forgot-password-page.test.tsx` — references missing `./forgot-password-page` module (06-04 plan in-flight)
- `auth/resend-verify-email-page.test.tsx` — references missing `./resend-verify-email-page` module (06-04 plan in-flight)
- `settings/components/workspace-tab.test.tsx` — 5 type errors (06-03 plan in-flight)

ALL pre-existing in working tree before plan 06-01 started (verified by stashing my changes and re-running typecheck against baseline). Out of scope per SCOPE BOUNDARY rule. None of these touch DTL surfaces. Plans 06-03 and 06-04 will resolve them as part of their own scope.

**3. No live E2E run**

Per phase ceremony, the SC#1 gate (`e2e/tests/issue-detail-modal.spec.ts`) is a manual run after the plan completes — does not block plan completion. The vitest assertions exhaustively cover the new behaviors at the component level.

## Verification Results

```
pnpm --filter @multica/ui exec vitest run components/ui/segmented-control.test.tsx
  → 15/15 GREEN (12 pre-existing + 3 new colorByValue)

pnpm --filter @multica/views exec vitest run \
  issues/components/issue-priority-segmented-control.test.tsx \
  issues/components/issue-detail-footer.test.tsx \
  issues/components/issue-detail.test.tsx
  → 45/45 GREEN (16 + 10 + 19)

pnpm --filter @multica/views exec vitest run __tests__/dragstrip-coverage.test.ts
  → 24/24 GREEN (Wave-0 gate preserved)

Sanity grep for English DTL labels in issue-detail.tsx
  → no matches (clean — every Copywriting Contract DTL label is German)

pnpm --filter @multica/views exec tsc --noEmit
  → only pre-existing parallel-plan errors (verified out-of-scope by stash baseline)
```

## Mobile Fallback — Final Routing Table

| Viewport | Löschen entry-point | More-actions Delete item | Modal-footer band |
|----------|---------------------|--------------------------|-------------------|
| Desktop (≥768px)  | Modal-footer band (LEFT pane bottom) | HIDDEN | VISIBLE |
| Mobile (<768px)   | More-actions dropdown                | VISIBLE (with German label "Löschen") | HIDDEN |

The split is mutually exclusive — no viewport sees Delete in two places, no viewport sees zero entry-points. The same AlertDialog backs both code paths.

## Atom Extension Decision (Detailed)

The Phase 2 SegmentedControl atom needed a way for the wrapper to apply per-priority text colors that take effect ONLY on the active item. Three implementation options were considered:

| Option | Pros | Cons | Decision |
|--------|------|------|----------|
| (A) `colorByValue` prop on root + Context | Single API call site; mapping co-located in wrapper; data-[pressed]: scoping is automatic | Requires React Context plumbing inside the atom | **CHOSEN** |
| (B) Per-item `className` override at wrapper | Zero atom changes | Duplicates the priority→class mapping in wrapper render JSX; needs explicit `data-[pressed]:` prefix at every call site | Rejected — fork-by-stealth |
| (C) New `<PrioritySegmentedControl>` atom (fork) | Domain-specific naming | Violates "extend, don't fork" (CLAUDE.md coding rules); creates a parallel abstraction | Rejected outright |

Option A keeps the atom domain-free (it accepts any string→class map) while letting the wrapper hold the IssuePriority-specific knowledge in one place. The Context is module-private (NOT exported), so consumers can't accidentally short-circuit it.

## Unexpected DTL-01 Layout Drift

Reading the 1441-line `issue-detail.tsx` revealed one item not in the plan's DTL-01 contract: the "Sub-issue of" breadcrumb under the title editor was English. This was an oversight in the Copywriting table (the table covers right-pane labels but missed the breadcrumb). I translated it to "Unter-Issue von" as a Rule-2 deviation (see Deviations §1) since it sits inside the DTL surface.

No structural drift discovered — the existing two-pane layout (PageHeader + scrollable flex-1 content + ResizableHandle + sidebar) is exactly what UI-SPEC §Two-pane layout describes. The new IssueDetailFooter slots in cleanly as the last child of the LEFT pane's flex column without restructuring.

## Self-Check: PASSED

- `[ ✓ ]` `packages/views/issues/components/issue-priority-segmented-control.tsx` — present
- `[ ✓ ]` `packages/views/issues/components/issue-priority-segmented-control.test.tsx` — present
- `[ ✓ ]` `packages/views/issues/components/issue-detail-footer.tsx` — present
- `[ ✓ ]` `packages/views/issues/components/issue-detail-footer.test.tsx` — present
- `[ ✓ ]` `packages/ui/components/ui/segmented-control.tsx` — colorByValue + ColorByValueContext present (verified by grep)
- `[ ✓ ]` `packages/views/issues/components/issue-detail.tsx` — IssuePrioritySegmentedControl + IssueDetailFooter imported, German strings present (verified by grep)
- `[ ✓ ]` Commit `a1552fa1` (Task 1 — collision-message commit) — present in `git log`
- `[ ✓ ]` Commit `2a742d19` (Task 2) — present in `git log`
- `[ ✓ ]` Commit `14c2ca54` (Task 3) — present in `git log`

---
*Phase: 06-issue-detail-remaining-views*
*Plan: 01*
*Completed: 2026-04-26*
