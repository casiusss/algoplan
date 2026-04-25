---
phase: 02-atomic-ui-primitives
plan: 05
subsystem: ui
tags: [segmented-control, atomic, base-ui, toggle-group, single-select, adapter, tdd, vitest, user-event]

# Dependency graph
requires:
  - phase: 02-atomic-ui-primitives
    provides: "Plan 00 confirmed Phase 1 tokens (--background, --muted, --muted-foreground, --foreground, --ring) and the @base-ui/react v1.3 ToggleGroup primitive are stable for composition"
provides:
  - "SegmentedControl component — single-select value picker styled like a TabsList track with a lifted active item"
  - "SegmentedControlItem component — Toggle-primitive-backed item with hover/focus/pressed/disabled states"
  - "Array<->string adapter — wraps Base UI ToggleGroup's `readonly Value[]` value contract into a friendlier `value: string` / `onValueChange(value: string)` API"
  - "Empty-array deselect swallow — guards against the no-value edge case for pickers where empty selection is invalid (P0/P1/P2/P3, Board/List)"
  - "Source-level invariants enforced by tests: `multiple={false}` present (RESEARCH §Pitfall 1 fix); the non-existent `toggleMultiple` prop absent (regression guard)"
affects:
  - "Phase 5 KBN-04 (issues view-toggle: Board / List) — direct consumer for label-only 2-item path"
  - "Phase 6 DTL-02 (issue detail Priority picker: P0 / P1 / P2 / P3) — direct consumer for dense 4-item path"

# Tech tracking
tech-stack:
  added: []  # No new deps; uses existing @base-ui/react v1.3 (toggle + toggle-group) + cn from @multica/ui/lib/utils
  patterns:
    - "Atomic UI primitive wrapping a Base UI primitive without cva (no variant matrix needed — single visual contract)"
    - "Public-API adapter pattern — wrapper translates between primitive's array-shaped value contract and a friendlier string-shaped API"
    - "Defensive deselect swallow — `if (first !== undefined) onValueChange(first)` keeps the consumer's value always defined"
    - "All keyboard / focus contract delegated to Base UI's ToggleGroup primitive (roving tabindex, ArrowLeft/Right with loopFocus default, Home/End, Space/Enter activation) — zero hand-rolled handlers"
    - "TDD with explicit RED gate via missing implementation file (Failed to resolve import)"
    - "Source-level invariant tests (read source via __dirname-based fs.readFileSync) — catches regressions that TS compiler cannot (e.g. removing `multiple={false}` and falling back to the default would still typecheck but break single-select semantics)"

key-files:
  created:
    - "packages/ui/components/ui/segmented-control.tsx"
    - "packages/ui/components/ui/segmented-control.test.tsx"
  modified: []

key-decisions:
  - "Used `multiple={false}` (not `toggleMultiple={false}` per UI-SPEC §4 typo, not `toggle`+`Multiple` per any other variation) — the prop is named `multiple` in the verified Base UI v1.3 .d.ts (`node_modules/@base-ui/react/toggle-group/ToggleGroup.d.ts:68`). The UI-SPEC text was wrong; the runtime contract is enforced here, and a source-level test guards regressions in both directions (`multiple={false}` MUST be present; the typo MUST be absent)."
  - "Adapter wraps `value` in a 1-element array `[value]` and unwraps `next[0]` (with explicit undefined-check for `noUncheckedIndexedAccess` TS strictness) — Base UI's ToggleGroup type is `readonly Value[]` even when single-select. Hiding this from consumers keeps the API ergonomic for Phase 5/6 callers."
  - "Deselect swallow: clicking the active item in a single-select ToggleGroup returns `[]`. For a Priority/View picker, an empty selection is undefined behavior — the wrapper gates on `first !== undefined` so `onValueChange` is never called with no value. Documented inline as wrapper-rule #3."
  - "No `cva` and no variant matrix — SegmentedControl has a single visual contract per UI-SPEC §4 (track + lifted active item). A future need for a `pill` or `outlined` variant can introduce cva without breaking the public API."
  - "Source-invariant tests resolve the source path via `path.dirname(new URL(import.meta.url).pathname)` (NOT `new URL('./...', import.meta.url)`) because Vite's jsdom transform strips the `file://` scheme from `import.meta.url`, which `fs.readFileSync(url, 'utf8')` rejects with `TypeError: The URL must be of scheme file`. The __dirname-style resolution is cwd-independent and Vite-safe."
  - "Comment phrasing avoids the literal substring `toggleMultiple` so the regression-guard test stays strict — the source contains zero occurrences of that token (test asserts `not.toContain('toggleMultiple')`). The doc paragraph instead says 'do NOT use the variant \"toggle\"+\"Multiple\" (concatenated) prop name suggested by the UI-SPEC text'."
  - "Includes `\"use client\"` directive (matches toggle-group.tsx, toggle.tsx, tabs.tsx) — Base UI primitives need a client boundary; SegmentedControl will be used inside Server Component trees in `apps/web` (Phase 5 issues view, Phase 6 detail page)."

