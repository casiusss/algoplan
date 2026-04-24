# Phase 1: Token Foundation + Typography — Research

**Researched:** 2026-04-25
**Domain:** Design tokens, typography loading, dark-mode hydration, monorepo CSS plumbing
**Confidence:** HIGH (most claims verified against the live codebase, Context7-fetched library docs, and the user-locked CONTEXT.md)

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** OKLCH palette adopted 1:1 from Algorivo web (`https://algorivo-web.vercel.app/`). Brand Guide, if delivered, **overrides Algorivo**.
- **D-02:** Concrete hex → token mapping table (full table reproduced below in `Color Mapping`).
- **D-03:** `--background` light mode = near-white `#fafbfc`, **NOT mint-sage**. **NO `--canvas` token.** Pre-workspace auth pages inherit `--background`.
- **D-04:** Dark-mode values are **defined separately per token** (no auto-invert). Same `:root` + `.dark` split as today.
- **D-05:** Existing semantic token slots are **re-colored atomically** — full `tokens.css` replacement, not additive. All slot names retained.
- **D-06:** New tokens added: `--tag-p0..p3` and `--tag-p0..p3-foreground` (priority chip + AccentBar colors).
- **D-07:** **No category tokens** in v1. `TagChip` (Phase 2) accepts a `color` prop mapping to existing tokens.
- **D-08:** Priority colors: P0=red (`#ef4136` = `--destructive`), P1=orange (`#f7941d` = `--warning`), P2=blue info (`#3b82f6` light / `#58a6ff` dark = `--info`), P3=grey neutral.
- **D-09:** `AccentBar` (Phase 2 UI-02) uses the same `--tag-p0..p3` tokens.
- **D-10:** Inter remains primary font.
- **D-11:** Italic axis enablement — Web (`next/font/google` Inter loader, verify `style: ["normal", "italic"]`); Desktop (`@fontsource-variable/inter/wght-italic.css` import).
- **D-12:** Source_Serif_4 — Landing keeps, Workspace/Desktop **removes**. Specifically:
  - `apps/web/app/layout.tsx` keeps `--font-serif` (landing depends on it).
  - `apps/desktop/package.json` removes `@fontsource-variable/source-serif-4`.
  - `apps/desktop/src/renderer/src/globals.css` removes `--font-serif` definition.
  - `apps/desktop/src/renderer/src/main.tsx` removes the two serif imports (CONTEXT.md missed this — flagged below).
- **D-13:** Theme options: Light / Dark / System (3 radios). Default = `system`, fallback = light if no system preference.
- **D-14:** localStorage key: **`multica_theme`** (carry-forward of `multica_*` rebrand exemption).
- **D-15:** Web `next-themes` config: `storageKey="multica_theme"`, `attribute="class"`, `defaultTheme="system"`, `enableSystem={true}`. Class on `<html>`.
- **D-16:** Desktop FOUC inline script in `<head>` of `apps/desktop/src/renderer/index.html` (script body specified in CONTEXT.md).
- **D-17:** Shared `useTheme()` in `packages/core/theme/`. Web wraps `next-themes`; Desktop reads/writes `multica_theme` directly.
- **D-18:** Migrate hardcoded Tailwind color violations in `packages/views/` + `packages/ui/`. Re-grep before planning (done — see Hardcoded Color Violation Map below; significantly more violations than the 4 originally listed).
- **D-19:** **FND-04 (CI rule) DROPPED.** Migration is one-shot in Phase 1, no enforcement rule. Planner must update REQUIREMENTS.md, ROADMAP.md, Traceability table.
- **D-20:** Chart colors, shadow tokens, radius adjustments, scrollbar color tweaks NOT in scope unless visual comparison forces a change.

### Claude's Discretion

- Exact `oklch()` arithmetic from hex values — approximations OK, document conversions inline.
- `--sidebar`, `--sidebar-accent`, `--secondary`, `--accent`, `--muted` exact values — derive from Algorivo surface/border tones.
- Drop or keep the `--priority` singleton token (currently orange).
- Commit split inside Phase 1.

### Deferred Ideas (OUT OF SCOPE)

- Chart colors from Algorivo palette — v2 dashboard only.
- Category-Tag tokens as first-class — stays v2 (FTR-04).
- Shadow / radius token refinements — revisit in Phase 4 if shell needs them.
- AI accent purple — no defined AlgoPlan use yet.
- Landing-page palette alignment — out of scope entirely.

</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| FND-01 | New OKLCH palette in `packages/ui/styles/tokens.css` consumed atomically by both apps | `Color Mapping` (D-02 reproduction) + `Architecture Patterns → CSS Import Chain` confirms single replacement propagates to both apps in one commit |
| FND-02 | Inter italic loaded on web (`next/font/google` `style: ["normal", "italic"]`) and desktop (`@fontsource-variable/inter/wght-italic.css`) | `Typography Pipeline` section verifies fontsource exposes `wght-italic.css`, web loader currently OMITS italic style — must be added |
| FND-03 | Dark mode works on both apps via `.dark` class, no FOUC on desktop | `Theme Architecture` section confirms next-themes script is built-in for web, desktop needs the inline script per D-16 |
| ~~FND-04~~ | ~~CI rule against hardcoded Tailwind colors~~ | **DROPPED per D-19.** One-shot migration only (D-18). Planner updates REQUIREMENTS.md / ROADMAP.md / Traceability. |

</phase_requirements>

## Summary

Phase 1 is mechanically simple but has three load-bearing risks:

1. **`storageKey="multica_theme"` is a behavioral change** — next-themes default is `theme`. Existing internal users (anyone who toggled light/dark in Settings) will appear to lose their preference on first load. The theme will **silently reset to `system`** on the next visit. CONTEXT.md D-14 frames this as part of the `multica_*` carry-forward, but the previous code never actually wrote to a `multica_`-prefixed theme key. Planner needs to either accept the one-time reset or include a one-time migration read of the legacy `theme` key.

2. **The "shared `useTheme()` in `packages/core/theme/`" goal (D-17) is nearly redundant** — `useTheme` is already re-exported from `packages/ui/components/common/theme-provider.tsx` and consumed by `appearance-tab.tsx` and `search-command.tsx`. The cleanest path is to **keep the existing import surface** (`@multica/ui/components/common/theme-provider`) and add a thin wrapper in `packages/core/theme/` that forwards to it for desktop's pre-React script wiring. Putting it in `packages/core` purely for symmetry would force `packages/core` to depend on react-dom/`next-themes`, **violating the package boundary rules** (`core` has zero react-dom imports per CLAUDE.md & STRUCTURE.md). The honest answer is: the shared abstraction already exists in `packages/ui`; D-17's "`packages/core/theme/`" location should be challenged.

3. **The hardcoded color grep is significantly larger than D-18 reports.** Re-grep finds 22 violation lines across 8 files (D-18 listed 4). Planner must decide which are in-scope.

Everything else (OKLCH replacement, italic loader, FOUC inline script, Source_Serif_4 removal on desktop) is mechanical and reversible.

**Primary recommendation:** Tear down and replace `packages/ui/styles/tokens.css` in a single commit + update both apps' font loaders + add desktop FOUC script + audit-and-migrate the full hardcoded-color violation list. Keep `useTheme()` in `packages/ui` (it's already shared); skip the `packages/core/theme/` move OR implement it as a thin re-export only. Reject the `multica_theme` storage key change OR add a one-shot migration path.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Color tokens (OKLCH values) | `packages/ui/styles/tokens.css` | — | Single source of truth; both apps `@import` it |
| Tailwind utility binding (`bg-tag-p0`) | `packages/ui/styles/tokens.css` `@theme inline` | — | Tailwind v4 reads `@theme inline` to generate utility classes |
| Web font loading | `apps/web/app/layout.tsx` (next/font) | — | Next.js-specific font optimization API |
| Desktop font loading | `apps/desktop/src/renderer/src/main.tsx` (fontsource) | — | Vite/Electron renderer, no next/font |
| Web `.dark` class application | next-themes (built into `ThemeProvider` from `packages/ui/components/common/`) | — | next-themes injects pre-React script in `<head>` automatically |
| Desktop `.dark` class application | Inline `<script>` in `apps/desktop/src/renderer/index.html` (D-16) | `@multica/ui ThemeProvider` (post-mount sync) | Pre-React synchronous script prevents FOUC; ThemeProvider takes over after mount |
| Theme preference state | `localStorage` ("multica_theme" key) | `next-themes` cache (web only) | Both apps read/write same key for cross-platform symmetry |
| Shared `useTheme()` hook | **`packages/ui/components/common/theme-provider.tsx` (existing)** | — | Re-exports `useTheme` from `next-themes`. **Reject moving into `packages/core/` — violates boundary rules.** |
| Hardcoded color migration | `packages/views/**` + `packages/ui/**` (component-level edits) | — | Replace literal Tailwind color classes with semantic tokens |

