# Phase 1: Token Foundation + Typography — Pattern Map

**Mapped:** 2026-04-24
**Files analyzed:** 22 (16 in-scope edits + new test scaffolds)
**Analogs found:** 20 / 22 (2 new files have no direct analog in-codebase — see `## No Analog Found`)

> Cross-reference: `01-CONTEXT.md` §"Files to Modify" + `01-RESEARCH.md` §"Component Responsibilities" + §"Hardcoded Color Violation Map".

---

## File Classification

| File | New / Mod | Role | Data Flow | Closest Analog | Match |
|------|-----------|------|-----------|----------------|-------|
| `packages/ui/styles/tokens.css` | MODIFY (replace `:root` + `.dark`, extend `@theme inline`) | design-token | static-cascade | itself (lines 3-52 `@theme inline`, 54-96 `:root`, 98-139 `.dark`) | exact (self-pattern) |
| `packages/ui/styles/base.css` | REVIEW (possibly tweak `--scrollbar-thumb`) | base-styles | static-cascade | itself (lines 71-79 `chat-impulse` consumes `--brand`; lines 93-110 scrollbar block) | exact (self-pattern) |
| `apps/web/app/layout.tsx` | MODIFY (add `style: ["normal", "italic"]` to Inter loader) | next-app-shell | font-loading | `Source_Serif_4` loader at lines 46-58 (already passes `style: ["normal", "italic"]`) | exact (in-file) |
| `apps/web/components/theme-provider.tsx` | NO CHANGE (re-export only; storageKey lives in shared provider) | wrapper | re-export | itself (already a pure re-export shim) | exact (self) |
| `packages/ui/components/common/theme-provider.tsx` | MODIFY (add `storageKey="multica_theme"`, ensure `useTheme` re-export covers desktop) | provider | react-context | itself (lines 6-23 — add one prop) | exact (self) |
| `apps/desktop/src/renderer/index.html` | MODIFY (insert inline FOUC `<script>` in `<head>`) | html-shell | sync-bootstrap | none in this codebase — pattern is borrowed from `next-themes`'s injected script (web's auto-FOUC handler) | role-match |
| `apps/desktop/src/renderer/src/main.tsx` | MODIFY (add italic CSS import; remove 2 serif imports) | renderer-entry | font-loading | itself (lines 6-13 — same `import "@fontsource-variable/...";` pattern) | exact (in-file) |
| `apps/desktop/src/renderer/src/globals.css` | MODIFY (remove `--font-serif` declaration) | css-shell | static-cascade | itself (lines 24-32 font-stack vars) | exact (in-file) |
| `apps/desktop/package.json` | MODIFY (remove `@fontsource-variable/source-serif-4`) | manifest | dependency-list | itself (line 42) | exact (in-file) |
| (NEW or skip) `packages/core/theme/index.ts` | NEW (re-export only) **OR** SKIP | barrel | re-export | `packages/core/index.ts` (existing barrel pattern) | role-match — but research recommends SKIP, see §"D-17 Boundary Conflict" |
| `packages/views/autopilots/components/autopilot-detail-page.tsx` | MIGRATE (text-blue-500, text-emerald-500, text-amber-500 → tokens) | view-component | render | `RUN_STATUS_CONFIG` map at lines 49-54 (already uses `text-destructive` for `failed` — proven token pattern in same map) | exact (in-file) |
| `packages/views/autopilots/components/autopilots-page.tsx` | MIGRATE (text-emerald-500, text-amber-500 → tokens) | view-component | render | same `STATUS_CONFIG` map pattern at lines 115-119 (already uses `text-muted-foreground` for `archived`) | exact (in-file) |
| `packages/views/chat/components/chat-session-history.tsx` | MIGRATE (`bg-purple-100 text-purple-700` AvatarFallback) | view-component | render | sibling file `chat-window.tsx` line 600 — same fallback class. Needs unified replacement strategy | role-match |
| `packages/views/chat/components/chat-window.tsx` | MIGRATE (same as above) | view-component | render | `chat-session-history.tsx:112` (same line, same class) | exact (sibling) |
| `packages/views/projects/components/projects-page.tsx` | MIGRATE (`bg-emerald-500` progress bar → `bg-success`) | view-component | render | `project-detail.tsx:560` (same progress-bar idiom; same migration target) | exact (sibling) |
| `packages/views/projects/components/project-detail.tsx` | MIGRATE (`bg-emerald-500` progress bar) | view-component | render | `projects-page.tsx:134` (same code shape) | exact (sibling) |
| `packages/views/projects/components/project-detail.repo.test.tsx` | MIGRATE (test fixture dotColor strings) | unit-test | mock-fixture | uses `vi.mock("@multica/core/projects/config", …)` lines 109-126 — keep mock shape, swap class strings | exact (in-file) |
| `packages/views/modals/create-issue.tsx` | MIGRATE (`bg-emerald-500/15 text-emerald-500`) | view-component | render | `agent-transcript-dialog.tsx:79-83` `colorClasses` table — same `bg-{color}/{alpha} text-{color}` idiom | role-match |
| `packages/views/search/search-command.tsx` | MIGRATE (`bg-yellow-200 dark:bg-yellow-900/60` `<mark>`) | view-component | render | none — search-highlight is a unique semantic. Decision pending: new `--highlight` token vs `bg-warning/15` (see §"Open Token Decisions") | partial |
| `packages/views/issues/components/agent-transcript-dialog.tsx` | MIGRATE (`colorClasses` table for agent step types) | view-component | render | `RUN_STATUS_CONFIG` in `autopilot-detail-page.tsx:49-54` (semantic-token-keyed status map) | role-match |
| `packages/ui/styles/__tests__/token-binding.test.tsx` | NEW (Wave 0) | unit-test | computed-style-assertion | `packages/views/search/search-command.test.tsx` (Vitest + jsdom + `useTheme` mock) — closest existing CSS-aware test | role-match |
| `e2e/theme-toggle.spec.ts` | NEW (Wave 0) | e2e-test | browser-flow | `e2e/settings.spec.ts` (theme settings already navigated there) + `e2e/auth.spec.ts` (uses `loginAsDefault`) | role-match |
| `e2e/typography.spec.ts` | NEW (Wave 0) | e2e-test | network-assertion | `e2e/auth.spec.ts` (page.goto + locator assertion pattern) | partial — no existing network-log test |
| `scripts/grep-hardcoded-colors.sh` | NEW (Wave 0 verification helper) | shell-script | grep | `scripts/check.sh` (bash with `set -euo pipefail`) | role-match |

