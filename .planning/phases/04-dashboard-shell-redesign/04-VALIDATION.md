---
phase: 4
slug: dashboard-shell-redesign
status: planned
nyquist_compliant: true
wave_0_complete: false
created: 2026-04-25
updated: 2026-04-25
---

# Phase 4 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.
> Source of truth: `04-RESEARCH.md` §Validation Architecture.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.1.x (jsdom for views/core hooks); Playwright (E2E for dark-mode persistence) |
| **Config files** | `packages/views/vitest.config.ts`, `packages/core/vitest.config.ts`, `playwright.config.ts` |
| **Quick run command** | `pnpm --filter @multica/views exec vitest run dashboard-shell` (~3-5s) |
| **Full suite command** | `pnpm test` (Turborepo) + targeted `pnpm exec playwright test e2e/dashboard-shell.spec.ts` |
| **Estimated runtime** | quick ~5s, full ~6-9min |

---

## Sampling Rate

- **After every task commit:** `pnpm --filter @multica/views exec vitest run dashboard-shell` (~5s)
- **After every plan wave:** `pnpm typecheck && pnpm test` (~3-5min)
- **Before `/gsd-verify-work`:** `make check` must be green (full suite + Go + E2E)
- **Max feedback latency:** ~5s per task commit

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 4-00-01 | 00 | 0 | infra | — | new directory + index.ts re-export shim | infra | `test -d packages/views/dashboard-shell` | ❌ W0 | ⬜ pending |
| 4-00-02 | 00 | 0 | infra | — | derived hooks have stability test scaffolds | infra | `test -d packages/core/issues/derived` | ❌ W0 | ⬜ pending |
| 4-01-01 | 01 | 1 | SHL-01 (atoms) | — | Wordmark uses Inter only (no Source_Serif_4); no `dark:` overrides | unit | `pnpm --filter @multica/views exec vitest run dashboard-shell/{wordmark,priority-grid,notifications-badge,dark-mode-toggle,collapse-toggle}.test.tsx` | ❌ W0 | ⬜ pending |
| 4-02-01 | 02 | 2 | SHL-01 | T-04-02-01 | AppSidebar accepts wsId prop (no useWorkspaceId() call inside); workspace name fallback = "AlgoPlan" | unit | `pnpm --filter @multica/views exec vitest run dashboard-shell/app-sidebar.test.tsx` AND `! grep -rn "useWorkspaceId(" packages/views/dashboard-shell/` | ❌ W0 | ⬜ pending |
| 4-03-01 | 03 | 2 | SHL-03 (topbar atoms) | — | FilterChipRow + BlockerBadge + SearchInput + PrimaryCTA — token-only, no hex | unit | `pnpm --filter @multica/views exec vitest run dashboard-shell/{filter-chip-row,blocker-badge,search-input,primary-cta}.test.tsx` | ❌ W0 | ⬜ pending |
| 4-04-01 | 04 | 3 | SHL-03 | — | AppTopbar composition + slots | unit | `pnpm --filter @multica/views exec vitest run dashboard-shell/app-topbar.test.tsx` | ❌ W0 | ⬜ pending |
| 4-05-01 | 05 | 4 | SHL-02 | T-04-05-01 | DashboardShell renders topSlot ONLY when provided; no visual gap on web | unit | `pnpm --filter @multica/views exec vitest run dashboard-shell/dashboard-shell.test.tsx` | ❌ W0 | ⬜ pending |
| 4-05-02 | 05 | 4 | SHL-05 | T-04-05-02 | derived hooks stable selectors (same input → same reference) | unit (jsdom) | `pnpm --filter @multica/core exec vitest run issues/derived/use-{issue-count-by-priority,blocker-count}.test.tsx` | ❌ W0 | ⬜ pending |
| 4-06-01 | 06 | 5 | SHL-01,02 | — | Both apps wire DashboardShell; Desktop injects DragStrip via topSlot; Web omits topSlot | unit + manual | `pnpm typecheck && pnpm --filter @multica/views test` | ❌ W0 | ⬜ pending |
| 4-06-02 | 06 | 5 | SHL-01 (E2E) | — | dark mode preference persists across page loads | E2E | `pnpm exec playwright test e2e/dashboard-shell.spec.ts -g "dark mode persists"` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky · 🚫 dropped*

---

## Wave 0 Requirements

- [ ] `packages/views/dashboard-shell/` directory (NEW)
- [ ] `packages/views/dashboard-shell/index.ts` re-export shim
- [ ] `packages/core/issues/derived/` directory + 2 stability test scaffolds
- [ ] `e2e/dashboard-shell.spec.ts` skeleton
- [ ] CI grep hook (or test-time grep): `! grep -rn "useWorkspaceId(" packages/views/dashboard-shell/`

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Sidebar collapses/expands smoothly without layout shift | SHL-01 | Animation perception | Click collapse toggle, verify no jank, content reflows correctly |
| Desktop window draggable from top edge of dashboard | SHL-02 | Native macOS interaction | Open dashboard in desktop app, drag from top edge — window moves |
| Web app shows no visual gap where DragStrip would be | SHL-02 | Visual perceptual check | Open dashboard in web browser, verify topbar sits flush at top with no empty 48px above |
| Dark mode toggle persists across page reload | SHL-01 / SC#1 | Verifies localStorage persistence E2E | Toggle to dark, reload page, verify still dark |

---

## Validation Sign-Off

- [x] All tasks have automated verify or Wave 0 dependencies listed
- [x] Sampling continuity: vitest per commit, pnpm test per wave, make check before verify-work
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 30s per task
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** APPROVED 2026-04-25 by gsd-planner orchestrator.
