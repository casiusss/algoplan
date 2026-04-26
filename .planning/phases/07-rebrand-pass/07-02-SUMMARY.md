---
phase: 07-rebrand-pass
plan: 02
subsystem: web
tags: [rebrand, web, metadata, seo, og-image, landing-page, i18n, en, zh, twitter, dns, plan.algoview.com]

# Dependency graph
requires:
  - phase: 07-rebrand-pass
    plan: 00
    provides: 07-PATTERNS.md §1 web rows + USER-DEC-2 production URL plan.algoview.com
  - phase: 07-rebrand-pass
    plan: 01
    provides: AlgoPlanWordmark already exported via @multica/views/auth barrel; packages/views chat/onboarding strings already swept

provides:
  - apps/web with AlgoPlan brand strings throughout root layout, landing site (en+zh), workspace dashboard splash, auth-flow pages
  - Production URL plan.algoview.com applied to metadataBase, robots, sitemap, JSON-LD, OG canonical alternates
  - Twitter handle placeholder @algoplan_hq + x.com/AlgoPlanAI applied (pending real handle confirmation)
  - i18n parity: en.ts and zh.ts both contain 23 AlgoPlan references (pre-edit count was 22 brand mentions + 1 Twitter handle each)
  - Test-fixture email contract migrated (test@multica.ai → test@algoplan.ai) in apps/web/test/helpers.tsx + apps/web/app/(auth)/login/page.test.tsx
  - scripts/grep-rebrand.sh extended EXCLUDE for multica-locale, MulticaLanding, multica-landing, multica CLI

