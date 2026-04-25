---
phase: 02-atomic-ui-primitives
plan: 03
subsystem: ui
tags: [accent-bar, cva, tailwind, atomic-component, presentational]

requires:
  - phase: 01-token-foundation-typography
    provides: tag-p0..p3 / brand / muted background tokens consumed via Tailwind class wiring
  - phase: 02-atomic-ui-primitives (Plan 00)
    provides: Phase 2 scaffolding + token-binding sanity tests confirming bg-tag-* classes survive jsdom

provides:
  - "AccentBar atomic component (UI-02): decorative 1–4 segment colored bar"
  - "AccentBarColor public type (closed union: tag-p0..p3, brand, muted)"
  - "accentBarVariants cva fn (orientation: horizontal | vertical)"
  - "Per-segment color resolution via static segmentColorClass lookup table"
  - "Synchronous render-time validation contract (helpful Error on mismatch / missing color)"

affects:
  - phase-05-kanban-board (KBN-02 cards consume horizontal multi-segment accent bars)
  - phase-05-kanban-board (KBN-05 list rows consume vertical single-color accent bars)

tech-stack:
  added: []
  patterns:
    - "cva on outer container + static lookup map for per-instance colors (avoids cva-per-segment overhead)"
    - "Render-time validation throws descriptive Error — caught by expect(...).toThrow() in tests"
    - "Source-level grep guard inside Vitest (read source via import.meta.url-relative path) to assert zero dark: classes"
    - "Pure presentational atom: role='presentation' + aria-hidden='true', no client directive, no event handlers"

key-files:
  created:
    - packages/ui/components/ui/accent-bar.tsx
    - packages/ui/components/ui/accent-bar.test.tsx
  modified: []

key-decisions:
  - "Used static segmentColorClass lookup (not cva) for per-segment colors — colors are per-segment, plain map gives O(1) lookup without per-instance cva closure"
  - "Outer container is always flex (not just on horizontal); orientation only flips axis (flex-row vs flex-col) and dimension classes (h-1/w-full vs h-full/w-1)"
  - "Test source-grep helper resolves path via import.meta.url + node:path/node:url (cwd-independent) — vitest runs with cwd=packages/ui, so the relative path 'packages/ui/...' from the plan example would have resolved incorrectly"
  - "Removed @ts-expect-error before the no-color render() call — AccentBarProps declares all fields optional (color?, segments?, colors?), so the `<AccentBar />` JSX is type-valid; runtime contract still enforced via thrown Error"

patterns-established:
  - "Phase 2 atom pattern: cva on outer (variant-driven dimensions), inline className map for color (per-element), cn() merges them"
  - "Validation-as-contract: throw early in render with prop names + actual values in the message; tests assert via toThrow(/regex/)"
  - "Source-level invariant tests: read the .tsx via fs and grep for forbidden tokens (dark:, hex literals) — cheaper than CI lints, runs in the same Vitest pass"

requirements-completed:
  - UI-02

duration: 3min
completed: 2026-04-25
---

# Phase 02 Plan 03: AccentBar Summary

**Pure presentational AccentBar atom with cva-driven orientation, 6-color (tag-p0..p3 + brand + muted) per-segment lookup, 1–4 adjacent segments, and synchronous render-time validation — committed via TDD RED→GREEN.**

## Performance

- **Duration:** ~3 min
- **Started:** 2026-04-25T10:56:34Z
- **Completed:** 2026-04-25T10:59:14Z
- **Tasks:** 2 (TDD: RED + GREEN)
- **Files created:** 2

## Accomplishments

- `AccentBar` component: decorative `<div role="presentation" aria-hidden="true" data-slot="accent-bar">` containing 1–4 `flex-1 bg-*` segments
- 6-color closed union (`AccentBarColor`) wiring `bg-tag-p0`, `bg-tag-p1`, `bg-tag-p2`, `bg-tag-p3`, `bg-brand`, `bg-muted` — all reachable via static lookup
- `accentBarVariants` (cva) with `orientation` variant (horizontal default = `flex h-1 w-full flex-row`, vertical = `flex h-full w-1 flex-col`)
- Validation contract: throws descriptive `Error` when `(segments=1 && !color)`, when `(colors.length !== segments)`, and when neither `color` nor `colors` is supplied
- Single-color repetition: `<AccentBar segments={2} color="tag-p0" />` renders two `bg-tag-p0` segments (no `colors` array required)
- 16/16 Vitest assertions green (6 color mappings + ARIA + 2 orientation + 3 multi-segment + 1 repeat + 2 validation throws + 1 source-level dark: guard)
- Zero `dark:` classes in source — theme adaptation routes through Phase 1 tokens only (asserted by source-grep test)

