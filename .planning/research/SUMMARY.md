# AlgoPlan Frontend Redesign — Research Summary

**Project:** AlgoPlan — Frontend Redesign & Rebrand (Multica)
**Domain:** Large-scale frontend redesign + rebrand in a shared-package React monorepo
**Researched:** 2026-04-23 / 2026-04-24
**Confidence:** HIGH

---

## Executive Summary

This project is a visual rebrand and UI overhaul of an existing, fully-functional issue-tracking platform. The codebase is healthy and well-structured: package boundaries are clear, the token system architecture is already correct, and significant infrastructure that was assumed to be greenfield actually exists — most critically, a complete Kanban board implementation (`packages/views/issues/components/board-view.tsx`) using `@dnd-kit/core` + `@dnd-kit/sortable`, view-mode persistence, and optimistic mutations. The redesign therefore proceeds as a reskin-and-augment, not a rewrite. Almost all work is in replacing token values, restyling existing components, and adding a small set of new atomic primitives (Tag, AccentBar, SegmentedControl, AvatarInitial).

The recommended approach: land the new OKLCH design token palette first, build the showroom app (Storybook 9) immediately after so every subsequent component can be reviewed in isolation, then restyle views in dependency order — shell before content, auth/pre-workspace flows last before a dedicated rebrand-strings pass. The dnd-kit migration from the legacy `@dnd-kit/core` API to the new `@dnd-kit/react` v0.4.0 API is the single technically significant decision; the existing board works correctly but sits on the superseded package, and the new API is the recommended path for future maintenance.

The key risks are (1) hardcoded Tailwind color utilities surviving the token swap — these already exist in six confirmed files and will multiply under time pressure; (2) the Electron FOUC problem — the new deep-forest-green sidebar makes a 100-200ms flash dramatically more visible than the current near-neutral palette, requiring a pre-React inline script in `index.html`; and (3) the `multica://` deep-link URL scheme sitting at the boundary of "app-facing" and "internal", requiring an explicit decision before the rebrand phase ships.

---

## Key Findings

### Recommended Stack

The existing stack requires no structural changes. Tailwind v4 with `@theme inline` is already configured correctly in `packages/ui/styles/tokens.css`; only the OKLCH color values need to be replaced. The `next-themes` wrapper in `packages/ui/components/common/theme-provider.tsx` is already shared by both apps and requires no changes. Inter font loading follows a split strategy: `next/font/google` with `style: ["normal", "italic"]` on the web app (currently missing the italic variant — must be added), and `@fontsource-variable/inter/wght-italic.css` on desktop and Storybook.

New library additions: `@dnd-kit/react@0.4.0` + `@dnd-kit/dom` + `@dnd-kit/helpers` (replaces legacy packages); `@storybook/react-vite@9.1.5` + `addon-a11y` + `addon-themes` (new `apps/showroom`); `@fontsource-variable/inter` already on desktop but needs catalog entry for Storybook.

**Core technologies:**

- **Tailwind v4 (`@theme inline`)** — token system — already correct architecture; replace OKLCH values only
- **`@dnd-kit/react` v0.4.0** — Kanban DnD — replaces legacy `@dnd-kit/core`; new maintained API, cross-column built-in, React 19 compatible
- **Storybook 9 (`@storybook/react-vite` 9.1.5)** — component showroom — Vite builder handles raw `.tsx` Internal Packages pattern natively; addon-a11y and addon-themes are mandatory for dual-theme + WCAG requirements
- **`@fontsource-variable/inter`** — Inter variable font for desktop + Storybook — wght + italic axes bundled by Vite
- **`next/font/google` with italic** — Inter for web — add `style: ["normal", "italic"]` to existing `Inter()` call
- **`next-themes` (already installed)** — dark mode web — no changes; desktop FOUC requires pre-React inline script in `electron-vite`'s `index.html`

**Do NOT add:** `tailwind.config.ts` (v3 artifact, ignored by v4), `@hello-pangea/dnd` (React 18 peer dep), `react-beautiful-dnd` (archived Aug 2025), Ladle (no addon-a11y/themes), any Material-UI/Chakra/Mantine.

**pnpm catalog additions:**

