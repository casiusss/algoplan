# Phase 8: Internal Rebrand Completion - Context

**Gathered:** 2026-04-26
**Status:** Ready for plan-phase
**Mode:** Auto-generated (post Phase 7 follow-on)

<domain>
## Phase Boundary

Every internal "Multica" reference that Phase 7 deliberately preserved — `@multica/*` package scope, `multica_*` localStorage keys, `MULTICA_*` env vars, `multica` CLI binary, `~/.multica/` config dir, Docker image names, Homebrew tap, GoReleaser config, default email FROM — is renamed to AlgoPlan, with backwards-compatible migration shims so no existing user loses state and no self-hoster's `.env` file silently breaks.

**Requirements:** RBR-07, RBR-08, RBR-09, RBR-10, RBR-11, RBR-12, RBR-13, RBR-14 (new req IDs to allocate during planning)

**Depends on:** Phase 7 (user-visible rebrand) — release `v0.4.0` shipped
</domain>

<decisions>
## Implementation Decisions

### LOCKED (from CI failure signals + Phase 7 hard-exclusions doc)

- **D-1: NPM package scope.** `@multica/*` → `@algoplan/*` for all 9 workspace packages (`@multica/ui` → `@algoplan/ui`, etc.). Mechanical rename across:
  - All `package.json` `name` fields (9 files)
  - All `import from "@multica/..."` statements (hundreds)
  - All `tsconfig.json` `paths` mappings
  - `pnpm-workspace.yaml` catalog refs (if any reference @multica/*)
  - `turbo.json` filters (`--filter=@multica/web` → `@algoplan/web` in scripts)

- **D-2: localStorage key migration.** `multica_*` → `algoplan_*` MUST migrate, never replace silently. Migration helper runs once on app boot BEFORE any Zustand persistence reads. Logic: if `algoplan_X` missing AND `multica_X` exists → copy value, then delete old. Must be idempotent + tested. Affected keys (confirmed by grep): `multica_theme`, `multica_token`, plus any `multica_*` discovered in audit.

- **D-3: Env var dual-read shim.** `MULTICA_*` → `ALGOPLAN_*` with one-release-cycle compatibility. Helper `getEnv(name string) string` reads `ALGOPLAN_X` first, falls back to `MULTICA_X` with `slog.Warn("deprecated env var MULTICA_X, use ALGOPLAN_X")`. Self-hosters' `.env` files keep working until they upgrade.

- **D-4: CLI binary rename.** `multica` → `algoplan`. Affects:
  - `server/cmd/multica/` directory → `server/cmd/algoplan/`
  - Makefile targets (`multica`, `cli`)
  - Binary name in `.goreleaser.yml` (`project_name`, archive `name_template`, brews `name`)
  - All help-text strings ("`multica config set ...`" → "`algoplan config set ...`")
  - Config dir `~/.multica/` → `~/.algoplan/` with auto-migration on first run (rename dir if old exists and new doesn't)
  - Optional: `multica` shim binary that wraps `algoplan` for one release cycle, prints deprecation warning

- **D-5: Docker image names.** `ghcr.io/multica-ai/multica-{backend,web}` → `ghcr.io/${{ github.repository_owner }}/algoplan-{backend,web}`. Already parameterized on owner in `release.yml` (line 109/175); only the suffix `multica-` → `algoplan-` changes. `docker-compose.selfhost.yml` env defaults swap to match.

- **D-6: Homebrew tap target.** `multica-ai/homebrew-tap` is read-only (not our repo). Two paths:
  - **A:** Create `casiusss/homebrew-tap` repo → point `.goreleaser.yml` `repository.owner` there
  - **B:** Disable Homebrew publish in this phase, defer until `algoplan-ai` org exists
  - Recommend B for now — Homebrew is convenience, not blocker; users can `go install` or download release binaries.

- **D-7: Default email FROM.** `noreply@multica.ai` → `noreply@algoplan.ai` (env-defaultable via `RESEND_FROM_EMAIL`; production sets explicit value). Domain ownership prerequisite — flag for user.

- **D-8: Hard exclusions (must NOT change).**
  - `multica` git remote name on existing user clones (don't auto-rename)
  - `multica-ai/multica` upstream remote (kept as `upstream` already)
  - Database table/column names — internal, no user value
  - `RBR-*` requirement IDs — historical
  - Any `.planning/` reference to past Phase 7 — historical record

### Claude's Discretion

- Migration helper file structure (one helper per concern: localStorage, env, config-dir)
- Whether to ship `multica` CLI shim or hard-cut (recommend shim for one release)
- Wave grouping inside Phase 8
- Whether to bundle `RESEND_FROM_EMAIL` change with email refactor or as standalone task
</decisions>

<code_context>
## Existing Code Insights

**Confirmed scope from grep audit (run 2026-04-26):**

- **9 `@multica/*` package.json files**: `packages/{ui,core,tsconfig,eslint-config,views}/`, `apps/{showroom,web,desktop,docs}/`
- **`multica_*` localStorage keys**: `packages/ui/components/common/theme-provider.tsx:16` (`multica_theme`), `packages/core/auth/store.test.ts` (`multica_token`)
- **`MULTICA_*` env vars in Go**: `server/cmd/multica/cmd_agent.go` (`MULTICA_SERVER_URL`, `MULTICA_AGENT_ID`, `MULTICA_TASK_ID`, `MULTICA_WORKSPACE_ID`)
- **`MULTICA_*` env vars in compose**: `docker-compose.selfhost.yml` (`MULTICA_BACKEND_IMAGE`, `MULTICA_WEB_IMAGE`, `MULTICA_IMAGE_TAG`, `MULTICA_APP_URL`)
- **CLI binary refs**: `Makefile:90,91,97,139,273,281`, all `server/cmd/multica/*.go`
- **Docker image refs**: `docker-compose.selfhost.yml:32,62`, `docker-compose.selfhost.build.yml:6,12`, `.github/workflows/release.yml:109,138,175,195`
- **GoReleaser**: `.goreleaser.yml` (`project_name: multica`, `repository.owner: multica-ai`, `homepage: https://github.com/multica-ai/multica`)
- **Resend default**: `server/internal/service/email.go:28` (`noreply@multica.ai`)
- **Homebrew install help**: `Makefile:97,139` (`brew install multica-ai/tap/multica`)

**Hard exclusions (must NOT change in this phase):**
- `~/.claude/worktrees/agent-*/` — stale worktree copies, will be GC'd by daemon
- Database schema — internal, no rebrand value
- `.planning/phases/01-07/` historical artifacts
- `multica` upstream git remote (already aliased correctly)
</code_context>

<specifics>
## Specific Ideas (Success Criteria)

1. `pnpm install && pnpm typecheck && pnpm test` all green after `@multica/*` → `@algoplan/*` rename
2. Existing user with `multica_theme=dark` in localStorage retains dark mode after upgrade — migration test asserts `algoplan_theme=dark` + `multica_theme` deleted
3. Self-hoster running with `MULTICA_BACKEND_IMAGE=...` in `.env` sees deprecation warning but app still works (env shim verified by integration test)
4. CLI user with `~/.multica/config.json` runs `algoplan daemon start` and gets auto-migrated `~/.algoplan/config.json` (orig dir deleted or backed up)
5. `git push origin v0.5.0` triggers Release workflow, all jobs green (Docker images publish to `ghcr.io/casiusss/algoplan-{backend,web}`)
6. Targeted grep returns zero `multica` matches in user-visible Go strings, Makefile help, docker compose, env names — excludes git history, .planning/, and the migration shim files themselves
7. `algoplan --help` shows AlgoPlan branding, `multica` shim (if shipped) prints deprecation + delegates to `algoplan`

## Suggested Sub-Phases (planner discretion)

- **Wave 0:** Migration scaffolding ships first (backward-compat shims) so subsequent renames cascade safely:
  - localStorage migration helper (`packages/core/migrations/localstorage.ts`)
  - Env var dual-read helper (`server/internal/config/env.go`)
  - Config-dir auto-rename helper in CLI bootstrap

- **Wave 1:** `@multica/*` → `@algoplan/*` mechanical rename. Single atomic commit per package; pnpm install + typecheck after each.

- **Wave 2:** localStorage migration deployment + Zustand persistence wired to new keys. theme-provider + auth store updates.

- **Wave 3:** Env-var rename in Go + dual-read shim active + docker-compose env names + `.env.example` regen.

- **Wave 4:** CLI rename: `cmd/multica` → `cmd/algoplan`, Makefile, `~/.multica/` → `~/.algoplan/` migration, all help strings. Optional `multica` shim binary.

- **Wave 5:** Release pipeline: Docker image names + GoReleaser config (`project_name`, owner, homepage) + Homebrew decision (D-6 → defer recommended).

- **Wave 6:** Resend FROM email + dev docs sweep (CLAUDE.md, README, etc. — internal docs that survived Phase 7).

- **Wave 7:** End-to-end verification: fresh `~/.multica` dir → run CLI → assert `~/.algoplan` created with state preserved. Tag `v0.5.0` and verify Release workflow green.
</specifics>

<deferred>
## Deferred Ideas

- GitHub org `casiusss/algoplan` → `algoplan-ai/algoplan` move — needs org creation + billing decision; out of scope here
- Homebrew tap creation (`casiusss/homebrew-tap`) — defer until algoplan-ai org or skip Homebrew
- DNS migration `plan.algoview.com` → `algoplan.ai` — Phase 7.1 territory, depends on domain provisioning
- `multica` CLI shim binary — recommend for one release, but planner can decide to hard-cut if user-base is small
- Removing the env-var dual-read shim — schedule for v0.6.0 or v0.7.0 (needs explicit deprecation timeline)
- Database table `multica_*` prefix audit — none found in scope grep; verify during planning
</deferred>
