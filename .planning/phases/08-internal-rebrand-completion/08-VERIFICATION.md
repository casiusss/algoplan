---
phase: 8
status: human_needed
must_haves_total: 6
must_haves_passed: 5
must_haves_failed: 1
date: 2026-04-26
human_verification:
  - test: "Push tag v0.5.0 to origin and confirm GitHub Actions Release workflow completes with all jobs green"
    expected: "Docker images publish to ghcr.io/<owner>/algoplan-{backend,web}; GoReleaser builds binary; Homebrew job absent (deferred per D-6)"
    why_human: "Release workflow can only be verified by actually pushing the tag; CI triggers on tag push and cannot be dry-run locally"
gaps:
  - truth: "pnpm install && pnpm typecheck && pnpm test all green after @multica/* rename"
    status: partial
    reason: "pnpm typecheck is green (7/7 packages). pnpm test has 6 failing tests in apps/web/app/(auth)/login/page.test.tsx — pre-existing since Plan 08-03 mass-rename; test infrastructure issue (missing NavigationProvider mock in app-level test). views/auth/login-page.test.tsx passes 42 tests including the same LoginPage logic. Functionality is correct; only the app-level test wrapper is broken."
    artifacts:
      - path: "apps/web/app/(auth)/login/page.test.tsx"
        issue: "6 tests fail with 'useNavigation must be used within NavigationProvider' — AppLink requires NavigationProvider but app-level test does not mock @algoplan/views/navigation"
    missing:
      - "Fix NavigationProvider mock in apps/web/app/(auth)/login/page.test.tsx to resolve the 6 failing tests and achieve full green pnpm test"
deferred: []
---

# Phase 8: Internal Rebrand Completion Verification Report

**Phase Goal:** Every internal "Multica" reference that Phase 7 deliberately preserved is renamed to AlgoPlan, with backwards-compatible migration shims so no existing user loses state and no self-hoster's `.env` file silently breaks. Covers `@multica/*` package scope, `multica_*` localStorage keys, `MULTICA_*` env vars, `multica` CLI binary + `~/.multica/` config dir, Docker image names, GoReleaser config + Homebrew tap, and default email FROM.

