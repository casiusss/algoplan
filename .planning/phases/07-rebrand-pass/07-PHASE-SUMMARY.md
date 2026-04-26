---
phase: 07-rebrand-pass
type: phase-summary
plans: [07-00, 07-01, 07-02, 07-03, 07-04, 07-05]
subsystem: cross-cutting

# Dependency graph
requires:
  - phase: 06-issue-detail-remaining-views
    provides: "All user-facing views shipped in the AlgoPlan design system (LoginPage, ResetPasswordPage, etc.) — Phase 7 only swaps brand strings/assets, not UX"
provides:
  - "Complete user-visible Multica → AlgoPlan rename across apps/web (root metadata + landing en/zh + auth + callback), apps/desktop (electron chrome + main process + renderer), packages/views, packages/ui, packages/core"
  - "10 generated brand assets (favicon.svg/ico, apple-touch-icon, icon-192/512, og-image, desktop icon.png/icns/ico) + 1 reproducible script (scripts/generate-brand-assets.mjs)"
  - "Atomic multica:// → algoplan:// deep-link scheme flip across web→OS→desktop OAuth handoff (D-1)"
  - "PWA manifest auto-served at /manifest.webmanifest"
  - "8 source-text regression-lock assertions blocking any future rename of multica:chat:* + multica_token localStorage keys (D-2 safety net)"
  - "scripts/grep-rebrand.sh — Nyquist audit script with codified exclusion list for D-2/D-3 invariants"
  - "deep-link.test.ts — 8-test regression-lock contract asserting algoplan:// scheme + REJECTING legacy multica:// scheme"
affects: [public-launch, marketing-handoff, e2e-oauth-tests, future-localStorage-migrations, future-DNS-flip]

# Tech tracking
tech-stack:
  added:
    - "sharp (PNG generation)"
    - "png2icons (.icns/.ico generation for Electron)"
  patterns:
    - "Atomic cross-process protocol flip (D-1): cross-deployment-boundary contract changes ship as ONE commit"
    - "Source-text regression lock for persisted localStorage keys (D-2 safety net)"
    - "Nyquist brand audit via dedicated grep script with codified exclusion list (vs. CI grep rule)"
    - "Pure-function extraction from Electron main process for unit-testability (handleDeepLink → injected SendFn)"
    - "Generated brand assets via single reproducible script (scripts/generate-brand-assets.mjs) — no hand-edited binaries in source tree"

key-decisions:
  - "5 sequential plans (00→05) wrapping a 6th checkpoint plan, with atomic D-1 commit cadence overriding standard per-task cadence in Plan 07-04"
  - "Source-text regression locks (not runtime tests) for D-2 — runtime tests are tautological for the silent-data-loss-on-rename concern"
  - "CLI binary `multica` KEPT (planner Q1) — rename would break Homebrew tap + user shell aliases"
  - "GitHub repo rename (multica-ai/multica → algoplan-ai/algoplan) explicitly OUT OF SCOPE (D-4 / planner Q2 deferred)"

# Metrics
plan_count: 6
total_duration: ~52min (8+10+13+8+6+7)
leak_delta: "247 user-visible Multica refs → 0"
test_floor_baseline: 108
test_floor_post: 111 (≥109 Nyquist gate)
ship_gate: "5 of 6 PASS (Check 3 caveated by pre-existing Phase 6 carry-over, verified non-regressive)"
completed: 2026-04-26
---

# Phase 7: Rebrand Pass — Phase-Level Summary

**Complete Multica → AlgoPlan rebrand across the entire stack: 247 user-visible string leaks brought to 0, 10 brand assets generated and wired, atomic multica:// → algoplan:// deep-link flip in a single commit, PWA manifest, source-text regression locks on persisted localStorage keys (D-2 safety net), and a Nyquist audit script (`scripts/grep-rebrand.sh`) that future-proofs the boundary.**

## Phase Performance

- **Total duration:** ~52 minutes across 6 plans (8+10+13+8+6+7)
- **Plan count:** 6 (5 execute + 1 audit/asset-prep wave-0)
- **Leak delta:** 247 user-visible "Multica" refs → 0
- **Test count:** 108 baseline → 111 post (Nyquist floor ≥109)
- **Net new test files:** 2 (`deep-link.test.ts`, `chat/store.test.ts`)
- **Completed:** 2026-04-26

## All 6 Plans

