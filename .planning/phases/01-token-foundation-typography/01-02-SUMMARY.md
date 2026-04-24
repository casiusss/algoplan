---
phase: 01-token-foundation-typography
plan: 02
subsystem: ui
tags: [typography, fonts, inter-italic, fontsource, next-font, source-serif-4]

# Dependency graph
requires:
  - phase: 01-token-foundation-typography
    provides: Wave 0 typography E2E scaffold (e2e/typography.spec.ts), token-binding test, FND-02 acceptance test target
provides:
  - Inter italic axis loaded on web (next/font Inter loader with style: ["normal", "italic"])
  - Inter italic axis loaded on desktop (@fontsource-variable/inter/wght-italic.css)
  - Removal of unused Source Serif 4 italic axis on desktop (~30-80kb bundle reduction)
  - Repaired typography E2E assertion (matches @font-face CSS instead of hashed asset URLs)
affects: [phase-02-primitives, display headlines, accent typography, onboarding redesign]

# Tech tracking
tech-stack:
  added: []  # No new dependencies — italic axis is a CSS subpath of an existing package
  patterns:
    - "Use style: ['normal', 'italic'] on next/font Google loaders to enable true italic glyphs (vs synthesized obliques)"
    - "Use @fontsource-variable/<font>/wght-italic.css subpath for italic axis on Vite-bundled apps"
    - "E2E typography assertions should target @font-face CSS, not woff2 URL filenames (next/font hashes them)"

key-files:
  created: []
  modified:
    - apps/web/app/layout.tsx
    - apps/desktop/src/renderer/src/main.tsx
    - e2e/typography.spec.ts

key-decisions:
  - "D-12 implemented PARTIALLY: only Source Serif 4 italic axis removed on desktop. Base axis + --font-serif token KEPT because 14 occurrences of font-serif className remain in packages/views/onboarding/**"
  - "One known regression accepted: step-welcome.tsx line 182 uses 'font-serif italic' which now falls back to synthesized italic Source Serif (visually OK; deferred until onboarding redesign)"
  - "Wave 0 typography E2E assertion was structurally broken (regex on hashed woff2 URLs). Rule 1 fix: replaced with CSS @font-face pattern check"

patterns-established:
  - "Web italic axis: next/font Google loader style: ['normal', 'italic'] param"
  - "Desktop italic axis: subpath import @fontsource-variable/<font>/wght-italic.css"
  - "Typography verification: parse rendered CSS for @font-face declarations rather than asset URLs"

requirements-completed: [FND-02]

# Metrics
duration: ~10min
completed: 2026-04-24
---

# Phase 01 Plan 02: Inter Italic Axis + Partial Source Serif Removal Summary

**Inter italic axis enabled on both apps (next/font + @fontsource-variable subpath); unused Source Serif 4 italic axis dropped from desktop while preserving the base axis for onboarding consumers**

## Performance

- **Duration:** ~10 min execution + ~7 min infrastructure (pnpm install, Playwright Chromium download)
- **Started:** 2026-04-24T01:18:00Z (approx)
- **Completed:** 2026-04-24T01:24:00Z (approx)
- **Tasks:** 3 (all completed atomically)
- **Files modified:** 3 (web layout, desktop renderer entry, E2E spec)

## Accomplishments

- **Web (Task 2.1):** Added `style: ["normal", "italic"]` to the `Inter` next/font loader in `apps/web/app/layout.tsx`. Verified via the typography E2E that an `@font-face { font-family: Inter; ...; font-style: italic; ... }` block is now emitted in the route's CSS bundles.
- **Desktop (Task 2.2):** Added `import "@fontsource-variable/inter/wght-italic.css"` to `apps/desktop/src/renderer/src/main.tsx`; removed the unused `import "@fontsource-variable/source-serif-4/wght-italic.css"` import. Updated the comment block above the Source Serif import to document the planner-accepted regression.
- **Verification (Task 2.3):** Repaired the broken Wave 0 typography spec assertion (regex on hashed woff2 URLs could never match) and confirmed both `e2e/typography.spec.ts` and `packages/views/styles/token-binding.test.tsx` are green.

## Task Commits

Each task was committed atomically (--no-verify per parallel executor mandate):

1. **Task 2.1: Add Inter italic axis to web font loader** — `d72606fe` (feat)
2. **Task 2.2: Add Inter italic, drop unused Source Serif italic on desktop** — `d8d3dc7d` (feat)
3. **Task 2.3: Repair typography E2E assertion** — `fdf499b4` (fix, deviation Rule 1)

(Plan metadata commit will be made after this SUMMARY is written.)

