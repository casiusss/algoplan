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

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 3-00-01 | 00 | 0 | SB-01 | — | private:true; no published artifact; CI builds in sandbox | infra | `cat apps/showroom/package.json | jq -r .private` returns `true` | ❌ W0 | ⬜ pending |
| 3-00-02 | 00 | 0 | SB-01..04 | — | catalog-pinned versions; no script injection | infra | `pnpm install --no-frozen-lockfile && pnpm typecheck` | ❌ W0 | ⬜ pending |
| 3-01-01 | 01 | 1 | SB-02, SB-03 | — | Tailwind @source restricted to packages/ui+stories; no global glob | infra | `pnpm --filter @multica/showroom build-storybook` exit 0 | ❌ W0 | ⬜ pending |
| 3-02-01 | 02 | 2 | SB-04 (theme) | — | theme toggle mutates documentElement classList only; no localStorage write | unit (build smoke) | `pnpm --filter @multica/showroom build-storybook` exit 0 + Foundations/Tokens/Surfaces story renders | ❌ W0 | ⬜ pending |
| 3-03-01 | 03 | 2 | SB-04 (a11y) | — | axe runs WCAG 2.1 AA; no story bypasses | unit (build smoke) | `pnpm --filter @multica/showroom build-storybook` exit 0 | ❌ W0 | ⬜ pending |
| 3-04-01 | 04 | 3 | SB-04 (stories) | — | stories import real source from @multica/ui (no mocked atoms) | static + build | `grep -h "from \"@multica/ui/components/ui" apps/showroom/stories/atoms/*.stories.tsx | wc -l` >= 4 + build exit 0 | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky · 🚫 dropped*

---

## Wave 0 Requirements

Before any subsequent plan runs, these scaffolds must exist (delivered by Plan 00):

- [ ] `apps/showroom/` directory + workspace
- [ ] `apps/showroom/package.json` (private:true, scripts, catalog devDeps)
- [ ] `apps/showroom/tsconfig.json` (extends @multica/tsconfig/base.json)
- [ ] `apps/showroom/vite.config.ts`
- [ ] `apps/showroom/.storybook/main.ts` (framework + addons)
- [ ] `apps/showroom/.storybook/preview.tsx` (skeleton)
- [ ] `apps/showroom/.storybook/preview.css`
- [ ] `pnpm-workspace.yaml` catalog: `vite ^7`, `storybook 9.1.20`, `@storybook/react-vite 9.1.20`, `@storybook/addon-a11y 9.1.20`, `@storybook/addon-docs 9.1.20`, `@fontsource-variable/inter ^5`
- [ ] `turbo.json` build-storybook task

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Storybook starts with zero console errors about missing env vars / API client | SB-02 / SC#1 | Console error detection requires running browser | `pnpm --filter @multica/showroom storybook`, open DevTools console, expect zero `[error]` entries |
| Theme toggle flips `bg-sidebar` to deep-forest-green in dark mode | SB-04 / SC#2 | Visual perceptual check | Open Foundations/Tokens/Surfaces story, toggle Theme to Dark, verify `bg-sidebar` swatch is dark green not transparent |
| a11y panel shows zero critical WCAG violations on each atom story | SB-04 / SC#3 | axe run output requires interactive panel | For each Atoms/* story open Accessibility tab, expect zero impact:critical Violations |

---

## Validation Sign-Off

- [x] All tasks have automated verify or Wave 0 dependencies listed above
- [x] Sampling continuity: typecheck per commit, build-storybook per wave
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags in any test command
- [x] Feedback latency < 30s per task
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** APPROVED 2026-04-25 by gsd-planner orchestrator.
