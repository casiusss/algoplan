---
phase: 2
slug: atomic-ui-primitives
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-25
---

# Phase 2 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.
> Source of truth: `02-RESEARCH.md` §Validation Architecture.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.x (catalog `^4.1.0`) + jsdom 29 + `@testing-library/react` + `@testing-library/user-event` v14 |
| **Config file** | `packages/ui/vitest.config.ts` — does not exist; created in Wave 0 |
| **Setup file** | `packages/ui/test/setup.ts` — does not exist; created in Wave 0 |
| **Quick run command** | `pnpm --filter @multica/ui exec vitest run <file-pattern>` |
| **Full suite command** | `pnpm --filter @multica/ui test` |
| **Estimated runtime** | quick ~1s/file, full UI suite ~5–10s |

---

## Sampling Rate

- **After every task commit:** Run `pnpm --filter @multica/ui exec vitest run <changed-file-test>` (~1s)
- **After every plan wave:** Run `pnpm --filter @multica/ui test` (~5–10s)
- **Before `/gsd-verify-work`:** `make check` must be green (Turborepo picks up `packages/ui` once `test` script lands)
- **Max feedback latency:** 10s per task

---

## Per-Task Verification Map

> Plan IDs are placeholders — populated by `gsd-planner`. Each task gets one row.

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 2-00-01 | 00 | 0 | infra | — | n/a | infra | `pnpm --filter @multica/ui test --run` (must report no test files cleanly) | ❌ W0 | ⬜ pending |
| 2-01-01 | 01 | 1 | UI-03 | — | djb2 NOT used as security boundary; comment present in source | unit (pure) | `pnpm --filter @multica/ui exec vitest run lib/avatar-color.test.ts` | ❌ W0 | ⬜ pending |
| 2-02-01 | 02 | 2 | UI-01 | T-XSS-1 | TagChip `children` rendered via React (auto-escaped); no `dangerouslySetInnerHTML` | unit | `pnpm --filter @multica/ui exec vitest run components/ui/tag-chip.test.tsx` | ❌ W0 | ⬜ pending |
| 2-03-01 | 03 | 2 | UI-02 | — | AccentBar is `role="presentation"` + `aria-hidden`; no interactive surface | unit | `pnpm --filter @multica/ui exec vitest run components/ui/accent-bar.test.tsx` | ❌ W0 | ⬜ pending |
| 2-04-01 | 04 | 2 | UI-03 | T-XSS-2 | AvatarInitial `name` rendered as React text + bound to `aria-label` (escaped) | unit | `pnpm --filter @multica/ui exec vitest run components/ui/avatar-initial.test.tsx` | ❌ W0 | ⬜ pending |
| 2-05-01 | 05 | 2 | UI-04 | — | SegmentedControl swallows empty deselect array; single tab stop via Base UI roving tabindex | unit (keyboard) | `pnpm --filter @multica/ui exec vitest run components/ui/segmented-control.test.tsx` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky · 🚫 dropped*

---

## Wave 0 Requirements

Before any Phase 2 implementation task runs, these test scaffolds must exist:

- [ ] `packages/ui/package.json` — add `"test": "vitest run"` script + devDeps via catalog refs (`vitest`, `jsdom`, `@vitejs/plugin-react`, `@testing-library/react`, `@testing-library/jest-dom`, `@testing-library/user-event`)
- [ ] `packages/ui/vitest.config.ts` — created (mirror `packages/views/vitest.config.ts` verbatim, swap include glob to `packages/ui/**`)
- [ ] `packages/ui/test/setup.ts` — `@testing-library/jest-dom` import + `matchMedia` shim + `ResizeObserver` shim
- [ ] `packages/ui/lib/avatar-color.ts` — pure module: djb2 hash, `extractInitials`, `AVATAR_PALETTE` (8 entries)
- [ ] `packages/ui/lib/avatar-color.test.ts` — UI-03 deterministic-hash + initials assertions
- [ ] `packages/ui/components/ui/tag-chip.test.tsx` — UI-01 stub
- [ ] `packages/ui/components/ui/accent-bar.test.tsx` — UI-02 stub
- [ ] `packages/ui/components/ui/avatar-initial.test.tsx` — UI-03 component-layer stub
- [ ] `packages/ui/components/ui/segmented-control.test.tsx` — UI-04 stub (keyboard via `userEvent.keyboard`)
- [ ] Smoke check after Wave 0: `pnpm --filter @multica/ui exec vitest run --reporter=basic` returns clean exit (0 errors)

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Visual smoke that all 4 atoms render correctly in light + dark mode | UI-01..UI-04 | Visual regression deferred (no Chromatic in scope per REQUIREMENTS) | Phase 3 (Storybook Showroom) IS the visual smoke for these atoms — no separate manual gate needed at Phase 2 |

*All Phase 2 atom behaviors have automated verification. Visual smoke deferred to Phase 3 Showroom.*

---

## Validation Sign-Off

- [ ] All Phase 2 tasks have `<automated>` verify or Wave 0 dependencies explicitly listed above
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references (10 items above)
- [ ] No watch-mode flags in any test command
- [ ] Feedback latency < 10s per task
- [ ] `nyquist_compliant: true` set in frontmatter once planner has populated all task IDs and Wave 0 scaffolds are committed

**Approval:** pending
