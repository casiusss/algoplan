---
phase: 08-internal-rebrand-completion
plan: "05"
subsystem: server/go-env-vars
tags: [rebrand, env-vars, config, docker-compose, makefile]
dependency_graph:
  requires: ["08-01"]
  provides: ["08-06", "08-07", "08-08"]
  affects: ["server/internal/daemon", "server/cmd/multica", "server/internal/cli"]
tech_stack:
  added: []
  patterns:
    - "config.GetEnv dual-read shim routed through FlagOrEnv and envOrDefault helpers"
    - "isBlockedEnvKey blocks both ALGOPLAN_ and MULTICA_ prefixes for agent custom_env security"
key_files:
  created: []
  modified:
    - server/internal/cli/flags.go
    - server/internal/daemon/config.go
    - server/internal/daemon/helpers.go
    - server/internal/daemon/daemon.go
    - server/internal/daemon/identity.go
    - server/internal/handler/daemon.go
    - server/internal/handler/skill_test.go
    - server/cmd/multica/cmd_agent.go
    - server/cmd/multica/cmd_auth.go
    - server/cmd/multica/cmd_login.go
    - server/cmd/multica/cmd_repo.go
    - server/cmd/multica/cmd_daemon.go
    - server/cmd/multica/cmd_issue.go
    - server/cmd/multica/cmd_workspace.go
    - server/cmd/multica/cmd_autopilot.go
    - server/cmd/multica/help.go
    - server/cmd/multica/main.go
    - server/cmd/multica/cmd_agent_test.go
    - server/cmd/multica/cmd_auth_test.go
    - docker-compose.selfhost.yml
    - Makefile
    - .env.example
    - turbo.json
decisions:
  - "FlagOrEnv internally uses config.GetEnv (Option A — uniform shim) — DRY, one source of truth for dual-read"
  - "daemon/helpers.go envOrDefault/durationFromEnv/intFromEnv use config.GetEnv so ALL env reads in daemon code route through the shim"
  - "isBlockedEnvKey blocks both ALGOPLAN_ and MULTICA_ — security: agent custom_env cannot override daemon-internal vars by either name"
  - "Cookie names (multica_auth, multica_csrf, multica_signup_source) explicitly NOT renamed — see scope clarification below"
  - "Image NAME defaults (multica-backend/multica-web) preserved in compose — Plan 08-07 owns that rename"
  - "MULTICA_DAEMON_CONFIG variable retained in .env.example to ALGOPLAN_DAEMON_CONFIG (follow-up: daemon config file handling not yet wired)"
metrics:
  duration: "~35 minutes"
  completed: "2026-04-26"
  tasks_completed: 2
  tasks_total: 2
  files_changed: 23
---

# Phase 08 Plan 05: ALGOPLAN_* Env-Var Sweep Summary

One-liner: Sweep all Go, docker-compose, Makefile, .env.example, turbo.json MULTICA_* env-var reads to ALGOPLAN_* via the Plan 08-01 dual-read shim — uniform coverage including daemon-internal vars (B-01 Option A).

## What Was Built

### Task 1: Go call-site rewrite (commit e1ee0fc4)

**FlagOrEnv shim-routing (server/internal/cli/flags.go)**
Updated `FlagOrEnv` to call `config.GetEnv(envKey)` internally instead of `os.Getenv(envKey)`. All CLI command flag-or-env lookups now automatically benefit from the dual-read shim.

**Daemon helper functions (server/internal/daemon/helpers.go)**
`envOrDefault`, `durationFromEnv`, `intFromEnv` all switched to `config.GetEnv`. Every daemon config read that goes through these helpers (server URL, poll intervals, agent CLI paths, GC config, etc.) is now shim-routed.

**Daemon config (server/internal/daemon/config.go)**
All `MULTICA_*` env-var reads replaced with `ALGOPLAN_*` via `config.GetEnv`. Error messages updated (`invalid ALGOPLAN_SERVER_URL`, `set ALGOPLAN_WORKSPACES_ROOT to override`). Comment updated for `ALGOPLAN_DAEMON_ID`.

**Daemon agent env injection (server/internal/daemon/daemon.go)**
The `agentEnv` map that is passed to every spawned agent process now uses `ALGOPLAN_*` keys:
- `ALGOPLAN_TOKEN`, `ALGOPLAN_SERVER_URL`, `ALGOPLAN_DAEMON_PORT`, `ALGOPLAN_WORKSPACE_ID`, `ALGOPLAN_AGENT_NAME`, `ALGOPLAN_AGENT_ID`, `ALGOPLAN_TASK_ID`

