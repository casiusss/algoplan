---
phase: 02-atomic-ui-primitives
plan: 01
subsystem: ui
tags: [avatar, djb2, hash, palette, initials, pure-utility, tdd, vitest]

# Dependency graph
requires:
  - phase: 02-atomic-ui-primitives
    provides: "Plan 00 confirmed Phase 1 tokens (--color-tag-p{0..3}, --color-brand, --color-secondary, --color-muted, --color-accent + foregrounds) are stable and available for class binding"
provides:
  - "AVATAR_PALETTE: 8 frozen 'bg-* text-*-foreground' Tailwind class pairs"
  - "djb2(string) → 32-bit signed int (pure, deterministic, never memoized)"
  - "hashToPaletteIndex(string) → integer in [0, 7]"
  - "extractInitials(string) → 1-2 uppercase letters or '?' (Unicode-aware via \\p{L}\\p{N})"
  - "Regression-locked djb2 fixture: hashToPaletteIndex('Stephan') === 0 (raw djb2 = 249206168)"
  - "Subpath export: @multica/ui/lib/avatar-color"
affects:
  - "02-04 (AvatarInitial component) — direct consumer of all three named exports"
  - "Phase 4 sidebar avatars — reuses hashToPaletteIndex for member coloring"
  - "Phase 5 Kanban agent avatars — reuses extractInitials for fallback rendering"

# Tech tracking
tech-stack:
  added: []  # Pure TypeScript — no new dependencies
  patterns:
    - "Pure-utility module pattern (zero React, zero DOM, zero side effects at module scope)"
    - "Regression-locked hash fixture (hard-coded expected value guards algorithm drift)"
    - "Unicode-aware text processing via \\p{L}\\p{N} regex (u flag)"
    - "TDD with explicit RED gate via undeclared __EXPECTED__ symbol"

key-files:
  created:
    - "packages/ui/lib/avatar-color.ts"
    - "packages/ui/lib/avatar-color.test.ts"
  modified:
    - "packages/ui/package.json (added './lib/avatar-color' to exports map)"

key-decisions:
  - "djb2 NOT memoized — memoization would mask non-determinism and defeat the unit test (per RESEARCH §Pitfall 6)"
  - "Palette order locked at 8 entries by UI-SPEC §Color: tag-p0..p3, brand, secondary, muted, accent — any reorder would shift every existing avatar's color"
  - "extractInitials uses \\p{L}\\p{N} (not [a-zA-Z]) so Cyrillic, accented Latin, and non-ASCII names render correctly instead of falling back to '?'"
  - "Regression-locked fixture (hashToPaletteIndex('Stephan') === 0) committed as a literal — the test fails loudly if anyone silently rewrites djb2"
  - "Strict-mode index access (noUncheckedIndexedAccess) handled with non-null assertions (words[0]!) guarded by explicit length checks rather than refactoring to .at() — keeps the function shape obvious"

patterns-established:
  - "Pure utility split: math lives in lib/, component lives in components/ui/ — testable without jsdom"
  - "Subpath export under packages/ui/exports['./lib/<name>'] for non-component utilities"
  - "Defensive type guard at function entry (typeof name !== 'string' → '?') so undefined never throws"

requirements-completed: [UI-03]

# Metrics
duration: 3min
completed: 2026-04-25
---

# Phase 02 Plan 01: avatar-color utility Summary

**Pure djb2 + extractInitials + 8-entry AVATAR_PALETTE module published from @multica/ui/lib/avatar-color, locked by a regression fixture (hashToPaletteIndex('Stephan') === 0).**

## Performance

- **Duration:** ~3 min (166s wall clock)
- **Started:** 2026-04-25T10:51:04Z
- **Completed:** 2026-04-25T10:53:50Z
- **Tasks:** 2 (RED + GREEN, TDD plan)
- **Files modified:** 3 (2 created, 1 modified)

## Accomplishments
- Implemented canonical djb2 (Bernstein, k=33, seed 5381) with explicit 32-bit-int forcing (`hash |= 0`) for long-string determinism
- 8-entry `AVATAR_PALETTE` bound to existing Phase 1 OKLCH tokens (no new CSS, no new dependencies)
- `extractInitials` covers all 7 documented edge cases: empty / whitespace-only / punctuation-only / single-word / multi-word / leading-symbols / Unicode (Cyrillic) / undefined
- Locked the regression fixture: `hashToPaletteIndex('Stephan') === 0` (raw djb2 = 249206168). Any silent algorithm rewrite breaks the test loudly
- Module exported under `@multica/ui/lib/avatar-color` so Plan 04 (`AvatarInitial`) and downstream Phase 4/5 consumers import from a stable subpath

## Task Commits

Each task was committed atomically following the TDD gate sequence:

1. **Task 1: Write failing test (RED)** — `79d7ca45` (test)
2. **Task 2: Implement avatar-color.ts + publish via package.json exports (GREEN)** — `8c1113ac` (feat)

**Plan metadata commit:** added separately by orchestrator (this SUMMARY.md).

