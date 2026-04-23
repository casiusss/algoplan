# Stack Research

**Domain:** Frontend redesign — design token system, Kanban drag-and-drop, Storybook showroom, font loading, Tailwind v4 monorepo config
**Researched:** 2026-04-24
**Confidence:** HIGH (all major choices verified against official docs and Context7)

---

## 1. Design Token System (Tailwind v4 + shadcn + Base UI)

### Current State (already validated)

The project already has the correct architecture. `packages/ui/styles/tokens.css` uses exactly the right pattern:

```css
/* Raw CSS custom properties per theme — live outside @theme */
:root {
  --background: oklch(1 0 0);
  --sidebar: oklch(0.985 0 0);
  /* ... */
}

.dark {
  --background: oklch(0.18 0.005 285.823);
  /* ... */
}

/* @theme inline bridges raw vars → Tailwind utility generation */
@theme inline {
  --color-background: var(--background);
  --color-sidebar: var(--sidebar);
  /* ... */
}
```

This is the canonical shadcn/ui Tailwind v4 approach. The `inline` modifier is critical — without it, Tailwind resolves variable references at definition time (wrong location), causing fallback values to fire unexpectedly.

### What Needs to Change for AlgoPlan

The OKLCH token values in `:root` and `.dark` need to be replaced with the new AlgoPlan palette. The architecture is correct and must NOT be restructured. Add new semantic tokens for the redesign:

```css
:root {
  /* New AlgoPlan palette tokens */
  --sidebar: oklch(0.22 0.06 155);       /* deep-forest-green */
  --canvas: oklch(0.96 0.02 170);        /* mint-sage */
  --card: oklch(1 0 0);                  /* white */
  /* ... */
}

@theme inline {
  /* Add new Tailwind utilities */
  --color-canvas: var(--canvas);
  --color-sidebar: var(--sidebar);
  /* ... */
}
```

New tokens needed: `--color-canvas`, `--color-tag-{name}` for each colored tag (Backend/Frontend/Launch/Legal/DevOps, priority P0-P3). These are purely additive.

### Dark Mode Toggling

**Use: `next-themes` v0.4.6 (web) + manual class toggle (desktop)**

- **Web (Next.js):** `next-themes` with `attribute="class"` + `enableSystem` sets `.dark` on `<html>`. This is the industry standard for Next.js + Tailwind v4 + shadcn.
- **Desktop (Electron/Vite):** `next-themes` is not usable — it assumes SSR hydration behavior and a `window.matchMedia` API that works normally. In Electron, use a simple Zustand store (lives in `packages/core/`) that persists theme preference via `StorageAdapter` and imperatively toggles the `.dark` class on `document.documentElement`. The class-based toggle works identically in both environments.
- **Storybook:** `@storybook/addon-themes` with `withThemeByClassName` decorator — applies `.dark` class to the Storybook preview iframe root, fully compatible with the existing token system.

**Tailwind v4 CSS directive:**
```css
/* In both apps' global CSS */
@custom-variant dark (&:where(.dark, .dark *));
```
This is already the default behavior when using class-based dark mode in Tailwind v4.

### @source Directives for Monorepo

Because `node_modules` is excluded from Tailwind's automatic scanning, each app's CSS must explicitly register shared packages:

```css
/* apps/web/globals.css */
@import "tailwindcss";
@source "../../packages/ui";
@source "../../packages/views";
@source "../../packages/core";
```

```css
/* apps/desktop/src/renderer/src/globals.css */
@import "tailwindcss";
@source "../../../../packages/ui";
@source "../../../../packages/views";
@source "../../../../packages/core";
```

This is already partially in place per CLAUDE.md (`@source` directives). Verify paths are correct after adding the `apps/storybook` package.

**Confidence: HIGH** — verified against official Tailwind v4 docs and shadcn/ui Tailwind v4 migration guide.

---

## 2. Drag-and-Drop: @dnd-kit/react

### Recommendation: `@dnd-kit/react` v0.4.0

