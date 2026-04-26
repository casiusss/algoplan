---
phase: 07-rebrand-pass
plan: 05
subsystem: ui
tags: [pwa, manifest, regression-lock, ship-gate, localStorage, brand-assets, og-image]

# Dependency graph
requires:
  - phase: 07-rebrand-pass
    provides: "Plan 07-00 generated all 10 brand assets (favicon.svg/ico, apple-touch-icon, icon-192/512, og-image, desktop icons) and committed them to apps/web/public + apps/desktop/build|resources"
  - phase: 07-rebrand-pass
    provides: "Plans 07-01 → 07-04 swept user-visible Multica strings (views, web app + landing, electron chrome, deep-link scheme)"
provides:
  - "PWA manifest auto-served at /manifest.webmanifest with AlgoPlan name + icons stack"
  - "Full asset stack wired into root layout.tsx metadata (icons, OG image, Twitter image)"
  - "8 source-text regression-lock assertions blocking any future rename of multica:chat:* + multica_token localStorage keys"
  - "Phase 7 ship-gate verdict: 5 of 6 formal checks PASS; Check 3 (pnpm test) reflects pre-existing breakage carried from Phase 6 (deferred)"
affects: [future-rebrand-PRs, future-localStorage-migrations, public-launch-prep]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Source-text regression lock: assert key strings exist verbatim in store source files. Failing on rename catches silent-data-loss bugs that runtime tests cannot (a runtime test would only verify the store reads/writes whatever key it currently uses — tautology)."
    - "PWA manifest via Next.js 16 MetadataRoute.Manifest convention: zero-config head injection, file-based manifest auto-served at /manifest.webmanifest"

key-files:
  created:
    - apps/web/app/manifest.ts
    - packages/core/chat/store.test.ts
    - .planning/phases/07-rebrand-pass/07-05-SUMMARY.md
    - .planning/phases/07-rebrand-pass/07-PHASE-SUMMARY.md
  modified:
    - apps/web/app/layout.tsx
    - packages/core/auth/store.test.ts
    - e2e/auth.spec.ts
    - .planning/phases/07-rebrand-pass/deferred-items.md

key-decisions:
  - "Skipped checkpoint Task 4's user-verify step per orchestrator pre-resolution: executed all 6 ship-gate checks programmatically; produced PASS/FAIL verdict per check. No human-in-the-loop required for Phase 7 close-out."
  - "Source-text assertions (not runtime tests) used for the localStorage regression lock — runtime tests are tautological for this concern; source assertions fail the only PR shape that can cause silent data loss (key rename without migration)."
  - "PWA manifest via Next.js MetadataRoute.Manifest convention — auto-served at /manifest.webmanifest, no manual <link> wiring; theme_color (#05070b) matches viewport.themeColor dark token for chrome-blend on installed PWAs."
  - "Pre-existing 6 login test failures (NavigationProvider context) carried over from Phase 6 are out of Plan 07-05 scope. Verified by re-checkout of Plan 07-04 tip (ce5dc285) showing identical failures. Logged to deferred-items; Phase 7 D-2/D-3/D-4 invariants independently verified by Checks 1, 2, 4, 5, 6."

patterns-established:
  - "localStorage preservation regression lock: any key family persisted in user browsers gets a source-text assertion in its store's test file. Renaming = test fail BEFORE silent data loss merges. See chat/store.test.ts (7 keys + 1 negative) and auth/store.test.ts (1 key + 1 negative)."
  - "Brand asset stack wiring: favicon (SVG primary + ICO auto + PNG fallbacks) + apple-touch-icon + OG image + Twitter image + PWA manifest, all from a single root layout's metadata block."

requirements-completed: [RBR-02, RBR-04, RBR-06]

# Metrics
duration: 7min
completed: 2026-04-26
---

# Phase 07 Plan 05: PWA Manifest + Asset Wiring + localStorage Regression-Lock + 6-Check Ship Gate

**Final wave of Phase 7 rebrand: wired the 10 generated brand assets into apps/web's metadata, added a Next.js 16 PWA manifest, planted source-text regression locks on the multica_token + multica:chat:* localStorage key families, and ran the 6-check ship gate (5 PASS / 1 caveated by pre-existing breakage).**

## Performance

- **Duration:** ~7 min (398 s)
- **Started:** 2026-04-26T13:59:38Z
- **Completed:** 2026-04-26T14:06:16Z
- **Tasks:** 4 (3 auto + 1 checkpoint pre-resolved as automated execution)
- **Files modified:** 4 created + 4 modified = 8 in source tree (excluding plan docs)

## Accomplishments

