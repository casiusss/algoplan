---
phase: 02-atomic-ui-primitives
plan: 02
subsystem: ui
tags: [tag-chip, atomic, cva, base-ui, useRender, lucide, tdd, vitest]

# Dependency graph
requires:
  - phase: 02-atomic-ui-primitives
    provides: "Plan 00 confirmed Phase 1 tokens (--color-tag-p{0..3}, --color-brand + foregrounds, --color-ring) are stable and available for class binding"
provides:
  - "TagChip component — color-locked pill with optional X-to-remove button"
  - "tagChipVariants cva — 5 colors × 2 interactive padding modes; no defaultVariants.color"
  - "TagChipColor type — discriminated union of 5 literals (tag-p0|tag-p1|tag-p2|tag-p3|brand)"
  - "Polymorphic root via Base UI useRender (mirrors badge.tsx); render={<a />} swaps span→a"
  - "onRemove handler calls e.stopPropagation() before invoking callback (no parent-click leak)"
affects:
  - "Phase 5 KBN-02 (kanban card tag rows) — direct consumer"
  - "Phase 6 DTL-03 (issue detail tag editor) — direct consumer; uses onRemove for tag removal"

# Tech tracking
tech-stack:
  added: []  # No new deps; uses existing @base-ui/react + class-variance-authority + lucide-react + clsx/twMerge
  patterns:
    - "Atomic UI primitive: cva(base, { variants, defaultVariants }) → className helper"
    - "Base UI useRender + mergeProps for polymorphic root (badge.tsx-mirror pattern)"
    - "Required variant without default — discriminated union enforces caller-supplied color at compile time"
    - "Inline SVG icon via lucide-react named import (X), conditionally rendered when handler present"
    - "stopPropagation BEFORE callback invocation — prevents parent click leak (T-02-02-03 mitigation)"
    - "TDD with explicit RED gate via missing implementation file (Failed to resolve import)"

key-files:
  created:
    - "packages/ui/components/ui/tag-chip.tsx"
    - "packages/ui/components/ui/tag-chip.test.tsx"
  modified: []

key-decisions:
  - "No defaultVariants.color — UI-SPEC §Color forbids a default tag color; callers must opt in explicitly. Documented inline as a comment, not just enforced by types."
  - "Padding split is interactive boolean (not separate cva variants per color) — color and padding are orthogonal; combining them would multiply the variant matrix from 5+2 to 10."
  - "Remove button uses native <button> with aria-label='Remove tag' (not Base UI Toggle/Button) — atom stays leaf, no Base UI nesting overhead, accessible-name comes through the literal aria-label."
  - "hover:bg-black/10 on the X button (not hover:bg-foreground/10) — subtle uniform darkening that reads correctly on every Phase 1 background; if a future phase finds this too dark on bg-tag-p3, swap to foreground/10. This is intentionally NOT a `dark:` override."
  - "Comment wording uses 'Tailwind theme-prefix overrides' instead of the literal token to keep the automated `\\bdark:` grep gate clean — the threat-model verification asserts zero such tokens in source."
  - "Did NOT include 'use client' directive (badge.tsx pattern) — TagChip is a presentational atom with no client-only deps; a consumer wrapping it in a Server Component context still works because cva + useRender are both pure."

requirements-completed: [UI-01]

# Metrics
duration: 3min
completed: 2026-04-25
---

# Phase 02 Plan 02: TagChip Summary

**Color-locked atomic chip (5 colors over Phase 1 tokens) with optional X-to-remove button; polymorphic via Base UI useRender; zero `dark:` overrides — published from `@multica/ui/components/ui/tag-chip`.**

## Performance

- **Duration:** ~3 min (162s wall clock)
- **Started:** 2026-04-25T10:56:30Z
- **Completed:** 2026-04-25T10:59:12Z
- **Tasks:** 2 (RED + GREEN, TDD plan)
- **Files modified:** 2 (both created)

## Accomplishments

