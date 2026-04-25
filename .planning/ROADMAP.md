# Roadmap: AlgoPlan Frontend Redesign & Rebrand

## Overview

The existing Multica platform is reskinned and rebranded as AlgoPlan in seven sequenced phases. Each phase builds on the last: design tokens first, then the atomic components that consume them, then the showroom that lets each subsequent phase be reviewed in isolation, then the dashboard shell, then the headline Kanban feature, then all remaining views, and finally a dedicated rebrand string-and-asset pass. Every phase delivers a verifiable capability; nothing is speculative. Code internals (`@multica/*`, DB, CLI) remain unchanged throughout.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [ ] **Phase 1: Token Foundation + Typography** - New OKLCH palette, Inter italic, dark-mode FOUC fix, hardcoded-color CI rule
- [ ] **Phase 2: Atomic UI Primitives** - TagChip, AccentBar, AvatarInitial, SegmentedControl with tests
- [ ] **Phase 3: Storybook Showroom** - `apps/showroom` Storybook 9.1.5 with mock providers, a11y, theme toggle
- [x] **Phase 4: Dashboard Shell Redesign** - New sidebar, topbar, layout slot system, Zustand selector guard
- [ ] **Phase 5: Issues Views + Kanban + dnd-kit Migration** - `@dnd-kit/react` v0.4.0 migration, board restyle, list restyle, view toggle, inline task-add, WS race fix
- [ ] **Phase 6: Issue Detail + Remaining Views** - Issue detail, auth flows, inbox, settings, agents, workspace, error states
- [ ] **Phase 7: Rebrand Pass** - Strings, assets, metadata, deep-link scheme, Electron chrome, test updates

## Phase Details

### Phase 1: Token Foundation + Typography
**Goal**: Both apps render every surface in the new AlgoPlan OKLCH palette with Inter (including italic) and dark mode works correctly from the first paint — no flash, no hardcoded color escapes
**Depends on**: Nothing (first phase)
**Requirements**: FND-01, FND-02, FND-03
**Success Criteria** (what must be TRUE):
  1. Toggling `.dark` on `<html>` in DevTools flips every redesigned surface correctly — no invisible text, no wrong backgrounds — on both web and desktop
  2. Electron desktop starts in dark mode with no visible light flash (pre-React inline script sets `.dark` before React mounts)
  3. Display headlines in the web app render in Inter italic (Network tab shows the italic woff2 loaded, no serif fallback)
  4. Running `bash scripts/grep-hardcoded-colors.sh` returns zero results — one-shot post-Phase-1 manual verification (no CI rule per CONTEXT D-19; future regressions are caught at PR review only)
**Plans**: 6 plans

Plans:
- [x] 01-00-PLAN.md — Wave 0 test scaffolds + manual FOUC recipe + grep verification helper (Nyquist gate)
- [x] 01-01-PLAN.md — Replace tokens.css :root + .dark with Algorivo OKLCH palette; add --tag-p0..p3, --highlight tokens
- [x] 01-02-PLAN.md — Inter italic axis on web + desktop; remove Source_Serif_4 italic axis from desktop (partial D-12)
- [x] 01-03-PLAN.md — storageKey=multica_theme on shared ThemeProvider; desktop FOUC inline script; @multica/core/theme barrel
- [x] 01-04-PLAN.md — Migrate 22 hardcoded Tailwind color violations across 8 files in packages/views to semantic tokens
- [x] 01-05-PLAN.md — Documentation updates: drop FND-04 to Out of Scope (D-19); update PROJECT.md to Algorivo direction; STATE.md Source_Serif_4 partial closure

### Phase 2: Atomic UI Primitives
**Goal**: The four new atomic components (`TagChip`, `AccentBar`, `AvatarInitial`, `SegmentedControl`) exist in `packages/ui/components/ui/`, are keyboard-accessible, and pass Vitest tests in both light and dark mode — ready for any view phase to import
**Depends on**: Phase 1
**Requirements**: UI-01, UI-02, UI-03, UI-04
**Success Criteria** (what must be TRUE):
  1. A developer can render `<TagChip color="tag-p0" />` and see the correct priority red in both light and dark mode without touching any hex value
  2. `<SegmentedControl>` responds to arrow keys and Tab — keyboard navigation moves selection without mouse (WCAG keyboard accessible)
  3. `<AvatarInitial name="Stephan" />` deterministically produces the same color for the same name across renders (no randomness)
  4. Vitest tests for all four components pass with zero failures; components are imported from `packages/ui` with zero `next/*` or `react-router-dom` dependencies
**Plans**: 6 plans
**UI hint**: yes

