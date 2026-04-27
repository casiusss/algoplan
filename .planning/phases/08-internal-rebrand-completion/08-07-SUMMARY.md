---
phase: 08-internal-rebrand-completion
plan: "07"
subsystem: release-pipeline
tags: [goreleaser, docker, email, cli, self-update, rebrand]
dependency_graph:
  requires: [08-03, 08-06]
  provides: [release-pipeline-algoplan-naming, docker-image-algoplan-naming, email-default-algoplan, cli-update-algoplan-lookup]
  affects: [.goreleaser.yml, .github/workflows/release.yml, docker-compose.selfhost.yml, docker-compose.selfhost.build.yml, server/internal/service/email.go, server/internal/cli/update.go]
tech_stack:
  added: []
  patterns: [goreleaser-archive-naming, self-update-lookup-priority, resend-email-service]
key_files:
  created:
    - path: server/internal/service/email_test.go (extended — TestEmailServiceDefaultFrom added)
  modified:
    - .goreleaser.yml
    - .github/workflows/release.yml
    - docker-compose.selfhost.yml
    - docker-compose.selfhost.build.yml
    - server/internal/service/email.go
    - server/internal/service/email_test.go
    - server/internal/cli/update.go
    - server/internal/cli/update_test.go
    - .env.example
    - Makefile
decisions:
  - "D-6: Homebrew publish deferred (Option B). The legacy multica-ai/homebrew-tap is read-only for this fork. Users install via go install or release binary downloads until an algoplan-ai org or fork-owned tap exists."
  - "Legacy archive name_template uses literal multica_ prefix (not {{ .ProjectName }}) to preserve backwards-compat for pre-v0.5.0 CLI self-updates."
  - "releaseAssetCandidates priority order: algoplan-cli-* > multica-cli-* > multica_ (three entries, not two)."
metrics:
  duration: "227s (~4 min)"
  completed: "2026-04-27"
  tasks_completed: 2
  files_changed: 10
---

# Phase 8 Plan 07: Release Pipeline Rename Summary

GoReleaser renamed to `algoplan`, Docker image suffixes flipped to `algoplan-{backend,web}`, email FROM default changed to `noreply@algoplan.ai`, self-update lookup prioritises algoplan-cli-* archives, Homebrew publish deferred per D-6.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | D-6 Homebrew defer + GoReleaser project rename | 21d2b1b3 | `.goreleaser.yml` |
| 2 | Release pipeline, Docker, email, self-update lookup | 45ccbf9b | 9 files |

## D-6 Decision: Homebrew Defer (Option B)

**Decision:** Remove the `brews:` block from `.goreleaser.yml` entirely for v0.5.0.

**Rationale:**
- `multica-ai/homebrew-tap` is read-only for this fork; pushing to it on v0.5.0 tag would fail the release job
- Creating a new `algoplan-ai/homebrew-tap` requires the algoplan-ai GitHub org to exist first (out of scope for Phase 8)
- Homebrew is a convenience channel, not a correctness requirement for v0.5.0
- Users have two clean alternatives: `go install` or direct binary download from Releases page

**When to revisit:** Phase 9+ once `algoplan-ai` GitHub org is provisioned. Restore a `brews:` block targeting `algoplan-ai/homebrew-tap` with a new `HOMEBREW_TAP_GITHUB_TOKEN` secret.

**Makefile help-text updated** to reflect `go install` + release binary download as the two install paths.

## Changes Made

### `.goreleaser.yml`
- `project_name: multica` → `project_name: algoplan`
- `builds.id/binary/main`: `multica` → `algoplan`, `./cmd/multica` → `./cmd/algoplan`
- `archives.legacy.name_template`: changed from `{{ .ProjectName }}_{{ .Os }}_{{ .Arch }}` to literal `multica_{{ .Os }}_{{ .Arch }}` — **critical**: without this, the legacy archive would render as `algoplan_*` breaking pre-v0.5.0 self-updates
- `archives.versioned.name_template`: unchanged template, auto-renders as `algoplan-cli-*` via `{{ .ProjectName }}`
- `brews:` block removed (D-6 Option B); header comment documents deferral rationale

### `.github/workflows/release.yml`
- All `multica-backend` → `algoplan-backend` (5 occurrences: lines 109, 138, 175, 195, 200)
- All `multica-web` → `algoplan-web` (5 occurrences: lines 226, 255, 292, 312, 317)
- OCI labels: `Multica Backend` → `AlgoPlan Backend`, `Multica Web` → `AlgoPlan Web`
- OCI descriptions updated to match

### `docker-compose.selfhost.yml`
- `name: multica` → `name: algoplan`
- Backend image default: `ghcr.io/multica-ai/multica-backend` → `ghcr.io/multica-ai/algoplan-backend`
- Frontend image default: `ghcr.io/multica-ai/multica-web` → `ghcr.io/multica-ai/algoplan-web`
- `RESEND_FROM_EMAIL` default in environment block: `noreply@multica.ai` → `noreply@algoplan.ai`

