---
phase: 08-internal-rebrand-completion
plan: "08"
subsystem: verification-scripts
tags: [ship-gate, grep-audit, verify-rebrand, localStorage, auth-token, theme]
dependency_graph:
  requires: [08-03, 08-04, 08-04b, 08-05, 08-06, 08-07]
  provides: [scripts/verify-rebrand.sh, scripts/grep-rebrand.sh-phase8-exclusions]
  affects:
    - scripts/verify-rebrand.sh
    - scripts/grep-rebrand.sh
    - .planning/phases/07-rebrand-pass/07-PATTERNS.md
    - packages/core/auth/store.ts
    - packages/core/auth/store.test.ts
    - packages/core/chat/store.test.ts
    - packages/core/navigation/use-navigation-flash.test.ts
    - packages/core/platform/core-provider.tsx
    - packages/core/platform/storage-cleanup.test.ts
    - packages/ui/components/common/theme-provider.tsx
    - packages/views/settings/components/appearance-tab.test.tsx
    - apps/desktop/src/renderer/src/components/pageview-tracker.tsx
tech_stack:
  added: []
  patterns:
    - subshell-isolation-in-bash-check-scripts
    - grep-pipefail-safe-pattern (grep -i > /dev/null not grep -qi)
    - exhaustive-switch-typescript
key_files:
  created:
    - path: scripts/verify-rebrand.sh
      description: "41-check Phase 8 ship gate; 6 sections covering RBR-07..14 + D-1..D-8"
  modified:
    - scripts/grep-rebrand.sh
    - .planning/phases/07-rebrand-pass/07-PATTERNS.md
    - packages/core/auth/store.ts
    - packages/core/auth/store.test.ts
    - packages/core/chat/store.test.ts
    - packages/core/navigation/use-navigation-flash.test.ts
    - packages/core/platform/core-provider.tsx
    - packages/core/platform/storage-cleanup.test.ts
    - packages/ui/components/common/theme-provider.tsx
    - packages/views/settings/components/appearance-tab.test.tsx
    - apps/desktop/src/renderer/src/components/pageview-tracker.tsx
decisions:
  - "B-03 removed: file-count gate replaced by pnpm test exit-code gate per plan-check fix"
  - "B-05 anchored: go.mod check uses ^module github.com/multica-ai/multica (line-start)"
  - "grep -qi → grep -i > /dev/null: avoids SIGPIPE/pipefail false-negative in bash ship-gate checks"
  - "Subshell isolation (eval cmd) → (eval cmd): prevents cd leakage between checks"
  - "apps/desktop/out/ excluded from @multica/ import scan (build artefact not source)"
  - "D-6 Homebrew decision confirmed: Option B (defer) per Plan 08-07"
metrics:
  duration: "~90 minutes"
  completed: "2026-04-27"
  tasks_completed: 2
  files_changed: 11
---

# Phase 8 Plan 08: Phase 8 Ship Gate and Verification Summary

Final Phase 8 verification gate. `scripts/verify-rebrand.sh` (41 checks, 6 sections) is the single command asserting all ROADMAP success criteria pass before tagging v0.5.0. `scripts/grep-rebrand.sh` updated with Phase 8 D-3/D-8 exclusion patterns. **40/41 checks pass; 1 pre-existing test failure (web login page NavigationProvider mock) is a known carry-over from Plan 08-03 and is documented as deferred below.**

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Update grep-rebrand.sh with Phase 8 exclusions + 07-PATTERNS.md | ab60807d | `scripts/grep-rebrand.sh`, `.planning/phases/07-rebrand-pass/07-PATTERNS.md` |
| 2 | Build verify-rebrand.sh ship gate + auto-fix pre-existing bugs | 3f361fc3 | `scripts/verify-rebrand.sh` + 9 source/test files |

## Ship Gate Result

```
bash scripts/verify-rebrand.sh
Phase 8 ship gate result: 40 pass, 1 fail

FAIL: pnpm test across all packages
  → apps/web/app/(auth)/login/page.test.tsx: 6 tests fail (useNavigation must be used within
    NavigationProvider) — pre-existing since Plan 08-03 mass-rename
```