```yaml
'@dnd-kit/react': '^0.4.0'
'@dnd-kit/dom': '^0.4.0'
'@dnd-kit/helpers': '^0.4.0'
'@fontsource-variable/inter': '^5.2.5'
'@storybook/react-vite': '^9.1.5'
'@storybook/addon-essentials': '^9.1.5'
'@storybook/addon-a11y': '^9.1.5'
'@storybook/addon-themes': '^9.1.5'
```

**Remove from catalog/installs:** `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities`

---

### Expected Features

**Must have (table stakes) — v1:**

- Design token replacement (OKLCH palette: deep-forest-green sidebar, mint-sage canvas, white cards) — hard prerequisite for everything else
- Kanban board: drag-drop between status columns + optimistic status update (board infrastructure already exists — reskin + API migrate)
- Inline task creation per column — fires existing `useCreateIssue`, pre-fills status from column
- Issue detail modal redesigned — segmented priority P0/P1/P2/P3, tag chip row, two-pane layout, mock effort/blocker/category controls
- View toggle List/Board per Issues page — `view-store.ts` already implements; purely UI addition
- Dashboard shell: new sidebar (AlgoPlan wordmark, category chips, priority grid, dark-mode toggle, notifications badge, collapse) + topbar (filter chips, Blocker badge mock, Search)
- Auth/pre-workspace views rebranded (AlgoPlan logo on login, signup, verify, reset, create-workspace, invite)
- Inbox redesigned (mark-all-read, date grouping, filter by type)
- Settings redesigned (sectioned layout, Danger Zone, destructive confirmation)
- Agents view redesigned; workspace management redesigned; error/empty states redesigned
- All user-facing "Multica" strings replaced with "AlgoPlan" (NOT localStorage keys, NOT package names)
- Component showroom: stories per component, theme toggle, a11y panel, viewport tester
- Light + dark mode fully functional from day one
- Phase-Timeline-Bar widget (mock only)
- DragStrip on all new desktop full-window views
- Inter italic loaded for display headlines
- Password strength meter on signup (zxcvbn or equivalent)

**Should have (differentiators) — v1.x after core views stable:**

- Command palette (Cmd+K) — builds on existing search infrastructure
- Keyboard shortcut system — depends on command palette discoverability
- Inbox archive (verify if backend support needed first)
- Kanban card hover actions (quick-assign, quick-priority)

**Defer (v2+):**

- Kanban card virtualization (only if perf tests flag 50+ card columns — architecture already supports it)
- WIP limits, swimlanes, multi-card drag selection
- Magic link auth, SSO/SAML
- Notification preferences per event type
- Visual regression testing (Chromatic)

**Anti-features (explicitly not building):**

- WIP limits, swimlanes, per-column customization, multi-card drag selection, multi-assignee (backend schema change required), attachment upload UI (new S3 flow), rich text in issue title, auto-save for settings fields, nested sidebar submenus, persistent filter drawer panel

---

### Architecture Approach

The existing architecture is correct and must not be restructured. Every package boundary rule from `CLAUDE.md` applies unchanged. The Kanban board at `packages/views/issues/components/board-view.tsx` is restyled and API-migrated in place. `view-store.ts` and all mutation hooks are kept as-is. The `onMoveIssue` callback signature remains unchanged through the dnd-kit migration.

**Major components:**

1. **`packages/ui/styles/tokens.css`** — sole source of truth for design tokens; replace OKLCH values atomically; both apps import from here; no per-app token override
2. **`packages/ui/components/ui/`** — new atomic primitives: `Tag`/`TagChip`, `AccentBar`, `AvatarInitial`, `SegmentedControl`; zero business logic; shadcn `pnpm ui:add` or hand-written
3. **`apps/showroom/`** — new Storybook 9 app (`@multica/showroom`); imports raw `.tsx` via Vite natively; co-located stories in packages; must have its own `@source` directives and mock providers in `preview.ts`
4. **`packages/views/layout/app-sidebar.tsx`** — new visual treatment; add `topSlot?: ReactNode` prop for desktop DragStrip injection; all navigation via `useNavigation()` not `next/navigation`
5. **`packages/views/issues/components/`** — board-view migrated to `@dnd-kit/react` and restyled; board-column and board-card restyled; issue-detail redesigned; issues-header with view toggle + filter chips
6. **`packages/views/auth/`, `inbox/`, `settings/`, `agents/`, `workspace/`** — visual redesign; AlgoPlan branding; DragStrip on all desktop pre-workspace views
7. **Rebrand pass** — targeted grep (excluding `@multica/*` imports) for user-facing strings; logo/favicon/meta assets; Electron window title + dock icon; `multica://` scheme renamed to `algoplan://` atomically in both `electron-builder.yml` and `apps/web/app/auth/callback/page.tsx`