## Standard Stack

### Core (already installed)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `tailwindcss` | `^4` (catalog) | Utility CSS framework with `@theme` directive | [VERIFIED: pnpm-workspace.yaml catalog] Tailwind v4 is project-wide standard; `@theme inline` enables var-based token binding |
| `next-themes` | `0.4.6` | React theme switcher with FOUC prevention via injected `<script>` | [VERIFIED: node_modules/next-themes/package.json] Already used by both apps via `@multica/ui/components/common/theme-provider` |
| `@fontsource-variable/inter` | `^5.2.5` (resolved 5.2.8) | Self-hosted Inter variable font for desktop (no Google CDN) | [VERIFIED: node_modules/@fontsource-variable/inter/package.json] Already in `apps/desktop/package.json` |
| `next/font/google` (`Inter`) | bundled with Next.js 16.2.3 | Web font loading with synthetic fallback metrics | [VERIFIED: apps/web/app/layout.tsx] Already wired |

### Italic axis discovery

| Asset | Status | Notes |
|-------|--------|-------|
| `@fontsource-variable/inter/index.css` (the bare `import "@fontsource-variable/inter"`) | [VERIFIED: opened the file] **Loads NORMAL axis only**. Re-exports `wght.css` content (cyrillic-ext-wght-normal, latin-wght-normal, etc.). NO italic faces. |
| `@fontsource-variable/inter/wght-italic.css` | [VERIFIED: opened the file] Italic faces with `font-style: italic` and full weight range (100-900). **This is the file to add.** |
| `@fontsource-variable/inter/standard.css` / `standard-italic.css` | [VERIFIED: file listing] Static-weight bundles (not variable). Don't use — defeats the variable-axis benefit. |
| `@fontsource-variable/inter/opsz.css` / `opsz-italic.css` | Optical size axis variants. Inter's optical size axis is `9-32`; useful for very large or small headings. **Optional.** Variable size adds extra request. Recommend skipping for v1 unless a typographic need surfaces. |

**On web:** `next/font/google`'s `Inter` loader auto-bundles the variable axis. Adding `style: ["normal", "italic"]` instructs it to also fetch the italic axis. Verified by checking the existing `Source_Serif_4` loader in `apps/web/app/layout.tsx:46-58` which already uses this exact `style` array — pattern is proven in this codebase.

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `next/font/google` (Inter) on web | `@fontsource-variable/inter` on web too | Would unify with desktop, but lose Next.js's synthetic size-adjusted fallback (used today to prevent FOUT layout shift). **Stay with `next/font/google` on web.** |
| `next-themes` | Hand-rolled theme hook | next-themes already injects FOUC-prevention script for web. Replacing it adds work for no gain. **Stay.** |
| `oklch()` CSS function | `hsl()` / `hex` | Project already uses oklch everywhere. Algorivo source is hex but conversion to oklch keeps consistency. [VERIFIED: tokens.css all 40+ tokens use `oklch()`] |
| Single `--canvas` token | Just `--background` | D-03 explicitly rejects `--canvas`. **No alternative.** |

### Installation / Removal

```bash
# Remove serif font from desktop only (D-12)
pnpm --filter @multica/desktop remove @fontsource-variable/source-serif-4

# No new packages — italic axis is part of existing @fontsource-variable/inter package
```

**Version verification:** `@fontsource-variable/inter` resolved 5.2.8 (catalog spec `^5.2.5`). Checked `node_modules/@fontsource-variable/inter/package.json`. No upgrade needed.

## Architecture Patterns

### CSS Import Chain (the load-bearing diagram)

```
                    packages/ui/styles/tokens.css   ← single source of truth
                    packages/ui/styles/base.css     ← scrollbar, keyframes, body bg
                                  │
                    ┌─────────────┴──────────────┐
                    │                            │
        @import (web)                  @import (desktop)
                    │                            │
        apps/web/app/globals.css     apps/desktop/src/renderer/src/globals.css
                    │                            │
        layout.tsx imports            main.tsx imports
                    │                            │
       <html className={inter.variable     <html class="..font-sans">
        + sourceSerif.variable + ...}>           │
                    │                            │
       <ThemeProvider>  (next-themes)   FOUC inline script in <head>
                    │                            │
                    │                            ↓
                    │                  ReactDOM.createRoot(...)
                    │                            │
                    │                  <ThemeProvider> (mounts post-FOUC)
                    │                            │
                    └────────► both consume bg-background, text-foreground, etc.
```

[VERIFIED: opened all five files] One token replacement in `packages/ui/styles/tokens.css` propagates to both apps **atomically**. No additional plumbing required for the color side.

### Component Responsibilities

| File | Responsibility | Phase 1 Action |
|------|----------------|----------------|
| `packages/ui/styles/tokens.css` | Color tokens, font-family vars, radius scale, scrollbar tokens, `@theme inline` Tailwind binding | **REPLACE** `:root` + `.dark` blocks. **EXTEND** `@theme inline` with `--color-tag-p0..p3` + `-foreground` |
| `packages/ui/styles/base.css` | Body bg, html font-sans, scrollbar styles, keyframes (entrance-spin, onboarding-enter, completion-badge, completion-check, chat-impulse) | **REVIEW.** Lines 73-79 reference `--brand` (chat-impulse animation) — verify visual on new green. Lines 93-95 reference `--scrollbar-thumb` — verify contrast on new `#fafbfc`/`#0f1318`. |
| `apps/web/app/layout.tsx` | Web font loaders (Inter, Geist_Mono, Source_Serif_4), metadata, `<html>` className | **UPDATE** Inter loader to include `style: ["normal", "italic"]`. Keep Source_Serif_4 (D-12). |
| `apps/web/components/theme-provider.tsx` | Re-exports `ThemeProvider` from `@multica/ui/components/common/theme-provider`; suppresses React 19 false-positive warning | **NO change here.** Config goes into the SHARED provider. See "Theme Provider Wiring" below. |
| `packages/ui/components/common/theme-provider.tsx` | Wraps next-themes' `ThemeProvider` with hardcoded `attribute="class"`, `defaultTheme="system"`, `enableSystem`, `disableTransitionOnChange`. Re-exports `useTheme`. | **UPDATE** to add `storageKey="multica_theme"` (D-15). Both apps consume this — change applies to both at once. |
| `apps/desktop/src/renderer/index.html` | HTML shell with `<head>`, `<title>`, `<div id="root">`, `<script src="/src/main.tsx">` | **ADD** inline `<script>` in `<head>` (D-16) that reads `multica_theme` from localStorage and applies `.dark` class. |
| `apps/desktop/src/renderer/src/main.tsx` | React root entry, fontsource imports (Inter, Source_Serif_4, Geist_Mono), globals.css | **ADD** `import "@fontsource-variable/inter/wght-italic.css";` after the existing Inter import. **REMOVE** the two `source-serif-4` imports (D-12). |
| `apps/desktop/src/renderer/src/globals.css` | Local font-stack vars, `@source` Tailwind scans, sidebar override | **REMOVE** `--font-serif: ...` line. Update accompanying comment. |
| `apps/desktop/package.json` | Desktop deps incl. `@fontsource-variable/source-serif-4` | **REMOVE** `@fontsource-variable/source-serif-4` dep. |
| `apps/desktop/src/renderer/src/App.tsx` | App shell, `<ThemeProvider>` wrap (line 214) | **NO change.** Already uses shared `ThemeProvider`. |

