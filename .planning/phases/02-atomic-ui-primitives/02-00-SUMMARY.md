---
phase: 02-atomic-ui-primitives
plan: 00
subsystem: testing
tags: [vitest, jsdom, testing-library, jest-dom, react-testing, base-ui]

# Dependency graph
requires:
  - phase: 01-token-foundation-typography
    provides: Tokens + monorepo conventions; this plan establishes test infra inside packages/ui without touching tokens
provides:
  - Vitest + jsdom test runner wired into packages/ui (script + 6 catalog devDeps)
  - vitest.config.ts byte-equal to packages/views (jsdom env, plugin-react, setup file, glob)
  - test/setup.ts byte-equal to packages/views (jest-dom matchers + matchMedia/ResizeObserver/elementFromPoint/memory-localStorage shims)
  - Wave 0 smoke suite proving all four shims + jest-dom matchers function in jsdom
affects:
  - 02-01-button-primitives
  - 02-02-form-primitives
  - 02-03-overlay-primitives
  - 02-04-data-display-primitives
  - 02-05-navigation-primitives

# Tech tracking
tech-stack:
  added:
    - vitest@^4.1.0 (catalog ref)
    - jsdom@^29.0.1 (catalog ref)
    - "@vitejs/plugin-react@^6.0.1 (catalog ref)"
    - "@testing-library/react@^16.3.2 (catalog ref)"
    - "@testing-library/jest-dom@^6.9.1 (catalog ref)"
    - "@testing-library/user-event@^14.6.1 (catalog ref)"
  patterns:
    - "Mirror-don't-abstract: byte-equal copy of packages/views test infra; PATTERNS.md classifies both files as 'exact' analogs and explicitly says 'duplicating 63 lines beats over-abstracting before the second consumer materializes'"
    - "Wave 0 smoke pattern: tiny test file proves infra is wired before first real component test arrives; can be deleted once Wave 1 component tests land"
    - "Catalog-only deps for shared test stacks: every new test devDep must already exist in pnpm-workspace.yaml catalog (no literal version strings introduced)"

key-files:
  created:
    - packages/ui/vitest.config.ts
    - packages/ui/test/setup.ts
    - packages/ui/test/smoke.test.ts
  modified:
    - packages/ui/package.json
    - pnpm-lock.yaml

key-decisions:
  - "Add Wave 0 smoke test (test/smoke.test.ts) instead of relying on `--passWithNoTests`: smoke test exercises every shim + jest-dom matcher, providing a regression net for the test infra itself. Vitest 4 exits 1 when no test files are found (behavior change vs Vitest 3); a smoke file is cleaner than a CLI flag for the long-term."
  - "Mirror packages/views verbatim — do NOT abstract into a shared test-config package. PATTERNS.md flags premature abstraction as a Phase 2 anti-pattern; we'll revisit if a third consumer (e.g., apps/storybook) ever needs the same infra."

patterns-established:
  - "packages/ui test infra blueprint: vitest.config.ts (12 lines) + test/setup.ts (63 lines) + test/smoke.test.ts (Wave 0 only). Future packages adding test infra should mirror this exact triple."
  - "Smoke test contract: every shim added to setup.ts gets a corresponding assertion in smoke.test.ts. If smoke breaks, infra changed."

requirements-completed: [UI-01, UI-02, UI-03, UI-04]

# Metrics
duration: 4min
completed: 2026-04-25
---

# Phase 02 Plan 00: Test Infrastructure for packages/ui Summary

**Vitest + jsdom + Testing Library wired into packages/ui via byte-equal mirror of packages/views, plus 6-test smoke suite proving all shims and jest-dom matchers function**

## Performance

- **Duration:** 4 min (3m 46s)
- **Started:** 2026-04-25T10:44:12Z
- **Completed:** 2026-04-25T10:47:58Z
- **Tasks:** 2
- **Files modified:** 5 (3 created, 2 updated)

## Accomplishments

- `pnpm --filter @multica/ui test` now runs Vitest 4.1 cleanly (6 passed, 0 failed)
- All 6 test devDependencies added with literal `"catalog:"` refs (no new version strings introduced)
- vitest.config.ts and test/setup.ts byte-equal to packages/views (verified by node script)
- Smoke suite verifies jsdom + matchMedia + ResizeObserver + elementFromPoint + memory-localStorage + jest-dom matchers all wire correctly through setup.ts
- Root `pnpm typecheck` still passes across all 6 packages

## Task Commits

Each task was committed atomically:

1. **Task 1: Add test devDependencies + test script to packages/ui/package.json** — `ecff332a` (chore)
2. **Task 2: Create vitest.config.ts + test/setup.ts + smoke test** — `72c988ed` (test)

## Files Created/Modified

- `packages/ui/package.json` — +1 script (`"test": "vitest run"`) + 6 catalog devDeps (`vitest`, `jsdom`, `@vitejs/plugin-react`, `@testing-library/react`, `@testing-library/jest-dom`, `@testing-library/user-event`)
- `packages/ui/vitest.config.ts` — Vitest config (jsdom env, plugin-react, setup file, `**/*.test.{ts,tsx}` glob); byte-equal to packages/views
- `packages/ui/test/setup.ts` — jest-dom matchers + memory localStorage + matchMedia + ResizeObserver + elementFromPoint shims; byte-equal to packages/views
- `packages/ui/test/smoke.test.ts` — Wave 0 smoke suite (6 tests) proving every piece of setup.ts works end-to-end
- `pnpm-lock.yaml` — pnpm resolved the catalog refs to lockfile hashes

## Decisions Made

