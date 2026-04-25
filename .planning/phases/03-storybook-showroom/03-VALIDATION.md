---
phase: 3
slug: storybook-showroom
status: planned
nyquist_compliant: true
wave_0_complete: false
created: 2026-04-25
updated: 2026-04-25
---

# Phase 3 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.
> Source of truth: `03-RESEARCH.md` §Validation Architecture.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Storybook 9.1.20 build smoke (no Vitest in apps/showroom — stories ARE the tests) |
| **Config file** | `apps/showroom/.storybook/main.ts` |
| **Quick run command** | `pnpm --filter @multica/showroom typecheck` (~5s) |
| **Full suite command** | `pnpm --filter @multica/showroom build-storybook` (~15-30s) |
| **Estimated runtime** | quick ~5s, full ~30s (build), manual ~2min |

---

## Sampling Rate

- **After every task commit:** Run `pnpm --filter @multica/showroom typecheck`
- **After every plan wave:** Run `pnpm --filter @multica/showroom build-storybook`
- **Before `/gsd-verify-work`:** `pnpm typecheck && pnpm --filter @multica/showroom build-storybook` exit 0 + manual smoke
- **Max feedback latency:** ~30s

---

## Plan-to-Task Map

The original 5-plan VALIDATION shape was consolidated into 4 plans during planning to avoid same-file (`preview.tsx`) overlap between waves. The original "theme" + "a11y" plans are merged into a single Plan 02 because both edit `preview.tsx`.

