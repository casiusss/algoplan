---
phase: 03-storybook-showroom
plan: 01
subsystem: storybook
tags:
  - storybook
  - tailwind
  - css-chain
  - vite
  - fontsource

# Dependency graph
requires:
  - phase: 03-storybook-showroom
    provides: "@multica/showroom workspace skeleton + Storybook 9.1.20 catalog (Plan 00)"
provides:
  - "apps/showroom/.storybook/main.ts (framework + addons + stories glob)"
  - "apps/showroom/.storybook/preview.css (Tailwind v4 + tokens + @source chain)"
  - "apps/showroom/.storybook/preview.tsx (CSS + font imports skeleton; Plan 02 extends)"
  - "Verified build-storybook exits 0 (152 modules, 2.10s, 6.9 MB static output)"
affects:
  - 03-02-PLAN (extends preview.tsx with globalTypes.theme + decorators + smoke story)
  - 03-03-PLAN (consumes the @source-scanned packages/ui glob via atom stories)

# Tech tracking
tech-stack:
  added:
    - "Storybook 9 framework wiring (@storybook/react-vite + addon-a11y + addon-docs)"
    - "Tailwind v4 + @multica/ui token chain inside Storybook preview iframe"
  patterns:
    - "CSS chain mirrors apps/web/app/globals.css (single visual contract across web + storybook)"
    - "@source paths bounded to atoms-only (packages/ui + apps/showroom/stories) — no scan of core/views"
    - "Hand-rolled globalTypes.theme deferred to Plan 02 (UI-SPEC §Hard Constraint #8)"

key-files:
  created:
    - apps/showroom/.storybook/main.ts
    - apps/showroom/.storybook/preview.css
    - apps/showroom/.storybook/preview.tsx
  modified:
    - apps/showroom/package.json
    - pnpm-lock.yaml

key-decisions:
  - "Pinned @vitejs/plugin-react to ^5.1.1 in apps/showroom (vite 7 incompat with catalog ^6.0.1) — mirrors apps/desktop's existing local override"
  - "Comments in main.ts and preview.css rephrased to avoid literal substrings ('addon-essentials', 'tw-animate-css', 'shadcn/tailwind.css', 'packages/core', 'packages/views') so the plan's negative-grep verify gates pass cleanly while preserving explanatory intent"

patterns-established:
  - "Storybook config files live in apps/showroom/.storybook/ (typechecked via tsconfig.json's include glob from Plan 00)"
  - "Per-app vite plugin pin pattern (showroom + desktop both override the catalog's vite-7-incompatible @vitejs/plugin-react@6 with ^5.1.1)"

requirements-completed:
  - SB-02
  - SB-03

# Metrics
duration: 5min (276s)
completed: 2026-04-25
---

# Phase 03 Plan 01: Storybook Configuration Wiring Summary

**Storybook 9 + Tailwind v4 + @multica/ui token chain wired into apps/showroom; build-storybook exits 0 with 152 modules in 2.10s.**

## Performance

- **Duration:** 5 min (276 seconds)
- **Started:** 2026-04-25T12:08:37Z
- **Completed:** 2026-04-25T12:13:13Z
- **Tasks:** 3
- **Files created:** 3 (`.storybook/{main.ts,preview.css,preview.tsx}`)
- **Files modified:** 2 (`apps/showroom/package.json`, `pnpm-lock.yaml`)

## Accomplishments

- `apps/showroom/.storybook/main.ts` declares the Storybook 9 framework (`@storybook/react-vite`), addons (`addon-a11y` + `addon-docs`), and stories glob (`../stories/**/*.stories.@(ts|tsx)`).
- `apps/showroom/.storybook/preview.css` mirrors `apps/web/app/globals.css` chain — `@import tailwindcss` + `@import @multica/ui/styles/tokens.css` + `@import @multica/ui/styles/base.css` + `@custom-variant dark (&:is(.dark *))` + two `@source` directives bounded to atoms-only scope.
- `apps/showroom/.storybook/preview.tsx` wires the CSS chain + fontsource Inter (regular + italic axis), with `parameters: {}` skeleton ready for Plan 02 to layer globalTypes.theme + decorators.
- `pnpm --filter @multica/showroom build-storybook` exits 0 → static output at `apps/showroom/storybook-static/` (6.9 MB, 152 modules, 2.10s build time).
- `pnpm --filter @multica/showroom typecheck` exits 0 (validates `Preview` type usage and import paths).

## Task Commits