**Key patterns to preserve:**

- Slot-based platform composition (`topSlot`, `searchSlot` props on layout components)
- Workspace-scoped persist via `createWorkspaceAwareStorage()` — do not change persist keys
- Mutations stay in `packages/core/`; `BoardView` receives them as props
- Token replacement is atomic with no feature flag or compatibility shim (per "no backwards-compatibility" constraint)
- `useTheme` re-exported from `packages/ui/components/common/theme-provider.tsx` — `packages/views/` imports from there, not directly from `next-themes`

---

### Top 10 Pitfalls (with phase mapping)

1. **Hardcoded Tailwind color utilities survive the token swap** — Six confirmed instances already in `packages/views/`. Add CI grep rule before writing any new component. Phase: Foundation.
2. **Electron FOUC — vivid new colors make the flash visible** — Deep-forest-green sidebar produces a visually dramatic 100-200ms light-flash. Fix: pre-React inline script in `electron-vite`'s `index.html` sets `.dark` class from localStorage before React mounts. Phase: Foundation.
3. **WS invalidation racing Kanban optimistic update** — After `onMoveIssue`, WS `issue:updated` arrives within 100ms debounce window and causes card flickering. Fix: `queryClient.cancelQueries` before mutation dispatch + keep freeze active one frame after `handleDragEnd`. Phase: Kanban restyling.
4. **dnd-kit collision detection breaks in scrollable columns** — `PointerSensor` takes rects at drag start; scrolling during drag misaligns drop targets. Fix: `MeasuringStrategy.Always` or `autoScroll` ref on column scroll container. Phase: Kanban restyling.
5. **Rebrand pass misses deep-link, Electron metadata, and test strings** — `multica://` in two locations; Electron `productName`, window title, dock icon; test string `"Sign in to Multica"` in `login-page.test.tsx`. localStorage keys must NOT be renamed (silent data loss). Use targeted grep excluding `@multica/*` imports. Phase: Rebrand pass.
6. **DragStrip missing on new full-window desktop views** — Every pre-workspace view renders outside DashboardGuard; without `<DragStrip />` as first flex child, macOS window is undraggable. Add DOM assertion test per view. Phase: Auth flows + Shell.
7. **Zustand selector returning fresh objects — infinite re-renders** — New sidebar components (filter chips, priority grid, view toggle) are prime candidates. Select primitives separately or use `shallow`. Add selector stability test per new connected component. Phase: Shell redesign.
8. **Inter italic not loaded on web** — Current `Inter()` call lacks `style: ["italic"]`. Add explicitly. Verify in Chrome Network tab that italic woff2 loads. Phase: Foundation.
9. **Tailwind JIT not scanning `apps/showroom`** — New Storybook app needs its own `@source` directives. Smoke test: render a component using `bg-sidebar` immediately after scaffold. Phase: Storybook setup.
10. **Storybook stories importing real API client** — `@multica/core/api/client.ts` reads `process.env` at import time; stories crash. Establish `MockQueryProvider` + `MockNavigationProvider` in `preview.ts` before authoring any stories. Phase: Storybook setup.

---

## Conflict Resolutions

### Storybook 9 vs Lightweight Custom Showroom

**Recommendation: Storybook 9 (`apps/showroom/`)**

FEATURES.md listed full Storybook as an anti-feature (citing ~200MB tooling, Webpack build overhead). STACK.md recommended Storybook 9. User Q9 answer ("anpassen ok. storybook/showroom ja") confirms a Storybook-like tool is in scope.

FEATURES.md's concern was valid for Storybook 8 (Webpack). Storybook 9 with `@storybook/react-vite` eliminates it: Vite builder is 48% smaller than Storybook 8, handles the Internal Packages raw `.tsx` pattern natively without a "build packages first" step, and `apps/showroom` placement in Turborepo keeps tooling isolated from shared package devDependencies.