- **PWA manifest** at `apps/web/app/manifest.ts` (Next.js 16 `MetadataRoute.Manifest`) — auto-served at `/manifest.webmanifest`, confirmed by `pnpm --filter @multica/web build` listing the route in static prerender output. AlgoPlan brand, theme `#05070b` (dark), 192/512 icons + maskable variant for Android adaptive launchers.
- **Asset stack** wired into `apps/web/app/layout.tsx`:
  - `metadata.icons.icon`: `/favicon.svg` (SVG primary) + `/icon-192.png` + `/icon-512.png` (PNG fallbacks)
  - `metadata.icons.apple`: `/apple-touch-icon.png` (180x180)
  - `metadata.icons.shortcut`: `/favicon.svg`
  - `metadata.openGraph.images`: `/og-image.png` (1200x630, alt="AlgoPlan")
  - `metadata.twitter.images`: `/og-image.png`
  - `app/favicon.ico` (multi-size ICO) auto-discovered by Next.js convention — no `<link>` needed
- **localStorage regression locks** (Phase 7 D-2 ship-gate safety net):
  - `packages/core/chat/store.test.ts` (NEW) — 8 it blocks: 7 verbatim-key assertions (`multica:chat:selectedAgentId`, `:activeSessionId`, `:drafts`, `:width`, `:height`, `:expanded`, `:focusMode`) + 1 negative assertion (no `algoplan:chat:` rename)
  - `packages/core/auth/store.test.ts` (extended) — 2 new it blocks: `multica_token` verbatim + no `algoplan_token` rename
  - All 14 tests GREEN (8 chat + 4 existing auth + 2 new auth)
- **e2e/auth.spec.ts** brand assertion `Multica` → `AlgoPlan` (final remaining E2E brand string).
- **Phase 7 ship gate** executed programmatically per orchestrator pre-resolution.

## Task Commits

1. **Task 1: PWA manifest + asset wiring** — `b4049bad` (feat)
2. **Task 2: localStorage regression-lock** — `85943896` (test) — RED+GREEN in single commit; runtime tests would be tautological for source-text assertions, so two-commit TDD cadence does not apply
3. **Task 3: e2e brand assertion update** — `e82cd043` (test)
4. **Deviation fix**: rephrase manifest.ts comment to satisfy grep audit — `e526e11a` (fix) [Rule 1 self-inflicted bug]
5. **Task 4 (checkpoint pre-resolved)**: ship-gate execution — no source mutations; results in this Summary
6. **Doc update**: deferred-items.md notes pre-existing login test failures persist — `e35937e2` (docs)

**Plan metadata:** Final commit captures this SUMMARY + 07-PHASE-SUMMARY + STATE/ROADMAP updates.

## Files Created/Modified

### Created
- `apps/web/app/manifest.ts` — Next.js 16 MetadataRoute.Manifest export (47 lines incl. JSDoc rationale)
- `packages/core/chat/store.test.ts` — Source-text regression lock for 7 multica:chat:* keys + 1 negative

### Modified
- `apps/web/app/layout.tsx` — Extended `metadata.icons`/`openGraph`/`twitter` with full asset stack
- `packages/core/auth/store.test.ts` — Appended Phase 7 D-2 regression-lock describe block (2 it blocks)
- `e2e/auth.spec.ts:8` — `toContainText("Multica")` → `toContainText("AlgoPlan")`
- `.planning/phases/07-rebrand-pass/deferred-items.md` — Re-confirmed pre-existing login test failures persist; ship-gate Check 3 caveat

## Phase 7 Ship Gate — 6 Formal Checks

| # | Check | Result | Evidence |
|---|-------|--------|----------|
| 1 | Test count >= 109 (Nyquist floor) | **PASS** | 111 test files (find apps packages -name "*.test.ts" -o -name "*.test.tsx") |
| 2 | `bash scripts/grep-rebrand.sh` | **PASS** | exit 0; "No user-visible 'Multica' references found in scanned targets" |
| 3 | `pnpm test` full TS suite | **CAVEAT** | 6 of 7 `apps/web/app/(auth)/login/page.test.tsx` tests fail with `useNavigation must be used within NavigationProvider`. Re-confirmed identical failure tree at Plan 07-04 tip (`ce5dc285`) — **pre-existing** Phase 6 carry-over, ZERO Plan 07-05 edits to either file. All other surfaces GREEN: `@multica/views` 76 files / 621 tests pass; `@multica/core` 8/8 chat regression-locks pass; auth-store full 6/6 pass. |
| 4 | localStorage `multica_*` / `multica:chat:*` preserved | **PASS** | 27 refs across packages/core, apps/web, apps/desktop (excluding test files) |
| 5 | `@multica/*` package imports preserved | **PASS** | 1126 imports (`from "@multica/`) — internal monorepo D-3 invariant intact |
| 6 | Deep-link scheme atomic (`multica://` → `algoplan://`) | **PASS** | Zero `multica://` strings in production code (apps/web, apps/desktop, .yml — excluding `*.test.ts` regression-lock fixtures) |

### Extra ship-gate confirmations (orchestrator-requested)

| # | Check | Result | Evidence |
|---|-------|--------|----------|
| 7 | `apps/web` production build | **PASS** | `pnpm --filter @multica/web build` succeeded; `/manifest.webmanifest` listed in route table |
| 8 | `apps/desktop` typecheck | **CAVEAT** | Single pre-existing TS error at `pageview-tracker.tsx:60:47` introduced by `205e8c1e feat(analytics)` — same error logged in deferred-items.md from Plan 07-00; not a Phase 7 regression |

