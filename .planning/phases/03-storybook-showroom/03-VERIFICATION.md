---
phase: 03-storybook-showroom
verified: 2026-04-25T14:32:00Z
status: human_needed
score: 1/4 must-haves automatically verified; 3/4 require manual browser inspection
overrides_applied: 0
human_verification:
  - test: "SC#1 — Storybook starts with zero console errors about missing env vars / API client init"
    expected: "Run `pnpm --filter @multica/showroom storybook`. Open http://localhost:6006 in a browser. Open DevTools Console. Expect zero `[error]` entries about NEXT_PUBLIC_*, MULTICA_SERVER_URL, missing API client, missing QueryClient, or missing providers. Warnings about Vite chunk size are acceptable (Storybook vendor bundles)."
    why_human: "Console error detection requires a running browser. Static analysis confirms zero providers are mounted (no CoreProvider/QueryClientProvider/WorkspaceIdProvider/NavigationProvider/ThemeProvider imports anywhere in apps/showroom) and `apps/showroom/package.json` declares no `@multica/core`, `next/*`, or `react-router-dom` deps — so the absence of env-var/API-client errors is structurally guaranteed but must be verified at runtime."
  - test: "SC#2 — Theme toggle flips bg-sidebar to deep-forest-green (not transparent) in dark mode"
    expected: "1) `pnpm --filter @multica/showroom storybook`. 2) Open the `Foundations / Tokens / Surfaces` story. 3) Click the Theme toolbar control → Dark. 4) ALL 11 swatches must visibly change. 5) Specifically: `bg-sidebar` swatch must render deep-forest-green (oklch(0.24 0.013 250)) — NOT transparent. If transparent, the decorator is targeting the wrong DOM ancestor."
    why_human: "Visual perceptual check on rendered DOM with applied CSS cascade. Static analysis confirms decorator targets `document.documentElement` (preview.tsx:48), preview.css declares `@custom-variant dark (&:is(.dark *))` matching apps/web's contract, and tokens.css defines both light and dark `--sidebar` values — but the actual cascade resolution can only be observed in a browser."
  - test: "SC#3 — a11y panel shows zero critical WCAG violations on all 4 atom stories"
    expected: "For each `Atoms / TagChip`, `Atoms / AccentBar`, `Atoms / AvatarInitial`, `Atoms / SegmentedControl` story (18 stories total across 4 atoms), open the Accessibility tab and verify the Violations list contains zero entries with `impact: critical`. Light AND Dark theme should be checked since contrast can flip per mode."
    why_human: "axe-core runs in the iframe and outputs to the addon-a11y panel UI. Static analysis confirms `parameters.a11y.options.runOnly: ['wcag2a','wcag2aa','wcag21a','wcag21aa']` is wired in preview.tsx (WCAG 2.1 AA ruleset), addon-a11y is registered in main.ts, and runs globally with no per-story opt-in — but actual axe results require interactive panel inspection."
  - test: "Interactive behaviors specific to atom stories (per Plan 03 SUMMARY checklist)"
    expected: "TagChip/WithRemove: clicking X fires action spy in Actions panel. TagChip/Polymorphic: rendered element is `<a href='#'>` not `<span>` (DevTools Inspect). AccentBar/Orientation: vertical bar visibly tall (parent h-32). AvatarInitial/Determinism: 5 swatches identical color. AvatarInitial/PaletteSpread: 8 distinct colors, each appearing exactly twice. AvatarInitial/Empty: shows '?' with aria-label='Unknown user'. SegmentedControl/Default: clicking segments updates args panel `value` live; Tab/Arrow/Home/End keyboard nav works; SegmentedControl/WithDisabled: P3 cannot receive focus via arrow keys."
    why_human: "Live interaction (click/keyboard) and DOM inspection required. These behaviors are implemented in the atoms (Phase 2 contract) and in the story render functions (useArgs controlled state) — static analysis confirms they're wired correctly but cannot exercise them."
---

# Phase 3: Storybook Showroom Verification Report

**Phase Goal:** `apps/showroom` is a running Storybook 9 instance that renders stories for all Phase 2 atoms with live theme toggle and WCAG panel — providing a visual review sandbox before any app-level view work begins.
**Verified:** 2026-04-25T14:32:00Z
**Status:** human_needed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths (mapped to ROADMAP Success Criteria)