Plans:
- [x] 02-00-PLAN.md — Wave 0: Vitest + jsdom + Testing Library infrastructure for packages/ui (config, setup, devDeps via catalog)
- [x] 02-01-PLAN.md — Wave 1: Pure avatar-color utility (djb2 hash + extractInitials + AVATAR_PALETTE) — TDD with regression-locked fixture
- [x] 02-02-PLAN.md — Wave 2: TagChip atom (cva + useRender polymorphism + optional X-to-remove, 5 colors locked to Phase 1 tokens)
- [x] 02-03-PLAN.md — Wave 2: AccentBar atom (decorative role=presentation bar, 1–4 segments, 6 colors)
- [x] 02-04-PLAN.md — Wave 2: AvatarInitial atom (deterministic color from name, 3 sizes, consumes Plan 01 utility)
- [x] 02-05-PLAN.md — Wave 2: SegmentedControl atom (single-select adapter over Base UI ToggleGroup with keyboard navigation)

### Phase 3: Storybook Showroom
**Goal**: `apps/showroom` is a running Storybook 9 instance that renders stories for all Phase 2 atoms with live theme toggle and WCAG panel — providing a visual review sandbox before any app-level view work begins
**Depends on**: Phase 2
**Requirements**: SB-01, SB-02, SB-03, SB-04
**Success Criteria** (what must be TRUE):
  1. Running `pnpm --filter @multica/showroom storybook` starts Storybook with zero console errors about missing environment variables or API client initialization
  2. Clicking the theme toggle in Storybook switches all stories between light and dark mode correctly — `bg-sidebar` renders deep-forest-green in dark mode, not transparent
  3. The a11y panel shows zero critical WCAG violations on all four Phase 2 atom stories
  4. Stories import real component source from `packages/ui/` — no mocked component implementations, only mocked providers
**Plans**: TBD
**UI hint**: yes

### Phase 4: Dashboard Shell Redesign
**Goal**: The dashboard layout wraps every workspace page in the new AlgoPlan chrome — new sidebar (wordmark, priority grid, collapse, dark-mode toggle, notifications badge) and topbar (filter chips, search, primary CTA) — with the slot system that lets desktop inject DragStrip without duplicating layout code
**Depends on**: Phase 3
**Requirements**: SHL-01, SHL-02, SHL-03, SHL-04, SHL-05
**Success Criteria** (what must be TRUE):
  1. The sidebar renders the AlgoPlan wordmark, collapses and expands via toggle, and the dark-mode toggle persists the preference across page loads on both apps
  2. Desktop app injects `<DragStrip />` via `topSlot` prop — macOS users can drag the window by the top edge of the dashboard; web app leaves `topSlot` empty with no visual gap
  3. Every new Zustand selector in sidebar and topbar components passes a stability assertion test (same input → same reference) — no infinite re-render cascade
  4. Sidebar hooks that run before WorkspaceIdProvider accept `wsId` as a parameter — no `useWorkspaceId()` call inside sidebar code that could throw on pre-workspace routes
**Plans**: TBD
**UI hint**: yes

### Phase 5: Issues Views + Kanban + dnd-kit Migration
**Goal**: The issues page delivers a fully restyled list view and a new Kanban board view, both switchable via persistent toggle, with drag-and-drop powered by `@dnd-kit/react` v0.4.0 — the legacy `@dnd-kit/core` packages are removed and the board is immune to WS race conditions and scroll collision
**Depends on**: Phase 4
**Requirements**: KBN-01, KBN-02, KBN-03, KBN-04, KBN-05, KBN-06, KBN-07
**Success Criteria** (what must be TRUE):
  1. Dragging a card between Kanban columns updates the issue status — the card settles in the new column without flickering back (WS event from a second browser tab does not interrupt the drop)
  2. Dragging a card in a scrolled column drops into the visually indicated position — the drop target does not drift from scroll offset
  3. Clicking "Task hinzufügen" in any column opens an inline input; submitting creates the issue with that column's status pre-filled
  4. The Board/List view toggle persists across page reloads; switching is instant with no full re-mount
  5. All existing board-view tests pass after the `@dnd-kit/react` migration with the `onMoveIssue` signature unchanged

**Phase annotation**: Phase 5 requires phase-specific research on `@dnd-kit/react` v0.4.0 migration before implementation. The cross-column `group` pattern and optimistic mutation handling under the new event system have potential undocumented edge cases. Recommended commit split within phase: (1) API migration with existing tests passing, (2) visual restyle, (3) inline task add and WS/scroll fixes.
**Plans**: 6 plans
**UI hint**: yes

