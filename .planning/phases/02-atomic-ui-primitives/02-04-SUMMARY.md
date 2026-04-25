---
phase: 02-atomic-ui-primitives
plan: 04
subsystem: ui
tags: [avatar, initials, atomic-component, cva, deterministic-color, tdd, vitest]

# Dependency graph
requires:
  - phase: 02-atomic-ui-primitives
    provides: "Plan 02-01 (avatar-color utility) — AVATAR_PALETTE, extractInitials, hashToPaletteIndex via @multica/ui/lib/avatar-color"
  - phase: 02-atomic-ui-primitives
    provides: "Plan 02-00 — Phase 1 token classes (bg-tag-p0..p3, bg-brand, bg-secondary, bg-muted, bg-accent + foregrounds, --border) confirmed available"
provides:
  - "AvatarInitial component — circular initials badge with deterministic per-name color (UI-03)"
  - "avatarInitialVariants cva fn — sizing variants (sm/default/lg) with default 'default'"
  - "AvatarInitialProps type — { name: string; hashKey?: string; size?: 'sm'|'default'|'lg'; className?: string }"
  - "Subpath import: @multica/ui/components/ui/avatar-initial"
affects:
  - "Phase 4 sidebar avatars (SHL-01) — consumes AvatarInitial for member rendering"
  - "Phase 5 Kanban cards (KBN-02) — consumes AvatarInitial for assignee avatars"
  - "Phase 6 agents view (WS-02) — consumes AvatarInitial for agent identity"

# Tech tracking
tech-stack:
  added: []  # No new dependencies — composes existing avatar-color util + cva
  patterns:
    - "Atomic component wrapping pure utility (math in lib/, UI in components/ui/)"
    - "cva sizing variants matching avatar.tsx contract for visual swap-ability"
    - "Token-only color flow (zero inline style, all via AVATAR_PALETTE class strings)"
    - "Defensive ARIA fallback (safeName → 'Unknown user' on empty/whitespace)"
    - "TDD with explicit RED gate via failed module import"

key-files:
  created:
    - "packages/ui/components/ui/avatar-initial.tsx"
    - "packages/ui/components/ui/avatar-initial.test.tsx"
  modified: []  # Subpath export './components/ui/*' already covered by package.json

key-decisions:
  - "Did NOT use Base UI's Avatar.Root — AvatarInitial is intentionally complementary to avatar.tsx (deterministic color atom, not a fallback wrapper). Keeps the atom leaf-pure."
  - "Plain function component (no 'use client' directive) — pure presentational, matches badge.tsx convention; the directive is unnecessary because there is no React state, effect, or event handler"
  - "Reused avatar.tsx's `after:border + mix-blend-darken / dark:after:mix-blend-lighten` ring trick verbatim. Documented as a structural mode-companion (not a per-color override) so a future reviewer doesn't strip the `dark:` substring under the no-overrides rule"
  - "safeName trims and falls back to 'Unknown user' so screen readers always get a meaningful aria-label even if the consumer passes an empty string"
  - "Hash input prefers hashKey when provided so colors stay stable across name edits (rename does not reshuffle the avatar palette)"

patterns-established:
  - "Atomic component composing a pure utility module: AvatarInitial → AVATAR_PALETTE / extractInitials / hashToPaletteIndex"
  - "cva sizing contract that mirrors an existing component (avatar.tsx) so the two render visually identical at the same size token"
  - "Source-grep test for 'no inline color styles' — enforces token-only color flow at the test layer, not just review"

requirements-completed: [UI-03]

# Metrics
duration: 2min
completed: 2026-04-25
---

# Phase 02 Plan 04: AvatarInitial Summary

**Atomic circular initials badge (UI-03) with deterministic per-name color, composed over the pure avatar-color utility from Plan 02-01; cva sizing matches avatar.tsx for visual swap-ability and ships with a 100-iteration determinism gate plus a source-grep no-inline-style assertion.**

## Performance

- **Duration:** ~2 min (130s wall clock)
- **Started:** 2026-04-25T10:59:17Z
- **Completed:** 2026-04-25T11:01:27Z
- **Tasks:** 2 (RED + GREEN, TDD plan)
- **Files modified:** 2 (both created)

## Accomplishments
- Implemented `AvatarInitial` (UI-03) — `<span role="img" data-slot="avatar-initial">` with deterministic palette class lookup via `AVATAR_PALETTE[hashToPaletteIndex(hashKey ?? name)]`
- cva sizing contract: `sm` → `size-6 text-xs`, `default` → `size-8 text-sm`, `lg` → `size-10 text-base` — pixel-identical to avatar.tsx so AvatarInitial drops in alongside the standard Avatar.Fallback
- ARIA contract: `role="img"` + `aria-label` derived from `name.trim() || "Unknown user"` so empty inputs still produce a meaningful screen-reader label
- 100-iteration determinism test gate proves the hash → palette mapping is fully stable per render
- `hashKey` override test gate proves color stability across name changes (palette index keyed on stable ID instead of mutable display name)
- Source-grep test asserts zero `style="background"` and zero `style="color"` — all colors flow through AVATAR_PALETTE class strings (UI-SPEC §3 line 202 satisfied)
- Inherited the `after:border + mix-blend-darken / dark:after:mix-blend-lighten` ring from avatar.tsx for a consistent edge in both light + dark mode

