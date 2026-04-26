---
phase: 07-rebrand-pass
plan: 04
subsystem: auth
tags: [electron, deep-link, oauth, protocol-handler, tdd, atomic-flip]

# Dependency graph
requires:
  - phase: 07-rebrand-pass
    provides: "Plan 07-03 already flipped PROTOCOL='algoplan' const + electron-builder.yml protocols.schemes=[algoplan] + setAsDefaultProtocolClient(PROTOCOL)"
provides:
  - "algoplan:// deep-link scheme atomically wired across web→OS→desktop OAuth handoff"
  - "Pure handleDeepLink extracted to apps/desktop/src/main/deep-link.ts (was inline in index.ts) — unit-testable"
  - "8-test regression-lock contract (deep-link.test.ts) — locks scheme to algoplan, asserts legacy multica:// is REJECTED"
  - "Single source of truth: PROTOCOL_NAME exported from deep-link.ts; index.ts no longer hardcodes the scheme"
affects: [07-05, future-auth-changes, e2e-oauth-tests]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Pure-function extraction with injected dependencies (SendFn) for testability — pattern reusable for other Electron main-process logic"
    - "Atomic D-1 commit constraint: cross-process protocol contract changes (web string + desktop handler) ship in a single commit, overriding standard per-task commit cadence"

key-files:
  created:
    - apps/desktop/src/main/deep-link.ts
    - apps/desktop/src/main/deep-link.test.ts
  modified:
    - apps/web/app/auth/callback/page.tsx
    - apps/web/app/auth/callback/page.test.tsx
    - apps/web/app/(auth)/login/page.tsx
    - apps/web/app/(auth)/login/page.test.tsx
    - apps/desktop/src/main/index.ts
    - apps/desktop/src/renderer/src/App.tsx
    - apps/desktop/src/renderer/src/pages/login.tsx
    - scripts/grep-rebrand.sh
    - .planning/phases/07-rebrand-pass/07-PATTERNS.md
    - .planning/phases/07-rebrand-pass/deferred-items.md

key-decisions:
  - "Atomic single-commit (overrides per-task commits) for the cross-process flip — D-1 constraint is the highest-risk Phase 7 change; non-atomic merge breaks every user's OAuth handoff mid-deploy"
  - "Extracted handleDeepLink to a pure function with injected SendFn callback instead of mocking electron BrowserWindow — keeps Vitest run dependency-free"
  - "deep-link.test.ts whole-file added to grep-rebrand.sh exclusions — every multica:// hit in the file is an INTENTIONAL negative-case fixture (regression-lock that the legacy scheme is REJECTED)"
  - "RED+GREEN landed in same commit (deviating from standard TDD two-commit cadence) — RED-only commit would leave build broken (test imports non-existent ./deep-link module); TDD discipline preserved in execution flow (RED demonstrably failed, GREEN demonstrably passes 8/8)"

patterns-established:
  - "Atomic cross-process protocol flip: when a contract spans deployment boundaries (web bundle + desktop binary), the rename ships as ONE commit; SUMMARY explicitly flags 'ATOMIC FLIP' and surfaces the production-user reinstall warning"
  - "Pure-function extraction from Electron main process: side-effecting handler becomes (input, sendFn) → void; index.ts becomes a thin wrapper that binds mainWindow.webContents.send (or null) at call time"

requirements-completed: [RBR-03]

# Metrics
duration: 6min
completed: 2026-04-26
---

# Phase 07 Plan 04: ATOMIC FLIP — multica:// → algoplan:// deep-link scheme + TDD'd handleDeepLink extraction

**Atomic single-commit flip of the OAuth deep-link scheme across web callback, desktop main process, and renderer comments — plus extraction of handleDeepLink to a pure, unit-testable module with an 8-test regression-lock contract that asserts legacy multica:// URLs are REJECTED.**

## ATOMIC FLIP

