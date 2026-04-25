---
phase: 2
slug: atomic-ui-primitives
status: planned
nyquist_compliant: true
wave_0_complete: false
created: 2026-04-25
updated: 2026-04-25
---

# Phase 2 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.
> Source of truth: `02-RESEARCH.md` §Validation Architecture.
> Task IDs locked by `gsd-planner` 2026-04-25.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.x (catalog `^4.1.0`) + jsdom 29 + `@testing-library/react` + `@testing-library/user-event` v14 |
| **Config file** | `packages/ui/vitest.config.ts` — created in Wave 0 (Plan 00 Task 2) |
| **Setup file** | `packages/ui/test/setup.ts` — created in Wave 0 (Plan 00 Task 2) |
| **Quick run command** | `pnpm --filter @multica/ui exec vitest run <file-pattern>` |
| **Full suite command** | `pnpm --filter @multica/ui test` |
| **Estimated runtime** | quick ~1s/file, full UI suite ~5–10s |

---

## Sampling Rate

- **After every task commit:** Run `pnpm --filter @multica/ui exec vitest run <changed-file-test>` (~1s)
- **After every plan wave:** Run `pnpm --filter @multica/ui test` (~5–10s)
- **Before `/gsd-verify-work`:** `make check` must be green (Turborepo picks up `packages/ui` once `test` script lands in Plan 00 Task 1)
- **Max feedback latency:** 10s per task

---

## Per-Task Verification Map

