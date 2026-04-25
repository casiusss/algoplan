# Phase 3: Storybook Showroom — Research

**Researched:** 2026-04-25
**Domain:** Storybook 9 + Vite + Tailwind v4 + Internal Packages monorepo wiring; theme toggle decorator; axe-core a11y panel; CSF 3 story patterns
**Confidence:** HIGH (Storybook 9.1.20 + addon versions verified against npm; React 19.2.3 satisfies peerDeps; Tailwind v4 + custom-variant + @source patterns verified against tailwindcss docs; CSF 3 + globalTypes + a11y configuration verified via Context7)

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **All implementation choices are at Claude's discretion.** Discuss phase was skipped per `workflow.skip_discuss: true`. Use ROADMAP phase goal, success criteria, codebase conventions, and the `03-UI-SPEC.md` design contract to guide decisions.
- **The visual + configuration contract is LOCKED in `03-UI-SPEC.md`** (do not re-debate framework choice, addons list, theme toggle mechanism, story file location, mocked-providers stance, or smoke-story shape — those are settled).
- Phase boundary: `apps/showroom` is a running Storybook 9 instance that renders stories for the four Phase 2 atoms with live theme toggle and WCAG panel — providing a visual review sandbox before any app-level view work begins.
- The showroom MUST consume real Phase 2 atoms (`@multica/ui/components/ui/{name}`) — no mocked component implementations.
- The showroom MUST NOT import `@multica/core/*`, `next/*`, or `react-router-dom`.

### Claude's Discretion

- Exact Storybook 9 patch version pin in catalog (UI-SPEC says "use latest 9.x at install"; 9.1.20 is current — see Standard Stack).
- Decision between hand-rolled `globalTypes.theme` decorator vs `@storybook/addon-themes`'s `withThemeByClassName`. UI-SPEC §Hard Constraint #8 requires picking one and documenting it. **Recommendation below: hand-rolled decorator** — three lines of code, no addon dependency, full control over which DOM ancestor receives the `.dark` class.
- Inclusion of `@storybook/addon-docs` (UI-SPEC says yes; planner can confirm).
- Whether to add a `turbo.json` task entry for `storybook` / `build-storybook` (recommend below: add `build-storybook` only, for CI smoke gate; `storybook` dev is local-only).
- Story file naming and `Story` export naming inside the locked story titles set.
- Vite config minutiae beyond plugins (alias, dedupe — recommend mirroring `apps/desktop/electron.vite.config.ts` renderer block).

### Deferred Ideas (OUT OF SCOPE)

- None — discuss phase skipped, no deferred items.

</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| SB-01 | New `apps/showroom` in pnpm workspace + Turborepo pipeline; Storybook 9.x with `@storybook/react-vite`; private package | "Standard Stack" + "Code Examples → package.json"; latest Storybook 9 patch is `9.1.20` [VERIFIED: `npm view storybook@9 version`]; `@storybook/react-vite@9.1.20` peerDeps include `react: ^19.0.0-beta` which satisfies installed `react@19.2.3` [VERIFIED: semver check] |
| SB-02 | `preview.tsx` provides ThemeProvider + mocked providers — stories don't crash on missing API client | "Mocked Providers Strategy" — UI-SPEC explicitly REPLACES SB-02's "MockQueryProvider/MockNavigationProvider" with "no providers at all" because none of the 4 atoms needs them. Document the policy + future expansion path |
| SB-03 | Tailwind v4 `@source` scans `packages/ui/**` and `packages/views/**`; smoke story with `bg-sidebar` renders correctly | "Code Examples → preview.css" + "Pattern: @source in preview chain"; `@source` directive is path-relative-to-CSS-file [CITED: tailwindcss.com/docs/detecting-classes-in-source-files] |
| SB-04 | `addon-a11y` (axe-core WCAG checks) and `addon-themes` OR equivalent toggle active; stories for all UI-01–UI-04 atoms | "Code Examples → preview.tsx parameters.a11y" + "Story Patterns"; WCAG 2.1 AA via `runOnly: ['wcag2a','wcag2aa','wcag21a','wcag21aa']` [CITED: Storybook docs WCAG ruleset config]. UI-SPEC removes `addon-themes` in favor of `globalTypes.theme` (planner picks) |

</phase_requirements>

## Summary

Phase 3 is mechanically straightforward: spin up a new `apps/showroom` workspace package with Storybook 9.1.20 + Vite + the same Tailwind v4 + token chain that `apps/web` and `apps/desktop` already use, point it at the four Phase 2 atoms, and add two configuration knobs (theme toggle + a11y panel). No new design surface, no new business logic, zero providers mounted.

Three observations drive the plan shape:

1. **Storybook 9's package landscape is consolidated.** The legacy "essentials" bundle is GONE in 9.0; what used to be `@storybook/preview-api`, `@storybook/manager-api`, `@storybook/test`, etc. are now subpaths of the main `storybook` package (e.g. `storybook/preview-api`, `storybook/test`) [CITED: Storybook MIGRATION.md]. The phase MUST install only `storybook`, `@storybook/react-vite`, `@storybook/addon-a11y`, and `@storybook/addon-docs` — and import test/preview helpers from `storybook/*` subpaths, NOT from `@storybook/preview-api` (deprecated). The UI-SPEC's mention of `@storybook/preview-api` for `useArgs` is outdated and must be corrected to `storybook/preview-api`.