> **Single commit `ce5dc285`** carries both ends of the OAuth deep-link contract. Any non-atomic merge (web shipped without desktop, or vice versa) would break web→desktop login for every user mid-update.
>
> **Contract surface (locked to algoplan:// in this commit):**
> - Web emits: `algoplan://auth/callback?token=<jwt>` (callback/page.tsx + login/page.tsx)
> - Desktop registers: `algoplan` scheme (07-03's electron-builder.yml + setAsDefaultProtocolClient)
> - Desktop parses: PROTOCOL_NAME = "algoplan" (deep-link.ts)
> - Test asserts NEGATIVE: `multica://auth/callback?token=jwt` → `send` NOT called (deep-link.test.ts:27-30)

## Production-user warning (release-comm flag)

> **Verbatim, for stakeholder action:**
>
> *Production users of the existing Electron app must reinstall to get the algoplan:// scheme registered. Until reinstall, web→desktop OAuth handoff fails — the user sees "Opening AlgoPlan" but no app opens. Workaround: use web app login flow exclusively until users reinstall.*

This message MUST land in the v0.4.0 release notes alongside the Plan 07-03 + 07-04 ship.

## Same-release coupling (Plan 07-03 + Plan 07-04)

This plan + Plan 07-03 ship together. Both PRs (or single combined PR) MUST be in the same release. Plan 07-03 already flipped `electron-builder.yml protocols.schemes=[algoplan]` + `PROTOCOL='algoplan'` const + `setAsDefaultProtocolClient(PROTOCOL)`; Plan 07-04 flips the consumer side (web URLs) AND extracts the parser. Either alone leaves the OAuth handoff broken.

## Performance

- **Duration:** ~6 min
- **Started:** 2026-04-26T13:49:22Z
- **Completed:** 2026-04-26T13:55:30Z
- **Tasks:** 3 (1 web callback flip, 1 web login flip, 1 TDD extraction + comment flips)
- **Files modified:** 12 (7 production code, 1 new test, 1 modified test, 2 docs, 1 audit script)

## Accomplishments

- Atomic flip of the multica:// → algoplan:// scheme across BOTH web emit sites AND the desktop handler in a single commit (D-1 constraint satisfied)
- handleDeepLink extracted from inline closure in index.ts to a pure function in apps/desktop/src/main/deep-link.ts — index.ts no longer hardcodes the scheme; PROTOCOL_NAME is the SINGLE source of truth
- 8/8 GREEN regression-lock test (deep-link.test.ts) — explicitly asserts legacy `multica://` URLs are REJECTED, locking the scheme to `algoplan://` against accidental rollback
- Rebrand audit dropped from 17 → 0 user-visible Multica leaks (full clean per `bash scripts/grep-rebrand.sh`)
- Web build PASSED (sanity build catches metadata/route errors)

## Task Commits

All three tasks land in **ONE atomic commit** per D-1 (cross-process protocol flip):

1. **Task 1: Flip apps/web/app/auth/callback/page.tsx** — `ce5dc285` (feat)
2. **Task 2: Flip apps/web/app/(auth)/login/page.tsx** — `ce5dc285` (feat)
3. **Task 3: TDD'd handleDeepLink extraction + main/index.ts wiring + renderer comment flips** — `ce5dc285` (feat)

_Note: standard TDD two-commit cadence (RED `test(...)` → GREEN `feat(...)`) was deviated to a single-commit per the D-1 atomic constraint; RED demonstrably failed (transform error: cannot resolve `./deep-link`) before GREEN landed (8/8 passes). See "Deviations from Plan" below._

## Files Created/Modified

**Created:**
- `apps/desktop/src/main/deep-link.ts` — pure handleDeepLink + exported PROTOCOL_NAME = "algoplan"; SendFn injected for testability; documented as SINGLE source of truth for the scheme.
- `apps/desktop/src/main/deep-link.test.ts` — 8-test contract: PROTOCOL_NAME constant, auth:token dispatch, invite:open dispatch, invite-id URL-decode, multica:// REJECTED, unknown hostname silent, malformed URL no-throw, null send no-throw.

**Modified:**
- `apps/web/app/auth/callback/page.tsx` — 2 deep-link href flips + "Opening Multica" → "Opening AlgoPlan" + body copy + button label.
- `apps/web/app/auth/callback/page.test.tsx` — fixture `test@multica.ai` → `test@algoplan.ai`.
- `apps/web/app/(auth)/login/page.tsx` — 2 deep-link href flips + same 3 label flips on the alternate "Open in Desktop" handoff path.
- `apps/web/app/(auth)/login/page.test.tsx` — regression assertion `multica://auth/callback?token=handoff-jwt` → `algoplan://...`, button-name `Open Multica Desktop` → `Open AlgoPlan Desktop`, comment update.
- `apps/desktop/src/main/index.ts` — removed inline 32-line handleDeepLink + `const PROTOCOL = "algoplan"`; replaced with import from `./deep-link` + a 6-line wrapper that binds mainWindow.webContents.send (or null if window not yet ready) at call time.
- `apps/desktop/src/renderer/src/App.tsx` — flipped 2 JSDoc-comment example URLs (`multica://invite/<id>`, `multica://auth/callback?token=...`).
- `apps/desktop/src/renderer/src/pages/login.tsx` — flipped 1 JSDoc-comment example URL.
- `scripts/grep-rebrand.sh` — added `deep-link.test.ts` to whole-file exclusion (every "multica" hit there is intentional negative-case fixture).
- `.planning/phases/07-rebrand-pass/07-PATTERNS.md` — §2 documents the new exclusion in lock-step per maintenance protocol.
- `.planning/phases/07-rebrand-pass/deferred-items.md` — logged 6 pre-existing login.test.tsx NavigationProvider failures (out of scope; baseline reproducible).

## Patterns Reference Compliance

§1 rows checked off in this plan (per 07-PATTERNS.md ownership):

- ✅ `apps/web/app/auth/callback/page.tsx` deep-link href (2 sites) — multica:// → algoplan://
- ✅ `apps/web/app/auth/callback/page.tsx` `<CardTitle>` — Opening Multica → Opening AlgoPlan
- ✅ `apps/web/app/auth/callback/page.tsx` body copy — Multica desktop app → AlgoPlan desktop app
- ✅ `apps/web/app/auth/callback/page.tsx` button label — Open Multica Desktop → Open AlgoPlan Desktop
- ✅ `apps/desktop/electron-builder.yml` `protocols.schemes` — owned by 07-03 (already flipped); contract verified consumer-side here
- ✅ `apps/web/app/(auth)/login/page.tsx` deep-link emit (2 sites) — multica:// → algoplan:// (called out in plan body Task 2)

§4 test edits performed:
- ✅ `apps/web/app/auth/callback/page.test.tsx` — algoplan:// fixture (no live multica:// assertion remaining)
- ✅ `apps/web/app/(auth)/login/page.test.tsx:184` — algoplan:// regression assertion locked
- ✅ NEW `apps/desktop/src/main/deep-link.test.ts` — 8/8 GREEN

## Decisions Made

- **Atomic single-commit overrides per-task commits.** Plan body explicitly flagged D-1 atomicity. Per CLAUDE.md "no compatibility layers, no preserving old paths" — committing tasks separately would create a window where web emits `algoplan://` but desktop still parses `multica://` (or vice versa), breaking every user's OAuth handoff. Single commit `ce5dc285` keeps the contract atomic.
- **PROTOCOL_NAME is the single source of truth.** index.ts no longer carries `const PROTOCOL = "algoplan"`; the constant lives in deep-link.ts and is consumed via named re-import (`PROTOCOL_NAME as PROTOCOL`). Future scheme changes touch ONE file.
- **handleDeepLink is pure (SendFn injected).** No mocking of Electron's BrowserWindow needed in tests; test passes a `vi.fn()` directly. Pattern reusable for other Electron main-process side-effects.
- **deep-link.test.ts whole-file exclusion in grep-rebrand.sh.** Per maintenance protocol, exclusion AND 07-PATTERNS.md §2 updated in the SAME commit. Whole-file exclusion (vs. line-by-line regex) chosen because the test's purpose is to lock the negative case — every `multica` hit there is intentional.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] TDD RED+GREEN merged into single atomic commit**
- **Found during:** Task 3 (TDD extraction), commit-time
- **Issue:** Standard TDD cadence is RED `test(...)` commit → GREEN `feat(...)` commit. But the plan's atomic D-1 constraint requires Tasks 1+2+3 to land in a SINGLE commit. A RED-only commit would also leave the build broken: `deep-link.test.ts` imports `./deep-link` which doesn't exist until GREEN.
- **Fix:** Combined RED+GREEN into the single atomic commit. TDD discipline preserved in execution flow — RED demonstrably failed (vitest reports `transform 8ms, tests 0`) BEFORE writing `deep-link.ts`; GREEN demonstrably passes 8/8 AFTER writing it. The decision is documented here so a future reviewer can re-run the RED phase by deleting deep-link.ts and watching the test suite collapse.
- **Files modified:** apps/desktop/src/main/deep-link.test.ts (RED), apps/desktop/src/main/deep-link.ts (GREEN), apps/desktop/src/main/index.ts (wiring)
- **Verification:** vitest 8/8 GREEN; node typecheck clean
- **Committed in:** `ce5dc285` (atomic flip commit)

**2. [Rule 2 - Missing Critical] Added desktop-renderer JSDoc comment flip (login.tsx) and fixture-email flip (callback test)**
- **Found during:** Task 1 + Task 3 (rebrand audit baseline shows 17 leaks; plan body called out only deep-link strings + visible labels)
- **Issue:** Two extra hits in baseline audit not explicitly listed in plan tasks: `apps/desktop/src/renderer/src/pages/login.tsx:10` JSDoc comment referencing `multica://`, and `apps/web/app/auth/callback/page.test.tsx:16` test fixture `email: "test@multica.ai"`. Leaving these would block "0 leaks" success criterion.
- **Fix:** Flipped both as part of the atomic commit. Login.tsx comment → `algoplan://`; fixture email → `test@algoplan.ai` (matches login.test.tsx convention).
- **Files modified:** apps/desktop/src/renderer/src/pages/login.tsx, apps/web/app/auth/callback/page.test.tsx
- **Verification:** `bash scripts/grep-rebrand.sh` → 0 leaks
- **Committed in:** `ce5dc285`

**3. [Rule 3 - Blocking] Extended grep-rebrand.sh EXCLUDE for deep-link.test.ts**
- **Found during:** Task 3 verification (post-extraction audit ran)
- **Issue:** New regression-lock test contains 3 intentional `multica` hits (test description, negative-case URL fixture, descriptive title). Audit reported them as leaks because the existing `not multica` regex pattern doesn't catch the quoted-form `not 'multica'` or the bare URL fixture. Without an exclusion, every future audit run reports false positives.
- **Fix:** Added whole-file exclusion `grep -v "deep-link\.test\.ts"` to grep-rebrand.sh AND documented the exclusion in 07-PATTERNS.md §2 in lock-step (per maintenance protocol). The test file's entire purpose is locking the negative case — by-line exclusions would be brittle.
- **Files modified:** scripts/grep-rebrand.sh, .planning/phases/07-rebrand-pass/07-PATTERNS.md
- **Verification:** `bash scripts/grep-rebrand.sh` → 0 leaks
- **Committed in:** `ce5dc285`

---

**Total deviations:** 3 auto-fixed (1 Rule 3 TDD-cadence override for atomicity, 1 Rule 2 missing rebrand sites, 1 Rule 3 audit script extension)
**Impact on plan:** All deviations were necessary either for atomic-commit correctness (D-1) or for completeness of the rebrand audit. No scope creep beyond the plan's stated success criteria. The TDD-cadence merge is documented + reproducible.

## Issues Encountered

- **Pre-existing test failures in `apps/web/app/(auth)/login/page.test.tsx`:** 6 of 7 tests fail with `useNavigation must be used within NavigationProvider`. Verified PRE-EXISTING by stashing changes and re-running — same 6 failed/1 passed against baseline. Out of scope per SCOPE BOUNDARY (the LoginPage component requires NavigationProvider context that the test wrapper doesn't supply). Logged to `deferred-items.md`. The 7th test — "mints a token and deep-links to Desktop" — is the only one Plan 07-04 modifies and it passes (algoplan:// assertion green when run in isolation).
- **Pre-existing typecheck error in `apps/desktop/src/renderer/src/components/pageview-tracker.tsx:60:47`:** Already documented in deferred-items.md from Plan 07-00. Does NOT affect main-process code (typecheck:node clean — covers index.ts + deep-link.ts + deep-link.test.ts).

## User Setup Required

None — protocol scheme registration happens automatically on next install of the Electron app via `electron-builder.yml protocols.schemes=[algoplan]` (already shipped in 07-03). Production users with the existing multica:// install must reinstall — see "Production-user warning" above.

## Next Phase Readiness

- ✅ Deep-link contract atomic and locked by regression test
- ✅ Plan 07-05 (test assertion edits + localStorage preservation regression test) is unblocked — all rebrand sites in scope (apart from localStorage keys, which are PRESERVED per D-2)
- ⚠️ Production deployment requires v0.4.0 to ship Plan 07-03 + Plan 07-04 atomically. Stagger ban — both must be in the same release.
- ⚠️ Reinstall comm must accompany the release (verbatim text in the "Production-user warning" section above)

## Self-Check: PASSED

Files exist:
- FOUND: apps/desktop/src/main/deep-link.ts
- FOUND: apps/desktop/src/main/deep-link.test.ts
- FOUND: .planning/phases/07-rebrand-pass/07-04-SUMMARY.md (this file)

Commit exists:
- FOUND: ce5dc285 (atomic flip commit, verified via `git log --oneline -1`)

Verification commands (all GREEN at SUMMARY-write time):
- `bash scripts/grep-rebrand.sh` → "✓ No user-visible 'Multica' references found in scanned targets."
- `pnpm --filter @multica/desktop exec vitest run src/main/deep-link.test.ts` → 8/8 GREEN
- `cd apps/desktop && pnpm exec tsc --noEmit -p tsconfig.node.json --composite false` → clean
- `pnpm --filter @multica/web build` → clean

---
*Phase: 07-rebrand-pass*
*Completed: 2026-04-26*