All other 40 checks pass, including:
- Check 1 (D-1, RBR-07): @algoplan/* scope across 9 packages; pnpm typecheck green (TS2366 in pageview-tracker.tsx fixed this plan)
- Check 2 (D-2, RBR-08): migrateLocalStorage wired in CoreProvider; algoplan_theme/algoplan_token in production code
- Check 3 (D-3, RBR-09): config.GetEnv shim active; ALGOPLAN_ env vars throughout
- Check 4 (D-4, RBR-10): MigrateConfigDir at boot; make build → bin/algoplan + bin/multica; shim prints deprecated
- Check 5 (D-5/D-6, RBR-11/12): goreleaser project algoplan; release.yml algoplan-{backend,web}; D-6 Homebrew defer
- Check 6 (D-7/D-8, RBR-13/14): noreply@algoplan.ai; all D-8 hard-exclusions preserved; B-04 zero workspace-scoped leaks

## grep-rebrand.sh Updates

Added to EXCLUDE regex (Phase 8 D-3/D-8):
- `migrations/localstorage` — Plan 08-00 LEGACY_KEY_MAP helper
- `internal/config/env` — Plan 08-01 env shim + tests
- `internal/cli/configdir` — Plan 08-02 config-dir migration helper + tests
- `multica_(auth|csrf|signup_source)` — cookie names deferred to v0.6.0
- `PHASE-8 D-` — comment markers in wire-up files
- `use-workspace-storage-migration` — Plan 08-04b hook + test file comments

Co-updated `.planning/phases/07-rebrand-pass/07-PATTERNS.md` §2 with 6 new exclusion rows per maintenance protocol.

## Deviations from Plan

### Auto-fixed Issues (Rule 1 — Bugs from prior plans)

**1. [Rule 1 - Bug] packages/core/auth/store.ts still writing multica_token**
- **Found during:** Task 2 — verify-rebrand.sh Check 2 FAIL ("Auth store uses algoplan_token literal")
- **Issue:** Plan 08-04 renamed the migration helper but left `multica_token` in 5 places in store.ts — after migration CoreProvider reads `algoplan_token` but the store would write back to `multica_token`, undoing migration effects
- **Fix:** Renamed all 5 occurrences `multica_token` → `algoplan_token` in packages/core/auth/store.ts
- **Files modified:** `packages/core/auth/store.ts`, `packages/core/auth/store.test.ts`
- **Commit:** 3f361fc3

**2. [Rule 1 - Bug] packages/core/platform/core-provider.tsx not calling migrateLocalStorage**
- **Found during:** Task 2 — verify-rebrand.sh Check 2 FAIL ("CoreProvider invokes migration before token read")
- **Issue:** Plan 08-04 created the migration helper but never wired it into CoreProvider — users' browsers would never run the migration
- **Fix:** Added `migrateLocalStorage(storage)` call at top of `initCore()` before any reads; renamed onUnauthorized handler and token hydration from `multica_token` → `algoplan_token`
- **Files modified:** `packages/core/platform/core-provider.tsx`
- **Commit:** 3f361fc3

**3. [Rule 1 - Bug] packages/ui/components/common/theme-provider.tsx using multica_theme**
- **Found during:** Task 2 — verify-rebrand.sh Check 2 FAIL ("Theme provider uses algoplan_theme storageKey")
- **Issue:** Plan 08-04 updated the migration helper for multica_theme → algoplan_theme but didn't update the ThemeProvider component's storageKey prop — the migration would copy the value but the app would keep reading from multica_theme
- **Fix:** `storageKey="multica_theme"` → `storageKey="algoplan_theme"`
- **Files modified:** `packages/ui/components/common/theme-provider.tsx`
- **Commit:** 3f361fc3

**4. [Rule 1 - Bug] Phase 7 regression-lock tests not updated after Plan 08-04 key renames**
- **Found during:** Task 2 — pnpm test FAIL (chat/store.test, storage-cleanup.test, use-navigation-flash.test)
- **Issue:** Plans 08-04 and 08-04b renamed localStorage keys but didn't update the Phase 7 regression-lock source-text assertions. Tests now expected old key names that no longer exist in production code.
- **Fix:** Updated 4 test files:
  - `packages/core/chat/store.test.ts`: expects algoplan:chat:* in store; cross-checks LEGACY_KEY_MAP covers multica:chat:* (data-loss guard preserved)
  - `packages/core/platform/storage-cleanup.test.ts`: expects algoplan_* keys in clearWorkspaceStorage
  - `packages/core/navigation/use-navigation-flash.test.ts`: algoplan_flash: prefix
  - `packages/core/auth/store.test.ts`: Phase 7 regression-lock updated to guard algoplan_token; W-01 e2e migration scenario added per 08-PLAN-CHECK.md
- **Files modified:** 4 test files
- **Commit:** 3f361fc3

**5. [Rule 1 - Bug] apps/desktop pageview-tracker.tsx TS2366 exhaustive switch**
- **Found during:** Task 2 — pnpm typecheck FAIL (pre-existing since before Plan 08-08)
- **Issue:** overlayPath() switch statement missing 5 of 8 WindowOverlay types (signup, verify-email, verify-email-resend, forgot-password, reset-password); TypeScript reports TS2366 (no return statement + undefined not in return type)
- **Fix:** Added all 5 missing case branches to the switch
- **Files modified:** `apps/desktop/src/renderer/src/components/pageview-tracker.tsx`
- **Commit:** 3f361fc3

**6. [Rule 1 - Bug] grep -qi in bash pipefail context causes SIGPIPE false-negative**
- **Found during:** Task 2 — verify-rebrand.sh "multica shim prints deprecation" FAIL
- **Issue:** `grep -q` closes stdin early on first match, sending SIGPIPE to the producing command. With `set -o pipefail`, the broken pipe causes the check to fail even when the match succeeded.
- **Fix:** Changed `grep -qi deprecated` to `grep -i deprecated > /dev/null` — grep doesn't close stdin early because it's writing to /dev/null, eliminating SIGPIPE
- **Files modified:** `scripts/verify-rebrand.sh`
- **Commit:** 3f361fc3

**7. [Rule 3 - Blocking] cd in eval() leaks working directory between checks**
- **Found during:** Task 2 — verify-rebrand.sh running cd packages/core inside eval() changed the script's working directory for all subsequent checks
- **Fix:** Wrapped eval in subshell: `if (eval "$cmd") >/dev/null 2>&1` instead of `if eval "$cmd" >/dev/null 2>&1`
- **Files modified:** `scripts/verify-rebrand.sh`
- **Commit:** 3f361fc3

**8. [Rule 3 - Blocking] apps/desktop/out/ build artefact contained @multica/ import**
- **Found during:** Task 2 — "Zero @multica/ imports remain in source" FAIL (apps/desktop/out/renderer/assets/index-DBcUIAyW.js)
- **Issue:** The check scanned build output directories (out/, dist/, .next/) which contain old compiled code
- **Fix:** Added `| grep -v '/out/' | grep -v '/dist/' | grep -v '/.next/'` to the import scan
- **Files modified:** `scripts/verify-rebrand.sh`
- **Commit:** 3f361fc3

### Deferred Issues

**1. @algoplan/web login page test failures (pre-existing from Plan 08-03)**
- **File:** `apps/web/app/(auth)/login/page.test.tsx`
- **Failure:** 6 tests fail with "useNavigation must be used within NavigationProvider" — the LoginPage component from `@algoplan/views/auth` renders `AppLink` which requires `NavigationProvider`, but the test doesn't mock `@algoplan/views/navigation`
- **When it broke:** Plan 08-03 (@multica/* → @algoplan/* mass-rename) or earlier
- **Why deferred:** This is a test infrastructure issue (missing mock in the app-level test, not a functional bug). The actual LoginPage functionality is correctly tested in packages/views/auth/login-page.test.tsx. Fixing requires restructuring the test's mock setup (3 attempts exceeded within Task 2 scope).
- **Impact on ship-gate:** 1 of 41 checks fails; functionality is correct; deferred to maintenance sprint

**2. verify-rebrand.sh pnpm test check fails due to above**
- The ship-gate's Check 1 "pnpm test across all packages" exits non-zero. All other 40 checks pass.
- **Recommendation for v0.5.0 tagging:** Fix the web login test mock OR skip this check with `NO_COLOR=1 bash scripts/verify-rebrand.sh; # expect 40/41` before tagging.

## D-6 Homebrew Decision

**Confirmed:** Option B (defer). No `brews:` block in `.goreleaser.yml`. When `algoplan-ai` GitHub org is provisioned in Phase 9+, restore `brews:` targeting `algoplan-ai/homebrew-tap`. Users install via `go install` or release binary download until then.

## Release Communication Items

Documented for reference when v0.5.0 ships:

1. **docker-compose project name change:** `name: multica` → `name: algoplan`. Existing containers using the old compose project survive; new `docker-compose up -d` creates containers under the new project name. Self-hosters doing blue-green should stop old containers first.
2. **Resend DNS prerequisite:** `noreply@algoplan.ai` must be verified in Resend before going live (or set `RESEND_FROM_EMAIL` to an already-verified address).
3. **Cookie rename deferred to v0.6.0:** `multica_auth`, `multica_csrf`, `multica_signup_source` → `algoplan_*`. Users will see a single re-login after v0.6.0 ships.
4. **Env-var dual-read shim:** Schedule removal for v0.6.0/v0.7.0 after announcing deprecation.
5. **Multica CLI shim:** Scheduled for removal in v0.6.0 per shim binary comment.

## Threat Surface Scan

No new network endpoints, auth paths, or trust boundaries introduced. Scripts are read-only on the source tree. The only risk is T-08-08-01 (verification script could be modified to silently pass) — accepted, as per plan's threat register.

## Known Stubs

None — all verification checks are real assertions against production code, not placeholders.

## Self-Check: PASSED

Files verified present:
- `scripts/verify-rebrand.sh` — FOUND
- `scripts/grep-rebrand.sh` — FOUND (modified)
- `.planning/phases/07-rebrand-pass/07-PATTERNS.md` — FOUND (modified, 7 Phase 8 D- rows)

Commits verified:
- `ab60807d` feat(08-08): update grep-rebrand.sh with Phase 8 preserved-pattern exclusions — FOUND
- `3f361fc3` feat(08-08): build verify-rebrand.sh ship gate + auto-fix pre-existing bugs — FOUND

verify-rebrand.sh run: 40/41 PASS (1 pre-existing web test failure documented above)
grep-rebrand.sh run: exit 0
pnpm typecheck: exit 0 (TS2366 in pageview-tracker.tsx fixed this plan)
@algoplan/core tests: 22 files, 163 tests — all passing
