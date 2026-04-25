---
phase: 03-storybook-showroom
plan: 03
subsystem: ui-tooling
tags:
  - storybook
  - atoms
  - stories
requires:
  - "03-02"
provides:
  - "Atoms / TagChip stories (Default, AllColors, WithRemove, Polymorphic)"
  - "Atoms / AccentBar stories (Default, AllColors, Segments, Orientation)"
  - "Atoms / AvatarInitial stories (Default, AllSizes, Determinism, PaletteSpread, Empty)"
  - "Atoms / SegmentedControl stories (Default, TwoOptions, WithDisabled, KeyboardInstructions)"
affects:
  - apps/showroom
tech-stack:
  added: []
  patterns:
    - "Storybook 9 CSF3 with `satisfies Meta<typeof Component>` for type-inferred stories"
    - "Storybook 9 consolidated subpath imports: `storybook/test`, `storybook/preview-api`"
    - "useArgs controlled-state pattern with named `function Render(args)` (rules-of-hooks)"
    - "Empirically verified hash-mapping table inlined as story data (PALETTE_NAMES)"
key-files:
  created:
    - apps/showroom/stories/atoms/tag-chip.stories.tsx
    - apps/showroom/stories/atoms/accent-bar.stories.tsx
    - apps/showroom/stories/atoms/avatar-initial.stories.tsx
    - apps/showroom/stories/atoms/segmented-control.stories.tsx
  modified: []
decisions:
  - "Render-only stories supply minimal `args` (e.g. `{ color: 'brand' }`) to satisfy required-prop type contracts inferred via `satisfies Meta<typeof Component>` — render() ignores them when enumerating variants"
  - "SegmentedControl stories use placeholder `noopChange` + empty fragment for `onValueChange` / `children` args to satisfy types; render() always overrides at runtime"
  - "PALETTE_NAMES inlined as a `ReadonlyArray<{name; index}>` rather than computed from hashToPaletteIndex at render — keeps story rendering pure, makes drift visible in PRs"
metrics:
  duration: "4m 51s"
  completed: "2026-04-25T12:26:28Z"
  stories_total: 18
  stories_added_this_plan: 17
  build-storybook_exit: 0
  build-storybook_size: "7.0M"
---

# Phase 03 Plan 03: Atom stories (TagChip, AccentBar, AvatarInitial, SegmentedControl) Summary

Four atom story files added to `apps/showroom/stories/atoms/`, each importing the real atom source from `@multica/ui/components/ui/{name}` and using Storybook 9 consolidated subpath imports (`storybook/test`, `storybook/preview-api`). Static build now bundles 18 total stories.

## What shipped

- **`tag-chip.stories.tsx`** (4 stories): Default, AllColors (5 variants), WithRemove (5 variants with `fn()` action spy), Polymorphic (`render={<a href="#" />}`)
- **`accent-bar.stories.tsx`** (4 stories): Default, AllColors (6 variants incl. `muted`), Segments (1/2/3/4 with matching `colors` arrays), Orientation (horizontal + vertical with height-constrained parent)
- **`avatar-initial.stories.tsx`** (5 stories): Default, AllSizes (sm/default/lg, items-end aligned), Determinism (5x same name → identical color), PaletteSpread (16 empirical names, 2 per palette index), Empty (`name=""` → "?" + `aria-label="Unknown user"`)
- **`segmented-control.stories.tsx`** (4 stories): Default (P0..P3), TwoOptions (Board/List), WithDisabled (P3 disabled), KeyboardInstructions — all use `useArgs` from `storybook/preview-api` for controlled-state, named `function Render(args)` for rules-of-hooks

## AvatarInitial PaletteSpread — empirical hash mapping

All 16 names verified live against `hashToPaletteIndex` from `packages/ui/lib/avatar-color.ts` on 2026-04-25. Two names per index gives the reviewer two independent visual confirmations per color and protects against single-name typos silently regressing coverage.

| Palette Index | Name 1         | Name 2         |
| ------------- | -------------- | -------------- |
| 0             | Dana Davis     | Jay Jones      |
| 1             | Ivy Ito        | Sara Smith     |
| 2             | Quinn Quiroz   | Wren White     |
| 3             | Faye Fisher    | Gabe Green     |
| 4             | Xander Xu      | Yara Young     |
| 5             | Alice Anderson | Bella Brown    |
| 6             | Hana Hill      | Noah Nelson    |
| 7             | Eli Edwards    | Lara Lopez     |

Re-derivation script (run from project root):

```js
function djb2(s){let h=5381;for(let i=0;i<s.length;i++){h=((h<<5)+h)+s.charCodeAt(i);h|=0}return h}
function idx(s){return Math.abs(djb2(s))%8}
```

If `AVATAR_PALETTE.length` ever changes from 8, re-run the script and update `PALETTE_NAMES`.

## Build smoke (Wave 3 final gate)

```
pnpm --filter @multica/showroom build-storybook → exit 0
```

`storybook-static/index.json` confirms 18 stories across 5 entries:

| Entry                       | Story count |
| --------------------------- | ----------- |
| Foundations / Tokens        | 1           |
| Atoms / TagChip             | 4           |
| Atoms / AccentBar           | 4           |
| Atoms / AvatarInitial       | 5           |
| Atoms / SegmentedControl    | 4           |
| **Total**                   | **18**      |

Static build size: **7.0 MB** (includes axe-core 583 kB and DocsRenderer 660 kB — both vendor chunks, expected). Per-story chunks are 5–25 kB.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Render-only stories failed type contract for required props**

