---
phase: 07-rebrand-pass
plan: 03
subsystem: desktop
tags: [rebrand, electron, electron-builder, deep-link-protocol, app-id, dock-icon, atomic-flip-d1]

# Dependency graph
requires:
  - phase: 07-rebrand-pass
    plan: 00
    provides: 07-PATTERNS.md §1 desktop rows + Q1 CLI-binary preservation rule + USER-DEC-2 plan.algoview.com homepage
  - phase: 07-rebrand-pass
    plan: 01
    provides: shared packages (views/ui) string sweep — desktop renderer consumes packages/views which now ship AlgoPlan strings
  - phase: 07-rebrand-pass
    plan: 02
    provides: apps/web brand strings + landing — symmetry with this plan's desktop chrome flip

provides:
  - electron-builder.yml AlgoPlan identity (appId ai.algoplan.desktop, productName AlgoPlan, protocols [{name AlgoPlan, schemes [algoplan]}])
  - main/index.ts PROTOCOL='algoplan' constant (consumed by handleDeepLink + setAsDefaultProtocolClient + cold-start argv scan)
  - apps/desktop/test/electron-builder-config.test.ts regression-lock (5 it() blocks pinning identity matrix)
  - extended scripts/grep-rebrand.sh EXCLUDE regex covering CLI-binary-side preserved patterns (matches 07-PATTERNS §2 update)

affects:
  - 07-04-deep-link-scheme-flip — REQUIRED follow-up: apps/web/app/auth/callback + apps/web/app/(auth)/login deep-link strings must atomically flip multica:// → algoplan:// (D-1). Until 07-04 ships, the desktop auth handoff is intentionally broken (electron-builder.yml registers algoplan:// but the web callback redirects multica://, which the new build does not handle).
  - 07-05-test-assertion-edits — apps/desktop test count grew from 5 files / 64 tests to 6 files / 69 tests (Task 1 added electron-builder-config.test.ts with 5 cases)

# Tech tracking
tech-stack:
  added:
    - yaml@^2 (apps/desktop devDep) — YAML parser for electron-builder-config.test.ts regression-lock
  patterns:
    - "Regression-lock test pattern: read electron-builder.yml at test time, parse, assert identity matrix verbatim — guarantees future commits cannot silently revert the rebrand"
    - "Atomic-flip discipline (D-1): consumer side of the deep-link protocol (PROTOCOL constant + electron-builder.yml schemes) flipped HERE; producer side (web callback redirect URL) flipped in 07-04. The two halves only become consistent when BOTH plans merge. Typing the dependency in the SUMMARY frontmatter (`affects: 07-04`) makes the chain explicit."
    - "Audit script + 07-PATTERNS §2 are co-evolved in lock-step (5 new exclusion rows added in this plan to match 5 new EXCLUDE clauses in scripts/grep-rebrand.sh)"

key-files:
  created:
    - apps/desktop/test/electron-builder-config.test.ts
  modified:
    - apps/desktop/electron-builder.yml
    - apps/desktop/package.json
    - apps/desktop/src/main/index.ts
    - apps/desktop/src/main/external-url.test.ts
    - apps/desktop/src/main/daemon-manager.ts
    - apps/desktop/src/renderer/index.html
    - apps/desktop/src/renderer/src/components/update-notification.tsx
    - apps/desktop/electron.vite.config.ts
    - apps/desktop/vitest.config.ts
    - apps/desktop/package.json (yaml devDep)
    - pnpm-lock.yaml
    - scripts/grep-rebrand.sh
    - .planning/phases/07-rebrand-pass/07-PATTERNS.md