- **Wave 0 smoke test instead of `--passWithNoTests` flag:** Vitest 4 exits 1 on "no test files found" (changed from Vitest 3 which exited 0). Plan's verify command assumed Vitest 3 behavior. Choosing a smoke test over a CLI flag keeps `pnpm test` runtime behavior identical to other packages and provides regression coverage for the test infra itself.
- **Did NOT add `--reporter=basic` to test script:** the plan's verify command used `--reporter=basic`, but Vitest 4 removed that reporter. Default reporter works and matches packages/views convention. The byte-equal mirror principle stays intact.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug in Verify Command] `--reporter=basic` no longer exists in Vitest 4**
- **Found during:** Task 2 (smoke test for vitest.config.ts)
- **Issue:** The plan's automated verify command was `pnpm --filter @multica/ui exec vitest run --reporter=basic`. Vitest 4 dropped the `basic` reporter (`Error: Failed to load custom Reporter from basic` / `ERR_LOAD_URL`). Plan was written assuming Vitest 3 reporter naming.
- **Fix:** Ran verify with default reporter (`vitest run`), which is also what the actual `pnpm test` script invokes. Default reporter prints "Test Files: 1 passed" — grep relaxed from `0 passed` to `passed` (more forward-compatible).
- **Files modified:** none — only the verification approach changed.
- **Verification:** Default reporter run prints `Test Files: 1 passed (1) / Tests: 6 passed (6)` and exits 0.
- **Committed in:** Task 2 work (`72c988ed`).

**2. [Rule 1 - Bug in `must_haves.truths`] Vitest 4 exits 1 when no test files found**
- **Found during:** Task 2 (initial smoke run)
- **Issue:** First `vitest run` exited with code 1 and printed `No test files found, exiting with code 1`. Plan's first must-have truth was "Running pnpm --filter @multica/ui test exits 0 with no test files (or reports the smoke test green)". Vitest 4 exit-code behavior changed vs the documented assumption.
- **Fix:** Took the documented alternate path — added `packages/ui/test/smoke.test.ts` (6 assertions, exercises every shim from setup.ts plus jest-dom matchers). Plan explicitly says "(or reports the smoke test green)" so this is in-scope. CI now exits 0 cleanly without needing `--passWithNoTests`.
- **Files modified:** `packages/ui/test/smoke.test.ts` (new file, 41 lines).
- **Verification:** `pnpm --filter @multica/ui test` exits 0 with `Test Files: 1 passed / Tests: 6 passed`. Root `pnpm typecheck` still green.
- **Committed in:** `72c988ed` (Task 2 commit).

---

**Total deviations:** 2 auto-fixed (both Rule 1 — Vitest 4 behavior changes vs the plan's Vitest 3 assumptions).
**Impact on plan:** Zero scope creep. Both deviations resolve the same root cause (plan written against Vitest 3, repo runs Vitest 4) and use the plan's documented alternate path. The smoke test additionally provides regression coverage for the test infra itself, which Wave 1 plans will benefit from.

## Issues Encountered

- Pre-existing peer-dep warning: `electron-vite 5.0.0` declares peer `vite@"^5.0.0 || ^6.0.0 || ^7.0.0"` but repo has `vite@8.0.1`. Unrelated to this plan (already present before any changes); logged here for awareness only. Not in scope per the deviation rules' SCOPE BOUNDARY.

## User Setup Required

None — no external service configuration required. Pure dev-time test infra.

## Threat Model Compliance

All three threats from the plan's `<threat_model>` are mitigated/accepted as planned:

- **T-02-00-01 (Tampering — package.json devDependencies):** Mitigated. All 6 new devDeps use literal `"catalog:"` refs (verified by node script in Task 1 verify); pnpm-lock.yaml records resolved hashes.
- **T-02-00-02 (Information Disclosure — memory storage shim):** Accepted. Shim is jsdom-scoped via `setup.ts`; never reaches production bundle (devDependency only); identical pattern to packages/views/test/setup.ts.
- **T-02-00-03 (Denial of Service — vitest glob):** Accepted. Pattern `**/*.test.{ts,tsx}` matches only inside packages/ui; jsdom + plugin-react are catalog-pinned.

No new threat surface introduced beyond the plan's register.

## Next Phase Readiness

- Wave 1 plans (02-01 through 02-05) can now drop `*.test.tsx` files anywhere under `packages/ui/components/**` and `pnpm --filter @multica/ui test` will discover + run them.
- The smoke test (`packages/ui/test/smoke.test.ts`) can stay or be removed by any Wave 1 plan that adds richer infra coverage. Recommendation: keep it as a regression net until Phase 2 completes; delete in Phase 2 wrap-up plan.
- No blockers for downstream waves. All plan-level success criteria met.

## Self-Check: PASSED

Verified before returning:

- `packages/ui/vitest.config.ts` exists — FOUND (12 lines, byte-equal to packages/views)
- `packages/ui/test/setup.ts` exists — FOUND (63 lines, byte-equal to packages/views)
- `packages/ui/test/smoke.test.ts` exists — FOUND (41 lines, 6 passing tests)
- `packages/ui/package.json` contains `"test": "vitest run"` — FOUND
- `packages/ui/package.json` contains all 6 catalog test devDeps — FOUND
- Commit `ecff332a` (Task 1) — FOUND in git log
- Commit `72c988ed` (Task 2) — FOUND in git log
- `pnpm --filter @multica/ui test` exits 0 — VERIFIED (6 passed)
- Root `pnpm typecheck` exits 0 — VERIFIED (6/6 packages green)

---
*Phase: 02-atomic-ui-primitives*
*Completed: 2026-04-25*
