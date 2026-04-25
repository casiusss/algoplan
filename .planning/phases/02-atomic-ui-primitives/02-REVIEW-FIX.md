---
phase: 02-atomic-ui-primitives
fixed_at: 2026-04-25T13:11:00Z
review_path: .planning/phases/02-atomic-ui-primitives/02-REVIEW.md
iteration: 1
findings_in_scope: 1
fixed: 1
skipped: 0
status: all_fixed
---

# Phase 02: Code Review Fix Report

**Fixed at:** 2026-04-25T13:11:00Z
**Source review:** .planning/phases/02-atomic-ui-primitives/02-REVIEW.md
**Iteration:** 1

**Summary:**
- Findings in scope: 1 (MEDIUM only — LOW + INFO advisory per phase 2 fix scope)
- Fixed: 1
- Skipped: 0

**Scope note:** Per fix-orchestrator instruction, Phase 2 fix scope is restricted to the MEDIUM token-discipline finding (MD-01). The five LOW findings (LO-01 through LO-05) and three INFO findings (IN-01 through IN-03) are advisory and are NOT applied in this iteration — they are non-blocking edge cases that do not break the build.

## Fixed Issues

### MD-01: `TagChip` X-button uses `hover:bg-black/10` — not a Phase 1 semantic token

**Files modified:** `packages/ui/components/ui/tag-chip.tsx`
**Commit:** 562837bf
**Applied fix:** Replaced `hover:bg-black/10` with `hover:bg-foreground/10` on the X remove-button (Option A from review). This restores token discipline by routing the hover wash through the Phase 1 `--foreground` token (with /10 opacity overlay), matching the existing `bg-foreground/...` and `bg-muted/...` patterns used in `button.tsx` and `badge.tsx`. The new class adapts correctly to dark mode through the token layer (no `dark:` override needed).

**Verification:**
- Tier 1: re-read modified file — class string present, surrounding code intact.
- Tier 2: `pnpm --filter @multica/ui test` → 6 files / 71 tests passed (no regressions; the `tag-chip.test.tsx` "no dark: overrides" assertion still holds).
- Tier 2: `pnpm typecheck` → 6/6 successful (all packages clean).

## Skipped Issues

None — the only in-scope finding was fixed.

**Out-of-scope (advisory) findings carried forward as documentation:**

- LO-01: `TagChip` + `render={<a/>}` + `onRemove` produces invalid HTML — non-blocking; consider type-level overload or dev-warn in a future iteration.
- LO-02: `AccentBar` validation throws synchronously during render — discriminated-union refactor is non-trivial; consider when adding multi-segment consumers.
- LO-03: `extractInitials` splits surrogate pairs on astral-plane characters — cosmetic; revisit if non-BMP names appear in user data.
- LO-04: Self-contradicting `import.meta.url` comment in `segmented-control.test.tsx` — comment hygiene only; align with `accent-bar.test.tsx` opportunistically.
- LO-05: `AccentBar` `defaultVariants.orientation` duplicated — single-source-of-truth cleanup; safe to defer.
- IN-01: stale comment in `test/smoke.test.ts` — documentation only.
- IN-02: `data-color` attribute exposure via `useRender` `state` — documented as intentional API surface.
- IN-03: `localStorage` shim assertion clarity — optional comment improvement only.

---

_Fixed: 2026-04-25T13:11:00Z_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