Plans:
- [ ] 05-00-PLAN.md — Wave 0 catalog @dnd-kit/react@0.4.0 + RED test scaffolds (Nyquist gate)
- [ ] 05-01-PLAN.md — Wave 1 dnd-kit API migration (board-view + board-column + board-card + test mocks; KBN-06)
- [ ] 05-02-PLAN.md — Wave 2 board visual restyle (priority-color helper + AccentBar + italic header + ring-brand drop; KBN-07)
- [ ] 05-03-PLAN.md — Wave 2 list visual restyle (sticky h-12 italic headers + vertical AccentBar leading edges; KBN-07)
- [ ] 05-04-PLAN.md — Wave 3 ViewToggle + InlineTaskAdd + header/page wiring (KBN-03 + KBN-04)
- [ ] 05-05-PLAN.md — Wave 4 E2E specs (KBN-01 WS race, KBN-02 scroll, KBN-03 inline, KBN-04 toggle persistence)

### Phase 6: Issue Detail + Remaining Views
**Goal**: Every user-facing view outside the shell and issues list — issue detail modal, auth flows, inbox, settings, agents, workspace management, and error states — is fully restyled in the AlgoPlan design system with DragStrip on all desktop full-window views
**Depends on**: Phase 5
**Requirements**: DTL-01, DTL-02, DTL-03, DTL-04, AUTH-01, AUTH-02, AUTH-03, AUTH-04, AUTH-05, AUTH-06, INB-01, INB-02, INB-03, SET-01, SET-02, SET-03, WS-01, WS-02, WS-03, WS-04, WS-05
**Success Criteria** (what must be TRUE):
  1. The issue detail modal opens two-pane: title and comments on the left, status/priority/tags/assignees on the right; priority is a SegmentedControl P0-P3 (not a dropdown)
  2. Login, signup, email-verify, and password-reset pages render with AlgoPlan wordmark and Inter italic title; signup shows a 4-level password strength meter
  3. macOS desktop users can drag the window on every pre-workspace view (login, signup, create-workspace, invite) — `DragStrip` is the first flex child on each
  4. Settings page has a Danger Zone section with typed-name confirmation before Leave/Delete; Dark-mode radio (Light/Dark/System) saves and persists
  5. Inbox shows items grouped by date (Today/Yesterday/This Week/Older) with a mark-all-read button and keyboard shortcut `E`
**Plans**: TBD
**UI hint**: yes

### Phase 7: Rebrand Pass
**Goal**: Every user-visible "Multica" reference is replaced with "AlgoPlan" — strings, logos, favicons, metadata, Electron chrome, and the `multica://` deep-link scheme — while `multica_*` localStorage keys and `@multica/*` package imports are deliberately left unchanged
**Depends on**: Phase 6
**Requirements**: RBR-01, RBR-02, RBR-03, RBR-04, RBR-05, RBR-06
**Success Criteria** (what must be TRUE):
  1. The targeted grep (excluding `@multica/*` imports and `node_modules`) returns zero "Multica" hits in user-visible string positions across both apps
  2. Browser tab, OG preview, and Electron window title all show "AlgoPlan"; macOS dock shows the new icon; macOS menu bar reads "AlgoPlan"
  3. The web-to-desktop auth callback flow works end-to-end on a built Electron app after the `multica://` → `algoplan://` scheme change — both `electron-builder.yml` and `apps/web/app/auth/callback/page.tsx` updated atomically
  4. After an app update, existing users retain their stored theme preference, view state, and drafts — `multica_*` localStorage keys are confirmed unchanged in a browser session
  5. All tests that previously asserted brand copy now assert "AlgoPlan" — `pnpm test` passes with at least as many tests as before the rebrand phase began

**Phase annotation**: `multica://` deep-link scheme change affects production users who have the Electron app installed — the old scheme will stop working until reinstall. Flag as a release communication item if production users exist. localStorage keys (`multica_*`) must NOT be renamed; renaming causes silent data loss (user loses dark-mode preference, drafts, view state).
**Plans**: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4 → 5 → 6 → 7

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Token Foundation + Typography | 0/TBD | Not started | - |
| 2. Atomic UI Primitives | 0/TBD | Not started | - |
| 3. Storybook Showroom | 0/TBD | Not started | - |
| 4. Dashboard Shell Redesign | 2/7 | In progress | - |
| 5. Issues Views + Kanban + dnd-kit Migration | 0/TBD | Not started | - |
| 6. Issue Detail + Remaining Views | 0/TBD | Not started | - |
| 7. Rebrand Pass | 0/TBD | Not started | - |
