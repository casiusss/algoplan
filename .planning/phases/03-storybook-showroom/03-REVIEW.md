---
phase: 03-storybook-showroom
reviewed: 2026-04-25T00:00:00Z
depth: standard
files_reviewed: 14
files_reviewed_list:
  - pnpm-workspace.yaml
  - turbo.json
  - apps/showroom/package.json
  - apps/showroom/tsconfig.json
  - apps/showroom/vite.config.ts
  - apps/showroom/.gitignore
  - apps/showroom/.storybook/main.ts
  - apps/showroom/.storybook/preview.tsx
  - apps/showroom/.storybook/preview.css
  - apps/showroom/stories/foundations/tokens.stories.tsx
  - apps/showroom/stories/atoms/tag-chip.stories.tsx
  - apps/showroom/stories/atoms/accent-bar.stories.tsx
  - apps/showroom/stories/atoms/avatar-initial.stories.tsx
  - apps/showroom/stories/atoms/segmented-control.stories.tsx
findings:
  critical: 0
  warning: 0
  info: 2
  total: 2
status: clean
---

# Phase 03: Code Review Report

**Reviewed:** 2026-04-25
**Depth:** standard
**Files Reviewed:** 14
**Status:** clean

## Summary

Phase 03 (Storybook Showroom) is well-implemented and passes every load-bearing
contract from `03-UI-SPEC.md` and `03-RESEARCH.md`. No bugs, no security issues,
no quality regressions. Two informational observations are surfaced below for
future polish — neither blocks merge.

Verifications performed:

- **Storybook 9 subpath imports** — `storybook/test` (tag-chip story) and
  `storybook/preview-api` (segmented-control story) match the v9 export map.
  Confirmed `storybook@9.1.20` ships both subpaths
  (`./test`, `./preview-api`). No legacy `@storybook/test` or
  `@storybook/preview-api` imports anywhere.
- **Boundary purity** — grep across `apps/showroom/**` (excluding
  `node_modules/` and `storybook-static/`) finds zero imports from
  `next/*`, `react-router-dom`, or `@multica/core/*`. `package.json` does
  not declare any of them. The "no providers" contract from UI-SPEC §Mocked
  Providers is honored by construction.
- **Theme decorator** — `preview.tsx` toggles `.dark` on
  `document.documentElement` (matches Tailwind's
  `@custom-variant dark (&:is(.dark *))` declared in `preview.css`).
  SSR guard `typeof document !== "undefined"` is present (required for
  Storybook docs-page generation in Node).
- **a11y ruleset** — `parameters.a11y.options.runOnly` includes all four
  WCAG 2.1 AA tags: `wcag2a`, `wcag2aa`, `wcag21a`, `wcag21aa`. Applied
  globally; no per-story opt-in is required (UI-SPEC §Hard Constraint #9).
- **Real atom imports** — every story imports the live source from
  `@multica/ui/components/ui/{tag-chip,accent-bar,avatar-initial,segmented-control}`.
  Zero mocked atom implementations, zero re-implementation.
- **AvatarInitial PaletteSpread determinism** — empirically re-derived all
  16 names through `djb2(name) | 0; Math.abs(...) % 8` (the live algorithm
  in `packages/ui/lib/avatar-color.ts`). All 16 names hash to the indexes
  declared in the story (2 names per index 0..7). Verification script
  reproduced from `RESEARCH §Pattern 4` ran clean.
- **No story-level `dark:` overrides** — grep across
  `apps/showroom/stories/**/*.tsx` returns zero matches. Atoms theme via
  tokens only; the story chrome adds none (UI-SPEC §Hard Constraint #5).
- **No hardcoded colors** — no hex literals, no `rgb(`/`rgba(` in story
  source or `preview.css`. Tailwind/token classes only.
- **TypeScript strictness** — `apps/showroom/tsconfig.json` extends
  `@multica/tsconfig/base.json`, which enables `strict`,
  `noUncheckedIndexedAccess`, `noUnusedLocals`, `noUnusedParameters`,
  `noImplicitReturns`. All stories type-check under those settings: stories
  use `satisfies Meta<typeof X>` + `StoryObj<typeof meta>` for component
  stories; the tokens-only foundations story uses bare `Meta` / `StoryObj`
  (correct — there is no component to bind).
- **Catalog discipline** — every shared dep in `apps/showroom/package.json`
  uses `catalog:` except `@vitejs/plugin-react` pinned to `^5.1.1` (per
  documented requirement). The catalog adds Storybook 9.1.20 trio,
  `vite ^7`, and `@fontsource-variable/inter ^5.2.5` cleanly under the
  existing `pnpm-workspace.yaml` structure.
- **No debug artifacts** — zero `console.*` calls, zero `debugger`
  statements, zero TODO/FIXME/XXX/HACK markers.

## Info

### IN-01: `useArgs` typing only narrows the `value` field, not the full args shape

**File:** `apps/showroom/stories/atoms/segmented-control.stories.tsx:43,67,90,117`
**Issue:** Each `Render` function calls `useArgs<{ value: string }>()`, which
narrows only the `value` field. The destructured `args` parameter (typed by
`StoryObj<typeof meta>` from the `SegmentedControl` component meta) and the
re-declared `{ value: string }` shape are technically two separate type
universes — both currently agree, but a future schema change to
`SegmentedControlProps` would silently drift from the inline `useArgs`
generic. This is harmless today but represents a small typing redundancy.
**Fix:** Optional polish — extract the shape to a single source of truth:
```tsx
type ControlArgs = React.ComponentProps<typeof SegmentedControl>
const [{ value }, updateArgs] = useArgs<ControlArgs>()
```
Or accept the tiny duplication — it's two characters of risk in exchange for
keeping each story self-describing.

### IN-02: `turbo.json` `build-storybook.dependsOn` is asymmetric vs `build`

**File:** `turbo.json:40-44`
**Issue:** `build-storybook` declares `dependsOn: ["^typecheck"]` (upstream
packages must typecheck first). The repo's `build` task does NOT depend on
`^typecheck`. The asymmetry is intentional (Storybook gets a typecheck gate
that `build` lacks), but it bears noting because:
1. The showroom's OWN typecheck is not in the dependency chain — only
   upstream packages typecheck before `build-storybook`. A type error inside
   `apps/showroom/stories/**` would NOT fail `build-storybook` until
   Storybook's own Vite build encounters it.
2. Future contributors may copy the `build` shape (without `^typecheck`)
   and lose the upstream gate.
**Fix:** Optional. If the goal is "showroom builds only when types are
sound," add `"typecheck"` (without `^`) to `dependsOn` so the showroom's
own typecheck script runs too:
```json
"build-storybook": {
  "dependsOn": ["^typecheck", "typecheck"],
  ...
}
```
If the asymmetry was deliberate (e.g., to keep CI fast), leave as-is and
rely on the existing top-level `pnpm typecheck` step.

---

_Reviewed: 2026-04-25_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