| # | Truth (Success Criterion) | Status | Evidence |
| --- | --- | --- | --- |
| SC#1 | Running `pnpm --filter @multica/showroom storybook` starts Storybook with zero console errors about missing env vars or API client init | ? UNCERTAIN — needs browser | Static: zero forbidden imports (`@multica/core`, `next/*`, `react-router-dom`) in `apps/showroom/package.json` and source. Zero provider mounts (`QueryClientProvider`/`CoreProvider`/`WorkspaceIdProvider`/`NavigationProvider`/`ThemeProvider`) anywhere in apps/showroom. `build-storybook` exits 0 (3.0s, 18 stories, 7.0 MB). Runtime console verification deferred to human. |
| SC#2 | Theme toggle switches all stories between light/dark — `bg-sidebar` renders deep-forest-green in dark mode, not transparent | ? UNCERTAIN — needs browser | Static: `preview.tsx:48` toggles `.dark` on `document.documentElement` (matches next-themes semantics on apps/web). `preview.css` declares `@custom-variant dark (&:is(.dark *))` (mirrors `apps/web/app/globals.css`). `tokens.css` defines `--sidebar: oklch(1 0 0)` (light) and `--sidebar: oklch(0.24 0.013 250)` (dark). Smoke story `Foundations / Tokens / Surfaces` exists with `bg-sidebar` swatch (line 27). SSR guard present. Visual cascade check requires browser. |
| SC#3 | a11y panel shows zero critical WCAG violations on all four Phase 2 atom stories | ? UNCERTAIN — needs browser | Static: `parameters.a11y.options.runOnly: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]` (preview.tsx:61) — full WCAG 2.1 AA ruleset. `@storybook/addon-a11y` registered in main.ts:22. Applied at preview level → runs on every story automatically. axe results require interactive panel. |
| SC#4 | Stories import real component source from `packages/ui/` — no mocked component implementations, only mocked providers | ✓ VERIFIED | `grep -h "from \"@multica/ui/components/ui" apps/showroom/stories/atoms/*.stories.tsx \| wc -l` → `4`. All four atom source files exist at `packages/ui/components/ui/{tag-chip,accent-bar,avatar-initial,segmented-control}.tsx` (sizes 1.8–3.2 kB, last modified 2026-04-25). Zero re-implementations of atoms in showroom. Per UI-SPEC §Mocked Providers Contract: providers are *omitted entirely*, not mocked — none of the four atoms read auth/workspace/query state, so this is safe. |

**Score:** 1/4 truths fully automatically verified; 3/4 structurally verified (no contradicting evidence) but require human browser inspection per VALIDATION §Manual-Only Verifications.

### Required Artifacts

| Artifact | Expected | Status | Details |
| --- | --- | --- | --- |
| `apps/showroom/package.json` | private workspace, catalog deps, no forbidden imports | ✓ VERIFIED | `private: true`. All shared deps via `catalog:` except `@vitejs/plugin-react` pinned to `^5.1.1` (vite 7 compat — documented Plan 01 deviation). Zero `@multica/core`/`next/*`/`react-router-dom`. |
| `apps/showroom/.storybook/main.ts` | framework + addons + stories glob | ✓ VERIFIED | `framework: "@storybook/react-vite"`, `stories: ["../stories/**/*.stories.@(ts\|tsx)"]`, `addons: ["@storybook/addon-a11y", "@storybook/addon-docs"]`. No legacy essentials addon. |
| `apps/showroom/.storybook/preview.tsx` | theme toggle + a11y + CSS chain | ✓ VERIFIED | `globalTypes.theme` with sun/moon icons, decorator toggles `.dark` on `document.documentElement` (SSR-guarded), `parameters.a11y.options.runOnly` includes all WCAG 2.1 AA tags, `parameters.layout: "padded"`. Imports fontsource Inter (regular + italic) + preview.css. |
| `apps/showroom/.storybook/preview.css` | Tailwind v4 + @multica/ui chain + @source | ✓ VERIFIED | `@import "tailwindcss"`, `@import "@multica/ui/styles/tokens.css"`, `@import "@multica/ui/styles/base.css"`, `@custom-variant dark (&:is(.dark *))`, `@source` paths bounded to `packages/ui/**` + `apps/showroom/stories/**`. |
| `apps/showroom/stories/foundations/tokens.stories.tsx` | smoke gate for SC#2 | ✓ VERIFIED | 11 swatches: 6 surfaces (incl. `bg-sidebar`), 4 tag colors, 1 brand. Section headers, accept phrase ("If `bg-sidebar` stays transparent in dark mode, the dark-class target is wrong") inlined. |
| `apps/showroom/stories/atoms/tag-chip.stories.tsx` | Default + AllColors + WithRemove + Polymorphic | ✓ VERIFIED | 4 stories. Imports from `@multica/ui/components/ui/tag-chip`. Uses `fn()` from `storybook/test` (Storybook 9 subpath). Polymorphic uses `render={<a href="#" />}`. |
| `apps/showroom/stories/atoms/accent-bar.stories.tsx` | Default + AllColors + Segments + Orientation | ✓ VERIFIED | 4 stories. Imports from `@multica/ui/components/ui/accent-bar`. Includes `muted` color (per UI-SPEC §2 — TagChip excludes muted, AccentBar includes). |
| `apps/showroom/stories/atoms/avatar-initial.stories.tsx` | Default + AllSizes + Determinism + PaletteSpread + Empty | ✓ VERIFIED | 5 stories. Imports from `@multica/ui/components/ui/avatar-initial`. PaletteSpread uses 16 empirically verified names (2 per palette index 0–7 — verified by Plan 03 author against `hashToPaletteIndex`). |
| `apps/showroom/stories/atoms/segmented-control.stories.tsx` | Default + TwoOptions + WithDisabled + KeyboardInstructions | ✓ VERIFIED | 4 stories. Imports from `@multica/ui/components/ui/segmented-control`. Uses `useArgs` from `storybook/preview-api` (Storybook 9 subpath) for controlled state. Named `function Render(args)` for rules-of-hooks compliance. |

