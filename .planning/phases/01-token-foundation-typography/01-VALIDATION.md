---
phase: 1
slug: token-foundation-typography
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-24
---

# Phase 1 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.
> Source of truth: `01-RESEARCH.md` §Validation Architecture.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.1.0 (TS unit, jsdom or node), Playwright 1.58.2 (E2E), Go test (server — irrelevant for Phase 1) |
| **Config files** | `packages/views/vitest.config.ts` (jsdom), `packages/core/vitest.config.ts` (node), `apps/web/vitest.config.ts` (jsdom), `playwright.config.ts` (root) |
| **Quick run command** | `pnpm typecheck && pnpm --filter @multica/views test --run` |
| **Full suite command** | `make check` (typecheck + TS unit + Go + Playwright E2E) |
| **Estimated runtime** | quick ~25s, full ~6–9min |

---

## Sampling Rate

- **After every task commit:** Run `pnpm typecheck && pnpm --filter @multica/views test --run` (~25s)
- **After every plan wave:** Run `pnpm test` (all TS packages) + `pnpm exec playwright test e2e/theme-toggle.spec.ts e2e/typography.spec.ts` (Phase 1 scope only)
- **Before `/gsd-verify-work`:** `make check` must be green
- **Max feedback latency:** 30s per task

---

## Per-Task Verification Map

> Plan IDs are placeholders — populated by `gsd-planner`. Each task gets one row.

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 1-01-01 | 01 | 1 | FND-01 | — | Tokens.css `:root` + `.dark` blocks contain new OKLCH values for all 40+ semantic slots; `@theme inline` block binds `--color-tag-p0..p3` and `*-foreground` | unit (jsdom + getComputedStyle smoke) | `pnpm --filter @multica/views exec vitest run packages/ui/styles/__tests__/token-binding.test.tsx` | ❌ W0 | ⬜ pending |
| 1-01-02 | 01 | 1 | FND-01 | — | Both apps import `@multica/ui/styles/tokens.css` via the shared chain (web `globals.css`, desktop `globals.css`) | static | `grep -l '@multica/ui/styles/tokens.css' apps/web/app/globals.css apps/desktop/src/renderer/src/globals.css` | ✅ existing | ⬜ pending |
| 1-02-01 | 02 | 1 | FND-02 (web) | — | `apps/web/app/layout.tsx` Inter loader requests italic axis (Network shows italic woff2) | E2E (Playwright) | `pnpm exec playwright test e2e/typography.spec.ts -g "italic web"` | ❌ W0 | ⬜ pending |
| 1-02-02 | 02 | 1 | FND-02 (desktop) | — | `apps/desktop/src/renderer/src/main.tsx` imports `@fontsource-variable/inter/wght-italic.css` (verified by import existence + manual DevTools Computed font-style) | static + manual | `grep -q "wght-italic" apps/desktop/src/renderer/src/main.tsx` | ❌ W0 (manual) | ⬜ pending |
| 1-03-01 | 03 | 2 | FND-03 (web) | — | `.dark` class on `<html>` flips body bg AND sidebar bg AND card bg AND foreground text on `/login` | E2E (Playwright) | `pnpm exec playwright test e2e/theme-toggle.spec.ts` | ❌ W0 | ⬜ pending |
| 1-03-02 | 03 | 2 | FND-03 (desktop FOUC) | — | Inline FOUC script in `apps/desktop/src/renderer/index.html` `<head>` sets `.dark` class before React mounts when `multica_theme=dark` (or `system` + dark OS) | manual (acceptance) | n/a — perceptual flash detection requires visual regression tooling | ❌ manual-only | ⬜ pending |
| 1-03-03 | 03 | 2 | FND-03 (shared) | — | `useTheme()` returns `{ theme, resolvedTheme, setTheme }`; `setTheme('dark')` applies `.dark` to `<html>` | unit (Vitest, mock next-themes) | `pnpm --filter @multica/ui exec vitest run components/common/theme-provider.test.tsx` | ❌ W0 (extend existing) | ⬜ pending |
| 1-04-01 | 04 | 2 | D-18 (migration) | — | All 22 hardcoded Tailwind color violation lines in 8 files migrated to semantic tokens | static (grep) + unit | `bash scripts/grep-hardcoded-colors.sh && pnpm --filter @multica/views test` | ⚠️ manual one-shot grep — script TBD by planner | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky · 🚫 dropped*

---

## Wave 0 Requirements

Before any Phase 1 implementation task runs, these test scaffolds must exist:

- [ ] `packages/ui/styles/__tests__/token-binding.test.tsx` — render an element with `bg-tag-p0`/`bg-background`/`bg-card`, assert `getComputedStyle().backgroundColor` is non-default and approximates expected oklch value (FND-01)
- [ ] `e2e/theme-toggle.spec.ts` — start at `/login`, sample bg colors of body/sidebar/card/foreground in light, toggle `.dark` via `document.documentElement.classList.add('dark')`, sample again, assert each color differs (FND-03)
- [ ] `e2e/typography.spec.ts` — visit a page that renders italic content (Phase 2 will add an italic headline; Phase 1 stub uses `<em>test</em>` on `/login` or a hidden test fixture), capture network responses, assert at least one URL matches `/Inter.*italic/i` (FND-02 web)
- [ ] `apps/desktop/scripts/manual-fouc-check.md` (or equivalent acceptance doc) — step-by-step manual recipe for the no-FOUC desktop check (FND-03 desktop)
- [ ] `scripts/grep-hardcoded-colors.sh` — one-shot grep of `packages/views` + `packages/ui` for `\b(text|bg|border|ring|fill|stroke|from|to|via|outline|decoration|divide|placeholder|caret|accent|shadow)-(red|blue|yellow|green|orange|purple|pink|indigo|amber|emerald|cyan|teal|sky|violet|fuchsia|rose|lime)-[0-9]+`; exits non-zero on hits unless documented in an allowlist file (search-mark `--warning/15`, agent-thinking violet, macOS traffic-light hex in `appearance-tab.tsx`)

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Desktop starts in dark mode without visible white flash | FND-03 (Success Criterion #2) | Perceptual flash detection requires visual regression tooling (Chromatic deferred per REQUIREMENTS.md Out of Scope) | 1. `pnpm dev:desktop` with DevTools open. 2. `localStorage.setItem('multica_theme','dark')`. 3. Reload window. 4. Confirm `<html>` carries `.dark` class on first paint. 5. Confirm no white background flash visible. |
| Inter italic axis available in desktop renderer | FND-02 (desktop) | No automated browser test infrastructure for Electron renderer | 1. `pnpm dev:desktop`. 2. DevTools → Elements → pick an italic element. 3. Computed → confirm `font-style: italic` and `font-family` resolves to Inter (not serif fallback). |
| Visual smoke that new palette renders correctly across `/login`, `/inbox`, dashboard | FND-01 | Token replacement is largely visual; visual regression deferred | 1. Run web dev server. 2. Open `/login`, `/`, `/inbox` in browser. 3. Toggle `.dark` in DevTools. 4. Confirm no invisible text, no broken contrast, brand-green visible on primary CTAs. |

---

## Validation Sign-Off

- [ ] All Phase 1 tasks have `<automated>` verify or Wave 0 dependencies explicitly listed above
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify (manual-only desktop FOUC + italic axis acceptable as documented exceptions)
- [ ] Wave 0 covers all MISSING references (5 items above)
- [ ] No watch-mode flags in any test command
- [ ] Feedback latency < 30s per task
- [ ] `nyquist_compliant: true` set in frontmatter once planner has populated all task IDs and Wave 0 scaffolds are committed

**Approval:** pending
