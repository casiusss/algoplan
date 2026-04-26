---
phase: 08-internal-rebrand-completion
plan: "02"
subsystem: cli-migration
tags: [go, cli, config-dir, migration, tdd]
dependency_graph:
  requires: []
  provides: [MigrateConfigDir, IsAlreadyMigrated, AlgoPlanConfigDirName, LegacyConfigDirName]
  affects: [server/internal/cli/configdir.go, server/internal/cli/configdir_test.go]
tech_stack:
  added: []
  patterns: [copy-verify-rename atomicity, TDD red-green, t.TempDir() isolation]
key_files:
  created:
    - server/internal/cli/configdir.go
    - server/internal/cli/configdir_test.go
  modified: []
decisions:
  - "copyDir uses filepath.WalkDir + filepath.Rel to compute target paths; symlinks copied as symlinks (not followed) — mitigates T-08-02-01 symlink traversal escape"
  - "New dir created with 0o700; per-file copies preserve source mode bits — mitigates T-08-02-02 information disclosure"
  - "Copy → rollback-on-failure (os.RemoveAll partial dest) → rename-legacy-aside ordering — mitigates T-08-02-03 partial-copy DoS"
  - "Legacy renamed to .multica.migrated-{ts} NOT deleted — mitigates T-08-02-04 repudiation"
metrics:
  duration_seconds: 141
  completed_date: "2026-04-26T23:08:26Z"
  tasks_completed: 2
  files_created: 2
  files_modified: 0
  tests_added: 8
---

# Phase 8 Plan 02: CLI Config-Dir Migration Helper Summary

**One-liner:** Pure `MigrateConfigDir(home string)` with atomic copy→rename-aside pattern migrates `~/.multica/` to `~/.algoplan/`, preserving full subtree and mode bits, backed by 8 t.TempDir()-isolated Go tests.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 (RED) | Failing tests for MigrateConfigDir | `4225f50b` | server/internal/cli/configdir_test.go |
| 2 (GREEN) | Implement MigrateConfigDir + IsAlreadyMigrated | `b8354288` | server/internal/cli/configdir.go |

## What Was Built

`server/internal/cli/configdir.go` provides:

- **`MigrateConfigDir(home string) (MigrateResult, error)`** — Pure migration helper. Accepts any directory path as `home` (t.TempDir() in tests, `os.UserHomeDir()` result at callsite in Plan 08-06). Never calls `os.UserHomeDir()` internally.

  Logic matrix:
  - Neither legacy nor new → no-op (`Migrated: false, Reason: "no legacy dir"`)
  - Only legacy → copy legacy to new, rename legacy to `.multica.migrated-{ts}` → `Migrated: true`
  - Only new → no-op (`Migrated: false, Reason: "no legacy dir"`)
  - Both exist → rename legacy aside, leave new untouched → `Migrated: false, Reason: "already migrated; legacy preserved"`

- **`IsAlreadyMigrated(home string) bool`** — Fast-path check: true only when new dir exists and legacy is absent.

- **Constants:** `AlgoPlanConfigDirName = ".algoplan"`, `LegacyConfigDirName = ".multica"`

- **`MigrateResult` struct** with `Migrated bool`, `Reason string`, `LegacyMovedTo string`

## Test Coverage

8 test functions, all using `t.TempDir()`:

1. `TestMigrateConfigDir_NoLegacyDir` — neither dir → no-op
2. `TestMigrateConfigDir_OnlyLegacy_CopiesAndRenamesAside` — main migration path
3. `TestMigrateConfigDir_OnlyNew_NoOp` — already migrated state
4. `TestMigrateConfigDir_BothExist_LegacyRenamedAside` — stale legacy cleanup
5. `TestMigrateConfigDir_Idempotent` — second call is no-op
6. `TestMigrateConfigDir_ValuePreserved_RoundTripJSON` — byte-identical JSON copy
7. `TestMigrateConfigDir_PreservesProfilesSubtree` — profiles/ subtree + mode 0600
8. `TestIsAlreadyMigrated` — boundary conditions

All 8 pass. All pre-existing `./internal/cli/...` tests (10 total) remain GREEN.

## Deviations from Plan

None — plan executed exactly as written.

The acceptance criteria grep patterns for exported symbols (`grep -cE '^(func|const|type) (Migrate|AlgoPlan|Legacy|IsAlready)'`) return 3 instead of the expected >=5 because the constants are declared inside a `const ( ... )` block (indented, no `^const` at line start). This is a grep-pattern limitation in the plan, not an implementation gap — all 5 required exports (`MigrateConfigDir`, `MigrateResult`, `AlgoPlanConfigDirName`, `LegacyConfigDirName`, `IsAlreadyMigrated`) are present and exported.

## Known Stubs

None — `MigrateConfigDir` is a complete implementation. Plan 08-06 wires the callsite in CLI bootstrap.

## Threat Flags

All four threats from the plan's threat model are mitigated by the implementation:

| Threat | File | Mitigation |
|--------|------|-----------|
| T-08-02-01: symlink traversal | configdir.go | Symlinks copied as-is via `os.Symlink`, not followed during WalkDir |
| T-08-02-02: world-readable new dir | configdir.go | `os.MkdirAll(dst, 0o700)` + source mode bits preserved per file |
| T-08-02-03: partial copy DoS | configdir.go | `os.RemoveAll(current)` on copy failure; legacy untouched |
| T-08-02-04: repudiation / lost config | configdir.go | `.multica.migrated-{ts}` rename, `LegacyMovedTo` in result |

## Self-Check: PASSED

- `server/internal/cli/configdir.go`: FOUND
- `server/internal/cli/configdir_test.go`: FOUND
- Commit `4225f50b`: FOUND
- Commit `b8354288`: FOUND
- All 8 migration tests: PASS
- All 18 `./internal/cli/...` tests: PASS
- `go build ./internal/cli/...`: OK
- `go vet ./internal/cli/...`: OK
- No file deletions in commits