affects:
  - 07-03-electron-chrome (apps/desktop/package.json homepage will use the same plan.algoview.com URL)
  - 07-04-deep-link-scheme-flip (multica:// strings in apps/web/app/auth/callback/* + apps/web/app/(auth)/login/page.tsx remain UNTOUCHED for Plan 07-04 atomic flip)
  - 07-05-test-assertion-edits (login/page.test.tsx Sign in to AlgoPlan assertion is now in place; deep-link button assertions remain Multica-named for Plan 07-04 to flip)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Bulk replace via Edit replace_all=true with strict word-boundary preservation (Multica vs Multics OS reference)"
    - "Per-file re-grep gate after each domain (apps/web/app, apps/web/features) before commit to confirm zero residuals modulo documented exclusions"
    - "Test fixture email migration as part of brand sweep (consistency: prod data + test data flip atomically per file)"

key-files:
  created:
    - .planning/phases/07-rebrand-pass/07-02-SUMMARY.md
  modified:
    - apps/web/app/layout.tsx
    - apps/web/app/robots.ts
    - apps/web/app/sitemap.ts
    - apps/web/app/custom.css
    - apps/web/app/(landing)/page.tsx
    - apps/web/app/(landing)/layout.tsx
    - apps/web/app/(landing)/homepage/page.tsx
    - apps/web/app/(landing)/about/page.tsx
    - apps/web/app/(landing)/changelog/page.tsx
    - apps/web/app/(landing)/download/page.tsx
    - apps/web/app/[workspaceSlug]/layout.tsx
    - apps/web/app/(auth)/login/page.test.tsx
    - apps/web/features/landing/i18n/en.ts
    - apps/web/features/landing/i18n/zh.ts
    - apps/web/features/landing/components/landing-header.tsx
    - apps/web/features/landing/components/landing-footer.tsx
    - apps/web/features/landing/components/features-section.tsx
    - apps/web/features/landing/components/shared.tsx
    - apps/web/features/landing/utils/github-release.ts
    - apps/web/test/helpers.tsx
    - scripts/grep-rebrand.sh

key-decisions:
  - "USER-DEC-2 applied: production URL plan.algoview.com (NOT algoplan.ai) — used by metadataBase, robots.ts, sitemap.ts, JSON-LD Organization.url"
  - "Twitter handle: @algoplan_hq (root layout) + AlgoPlanAI (x.com/AlgoPlanAI in shared.tsx + i18n footer link) — placeholder; awaiting real handle confirmation"
  - "MulticaLanding function name + multica-landing.tsx filename PRESERVED (per Plan 07-02 task body: 'filename multica-landing.tsx stays')"
  - "multica-locale cookie name PRESERVED as D-2 extension — silent loss of language preference if renamed; added to grep-rebrand.sh EXCLUDE"
  - "multica_logged_in cookie PRESERVED as D-2 — silent session loss if renamed"
  - "auth/callback/page.tsx + (auth)/login/page.tsx multica:// deep-link strings (4 sites: 2 hrefs, 2 'Opening Multica' titles, 2 'Multica desktop app' bodies, 2 'Open Multica Desktop' button labels) NOT touched — Plan 07-04 owns the atomic flip (electron-builder.yml protocols.schemes ↔ web auth callback href)"
  - "Multics (the historical OS) PRESERVED in en.ts + zh.ts about-section etymology paragraphs — narrative now reads slightly disconnected ('AlgoPlan brings time-sharing back. Like Multics before it…') but planner explicitly chose mechanical replacement over story rewrite"
  - "github.com/multica-ai/multica + multica.git + multica-desktop- artifactName template + multica setup/update/agent/config CLI commands + multica CLI binary path + Multica reserved-slug ALL PRESERVED per 07-PATTERNS §2"
  - "Wave-0 baseline 247 leaks → post-Plan 07-02 + 07-01 in-progress: 63 total leaks remaining; apps/web specifically dropped 122 → 14 (-108); the 14 remaining are all owned by Plan 07-04 (deep-link atomic flip)"

# Metrics
duration: 13min
completed: 2026-04-26
---

# Phase 7 Plan 02: Sweep apps/web — Root + Landing + Auth Summary

**Web app rebranded to AlgoPlan: root metadata + JSON-LD + OG / canonical URLs flipped to plan.algoview.com (USER-DEC-2), landing site copy migrated EN+ZH (23 AlgoPlan refs each, parity confirmed), workspace splash icon replaced with AlgoPlanWordmark, test fixtures and Twitter handles updated; Plan 07-04 deep-link scheme + the 4 atomic-flip UI strings deliberately preserved.**

## Performance

- **Duration:** ~13 min (Tasks 1+2; both checkpoints skipped per orchestrator instructions — DNS pre-resolved as plan.algoview.com, visual verify deferred to Wave 4 ship gate)
- **Started:** 2026-04-26T13:18:15Z
- **Completed:** 2026-04-26T13:31:38Z
- **Tasks:** 2 of 4 task-bodies executed (Tasks 3+4 = checkpoints, both skipped with USER-DEC-2 pre-supplied)
- **Files modified:** 21 (20 source/script + 0 created; SUMMARY created in this final commit)

## Accomplishments

- **Root metadata flipped:** `apps/web/app/layout.tsx` `metadataBase` is now `https://plan.algoview.com`, default title is `"AlgoPlan — Project Management for Human + Agent Teams"`, template is `"%s | AlgoPlan"`, openGraph.siteName is `"AlgoPlan"`, twitter site/creator is `@algoplan_hq`. Browser tab + social-share previews + canonical URL now reflect AlgoPlan brand.
- **SEO surfaces aligned:** `robots.ts` and `sitemap.ts` `baseUrl` constants both point to `plan.algoview.com`; `(landing)/layout.tsx` JSON-LD Organization+SoftwareApplication entities renamed to `AlgoPlan`. Search engines should pick up the new canonical hostname on next crawl.
- **Landing routes rebranded:** `(landing)/{page,layout,homepage,about,changelog,download}` metadata title/description/openGraph all swept → AlgoPlan. Visual-text wordmark in `landing-header.tsx` and `landing-footer.tsx` (lowercase serif "multica" → "algoplan"). Demo screenshot caption "Multica Demo" → "AlgoPlan Demo". Mock test-output domain `github.com/multica/server/...` → `github.com/algoplan/server/...`.
- **i18n parity locked:** `apps/web/features/landing/i18n/en.ts` and `zh.ts` both contain exactly 23 `AlgoPlan` references after the sweep (22 brand mentions + 1 Twitter URL hostname each); pre-edit count was 23 each (22 `Multica` Latin word-boundary + 1 `MulticaAI` Twitter handle), so the sweep is loss-less and the EN+ZH pages stay structurally identical.
- **Workspace splash updated:** `apps/web/app/[workspaceSlug]/layout.tsx` replaced `<MulticaIcon size-6 animate-pulse>` with `<AlgoPlanWordmark size="default" animate-pulse>` (per Plan 07-02 task spec). The decorative MulticaIcon remains preserved everywhere else (D-2: aesthetic component, not the wordmark).
- **Test fixtures aligned:** `apps/web/test/helpers.tsx` mock user/member emails `test@multica.ai` → `test@algoplan.ai`. `apps/web/app/(auth)/login/page.test.tsx` `Sign in to Multica` assertion → `Sign in to AlgoPlan` AND test fixture emails (5 sites) flipped. Test-data brand consistent with prod-data brand.
- **Twitter handle placeholders applied:** `apps/web/features/landing/components/shared.tsx` `twitterUrl = https://x.com/AlgoPlanAI` (was `MulticaAI`); root layout twitter.site/creator = `@algoplan_hq` (was `@multica_hq`). Both flagged as placeholder pending real-handle confirmation (none provided by user during this plan).
- **Audit script extended:** `scripts/grep-rebrand.sh` EXCLUDE regex extended to cover `multica-locale` (cookie), `MulticaLanding`/`multica-landing` (component name), `multica CLI` (referenced in en.ts:628 changelog) so that legitimate D-2 / preserved-internal references don't raise false leaks on subsequent runs.

## USER DECISIONS Transcript

**USER-DEC-2: Production URL — plan.algoview.com (NOT algoplan.ai)**

Resolved BEFORE Plan 07-02 execution started. The user supplied the resolution at the orchestrator level when spawning this plan executor:

> Production URL = **`plan.algoview.com`** (NOT algoplan.ai)
> Apply to: apps/web/app/layout.tsx metadataBase, apps/web/app/robots.ts, apps/web/app/sitemap.ts, apps/web/package.json homepage, packages/views/help-launcher.tsx, packages/views/workspace/create-workspace-form.tsx placeholder

This pre-supplied resolution means Plan 07-02 Task 4 (DNS readiness checkpoint) was skipped. The plan's Task 4 originally offered three options: a) algoplan.ai, b) keep multica.ai, c) hybrid; the user resolved this UPSTREAM by selecting a fourth option NOT in the original choice tree: `plan.algoview.com`. All URL flips in Tasks 1+2 used `plan.algoview.com` as the target.

**Verification:** `grep "metadataBase" apps/web/app/layout.tsx` returns `metadataBase: new URL("https://plan.algoview.com")` ✓; `grep baseUrl apps/web/app/{robots,sitemap}.ts` both return `https://plan.algoview.com` ✓.

**Visual verification (Task 3 checkpoint) — SKIPPED**

Per orchestrator instruction: "Visual verify checkpoint: skip (defer to Wave 4 ship gate)". Plan 07-02 did NOT start the dev server or perform 8-step browser verification (tab title, EN/ZH parity check, OG meta DOM inspection, splash visual). These will be performed cumulatively at the Wave 4 ship gate after Plans 07-03 / 07-04 / 07-05 complete.

**Twitter handle confirmation status — PENDING**

User did not supply a confirmed Twitter handle. Placeholders applied:
- Root layout `twitter.site` + `twitter.creator`: `@algoplan_hq`
- shared.tsx `twitterUrl` + i18n footer `X (Twitter)` link: `https://x.com/AlgoPlanAI`

Action item for ship gate: confirm handle exists or rotate to whatever the real account is. If `@algoplan_hq` is wrong, a single search-and-replace across `apps/web/app/layout.tsx:89-90` + `apps/web/features/landing/components/shared.tsx:4` + `apps/web/features/landing/i18n/{en,zh}.ts:237` is all that's needed.

## Task Commits

Each commit on `feat/repos-per-project`:

1. **Task 1 + Task 2 atomic** — `20fc52c9` (`feat(07-02): rebrand apps/web — root metadata, landing site (en+zh), auth helpers, test fixtures`) — 21 files, 95 insertions, 93 deletions
2. **Import-path fix** — `6fa9b36c` (`fix(07-02): import AlgoPlanWordmark via @multica/views/auth barrel`) — 1 file (the package.json exports map only exposes `./auth` index, not `./auth/algoplan-wordmark` directly)

**Note on commit history collisions:** During Plan 07-02 execution a parallel/automated session was concurrently committing Plan 07-01 work (`5d611a51`, `ad88c87f`/`c3fa9284`, `2517f927`, `571fc29a`). One git reset HEAD~1 occurred (reflog HEAD@{3}) which dropped a transient commit that bundled my Plan 07-02 staged files alongside Plan 07-01 packages/ui edits — the apps/web/app/* files were re-staged from the working tree (the edits remained intact in the working copy) and then re-committed cleanly under their correct `feat(07-02)` label as `20fc52c9`. Final history is clean: `20fc52c9` and `6fa9b36c` are the canonical Plan 07-02 commits.

## Verification Results

| Check                                                                      | Expected                                              | Actual                                                       | Status |
| -------------------------------------------------------------------------- | ----------------------------------------------------- | ------------------------------------------------------------ | ------ |
| `bash scripts/grep-rebrand.sh` total leak count                            | drop from 247 baseline                                | **63** (-184)                                                | PASS   |
| `bash scripts/grep-rebrand.sh \| grep ^apps/web/`                          | drop from 122 in apps/web                             | **14** (-108); all 14 are 07-04-owned deep-link strings      | PASS   |
| `pnpm typecheck` for apps/web                                              | green                                                 | green (after 6fa9b36c fix)                                   | PASS   |
| `pnpm typecheck` repo-wide                                                 | green OR pre-existing failures only                   | green for all packages EXCEPT pre-existing apps/desktop pageview-tracker.tsx:60 TS2366 (logged in 07-00 deferred-items.md) | NOT-OUR-BUG |
| `pnpm --filter @multica/web build`                                         | success, no metadata typos, all routes registered     | success — all 27 routes registered including `/about`, `/changelog`, `/download`, `/auth/*`, `/[workspaceSlug]/*`, robots.txt, sitemap.xml | PASS   |
| `metadataBase` URL = `https://plan.algoview.com`                           | exact string match, NOT `algoplan.ai`                 | `metadataBase: new URL("https://plan.algoview.com")`         | PASS   |
| `robots.ts` + `sitemap.ts` `baseUrl` = `https://plan.algoview.com`         | exact match                                           | both: `const baseUrl = "https://plan.algoview.com"`           | PASS   |
| `en.ts` ↔ `zh.ts` AlgoPlan parity                                          | equal counts                                          | 23 ↔ 23                                                       | PASS   |
| `multica_logged_in` cookie preserved                                       | grep finds it                                         | `apps/web/features/auth/auth-cookie.ts:1` `multica_logged_in` (D-2 protected) | PASS   |
| `multica-locale` cookie preserved                                          | grep finds it                                         | `apps/web/features/landing/i18n/context.tsx:14` `multica-locale` (D-2 ext) | PASS   |
| `multica://` deep-link strings preserved (Plan 07-04 atomic flip target)   | 4 hrefs in source                                     | 2 in `apps/web/app/auth/callback/page.tsx` (lines 57, 98) + 2 in `apps/web/app/(auth)/login/page.tsx` (lines 66, 145) — verified via grep | PASS   |
| `MulticaIcon` aesthetic asterisk preserved everywhere except workspace splash | grep finds remaining usages                       | preserved in `apps/web/features/landing/components/landing-header.tsx:29`, `landing-footer.tsx:24,122`, `apps/web/app/[workspaceSlug]/(dashboard)/layout.tsx` | PASS   |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 — Blocking] Wrong import path for AlgoPlanWordmark**
- **Found during:** Post-commit `pnpm typecheck` (Task 2 verification phase)
- **Issue:** `apps/web/app/[workspaceSlug]/layout.tsx` imported `AlgoPlanWordmark` from `@multica/views/auth/algoplan-wordmark`, which is NOT in the `packages/views/package.json` `exports` map. Only `./auth` (the barrel index) is exposed publicly. TS2307 error: "Cannot find module '@multica/views/auth/algoplan-wordmark'".
- **Fix:** Changed import to `import { AlgoPlanWordmark } from "@multica/views/auth";` (uses the barrel re-export at `packages/views/auth/index.ts:3`).
- **Files modified:** `apps/web/app/[workspaceSlug]/layout.tsx`
- **Verification:** `pnpm typecheck` for apps/web passes; build succeeds.
- **Committed in:** `6fa9b36c` (fix(07-02): import AlgoPlanWordmark via @multica/views/auth barrel)

### Deviations from Plan §1 Replacement Table

**Two §1 rows reassigned/redefined by Plan 07-02 task body:**

1. **`apps/web/features/landing/components/multica-landing.tsx` (file rename row)** — §1 patterns table says "Rename → `algoplan-landing.tsx`; component identifier follows" with owning plan 07-02. The Plan 07-02 task body explicitly OVERRIDES this: "file CONTENT update only, NOT a file rename (file rename touches imports and is out of scope per 'preserve internal naming where possible'). Filename `multica-landing.tsx` stays." → **Followed plan task body**: filename + function name `MulticaLanding` PRESERVED. Added to grep-rebrand.sh EXCLUDE.

2. **`apps/web/app/(landing)/homepage/page.tsx` `<MulticaLanding>` import + render** — §1 row says rename to `<AlgoPlanLanding>`; same override applied per plan body. Import + render preserved as `MulticaLanding`.

These deviations are documented in §1 of 07-PATTERNS.md as having been resolved by Plan 07-02's task body authority over §1's owning-plan mapping. Plan body > §1 table when they disagree (the maintenance protocol explicitly allows for this).

### Strings owned by Plan 07-04, NOT touched

Per task instructions: "DO NOT change `multica://` here — Plan 07-04 owns the atomic flip with electron-builder.yml". The following 14 user-visible "Multica" strings remain in apps/web AS DESIGNED:

| File | Lines | Strings |
|------|-------|---------|
| `apps/web/app/auth/callback/page.tsx` | 57, 88, 90, 98, 101 | `multica://auth/callback?token=…` (×2) + `<CardTitle>Opening Multica</CardTitle>` + `Multica desktop app` body + `Open Multica Desktop` button |
| `apps/web/app/auth/callback/page.test.tsx` | 16 | `email: "test@multica.ai"` test fixture (deferred to Plan 07-04 since it tests the deep-link atomic flip) |
| `apps/web/app/(auth)/login/page.tsx` | 66, 133, 136, 145, 148 | symmetric copies of the 5 callback strings (legacy login → desktop handoff path) |
| `apps/web/app/(auth)/login/page.test.tsx` | 161, 184, 188 | `multica://` URL assertion + `Open Multica Desktop` button assertion (Plan 07-04 will flip alongside the source) |

These are NOT deviations — they are the explicit scope boundary between Plan 07-02 and Plan 07-04.

### About-section etymology — narrative coherence note

After mechanical replacement of `Multica` → `AlgoPlan`, the about-section paragraphs in `en.ts` and `zh.ts` read with mild logical disconnect because the brand etymology was a wordplay on `Multics` (the OS) + `ica`:

> "AlgoPlan brings time-sharing back, but for an era where the 'users' multiplexing the system are both humans and autonomous agents."
> "Like Multics before it, the bet is on multiplexing."

This is per the plan's task action: "Replace any 'Multica' in JSX/strings → 'AlgoPlan'. Preserve sentence structure exactly." The narrative coherence regression is a known trade-off — the planner chose mechanical replacement over story rewriting since rewriting requires a copywriter and is out of phase scope.

**Recommendation:** A future copy revision should rewrite the about-section etymology to fit the AlgoPlan brand (algorithmic planning + first-class agents). Tracked as a follow-up in deferred-items.md (no row added by this plan; Plan 07-05 or post-phase work item).

## Issues Encountered

**Concurrent commit collision with parallel session.** During Plan 07-02 execution (between Task 1 staging and commit), a parallel automated/Claude session was committing Plan 07-01 work to the same branch `feat/repos-per-project`. The reflog shows:
- `HEAD@{4}: c3fa9284` — a transient commit that incorrectly bundled my Plan 07-02 apps/web/app/* staged files alongside packages/ui edits, labeled `feat(07-01): sweep ... in packages/ui`
- `HEAD@{3}: reset moving to HEAD~1` — that transient commit was dropped (likely by the parallel session realizing the misattribution)
- `HEAD@{2}: ad88c87f` — packages/ui-only re-commit (correctly scoped to 07-01)

My Plan 07-02 working-tree edits remained intact throughout this dance (verified post-reset: `metadataBase` was still `plan.algoview.com`). Re-staged my files and committed cleanly under `20fc52c9`. No work was lost; commit attribution is now correct.

This was NOT auto-fixable from within Plan 07-02 — it's a process issue that will recur if multiple plans execute concurrently against the same branch without worktrees.

## Note on Plan 07-01 Shared Work

Plan 07-01 (packages/views + packages/ui sweep) is also in progress on the same branch. Several files this plan would have noticed (e.g. `packages/views/layout/workspace-loader.tsx` — `MulticaIcon` → `AlgoPlanWordmark size="lg"` swap) are already done by Plan 07-01 commits `5d611a51` (workspace-loader.tsx swap) and `ad88c87f` (packages/ui CSS comments). Plan 07-02 only touched `apps/web/app/[workspaceSlug]/layout.tsx` workspace splash (its own scope per plan body).

## Self-Check: PASSED

**Files (verified existent):**
- FOUND: `apps/web/app/layout.tsx` (modified — `metadataBase: new URL("https://plan.algoview.com")`)
- FOUND: `apps/web/app/robots.ts` (modified — `baseUrl = "https://plan.algoview.com"`)
- FOUND: `apps/web/app/sitemap.ts` (modified — same)
- FOUND: `apps/web/app/custom.css` (modified — header comment `AlgoPlan Web`)
- FOUND: `apps/web/app/(landing)/page.tsx` (modified — title `AlgoPlan — Project Management…`)
- FOUND: `apps/web/app/(landing)/layout.tsx` (modified — JSON-LD `name: "AlgoPlan"`, `url: "https://plan.algoview.com"`)
- FOUND: `apps/web/app/(landing)/homepage/page.tsx` (modified — metadata description AlgoPlan)
- FOUND: `apps/web/app/(landing)/about/page.tsx` (modified — `About AlgoPlan`)
- FOUND: `apps/web/app/(landing)/changelog/page.tsx` (modified — `Changelog | AlgoPlan`)
- FOUND: `apps/web/app/(landing)/download/page.tsx` (modified — `Download AlgoPlan`)
- FOUND: `apps/web/app/[workspaceSlug]/layout.tsx` (modified — splash `AlgoPlanWordmark size="default"`, import via `@multica/views/auth` barrel)
- FOUND: `apps/web/app/(auth)/login/page.test.tsx` (modified — `Sign in to AlgoPlan`, fixture emails)
- FOUND: `apps/web/features/landing/i18n/en.ts` (modified — 23 AlgoPlan refs)
- FOUND: `apps/web/features/landing/i18n/zh.ts` (modified — 23 AlgoPlan refs)
- FOUND: `apps/web/features/landing/components/landing-header.tsx` (modified — `algoplan` wordmark text)
- FOUND: `apps/web/features/landing/components/landing-footer.tsx` (modified — `algoplan` wordmark text + giant footer logo text)
- FOUND: `apps/web/features/landing/components/features-section.tsx` (modified — `AlgoPlan Demo` ×2 + mock test output domain)
- FOUND: `apps/web/features/landing/components/shared.tsx` (modified — `twitterUrl = https://x.com/AlgoPlanAI`)
- FOUND: `apps/web/features/landing/utils/github-release.ts` (modified — JSDoc comments)
- FOUND: `apps/web/test/helpers.tsx` (modified — `test@algoplan.ai`)
- FOUND: `scripts/grep-rebrand.sh` (modified — EXCLUDE regex extended for multica-locale, MulticaLanding, multica-landing, multica CLI)
- FOUND: `.planning/phases/07-rebrand-pass/07-02-SUMMARY.md` (this file)

**Commits (verified in `git log --oneline`):**
- FOUND: `20fc52c9 feat(07-02): rebrand apps/web — root metadata, landing site (en+zh), auth helpers, test fixtures`
- FOUND: `6fa9b36c fix(07-02): import AlgoPlanWordmark via @multica/views/auth barrel`

## Next Phase Readiness

- **Plan 07-03 ready:** `apps/desktop/electron-builder.yml` `productName` + `appId` flips + `apps/desktop/package.json` homepage flip can use the same `plan.algoview.com` URL contract. The web → desktop visual brand contract (tab title, OG preview, splash, login form) is now AlgoPlan-consistent on the web side; Plan 07-03 will mirror on desktop chrome.
- **Plan 07-04 ready:** All 14 remaining `multica://` + "Opening Multica" / "Multica desktop app" / "Open Multica Desktop" strings in apps/web (4 hrefs in 2 files + 6 UI strings + 4 test assertions) are documented above for the atomic flip alongside `apps/desktop/electron-builder.yml` `protocols.schemes: ["multica"]` → `["algoplan"]`.
- **Plan 07-05 ready:** The `Sign in to AlgoPlan` assertion is now in place in `(auth)/login/page.test.tsx:90` (Plan §4 row complete). The `multica_logged_in` cookie + `multica-locale` cookie preservation remain locked (no test edits needed; just regression-lock tests in 07-05).

**No blockers from Plan 07-02.** The pre-existing `apps/desktop/src/renderer/src/components/pageview-tracker.tsx:60` TS2366 typecheck error remains (already documented in 07-00 SUMMARY + deferred-items.md). The login page.test.tsx 6 pre-existing test failures (`useNavigation must be used within NavigationProvider`) are also pre-existing on baseline — verified by stashing my edits and re-running tests on clean baseline. NOT introduced by Plan 07-02.

---
*Phase: 07-rebrand-pass*
*Completed: 2026-04-26*