## Task Commits

Each TDD gate committed atomically:

1. **Task 1: Write failing test (RED)** — `5c1883ab` (test)
2. **Task 2: Implement AccentBar (GREEN)** — `341c4b11` (feat)

_Note: GREEN commit also folds in two TS-strict test fixes (cwd-independent fs path + dropped unused `@ts-expect-error` directive) — see Deviations section._

## Files Created/Modified

- `packages/ui/components/ui/accent-bar.tsx` (75 lines) — cva outer + static color lookup + render-time validation
- `packages/ui/components/ui/accent-bar.test.tsx` (106 lines) — 16 assertions covering color mapping, ARIA, orientation, segments, validation, source-grep

## Decisions Made

- **Static color lookup instead of cva for per-segment color**: cva builds variant strings per call; with bounded color set (6) and per-segment use, a plain `{ "tag-p0": "bg-tag-p0", ... } as const` map gives equivalent type safety with O(1) lookup and zero closure allocation. Outer cva remains for `orientation` (single variant per render).
- **Outer is `flex` regardless of orientation**: simplifies the `flex-1` segment contract — segments fill the cross-axis automatically in both horizontal and vertical mode.
- **Thrown Error over silent fallback**: caller mistakes (mismatched `colors`/`segments`) are bugs, not edge cases. Throwing surfaces them at the consumer's render site rather than producing a wrong-looking bar.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 — Bug] Source-grep test path was cwd-relative, broke when Vitest runs from package root**

- **Found during:** Task 2 (GREEN — initial test run)
- **Issue:** The plan's reference test code used `fs.readFileSync("packages/ui/components/ui/accent-bar.tsx", "utf8")`. Vitest in this monorepo runs with `cwd = packages/ui`, so the relative path resolved to `packages/ui/packages/ui/components/ui/accent-bar.tsx` → `ENOENT`.
- **Fix:** Resolved the path relative to the test file's own location using `node:url` + `node:path` (`path.dirname(url.fileURLToPath(import.meta.url))`).
- **Files modified:** `packages/ui/components/ui/accent-bar.test.tsx` (lines 99-103)
- **Verification:** Test passes; the source-grep guard now correctly opens the actual `accent-bar.tsx` and asserts zero `dark:` matches.
- **Committed in:** `341c4b11` (folded into GREEN commit alongside the implementation)

**2. [Rule 1 — Bug] `@ts-expect-error` directive was unused under TS strict mode**

- **Found during:** Task 2 (GREEN — `pnpm --filter @multica/ui typecheck`)
- **Issue:** The plan's reference test had `// @ts-expect-error` before `render(<AccentBar />)` to assert that omitting both `color` and `colors` was a type error. But `AccentBarProps` declares ALL three fields as optional (`color?`, `segments?`, `colors?`) — making `<AccentBar />` type-valid. TypeScript flagged the directive as `TS2578: Unused '@ts-expect-error' directive`.
- **Fix:** Removed the directive and replaced the comment with `// Props are optional at type-level; runtime validation enforces the contract.` The runtime `expect(...).toThrow()` assertion still verifies the validation Error fires.
- **Files modified:** `packages/ui/components/ui/accent-bar.test.tsx` (line 91)
- **Verification:** `pnpm --filter @multica/ui exec vitest run components/ui/accent-bar.test.tsx` → 16/16 pass; no TS errors in `accent-bar*` files.
- **Committed in:** `341c4b11` (folded into GREEN commit)

**3. [Rule 1 — Bug] TS strict-mode `Object is possibly 'undefined'` on querySelectorAll indexing**

- **Found during:** Task 2 (GREEN — `pnpm --filter @multica/ui typecheck`)
- **Issue:** `segments[i].className` failed `noUncheckedIndexedAccess` checks (TS2532). The `segments[0]` and `segments[1]` accessors in the "repeats single color" test had the same issue.
- **Fix:** Added non-null assertions (`segments[i]!.className`, `segments[0]!.className`) — the prior `expect(segments.length).toBe(N)` line guarantees the index is in range.
- **Files modified:** `packages/ui/components/ui/accent-bar.test.tsx` (lines 65-66, 75-76)
- **Verification:** Typecheck passes for `accent-bar*` files (remaining errors come from sibling worker files: `tag-chip.test.tsx`, `segmented-control.test.tsx` — out of scope per parallel-execution constraints).
- **Committed in:** `341c4b11`