---

## Pattern Assignments

### `packages/ui/styles/tokens.css` (design-token, static-cascade)

**Analog:** itself — re-color in place, add new bindings.

**`@theme inline` binding pattern (existing, lines 3-52):**
```css
@theme inline {
    --font-heading: var(--font-sans);
    /* ...font + chart bindings... */
    --color-brand: var(--brand);
    --color-brand-foreground: var(--brand-foreground);
    --color-priority: var(--priority);
    /* ...etc... */
    --radius-sm: calc(var(--radius) * 0.6);
    /* ... */
}
```
**Action:** keep block intact. APPEND new bindings before `--radius-*` lines:
```css
    --color-tag-p0: var(--tag-p0);
    --color-tag-p0-foreground: var(--tag-p0-foreground);
    --color-tag-p1: var(--tag-p1);
    --color-tag-p1-foreground: var(--tag-p1-foreground);
    --color-tag-p2: var(--tag-p2);
    --color-tag-p2-foreground: var(--tag-p2-foreground);
    --color-tag-p3: var(--tag-p3);
    --color-tag-p3-foreground: var(--tag-p3-foreground);
```
> CRITICAL: keep the `inline` keyword — without it Tailwind copies the `var()` reference and `.dark` override silently fails (RESEARCH §Pitfall 2).

**`:root` block pattern (existing, lines 54-96):**
```css
:root {
    --background: oklch(1 0 0);
    --foreground: oklch(0.141 0.005 285.823);
    /* ...one var per line, no trailing comments today... */
    --brand: oklch(0.55 0.16 255);
    --priority: oklch(0.65 0.18 50);
    --scrollbar-thumb: oklch(0 0 0 / 10%);
}
```
**Action:** REPLACE values with Algorivo OKLCH from RESEARCH §"Color Mapping". Add a hex-source comment per line (research recommendation):
```css
    --background: oklch(0.985 0.002 250);   /* #fafbfc */
    --foreground: oklch(0.22 0.005 250);    /* #1a1d21 */
    /* ...full block per Color Mapping table... */
    --tag-p0: oklch(0.62 0.22 27);          /* #ef4136, == --destructive */
    --tag-p0-foreground: oklch(1 0 0);
    /* ...p1..p3 + foregrounds... */
```

