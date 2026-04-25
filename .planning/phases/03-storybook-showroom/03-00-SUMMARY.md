---
phase: 03-storybook-showroom
plan: 00
subsystem: storybook-scaffolding
tags:
  - storybook
  - workspace-skeleton
  - monorepo
  - catalog
requires: []
provides:
  - "@multica/showroom workspace package (private)"
  - "pnpm catalog entries for Storybook 9.1.20 + Vite 7 + fontsource Inter"
  - "turbo.json build-storybook task block"
affects:
  - pnpm-workspace.yaml
  - turbo.json
  - pnpm-lock.yaml
tech_stack_added:
  - "storybook 9.1.20"
  - "@storybook/react-vite 9.1.20"
  - "@storybook/addon-a11y 9.1.20"
  - "@storybook/addon-docs 9.1.20"
  - "vite 7.3.2"
  - "@fontsource-variable/inter 5.2.8"
patterns:
  - "Internal Packages pattern (raw .ts/.tsx, no precompile)"
  - "pnpm catalog single-version pinning"
  - "Turborepo task graph discovery via workspace package presence"
key_files_created:
  - apps/showroom/package.json
  - apps/showroom/tsconfig.json
  - apps/showroom/vite.config.ts
  - apps/showroom/.gitignore
key_files_modified:
  - pnpm-workspace.yaml
  - turbo.json
  - pnpm-lock.yaml
decisions:
  - "Pinned all four Storybook 9 packages to exact 9.1.20 (no caret) to satisfy Storybook's byte-identical peerDep contract"
  - "Picked vite ^7 (not pinned) — @storybook/react-vite@9.1.20 peer accepts ^5||^6||^7; latest 7.x line"
  - "Promoted @fontsource-variable/inter from apps/desktop devDep to catalog so showroom + desktop share a single version"
  - "Did NOT add @storybook/addon-themes — UI-SPEC §Hard Constraint #8 chose hand-rolled globalTypes.theme decorator (Plan 01)"
  - "turbo.json build-storybook task uses dependsOn: [^typecheck] so upstream @multica/ui regressions are caught before stories build"
metrics:
  duration_seconds: 159
  tasks_completed: 2
  files_created: 4
  files_modified: 3
  completed_date: "2026-04-25T12:06:10Z"
commits:
  - hash: b779b7da
    message: "chore(03-00): add Storybook 9 + Vite 7 + fontsource Inter to catalog"
  - hash: 16a02e75
    message: "feat(03-00): scaffold @multica/showroom workspace + turbo build-storybook task"
---

# Phase 03 Plan 00: Workspace Skeleton + Catalog + Turbo Task Summary

Bare workspace skeleton landed for the Storybook Showroom: a private `@multica/showroom` pnpm workspace at `apps/showroom/`, all Storybook 9.1.20 + Vite 7 + fontsource Inter catalog entries added to `pnpm-workspace.yaml`, and a `build-storybook` task wired into `turbo.json`. No `.storybook/` config and no stories yet — that ships in Plans 01 and 03. `pnpm install` resolves cleanly; `pnpm --filter @multica/showroom typecheck` exits 0.

---

## What Was Built

### Catalog entries added (`pnpm-workspace.yaml`)

A new `# Storybook 9 (apps/showroom)` section under the existing catalog block:

| Key                            | Spec     | Resolved by pnpm |
| ------------------------------ | -------- | ---------------- |
| `vite`                         | `^7`     | `7.3.2`          |
| `storybook`                    | `9.1.20` | `9.1.20`         |
| `@storybook/react-vite`        | `9.1.20` | `9.1.20`         |
| `@storybook/addon-a11y`        | `9.1.20` | `9.1.20`         |
| `@storybook/addon-docs`        | `9.1.20` | `9.1.20`         |
| `@fontsource-variable/inter`   | `^5.2.5` | `5.2.8`          |

All four Storybook packages share the byte-identical `9.1.20` patch pin per Storybook's peerDep contract. Vite uses `^7` because `@storybook/react-vite@9.1.20` accepts `^5 || ^6 || ^7` and we want patch room.

### Workspace package (`apps/showroom/`)

Four files, no source code:

- **`package.json`** — `@multica/showroom` (`private: true`), scripts (`storybook`, `build-storybook`, `typecheck`), all third-party deps via `catalog:`. Only workspace dep is `@multica/ui` (atoms + tokens.css + base.css + avatar-color all flow through it). Zero `@multica/core`, zero `next/*`, zero `react-router-dom` (UI-SPEC §Hard Constraint #3).
- **`tsconfig.json`** — Extends `@multica/tsconfig/base.json`. Strict mode inherited. `include` lists `.storybook/`, `stories/`, and `vite.config.ts` so future Plan 01/03 source files are typechecked.
- **`vite.config.ts`** — `@vitejs/plugin-react` + `@tailwindcss/vite` + `react`/`react-dom` dedupe. Storybook's `@storybook/react-vite` framework merges its own config on top.
- **`.gitignore`** — `storybook-static/`, `node_modules/`, `.vite/`.

### Turborepo task (`turbo.json`)

A new `build-storybook` task entry appended after the existing `lint` task:

```json
"build-storybook": {
  "dependsOn": ["^typecheck"],
  "inputs": [".storybook/**", "stories/**", "**/*.ts", "**/*.tsx", "**/*.css", "package.json", "tsconfig.json", "vite.config.ts"],
  "outputs": ["storybook-static/**"]
}
```

`dependsOn: ["^typecheck"]` ensures upstream packages (notably `@multica/ui`) typecheck before stories build, catching regressions early. `outputs: ["storybook-static/**"]` lets Turborepo cache the static build for CI smoke runs (used by Wave 1+ plans).

No `storybook` task entry was added — `pnpm storybook` is local-dev-only and per RESEARCH §Open Questions doesn't need a turbo wrapper in v1.

---

## Verification Results

| Gate                                                                                  | Result                                                  |
| ------------------------------------------------------------------------------------- | ------------------------------------------------------- |
| `pnpm install --no-frozen-lockfile`                                                   | Done in 6.2s, 66 packages added                          |
| `pnpm --filter @multica/showroom typecheck`                                           | Exit 0 (empty `tsc --noEmit` pass)                      |
| `pnpm exec turbo run typecheck --dry=json` lists `@multica/showroom#typecheck`        | Yes (verified)                                          |
| `cat apps/showroom/package.json \| jq -r .private`                                    | `true`                                                  |
| `grep -E "(@multica/core\|next/\|react-router-dom)" apps/showroom/package.json`       | No matches (forbidden deps absent)                      |
| `grep -q "build-storybook" turbo.json`                                                | Match found                                             |
| Resolved Storybook 9.1.20 packages in `node_modules/.pnpm`                            | All four present at exact `9.1.20`                      |
| Resolved `@fontsource-variable/inter`                                                 | `5.2.8`                                                 |
| Resolved vite for showroom                                                            | `7.3.2` (linked from `apps/showroom/node_modules/vite`) |

---

## Deviations from Plan

None — plan executed exactly as written.

### Notes (non-deviations)

- `pnpm install` emitted a peer dep warning: `apps/showroom @vitejs/plugin-react 6.0.1 unmet peer vite@^8.0.0: found 7.3.2`. This is a known catalog tension (`@vitejs/plugin-react@6.x` advertises a vite ^8 peer, but works with vite 7 in practice — `apps/desktop` already pins `^5.1.1` to side-step it). The package resolved correctly (`@vitejs+plugin-react@6.0.1_vite@7.3.2` exists in `.pnpm`) and `tsc --noEmit` exits 0. Deferred to a later plan if it manifests at Storybook build time.
- The first `pnpm install` (after Task 1 only) said "Lockfile is up to date" because no package consumed the new catalog entries yet; the second install (after Task 2 added `apps/showroom/package.json`) added 66 packages.

---

## Hand-off to Plan 01

- **`apps/showroom/.storybook/` does not yet exist.** Plan 01 creates `main.ts` + `preview.tsx` + `preview.css` per UI-SPEC §Storybook Configuration Contract.
- The skeleton's `tsconfig.json` already `include`s `.storybook/**/*`, so Plan 01's files will be typechecked automatically without further config changes.
- All Storybook 9 + addon packages are installed and ready to import.
- The `build-storybook` Turborepo task is wired but not yet runnable end-to-end (no stories exist) — Plan 03's first story will exercise it.
- Theme toggle decision: per UI-SPEC, Plan 01 hand-rolls `globalTypes.theme` (NOT `@storybook/addon-themes`). The catalog deliberately omits `@storybook/addon-themes`.

---

## Self-Check: PASSED

Files verified to exist:
- FOUND: `apps/showroom/package.json`
- FOUND: `apps/showroom/tsconfig.json`
- FOUND: `apps/showroom/vite.config.ts`
- FOUND: `apps/showroom/.gitignore`

Modified files verified:
- FOUND: `pnpm-workspace.yaml` (catalog section appended)
- FOUND: `turbo.json` (build-storybook task block appended)
- FOUND: `pnpm-lock.yaml` (66 new packages)

Commits verified in `git log`:
- FOUND: `b779b7da` chore(03-00): add Storybook 9 + Vite 7 + fontsource Inter to catalog
- FOUND: `16a02e75` feat(03-00): scaffold @multica/showroom workspace + turbo build-storybook task