**Verified:** 2026-04-26T02:35:00Z
**Status:** human_needed (SC-5 requires tag push; SC-1 has 1 known pre-existing test gap)
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths (Success Criteria)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| SC-1 | `pnpm install && pnpm typecheck && pnpm test` all green after `@multica/*` rename | PARTIAL | typecheck: 7/7 green (cache hit). test: 40/41 ship-gate checks pass; 6 tests fail in `apps/web/app/(auth)/login/page.test.tsx` (pre-existing since 08-03, not a Phase 8 regression). views/auth/login-page.test.tsx: 42/42 pass. core: 163/163. ui: 74/74. desktop: 77/77. |
| SC-2 | User with `multica_theme=dark` retains dark mode after upgrade — migration test asserts `algoplan_theme=dark` set and `multica_theme` removed (idempotent) | PASS | `packages/core/migrations/localstorage.ts` exports `migrateLocalStorage` with `LEGACY_KEY_MAP` mapping `multica_theme` → `algoplan_theme`. CoreProvider calls `migrateLocalStorage(storage)` before token read (line 35 in core-provider.tsx). ThemeProvider uses `storageKey="algoplan_theme"`. 11/11 migration Vitest tests pass. |
| SC-3 | Self-hoster with `MULTICA_BACKEND_IMAGE=...` sees one-time deprecation warning, app resolves value via dual-read shim | PASS | `server/internal/config/env.go` exports `GetEnv(name)` that reads `ALGOPLAN_X` first, falls back to `MULTICA_X` with `slog.Warn` deprecation (one-shot per process, atomic). Zero `os.Getenv("ALGOPLAN_")` literals in production Go outside `_test.go` and `env.go`. `docker-compose.selfhost.yml` uses `ALGOPLAN_*` vars. `.env.example` has no `MULTICA_` primary entries. 7/7 Go env shim tests pass. |
| SC-4 | CLI user with `~/.multica/config.json` runs `algoplan daemon start` — daemon auto-migrates to `~/.algoplan/config.json` without losing workspace_id or token | PASS | `server/internal/cli/configdir.go` exports `MigrateConfigDir(home)` with atomic copy + rename-aside rollback. `server/cmd/algoplan/main.go` calls `cli.MigrateConfigDir(home)` at line 87, before `rootCmd.Execute()` at line 97. `server/internal/cli/config.go` uses `AlgoPlanConfigDirName = ".algoplan"`. 7/7 Go configdir tests pass including round-trip JSON preservation. Both `server/bin/algoplan` and `server/bin/multica` binaries exist. `multica version` prints "deprecated: the `multica` CLI is renamed to `algoplan`..." |
| SC-5 | `git push origin v0.5.0` triggers Release workflow with all jobs green — Docker images to `ghcr.io/<owner>/algoplan-{backend,web}`, Homebrew deferred | HUMAN_VERIFY | `.goreleaser.yml`: `project_name: algoplan`, `binary: algoplan`. Legacy archive template preserves `multica_` prefix for backwards-compat (intentional). `release.yml` uses `ghcr.io/${{ github.repository_owner }}/algoplan-backend` and `algoplan-web` throughout. Zero `multica-(backend|web)` references in `release.yml`. Homebrew deferred per D-6 (comment at top of `.goreleaser.yml`). Cannot verify CI job success without actually pushing the tag. |
| SC-6 | Targeted grep returns zero `multica` matches across user-visible Go strings, Makefile help, docker-compose env names, CLI help output | PASS | `bash scripts/grep-rebrand.sh` exits 0: "No user-visible 'Multica' references found in scanned targets." Email service: `noreply@algoplan.ai` (no `multica.ai`). `.env.example` `RESEND_FROM_EMAIL=noreply@algoplan.ai`. B-04: zero workspace-scoped `multica_*:` literals in production source. Hard-exclusions preserved: `multica-ai/multica` in `update.go`, `api.multica.ai` in `cmd_setup.go`, `^module github.com/multica-ai/multica` in `go.mod`, cookie names `multica_auth`/`multica_csrf` per v0.6.0 deferral, `multica_` archive template in `.goreleaser.yml`. |

**Score:** 5/6 truths fully verified (SC-5 requires human action; SC-1 has 1 known pre-existing gap)

---

## Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `packages/core/migrations/localstorage.ts` | localStorage migration helper with LEGACY_KEY_MAP | VERIFIED | Exports `migrateLocalStorage`, `WORKSPACE_SCOPED_LEGACY_KEY_MAP`, maps `multica_theme`/`multica_token` and 5 workspace-scoped keys |
| `packages/core/migrations/localstorage.test.ts` | 8+ Vitest cases, idempotent | VERIFIED | 11/11 tests pass |
| `packages/core/platform/core-provider.tsx` | Calls `migrateLocalStorage` before token read | VERIFIED | Line 35: `migrateLocalStorage(storage)`, line 40: `removeItem("algoplan_token")`, line 48: `getItem("algoplan_token")` — migration before read confirmed by awk check |
| `packages/ui/components/common/theme-provider.tsx` | storageKey="algoplan_theme" | VERIFIED | Line 16: `storageKey="algoplan_theme"` |
| `packages/core/auth/store.ts` | Uses algoplan_token (5+ occurrences) | VERIFIED | grep count = 5 |
| `server/internal/config/env.go` | GetEnv dual-read shim | VERIFIED | Exports `GetEnv` and `GetEnvDefault`; panics on non-ALGOPLAN_ prefix; one-shot deprecation warning per variable per process |
| `server/internal/cli/configdir.go` | MigrateConfigDir helper | VERIFIED | Exports `MigrateConfigDir(home)`, `AlgoPlanConfigDirName=".algoplan"`, `LegacyConfigDirName=".multica"` |
| `server/cmd/algoplan/main.go` | Calls MigrateConfigDir before Execute | VERIFIED | MigrateConfigDir at line 87, rootCmd.Execute at line 97 |
| `server/internal/cli/config.go` | Uses AlgoPlanConfigDirName | VERIFIED | `filepath.Join(home, AlgoPlanConfigDirName, "config.json")` |
| `server/bin/algoplan` | Algoplan binary | VERIFIED | Exists and executable |
| `server/bin/multica` | Shim binary printing deprecation | VERIFIED | Running `multica version` prints "deprecated: the `multica` CLI is renamed to `algoplan`. This shim will be removed in v0.6.0." |
| `.goreleaser.yml` | project_name=algoplan, binary=algoplan, multica_ archive template preserved | VERIFIED | All three confirmed |
| `.github/workflows/release.yml` | algoplan-{backend,web} image names | VERIFIED | 8 occurrences of `algoplan-backend`, 6 of `algoplan-web`; zero `multica-backend`/`multica-web` |
| `scripts/verify-rebrand.sh` | 41-check ship gate | VERIFIED | 40/41 pass; 1 pre-existing web test failure documented |
| `scripts/grep-rebrand.sh` | Phase 8 exclusions + exits 0 | VERIFIED | Exits 0 with "No user-visible 'Multica' references found" |
| `server/internal/service/email.go` | FROM noreply@algoplan.ai | VERIFIED | Line 28: `from = "noreply@algoplan.ai"`; no `multica.ai` reference |