**`.dark` block pattern (existing, lines 98-139):** same shape as `:root` — `--var: oklch(...);` per line. Replace values with dark-mode column from RESEARCH Color Mapping. Add `--tag-p*` + `--tag-p*-foreground` for dark.

**Token slot to drop (Claude's discretion per CONTEXT D-claude):** `--priority` (singleton) is superseded by `--tag-p0..p3`. Verify no consumer references `--color-priority` before removal.

---

### `packages/ui/styles/base.css` (base-styles, static-cascade)

**Analog:** itself — review-only.

**Lines that reference brand-sensitive tokens:**
- Lines 73-79: `@keyframes chat-impulse` references `var(--brand)` and `color-mix(... var(--brand) 40%)`. Visual check on new green required.
- Lines 93-95: `--scrollbar-thumb` is consumed against `--background`. New `#fafbfc` background is light enough that the existing `oklch(0 0 0 / 10%)` thumb still has contrast. Verify on dark `#0f1318` that `oklch(1 0 0 / 8%)` is visible enough.

**No structural changes expected** — D-20 keeps scrollbar tokens out of scope unless visual comparison forces a change.

---

### `apps/web/app/layout.tsx` (next-app-shell, font-loading)

**Analog:** the `Source_Serif_4` loader in the SAME file (lines 46-58). It already implements the exact pattern Inter needs.

**Source pattern (in-file, lines 46-58):**
```typescript
const sourceSerif = Source_Serif_4({
  subsets: ["latin"],
  style: ["normal", "italic"],          // <-- the line Inter is missing
  variable: "--font-serif",
  fallback: [
    "ui-serif",
    "Iowan Old Style",
    /* ... */
    "serif",
  ],
});
```

**Inter loader to modify (lines 20-32):**
```typescript
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  fallback: [
    "-apple-system",
    /* ... */
    "sans-serif",
  ],
});
```
**Action:** add `style: ["normal", "italic"],` between `subsets` and `variable`. Keep `fallback` array verbatim (CJK chain is intentional — see in-file comment lines 10-19).

**Other constraints to preserve:**
- `<html>` already has `suppressHydrationWarning` (line 108) — must stay (RESEARCH §Pitfall 1).
- `Source_Serif_4` import + variable stay (D-12: web/landing keeps it).

---

### `apps/web/components/theme-provider.tsx` (wrapper, re-export)

**Analog:** itself. **No change.**

The file is a 16-line re-export shim that forwards to `@multica/ui/components/common/theme-provider`. The `storageKey` change happens in the shared provider, so this file inherits it without modification.

```typescript
"use client"
export { ThemeProvider } from "@multica/ui/components/common/theme-provider"
// (React 19 console.error suppression below stays intact)
```

> Note: only mention this file in the plan if the planner wants to verify the re-export still works after the shared change.

---

### `packages/ui/components/common/theme-provider.tsx` (provider, react-context)

**Analog:** itself (lines 6-23). One-line addition.

**Source pattern (existing, lines 6-23):**
```tsx
import { ThemeProvider as NextThemesProvider, useTheme } from "next-themes";
export { useTheme };
import { TooltipProvider } from "../ui/tooltip";

export function ThemeProvider({ children, ...props }: React.ComponentProps<typeof NextThemesProvider>) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
      {...props}
    >
      <TooltipProvider delay={500}>
        {children}
      </TooltipProvider>
    </NextThemesProvider>
  );
}
```
**Action:** insert `storageKey="multica_theme"` between `disableTransitionOnChange` and `{...props}`. Both apps consume this provider (verified via `apps/web/components/theme-provider.tsx` re-export and `apps/desktop/src/renderer/src/App.tsx:214`), so the change propagates atomically.

> `useTheme` is already re-exported here. **Both `appearance-tab.tsx:88` and `search-command.tsx:143` import it from this exact path** — preserve the export.

---

### `apps/desktop/src/renderer/index.html` (html-shell, sync-bootstrap)

**Analog:** none in-codebase. The pattern is documented verbatim in CONTEXT D-16 and reproduced in RESEARCH §"FOUC Inline Script Placement".

**Source HTML (existing, lines 1-12):**
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

**Action:** insert between `<title>Multica</title>` and `</head>`:
```html
    <!-- Pre-React FOUC prevention: read theme from localStorage, apply .dark
         to <html> before the renderer mounts. Synchronous, no network. -->
    <script>
      try {
        var t = localStorage.getItem('multica_theme') || 'system';
        var dark = t === 'dark' || (t === 'system' && matchMedia('(prefers-color-scheme: dark)').matches);
        if (dark) document.documentElement.classList.add('dark');
      } catch (e) {}
    </script>
```

**Constraints:** plain `<script>` (no `type="module"`, no `src`). Body wrapped in `try/catch` (Safari private mode — RESEARCH §Pitfall 4). Must read same key (`multica_theme`) as the shared `ThemeProvider` (RESEARCH §Pitfall 6).

---

### `apps/desktop/src/renderer/src/main.tsx` (renderer-entry, font-loading)

**Analog:** itself (lines 6-13) — same `import "@fontsource-variable/...";` shape repeats.

**Source pattern (existing, lines 1-16):**
```tsx
import ReactDOM from "react-dom/client";
import App from "./App";
import "@fontsource-variable/inter";
import "@fontsource-variable/source-serif-4";          // REMOVE
import "@fontsource-variable/source-serif-4/wght-italic.css";  // REMOVE
import "@fontsource/geist-mono/400.css";
import "@fontsource/geist-mono/700.css";
import "./globals.css";

ReactDOM.createRoot(document.getElementById("root")!).render(<App />);
```

**Action:**
1. ADD `import "@fontsource-variable/inter/wght-italic.css";` immediately after the existing `import "@fontsource-variable/inter";`.
2. REMOVE the two `source-serif-4` lines.
3. Update the existing comment block (lines 3-9) — strip the Source Serif rationale, keep the Inter + fontstack-sync note.

> Verified: `node_modules/@fontsource-variable/inter/wght-italic.css` exists and contains italic faces with `font-display: swap` (RESEARCH §"Italic axis discovery" + §Pitfall 3).

---

### `apps/desktop/src/renderer/src/globals.css` (css-shell, static-cascade)

**Analog:** itself (lines 24-32, the `:root` font-stack block).

**Source pattern (existing, lines 24-32):**
```css
:root {
  --font-sans: "Inter Variable", "Inter", -apple-system, BlinkMacSystemFont,
               "Segoe UI", "PingFang SC", "Microsoft YaHei", "Noto Sans CJK SC",
               sans-serif;
  --font-serif: "Source Serif 4 Variable", "Source Serif 4", "Iowan Old Style",
                "Apple Garamond", Baskerville, "Times New Roman", serif;
  --font-mono: "Geist Mono", ui-monospace, SFMono-Regular, Menlo, Consolas,
               monospace;
}
```

**Action:** REMOVE the `--font-serif: ...` block (3 lines). Keep `--font-sans` and `--font-mono` intact. Update the comment block above (lines 9-23) — remove the "matches web's next/font Source_Serif_4" line.

> RESEARCH §Pitfall 7: re-grep `font-serif|font-heading` in `packages/views/` + `apps/desktop/src/renderer/src/` BEFORE finalizing this removal. If onboarding uses `font-serif`, swap to `font-sans italic` first.

---

### `apps/desktop/package.json` (manifest, dependency-list)

**Analog:** itself (line 42 in the `dependencies` block).

**Source pattern (existing, lines 34-53):**
```json
  "dependencies": {
    "@dnd-kit/core": "^6.3.1",
    /* ... */
    "@fontsource-variable/inter": "^5.2.5",
    "@fontsource-variable/source-serif-4": "^5.2.9",   // REMOVE THIS LINE
    "@fontsource/geist-mono": "^5.2.7",
    /* ... */
  },
```

**Action:** prefer `pnpm --filter @multica/desktop remove @fontsource-variable/source-serif-4` (updates lockfile + prunes `node_modules`) over hand-editing — RESEARCH §"Installation / Removal" specifies this exact command.

---

### `packages/core/theme/index.ts` (NEW or SKIP) — barrel, re-export

**Analog (if going forward):** `packages/core/index.ts` already exports symbols by re-export from sub-modules — same one-line shape. Example existing shape (paraphrased from `packages/core/`):
```typescript
export { useTheme, ThemeProvider } from "@multica/ui/components/common/theme-provider";
```

> ⚠ **Boundary conflict (RESEARCH §"Theme Provider Wiring" + §Open Question 2):** D-17 places the hook in `packages/core/`. But `next-themes` is react-dom; `packages/core` has zero react-dom imports per CLAUDE.md. **Two valid resolutions:**
> 1. **SKIP** (research recommendation): keep current import path `@multica/ui/components/common/theme-provider`. Update CONTEXT D-17 to reflect this.
> 2. **THIN RE-EXPORT**: create `packages/core/theme/index.ts` that ONLY re-exports from `@multica/ui` — zero logic. The "shared surface" is cosmetic but satisfies D-17 literal reading.
>
> **Planner must pick one.** No new code shape needed beyond the one-line re-export above.

---

### Hardcoded color migrations (all 8 view files) — view-component, render

These share **two** repeating patterns. Apply the matching one per file:

#### Pattern A — status-config map (semantic-token-keyed)

**Analog:** `packages/views/autopilots/components/autopilot-detail-page.tsx` lines 49-54 — already half-migrated. The `failed` row uses `text-destructive`; the others use literal Tailwind colors. Migration is to bring all rows in line with the proven `failed` row.

**Source (current):**
```tsx
const RUN_STATUS_CONFIG: Record<string, { label: string; color: string; icon: typeof CheckCircle2; spin?: boolean }> = {
  issue_created: { label: "Issue Created", color: "text-blue-500",    icon: Clock },
  running:       { label: "Running",       color: "text-blue-500",    icon: Loader2, spin: true },
  completed:     { label: "Completed",     color: "text-emerald-500", icon: CheckCircle2 },
  failed:        { label: "Failed",        color: "text-destructive", icon: XCircle },
};
```

**Migration target:**
```tsx
const RUN_STATUS_CONFIG: Record<string, { label: string; color: string; icon: typeof CheckCircle2; spin?: boolean }> = {
  issue_created: { label: "Issue Created", color: "text-info",        icon: Clock },
  running:       { label: "Running",       color: "text-info",        icon: Loader2, spin: true },
  completed:     { label: "Completed",     color: "text-success",     icon: CheckCircle2 },
  failed:        { label: "Failed",        color: "text-destructive", icon: XCircle },
};
```
**Also covers L307-308 same-file (`autopilot.status === "active" ? "text-emerald-500"` → `text-success`; `"paused" ? "text-amber-500"` → `text-warning`).**

**Apply same recipe to:**
- `autopilots-page.tsx:115-119` (`STATUS_CONFIG` map — same shape).
- `agent-transcript-dialog.tsx:78-84` (`colorClasses` table; emerald → success, blue → info, red → destructive). For `thinking: violet` see §"Open Token Decisions".

#### Pattern B — single inline class on element

**Analog:** Within the same migration set, `agent-transcript-dialog.tsx:345` already uses `text-blue-600 dark:text-blue-400 bg-blue-500/10` — a literal class swap to `text-info bg-info/10` is the pattern.

**Source examples:**
- `projects-page.tsx:134` — `bg-emerald-500` → `bg-success`
- `project-detail.tsx:560` — `bg-emerald-500` → `bg-success`
- `create-issue.tsx:112` — `bg-emerald-500/15 text-emerald-500` → `bg-success/15 text-success`
- `chat-session-history.tsx:112` and `chat-window.tsx:600` — `bg-purple-100 text-purple-700` (avatar fallback). RESEARCH recommends `bg-secondary text-secondary-foreground` (low risk if visually muted is acceptable; flag in plan for visual review).

#### Pattern C — test-fixture mock dotColor strings

**Analog:** `packages/views/projects/components/project-detail.repo.test.tsx` lines 109-126 (`vi.mock("@multica/core/projects/config", …)`).

**Source (current):**
```tsx
vi.mock("@multica/core/projects/config", () => ({
  PROJECT_STATUS_ORDER: ["planned"],
  PROJECT_STATUS_CONFIG: {
    planned:     { label: "Planned",     dotColor: "bg-gray-500" },
    in_progress: { label: "In Progress", dotColor: "bg-blue-500" },
    paused:      { label: "Paused",      dotColor: "bg-yellow-500" },
    completed:   { label: "Completed",   dotColor: "bg-green-500" },
    cancelled:   { label: "Cancelled",   dotColor: "bg-red-500" },
  },
  /* ... */
}));
```

**Migration target:**
```tsx
    planned:     { label: "Planned",     dotColor: "bg-muted" },
    in_progress: { label: "In Progress", dotColor: "bg-info" },
    paused:      { label: "Paused",      dotColor: "bg-warning" },
    completed:   { label: "Completed",   dotColor: "bg-success" },
    cancelled:   { label: "Cancelled",   dotColor: "bg-destructive" },
```
> Also re-check production `@multica/core/projects/config.ts` to keep test mock + production strings aligned (CONTEXT D-18 explicit requirement).

#### Pattern D — search-highlight `<mark>` (no clean analog)

**Source:** `packages/views/search/search-command.tsx:78`:
```tsx
<mark key={i} className="bg-yellow-200 dark:bg-yellow-900/60 text-inherit rounded-sm">
  {part.text}
</mark>
```

**No analog** — this is the only `<mark>` highlight in the codebase. Two paths (RESEARCH §Open Question 3):
1. Add new `--highlight` token in `tokens.css` (recommended for clean semantics; minimal cost — 2 lines in `:root`, 2 in `.dark`, 1 binding in `@theme inline`).
2. Reuse `bg-warning/15 text-warning` (no new token; mild semantic blur with "warning").

**Planner picks.** If (1), extend `tokens.css` plan accordingly.

---

### `packages/ui/styles/__tests__/token-binding.test.tsx` (NEW Wave 0 — unit-test, computed-style-assertion)

**Analog:** `packages/views/search/search-command.test.tsx` (closest existing Vitest + jsdom + `@multica/ui` consumer). Test lives in `packages/ui` (new test directory).

**`packages/ui` has no existing test infrastructure** — `packages/ui/package.json` has no `test` script and no `vitest.config.ts`. This new test forces creation of:
- `packages/ui/vitest.config.ts` (clone from `packages/views/vitest.config.ts`)
- `packages/ui/test/setup.ts` (clone from `packages/views/test/setup.ts` — provides matchMedia + ResizeObserver shims)
- `packages/ui/package.json` `scripts.test: "vitest run"` (mirrors `packages/views/package.json`)

**Imports pattern (from `search-command.test.tsx`):**
```typescript
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
```

**Setup pattern (from `packages/views/test/setup.ts:1`):**
```typescript
import "@testing-library/jest-dom/vitest";
// ...createMemoryStorage + matchMedia shims...
```

**Test body — minimal token-binding smoke (no analog; sketch only):**
```typescript
import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

describe("token bindings", () => {
  it("bg-tag-p0 resolves via @theme inline", () => {
    // Note: jsdom does NOT compute Tailwind classes (no PostCSS at test time),
    // so this test asserts the className wiring + var() reference, not the
    // actual computed RGB. The real computed-style assertion belongs in e2e.
    const { container } = render(<div className="bg-tag-p0" data-testid="t" />);
    expect(container.querySelector('[data-testid="t"]')?.className).toContain("bg-tag-p0");
  });
});
```
> **Caveat:** jsdom without Tailwind PostCSS at test time can't verify the `oklch()` resolution. The realistic Wave 0 test asserts class presence; the real binding check moves to `e2e/theme-toggle.spec.ts` via `getComputedStyle` (which does run a real Chromium with PostCSS-built CSS). Planner: keep this token-binding.test.tsx minimal or skip.

---

### `e2e/theme-toggle.spec.ts` (NEW Wave 0 — e2e-test, browser-flow)

**Analog:** `e2e/settings.spec.ts` (settings flow + sidebar assertions) + `e2e/auth.spec.ts` (login pattern).

**Imports pattern (from `e2e/auth.spec.ts:1-2`):**
```typescript
import { test, expect } from "@playwright/test";
import { loginAsDefault, openWorkspaceMenu } from "./helpers";
```

**Login + navigate pattern (from `e2e/settings.spec.ts:7-17`):**
```typescript
await loginAsDefault(page);
await openWorkspaceMenu(page);
await page.locator("text=Settings").click();
await page.waitForURL("**/settings");
```

**Computed-style assertion pattern (recommended in RESEARCH §"Specific Verification Recipes" item 3):**
```typescript
test(".dark flips body background", async ({ page }) => {
  await page.goto("/login");
  const lightBg = await page.locator("body").evaluate(el => getComputedStyle(el).backgroundColor);
  await page.evaluate(() => document.documentElement.classList.add("dark"));
  const darkBg = await page.locator("body").evaluate(el => getComputedStyle(el).backgroundColor);
  expect(lightBg).not.toBe(darkBg);
});
```

**Storage-key assertion pattern (recommended for D-15 / D-16 verification):**
```typescript
test("setTheme writes to multica_theme key", async ({ page }) => {
  await loginAsDefault(page);
  // Navigate to Settings → Appearance, click "Dark"
  // ...interaction...
  const stored = await page.evaluate(() => localStorage.getItem("multica_theme"));
  expect(stored).toBe("dark");
});
```

---

### `e2e/typography.spec.ts` (NEW Wave 0 — e2e-test, network-assertion)

**Analog:** `e2e/auth.spec.ts` (page.goto + locator). **No existing test inspects network** — this introduces a new assertion shape sketched in RESEARCH §"Italic woff2 loads on web".

**Imports pattern (from `e2e/auth.spec.ts:1`):**
```typescript
import { test, expect } from "@playwright/test";
```

**Network-log pattern (RESEARCH §Verification Recipe 2):**
```typescript
test("Inter italic woff2 loads on web", async ({ page }) => {
  const responses: string[] = [];
  page.on("response", r => responses.push(r.url()));
  await page.goto("/");
  // Until Phase 2 introduces italic content, force render via inline style:
  await page.evaluate(() => {
    const el = document.createElement("em");
    el.textContent = "italic-test";
    document.body.appendChild(el);
  });
  // Allow font fetch
  await page.waitForTimeout(500);
  expect(responses.some(u => /Inter.*italic/i.test(u))).toBe(true);
});
```
> RESEARCH note: until Phase 2 adds italic headlines, this test may need `.skip` or the inline-em hack above to force Inter italic to be requested.

---

### `scripts/grep-hardcoded-colors.sh` (NEW Wave 0 — shell-script, grep)

**Analog:** `scripts/check.sh` lines 1-2 (bash header).

**Imports / header pattern (from `scripts/check.sh:1-2`):**
```bash
#!/usr/bin/env bash
set -euo pipefail
```

**Body — lifted directly from RESEARCH §Verification Recipe 4:**
```bash
#!/usr/bin/env bash
set -euo pipefail

# One-shot post-Phase-1 verification: zero hardcoded Tailwind color classes
# in shared packages. NOT a CI rule (per CONTEXT D-19); intended for manual
# pre-merge validation.
#
# Documented exceptions (do NOT migrate):
#   - apps/web/app/(landing)/**  — landing palette out of scope
#   - packages/views/settings/components/appearance-tab.tsx
#       LIGHT_COLORS / DARK_COLORS / macOS traffic-light hex
#       (RESEARCH §Pitfall 8)
#   - search-command.tsx <mark> highlight (if planner accepts deferred)
#   - agent-transcript-dialog.tsx 'thinking' violet (if planner accepts deferred)

grep -rn -E '\b(text|bg|border|ring|fill|stroke|from|to|via|outline|decoration|divide|placeholder|caret|accent|shadow)-(red|blue|yellow|green|orange|purple|pink|indigo|amber|emerald|cyan|teal|sky|violet|fuchsia|rose|lime)-[0-9]+' \
  packages/views packages/ui \
  || { echo "✓ No hardcoded Tailwind color classes found"; exit 0; }

echo "✗ Hardcoded color violations remain (see above)" >&2
exit 1
```

---

## Shared Patterns

### Semantic-token consumption in `className`

**Source:** `packages/views/autopilots/components/autopilot-detail-page.tsx:53` (`text-destructive`) and `apps/web/components/theme-provider.tsx`-consumer renders throughout views.

**Apply to:** every migrated view file.

```tsx
// Always semantic, never hex / numeric Tailwind color:
className="text-success bg-success/15"
className="text-info"
className="bg-warning"
```

**Rule (from CLAUDE.md "CSS Architecture"):** "Use semantic tokens (`bg-background`, `text-muted-foreground`). Never use hardcoded Tailwind colors (`text-red-500`, `bg-gray-100`)."

---

### `useTheme()` consumption (cross-app shared hook)

**Source:** `packages/views/settings/components/appearance-tab.tsx:3,88`:
```tsx
import { useTheme } from "@multica/ui/components/common/theme-provider";
// ...
const { theme, setTheme } = useTheme();
```
Also consumed at `packages/views/search/search-command.tsx:143` (path verified by `search-command.test.tsx:127-129` mock).

**Apply to:** any future view that needs theme state (do NOT import from `next-themes` directly — that creates a parallel surface).

---

### Vitest mock for `useTheme`

**Source:** `packages/views/search/search-command.test.tsx:127-129`:
```typescript
vi.mock("@multica/ui/components/common/theme-provider", () => ({
  useTheme: () => ({ theme: mockTheme.current, setTheme: mockSetTheme }),
}));
```

**Apply to:** any new component test that touches theme state. Pattern uses `vi.hoisted()` for mutable fixture refs (`mockTheme.current`, `mockSetTheme`) — see lines 8-30 of the same file for the canonical hoisted-mock setup.

---

### Playwright login + workspace navigation

**Source:** `e2e/settings.spec.ts:8-17` and `e2e/auth.spec.ts:16-21`:
```typescript
import { loginAsDefault } from "./helpers";

await loginAsDefault(page);
// returns workspace slug; user is on /:slug/issues
```

**Apply to:** `e2e/theme-toggle.spec.ts`. (`e2e/typography.spec.ts` may go straight to `/` since it's a font-asset test.)

---

### Conventional commit prefixes (from CLAUDE.md "Commit Rules")

Suggested per-file groupings (Claude's discretion per CONTEXT):
- `feat(ui): replace tokens.css with AlgoPlan OKLCH palette + add tag-p0..p3 tokens`
- `feat(ui): set storageKey="multica_theme" on shared ThemeProvider`
- `feat(web): enable Inter italic axis in next/font loader`
- `feat(desktop): add FOUC inline script + Inter italic + drop Source Serif`
- `refactor(views): migrate hardcoded Tailwind colors to semantic tokens`
- `test(views,ui): add Wave 0 token-binding + theme-toggle + typography specs`

---

## No Analog Found

| File | Reason |
|------|--------|
| `apps/desktop/src/renderer/index.html` (FOUC `<script>` insertion) | The codebase has no other inline pre-React boot script. Pattern is taken verbatim from CONTEXT D-16 / RESEARCH §"FOUC Inline Script Placement" — both reproduce the same recipe. |
| `e2e/typography.spec.ts` (network-response capture) | No existing E2E test asserts on `page.on("response", ...)`. RESEARCH §Verification Recipe 2 supplies the recipe in full. |

---

## Open Token Decisions (planner must resolve)

These are **not** pattern questions — they're token-naming decisions surfaced by the violation grep that block the migration plans:

1. **Search highlight `<mark>` token** (see Pattern D above) — new `--highlight` vs `bg-warning/15`.
2. **Agent "thinking" violet** in `agent-transcript-dialog.tsx:80` — new `--accent-thinking` vs reuse `--brand` vs documented exception (keep violet hardcoded).
3. **Chat avatar fallback** purple (`bg-purple-100 text-purple-700`) — replace with `bg-secondary text-secondary-foreground` vs introduce `--brand-soft`.
4. **`packages/core/theme/`** — SKIP (research recommendation) vs THIN RE-EXPORT (literal D-17).
5. **`multica_theme` migration** — accept silent reset vs add one-shot legacy `theme` key migration (RESEARCH §Open Question 1).

> The plan templates above support EITHER resolution per question — pick before plan finalization.

---

## Metadata

**Analog search scope:**
- `packages/ui/styles/`
- `packages/ui/components/common/`
- `packages/views/{autopilots,chat,projects,modals,search,issues,settings}/`
- `apps/web/{app/,components/}`
- `apps/desktop/src/renderer/{,src/}`
- `e2e/`
- `scripts/`

**Files scanned:** ~30 (all in-scope edit targets + their cross-app consumers + closest test/script analogs).

**Pattern extraction date:** 2026-04-24
