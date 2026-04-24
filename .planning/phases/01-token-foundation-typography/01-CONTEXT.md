# Phase 1: Token Foundation + Typography — Context

**Gathered:** 2026-04-24
**Status:** Ready for planning (brand guide ingestion pending — see §Pending Inputs)

<domain>
## Phase Boundary

Phase 1 delivers the design foundation that every later AlgoPlan phase consumes: new OKLCH color tokens in `packages/ui/styles/tokens.css`, Inter (incl. italic axis) wired into both apps, dark-mode working from first paint (no FOUC), and a unified theme preference mechanism shared between web (next-themes) and desktop (pre-React inline script).

**Goal restatement (from ROADMAP.md):** Both apps render every surface in the new AlgoPlan palette with Inter/Inter-italic and dark mode works correctly from the first paint — no flash, no hardcoded color escapes.

**Scope change vs. original REQUIREMENTS.md — locked in this discussion:**
- **FND-04 (CI rule against hardcoded Tailwind colors) REMOVED** by user decision ("keine — unnötig"). Existing violations are still migrated in Phase 1 (see D-19), but no enforcement rule is added. Downstream: REQUIREMENTS.md, ROADMAP.md Phase 1 Success Criterion 4, and Traceability table must be updated by the planner.
- **Palette source shifted from PROJECT.md mock ("deep-forest-green sidebar + mint-sage canvas + white cards") to Algorivo web palette (`https://algorivo-web.vercel.app/`).** The mint-sage / deep-forest-green layout described in PROJECT.md is obsolete; Algorivo's brand-green-on-neutral-surface is the new direction. PROJECT.md "What This Is" + "Active Requirements → Foundation & Tokens" must be updated by the planner.

</domain>

<decisions>
## Implementation Decisions

### Color Source & Mapping

- **D-01:** OKLCH palette adopted **1:1 from Algorivo web** (`https://algorivo-web.vercel.app/`). Palette extracted from CSS bundle `/assets/index-BfV5Noj2.css` (hash may rotate; snapshot captured 2026-04-24). **Brand Guide from user is pending** — if the Brand Guide, once delivered, conflicts with Algorivo values, the **Brand Guide wins**. See §Pending Inputs.

- **D-02:** Concrete hex → token mapping (convert to `oklch()` in implementation; approximations acceptable, document exact conversions in tokens.css comments):

  | Token | Light (hex) | Dark (hex) | Algorivo source |
  |---|---|---|---|
  | `--background` | `#fafbfc` | `#0f1318` | `--color-surface-primary` |
  | `--card`, `--popover` | `#ffffff` | `#1a1f26` | `--color-surface-secondary` |
  | `--foreground` | `#1a1d21` | `#f0f6fc` | `--color-text-primary` |
  | `--muted-foreground` | `#6e7681` | `#9ca3af` | `--color-text-muted` |
  | `--secondary-foreground` | `#4b5563` | `#949da8` | `--color-text-secondary` |
  | `--border`, `--input` | `#d8dce2` | `#353d48` | `--color-border` |
  | `--sidebar-border` | `#e8eaed` | `#272f3a` | `--color-border-subtle` |
  | `--primary`, `--sidebar-primary`, `--ring`, `--brand` | `#008757` | `#008757` (same or slightly brighter) | `--color-brand-green` / `--color-accent` |
  | `--primary-foreground`, `--brand-foreground` | `#ffffff` | `#ffffff` | — |
  | `--destructive` | `#ef4136` | `#ef4136` (or brighter) | `--color-loss` |
  | `--warning` | `#f7941d` | `#f7941d` | `--color-warning` |
  | `--info` | `#3b82f6` | `#58a6ff` | `--color-info` |
  | `--success` | `#008757` | `#008757` | `--color-profit` |
  | `--accent-hover` (optional, for interactive) | `#00a86b` | `#00a86b` | `--color-accent-hover` |

  Remaining slots (`--secondary`, `--muted`, `--accent`, `--sidebar`, `--sidebar-foreground`, `--sidebar-accent`, `--popover`) derive from the surface/text/border chain above — planner to pick exact values so that sidebar has a subtle tint distinct from `--background` (Algorivo uses `surface-secondary` for sidebar-like panels).