## Files Created/Modified
- `packages/ui/lib/avatar-color.ts` (created) — three named exports (`AVATAR_PALETTE`, `djb2`, `hashToPaletteIndex`, `extractInitials`) + `AvatarPaletteClass` type, leading security/non-memoization comment block
- `packages/ui/lib/avatar-color.test.ts` (created) — 13 logical test cases (15 assertions reported by Vitest) covering determinism, palette range, regression fixture, palette shape, initials edge cases including Unicode + undefined
- `packages/ui/package.json` (modified) — added `"./lib/avatar-color": "./lib/avatar-color.ts"` to the `exports` map (alphabetically before `./lib/utils`)

## Decisions Made
- Used `hash |= 0` inside the loop (not just at the end) — forces 32-bit int per character, prevents JS-number-precision loss on long names and matches the canonical reference implementation's runtime behavior
- Type guard `typeof input !== "string"` handles `undefined`/`null` defensively in both `djb2` and `extractInitials` — keeps the API forgiving for upstream callers that haven't yet narrowed types
- Used non-null assertions (`words[0]!`) instead of `.at(0)` after the explicit `words.length === 0` early return — strict mode is happy and the control flow stays readable

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Removed unsupported `--reporter=basic` flag from verification command**
- **Found during:** Task 2 GREEN verification step
- **Issue:** The plan's `<verify>` block invoked `vitest run ... --reporter=basic`, which is no longer a valid built-in reporter in Vitest 4.1.0 (it tries to load `basic` as a custom reporter module and crashes with `ERR_LOAD_URL`)
- **Fix:** Ran `pnpm --filter @multica/ui exec vitest run lib/avatar-color.test.ts` (default reporter)
- **Files modified:** none — only the verification command was adjusted; no source change
- **Verification:** Tests reported `Test Files 1 passed (1)`, `Tests 15 passed (15)`
- **Committed in:** N/A — no source change, only the verification command was adapted

**2. [Rule 1 - Bug] Fixed strict-mode `noUncheckedIndexedAccess` violations in extractInitials**
- **Found during:** Task 2 GREEN, post-test typecheck step (`pnpm --filter @multica/ui typecheck`)
- **Issue:** Direct `words[0].charAt(0)` and `words[words.length - 1].charAt(0)` triggered TS2532 ("Object is possibly 'undefined'") because `tsconfig` enables `noUncheckedIndexedAccess`. The plan's reference snippet was written without that flag in mind.
- **Fix:** Hoisted the indexed accesses into `firstWord`/`lastWord` locals with non-null assertions, gated by the existing `words.length === 0` early return. Behavior unchanged — only types narrowed.
- **Files modified:** `packages/ui/lib/avatar-color.ts`
- **Verification:** `pnpm --filter @multica/ui typecheck` clean; root `pnpm typecheck` passes 6/6 packages; all 15 tests still green
- **Committed in:** `8c1113ac` (Task 2 GREEN commit)

---

**Total deviations:** 2 auto-fixed (1 blocking — bad reporter flag in plan script; 1 bug — strict-mode type errors in plan's reference snippet)
**Impact on plan:** Both auto-fixes were necessary mechanical corrections to the plan's reference text. No semantic deviation from the contract — exports, signatures, behaviour, and regression value all match the plan exactly. No scope creep.

## Issues Encountered
None beyond the deviations above. The TDD gate sequence executed cleanly: RED produced the expected `Failed to resolve import "./avatar-color"` error; GREEN produced 15/15 passing assertions and clean typecheck on the first valid run after the `noUncheckedIndexedAccess` fix.

## User Setup Required
None — pure utility module, no environment variables, no external services, no new runtime dependencies.

## Next Phase Readiness
- **Plan 02-04 (AvatarInitial component) is unblocked.** It can `import { AVATAR_PALETTE, hashToPaletteIndex, extractInitials } from "@multica/ui/lib/avatar-color"` immediately.
- **Phase 4/5 downstream consumers** (sidebar avatars, Kanban agent avatars) are also unblocked — same import path.
- **No carry-over blockers.** The regression fixture (`hashToPaletteIndex('Stephan') === 0`) provides a permanent algorithm-drift guard for all future refactors.

## TDD Gate Compliance

- **RED gate:** `79d7ca45` — `test(02-01): add failing tests for avatar-color utility (RED)` (Vitest reported `Failed to resolve import "./avatar-color"` — the strongest possible RED signal: file fails to even import)
- **GREEN gate:** `8c1113ac` — `feat(02-01): implement avatar-color utility (djb2 hash + initials + palette)` (Vitest reported `Test Files 1 passed (1)`, `Tests 15 passed (15)`)
- **REFACTOR gate:** Skipped (no separate cleanup needed; the strict-mode fix during GREEN was a correctness fix, not a refactor)

## Self-Check: PASSED

- `packages/ui/lib/avatar-color.ts` — FOUND
- `packages/ui/lib/avatar-color.test.ts` — FOUND
- `packages/ui/package.json` exports `./lib/avatar-color` — FOUND (resolves to `./lib/avatar-color.ts`)
- Commit `79d7ca45` — FOUND in `git log`
- Commit `8c1113ac` — FOUND in `git log`
- Regression value `hashToPaletteIndex('Stephan') === 0` (raw djb2 = 249206168) — VERIFIED via Node REPL and Vitest fixture

---
*Phase: 02-atomic-ui-primitives*
*Completed: 2026-04-25*