- Implemented `TagChip` as a Base UI `useRender`-polymorphic span/anchor with cva variants over 5 Phase 1 token colors (tag-p0..p3, brand)
- Discriminated `TagChipColor` union enforces compile-time color safety — no string escape hatch, no runtime color drift
- Optional `onRemove` renders an inline `<button aria-label="Remove tag">` with the lucide `X` icon at `size-3`; the click handler calls `e.stopPropagation()` BEFORE the callback so wrapping click handlers (e.g. card-row open-on-click) never fire
- Padding contract honors UI-SPEC §1: `px-2 py-0.5` default; `px-1.5 pr-1` when interactive (tighter to fit X)
- Zero `dark:` overrides anywhere in the source — theme adaptation flows entirely through Phase 1 tokens (verified by grep gate)
- 11 Vitest+RTL tests cover: 5 color mappings, default span rendering, X-button rendering, single-fire onRemove, stopPropagation guarantee, render-prop polymorphism, and the no-`dark:` invariant

## Task Commits

Each task was committed atomically following the TDD gate sequence:

1. **Task 1: Write failing test (RED)** — `5b74c5ac` (test)
2. **Task 2: Implement tag-chip.tsx (GREEN)** — `4bfc9e07` (feat)

**Plan metadata commit:** added separately by orchestrator (this SUMMARY.md).

## Files Created/Modified

- `packages/ui/components/ui/tag-chip.tsx` (created, 97 lines) — full component with cva variants, useRender polymorphism, conditional remove button, and a leading JSDoc block documenting the color/padding/event contracts
- `packages/ui/components/ui/tag-chip.test.tsx` (created, 82 lines) — 11 logical assertions across 7 `it()` blocks (5 parameterized color tests + 6 behavioral)

## Decisions Made

- **Required `color` prop with no default** — UI-SPEC §Color line 528 forbids a default tag color; the cva block intentionally omits `defaultVariants.color`. The `TagChipColor` type uses `NonNullable<VariantProps<...>["color"]>` so `color` is required at the type level, not just by convention.
- **Single boolean for interactive padding** — rather than encoding padding inside each color row, `interactive: true|false` is its own cva variant. Keeps the matrix flat (5 + 2 instead of 5 × 2) and orthogonal.
- **Comment-rewording for grep-gate hygiene** — the literal `dark:` token in a JSDoc comment was rewritten to "Tailwind theme-prefix overrides" so the threat-model gate (`grep -E "\bdark:" tag-chip.tsx` returns no matches) stays meaningful. The semantic rule (no theme-prefix overrides) is unchanged; only the comment phrasing changed.
- **No `"use client"` directive** — matches the badge.tsx convention; cva + useRender are both pure, so the atom works in both Server and Client component trees.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Comment phrasing tripped the threat-model `dark:` grep gate**
- **Found during:** Task 2 GREEN verification step
- **Issue:** The plan's `<verify>` clause for Task 2 runs `! grep -E "\bdark:" packages/ui/components/ui/tag-chip.tsx`. My initial JSDoc block used the literal phrase "no `dark:` overrides" inside a code-comment string, which `\bdark:` matched. The intent of the gate is to catch CSS-class usage, not documentation references — but `grep` cannot distinguish them.
- **Fix:** Rewrote the comment to "no Tailwind theme-prefix overrides". Semantic rule unchanged; the source now contains zero `dark:` substrings.
- **Files modified:** `packages/ui/components/ui/tag-chip.tsx` (comment-only edit, no behavior change)
- **Verification:** `grep -nE "\bdark:" packages/ui/components/ui/tag-chip.tsx` exits 1 (no matches); 11/11 tests still pass after the edit
- **Committed in:** `4bfc9e07` (Task 2 GREEN commit — the edit landed before the commit, not as a follow-up)

---

**Total deviations:** 1 auto-fixed (Rule 1 — comment phrasing collided with verification grep)
**Impact on plan:** Cosmetic comment correction, no semantic deviation. The component contract (props, variants, behavior, accessibility, threat-model mitigations) matches the plan exactly.

## Issues Encountered