## Files Created/Modified

- `apps/web/app/layout.tsx` — Inter loader now passes `style: ["normal", "italic"]`. All other loaders (Geist_Mono, Source_Serif_4) and the `<html suppressHydrationWarning>` attribute UNCHANGED.
- `apps/desktop/src/renderer/src/main.tsx` — Added Inter italic CSS subpath import; removed Source Serif 4 italic CSS subpath import; updated documentation comment block. Final import order:
  ```
  import "@fontsource-variable/inter";
  import "@fontsource-variable/inter/wght-italic.css";
  import "@fontsource-variable/source-serif-4";
  import "@fontsource/geist-mono/400.css";
  import "@fontsource/geist-mono/700.css";
  ```
- `e2e/typography.spec.ts` — Replaced regex-on-URL assertion with CSS-corpus `@font-face` block detection, switched `waitForTimeout(1500)` to `waitForLoadState("networkidle")` for deterministic CSS chunk capture.

## Confirmations of Constraints

- `apps/web/app/layout.tsx` Source_Serif_4 loader UNCHANGED (still loads italic axis on web — landing pages depend on it per D-12).
- `apps/desktop/src/renderer/src/globals.css` `--font-serif` token UNCHANGED (planner deviation from CONTEXT D-12 — onboarding requires it).
- `apps/desktop/package.json` `@fontsource-variable/source-serif-4` dependency UNCHANGED (the package is still used as the base axis).
- `pnpm-lock.yaml` UNCHANGED.
- `pnpm --filter @multica/web typecheck` exit 0.
- `pnpm --filter @multica/desktop run typecheck` exit 0.

## Decisions Made

- **D-12 partial implementation (planner-revised, executor-confirmed):** Removed only the unused Source Serif 4 italic axis. The base axis import + `--font-serif` token + `@fontsource-variable/source-serif-4` dependency all REMAIN because `packages/views/onboarding/**` actively consumes `font-serif` (14 occurrences across 7 files). Removing the base import would render onboarding headlines in Times New Roman fallback (RESEARCH §Pitfall 7).
- **Accepted regression (one line):** `packages/views/onboarding/step-welcome.tsx:182` uses `font-serif italic` and now falls back to synthesized italic Source Serif on desktop. This is visually acceptable and avoids dragging the entire italic axis into the desktop bundle. Will be retired during onboarding redesign (Phase 6 or later).
- **Test repair scope:** Wave 0 scaffold's URL-regex strategy could not work with `next/font`'s hashed asset URLs. Replacing it with a CSS @font-face check is required to make FND-02 verifiable.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Playwright Chromium browser not installed**

- **Found during:** Task 2.3 (running `pnpm exec playwright test e2e/typography.spec.ts`)
- **Issue:** Browser executable missing at `~/Library/Caches/ms-playwright/chromium_headless_shell-1208/...`. Playwright reported: `browserType.launch: Executable doesn't exist`.
- **Fix:** Ran `pnpm exec playwright install chromium`.
- **Files modified:** None (only `~/Library/Caches/ms-playwright/` populated).
- **Verification:** Re-ran spec; browser launched successfully.
- **Committed in:** N/A (cache-only side effect, no repo change).

**2. [Rule 1 - Bug] Wave 0 typography spec assertion was structurally broken**

- **Found during:** Task 2.3 (E2E test failed with `0 italic-matching URLs out of 78 responses` even though Inter italic CSS was correctly emitted)
- **Issue:** `next/font` strips font names from emitted woff2 asset URLs (e.g., `8c6f6f0aec3d26a6.12az.vxvg0uok.woff2`) — the original regex `/Inter.*italic/i` could NEVER match, regardless of whether the italic axis was loaded. Root cause inspection of `/_next/static/chunks/[root-of-the-server]__*.css` confirmed Inter italic `@font-face` blocks were being correctly emitted by my Task 2.1 change.
- **Fix:** Replaced URL-based assertion with CSS-corpus inspection. The new spec fetches every CSS chunk loaded on `/`, concatenates them, and matches a flexible `@font-face { ...font-family: Inter ... font-style: italic ... }` regex (in either field order).
- **Files modified:** `e2e/typography.spec.ts`.
- **Verification:** Test now passes (957 ms). With Task 2.1 reverted (mental experiment), the assertion would correctly fail because no Inter+italic `@font-face` block exists — RED/GREEN semantics preserved.
- **Committed in:** `fdf499b4` (Task 2.3 commit).

---