## Task Commits

Each task was committed atomically following the TDD gate sequence:

1. **Task 1: Write failing test (RED)** — `73351747` (test)
2. **Task 2: Implement AvatarInitial component (GREEN)** — `e4a3a916` (feat)

**Plan metadata commit:** added separately by orchestrator (this SUMMARY.md).

## Files Created/Modified
- `packages/ui/components/ui/avatar-initial.tsx` (created) — `AvatarInitial` function component, `avatarInitialVariants` cva fn, `AvatarInitialProps` interface; named exports + leading documentation block explaining the `dark:` substring rationale
- `packages/ui/components/ui/avatar-initial.test.tsx` (created) — 11 vitest assertions across 7 describe groups: initials extraction (4), DOM shape (1), sizing (3 parameterized), determinism (1, 100 iterations), hashKey override (1), no inline color styles (1)

## Decisions Made
- Plain function component (no `"use client"`) — pure presentational with no state/effect/event; matches badge.tsx convention. Server-render-safe under both Next.js (RSC) and Electron (no SSR).
- `(typeof name === "string" ? name.trim() : "") || "Unknown user"` — defensive against runtime non-string inputs from JS callers even though TypeScript types `name: string`. Mirrors the Plan 01 utility's defensive contract.
- `hashKey ?? name` (nullish coalescing) — explicitly allows empty string `""` as a hashKey override, which still produces a deterministic palette index (extractInitials handles the empty case separately).
- Did NOT add a `tooltip` slot — UI-SPEC §3 line 204 is explicit that tooltip wrapping is the consumer's job. AvatarInitial stays leaf-pure.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Removed unsupported `--reporter=basic` flag from verification command**
- **Found during:** Task 2 GREEN verification step
- **Issue:** The plan's `<verify>` block invoked `vitest run ... --reporter=basic`, which is no longer a valid built-in reporter in Vitest 4.1.0 (it tries to load `basic` as a custom reporter module and crashes with `ERR_LOAD_URL`). Same issue noted in Plan 02-01's SUMMARY.
- **Fix:** Ran `pnpm --filter @multica/ui exec vitest run components/ui/avatar-initial.test.tsx` (default reporter) for verification.
- **Files modified:** none — only the verification command was adjusted; no source change.
- **Verification:** Tests reported `Test Files 1 passed (1)`, `Tests 11 passed (11)`.
- **Committed in:** N/A — verification-only adaptation.

---

**Total deviations:** 1 auto-fixed (blocking — same plan-script flag drift previously documented in 02-01).
**Impact on plan:** No semantic deviation. Component contract, exports, ARIA shape, sizing classes, determinism guarantee, and zero-inline-style requirement all match the plan exactly. No scope creep.

## Issues Encountered
None beyond the deviation above. The TDD gate sequence executed cleanly: RED produced the expected `Failed to resolve import "./avatar-initial"` error; GREEN produced 11/11 passing assertions on the first valid run.

## User Setup Required
None — pure presentational atom, no environment variables, no external services, no new runtime dependencies.

## Next Phase Readiness
- **Phase 4 sidebar (SHL-01)** can immediately `import { AvatarInitial } from "@multica/ui/components/ui/avatar-initial"` for member avatars.
- **Phase 5 Kanban cards (KBN-02)** can use AvatarInitial for assignee avatars; the cva `size` prop covers all required sizes.
- **Phase 6 agents view (WS-02)** can pair AvatarInitial with a stable agent ID via the `hashKey` prop so colors don't shift when agents are renamed.
- **No carry-over blockers.** The 100-iteration determinism gate plus the regression-locked djb2 fixture in Plan 02-01 jointly guard against future color drift.

## TDD Gate Compliance

- **RED gate:** `73351747` — `test(02-04): add failing tests for AvatarInitial (RED)` (Vitest reported `Failed to resolve import "./avatar-initial"` — strongest possible RED signal: file fails to even import)
- **GREEN gate:** `e4a3a916` — `feat(02-04): implement AvatarInitial component` (Vitest reported `Test Files 1 passed (1)`, `Tests 11 passed (11)`; root `pnpm typecheck` clean across 6/6 packages)
- **REFACTOR gate:** Skipped (no cleanup needed; the implementation matched the plan's reference snippet 1:1 and passed all assertions on the first run)

## Self-Check: PASSED

- `packages/ui/components/ui/avatar-initial.tsx` — FOUND
- `packages/ui/components/ui/avatar-initial.test.tsx` — FOUND
- Commit `73351747` — FOUND in `git log`
- Commit `e4a3a916` — FOUND in `git log`
- `grep -E 'style=.*background|backgroundColor' packages/ui/components/ui/avatar-initial.tsx` — NO MATCHES (zero inline color styles, as required)
- `pnpm --filter @multica/ui exec vitest run components/ui/avatar-initial.test.tsx` — 11/11 passed including 100-iteration determinism gate
- `pnpm typecheck` (root) — 6/6 packages clean

---
*Phase: 02-atomic-ui-primitives*
*Completed: 2026-04-25*