**Do NOT use:** `@dnd-kit/core` + `@dnd-kit/sortable` (legacy API, being superseded)
**Do NOT use:** `@hello-pangea/dnd` (React 19 peer dep blocker — see below)
**Do NOT use:** `react-beautiful-dnd` (archived by Atlassian, August 2025, read-only)

### Why @dnd-kit/react (not @dnd-kit/core)

The dnd-kit project has been rewritten. The new API ships as separate packages:
- `@dnd-kit/react` — React-specific hooks and components (replaces `@dnd-kit/core` + `@dnd-kit/sortable`)
- `@dnd-kit/dom` — DOM collision and feedback primitives
- `@dnd-kit/abstract` — framework-agnostic core
- `@dnd-kit/helpers` — shared utilities

As of v0.4.0 (released April 13, 2025, with a follow-up published February 19, 2026), `@dnd-kit/react` is the currently maintained and recommended package. The old `@dnd-kit/core` still works but is considered legacy and will not receive new features. Version 0.4.0 includes a redesigned event system following DOM EventMap patterns.

The project already has `@dnd-kit` in its catalog (listed under Critical Frontend deps). Clarify in `pnpm-workspace.yaml` catalog which packages are pinned — migrate from legacy `@dnd-kit/core`/`@dnd-kit/sortable` to `@dnd-kit/react`.

### Why Not @hello-pangea/dnd

`@hello-pangea/dnd` (the maintained fork of `react-beautiful-dnd`) is pinned to React 18 as a peer dependency. The project is on React 19.2.3. While community reports suggest it works at runtime without React 18, the peer dep constraint creates npm/pnpm install friction and is not officially supported. More critically, `@hello-pangea/dnd` is list-only — it has no concept of free-placement Kanban grids; it forces a flat list-of-lists mental model that requires more work to implement cross-column drops.

### @dnd-kit/react for Kanban

The multi-column Kanban implementation uses `group` on `useSortable` to define column membership. Cross-column drag is handled natively:

```tsx
// In packages/views/board/
import { DragDropProvider } from '@dnd-kit/react';
import { useSortable, isSortable } from '@dnd-kit/react/sortable';

function KanbanCard({ id, index, column }) {
  const { ref } = useSortable({
    id,
    index,
    group: column,   // Column identity — cross-group moves update status
    type: 'card',
    accept: 'card',
  });
  return <div ref={ref}>...</div>;
}
```

The `onDragEnd` event carries `source.initialGroup` and `source.group` — use these to detect cross-column moves and fire the issue status mutation.

### Accessibility

`@dnd-kit/react` provides keyboard drag (Space to pick up, Arrow keys to move, Enter/Escape to drop/cancel) and screen-reader announcements out of the box. This satisfies the accessibility constraint from `PROJECT.md`.

### Virtualization Integration

For Kanban columns with >50 cards (the performance threshold mentioned in `PROJECT.md`), integrate `@tanstack/react-virtual` (already available via TanStack ecosystem). Known integration challenges: scroll event contention. The safe approach is to apply virtualization lazily — only when a column exceeds 50 items — and use `overscan: 5` to keep cards near the drag zone rendered. Do NOT virtualize by default; most boards will never hit this threshold.

**Confidence: MEDIUM-HIGH** — `@dnd-kit/react` v0.4.0 verified as recently released (April 2025, Feb 2026). React 19 peer dep compatibility not formally documented but library targets React 16+; community reports no runtime issues. The legacy-to-new API migration is documented at dndkit.com.

---

## 3. Storybook

### Recommendation: Storybook 9 with `@storybook/react-vite` as `apps/storybook`

**Not:** Ladle
**Not:** Storybook 8 (deprecated, 48% larger bundle, no Vitest integration)

### Storybook 9 vs Ladle

