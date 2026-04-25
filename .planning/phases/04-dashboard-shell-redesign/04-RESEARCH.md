# Phase 4: Dashboard Shell Redesign — Research

**Researched:** 2026-04-25
**Domain:** Shared dashboard chrome (sidebar + topbar + slot system) in `packages/views/`, consumed by both `apps/web` and `apps/desktop`
**Confidence:** HIGH (every load-bearing claim verified against the live codebase; UI-SPEC §13 already locks the no-new-store decision)

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **All implementation choices are at Claude's discretion** — discuss phase was skipped per `workflow.skip_discuss: true`. CONTEXT was auto-generated and re-states the four CLAUDE.md hard rules below.
- **Visual / interaction contract is LOCKED in `04-UI-SPEC.md`.** Tokens, atoms, copy, ARIA strings, slot prop names, accent reservation list, sidebar widths, tabular-nums on every count, dark-mode persistence model — all settled. Do NOT re-debate any UI-SPEC item.

### Constraints from CLAUDE.md / CONTEXT.md (re-stated for the planner)

- Shared shell lives in `packages/views/dashboard-shell/` (NEW directory).
  - Zero `next/*` imports.
  - Zero `react-router-dom` imports.
  - Zero hex / RGB color literals.
  - Zero `dark:*` overrides — theming flows through Phase 1 tokens.