### Key Link Verification

| From | To | Via | Status | Details |
| --- | --- | --- | --- | --- |
| Story files (4 atoms) | `@multica/ui/components/ui/{name}` | direct import | ✓ WIRED | All 4 stories import real atom source (verified via grep returning 4 hits). |
| `preview.tsx` | `preview.css` | `import "./preview.css"` | ✓ WIRED | Line 22. |
| `preview.css` | `@multica/ui/styles/{tokens,base}.css` | `@import` directives | ✓ WIRED | Lines 10–11. Both files exist (4.5 kB base, 10.4 kB tokens). |
| Theme decorator | `document.documentElement` | `classList.toggle("dark", ...)` | ✓ WIRED | preview.tsx:48. SSR guard line 47. |
| Theme decorator class target | Tailwind dark variant resolution | `@custom-variant dark (&:is(.dark *))` | ✓ WIRED | preview.css:17 — class is on `<html>`, variant resolves against any descendant. Mirrors apps/web. |
| `addon-a11y` | axe WCAG 2.1 AA | `parameters.a11y.options.runOnly` | ✓ WIRED | preview.tsx:61 with all four `wcag2a/wcag2aa/wcag21a/wcag21aa` tags. |
| `main.ts` stories glob | `apps/showroom/stories/**/*.stories.@(ts\|tsx)` | Storybook discovery | ✓ WIRED | Build output `index.json` confirms 18 stories indexed across 5 entries. |
| Turbo task `build-storybook` | `apps/showroom` | `turbo.json` task block | ✓ WIRED | `dependsOn: ["^typecheck"]` (upstream packages typecheck first), outputs `storybook-static/**`. |

### Data-Flow Trace (Level 4)