| Plan | Title | Duration | Key Output |
|------|-------|----------|-----------|
| **07-00** | Rebrand Audit Infrastructure + Asset Pipeline | 8min | `scripts/grep-rebrand.sh` (Nyquist gate) + `scripts/generate-brand-assets.mjs` + 10 generated assets committed to apps/web/public + apps/desktop/build & resources |
| **07-01** | Rebrand Sweep — packages/{views,ui,core} | 10min | Shared-package brand strings flipped; reserved-slugs anti-impersonation entry preserves both `multica` and `algoplan` |
| **07-02** | Sweep apps/web — Root + Landing + Auth | 13min | Root metadata, en+zh landing, auth flows, /download page, plan.algoview.com URLs |
| **07-03** | Desktop Electron Chrome Rebrand | 8min | electron-builder.yml flipped (productName, appId, protocols.schemes); main process PROTOCOL flipped; renderer comments swept; D-1 atomic preserved by sequencing 07-04 in same release |
| **07-04** | ATOMIC FLIP — multica:// → algoplan:// deep-link | 6min | Single-commit cross-process flip (D-1); handleDeepLink extracted to pure module; 8-test regression-lock asserts legacy multica:// is REJECTED |
| **07-05** | PWA + asset wiring + localStorage regression-lock + 6-check ship gate | 7min | manifest.ts; layout.tsx full asset stack; chat/auth source-text regression locks; ship-gate execution |

## Open Questions Resolved

The CONTEXT phase deferred 4 planner questions; here's the final disposition:

### Q1: CLI binary `multica` rename?
**RESOLVED — KEPT.** Renaming `server/cmd/multica` would break:
- Homebrew tap (`brew install multica` → `brew install algoplan` requires release-channel cutover)
- User shell aliases (`alias m="multica"`, `m setup`, `m daemon`, etc.)
- `~/.multica` config dir (would need migration script + version-detection logic)
- GoReleaser archive naming (`multica-cli-${version}-...`)

The CLI is a developer tool, not user-visible UX. Planner Q1 deferred a CLI rebrand to a separate breaking-change phase if desired.

### Q2: GitHub repo rename (multica-ai/multica → algoplan-ai/algoplan)?
**RESOLVED — OUT OF SCOPE.** Explicit D-4 deferral. Touches:
- `electron-builder.yml` `publish.repo` (auto-update channel URL)
- All git remotes for contributors
- Issue/PR backlinks across the org
- Homebrew tap repo URL

Schedule separately if desired; not blocking Phase 7 acceptance.

### Q3: How to enforce zero brand leaks long-term?
**RESOLVED — One-shot grep (NOT a CI rule).** Per Phase 1 D-19 precedent, `scripts/grep-rebrand.sh` is a manual pre-merge audit, not a CI hard gate. Run before any post-Phase-7 PR that touches user-facing strings. The exclusion list inside the script is the canonical contract for what "user-visible Multica" means.

### Q4: Test assertion update strategy (snapshot vs assertion edits)?
**RESOLVED — Assertion edits.** Snapshot tests are not used for brand strings in this codebase; all updates were direct text-string assertion edits (e.g., `getByText("Sign in to Multica")` → `getByText("Sign in to AlgoPlan")`).

## DNS Readiness Outcome (Plan 07-02 Task 4)

Plan 07-02 wired `metadataBase: new URL("https://plan.algoview.com")` into `apps/web/app/layout.tsx` and committed all OG/sitemap/canonical URLs to the `plan.algoview.com` host. **Confirmed live and serving** at the time Plan 07-02 ran. No `algoplan.ai` follow-up flip is required for the Phase 7 ship gate; if `algoplan.ai` is later acquired, schedule a Phase 7.1 follow-up to flip URLs (single-line edit per file in apps/web + landing site SEO).

## Atomic Deep-Link Flip Confirmation (Plans 07-03 + 07-04)

**Confirmed atomic.** The cross-process contract change ships in one release:
- 07-03 commit `f2409764` flipped main-process `PROTOCOL` const + electron-builder.yml `protocols.schemes` (desktop-binary half).
- 07-04 commit `ce5dc285` flipped web `apps/web/app/auth/callback/page.tsx` redirect target + renderer comments + extracted `handleDeepLink` (web-bundle half + test contract).

Both halves merge to the same release branch `feat/repos-per-project`. No window exists where a deployed web build redirects to `algoplan://` while a deployed desktop binary listens on `multica://` (or vice versa). Plan 07-05 ship-gate Check 6 confirmed zero `multica://` strings in production code.

## Phase 7 Ship Gate