- **D-03:** `--background` in light mode is **near-white (#fafbfc)**, **NOT mint-sage**. There is **NO separate `--canvas` token**. Pre-workspace auth pages inherit `--background` → consistent brand across auth + workspace.

- **D-04:** Dark-mode values are **defined separately per token** (no auto-invert, no lightness-flip). Same pattern as the current tokens.css `:root` + `.dark` split.

### Token Slots & Additions

- **D-05:** Existing semantic token slots (`--background`, `--foreground`, `--card`, `--primary`, `--sidebar-*`, etc.) are **re-colored atomically** — full `tokens.css` replacement, not additive. All 40+ existing slots retain their names; values change.

- **D-06:** **New tokens added** in this phase (required by downstream Phase 2 UI primitives):
  - `--tag-p0`, `--tag-p1`, `--tag-p2`, `--tag-p3` — Priority chip / AccentBar colors
  - `--tag-p0-foreground`, `--tag-p1-foreground`, `--tag-p2-foreground`, `--tag-p3-foreground` — readable text-on-chip colors (white or dark depending on contrast)

- **D-07:** **No category tokens** (Backend/Frontend/Launch/Legal/DevOps). Categories are mock-only in v1 (per PROJECT.md Out-of-Scope + v2 FTR-04). `TagChip` component (Phase 2) accepts a `color` prop that maps to existing priority/semantic tokens.

### Priority Color Mapping

- **D-08:** Priority → color mapping (tied to existing semantic tokens where possible, separate token name for semantic clarity):
  - **P0** → red (`#ef4136`, same as `--destructive`)
  - **P1** → orange (`#f7941d`, same as `--warning`)
  - **P2** → blue info (`#3b82f6` light / `#58a6ff` dark, same as `--info`)
  - **P3** → grey neutral (use `--muted-foreground` tone, or a dedicated `--tag-p3` approx `#6e7681` / `#9ca3af`)

- **D-09:** `AccentBar` (Phase 2 UI-02) uses the **same `--tag-p0..p3` tokens** — Task-Card accent bar color = task's priority color. No separate AccentBar palette.

### Typography

- **D-10:** **Inter remains primary font.** Already wired on web via `next/font/google` (apps/web/app/layout.tsx) and on desktop via `@fontsource-variable/inter`.

- **D-11:** **Italic axis enablement:**
  - Web: `apps/web/app/layout.tsx` Inter loader already has `style: ["normal", "italic"]` implicitly via variable font, but verify — if not present, add it.
  - Desktop: Add `@fontsource-variable/inter/italic.css` import in `apps/desktop/src/renderer/src/globals.css` (or switch to `@fontsource-variable/inter` full-axis import if it covers italic).
  - Showroom (apps/showroom, created in Phase 3) will follow the same desktop-style `@fontsource-variable/inter` pattern — note for Phase 3 planner.

- **D-12:** **Source_Serif_4 fate — Landing keeps, Workspace/Desktop removes.**
  - `apps/web/app/layout.tsx` `--font-serif` remains (landing pages depend on it: `faq-section`, `landing-hero`, `features-section`, `download/*`, etc.).
  - `apps/web/app/(landing)/layout.tsx` `--font-serif` stays untouched.
  - `apps/desktop/package.json` **removes** `@fontsource-variable/source-serif-4` dependency.
  - `apps/desktop/src/renderer/src/globals.css` **removes** `--font-serif` CSS variable definition and the related import.
  - Satisfies STATE.md deferred item "Source_Serif_4 removal audit" — **folded into Phase 1**.

### Theme & Dark Mode

- **D-13:** **Theme options: Light / Dark / System (3 radios)** in Settings (SET-02, Phase 6). Default at first visit = `system` resolved, but **light rendered if no system preference detected**.

- **D-14:** **localStorage key: `multica_theme`** (consistent with RBR-05 — `multica_*` keys deliberately unchanged during rebrand to prevent silent logout / state loss).

- **D-15:** **Web theme wiring:** `next-themes` configured with `storageKey="multica_theme"`, `attribute="class"`, `defaultTheme="system"`, `enableSystem=true`. Class applied to `<html>`.

- **D-16:** **Desktop FOUC prevention:** Inline `<script>` in `apps/desktop/src/renderer/index.html`, placed in `<head>` (before `<div id="root">`). Script:
  ```js
  // Read multica_theme from localStorage; resolve 'system' via matchMedia;
  // add 'dark' class to documentElement BEFORE React mounts.
  try {
    var t = localStorage.getItem('multica_theme') || 'system';
    var dark = t === 'dark' || (t === 'system' && matchMedia('(prefers-color-scheme: dark)').matches);
    if (dark) document.documentElement.classList.add('dark');
  } catch (e) {}
  ```
  No network dependency, runs synchronously before React.

- **D-17:** **Shared theme abstraction:** A `useTheme()` hook in `packages/core/theme/` exposes `{ theme, resolvedTheme, setTheme }` to both apps. Web impl wraps `next-themes`'s hook. Desktop impl reads/writes `multica_theme` directly and syncs the `.dark` class. Single surface for views (`packages/views/`) to consume.

### Migration of Existing Hardcoded Colors (Phase 1 scope)

- **D-18:** **Bestehende hardcoded Tailwind-Farb-Verstöße in `packages/views/` + `packages/ui/` werden in Phase 1 migriert** auf semantic tokens. Concrete files (found by grep `text-(red|blue|yellow|green|orange|purple|pink)-[0-9]+|bg-(red|blue|yellow|green|orange|purple|pink)-[0-9]+`):
  - `packages/views/autopilots/components/autopilot-detail-page.tsx:50-51` (`text-blue-500` → `text-info`)
  - `packages/views/projects/components/project-detail.repo.test.tsx:113-116` (test fixture — migrate to semantic tokens too, keeps test aligned with production)
  - `packages/views/search/search-command.tsx:78` (`bg-yellow-200 dark:bg-yellow-900/60` → new `--highlight` token or `--warning-muted`)
  - `packages/views/issues/components/agent-transcript-dialog.tsx:81,83,345,352` (`bg-blue-*`, `bg-red-*`, `text-blue-*`, `text-red-*` → `info`/`destructive` tokens)

  **Planner to re-verify list** with a fresh grep before starting; additional violations may be migrated if discovered. Target: zero hardcoded Tailwind color classes in `packages/views/` + `packages/ui/` after Phase 1 — but **no CI rule enforces this** (see D-19).

- **D-19:** **FND-04 (CI rule) REMOVED from scope.** User decision: enforcement mechanism unnecessary for v1. Planner must:
  1. Strike FND-04 from REQUIREMENTS.md (move to Out of Scope with reason "User declined CI enforcement — migration is one-shot in Phase 1").
  2. Remove Phase 1 Success Criterion #4 ("grep returns zero") from ROADMAP.md, or rewrite it as a one-time migration check instead of an ongoing rule.
  3. Update Traceability table: FND-04 drops.
  4. Remaining Phase 1 success criteria (1-3) stay.

### Deferred & Out of Scope for Phase 1

- **D-20:** **Chart colors, shadow tokens, radius adjustments, scrollbar color tweaks** are NOT part of Phase 1. Current values in `tokens.css` + `base.css` stay unless Algorivo visual comparison forces a change during implementation (planner's judgment). Landing-page visual adjustments are out of scope entirely.

### Claude's Discretion

- Exact `oklch()` conversion arithmetic from Algorivo hex values (approximations OK; document each conversion inline in tokens.css).
- `--sidebar`, `--sidebar-accent`, `--secondary`, `--accent`, `--muted` exact values — derive from Algorivo surface/border tones to produce a subtle sidebar tint distinct from body background. Any reasonable choice that preserves visual hierarchy is fine.
- Whether to keep or retire the `--priority` singleton token (currently orange) now that per-priority tokens exist — planner may drop it or keep as a fallback.
- Exact commit split inside Phase 1 (e.g., one commit for tokens.css + fonts, one for FOUC script + theme hook, one for violation migration) — planner decides.

### Folded Todos

- **Source_Serif_4 removal audit** (from STATE.md Deferred Items) — **folded**: resolved by D-12 (Landing keeps, Workspace/Desktop removes).

</decisions>

<pending_inputs>
## Pending Inputs

- **Brand Guide** — User will attach brand guide in the next message. If the guide specifies values that differ from the Algorivo-derived palette in D-02, the **Brand Guide overrides Algorivo**. Planner: re-read this CONTEXT.md after brand guide lands; update D-02 mapping before writing plans. If brand guide is not delivered before plan-phase starts, proceed with Algorivo values and flag for later revision.

</pending_inputs>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project Planning
- `.planning/PROJECT.md` — Project vision + Key Decisions table. **Note:** "deep-forest-green sidebar + mint-sage canvas" description is obsolete (D-03). Planner must update PROJECT.md "What This Is" + Foundation requirements section.
- `.planning/REQUIREMENTS.md` §FND-01..04, §Traceability — **Note:** FND-04 drops (D-19). Planner must update.
- `.planning/ROADMAP.md` §Phase 1 — Success Criterion #4 must be revised (D-19).
- `.planning/STATE.md` §Deferred Items — Source_Serif_4 audit item resolved by D-12.

### Codebase Maps
- `.planning/codebase/ARCHITECTURE.md` — package boundaries (`views/ → core/ + ui/`), platform bridge
- `.planning/codebase/STRUCTURE.md` — monorepo layout (apps/web, apps/desktop, packages/ui, packages/views, packages/core)
- `.planning/codebase/STACK.md` — Tailwind v4, Base UI primitives, next-themes, Electron
- `.planning/codebase/CONVENTIONS.md` — semantic design tokens mandate, font stacks
- `.planning/codebase/CONCERNS.md` — Zustand selector footguns, DragStrip requirements (not directly touched in Phase 1 but near this work)

### Files to Modify (Phase 1)
- `packages/ui/styles/tokens.css` — **REPLACE** entire `:root` + `.dark` blocks with new OKLCH palette (D-02). `@theme inline` block stays; add `--color-tag-p0..p3` and `--color-tag-p0..p3-foreground` bindings.
- `packages/ui/styles/base.css` — **KEEP.** Review `--scrollbar-thumb` values for readability against new `--background`.
- `apps/web/app/layout.tsx` — **UPDATE** Inter loader (verify `style: ["normal", "italic"]`). Keep Source_Serif_4.
- `apps/web/components/theme-provider.tsx` — **UPDATE** next-themes config: `storageKey="multica_theme"`, `attribute="class"`, `defaultTheme="system"`, `enableSystem={true}`.
- `apps/desktop/src/renderer/index.html` — **ADD** inline FOUC script in `<head>` (D-16).
- `apps/desktop/src/renderer/src/globals.css` — **REMOVE** `--font-serif` definition. **ADD** `@fontsource-variable/inter/italic.css` import (or equivalent for italic axis).
- `apps/desktop/package.json` — **REMOVE** `@fontsource-variable/source-serif-4` dependency.
- `packages/core/theme/` (NEW) — shared `useTheme()` hook (D-17). Exact filename + exports: planner's call.

### Files to Modify (Violation Migration, D-18)
- `packages/views/autopilots/components/autopilot-detail-page.tsx`
- `packages/views/projects/components/project-detail.repo.test.tsx`
- `packages/views/search/search-command.tsx`
- `packages/views/issues/components/agent-transcript-dialog.tsx`

### External
- `https://algorivo-web.vercel.app/` — source palette reference. CSS bundle at `/assets/index-BfV5Noj2.css` (hash rotates; the palette values in D-02 are the snapshot of truth).

### Standards
- Base UI color docs (component tokens expected by `@base-ui/react` primitives — surface them from shadcn components.json once planner inspects how Base UI consumes our tokens).
- OKLCH color space — use `oklch()` CSS function syntax (already adopted in current `tokens.css`).

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **Current `packages/ui/styles/tokens.css`** has the exact semantic token slot structure we need — we're replacing values, not restructuring. `@theme inline` block binding `--color-*` → `var(--*)` stays.
- **next-themes already in use** (`apps/web/components/theme-provider.tsx`) — only config tweaks needed.
- **Desktop `apps/desktop/src/renderer/src/globals.css`** already imports tokens + base from `@multica/ui/styles/*`, has its own `--font-sans/serif/mono` stack.
- **Existing `Inter` loader** on web already wired with full Inter variable family via `next/font/google` — add italic style param only.
- **`@fontsource-variable/inter` dependency** already present in `apps/desktop/package.json` — just needs an italic-axis import line.

### Established Patterns
- **OKLCH everywhere** — all existing tokens use `oklch()` syntax. Continue.
- **Semantic class names via `@theme inline`** — `bg-background`, `text-muted-foreground`, etc. resolve automatically. No hex in JSX expected.
- **Dark mode via `.dark` class** on `<html>` — both apps, same convention.
- **`--font-*` CSS variables** in `:root` (desktop) + Next.js `className` injection (web) — feeds `font-sans` Tailwind utility.

### Integration Points
- Every view across both apps consumes `bg-background`, `text-foreground`, etc. — token replacement propagates automatically after one commit.
- `ThemeProvider` wraps web root; desktop has no explicit provider yet (pre-React script + direct class manipulation).
- `CoreProvider` from `packages/core/platform/` does NOT currently own theme state. D-17 puts it into `packages/core/theme/` as a separate module — CoreProvider may grow a theme init call or leave it app-local. Planner picks.

</code_context>

<specifics>
## Specific Ideas

- **Algorivo web palette** (`https://algorivo-web.vercel.app/`) is the reference. User specifically redirected the brand direction away from the PROJECT.md mint-sage description to the Algorivo aesthetic. The brand-green `#008757` is explicitly the AlgoPlan primary.
- **Desktop FOUC script** must be synchronous inline in `index.html` `<head>` — no external script, no network. Runs before React mounts.
- **Storage key stays `multica_theme`** — explicit carry-forward from RBR-05 (localStorage rebrand exemption prevents silent logout).
- **Priority red=P0, orange=P1, blue=P2, grey=P3** — explicitly user-chosen, distinct from the more conventional P0-red / P1-orange / P2-yellow / P3-green heat mapping.

</specifics>

<deferred>
## Deferred Ideas

- **Chart colors from Algorivo palette** — Algorivo has many chart-specific colors (`--color-loss-muted`, `--color-profit-muted`, etc.). Multica has no dashboard charts in v1; revisit if v2+ adds charts.
- **Category-Tag tokens as first-class** — stays v2 (REQUIREMENTS.md FTR-04). Phase 1 only adds `--tag-p0..p3`.
- **Shadow / radius token refinements** based on Algorivo visual detail — revisit during Phase 4 (Dashboard Shell) if shell needs them.
- **AI accent purple** (`#a855f7` in Algorivo) — no defined AlgoPlan use yet. Ignore for Phase 1; revisit if agent-specific surfaces need it.
- **Landing-page palette alignment** — landing currently uses Source_Serif_4 + hardcoded hex (`#0a0d12`). Out of scope for this milestone entirely (PROJECT.md v1 rebrand scope excludes landing redesign).

### Reviewed Todos (not folded)

- **dnd-kit commit-split (Phase 5)** — not Phase 1.
- **Kanban column virtualization decision gate (Phase 5)** — not Phase 1.
- **Password strength meter library decision (Phase 5→6 transition)** — not Phase 1.

</deferred>

---

*Phase: 01-token-foundation-typography*
*Context gathered: 2026-04-24*