### `docker-compose.selfhost.build.yml`
- `image: multica-backend:dev` → `image: algoplan-backend:dev`
- `image: multica-web:dev` → `image: algoplan-web:dev`

### `server/internal/service/email.go`
- Default sender: `noreply@multica.ai` → `noreply@algoplan.ai` (line 28)

### `server/internal/service/email_test.go` (W-04)
- Added `TestEmailServiceDefaultFrom`: regression lock asserting `NewEmailService()` returns `noreply@algoplan.ai` as default `fromEmail` when `RESEND_FROM_EMAIL` env var is unset
- Uses `t.Setenv("RESEND_FROM_EMAIL", "")` for clean env isolation

### `server/internal/cli/update.go`
- `releaseAssetCandidates` now returns **3** entries (was 2):
  1. `algoplan-cli-{version}-{os}-{arch}.{ext}` (preferred, v0.5.0+)
  2. `multica-cli-{version}-{os}-{arch}.{ext}` (legacy pre-v0.5.0)
  3. `multica_{os}_{arch}.{ext}` (very-legacy, very old binaries)

### `server/internal/cli/update_test.go`
- All `TestReleaseAssetCandidates` table cases updated to expect 3-entry lists with `algoplan-cli-*` first
- Added `TestReleaseAssetCandidates_OrdersAlgoplanFirst` explicit priority assertion
- `TestFindReleaseAsset` updated: "prefers versioned" now tests `algoplan-cli-*` priority; added "falls back to multica-cli" case; existing very-legacy fallback test preserved

### `.env.example`
- `ALGOPLAN_BACKEND_IMAGE` default: `ghcr.io/multica-ai/multica-backend` → `ghcr.io/multica-ai/algoplan-backend`
- `ALGOPLAN_WEB_IMAGE` default: `ghcr.io/multica-ai/multica-web` → `ghcr.io/multica-ai/algoplan-web`
- `RESEND_FROM_EMAIL` default: `noreply@multica.ai` → `noreply@algoplan.ai` with added comment about Resend DNS requirement

### `Makefile`
- `selfhost` target: image echo lines updated to `algoplan-backend/web`; CLI install instructions → `go install` + release binary (D-6 defer)
- `selfhost-build` target: "Local tags: multica-*" → "algoplan-*"; CLI install updated
- Progress messages: "Pulling official Multica images" → "AlgoPlan"; "Building Multica" → "AlgoPlan"; "Stopping Multica" → "AlgoPlan"; "✓ Multica is running!" → "✓ AlgoPlan is running!"

## Test Results

```
ok  github.com/multica-ai/multica/server/internal/service  0.179s
ok  github.com/multica-ai/multica/server/internal/cli      0.460s
```

All tests pass including the new W-04 regression lock.

## GoReleaser Validation

`goreleaser` CLI is not installed in the local environment. YAML syntax was verified by inspection. Full validation will occur on the next tag push via CI (`goreleaser/goreleaser-action@v6`).

## Threat Surface Scan

No new network endpoints, auth paths, or trust boundaries introduced. T-08-07-02 (email deliverability) and T-08-07-03 (docker image gap between commit and v0.5.0 tag) are accepted as documented in the plan's threat model. T-08-07-04 (self-update compat) is mitigated by the literal `multica_` legacy archive and the 3-entry lookup order.

## Known Stubs

None — all changes are functional with no placeholder data.

## Deviations from Plan

### Auto-additions (Rule 2)

**1. [Rule 2 - Missing] docker-compose.selfhost.yml RESEND_FROM_EMAIL default**
- **Found during:** Task 2
- **Issue:** `docker-compose.selfhost.yml` had `RESEND_FROM_EMAIL: ${RESEND_FROM_EMAIL:-noreply@multica.ai}` hardcoded in the environment block — not covered by plan's explicit file list but required for correctness
- **Fix:** Updated compose default to `noreply@algoplan.ai`
- **Files modified:** `docker-compose.selfhost.yml`
- **Commit:** 45ccbf9b

**2. [Rule 2 - Missing] Makefile brand text ("Multica" → "AlgoPlan")**
- **Found during:** Task 2
- **Issue:** Plan only specified the CLI install help-text lines, but additional `selfhost` output strings still said "Multica"
- **Fix:** Updated all `selfhost`/`selfhost-build`/`selfhost-stop` echo strings to AlgoPlan
- **Files modified:** `Makefile`
- **Commit:** 45ccbf9b

## Self-Check: PASSED

All 11 files verified present. Both commits exist:
- `21d2b1b3` feat(08-07): defer homebrew tap, rename goreleaser project to algoplan
- `45ccbf9b` feat(08-07): rename release pipeline, docker images, email default, cli update lookup

W-04 test (`TestEmailServiceDefaultFrom`) passes. All service and cli tests green.
