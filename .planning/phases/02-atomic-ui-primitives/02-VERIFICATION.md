---
phase: 02-atomic-ui-primitives
verified: 2026-04-25T13:15:00Z
status: passed
score: 4/4 must-haves verified
overrides_applied: 0
re_verification:
  previous_status: none
  previous_score: n/a
  gaps_closed: []
  gaps_remaining: []
  regressions: []
---

# Phase 02: Atomic UI Primitives — Verification Report

**Phase Goal:** The four new atomic components (`TagChip`, `AccentBar`, `AvatarInitial`, `SegmentedControl`) exist in `packages/ui/components/ui/`, are keyboard-accessible, and pass Vitest tests in both light and dark mode — ready for any view phase to import.

**Verified:** 2026-04-25T13:15:00Z
**Status:** passed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths (from ROADMAP Success Criteria)

| #   | Truth                                                                                                                                                                                       | Status     | Evidence                                                                                                                                                                                                                                                                                                                                                                  |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | A developer can render `<TagChip color="tag-p0" />` and see the correct priority red in both light and dark mode without touching any hex value                                            | ✓ VERIFIED | `tag-chip.tsx` cva variants map `color="tag-p0"` → `bg-tag-p0 text-tag-p0-foreground` (Phase 1 OKLCH tokens, dark-mode-adaptive). `TagChipColor` is a closed discriminated union of 5 literals — no hex, no inline style possible. Test `tag-chip.test.tsx` parameterises all 5 colors and asserts the class strings. Zero hex literals in source (grep). Zero `dark:` overrides (grep). |
| 2   | `<SegmentedControl>` responds to arrow keys and Tab — keyboard navigation moves selection without mouse (WCAG keyboard accessible)                                                          | ✓ VERIFIED | `segmented-control.tsx` wraps Base UI `ToggleGroup` with `multiple={false}` + `orientation="horizontal"` — delegating roving tabindex + ArrowLeft/Right + Home/End + Space/Enter to the primitive. Tests verify ArrowRight focus-move, ArrowLeft loop-wrap to last, Tab in/out (single tab stop), Space activation, and ArrowRight skipping disabled items. 12/12 tests pass. |
| 3   | `<AvatarInitial name="Stephan" />` deterministically produces the same color for the same name across renders (no randomness)                                                              | ✓ VERIFIED | `avatar-color.ts` djb2 hash is pure, non-memoized, 32-bit normalised (`hash \|= 0`). `hashToPaletteIndex` returns `Math.abs(djb2) % 8`. `avatar-color.test.ts` enforces 100-iteration determinism + regression-locked fixture (`hashToPaletteIndex('Stephan') === 0`, raw djb2 = 249206168). `avatar-initial.test.tsx` re-asserts determinism in component render context.    |
| 4   | Vitest tests for all four components pass with zero failures; components are imported from `packages/ui` with zero `next/*` or `react-router-dom` dependencies                              | ✓ VERIFIED | `pnpm --filter @multica/ui test` → **6 files / 71 tests passed (730ms)**. Grep across `tag-chip.tsx`, `accent-bar.tsx`, `avatar-initial.tsx`, `segmented-control.tsx`, `avatar-color.ts` for `from ['"]next` returns 0 hits; `react-router` returns 0 hits; `@multica/core` returns 0 hits.                                                                                  |

**Score:** 4/4 truths verified

### Required Artifacts

