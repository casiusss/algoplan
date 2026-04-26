---
phase: 08-internal-rebrand-completion
plan: "06"
subsystem: cli-rename
tags: [cli, binary-rename, config-migration, shim, go]
dependency_graph:
  requires: [08-02, 08-05]
  provides: [algoplan-binary, multica-shim, config-dir-flip]
  affects: [server/cmd/algoplan, server/cmd/multica, server/internal/cli, Makefile]
tech_stack:
  added: []
  patterns: [shim-binary, exec-delegate, sibling-first-lookup, migration-at-boot]
key_files:
  created:
    - server/cmd/multica/main.go
    - server/cmd/algoplan/ (27 files moved from server/cmd/multica via git mv)
  modified:
    - server/internal/cli/config.go
    - server/internal/cli/update.go
    - Makefile
decisions:
  - "Shim uses sibling-first lookup (same dir as itself) then falls back to PATH; avoids $PATH attack for Homebrew/release-archive installs"
  - "MigrateConfigDir called in func main() before rootCmd.Execute(), not in init(); init() runs in arbitrary order across files"
  - "Shim removal scheduled v0.6.0 per D-4 (documented in shim source comment)"
  - "Keep multica Makefile target as deprecated alias (warns + forwards to algoplan)"
metrics:
  duration_minutes: 128
  completed_date: "2026-04-26"
  tasks_completed: 2
  tasks_total: 2
  files_changed: 31
---

# Phase 08 Plan 06: CLI Binary Rename multica → algoplan Summary

One-liner: Renamed CLI entrypoint from `server/cmd/multica` to `server/cmd/algoplan` via git mv (history preserved), flipped `~/.multica/` config dir to `~/.algoplan/` via AlgoPlanConfigDirName constant, wired Plan 08-02's MigrateConfigDir at CLI bootstrap before `rootCmd.Execute()`, and built a 61-line multica shim binary that prints a deprecation warning and exec-delegates to algoplan.

## Tasks Completed

| # | Name | Commit | Key Files |
|---|------|--------|-----------|
| 1 | Move cmd/multica → cmd/algoplan, flip config dir, wire MigrateConfigDir, update help text | fd6f3996 | server/cmd/algoplan/*.go (27 files), server/internal/cli/config.go, server/internal/cli/update.go |
| 2 | Create multica shim binary + update Makefile | c071ea7b | server/cmd/multica/main.go, Makefile |

## What Was Built

### Task 1: Directory move + config + MigrateConfigDir

- `git mv server/cmd/multica/* server/cmd/algoplan/` — all 27 Go files moved with history preserved
- `server/internal/cli/config.go` — dropped `defaultCLIConfigPath` constant, replaced all three `".multica"` literals with `AlgoPlanConfigDirName` from Plan 08-02's `configdir.go`
- `server/cmd/algoplan/main.go` — added `cli.MigrateConfigDir(home)` call inside `func main()` before `rootCmd.Execute()`; flipped `Use`/`Short`/`SetVersionTemplate` to `algoplan`
- Help-text strings updated across: `help.go`, `cmd_setup.go`, `cmd_config.go`, `cmd_agent.go`, `cmd_auth.go`, `cmd_login.go`, `cmd_workspace.go`, `cmd_update.go`, `cmd_version.go`, `cmd_attachment.go`
- `server/internal/cli/update.go` — `binaryName := "algoplan"` / `"algoplan.exe"`, temp file `"algoplan-update-*"`
- Hard-exclusions preserved: `api.multica.ai` cloud URL (7 occurrences in cmd_setup.go), `multica-ai/multica` git remote (4 occurrences in update.go)

### Task 2: Shim binary + Makefile

- `server/cmd/multica/main.go` — 61-line shim: prints deprecation message to stderr, finds `algoplan` binary via sibling-first lookup (same directory as running binary) then falls back to `exec.LookPath`, forwards stdin/stdout/stderr/exit-code
- Makefile updated:
  - New `algoplan` target: `go run ./cmd/algoplan`
  - `multica` target: deprecated alias with warning, forwards to `algoplan`
  - `cli` target: now delegates to `algoplan`
  - `daemon` target: now delegates to `algoplan`
  - `build` target: produces `bin/algoplan` AND `bin/multica`
  - `.PHONY`: added `algoplan`

## Verification Results

All checks passed:

```
make build                              → exit 0; produces bin/algoplan + bin/multica
server/bin/algoplan version             → "algoplan v0.4.0-29-gc071ea7b ..."
server/bin/multica version (stderr)     → "deprecated: the `multica` CLI is renamed to `algoplan`..."
server/bin/multica version (exit code)  → 0
go test ./cmd/algoplan/... ./internal/cli/... → ok (both packages)
git log --follow server/cmd/algoplan/cmd_setup.go → 7 commits (history preserved)
awk ordering check (MigrateConfigDir before rootCmd.Execute) → PASS
grep AlgoPlanConfigDirName config.go → 4 occurrences
grep "api.multica.ai" cmd_setup.go → 7 (preserved)
grep "multica-ai/multica" update.go → 4 (preserved)
```

MigrateConfigDir fired during smoke test (user had real `~/.multica/`), confirming the migration path works end-to-end.

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None. The shim is fully functional: sibling lookup succeeds for any `make build` install (both binaries in `server/bin/`), PATH fallback handles custom installs.

## Threat Flags

No new trust boundaries introduced beyond those in the plan's threat model. T-08-06-01 (PATH attack) is accepted; sibling-first lookup mitigates for packaged installs. T-08-06-03 (MigrateConfigDir failure) is mitigated — error is logged to stderr and CLI continues.

## Self-Check

PASSED:
- `server/cmd/algoplan/main.go` exists
- `server/cmd/multica/main.go` exists (shim)
- `server/internal/cli/config.go` exists with AlgoPlanConfigDirName
- `server/bin/algoplan` and `server/bin/multica` built
- Commits fd6f3996 and c071ea7b verified in git log