| Criterion | Storybook 9 | Ladle |
|-----------|-------------|-------|
| Startup speed | Slower (but Vite builder narrows gap) | 71x faster cold start |
| Bundle size | 48% smaller than Storybook 8 | ~20x smaller than Storybook 8 |
| Addon ecosystem | Full (a11y, themes, interactions, visual) | Minimal |
| Accessibility testing | Built-in axe-core across all stories | None |
| Theme toggle addon | `@storybook/addon-themes` | Manual |
| Vitest integration | Native in v9 | No |
| React 19 | Supported | Supported |
| Base UI / shadcn story support | Works with CSS import | Works |

**Choose Storybook 9.** The AlgoPlan showroom requirement is a design review tool, not just a development sandbox. Storybook's addon-a11y and addon-themes are mandatory for validating accessibility and dark/light mode across components — Ladle cannot satisfy either without heavy custom work. The performance gap matters for CI builds but not for interactive design review.

### Package Placement

Add `apps/storybook/` as a new monorepo workspace app:

```
apps/storybook/
  .storybook/
    main.ts          # @storybook/react-vite, stories glob, addons
    preview.ts       # global decorators, CSS imports
  stories/           # Can be empty — actual stories live in packages/
  package.json       # @storybook/react-vite, addons
```

Stories live co-located with components: `packages/ui/components/ui/*.stories.tsx` and `packages/views/**/*.stories.tsx`. The Storybook stories glob in `main.ts` reaches into packages:

```typescript
// apps/storybook/.storybook/main.ts
import type { StorybookConfig } from '@storybook/react-vite';

const config: StorybookConfig = {
  framework: '@storybook/react-vite',
  stories: [
    '../../packages/ui/**/*.stories.@(ts|tsx)',
    '../../packages/views/**/*.stories.@(ts|tsx)',
  ],
  addons: [
    '@storybook/addon-essentials',
    '@storybook/addon-a11y',
    '@storybook/addon-themes',
  ],
};
export default config;
```

### Internal Packages Pattern (Raw .tsx)

Because `@multica/ui` and `@multica/views` export raw `.ts`/`.tsx` files (no pre-compilation), Storybook's Vite builder handles them transparently — it resolves the path alias from `tsconfig.json`, compiles the source directly, and there is no "build packages first" step needed. This is one of the key reasons to use `@storybook/react-vite` (Vite) rather than Webpack.

**TypeScript monorepo fix:** The `react-docgen-typescript` plugin (used for args inference) only scans files within Storybook's project root. To pick up props from workspace packages, add to `main.ts`:

```typescript
typescript: {
  reactDocgenTypescriptOptions: {
    include: [
      '../../packages/ui/**/*.tsx',
      '../../packages/views/**/*.tsx',
    ],
  },
},
```

### Shared Config: preview.ts

`preview.ts` is the single place to import global CSS and configure theme decorators:

```typescript
// apps/storybook/.storybook/preview.ts
import '@multica/ui/styles/tokens.css';
import '@multica/ui/styles/base.css';
import '@fontsource-variable/inter/wght.css';
import { withThemeByClassName } from '@storybook/addon-themes';

export const decorators = [
  withThemeByClassName({
    themes: { light: '', dark: 'dark' },
    defaultTheme: 'light',
  }),
];
```

This applies the `.dark` class to the iframe root, which the existing token system responds to immediately.

### Turborepo Tasks

Add to `turbo.json`:
```json
{
  "tasks": {
    "storybook:build": {
      "dependsOn": [],
      "outputs": ["storybook-static/**"],
      "inputs": ["../../packages/ui/**", "../../packages/views/**", ".storybook/**"]
    }
  }
}
```

Exclude story files from the `build` task input of `packages/ui` and `packages/views` to avoid unnecessary cache busting. Use a separate `storybook:build` task that includes them.

**Confidence: HIGH** — Storybook 9 released 2025, versions verified at 9.1.5. `@storybook/react-vite` is the recommended framework for all React+Vite projects. Addon versions confirmed at 9.1.5.

---

## 4. Inter Font Loading