---

**Total deviations:** 3 auto-fixed (3 × Rule 1 — bugs in plan's reference test code)
**Impact on plan:** All deviations were minor test-file fixes required by the project's TS strict-mode + Vitest cwd convention. No change to the AccentBar component contract, no change to the test coverage matrix. The plan's logic and behavior contract were implemented as specified.

## Issues Encountered

- **Sibling worker scope contamination**: While running `pnpm --filter @multica/ui typecheck`, errors surfaced in `tag-chip.test.tsx` and `segmented-control.test.tsx` (created by parallel workers for plans 02-02 and 02-05, both in their RED phases). These are not in this plan's scope per the parallel-execution constraint ("touch ONLY: accent-bar.tsx + accent-bar.test.tsx"); they will resolve when those plans reach their own GREEN gates. No action taken.

## TDD Gate Compliance

Plan-level TDD gates verified in git log:

- ✅ RED gate: `5c1883ab test(02-03): add failing tests for AccentBar (RED)` — confirmed failing via "Failed to resolve import './accent-bar'"
- ✅ GREEN gate: `341c4b11 feat(02-03): implement AccentBar component (GREEN)` — 16/16 vitest assertions pass
- ⏸️ REFACTOR gate: not needed — implementation is minimal and matches the plan's reference structure 1:1

## Threat Surface Assessment

All four threats from the plan's `<threat_model>` are mitigated as specified:

- **T-02-03-01 (Tampering)**: `AccentBarColor` closed union enforced at compile time; `segmentColorClass` lookup returns `undefined` for unknown keys, `cn()` no-ops on undefined. All 6 colors asserted via parameterized tests.
- **T-02-03-02 (DoS via mismatched props)**: Synchronous validation throws `Error` with prop-name + actual-vs-expected values; test asserts the throw via `/colors/i` regex.
- **T-02-03-03 (Information Disclosure via dark-mode override)**: Source-level grep test asserts zero `dark:` substrings in the `.tsx` file.
- **T-02-03-04 (Spoofing focusable surface)**: Hardcoded `role="presentation"` + `aria-hidden="true"`, no event handlers, no `tabIndex` — atom is structurally inert. Asserted by ARIA test.

No new threat surface introduced.

## Self-Check: PASSED

**Files exist:**

- ✅ `packages/ui/components/ui/accent-bar.tsx` (75 lines)
- ✅ `packages/ui/components/ui/accent-bar.test.tsx` (106 lines)

**Commits exist:**

- ✅ `5c1883ab` — `test(02-03): add failing tests for AccentBar (RED)`
- ✅ `341c4b11` — `feat(02-03): implement AccentBar component (GREEN)`

**Must-haves verified:**

- ✅ `<AccentBar color="tag-p0" />` renders single-segment `<div role="presentation" aria-hidden="true">` with `bg-tag-p0` on child span
- ✅ `<AccentBar segments=N colors=[…N entries…] />` renders exactly N adjacent `flex-1 bg-*` spans (N ∈ {2,3,4})
- ✅ `orientation="vertical"` → `flex-col h-full w-1`; default → `flex h-1 w-full`
- ✅ Mismatched `segments`/`colors.length` throws helpful Error at render
- ✅ Zero `dark:` classes in source (asserted by test + verified via `grep -E "\bdark:"`)
- ✅ All 6 colors (tag-p0..p3, brand, muted) reachable via Tailwind class wiring
- ✅ Imports `cn` from `@multica/ui/lib/utils` (key_links pattern matched)
- ✅ Imports `cva` from `class-variance-authority` (key_links pattern matched)
- ✅ Exports `AccentBar`, `AccentBarColor`, `accentBarVariants`
- ✅ Test file ≥ 90 lines (106 lines)

## Next Phase Readiness

- AccentBar is importable as `import { AccentBar } from "@multica/ui/components/ui/accent-bar"` from any consumer.
- Ready for Phase 5 KBN-02 (kanban cards) and KBN-05 (list rows) consumption with no API changes anticipated.
- No new design tokens introduced; all 6 colors flow through Phase 1 `bg-tag-*`, `bg-brand`, `bg-muted` Tailwind utilities.
- Sibling Phase 2 plans (02-02 TagChip, 02-04 AvatarInitial, 02-05 SegmentedControl) are in flight in parallel worktrees — no shared file overlap with this plan.

---
*Phase: 02-atomic-ui-primitives*
*Plan: 03*
*Completed: 2026-04-25*