**Total deviations:** 2 auto-fixed (1 blocking dependency install, 1 broken Wave 0 scaffold assertion)
**Impact on plan:** No scope creep. The Wave 0 scaffold repair was necessary to make FND-02 verifiable; the Playwright install was infrastructure setup. Both are downstream of legitimate "make it actually work" requirements.

## Issues Encountered

- The first `pnpm install` was needed because the worktree was reset to base commit before installation. Handled in setup phase.
- `apps/web/next-env.d.ts` was modified by Next.js when `pnpm dev:web` started (`./.next/types/routes.d.ts` → `./.next/dev/types/routes.d.ts`). Restored via `git checkout` to keep this plan's commits scoped to typography work — the file regenerates on each dev start and is not part of FND-02.

## Verification Results

| Check | Result | Notes |
|-------|--------|-------|
| `pnpm --filter @multica/web typecheck` | PASS | exit 0 |
| `pnpm --filter @multica/desktop run typecheck` | PASS | exit 0 (both node + web targets) |
| `pnpm exec playwright test e2e/typography.spec.ts` | PASS | 1/1, 957ms |
| `pnpm --filter @multica/views exec vitest run styles/token-binding.test.tsx` | PASS | 10/10 |
| `grep '@fontsource-variable/inter/wght-italic.css' apps/desktop/src/renderer/src/main.tsx` | found (1) | |
| `grep '@fontsource-variable/source-serif-4/wght-italic.css' apps/desktop/src/renderer/src/main.tsx` | not found (0) | |
| `grep '@fontsource-variable/source-serif-4' apps/desktop/src/renderer/src/main.tsx` | found (1, base only) | |
| Inspection of `apps/desktop/src/renderer/src/globals.css --font-serif` | UNCHANGED | Onboarding still uses Source Serif |
| Inspection of `apps/desktop/package.json @fontsource-variable/source-serif-4` | UNCHANGED | |
| Inspection of `pnpm-lock.yaml` | UNCHANGED | |

### Manual Desktop Italic Check

**Status:** NOT executed in this run (executor cannot launch Electron interactively; planner marked as manual smoke per VALIDATION.md).

The static evidence supports a PASS prediction: the renderer entry imports `@fontsource-variable/inter/wght-italic.css`, which Vite bundles into the renderer's CSS — same pattern as the existing `@fontsource-variable/inter` base import that was already verified working in production. A human running `pnpm dev:desktop` and executing the planned DevTools probe (`document.createElement('em')`) should see Inter Variable resolve with `font-style: italic`. Recommend the orchestrator/wave-verifier flag this for the next manual desktop pass.

### Manual Onboarding Regression Check

**Status:** NOT executed in this run (same reason — requires Electron). Static evidence: `--font-serif` token + `@fontsource-variable/source-serif-4` base import both retained in `main.tsx`/`globals.css`. Onboarding's `font-serif` className will continue resolving to Source Serif 4 Variable. The only behavioral change is that `font-serif italic` (one line in `step-welcome.tsx:182`) will now use synthesized italic instead of true italic — a visual delta, not a font-stack regression.

## User Setup Required

None — no external service configuration required.

## Deferred Items

The STATE.md "Source_Serif_4 removal audit" item is **NOT closed** by this plan. Only the unused italic axis is removed on desktop. Full removal of the Source Serif 4 dependency + `--font-serif` token + the 14 onboarding `font-serif` consumers is blocked until onboarding redesign (likely Phase 6 AUTH/onboarding work or a dedicated typography polish phase). Recommend the orchestrator carry this item forward in STATE.md unchanged.

## Next Phase Readiness

- Phase 2 components (TagChip, AccentBar, display headlines) can now use Inter italic with confidence — both apps load the true italic axis.
- E2E typography spec is now a reliable acceptance gate for any future typography changes (e.g., adding Inter weight axes, Phase 7 brand reskin).
- One known visual regression on desktop only: `step-welcome.tsx:182` synthesized italic. Document for design review pre-Phase-6.

---
*Phase: 01-token-foundation-typography*
*Plan: 02*
*Completed: 2026-04-24*

## Self-Check: PASSED

Verified:
- apps/web/app/layout.tsx: FOUND, Inter loader contains `style: ["normal", "italic"]` (line 22)
- apps/desktop/src/renderer/src/main.tsx: FOUND, contains `@fontsource-variable/inter/wght-italic.css` and lacks `@fontsource-variable/source-serif-4/wght-italic.css`
- e2e/typography.spec.ts: FOUND, asserts on @font-face CSS
- Commit d72606fe: FOUND in git log
- Commit d8d3dc7d: FOUND in git log
- Commit fdf499b4: FOUND in git log