2. **The Internal Packages pattern works out-of-the-box with Vite.** `@multica/ui` exports raw `.tsx` via the `exports` map (`./components/ui/*`: `./components/ui/*.tsx`). Vite (and therefore Storybook's Vite builder) compiles workspace TS sources directly with no extra config — same as `apps/web` (Next.js / Turbopack) and `apps/desktop` (electron-vite) already do. Zero pre-build step, zero `optimizeDeps` exclusions needed for the four atoms. This is the same architectural property the existing apps rely on.

3. **The theme toggle's DOM ancestor is load-bearing.** The Phase 1 token cascade resolves through `@custom-variant dark (&:is(.dark *))`. The decorator MUST add the `.dark` class to a DOM node that is a true *ancestor* of the story root — otherwise `&:is(.dark *)` doesn't match and `bg-sidebar` stays transparent (which is the failure mode SC#2 explicitly catches). The two viable options:
   - Toggle `.dark` on `document.documentElement` (the iframe `<html>`). Always-correct because the story root is necessarily a descendant of `<html>`.
   - Wrap the story in `<div className={theme === 'dark' ? 'dark' : ''}>`. Also correct (story root is a descendant of the wrapper div), but requires every story to render inside the wrapper.

   Both are equally valid; **the project should use option (1)** because it matches what `next-themes` does on web (sets `class="dark"` on `<html>`) — same semantics, same render result, easier to reason about.

**Primary recommendation:** Land the showroom in 5 plans:
- **Plan 0 (Wave 0):** Catalog entries + workspace skeleton (`apps/showroom/package.json`, `tsconfig.json`, `vite.config.ts`, empty `.storybook/main.ts`, empty `preview.tsx`, empty `stories/`) + `turbo.json` `build-storybook` task.
- **Plan 1:** Wire CSS chain (preview.css with `@import tailwindcss`, tokens, base, `@custom-variant dark`, `@source` directives) + font loading + verify dev server starts with empty story tree.
- **Plan 2:** Add `globalTypes.theme` + decorator that toggles `.dark` on `document.documentElement` + write the `Foundations / Tokens / Surfaces` smoke story (locks SC#2).
- **Plan 3:** Add `parameters.a11y.config` for WCAG 2.1 AA + verify panel surfaces on the smoke story.
- **Plan 4:** Write atom stories (4 files: `tag-chip.stories.tsx`, `accent-bar.stories.tsx`, `avatar-initial.stories.tsx`, `segmented-control.stories.tsx`) per UI-SPEC §Component-Specific Story Contracts.
- **(Optional Plan 5):** README + Turborepo `build-storybook` smoke gate verification.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Storybook framework + builder | `apps/showroom/.storybook/main.ts` (+`framework: '@storybook/react-vite'`) | — | Vite is the only sensible builder — matches the rest of the monorepo; Webpack5 would be foreign |
| Story files (atom variant matrices) | `apps/showroom/stories/atoms/*.stories.tsx` | — | UI-SPEC §Story file location LOCKS this — keeps `packages/ui` free of Storybook devDeps |
| Preview decorators + globals | `apps/showroom/.storybook/preview.tsx` | — | Standard Storybook entry; consumed by every story |
| Tailwind + token CSS chain | `apps/showroom/.storybook/preview.css` (or inline import in preview.tsx) | `packages/ui/styles/tokens.css`, `packages/ui/styles/base.css` | Mirrors `apps/web/app/globals.css` and `apps/desktop/src/renderer/src/globals.css` chain — single source of truth for tokens |
| Tailwind class scanning | `@source` directives in preview.css | `@tailwindcss/vite` plugin in `vite.config.ts` | `@source` registers paths Tailwind would otherwise ignore (workspace packages, story files) [CITED: tailwindcss.com] |
| Font loading (preview iframe) | `apps/showroom/.storybook/preview.tsx` | `@fontsource-variable/inter` (catalog) | Mirrors `apps/desktop/src/renderer/src/main.tsx` — fontsource (not `next/font`) because showroom is Vite, not Next |
| Atom rendering | `@multica/ui/components/ui/{name}` (already shipped Phase 2) | — | Real source, no mocks, raw `.tsx` import via Internal Packages pattern |
| Theme toggle (light/dark) | `apps/showroom/.storybook/preview.tsx` `globalTypes.theme` + decorator | `document.documentElement.classList` mutation | UI-SPEC §Hard Constraint #8 lets planner choose `globalTypes` OR `@storybook/addon-themes`; recommend `globalTypes` (3 lines, no addon) |
| Accessibility (axe-core) | `apps/showroom/.storybook/preview.tsx` `parameters.a11y` | `@storybook/addon-a11y` package | WCAG 2.1 AA via `runOnly: ['wcag2a','wcag2aa','wcag21a','wcag21aa']` [CITED: Storybook addon-a11y docs] |
| Polymorphic icon support (TagChip remove icon) | inherited from atoms | `lucide-react` (already in catalog, already in `@multica/ui` deps) | No new dep needed — atom already imports it |
| CI smoke gate | `pnpm --filter @multica/showroom build-storybook` | `turbo.json` `build-storybook` task | Build-only smoke test (no Vitest); zero-exit-code = all stories compile |

---

## Standard Stack

### Core (NEW workspace package — none installed yet)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `storybook` | `9.1.20` (latest 9.x patch) | Storybook CLI + consolidated `preview-api` + `manager-api` + `test` subpaths | [VERIFIED: `npm view storybook@9 version`] UI-SPEC pins major 9; pick latest patch at install. v10 is GA but UI-SPEC locks to 9 (REQUIREMENTS line 25 cites `9.1.5`). |
| `@storybook/react-vite` | `9.1.20` (must match `storybook` exactly) | React + Vite framework adapter | [VERIFIED: `npm view @storybook/react-vite@9 version`] peerDeps: `vite: ^5 || ^6 || ^7`, `react: ^16.8.0 || ^17 || ^18 || ^19.0.0-beta`, `storybook: ^9.1.20`. React `19.2.3` satisfies. |
| `@storybook/addon-a11y` | `9.1.20` (must match) | axe-core panel + automatic per-story checks | [VERIFIED: `npm view @storybook/addon-a11y@9 version`] WCAG 2.1 AA via `parameters.a11y.options.runOnly` |
| `@storybook/addon-docs` | `9.1.20` (must match) | Markdown-style story descriptions (per UI-SPEC) | [VERIFIED: `npm view @storybook/addon-docs@9 version`] In Storybook 9, addon-docs is NO LONGER part of the (now-removed) essentials bundle — must be installed explicitly [CITED: Storybook 9 MIGRATION.md "Install addon-docs separately after essentials removal"] |
| `vite` | `^7.3.2` (or `^7`) | Vite — required peer of `@storybook/react-vite` | [VERIFIED: `npm view vite@7 version` returns 7.3.x line]. `electron-vite@5.0.0` (used by desktop) and Tailwind v4 work with Vite 5/6/7 — **add catalog entry `vite: "^7"`** so showroom + future Vite-using packages share. |
| `@vitejs/plugin-react` | `catalog: ^6.0.1` | JSX transform for Vite | [VERIFIED: `npm view @vitejs/plugin-react version` = 6.0.1] Already in catalog (used by `packages/ui` for vitest); reuse. |
| `@tailwindcss/vite` | `catalog: ^4` | Tailwind v4 Vite plugin (compiles CSS, scans `@source` paths) | [VERIFIED: pnpm-workspace.yaml line 23] Already in catalog; same plugin `apps/desktop` uses |
| `tailwindcss` | `catalog: ^4` | Tailwind core | [VERIFIED: catalog line 21] Same version as both apps |
| `@multica/ui` | `workspace:*` | Source of the four atoms + `tokens.css` + `base.css` | [VERIFIED: package exports map at `packages/ui/package.json:11-23`] Already exports `./components/ui/*`, `./styles/tokens.css`, `./styles/base.css`, `./lib/avatar-color` — every path the showroom needs is already publicly exposed |
| `@multica/tsconfig` | `workspace:*` | Strict TS base config | [VERIFIED: `packages/tsconfig/base.json` exists] Reuse to keep TS strict + `noUncheckedIndexedAccess` aligned with rest of monorepo |
| `@fontsource-variable/inter` | catalog `^5.2.5` (resolved 5.2.8) | Self-hosted Inter for the preview iframe (Vite, not Next) | [VERIFIED: `apps/desktop/package.json:41` already uses this] **NEW catalog entry needed** — currently only `apps/desktop` consumes it directly; promote to `pnpm-workspace.yaml` `catalog:` so showroom + desktop share. |
| `react`, `react-dom` | `catalog:` (19.2.3) | React | Already in catalog |
| `typescript` | `catalog: ^5.9.3` | TypeScript | Already in catalog |

### Optional / Alternative

| Library | Version | Decision |
|---------|---------|----------|
| `@storybook/addon-themes` | `9.1.20` | **NOT installed** — UI-SPEC §Hard Constraint #8 lets us pick; hand-rolled `globalTypes.theme` is 3 lines and avoids the addon dependency. Document the choice in `preview.tsx` header. (If a future story needs more theme variants, swap in.) |
| `@storybook/test` | n/a (consolidated) | **NOT installed as separate package** — in Storybook 9 it lives at `storybook/test` (subpath of main `storybook` package). Import `fn` / `userEvent` / `expect` / `within` from `storybook/test`. [CITED: Storybook 9 MIGRATION.md package consolidation] |
| `@storybook/preview-api` | n/a (consolidated) | **NOT installed** — use `storybook/preview-api` (e.g. `import { useArgs } from "storybook/preview-api"`). The UI-SPEC's reference to `@storybook/preview-api` is outdated and should read `storybook/preview-api`. |
| `@storybook/addon-essentials` | n/a (REMOVED in 9.0) | **DO NOT install** — package no longer exists in 9.0. Pull individual addons (`addon-a11y`, `addon-docs`) explicitly. UI-SPEC §main.ts contract already says "NO essentials blanket import". |
| `tw-animate-css` | n/a | **NOT needed** — both apps import it (`apps/web/app/globals.css:2`, `apps/desktop/src/renderer/src/globals.css:2`), but it provides Tailwind animation utilities only. None of the four atoms uses animation utilities (`animate-*`). Skip in v1; add later if a future story needs it. |
| `shadcn/tailwind.css` | n/a | **NOT needed** — the showroom does not install/modify shadcn components per UI-SPEC §Design System. Skip. |
| `next-themes` | n/a | **NOT installed** — UI-SPEC §Mocked Providers explicitly forbids mounting `next-themes` (would race the toolbar). The toolbar IS the theme switch. |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `@storybook/react-vite` | `@storybook/react-webpack5` | Webpack would force a second build pipeline foreign to the monorepo (apps use Vite/Turbopack; tests use Vite via Vitest). **Stay with Vite.** |
| Storybook 9.1.20 | Storybook 10.3.5 | v10 is current latest. UI-SPEC + REQUIREMENTS lock to v9. Not changing in this phase. |
| Hand-rolled `globalTypes.theme` decorator | `@storybook/addon-themes` `withThemeByClassName` | Both work. The hand-rolled version is 3 lines of code in `preview.tsx`, no extra dep, full control over which DOM node receives the class. `withThemeByClassName` adds an addon and wraps stories in an extra div that may shift layout. **Pick hand-rolled.** |
| `globalTypes.theme.toolbar.items: ['light','dark']` (string array) | `globalTypes.theme.toolbar.items: [{ value: 'light', title: 'Light', icon: 'sun' }, ...]` (MenuItem array) | UI-SPEC §Copywriting locks the labels to "Light" / "Dark" — both shapes work; the MenuItem shape gives explicit titles + icons. **Pick MenuItem shape** for explicit titles (matches UI-SPEC verbatim). |
| Toggle `.dark` on `document.documentElement` | Wrap story in `<div className={cn(theme === 'dark' && 'dark')}>` | Both correct (story root is descendant of either ancestor). Document.documentElement matches what `next-themes` does on `apps/web` (semantic parity), and it requires no per-story wrapper. **Pick documentElement.** |
| One CSS entry imported by `preview.tsx` | Multiple CSS imports inline in `preview.tsx` | Single entry (`./preview.css`) keeps the chain colocated and lets future contributors find it. Mirrors `apps/web/app/globals.css` shape. **Pick single entry.** |
| Catalog `vite: "^7"` (new entry) | Inline `vite: "^7.3.2"` in `apps/showroom/package.json` only | Catalog entry future-proofs (when Vitest 4 catalog upgrade lands, or when another package wants Vite). Aligns with project's "deps go in catalog" rule. **Add catalog entry.** |

### Installation

**Prerequisite — add catalog entries** in `pnpm-workspace.yaml`:

```yaml
catalog:
  # ... existing entries ...
  vite: "^7"
  storybook: "9.1.20"
  "@storybook/react-vite": "9.1.20"
  "@storybook/addon-a11y": "9.1.20"
  "@storybook/addon-docs": "9.1.20"
  "@fontsource-variable/inter": "^5.2.5"
```

(Pin the four Storybook entries to the same exact patch — they MUST match per Storybook's peerDep contract.)

Then in `apps/showroom/package.json` use `catalog:` references; `pnpm install` resolves all of them.

```bash
# After scaffolding apps/showroom/package.json with catalog: refs, just:
pnpm install
```

**Version verification** (run before pinning):

```bash
npm view storybook@9 version              # → expect 9.1.x; planner uses the highest x
npm view @storybook/react-vite@9 version  # → must match storybook
npm view @storybook/addon-a11y@9 version  # → must match
npm view @storybook/addon-docs@9 version  # → must match
npm view vite@7 version                   # → expect 7.3.x
npm view @fontsource-variable/inter version
```

[VERIFIED 2026-04-25 via `npm view`:]
- `storybook@9` → `9.1.20`
- `@storybook/react-vite@9` → `9.1.20`
- `@storybook/addon-a11y@9` → `9.1.20`
- `@storybook/addon-docs@9` → `9.1.20`
- `vite@7` → `7.3.2`
- `@fontsource-variable/inter` → `5.2.8` (catalog spec `^5.2.5` resolves to 5.2.8)

---

## Architecture Patterns

### System Architecture Diagram

```
              pnpm-workspace.yaml catalog (Storybook 9.1.20, vite 7, fontsource Inter)
                                           │
                                           ▼
                       apps/showroom/package.json  (workspace package, private)
                                           │
                          ┌────────────────┼─────────────────┐
                          │                │                 │
                          ▼                ▼                 ▼
                  vite.config.ts   .storybook/main.ts   stories/atoms/*.stories.tsx
                  (react +         (framework =         (4 files, CSF 3,
                   tailwind         '@storybook/         no provider mounts)
                   plugins)          react-vite';
                                     addons:
                                     ['addon-a11y',
                                      'addon-docs'])
                                           │
                                           ▼
                                  .storybook/preview.tsx
                                  ─ imports ./preview.css (chain below)
                                  ─ imports @fontsource-variable/inter
                                  ─ imports .../wght-italic.css (D-11)
                                  ─ globalTypes.theme = { items, default: 'light' }
                                  ─ decorator: doc.documentElement.classList
                                       .toggle('dark', theme === 'dark')
                                  ─ parameters.a11y.options.runOnly = WCAG 2.1 AA
                                           │
                              ┌────────────┴────────────┐
                              ▼                         ▼
                      .storybook/preview.css      story files render
                      ─ @import "tailwindcss"     <TagChip />
                      ─ @import "@multica/ui/     <AccentBar />
                          styles/tokens.css"      <AvatarInitial />
                      ─ @import "@multica/ui/     <SegmentedControl />
                          styles/base.css"               │
                      ─ @custom-variant dark             │
                          (&:is(.dark *))                │
                      ─ @source                          │
                          "../../../packages/ui/         │
                          **/*.{ts,tsx}"                 │
                      ─ @source                          │
                          "../stories/**/*.{ts,tsx}"     │
                              │                          │
                              ▼                          │
                    Tailwind v4 generates utility ──────┘
                    classes (bg-tag-p0, text-foreground, ...)
                              │
                              ▼
                    Token cascade (Phase 1):
                    :root + .dark in tokens.css
                              │
                              ▼
                    Storybook iframe renders atom in correct color
                              │
                              ▼
                    addon-a11y panel scans rendered DOM for axe violations
                              │
                              ▼
                    Build smoke gate: `pnpm --filter @multica/showroom build-storybook`
                    exits 0 → all stories compile, all CSS resolves, no console errors
```

### Recommended Project Structure

```
apps/showroom/
├── .storybook/
│   ├── main.ts                          ← framework + addons + stories glob
│   ├── preview.tsx                      ← globals + decorators + a11y + CSS import + font imports
│   └── preview.css                      ← Tailwind + token chain + @source directives + @custom-variant dark
├── stories/
│   ├── foundations/
│   │   └── tokens.stories.tsx           ← UI-SPEC §0 smoke story (REQUIRED for SC#2)
│   └── atoms/
│       ├── tag-chip.stories.tsx         ← UI-SPEC §1
│       ├── accent-bar.stories.tsx       ← UI-SPEC §2
│       ├── avatar-initial.stories.tsx   ← UI-SPEC §3
│       └── segmented-control.stories.tsx ← UI-SPEC §4
├── package.json                         ← private; catalog: refs; storybook + build-storybook scripts
├── tsconfig.json                        ← extends @multica/tsconfig, adds JSX + paths
├── vite.config.ts                       ← @vitejs/plugin-react + @tailwindcss/vite
└── README.md                            ← How to run; how to add a story; no-mocks rule
```

### Pattern 1: `globalTypes.theme` + decorator that mutates `document.documentElement`

**What:** Declare a Storybook global named `theme` with a 2-position toolbar control. Add a decorator that, on every render, sets/removes `.dark` on the iframe's `<html>` element.

**Why:** This is the smallest possible bridge from "user clicks a Storybook toolbar item" to "Tailwind's `dark:` variant + the Phase 1 `:root` / `.dark` cascade activate the right surfaces". No addon dependency; no per-story wrapper; matches `next-themes`' `attribute="class"` behavior on web.

**Example (`preview.tsx`):**

```tsx
// Source: pattern from Storybook 9 docs (globalTypes + decorators)
// CITED: https://storybook.js.org/docs/essentials/toolbars-and-globals
import type { Preview } from "@storybook/react-vite"
import "@fontsource-variable/inter"
import "@fontsource-variable/inter/wght-italic.css"
import "./preview.css"

const preview: Preview = {
  globalTypes: {
    theme: {
      description: "Color theme for stories",
      toolbar: {
        title: "Theme",
        icon: "circlehollow",
        items: [
          { value: "light", title: "Light", icon: "sun" },
          { value: "dark", title: "Dark", icon: "moon" },
        ],
        dynamicTitle: true,
      },
    },
  },
  initialGlobals: {
    theme: "light",
  },
  decorators: [
    (Story, context) => {
      // Toggle .dark on the preview iframe's <html> — same DOM ancestor
      // that `@custom-variant dark (&:is(.dark *))` resolves against.
      // Matches what next-themes does on apps/web (parity with prod).
      const isDark = context.globals.theme === "dark"
      if (typeof document !== "undefined") {
        document.documentElement.classList.toggle("dark", isDark)
      }
      return <Story />
    },
  ],
  parameters: {
    a11y: {
      // CITED: Storybook addon-a11y docs (preview parameters)
      options: {
        runOnly: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"],
      },
    },
    layout: "padded", // small breathing room around story content
  },
}

export default preview
```

**Why this beats `@storybook/addon-themes` `withThemeByClassName`:**
- `withThemeByClassName` wraps every story in a `<div class="dark">`. The wrapper div becomes the closest ancestor with `.dark`, so Tailwind's `&:is(.dark *)` matches anything underneath. Functionally identical, but adds: (a) an extra wrapper div in the DOM (can perturb flex/grid layouts in stories that need to occupy full iframe width), (b) a transitive dependency, (c) one more file to read to understand "where is the theme set".
- Document.documentElement is what `next-themes` mutates on web. Same semantics → easier mental model when comparing showroom render to web render.

### Pattern 2: Tailwind v4 CSS chain mirrored from `apps/web/app/globals.css`

**What:** A single `preview.css` file imports Tailwind, the project tokens, project base styles, declares the `dark` custom variant, and declares `@source` directives for class scanning.

**Why this is the single source of truth for visual fidelity:** If the showroom's CSS chain diverges from `apps/web` or `apps/desktop`, atoms will look subtly wrong (different scrollbar, different focus ring, different background). Mirroring the chain guarantees pixel-for-pixel parity.

**Example (`preview.css`):**

```css
/* Source: mirrors apps/web/app/globals.css and apps/desktop/src/renderer/src/globals.css */
@import "tailwindcss";
@import "@multica/ui/styles/tokens.css";
@import "@multica/ui/styles/base.css";

/* CITED: tailwindcss.com/docs/dark-mode "Override dark variant with custom CSS selector"
 * MUST match apps/web/app/globals.css exactly so dark-bound utilities
 * (bg-sidebar dark variant, text-foreground dark variant) resolve identically.
 * Note: apps/web uses `&:is(.dark *)`; we use the same form. */
@custom-variant dark (&:is(.dark *));

/* CITED: tailwindcss.com/docs/detecting-classes-in-source-files
 * @source paths are relative to THIS CSS file. From .storybook/preview.css,
 * three levels up exits apps/showroom/.storybook → apps/showroom →
 * apps → repo root. Then descend into packages/ui or stories. */
@source "../../../packages/ui/**/*.{ts,tsx}";
@source "../stories/**/*.{ts,tsx}";
```

**Path arithmetic:** `apps/showroom/.storybook/preview.css` → `../` → `apps/showroom/` → `../` → `apps/` → `../` → repo root. So `../../../packages/ui/**/*.{ts,tsx}` resolves to `<repo-root>/packages/ui/**/*.{ts,tsx}`. The `@source` for stories is `../stories/**/*.{ts,tsx}` because stories live one level above `.storybook/`. Verified by replicating the pattern in `apps/desktop/src/renderer/src/globals.css:34-37` (same shape).

**What NOT to import:**
- `tw-animate-css` — none of the 4 atoms uses `animate-*` classes. Add later if needed.
- `shadcn/tailwind.css` — not consumed by any of the 4 atoms; UI-SPEC forbids shadcn install in the showroom.
- `apps/web/app/custom.css` — web-app-specific; not shared.

### Pattern 3: CSF 3 story shape — `Meta` + `StoryObj` + optional `render` for stateful atoms

**What:** Use Component Story Format 3 (the current convention in Storybook 9). Each story file has a `meta` default export + named `Story` exports. Stateful atoms (`SegmentedControl`) need a `render` function with internal `useState` because args alone can't track value changes.

**When to use:** Every story file. There is no reason to use CSF 2 in a new project on Storybook 9.

**Example for a stateless atom (TagChip — UI-SPEC §1):**

```tsx
// Source: pattern from Storybook 9 docs (CSF 3) — verified via Context7
// File: apps/showroom/stories/atoms/tag-chip.stories.tsx
import type { Meta, StoryObj } from "@storybook/react-vite"
import { fn } from "storybook/test"
import { TagChip, type TagChipColor } from "@multica/ui/components/ui/tag-chip"

const meta = {
  title: "Atoms / TagChip",
  component: TagChip,
} satisfies Meta<typeof TagChip>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: { color: "brand", children: "label" },
}

const ALL_COLORS: TagChipColor[] = ["tag-p0", "tag-p1", "tag-p2", "tag-p3", "brand"]

export const AllColors: Story = {
  render: () => (
    <section className="p-6 flex flex-col gap-3">
      <h2 className="text-sm font-semibold">Colors</h2>
      <div className="flex flex-wrap gap-2">
        {ALL_COLORS.map((c) => (
          <TagChip key={c} color={c}>
            {c}
          </TagChip>
        ))}
      </div>
    </section>
  ),
}

export const WithRemove: Story = {
  args: { color: "brand", children: "removable", onRemove: fn() },
  render: (args) => (
    <section className="p-6 flex flex-col gap-3">
      <h2 className="text-sm font-semibold">With X-to-remove</h2>
      <div className="flex flex-wrap gap-2">
        {ALL_COLORS.map((c) => (
          <TagChip key={c} color={c} onRemove={args.onRemove}>
            {c}
          </TagChip>
        ))}
      </div>
    </section>
  ),
}

export const Polymorphic: Story = {
  args: { color: "brand", children: "anchor", render: <a href="#" /> },
}
```

**Example for a stateful atom (SegmentedControl — UI-SPEC §4 `Default` story):**

The atom requires controlled `value` + `onValueChange` props. CSF 3 stories don't track local state across renders unless you either:
- (a) use `useArgs()` from `storybook/preview-api` (preferred — keeps args panel in sync), OR
- (b) use a `useState` inside a `Render` function (works, but args panel won't reflect the live value).

UI-SPEC says either is acceptable; recommendation below uses `useArgs()` because it ALSO surfaces the current value in the Storybook args panel for debugging.

```tsx
// File: apps/showroom/stories/atoms/segmented-control.stories.tsx
import type { Meta, StoryObj } from "@storybook/react-vite"
import { useArgs } from "storybook/preview-api"
import {
  SegmentedControl,
  SegmentedControlItem,
} from "@multica/ui/components/ui/segmented-control"

const meta = {
  title: "Atoms / SegmentedControl",
  component: SegmentedControl,
} satisfies Meta<typeof SegmentedControl>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    value: "P0",
    "aria-label": "Issue priority",
  },
  render: function Render(args) {
    // CITED: Storybook docs "Create Interactive Storybook Stories ... with useArgs"
    // capitalized name avoids react-hooks/rules-of-hooks lint complaints
    const [{ value }, updateArgs] = useArgs<{ value: string }>()
    return (
      <SegmentedControl
        {...args}
        value={value}
        onValueChange={(next) => updateArgs({ value: next })}
      >
        <SegmentedControlItem value="P0">P0</SegmentedControlItem>
        <SegmentedControlItem value="P1">P1</SegmentedControlItem>
        <SegmentedControlItem value="P2">P2</SegmentedControlItem>
        <SegmentedControlItem value="P3">P3</SegmentedControlItem>
      </SegmentedControl>
    )
  },
}

export const TwoOptions: Story = {
  args: { value: "Board", "aria-label": "View mode" },
  render: function Render(args) {
    const [{ value }, updateArgs] = useArgs<{ value: string }>()
    return (
      <SegmentedControl
        {...args}
        value={value}
        onValueChange={(next) => updateArgs({ value: next })}
      >
        <SegmentedControlItem value="Board">Board</SegmentedControlItem>
        <SegmentedControlItem value="List">List</SegmentedControlItem>
      </SegmentedControl>
    )
  },
}

export const WithDisabled: Story = {
  args: { value: "P0", "aria-label": "Issue priority" },
  render: function Render(args) {
    const [{ value }, updateArgs] = useArgs<{ value: string }>()
    return (
      <SegmentedControl
        {...args}
        value={value}
        onValueChange={(next) => updateArgs({ value: next })}
      >
        <SegmentedControlItem value="P0">P0</SegmentedControlItem>
        <SegmentedControlItem value="P1">P1</SegmentedControlItem>
        <SegmentedControlItem value="P2">P2</SegmentedControlItem>
        <SegmentedControlItem value="P3" disabled>
          P3
        </SegmentedControlItem>
      </SegmentedControl>
    )
  },
}

export const KeyboardInstructions: Story = {
  args: { value: "P0", "aria-label": "Issue priority" },
  render: function Render(args) {
    const [{ value }, updateArgs] = useArgs<{ value: string }>()
    return (
      <section className="p-6 flex flex-col gap-3">
        <SegmentedControl
          {...args}
          value={value}
          onValueChange={(next) => updateArgs({ value: next })}
        >
          <SegmentedControlItem value="P0">P0</SegmentedControlItem>
          <SegmentedControlItem value="P1">P1</SegmentedControlItem>
          <SegmentedControlItem value="P2">P2</SegmentedControlItem>
          <SegmentedControlItem value="P3">P3</SegmentedControlItem>
        </SegmentedControl>
        <p className="text-xs text-muted-foreground">
          Tab to focus. ←/→ to move selection. Home/End to jump. Space to activate.
        </p>
      </section>
    )
  },
}
```

### Pattern 4: AvatarInitial `PaletteSpread` — empirical name selection

UI-SPEC §3 `PaletteSpread` requires 8 names that, given the djb2 hash mod 8 algorithm, cover all 8 palette indexes. **The planner MUST compute these names empirically — never hardcode.**

The pure utility lives at `packages/ui/lib/avatar-color.ts` with exports `djb2`, `hashToPaletteIndex`, `extractInitials`, `AVATAR_PALETTE`. The planner can run a one-shot script to find a name covering each index:

```ts
// Throwaway script, run once during story authoring.
import { hashToPaletteIndex } from "@multica/ui/lib/avatar-color"

const candidates = [
  // a list of plausible-looking display names
  "Alice Anderson", "Bob Baker", "Charlie Cooper", "Dana Davis",
  "Eli Edwards", "Fiona Foster", "Gabe Garcia", "Hana Hill",
  /* ... */
]

const found: Record<number, string> = {}
for (const name of candidates) {
  const i = hashToPaletteIndex(name)
  if (found[i] === undefined) found[i] = name
  if (Object.keys(found).length === 8) break
}
console.table(found)
```

Then paste the 8 selected names into the story file with comments noting the index they hit. Document this script (or the resulting names + indexes) in `apps/showroom/stories/atoms/avatar-initial.stories.tsx` header so a future contributor can re-derive if the palette length changes.

### Anti-Patterns to Avoid

- **Mounting `<CoreProvider>` or `<QueryClientProvider>` globally in `preview.tsx`.** UI-SPEC §Mocked Providers explicitly forbids this. The showroom should crash loudly if a story tries to read query state — that's how we detect future stories that drift from the no-mocks contract.
- **Using `next-themes` ThemeProvider in `preview.tsx`.** Two systems (ThemeProvider + globalTypes decorator) writing to the same `.dark` class race; the toolbar will flicker.
- **Co-locating `*.stories.tsx` in `packages/ui/`.** UI-SPEC §Hard Constraint #7 forbids this — keeps `packages/ui` free of Storybook devDeps.
- **Using `dark:` Tailwind variants inside story render functions** to "fix" a story that looks broken in dark mode. If the atom looks wrong, the *atom* is broken (Phase 2 should be reopened). UI-SPEC §Hard Constraint #5.
- **Importing from `@storybook/preview-api` or `@storybook/test`.** These packages are consolidated into `storybook/preview-api` and `storybook/test` subpaths in v9 [CITED: Storybook 9 MIGRATION.md]. Old import paths still resolve (legacy compat) but will warn or break in v10.
- **Including `@storybook/addon-essentials` in the addons list.** Removed in 9.0; will throw at startup [CITED: same migration doc].
- **Toggling `.dark` on the body or on the story root via `data-` attribute** instead of on `document.documentElement`. Will fail SC#2 (the `bg-sidebar` swatch will not flip — wrong DOM ancestor for the `&:is(.dark *)` selector).
- **Using hex colors or `text-red-500`-style hardcoded Tailwind defaults in the story chrome.** UI-SPEC §Hard Constraint #4 + Phase 1 D-18 contract.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Story development environment | Custom React harness with HMR | Storybook 9 `storybook dev` | 10+ years of polish: per-story isolation, args panel, dark/light toolbar API, addon ecosystem, build-storybook static export. Trying to replicate is months of work. |
| Accessibility scanning | Manual axe-core integration script | `@storybook/addon-a11y` | Addon already wires axe-core to every story render, ships a panel UI with violation locations, supports per-story overrides via `parameters.a11y`. Hand-rolling buys you nothing. |
| Theme switching UI | Custom `<Toolbar>` component with React state | `globalTypes.theme` + decorator | Storybook gives you the toolbar control, persistence across navigation, dynamic title — for free. 8 lines of config vs 80 lines of UI code. |
| Variant matrix layouts | Custom `<Matrix>` component | Plain JSX inside `render` functions | One story = one render function = full control over layout. The "matrix" pattern is just `flex flex-wrap gap-2` over an array — does not need a component. |
| Tailwind class scanning of workspace packages | Glob script that injects classes | `@source` directive in preview.css | Tailwind v4 reads `@source` directly; no script, no build step. [CITED: tailwindcss.com] |
| Test fakes for `onRemove`, `onValueChange` callbacks | Hand-written mocks | `fn()` from `storybook/test` | Built-in spy with auto-cleanup + visible in Actions panel. |
| Font loading in the preview iframe | Manual `<link>` injection | `@fontsource-variable/inter` import | Same package + same import shape as `apps/desktop` — provenance and version pin already managed via catalog. |

**Key insight:** Storybook IS the framework. Every "I'll just build a small ___" instinct is a regression to the world before Storybook existed. The showroom's job is to wire Storybook to the project's existing CSS + atoms — not to invent new Storybook-adjacent abstractions.

---

## Common Pitfalls

### Pitfall 1: Storybook 9 package consolidation breaks `@storybook/preview-api` imports

**What goes wrong:** UI-SPEC §0 (Foundations / Tokens story) and §4 (`SegmentedControl` Default story) suggest using `useArgs` from `@storybook/preview-api`. In Storybook 9, that package no longer exists as a standalone — it's a subpath of the main `storybook` package: `storybook/preview-api`.

**Why it happens:** The package consolidation [CITED: Storybook 9 MIGRATION.md] moved `@storybook/preview-api`, `@storybook/manager-api`, `@storybook/test`, `@storybook/theming`, etc. into `storybook/*`. Imports like `@storybook/preview-api` may still resolve (legacy compat layer), but newly authored stories should use the new subpath.

**How to avoid:** Use `import { useArgs } from "storybook/preview-api"` and `import { fn, expect, within, userEvent } from "storybook/test"`. Update the UI-SPEC reference inline in the story file via a comment.

**Warning signs:** Build warnings about deprecated package paths; future Storybook 10 upgrade fails on these imports.

### Pitfall 2: Wrong `@source` path arithmetic — Tailwind misses class names

**What goes wrong:** `bg-tag-p0` shows up unstyled because Tailwind's tree-shaker didn't see the class in any scanned file.

**Why it happens:** `@source` paths are relative to the CSS file that contains the directive [CITED: tailwindcss.com/docs/detecting-classes-in-source-files], NOT to the project root or the preview.tsx location. From `apps/showroom/.storybook/preview.css`, the path to `packages/ui/components/ui/` is `../../../packages/ui/components/ui/` (three `../` to escape `.storybook` → `showroom` → `apps` to root, then descend).

**How to avoid:**
- Verify path arithmetic by replicating the existing pattern: `apps/desktop/src/renderer/src/globals.css:34-37` uses `../../../../../packages/ui/**/*.tsx` (five levels — desktop nests deeper). Apply the same logic to showroom's shallower nesting.
- Verify by running `pnpm --filter @multica/showroom storybook` and rendering the smoke story — if any swatch is missing a background color, the class wasn't generated.

**Warning signs:** Smoke story renders with all swatches the same color (default `<div>` background) — Tailwind didn't generate the `bg-*` utilities.

### Pitfall 3: Theme toggle decorator on the wrong DOM ancestor — `bg-sidebar` stays transparent in dark mode

**What goes wrong:** Toggling the toolbar control flips Storybook's UI but the story canvas doesn't change. This is the explicit failure mode SC#2 catches.

**Why it happens:** `@custom-variant dark (&:is(.dark *))` resolves only when an ancestor element has class `.dark`. If the decorator toggles `.dark` on the wrong node (e.g., a div inside the story rather than `<html>`), the cascade misfires. `bg-sidebar` light token is `oklch(1 0 0)` (white) and dark token is `oklch(0.24 0.013 250)` (deep forest); if the dark variant doesn't fire, the white shows through and looks "transparent" against a white-ish iframe background.

**How to avoid:**
- Always toggle on `document.documentElement` (the iframe's `<html>` element) — guaranteed ancestor of every story render. Pattern shown in "Pattern 1" above.
- Verify with the smoke story: render `bg-sidebar` swatch + flip the toggle. If it visibly changes, the ancestor is correct. If not, move the class one level up.

**Warning signs:** `bg-sidebar` swatch looks white in dark mode; `bg-card` looks white instead of `oklch(0.24 0.013 250)`; `bg-background` looks white instead of `oklch(0.18 0.012 250)`.

### Pitfall 4: Mounting any Provider in `preview.tsx` triggers env-var crashes

**What goes wrong:** Storybook startup logs scream about missing `NEXT_PUBLIC_API_URL`, `MULTICA_SERVER_URL`, "No QueryClient set", "useWorkspaceId must be used within WorkspaceIdProvider", etc. Failure mode SC#1 catches this.

**Why it happens:** `CoreProvider` from `packages/core/platform/` initializes the API client + auth/workspace stores + WS connection — all of which need env vars and a backend. Mounting it in `preview.tsx` brings the entire production runtime into the iframe.

**How to avoid:**
- Do NOT import or mount `CoreProvider`, `QueryClientProvider`, `NavigationAdapter`, `WorkspaceIdProvider`, or `next-themes`'s `ThemeProvider` in `preview.tsx`.
- The four atoms in scope have ZERO Provider dependencies (verified by reading `packages/ui/components/ui/{tag-chip,accent-bar,avatar-initial,segmented-control}.tsx` — none imports from `@multica/core/*`).
- For future stories that DO need a Provider, mount it as a per-story decorator inside the story file — not globally.

**Warning signs:** Console errors at Storybook startup mentioning env vars or store initialization; story renders empty / errors out.

### Pitfall 5: Forgetting to add the `@source` for `apps/showroom/stories/`

**What goes wrong:** Class names that appear ONLY in story files (e.g., `text-xs text-muted-foreground` for variant labels, `flex flex-wrap gap-2` for matrix layouts) get tree-shaken away. Story chrome looks unstyled.

**Why it happens:** Tailwind scans `@source` paths only. Story files live in `apps/showroom/stories/`, which is NOT inside any package the showroom imports — so without an explicit `@source`, Tailwind has no idea those files exist.

**How to avoid:** Always include `@source "../stories/**/*.{ts,tsx}";` in `preview.css`. Same pattern: `@source "./**/*.tsx"` works for files alongside the CSS, but stories are one level up from `.storybook/`, hence `../stories/`.

**Warning signs:** Story chrome (labels, layout containers) looks raw; only atom-internal classes (which ARE scanned via the `packages/ui/**` source) render correctly.

### Pitfall 6: `apps/showroom` not picked up by Turborepo `typecheck` / `test` task

**What goes wrong:** A typo in `apps/showroom/tsconfig.json` or a missing `typecheck` script in `package.json` means `pnpm typecheck` (which runs `turbo run typecheck`) silently skips the showroom. Issues only surface when CI builds Storybook.

**Why it happens:** Turborepo discovers tasks by reading each workspace package's `package.json` `scripts` block. If `"typecheck"` isn't there, the package is excluded from the typecheck graph.

**How to avoid:** `apps/showroom/package.json` MUST include at minimum:
```json
"scripts": {
  "storybook": "storybook dev -p 6006",
  "build-storybook": "storybook build",
  "typecheck": "tsc --noEmit"
}
```
Optionally `"lint"` if eslint is wired. Running `pnpm typecheck` should now show `@multica/showroom` in the task list.

**Warning signs:** `pnpm typecheck` output doesn't list `@multica/showroom`; CI green even though TypeScript errors exist in story files.

### Pitfall 7: Storybook 9 + React 19.2 — peerDep range says "beta", installed is "stable"

**What goes wrong:** A `pnpm install` warning about "unmet peer dependency: react@^19.0.0-beta" might appear because Storybook 9.1.20's peerDeps were last touched when 19 was in beta.

**Why it happens:** [VERIFIED: `npm view @storybook/react-vite@9.1.20 peerDependencies`] returns `react: ^16.8.0 || ^17.0.0 || ^18.0.0 || ^19.0.0-beta`. Project uses `react@19.2.3` (stable). Per semver, `^19.0.0-beta` does include `19.2.3` [VERIFIED: `semver.satisfies('19.2.3', '...^19.0.0-beta')` = true], so resolution works — but pnpm may show a warning depending on its strictness mode.

**How to avoid:** No action needed. The peer constraint resolves. If pnpm complains, note in commit message that this is a known Storybook 9.1.x peerDep range that's overly conservative.

**Warning signs:** `pnpm install` warns; install does not fail.

---

## Code Examples

Verified patterns from official sources, ready to drop into the implementation.

### `apps/showroom/package.json`

```json
{
  "name": "@multica/showroom",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "storybook": "storybook dev -p 6006",
    "build-storybook": "storybook build -o storybook-static",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "@multica/ui": "workspace:*",
    "@fontsource-variable/inter": "catalog:",
    "react": "catalog:",
    "react-dom": "catalog:"
  },
  "devDependencies": {
    "@multica/tsconfig": "workspace:*",
    "@storybook/addon-a11y": "catalog:",
    "@storybook/addon-docs": "catalog:",
    "@storybook/react-vite": "catalog:",
    "@tailwindcss/vite": "catalog:",
    "@types/react": "catalog:",
    "@types/react-dom": "catalog:",
    "@vitejs/plugin-react": "catalog:",
    "storybook": "catalog:",
    "tailwindcss": "catalog:",
    "typescript": "catalog:",
    "vite": "catalog:"
  }
}
```

### `apps/showroom/tsconfig.json`

```json
{
  "extends": "@multica/tsconfig/base.json",
  "compilerOptions": {
    "jsx": "react-jsx",
    "lib": ["DOM", "DOM.Iterable", "ESNext"],
    "types": ["node"],
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": false,
    "noEmit": true
  },
  "include": [".storybook/**/*", "stories/**/*", "vite.config.ts"]
}
```

### `apps/showroom/vite.config.ts`

```ts
// Source: @tailwindcss/vite + @vitejs/plugin-react usage from existing
// apps/desktop/electron.vite.config.ts (renderer block)
import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"
import tailwindcss from "@tailwindcss/vite"

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    dedupe: ["react", "react-dom"],
  },
})
```

(Storybook's Vite builder picks up this config automatically when present at `apps/showroom/vite.config.ts`. The `@storybook/react-vite` framework merges its own additions on top.)

### `apps/showroom/.storybook/main.ts`

```ts
// CITED: Storybook 9 docs — React Vite framework + addons configuration
// https://storybook.js.org/docs/get-started/frameworks/react-vite
import type { StorybookConfig } from "@storybook/react-vite"

const config: StorybookConfig = {
  framework: {
    name: "@storybook/react-vite",
    options: {},
  },
  stories: ["../stories/**/*.stories.@(ts|tsx)"],
  addons: [
    "@storybook/addon-a11y",
    "@storybook/addon-docs",
  ],
}

export default config
```

### `apps/showroom/.storybook/preview.css`

```css
/* Mirrors apps/web/app/globals.css and apps/desktop/src/renderer/src/globals.css */
@import "tailwindcss";
@import "@multica/ui/styles/tokens.css";
@import "@multica/ui/styles/base.css";

@custom-variant dark (&:is(.dark *));

/* Paths are relative to THIS CSS file (apps/showroom/.storybook/preview.css):
 * - ../../../packages/ui/** → packages/ui (3 levels up to repo root, then descend)
 * - ../stories/** → apps/showroom/stories (1 level up from .storybook) */
@source "../../../packages/ui/**/*.{ts,tsx}";
@source "../stories/**/*.{ts,tsx}";
```

### `apps/showroom/.storybook/preview.tsx`

```tsx
import type { Preview } from "@storybook/react-vite"

// Font loading — mirrors apps/desktop/src/renderer/src/main.tsx
import "@fontsource-variable/inter"
import "@fontsource-variable/inter/wght-italic.css"

// Tailwind + tokens + base styles + @source directives
import "./preview.css"

const preview: Preview = {
  globalTypes: {
    theme: {
      description: "Color theme for stories (mirrors next-themes .dark on apps/web)",
      toolbar: {
        title: "Theme",
        icon: "circlehollow",
        items: [
          { value: "light", title: "Light", icon: "sun" },
          { value: "dark", title: "Dark", icon: "moon" },
        ],
        dynamicTitle: true,
      },
    },
  },
  initialGlobals: {
    theme: "light",
  },
  decorators: [
    (Story, context) => {
      // Toggle .dark on the iframe <html> — same DOM ancestor that
      // Tailwind's `@custom-variant dark (&:is(.dark *))` resolves against.
      // SSR-safe guard for Storybook docs page generation (which may render
      // stories in a Node context where document is undefined).
      if (typeof document !== "undefined") {
        document.documentElement.classList.toggle(
          "dark",
          context.globals.theme === "dark",
        )
      }
      return <Story />
    },
  ],
  parameters: {
    a11y: {
      // CITED: Storybook addon-a11y docs — WCAG ruleset configuration
      // WCAG 2.1 AA = wcag2a + wcag2aa + wcag21a + wcag21aa
      // (Excludes 'wcag2aaa' — that's AAA, not in scope per UI-SPEC.)
      options: {
        runOnly: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"],
      },
    },
    layout: "padded",
  },
}

export default preview
```

### `apps/showroom/stories/foundations/tokens.stories.tsx` (smoke story for SC#2)

```tsx
import type { Meta, StoryObj } from "@storybook/react-vite"

const meta = {
  title: "Foundations / Tokens",
} satisfies Meta

export default meta
type Story = StoryObj

const SURFACE_TOKENS = [
  { className: "bg-background", label: "bg-background" },
  { className: "bg-card", label: "bg-card" },
  { className: "bg-sidebar", label: "bg-sidebar" },
  { className: "bg-muted", label: "bg-muted" },
  { className: "bg-secondary", label: "bg-secondary" },
  { className: "bg-accent", label: "bg-accent" },
] as const

const TAG_TOKENS = [
  { className: "bg-tag-p0", label: "bg-tag-p0" },
  { className: "bg-tag-p1", label: "bg-tag-p1" },
  { className: "bg-tag-p2", label: "bg-tag-p2" },
  { className: "bg-tag-p3", label: "bg-tag-p3" },
] as const

const BRAND_TOKENS = [{ className: "bg-brand", label: "bg-brand" }] as const

function Swatch({ className, label }: { className: string; label: string }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <div className={`h-12 w-12 rounded-md border border-border ${className}`} />
      <span className="text-xs text-muted-foreground">{label}</span>
    </div>
  )
}

export const Surfaces: Story = {
  render: () => (
    <div className="p-6 flex flex-col gap-6">
      <p className="text-xs text-muted-foreground max-w-md">
        Toggle the Theme control in the toolbar. Every surface below must
        visibly change. If <code>bg-sidebar</code> stays transparent in dark
        mode, the dark-class target is wrong.
      </p>
      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold">Surfaces</h2>
        <div className="flex flex-wrap gap-2">
          {SURFACE_TOKENS.map((t) => (
            <Swatch key={t.label} {...t} />
          ))}
        </div>
      </section>
      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold">Tag colors</h2>
        <div className="flex flex-wrap gap-2">
          {TAG_TOKENS.map((t) => (
            <Swatch key={t.label} {...t} />
          ))}
        </div>
      </section>
      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold">Brand</h2>
        <div className="flex flex-wrap gap-2">
          {BRAND_TOKENS.map((t) => (
            <Swatch key={t.label} {...t} />
          ))}
        </div>
      </section>
    </div>
  ),
}
```

### Pattern: Future-story Provider mocking (documented per UI-SPEC §Mocked Providers)

If a future phase adds a story for a component that needs `WorkspaceIdProvider` or a QueryClient, the recommended pattern is **per-story decorator only** — never global:

```tsx
// Hypothetical future story file — illustrative, NOT shipped in Phase 3
import type { Meta, StoryObj } from "@storybook/react-vite"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { WorkspaceIdProvider } from "@multica/views/platform" // hypothetical export

const meta = {
  title: "Views / SomeIssueCard",
  decorators: [
    (Story) => {
      // Fresh QueryClient per render — no cross-story leakage.
      const qc = new QueryClient()
      return (
        <QueryClientProvider client={qc}>
          <WorkspaceIdProvider value="story-fixture-ws-id">
            <Story />
          </WorkspaceIdProvider>
        </QueryClientProvider>
      )
    },
  ],
} satisfies Meta

export default meta
type Story = StoryObj
// ...stories...
```

For Phase 3, NONE of the four atoms requires this — the example is documented for future planners.

---

## State of the Art

| Old Approach | Current Approach (Storybook 9) | When Changed | Impact |
|--------------|--------------------------------|--------------|--------|
| `@storybook/addon-essentials` blanket import | Pull individual addons (`addon-a11y`, `addon-docs`, `addon-controls`, `addon-actions`, `addon-viewport`, `addon-backgrounds`) explicitly. Most are auto-bundled into the core `storybook` package. | Storybook 9.0 (2025) | Smaller addons list in `main.ts`; no more "bag of addons". Some addons (controls, interactions, actions, backgrounds) are now built-in to core and require no entry in the addons array. [CITED: Storybook 9 MIGRATION.md] |
| `import { useArgs } from "@storybook/preview-api"` | `import { useArgs } from "storybook/preview-api"` | Storybook 9.0 | Subpath of main `storybook` package. Old import may still work via legacy compat but is deprecated. |
| `import { fn } from "@storybook/test"` | `import { fn } from "storybook/test"` | Storybook 9.0 | Same — subpath consolidation. |
| `import { userEvent } from "@storybook/testing-library"` | `import { userEvent } from "storybook/test"` | Storybook 8.0 | `@storybook/testing-library` deprecated since 8.0; replaced by consolidated `storybook/test`. |
| CSF 2 (`Template.bind()`, `Default.args = ...`) | CSF 3 (`{ args: {...}, render: () => ... }`) | Storybook 7.0 (2023) — CSF 3 is the standard since | New stories should be authored exclusively in CSF 3. |
| Storybook 8 default theme via legacy `themes` parameter | Storybook 9 `globalTypes.theme` + `initialGlobals.theme` + decorator OR `@storybook/addon-themes` | Storybook 9.0 | API consolidation; `globalTypes` is the documented current shape. |
| `withThemes` decorator on every story manually | Decorator declared once in `preview.tsx` `decorators: [...]` array | Storybook 7.0+ | Single source of truth for decorators that apply to every story. |
| Tailwind v3 `content: [...]` array in `tailwind.config.js` | Tailwind v4 `@source "..."` in CSS + automatic detection | Tailwind v4 (2024) | No JS config needed; `@source` lives in CSS, paths relative to that CSS file. [CITED: tailwindcss.com/docs] |

**Deprecated/outdated:**

- `@storybook/addon-essentials` — REMOVED in 9.0. UI-SPEC already says "NO essentials blanket import" — correct.
- `@storybook/preview-api`, `@storybook/manager-api`, `@storybook/test`, `@storybook/theming` as standalone packages — all consolidated into `storybook/*` subpaths in 9.0.
- CSF 2 — Still works but new stories use CSF 3 (which is what UI-SPEC's examples already show).
- `tailwind.config.js` — Tailwind v4 doesn't require it; everything moves to CSS-side configuration via `@theme`, `@source`, `@custom-variant`. The project already follows this pattern (no `tailwind.config.js` in `apps/web` or `apps/desktop`).

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Storybook 9.1.20 is the appropriate patch to pin (latest 9.x as of 2026-04-25). | Standard Stack | Low — UI-SPEC says "use latest 9.x at install"; if a 9.1.21 ships before plan execution, planner re-checks `npm view storybook@9 version` and pins that. |
| A2 | `@storybook/addon-docs` is needed because UI-SPEC says markdown-style story descriptions are wanted. | Standard Stack | Low — if planner decides Phase 3 doesn't need MDX or `parameters.docs.description.story`, can drop the dep. None of the locked stories explicitly require MDX; addon-docs is currently a "nice to have for future". Recommend keeping to stay aligned with UI-SPEC §main.ts contract. |
| A3 | Hand-rolled `globalTypes.theme` decorator is preferable to `@storybook/addon-themes`. | Pattern 1 | Low — both work. If a future phase finds `withThemeByClassName`'s wrapper-div easier to reason about, swap is one-file change. |
| A4 | Toggling `.dark` on `document.documentElement` is correct for the project's `@custom-variant dark (&:is(.dark *))` rule. | Pattern 1 + Pitfall 3 | Low — VERIFIED by inspecting `apps/web/app/globals.css:8` (`@custom-variant dark (&:is(.dark *))`) and noting that `next-themes` on web sets `class="dark"` on `<html>` (D-15 confirms `attribute="class"` on `<html>`). Same DOM target → guaranteed parity. |
| A5 | The 5 plans suggested in the Summary are the right granularity. | Summary | Low — granularity is `standard` per `.planning/config.json`; 5 plans for a new app workspace is in line with Phase 1's 6 plans and Phase 2's 6 plans. Planner may merge plans 0+1 if comfortable, or split plan 4 by atom. |
| A6 | The `Foundations / Tokens / Surfaces` smoke story is the right "first story" to land before atom stories. | Summary + Code Examples | Low — UI-SPEC §0 explicitly requires this story for SC#2 verification; landing it first gives a smoke gate for plans 1–3 before atom-story work begins. |

**Items NOT assumed (verified):**
- Storybook 9.1.20 peerDeps allow react@19.2.3 — VERIFIED via `npm view` + semver check.
- `storybook/preview-api` and `storybook/test` subpath imports — VERIFIED via Context7 Storybook 9 MIGRATION.md.
- Tailwind v4 `@source` paths are relative to the CSS file — CITED tailwindcss.com docs.
- WCAG 2.1 AA axe ruleset = `["wcag2a","wcag2aa","wcag21a","wcag21aa"]` — CITED Storybook addon-a11y docs.
- `@multica/ui` exports raw `.tsx` via `./components/ui/*` and exposes `./styles/tokens.css`, `./styles/base.css`, `./lib/avatar-color` — VERIFIED in `packages/ui/package.json:11-23`.
- Project uses Tailwind v4 `@custom-variant dark (&:is(.dark *))` — VERIFIED in `apps/web/app/globals.css:8` and `apps/desktop/src/renderer/src/globals.css:7`.
- `@vitejs/plugin-react`, `tailwindcss`, `@tailwindcss/vite` are already in catalog — VERIFIED in `pnpm-workspace.yaml:21-23,40`.

---

## Open Questions

1. **Should `apps/showroom/build-storybook` be wired into `make check`?**
   - What we know: `make check` runs typecheck + tests + Go tests + E2E. Adding a Storybook build step adds ~10–20s.
   - What's unclear: whether the team wants Storybook build failures to block PRs.
   - Recommendation: **Yes, add** — turbo task `build-storybook` invoked by `pnpm build-storybook` (root), which is then either added to `make check` or run separately in CI. Keeps the showroom honest with every PR. Low CI cost, high regression-detection value.

2. **Should the showroom be deployed (e.g., to GitHub Pages / Vercel) for design review?**
   - What we know: `storybook-static/` output is a plain static site.
   - What's unclear: scope of design review process; not in current REQUIREMENTS.
   - Recommendation: **Defer** — out of Phase 3 scope. Add a v2 plan if a stakeholder requests it.

3. **Should story files use `tags: ['autodocs']` to auto-generate docs pages?**
   - What we know: `addon-docs` is included; adding `tags: ['autodocs']` to a meta object makes Storybook generate a Docs page from the component's props + JSDoc.
   - What's unclear: Whether the docs pages add value for a developer-only sandbox.
   - Recommendation: **Skip in v1** — UI-SPEC's per-story contract already lists every story explicitly; auto-generated docs duplicate this. Easy to add later.

4. **Should there be ESLint coverage for `apps/showroom/`?**
   - What we know: Other apps have `eslint.config.mjs`. Story files are JSX/TSX.
   - What's unclear: Whether the existing project ESLint rules (e.g., `no-console`, `no-unused-vars`) would flag legitimate Storybook patterns (like the `function Render(args) {...}` capitalized arrow workaround for `react-hooks/rules-of-hooks`).
   - Recommendation: **Add a minimal ESLint config** that extends the project's shared config (likely `@multica/eslint-config` from `packages/eslint-config/`) and explicitly allows the `Render`-named function pattern for stories. Low effort; aligns with monorepo norms.

5. **What's the expected lifespan of the showroom?**
   - What we know: It's a developer-facing review sandbox for visual + a11y review.
   - What's unclear: Whether the showroom will continue to exist past v1 (or be subsumed by some other tool like Chromatic).
   - Recommendation: **Treat as long-lived.** Out-of-scope per `Out of Scope` table line 152 (Visual Regression / Chromatic deferred to v2+). Plan accordingly — solid foundations, not throwaway.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Storybook + Vite + pnpm | ✓ | (project requires Node 22 per CI) | — |
| pnpm | All package management | ✓ | (project standard) | — |
| Storybook 9 packages on npm | Install | ✓ | `9.1.20` available [VERIFIED] | — |
| `@fontsource-variable/inter` 5.x on npm | Preview iframe font | ✓ | `5.2.8` available [VERIFIED] | — |
| Vite 7 on npm | Builder peer | ✓ | `7.3.2` available [VERIFIED] | — |
| Disk space for Storybook deps | Install | ✓ | (~50MB extra in node_modules) | — |
| Port 6006 (Storybook dev default) | `pnpm storybook` | Likely ✓ | — | Override with `storybook dev -p <other>` if collision with another local service. Web dev runs on 3000, desktop renderer on 5173 — no collision. |

**Missing dependencies with no fallback:** None.

**Missing dependencies with fallback:** None.

The phase is purely an additive workspace package — no new system-level dependencies needed.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | **Storybook 9.1.20 build smoke** (no Vitest/Jest in `apps/showroom`) |
| Config file | `apps/showroom/.storybook/main.ts` |
| Quick run command | `pnpm --filter @multica/showroom build-storybook` |
| Full suite command | `pnpm --filter @multica/showroom build-storybook && pnpm --filter @multica/showroom typecheck` |
| Phase gate | `pnpm typecheck && pnpm --filter @multica/showroom build-storybook` exit 0 + manual smoke (open `pnpm storybook`, toggle theme, check a11y panel) |

**Rationale for not adding Vitest:** The showroom IS the test surface. Stories ARE the tests — a story that doesn't compile fails the build. A story that triggers an a11y violation surfaces in the addon panel during interactive review. Adding Vitest to test the stories themselves would test framework code (Storybook), not project code. Vitest already runs in `packages/ui/` to verify the atoms; the showroom's job is visual review, not unit testing.

**Confidence:** HIGH — this matches the testing model documented in CLAUDE.md "Where to write tests": shared UI components are tested in `packages/views/` (jsdom + RTL), platform-specific wiring lives in apps. The showroom is a third category — a static visual gallery — and the right validation is "does it build".

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| SB-01 | New `apps/showroom` workspace package + Storybook 9 launches | smoke (build) | `pnpm --filter @multica/showroom build-storybook` (exit 0) | ❌ Wave 0 |
| SB-01 | Workspace package picked up by Turborepo | smoke (typecheck graph) | `pnpm typecheck` (output mentions `@multica/showroom`) | ❌ Wave 0 |
| SB-01 | Private package (not published) | static check | `cat apps/showroom/package.json | jq .private` returns `true` | ❌ Wave 0 |
| SB-02 | Storybook starts with zero env-var crashes | manual smoke | `pnpm --filter @multica/showroom storybook` then DevTools console; should be empty | manual |
| SB-02 | No `@multica/core`, no `next/*`, no `react-router-dom` deps | static check | `! grep -E "@multica/core\|next/\|react-router-dom" apps/showroom/package.json` | ❌ Wave 0 (after package.json is written) |
| SB-03 | Tailwind `@source` scans `packages/ui/**` and `stories/**` | smoke (build) | `pnpm --filter @multica/showroom build-storybook` then verify `storybook-static/` index.html serves a CSS file containing `bg-sidebar` rules. Easier: open the smoke story in dev and visually verify swatch renders | manual |
| SB-03 | `bg-sidebar` smoke story renders | manual | Open `Foundations / Tokens / Surfaces`; verify all swatches show color | manual |
| SB-04 | `addon-a11y` panel present and active | manual | Open any atom story; verify "Accessibility" tab shows in the addons panel | manual |
| SB-04 | `addon-themes` OR `globalTypes.theme` toolbar control present | manual | Open any story; verify "Theme" toolbar control with Light/Dark options | manual |
| SB-04 | Stories exist for all four atoms | static check | `ls apps/showroom/stories/atoms/*.stories.tsx | wc -l` returns 4 | ❌ Wave 0 (then ❌ Plan 4) |
| SC#1 | Zero console errors at startup | manual | `pnpm storybook`; DevTools console; expect zero `[error]` and zero warnings about missing env vars / providers | manual |
| SC#2 | Theme toggle flips `bg-sidebar` correctly | manual | Open smoke story; toggle Theme to Dark; verify `bg-sidebar` is deep-forest-green not transparent | manual |
| SC#3 | a11y panel shows zero critical violations on each atom story | manual | For each of the 4 `Atoms / *` stories: open Accessibility tab; expect zero "Violations" entries with impact: critical | manual |
| SC#4 | Stories import real source from `@multica/ui/` | static check | `grep -h "^import" apps/showroom/stories/atoms/*.stories.tsx | grep "@multica/ui/components/ui"` returns one line per story | ❌ Plan 4 |

### Sampling Rate

- **Per task commit:** `pnpm --filter @multica/showroom typecheck` (fast — TS compile check only).
- **Per wave merge:** `pnpm --filter @multica/showroom build-storybook` (slower — full Storybook static build, ~10–30s).
- **Phase gate before `/gsd-verify-work`:**
  1. `pnpm typecheck` (whole repo, includes `@multica/showroom`)
  2. `pnpm --filter @multica/showroom build-storybook` (must exit 0)
  3. Manual: `pnpm --filter @multica/showroom storybook`, open browser:
     - Console is empty (no errors, no warnings about env vars / missing providers).
     - `Foundations / Tokens / Surfaces` story renders all swatches.
     - Theme toolbar control present; toggling flips swatches (especially `bg-sidebar`).
     - Each `Atoms / *` story renders.
     - Accessibility panel shows zero critical violations on every atom story.

### Wave 0 Gaps

The following infrastructure does not exist yet and must land in Wave 0:

- [ ] `apps/showroom/` directory + workspace package skeleton — entire app does not exist
- [ ] `apps/showroom/package.json` — including `private: true`, `storybook` + `build-storybook` + `typecheck` scripts, all `catalog:` deps
- [ ] `apps/showroom/tsconfig.json` — extends `@multica/tsconfig/base.json`, JSX react-jsx, includes `.storybook/` + `stories/`
- [ ] `apps/showroom/vite.config.ts` — `@vitejs/plugin-react` + `@tailwindcss/vite` + `dedupe: ['react','react-dom']`
- [ ] `apps/showroom/.storybook/main.ts` — framework + addons + stories glob
- [ ] `apps/showroom/.storybook/preview.tsx` — globals + decorators + a11y + CSS import + font imports
- [ ] `apps/showroom/.storybook/preview.css` — Tailwind + token chain + custom-variant + @source directives
- [ ] `apps/showroom/stories/foundations/tokens.stories.tsx` — smoke story (REQUIRED for SC#2)
- [ ] `apps/showroom/stories/atoms/{tag-chip,accent-bar,avatar-initial,segmented-control}.stories.tsx` — 4 story files (Plan 4)
- [ ] `pnpm-workspace.yaml` catalog additions: `vite: "^7"`, `storybook: "9.1.20"`, `@storybook/react-vite: "9.1.20"`, `@storybook/addon-a11y: "9.1.20"`, `@storybook/addon-docs: "9.1.20"`, `@fontsource-variable/inter: "^5.2.5"`
- [ ] `turbo.json` task addition: `build-storybook` task block (with appropriate `inputs` + `outputs: ["storybook-static/**"]`)
- [ ] `apps/showroom/README.md` — one paragraph: how to run; how to add a story; the no-mocks rule (UI-SPEC contract)

(Optional, if planner adds linting):
- [ ] `apps/showroom/eslint.config.mjs` — extends `@multica/eslint-config`; allows `function Render(args) {...}` pattern

### Test Files That Will NOT Exist

Per the rationale above, the showroom intentionally has NO Vitest setup, NO test files, NO test runner config. Validation is build smoke + manual review. If a future need arises (e.g., snapshot testing of story renders), revisit at that point.

---

## Project Constraints (from CLAUDE.md)

The following directives from `/Users/steph/dev/multica/CLAUDE.md` constrain Phase 3 and the planner MUST verify compliance:

| Constraint | Source | Phase 3 Application |
|------------|--------|---------------------|
| TypeScript strict mode is enabled; keep types explicit | "Coding Rules" | `tsconfig.json` extends `@multica/tsconfig/base.json` (which has `"strict": true`); story files MUST be typed with `Meta` + `StoryObj` |
| Keep comments in code English only | "Coding Rules" | All `.storybook/*.ts(x)` and story file comments in English |
| Prefer existing patterns/components over introducing parallel abstractions | "Coding Rules" | Use the same Tailwind v4 + token chain as `apps/web` and `apps/desktop`; do NOT introduce a parallel CSS pipeline. Use the same `@vitejs/plugin-react` already in catalog. |
| Do not add compatibility layers, fallback paths, dual-write logic | "Coding Rules" | Theme toggle is `globalTypes` OR `addon-themes` — pick ONE; do not implement both. No "if addon-themes is present use it, else fall back" code. |
| Avoid broad refactors unless required by the task | "Coding Rules" | Don't refactor `apps/web` or `apps/desktop` CSS chains as part of Phase 3 even if minor parity bugs surface — file as Phase 3.x or defer. |
| `packages/core/` — zero react-dom, zero localStorage | "Package Boundary Rules" | Showroom does NOT import from `@multica/core` (UI-SPEC §Hard Constraint #3 already locks this) |
| `packages/ui/` — zero `@multica/core` imports | "Package Boundary Rules" | N/A (showroom is `apps/showroom`, not `packages/ui`); ensures atoms remain Provider-free |
| `packages/views/` — zero `next/*` imports, zero `react-router-dom`, zero stores | "Package Boundary Rules" | Showroom does NOT import these (UI-SPEC §Hard Constraint #3) |
| Prefer shadcn components; install via `pnpm ui:add <component>` | "UI/UX Rules" | Showroom does NOT install shadcn — UI-SPEC §Design System inherits Phase 2's atoms; no new shadcn components in this phase |
| Use shadcn design tokens; avoid hardcoded color values | "UI/UX Rules" | All colors via `bg-tag-p0` / `text-foreground` etc. — UI-SPEC §Hard Constraint #4 already enforces this |
| Tests follow the code, not the app | "Testing Rules" | The atoms have tests in `packages/ui/`; the showroom has NO unit tests because the showroom IS the visual test surface (validation = build smoke + manual review) |
| Conventional commit format: `feat(scope)`, `fix(scope)`, `docs`, etc. | "Commit Rules" | Phase 3 commits use `feat(showroom)`, `chore(showroom)`, `docs(showroom)` scopes |
| Run `make check` after writing/modifying code | "AI Agent Verification Loop" | Plans must include `make check` step before declaring complete; the new `build-storybook` task should ideally be wired into this |

**One potential conflict to flag for planner:** CLAUDE.md "Testing Rules" table maps "Shared UI components" to `packages/views/*.test.tsx`. Phase 3 story files are NOT test files — they're visual fixtures. There is no contradiction: the atoms ARE tested in `packages/ui/components/ui/{name}.test.tsx` (already shipped Phase 2). The showroom is a separate concern (visual gallery), not a test relocation. Plan documentation should make this distinction explicit so a reviewer doesn't ask "where are the showroom tests".

---

## Sources

### Primary (HIGH confidence — verified via Context7 / npm registry / direct file inspection)

- **Context7 `/storybookjs/storybook` — Storybook 9 official docs** — fetched topics:
  - React Vite framework setup (`framework: '@storybook/react-vite'` config shape)
  - `addon-a11y` configuration (preview parameters + WCAG ruleset)
  - `globalTypes` + decorators (theme toolbar control)
  - CSF 3 Component Story Format (Meta + StoryObj + render + args)
  - `useArgs` from `storybook/preview-api`
  - `fn` from `storybook/test`
  - Storybook 9 MIGRATION.md (package consolidation, addon-essentials removal, addon-docs install)
- **`npm view` — package versions verified 2026-04-25:**
  - `storybook@9` → `9.1.20`
  - `@storybook/react-vite@9` → `9.1.20`
  - `@storybook/addon-a11y@9` → `9.1.20`
  - `@storybook/addon-docs@9` → `9.1.20`
  - `@storybook/addon-themes@9` → `9.1.20`
  - `vite@7` → `7.3.2`
  - `@fontsource-variable/inter` → `5.2.8`
  - `@vitejs/plugin-react` → `6.0.1`
  - `@tailwindcss/vite` → `4.2.4`
- **`@storybook/react-vite@9.1.20` peerDeps verified:** `vite: ^5 || ^6 || ^7`, `react: ^16.8.0 || ^17 || ^18 || ^19.0.0-beta`, `storybook: ^9.1.20` — verified `react@19.2.3` satisfies via semver check
- **Direct codebase inspection:**
  - `packages/ui/package.json:11-23` — confirms `exports` map exposes `./components/ui/*`, `./styles/tokens.css`, `./styles/base.css`, `./lib/avatar-color`
  - `packages/ui/styles/tokens.css` — confirms tokens shipped, `@theme inline` bindings for `--color-tag-p0..p3`, `--color-brand`, `--color-sidebar`, etc.
  - `apps/web/app/globals.css` + `apps/desktop/src/renderer/src/globals.css` — confirms canonical CSS chain pattern (Tailwind + tokens.css + base.css + custom-variant + @source)
  - `apps/desktop/src/renderer/src/main.tsx` — confirms fontsource Inter import pattern
  - `apps/desktop/electron.vite.config.ts` — confirms `@vitejs/plugin-react` + `@tailwindcss/vite` Vite config shape
  - `packages/ui/components/ui/{tag-chip,accent-bar,avatar-initial,segmented-control}.tsx` — confirms atoms have ZERO `@multica/core` imports, are Provider-free
  - `pnpm-workspace.yaml:5-43` — confirms catalog entries
  - `turbo.json` — confirms task topology

### Secondary (MEDIUM confidence — Context7 docs but for related capabilities not directly tested)

- **Context7 `/websites/tailwindcss` — Tailwind CSS v4 docs** — fetched topics:
  - `@source` directive (paths relative to CSS file)
  - `@custom-variant dark (&:is(.dark *))` (dark mode override)
  - `@tailwindcss/vite` plugin usage
- **Storybook 9 docs notes on CSF Next** (newer `definePreview` / `preview.meta(...)` syntax) — UI-SPEC and recommendation use the standard `Meta` + `StoryObj` shape; CSF Next is a future-facing optional API and is NOT used in this phase

### Tertiary (LOW confidence — none)

No tertiary-confidence claims. All findings are either Context7-verified, npm-registry-verified, or directly observed in the codebase.

---

## Metadata

**Confidence breakdown:**
- Standard stack: **HIGH** — every package version verified via `npm view`; React 19.2.3 ↔ Storybook 9 peerDep relationship verified via semver
- Architecture: **HIGH** — patterns mirror existing apps; CSS chain verified by direct inspection of `apps/web/app/globals.css` and `apps/desktop/src/renderer/src/globals.css`
- Theme toggle correctness: **HIGH** — `document.documentElement` matches `next-themes`'s web behavior (D-15 confirms `attribute="class"` on `<html>`); `@custom-variant dark (&:is(.dark *))` resolves against any `.dark` ancestor
- Pitfalls: **HIGH** — pitfalls #1, #2, #3 are derived from Context7-verified Storybook 9 docs and Tailwind v4 docs; pitfalls #5, #6 are derived from direct inspection of project's existing CSS chain and `package.json` patterns
- Validation: **HIGH** — build smoke is the documented Storybook deployment gate; manual review is the appropriate test surface for a visual gallery (matches CLAUDE.md "Testing Rules" intent)

**Research date:** 2026-04-25
**Valid until:** 2026-05-25 (30 days for stable, longer-stable foundation packages — Storybook 9.x line is mature and unlikely to ship breaking changes; Tailwind v4 is current major; React 19.2 is stable)

---