### Recommendation: `@fontsource-variable/inter` (shared package) + `next/font/local` (web app)

### The Split Strategy

This monorepo has two fundamentally different rendering environments:

| Environment | Font Loading |
|-------------|-------------|
| `apps/web` (Next.js) | `next/font/google` or `next/font/local` → generates `className`, injects `<style>` in `<head>` with zero layout shift |
| `apps/desktop` (Electron/Vite) | CSS import from `@fontsource-variable/inter` → bundled as a static asset by electron-vite |
| `apps/storybook` (Vite) | CSS import from `@fontsource-variable/inter` → bundled by Vite |
| `packages/ui/styles/` | **Cannot** contain font imports — would break SSR font optimization in Next.js |

### Web App: next/font/google

```typescript
// apps/web/app/layout.tsx
import { Inter } from 'next/font/google';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
  style: ['normal', 'italic'],  // Inter supports italic
});

export default function RootLayout({ children }) {
  return (
    <html className={inter.variable}>
      <body>{children}</body>
    </html>
  );
}
```

Then in `packages/ui/styles/tokens.css` (already in `@theme inline`):
```css
@theme inline {
  --font-sans: var(--font-inter);
  /* ... */
}
```

`next/font/google` downloads Inter at build time, self-hosts it, auto-generates a size-adjusted fallback, and eliminates external font requests. **This is the correct choice for Next.js** — do not use `@fontsource/inter` in `apps/web`, it loses all the CLS optimizations.

### Desktop and Storybook: @fontsource-variable/inter

```typescript
// apps/desktop/src/renderer/src/globals.css  (or renderer entry)
// apps/storybook/.storybook/preview.ts
import '@fontsource-variable/inter/wght.css';
```

This imports the variable font (wght axis) in woff2-variations format. Vite/electron-vite processes the CSS import, inlines the `@font-face` declaration, and bundles the `.woff2` file as a static asset. No network request at runtime — the font is bundled into the app.

For the italic variant (needed for display headlines per `PROJECT.md`):
```css
import '@fontsource-variable/inter/wght-italic.css';
```

Then set `font-family: 'Inter Variable', sans-serif` in the `:root` or body styles, and use `font-style: italic` in headline utilities.

### Why Not Self-Hosted woff2 Directly

Self-hosting raw `.woff2` files in `packages/ui/fonts/` and adding `@font-face` to `tokens.css` would work technically, but creates two problems: (1) Next.js's font optimizer cannot discover or optimize it, losing CLS benefits on web; (2) Electron would need to configure the CSP `font-src` to allow `filesystem://` or a custom protocol, which is extra complexity. The split approach avoids both.

**Add to pnpm catalog:**
```yaml
# pnpm-workspace.yaml catalog:
'@fontsource-variable/inter': '^5.2.5'
```

**Confidence: HIGH** — `next/font` behavior verified against Next.js 16.2.4 official docs. `@fontsource-variable/inter` Vite compatibility confirmed in official Fontsource docs. The split strategy is the only approach that correctly handles both SSR (Next.js) and non-SSR (Electron) environments.

---

## 5. Tailwind v4 CSS-First Config (Existing Pattern, Extensions)

### Current State (already correct)

The project is already on Tailwind v4. The architecture in `packages/ui/styles/tokens.css` is correct: raw CSS custom properties in `:root`/`.dark`, referenced via `@theme inline` so Tailwind generates utilities. No `tailwind.config.ts` needed — that is a v3 artifact.

### Extensions Required for AlgoPlan