key-decisions:
  - "PROTOCOL='algoplan' constant change SHIPS HERE in main/index.ts even though electron-builder.yml protocols.schemes was originally listed as 07-04 in 07-PATTERNS.md §1 — the planner's 07-03 plan body explicitly takes both sides of the desktop atomic-flip (appId + protocol scheme + PROTOCOL const), leaving 07-04 with the web-side multica:// → algoplan:// redirect strings. This is the correct split because the desktop registers the protocol but the web emits it; both halves still must merge together."
  - "artifactName template multica-desktop-${version} KEPT unchanged in electron-builder.yml (mac, dmg, linux, win sections). Renaming would break Homebrew tap binary URLs and electron-updater's latest-mac.yml feed for users on already-installed builds — they would silently stop receiving updates until a manual reinstall. The internal release filename has zero user-visible surface. Locked by Task 1 regression test."
  - "publish.owner=multica-ai + publish.repo=multica KEPT (D-4 — GitHub org rename out of phase scope)"
  - "package.json name='@multica/desktop' KEPT (D-3 — internal monorepo package). repository.url KEPT (D-4)"
  - "PAT name 'Multica Desktop' → 'AlgoPlan Desktop' in daemon-manager.ts mintPat() — this label appears in the user's tokens-page UI on the server side; user-visible per Q-2 / 07-PATTERNS §1 inferred row"
  - "All CLI binary references (multica / multica.exe / ~/.multica config dir / `multica daemon` subcommand / bin/multica) PRESERVED VERBATIM per planner Q1. Includes the user-facing error string 'multica CLI is not installed' in daemon-manager.ts:650/688 — `multica` here is the actual binary name, not a brand reference."
  - "external-url.test.ts test fixture URL https://multica.ai → https://algoplan.ai (test-only example URL; not gated by USER-DEC-2 plan.algoview.com because this is hostname-shape testing, not a real production link)"

requirements-completed: [RBR-02, RBR-03, RBR-05]

# Metrics
duration: 8min
completed: 2026-04-26
---

# Phase 7 Plan 03: Desktop Electron Chrome Rebrand Summary