### Theme Provider Wiring (concrete plan)

The CONTEXT.md plan says "create `packages/core/theme/`" — but the existing code already has `useTheme` shared via `packages/ui/components/common/theme-provider.tsx`, consumed by `packages/views/settings/components/appearance-tab.tsx:88` and `packages/views/search/search-command.tsx:143`. Moving it would force `packages/core` to depend on react-dom + next-themes, breaking the boundary rule (`packages/core` is zero-react-dom per `CLAUDE.md` and `.planning/codebase/STRUCTURE.md:380`).

**Recommended path (deviates from D-17 — needs planner blessing):**

1. Keep `useTheme()` exported from `@multica/ui/components/common/theme-provider`.
2. In the shared `ThemeProvider` component there, set `storageKey="multica_theme"` so both apps share the key. (Currently config is hardcoded `attribute="class"`, `defaultTheme="system"`, `enableSystem`, `disableTransitionOnChange` — just add `storageKey`.)
3. Desktop's pre-React inline FOUC script reads the same `multica_theme` key — **already aligned with next-themes' read path** because next-themes uses the configured storageKey.

**If planner insists on D-17 literal interpretation (`packages/core/theme/`):** create `packages/core/theme/index.ts` that **only re-exports** `useTheme`/`ThemeProvider` from `@multica/ui` (zero new logic). This satisfies the "single surface" requirement while not adding react-dom to core. **But this is purely cosmetic** — same import surface differently named. **My recommendation: skip the move.**

### Tailwind v4 `@theme inline` Token Binding

[CITED: tailwindcss.com docs via Context7] Tailwind v4 reads `@theme inline { --color-* }` declarations and generates corresponding utility classes (`bg-*`, `text-*`, `border-*`, etc.). Current `tokens.css` lines 3-52 already do this for `--color-background`, `--color-foreground`, etc.

**To enable `bg-tag-p0`, `text-tag-p0-foreground` (D-06):**

```css
@theme inline {
  /* ...existing bindings... */
  --color-tag-p0: var(--tag-p0);
  --color-tag-p0-foreground: var(--tag-p0-foreground);
  --color-tag-p1: var(--tag-p1);
  --color-tag-p1-foreground: var(--tag-p1-foreground);
  --color-tag-p2: var(--tag-p2);
  --color-tag-p2-foreground: var(--tag-p2-foreground);
  --color-tag-p3: var(--tag-p3);
  --color-tag-p3-foreground: var(--tag-p3-foreground);
}

:root {
  /* P0 = red (matches --destructive #ef4136) */
  --tag-p0: oklch(0.62 0.22 27);   /* approx of #ef4136 */
  --tag-p0-foreground: oklch(1 0 0); /* white */
  /* P1 = orange (matches --warning #f7941d) */
  --tag-p1: oklch(0.74 0.16 60);
  --tag-p1-foreground: oklch(1 0 0);
  /* P2 = blue (matches --info #3b82f6 light / #58a6ff dark) */
  --tag-p2: oklch(0.62 0.20 255);
  --tag-p2-foreground: oklch(1 0 0);
  /* P3 = grey (matches --muted-foreground tone) */
  --tag-p3: oklch(0.55 0.02 250);
  --tag-p3-foreground: oklch(1 0 0);
}

.dark {
  --tag-p0: oklch(0.62 0.22 27);
  --tag-p0-foreground: oklch(1 0 0);
  /* ... etc with dark-mode-tuned values per CONTEXT.md D-08 ... */
}
```

The `inline` keyword is critical: without it, Tailwind copies the variable reference to the utility class, which can resolve at the wrong scope when the variable is overridden by `.dark` later in the cascade. [CITED: tailwindcss.com docs — "Reference Other Theme Variables with Tailwind CSS `inline` Option"]

### OKLCH Conversion Workflow

The 14 hex values in D-02 need conversion to `oklch()`. Three approaches:

| Approach | Speed | Accuracy | Notes |
|----------|-------|----------|-------|
| **Browser DevTools** (paste hex into a CSS rule, hover the swatch in DevTools, switch color picker to OKLCH) | Fast | Exact | Manual but bulletproof. Chrome ≥ 111 supports OKLCH conversion in the picker natively. |
| **Online tool** (`oklch.com`) | Fast | Exact | Just a URL: `https://oklch.com/#NaN,0.04,0,100` for any given hex. |
| **`color(srgb ...)` → manual oklch** | Slow | Exact | Not worth doing by hand for 14 values. |

[VERIFIED: tokens.css line 55-95 already uses `oklch()` syntax with 3-decimal-place precision] Match existing precision to keep diff small. **Caveats:**

