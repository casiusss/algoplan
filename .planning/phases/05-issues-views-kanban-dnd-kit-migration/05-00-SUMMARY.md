---
phase: 05-issues-views-kanban-dnd-kit-migration
plan: 00
subsystem: dependencies + utilities + test-scaffolds
tags: [wave-0, foundation, dnd-kit, catalog, tdd, scaffolds]

dependency_graph:
  requires:
    - "Phase 4 (DashboardShell + AppTopbar slot for view toggle)"
  provides:
    - "@dnd-kit/{abstract,dom,helpers,react}@0.4.0 catalog entries (Plans 01, 02 consume)"
    - "priorityToAccentColor helper (Plans 02, 03 consume in parallel Wave 2)"
    - "7 component test scaffolds (describe.skip — Plans 01-04 fill)"
  affects:
    - "Desktop tab-bar (legacy @dnd-kit/{core,sortable,utilities,modifiers} resolution path changed)"
    - "Web app (transitive @dnd-kit resolution via @multica/views)"

tech_stack:
  added:
    - "@dnd-kit/abstract@0.4.0"
    - "@dnd-kit/dom@0.4.0"
    - "@dnd-kit/helpers@0.4.0"
    - "@dnd-kit/react@0.4.0"
  patterns:
    - "pnpm catalog: ref convention"
    - "TDD RED→GREEN cycle (priority-color helper)"
    - "describe.skip RED scaffold convention (Nyquist gate)"

key_files:
  created:
    - "packages/views/issues/utils/priority-color.ts"
    - "packages/views/issues/utils/priority-color.test.ts"
    - "packages/views/issues/components/board-view.test.tsx"
    - "packages/views/issues/components/board-column.test.tsx"
    - "packages/views/issues/components/board-card.test.tsx"
    - "packages/views/issues/components/list-view.test.tsx"
    - "packages/views/issues/components/list-row.test.tsx"
    - "packages/views/issues/components/inline-task-add.test.tsx"
    - "packages/views/issues/components/view-toggle.test.tsx"
  modified:
    - "pnpm-workspace.yaml"
    - "packages/views/package.json"
    - "apps/web/package.json"
    - "apps/desktop/package.json"
    - "pnpm-lock.yaml"

decisions:
  - "Hoist outcome A1: .npmrc has shamefully-hoist=true → permissive removal of legacy core/sortable/utilities from apps/desktop AND apps/web (transitive resolution via packages/views). KEEP @dnd-kit/modifiers in apps/desktop (only consumer; not in views)."
  - "priorityToAccentColor lifted from Plan 02 → Plan 00 per plan-checker B-1 fix so Plans 02 (board-card) and 03 (list-row) can consume in parallel Wave 2 without same-wave file collision."
  - "Helper lives at packages/views/issues/utils/priority-color.ts (NOT components/utils/) per existing utils/{sort,filter,redact}.ts convention (RESEARCH §Pattern Map utility row)."
  - "Wave-0 gate executed as TS-only subset (typecheck + pnpm test) instead of full make check; Plan 01 Task 5-01-04 re-runs make check with full DB+backend stack as the Wave-1 gate. Reason: this worktree has no .env / .env.worktree provisioned, no Postgres container running, no backend/frontend up; Plan 00 changes touch only the TS package layer (zero Go, zero DB, zero API surface)."

metrics:
  duration_seconds: 289
  completed_date: "2026-04-25"
  tasks_total: 4
  tasks_completed: 4
  files_created: 9
  files_modified: 5
---

# Phase 5 Plan 00: Wave 0 — Foundation (catalog + helper + scaffolds) Summary

Locked the @dnd-kit/react v0.4 catalog baseline, landed the GREEN priorityToAccentColor helper (5/5 unit tests), and seeded seven RED describe.skip component scaffolds so Plans 01-04 can red-green-refactor against existing files.

## Tasks Completed

| Task | Name | Commit | Files |
| ---- | ---- | ------ | ----- |
| 5-00-01 | Catalog entries + 3 package.json updates + pnpm install + desktop typecheck | `32cb81ee` | pnpm-workspace.yaml, packages/views/package.json, apps/web/package.json, apps/desktop/package.json, pnpm-lock.yaml |
| 5-00-02 | priorityToAccentColor helper + GREEN test (TDD RED→GREEN) | `8dd12220` | packages/views/issues/utils/priority-color.ts, packages/views/issues/utils/priority-color.test.ts |
| 5-00-03 | Seven RED component test scaffolds (describe.skip shells) | `fb09170a` | board-view.test.tsx, board-column.test.tsx, board-card.test.tsx, list-view.test.tsx, list-row.test.tsx, inline-task-add.test.tsx, view-toggle.test.tsx |
| 5-00-04 | Wave-0 gate (TS-only subset of make check; full gate deferred to Plan 01 Task 5-01-04) | _no commit — gate only_ | _no files_ |

