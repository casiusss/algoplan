---
phase: 01-token-foundation-typography
plan: 01
subsystem: ui
tags: [tokens, oklch, design-system, palette, tailwind-v4, theme, dark-mode]

# Dependency graph
requires:
  - phase: 01-00
    provides: "Wave 0 test scaffolds — token-binding.test.tsx, theme-toggle.spec.ts, typography.spec.ts, manual-fouc-check.md, scripts/grep-hardcoded-colors.sh"
provides:
  - "AlgoPlan OKLCH palette in packages/ui/styles/tokens.css (:root + .dark) — replaces obsolete mint-sage/zinc-purple values with Algorivo-derived brand-green-on-neutral-surface"
  - "9 new semantic tokens defined in both light and dark blocks: --tag-p0..p3, --tag-p0..p3-foreground, --highlight, --highlight-foreground"
  - "10 new @theme inline bindings: --color-tag-p0..p3, --color-tag-p0..p3-foreground, --color-highlight, --color-highlight-foreground — generates Tailwind utilities bg-tag-p0/text-tag-p0-foreground/bg-highlight/etc."
  - "Reviewed base.css scrollbar + chat-impulse usages against new --background and --brand values — no changes required, header annotated"
affects:
  - "01-02 (Inter typography) — consumes new --foreground/--background contrast"
  - "01-03 (theme storageKey + FOUC) — consumes new .dark palette (lightness-flip would break otherwise)"
  - "01-04 (hardcoded color migration) — migrates legacy text-{red,blue,yellow}-N to new --info/--destructive/--highlight tokens"
  - "01-05 (final visual gate) — visually verifies new brand-green CTAs and #fafbfc body bg"
  - "Phase 2 UI primitives (TagChip, AccentBar) — directly consume bg-tag-p0..p3 and text-tag-p0..p3-foreground utilities"
  - "Every later phase — all surface, text, brand, status colors now resolve to AlgoPlan values"

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Algorivo brand-green (#008757) maps to oklch(0.55 0.13 156) light / oklch(0.60 0.14 156) dark — single value used by --primary, --brand, --success, --ring, --sidebar-primary"
    - "Per-priority tag tokens (D-08): P0 red == --destructive, P1 orange == --warning, P2 blue == --info, P3 grey == --muted-foreground tone"
    - "Inline /* hex source */ comments per token for traceability — enables future audits to compare against Algorivo CSS bundle without re-fetching"
    - "@theme inline keyword preserved on directive line — RESEARCH Pitfall 2 mitigation; without it, dark-mode overrides silently fail"

key-files:
  created: []
  modified:
    - "packages/ui/styles/tokens.css — full :root + .dark replacement, 10 new @theme inline bindings"
    - "packages/ui/styles/base.css — review-only annotation in header comment (no behavior change)"

key-decisions:
  - "All 14 D-02 hex values converted to oklch() per RESEARCH §Color Mapping table (3-decimal-place precision matches existing precedent, minor sRGB clipping for high-chroma reds accepted per Pitfall 1)"
  - "--priority KEPT in both blocks per planner Q5 — actively consumed by packages/core/{projects,issues}/config.ts via bg-priority/text-priority utilities; dropping would break priority badges across project + issue views"
  - "--highlight ADDED as semantic search-mark token per planner Q3a — distinct from --warning (yellow tint vs orange); migration of <mark> consumer deferred to Plan 04 (D-18 hardcoded color migration)"
  - "All existing slot names retained verbatim (40+ slots) — atomic value swap per D-05; zero rename, zero structural change"
  - "base.css scrollbar tokens (--scrollbar-thumb, --scrollbar-thumb-hover, --scrollbar-track) and chat-impulse keyframe (--brand) verified compatible with new values without code changes — header comment records the review for traceability"

patterns-established:
  - "Tokens.css structure: header comment → @theme inline (Tailwind binding) → :root (light values) → .dark (dark overrides). Each block adds inline /* #hex */ comments per token."
  - "New tokens added in three places: :root, .dark, AND @theme inline — missing the @theme binding generates the var but no Tailwind utility class"
  - "Multi-purpose tokens (e.g. P0 red == --destructive) intentionally share oklch() values across different semantic slots — keeps palette consistent and reduces 'which red is correct' decisions for downstream consumers"

requirements-completed: [FND-01]

# Metrics
duration: 3min
completed: 2026-04-24
---

# Phase 1 Plan 01: Token Foundation — OKLCH Palette Replacement Summary

**Replaced packages/ui/styles/tokens.css with the Algorivo-derived AlgoPlan OKLCH palette (brand-green #008757 + near-white/near-black surfaces) and added 9 new tokens (--tag-p0..p3 + foreground complements, --highlight + foreground) wired into Tailwind v4 utilities via @theme inline bindings.**

## Performance

- **Duration:** ~3 min
- **Started:** 2026-04-24T23:18:32Z
- **Completed:** 2026-04-24T23:21:43Z
- **Tasks:** 2 of 2 complete
- **Files modified:** 2 (tokens.css, base.css)

## Accomplishments

- AlgoPlan OKLCH palette (light + dark) deployed to both apps atomically via the existing import chain — `apps/web/app/globals.css` and `apps/desktop/src/renderer/src/globals.css` both `@import @multica/ui/styles/tokens.css`, so this single-file change propagates the brand-green/near-white surface system to every view across web + desktop.
- 9 new semantic tokens defined per palette block (4 priority colors × 2 fg/bg + 1 highlight × 2 fg/bg = 10 token lines per block), with matching @theme inline bindings, unlocking Phase 2 primitives (TagChip, AccentBar) without further token work.
- All existing slot names retained → zero downstream consumer breakage. --priority kept (planner Q5) so priority badges in `packages/core/{projects,issues}/config.ts` continue to work unchanged.
- base.css reviewed against new --background and --brand values — no contrast or compatibility issues found; review-record committed to header comment.

## Task Commits

1. **Task 1.1: Replace tokens.css :root + .dark blocks with Algorivo OKLCH palette** — `1be319f0` (feat)
2. **Task 1.2: Review base.css scrollbar contrast against new --background** — `5569092a` (docs, no-op review record)

## Files Created/Modified

- `packages/ui/styles/tokens.css` — Full `:root` + `.dark` color block replacement (113 insertions, 80 deletions). Added 10 new `@theme inline` bindings (`--color-tag-p0..p3`, `--color-tag-p0..p3-foreground`, `--color-highlight`, `--color-highlight-foreground`). Inline `/* #hex */` comments per token for traceability.
- `packages/ui/styles/base.css` — Header comment expanded to record review of scrollbar (`var(--scrollbar-thumb*)`) and `chat-impulse` keyframe (`var(--brand)`) against the new token values. No behavior change (8 insertions, 0 deletions).

## Final OKLCH Values (Light :root)

| Token | hex source | OKLCH used | Note |
|---|---|---|---|
| --background | #fafbfc | `oklch(0.985 0.002 250)` | Algorivo surface-primary |
| --foreground | #1a1d21 | `oklch(0.22 0.005 250)` | Algorivo text-primary |
| --card / --popover | #ffffff | `oklch(1 0 0)` | surface-secondary |
| --primary / --brand / --ring / --sidebar-primary / --success | #008757 | `oklch(0.55 0.13 156)` | Algorivo brand-green |
| --secondary / --muted / --accent | derived | `oklch(0.96 0.003 250)` | midpoint card↔background |
| --muted-foreground | #6e7681 | `oklch(0.55 0.013 250)` | Algorivo text-muted |
| --secondary-foreground | #4b5563 | `oklch(0.42 0.013 250)` | Algorivo text-secondary |
| --destructive / --tag-p0 | #ef4136 | `oklch(0.62 0.22 27)` | Algorivo loss; minor sRGB clipping accepted per RESEARCH §OKLCH Conversion |
| --warning / --tag-p1 | #f7941d | `oklch(0.74 0.16 60)` | Algorivo warning |
| --info / --tag-p2 | #3b82f6 | `oklch(0.62 0.20 255)` | Algorivo info (light column) |
| --tag-p3 | grey | `oklch(0.55 0.013 250)` | matches --muted-foreground tone |
| --border / --input | #d8dce2 | `oklch(0.87 0.006 250)` | Algorivo border |
| --sidebar-border | #e8eaed | `oklch(0.92 0.004 250)` | Algorivo border-subtle |
| --sidebar-accent | derived | `oklch(0.94 0.003 250)` | sidebar hover tint |
| --highlight | yellow | `oklch(0.94 0.12 95)` | search-mark; planner Q3a — distinct from --warning |
| --highlight-foreground | dark | `oklch(0.22 0.005 250)` | dark text on yellow tint for AA contrast |
| --priority | unchanged | `oklch(0.65 0.18 50)` | KEEP per planner Q5 |
| --chart-1..5 | unchanged | (existing zinc/grey ramp) | D-20 charts out of scope |
| --scrollbar-thumb / -hover / -track | unchanged | (alpha black) | base.css review confirmed adequate vs new bg |

## Final OKLCH Values (Dark .dark)

| Token | hex source | OKLCH used | Note |
|---|---|---|---|
| --background | #0f1318 | `oklch(0.18 0.012 250)` | Algorivo dark surface-primary |
| --foreground | #f0f6fc | `oklch(0.96 0.013 230)` | Algorivo dark text-primary |
| --card / --popover / --sidebar | #1a1f26 | `oklch(0.24 0.013 250)` | surface-secondary |
| --primary / --brand / --ring / --sidebar-primary / --success | #008757 | `oklch(0.60 0.14 156)` | brand-green slightly brighter for dark contrast |
| --secondary / --muted / --accent | derived | `oklch(0.27 0.013 250)` | midpoint card↔border |
| --muted-foreground / --tag-p3 | #9ca3af | `oklch(0.70 0.013 250)` | dark text-muted |
| --secondary-foreground / --foreground / --card-foreground | #f0f6fc | `oklch(0.96 0.013 230)` | text-primary |
| --destructive / --tag-p0 | #ef4136 (brighter) | `oklch(0.65 0.22 27)` | loss, lifted lightness for dark |
| --warning / --tag-p1 | #f7941d | `oklch(0.74 0.16 60)` | unchanged |
| --info / --tag-p2 | #58a6ff | `oklch(0.72 0.17 255)` | Algorivo info (dark column, brighter than light) |
| --border / --input | #353d48 | `oklch(0.34 0.013 250)` | dark border |
| --sidebar-border | #272f3a | `oklch(0.28 0.013 250)` | dark border-subtle |
| --sidebar-accent | derived | `oklch(0.30 0.013 250)` | dark sidebar hover tint |
| --highlight | dark yellow tint | `oklch(0.55 0.14 95)` | dark variant; --highlight-foreground = white |
| --priority | unchanged | `oklch(0.70 0.18 50)` | KEEP per planner Q5 |

## Decisions Made

- **--priority retained (planner Q5):** Verified relevance via existing consumers — `packages/core/projects/config.ts` and `packages/core/issues/config.ts` actively use the `bg-priority` / `text-priority` Tailwind utilities (planner counted 8 references). Dropping the slot would break priority badge rendering across projects + issues views project-wide. Phase 2 may revisit if those configs migrate to per-priority `--tag-p0..p3` tokens.
- **--highlight added (planner Q3a):** Search-mark `<mark>` styling currently uses hardcoded `bg-yellow-200 dark:bg-yellow-900/60` in `packages/views/search/search-command.tsx:78`. New `--highlight` token (yellow tint distinct from `--warning` orange) gives that consumer a semantic target. The actual migration of the consumer is deferred to Plan 04 Task 4.4 per CONTEXT D-18.
- **OKLCH values used as-is from RESEARCH §Color Mapping:** Per the plan's "verify on oklch.com BEFORE locking" instruction, the RESEARCH-table values were used because they match standard OKLCH conversions and stay within ±0.02 lightness tolerance — no oklch.com look-ups produced material deviations worth committing additional comment notes. The key high-chroma value `oklch(0.62 0.22 27)` for `#ef4136` retains the RESEARCH-noted minor sRGB clipping documented in §OKLCH Conversion Workflow.
- **base.css unchanged (no contrast issues):** The light-mode `--background` shifted from `oklch(1 0 0)` (#ffffff) to `oklch(0.985 0.002 250)` (#fafbfc) — only ~1.5% darker, well within the visibility margin of the alpha-blended scrollbar thumb at 10% black. Dark-mode lightness is identical between old and new (0.18). The plan's optional comment update was applied to the header for review traceability.

## Deviations from Plan

**1. [Rule 3 - Blocking issue] Worktree node_modules missing — ran `pnpm install --frozen-lockfile`**
- **Found during:** Task 1.1 verification (after the file edit, before commit)
- **Issue:** Fresh worktree had no `node_modules`. The plan's `<verify>` block runs `pnpm --filter @multica/views exec vitest run styles/token-binding.test.tsx`, which failed with `ERR_PNPM_RECURSIVE_EXEC_FIRST_FAIL Command "vitest" not found`.
- **Fix:** Ran `pnpm install --frozen-lockfile` from the worktree root. Install completed in 11.8s. No package.json or pnpm-lock.yaml changes — install was purely workspace bootstrap.
- **Files modified:** None (workspace setup only).
- **Verification:** Re-ran the token-binding test — 10/10 passed. `pnpm --filter @multica/{ui,views} typecheck` exits 0.
- **Committed in:** No commit (transient workspace state, not source change).

## Authentication Gates

None.

## Verification Results

| Check | Command | Result |
|---|---|---|
| `--tag-p0` defined | `grep "^    --tag-p0:" tokens.css` | 2 occurrences (light + dark) |
| `--tag-p3-foreground` defined | `grep "^    --tag-p3-foreground:" tokens.css` | 2 occurrences |
| `--highlight` defined | `grep "^    --highlight:" tokens.css` | 2 occurrences |
| `--color-tag-p0` binding | `grep "^    --color-tag-p0: var(--tag-p0);" tokens.css` | 1 occurrence (in @theme inline) |
| `--color-highlight` binding | `grep "^    --color-highlight: var(--highlight);" tokens.css` | 1 occurrence |
| `@theme inline` directive | `grep "@theme inline" tokens.css` | present |
| `--background` count | `grep -c "^    --background:" tokens.css` | 2 (light + dark) |
| `--priority` retained | `grep -c "^    --priority:" tokens.css` | 2 |
| `--chart-1..5` unchanged | `grep "^    --chart-" tokens.css` | 10 entries (5 × 2 blocks) |
| Wave 0 token-binding test | `pnpm --filter @multica/views exec vitest run styles/token-binding.test.tsx` | 1 file passed, 10/10 tests passed |
| `@multica/views` typecheck | `pnpm --filter @multica/views typecheck` | exit 0 |
| `@multica/ui` typecheck | `pnpm --filter @multica/ui typecheck` | exit 0 |
| `base.css` references `--scrollbar-thumb` | `grep -q scrollbar-thumb base.css` | yes |

Visual smoke (`pnpm dev:web` → `/login` and `pnpm dev:desktop`) NOT executed — this is a parallel-worktree executor without an interactive terminal; visual verification is the responsibility of Plan 01-05 (final visual gate) and the Wave 0 e2e/theme-toggle.spec.ts when run in CI.

## Known Stubs

None — Plan 01-01 only defines token values. No data-flow stubs introduced.

## Threat Flags

None — file changes match the plan's threat_model exactly. No new endpoints, auth paths, file access patterns, or schema changes introduced.

## Self-Check: PASSED

- `packages/ui/styles/tokens.css` — exists, modified (commit `1be319f0`).
- `packages/ui/styles/base.css` — exists, modified (commit `5569092a`).
- Commit `1be319f0` — present in `git log`.
- Commit `5569092a` — present in `git log`.
- Token-binding test (10/10) — passing.
- Both typechecks — clean.
