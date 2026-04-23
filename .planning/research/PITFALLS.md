# Pitfalls Research

**Domain:** Large-scale frontend redesign in a React monorepo (rebrand + new design tokens + Kanban view + Storybook)
**Researched:** 2026-04-23
**Confidence:** HIGH — all findings verified against actual codebase files

---

## Critical Pitfalls

### Pitfall 1: Hardcoded Tailwind Colors Surviving the Token Swap

**What goes wrong:**
Six instances of hardcoded Tailwind color utilities (`text-blue-500`, `bg-red-500/20`, `bg-yellow-200`, etc.) already exist in `packages/views/` (confirmed in `autopilot-detail-page.tsx`, `search-command.tsx`, `agent-transcript-dialog.tsx`). During a redesign that replaces all tokens, these classes do not get flagged by the token audit because they compile fine — they just produce the wrong visual result. New components written during the redesign will import the same color-writing habits from adjacent files they use as templates.

**Why it happens:**
Semantic token names (`text-destructive`) are less intuitive than raw values (`text-red-500`) for edge cases like syntax highlighting, inline code chips, and status badge colors. Developers reach for the concrete name when no semantic alias exists yet. The codebase already has six such instances before the redesign — they will multiply under time pressure.

**How to avoid:**
1. Before writing any new component, define semantic aliases for every color the new palette requires. The green/mint/forest palette needs additions to `tokens.css` beyond the current set: `--color-canvas`, `--color-sidebar-bg`, and per-priority/per-tag chip colors as named semantic tokens.
2. Add a CI lint rule (`grep -rn "text-red-\|text-blue-\|text-green-\|bg-red-\|bg-blue-\|bg-green-\|text-orange-\|bg-orange-" packages/views packages/ui --include="*.tsx"`) that fails if any raw Tailwind color utility appears in shared packages. Run it as a pre-commit check.
3. When token aliases genuinely don't exist (chip accent bars, agent transcript colors), create `--color-tag-backend`, `--color-tag-frontend`, etc. in `tokens.css` instead of using raw hues.

**Warning signs:**
- A PR diff for any shared component contains `text-[color]-[number]` outside of a string interpolation used for dynamic color selection.
- Test snapshots contain Tailwind class names with raw color numbers.

**Phase to address:** Foundation (token definition phase) — lock down the new palette completely before any component is touched.

---

### Pitfall 2: Tailwind JIT Not Seeing Classes in Shared Packages

**What goes wrong:**
If a new Storybook app or a new app entry point is created without `@source` directives pointing to `packages/ui`, `packages/core`, and `packages/views`, Tailwind's JIT engine will not scan those files. Classes used only in shared packages (but not in the app's own files) will be purged, producing invisible, unstyled components in that app context. This is already addressed in `apps/web/app/globals.css` and `apps/desktop/src/renderer/src/globals.css` with explicit `@source` directives — but a new Storybook entry point will not inherit them automatically.

**Why it happens:**
Storybook runs its own build pipeline. Its CSS entry point is separate from the app's `globals.css`. When setting up Storybook for the showroom, the natural starting point is to copy the Storybook scaffold — which has no `@source` directives for the monorepo's packages.

**How to avoid:**
The Storybook app's CSS entry (`packages/showroom/.storybook/preview.css` or equivalent) must contain:
```css
@source "../../packages/ui/**/*.{ts,tsx}";
@source "../../packages/core/**/*.{ts,tsx}";
@source "../../packages/views/**/*.{ts,tsx}";
```
Include the same `@import` chain as the app entry points: `tailwindcss`, `tw-animate-css`, `shadcn/tailwind.css`, `tokens.css`, `base.css`. Verify immediately after scaffold by rendering a component that only uses `bg-sidebar` — if it's wrong, JIT scanning is broken.

**Warning signs:**
- Storybook renders components with no background color or default browser styling where there should be design system colors.
- `bg-background` class is present in DOM but computes to `transparent` in browser DevTools.

**Phase to address:** Storybook setup (before any stories are authored).

---

### Pitfall 3: Dark Mode FOUC and System-Preference Mismatch

