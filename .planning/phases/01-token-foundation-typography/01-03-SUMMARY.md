---
phase: 01-token-foundation-typography
plan: 03
subsystem: ui
tags: [dark-mode, theme, fouc, next-themes, electron, localStorage]

# Dependency graph
requires:
  - phase: 01-token-foundation-typography
    provides: "Wave 0 e2e/theme-toggle.spec.ts asserts multica_theme storage key contract — this plan satisfies it via shared ThemeProvider config"
provides:
  - "Shared @multica/ui ThemeProvider configured with storageKey=multica_theme — both apps share one localStorage channel"
  - "Pre-React FOUC inline script in apps/desktop/src/renderer/index.html — .dark class lands on <html> before React mounts"
  - "End-to-end dark-mode wiring: web (next-themes via shared provider) + desktop (FOUC script + shared provider) read/write the SAME multica_theme key"
affects: [01-04-violation-migration, 04-dashboard-shell, 06-settings-views, 07-rebrand]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Shared next-themes config lives at @multica/ui ThemeProvider — apps mount it directly (desktop) or via thin re-export shim (web), no duplicate config"
    - "Pre-React inline FOUC script pattern (synchronous <script> in <head>, no module/defer/async, try/catch for Safari private mode safety) — reusable for any future Electron HTML entrypoint"
    - "Storage key alignment contract: pre-React script and post-mount provider share storageKey constant — drift would manifest as FOUC regression"

key-files:
  created: []
  modified:
    - "packages/ui/components/common/theme-provider.tsx"
    - "apps/desktop/src/renderer/index.html"

key-decisions:
  - "Q1 (planner-locked): No migration code for legacy 'theme' localStorage key — internal users see one-time silent reset to defaultTheme=system. No production AlgoPlan users exist; minimal data loss accepted."
  - "Q2 (orchestrator-locked, plan reduced from 3 tasks to 2): D-17 LITERAL placement at packages/core/theme/index.ts REJECTED. The canonical useTheme/ThemeProvider stays at packages/ui/components/common/theme-provider.tsx. Original Plan 03 Task 3.3 (create thin re-export barrel) was DROPPED entirely — not deferred, not relocated. Rationale: existing consumers (appearance-tab.tsx, search-command.tsx) already import from the canonical @multica/ui path, no boundary violation, no need for a parallel surface."
  - "FOUC script position: between <title> and </head> (per CONTEXT D-16 verbatim), guarantees execution before <body> parsing reaches the React loader script tag."
  - "Script tag uses plain <script> — NO type=module, NO defer, NO async — module/defer/async would execute AFTER DOM parse and defeat the FOUC purpose."

patterns-established:
  - "End-to-end storage-key contract: Wave 0 e2e/theme-toggle.spec.ts asserts the multica_theme key write — Plan 03 wires both ThemeProvider and FOUC script to that exact key, completing the contract chain (test → provider config → pre-React script)."
  - "Q1-style 'silent reset' pattern for pre-launch storage migrations: when no production users exist, document the silent reset in the commit body and SUMMARY rather than carrying compatibility code (matches CLAUDE.md 'no backwards-compatibility' rule)."

requirements-completed: [FND-03]

# Metrics
duration: ~3min
completed: 2026-04-24
---

# Phase 1 Plan 03: Theme storageKey + Desktop FOUC Inline Script Summary

**Shared ThemeProvider now persists to `multica_theme` localStorage; desktop renderer applies `.dark` class via synchronous inline script in `<head>` before React mounts — eliminating dark-mode flash on Electron window open.**

## Performance

- **Duration:** ~3 min
- **Started:** 2026-04-24T23:19:26Z
- **Completed:** 2026-04-24T23:21:36Z (approx)
- **Tasks:** 2 (Task 3.3 dropped per orchestrator decision — see Deviations)
- **Files modified:** 2

## Accomplishments

- `packages/ui/components/common/theme-provider.tsx` now sets `storageKey="multica_theme"`, applied to both apps via the single shared mount point. Web's `apps/web/components/theme-provider.tsx` is a re-export shim (untouched), and desktop's `apps/desktop/src/renderer/src/App.tsx` imports the shared provider directly — one config change covers both.
- `apps/desktop/src/renderer/index.html` `<head>` carries the pre-React FOUC inline script (verbatim from CONTEXT D-16), wrapped in try/catch for Safari private-mode quota safety.
- The Wave 0 `e2e/theme-toggle.spec.ts` assertion that theme writes land on `multica_theme` (not the next-themes default `theme` key) now traces back to a real provider configuration — contract chain closed.
- Boundary rule preserved: zero new files in `packages/core/`; `packages/core` retains its zero-react-dom posture.

## Task Commits

Each task was committed atomically:

