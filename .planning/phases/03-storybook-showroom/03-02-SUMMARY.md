---
phase: 03-storybook-showroom
plan: 02
subsystem: ui
tags: [storybook, theme-toggle, a11y, wcag, smoke-story, tailwind-v4]

requires:
  - phase: 03-storybook-showroom (03-01)
    provides: preview.tsx skeleton (CSS + font imports), main.ts with addon-a11y + addon-docs registered, build-storybook baseline 6.9 MB / 152 modules
provides:
  - Complete preview.tsx (globalTypes.theme + decorator + parameters.a11y + parameters.layout)
  - Foundations / Tokens / Surfaces smoke story (SC#2 verification gate)
  - WCAG 2.1 AA axe ruleset wired (runs on every story automatically)
  - Theme toggle that mutates document.documentElement (mirrors next-themes on apps/web)
affects: [03-03 (atom stories add to stories/atoms/), all future Phase 3 plans (theme toggle + a11y panel ride along)]

tech-stack:
  added: []
  patterns:
    - "Hand-rolled theme toggle via globalTypes + decorator (no @storybook/addon-themes)"
    - "Smoke story as token-cascade verification gate (visual diff = pass/fail signal)"
    - "WCAG 2.1 AA preview-wide via parameters.a11y.options.runOnly"

key-files:
  created:
    - apps/showroom/stories/foundations/tokens.stories.tsx
  modified:
    - apps/showroom/.storybook/preview.tsx

key-decisions:
  - "Theme toggle targets document.documentElement (not a wrapper div) — matches next-themes semantics on apps/web; guarantees Tailwind's @custom-variant dark ancestor resolution"
  - "Decorator uses SSR guard (typeof document !== undefined) — Storybook docs-page generation runs in Node where document is undefined"
  - "MenuItem-shape items in toolbar (not string array) — gives explicit Light/Dark titles and sun/moon icons per UI-SPEC §Copywriting"
  - "WCAG 2.1 AA ruleset = wcag2a + wcag2aa + wcag21a + wcag21aa (AAA explicitly out of scope per UI-SPEC)"
  - "Smoke story uses satisfies Meta (no typeof Component) and StoryObj (no generic) — token gallery is not a component spec"

patterns-established:
  - "Pattern: Story-as-verification-gate — Foundations / Tokens / Surfaces renders 11 token swatches whose visual diff between Light and Dark themes proves the entire token cascade (Phase 1 tokens.css → Tailwind @theme bindings → Storybook preview decorator → DOM ancestor → @custom-variant resolution)"
  - "Pattern: meta declared with `satisfies Meta` for stories that document tokens/foundations rather than React components"
  - "Pattern: All swatch styling uses semantic tokens only (no hex, no Tailwind palette colors); spacing on Phase 1 8-pt scale"

requirements-completed: [SB-02, SB-04]

duration: ~3 min
completed: 2026-04-25
---

# Phase 03 Plan 02: Storybook preview wiring + Foundations smoke story Summary

**Storybook preview now ships theme toggle (Light/Dark via document.documentElement), WCAG 2.1 AA axe panel, and a Foundations / Tokens / Surfaces smoke story that locks SC#2.**

## Performance

- **Duration:** ~3 min
- **Started:** 2026-04-25T12:15:43Z
- **Completed:** 2026-04-25T12:18:29Z
- **Tasks:** 2
- **Files modified:** 2 (1 modified, 1 created)

## Accomplishments

- preview.tsx is complete — no further changes expected in Phase 3 (atoms in Plan 03 only add story files)
- Theme toolbar control with Light/Dark items (sun/moon icons, dynamicTitle) writes `.dark` to `document.documentElement` — same DOM ancestor next-themes uses on apps/web
- Accessibility panel runs WCAG 2.1 AA (wcag2a + wcag2aa + wcag21a + wcag21aa) on every story automatically; no per-story opt-in needed
- 11 token swatches rendered (6 surfaces, 4 tag colors, 1 brand) — visual diff between themes proves the cascade works
- `pnpm --filter @multica/showroom build-storybook` exits 0 (Wave 2 smoke gate per VALIDATION.md task 3-02-01) — 2.23s, 6.9 MB

## Task Commits

1. **Task 1: Extend preview.tsx with globalTypes.theme + decorator + parameters.a11y + parameters.layout** — `8d1e1469` (feat)
2. **Task 2: Create stories/foundations/tokens.stories.tsx (Foundations / Tokens / Surfaces smoke story)** — `e8f9bbfe` (feat)

**Plan metadata:** (this SUMMARY commit, see git log for hash)

## Files Created/Modified

- `apps/showroom/.storybook/preview.tsx` — Replaced Plan 01 skeleton with full config: globalTypes.theme + initialGlobals, decorator that toggles `.dark` on `document.documentElement` (SSR-guarded), parameters.a11y.options.runOnly with WCAG 2.1 AA, parameters.layout = "padded"
- `apps/showroom/stories/foundations/tokens.stories.tsx` — New smoke story; title `Foundations / Tokens`, story `Surfaces`; renders SURFACE_TOKENS (6) + TAG_TOKENS (4) + BRAND_TOKENS (1); each swatch is a 12×12 div with rounded border + label

## Build size delta vs Plan 01

- **Plan 01 baseline:** 6.9 MB / 152 modules / 2.10s build
- **Plan 02 result:** 6.9 MB / 2.23s build; new asset `tokens.stories-Cs14ZC6F.js` = 3.17 kB (gzip 0.92 kB)
- **Delta:** +3.17 kB (single new story); total static output rounds to the same 6.9 MB
- **Vite chunk-size warnings:** Same as Plan 01 (`axe`, `iframe`, `DocsRenderer` chunks > 500 kB) — these are Storybook's own bundles; chunk-splitting Storybook is out of scope per Plan 01 SUMMARY

## Decisions Made

- **Theme toggle via globalTypes + decorator** (not @storybook/addon-themes) — UI-SPEC §Hard Constraint #8. Three lines in preview.tsx, no extra dep, no wrapper div.
- **Decorator targets `document.documentElement`** — semantic parity with next-themes on apps/web; Tailwind's `@custom-variant dark (&:is(.dark *))` resolves against the iframe `<html>`.
- **SSR-safe `typeof document !== "undefined"` guard** — Storybook's docs-page generation runs in Node; without the guard the first render would crash.
- **`runOnly: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]`** — explicit WCAG 2.1 AA ruleset; default axe config includes Section 508 + WCAG 2.0 only and would miss 2.1 issues.
- **`satisfies Meta` (no `typeof Component`) on smoke story** — this is a token gallery, not a component spec; there's no `args` shape to infer.

## Deviations from Plan

None - plan executed exactly as written.

Both tasks landed verbatim per the plan's `<action>` blocks. No bugs found, no missing critical functionality, no blocking issues, no architectural questions raised. Static checks, typecheck, and `build-storybook` all green on first try.

## Issues Encountered

None.

## Manual verification checklist (deferred to verify-work)

Per VALIDATION.md §Manual-Only Verifications (cannot be automated):

1. `pnpm --filter @multica/showroom storybook` → DevTools console empty (no env-var or API-client errors).
2. Theme toolbar control visible at top of Storybook UI; Light / Dark items selectable; current selection shown via `dynamicTitle`.
3. Open `Foundations / Tokens / Surfaces` story.
4. Toggle Theme → Dark → all 11 swatches must visibly change.
5. Specifically: `bg-sidebar` swatch must resolve to deep-forest-green in dark mode, **NOT** transparent. (Transparent → decorator targets the wrong DOM ancestor → SC#2 fails.)
6. Open Accessibility tab → zero critical violations on the Surfaces story.

## Threat Flags

None — no new trust boundaries introduced beyond what the plan's `<threat_model>` already enumerated.

## Next Phase Readiness

- Hand-off to Plan 03: `apps/showroom/stories/` directory now exists with `foundations/tokens.stories.tsx`. Plan 03 will add four files under `stories/atoms/`.
- preview.tsx is complete; no further edits expected in Phase 3.
- Theme toggle + a11y panel ride along automatically on every new story added in Plan 03 (no per-story opt-in needed).
- Wave 2 smoke gate satisfied → Plan 03 can begin once Plan 02 is reviewed.

## Self-Check: PASSED

- FOUND: `apps/showroom/.storybook/preview.tsx` (modified)
- FOUND: `apps/showroom/stories/foundations/tokens.stories.tsx` (created)
- FOUND: commit `8d1e1469` (Task 1 — preview.tsx)
- FOUND: commit `e8f9bbfe` (Task 2 — tokens.stories.tsx)
- VERIFIED: typecheck exits 0
- VERIFIED: `pnpm --filter @multica/showroom build-storybook` exits 0 (2.23s, 6.9 MB output)
- VERIFIED: all 11 token class names present in tokens.stories.tsx
- VERIFIED: `globalTypes.theme`, `initialGlobals.theme`, `document.documentElement.classList.toggle`, SSR guard, `wcag21aa` all present in preview.tsx

---
*Phase: 03-storybook-showroom*
*Completed: 2026-04-25*