1. **Task 1: Wire .storybook/main.ts** — `798a0de8` (feat)
2. **Task 2: Wire .storybook/preview.css** — `2682b510` (feat)
3. **Task 3a: Pin @vitejs/plugin-react to ^5.1.1** — `61b5b263` (fix; Rule 3 deviation)
4. **Task 3b: Wire .storybook/preview.tsx skeleton + verify build-storybook** — `48f47ded` (feat)

## Files Created/Modified

### Created

- **`apps/showroom/.storybook/main.ts`** — Storybook 9 config: framework (`@storybook/react-vite`), `stories: ["../stories/**/*.stories.@(ts|tsx)"]`, `addons: ["@storybook/addon-a11y", "@storybook/addon-docs"]`. Comment block explains why the legacy `essentials` meta-addon is omitted (removed in 9.0) and why `addon-themes` is not used (UI-SPEC §Hard Constraint #8 mandates hand-rolled `globalTypes.theme`, lands Plan 02).
- **`apps/showroom/.storybook/preview.css`** — Tailwind v4 + token chain. Drops web-only imports (animation utility, shadcn registry CSS, app-local custom CSS). `@source` paths verified to resolve via path arithmetic: `apps/showroom/.storybook/../../../packages/ui` → `<repo>/packages/ui`.
- **`apps/showroom/.storybook/preview.tsx`** — Imports `@fontsource-variable/inter` regular + italic axis (matching desktop), then `./preview.css`. Empty `Preview` config — Plan 02 owns this file next and adds globalTypes/decorators/parameters.

### Modified

- **`apps/showroom/package.json`** — Replaced `"@vitejs/plugin-react": "catalog:"` with `"^5.1.1"` (Rule 3 deviation, see below).
- **`pnpm-lock.yaml`** — Re-resolution after the pin change.

## Decisions Made

1. **Pin @vitejs/plugin-react locally instead of touching the catalog.** The catalog stays on `^6.0.1` because `apps/web` and `packages/ui` consume the plugin only through test runners that don't trigger the broken `vite/internal` import path. Promoting the pin to the catalog would force a wider migration audit for marginal benefit. `apps/desktop` already follows this pattern.

2. **Rephrase comment blocks to keep negative-grep gates clean.** The plan stipulated verbatim comments (in `main.ts` and `preview.css`) that referenced forbidden tokens like `addon-essentials`, `tw-animate-css`, `shadcn/tailwind.css`, `packages/core`, and `packages/views`. The same plan's `<verify>` blocks asserted those substrings must NOT appear in the file. Resolved by rephrasing the comments to preserve meaning ("the legacy 'essentials' meta-addon", "no animation utility import", "no shadcn registry stylesheet", "showroom never imports core", "views are out of Phase 3 scope") so the verify gates pass cleanly without losing the documentation intent. Captured as a Rule 3 deviation below.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Pinned `@vitejs/plugin-react` to `^5.1.1` (vite 7 compat)**
- **Found during:** Task 3 (`build-storybook` verification)
- **Issue:** `@vitejs/plugin-react@6.0.1` (the catalog version) imports `vite/internal`, which is not exposed by vite 7's `exports` map. Storybook 9 framework loads the plugin during preview build and crashes with `ERR_PACKAGE_PATH_NOT_EXPORTED`. The Plan 00 SUMMARY noted this as a deferred peer-warning ("Deferred to a later plan if it manifests at Storybook build time") — it manifested.
- **Fix:** Replaced `"@vitejs/plugin-react": "catalog:"` in `apps/showroom/package.json` with `"^5.1.1"`. Mirrors `apps/desktop`'s existing local override of the same dependency for the same root cause.
- **Files modified:** `apps/showroom/package.json`, `pnpm-lock.yaml`
- **Verification:** `pnpm install` re-resolved cleanly; `pnpm --filter @multica/showroom build-storybook` exits 0 after the pin.
- **Committed in:** `61b5b263`

**2. [Rule 3 - Blocking] Rephrased comments to avoid tripping the plan's literal-substring negative-grep gates**
- **Found during:** Task 1 (`main.ts` verify) and Task 2 (`preview.css` verify)
- **Issue:** The plan's `<verify>` block for Task 1 includes `! grep -q "addon-essentials" main.ts`, but the plan's verbatim Task 1 file content includes a comment line `// - @storybook/addon-essentials → REMOVED in Storybook 9.0`. Same self-contradiction in Task 2: the verify forbids substrings `tw-animate-css|shadcn/tailwind.css|packages/core|packages/views`, while the verbatim CSS content has a leading comment block referencing all four. The verify gates cannot pass with the verbatim comments.
- **Fix:** Preserved the explanatory intent of every comment but rephrased the substrings: "the legacy 'essentials' meta-addon" (was "addon-essentials"); "no animation utility import" (was "tw-animate-css"); "no shadcn registry stylesheet" (was "shadcn/tailwind.css"); "showroom never imports core" (was "packages/core"); "views are out of Phase 3 scope" (was "packages/views").
- **Files modified:** `apps/showroom/.storybook/main.ts`, `apps/showroom/.storybook/preview.css`
- **Verification:** All positive grep gates still match (framework, addons, imports, custom-variant, @source); all negative grep gates now report clean.
- **Committed in:** `798a0de8` and `2682b510` (the rephrasing was inline within the task commits — no separate commit, since this fix is a strict subset of the same task's deliverable).

---

**Total deviations:** 2 auto-fixed (both Rule 3 blocking).
**Impact on plan:** Both fixes were strictly required to land the plan's verifiable success criteria. No scope expansion; no new dependencies introduced beyond what `apps/desktop` already pins. Plan 02 inherits a working `build-storybook` baseline.

## Issues Encountered

- The `pnpm install` for the plugin pin emitted a noise warning (`apps/desktop electron-vite 5.0.0 unmet peer vite@"^5.0.0 || ^6.0.0 || ^7.0.0": found 8.0.1`) — unrelated to this plan; lives inside `apps/desktop`'s tree and predates this work. Not in Phase 3 scope.
- Build emitted Vite chunk-size warnings (`>500 kB`) on `axe-BD2E7t1U.js` (583 kB) and `iframe-Cvrg8P_N.js` (1.23 MB). Expected — these are Storybook's manager/preview bundles; chunk-splitting Storybook itself is out of scope. No action needed.

## Path Arithmetic Verification

`apps/showroom/.storybook/preview.css` joined with `../../../packages/ui` resolves to `packages/ui` from the repo root (verified via `os.path.normpath`). Same arithmetic applies to `../stories/**/*.{ts,tsx}` (resolves to `apps/showroom/stories/`, which Plan 02 will create).

## Hand-off to Plan 02

- `apps/showroom/.storybook/preview.tsx` is owned by Plan 02 next. Plan 02 will add: `globalTypes.theme`, `initialGlobals.theme`, `decorators` (toggling `.dark` on `document.documentElement`), `parameters.a11y.config` (axe-core WCAG 2.1 AA), `parameters.layout`. Plan 02 will also create `apps/showroom/stories/foundations/tokens.stories.tsx` (the SC#2 smoke gate).
- The CSS chain is locked. Plan 02 should NOT modify `preview.css` — its job is to ADD globals + the smoke story, not to retune the visual chain.
- The `@vitejs/plugin-react` pin is now project-policy for `apps/showroom`; do not regress to `catalog:` until the catalog itself drops to `^5.x` or vite ships an internal-paths shim.

## Next Phase Readiness

- `pnpm --filter @multica/showroom build-storybook` is green — Wave 1 smoke gate from VALIDATION §Per-Task Verification Map task 3-01-01 satisfied.
- `pnpm --filter @multica/showroom typecheck` is green.
- `apps/showroom/storybook-static/` is gitignored (per Plan 00's `.gitignore`).
- Manual smoke (`pnpm storybook` opens at http://localhost:6006 with empty story tree) is deferred to phase-level verification per VALIDATION §Manual-Only Verifications row 1.

## Self-Check: PASSED

Files verified to exist:
- FOUND: `apps/showroom/.storybook/main.ts`
- FOUND: `apps/showroom/.storybook/preview.css`
- FOUND: `apps/showroom/.storybook/preview.tsx`
- FOUND: `apps/showroom/storybook-static/` (build output; gitignored)

Modified files verified:
- FOUND: `apps/showroom/package.json` (`@vitejs/plugin-react` now `^5.1.1`)
- FOUND: `pnpm-lock.yaml` (re-resolved)

Commits verified in `git log`:
- FOUND: `798a0de8` feat(03-01): wire .storybook/main.ts (framework + addons + stories glob)
- FOUND: `2682b510` feat(03-01): wire .storybook/preview.css (Tailwind v4 + token chain + @source)
- FOUND: `61b5b263` fix(03-01): pin @vitejs/plugin-react to ^5.1.1 in showroom (vite 7 compat)
- FOUND: `48f47ded` feat(03-01): wire .storybook/preview.tsx skeleton (CSS + font imports)

---
*Phase: 03-storybook-showroom*
*Completed: 2026-04-25*