1. **Task 3.1: Add storageKey="multica_theme" to shared ThemeProvider** — `9de9479b` (feat)
2. **Task 3.2: Insert pre-React FOUC inline script in desktop index.html** — `7f4938d2` (feat)

**Plan metadata commit:** to be added after this SUMMARY is staged.

_Note: Original plan listed 3 tasks; Task 3.3 (`packages/core/theme/index.ts` re-export barrel) was DROPPED per orchestrator's locked Q2 decision. See Deviations._

## Files Created/Modified

- `packages/ui/components/common/theme-provider.tsx` — Added one line `storageKey="multica_theme"` between `disableTransitionOnChange` and `{...props}`. All other lines (imports, useTheme re-export, TooltipProvider wrap) untouched.
- `apps/desktop/src/renderer/index.html` — Inserted 11-line FOUC script block (HTML comment + `<script>...</script>`) between `<title>Multica</title>` and `</head>`. Body of `<body>` and the React loader `<script type="module" src="/src/main.tsx">` untouched.

### Exact ThemeProvider config after edit

```tsx
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
      storageKey="multica_theme"
      {...props}
    >
      <TooltipProvider delay={500}>
        {children}
      </TooltipProvider>
    </NextThemesProvider>
  );
}
```

### Exact FOUC script as inserted

```html
    <title>Multica</title>
    <!-- Pre-React FOUC prevention: read theme from localStorage, apply .dark
         to <html> before the renderer mounts. Synchronous, no network.
         Storage key matches @multica/ui ThemeProvider storageKey="multica_theme".
         Wrapped in try/catch for Safari private-mode quota errors (RESEARCH Pitfall 4). -->
    <script>
      try {
        var t = localStorage.getItem('multica_theme') || 'system';
        var dark = t === 'dark' || (t === 'system' && matchMedia('(prefers-color-scheme: dark)').matches);
        if (dark) document.documentElement.classList.add('dark');
      } catch (e) {}
    </script>
  </head>
```

## Decisions Made

- **Q1 (silent reset accepted, no migration code).** The default next-themes `storageKey` was `theme`. Switching to `multica_theme` orphans whatever value internal users had stored under `theme`. Per planner Q1 decision (locked at planning time and re-confirmed by orchestrator): no migration shim, no dual-read fallback. Internal users will see a one-time silent reset to `defaultTheme="system"` and re-pick their preference. Rationale: no production AlgoPlan users; CLAUDE.md "no backwards-compatibility" rule applies (the product is not yet live).
- **Q2 (D-17 literal placement REJECTED, plan reduced from 3 tasks to 2).** The original plan included Task 3.3 to create a thin re-export barrel at `packages/core/theme/index.ts`. The orchestrator locked the decision to drop this task entirely — not to relocate or defer it. Rationale: the canonical `useTheme`/`ThemeProvider` already lives at `packages/ui/components/common/theme-provider.tsx` and is consumed without issue by `appearance-tab.tsx` and `search-command.tsx`. Adding a `@multica/core/theme` barrel was redundant — the shared surface already exists at the canonical UI path. No `packages/core/theme/` directory was created, no entry was added to `packages/core/package.json` `exports`, no react-dom-related risk was introduced into `packages/core`.
- **FOUC script positioned BEFORE the React loader.** The inline `<script>` lives in `<head>`; the React loader (`<script type="module" src="/src/main.tsx">`) lives at the end of `<body>`. The HTML parser executes the inline script during `<head>` parsing — long before it reaches the React loader — so the `.dark` class is on `<html>` before any React module fetch begins.
- **Plain `<script>` tag — no `type="module"`, `defer`, or `async`.** All three would defer execution until after DOM parse, defeating the FOUC purpose. Plain inline `<script>` is the only correct shape here.

## Deviations from Plan

### Plan-level scope reduction (orchestrator-locked, not auto-deviation)

**Original Plan 03 task count: 3. Executed task count: 2.**

- **Task 3.3 (`Create thin @multica/core/theme barrel (zero react-dom)`) DROPPED entirely.**
- **Reason:** Orchestrator prompt locked Q2: "D-17 LITERAL placement REJECTED. Do NOT create packages/core/theme/index.ts. The canonical useTheme/ThemeProvider stays at packages/ui/components/common/theme-provider.tsx (no boundary violation)."
- **Files NOT touched as a result:** `packages/core/theme/index.ts` (NOT created), `packages/core/package.json` (NOT modified — no `./theme` exports entry added).
- **Boundary rule status:** UNCHANGED. `packages/core` continues to satisfy the zero-react-dom rule from CLAUDE.md.
- **Existing canonical consumers:** Continue to work unchanged. `packages/views/settings/components/appearance-tab.tsx`, `packages/views/search/search-command.tsx`, and `apps/web/components/theme-provider.tsx` all import from `@multica/ui/components/common/theme-provider` — that path is unaltered.
- **Threat register impact:** T-01-03-06 (boundary violation via theme barrel re-export) is now MOOT. There is no barrel; the threat surface does not exist.