The pitfalls tip the balance decisively: pitfalls 9 and 10 (JIT scanning + real API client import) are identical problems for a custom showroom or Storybook — both require the same `@source` directives and mock providers. Storybook 9 provides `addon-a11y` (axe-core WCAG checks) and `addon-themes` (light/dark toggle via `withThemeByClassName`) for free on top of that required work. These are mandatory requirements for the AlgoPlan showroom. A custom route cannot satisfy either without rebuilding Storybook's addon architecture.

**Implementation:** `apps/showroom/` (`@multica/showroom`, private), Storybook 9.1.5, `@storybook/react-vite`. Stories co-located: `packages/ui/**/*.stories.tsx`, `packages/views/**/*.stories.tsx`. `preview.ts` provides `ThemeProvider`, `MockQueryProvider`, `MockNavigationProvider`, global CSS with `@source` directives.

### Existing Board Uses Legacy dnd-kit API — Migrate or Defer?

**Recommendation: Migrate to `@dnd-kit/react` v0.4.0 in the Kanban restyling phase**

ARCHITECTURE.md confirmed `board-view.tsx` uses `@dnd-kit/core` + `@dnd-kit/sortable` (legacy). STACK.md recommends `@dnd-kit/react` v0.4.0 as the maintained package with no new features planned for the legacy API.

Migration is correct because: (1) the board is already being restyled in this milestone so diff cost is acceptable — both visual restyling and API migration land in the same component in the same phase; (2) the new event system resolves the scroll collision problem (pitfall 4) more cleanly; (3) having both APIs installed simultaneously creates dependency confusion. The `onMoveIssue` callback signature and all external component props remain unchanged.

**Implementation:** Migrate `board-view.tsx` during Kanban phase. Separate commits: first migrate API (all existing tests should still pass), then restyle visually. Remove `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities` from catalog. Add `@dnd-kit/react`, `@dnd-kit/dom`, `@dnd-kit/helpers`. Flag for phase-specific research on the new API's cross-column `group` equivalent before implementation starts.

### `multica://` Deep Link Scheme — App-Facing or Internal?

**Recommendation: Change to `algoplan://` in the rebrand pass, update both locations atomically**

PROJECT.md's rebrand scope is "app-facing only, code internals bleiben @multica/*". The `multica://` URL scheme is user-visible auth UX (OS opens it when clicking a magic link from browser to desktop), making it app-facing by the project's own definition. Leaving it as `multica://` while the app is branded "AlgoPlan" creates jarring UX and a visible branding inconsistency.

**Implementation:** Change atomically in both `electron-builder.yml` (protocols entry) and `apps/web/app/auth/callback/page.tsx` (redirect URL) in the rebrand pass. Test web-to-desktop auth callback flow on the built Electron app before shipping. If existing production users have the old scheme registered with their OS, add a release communication item (not a technical blocker for a pre-production rebrand).

---

## Implications for Roadmap

### Suggested Phase Structure (7 phases)

**Phase 1: Token Foundation + Typography**
Rationale: Every component reads from `tokens.css`. Nothing can be correctly styled until new OKLCH values exist. Electron FOUC fix and Inter italic must land here because later phases build on these.
Delivers: New AlgoPlan OKLCH palette in both apps; dark mode FOUC fix in Electron `index.html`; Inter italic loaded on web (`style: ["normal", "italic"]`); semantic tag/priority/category color tokens; `@source` paths verified; CI hardcoded-color grep rule established; `Source_Serif_4` removal decision made.
Pitfalls to address: 1 (hardcoded colors — establish grep rule), 2 (Electron FOUC), 8 (Inter italic).
Research flag: None — skip phase research.

**Phase 2: Atomic UI Primitives**
Rationale: View components compose these atoms. Must exist before any view is restyled.
Delivers: `Tag`/`TagChip`, `AccentBar`, `AvatarInitial`, `SegmentedControl` in `packages/ui/components/ui/`. Vitest + jsdom tests. Dark mode verified on all atoms.
Pitfalls to address: 7 (establish Zustand selector test pattern for use in Phase 4), 8 (use `getByRole` over `getByText` — establish as standard).
Research flag: None — skip phase research.