> Task IDs follow `{phase}-{plan}-{task}` shape. RED commits run the test (must fail with "module not found" or assertion failure). GREEN commits run the same test (must pass). The map below collapses each plan's RED+GREEN cycle into one row keyed by the implementation task.

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 2-00-01 | 00 | 0 | infra (UI-01..UI-04) | T-02-00-01 | catalog-pinned devDeps; no literal versions | infra | `pnpm install --frozen-lockfile=false && node -e "…verifies catalog refs…"` | ❌ W0 | ⬜ pending |
| 2-00-02 | 00 | 0 | infra (UI-01..UI-04) | T-02-00-02, T-02-00-03 | jsdom-scoped shims; vitest config glob restricted to packages/ui/** | infra | `pnpm --filter @multica/ui exec vitest run --reporter=basic` (clean exit, "no test files found" or first test passes) | ❌ W0 | ⬜ pending |
| 2-01-01 | 01 | 1 | UI-03 | — | RED gate: test file imports from non-existent module | unit (RED) | `pnpm --filter @multica/ui exec vitest run lib/avatar-color.test.ts` (must fail) | ❌ W0 | ⬜ pending |
| 2-01-02 | 01 | 1 | UI-03 | T-02-01-01..04 | djb2 NOT used as security boundary; comment present in source; un-cached function; defensive type guards | unit (GREEN) | `pnpm --filter @multica/ui exec vitest run lib/avatar-color.test.ts` (13 assertions pass) | ❌ W0 | ⬜ pending |
| 2-02-01 | 02 | 2 | UI-01 | — | RED gate | unit (RED) | `pnpm --filter @multica/ui exec vitest run components/ui/tag-chip.test.tsx` (must fail) | ❌ W0 | ⬜ pending |
| 2-02-02 | 02 | 2 | UI-01 | T-02-02-01 (T-XSS-1), T-02-02-02..04 | TagChip `children` rendered via React (auto-escaped); no `dangerouslySetInnerHTML`; closed color union; e.stopPropagation on remove; zero `dark:` overrides | unit (GREEN) | `pnpm --filter @multica/ui exec vitest run components/ui/tag-chip.test.tsx` (11 assertions pass) | ❌ W0 | ⬜ pending |
| 2-03-01 | 03 | 2 | UI-02 | — | RED gate | unit (RED) | `pnpm --filter @multica/ui exec vitest run components/ui/accent-bar.test.tsx` (must fail) | ❌ W0 | ⬜ pending |
| 2-03-02 | 03 | 2 | UI-02 | T-02-03-01..04 | AccentBar is `role="presentation"` + `aria-hidden`; no interactive surface; closed AccentBarColor union; synchronous validation throws; zero `dark:` overrides | unit (GREEN) | `pnpm --filter @multica/ui exec vitest run components/ui/accent-bar.test.tsx` (14+ assertions pass) | ❌ W0 | ⬜ pending |
| 2-04-01 | 04 | 2 | UI-03 | — | RED gate | unit (RED) | `pnpm --filter @multica/ui exec vitest run components/ui/avatar-initial.test.tsx` (must fail) | ❌ W0 | ⬜ pending |
| 2-04-02 | 04 | 2 | UI-03 | T-02-04-01 (T-XSS-2), T-02-04-02..04 | AvatarInitial `name` rendered as React text + bound to `aria-label` (escaped); 100-iteration determinism gate; defensive name fallback to "?"; zero inline color styles | unit (GREEN) | `pnpm --filter @multica/ui exec vitest run components/ui/avatar-initial.test.tsx` (12+ assertions pass) | ❌ W0 | ⬜ pending |
| 2-05-01 | 05 | 2 | UI-04 | — | RED gate | unit (RED, keyboard) | `pnpm --filter @multica/ui exec vitest run components/ui/segmented-control.test.tsx` (must fail) | ❌ W0 | ⬜ pending |
| 2-05-02 | 05 | 2 | UI-04 | T-02-05-01..05 | SegmentedControl swallows empty deselect array; single tab stop via Base UI roving tabindex; `multiple={false}` (NOT `toggleMultiple`); aria-label is a REQUIRED prop; disabled items skipped by focus | unit (GREEN, keyboard) | `pnpm --filter @multica/ui exec vitest run components/ui/segmented-control.test.tsx` (13 assertions pass) | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky · 🚫 dropped*

---

## Wave 0 Requirements

Before any Wave 1 / Wave 2 implementation task runs, these scaffolds must exist (delivered by Plan 00):

- [ ] `packages/ui/package.json` — adds `"test": "vitest run"` script + 6 catalog devDeps (`vitest`, `jsdom`, `@vitejs/plugin-react`, `@testing-library/react`, `@testing-library/jest-dom`, `@testing-library/user-event`)
- [ ] `packages/ui/vitest.config.ts` — created (mirrors `packages/views/vitest.config.ts` verbatim)
- [ ] `packages/ui/test/setup.ts` — `@testing-library/jest-dom` import + `matchMedia` shim + `ResizeObserver` shim + `elementFromPoint` shim + memory localStorage shim (mirrors `packages/views/test/setup.ts` verbatim)
- [ ] Smoke check: `pnpm --filter @multica/ui exec vitest run --reporter=basic` returns clean exit (0 errors)

Subsequently delivered by Plan 01 (Wave 1):

- [ ] `packages/ui/lib/avatar-color.ts` — pure module: djb2 hash, `extractInitials`, `AVATAR_PALETTE` (8 entries), `hashToPaletteIndex`
- [ ] `packages/ui/lib/avatar-color.test.ts` — UI-03 deterministic-hash + initials assertions (13 cases) + regression-locked djb2('Stephan') fixture
- [ ] `packages/ui/package.json` — exports map adds `./lib/avatar-color`

Wave 2 plans depend transitively:

- Plan 02 / 03 / 05 depend ONLY on Plan 00.
- Plan 04 depends on Plan 00 AND Plan 01 (consumes `AVATAR_PALETTE`, `extractInitials`, `hashToPaletteIndex`).

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Visual smoke that all 4 atoms render correctly in light + dark mode | UI-01..UI-04 | Visual regression deferred (no Chromatic in scope per REQUIREMENTS) | Phase 3 (Storybook Showroom) IS the visual smoke for these atoms — no separate manual gate needed at Phase 2 |

*All Phase 2 atom behaviors have automated verification. Visual smoke deferred to Phase 3 Showroom.*

---

## Validation Sign-Off

- [x] All Phase 2 tasks have `<automated>` verify or Wave 0 dependencies explicitly listed above
- [x] Sampling continuity: no 3 consecutive tasks without automated verify (every task has its own `pnpm --filter @multica/ui exec vitest run <file>` command)
- [x] Wave 0 covers all MISSING references (test infra files + smoke check)
- [x] No watch-mode flags in any test command (`vitest run`, never `vitest watch`)
- [x] Feedback latency < 10s per task (single-file vitest runs ~1s; full UI suite ~5–10s)
- [x] `nyquist_compliant: true` set in frontmatter — all 12 task IDs map to automated `<verify>` commands

**Approval:** APPROVED 2026-04-25 by gsd-planner (task IDs populated, Nyquist contract satisfied).