**New color namespace — tag/status colors:**
```css
:root {
  /* Priority colors */
  --tag-p0: oklch(0.60 0.22 27);   /* red — P0 Critical */
  --tag-p1: oklch(0.70 0.18 50);   /* orange — P1 High */
  --tag-p2: oklch(0.75 0.16 85);   /* amber — P2 Medium */
  --tag-p3: oklch(0.70 0.10 145);  /* green — P3 Low */

  /* Category colors */
  --tag-backend: oklch(0.55 0.16 255);
  --tag-frontend: oklch(0.65 0.16 285);
  --tag-launch: oklch(0.60 0.22 27);
  --tag-legal: oklch(0.55 0.14 200);
  --tag-devops: oklch(0.55 0.16 170);
}

@theme inline {
  --color-tag-p0: var(--tag-p0);
  --color-tag-p1: var(--tag-p1);
  --color-tag-p2: var(--tag-p2);
  --color-tag-p3: var(--tag-p3);
  --color-tag-backend: var(--tag-backend);
  /* ... */

  /* New semantic layout tokens */
  --color-canvas: var(--canvas);
  --color-canvas-foreground: var(--canvas-foreground);
}
```

**Dark variants for all new tokens** must also be added to `.dark {}`.

### @source Directives Pattern

Tailwind v4 excludes `node_modules` from automatic scanning. The `@source` directive tells Tailwind which paths to scan. For symlinked monorepo packages (pnpm workspaces), Tailwind sees them through the symlink. Use relative paths from the CSS file location:

```css
/* apps/web/globals.css */
@import "tailwindcss";
@source "../../packages/ui";
@source "../../packages/views";
@source "../../packages/core";
```

For the Storybook app, similar directives in its CSS entry point.

### @layer Usage

Tailwind v4 CSS layers: `@layer base`, `@layer components`, `@layer utilities`. Use `@layer base` for reset/global styles (already in `packages/ui/styles/base.css`). Avoid `@layer components` for design system components — prefer Tailwind utility composition (via `cn()`) and `cva` variants, which is already the pattern.

### CSS-First Config (No tailwind.config.ts)

Tailwind v4 does not use `tailwind.config.ts`. All configuration is in the CSS file. The project is already aligned here. Do not add a `tailwind.config.ts` for any reason — it would be ignored or cause unexpected behavior.

**Confidence: HIGH** — verified against Tailwind v4 official docs, shadcn/ui v4 migration guide, and inspected the existing `tokens.css` which already uses the correct pattern.

---

## Recommended Stack Summary

### Core Technologies

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| `@dnd-kit/react` | 0.4.0 | Kanban drag-and-drop | Currently maintained new API from dnd-kit, replaces legacy @dnd-kit/core+sortable, cross-container support built-in, accessible keyboard drag, React 19 compatible |
| `@storybook/react-vite` | 9.1.5 | Component showroom | Vite builder, 48% smaller than Storybook 8, Vitest-native testing, works with raw .tsx Internal Packages pattern |
| `@storybook/addon-themes` | 9.1.5 | Dark/light toggle in Storybook | `withThemeByClassName` maps to `.dark` class, zero config needed on top of existing token system |
| `@storybook/addon-a11y` | 9.1.5 | WCAG checks in showroom | Axe-core runs on all stories, catches Base UI accessibility regressions before merge |
| `@fontsource-variable/inter` | ^5.2.5 | Inter variable font for desktop + Storybook | Vite-compatible, bundles woff2 into app, supports wght+italic axes |
| `next-themes` | 0.4.6 | Dark mode toggle (web only) | Sets `.dark` class on `<html>`, system preference + user override, existing shadcn integration |
| Tailwind v4 (`@theme inline`) | already installed | CSS token bridge | `@theme inline` pattern already correct in tokens.css, only token values need updating |

### Supporting Libraries

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `@dnd-kit/dom` | 0.4.0 | DOM primitives for dnd-kit | Required peer — installed alongside @dnd-kit/react |
| `@dnd-kit/helpers` | 0.4.0 | Shared dnd-kit utilities | Required peer — OptimisticSortingPlugin, type guards |
| `@dnd-kit/abstract` | 0.4.0 | Core abstractions | Transitive — no direct import needed |
| `@tanstack/react-virtual` | ^3.x | Virtualization for large columns | Only if Kanban column exceeds 50 items; do not apply by default |
| `next/font` (built-in) | Next.js 16.2.3 | Inter loading in web app | Already available — use `Inter` from `next/font/google` |