**Phase 3: Storybook Showroom Setup**
Rationale: Architecture research specifies showroom before view restyling to enable visual review in isolation. Must come after primitives so stories import real components.
Delivers: `apps/showroom/` added to pnpm workspace + Turborepo; Storybook 9.1.5 configured; `MockQueryProvider`, `MockNavigationProvider` in `preview.ts`; `@source` directives verified (smoke test: `bg-sidebar` renders correctly); `addon-a11y` and `addon-themes` working; stories for all Phase 2 atoms authored.
Pitfalls to address: 9 (JIT not scanning — core setup task), 10 (real API client — core setup task).
Research flag: None — STACK.md has full `main.ts` and `preview.ts` code; skip phase research.

**Phase 4: Dashboard Shell Redesign**
Rationale: The shell wraps every workspace page. Restyling it correctly means all subsequent content phases inherit the new chrome automatically without re-touching layout.
Delivers: `app-sidebar.tsx` redesigned (AlgoPlan wordmark, category chips, priority grid, dark-mode toggle, notifications badge, sidebar collapse); `dashboard-layout.tsx` with `topSlot?: ReactNode`; desktop DragStrip via `topSlot`; topbar (filter chips, Blocker badge mock, Search, Phase-Timeline-Bar mock). Stories added to showroom.
Pitfalls to address: 7 (Zustand selector footguns — new store-connected components land here), 6 (DragStrip on desktop shell views), anti-pattern (no `next/*` in `packages/views/`).
Research flag: None — slot-based composition and Zustand patterns are established; skip phase research.

**Phase 5: Issues Views + Kanban Restyling + dnd-kit Migration**
Rationale: Headline feature of the redesign; sequenced after shell so surrounding chrome is stable. dnd-kit API migration and visual restyling land together since both touch the same files.
Delivers: `board-view.tsx` migrated to `@dnd-kit/react` v0.4.0 and restyled (AccentBar, Tag chips, AvatarInitial); `board-column.tsx` (column header badge, count); inline task add per column; `list-view.tsx` and `list-row.tsx` restyled; `issues-header.tsx` (view toggle, filter chips); legacy `@dnd-kit/core`/`@dnd-kit/sortable` removed.
Pitfalls to address: 3 (WS race — `cancelQueries` + post-mutation freeze), 4 (scroll collision — `MeasuringStrategy.Always` or `autoScroll`), 8 (test selector updates, not deletions).
Research flag: **FLAG FOR PHASE RESEARCH** — verify `@dnd-kit/react` v0.4.0 migration guide steps for cross-column Kanban with optimistic mutations before implementation starts. The new API is recent (April 2025/Feb 2026) and migration edge cases for the `group` pattern may have undocumented gotchas.

**Phase 6: Issue Detail + Remaining Views**
Rationale: Issue detail is more complex than list/board row (two-pane layout, segmented controls). Remaining views share the same restyling pattern — apply new tokens to existing structure — so batching them is efficient.
Delivers: `issue-detail.tsx` redesigned (segmented priority, effort mock, launch-blocker mock, tag chip row, two-pane layout, category chip); `packages/views/auth/` (login, signup, email-verify, password-reset) with AlgoPlan branding + password strength meter; `inbox/` (date grouping, mark-all-read, filter by type); `settings/` (sectioned layout, Danger Zone, destructive confirmation); agents, workspace management, error/empty states. DragStrip on all new desktop pre-workspace auth views.
Pitfalls to address: 6 (DragStrip on pre-workspace views — auth pages are full-window on desktop), 11 (WindowOverlay not reset on workspace switch — verify new overlay types wired to `clearOverlay`), 8 (test selector updates).
Research flag: None — restyling-only with established patterns; skip phase research.

**Phase 7: Rebrand Pass**
Rationale: String changes and asset swaps sequenced last to minimize merge conflict noise in high-traffic files during visual work phases.
Delivers: All user-facing "Multica" → "AlgoPlan" (targeted grep excluding `@multica/*` imports); AlgoPlan logo/wordmark/favicon/OG-images; `apps/web/app/layout.tsx` title/meta/siteName updated; Electron window title, macOS dock icon, macOS menu; `multica://` scheme renamed to `algoplan://` atomically in `electron-builder.yml` AND `apps/web/app/auth/callback/page.tsx`; web-to-desktop auth flow tested on built app; `multica_*` localStorage keys intentionally left unchanged.
Pitfalls to address: 5 (rebrand misses — targeted grep, never bulk replace; localStorage keys never renamed; update test strings that assert brand copy).
Research flag: None — PITFALLS.md has the exact grep command and confirmed location list; skip phase research.