| Artifact                                                          | Expected                                                                                                            | Status     | Details                                                                                                                                                                                                                       |
| ----------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- | ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `packages/ui/components/ui/tag-chip.tsx`                          | TagChip component, cva over 5 Phase 1 token colors, optional X-to-remove, polymorphic via Base UI useRender         | ✓ VERIFIED | 97 lines; exports `{ TagChip, tagChipVariants, TagChipColor }`; no hex, no `dark:`, no `next/*`. Hover wash uses `hover:bg-foreground/10` (post-MD-01 fix, commit `562837bf`).                                                |
| `packages/ui/components/ui/tag-chip.test.tsx`                     | 11 assertions: 5 color mappings, span default, X button render, single-fire onRemove, stopPropagation, render polymorphism, no `dark:` | ✓ VERIFIED | 82 lines; 11/11 assertions green                                                                                                                                                                                              |
| `packages/ui/components/ui/accent-bar.tsx`                        | AccentBar with `role="presentation"` + `aria-hidden`, 1–4 segments, 6 colors, orientation variant, render-time validation | ✓ VERIFIED | 75 lines; closed `AccentBarColor` union (6 colors); zero `dark:`, zero hex                                                                                                                                                     |
| `packages/ui/components/ui/accent-bar.test.tsx`                   | 14+ assertions: 6 color mappings, ARIA, orientation, multi-segment, validation throw, source-level no-`dark:` guard  | ✓ VERIFIED | 106 lines; 16 assertions green                                                                                                                                                                                                |
| `packages/ui/components/ui/avatar-initial.tsx`                    | Circular initials badge, deterministic color via AVATAR_PALETTE + hashToPaletteIndex, 3 sizes, `aria-label` fallback | ✓ VERIFIED | 62 lines; consumes `lib/avatar-color`; uses `mix-blend-darken` + `dark:after:mix-blend-lighten` (documented structural blend-mode companion, mirrors `avatar.tsx`); zero inline color styles                                  |
| `packages/ui/components/ui/avatar-initial.test.tsx`               | 11+ assertions including 100-iter determinism gate, hashKey override, sizing classes, ARIA fallback                  | ✓ VERIFIED | 11 assertions green                                                                                                                                                                                                            |
| `packages/ui/components/ui/segmented-control.tsx`                 | Single-select wrapper over Base UI ToggleGroup with `multiple={false}`, string-shaped public API, deselect swallow   | ✓ VERIFIED | 105 lines; `multiple={false}` present (line 57); zero `toggleMultiple` substrings; `"use client"` directive matches sibling primitives                                                                                         |
| `packages/ui/components/ui/segmented-control.test.tsx`            | 12 assertions: render, click, deselect-swallow, ArrowRight, ArrowLeft loop, Tab in/out, Space, disabled skip, source invariants | ✓ VERIFIED | 166 lines; 12/12 assertions green                                                                                                                                                                                              |
| `packages/ui/lib/avatar-color.ts`                                 | djb2 hash + extractInitials + 8-entry AVATAR_PALETTE (Phase 1 token bg+fg pairs)                                     | ✓ VERIFIED | 71 lines; pure module, never memoised, 32-bit normalised; security comment present                                                                                                                                              |
| `packages/ui/lib/avatar-color.test.ts`                            | 13+ assertions including regression-locked djb2 fixture and 100-iter determinism                                     | ✓ VERIFIED | 15 assertions green                                                                                                                                                                                                            |
| `packages/ui/vitest.config.ts`                                    | Vitest config (jsdom, plugin-react, setup, glob)                                                                     | ✓ VERIFIED | byte-equal to `packages/views/vitest.config.ts`                                                                                                                                                                                |
| `packages/ui/test/setup.ts`                                       | jest-dom + matchMedia + ResizeObserver + elementFromPoint + memory-localStorage shims                                | ✓ VERIFIED | 63 lines; byte-equal to `packages/views/test/setup.ts`                                                                                                                                                                          |

### Key Link Verification

| From                                  | To                                  | Via                                                                                       | Status   | Details                                                                                                          |
| ------------------------------------- | ----------------------------------- | ----------------------------------------------------------------------------------------- | -------- | ---------------------------------------------------------------------------------------------------------------- |
| `tag-chip.tsx`                        | `@base-ui/react/use-render`         | `useRender` + `mergeProps` for polymorphic `render` prop                                  | ✓ WIRED  | Imports verified; tests prove polymorphism (`render={<a/>}` swaps to `<a>`)                                      |
| `tag-chip.tsx`                        | `lucide-react`                      | `import { X }` for remove-button icon                                                     | ✓ WIRED  | Conditional render when `onRemove` present                                                                        |
| `tag-chip.tsx`                        | `@multica/ui/lib/utils`             | `cn()` for class merging                                                                  | ✓ WIRED  | Used inside cva-output composition                                                                                |
| `accent-bar.tsx`                      | `class-variance-authority`          | `cva` for orientation variant                                                             | ✓ WIRED  | `accentBarVariants` exported                                                                                       |
| `avatar-initial.tsx`                  | `@multica/ui/lib/avatar-color`      | `AVATAR_PALETTE`, `extractInitials`, `hashToPaletteIndex`                                | ✓ WIRED  | All three named imports used; subpath export `./lib/avatar-color` declared in `package.json`                     |
| `segmented-control.tsx`               | `@base-ui/react/toggle-group`       | `ToggleGroup` primitive with `multiple={false}`                                           | ✓ WIRED  | Source-level test asserts `multiple={false}` regex; tests verify keyboard delegation works                       |
| `segmented-control.tsx`               | `@base-ui/react/toggle`             | `Toggle` primitive for each item                                                          | ✓ WIRED  | `SegmentedControlItem` wraps the primitive                                                                        |