| Plan | Wave | Title | Tasks | Owns Files |
|------|------|-------|-------|------------|
| 03-00 | 0 | workspace skeleton | 2 (catalog + scaffold) | pnpm-workspace.yaml, turbo.json, apps/showroom/{package.json,tsconfig.json,vite.config.ts,.gitignore} |
| 03-01 | 1 | CSS chain + .storybook scaffold | 3 (main.ts, preview.css, preview.tsx skeleton + build smoke) | apps/showroom/.storybook/{main.ts,preview.tsx,preview.css} |
| 03-02 | 2 | preview features + smoke story | 2 (preview.tsx full config, foundations/tokens.stories.tsx) | apps/showroom/.storybook/preview.tsx, apps/showroom/stories/foundations/tokens.stories.tsx |
| 03-03 | 3 | atom stories | 4 (TagChip, AccentBar, AvatarInitial, SegmentedControl) | apps/showroom/stories/atoms/*.stories.tsx (4 files) |

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 3-00-01 | 00 | 0 | SB-01 | T-03-00-02 | private:true; no published artifact; CI builds in sandbox | infra | `cat apps/showroom/package.json \| jq -r .private` returns `true` | ❌ W0 | ⬜ pending |
| 3-00-02 | 00 | 0 | SB-01 | T-03-00-01, T-03-00-03 | catalog-pinned versions; no script injection; no @multica/core dep | infra | `pnpm install --no-frozen-lockfile && pnpm --filter @multica/showroom typecheck && ! grep -E "(@multica/core\|next/\|react-router-dom)" apps/showroom/package.json` | ❌ W0 | ⬜ pending |
| 3-01-01 | 01 | 1 | SB-02, SB-03 | T-03-01-01 | Tailwind @source restricted to packages/ui+stories; no global glob; no addon-essentials | infra | `pnpm --filter @multica/showroom build-storybook` exit 0 | ❌ W0 | ⬜ pending |
| 3-02-01 | 02 | 2 | SB-02, SB-04 (theme + a11y) | T-03-02-01, T-03-02-03, T-03-02-05 | theme toggle mutates documentElement classList only (SSR-safe); axe runs WCAG 2.1 AA on every story; zero providers mounted globally | unit (build smoke) + manual | `pnpm --filter @multica/showroom build-storybook` exit 0 + Foundations/Tokens/Surfaces story renders + manual: theme toggle flips bg-sidebar swatch, a11y panel zero critical violations | ❌ W0 | ⬜ pending |
| 3-03-01 | 03 | 3 | SB-04 (stories) | T-03-03-01, T-03-03-03, T-03-03-06 | stories import real source from @multica/ui (no mocked atoms); no `dark:*` story-level overrides; no global Provider mounts | static + build | `grep -h "from \"@multica/ui/components/ui" apps/showroom/stories/atoms/*.stories.tsx \| wc -l` >= 4 AND `pnpm --filter @multica/showroom build-storybook` exit 0 | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky · 🚫 dropped*

**Note on consolidation:** the original `3-03-01` (a11y standalone task) merged into `3-02-01` because both touch the same `preview.tsx` file (UI-SPEC §Storybook Configuration Contract — `parameters.a11y.config` lives alongside `globalTypes.theme`). Original `3-04-01` (stories) is now `3-03-01`. Wave numbering shifted: theme+a11y is Wave 2; stories is Wave 3.

---

## Wave 0 Requirements

Before any subsequent plan runs, these scaffolds must exist (delivered by Plan 00):

- [ ] `apps/showroom/` directory + workspace
- [ ] `apps/showroom/package.json` (private:true, scripts, catalog devDeps)
- [ ] `apps/showroom/tsconfig.json` (extends @multica/tsconfig/base.json)
- [ ] `apps/showroom/vite.config.ts`
- [ ] `apps/showroom/.gitignore` (storybook-static, node_modules, .vite)
- [ ] `pnpm-workspace.yaml` catalog: `vite ^7`, `storybook 9.1.20`, `@storybook/react-vite 9.1.20`, `@storybook/addon-a11y 9.1.20`, `@storybook/addon-docs 9.1.20`, `@fontsource-variable/inter ^5.2.5`
- [ ] `turbo.json` build-storybook task block (with outputs: `["storybook-static/**"]`)

Plan 01 then creates `.storybook/main.ts`, `.storybook/preview.tsx` (skeleton), and `.storybook/preview.css`. Plan 02 extends `preview.tsx` with globalTypes/decorator/parameters and writes `stories/foundations/tokens.stories.tsx`. Plan 03 writes the four `stories/atoms/*.stories.tsx` files.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Storybook starts with zero console errors about missing env vars / API client | SB-02 / SC#1 | Console error detection requires running browser | `pnpm --filter @multica/showroom storybook`, open DevTools console, expect zero `[error]` entries |
| Theme toggle flips `bg-sidebar` to deep-forest-green in dark mode | SB-04 / SC#2 | Visual perceptual check | Open Foundations/Tokens/Surfaces story, toggle Theme to Dark, verify `bg-sidebar` swatch is dark green not transparent |
| a11y panel shows zero critical WCAG violations on each atom story | SB-04 / SC#3 | axe run output requires interactive panel | For each Atoms/* story open Accessibility tab, expect zero impact:critical Violations |
| SegmentedControl interactivity | SB-04 (stories) | useArgs panel reflects live state | Open Atoms/SegmentedControl/Default, click P1, verify args panel value updates to "P1" + arrow keys move selection |
| AvatarInitial PaletteSpread coverage | SB-04 (stories) | Visual proof the empirical mapping covers all 8 palette indexes | Open Atoms/AvatarInitial/PaletteSpread, count visually distinct circle colors, expect 8 |

---

## Validation Sign-Off

- [x] All tasks have automated verify or Wave 0 dependencies listed above
- [x] Sampling continuity: typecheck per commit, build-storybook per wave
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags in any test command
- [x] Feedback latency < 30s per task
- [x] `nyquist_compliant: true` set in frontmatter
- [x] Task ID map updated 2026-04-25 to reflect 4-plan consolidation (theme + a11y merged into Plan 02 due to same preview.tsx file ownership)

**Approval:** APPROVED 2026-04-25 by gsd-planner orchestrator.
