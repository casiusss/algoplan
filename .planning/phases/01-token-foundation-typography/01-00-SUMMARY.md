---
phase: 01-token-foundation-typography
plan: 00
subsystem: testing
tags: [tokens, typography, dark-mode, fouc, test-scaffolds, nyquist-wave-0, vitest, playwright]

# Dependency graph
requires: []
provides:
  - Vitest token-binding smoke test (className wiring contract for FND-01)
  - Playwright theme-toggle E2E spec (.dark class + multica_theme storage contract for FND-03)
  - Playwright typography E2E spec (Inter italic woff2 network contract for FND-02)
  - Manual desktop FOUC acceptance recipe (5 numbered tests + sign-off checklist)
  - Hardcoded-color grep helper script (one-shot migration verification)
affects: [01-01-tokens, 01-02-typography, 01-03-theme-fouc, 01-04-violation-migration]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Wave-0 RED-first scaffolds — every Phase 1 implementation task can <verify> against a pre-existing automated test
    - className-only Vitest smoke (jsdom can't compile Tailwind; real OKLCH check moves to E2E)
    - Network-response capture E2E pattern (page.on response + URL regex match)

key-files:
  created:
    - packages/views/styles/token-binding.test.tsx
    - e2e/theme-toggle.spec.ts
    - e2e/typography.spec.ts
    - apps/desktop/scripts/manual-fouc-check.md
    - scripts/grep-hardcoded-colors.sh
  modified: []

key-decisions:
  - "Token-binding test placed in packages/views/styles/ (not packages/ui/) because packages/ui has zero Vitest infrastructure today (per plan objective)"
  - "bg-highlight included in token-binding probes per planner decision Q3a (resolved during planning, locked in plan frontmatter)"
  - "Typography spec injects an inline <em> as the italic-axis trigger until Phase 2 ships real italic headlines"
  - "Grep script intentionally lacks an allowlist (per CONTEXT D-19 — no CI rule); reviewer visually confirms documented exceptions"

patterns-established:
  - "Wave-0 scaffolds-first: planner's <verify> blocks in downstream plans can reference these files by name without 'MISSING' placeholders"
  - "Two-tier color verification: Vitest smoke for className wiring (jsdom) + Playwright getComputedStyle for OKLCH resolution (Chromium)"
  - "Storage-key contract (multica_theme) carried forward from RBR-05 — explicitly asserted in E2E to detect Phase 3 next-themes config drift"

requirements-completed: [FND-01, FND-02, FND-03]

# Metrics
duration: 5min
completed: 2026-04-24
---

# Phase 1 Plan 00: Wave 0 Test Scaffolds Summary

**Five RED-state test scaffolds (Vitest + Playwright + manual recipe + grep helper) created to satisfy the Phase 1 Nyquist validation contract — downstream Plans 01-04 can now `<verify>` against existing automated tests instead of MISSING placeholders.**

## Performance

- **Duration:** ~5 min
- **Started:** 2026-04-24T23:09:57Z
- **Completed:** 2026-04-24T23:14:42Z (approx)
- **Tasks:** 5 / 5 completed
- **Files created:** 5
- **Files modified:** 0

## Accomplishments

- `packages/views/styles/token-binding.test.tsx` — 10-case Vitest smoke (9 className probes + 1 surface tokens block) green at creation; covers bg-tag-p0..p3, text-tag-p0..p3-foreground, bg-highlight, plus canonical surface tokens
- `e2e/theme-toggle.spec.ts` — 3 Playwright tests for FND-03 (`.dark` class flips body bg, flips multiple surfaces, multica_theme localStorage contract)
- `e2e/typography.spec.ts` — 1 Playwright test for FND-02 web Inter italic axis (network capture + URL regex match against `/Inter.*italic/i`)
- `apps/desktop/scripts/manual-fouc-check.md` — 5-test manual recipe with failure-mode table and sign-off checklist for Plan 03 SUMMARY appendix
- `scripts/grep-hardcoded-colors.sh` — executable one-shot grep helper, exits 1 on hardcoded Tailwind palette classes in `packages/views` + `packages/ui`

## Task Commits

Each task was committed atomically with `--no-verify` (worktree mode — orchestrator validates hooks once after all wave agents complete):

1. **Task 0.1: token-binding Vitest smoke test** — `22c4c07d` (test)
2. **Task 0.2: theme-toggle Playwright E2E** — `31b774bf` (test)
3. **Task 0.3: typography Playwright E2E** — `d1f666d5` (test)
4. **Task 0.4: desktop FOUC manual recipe** — `ffcf98c4` (docs)
5. **Task 0.5: hardcoded-color grep helper** — `55ad4ec7` (chore)

## Files Created/Modified

- `packages/views/styles/token-binding.test.tsx` — Vitest jsdom smoke test asserting required className strings (bg-tag-p0..p3, text-tag-p0..p3-foreground, bg-highlight, semantic surface tokens) are reachable on rendered elements. New `styles/` subdirectory under `packages/views/`.
- `e2e/theme-toggle.spec.ts` — Playwright spec with 3 tests targeting `/login`. Asserts (a) `.dark` class on `<html>` flips `body` background-color, (b) `.dark` flips multiple semantic surfaces (body+html), (c) localStorage write under `multica_theme` key persists.
- `e2e/typography.spec.ts` — Playwright spec capturing all `page.on("response")` URLs after navigating `/` and injecting an `<em>` italic trigger. Asserts >= 1 response URL matches `/Inter.*italic/i`.
- `apps/desktop/scripts/manual-fouc-check.md` — Operator-readable markdown with pre-conditions, 5 numbered test procedures, failure-mode mapping table, and sign-off checklist. Used after Plan 03 ships the inline FOUC `<script>`.
- `scripts/grep-hardcoded-colors.sh` — Executable bash script (`set -euo pipefail`). Greps for `\b(text|bg|border|ring|fill|stroke|...)-(red|blue|yellow|green|...)-[0-9]+` in `packages/views` + `packages/ui`. Exits 1 on hits with remediation hint.

## Expected RED States (Wave 0 Contract)

These are intentional, not failures — they signal what downstream plans must flip to GREEN:

| Scaffold | Pre-Wave-0 State | Flips GREEN After |
|---|---|---|
| `packages/views/styles/token-binding.test.tsx` | GREEN at creation (className strings are static) | n/a — stays GREEN; companion is the grep script |
| `e2e/typography.spec.ts` | RED (Inter loader missing italic axis) | Plan 02 (Typography) ships `style: ["normal", "italic"]` on next/font Inter loader |
| `e2e/theme-toggle.spec.ts` | DELTA-passes today on legacy palette; multica_theme assertion passes too (jsdom write works against any storage backend) | Stays GREEN after Plan 01/03 with stronger color delta |
| `apps/desktop/scripts/manual-fouc-check.md` | n/a — manual recipe (no automated state) | Manually executed after Plan 03 ships inline FOUC `<script>` |
| `scripts/grep-hardcoded-colors.sh` | RED (5+ violation lines in packages/views/issues/components/agent-transcript-dialog.tsx and others) | Plan 04 (Violation Migration) migrates 22 violations across 8 files |

## Decisions Made

- **Token-binding test location:** `packages/views/styles/` not `packages/ui/styles/__tests__/` — `packages/ui` has no Vitest config or test deps installed; adding them would pollute Plan 01 with unrelated infrastructure. Plan 01 frontmatter and 01-VALIDATION.md row 1-01-01 explicitly endorse this path.
- **`bg-highlight` token included in probes:** Per planner decision Q3a (Plan 01 will add `--highlight` token; Wave 0 asserts the className wiring is greppable from day one).
- **No allowlist file for grep script:** Per CONTEXT D-19, no CI enforcement; the script is one-shot. Documented exceptions live in the script header for reviewer reference.
- **Inline `<em>` injection in typography spec:** Phase 1 has no italic content yet; the spec injects an `<em>` element to force the italic axis to be loaded. Phase 2 (italic headlines) may relax this hack.

## Deviations from Plan

None — plan executed exactly as written. All 5 task `<action>` blocks contained verbatim file content; no Rule 1-4 deviations triggered. No CLAUDE.md violations encountered (test files only; no production code touched, no package boundaries crossed, no hardcoded colors introduced).

## Issues Encountered

- **`pnpm --filter @multica/views exec vitest run` failed initially with `Command "vitest" not found`** — root cause: worktree had no `node_modules` after the worktree branch was reset to the correct base. Resolved by running `pnpm install` once. Test then passed (10/10).
- **Worktree branch was created from an older base** (`6107211a` instead of expected `245a8818`). Hard-reset to the correct base per `<worktree_branch_check>` protocol. No data loss (worktree was newly created with no work).

## User Setup Required

None — Wave 0 scaffolds are pure test files + a manual recipe + a shell script. No external services, no environment variables.

## Next Phase Readiness

**Wave 0 complete.** Downstream Phase 1 plans (01–04) can now reference these files by name in their `<verify>` blocks without "MISSING — Wave 0 must create..." placeholders:

- **Plan 01 (Tokens):** uses `pnpm --filter @multica/views exec vitest run styles/token-binding.test.tsx` (already GREEN; stays GREEN as token *names* don't change)
- **Plan 02 (Typography):** uses `pnpm exec playwright test e2e/typography.spec.ts` (currently RED; Plan 02's italic-axis loader change flips it GREEN)
- **Plan 03 (Theme + FOUC):** uses `pnpm exec playwright test e2e/theme-toggle.spec.ts` for automated theme-toggle delta + manual `apps/desktop/scripts/manual-fouc-check.md` for desktop FOUC perceptual check
- **Plan 04 (Violation Migration):** uses `bash scripts/grep-hardcoded-colors.sh` for the migration completion gate (currently RED with 5+ violation lines visible; flips GREEN after migration)

No blockers. No additional test infrastructure needed. The `nyquist_compliant: true` flag in `01-VALIDATION.md` frontmatter can be set after this plan's commit (orchestrator territory — not modified here per parallel-execution rules).

## Self-Check: PASSED

All claimed files exist on disk; all claimed commits exist in git log:

- FOUND: `packages/views/styles/token-binding.test.tsx`
- FOUND: `e2e/theme-toggle.spec.ts`
- FOUND: `e2e/typography.spec.ts`
- FOUND: `apps/desktop/scripts/manual-fouc-check.md`
- FOUND: `scripts/grep-hardcoded-colors.sh` (executable)
- FOUND: commit `22c4c07d` (Task 0.1)
- FOUND: commit `31b774bf` (Task 0.2)
- FOUND: commit `d1f666d5` (Task 0.3)
- FOUND: commit `ffcf98c4` (Task 0.4)
- FOUND: commit `55ad4ec7` (Task 0.5)

---
*Phase: 01-token-foundation-typography*
*Plan: 00 (Wave 0 scaffolds)*
*Completed: 2026-04-24*