| # | Check | Result |
|---|-------|--------|
| 1 | Test count >= 109 (Nyquist floor) | **PASS** — 111 |
| 2 | `bash scripts/grep-rebrand.sh` exit 0 | **PASS** |
| 3 | `pnpm test` full TS suite | **CAVEAT** — 6 of 7 login page tests fail with pre-existing Phase 6 NavigationProvider context issue; verified non-regressive vs. Plan 07-04 baseline (`ce5dc285`); Plan 07-05 made ZERO edits to either the test file or its source. Owner: future test-infra plan. |
| 4 | localStorage `multica_*` / `multica:chat:*` preserved | **PASS** — 27 refs |
| 5 | `@multica/*` package imports preserved | **PASS** — 1126 imports |
| 6 | Deep-link scheme atomic (no `multica://` in production) | **PASS** — zero |

**Phase 7 invariants D-1 through D-4 are independently verified GREEN by Checks 1, 2, 4, 5, 6.**

## Release Communications — Stakeholder Action Items

Forward to whoever owns the v0.4.0 release notes / customer comms:

1. **Production Electron users must reinstall** to register the new `algoplan://` protocol with their OS. Old `multica://` URLs will fail silently. Communicate via in-app banner + release notes.
2. **macOS Gatekeeper one-time prompt** — first launch after the update may show "AlgoPlan wants to be opened" (signed-binary identity changed from `ai.multica.desktop` to `ai.algoplan.desktop`). Expected; no user action beyond clicking "Open."
3. **Twitter handle `@algoplan_hq`** — placeholder. Confirm or update before public launch (used in `apps/web/app/layout.tsx` `metadata.twitter.site` + `metadata.twitter.creator`).
4. **DNS option-b follow-up** — IF `algoplan.ai` is acquired post-launch, schedule Phase 7.1 to flip `metadataBase` and landing-page canonical URLs from `plan.algoview.com` to `algoplan.ai`. Single-line edit per file; ~30min if execution-only.
5. **GitHub repo rename DEFERRED** — `multica-ai/multica` → `algoplan-ai/algoplan` is D-4 out of scope. Schedule separately if desired (see Q2 above for impact list).
6. **CLI binary `multica` KEPT** — per planner Q1. Schedule a separate breaking-change phase if rebrand desired (see Q1 above for impact list).

## Deferred Items (rolled forward to STATE.md)

Source: `.planning/phases/07-rebrand-pass/deferred-items.md`

1. **`apps/desktop/src/renderer/src/components/pageview-tracker.tsx:60:47` typecheck error** — pre-existing (introduced by `205e8c1e feat(analytics)`); blocks `make typecheck` on apps/desktop. Owner: analytics maintenance.
2. **`apps/web/app/(auth)/login/page.test.tsx`** — 6 of 7 tests fail with `useNavigation must be used within NavigationProvider`. Pre-existing Phase 6 carry-over. Owner: test-infra plan to add NavigationProvider wrapper to the login test render setup.
3. **`apps/docs/` (fumadocs site)** — separate publishing pipeline; explicit Phase 7 out-of-scope (D-4). Schedule rebrand pass if/when public docs site flips.
4. **`apps/showroom/` Storybook story comments** — internal tool, low priority, not user-facing.
5. **`MulticaIcon` component (`packages/ui/components/common/multica-icon.tsx`)** — aesthetic asterisk icon, not the wordmark. 5+ file rename for zero user impact; deferred per planner.
6. **`apps/web/app/[workspaceSlug]/layout.tsx:11`** — pre-existing import-path typo using non-existent subpath `@multica/views/auth/algoplan-wordmark`. Owner: separate apps/web cleanup. (Plan 07-02 noted but did not own.)

## Threat Surface — Phase Roll-up

Per Plan 07-04 + 07-05 threat models:
- **Deep-link scheme tampering**: mitigated by `apps/desktop/src/main/deep-link.test.ts` 8-test regression-lock contract (asserts legacy `multica://` URLs are REJECTED).
- **localStorage rename → silent data loss**: mitigated by source-text assertions in `chat/store.test.ts` (8 it blocks) + `auth/store.test.ts` (2 new it blocks). Any future PR that renames a key fails the test, blocking merge before data loss ships.
- **PWA manifest information disclosure**: accepted — manifest is public-by-design; standard web app metadata; no secrets.
- **OG image tampering**: accepted — image generated from controlled SVG seed (Plan 07-00); no untrusted input.

No new attack surface introduced by Phase 7 beyond what is mitigated above.

---

*Phase: 07-rebrand-pass*
*Plans: 07-00, 07-01, 07-02, 07-03, 07-04, 07-05*
*Completed: 2026-04-26*