`isBlockedEnvKey` now blocks BOTH `ALGOPLAN_` and `MULTICA_` prefix — prevents agent `custom_env` from overriding either old or new daemon-internal variable names.

**CLI commands (server/cmd/multica/)**
- `cmd_agent.go`: `newAPIClient` reads `ALGOPLAN_AGENT_ID`/`ALGOPLAN_TASK_ID` for attribution; `inAgentExecutionContext` checks `ALGOPLAN_*`; `resolveServerURL` and `resolveWorkspaceID` pass `ALGOPLAN_*` to `FlagOrEnv`; error messages updated.
- `cmd_auth.go`: `resolveToken` reads `ALGOPLAN_TOKEN`; `resolveAppURL` reads `ALGOPLAN_APP_URL` via `config.GetEnv` then `FRONTEND_ORIGIN` via `os.Getenv` (no ALGOPLAN_ prefix, kept as-is).
- `cmd_login.go`: `tryResolveAppURL` reads `ALGOPLAN_APP_URL` via `config.GetEnv` then `FRONTEND_ORIGIN`.
- `cmd_repo.go`: `ALGOPLAN_DAEMON_PORT`, `ALGOPLAN_WORKSPACE_ID`, `ALGOPLAN_AGENT_NAME`, `ALGOPLAN_TASK_ID`.
- `cmd_daemon.go`: flag help strings updated; `ALGOPLAN_SERVER_URL` in `FlagOrEnv`; `ALGOPLAN_LAUNCHED_BY` via `config.GetEnv`.
- `cmd_issue.go`, `cmd_workspace.go`, `cmd_autopilot.go`: error message strings updated.
- `help.go`: ENVIRONMENT VARIABLES section updated to `ALGOPLAN_*` with legacy deprecation note.
- `main.go`: persistent flag help strings updated.

**Test files**
- `cmd_agent_test.go`: all `t.Setenv("MULTICA_*")` → `t.Setenv("ALGOPLAN_*")`.
- `cmd_auth_test.go`: `MULTICA_APP_URL` → `ALGOPLAN_APP_URL` in existing test; added `TestAppURL_LegacyMulticaEnvVarStillWorks` (end-to-end dual-read proof).
- `skill_test.go`: `MULTICA_RUN_SKILLS_SH_INTEGRATION` → `ALGOPLAN_RUN_SKILLS_SH_INTEGRATION`.

### Task 2: Infrastructure files (commit 7e73d7ae)

**docker-compose.selfhost.yml**
- `${MULTICA_BACKEND_IMAGE:-…}` → `${ALGOPLAN_BACKEND_IMAGE:-…}`
- `${MULTICA_WEB_IMAGE:-…}` → `${ALGOPLAN_WEB_IMAGE:-…}`
- `${MULTICA_IMAGE_TAG:-latest}` → `${ALGOPLAN_IMAGE_TAG:-latest}`
- `MULTICA_APP_URL: ${…}` → `ALGOPLAN_APP_URL: ${…}`
- Image NAME defaults (`multica-backend`, `multica-web`) preserved — Plan 08-07 owns those.

**Makefile**
- `MULTICA_APP_URL`, `MULTICA_SERVER_URL`, `MULTICA_ARGS` → `ALGOPLAN_*`
- Echo lines for image tags/names updated.
- `daemon`, `cli`, `multica` targets updated to use `ALGOPLAN_ARGS`.

**.env.example**
- Deprecation header added at top of file.
- All `MULTICA_*` keys renamed to `ALGOPLAN_*`.
- Image defaults preserved as `ghcr.io/multica-ai/multica-backend` etc. (Plan 08-07 owns the image NAME suffix rename).

**turbo.json**
- `"MULTICA_SERVER_URL"` → `"ALGOPLAN_SERVER_URL"` in `globalEnv`.

## Verification Results

```
go build ./...     PASS
go vet ./...       PASS
go test ./...      PASS (all 22 packages)
make help          PASS (exits 0)
docker compose -f docker-compose.selfhost.yml config  PASS
```