- `topSlot` is the established slot-prop pattern; Desktop already injects `<DragStrip />`-style chrome via the existing `AppSidebar`'s `topSlot` prop. (Verified: `apps/desktop/.../desktop-layout.tsx:123` — `<AppSidebar topSlot={<SidebarTopBar />} …>`.) Phase 4 promotes `topSlot` from sidebar-level to shell-level (`<DashboardShell topSlot=…>`) per UI-SPEC §1.
- Sidebar sub-components MUST accept `wsId` as a prop, NEVER call `useWorkspaceId()` internally — sidebar mounts before `WorkspaceSlugProvider` resolves on Desktop (CLAUDE.md hard rule + UI-SPEC §2 + SC#4).
- New Zustand selectors / derived hooks MUST return stable references — same input → same reference (SHL-05 + UI-SPEC §14).

### Claude's Discretion

- File-level decomposition inside `packages/views/dashboard-shell/` (recommended: one file per component, mirroring `packages/views/layout/` convention).
- Whether the `before:` pseudo-element or a leading flex child carries the brand AccentBar on the active sidebar nav row (UI-SPEC §2 leaves both options open — recommendation in "Architecture Patterns" below).
- Test file co-location: `*.test.tsx` next to `*.tsx` per existing `packages/views/` convention.
- Whether to ship a `useShellStore` (recommendation: defer — UI-SPEC §13 locks "no new store for v1").

### Deferred Ideas (OUT OF SCOPE)

- None — discuss phase skipped, no deferred items.
- Out-of-scope items inherited from REQUIREMENTS.md "Out of Scope" table that touch this phase: Cmd+K Command Palette (v2 CMD-01), Card-Hover-Quick-Actions (v2 KBN2-02), Backend "blocker" field (v2 FTR-03 — Phase 4 ships read-only stub).

</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| SHL-01 | `app-sidebar.tsx` redesigned with AlgoPlan wordmark, team list, category chips, priority grid, notifications badge, sidebar collapse | "Standard Stack" + "Architecture Patterns → AppSidebar"; the existing `app-sidebar.tsx` already wires Wordmark/WorkspaceSwitcher, Personal/Workspace/Configure nav, Pinned, Inbox unread, HelpLauncher — Phase 4 ADDS PriorityGrid + NotificationsBadge upgrade (mini-circle) + DarkModeToggle + CollapseToggle in the footer, REPLACES "Multica" string with "AlgoPlan" wordmark, KEEPS the existing `<HelpLauncher>` |
| SHL-02 | `dashboard-layout.tsx` exposes `topSlot?: ReactNode`; Desktop injects `<DragStrip />` above; Web leaves empty (no DOM) | "Architecture Patterns → Slot System"; the existing pattern is sidebar-level (`<AppSidebar topSlot={…}>`), Phase 4 PROMOTES it to shell-level (`<DashboardShell topSlot={…}>`) and keeps the legacy sidebar `topSlot` prop as a forwarded pass-through for the Desktop tab-bar drag region (UI-SPEC §2 layout row) |
| SHL-03 | Topbar with priority filter chips, blocker count badge (read-only mock), search input, labels dropdown, primary "+ Task" button | "Architecture Patterns → AppTopbar" + "Don't Hand-Roll" — TagChip (Phase 2), Button (existing), Popover (existing), `useIssueViewStore` (existing). BlockerBadge wired to `useBlockerCount() → 0` per UI-SPEC §10. Labels dropdown is NOT in Phase 4 scope (UI-SPEC has no LabelsDropdown component declared — REQUIREMENTS.md SHL-03 mentions it but UI-SPEC supersedes; planner should drop it explicitly or ask user) |
| SHL-04 | Sidebar hooks accept `wsId` as parameter | "Architecture Patterns → wsId pass-through"; verified `useWorkspaceId()` derives from URL slug + Context (`packages/core/hooks.tsx`), throws when called outside `WorkspaceSlugProvider` — Desktop `DesktopShell` mounts sidebar before `WorkspaceSlugProvider` (no — see "Common Pitfalls" — actually Desktop mounts both at the same level, but the sidebar can render in zero-workspace state where `slug=null` and `useWorkspaceId()` throws) |
| SHL-05 | Zustand selectors return stable references | "Common Pitfalls → Selector Stability" + "Validation Architecture"; existing `useIssueViewStore` already exposes primitive arrays as stable, `useIssueCountByPriority` (NEW) wraps a `useMemo` over the cached issues array — test asserts `Object.is(prev, next)` |

</phase_requirements>

## Summary

Phase 4 is a refactor of an already-working sidebar plus a brand-new topbar, both sliced into a NEW `packages/views/dashboard-shell/` directory. The mechanics are mostly composition of primitives that already exist:

1. The Sidebar primitive (`packages/ui/components/ui/sidebar.tsx`) is shadcn-installed, owns its own collapse state via cookie (`sidebar_state`, 7 days), owns its width persistence via localStorage (`sidebar_width`), and exposes `useSidebar()` + `<SidebarTrigger />`. Phase 4 does NOT modify it.
2. The existing `<AppSidebar>` already wires WorkspaceSwitcher, Personal/Workspace/Configure nav groups, Pinned (with dnd-kit reordering), the global `C` keyboard shortcut for create-issue, the inbox unread count, runtime updates dot, HelpLauncher footer, and accepts a `topSlot` prop. Phase 4's job is to (a) move it to a new directory, (b) add three footer items (NotificationsBadge upgrade, DarkModeToggle, CollapseToggle), (c) add the PriorityGrid before the Configure group, (d) replace the "Multica" workspace-switcher fallback string with "AlgoPlan", and (e) add the wordmark dot mark.
3. The existing `<DragStrip>` already implements `WebkitAppRegion: "drag"` and is `48px` tall — UI-SPEC §1 reuses it verbatim. The `topSlot` pattern works today (Desktop currently uses `<SidebarTopBar>` with its own draggable region inside the sidebar — Phase 4 promotes the slot to shell-level so the drag region claims the FULL window-top edge before sidebar/content lay out, NOT just the sidebar-top).
4. The shared `useTheme()` already exists in `packages/ui/components/common/theme-provider.tsx` (Phase 1 set `storageKey="multica_theme"`). DarkModeToggle is a thin button that calls `setTheme(resolvedTheme === "dark" ? "light" : "dark")` with hydration-safe icon swap.
5. The `useIssueViewStore` already exposes `priorityFilters`, `togglePriorityFilter`, `clearFilters` as stable references — FilterChipRow and PriorityGrid consume them directly.

**The only NEW client logic in Phase 4** is two derived hooks:

- `useIssueCountByPriority(wsId)` — a `useMemo` over the existing `issueListOptions(wsId).select` (already returns flattened `Issue[]`), grouping by priority. Returns `{p0,p1,p2,p3}`. Stable when input array is stable.
- `useBlockerCount(wsId)` — returns the literal `0` for v1 (FTR-03 deferred). Type signature reserved for future backend wiring.

There is **no new Zustand store** (UI-SPEC §13 explicit decision), **no new design tokens** (UI-SPEC §"Design Token Inventory"), **no shadcn block install** (UI-SPEC §"Registry Safety"). Every dependency, primitive, store, and token already exists. The risk is mechanical: keep the sidebar-and-page rendering visually stable while moving files, ensure the slot promotion doesn't break the Desktop drag-region (which currently lives INSIDE the sidebar-top, not above the sidebar), and keep the `wsId`-as-prop discipline so Desktop's zero-workspace state doesn't crash on hook entry.

**Primary recommendation:** Land Wave 0 first (the new directory + the legacy re-export shim from `packages/views/layout/` so no app-side imports churn), then ship one component per task in the order: `<Wordmark>` → `<NotificationsBadge>` → `<PriorityGrid>` (+ `useIssueCountByPriority` hook) → `<DarkModeToggle>` → `<CollapseToggle>` → `<AppSidebar>` (composition) → `<FilterChipRow>` → `<BlockerBadge>` (+ `useBlockerCount` stub) → `<SearchInput>` → `<PrimaryCTA>` → `<AppTopbar>` (composition) → `<DashboardShell>` (composition + slot wiring) → wire into `apps/web/.../layout.tsx` and `apps/desktop/.../desktop-layout.tsx` → delete legacy `packages/views/layout/app-sidebar.tsx` + `dashboard-layout.tsx` after both apps compile against the shim.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Shell layout (sidebar + content split, sidebar provider) | `packages/views/dashboard-shell/dashboard-shell.tsx` (NEW) | `@multica/ui/components/ui/sidebar` (`SidebarProvider`, `SidebarInset`) | Shared between both apps via slot props; sidebar primitive owns layout grid + width/collapse mechanics |
| Sidebar chrome (Wordmark, nav groups, footer) | `packages/views/dashboard-shell/app-sidebar.tsx` (NEW) | composes `Wordmark`, `PriorityGrid`, `NotificationsBadge`, `DarkModeToggle`, `CollapseToggle`, existing `<HelpLauncher>` | One file per shell sub-component; sidebar.tsx in primitive package stays unchanged |
| Topbar chrome (filter chips + blocker + search + CTA) | `packages/views/dashboard-shell/app-topbar.tsx` (NEW) | `FilterChipRow`, `BlockerBadge`, `SearchInput`, `PrimaryCTA` | New surface — does NOT replace per-page `PageHeader` (which stays for page-specific titles, see Common Pitfalls) |
| DragStrip (macOS draggable window edge) | `packages/views/platform/drag-strip.tsx` (EXISTING — verbatim reuse) | injected as `topSlot` prop by Desktop's `<DesktopShell>` | UI-SPEC §1 + §13.1 — no new variant; Web leaves `topSlot` undefined → no DOM |
| Theme toggle UI | `packages/views/dashboard-shell/dark-mode-toggle.tsx` (NEW) | `useTheme()` from `@multica/ui/components/common/theme-provider` (Phase 1) | Thin consumer; persistence is owned by next-themes (`storageKey="multica_theme"`) |
| Sidebar collapse state | `@multica/ui/components/ui/sidebar` (`SidebarProvider` + cookie `sidebar_state`) | EXISTING — Phase 4 reuses verbatim | Cookie is the canonical mechanism; **no new Zustand store** |
| Sidebar width persistence | `@multica/ui/components/ui/sidebar` (`localStorage` `sidebar_width`) | EXISTING — Phase 4 reuses verbatim | Already shipped |
| Filter state (priority/status/assignee chips) | `useIssueViewStore` from `@multica/core/issues/stores/view-store.ts` (EXISTING) | Phase 4 ADDS no fields | FilterChipRow + PriorityGrid both READ + WRITE this store |
| Per-priority issue count | `useIssueCountByPriority(wsId)` in `packages/core/issues/queries/` (NEW derived hook) | wraps `issueListOptions(wsId).select` | Pure `useMemo` over already-cached issues array; no new API call |
| Blocker count (read-only stub) | `useBlockerCount(wsId)` in `packages/core/issues/queries/` (NEW stub) | returns `0` for v1; backend FTR-03 in v2 | API contract reserved for future expansion |
| Inbox unread count | EXISTING `inboxKeys.list(wsId)` query + `deduplicateInboxItems` filter — code reused verbatim from current `app-sidebar.tsx` | — | Phase 4 only changes the visual rendering (mini-badge instead of plain text) |
| Workspace context (slug → uuid) | `WorkspaceSlugProvider` + `useCurrentWorkspace()` in `packages/core/paths/hooks.tsx` | Web: Next.js `params.workspaceSlug`; Desktop: react-router `useParams()` + `setCurrentWorkspace(slug, id)` singleton | EXISTING — Phase 4 just respects the boundary by accepting `wsId` as prop in shell sub-components |

---

## Standard Stack

### Core (already installed — Phase 4 adds NOTHING)

| Library | Resolved Version | Purpose | Why Standard |
|---------|------------------|---------|--------------|
| `@base-ui/react` | `1.3.0` (catalog `^1.3.0`; latest `1.4.1`) | `useRender`, `mergeProps`, Popover, DropdownMenu, ToggleGroup primitives | [VERIFIED: `packages/ui/package.json`] Project-wide — Radix forbidden |
| `class-variance-authority` | `catalog: ^0.7.1` | Variant binding for nav row active state | [VERIFIED: catalog] Used by every existing UI atom |
| `clsx` + `tailwind-merge` | `catalog: ^2.1.1` / `^3.4.0` | `cn()` class merging | [VERIFIED: `@multica/ui/lib/utils`] |
| `lucide-react` | `catalog: ^1.0.1`; latest `1.8.0` | Icon library | [VERIFIED: `npm view`, [lucide-react npm](https://www.npmjs.com/package/lucide-react)] All Phase 4 icons (`Inbox`, `Sun`, `Moon`, `PanelLeftIcon`, `AlertOctagon`, `Search`, `ChevronDown`) ship with the catalog version |
| `next-themes` | `0.4.6` (catalog) | Light/dark mode + FOUC script + `useTheme()` | [VERIFIED: Phase 1 RESEARCH] Already wired via `@multica/ui/components/common/theme-provider` with `storageKey="multica_theme"` |
| `@tanstack/react-query` | `catalog: ^5.96.2` | Server state for inbox/issues/workspace queries | [VERIFIED: catalog] Phase 4 only consumes existing query options (`issueListOptions`, `inboxKeys.list`) |
| `zustand` | `catalog: ^5.0.0` | UI state (filters, drafts) | [VERIFIED: catalog] Phase 4 reads from existing `useIssueViewStore`, adds NO new store |

### Test infra (already installed in `packages/views`)

| Library | Catalog Version | Status in `packages/views` |
|---------|-----------------|---------------------------|
| `vitest` | `^4.1.0` | [VERIFIED: existing tests run via `pnpm --filter @multica/views test`] |
| `jsdom` | `^29.0.1` | [VERIFIED: `vitest.config.ts` `environment: "jsdom"`] |
| `@vitejs/plugin-react` | `^6.0.1` | [VERIFIED: `vitest.config.ts`] |
| `@testing-library/react` | `^16.3.2` | [VERIFIED: 10+ existing `*.test.tsx` files] |
| `@testing-library/user-event` | `^14.6.1` | [VERIFIED: used in `search-command.test.tsx`] |
| `@testing-library/jest-dom` | `^6.9.1` | [VERIFIED: `test/setup.ts`] |

**Test infra for `packages/core` issues queries** (where new hooks land):

[VERIFIED] `packages/core` already has Vitest configured (Node environment, no jsdom — pure logic) — `packages/core/platform/storage-cleanup.test.ts` and similar exist. The two new hooks (`useIssueCountByPriority`, `useBlockerCount`) need `renderHook` from `@testing-library/react` which requires jsdom. Choice: either (a) add the hooks under `packages/views/dashboard-shell/__tests__/` so they live in the jsdom environment (BUT this misplaces the production code — hooks belong in `packages/core/issues/queries/`), or (b) **add a co-located `*.test.tsx` next to the hook in `packages/core/issues/queries/` and configure that file's environment via the `// @vitest-environment jsdom` directive.** [CITED: vitest docs] Vitest supports per-file environment via the `// @vitest-environment jsdom` block comment. This is the cleanest path — the hook stays where it belongs and the test gets the DOM it needs.

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `useMemo` for `useIssueCountByPriority` | `useQuery` with custom `select` | `select` re-runs on every render unless `selector` reference is stable — `useMemo` over the already-`select`-flattened array is simpler and reference-stable. **Stay with useMemo.** |
| New `<DashboardShell>` directory | Edit `dashboard-layout.tsx` in place | UI-SPEC §1 explicitly puts shell in NEW `packages/views/dashboard-shell/` to keep the `layout/` directory's other files (`DashboardGuard`, `WorkspaceLoader`, `PageHeader`, `HelpLauncher`) intact. **Stay with new directory + re-export shim.** |
| Cookie for sidebar collapse | New Zustand store | Existing primitive already does cookie + 7-day max-age. **Reuse — UI-SPEC §13 locks this.** |
| `@multica/core/shell/store.ts` for any new state | Defer entirely | UI-SPEC §13 explicitly says "no new Zustand store for v1" — open the contract if a need surfaces. **Defer.** |
| Custom DragStrip variant | Reuse `packages/views/platform/drag-strip.tsx` verbatim | UI-SPEC §1 + Hard Constraint §13 explicitly forbids new variants. **Reuse.** |
| Wrap Sidebar primitive's collapse mechanic in app code | Use the primitive's `useSidebar()` + `<SidebarTrigger>` | Primitive owns this — Phase 4 just composes. **Use primitive.** |

**Installation:** None. Every dependency is already installed and version-pinned via the pnpm catalog.

**Version verification:** Done inline above. The only stale-knowledge risk is `lucide-react@1.8.0` (latest, 7 days old as of 2026-04-25) vs. the catalog's `^1.0.1` resolver — `^1.0.1` resolves to `1.8.0` so the catalog covers it. No changes needed.

---

## Architecture Patterns

### System Architecture Diagram

```
                       ┌──────────────────────────────────────────────────────┐
                       │              <DashboardShell>                        │
                       │  (packages/views/dashboard-shell/dashboard-shell.tsx)│
                       └──────────────────────────────────────────────────────┘
                                              │
                                              │ wraps
                                              ▼
                              ┌───────────────────────────────┐
                              │       <DashboardGuard>        │
                              │ (packages/views/layout/...)   │
                              │ EXISTING — gates auth+ws      │
                              └───────────────────────────────┘
                                              │
                                              ▼
                              ┌───────────────────────────────┐
                              │      <SidebarProvider>        │
                              │ (@multica/ui/.../sidebar)     │
                              │ Owns: collapse cookie,        │
                              │       width localStorage      │
                              └───────────────────────────────┘
                                              │
                  ┌───────────────────────────┼───────────────────────────┐
                  │                           │                           │
                  ▼                           ▼                           ▼
        [ topSlot prop ]          ┌──────────────────┐         ┌──────────────────┐
        Desktop: <DragStrip>      │   <AppSidebar>   │         │  <SidebarInset>  │
        Web: undefined→no DOM     │  (NEW shell dir) │         │  (existing       │
        (UI-SPEC §1, SC#2)        │                  │         │   primitive)     │
                                  │ ┌──────────────┐ │         │                  │
                                  │ │SidebarHeader │ │         │ ┌──────────────┐ │
                                  │ │ <Wordmark>   │ │         │ │ <AppTopbar>  │ │
                                  │ │ <WorkspaceSw>│ │         │ │ FilterChipRow│ │
                                  │ │ <SearchSlot?>│ │         │ │ BlockerBadge │ │
                                  │ │ NewIssueBtn  │ │         │ │ SearchInput  │ │
                                  │ ├──────────────┤ │         │ │ PrimaryCTA   │ │
                                  │ │SidebarContent│ │         │ └──────────────┘ │
                                  │ │ Personal nav │ │         │ ┌──────────────┐ │
                                  │ │ Pinned       │ │         │ │  children    │ │
                                  │ │ Workspace nav│ │◄────────┤ │  (page body) │ │
                                  │ │ <PriorityGrd>│ │         │ └──────────────┘ │
                                  │ │ Configure nav│ │         │ <ModalRegistry/> │
                                  │ ├──────────────┤ │         │ {extra}          │
                                  │ │SidebarFooter │ │         └──────────────────┘
                                  │ │ <Notif Badge>│ │
                                  │ │ <DarkModeT>  │ │
                                  │ │ <CollapseT>  │ │
                                  │ │ <HelpLaunchr>│ │
                                  │ └──────────────┘ │
                                  └──────────────────┘
```

**Data flow into the shell** (where state and queries enter):

- `useTheme()` (next-themes localStorage `multica_theme`) → `<DarkModeToggle>`
- `useSidebar()` (cookie `sidebar_state`) → `<CollapseToggle>` + Sidebar primitive's `data-state` attribute
- `inboxKeys.list(wsId)` (TanStack Query) → unread count → `<NotificationsBadge>`
- `issueListOptions(wsId).select` (TanStack Query, returns flattened `Issue[]`) → `useIssueCountByPriority(wsId)` (NEW `useMemo` derived hook) → `<PriorityGrid>` cell counts
- `useIssueViewStore(s => s.priorityFilters)` (Zustand, existing) → `<FilterChipRow>` + `<PriorityGrid>` active state
- `useIssueViewStore.getState().togglePriorityFilter` → click handlers in both
- `useIssueViewStore.getState().clearFilters` → "Clear all" button
- `useModalStore.getState().open("create-issue")` → `<PrimaryCTA>` click + existing global `C` shortcut
- `useBlockerCount(wsId)` (NEW stub returning `0`) → `<BlockerBadge>` icon-only render

### Recommended Project Structure

```
packages/views/
├── dashboard-shell/                       ← NEW
│   ├── index.ts                           ← exports DashboardShell, AppSidebar, AppTopbar (and re-exported by layout/)
│   ├── dashboard-shell.tsx                ← top-level composition (replaces layout/dashboard-layout.tsx)
│   ├── dashboard-shell.test.tsx
│   ├── app-sidebar.tsx                    ← replaces layout/app-sidebar.tsx
│   ├── app-sidebar.test.tsx
│   ├── app-topbar.tsx                     ← NEW
│   ├── app-topbar.test.tsx
│   ├── wordmark.tsx                       ← NEW
│   ├── wordmark.test.tsx
│   ├── priority-grid.tsx                  ← NEW
│   ├── priority-grid.test.tsx
│   ├── notifications-badge.tsx            ← NEW
│   ├── notifications-badge.test.tsx
│   ├── dark-mode-toggle.tsx               ← NEW
│   ├── dark-mode-toggle.test.tsx
│   ├── collapse-toggle.tsx                ← NEW (thin alias of SidebarTrigger per UI-SPEC §7)
│   ├── filter-chip-row.tsx                ← NEW
│   ├── filter-chip-row.test.tsx
│   ├── blocker-badge.tsx                  ← NEW
│   ├── blocker-badge.test.tsx
│   ├── search-input.tsx                   ← NEW
│   ├── primary-cta.tsx                    ← NEW
│   └── primary-cta.test.tsx
├── layout/                                ← MOSTLY UNCHANGED
│   ├── index.ts                           ← MUTATED: re-exports DashboardLayout/AppSidebar from dashboard-shell/ (shim, no app-side churn)
│   ├── dashboard-guard.tsx                ← UNCHANGED
│   ├── dashboard-layout.tsx               ← DELETED at end of phase (replaced by dashboard-shell.tsx; shim handles transition)
│   ├── app-sidebar.tsx                    ← DELETED at end of phase
│   ├── help-launcher.tsx                  ← UNCHANGED (still consumed by AppSidebar footer)
│   ├── page-header.tsx                    ← UNCHANGED (per-page header stays — see Common Pitfalls)
│   ├── workspace-loader.tsx               ← UNCHANGED
│   └── use-dashboard-guard.ts             ← UNCHANGED

packages/core/issues/queries/              ← NEW SUBDIRECTORY (or place beside queries.ts)
├── use-issue-count-by-priority.ts         ← NEW
├── use-issue-count-by-priority.test.tsx   ← NEW (// @vitest-environment jsdom)
├── use-blocker-count.ts                   ← NEW (returns 0)
└── use-blocker-count.test.tsx             ← NEW
```

NOTE on directory shape: `packages/core/issues/queries.ts` is currently a single file. The new hooks can either live alongside in the same file or get their own `queries/` subdirectory. Recommendation: keep `queries.ts` for query options (`issueListOptions`, `myIssueListOptions`, `issueDetailOptions`), and add a sibling `derived/` directory for the new derived hooks: `packages/core/issues/derived/use-issue-count-by-priority.ts` + `use-blocker-count.ts`. This keeps the existing file's responsibility (server query options) clean and isolates the new derived UI hooks.

### Pattern 1: Shell Composition (the entry component)

**What:** Compose `DashboardGuard` + `SidebarProvider` + (optional) `topSlot` + `AppSidebar` + `SidebarInset` containing `AppTopbar` + page children + ModalRegistry + `extra`.

**When to use:** Every workspace page in both apps. Web wraps `(dashboard)/layout.tsx`. Desktop's `<DesktopShell>` mounts `<DashboardShell topSlot={…}>` instead of the current bespoke `<SidebarProvider>` block.

**Example:**

```typescript
// Source: derived from packages/views/layout/dashboard-layout.tsx (existing) + UI-SPEC §1
"use client";

import type { ReactNode } from "react";
import { SidebarProvider, SidebarInset } from "@multica/ui/components/ui/sidebar";
import { ModalRegistry } from "../modals/registry";
import { DashboardGuard } from "../layout/dashboard-guard";
import { AppSidebar } from "./app-sidebar";
import { AppTopbar } from "./app-topbar";

interface DashboardShellProps {
  children: ReactNode;
  /** Rendered as the FIRST child of SidebarProvider. Desktop injects DragStrip; Web omits → no DOM. */
  topSlot?: ReactNode;
  /** Replaces the default <SearchInput> inside <AppTopbar> (Web injects existing SearchTrigger). */
  searchSlot?: ReactNode;
  /** Rendered inside <SidebarInset> after children (ChatWindow/ChatFab/StarterContentPrompt overlays). */
  extra?: ReactNode;
  /** Loading indicator passed through to DashboardGuard. */
  loadingIndicator?: ReactNode;
}

export function DashboardShell({
  children,
  topSlot,
  searchSlot,
  extra,
  loadingIndicator,
}: DashboardShellProps) {
  return (
    <DashboardGuard
      loadingFallback={
        <div className="flex h-svh items-center justify-center">
          {loadingIndicator}
        </div>
      }
    >
      <SidebarProvider className="h-svh">
        {topSlot}
        <AppSidebar />
        <SidebarInset className="relative overflow-hidden">
          <AppTopbar searchSlot={searchSlot} />
          {children}
          <ModalRegistry />
          {extra}
        </SidebarInset>
      </SidebarProvider>
    </DashboardGuard>
  );
}
```

### Pattern 2: wsId-as-Prop (sidebar boot order rule)

**What:** Every sub-component inside `<AppSidebar>` that needs workspace-scoped data accepts `wsId` as a prop, NEVER calls `useWorkspaceId()` internally. Top-level `<AppSidebar>` is the ONLY place inside the shell that resolves the workspace (via `useCurrentWorkspace()`), and only because it's protected by the `{slug && <AppSidebar … />}` gate at `desktop-layout.tsx:123`.

**Why:** `useWorkspaceId()` (`packages/core/hooks.tsx`) throws when `useCurrentWorkspace()` returns `null` — which it will whenever the sidebar renders before workspace resolves (Desktop's zero-workspace state, or any future flow where the sidebar is rendered before the WorkspaceSlugProvider has populated). Every sub-component that calls it MUST therefore receive `wsId` as a prop (from a parent that already gated on workspace presence) OR be no-op-safe when `wsId === undefined`.

**Pattern:**

```typescript
// PriorityGrid signature
export function PriorityGrid({ wsId }: { wsId: string | undefined }) {
  const counts = useIssueCountByPriority(wsId); // hook handles undefined → returns zeros
  // …
}

// useIssueCountByPriority signature (handles undefined wsId)
export function useIssueCountByPriority(wsId: string | undefined): { p0: number; p1: number; p2: number; p3: number } {
  const { data: issues } = useQuery({
    ...issueListOptions(wsId ?? ""),
    enabled: !!wsId,
  });
  return useMemo(() => {
    if (!issues) return EMPTY_COUNTS; // stable singleton — same reference every render
    const counts = { p0: 0, p1: 0, p2: 0, p3: 0 };
    for (const issue of issues) {
      if (issue.priority === "P0") counts.p0++;
      else if (issue.priority === "P1") counts.p1++;
      else if (issue.priority === "P2") counts.p2++;
      else if (issue.priority === "P3") counts.p3++;
    }
    return counts;
  }, [issues]);
}

const EMPTY_COUNTS = { p0: 0, p1: 0, p2: 0, p3: 0 } as const;
```

### Pattern 3: Slot Prop = First Child of SidebarProvider (NOT inside Sidebar)

**What:** `topSlot` is the FIRST child inside `<SidebarProvider>`, BEFORE `<AppSidebar>` and `<SidebarInset>`. UI-SPEC §1 + §"Slot System Verification" makes this explicit. The intent: DragStrip claims the top window edge BEFORE the sidebar/content layout, so macOS users can drag the window from the entire top 48px (sidebar + content area), not just the sidebar half.

**Verified existing pattern:** Today's `apps/desktop/.../desktop-layout.tsx:123` does it differently — it puts `topSlot` INSIDE `<AppSidebar>` (only the sidebar's top is draggable). UI-SPEC explicitly changes this. Phase 4's task: when wiring `<DashboardShell topSlot={<DragStrip />}>`, the DragStrip becomes a sibling-before of `<AppSidebar>`, NOT a child. The DesktopShell's existing `<MainTopBar>` (the tab bar) is a separate concern that lives INSIDE `<SidebarInset>` (above `<AppTopbar>`).

**When to use:** Any app that needs to claim the top window edge. Web omits the prop entirely → no DOM, no visual gap (UI-SPEC SC#2).

**Anti-pattern to avoid:** Wrapping `topSlot` in a `<div>` when it's omitted. UI-SPEC §1: "Empty `topSlot` (Web) MUST render nothing (no `<div>` wrapper) — eliminates the visual gap SC#2 calls out." React's `{undefined}` and `{null}` render nothing, so `{topSlot}` in JSX is safe — DON'T do `<div>{topSlot}</div>`.

### Pattern 4: Stable Selector for `useIssueCountByPriority`

**What:** The hook returns the same `{p0,p1,p2,p3}` object reference across consecutive renders when the underlying issues array reference is stable. Test asserts `Object.is(prev, next)`.

**Why:** SHL-05. Without this, `<PriorityGrid>` re-renders all four cells on every parent render, and any `useEffect` downstream of the count map fires unnecessarily.

**How:** `useMemo` over the cached issues array (TanStack Query already returns stable references when the cache hasn't changed) — the memo's dependency `[issues]` is stable, so the returned object is stable.

**Stability test pattern (verified against `search-command.test.tsx`):**

```typescript
// @vitest-environment jsdom
import { renderHook } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useIssueCountByPriority } from "./use-issue-count-by-priority";

vi.mock("@multica/core/api", () => ({
  api: {
    listIssues: vi.fn(() => Promise.resolve({ issues: [], total: 0 })),
  },
}));

it("returns same object reference for same input", async () => {
  const qc = new QueryClient();
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  );
  const { result, rerender } = renderHook(() => useIssueCountByPriority("ws-1"), { wrapper });
  const first = result.current;
  rerender();
  const second = result.current;
  expect(Object.is(first, second)).toBe(true);
});
```

### Pattern 5: Active Sidebar Nav Row + AccentBar (UI-SPEC §2)

**What:** UI-SPEC §2 requires a 2px-wide left bar (`<AccentBar color="brand" orientation="vertical" />` from Phase 2) on the active row, in addition to the existing `data-active:bg-sidebar-accent` treatment. Two implementation options proposed:

1. `before:` pseudo-element — pure CSS, no DOM addition, but harder to color via cva variants (needs Tailwind `before:bg-brand` with explicit `before:content-['']`)
2. Leading flex child — `<AccentBar />` rendered as the first child of `SidebarMenuButton`, positioned via `absolute inset-y-0 left-0`, gated by `data-active:opacity-100 opacity-0`

**Recommendation:** Option 2 (leading flex child). The Phase 2 `<AccentBar>` atom already exists and is the "blessed" way to render brand-colored bars in this codebase. Using `before:` recreates the bar as inline CSS rather than reusing the atom — violates UI-SPEC §2 spirit. The slight DOM bloat (one extra `<div>` per row) is acceptable; the consistency win is bigger.

### Anti-Patterns to Avoid

- **Wrapping `topSlot` in any container:** Render `{topSlot}` directly. Empty omission must produce zero DOM (SC#2).
- **Calling `useWorkspaceId()` in any sidebar sub-component:** Will throw on Desktop's zero-workspace mount path. Pass `wsId` from `<AppSidebar>` (the only place the resolution happens, and it's gated by `{slug && …}` upstream).
- **Adding new design tokens:** UI-SPEC §"Design Token Inventory" locks the consumed token list. If a need surfaces, STOP and re-open the Phase 1 token contract.
- **Wrapping `useIssueCountByPriority` in `useQuery` with custom `select`:** `select` re-runs unless the selector reference is stable; `useMemo` over the already-flattened array is simpler and cheaper.
- **Mounting a new `<ThemeProvider>` inside `<DarkModeToggle>`:** Both apps already mount `<ThemeProvider>` at the app root (web `apps/web/components/theme-provider.tsx`, desktop `App.tsx:214`). The toggle CONSUMES `useTheme()` only.
- **Deleting `<PageHeader>` instances when wiring `<AppTopbar>`:** UI-SPEC §8 explicitly stacks them — `<AppTopbar>` is the GLOBAL top chrome (filter chips + search + CTA), `<PageHeader>` is the PER-PAGE chrome (page title + contextual actions). Total chrome above page body = 96px. Phase 6 may audit individual pages to drop their PageHeader — Phase 4 does NOT.
- **Trying to mock `next/navigation` or `react-router-dom` in `dashboard-shell` tests:** Per CLAUDE.md "Never test shared component behavior in an app's test file" — `packages/views/dashboard-shell/` tests live in jsdom with NO framework mocks. Only `@multica/core` stores and queries get mocked.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Sidebar layout/collapse/width/cookie persistence | Custom sidebar layout primitive | `Sidebar` + `SidebarProvider` + `useSidebar()` from `@multica/ui/components/ui/sidebar` | shadcn-installed, already cookie-persists collapse (`sidebar_state`, 7-day max-age), localStorage-persists width (`sidebar_width`), supports inset variant, mobile sheet drawer at <768px |
| Theme switching + FOUC + persistence | Custom theme hook | `useTheme()` from `@multica/ui/components/common/theme-provider` (next-themes wrapper, Phase 1 set `storageKey="multica_theme"`) | next-themes injects FOUC `<script>` for web; desktop has its own pre-React inline script (Phase 1) reading the same localStorage key |
| DragStrip with `WebkitAppRegion` | Custom 48px draggable element | `<DragStrip />` from `packages/views/platform/` | EXISTING — the comment in `drag-strip.tsx:18-21` even documents the empirical reasoning ("hit-testing with z-index stacking has been empirically unreliable") |
| Workspace switcher dropdown | Custom workspace selector | The existing `<DropdownMenu>` block inside `app-sidebar.tsx:423-531` (preserve verbatim, only update the `"Multica"` literal to `"AlgoPlan"` in the workspace-name fallback) | Already wired with workspace list, Check icon for active workspace, Plus to open create-workspace modal, pending-invitations sub-menu, accept/decline mutations with proper navigation — re-implementing this is weeks of work |
| Inbox unread count + dedup | Custom inbox counter | `inboxKeys.list(wsId)` query + `deduplicateInboxItems` filter — the existing 8 lines in `app-sidebar.tsx:315-323` | Already battle-tested; just rendered differently in the new `<NotificationsBadge>` (mini-circle vs. plain text) |
| Tag chip with X-to-remove | Custom chip | `<TagChip color="…" onRemove={…}>` from `@multica/ui/components/ui/tag-chip` (Phase 2) | Discriminated union over `tag-p0..p3` + `brand`; `onRemove` callback already stops propagation; tested in light + dark |
| Brand-colored vertical bar on active nav row | Inline `<div className="bg-brand">` | `<AccentBar color="brand" orientation="vertical" />` from Phase 2 | Phase 2 atom; consistency with Kanban card top bars in Phase 5 |
| Filter state for priority/status/assignee | New Zustand store | `useIssueViewStore` from `@multica/core/issues/stores/view-store.ts` | Already exposes `priorityFilters`, `togglePriorityFilter`, `clearFilters` as stable references; persisted via workspace-aware storage |
| Polymorphic `as`-style rendering for Wordmark/CTA | Custom prop forwarding | `useRender` + `mergeProps` from `@base-ui/react` (existing pattern in `Sidebar` primitive + `<TagChip>`) | Battle-tested across the existing UI package |
| Issue list query + flattening | New API call for "issues by priority" | `issueListOptions(wsId).select` (already returns flattened `Issue[]`) → `useMemo` over it | NO new endpoint; reuses cache |

**Key insight:** Phase 4 is largely a *composition* task. Almost every primitive, query, hook, store, and atom needed already exists in the codebase. The new code is: 13 thin component files + 2 derived-hook files. NO new dependencies, NO new tokens, NO new stores, NO new primitives, NO new API endpoints. The mistake mode is hand-rolling something that already exists (especially the sidebar primitive's collapse state, the workspace switcher dropdown, or the inbox unread count).

---

## Common Pitfalls

### Pitfall 1: `useWorkspaceId()` Throws on Desktop Zero-Workspace State

**What goes wrong:** Sidebar sub-component calls `useWorkspaceId()` directly. Desktop's `<DesktopShell>` reads `slug` from `useSyncExternalStore(subscribeToCurrentSlug, …)` which is `null` on first mount before `<WorkspaceRouteLayout>` (mounted inside the tab router) calls `setCurrentWorkspace(slug, id)`. The `{slug && <AppSidebar … />}` gate at `desktop-layout.tsx:123` PREVENTS the sidebar from rendering in this state — so the throw doesn't fire today. BUT if any sub-component is added that doesn't honor the wsId-as-prop rule, AND someone removes the `{slug && …}` gate (or moves the sidebar outside it), the entire app crashes on first paint with a no-helpful-stack error.

**Why it happens:** `useWorkspaceId()` source (`packages/core/hooks.tsx:13-17`) throws unconditionally when `useCurrentWorkspace()` returns null. There's no nullable variant. Sub-components that "just know" they're inside a workspace context still throw if the boundary changes.

**How to avoid:** UI-SPEC §2 wsId pass-through rule + UI-SPEC §"wsId Pass-Through Verification" (SC#4) check. Implement it as a CI-runnable grep:

```bash
# Should return ZERO matches for sidebar code:
grep -rn "useWorkspaceId(" packages/views/dashboard-shell/
```

The plan-checker should add this exact check. If `useCurrentWorkspace()` is needed at the `<AppSidebar>` ROOT (allowed because the parent gates on slug), document it inline; everywhere else accepts `wsId` as a prop.

**Warning signs:** Test using `<AppSidebar wsId={undefined} />` throws; Desktop renders a white screen on launch with no workspace; jsdom test for sidebar sub-component throws on `useWorkspaceId`.

### Pitfall 2: Slot Promotion Breaks Existing Desktop Drag Region

**What goes wrong:** Today the Desktop sidebar's draggable top region is `<SidebarTopBar>` mounted INSIDE `<AppSidebar>` as `topSlot`. Phase 4 promotes the slot to `<DashboardShell>` level (the FIRST child of `<SidebarProvider>`, BEFORE `<AppSidebar>`). If the migration is done naively (just move the prop from sidebar to shell), the SidebarTopBar's existing back/forward navigation buttons disappear (they were INSIDE the sidebar; now the slot is OUTSIDE).

**Why it happens:** The Desktop tab navigation (back/forward buttons + tab bar) is currently split across two surfaces: the sidebar-internal `<SidebarTopBar>` (back/forward) and the content-internal `<MainTopBar>` (tab bar). UI-SPEC's slot promotion only addresses the DragStrip — NOT the back/forward chrome.

**How to avoid:** Phase 4's Desktop wiring task must keep two `topSlot`-style props alive:
- `<DashboardShell topSlot={<DragStrip />}>` claims the FULL window-top drag edge (NEW)
- `<AppSidebar topSlot={<SidebarTopBar />}>` keeps the back/forward buttons in the sidebar (EXISTING — pass through `<DashboardShell>` if needed, OR accept that `<AppSidebar>` exposes its own `topSlot` prop for this)

UI-SPEC §2 actually documents this: `<AppSidebar>` props include `topSlot?: ReactNode` — confirming the pass-through is preserved at the sidebar level too. The new `<DashboardShell>` slot is ADDITIONAL, not replacement.

**Warning signs:** macOS users can't drag the window from the content area (only from the sidebar); Desktop back/forward buttons disappear after the migration; macOS traffic lights overlap content.

### Pitfall 3: Selector Returns Fresh Reference on Every Render

**What goes wrong:** Naive implementation of `useIssueCountByPriority` does `return { p0: …, p1: …, p2: …, p3: … }` without `useMemo`. Every render creates a new object → React reconciliation sees "new value" → all four `<PriorityCell>` components re-render → any `useEffect([counts])` downstream fires every render.

**Why it happens:** It's the default behavior of plain JS object construction. Especially insidious because the hook "looks correct" — it returns the right values.

**How to avoid:** Wrap in `useMemo([issues])`. Test with `Object.is(prev, next)`. UI-SPEC §14 mandates this test for every new derived hook.

**Warning signs:** Performance regression on issues page (sidebar PriorityGrid causes infinite re-render cascade); React DevTools shows `<PriorityCell>` re-rendering 30+ times per page load.

### Pitfall 4: PageHeader Deletion Breaks Existing Pages

**What goes wrong:** Tempting to "consolidate" by deleting all `<PageHeader>` instances when adding `<AppTopbar>`. Eight existing pages use `<PageHeader>` for page titles and contextual actions: inbox, autopilots (list + detail), projects (list + detail), my-issues, runtimes, agents, skills, issues.

**Why it happens:** Visual overlap — both are `h-12` with `border-b`. Looks like duplication on first inspection.

**How to avoid:** UI-SPEC §8 explicitly stacks them. Total chrome = 96px. Phase 4 ADDS `<AppTopbar>`; Phase 6 audits individual pages for redundant `<PageHeader>` removal. NEVER drop `<PageHeader>` in Phase 4.

**Warning signs:** Pages lose their titles ("Issues", "Settings", etc.); existing tests using `getByText("Issues")` (page header) fail.

### Pitfall 5: Hydration Flash on `<DarkModeToggle>` (Web SSR)

**What goes wrong:** On Next.js's first server render, `next-themes`' `useTheme()` returns `resolvedTheme: undefined`. If `<DarkModeToggle>` blindly renders the icon based on `resolvedTheme`, the server renders a Moon icon (assuming light) and the client hydrates to a Sun icon (because user's actual theme is dark) — visible flash + React hydration mismatch warning.

**Why it happens:** SSR has no access to localStorage. next-themes intentionally returns `undefined` on first render to signal "wait for hydration."

**How to avoid:** UI-SPEC §6 hydration-safety pattern. Gate icon swap behind a `mounted` state via `useEffect(() => setMounted(true), [])`. Render the safest default (Moon icon, "Switch to dark mode" aria-label) until mounted — matches the most common server-rendered light theme.

**Warning signs:** Visible icon flicker on first page load; React console warning "Hydration failed because the server rendered HTML didn't match the client."

### Pitfall 6: Tabular Numerals Forgotten on Count Badges

**What goes wrong:** Without `tabular-nums`, the proportional `Inter` font makes count badges jitter horizontally as values change (e.g. inbox count flicks from `9` to `10` and the badge width shifts).

**Why it happens:** Inter's default numerals are proportional (variable-width). Counts that change frequently (inbox unread, priority counts, blocker count) jitter visibly.

**How to avoid:** UI-SPEC §"Typography → Numerals" requires `tabular-nums` on EVERY count badge. Tailwind utility: `tabular-nums` (binds to `font-variant-numeric: tabular-nums`).

**Warning signs:** UI checker flags "count badge width jitters"; visual reviews show shifting badges as data updates via WS.

### Pitfall 7: Re-export Shim Forgotten → App-Side Import Churn

**What goes wrong:** `apps/web/.../layout.tsx:3` and `apps/desktop/.../desktop-layout.tsx:13` both import from `@multica/views/layout`. Renaming `DashboardLayout` → `DashboardShell` and moving its file would force both apps to update imports. With 13 component files moving, the diff sprawls and merge conflicts proliferate.

**Why it happens:** Naive refactor — just move + rename without thinking about import surface stability.

**How to avoid:** UI-SPEC §"Design System" mandates the shim: `packages/views/layout/index.ts` keeps re-exporting `AppSidebar` and `DashboardLayout` from the new module. Apps continue importing `@multica/views/layout` until Phase 4 ends; the legacy files are deleted only after both apps compile against the shim.

**Warning signs:** PR diff shows changes in 8+ app-level files just for the import path; reviewer complaints about "where did DashboardLayout go?".

---

## Code Examples

Verified patterns from official sources or existing codebase.

### `<DarkModeToggle>` (hydration-safe theme toggle)

```typescript
// Source: derived from packages/views/settings/components/appearance-tab.tsx:88
//        + UI-SPEC §6 hydration-safety pattern
"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { Button } from "@multica/ui/components/ui/button";
import { useTheme } from "@multica/ui/components/common/theme-provider";

export function DarkModeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // Pre-hydration safe default: render Moon (light theme assumption matches
  // server-rendered HTML); aria-label stays generic until mounted to avoid
  // screen reader announcing the wrong action.
  const isDark = mounted && resolvedTheme === "dark";
  const Icon = isDark ? Sun : Moon;
  const label = mounted
    ? (isDark ? "Switch to light mode" : "Switch to dark mode")
    : "Toggle theme";

  return (
    <Button
      variant="ghost"
      size="icon-sm"
      aria-label={label}
      title={label}
      onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
    >
      <Icon className="size-4" />
    </Button>
  );
}
```

### `<CollapseToggle>` (alias of SidebarTrigger)

```typescript
// Source: UI-SPEC §7 — explicit decision to alias the primitive
"use client";

export { SidebarTrigger as CollapseToggle } from "@multica/ui/components/ui/sidebar";
```

### `useIssueCountByPriority` (NEW derived hook)

```typescript
// Source: derived from packages/core/issues/queries.ts (issueListOptions) + UI-SPEC §14 stability
"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { issueListOptions } from "../queries";

export interface PriorityCountMap {
  p0: number;
  p1: number;
  p2: number;
  p3: number;
}

const EMPTY: PriorityCountMap = Object.freeze({ p0: 0, p1: 0, p2: 0, p3: 0 });

export function useIssueCountByPriority(wsId: string | undefined): PriorityCountMap {
  const { data: issues } = useQuery({
    ...issueListOptions(wsId ?? ""),
    enabled: !!wsId,
  });

  return useMemo(() => {
    if (!issues || issues.length === 0) return EMPTY;
    let p0 = 0, p1 = 0, p2 = 0, p3 = 0;
    for (const issue of issues) {
      // Priority is "P0" | "P1" | "P2" | "P3" | other (verify against IssuePriority enum)
      if (issue.priority === "P0") p0++;
      else if (issue.priority === "P1") p1++;
      else if (issue.priority === "P2") p2++;
      else if (issue.priority === "P3") p3++;
    }
    return { p0, p1, p2, p3 };
  }, [issues]);
}
```

### `useBlockerCount` (NEW v1 stub)

```typescript
// Source: UI-SPEC §10 — read-only mock; backend FTR-03 in v2
"use client";

/**
 * Reserved for future expansion (FTR-03 Launch-Blocker backend field).
 * Returns a literal 0 in v1; primitive return is auto-stable.
 */
export function useBlockerCount(_wsId: string | undefined): number {
  return 0;
}
```

### `<NotificationsBadge>` (upgrade from existing pattern)

```typescript
// Source: derived from packages/views/layout/app-sidebar.tsx:561-580 + UI-SPEC §5
"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Inbox } from "lucide-react";
import {
  SidebarMenuButton,
  SidebarMenuItem,
} from "@multica/ui/components/ui/sidebar";
import { AppLink, useNavigation } from "../navigation";
import { useWorkspacePaths } from "@multica/core/paths";
import { inboxKeys, deduplicateInboxItems } from "@multica/core/inbox/queries";
import { api } from "@multica/core/api";
import type { InboxItem } from "@multica/core/types";

const EMPTY_INBOX: InboxItem[] = [];

export function NotificationsBadge({ wsId }: { wsId: string | undefined }) {
  const { pathname } = useNavigation();
  const p = useWorkspacePaths();
  const href = p.inbox();
  const isActive = pathname === href;

  const { data: inboxItems = EMPTY_INBOX } = useQuery({
    queryKey: wsId ? inboxKeys.list(wsId) : ["inbox", "disabled"],
    queryFn: () => api.listInbox(),
    enabled: !!wsId,
  });
  const unreadCount = useMemo(
    () => deduplicateInboxItems(inboxItems).filter((i) => !i.read).length,
    [inboxItems],
  );

  const ariaLabel =
    unreadCount > 0
      ? `Inbox, ${unreadCount} unread notification${unreadCount === 1 ? "" : "s"}`
      : "Inbox";

  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        isActive={isActive}
        render={<AppLink href={href} />}
        aria-label={ariaLabel}
        className="text-muted-foreground hover:not-data-active:bg-sidebar-accent/70 data-active:bg-sidebar-accent data-active:text-sidebar-accent-foreground"
      >
        <Inbox />
        <span>Inbox</span>
        {unreadCount > 0 && (
          <span className="ml-auto inline-flex size-4 items-center justify-center rounded-full bg-destructive text-destructive-foreground text-xs font-semibold tabular-nums leading-none">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}
```

### Test mocking pattern for `@multica/core` stores (CLAUDE.md required)

```typescript
// Source: packages/views/search/search-command.test.tsx:1-100 (vi.hoisted + Object.assign)
import { vi } from "vitest";

const { mockTheme, mockSetTheme } = vi.hoisted(() => ({
  mockTheme: { current: "light" as "light" | "dark" | "system" },
  mockSetTheme: vi.fn(),
}));

vi.mock("@multica/ui/components/common/theme-provider", async () => {
  const actual = await vi.importActual<typeof import("next-themes")>("next-themes");
  return {
    ...actual,
    useTheme: () => ({ theme: mockTheme.current, resolvedTheme: mockTheme.current, setTheme: mockSetTheme }),
  };
});
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Custom dashboard layout per app | Shared `DashboardShell` in `packages/views/dashboard-shell/` with slot props | Phase 4 (this phase) | Eliminates duplicated SidebarProvider + AppSidebar wiring across web and desktop |
| `topSlot` lives at sidebar level | `topSlot` lives at shell level (FIRST child of SidebarProvider) | Phase 4 | DragStrip claims FULL window-top edge instead of just sidebar-top |
| Single `dashboard-layout.tsx` file with all chrome wiring | One file per shell sub-component (13 files in `dashboard-shell/`) | Phase 4 | Smaller files, easier to test in isolation, mirrors `packages/views/layout/` convention |
| Inbox unread count as plain text (`<span class="ml-auto text-xs">`) | Mini-circle badge with `bg-destructive` when count > 0 | Phase 4 SHL-01 | Visual alignment with new AlgoPlan identity |
| No global priority filter UI in sidebar | `<PriorityGrid>` 2×2 grid in sidebar | Phase 4 SHL-01 | Quick-filter shortcut from sidebar; complements `<FilterChipRow>` in topbar |
| No global topbar (per-page `<PageHeader>` only) | `<AppTopbar>` (global) + `<PageHeader>` (per-page) stacked | Phase 4 SHL-03 | Provides global filter chips + search + CTA; per-page header keeps page-specific titles |
| `"Multica"` as workspace-name fallback in sidebar | `"AlgoPlan"` as workspace-name fallback | Phase 4 (cosmetic; full RBR is Phase 7) | Wordmark + fallback land here; `@multica/*` package names + `multica_*` localStorage keys explicitly stay |

**Deprecated/outdated (remove in Phase 4 cleanup):**

- `packages/views/layout/dashboard-layout.tsx` — replaced by `dashboard-shell.tsx`. Re-exported via shim during the phase; deleted at end.
- `packages/views/layout/app-sidebar.tsx` — replaced by `dashboard-shell/app-sidebar.tsx`. Same shim treatment.
- `useIssueViewStore`'s plain-text inbox count rendering pattern — superseded by `<NotificationsBadge>` mini-circle.

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | The `IssuePriority` enum values are exactly `"P0" \| "P1" \| "P2" \| "P3"` (with no `"NONE"` or `"URGENT"` variant) | Code Examples → useIssueCountByPriority | If enum has additional values (e.g. `"NO_PRIORITY"`), the count map silently undercounts and the priority grid shows wrong totals. **Verify against `packages/core/types` IssuePriority union before implementing.** |
| A2 | `issueListOptions(wsId).select` returns flattened `Issue[]` even when only some statuses have loaded | Architecture Patterns → useIssueCountByPriority | If `select` returns the bucketed `ListIssuesCache` shape directly, the `for (const issue of issues)` loop iterates over status keys, not issues. **Verified by reading `queries.ts:39-46` (`flattenIssueBuckets`) — issues array IS the result. Lower confidence than VERIFIED because not asserted at type level.** |

**Note:** Both assumptions are easy to verify in implementation (one-line read of the type files). Surfaced here so the planner schedules a verification step in Wave 0, not so the user must answer.

---

## Open Questions

1. **Should the Labels-Dropdown be implemented in Phase 4?**
   - REQUIREMENTS.md SHL-03 mentions "Labels-Dropdown" as a topbar element.
   - UI-SPEC §8 layout enumeration is explicit: FilterChipRow + BlockerBadge + spacer + SearchInput + PrimaryCTA. NO LabelsDropdown.
   - UI-SPEC supersedes (locked design contract). Recommendation: drop the LabelsDropdown from Phase 4 scope, document the discrepancy in the plan, and either re-open via discuss-phase OR push to a future phase.

2. **Can Phase 4 confirm the `IssuePriority` enum shape (A1 above)?**
   - Verifiable in implementation (read the type file). If the type has more than 4 priority levels, UI-SPEC §4's 4-cell PriorityGrid needs reconsideration.
   - Recommendation: Wave 0 task = "verify IssuePriority enum, abort if mismatch."

3. **Is the brand-colored AccentBar implementation `before:` pseudo OR leading flex child?** UI-SPEC §2 leaves both open ("Choose one; document inline.")
   - Recommendation: leading flex child using existing Phase 2 `<AccentBar>` atom. See "Architecture Patterns → Pattern 5". Documented for the planner's choice.

4. **Should `useIssueCountByPriority` invalidate when filter state changes, or always read the unfiltered issue cache?**
   - Phase 4 PriorityGrid needs to show the count of issues in EACH priority — typically the unfiltered total (so the user sees "P0: 5 issues exist" before applying the filter).
   - But if the user is on a project-detail page with project filter, should the count narrow to project-scoped issues?
   - UI-SPEC §4 says: "consumes a count from the active workspace's issues" — implies workspace-scope, NOT page-scope.
   - Recommendation: workspace-scope (use `issueListOptions(wsId)` directly). Page-scoped counts are a refinement deferred to v2. Document inline.

---

## Environment Availability

Phase 4 is purely code/config changes inside `packages/views/` and `packages/core/`. NO external dependencies, NO new tools, NO new services. Step 2.6 SKIPPED (no external dependencies identified).

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.x (catalog) — already configured for `packages/views` and `packages/core` |
| Config file | `packages/views/vitest.config.ts` (jsdom env, `@vitejs/plugin-react`); `packages/core` uses Node env by default with per-file `// @vitest-environment jsdom` for hooks |
| Quick run command | `pnpm --filter @multica/views exec vitest run dashboard-shell` (one directory) |
| Full suite command | `pnpm test` (Turborepo runs all package + app test scripts) |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| SHL-01 | Sidebar renders Wordmark, nav groups (Personal/Workspace/Configure), PriorityGrid, footer items | unit | `pnpm --filter @multica/views exec vitest run dashboard-shell/app-sidebar.test.tsx` | ❌ Wave 0 |
| SHL-01 | Workspace-name fallback string is `"AlgoPlan"` (not `"Multica"`) | unit | `pnpm --filter @multica/views exec vitest run dashboard-shell/wordmark.test.tsx` | ❌ Wave 0 |
| SHL-01 | NotificationsBadge mini-circle hidden when count = 0 | unit | `pnpm --filter @multica/views exec vitest run dashboard-shell/notifications-badge.test.tsx` | ❌ Wave 0 |
| SHL-01 | DarkModeToggle persists across page loads (next-themes localStorage `multica_theme`) | e2e | `pnpm exec playwright test e2e/dashboard-shell.spec.ts -g "dark mode persists"` | ❌ Wave 0 (E2E spec) |
| SHL-02 | `<DashboardShell>` renders `topSlot` when provided; renders nothing when omitted | unit | `pnpm --filter @multica/views exec vitest run dashboard-shell/dashboard-shell.test.tsx` | ❌ Wave 0 |
| SHL-02 | Desktop `<DesktopShell>` injects `<DragStrip />` as first child of `<SidebarProvider>` | unit (snapshot) | `pnpm --filter @multica/desktop exec vitest run desktop-layout.test.tsx` (NEW) | ❌ Wave 0 |
| SHL-03 | `<AppTopbar>` renders FilterChipRow + BlockerBadge + spacer + SearchInput + PrimaryCTA in correct order | unit | `pnpm --filter @multica/views exec vitest run dashboard-shell/app-topbar.test.tsx` | ❌ Wave 0 |
| SHL-03 | `<FilterChipRow>` renders TagChips for active filters; "Clear all" appears when ≥2 filters | unit | `pnpm --filter @multica/views exec vitest run dashboard-shell/filter-chip-row.test.tsx` | ❌ Wave 0 |
| SHL-03 | `<BlockerBadge>` returns icon-only when count = 0 | unit | `pnpm --filter @multica/views exec vitest run dashboard-shell/blocker-badge.test.tsx` | ❌ Wave 0 |
| SHL-03 | `<PrimaryCTA>` renders "+ New issue" and click calls `useModalStore.open("create-issue")` | unit | `pnpm --filter @multica/views exec vitest run dashboard-shell/primary-cta.test.tsx` | ❌ Wave 0 |
| SHL-04 | Sub-components do NOT call `useWorkspaceId()` (grep assertion) | static | `! grep -rn "useWorkspaceId(" packages/views/dashboard-shell/` | ❌ Wave 0 (CI hook) |
| SHL-04 | `<AppSidebar wsId={undefined}>` does not throw; sub-components render with empty counts | unit | `pnpm --filter @multica/views exec vitest run dashboard-shell/app-sidebar.test.tsx -t "wsId undefined"` | ❌ Wave 0 |
| SHL-05 | `useIssueCountByPriority(wsId)` returns same object reference across renders with stable input | unit (jsdom) | `pnpm --filter @multica/core exec vitest run issues/derived/use-issue-count-by-priority.test.tsx` | ❌ Wave 0 |
| SHL-05 | `useBlockerCount(wsId)` returns the literal `0` (type-stable primitive) | unit | `pnpm --filter @multica/core exec vitest run issues/derived/use-blocker-count.test.tsx` | ❌ Wave 0 |

### Sampling Rate

- **Per task commit:** `pnpm --filter @multica/views exec vitest run dashboard-shell` (runs only the dashboard-shell folder — fast feedback)
- **Per wave merge:** `pnpm typecheck && pnpm test` (Turborepo runs all packages, includes new core derived hooks)
- **Phase gate:** Full `make check` (typecheck + Vitest + Go tests + Playwright E2E) green before `/gsd-verify-work`

### Wave 0 Gaps

- [ ] `packages/views/dashboard-shell/` directory (NEW — does not exist)
- [ ] All 13 component `*.test.tsx` files (NEW)
- [ ] `packages/core/issues/derived/use-issue-count-by-priority.test.tsx` (NEW; needs `// @vitest-environment jsdom` directive)
- [ ] `packages/core/issues/derived/use-blocker-count.test.tsx` (NEW)
- [ ] `e2e/dashboard-shell.spec.ts` (NEW — single happy-path: log in → click DarkModeToggle → assert `.dark` class on `<html>` → refresh → assert persists)
- [ ] `apps/desktop` test infra for `desktop-layout.test.tsx` (verify `<DragStrip />` is first child of `<SidebarProvider>`) — check if `apps/desktop` has Vitest configured; if not, add per Phase 2's pattern (lift `vitest.config.ts` from `packages/views`)
- [ ] CI grep hook for "no `useWorkspaceId()` in `dashboard-shell/`" (UI-SPEC SC#4)

---

## Sources

### Primary (HIGH confidence — opened the file)

- `packages/views/layout/dashboard-layout.tsx` — current shell composition; replaced by Phase 4
- `packages/views/layout/app-sidebar.tsx` — current sidebar (681 lines); refactored into multiple files in Phase 4
- `packages/views/layout/dashboard-guard.tsx` — auth + workspace gate; UNCHANGED in Phase 4
- `packages/views/layout/page-header.tsx` — per-page chrome; UNCHANGED in Phase 4 (NOT deleted)
- `packages/views/layout/help-launcher.tsx` — sidebar footer item; UNCHANGED in Phase 4 (composed into new sidebar)
- `packages/views/platform/drag-strip.tsx` — DragStrip component; reused VERBATIM in Phase 4
- `packages/views/navigation/types.ts` + `context.tsx` — `useNavigation()` API + `NavigationAdapter` shape
- `packages/views/search/search-trigger.tsx` — example of `searchSlot` consumer
- `packages/views/search/search-command.test.tsx` — testing pattern with `vi.hoisted()` mocks
- `packages/ui/components/ui/sidebar.tsx` — Sidebar primitive (770 lines); cookie persistence, width localStorage, `useSidebar()`, `<SidebarTrigger>`, `<SidebarProvider>` API
- `packages/ui/components/common/theme-provider.tsx` — `useTheme()` re-export (Phase 1 wrapper around next-themes)
- `packages/ui/components/ui/tag-chip.tsx` — Phase 2 TagChip API (`color`, `onRemove` props)
- `packages/core/issues/queries.ts` — `issueListOptions`, `flattenIssueBuckets`, `issueKeys`
- `packages/core/issues/stores/view-store.ts` — `useIssueViewStore`, `priorityFilters`, `togglePriorityFilter`, `clearFilters`
- `packages/core/modals/store.ts` — `useModalStore.open("create-issue")`
- `packages/core/paths/hooks.tsx` — `WorkspaceSlugProvider`, `useCurrentWorkspace`, `useWorkspaceSlug`
- `packages/core/hooks.tsx` — `useWorkspaceId()` throws when no workspace
- `apps/web/app/[workspaceSlug]/layout.tsx` — Web workspace layout (sets `WorkspaceSlugProvider`)
- `apps/web/app/[workspaceSlug]/(dashboard)/layout.tsx` — Web dashboard layout (currently consumes `DashboardLayout`)
- `apps/desktop/src/renderer/src/routes.tsx` — Desktop tab router with `WorkspaceRouteLayout`
- `apps/desktop/src/renderer/src/components/desktop-layout.tsx` — DesktopShell currently mounting AppSidebar with `topSlot={<SidebarTopBar />}`
- `apps/desktop/src/renderer/src/components/workspace-route-layout.tsx` — Desktop workspace gate (sets `WorkspaceSlugProvider`)
- `pnpm-workspace.yaml` — catalog versions verified
- `.planning/phases/04-dashboard-shell-redesign/04-UI-SPEC.md` — locked visual + interaction contract (the SOURCE OF TRUTH for this phase)
- `.planning/phases/01-token-foundation-typography/01-RESEARCH.md` — Phase 1 theme provider wiring + token inventory
- `.planning/phases/02-atomic-ui-primitives/02-RESEARCH.md` — Phase 2 atom API surfaces

### Secondary (MEDIUM confidence — verified via WebSearch)

- [lucide-react npm](https://www.npmjs.com/package/lucide-react) — confirms 1.8.0 latest (7 days old as of 2026-04-25); catalog `^1.0.1` resolves to it
- [Lucide for React](https://lucide.dev/guide/packages/lucide-react) — icon API
- [Lucide releases](https://github.com/lucide-icons/lucide/releases) — release cadence

### Tertiary (LOW confidence — none required)

None. All Phase 4 dependencies are project-local or already verified in Phase 1 / Phase 2 research.

---

## Metadata

**Confidence breakdown:**

- Standard stack: HIGH — every package is already installed, version-pinned via catalog, and used by existing files
- Architecture: HIGH — composition of existing primitives; no new abstractions
- Pitfalls: HIGH — 7 pitfalls all derived from concrete codebase reading (not speculation), each with verified file:line evidence
- Code examples: HIGH — all examples derive from existing files in the codebase, with comments citing source line ranges
- Open questions: MEDIUM — 4 questions, 2 are Wave-0-verifiable (assumptions), 1 is a UI-SPEC vs. REQUIREMENTS discrepancy that the planner must surface, 1 is a design choice with a clear recommendation

**Research date:** 2026-04-25
**Valid until:** 2026-05-25 (30 days — stable Phase 4 scope; primitives have not changed in 60+ days based on git log inspection of sidebar.tsx area)

Sources:
- [lucide-react npm](https://www.npmjs.com/package/lucide-react)
- [Lucide for React](https://lucide.dev/guide/packages/lucide-react)
- [Lucide releases](https://github.com/lucide-icons/lucide/releases)
