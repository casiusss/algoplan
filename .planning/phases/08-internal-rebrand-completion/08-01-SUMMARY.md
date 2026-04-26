---
phase: 08-internal-rebrand-completion
plan: "01"
subsystem: server/config
tags: [env-shim, backwards-compat, rebrand, go, tdd]
dependency_graph:
  requires: []
  provides:
    - "github.com/multica-ai/multica/server/internal/config.GetEnv"
    - "github.com/multica-ai/multica/server/internal/config.GetEnvDefault"
    - "github.com/multica-ai/multica/server/internal/config.ResetDeprecationWarnings"
  affects:
    - server/cmd/multica/ (Wave 3 call-site sweep via Plan 08-05)
    - server/internal/daemon/ (Wave 3)
    - server/internal/handler/ (Wave 3)
tech_stack:
  added:
    - "server/internal/config package (new)"
  patterns:
    - "sync.Map once-tracker for atomic per-key deprecation warnings"
    - "slog.Warn for structured deprecation logging (value-safe: logs only names, never values)"
key_files:
  created:
    - server/internal/config/env.go
    - server/internal/config/env_test.go
  modified: []
decisions:
  - "Panic on non-ALGOPLAN_-prefixed name (caller bug guard) — prevents Plan 08-05 from accidentally writing config.GetEnv(\"MULTICA_X\")"
  - "Legacy name derived mechanically: MULTICA_ + TrimPrefix(name, ALGOPLAN_) — no hardcoded enum"
  - "slog.Warn logs only variable NAME, never os.Getenv value — mitigates T-08-01-02 info disclosure"
  - "sync.Map (not sync.Once per-key) chosen for concurrency-safe per-variable once-tracking"
  - "ResetDeprecationWarnings() is exported for test isolation only — no production usage"
metrics:
  duration: "~10 minutes"
  completed: "2026-04-26T23:07:43Z"
  tasks_completed: 2
  files_created: 2
  files_modified: 0
  tests_added: 8
---

# Phase 8 Plan 01: Env-Var Dual-Read Shim Summary

**One-liner:** Go `config.GetEnv` shim reads `ALGOPLAN_X` first, falls back to `MULTICA_X` with one-shot `slog.Warn` per variable per process, proven by 8 TDD tests.

## What Was Built

A new `server/internal/config` package providing:

- `GetEnv(name string) string` — reads `ALGOPLAN_X`, falls back to `MULTICA_X` with deprecation warning
- `GetEnvDefault(name, defaultValue string) string` — `GetEnv` with caller-supplied fallback
- `ResetDeprecationWarnings()` — test-only helper to clear the once-tracker between tests

The shim satisfies the D-3 decision from the Phase 8 context: self-hosters running with `MULTICA_*` variables in `.env` files will see a single deprecation log line per variable but their deployments will not break when they upgrade.

## Threat Mitigations Applied

| Threat ID | Mitigation |
|-----------|-----------|
| T-08-01-02 | `slog.Warn` logs only the variable NAME (e.g. `MULTICA_BACKEND_IMAGE`), never the value — confirmed by `captureSlog` tests inspecting log output |
| T-08-01-03 | `sync.Map` once-tracker enforces exactly 1 warning per variable per process — proven by `TestGetEnv_WarnsOnlyOnceAcrossManyReads` (100 reads → 1 log line) |

## TDD Gate Compliance

| Gate | Commit | Status |
|------|--------|--------|
| RED (test) | `4848e9c8` — `test(08-01): add failing tests for GetEnv dual-read shim` | PASS |
| GREEN (impl) | `20822f88` — `feat(08-01): implement GetEnv dual-read shim for MULTICA_X -> ALGOPLAN_X` | PASS |
| REFACTOR | Not needed — implementation is clean as written | N/A |

## Test Summary

8 tests, all passing (`go test ./internal/config/... -count=1 -v`):

| Test | Behavior |
|------|---------|
| `TestGetEnv_PrefersNewName` | `ALGOPLAN_X` set → returns new value, no warning |
| `TestGetEnv_FallsBackToLegacyWithWarning` | Only `MULTICA_X` set → returns legacy value, warning names both vars |
| `TestGetEnv_WarnsOnlyOnceAcrossManyReads` | 100 reads with legacy-only → exactly 1 warning |
| `TestGetEnv_OnePerVarName` | Two different legacy vars → two separate warnings (one each) |
| `TestGetEnv_EmptyLegacyTreatedAsUnset` | Empty `MULTICA_X=""` → returns `""`, no warning |
| `TestGetEnvDefault_FallsBackToProvidedDefault` | Neither set → returns provided default |
| `TestGetEnv_PanicsOnNonAlgoPlanName` | `config.GetEnv("MULTICA_X")` → panic with descriptive message |
| `TestWarnedOnce_AtomicSemantics` | `sync.Map LoadOrStore` → exactly 1 initial store across 50 concurrent-like calls |

## Commits

| Hash | Type | Description |
|------|------|-------------|
| `4848e9c8` | test | Failing test suite (RED gate) |
| `20822f88` | feat | Implementation (GREEN gate) |

## Deviations from Plan

None — plan executed exactly as written.

The implementation matches the code block in the plan's `<action>` section verbatim, with the only variation being that the test file was committed first (TDD RED before GREEN) as required by the TDD protocol.

## Known Stubs

None — no placeholder values, no hardcoded data, no TODO/FIXME markers.

## What Plan 08-05 Must Do

- Replace all `os.Getenv("MULTICA_X")` calls with `config.GetEnv("ALGOPLAN_X")`
- Replace `cli.FlagOrEnv(cmd, flag, "MULTICA_X", default)` with a dual-name variant or call `config.GetEnv("ALGOPLAN_X")` before passing to `FlagOrEnv`
- Do NOT call `config.GetEnv("MULTICA_X")` — it will panic

## Self-Check

- [x] `server/internal/config/env.go` exists at correct path
- [x] `server/internal/config/env_test.go` exists at correct path
- [x] Commit `4848e9c8` exists (test RED)
- [x] Commit `20822f88` exists (feat GREEN)
- [x] `go build ./internal/config/...` exits 0
- [x] `go vet ./internal/config/...` exits 0
- [x] `go test ./internal/config/... -count=1` exits 0 with 8 PASS

## Self-Check: PASSED