**What goes wrong:**
`next-themes` prevents FOUC on Next.js via an inline `<script>` that runs before React hydration. This works on the web app. On Electron (no SSR), `next-themes` is also used (`apps/desktop` imports `ThemeProvider` from `@multica/ui/components/common/theme-provider.tsx`) but there is no server-rendered HTML — the renderer starts blank and React paints. When the user prefers `system` theme and the OS is in dark mode, the renderer briefly shows light mode until React mounts and `next-themes` reads `prefers-color-scheme`. The FOUC is approximately 100–200ms — visible on slower machines or after workspace switch (which re-mounts the layout).

Additionally, the new deep-forest-green sidebar token (`--sidebar`) will be dramatically different between light and dark. A 200ms FOUC from light-green to dark-sidebar is far more visible than the current near-neutral light/dark difference.

**How to avoid:**
For Electron: inject a `<script>` in the HTML shell (`electron-vite`'s `index.html`) that reads `localStorage.getItem('theme')` or `window.matchMedia('(prefers-color-scheme: dark)').matches` and immediately sets `document.documentElement.classList` to `dark` before the React bundle loads. This mirrors what `next-themes` does server-side on Next.js.

For web: the current `disableTransitionOnChange` prop on `NextThemesProvider` is correct — do not remove it. The new token values are more vivid, so even a 50ms transition could be perceptible. Keep the flag.

**Warning signs:**
- Electron app shows a light flash on startup before settling to dark.
- Theme toggle causes a brief white/light flash before the dark class is applied.
- Browser DevTools: `document.documentElement.classList` does not contain `dark` at page load in a dark-mode OS context.

**Phase to address:** Foundation (token + theme infrastructure) — must be solved before any component uses the new vivid sidebar color.

---

### Pitfall 4: Inter Italic Missing in Production or Wrong Subset

**What goes wrong:**
The redesign introduces Inter italic for display headlines. The web app uses `next/font/google` which can load italic variants, but the current `Inter` config in `apps/web/app/layout.tsx` only specifies `subsets: ["latin"]` and no `style` array — meaning italic is not currently requested. The desktop already has `@fontsource-variable/inter` installed (confirmed in `apps/desktop/package.json`), which includes variable italic axes by default.

If the web layout is updated to add `style: ["italic"]` but the `subsets` array is not also verified, italic will load but the subset may miss characters used in display text. More critically, if the italic request is added to `next/font` but the component uses `font-serif` (Source Serif 4) for headlines instead of `font-sans italic`, the wrong font renders.

**Why it happens:**
The current font comment in `apps/web/app/layout.tsx` mentions "Editorial serif used for onboarding headlines" for `Source_Serif_4` with italic support. The redesign mock calls for Inter italic headlines — the developer must switch the headline font from Source Serif 4 to Inter italic, which requires: (1) adding `style: ["italic"]` to the `Inter` config and (2) updating headline CSS to use `font-sans italic` instead of `font-serif italic`.

**How to avoid:**
1. Update `Inter` in `apps/web/app/layout.tsx` to `style: ["normal", "italic"]`.
2. Create a semantic `--font-display` token pointing to `var(--font-sans)` so headlines do not hardcode font family.
3. Verify in Chromium DevTools Network tab that the Inter italic woff2 file is loaded (it will be a separate request from `fonts.googleapis.com` or `fonts.gstatic.com`).
4. Keep `Source_Serif_4` loaded only if it's still used somewhere — if all headline italic is moved to Inter, remove it to reduce font payload.

**Warning signs:**
- Display headlines render in serif (fallback) or system sans, not Inter.
- DevTools font panel shows "Inter Regular" but not "Inter Italic" loaded.
- Layout shift on headline-heavy pages (Inter italic has different metrics than system italic fallback).

**Phase to address:** Foundation (typography tokens).

---

### Pitfall 5: Rebrand Misses — Strings, Deep Links, Electron Metadata

**What goes wrong:**
"Multica" appears in many places that are not obvious text strings. A search-and-replace on visible UI text will miss the following confirmed locations:

- `apps/web/app/auth/callback/page.tsx`: Deep link scheme `multica://auth/callback` — this is also a registered URL scheme in `electron-builder.yml` and `apps/desktop/src/main/index.ts`. If the scheme is not updated consistently, web→desktop auth callback breaks.
- `apps/web/app/layout.tsx`: `title: "Multica — Project Management..."`, `siteName: "Multica"`, `site: "@multica_hq"`, `metadataBase: new URL("https://www.multica.ai")`.
- `apps/web/app/robots.ts` and `apps/web/app/sitemap.ts`: `baseUrl = "https://www.multica.ai"`.
- `electron-builder.yml`: `appId: ai.multica.desktop`, `productName: Multica`, URL scheme `multica`.
- `apps/desktop/src/main/index.ts`: Window title `"Multica Canary"`.
- `apps/desktop/src/renderer/src/components/update-notification.tsx`: `https://multica.ai/changelog`.
- `apps/desktop/src/renderer/src/components/daemon-settings-tab.tsx`: GitHub URL `multica-ai/multica`.
- localStorage keys: `multica_token`, `multica_navigation`, `multica_issue_draft`, `multica_issues_view`, `multica_issues_scope`, `multica_my_issues_view`, `multica_comment_collapse` (confirmed in `packages/core/`).
- Test strings: `"Sign in to Multica"` in `packages/views/auth/login-page.test.tsx` line 96 — breaks if UI string changes.
- Chat component strings: `"Ask Multica"`, `"Multica is working..."`, `"Welcome to Multica"`, `"Nothing to share with Multica..."` (6+ occurrences in `chat-fab.tsx`, `chat-window.tsx`, `context-anchor.tsx`).

**Why it happens:**
The PROJECT.md decision to keep internal package names as `@multica/*` is correct, but it means a grep for `"multica"` returns thousands of import statements, drowning out the actual user-facing strings. Developers stop looking after skimming the first few hundred hits.

**How to avoid:**
Build a specific search that excludes import paths:
```bash
grep -rn "Multica\|multica\.ai\|multica://" \
  packages/views apps/web apps/desktop \
  --include="*.tsx" --include="*.ts" \
  | grep -v "from ['\"]@multica\|import.*@multica\|require.*@multica" \
  | grep -v "node_modules"
```
Then triage each hit: keep internal keys (`multica_token` — these are out of scope per PROJECT.md), update user-facing strings. Create a reusable brand constant (`BRAND_NAME = "AlgoPlan"`) imported from `packages/core/config.ts` instead of duplicating the literal.

**Critical decision on localStorage keys:** The PROJECT.md explicitly scopes the rebrand to "app-facing" only. localStorage keys with `multica_` prefix are internal — do NOT rename them. Renaming would silently clear all user preferences on next app load (stored theme, view state, drafts). This is a user-hostile data loss bug disguised as a brand cleanup.

**Warning signs:**
- QA reports browser tab still shows "Multica" in page title after login.
- Desktop auth callback fails after renaming the URL scheme in only one of the two locations (web callback and Electron main).
- Existing user loses their dark-mode preference after update (caused by renamed localStorage keys).

**Phase to address:** Rebrand pass (dedicated phase, after all visual work is done) — requires a targeted audit list, not a bulk find-replace.

---

### Pitfall 6: WS Invalidation Racing Kanban Optimistic Update

**What goes wrong:**
The `BoardView` component uses a local column state that is deliberately frozen during drags (via `isDraggingRef`) to prevent TanStack Query refetches from resetting the drag-in-progress position. However, after `handleDragEnd` fires `onMoveIssue`, the mutation triggers server-side and the WS `issue:updated` event arrives within 100ms (the debounce window in `use-realtime-sync.ts`). If the WS event arrives before the mutation's optimistic update settles, the board flickers: the card briefly jumps back to its old column while the query invalidates, then settles in the new column.

The existing WS debounce in `use-realtime-sync.ts` (100ms) already has a known race (per CONCERNS.md: "If two issue:updated events arrive within 100ms, the first timer is cleared"). A rapid drag followed immediately by a WS event from another user editing the same issue creates exactly this race.

**How to avoid:**
1. After `onMoveIssue` fires, keep `isDraggingRef.current = true` for one additional animation frame after the mutation is dispatched — not just after the drag gesture ends. This gives the optimistic update time to apply before unlocking TQ-driven re-renders.
2. Alternatively, gate the `useEffect` that syncs TQ issues into local column state with a `settleLock` ref that resets after the mutation's `onSettled` callback.
3. The simplest defense: the `onMoveIssue` prop should call `queryClient.cancelQueries` for the relevant issue query before dispatching the mutation, preventing an in-flight refetch from overwriting the optimistic position.

**Warning signs:**
- Cards visibly "snap back" to old column then jump to new column after a drop.
- Occurs only when another browser tab has the same board open (two WS listeners).
- Harder to reproduce in single-tab tests.

**Phase to address:** Kanban phase — build the mutation handler with WS-awareness from day one, not as a fix-up.

---

### Pitfall 7: Drag-and-Drop Breaking in Scrollable Columns

**What goes wrong:**
`dnd-kit`'s `PointerSensor` calculates drag offsets relative to the initial pointer position at drag start. When columns are vertically scrollable (which they will be with `overflow-y: auto` on `BoardColumn`), scrolling the column while dragging causes the drag overlay to appear at the wrong position — the card follows the pointer but the overlay's computed drop target is offset by the scroll distance.

The current `BoardView` uses `DragOverlay` with `dropAnimation={null}`, which is correct for visual smoothness, but the collision detection (`kanbanCollision`) uses `pointerWithin` and `closestCenter`. Both strategies work with the static snapshot of droppable rects taken at drag start — they do not update as the column scrolls.

**How to avoid:**
1. Add `ScrollableContainerScrollSensor` or use dnd-kit's built-in scroll activation: wrap each `BoardColumn` scroll container with a ref and pass it to `DndContext`'s `autoScroll` prop. Test explicitly: drag a card to the bottom of a full column, verify the column scrolls and the drop target updates.
2. Alternatively, use `MeasuringStrategy.Always` from `@dnd-kit/core` so droppable rect measurements are refreshed during scroll. This is more expensive but eliminates the stale-rect problem.
3. Test on a column with >20 cards to trigger scrollable column behavior.

**Warning signs:**
- Drop target highlights the wrong card when the column has been scrolled before/during drag.
- Card drops into position 3 when the visual target was position 8.

**Phase to address:** Kanban phase — include scroll stress tests in definition of done.

---

### Pitfall 8: Component Rewrite Breaking Test Selectors

**What goes wrong:**
The test at `packages/views/auth/login-page.test.tsx` line 96 asserts `screen.getByText(/sign in to multica/i)`. When the rebrand changes this string to "Sign in to AlgoPlan", this test fails. This is a legitimate test failure that requires a test update — but it will appear in CI alongside real regressions, making it harder to distinguish signal from noise during the rebrand pass. With 22 test files in `packages/views/`, many tests use text matchers tied to current brand strings.

The more dangerous failure mode: a component is rewritten with a new DOM structure, tests that relied on `getByRole("button", { name: /create issue/i })` now fail because the button's accessible name changed to "New task" or the ARIA labeling was lost in the rewrite. The test is updated to match the new name — but the real regression (missing `aria-label` entirely) is masked.

**How to avoid:**
1. Separate brand-string test updates from structural test updates. Brand strings should be constants; update the constant and the test updates automatically.
2. Before any component rewrite, run `pnpm --filter @multica/views test` and document the current pass count. After the rewrite, if count drops, investigate each failure individually.
3. Prefer `getByRole` over `getByText` for interactive elements — role queries are refactor-resilient and also verify accessibility. A button that lost its `aria-label` during rewrite will fail a role-based test, surfacing the real regression.
4. Add a "ARIA structure smoke test" for each new component: render it, assert that key interactive elements have accessible roles and names.

**Warning signs:**
- CI shows N test failures but they all look like text mismatches, not structural failures — a sign that real failures are hiding behind brand-string updates.
- `getByText` failures are fixed by updating strings without checking why the role changed.

**Phase to address:** Throughout — establish the rule at the start, verify after each phase's component rewrites.

---

### Pitfall 9: Zustand Selector Footguns Introduced During Component Refactor

**What goes wrong:**
CONCERNS.md documents this risk explicitly. During the redesign, `packages/views/` components will be heavily rewritten. The most common mistake is returning a freshly constructed object from a Zustand selector in a component that is otherwise correct:

```typescript
// This causes infinite re-renders
const { sortBy, sortDirection } = useViewStore((s) => ({
  sortBy: s.sortBy,
  sortDirection: s.sortDirection,
}));
```

The `BoardView` (already written) uses separate primitive selectors correctly. New components written during the shell redesign (sidebar state, filter chips, view toggle) will be authored by following nearby examples — if the nearby example uses the object-return pattern, the bug propagates.

**Why it happens:**
Destructuring from a selector feels natural. TypeScript provides no warning. The bug only manifests at runtime, and only in components that re-render frequently (those connected to frequently-updating stores like filter state or tab state). Storybook stories will not catch it because stories do not simulate rapid store updates.

**How to avoid:**
1. Select primitives separately (`const sortBy = useViewStore(s => s.sortBy)`), or use `shallow` from `zustand/shallow` for multi-field selectors.
2. Add a selector stability lint test for every new Zustand-connected component: call `selector(state) === selector(state)` and assert `true`. This is a one-liner per selector and catches the object-return bug immediately.
3. In code review, flag any `useStore(s => ({ ... }))` pattern that does not use `shallow`.

**Warning signs:**
- A component that reads from a Zustand store causes unrelated sibling components to flicker.
- React DevTools Profiler shows the component rendering on every keystroke in an unrelated input.
- `useViewStore`, `useTabStore`, or similar hooks are selected with object literal returns.

**Phase to address:** Shell phase (sidebar, filter chips, view toggle) — this is where new Zustand-connected components will be introduced.

---

### Pitfall 10: DragStrip Missing on New Full-Window Views

**What goes wrong:**
The `DragStrip` component must be the first flex child of any full-window view in the desktop app. Without it, macOS users cannot drag the window by its top edge. The current codebase correctly includes `DragStrip` in: `new-workspace-page.tsx`, `no-access-page.tsx`, `invite-page.tsx`, `create-workspace.tsx`, `onboarding-flow.tsx`, and several onboarding step files.

The redesign adds new pre-workspace flows (Login, Signup, Email-Verify, Password-Reset, redesigned Workspace Management). Each new full-window view that does not include `DragStrip` as its first child will silently break window dragging on macOS. This is invisible in web (browser ignores the CSS property) and invisible on Linux/Windows (no traffic-light drag region), making it easy to miss in cross-platform testing.

**How to avoid:**
1. Create a code review checklist item: "Every new full-window view in `packages/views/` that renders outside the `DashboardGuard` shell must include `<DragStrip />` as its first flex child."
2. Add a rendering test for each pre-workspace page: render the component, assert `querySelector('[style*="WebkitAppRegion"]')` exists as the first child of the root element.
3. The desktop login page (`apps/desktop/src/renderer/src/pages/login.tsx`) already uses `DragStrip` — use it as the canonical template for new pre-workspace views.

**Warning signs:**
- macOS testing: clicking and dragging the top-left area of the app window does nothing (window does not move).
- The new view's root element does not have `DragStrip` as its first child in the DOM.

**Phase to address:** Pre-workspace flows phase and shell phase — include in the phase's definition of done as a macOS-specific acceptance criterion.

---

### Pitfall 11: WindowOverlay Not Reset on Workspace Switch

**What goes wrong:**
`apps/desktop/stores/window-overlay-store.ts` maintains overlay state (new-workspace, invite flows). If the overlay is open and the user force-quits the app or the overlay is not explicitly dismissed during workspace context changes, the overlay state can persist across restarts (if the store is persisted) or across workspace switches (if the store is not cleared by `setCurrentWorkspace(null, null)`).

The CONCERNS.md documents this directly: "WindowOverlay state persists when window regains focus." The redesign adds new overlays (redesigned create-workspace, invite-accept). Each new `WindowOverlay` type must be registered in `window-overlay-store.ts` — not in `routes.tsx`. The risk is that a developer adds a new overlay type but forgets to wire the clear-on-workspace-switch logic.

**How to avoid:**
1. The workspace destructive operation order from CLAUDE.md must be enforced: `setCurrentWorkspace(null, null)` BEFORE `navigation.push`. Verify this also dispatches a `clearOverlay` action on the overlay store.
2. Any new `WindowOverlay` type must be documented in CLAUDE.md's "Route categories" section.
3. Add an integration test: open the new-workspace overlay → simulate workspace switch → assert overlay is cleared.

**Warning signs:**
- The create-workspace overlay appears unexpectedly when switching between workspaces.
- Backing data for the overlay (workspace list) is stale after returning from another app.

**Phase to address:** Pre-workspace flows phase.

---

### Pitfall 12: Storybook Importing Real API Client from @multica/core

**What goes wrong:**
`packages/views/` components import from `@multica/core` (stores, types, queries). When Storybook renders a story for an `IssueCard` component, the import chain resolves to `@multica/core/api/client.ts`, which attempts to create a real API client that reads from `process.env` or `localStorage`. In Storybook's browser context, `process.env.NEXT_PUBLIC_API_URL` is undefined, causing a runtime error that prevents the story from rendering.

Additionally, `@multica/core`'s `ThemeProvider` wraps `next-themes`, which calls `next/navigation` internals. If `packages/ui/components/common/theme-provider.tsx` is imported in a story without mocking Next.js's router, Storybook throws on import.

**How to avoid:**
1. Create a `packages/showroom/.storybook/mocks.ts` that mocks `@multica/core/api` with static fixture data — no network calls, no environment variables.
2. Provide a custom Storybook decorator that wraps stories with a `QueryClientProvider` (seeded with fixture data) instead of the real `CoreProvider`.
3. Mock `next-themes` in Storybook config if it causes import errors. The `ThemeProvider` from `@multica/ui` can be replaced with a simple `<div className="dark">` wrapper for stories.
4. Storybook should show components in isolation — never wire up real WS connections or real API calls in stories.

**Warning signs:**
- Story fails to render with `Cannot read properties of undefined (reading 'NEXT_PUBLIC_API_URL')`.
- Browser console shows `useWorkspaceId: no workspace selected` in Storybook.
- `next-themes` throws `useRouter must be wrapped in Router` in Storybook context.

**Phase to address:** Storybook setup — establish the mock boundary before authoring any stories.

---

### Pitfall 13: Long-Running Branch Diverging from main

**What goes wrong:**
The redesign is a large milestone touching every user-facing view. The PROJECT.md notes the current branch `feat/repos-per-project` will be merged before the redesign starts. But if the redesign branch runs for 4+ weeks, unrelated features may land on `main` (new query keys, new Zustand store fields, schema changes) that conflict with the redesign branch. Merge conflicts in `tokens.css`, `app-sidebar.tsx`, and `issues-page.tsx` are particularly dangerous because they are high-traffic files that will be heavily modified by the redesign.

**How to avoid:**
1. Rebase the redesign branch onto `main` at the start of each phase (5-8 phase structure from PROJECT.md). Do not let the branch age more than a week without a rebase.
2. Use feature flags / phase-gated commits: complete each phase as a shippable unit rather than accumulating 500 uncommitted files.
3. Avoid touching Go backend files in the redesign branch — pure frontend scope minimizes merge conflict surface.
4. The `packages/ui/styles/tokens.css` file will be heavily modified. Treat it as a "lock file" — only one developer edits it at a time, and changes are immediately merged to main.

**Warning signs:**
- `git diff main...HEAD -- packages/ui/styles/tokens.css` is >200 lines before the feature is done.
- Merge conflicts appear in files that no redesign work has touched.

**Phase to address:** Foundation phase — establish branching discipline as the first act.

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Hardcode `text-blue-500` for "one-off" chip | Saves defining a new token | Token swap requires hunting down every hardcoded instance | Never in `packages/views/` or `packages/ui/` |
| Copy-paste a component between `apps/web` and `apps/desktop` | Faster than extracting | Two implementations drift; the no-duplication rule is violated | Never |
| Skip `<DragStrip />` on a new full-window view "for now" | Ship faster | Window un-draggable on macOS; users file bugs | Never |
| Object-return Zustand selector | Reads naturally | Infinite re-render cascade in production | Never |
| Use `useWorkspaceId()` directly in a sidebar component | One less prop | Throws when rendered before WorkspaceIdProvider mounts | Never for components that render pre-workspace |
| Import `next/navigation` in `packages/views/` | Simpler routing | Breaks desktop (no Next.js router) | Never |
| Rename `multica_token` localStorage key to `algoplan_token` | Brand consistency | Silent logout for all existing users on update | Never — out of scope per PROJECT.md |
| Mock `@multica/core` in `apps/web` tests instead of `packages/views` | Faster to write | Tests in wrong package; platform-specific mocks mask real bugs | Never |

---

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| `next-themes` + Electron | Rely on `next-themes` FOUC prevention (works only in SSR) | Add `<script>` to `electron-vite`'s `index.html` that sets `dark` class before React mounts |
| `@dnd-kit/core` + scrollable container | Use default `MeasuringStrategy.WhileDragging` which takes rects at drag start only | Use `MeasuringStrategy.Always` or implement scroll-aware collision detection with `autoScroll` |
| `next/font/google` + Inter italic | Load only `style: ["normal"]` (current default) then add italic via CSS `font-style: italic` on a class | Add `style: ["normal", "italic"]` to the `Inter()` config call so the italic woff2 is preloaded |
| Tailwind v4 `@source` + Storybook | Assume Storybook inherits app CSS entry point | Storybook needs its own `.storybook/preview.css` with explicit `@source` directives |
| dnd-kit + `DragOverlay` + `WebkitAppRegion` | `DragOverlay` portals to document body; if DragStrip's `-webkit-app-region: drag` covers the portal area, drops are swallowed by the OS | Ensure `DragOverlay` portal is rendered below the DragStrip z-layer; DragStrip is `h-12 shrink-0` (no z-index), so portal at body root renders above it correctly |
| `multica://` deep link + rebrand | Rename URL scheme in `electron-builder.yml` without updating web callback page | Must update both: `electron-builder.yml` protocols + `apps/web/app/auth/callback/page.tsx` deep link URL |

---

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| WS `issue:updated` events invalidating board during drag | Card flickers between old and new column | Freeze TQ updates during drag AND for one frame after `onMoveIssue` fires | Immediately, on any WS-connected board with 2+ clients |
| Zustand selector returning new object each render | Unrelated components re-render on every store update, causing full re-renders of sidebar, topbar, and filter chips | Select primitives separately or use `shallow` | At development time, silent until page is interactive-heavy |
| BoardView rebuilding `issueMap` on every TQ invalidation | Heavy boards (50+ cards) stutter on WS events | Current code uses `useMemo` for `issueMap` — do not remove this; do not add a `useEffect` that rebuilds it unconditionally | 50+ issues per column |
| `useWorkspaceId()` in sidebar component that renders before workspace loads | Crash on pre-workspace routes | Accept `wsId` as optional prop | On every page load / workspace switch |
| Storybook rebuilding `storybook-static` not cached by Turborepo | 2+ minute Storybook builds on every CI run | Add `storybook-static` to Turborepo `outputs` in `turbo.json` for the showroom package | Every CI run after initial setup |

---

## "Looks Done But Isn't" Checklist

- [ ] **Token swap complete:** Run `grep -rn "text-red-\|bg-blue-\|text-green-" packages/views packages/ui --include="*.tsx"` — verify zero results outside test files
- [ ] **Dark mode complete:** Toggle `dark` class on `<html>` in DevTools for every redesigned view — assert no text is invisible, no backgrounds are wrong, no borders disappear
- [ ] **Inter italic loaded:** Open Network tab in Chrome, filter by "font", verify an Inter italic woff2 file loads on routes with display headlines
- [ ] **DragStrip present on all pre-workspace views:** `document.querySelector('[style*="WebkitAppRegion"]')` must return a non-null element on every full-window desktop view
- [ ] **Kanban WS freeze works:** Open two browser tabs on the same board, drag a card in tab 1, verify tab 2's WS event does not interrupt the drag
- [ ] **All "Multica" user-facing strings replaced:** Run the targeted grep (excluding `@multica/*` imports) — verify only internal key names remain
- [ ] **Electron deep link still works after any URL scheme changes:** Trigger web→desktop auth flow on the built app — verify `multica://` (or renamed scheme if changed) opens the desktop app
- [ ] **localStorage keys unchanged:** After app update, user's `multica_token` and view preferences survive — do not rename these keys
- [ ] **Test count stable:** `pnpm test` passes with at least as many tests passing as before redesign started — no tests deleted, only updated
- [ ] **Storybook @source working:** Visit Storybook, open a component that uses `bg-sidebar` — verify it renders with the correct dark-green color, not transparent

---

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Hardcoded color discovered after ship | LOW | Add semantic token, replace class, re-deploy |
| Tailwind JIT purging classes in Storybook | LOW | Add `@source` directive, restart Storybook |
| Inter italic not loading | LOW | Add `style: ["italic"]` to `Inter()` config, verify in Network tab |
| FOUC on Electron dark mode | MEDIUM | Add inline script to `index.html`, rebuild Electron, test on macOS |
| WS race flickering on Kanban | MEDIUM | Add post-mutation query freeze; requires integration test to verify |
| DragStrip missing on new view | LOW | Add `<DragStrip />` as first flex child; test on macOS |
| localStorage keys renamed (user data loss) | HIGH | Requires migration: on app load, copy old key value to new key if new key is absent; ship as hotfix |
| Zustand selector footgun causing infinite renders | MEDIUM | Fix selector to return primitive; identify all callers using `get_impact_radius` from code-review-graph |
| Rebrand missed deep link scheme (auth broken) | HIGH | Revert scheme change or deploy both old and new scheme handlers in parallel; ship hotfix |

---

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| Hardcoded Tailwind colors | Foundation (token definition) | CI grep rule passes |
| Tailwind JIT not scanning packages | Storybook setup | `bg-sidebar` renders correctly in Storybook |
| Dark mode FOUC (Electron) | Foundation (theme infrastructure) | macOS + dark OS preference: no light flash on startup |
| Inter italic missing | Foundation (typography) | Network tab shows italic woff2 loaded |
| Rebrand string misses | Rebrand pass (own phase) | Targeted grep returns only internal key names |
| WS invalidation racing Kanban | Kanban phase | Two-tab drag test passes |
| dnd-kit scroll collision | Kanban phase | Drag stress test with 30+ card column passes |
| Test selector breakage | Throughout (each component phase) | `pnpm test` count stable after each phase |
| Zustand selector footguns | Shell phase | Selector stability tests green |
| DragStrip missing | Pre-workspace flows phase + shell phase | DOM assertion test + macOS drag test |
| WindowOverlay not reset | Pre-workspace flows phase | Integration test: overlay cleared on workspace switch |
| Storybook importing real API | Storybook setup | No network requests in Storybook, no env errors |
| Branch divergence from main | Foundation (branching discipline) | Rebase before each phase starts |

---

## Sources

- Codebase analysis: `packages/views/issues/components/board-view.tsx` — confirmed existing dnd-kit implementation with freeze logic
- Codebase analysis: `packages/ui/styles/tokens.css` — confirmed OKLCH token system with `.dark` class override
- Codebase analysis: `apps/web/app/layout.tsx` — confirmed `Inter({subsets: ["latin"]})` without italic, `Source_Serif_4` with italic
- Codebase analysis: `apps/desktop/src/renderer/src/globals.css` — confirmed Electron uses `@fontsource-variable/inter` (includes variable italic), no SSR
- Codebase analysis: `apps/web/components/theme-provider.tsx` — confirmed `next-themes` with `disableTransitionOnChange`
- Codebase analysis: `packages/ui/components/common/theme-provider.tsx` — confirmed shared `next-themes` wrapper used by both apps
- Codebase analysis: `electron-builder.yml` — confirmed `appId: ai.multica.desktop`, `productName: Multica`, URL scheme `multica`
- Codebase analysis: `apps/desktop/package.json` — confirmed `@dnd-kit/core`, `@fontsource-variable/inter` installed
- Codebase analysis: `packages/core/platform/storage-cleanup.ts` — confirmed all `multica_*` localStorage key names
- Codebase analysis: `packages/views/auth/login-page.test.tsx` — confirmed test string `"Sign in to Multica"` that will break on rebrand
- Codebase analysis: `packages/views/chat/components/chat-fab.tsx`, `chat-window.tsx`, `context-anchor.tsx` — confirmed 6+ user-facing "Multica" strings
- CONCERNS.md: Zustand selector stability, `useWorkspaceId()` scope risk, WS debounce race, WindowOverlay persistence
- CLAUDE.md: DragStrip placement rules, WindowOverlay vs route categories, workspace destructive operation ordering

---

*Pitfalls research for: AlgoPlan frontend redesign + rebrand in a React monorepo*
*Researched: 2026-04-23*