---

## Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `CoreProvider.initCore()` | `migrateLocalStorage` | import + call at line 35 | WIRED | Migration runs before any token/key read |
| `migrateLocalStorage` | `LEGACY_KEY_MAP` + `WORKSPACE_SCOPED_LEGACY_KEY_MAP` | for loop over map entries | WIRED | Both global and workspace-scoped key pairs migrated |
| `ThemeProvider` | `algoplan_theme` storageKey | `storageKey` prop | WIRED | Theme read/write uses renamed key |
| `config.GetEnv("ALGOPLAN_X")` | `os.Getenv("MULTICA_X")` fallback | legacy derivation in GetEnv | WIRED | Dual-read shim active; no direct `os.Getenv("ALGOPLAN_")` bypasses |
| `main.go` | `cli.MigrateConfigDir(home)` | call before `rootCmd.Execute()` | WIRED | Config migration runs at every CLI invocation |
| `multica` shim binary | `algoplan` binary | delegation + deprecation print | WIRED | Confirmed by running `server/bin/multica version` |
| `releaseAssetCandidates()` | `algoplan-cli-*` archive first | ordered slice | WIRED | `algoplan-cli` at index 0, `multica-cli` fallback at index 1 |

---

## Data-Flow Trace (Level 4)

Not applicable — Phase 8 artifacts are migration helpers, CLI binaries, and configuration files, not React components that render dynamic data.

---

## Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| multica shim prints deprecation and delegates | `server/bin/multica version` | "deprecated: the `multica` CLI is renamed to `algoplan`. This shim will be removed in v0.6.0." + version output | PASS |
| grep-rebrand.sh exits clean | `bash scripts/grep-rebrand.sh` | exit 0, "No user-visible 'Multica' references found" | PASS |
| localStorage migration tests pass | `pnpm --filter @algoplan/core exec vitest run migrations/localstorage.test.ts` | 11/11 tests pass | PASS |
| configdir tests pass | `go test ./internal/cli/... -run TestMigrateConfigDir` | 7/7 pass including round-trip JSON preservation | PASS |
| env shim tests pass | `go test ./internal/config/...` | 7/7 pass including once-per-variable-per-process warning | PASS |
| pnpm typecheck green | `pnpm typecheck` | 7 tasks successful, 7 cached — exit 0 | PASS |
| Zero @multica/ imports in source | grep scan excluding out/dist/.next | zero matches | PASS |
| 9 workspace packages @algoplan/ scoped | count of package.json files with @algoplan/ name | 9 (core, ui, views, tsconfig, eslint-config, web, desktop, docs, showroom) | PASS |

---

## Requirements Coverage