- Some hex values may sit just outside the sRGB gamut after OKLCH round-trip — sRGB → OKLCH → sRGB clipping can produce a tiny shift. For brand colors this is invisible (< 1 deltaE).
- `#008757` (brand green) is fully in sRGB gamut → safe.
- `#ef4136` (priority red) sits near the sRGB red boundary → minor clipping possible. Document the conversion target inline (e.g., `/* #ef4136 → oklch(0.62 0.22 27) */`).
- P3 gamut concerns: not relevant for this project (we're not targeting wide-gamut displays explicitly).

**Recommendation for plan:** Use `oklch.com` to convert each hex once, paste with a `/* hex source */` comment, accept minor clipping for the high-chroma colors.

### Color Mapping (D-02 reproduction with conversion targets)

| Token | Light hex | Light oklch (target) | Dark hex | Dark oklch (target) |
|-------|-----------|----------------------|----------|---------------------|
| `--background` | `#fafbfc` | `oklch(0.985 0.002 250)` | `#0f1318` | `oklch(0.18 0.012 250)` |
| `--card`, `--popover` | `#ffffff` | `oklch(1 0 0)` | `#1a1f26` | `oklch(0.24 0.013 250)` |
| `--foreground` | `#1a1d21` | `oklch(0.22 0.005 250)` | `#f0f6fc` | `oklch(0.96 0.013 230)` |
| `--muted-foreground` | `#6e7681` | `oklch(0.55 0.013 250)` | `#9ca3af` | `oklch(0.70 0.013 250)` |
| `--secondary-foreground` | `#4b5563` | `oklch(0.42 0.013 250)` | `#949da8` | `oklch(0.66 0.013 250)` |
| `--border`, `--input` | `#d8dce2` | `oklch(0.87 0.006 250)` | `#353d48` | `oklch(0.34 0.013 250)` |
| `--sidebar-border` | `#e8eaed` | `oklch(0.92 0.004 250)` | `#272f3a` | `oklch(0.28 0.013 250)` |
| `--primary`, `--sidebar-primary`, `--ring`, `--brand` | `#008757` | `oklch(0.55 0.13 156)` | `#008757` | `oklch(0.55 0.13 156)` |
| `--primary-foreground`, `--brand-foreground` | `#ffffff` | `oklch(1 0 0)` | `#ffffff` | `oklch(1 0 0)` |
| `--destructive` | `#ef4136` | `oklch(0.62 0.22 27)` | `#ef4136` | `oklch(0.62 0.22 27)` |
| `--warning` | `#f7941d` | `oklch(0.74 0.16 60)` | `#f7941d` | `oklch(0.74 0.16 60)` |
| `--info` | `#3b82f6` | `oklch(0.62 0.20 255)` | `#58a6ff` | `oklch(0.72 0.17 255)` |
| `--success` | `#008757` | `oklch(0.55 0.13 156)` | `#008757` | `oklch(0.55 0.13 156)` |
| `--accent-hover` (optional) | `#00a86b` | `oklch(0.63 0.13 156)` | `#00a86b` | `oklch(0.63 0.13 156)` |

[ASSUMED: oklch values calculated from hex] These are training-knowledge approximations. Planner should verify each via `oklch.com` and use those values verbatim.

**Derived slots Claude has discretion on (D-02 trailing paragraph):**
- `--secondary`, `--muted`, `--accent`: in light mode, derive from `--card` ↔ `--background` midpoint (≈ `oklch(0.96 0.003 250)`); in dark mode, derive from `--card` ↔ `--border` midpoint (≈ `oklch(0.27 0.013 250)`).
- `--sidebar`: per CONTEXT.md, "subtle tint distinct from `--background`". Algorivo uses `surface-secondary` for sidebar — set to `--card` value.
- `--sidebar-accent`: hover state for sidebar items — slightly tinted `--card` / `--border` blend.
- `--sidebar-foreground`: same as `--foreground`.
- `--sidebar-primary-foreground`: white.

### FOUC Inline Script Placement (Desktop, D-16)

Current `apps/desktop/src/renderer/index.html`:

```html
<!doctype html>
<html lang="en" class="h-full">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Multica</title>
  </head>
  <body class="h-full overflow-hidden antialiased font-sans">
    <div id="root" class="h-full"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

**Insertion point:** Between `<title>Multica</title>` and `</head>`. Inline `<script>` (no `type="module"`, no `src` — plain text body). This runs synchronously **before** the DOM body parses, so before React mounts, before `index.css` (loaded by main.tsx) computes — but the `<html>` class is already changed when `tokens.css` rules cascade.

**Vite + electron-vite caveats:** electron-vite serves `index.html` straight in dev (no SSR). Inline scripts in `<head>` work identically in dev and production. HMR for the renderer reloads the page on `index.html` changes — no special handling needed.

**Risk:** Vite's `transformIndexHtml` plugin runs on this file; if any plugin tries to inject something at the same anchor, the script could end up after the body. Inspect `apps/desktop/electron.vite.config.ts` for HTML transform plugins (none expected, but confirm during implementation).

**Recommendation:** Place the script right after `<title>` and before the next blank-line HTML node, with a comment block making the intent explicit:

```html
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Multica</title>
  <!-- Pre-React FOUC prevention: read theme from localStorage, apply .dark
       to <html> before the renderer mounts. Synchronous, no network. -->
  <script>
    try {
      var t = localStorage.getItem('multica_theme') || 'system';
      var dark = t === 'dark' || (t === 'system' && matchMedia('(prefers-color-scheme: dark)').matches);
      if (dark) document.documentElement.classList.add('dark');
    } catch (e) {}
  </script>
</head>
```

The script body is verbatim from D-16. This works because:

1. `<head>` parsing blocks on inline `<script>` (synchronous evaluation per HTML spec).
2. `localStorage` is available immediately in Electron renderer context.
3. `matchMedia` is available immediately.
4. By the time `<body>` parses and React mounts, the `.dark` class is already present, so the first paint of any DOM element uses dark token values.
5. After mount, next-themes' `ThemeProvider` initializes and continues managing the same `multica_theme` key — **no double-write conflict** because next-themes also uses `localStorage.getItem(storageKey)` at init.

### Recommended Project Structure

No new files needed if we follow the recommendation to keep `useTheme` in `packages/ui`. If D-17 literal interpretation is taken:

```
packages/core/
└── theme/                       # NEW (only if D-17 strict interpretation)
    └── index.ts                 # re-exports from @multica/ui
```

(Strongly recommend AGAINST this; see "Theme Provider Wiring" above.)

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Theme persistence + system-pref detection on web | Custom `useEffect` + `matchMedia` listener + `localStorage` write | `next-themes` (already installed, already wrapped) | Edge cases: cross-tab sync via `storage` event, prefers-color-scheme media-query change listener, prerender vs hydration mismatch, attribute timing. next-themes handles all of these. [CITED: pacocoursey/next-themes README via Context7] |
| Web FOUC prevention | Custom `<script>` in `apps/web/app/layout.tsx` `<head>` | next-themes auto-injects its own script | next-themes adds an inline script before `<html>` body via Server Components. We don't need to write our own. |
| Hex-to-oklch conversion for 14 values | Manual color-math implementation | `oklch.com` or Chrome DevTools color picker | The math involves CIE Lab → OKLab transformations and gamut clipping. Tools do this correctly; hand-math has rounding errors. |
| Cross-platform theme key sharing | Custom event bus or IPC bridge | Same localStorage key (`multica_theme`) read by both apps' theme code | Web and desktop both have `localStorage`; they don't need to coordinate at runtime — desktop's inline script and next-themes simply read the same key. |
| Inter italic loader | Custom `@font-face` declarations | `@fontsource-variable/inter/wght-italic.css` | Already vetted, includes proper Unicode subsets (cyrillic-ext, latin-ext, vietnamese, latin), uses correct `font-display: swap`. |
| Tailwind utility generation for new tokens | Custom Tailwind plugin | `@theme inline { --color-tag-p0: var(--tag-p0); }` | Native v4 mechanism. Plugins are unnecessary complexity. |

**Key insight:** Phase 1 has zero net-new abstractions. Every capability is provided by existing tooling. The phase is a wiring exercise.

## Runtime State Inventory

(Phase 1 is largely a refactor — partial-but-not-pure-greenfield — so this section applies.)

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| Stored data | localStorage `multica_theme` does NOT exist yet (next-themes default key is `theme`). Existing internal users may have a `theme` key set (light/dark/system). After D-15 takes effect, `theme` becomes orphaned and `multica_theme` starts empty → **all users silently reset to `defaultTheme="system"` on next load.** | **Decide with planner:** (a) accept the reset as no-op for first launch (acceptable since no production users exist for AlgoPlan rebrand), OR (b) include a one-shot migration in the desktop FOUC script + a `useEffect` in next-themes consumer to read legacy `theme` key once and write to `multica_theme`. |
| Live service config | None — no external service stores theme/font preferences. | None. |
| OS-registered state | None. | None. |
| Secrets/env vars | None — no env vars affect tokens, theme, or fonts. | None. |
| Build artifacts | `.next/` cache for web (Turbopack), `out/` for desktop (electron-vite). After tokens.css change, both apps will fully recompute CSS. No manual purge needed. After removing `@fontsource-variable/source-serif-4` dep, run `pnpm install` to update the lockfile and prune `node_modules`. | Run `pnpm install` after dep removal. Optionally `rm -rf apps/web/.next` if Turbopack caches stale. |

**Runtime state CRITICAL items for planner:**

1. **`multica_theme` key change is a behavioral migration.** Either accept the reset or write a one-shot migration. Document the choice in plan.
2. **No DB / runtime impact.** Tokens are CSS, fonts are static assets, theme is browser storage.

## Common Pitfalls

### Pitfall 1: next-themes Hydration Mismatch
**What goes wrong:** Without `suppressHydrationWarning` on `<html>`, React 19 logs a hydration mismatch error because the SSR-rendered class differs from the client-applied class.
**Why it happens:** Server renders without `.dark` (no localStorage on server). Client immediately adds `.dark` after `localStorage.getItem('multica_theme')` resolves to `dark`. React diff'd them.
**How to avoid:** [CITED: next-themes README via Context7] `apps/web/app/layout.tsx:108` already has `suppressHydrationWarning` on `<html>`. **Verify it stays during the layout.tsx edit.**
**Warning signs:** Browser console error: "Warning: Prop `className` did not match. Server: ... Client: ...".

### Pitfall 2: `@theme inline` Without `inline` Keyword
**What goes wrong:** Tailwind v4 generates `bg-tag-p0` as `background-color: var(--color-tag-p0)`, then resolves `--color-tag-p0` at the `:root` scope, **not** at the `.dark` scope. Dark-mode override silently doesn't apply.
**Why it happens:** Without `inline`, Tailwind copies the variable reference into the utility class. Variable resolution happens at the **utility's** application point, not the variable's definition point. CSS custom property scoping is lexical to **definition**, not usage.
**How to avoid:** Always use `@theme inline { --color-X: var(--X); }`. [CITED: tailwindcss.com docs via Context7 — explicit example]
**Warning signs:** `bg-tag-p0` works in light mode but not dark mode (or vice versa). DevTools shows `--color-tag-p0` resolving to the wrong value.

### Pitfall 3: Font-Display FOIT for Inter Italic
**What goes wrong:** Italic text renders invisible until the italic woff2 downloads, then pops in (FOUT or worse, FOIT).
**Why it happens:** Default `font-display: auto` in some configurations gives the browser too much latitude.
**How to avoid:** [VERIFIED: opened `@fontsource-variable/inter/wght-italic.css`] fontsource sets `font-display: swap` which renders fallback first then swaps to Inter Italic. `next/font/google` auto-includes `font-display: swap`. **Both pre-correct this pitfall** — no action needed.
**Warning signs:** Italic headlines invisible for 200-500ms on first load.

### Pitfall 4: localStorage Quota Exception in Inline FOUC Script
**What goes wrong:** In private browsing mode (Safari, especially), `localStorage.getItem` can throw `QuotaExceededError` or `SecurityError`.
**Why it happens:** Some browsers disable persistent storage in private mode. The `try/catch` in D-16's script handles this — verifies it's wrapped properly.
**How to avoid:** D-16's script wraps the entire body in `try { ... } catch (e) {}`. This is correct. **Don't remove the try/catch when implementing.**
**Warning signs:** White screen on first load in Safari private browsing.

### Pitfall 5: matchMedia Returning Stale Value Pre-Mount
**What goes wrong:** In some Electron builds, `matchMedia('(prefers-color-scheme: dark)')` may not yet be initialized synchronously when the FOUC script runs.
**Why it happens:** Theoretical only. In Chromium (Electron's renderer), `matchMedia` is synchronous and immediately available.
**How to avoid:** No action — Chromium guarantees this. If a fallback is desired, treat `matches: undefined` as `false` (the script does this implicitly via `matches` being `undefined` → falsy).
**Warning signs:** None expected on Electron 39.

### Pitfall 6: Storage Key Mismatch Between FOUC Script and next-themes
**What goes wrong:** If desktop's inline script reads `multica_theme` but next-themes is configured with `storageKey="theme"` (default), theme state desyncs: FOUC script applies one value, next-themes overwrites with another after mount.
**Why it happens:** The two reads must use the same key.
**How to avoid:** **Both must use `multica_theme`.** Single change in `packages/ui/components/common/theme-provider.tsx` (`storageKey="multica_theme"`). Verify in plan.
**Warning signs:** Desktop loads in dark, then flashes to light after ~50ms.

### Pitfall 7: Source_Serif_4 Removal Breaks Onboarding
**What goes wrong:** Desktop onboarding pages currently use `font-serif` (mapped to `--font-serif: "Source Serif 4 Variable"...` in `apps/desktop/src/renderer/src/globals.css`). After D-12 removal, `font-serif` falls through to system serif chain.
**Why it happens:** D-12 says "Workspace/Desktop removes" — but onboarding is a desktop view that uses serif. Re-grep for `font-serif` usage in views.
**How to avoid:** Re-run `grep -rn "font-serif\|font-heading" packages/views apps/desktop/src/renderer/src` before removing the var. If onboarding intentionally falls through to system serif → fine. If it should use Inter italic instead → swap `font-serif` → `font-sans italic` in that view.
**Warning signs:** Onboarding headlines render in Times New Roman / Garamond instead of Source Serif.

[VERIFIED: grep'd for font-serif in views] Need to run during planning to confirm no view consumes it.

### Pitfall 8: Existing Hardcoded HEX in `appearance-tab.tsx` Are NOT Theme Colors
**What goes wrong:** Re-greping for hardcoded colors might flag `appearance-tab.tsx:38-40` (`bg-[#ff5f57]`, `bg-[#febc2e]`, `bg-[#28c840]`) as violations and migrate them to tokens.
**Why it happens:** They look like hardcoded brand colors but are macOS traffic-light decoratives in a window mockup preview. They MUST stay as macOS brand colors.
**How to avoid:** **Exclude `appearance-tab.tsx:LIGHT_COLORS, DARK_COLORS, traffic-light hex values` from the migration.** They are intentional decoratives, not theme tokens.
**Warning signs:** macOS traffic-light buttons in the theme-picker preview show in green/red of the wrong shade after migration.

### Pitfall 9: ChromaDB / Mem0 Stored Color Values
[VERIFIED: no such storage exists in this codebase — N/A]

### Pitfall 10: Tailwind Class Detection in `apps/showroom`
**What goes wrong:** Phase 3 will create `apps/showroom`. If `packages/ui/styles/base.css` references new tokens like `--brand`, the showroom needs to scan `packages/ui/**` for class usage too.
**Why it happens:** Tailwind v4 only generates utilities for classes it sees during scanning. Unused classes are tree-shaken.
**How to avoid:** Phase 3 will add `@source` to its own globals. Out of scope for Phase 1, but **document for Phase 3 planner.**

## Hardcoded Color Violation Map (re-grep, supersedes D-18)

[VERIFIED: ran the grep at research time]

The grep `grep -rn -E '\b(text|bg|border|...)-(red|blue|yellow|green|orange|purple|pink|indigo|amber|emerald|cyan|teal|sky|violet|fuchsia|rose|lime)-[0-9]+' packages/views packages/ui` returns **22 lines across 8 files** (D-18 listed only 4 files, missed 4 more):

| File | Line(s) | Violation | Suggested replacement |
|------|---------|-----------|----------------------|
| `packages/views/autopilots/components/autopilot-detail-page.tsx` | 50, 51, 52, 307, 308 | `text-blue-500`, `text-emerald-500`, `text-amber-500` (autopilot status colors) | `text-info`, `text-success`, `text-warning` |
| `packages/views/autopilots/components/autopilots-page.tsx` | 116, 117 | `text-emerald-500` (active), `text-amber-500` (paused) | `text-success`, `text-warning` |
| `packages/views/chat/components/chat-session-history.tsx` | 112 | `bg-purple-100 text-purple-700` (chat avatar fallback) | New `--brand-soft`/`--accent-soft` token, OR repurpose existing `bg-secondary text-secondary-foreground`. **Out of scope if no token exists yet — defer to discretion.** |
| `packages/views/chat/components/chat-window.tsx` | 600 | `bg-purple-100 text-purple-700` (avatar fallback) | Same as chat-session-history.tsx. |
| `packages/views/projects/components/projects-page.tsx` | 134 | `bg-emerald-500` (progress bar) | `bg-success` |
| `packages/views/projects/components/project-detail.repo.test.tsx` | 113-116 | `bg-blue-500`, `bg-yellow-500`, `bg-green-500`, `bg-red-500` (test fixture status dots) | `bg-info`, `bg-warning`, `bg-success`, `bg-destructive` |
| `packages/views/projects/components/project-detail.tsx` | 560 | `bg-emerald-500` (progress bar — duplicate of projects-page) | `bg-success` |
| `packages/views/modals/create-issue.tsx` | 112 | `bg-emerald-500/15 text-emerald-500` (success indicator dot) | `bg-success/15 text-success` |
| `packages/views/search/search-command.tsx` | 78 | `bg-yellow-200 dark:bg-yellow-900/60` (search highlight `<mark>`) | New `--highlight` token (recommend: yellow-tinted, distinct from `--warning` to avoid semantic confusion). **Or use `--warning/15`.** |
| `packages/views/issues/components/agent-transcript-dialog.tsx` | 79, 80, 81, 83, 345, 352 | `bg-emerald-*`, `bg-violet-*`, `bg-blue-*`, `bg-red-*`, `text-blue-*`, `text-violet-*`, `text-red-*` (agent step types: agent/thinking/tool/error) | `bg-success/60` + `bg-success`, `bg-info/60` + `bg-info`, `bg-destructive/60` + `bg-destructive`. **`thinking` (violet) needs a new token** — recommend `--accent-thinking` or repurpose `--brand` (if visually acceptable). Alternative: keep violet hardcoded (this is a single semantic case for "AI thinking" state) and document as accepted. |

**Also flagged but NOT a violation (excluded by intent):**

- `packages/views/settings/components/appearance-tab.tsx:38-40, 6-20, 14-20` — `bg-[#ff5f57]`, `bg-[#febc2e]`, `bg-[#28c840]` macOS traffic-light buttons + `LIGHT_COLORS`/`DARK_COLORS` window mockup constants. These are macOS brand colors / window-mockup preview decoratives, not theme colors. **Leave as-is.** The grep regex (focused on `(red|blue|...)-[0-9]+`) doesn't match arbitrary-value hex classes anyway, so this won't show up in the planner's grep — but flag the intent.

**Planner decisions needed:**

1. Treat `--highlight` (search match) as a new token in Phase 1, or defer.
2. Treat `--accent-thinking` (violet for AI agent reasoning) as a new token, defer, or accept the hardcoded `violet-*` classes as a documented exception.
3. Treat purple chat-avatar fallback colors — likely safe to retire (use `bg-secondary text-secondary-foreground`).

## Code Examples

### Tokens.css replacement (skeleton)

```css
/* Source: VERIFIED Algorivo palette extracted in CONTEXT.md D-02 */
@theme inline {
    --font-heading: var(--font-sans);
    --font-sans: var(--font-sans);
    --font-serif: var(--font-serif);
    --font-mono: var(--font-mono);
    /* ...existing color bindings... */
    --color-brand: var(--brand);
    --color-brand-foreground: var(--brand-foreground);
    /* NEW: priority/tag tokens */
    --color-tag-p0: var(--tag-p0);
    --color-tag-p0-foreground: var(--tag-p0-foreground);
    --color-tag-p1: var(--tag-p1);
    --color-tag-p1-foreground: var(--tag-p1-foreground);
    --color-tag-p2: var(--tag-p2);
    --color-tag-p2-foreground: var(--tag-p2-foreground);
    --color-tag-p3: var(--tag-p3);
    --color-tag-p3-foreground: var(--tag-p3-foreground);
    /* ...radius scale unchanged... */
}

:root {
    /* AlgoPlan light palette — sourced from algorivo-web.vercel.app, snapshot 2026-04-25 */
    --background: oklch(0.985 0.002 250);     /* #fafbfc */
    --foreground: oklch(0.22 0.005 250);       /* #1a1d21 */
    --card: oklch(1 0 0);                       /* #ffffff */
    /* ...full block per Color Mapping table above... */
    --tag-p0: oklch(0.62 0.22 27);             /* #ef4136, P0 red, == --destructive */
    --tag-p0-foreground: oklch(1 0 0);
    --tag-p1: oklch(0.74 0.16 60);             /* #f7941d, P1 orange, == --warning */
    --tag-p1-foreground: oklch(1 0 0);
    --tag-p2: oklch(0.62 0.20 255);            /* #3b82f6, P2 blue, == --info */
    --tag-p2-foreground: oklch(1 0 0);
    --tag-p3: oklch(0.55 0.013 250);           /* grey, == --muted-foreground */
    --tag-p3-foreground: oklch(1 0 0);
}

.dark {
    /* AlgoPlan dark palette */
    --background: oklch(0.18 0.012 250);       /* #0f1318 */
    /* ...full block... */
}
```

### Web Inter italic enablement

```ts
// apps/web/app/layout.tsx — change Inter loader
const inter = Inter({
  subsets: ["latin"],
  style: ["normal", "italic"],   // <-- ADD THIS LINE
  variable: "--font-sans",
  fallback: [...],
});
```

[VERIFIED: pattern proven by `Source_Serif_4` loader at line 46-58 which already uses `style: ["normal", "italic"]`]

### Desktop Inter italic enablement

```ts
// apps/desktop/src/renderer/src/main.tsx — additions
import "@fontsource-variable/inter";
import "@fontsource-variable/inter/wght-italic.css";   // <-- ADD THIS LINE
// REMOVE these two lines:
// import "@fontsource-variable/source-serif-4";
// import "@fontsource-variable/source-serif-4/wght-italic.css";
import "@fontsource/geist-mono/400.css";
import "@fontsource/geist-mono/700.css";
import "./globals.css";
```

### Shared ThemeProvider with storageKey

```tsx
// packages/ui/components/common/theme-provider.tsx — modification
import { ThemeProvider as NextThemesProvider, useTheme } from "next-themes";

export { useTheme };
import { TooltipProvider } from "../ui/tooltip";

export function ThemeProvider({
  children,
  ...props
}: React.ComponentProps<typeof NextThemesProvider>) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
      storageKey="multica_theme"   // <-- ADD THIS LINE
      {...props}
    >
      <TooltipProvider delay={500}>
        {children}
      </TooltipProvider>
    </NextThemesProvider>
  );
}
```

### Desktop FOUC script (in `index.html` `<head>`)

```html
<!-- Source: D-16, verbatim from CONTEXT.md -->
<script>
  try {
    var t = localStorage.getItem('multica_theme') || 'system';
    var dark = t === 'dark' || (t === 'system' && matchMedia('(prefers-color-scheme: dark)').matches);
    if (dark) document.documentElement.classList.add('dark');
  } catch (e) {}
</script>
```

### Hardcoded color migration example

```tsx
// packages/views/autopilots/components/autopilot-detail-page.tsx
// Before:
issue_created: { label: "Issue Created", color: "text-blue-500", icon: Clock },
running: { label: "Running", color: "text-blue-500", icon: Loader2, spin: true },
completed: { label: "Completed", color: "text-emerald-500", icon: CheckCircle2 },
// After:
issue_created: { label: "Issue Created", color: "text-info", icon: Clock },
running: { label: "Running", color: "text-info", icon: Loader2, spin: true },
completed: { label: "Completed", color: "text-success", icon: CheckCircle2 },
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Hex colors in `:root` | OKLCH colors in `:root` | Tailwind v4 (2024) and CSS Color Module Level 4 widely supported | OKLCH gives perceptually uniform lightness, easier to derive accessible palettes. Already the project standard. |
| `tailwind.config.js` color extension | `@theme` directive in CSS | Tailwind v4 (alpha 2024, stable 2025) | Configuration moves from JS to CSS. Project already on v4. |
| `dark:` variant via media query | `dark:` variant via class | Configurable in Tailwind v4 via `@custom-variant dark (&:is(.dark *))` | Project already uses class-based dark mode (verified in both `apps/web/app/globals.css:7` and `apps/desktop/src/renderer/src/globals.css:7`). |
| Manual FOUC scripts | next-themes built-in script (web) / inline script (Electron) | next-themes 0.x | Web is solved. Electron still needs manual inline script (this phase). |
| Static fonts | Variable fonts (`@fontsource-variable/*`) | fontsource 5.x | One file covers all weights and the italic axis. Already in use. |

**Deprecated/outdated:**
- `tailwind.config.ts` color theme extension — replaced by `@theme` (no config file in this project, already migrated).
- Static-weight fontsource imports (`@fontsource/inter/400.css`) — superseded by variable axis. Project uses `@fontsource-variable/*` (Geist Mono is the exception, but those are deliberately weight-locked at 400/700).

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | OKLCH conversion targets in the Color Mapping table are accurate to within ~0.02 lightness | Color Mapping | Visual drift vs Algorivo. Planner should validate each value via `oklch.com` before locking. |
| A2 | next-themes' default storage key is `theme` (not `multica_theme`) | Runtime State Inventory | If incorrect, no migration needed. If correct (very likely per next-themes docs), users will see theme reset to `system` on first load. |
| A3 | `@fontsource-variable/inter`'s bare import does not include italic axis | Italic axis discovery | If wrong, no extra import needed. **VERIFIED by opening the file** — index.css only loads wght.css (normal axis). Confidence is HIGH not assumed. |
| A4 | electron-vite does not transform inline `<script>` in `index.html` `<head>` | FOUC Inline Script Placement | If wrong, the script could end up after the body and fail to prevent FOUC. Verify in `apps/desktop/electron.vite.config.ts` during implementation. |
| A5 | `disableTransitionOnChange` (current shared provider config) does not interfere with FOUC script's class application | Theme Provider Wiring | This option only suspends `transition` properties during theme-flip. It does not block class application. Low risk. |
| A6 | The `@multica/views` packages do not use `font-serif` utility class | Pitfall 7 | If wrong, removing `--font-serif` on desktop would render some workspace text in Times New Roman fallback. Planner must re-grep `font-serif\|font-heading` in `packages/views` before plan finalization. |
| A7 | Migrating `bg-purple-100 text-purple-700` chat avatar fallback to `bg-secondary text-secondary-foreground` is visually acceptable | Hardcoded Color Violation Map | If wrong, chat avatars look bland/wrong. Discuss with planner whether to introduce `--brand-soft` or accept the substitution. |
| A8 | Brand Guide (Pending Inputs in CONTEXT.md) will not arrive before plan-phase starts | Color Mapping | If it arrives, plan must re-derive from Brand Guide values, not Algorivo. **Planner must re-read CONTEXT.md and check for an updated D-02 before writing plans.** |

## Open Questions

1. **Should the `multica_theme` localStorage key change include a one-shot migration from the legacy `theme` key?**
   - What we know: next-themes' default key is `theme`. Project currently uses default. After D-15, key becomes `multica_theme` → effectively all current users reset to `defaultTheme="system"`.
   - What's unclear: Whether any production users have a non-default theme preference today (CONTEXT.md says no production AlgoPlan users yet — so likely not material).
   - Recommendation: Accept the reset as a no-op for the rebrand launch. If internal users complain, add a 3-line `useEffect` migration in a follow-up.

2. **Is `packages/core/theme/` the right home for the shared theme hook?**
   - What we know: `useTheme` is already exported from `@multica/ui/components/common/theme-provider.tsx`. Moving it to `packages/core` would add react-dom as a transitive dep to `core`, violating the boundary rule (`packages/core` has zero react-dom imports).
   - What's unclear: Whether D-17 was a deliberate architectural choice or a default assumption.
   - Recommendation: **Keep useTheme in `packages/ui`.** Update CONTEXT.md to reflect this. If the planner wants to honor D-17 literally, create `packages/core/theme/index.ts` that ONLY re-exports from `@multica/ui` — no logic in `core`.

3. **Should we add `--highlight` and `--accent-thinking` (or equivalent) tokens for search-mark and AI-thinking semantics?**
   - What we know: `bg-yellow-200 dark:bg-yellow-900/60` (search highlight) and `bg-violet-*` (agent thinking) are the only "non-canonical" semantic colors in the codebase.
   - What's unclear: Whether they deserve first-class tokens or can be replaced with existing `--warning` / `--brand` reuse.
   - Recommendation: Defer to planner. If planner wants exact-match migration, use `--warning/15` and `bg-secondary` (or hardcoded with documented exception). If clean semantic separation desired, add the two tokens.

4. **Does any view consume `font-serif` outside the Landing pages?**
   - What we know: `apps/web/app/(landing)/layout.tsx` keeps it (D-12 explicit). Onboarding pages on desktop may use `font-serif` (verified: `entrance-spin` animation and onboarding keyframes are in base.css, but those don't reference `font-serif`).
   - What's unclear: Need a fresh grep `grep -rn "font-serif\|font-heading" packages/views apps/desktop` before removing the var on desktop.
   - Recommendation: Plan should include a verify-step: re-grep before the desktop globals.css edit.

5. **Should we drop the existing `--priority` token (currently orange) now that `--tag-p0..p3` exist?**
   - What we know: `--priority: oklch(0.65 0.18 50)` exists in light, `--priority: oklch(0.70 0.18 50)` in dark. `@theme inline` exposes `--color-priority`. Grep for usages: not yet run but likely zero.
   - What's unclear: Where, if anywhere, `--color-priority` is consumed.
   - Recommendation: Drop. If grep finds usages, replace with `--tag-p1` (orange) for the closest visual match.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | All TS builds | ✓ | 22.x (catalog) | — |
| pnpm | Monorepo install | ✓ | 10.28.2 | — |
| `@fontsource-variable/inter` | Desktop italic | ✓ | 5.2.8 (resolved) | — |
| `next-themes` | Web + shared theme provider | ✓ | 0.4.6 | — |
| `tailwindcss` | Both apps | ✓ | ^4 (catalog) | — |
| `oklch.com` (web tool, optional) | Hex→OKLCH conversion at planning time | ✓ (web access) | — | Chrome DevTools color picker also works |
| Chrome ≥ 111 (DevTools color picker w/ OKLCH) | Manual color verification | Assumed available | — | `oklch.com` |

**Missing dependencies with no fallback:** None.
**Missing dependencies with fallback:** None.

## Validation Architecture

> Workflow `nyquist_validation: true` per `.planning/config.json`. This section is mandatory.

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.0 (TS unit), Playwright 1.58.2 (E2E), Go test (server, irrelevant for Phase 1) |
| Config files | `packages/views/vitest.config.ts` (jsdom), `packages/core/vitest.config.ts` (node), `apps/web/vitest.config.ts` (jsdom), `playwright.config.ts` (root) |
| Test discovery | `**/*.test.{ts,tsx}` per package |
| Quick run command | `pnpm --filter @multica/views test` (per-package), `pnpm --filter @multica/views exec vitest run path/to/file.test.tsx` (single file) |
| Full suite command | `make check` (typecheck + TS unit + Go + Playwright E2E) |
| Phase gate | `make check` green before `/gsd-verify-work` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| FND-01 | Tokens.css defines all 40+ slots with new OKLCH values; both apps consume same file | Static / build verification (typecheck + visual smoke) | `pnpm typecheck && pnpm dev:web` then load `/login` and confirm new background color | Manual visual check — automated test infeasible without visual regression tooling (Chromatic deferred per REQUIREMENTS.md "Out of Scope") |
| FND-01 | `bg-tag-p0` utility resolves to `--tag-p0` value | Unit test (Vitest, jsdom, getComputedStyle) | `pnpm --filter @multica/views exec vitest run path/to/token-binding.test.tsx` | ❌ Wave 0 — write a token-binding test |
| FND-02 | Inter italic woff2 loads on web | Manual (Network tab) + automated (Playwright network assertion) | `pnpm exec playwright test e2e/typography.spec.ts` | ❌ Wave 0 — write `e2e/typography.spec.ts` |
| FND-02 | Inter italic axis available in desktop renderer | Manual (DevTools → Computed → font-style) | n/a — desktop has no automated browser test infrastructure | Manual-only acceptable |
| FND-03 | `.dark` class on `<html>` flips every redesigned surface | Manual (DevTools toggle `.dark`) + automated (Playwright switch theme via Settings, screenshot/assertion) | `pnpm exec playwright test e2e/theme-toggle.spec.ts` | ❌ Wave 0 — write `e2e/theme-toggle.spec.ts` |
| FND-03 | Desktop starts in dark mode with no FOUC | Manual (set localStorage `multica_theme=dark`, force-quit, relaunch, observe first paint) — **cannot be automated reliably** because perceptual flash detection requires visual regression tooling | Manual-only — document in plan |
| FND-03 | `useTheme()` returns correct `theme` and `setTheme` works | Unit test (Vitest, mock next-themes) | Existing `packages/views/search/search-command.test.tsx:128` mocks `useTheme` — pattern is proven | ✓ Pattern exists |
| ~~FND-04~~ | ~~Grep returns zero hardcoded colors~~ | ~~CI rule~~ | **DROPPED per D-19** — no test, no rule. Optional one-shot grep verification at end of phase: `grep -rn -E '...' packages/views packages/ui` (manual). | ❌ Manual one-shot only |

### Sampling Rate

- **Per task commit:** `pnpm typecheck` + `pnpm --filter @multica/views test` (fast-feedback for migration tasks)
- **Per wave merge:** `pnpm test` (all TS packages) + `pnpm exec playwright test e2e/theme-toggle.spec.ts e2e/typography.spec.ts` (Phase 1-relevant only)
- **Phase gate:** `make check` (full pipeline) — must be green before `/gsd-verify-work`

### Wave 0 Gaps

- [ ] `e2e/theme-toggle.spec.ts` — verify `.dark` class application + sidebar/card/foreground color flip via `getComputedStyle`
- [ ] `e2e/typography.spec.ts` — verify Inter italic woff2 in network log + computed `font-style: italic` on a known italic element (after Phase 2 adds italic headlines, this gets richer)
- [ ] `packages/views/{some-test}.test.tsx` — token-binding smoke test (render an element with `bg-tag-p0`, assert getComputedStyle background-color is non-default and approximates the expected oklch)

*(For "no FOUC on desktop" — automated detection is infeasible without screenshot diffing; document a manual acceptance check in the plan: "open packaged desktop app with `multica_theme=dark` set, observe no white flash on first paint")*

### Specific Verification Recipes (called out by user in research questions)

**1. "No FOUC on desktop"** (FND-03, Success Criterion #2)
- **Setup:** In dev, run `pnpm dev:desktop`. Open DevTools, set `localStorage.setItem('multica_theme', 'dark')`. Reload window.
- **Pass:** `<html>` has `class="dark"` from the very first paint. No white flash visible.
- **Fail signal:** Brief white background visible before colors flip.
- **Automation status:** Cannot reliably automate without visual regression tooling. **Manual acceptance.**

**2. "Italic woff2 loads on web"** (FND-02, Success Criterion #3)
- **Automated check (Playwright):**
  ```ts
  test('Inter italic loads', async ({ page }) => {
    const responses: string[] = [];
    page.on('response', r => responses.push(r.url()));
    await page.goto('/');
    // Force italic render somewhere known (e.g. Phase 2 will add an italic headline)
    expect(responses.some(u => u.includes('Inter') && u.includes('italic'))).toBe(true);
  });
  ```
- **Pass:** Network log includes a request for an italic Inter file.
- **Fail signal:** No italic file requested → either no italic content rendered (Phase 2 not done yet — acceptable) OR loader misconfigured.
- **Note:** Until Phase 2 introduces italic headlines, this test will fail because nothing forces italic to render. **Recommend writing the test in Phase 1 but skipping it (`.skip`) until Phase 2.** Or write a Phase 1 internal-only smoke route that renders `<em>test</em>` to verify the asset is reachable.

**3. "All surfaces flip with .dark"** (FND-03, Success Criterion #1)
- **Automated check (Playwright):**
  ```ts
  test('.dark flips every surface', async ({ page }) => {
    await page.goto('/login');
    const lightBg = await page.locator('body').evaluate(el => getComputedStyle(el).backgroundColor);
    await page.evaluate(() => document.documentElement.classList.add('dark'));
    const darkBg = await page.locator('body').evaluate(el => getComputedStyle(el).backgroundColor);
    expect(lightBg).not.toBe(darkBg);
  });
  ```
- **Pass:** Body bg differs between modes.
- **Fail signal:** Same color → tokens.css `.dark` block missing or `@theme inline` mis-bound.
- **Stronger version:** Sample 5 elements (body, sidebar, card, button, input) and assert each differs.

**4. "Zero hardcoded color violations remain"** (FND-04 dropped, but D-18 migration target)
- **One-shot manual check at end of phase:**
  ```bash
  grep -rn -E '\b(text|bg|border|ring|fill|stroke|from|to|via|outline|decoration|divide|placeholder|caret|accent|shadow)-(red|blue|yellow|green|orange|purple|pink|indigo|amber|emerald|cyan|teal|sky|violet|fuchsia|rose|lime)-[0-9]+' packages/views packages/ui
  ```
- **Pass:** Zero results, OR results are documented exceptions (search-mark `--warning/15`, agent-thinking violet, macOS traffic-light hex in appearance-tab).
- **Fail signal:** New violations OR forgotten violations.
- **No CI rule per D-19.** Just a documented pre-merge check.

## Sources

### Primary (HIGH confidence)
- Live codebase: opened `packages/ui/styles/tokens.css`, `base.css`, `apps/web/app/layout.tsx`, `apps/web/components/theme-provider.tsx`, `apps/desktop/src/renderer/index.html`, `apps/desktop/src/renderer/src/main.tsx`, `apps/desktop/src/renderer/src/globals.css`, `apps/desktop/src/renderer/src/App.tsx`, `apps/desktop/package.json`, `packages/core/package.json`, `packages/ui/package.json`, `packages/ui/components/common/theme-provider.tsx`, `packages/views/settings/components/appearance-tab.tsx`, `packages/views/test/setup.ts`, `Makefile`, `turbo.json`, `pnpm-workspace.yaml`, `playwright.config.ts`
- Live `node_modules/@fontsource-variable/inter/`: `package.json`, `index.css`, `wght.css`, `wght-italic.css` confirmed italic axis is in a separate file
- Live grep over `packages/views/` + `packages/ui/` for hardcoded Tailwind colors → 22 violation lines / 8 files
- Context7: `/pacocoursey/next-themes` — `storageKey`, `attribute="class"`, `suppressHydrationWarning`, hydration patterns
- Context7: `/tailwindlabs/tailwindcss.com` — `@theme inline` directive, custom color tokens, OKLCH usage

### Secondary (MEDIUM confidence)
- CONTEXT.md D-02 hex→token mapping (user-curated, not independently verified vs Algorivo CSS bundle)
- OKLCH approximations in Color Mapping table (calculated from training-knowledge sRGB→OKLab; planner should re-verify with `oklch.com`)

### Tertiary (LOW confidence)
- Dark-mode hex variants for `--destructive`, `--warning`, `--info` per D-02 — some marked "or brighter" by user; exact values left to planner judgment
- Whether onboarding views consume `font-serif` (assumption A6 — needs re-grep)

## Project Constraints (from CLAUDE.md)

These are hard rules from `./CLAUDE.md` that the plan must honor:

- **TypeScript strict mode** — no implicit `any`, no unused locals/params, all paths return.
- **Comments in English only.**
- **Prefer existing patterns over parallel abstractions** — applies directly to D-17 useTheme question.
- **No backwards-compatibility layers / legacy shims unless user requests** — applies to `multica_theme` migration question (don't add legacy `theme` key bridge unless explicit).
- **Package boundary rules (HARD constraints):**
  - `packages/core/` — zero react-dom, zero localStorage (use StorageAdapter), zero process.env, zero UI libs. **This blocks the literal D-17 interpretation of putting useTheme in `packages/core/theme/` because next-themes is a react-dom UI library.**
  - `packages/ui/` — zero `@multica/core` imports.
  - `packages/views/` — zero `next/*`, zero `react-router-dom`, zero stores.
- **No hardcoded Tailwind color classes** in shared packages — exactly the migration scope of D-18.
- **shadcn install via `pnpm ui:add`** — N/A for Phase 1 (no new components).
- **Conventional commits format** — `feat(ui)`, `feat(web)`, `feat(desktop)`, `refactor(views)` etc.
- **Atomic commits grouped by logical intent** — planner's discretion per D-fence: e.g. (a) tokens + fonts (b) theme provider + FOUC (c) violation migration.
- **`make check` must pass** before "done" — phase gate.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — every library version verified by opening `node_modules/.../package.json`, registry lookups not needed.
- Architecture: HIGH — read every file mentioned in the plan; CSS import chain confirmed end-to-end.
- Color values: MEDIUM — hex→oklch conversions are calculated approximations; planner should re-verify with `oklch.com`. Hex sources are MEDIUM (CONTEXT.md user-curated, not re-extracted from Algorivo bundle this session).
- Theme architecture: HIGH — next-themes API verified via Context7, existing useTheme usage verified by grep.
- Pitfalls: HIGH — most pitfalls observed in real codebases (1-6, 8) or directly verified in code (7).
- Hardcoded color migration scope: HIGH — fresh grep returned exact list.

**Research date:** 2026-04-25
**Valid until:** 2026-05-25 (assumes no major version bumps in next-themes, fontsource, or Tailwind v4)

---

## RESEARCH COMPLETE