Acceptance criteria:
- Zero `os.Getenv("MULTICA_")` in production Go (shim owns all reads): PASS
- Zero `os.Getenv("ALGOPLAN_")` in production Go (all go through config.GetEnv): PASS
- `flags.go` imports `internal/config`: PASS
- `cmd_auth.go`+`cmd_login.go` use `config.GetEnv("ALGOPLAN_APP_URL")`: PASS (2 occurrences)
- All test files use `t.Setenv("ALGOPLAN_*")`: PASS
- End-to-end compat test `TestAppURL_LegacyMulticaEnvVarStillWorks` exists: PASS
- `.env.example` has DEPRECATION header mentioning MULTICA_: PASS
- `turbo.json` contains `ALGOPLAN_SERVER_URL`: PASS
- `Makefile` has `ALGOPLAN_ARGS` >= 3 occurrences: PASS (5)
- `docker-compose.selfhost.yml` config validates: PASS
- Image NAME default `multica-backend` still present: PASS (Plan 08-07 ownership preserved)

## Deviations from Plan

### Auto-added: daemon/helpers.go shim-routing (Rule 2 — missing critical functionality)

**Found during:** Task 1

**Issue:** The plan specified rewriting `config.go` to call `config.GetEnv`, but `envOrDefault`, `durationFromEnv`, `intFromEnv` in `helpers.go` used `os.Getenv` directly. Since config.go delegated to these helpers, all daemon duration/int/string env reads would bypass the shim.

**Fix:** Updated all three helper functions in `helpers.go` to use `config.GetEnv` instead of `os.Getenv`.

**Files modified:** `server/internal/daemon/helpers.go`

**Commit:** e1ee0fc4

### Auto-added: isBlockedEnvKey dual-prefix check (Rule 2 — missing security control)

**Found during:** Task 1

**Issue:** `isBlockedEnvKey` blocked `MULTICA_` prefix to prevent agent `custom_env` from overriding daemon-internal vars. After renaming the agent env keys to `ALGOPLAN_*`, the blocker needed to cover both prefixes — otherwise an adversarial agent could set `ALGOPLAN_WORKSPACE_ID` in its custom_env to override the daemon's injected value.

**Fix:** Changed `strings.HasPrefix(upper, "MULTICA_")` to `strings.HasPrefix(upper, "ALGOPLAN_") || strings.HasPrefix(upper, "MULTICA_")`.

**Files modified:** `server/internal/daemon/daemon.go`

**Commit:** e1ee0fc4

## Scope Clarification: Cookies NOT renamed

**Decision recorded in CONTEXT D-3 / Plan 08-05:**

Plan 08-05 scope covers SCREAMING_CASE `MULTICA_*` env vars only (D-3: "Env var dual-read shim. MULTICA_* → ALGOPLAN_*").

The following lowercase cookie names are **explicitly out of scope** for this plan:
- `multica_auth` (session cookie in `server/internal/auth/cookie.go`)
- `multica_csrf` (CSRF cookie in `server/internal/auth/cookie.go`)
- `multica_signup_source` (analytics cookie in `server/internal/handler/auth.go`)

**Reason:** Renaming these cookies mid-deploy causes a session-loss event for ALL active users (the old cookie expires from disuse; no new `algoplan_auth` cookie exists until the server sets one). The cookies are server-set HttpOnly and NOT controlled by the operator's `.env` file, so they are a different migration surface from env vars.

**Schedule:** Cookie rename planned for v0.6.0 with explicit release-communication and a grace period where the server accepts BOTH cookie names (dual-read on the HTTP request side).

## Known Stubs

None — all env-var reads are wired to real values.

## Threat Flags

None — this plan only renames existing env-var names; the trust boundary posture (OS env → CLI/server) is unchanged. Dual-prefix blocking in `isBlockedEnvKey` strengthens the existing security control.

## Self-Check: PASSED

Files verified:
- `server/internal/cli/flags.go`: exists, imports config, uses config.GetEnv
- `server/internal/daemon/config.go`: exists, uses ALGOPLAN_ throughout
- `server/internal/daemon/helpers.go`: exists, uses config.GetEnv
- `server/internal/daemon/daemon.go`: exists, agentEnv uses ALGOPLAN_
- `.env.example`: exists, has deprecation header
- `turbo.json`: exists, has ALGOPLAN_SERVER_URL
- `docker-compose.selfhost.yml`: validates

Commits verified:
- e1ee0fc4: feat(08-05): rewrite Go env-var call sites to ALGOPLAN_* via config.GetEnv
- 7e73d7ae: feat(08-05): rename MULTICA_* env vars in docker-compose, Makefile, .env.example, turbo.json