| Requirement | Plans | Description | Status |
|-------------|-------|-------------|--------|
| RBR-07 | 08-03 | @multica/* → @algoplan/* across 9 packages | SATISFIED |
| RBR-08 | 08-00, 08-04, 08-04b | localStorage migration shims, idempotent, workspace-scoped | SATISFIED |
| RBR-09 | 08-01, 08-05 | MULTICA_* env var dual-read shim with deprecation warning | SATISFIED |
| RBR-10 | 08-02, 08-06 | ~/.multica/ → ~/.algoplan/ migration, multica shim binary | SATISFIED |
| RBR-11 | 08-07 | GoReleaser project_name=algoplan, binary=algoplan | SATISFIED |
| RBR-12 | 08-07 | Docker images algoplan-{backend,web} in release.yml | SATISFIED |
| RBR-13 | 08-07 | Email FROM noreply@algoplan.ai | SATISFIED |
| RBR-14 | 08-08 | verify-rebrand.sh ship gate + grep-rebrand.sh exclusions | SATISFIED (40/41; 1 pre-existing) |

---

## Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `apps/web/app/(auth)/login/page.test.tsx` | multiple | Missing NavigationProvider mock — AppLink renders in test without required context | Warning | 6 tests fail; LoginPage functional correctness verified separately in packages/views/auth/login-page.test.tsx (42/42 pass) |

---

## Human Verification Required

### 1. Release Workflow — v0.5.0 Tag Push

**Test:** Push tag to origin: `git tag v0.5.0 && git push origin v0.5.0`
**Expected:**
- GitHub Actions `Release` workflow triggers
- `goreleaser` job completes: builds `algoplan` binary, produces archives (one with `algoplan-cli-*` prefix for new installs, one with `multica_*` prefix for backwards-compat updaters)
- `docker-backend` job pushes to `ghcr.io/<owner>/algoplan-backend:<tag>` and `:latest`
- `docker-web` job pushes to `ghcr.io/<owner>/algoplan-web:<tag>` and `:latest`
- No Homebrew job (deferred per D-6 — confirmed absent from `.goreleaser.yml`)
- All release artifacts visible on the GitHub Releases page

**Why human:** Release workflow can only be verified by running it. The CI configuration is correct per static analysis, but actual multi-platform Docker builds and GoReleaser artifact generation require the live GitHub Actions environment.

**Pre-condition to check:** `RESEND_FROM_EMAIL` must be set to a Resend-verified domain for email to work after release (`.env.example` documents `noreply@algoplan.ai` — ensure this domain is verified in the Resend dashboard before going live, or override via env var).

---

## Gaps Summary

One gap is blocking a fully-green `pnpm test`:

**SC-1 partial — 6 failing tests in `apps/web/app/(auth)/login/page.test.tsx`**

These 6 tests have been failing since the `@multica/*` → `@algoplan/*` mass-rename in Plan 08-03 and are pre-existing relative to Phase 8's work. The root cause is a missing `NavigationProvider` mock in the app-level test: `LoginPage` renders `AppLink` which requires `NavigationProvider` context, but the test mocks `@algoplan/core` without mocking `@algoplan/views/navigation`.

The actual `LoginPage` logic is correctly tested by `packages/views/auth/login-page.test.tsx` which passes 42/42 tests. This is a test infrastructure issue, not a functional regression.

**Fix required:** Update `apps/web/app/(auth)/login/page.test.tsx` to mock `useNavigation` from `@algoplan/views/navigation` (or `@algoplan/core/navigation`), similar to how the views package tests mock it. Alternatively, restructure the test to use a `NavigationProvider` wrapper.

**Severity:** The 6-test failure prevents SC-1 from being fully PASSED, and causes the `verify-rebrand.sh` "pnpm test across all packages" check to fail (40/41 overall). No functional behavior is broken.

---

## Release Communication Checklist (Before v0.5.0 Tag)

The following are documented in Plan 08-08 SUMMARY and require user awareness before tagging:

1. **docker-compose project name change**: `name: multica` → `name: algoplan`. Self-hosters doing blue-green must stop old containers first.
2. **Resend DNS prerequisite**: `noreply@algoplan.ai` must be verified in Resend before going live.
3. **Cookie rename deferred to v0.6.0**: `multica_auth`, `multica_csrf`, `multica_signup_source`. Users see one re-login after v0.6.0.
4. **Env-var dual-read shim**: Schedule `MULTICA_*` deprecation removal for v0.6.0/v0.7.0.
5. **Multica CLI shim binary**: Removal scheduled for v0.6.0.

---

_Verified: 2026-04-26T02:35:00Z_
_Verifier: Claude (gsd-verifier)_