### Phase Ordering Rationale

- Tokens before everything — semantic token names are used in every component; nothing can be correctly styled until they exist
- Primitives before views — `Tag`, `SegmentedControl`, `AccentBar` are imported by view components
- Showroom before view restyling — enables visual review in isolation without deploying; avoids discovering visual bugs only in production
- Shell before content — shell wraps every page; stable shell means content phases inherit correct chrome automatically
- Kanban (Phase 5) before remaining views (Phase 6) — Kanban is the technically most complex; schedule it while context is freshest and before team attention fragments to the many remaining views
- Issue detail batched with remaining views (Phase 6) — despite higher complexity, no hard dependency ordering between them; batching reduces context switching
- Rebrand last — purely cosmetic; deferring avoids diff noise in high-traffic files like `tokens.css` and `app-sidebar.tsx` during visual phases

### Research Flags

**Needs phase-specific research before implementation:**

- **Phase 5 (Kanban/dnd-kit migration):** Verify `@dnd-kit/react` v0.4.0 migration steps for cross-column `group` pattern with optimistic updates. New API is recent; migration edge cases may have undocumented behavior.

**Standard patterns (skip phase research):**

- Phase 1 (Tokens) — Tailwind v4 `@theme inline` pattern fully documented; STACK.md has concrete CSS
- Phase 2 (Primitives) — shadcn + Base UI pattern is established
- Phase 3 (Storybook) — STACK.md and ARCHITECTURE.md have complete code; mock provider structure defined
- Phase 4 (Shell) — slot-based composition is an established codebase pattern
- Phase 6 (Remaining views) — restyling-only; all patterns established by Phase 4+5
- Phase 7 (Rebrand) — PITFALLS.md has the grep command and complete location list

---

## Open Questions for Roadmapper

1. **dnd-kit migration: unified diff or separate commits within Phase 5?** Recommendation: two separate commits — first migrate API (existing tests must pass), then restyle visually. This isolates API bugs from visual regressions.
2. **Command palette (Cmd+K) scope:** FEATURES.md places this at v1.x. Roadmapper should decide: Phase 4 (shell), Phase 6 (remaining views), or a standalone Phase 8. Dependency: `packages/views/search/` must be stable first.
3. **Kanban virtualization decision gate:** PROJECT.md says "if Performance-Tests fordern." Should Phase 5 include a performance test run with 50+ mock cards to make a go/no-go decision within that phase, or defer entirely?
4. **Password strength meter library:** FEATURES.md references `zxcvbn` or `@zxcvbn-ts/core`. Decision needed before Phase 6: which library, and which pnpm catalog entry?
5. **`multica://` deep link — existing production users:** If users have the app installed, the scheme change in Phase 7 will break their auth callback until reinstall. Flag as a release communication item if there are production users.
6. **`Source_Serif_4` removal:** Currently loads italic headlines in web. If all italic headlines move to Inter, remove it in Phase 1 to reduce font payload. Confirm no remaining usages before removing.

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | All choices verified against official docs and confirmed against codebase files. `@dnd-kit/react` React 19 peer dep is community-confirmed but not formally declared — MEDIUM on that specific point. |
| Features | HIGH | Grounded in existing codebase capabilities + explicit PROJECT.md out-of-scope list. Mock-only items clearly tagged. |
| Architecture | HIGH | All findings verified against actual codebase files with line references. Critical finding: Kanban board already exists — reskin, not greenfield. |
| Pitfalls | HIGH | All confirmed against actual codebase files. No speculative pitfalls. Recovery strategies included. |

**Overall confidence: HIGH**

### Gaps to Address During Implementation

- **`@dnd-kit/react` v0.4.0 migration specifics:** Legacy-to-new API for cross-column Kanban with optimistic mutations not verified step-by-step. Flag for phase research before Phase 5.
- **`@dnd-kit/react` React 19 formal support:** Community-confirmed but not formally declared. Monitor dnd-kit releases before Phase 5 starts.
- **`Source_Serif_4` usage audit:** Verify no remaining uses outside italic headlines before removing in Phase 1.

---

*Research completed: 2026-04-24*
*Ready for roadmap: yes*