### Data-Flow Trace (Level 4)

These atoms render data passed by props (not fetched). Determinism trace below:

| Artifact                | Data Variable               | Source                                                       | Produces Real Data | Status     |
| ----------------------- | --------------------------- | ------------------------------------------------------------ | ------------------ | ---------- |
| `TagChip`               | `color`, `children`         | Required props (no defaults possible due to discriminated union) | Yes                | ✓ FLOWING  |
| `AccentBar`             | `color` / `colors`          | Required props (validated at render — throws on missing)        | Yes                | ✓ FLOWING  |
| `AvatarInitial`         | `name` → `initials` + palette index | `extractInitials(name)` + `AVATAR_PALETTE[hashToPaletteIndex(hashKey ?? name)]` | Yes (deterministic)| ✓ FLOWING  |
| `SegmentedControl`      | `value`, `onValueChange`    | Controlled prop pair from consumer                              | Yes                | ✓ FLOWING  |

### Behavioral Spot-Checks

| Behavior                                                         | Command                                                                                                                                                              | Result                                                            | Status |
| ---------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------- | ------ |
| All UI tests pass                                                | `pnpm --filter @multica/ui test`                                                                                                                                     | `Test Files: 6 passed (6) / Tests: 71 passed (71)` (730 ms)        | ✓ PASS |
| Repo-wide TypeScript typecheck clean                              | `pnpm typecheck`                                                                                                                                                     | `Tasks: 6 successful, 6 total` (FULL TURBO cache)                  | ✓ PASS |
| No `next/*` imports in Phase 02 atom files                        | `grep -rn "from ['\"]next" packages/ui/components/ui/{tag-chip,accent-bar,avatar-initial,segmented-control}.tsx packages/ui/lib/avatar-color.ts`                       | 0 hits                                                            | ✓ PASS |
| No `react-router` imports in atoms or lib                         | `grep -rn "react-router" packages/ui/components/ packages/ui/lib/`                                                                                                    | 0 hits                                                            | ✓ PASS |
| No `@multica/core` imports                                        | `grep -rn "from ['\"]@multica/core" packages/ui/components/ packages/ui/lib/`                                                                                         | 0 hits                                                            | ✓ PASS |
| No hex color literals in atom components                          | `grep -rEn "#[0-9a-fA-F]{3,8}\b" packages/ui/components/ui/{tag-chip,accent-bar,avatar-initial,segmented-control}.tsx`                                                | 0 hits                                                            | ✓ PASS |
| `multiple={false}` present in `segmented-control.tsx`             | `grep -n "multiple={false}" packages/ui/components/ui/segmented-control.tsx`                                                                                          | 3 hits (1 JSX usage + 2 JSDoc references)                          | ✓ PASS |
| `toggleMultiple` (typo from UI-SPEC) absent in source             | `grep -n "toggleMultiple" packages/ui/components/ui/segmented-control.tsx`                                                                                            | 0 hits                                                            | ✓ PASS |

> **Note on grep scope:** The wider grep over `packages/ui/components/` returned two `next-themes` hits (`sonner.tsx`, `common/theme-provider.tsx`). Both files are pre-existing, unrelated to Phase 02, and are NOT atoms covered by this phase's must-haves. The atom-targeted grep above (only the four Phase 02 files + `avatar-color.ts`) is clean.

### Requirements Coverage

| Requirement | Source Plan(s)                                | Description                                                                                                                                                | Status      | Evidence                                                                                                                  |
| ----------- | --------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------- | ------------------------------------------------------------------------------------------------------------------------- |
| UI-01       | 02-02 (TagChip)                               | TagChip with semantic-token color prop, optional X-to-remove, tested in light + dark                                                                       | ✓ SATISFIED | `tag-chip.tsx` + 11 passing assertions; closed color union maps to Phase 1 tokens; no `dark:` overrides                  |
| UI-02       | 02-03 (AccentBar)                             | AccentBar with variable segments (1–4 stripes)                                                                                                             | ✓ SATISFIED | `accent-bar.tsx` + 16 passing assertions; segments 1–4 supported; orientation variant; per-segment color lookup            |
| UI-03       | 02-01 (avatar-color), 02-04 (AvatarInitial)   | AvatarInitial with deterministic per-name color                                                                                                            | ✓ SATISFIED | djb2 hash + 100-iteration determinism gate + regression-locked fixture; AVATAR_PALETTE bound to Phase 1 tokens             |
| UI-04       | 02-05 (SegmentedControl)                      | SegmentedControl over Base UI ToggleGroup, keyboard-accessible                                                                                             | ✓ SATISFIED | 12 passing assertions including ArrowLeft/Right loop-wrap, Tab in/out, Space activation, disabled-skip                    |