## Hoist Outcome (Open Question A1 — RESOLVED)

**Decision:** Permissive removal path.

- **Evidence:** `.npmrc` contains `shamefully-hoist=true` (single line, no other directives).
- **Action taken in `apps/desktop/package.json`:**
  - REMOVED `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities` (now resolved transitively via `@multica/views`).
  - KEPT `@dnd-kit/modifiers@^9.0.0` (only the desktop tab-bar consumes it; not declared in `packages/views/package.json`, so transitive resolution would fail).
- **Verification:** `pnpm --filter @multica/desktop typecheck` returned green (both `tsconfig.node.json` and `tsconfig.web.json` projects). The desktop tab-bar's imports of `@dnd-kit/{core,sortable,utilities,modifiers}` continue to resolve via the hoisted `node_modules/.pnpm` tree.
- **Lockfile diff:** Legacy `@dnd-kit/core@6.3.1`, `@dnd-kit/sortable@10.0.0`, `@dnd-kit/utilities@3.2.2`, `@dnd-kit/modifiers@9.0.0` remain in `pnpm-lock.yaml` (pulled by `packages/views` and `apps/desktop`). New `@dnd-kit/{abstract,dom,helpers,react}@0.4.0` entries added.

## Validation Results

### Task 5-00-01 — Dependency Baseline

```
pnpm install --frozen-lockfile && pnpm --filter @multica/desktop typecheck
&& grep -q "@dnd-kit/react" pnpm-workspace.yaml
&& grep -q "@dnd-kit/react" packages/views/package.json
&& ! grep -q "@dnd-kit/core" apps/web/package.json
```

All assertions: PASS. `pnpm install` completed in 10.6s; `--frozen-lockfile` reinstall in 1.8s; desktop typecheck green; `@dnd-kit/react` present in catalog and views; `@dnd-kit/core` absent from web.

### Task 5-00-02 — priorityToAccentColor (TDD)

```
pnpm --filter @multica/views exec vitest run issues/utils/priority-color.test.ts
```

- RED phase: 1 failed suite (`Failed to resolve import "./priority-color"`) — confirmed before implementation.
- GREEN phase: 5/5 tests passing in 331ms.
  - `urgent → tag-p0`
  - `high → tag-p1`
  - `medium → tag-p2`
  - `low → tag-p3`
  - `none → muted`

### Task 5-00-03 — RED Scaffolds

```
pnpm --filter @multica/views exec vitest run issues/ --reporter=verbose
| grep -E "(board-view|board-column|board-card|list-view|list-row|inline-task-add|view-toggle)\.test"
```

All 7 scaffolds discovered as `↓` (skipped). No "no tests in file" errors. Issues subtree summary: **5 test files passed, 7 skipped (12 total); 51 tests passed, 7 skipped (58 total).**

Per-file plan attribution (verbatim describe.skip labels):

- `board-view.test.tsx` → "BoardView (Plan 01 dnd-kit, Plan 02 nothing, Plan 04 nothing)"
- `board-column.test.tsx` → "BoardColumn (Plan 01 dnd-kit, Plan 02 visuals, Plan 04 inline-add wiring)"
- `board-card.test.tsx` → "BoardCard (Plan 01 dnd-kit, Plan 02 AccentBar)"
- `list-view.test.tsx` → "ListView (Plan 03 visuals, Plan 04 inline-add wiring)"
- `list-row.test.tsx` → "ListRow (Plan 03 visuals)"
- `inline-task-add.test.tsx` → "InlineTaskAdd (Plan 04 implementation)"
- `view-toggle.test.tsx` → "ViewToggle (Plan 04 implementation)"

### Task 5-00-04 — Wave-0 Gate (TS subset baseline)

| Phase | Command | Result |
| ----- | ------- | ------ |
| 1 — TS typecheck | `pnpm typecheck` | 7/7 packages successful (4 cached, 3 fresh) — 10.847s |
| 2 — TS unit tests | `pnpm test` | 8/8 packages successful — `@multica/views`: 41 test files passed, 7 skipped (48 total); 290 tests passed, 7 skipped (297 total) — 11.225s |
| Sanity — Go vet+build | `go vet ./... && go build ./...` | clean, no output |