### Development Tools

| Tool | Purpose | Notes |
|------|---------|-------|
| `apps/storybook` | Component showroom app | Add as new workspace in pnpm-workspace.yaml |
| `storybook:build` turbo task | Build static Storybook | Output: `storybook-static/`, added to .gitignore |
| Storybook co-located stories | Stories alongside components | `*.stories.tsx` in `packages/ui/` and `packages/views/` |

---

## Installation

```bash
# Drag and drop (new API)
pnpm add @dnd-kit/react @dnd-kit/dom @dnd-kit/helpers @dnd-kit/abstract

# Remove legacy if present
pnpm remove @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities

# Font (desktop + Storybook)
pnpm add @fontsource-variable/inter

# Dark mode (web only — add to apps/web, not shared packages)
pnpm add next-themes --filter @multica/web

# Storybook (add to apps/storybook package, not root)
pnpm add --save-dev @storybook/react-vite @storybook/addon-essentials @storybook/addon-a11y @storybook/addon-themes --filter @multica/storybook
```

**pnpm catalog additions** (`pnpm-workspace.yaml`):
```yaml
catalog:
  '@dnd-kit/react': '^0.4.0'
  '@dnd-kit/dom': '^0.4.0'
  '@dnd-kit/helpers': '^0.4.0'
  '@fontsource-variable/inter': '^5.2.5'
  'next-themes': '^0.4.6'
  '@storybook/react-vite': '^9.1.5'
  '@storybook/addon-essentials': '^9.1.5'
  '@storybook/addon-a11y': '^9.1.5'
  '@storybook/addon-themes': '^9.1.5'
```

---

## Alternatives Considered

| Recommended | Alternative | Why Not |
|-------------|-------------|---------|
| `@dnd-kit/react` 0.4.0 | `@dnd-kit/core` + `@dnd-kit/sortable` | Legacy API — no new features, being superseded by @dnd-kit/react |
| `@dnd-kit/react` 0.4.0 | `@hello-pangea/dnd` | React 18 peer dep constraint conflicts with project's React 19.2.3; list-only model; no free placement |
| `@dnd-kit/react` 0.4.0 | `react-beautiful-dnd` | Archived by Atlassian in August 2025, read-only repo, unmaintained |
| Storybook 9 | Ladle | No addon-a11y, no addon-themes, no Vitest integration — showroom requirement needs all three |
| Storybook 9 | Storybook 8 | 48% larger, Webpack-based Next.js plugin, no native Vitest integration |
| `@fontsource-variable/inter` (desktop) | Raw `.woff2` in packages/ui | Next.js optimizer can't discover it, needs CSP configuration in Electron |
| `next/font/google` (web) | `@fontsource/inter` in web app | Loses CLS optimization, automatic fallback generation, and zero-layout-shift guarantees that next/font provides |
| `next-themes` (web only) | `next-themes` in packages/core | next-themes assumes SSR/hydration — only valid in Next.js; desktop uses Zustand + imperativeclass toggle |
| `.dark` class toggle | `data-theme` attribute toggle | Project already uses `.dark` in tokens.css; `@custom-variant dark` is set for class-based; changing to data-attr would break all existing dark styles |