### Anti-Patterns Found

| File                            | Line | Pattern                                                                       | Severity | Impact                                                                                                                                                                                  |
| ------------------------------- | ---- | ----------------------------------------------------------------------------- | -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `avatar-initial.tsx`            | 24   | `dark:after:mix-blend-lighten`                                                | ℹ️ Info  | Documented structural blend-mode companion (mirrors `avatar.tsx`). Required by the blend-mode mechanic itself, NOT a per-color theme override. Cleared in REVIEW.md.                    |
| `lib/avatar-color.ts`           | 65–69| `firstWord.charAt(0)` splits surrogate pairs on astral-plane chars (e.g. emoji)| ℹ️ Info  | LO-03 advisory finding from REVIEW.md, deferred per REVIEW-FIX scope. Cosmetic — affects only emoji-leading names. Tests cover ASCII + Cyrillic correctly.                                |
| `accent-bar.tsx`                | 45,51,58 | Render-time `throw new Error(...)` for invalid prop combinations           | ℹ️ Info  | LO-02 advisory finding from REVIEW.md, deferred. Could blank a subtree on misconfiguration; mitigated by TypeScript closed unions. Discriminated-union refactor recommended for future.   |
| `tag-chip.tsx`                  | n/a  | `render={<a/>}` + `onRemove` together produces `<a><button>...</button></a>`   | ℹ️ Info  | LO-01 advisory finding from REVIEW.md, deferred. Invalid HTML when both props are passed; `e.stopPropagation()` mitigates the click-leak. No consumers in Phase 02.                        |
| `segmented-control.test.tsx`    | 148–153 | Self-contradicting `import.meta.url` comment vs implementation              | ℹ️ Info  | LO-04 advisory finding from REVIEW.md, deferred. Test runs correctly; comment is misleading. Cosmetic.                                                                                  |
| `accent-bar.tsx`                | 13,39 | `defaultVariants.orientation` duplicated between cva and function default     | ℹ️ Info  | LO-05 advisory finding from REVIEW.md, deferred. Two sources of truth for the same default; safe to defer.                                                                              |
| `test/smoke.test.ts`            | 4–5  | Stale "can be deleted" comment after Wave 1 component tests landed            | ℹ️ Info  | IN-01 advisory finding from REVIEW.md, deferred. Documentation only.                                                                                                                    |

**No BLOCKER or HIGH severity findings.** All advisory items were captured in the upstream REVIEW and explicitly deferred via `02-REVIEW-FIX.md` (only the MEDIUM token-discipline finding MD-01 was in fix scope and was applied in commit `562837bf`).

### Human Verification Required

None. All Phase 02 must-haves are programmatically verifiable; the visual smoke test is explicitly deferred to Phase 3 (Storybook Showroom) per `02-VALIDATION.md` line 90.

### Gaps Summary

No gaps. The phase delivers exactly what its goal and success criteria require:

1. **Existence:** all five source files (4 atoms + 1 utility) plus all five test files exist in `packages/ui/components/ui/` and `packages/ui/lib/`.
2. **Substance:** each component has a documented public API, real implementation logic (no placeholders, no TODOs, no stubs), and is wired to consume only Phase 1 tokens.
3. **Wiring:** Base UI primitives are imported and used; the avatar-color utility is consumed by AvatarInitial; subpath exports declared in `packages/ui/package.json`.
4. **Behavior:** `pnpm --filter @multica/ui test` passes 71/71 assertions including 100-iteration determinism, source-level invariants, keyboard interaction tests via `userEvent`, and parameterised color-class assertions.
5. **Boundary discipline:** zero `next/*`, zero `react-router`, zero `@multica/core`, zero hex colors in the four Phase 02 atom files. The only `dark:` usage is a documented structural blend-mode companion, not a per-color theme override.
6. **Repo-wide health:** `pnpm typecheck` passes 6/6 packages.

The phase is ready for Phase 3 (Storybook Showroom) to consume.

---

_Verified: 2026-04-25T13:15:00Z_
_Verifier: Claude (gsd-verifier)_
