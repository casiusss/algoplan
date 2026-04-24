---
status: partial
phase: 01-token-foundation-typography
source: [01-VERIFICATION.md]
started: 2026-04-25T00:00:00Z
updated: 2026-04-25T00:00:00Z
---

## Current Test

[awaiting human testing]

## Tests

### 1. Desktop FOUC no-flash perceptual check
expected: After force-quit + relaunch with `multica_theme=dark` set in localStorage, the Electron window paints dark from the very first frame. No white flash visible.
recipe: `apps/desktop/scripts/manual-fouc-check.md` Tests 1-5
result: [pending]

### 2. Desktop Inter italic glyph rendering
expected: Italic content in the desktop renderer uses true Inter italic letterforms (not synthesized obliques). Confirmed via DevTools → Computed → font-style on a known italic element.
recipe: Run `pnpm dev:desktop`. Open DevTools. Pick any italic element (or render `<em>test</em>` in a temporary fixture). Confirm `font-family: Inter` AND `font-style: italic` AND glyphs match true italic shapes (not slanted upright).
result: [pending]

### 3. Algorivo palette visual smoke (web + desktop, light + dark)
expected: All major surfaces render in the new Algorivo OKLCH palette (brand-green `#008757` primary, near-white `#fafbfc` body in light, near-black `#0f1318` body in dark). No invisible text, no broken contrast on any surface.
recipe:
  - `pnpm dev:web` → walk `/login`, `/`, `/inbox`, `/settings`, an issue detail with agent transcript, search-mark via `/`
  - `pnpm dev:desktop` → same walk
  - In each: toggle `.dark` class on `<html>` via DevTools (or use settings if wired); confirm every surface flips correctly
result: [pending]

## Summary

total: 3
passed: 0
issues: 0
pending: 3
skipped: 0
blocked: 0

## Gaps