- **Found during:** Task 1 (TagChip AllColors), then again in Task 3 (AvatarInitial AllSizes / Determinism / PaletteSpread) and Task 4 (SegmentedControl all four).
- **Issue:** Plan templates use `render: () => (...)` without `args`. With `satisfies Meta<typeof Component>`, Storybook's `StoryAnnotations` type makes `args` required when the component has required props (e.g., `TagChip.color`, `AvatarInitial.name`, `SegmentedControl.value` + `onValueChange` + `children` + `aria-label`). `tsc --noEmit` failed in each of those story files.
- **Fix:** Added minimal `args` to each render-only story to satisfy the required-prop type contract; the render function ignores them. For SegmentedControl I added a hoisted `noopChange` + empty `<></>` fragment to cover `onValueChange` and `children` placeholders (render always overrides at runtime).
- **Files modified:** All four atom story files in this plan.
- **Commits:** Folded into the per-task commits (`d48bbd48`, `5115235c`, `7adc04df`).
- **Why this is the right fix:** UI-SPEC §Hard Constraint #1 requires real atom imports → `satisfies Meta<typeof Component>` is the correct typing → the type system correctly demands required props in args. Adding placeholder args is the idiomatic Storybook 9 escape hatch (no `as any`, no `Partial`, no widening). Behavior is identical at runtime; the args panel correctly shows the live values for controlled stories (SegmentedControl) thanks to `useArgs`.

## Per-task commits

| Task | Story file                     | Commit     | Stories added |
| ---- | ------------------------------ | ---------- | ------------- |
| 1    | tag-chip.stories.tsx           | `d48bbd48` | 4             |
| 2    | accent-bar.stories.tsx         | `7120ddae` | 4             |
| 3    | avatar-initial.stories.tsx     | `5115235c` | 5             |
| 4    | segmented-control.stories.tsx  | `7adc04df` | 4             |

## Phase 3 close-out

- **SB-04 (stories)**: 17 atom stories shipped (this plan) + 1 Foundations smoke story (Plan 02) = 18 total. Matches UI-SPEC §Component-Specific Story Contracts exactly.
- **SC#3 (a11y)**: addon-a11y panel runs WCAG 2.1 AA on every story (config from Plan 02). Manual verify-work required to confirm zero critical violations on each `Atoms / *` story.
- **SC#4 (real atom source)**: every story imports from `@multica/ui/components/ui/{name}` — verified by `grep -h "from \"@multica/ui/components/ui" apps/showroom/stories/atoms/*.stories.tsx | wc -l` → `4`.
- **Storybook 9 subpaths**: no deprecated `@storybook/test` or `@storybook/preview-api` imports anywhere in the four files.
- **Phase 3 plans complete**: 00 (workspace), 01 (CSS chain), 02 (preview + smoke), 03 (atom stories) — Phase 3 ROADMAP entry can be marked `[x]`. Phase 4 (Dashboard Shell Redesign) is unblocked.

## Manual verify-work checklist (per VALIDATION §Manual-Only Verifications)

- [ ] `pnpm --filter @multica/showroom storybook` → DevTools console empty (no env-var / API-client errors)
- [ ] Each `Atoms / *` story renders correctly in **Light** theme
- [ ] Each `Atoms / *` story renders correctly in **Dark** theme (toggle via toolbar)
- [ ] Accessibility tab on every atom story → **zero critical violations** (locks SC#3)
- [ ] **TagChip / WithRemove**: clicking the X fires the action spy (visible in Actions panel)
- [ ] **TagChip / Polymorphic**: rendered element is `<a href="#">`, not `<span>` (DevTools)
- [ ] **AccentBar / Orientation**: vertical bar is visibly tall (parent `h-32` constraint working)
- [ ] **AvatarInitial / Determinism**: 5 swatches all same color
- [ ] **AvatarInitial / PaletteSpread**: 8 visibly distinct circle colors, each appearing exactly twice (paired by index — confirms empirical mapping)
- [ ] **AvatarInitial / Empty**: shows `?`, screen-reader announces "Unknown user"
- [ ] **SegmentedControl / Default**: clicking segments updates the args panel `value` live
- [ ] **SegmentedControl / Default**: Tab focuses; ←/→ moves selection; Home/End jump; Space activates
- [ ] **SegmentedControl / WithDisabled**: P3 cannot receive focus via arrow keys

## Threat Flags

None — no new security-relevant surface introduced. Stories only render existing atoms with constrained inputs; no network, auth, file access, or schema changes.

## Self-Check: PASSED

Verified after writing this SUMMARY (commit hashes from `git log`, files via `test -f`):

- `apps/showroom/stories/atoms/tag-chip.stories.tsx` — FOUND
- `apps/showroom/stories/atoms/accent-bar.stories.tsx` — FOUND
- `apps/showroom/stories/atoms/avatar-initial.stories.tsx` — FOUND
- `apps/showroom/stories/atoms/segmented-control.stories.tsx` — FOUND
- Commit `d48bbd48` (TagChip) — FOUND
- Commit `7120ddae` (AccentBar) — FOUND
- Commit `5115235c` (AvatarInitial) — FOUND
- Commit `7adc04df` (SegmentedControl) — FOUND
- `pnpm --filter @multica/showroom typecheck` — exit 0
- `pnpm --filter @multica/showroom build-storybook` — exit 0
- 18 stories indexed in `storybook-static/index.json`
- All 16 PaletteSpread names empirically confirmed against `hashToPaletteIndex`