**Flipped the entire desktop chrome — appId, productName, protocols.schemes, dev-mode app name, AppUserModelId, and PROTOCOL deep-link constant — to AlgoPlan/algoplan, plus shipped a 5-case regression-lock test that pins the identity matrix so a future commit cannot silently revert the rebrand. apps/desktop leak count: 63 → 3 (the three remaining lines are `multica://` deep-link comment strings owned by Plan 07-04's atomic flip).**

## Performance

- **Duration:** ~8 min (3 tasks, no checkpoints)
- **Started:** 2026-04-26T13:35:49Z
- **Completed:** 2026-04-26T13:44:47Z
- **Tasks:** 3 of 3
- **Files created/modified:** 13 (1 new test + 12 edited; pnpm-lock.yaml is dep-install collateral, not a content change)
- **Test count delta:** apps/desktop grew from 5 files / 64 tests to **6 files / 69 tests** (+5 it() blocks in the new regression-lock)

## Accomplishments

- **electron-builder.yml flipped:** appId `ai.multica.desktop` → `ai.algoplan.desktop`; productName `Multica` → `AlgoPlan`; protocols entry `{name: Multica, schemes: [multica]}` → `{name: AlgoPlan, schemes: [algoplan]}`. publish.owner/repo + artifactName template KEPT unchanged.
- **package.json metadata flipped:** description ("AlgoPlan Desktop — native desktop client for the AlgoPlan platform."), homepage (`https://plan.algoview.com` per USER-DEC-2), author.name (AlgoPlan), author.email (`support@algoplan.ai`). package `name` (@multica/desktop) and `repository.url` PRESERVED per D-3/D-4.
- **Main process flipped:** `PROTOCOL = "algoplan"` (cascades through entire deep-link path because every consumer reads the constant); `DEV_APP_NAME` Multica Canary → AlgoPlan Canary (with DESKTOP_APP_SUFFIX prefix path); `setAppUserModelId(is.dev ? "ai.algoplan.desktop.dev" : "ai.algoplan.desktop")`. Inline deep-link example comments updated to algoplan://auth/callback + algoplan://invite/<id>.
- **Renderer chrome flipped:** Window `<title>Multica</title>` → `<title>AlgoPlan</title>` in apps/desktop/src/renderer/index.html (initial paint before React mounts). `https://multica.ai/changelog` link in update-notification.tsx → `https://plan.algoview.com/changelog`. `electron.vite.config.ts` worktree-comment example "Multica Canary" → "AlgoPlan Canary".
- **Daemon manager refinements:** PAT name shipped to POST /api/tokens flipped from "Multica Desktop" → "AlgoPlan Desktop" (visible in the user's server-side tokens page). Two source-comment brand refs cleaned up (`Multica user` → `AlgoPlan user`; `<Multica.app>` bundle-path doc → `<AlgoPlan.app>`).
- **Regression-lock test landed:** `apps/desktop/test/electron-builder-config.test.ts` (53 lines, 5 it() blocks) reads electron-builder.yml at test time and asserts the AlgoPlan identity matrix verbatim, while also asserting the publish remote + artifactName template stay on their multica- prefixed values. Future commits that try to "complete" the rebrand by also flipping artifactName will fail this test and surface the breakage before it ships.
- **Audit script + patterns doc co-evolved:** scripts/grep-rebrand.sh `EXCLUDE` regex extended with five new clauses to match preserved patterns documented in 07-PATTERNS §2 (CLI binary basenames, ~/.multica config-dir paths, bin/multica packaged path, multica-cli- archive prefix, multica_<os>_<arch> legacy archive name, regression-lock test description "(not multica)"). 07-PATTERNS.md §2 received five corresponding new exclusion rows in the same commit.
- **Leak delta:** Whole-repo `bash scripts/grep-rebrand.sh` reports **17 remaining lines** (was 247 baseline / 63 entering 07-03). All 17 are owned by Plan 07-04 — 14 in apps/web (auth/callback + login page deep-link emit + brand copy "Opening Multica" / "Open Multica Desktop") and 3 in apps/desktop (deep-link comment strings in App.tsx and pages/login.tsx that document the URL form).

## Production-User Impact / Release Communications

These two consequences of the rebrand will be visible to existing installed users on first launch of a build that ships Plans 07-03 + 07-04 together. They MUST appear in the release notes for the version that lands the rebrand:

1. **Old `multica://` scheme stops working until reinstall.** The desktop app's protocol registration is set at install time (electron-builder writes the `multica://` registration into Windows registry / macOS LaunchServices / Linux .desktop file at install). Users running the previous build that registered `multica://` will keep seeing the old scheme work for desktop-side handling until they install the new build, at which point the new install registers `algoplan://` and the OS de-registers `multica://`. **The web side (Plan 07-04) emits algoplan:// from the moment that build deploys**, so any user who hits the new web auth callback BEFORE installing the new desktop build will get a "no app handles algoplan://" prompt. **Mitigation:** ship 07-03 + 07-04 in a single deploy and bump the desktop auto-update to push the new build before the web cutover (or accept the transient broken-auth window during the rollout).

2. **macOS Gatekeeper one-time prompt.** Because `appId` changed from `ai.multica.desktop` → `ai.algoplan.desktop`, macOS treats the new build as a different app from Gatekeeper's perspective. Users may see a one-time "AlgoPlan wants to be opened" / "AlgoPlan was downloaded from the internet" prompt on first launch, even though the Developer ID signing cert is identical. The notarized DMG installer suppresses the most aggressive Gatekeeper warnings, but the first-run dialog is unavoidable. **Mitigation:** call this out in the release notes for the desktop version that ships the rebrand.

3. **Windows installer treats new build as a fresh install.** The `appId` change forces Windows MSI/NSIS to install side-by-side with the previous Multica Desktop build instead of upgrading in-place. Existing users who already installed Multica Desktop will end up with two Start Menu entries (Multica + AlgoPlan) until they uninstall the old one. **Mitigation:** consider a one-time uninstaller migration in a follow-up (out-of-phase scope).

4. **electron-updater feeds keep working transitionally.** The artifactName template `multica-desktop-${version}-...` was deliberately preserved — installed clients on the old appId will keep polling the existing electron-updater feed at the existing URLs and will eventually pick up the new appId build through normal update flow.

## Atomic-Flip Status (D-1)

**This plan has shipped the desktop-side half of the algoplan:// protocol switch.** The full atomic flip is INCOMPLETE until Plan 07-04 lands. Specifically:

| Component | State after 07-03 | Owns the next half |
|---|---|---|
| `apps/desktop/electron-builder.yml` `protocols.schemes: [algoplan]` | ✓ flipped | (this plan) |
| `apps/desktop/src/main/index.ts` `const PROTOCOL = "algoplan"` | ✓ flipped | (this plan) |
| `apps/desktop/src/main/index.ts` `app.setAsDefaultProtocolClient(PROTOCOL)` | ✓ flipped (uses constant) | (this plan) |
| `apps/desktop/src/main/index.ts` `argv.find(a => a.startsWith(\`${PROTOCOL}://\`))` | ✓ flipped (uses constant) | (this plan) |
| `apps/web/app/auth/callback/page.tsx` `window.location.href = \`multica://auth/callback...\`` | ✗ STILL multica:// | **07-04** |
| `apps/web/app/(auth)/login/page.tsx` `window.location.href = \`multica://auth/callback...\`` | ✗ STILL multica:// | **07-04** |
| `apps/web/app/auth/callback/page.tsx` "Opening Multica" / "Open Multica Desktop" | ✗ STILL Multica | **07-04** |

**Until Plan 07-04 ships, the desktop auth handoff is intentionally broken.** A user who logs in via the web auth flow today (against a build that ships 07-03 alone) will see the web emit `multica://auth/callback?token=...` while the new desktop build is registered for `algoplan://` only — the OS will not route the URL to the desktop app, the open-url event never fires, and the auth handoff silently fails. **Plan 07-04 must merge in the same deploy as 07-03**, or the deploy must include both plans before any rollout.

## Preserved Identifiers (Verbatim — DO NOT EDIT)

The following lines in apps/desktop/* legitimately contain `multica` and are intentionally preserved. They are excluded from the rebrand audit per 07-PATTERNS §2.

| File:line | Pattern | Why preserved |
|---|---|---|
| `apps/desktop/package.json:2` `"name": "@multica/desktop"` | internal package name (D-3) | pnpm workspace ID; renaming forces every consumer to update + breaks editor tooling |
| `apps/desktop/package.json:9` `"url": "https://github.com/multica-ai/multica.git"` | git remote (D-4) | GitHub org rename out of phase scope |
| `apps/desktop/electron-builder.yml:46-47` `owner: multica-ai / repo: multica` | publish remote (D-4) | electron-updater feed + GoReleaser tag URLs depend on this |
| `apps/desktop/electron-builder.yml:26,33,39,43` `multica-desktop-${version}-*` | artifactName template (internal) | Homebrew tap downloads + electron-updater binary URLs depend on this filename pattern; renaming silently breaks installed clients' updater |
| `apps/desktop/src/renderer/index.html:9,13` `multica_theme` localStorage key | D-2 | renaming silently loses user theme preference on upgrade |
| `apps/desktop/src/renderer/src/App.tsx:75` `localStorage.getItem("multica_token")` | D-2 | renaming forces re-login for every user |
| `apps/desktop/src/renderer/src/stores/tab-store.ts:481` `name: "multica_tabs"` | D-2 | renaming silently loses every user's open-tab layout |
| `apps/desktop/src/renderer/src/components/desktop-layout.tsx:98-99` `multica:navigate` event | internal pub/sub | renaming would force atomic edit at every emitter + listener |
| `apps/desktop/src/main/index.ts` (everywhere) all `@multica/*` imports | D-3 | internal package names |
| `apps/desktop/src/main/cli-bootstrap.ts:21,105,147,162-167,18` CLI binary names + GitHub remote + workDir prefix | Q1 + D-4 | binary stays `multica`; release archive filename pattern intentional |
| `apps/desktop/src/main/cli-release-asset.ts:1,38-39,56` CLI archive filename patterns | Q1 | matches Goreleaser output for `multica` CLI binary |
| `apps/desktop/src/main/daemon-manager.ts:25,57,67-68,166,285,305,312,514→AlgoPlan,606,650,688` | Q1 | `~/.multica` config dir + `multica` / `multica.exe` binary names + `server/cmd/multica` go-source path + bundled `bin/multica` resource path + user-facing error "multica CLI is not installed" (where `multica` = binary name) |
| `apps/desktop/src/renderer/src/components/daemon-settings-tab.tsx:82-83,92` "multica CLI is installed" + GitHub install URL | Q1 + D-4 | binary name in user-facing copy + GitHub repo URL |
| `apps/desktop/src/renderer/src/components/desktop-runtimes-page.tsx:11` `Run multica daemon start` | Q1 | CLI subcommand string |
| `apps/desktop/src/renderer/src/App.tsx:38,49 + pages/login.tsx:10` `multica://...` deep-link comments | **Plan 07-04** | comment text mentions URL scheme; will be updated when the actual strings flip |
| `apps/desktop/src/renderer/src/App.tsx:9,165 + pages/login.tsx:3,20` `MulticaIcon` import + JSX | aesthetic visual exclusion | per 07-PATTERNS §2: aesthetic asterisk component, NOT the wordmark |
| `apps/desktop/src/main/external-url.test.ts:12,63,64` (FLIPPED to algoplan.ai in this plan) | (was test fixture, now AlgoPlan) | edited because this is a test-only example URL; safe-URL test |

## Deviations from Plan

### Auto-fixed / Auto-extended Issues

**1. [Rule 3 — Blocking] `yaml` package missing from desktop devDeps**
- **Found during:** Task 1 (regression-lock test creation)
- **Issue:** `apps/desktop/test/electron-builder-config.test.ts` imports `yaml` but the package is not installed anywhere in the workspace (only `js-yaml` is present, hoisted at workspace root by other tools). The plan called for adding it to apps/desktop devDeps via root catalog.
- **Fix:** `pnpm --filter @multica/desktop add -D yaml` (lands `yaml@^2.x` in apps/desktop devDependencies; pnpm-lock.yaml updated).
- **Files modified:** apps/desktop/package.json, pnpm-lock.yaml
- **Verification:** Test imports + parses electron-builder.yml; 5/5 it() blocks pass.
- **Committed in:** Task 1 commit (78905daf)

**2. [Rule 2 — Missing critical infrastructure] vitest config missed `test/**` files**
- **Found during:** Task 1 (regression-lock test placement)
- **Issue:** `apps/desktop/vitest.config.ts` `include` pattern was `["src/**/*.test.{ts,tsx}", "scripts/**/*.test.mjs"]` only. The plan called for the test at `apps/desktop/test/electron-builder-config.test.ts` (the natural location for cross-cutting build-config tests), which would be silently ignored by vitest.
- **Fix:** extended `include` to `[..., "test/**/*.test.{ts,tsx}"]`.
- **Files modified:** apps/desktop/vitest.config.ts
- **Verification:** `pnpm --filter @multica/desktop test` shows 6 test files (was 5) / 69 tests (was 64).
- **Committed in:** Task 1 commit (78905daf)

**3. [Rule 2 — Missing critical functionality] scripts/grep-rebrand.sh EXCLUDE regex missed documented patterns**
- **Found during:** Task 3 (renderer sweep verification)
- **Issue:** Audit script's EXCLUDE regex matched only ~14 of the patterns documented in 07-PATTERNS §2. Several preserved patterns (bare `multica` / `multica.exe` binary basenames in cli-bootstrap.ts + daemon-manager.ts; `~/.multica` config-dir paths in daemon-manager.ts; `bin/multica` packaged binary path; `multica-cli-` archive prefix; `multica_<os>_<arch>` legacy archive name pattern; `(not multica)` regression-lock test description) were not covered. Without these, every Plan 07-03+ run reports false-positive leaks.
- **Fix:** Extended EXCLUDE regex with 5 new clauses + co-edited 07-PATTERNS.md §2 with 5 corresponding new exclusion rows per the maintenance protocol at the bottom of that doc.
- **Files modified:** scripts/grep-rebrand.sh, .planning/phases/07-rebrand-pass/07-PATTERNS.md
- **Verification:** Re-run reduced reported leaks from 29 to 17 (12 false positives removed); all remaining lines are real Plan 07-04-owned `multica://` strings.
- **Committed in:** Task 3 commit (480fd26b)

**4. [Rule 2 — Missing critical functionality] index.html / electron.vite.config.ts not in plan files_modified list**
- **Found during:** Task 3 (renderer sweep)
- **Issue:** Plan's `<files_modified>` frontmatter listed 26 files but missed `apps/desktop/src/renderer/index.html` (window title `<title>Multica</title>` shown before React mounts — first-paint user-visible string) and `apps/desktop/electron.vite.config.ts` (build-time comment "Multica Canary" describing worktree usage; needs to match new DEV_APP_NAME).
- **Fix:** flipped `<title>` to AlgoPlan + flipped vite-config comment to AlgoPlan Canary.
- **Files modified:** apps/desktop/src/renderer/index.html, apps/desktop/electron.vite.config.ts
- **Committed in:** Task 3 commit (480fd26b)

**5. [Rule 2 — Missing critical functionality] daemon-manager.ts brand-comment refs missed by plan**
- **Found during:** Task 2 (main-process audit)
- **Issue:** Plan's interface section noted "ALL refs are CLI binary path strings" for daemon-manager.ts and instructed PRESERVE VERBATIM. But two refs are NOT CLI strings: line 79 source comment "Sidecar file that records which Multica user the cached PAT" (brand reference, not binary), and line 307 doc comment `<Multica.app>/Contents/Resources/...` (macOS bundle path doc — after `productName: AlgoPlan` flip, the bundle is `<AlgoPlan.app>` so the comment becomes wrong). Additionally line 514 `name: "Multica Desktop"` is the PAT label POSTed to the server's /api/tokens endpoint and shows up in the user's tokens page — user-visible.
- **Fix:** flipped all three to AlgoPlan equivalents. Confirmed all genuinely binary/CLI/config-dir refs (L25, 67, 68, 166, 285, 305, 312, 606, 650, 688) PRESERVED VERBATIM per Q1.
- **Committed in:** Task 2 commit (f2409764)

---

**Total deviations:** 5 auto-fixed/auto-extended (1 blocking, 4 missing-critical-functionality)
**Impact on plan:** All five fixes were essential prerequisites for either correctness (yaml dep, vitest discovery) or completeness of the rebrand surface (index.html title, vite-config comment, daemon-manager brand comments + PAT label, audit script accuracy). No scope creep — every fix stayed inside apps/desktop or its supporting infrastructure (audit script + patterns doc co-evolution).

## Issues Encountered

None during planned work — the three tasks each succeeded on first attempt after the deviations above were applied.

## Verification Results

| Check | Expected | Actual | Status |
|---|---|---|---|
| `pnpm --filter @multica/desktop test` | green (was 5 files / 64 tests) | **6 files / 69 tests pass** (5 new it() blocks in electron-builder-config.test.ts) | PASS |
| `pnpm --filter @multica/desktop typecheck` | green OR pre-existing failure only | FAILS at `pageview-tracker.tsx:60:47` TS2366 — pre-existing on baseline `5b2d929d` (introduced by `205e8c1e feat(analytics): client_type super-property`) — already logged in `.planning/phases/07-rebrand-pass/deferred-items.md`. Plan 07-03 made zero changes to pageview-tracker.tsx. | NOT-OUR-BUG |
| `pnpm --filter @multica/desktop build` | builds successfully | builds successfully (renderer + main + preload bundles emitted; one pre-existing `INEFFECTIVE_DYNAMIC_IMPORT` warning unrelated to 07-03) | PASS |
| electron-builder.yml `appId: ai.algoplan.desktop` | flipped | flipped | PASS |
| electron-builder.yml `productName: AlgoPlan` | flipped | flipped | PASS |
| electron-builder.yml `protocols: [{name: AlgoPlan, schemes: [algoplan]}]` | flipped | flipped (verified by regression test) | PASS |
| electron-builder.yml `artifactName: multica-desktop-...` (4 sections) | unchanged | unchanged on mac/dmg/linux/win (verified by regression test) | PASS |
| electron-builder.yml `publish.owner: multica-ai`, `publish.repo: multica` | unchanged | unchanged (verified by regression test) | PASS |
| `main/index.ts PROTOCOL = "algoplan"` | flipped | flipped | PASS |
| `main/index.ts DEV_APP_NAME = "AlgoPlan Canary"` | flipped | flipped (both no-suffix and DESKTOP_APP_SUFFIX paths) | PASS |
| `main/index.ts setAppUserModelId("ai.algoplan.desktop[.dev]")` | flipped | flipped | PASS |
| `bash scripts/grep-rebrand.sh` whole-repo leak count | apps/desktop only Plan-07-04-owned `multica://` strings remain | 3 apps/desktop leaks (App.tsx:38,49 + login.tsx:10 — all `multica://` deep-link comments owned by 07-04). 14 apps/web leaks all owned by 07-04. **Total 17 leaks, all in 07-04 territory.** | PASS |

## Deferred Issues

| Item | Status | Owner |
|---|---|---|
| `apps/desktop/src/renderer/src/components/pageview-tracker.tsx:60:47` TS2366 | Pre-existing on baseline `5b2d929d`; introduced by `205e8c1e feat(analytics): client_type super-property`. NOT touched by Plan 07-03. Already logged in `.planning/phases/07-rebrand-pass/deferred-items.md` by Plan 07-00. | Analytics owner / future maintenance plan |

## Self-Check: PASSED

**Files (verified existent):**
- FOUND: `apps/desktop/electron-builder.yml` (50 lines; appId/productName/protocols all AlgoPlan; artifactName + publish unchanged)
- FOUND: `apps/desktop/package.json` (description/homepage/author flipped; name + repo URL preserved)
- FOUND: `apps/desktop/src/main/index.ts` (PROTOCOL=algoplan, DEV_APP_NAME=AlgoPlan Canary, setAppUserModelId=ai.algoplan.desktop[.dev], deep-link comments updated)
- FOUND: `apps/desktop/src/main/external-url.test.ts` (test fixtures multica.ai → algoplan.ai)
- FOUND: `apps/desktop/src/main/daemon-manager.ts` (PAT name "AlgoPlan Desktop"; two source-comment brand refs flipped; CLI binary refs preserved)
- FOUND: `apps/desktop/src/renderer/index.html` (`<title>AlgoPlan</title>`)
- FOUND: `apps/desktop/src/renderer/src/components/update-notification.tsx` (changelog URL plan.algoview.com)
- FOUND: `apps/desktop/electron.vite.config.ts` (vite-config worktree comment flipped)
- FOUND: `apps/desktop/vitest.config.ts` (test/** glob added)
- FOUND: `apps/desktop/test/electron-builder-config.test.ts` (53 lines, 5 it() blocks, all pass)
- FOUND: `scripts/grep-rebrand.sh` (EXCLUDE regex extended with 5 new clauses)
- FOUND: `.planning/phases/07-rebrand-pass/07-PATTERNS.md` (5 new exclusion rows in §2)

**Commits (verified in `git log --oneline`):**
- FOUND: `78905daf feat(07-03): flip electron-builder.yml + package.json to AlgoPlan + add regression-lock test`
- FOUND: `f2409764 feat(07-03): flip main process PROTOCOL + dev app name + AppUserModelId to AlgoPlan`
- FOUND: `480fd26b feat(07-03): sweep desktop renderer + extend grep-rebrand.sh exclusions`

## Next Phase Readiness

- **Plan 07-04 ready to execute immediately.** All apps/desktop atomic-flip dependencies are in place: electron-builder.yml registers `algoplan://`, main/index.ts dispatches it. Plan 07-04 only needs to flip the apps/web auth-callback + login deep-link href strings + the "Opening Multica" / "Open Multica Desktop" brand copy. Both the desktop deep-link comment strings (App.tsx:38,49 + login.tsx:10) become consistent with the rest of the codebase once 07-04 flips them in lockstep.
- **No blockers for 07-05.** The new electron-builder-config.test.ts adds 5 to the test count floor; 07-05's test plan (109-floor) is comfortably ahead.
- **Release-comm checklist:** Once 07-03 + 07-04 ship together, release notes for the desktop version should call out the four production-user impact items in the "Production-User Impact" section above.

---
*Phase: 07-rebrand-pass*
*Completed: 2026-04-26*