requirements-completed: [UI-04]

# Metrics
duration: 4min
completed: 2026-04-25
---

# Phase 02 Plan 05: SegmentedControl Summary

**Single-select value picker over Base UI ToggleGroup with `multiple={false}` — array<->string adapter, empty-deselect guard, and a TabsList-style lifted active item — published from `@multica/ui/components/ui/segmented-control` for Phase 5 view-toggle and Phase 6 priority picker.**

## Performance

- **Duration:** ~4 min wall clock
- **Started:** 2026-04-25T12:58:00Z
- **Completed:** 2026-04-25T13:02:00Z
- **Tasks:** 2 (RED + GREEN, TDD plan)
- **Files modified:** 2 (both created)

## Accomplishments

- Implemented `SegmentedControl` + `SegmentedControlItem` as a Base UI ToggleGroup wrapper with a friendlier string-shaped value API
- Adapted the primitive's `readonly Value[]` value contract to `value: string` / `onValueChange(value: string)` by wrapping in `[value]` and unwrapping `next[0]` (with explicit `undefined` check for TS strictness under `noUncheckedIndexedAccess`)
- Swallowed the empty-array deselect (`first !== undefined` guard) so consumers always receive a defined value — required for Priority and View pickers where "no selection" is an invalid state
- Used `multiple={false}` per the verified Base UI v1.3 type contract (UI-SPEC §4's `toggleMultiple={false}` was incorrect — the prop does not exist in v1.3)
- Track + lifted-active-item visual contract per UI-SPEC §4: `bg-muted p-[3px] rounded-lg h-6` track; items get `data-[pressed]:bg-background data-[pressed]:text-foreground data-[pressed]:shadow-sm` + `hover:text-foreground` + per-item `focus-visible:ring-[3px] focus-visible:ring-ring/50` + `disabled:pointer-events-none disabled:opacity-50`
- Zero hand-rolled keyboard handlers — all keyboard/focus behavior (roving tabindex, ArrowLeft/Right with loopFocus, Home/End, Space/Enter activation, single tab stop) is delegated to Base UI's ToggleGroup primitive
- 12 Vitest+RTL+user-event tests cover render, ARIA, click, deselect-swallow, ArrowRight navigation, ArrowLeft loop-wrap, Tab-out, Space-activation, disabled-skip, disabled-click-block, source invariant `multiple={false}`, source regression guard against the `toggle`+`Multiple` typo

## Task Commits

Each task committed atomically following the TDD gate sequence:

1. **Task 1: Write failing test (RED)** — `8c9466dc` (test)
2. **Task 2: Implement segmented-control.tsx (GREEN)** — `d55ca500` (feat) — bundles two small auto-fixes for TS strictness on the array unwrap and the test path resolution

## Files Created/Modified

- `packages/ui/components/ui/segmented-control.tsx` (created, 105 lines) — wrapper + item + JSDoc block documenting the three load-bearing wrapper rules (array adapter, `multiple` prop name, deselect swallow)
- `packages/ui/components/ui/segmented-control.test.tsx` (created, 166 lines) — 12 `it()` blocks across 5 `describe` blocks; uses a controlled `<Harness>` wrapper to manage value state through interactions; `userEvent` (not `fireEvent`) for keyboard tests per RESEARCH §Anti-Patterns

## Decisions Made

- **`multiple={false}` is the runtime contract** — verified against `node_modules/@base-ui/react/toggle-group/ToggleGroup.d.ts:68`. The UI-SPEC §4 line "ToggleGroup with `toggleMultiple={false}`" was a typo; the source enforces the correct name and a source-level test guards both that `multiple={false}` is present AND that `toggleMultiple` is absent.
- **String adapter, not the raw array shape** — the public API exposes `value: string` / `onValueChange(value: string)`. Phase 5 (`Board / List`) and Phase 6 (`P0 / P1 / P2 / P3`) consumers map to plain string state, not arrays. Hiding the array shape inside the wrapper keeps consumer code clean and means a future swap to a different primitive (e.g. RadioGroup) only changes the wrapper, not callers.
- **Empty-deselect swallow is a contract, not an option** — for the Priority picker, empty would mean "no priority", which is invalid in v1. The wrapper gates on `first !== undefined` (handles both `[]` and `[undefined]` defensively); a future opt-in `allowDeselect` prop can be added without breaking existing callers.
- **No `cva` for now** — single visual contract per UI-SPEC §4. Adding a variant later is a non-breaking addition.
- **Source-invariant test path resolution via `__dirname`** — `new URL('./file', import.meta.url)` does not produce a `file://` URL under Vite's jsdom transform (`TypeError: The URL must be of scheme file`). Used `path.dirname(new URL(import.meta.url).pathname) + segmented-control.tsx` instead, which is cwd-independent and Vite-safe.
- **Doc-comment phrasing avoids the literal `toggleMultiple` substring** — the regression-guard test asserts `expect(src).not.toContain("toggleMultiple")`. The doc rewords the warning as `do NOT use the variant "toggle"+"Multiple" (concatenated)` to keep the strict gate meaningful while still documenting the trap.
- **`"use client"` directive included** — matches sibling primitives (`toggle.tsx`, `toggle-group.tsx`, `tabs.tsx`); Base UI components need a client boundary.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Source-invariant tests failed due to cwd-dependent path**
- **Found during:** Task 2 GREEN verification step
- **Issue:** The plan-supplied test code did `fs.readFileSync("packages/ui/components/ui/segmented-control.tsx", "utf8")`. When Vitest is invoked via `pnpm --filter @multica/ui exec vitest`, the cwd is the package directory, not the repo root, so the relative path resolves to `packages/ui/packages/ui/components/ui/segmented-control.tsx` and `ENOENT`s.
- **Fix:** Resolved the source path via `path.dirname(new URL(import.meta.url).pathname) + 'segmented-control.tsx'`. (First tried `new URL('./...', import.meta.url)` directly, but Vite's jsdom transform strips the `file://` scheme — `TypeError: The URL must be of scheme file`. The `__dirname`-style approach is cwd-independent AND Vite-safe.)
- **Files modified:** `packages/ui/components/ui/segmented-control.test.tsx`
- **Verification:** All 12 tests pass; both source-invariant assertions pass; works regardless of cwd
- **Committed in:** `d55ca500` (Task 2 GREEN commit)

**2. [Rule 1 - Bug] JSDoc comment in source contained the literal `toggleMultiple` substring, tripping the regression-guard test**
- **Found during:** Task 2 GREEN verification step
- **Issue:** My initial doc paragraph said `do NOT use \`toggleMultiple={false}\`` — which is exactly what the test guard `expect(src).not.toContain("toggleMultiple")` is looking for. The intent of the gate is to catch JSX-attribute usage, but `toContain` cannot distinguish source code from comments.
- **Fix:** Reworded the JSDoc to `do NOT use the variant "toggle"+"Multiple" (concatenated) prop name suggested by the UI-SPEC text` — same warning, no literal collision. Source contains zero `toggleMultiple` substrings.
- **Files modified:** `packages/ui/components/ui/segmented-control.tsx` (comment-only edit, no behavior change)
- **Verification:** `grep -c "toggleMultiple" packages/ui/components/ui/segmented-control.tsx` returns `0`
- **Committed in:** `d55ca500` (Task 2 GREEN commit)

**3. [Rule 1 - Bug] TypeScript strict-mode error on `next[0]` array access**
- **Found during:** Task 2 typecheck step (`pnpm --filter @multica/ui typecheck`)
- **Issue:** With `noUncheckedIndexedAccess` enabled at the repo root, `next[0]` is typed `string | undefined`. The `if (next.length > 0)` guard does not narrow the index type. Compile error: `Argument of type 'string | undefined' is not assignable to parameter of type 'string'`.
- **Fix:** Replaced `if (next.length > 0) onValueChange(next[0])` with `const [first] = next; if (first !== undefined) onValueChange(first)`. Same runtime semantics; compatible with strict index typing.
- **Files modified:** `packages/ui/components/ui/segmented-control.tsx`
- **Verification:** `tsc --noEmit` exits 0 with zero errors; the deselect-swallow test still passes
- **Committed in:** `d55ca500` (Task 2 GREEN commit)

**4. [Rule 1 - Bug] TypeScript strict-mode error on `onChange.mock.calls[0][0]` in test**
- **Found during:** Task 2 typecheck step
- **Issue:** Same `noUncheckedIndexedAccess` strictness — `mock.calls[0]` is `Args | undefined`. Compile error: `Object is possibly 'undefined'`.
- **Fix:** Extracted `const firstCall = onChange.mock.calls[0]`, asserted `expect(firstCall).toBeDefined()`, then accessed `firstCall![0]`. Same intent (assert the first call's first arg is a string) with explicit narrowing.
- **Files modified:** `packages/ui/components/ui/segmented-control.test.tsx`
- **Verification:** `tsc --noEmit` exits 0; the type-guard test still passes
- **Committed in:** `d55ca500` (Task 2 GREEN commit)

---

**Total deviations:** 4 auto-fixed (all Rule 1 — small bugs in plan-supplied test code and a comment-collision with a regression guard)
**Impact on plan:** Cosmetic and TS-strictness corrections. The component contract (props, behavior, ARIA, keyboard, threat-model mitigations) matches the plan exactly. All `must_haves.truths`, `must_haves.artifacts`, and `key_links.pattern` regexes are satisfied.

## Issues Encountered

**Sibling parallel-wave files in worktree** — `git status` showed an untracked `02-03-SUMMARY.md` in `.planning/phases/02-atomic-ui-primitives/` from a sibling parallel executor (Plan 02-03 AccentBar). It was not modified by this plan and is explicitly out of scope per the parallel-executor `<parallel_execution>` constraint ("You touch ONLY: segmented-control.tsx + segmented-control.test.tsx + SUMMARY.md"). The branch also had commits for sibling plans (02-02 TagChip, 02-03 AccentBar) interleaved between my RED and GREEN commits — expected behavior in the parallel-executor model; my two commits remain atomic and addressable by hash.

## User Setup Required

None — atomic UI component, no environment variables, no external services, no new runtime dependencies. Importable as `import { SegmentedControl, SegmentedControlItem } from "@multica/ui/components/ui/segmented-control"` from any Phase 5 or Phase 6 consumer.

## Next Phase Readiness

- **Phase 5 KBN-04 (issues view-toggle: Board / List) is unblocked** — can compose `<SegmentedControl value={view} onValueChange={setView} aria-label="View mode"><SegmentedControlItem value="board">Board</SegmentedControlItem><SegmentedControlItem value="list">List</SegmentedControlItem></SegmentedControl>` directly; no extra wrapper needed.
- **Phase 6 DTL-02 (issue detail Priority picker: P0 / P1 / P2 / P3) is unblocked** — same pattern with 4 items; the deselect-swallow guarantees `priority` is always defined.
- **No carry-over blockers.** The string-shaped public API insulates callers from any future primitive swap. Source-invariant tests guard against silent regression of the `multiple={false}` prop.
- **Wave-2 sibling plans (02-02 TagChip, 02-03 AccentBar, 02-04 AvatarInitial)** are unaffected by this plan — SegmentedControl shares no module surface with them.

## TDD Gate Compliance

- **RED gate:** `8c9466dc` — `test(02-05): add failing tests for SegmentedControl (RED)` (Vitest reported `Failed to resolve import "./segmented-control"` — strongest possible RED: file fails to even import)
- **GREEN gate:** `d55ca500` — `feat(02-05): implement SegmentedControl (single-select adapter over Base UI ToggleGroup)` (Vitest reported `Test Files 1 passed (1)`, `Tests 12 passed (12)`)
- **REFACTOR gate:** Skipped (no separate cleanup needed; the four small auto-fixes during GREEN were verification-gate corrections, not refactors)

## Threat Model Outcomes (cross-reference plan §threat_model)

| Threat ID | Mitigation status |
|-----------|-------------------|
| T-02-05-01 (wrong shape passed to Base UI primitive) | MITIGATED — source-level test asserts `multiple={false}` regex match (present); regression guard asserts `toggleMultiple` substring is absent; TypeScript additionally rejects unknown prop names at build time. |
| T-02-05-02 (empty-array deselect leaves consumer undefined) | MITIGATED — wrapper gates `onValueChange` on `first !== undefined` (handles `[]` and `[undefined]`); test "swallows deselect — clicking the active item does NOT fire onValueChange" asserts the callback is not invoked when the active item is re-clicked. |
| T-02-05-03 (disabled item still focusable / activatable) | MITIGATED — `disabled` prop forwarded to `TogglePrimitive`; tests "ArrowRight skips disabled items" and "clicking a disabled item does not fire onValueChange" both pass. |
| T-02-05-04 (hand-rolled keyboard handler bypassing ARIA contract) | MITIGATED — zero custom keyboard handlers in source; all key behavior delegates to Base UI; tests verify ArrowRight/ArrowLeft (loop-wrap)/Tab/Space all behave per the Base UI contract. |
| T-02-05-05 (missing aria-label removing screen-reader context) | MITIGATED — `"aria-label": string` is a required (non-optional) field on `SegmentedControlProps`; TypeScript blocks omission at compile time; test asserts `screen.getByRole("group", { name: "View mode" })` finds the labeled root. |

## Self-Check: PASSED

- `packages/ui/components/ui/segmented-control.tsx` — FOUND
- `packages/ui/components/ui/segmented-control.test.tsx` — FOUND
- Commit `8c9466dc` (RED) — FOUND in `git log`
- Commit `d55ca500` (GREEN) — FOUND in `git log`
- 12/12 Vitest tests pass — VERIFIED via `pnpm --filter @multica/ui exec vitest run components/ui/segmented-control.test.tsx`
- Source contains exactly 1 JSX usage of `multiple={false}` (3 total occurrences counting JSDoc references) — VERIFIED via `grep -c`
- Source contains zero `toggleMultiple` substrings — VERIFIED via `grep -c` (returns 0)
- Pattern `from "@base-ui/react/toggle-group"` present in source — VERIFIED
- Pattern `from "@base-ui/react/toggle"` present in source — VERIFIED
- Pattern `from "@multica/ui/lib/utils"` present in source — VERIFIED
- Test file ≥ 120 lines (min_lines artifact contract) — VERIFIED (166 lines)
- Required exports `{ SegmentedControl, SegmentedControlItem }` present — VERIFIED
- `pnpm --filter @multica/ui typecheck` exits 0 — VERIFIED

---
*Phase: 02-atomic-ui-primitives*
*Completed: 2026-04-25*