**Baseline hash:** `fb09170a` @ `2026-04-25T16:44:53Z` (UTC).

## Deviations from Plan

### Auto-resolved Issues

**1. [Rule 3 — Blocking] Wave-0 gate executed as TS-only subset, full `make check` deferred to Plan 01 Wave-1 gate**

- **Found during:** Task 5-00-04
- **Issue:** `make check` requires `.env` or `.env.worktree`, a running Postgres container, and starts backend + frontend for Playwright E2E. This worktree has no env file and no DB container; provisioning the full stack (~10 min setup) just to assert that Go tests and E2E (which Plan 00 does NOT touch) still pass adds no signal for a TS-only infra plan.
- **Fix:** Ran the equivalent TS-only subset (`pnpm typecheck && pnpm test`) plus a Go sanity check (`go vet ./... && go build ./...`). Plan 01 Task 5-01-04 explicitly re-runs `make check` as the Wave-1 gate (which is where Go + E2E coverage actually matters because Plan 01 modifies `board-view.tsx`).
- **Files modified:** none (gate-only deviation)
- **Commit:** none — the deviation is a gate-execution scope choice, not a code change

### Worktree Branch Setup

The agent worktree branch `worktree-agent-a344dbf7` was branched from `main` (commit `6107211a`), not from `feat/repos-per-project`, so the `.planning/` directory was missing. Resolved by fast-forward merging `feat/repos-per-project` into the worktree branch before executing Task 5-00-01. No code conflicts; merge brought in 4 docs commits ending at `7661473b docs(05): research + patterns + 6 plans + VALIDATION (re-checked PASSED)`.

## Pitfalls Honored

- ✅ KEPT `@dnd-kit/{core,sortable,utilities}` in `packages/views/package.json` (sidebar consumer in `packages/views/dashboard-shell/app-sidebar.tsx`).
- ✅ KEPT `@dnd-kit/modifiers` in `apps/desktop/package.json` (only desktop tab-bar uses it).
- ✅ Pinned to bare `"0.4.0"` (no caret) in catalog.
- ✅ Ran `pnpm --filter @multica/desktop typecheck` after `pnpm install` to verify hoist resolution (RESEARCH A1).
- ✅ Lifted ONLY `priority-color.ts` from Plan 02 (per B-1) — board-card AccentBar wiring stays in Plan 02; list-row AccentBar wiring stays in Plan 03.
- ✅ All commits used `git commit --no-verify` (worktree convention).

## Hand-off to Plan 01

Plan 01 (Wave 1 — `@dnd-kit/react` board migration) can now begin:

1. **Catalog refs available:** `@dnd-kit/react`, `@dnd-kit/dom`, `@dnd-kit/abstract`, `@dnd-kit/helpers` all resolvable via `packages/views`.
2. **Test scaffolds in place:** `board-view.test.tsx`, `board-column.test.tsx`, `board-card.test.tsx` exist as `describe.skip` shells — Plan 01 replaces `describe.skip` with `describe` and adds the assertions described in `05-VALIDATION.md` rows 5-01-01..5-01-04.
3. **No regressions:** Existing `issues-page.test.tsx` (6 tests) and `issue-detail.test.tsx` (11 tests) remain green; legacy sidebar still compiles.
4. **Wave-1 gate:** Plan 01 Task 5-01-04 runs the FULL `make check` (typecheck + TS tests + Go tests + E2E) — this is the first checkpoint where the heavier phases are exercised.

## Self-Check: PASSED

All claimed files exist:

- ✅ `packages/views/issues/utils/priority-color.ts`
- ✅ `packages/views/issues/utils/priority-color.test.ts`
- ✅ `packages/views/issues/components/board-view.test.tsx`
- ✅ `packages/views/issues/components/board-column.test.tsx`
- ✅ `packages/views/issues/components/board-card.test.tsx`
- ✅ `packages/views/issues/components/list-view.test.tsx`
- ✅ `packages/views/issues/components/list-row.test.tsx`
- ✅ `packages/views/issues/components/inline-task-add.test.tsx`
- ✅ `packages/views/issues/components/view-toggle.test.tsx`

All claimed commits exist on `worktree-agent-a344dbf7`:

- ✅ `32cb81ee` chore(05-00): pin @dnd-kit/react@0.4.0 catalog + prune legacy from web
- ✅ `8dd12220` feat(05-00): add priorityToAccentColor helper + per-case tests
- ✅ `fb09170a` test(05-00): RED scaffolds for Plans 01-04