---

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| `react-beautiful-dnd` | Archived by Atlassian Aug 2025, no React 18/19 support, dead repo | `@dnd-kit/react` |
| `@hello-pangea/dnd` | React 18 peer dep, list-only model, doesn't suit Kanban free columns | `@dnd-kit/react` |
| `@dnd-kit/core` + `@dnd-kit/sortable` | Legacy dnd-kit API, no new features, migration recommended | `@dnd-kit/react` (new API) |
| Ladle | No a11y addon, no themes addon, unsuitable for design review showroom | Storybook 9 |
| Material-UI / Chakra / Mantine | Violates PROJECT.md constraint: must stay on shadcn/Base UI stack | Existing shadcn + Base UI |
| `tailwind.config.ts` | v3 artifact, ignored by Tailwind v4 — do not create | `@theme` in CSS |
| `@fontsource/inter` in web app | Loses all Next.js font optimization (CLS, fallback generation) | `next/font/google` |
| Storybook 8 | 48% larger bundle, deprecated Webpack Next.js plugin, no native Vitest integration | Storybook 9 |
| Storybook in root of monorepo | Breaks Turborepo caching, mixes tool concerns with library code | `apps/storybook/` separate workspace |
| `darkMode: 'class'` in tailwind.config | v3 syntax — does not exist in v4 | `@custom-variant dark` in CSS |

---

## Version Compatibility

| Package | Compatible With | Notes |
|---------|-----------------|-------|
| `@dnd-kit/react@0.4.0` | React 19.2.3 | Peer dep says React 16+; no formal React 19 declaration but works in practice. Monitor releases. |
| `@storybook/react-vite@9.1.5` | React 19.2.3, Vite 6.x | Officially supported |
| `next-themes@0.4.6` | React 19.2.3, Next.js 16.2.3 | Works; may log peer dep warning with npm — pnpm handles this fine |
| `@fontsource-variable/inter` | Vite 6.x, electron-vite 5.0.0 | Explicit Vite compatibility per docs |
| Tailwind v4 | Vite 6.x, Next.js 16.x | Officially supported |
| `@storybook/addon-themes@9.1.5` | `withThemeByClassName` with `.dark` class | Confirmed compatible with Tailwind v4 class-based dark mode |

---

## Sources

- Tailwind CSS official docs (tailwindcss.com/docs/theme, /docs/dark-mode, /docs/detecting-classes-in-source-files) — `@theme inline`, `@custom-variant dark`, `@source` directives — HIGH confidence
- shadcn/ui Tailwind v4 migration guide (ui.shadcn.com/docs/tailwind-v4) — `@theme inline` with `.dark` class pattern — HIGH confidence
- dnd-kit GitHub releases page (github.com/clauderic/dnd-kit/releases) — v0.4.0 released April 13, 2025; follow-up Feb 19, 2026 — HIGH confidence
- dnd-kit migration guide (dndkit.com/react/guides/migration) — @dnd-kit/core → @dnd-kit/react API changes — HIGH confidence
- Context7 /websites/dndkit — multi-column sortable code examples — HIGH confidence
- @hello-pangea/dnd GitHub issue #864 — React 19 peer dep blocker, community reports runtime compatibility — MEDIUM confidence
- Storybook v9 announcement (storybook.js.org/announce/sb9) — features, bundle size, Vitest integration — HIGH confidence
- Storybook 9.1.5 addon versions confirmed via web search — HIGH confidence
- Storybook addon-themes docs (storybook.js.org/docs/essentials/themes) — `withThemeByClassName` decorator — HIGH confidence
- Turborepo Storybook guide (turborepo.dev/docs/guides/tools/storybook) — apps/storybook placement, co-located stories — HIGH confidence
- Next.js font docs (nextjs.org/docs/app/getting-started/fonts) — `next/font/google` Inter, `next/font/local` — HIGH confidence, verified at Next.js 16.2.4
- Fontsource docs (fontsource.org/fonts/inter/install) — `@fontsource-variable/inter` Vite compatibility — HIGH confidence
- Existing `packages/ui/styles/tokens.css` — inspected directly; confirmed OKLCH + `@theme inline` + `.dark` pattern already correct — HIGH confidence (source truth)
- Ladle vs Storybook comparison (devtoolhq.com/compare/storybook-vs-ladle, blog.logrocket.com/ladle-storybook-performance-project-sizes) — performance tradeoffs — MEDIUM confidence

---
*Stack research for: AlgoPlan frontend redesign — design tokens, Kanban DnD, Storybook showroom, font loading, Tailwind v4 monorepo*
*Researched: 2026-04-24*