Not applicable — the showroom is a developer tooling surface that renders deterministic, hardcoded story input. There is no data fetching, no backend coupling, no dynamic state from external sources. Stories supply their own inputs via `args` and constant arrays (`ALL_COLORS`, `PALETTE_NAMES`, `SURFACE_TOKENS`).

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
| --- | --- | --- | --- |
| `build-storybook` exits 0 | `pnpm --filter @multica/showroom build-storybook` | Exit 0; 18 stories built; 3.0s; 7.0 MB output at `apps/showroom/storybook-static/` | ✓ PASS |
| Full repo typecheck passes | `pnpm typecheck` | Exit 0; 7/7 tasks successful (turbo cache hit, FULL TURBO 23ms) | ✓ PASS |
| All 4 atom stories import real `@multica/ui` source | `grep -h "from \"@multica/ui/components/ui" apps/showroom/stories/atoms/*.stories.tsx \| wc -l` | `4` | ✓ PASS |
| No forbidden deps in `package.json` | `grep -E "@multica/core\|next/\|react-router-dom" apps/showroom/package.json` | exit 1 (no matches) | ✓ PASS |
| WCAG 2.1 AA wired in preview | `grep -n "wcag21aa" apps/showroom/.storybook/preview.tsx` | 4 matches (preview.tsx lines 11, 12, 59, 61) | ✓ PASS |
| Theme decorator targets documentElement | `grep -n "documentElement.classList" apps/showroom/.storybook/preview.tsx` | 1 match (line 48) | ✓ PASS |
| Story index built correctly | `cat storybook-static/index.json` | 18 stories: 5 AvatarInitial, 4 TagChip, 4 AccentBar, 4 SegmentedControl, 1 Foundations/Tokens | ✓ PASS |
| Live storybook console clean | `pnpm --filter @multica/showroom storybook` + DevTools Console | not run — requires interactive browser | ? SKIP (human) |
| Theme toggle flips `bg-sidebar` visually | manual click in toolbar | not run — requires browser | ? SKIP (human) |
| a11y panel zero critical violations | manual axe panel inspection per story | not run — requires browser | ? SKIP (human) |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
| --- | --- | --- | --- | --- |
| SB-01 | 03-00 | `apps/showroom` workspace exists, private, scaffolded | ✓ SATISFIED | Plan 00 SUMMARY confirms `package.json` + `tsconfig.json` + `vite.config.ts` + `.gitignore`; `private: true` verified. |
| SB-02 | 03-01, 03-02 | Mocked providers — no env-var or API-client init errors | ✓ SATISFIED (structural) | Zero providers mounted, zero forbidden deps. Runtime console check deferred (SC#1). |
| SB-03 | 03-01 | Tailwind + tokens CSS chain wired into preview iframe | ✓ SATISFIED | `preview.css` mirrors `apps/web/app/globals.css`; `@source` paths verified to resolve to `packages/ui` and `apps/showroom/stories`. |
| SB-04 | 03-02, 03-03 | Stories + theme toggle + a11y panel | ✓ SATISFIED (structural) | 18 stories built (1 foundations + 17 atoms), theme toggle wired, a11y at WCAG 2.1 AA. Visual SC#2/#3 deferred to human. |

No orphaned requirements — every Phase 3 requirement (SB-01..SB-04) appears in at least one plan's `requirements-completed` field and maps to verified artifacts.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
| --- | --- | --- | --- | --- |
| (none) | — | — | — | — |

Scans run against `apps/showroom/**` (excluding `node_modules/` and `storybook-static/`):

- `TODO|FIXME|XXX|HACK` markers: 0 matches
- `console.log/warn/error/info/debug`: 0 matches
- Hex colors / `rgb(` / `rgba(`: 0 matches
- `dark:*` Tailwind overrides in story files: 0 matches
- Provider mounts (`QueryClientProvider`/`CoreProvider`/`WorkspaceIdProvider`/`NavigationProvider`/`ThemeProvider`): 0 matches
- Forbidden imports (`@multica/core`/`next/*`/`react-router-dom`): 0 matches in source AND 0 matches in `package.json`

Code review report (`03-REVIEW.md`) found 0 critical, 0 warning, 2 info-only items (typing redundancy in `useArgs<{value:string}>()` and asymmetric `turbo.json` `dependsOn`). Both info items are explicitly documented as optional polish that does NOT block phase closure.

### Human Verification Required

See frontmatter `human_verification` section. Three of four success criteria require live-browser inspection:

1. **SC#1 — DevTools console clean** — `pnpm --filter @multica/showroom storybook` → Console tab → expect zero `[error]` entries about env vars / API client / missing providers.
2. **SC#2 — Theme toggle visual cascade** — Open `Foundations / Tokens / Surfaces` → toggle Theme → Dark → all 11 swatches must visibly change; `bg-sidebar` MUST be deep-forest-green, NOT transparent.
3. **SC#3 — a11y panel zero critical violations** — Open each of 18 atom stories → Accessibility tab → expect zero `impact: critical` entries (Light AND Dark themes).

Plus interactive behaviors per Plan 03 SUMMARY checklist (TagChip onRemove action spy, Polymorphic anchor render, AvatarInitial determinism, SegmentedControl arrow-key navigation, etc.).

### Gaps Summary

No structural gaps — every must-have artifact exists, is substantive, is wired, and the build succeeds. The phase is structurally complete. Status is `human_needed` (not `passed`) because three of four ROADMAP success criteria are visual / runtime-console checks that cannot be automated and were explicitly listed as Manual-Only Verifications in `03-VALIDATION.md`. SC#4 (real atom imports) is fully automatically verified.

If the human spot-check confirms zero console errors, correct theme cascade, and zero critical a11y violations, the phase is fully `passed`. If any visual check fails, the implementing pattern most likely to be wrong is the theme decorator's DOM target — and the smoke story is designed to surface exactly that.

---

_Verified: 2026-04-25T14:32:00Z_
_Verifier: Claude (gsd-verifier)_