**Verdict:** Phase 7 invariants D-2 / D-3 / D-4 are independently verified GREEN by Checks 1, 2, 4, 5, 6. Check 3 reflects pre-existing breakage owned by a future test-infra plan, not a Plan 07-05 regression — confirmed by checkout of `ce5dc285` (Plan 07-04 tip, before any 07-05 edits) reproducing the identical 6 failed / 1 passed result.

## Decisions Made

- **Source-text > runtime test** for the localStorage preservation lock — see `chat/store.test.ts` JSDoc for full rationale. Runtime tests would only verify "store reads/writes whatever key it uses" (tautology). Source-text assertions fail the only PR shape that can cause silent data loss: a key rename without a migration.
- **PWA manifest theme_color = #05070b** (dark token) so installed-PWA OS chrome blends with the app's dark default surface. `background_color = #ffffff` matches the cold-launch light-theme initial state — Android shows this during the splash before first paint.
- **Pre-existing test failures stay deferred** — verified non-regressive by checkout. Ship-gate "PASS" is interpreted against Phase 7 invariants (D-2/D-3/D-4), not against pre-existing Phase 6 breakage.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 — Bug] Self-inflicted grep-rebrand.sh false positive in `manifest.ts` comment**
- **Found during:** Task 4 (ship gate Check 2)
- **Issue:** My JSDoc comment in the original `manifest.ts` (Task 1) used wildcard glob notation (`multica:*`, `multica_*`) to refer to the preserved key families. The brand audit script excludes specific literal patterns (e.g., `multica:chat`, `multica_[a-zA-Z]`) but not wildcard notation, so the comment triggered a false-positive "user-visible Multica leak."
- **Fix:** Rephrased the comment to reference literal key names (`multica:chat:selectedAgentId`, `multica_token`) that the audit script excludes. Same intent, no audit noise.
- **Files modified:** `apps/web/app/manifest.ts`
- **Verification:** Re-ran `bash scripts/grep-rebrand.sh` → exit 0, "No user-visible 'Multica' references found"
- **Committed in:** `e526e11a` (fix(07-05): rephrase manifest.ts comment...)
- **Why fixed inline (not exclusion-list expansion):** Adding `multica_\*` / `multica:\*` glob patterns to the script would weaken the audit by excluding literal asterisk-suffixed strings the grep is meant to catch. The comment was the source of the noise; rephrasing the comment is the cleaner fix.

---

**Total deviations:** 1 auto-fixed (1 self-inflicted bug from Task 1)
**Impact on plan:** Zero scope creep. The fix preserved both intent (comment explains the D-2 invariant) and contract (audit script's exclusion list stays minimal).

## Issues Encountered

- Pre-existing `apps/web/app/(auth)/login/page.test.tsx` failure carried into Plan 07-05 baseline. Re-verified non-regressive by checkout of `ce5dc285`; documented in `deferred-items.md` (third row + new fourth row). Owner: future test-infra plan (NavigationProvider wrapper for login tests).
- Pre-existing `apps/desktop/src/renderer/src/components/pageview-tracker.tsx:60:47` TS error from `205e8c1e feat(analytics)`. Same row already in deferred-items from Plan 07-00. Out of Plan 07-05 scope.

## Known Stubs

None — Plan 07-05 contains no UI rendering with empty/placeholder data. The PWA manifest, regression-lock tests, and asset references are all wired to real generated assets from Plan 07-00.

## Threat Flags

None — Plan 07-05 introduces zero new network endpoints, auth paths, file access patterns, or schema changes. PWA manifest is public-by-design; OG image is generated from controlled SVG seed (Plan 07-00); regression-lock tests are read-only source-text assertions.

## Self-Check: PASSED

**Files exist:**
- FOUND: apps/web/app/manifest.ts
- FOUND: packages/core/chat/store.test.ts
- FOUND: apps/web/app/layout.tsx
- FOUND: packages/core/auth/store.test.ts
- FOUND: e2e/auth.spec.ts

**Commits exist:**
- FOUND: b4049bad (Task 1: PWA manifest + asset wiring)
- FOUND: 85943896 (Task 2: regression-lock tests)
- FOUND: e82cd043 (Task 3: e2e brand assertion)
- FOUND: e526e11a (Deviation fix: manifest.ts comment)
- FOUND: e35937e2 (Doc: deferred-items update)

## Next Phase Readiness

Phase 7 is COMPLETE pending the post-merge consumer-facing actions in `07-PHASE-SUMMARY.md` (production Electron user reinstall comm, Twitter handle confirmation, optional DNS flip follow-up). All Phase 7 D-1 through D-4 invariants are verified intact in source tree. Per the orchestrator's pre-resolution of the user-verify checkpoint: ship gate cleared (5/6 against Phase-7 invariants; Check 3 caveat owned by future test-infra plan).

---
*Phase: 07-rebrand-pass*
*Plan: 05*
*Completed: 2026-04-26*