### In-scope deviation rules

**None applied.** The two executed tasks went exactly as the plan specified — no Rule 1 bug fixes, no Rule 2 missing-critical adds, no Rule 3 blockers, no Rule 4 architectural questions surfaced.

---

**Total deviations:** 0 auto-fixed. 1 plan-level scope reduction (Task 3.3 dropped per orchestrator-locked Q2 decision — not an executor-side deviation).
**Impact on plan:** Plan goal (FND-03 dark-mode wiring + FOUC prevention) fully achieved with the 2 executed tasks. The dropped task was non-essential surface plumbing, not core functionality.

## Issues Encountered

None.

## Verification Status

### Automated checks (per plan `<verify>` blocks)

**Task 3.1 verify** — all PASS:

```
GREP-1: storageKey="multica_theme" present in packages/ui/components/common/theme-provider.tsx
GREP-2: storageKey line is positioned adjacent to disableTransitionOnChange (confirmed via grep -B1 -A1)
pnpm typecheck (full monorepo): exit 0 — 6 tasks successful, 6 total, 18.2s
```

**Task 3.2 verify** — all PASS:

```
OK: multica_theme present in apps/desktop/src/renderer/index.html
OK: documentElement.classList.add present
OK: try { block present
OK: FOUC script is NOT type=module
pnpm --filter @multica/desktop run typecheck: exit 0 (typecheck:node + typecheck:web both clean)
```

### Boundary preservation (Q2 audit)

```
$ ls packages/core/theme
ls: packages/core/theme: No such file or directory
```

Confirmed: no new files in `packages/core/`. Boundary rule (CLAUDE.md "packages/core/ — zero react-dom") trivially preserved by not adding the barrel.

### Manual FOUC check (Plan 03 Task 3.2 done criterion)

The `apps/desktop/scripts/manual-fouc-check.md` recipe (Wave 0 deliverable) requires a human to launch the desktop app, set `localStorage.setItem('multica_theme', 'dark')`, reload, and visually confirm no white flash. This is a `human-verify` activity that is **outside the automated executor scope** — it cannot be performed in this CI-style execution. The script's contract is verified by code review (the inline body in `<head>` matches D-16 verbatim, runs synchronously, applies `.dark` before React mount per HTML parser semantics) and by the post-deploy manual sign-off step that the user owns.

**Status: code-level verification PASS; manual visual sign-off DEFERRED to user.**

## User Setup Required

None — no environment variables, no external service configuration. The `multica_theme` localStorage key is set automatically on first theme interaction; no user action needed at deploy time.

## Self-Check: PASSED

**Files claimed in this SUMMARY exist:**
- `packages/ui/components/common/theme-provider.tsx` — FOUND, contains `storageKey="multica_theme"`
- `apps/desktop/src/renderer/index.html` — FOUND, contains `multica_theme`, `documentElement.classList.add`, and `try {`

**Commits claimed in this SUMMARY exist:**
- `9de9479b` — FOUND in `git log` (`feat(01-03): set storageKey="multica_theme" on shared ThemeProvider`)
- `7f4938d2` — FOUND in `git log` (`feat(01-03): add pre-React FOUC inline script to desktop index.html`)

**Boundary preservation claim verified:**
- `packages/core/theme/` — confirmed NOT to exist (per `ls` check above)

## Next Phase Readiness

- **Plan 04 (Violation Migration)** can begin — it modifies `packages/views/` files and does not depend on the theme storage layer. No blockers.
- **Phase 4 (Dashboard Shell)** dark-mode dependency — fully satisfied. Any new Phase 4 component using semantic tokens (`bg-background`, `text-foreground`) will switch correctly when `.dark` is on `<html>`.
- **Phase 6 (Settings → SET-02 Appearance Tab)** — already imports `useTheme` from the canonical path; storage key contract guarantees the toggle persists across reloads on both apps.
- **Phase 7 (Rebrand)** — explicitly preserved the `multica_theme` key per RBR-05 (no rename); no rebrand-time data loss risk.

### Open observations for downstream phases

- The `apps/web/components/theme-provider.tsx` shim was inspected and confirmed to be a pure re-export — it does NOT override `storageKey` or any other prop, so the shared config flows through unmodified. Future PRs that touch this shim must preserve that pure-shim shape.
- Desktop `apps/desktop/src/renderer/src/App.tsx` already wraps the app in `<ThemeProvider>` from `@multica/ui` (lines 8 + 214). No mount changes were needed.

---
*Phase: 01-token-foundation-typography*
*Plan: 03*
*Completed: 2026-04-24*