**Pre-existing typecheck failures in sibling parallel-wave files** — `pnpm --filter @multica/ui typecheck` reports errors in `accent-bar.test.tsx` and `segmented-control.test.tsx`, both authored by parallel wave-2 plans (`02-03`, `02-05`) that have not yet completed their GREEN phase in their respective worktrees. These are explicitly out of scope for this plan per the parallel-executor `<parallel_execution>` constraint ("You touch ONLY: tag-chip.tsx + tag-chip.test.tsx + SUMMARY.md"). Verified `tsc --noEmit` produces zero errors for `tag-chip.{tsx,test.tsx}` (`grep tag-chip` on the typecheck output returns empty). They will resolve when sibling waves merge.

## User Setup Required

None — atomic UI component, no environment variables, no external services, no new runtime dependencies. Importable as `import { TagChip } from "@multica/ui/components/ui/tag-chip"` from any Phase 5/6 consumer.

## Next Phase Readiness

- **Phase 5 KBN-02 (kanban card tag rows) is unblocked** for the rendering surface — can compose `<TagChip color="tag-p0">{label}</TagChip>` directly.
- **Phase 6 DTL-03 (issue detail tag editor) is unblocked** for the chip-removal interaction — `<TagChip color={t.color} onRemove={() => removeTag(t.id)}>{t.label}</TagChip>` wires the X-button click directly into the mutation.
- **No carry-over blockers.** Color is locked at the type level; consumers cannot drift away from the Phase 1 token system without a TypeScript error.
- **Wave-2 sibling plans (02-03 AccentBar, 02-04 AvatarInitial, 02-05 SegmentedControl)** are unaffected by this plan — TagChip shares no module surface with them.

## TDD Gate Compliance

- **RED gate:** `5b74c5ac` — `test(02-02): add failing tests for TagChip (RED)` (Vitest reported `Failed to resolve import "./tag-chip"` — strongest possible RED: file fails to even import)
- **GREEN gate:** `4bfc9e07` — `feat(02-02): implement TagChip component` (Vitest reported `Test Files 1 passed (1)`, `Tests 11 passed (11)`)
- **REFACTOR gate:** Skipped (no separate cleanup needed; the comment correction during GREEN was a verification-gate fix, not a refactor)

## Threat Model Outcomes (cross-reference plan §threat_model)

| Threat ID | Mitigation status |
|-----------|-------------------|
| T-02-02-01 (XSS via children) | MITIGATED — children rendered through standard React JSX path; no `dangerouslySetInnerHTML` (verified: grep returns 0); `aria-label` is a literal string constant. |
| T-02-02-02 (unknown color values) | MITIGATED — `TagChipColor` is a discriminated union of 5 literals; cva variants enumerate exactly the same 5; no string escape hatch. |
| T-02-02-03 (X click escalation via bubble) | MITIGATED — handler calls `e.stopPropagation()` before `onRemove()`; test "does NOT bubble the X click to a wrapping handler" asserts the wrapping `onClick` is not invoked. |
| T-02-02-04 (theme leak via `dark:` overrides) | MITIGATED — `grep -nE "\bdark:" tag-chip.tsx` returns no matches; theme adapts via Phase 1 tokens only. |

## Self-Check: PASSED

- `packages/ui/components/ui/tag-chip.tsx` — FOUND
- `packages/ui/components/ui/tag-chip.test.tsx` — FOUND
- Commit `5b74c5ac` (RED) — FOUND in `git log`
- Commit `4bfc9e07` (GREEN) — FOUND in `git log`
- 11/11 Vitest tests pass — VERIFIED via `pnpm --filter @multica/ui exec vitest run components/ui/tag-chip.test.tsx`
- Zero `\bdark:` matches in source — VERIFIED via grep (exit 1)
- Zero `dangerouslySetInnerHTML` matches in source — VERIFIED via grep (exit 1)
- Pattern `from "@multica/ui/lib/utils"` present in source — VERIFIED
- Pattern `from "@base-ui/react/use-render"` present in source — VERIFIED
- Pattern `import { X } from "lucide-react"` present in source — VERIFIED
- Min-lines contract (test ≥ 70 lines) — VERIFIED (82 lines)
- Required exports `{ TagChip, tagChipVariants, type TagChipColor }` — VERIFIED in source

---
*Phase: 02-atomic-ui-primitives*
*Completed: 2026-04-25*
