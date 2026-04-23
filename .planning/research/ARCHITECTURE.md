# Architecture Patterns — AlgoPlan Frontend Redesign

**Domain:** Large-scale frontend redesign in shared-package monorepo (pnpm + Turborepo)
**Researched:** 2026-04-23
**Confidence:** HIGH — All findings verified against actual codebase; no speculative claims

---

## Critical Upfront Finding

**The Kanban board already exists.** `packages/views/issues/components/board-view.tsx` is a full implementation using `@dnd-kit/core` + `@dnd-kit/sortable`, with cross-column drag, optimistic mutation via `onMoveIssue`, infinite scroll per column, and hidden-column management. The `ViewMode = "board" | "list"` type already exists in `packages/core/issues/stores/view-store.ts` and is already persisted with workspace-aware storage. This is not greenfield work — it is a reskin and augmentation.

---

## Recommended Architecture

### Package Placement Map

```
packages/ui/styles/
  tokens.css          ← REPLACE: new AlgoPlan color tokens (OKLCH, :root + .dark)
  base.css            ← REPLACE: reset, scrollbars, keyframes
  components/ui/      ← ADD: new atomic components (Tag, Avatar, SegmentedControl,
                           AccentBar, PhaseBadge) via `pnpm ui:add` or hand-written
  components/common/
    theme-provider.tsx ← KEEP: already wraps next-themes, works on both apps

packages/views/
  layout/
    app-sidebar.tsx    ← REDESIGN: new categories chips, priority grid, team list
    dashboard-layout.tsx ← KEEP STRUCTURE: slot-based (extra, searchSlot) stays
    dashboard-guard.tsx  ← KEEP
  issues/components/
    board-view.tsx     ← RESTYLE: new card/column visual treatment, accent bars
    board-column.tsx   ← RESTYLE: new column header badge, color tokens
    board-card.tsx     ← RESTYLE: accent bars, colored tags, avatar chips
    list-view.tsx      ← RESTYLE: new row typography, colored bars
    list-row.tsx       ← RESTYLE
    issues-header.tsx  ← REDESIGN: view toggle Board/List, new filter chips
    issue-detail.tsx   ← REDESIGN: segmented controls, tag chips, right-panel layout
  auth/               ← REDESIGN: login, signup, password-reset, email-verify views
  workspace/          ← REDESIGN: new-workspace-page, no-access-page
  inbox/              ← REDESIGN
  settings/           ← REDESIGN
  agents/             ← REDESIGN

apps/showroom/          ← NEW: Storybook app (see Storybook section below)
  .storybook/
    main.ts
    preview.ts
  package.json

packages/core/issues/stores/
  view-store.ts       ← KEEP AS-IS: ViewMode already persisted per workspace
```

### Component Boundaries

| Component | Package | Rationale |
|-----------|---------|-----------|
| Token CSS (`tokens.css`, `base.css`) | `packages/ui/styles/` | Only location both apps import styles from |
| `ThemeProvider` (next-themes wrapper) | `packages/ui/components/common/` | Already shared; desktop already uses it |
| `Tag`, `Avatar`, `AccentBar`, `SegmentedControl` | `packages/ui/components/ui/` | Atomic, zero business logic |
| `BoardView`, `BoardColumn`, `BoardCard` | `packages/views/issues/components/` | Contain `@multica/core` query hooks; boundary-compliant |
| `AppSidebar` (new design) | `packages/views/layout/` | Business logic (workspace, nav, modals) |
| `DashboardLayout` | `packages/views/layout/` | Platform-neutral shell with slots |
| Kanban mutations (`onMoveIssue`) | `packages/core/issues/mutations.ts` | Already exists; no new package needed |
| `ViewMode` persist store | `packages/core/issues/stores/view-store.ts` | Already exists; just keep |
| Theme preference store | `packages/core/` (new `ui/theme-store.ts`) | Zustand + persist, workspace-unscoped |
| Storybook stories | `apps/showroom/` | Platform-specific app; not shared |

---

## Data Flow

### Token Propagation

```
packages/ui/styles/tokens.css
  └── defines @theme inline { ... }   (Tailwind v4 design tokens)
       and :root { ... }              (CSS custom properties, OKLCH values)
       and .dark { ... }              (dark-mode overrides on same custom properties)

apps/web/globals.css
  └── @import "@multica/ui/styles/tokens.css"   (already wired)
  └── @import "@multica/ui/styles/base.css"

apps/desktop/src/renderer/src/globals.css
  └── @import "@multica/ui/styles/tokens.css"   (already wired)
  └── @import "@multica/ui/styles/base.css"

apps/showroom/globals.css                        (NEW)
  └── @import "@multica/ui/styles/tokens.css"
  └── @import "@multica/ui/styles/base.css"
  └── @source "../../packages/ui"               (tell Tailwind v4 where to scan)
  └── @source "../../packages/views"
```

**No duplication.** Both apps already import from `packages/ui/styles/`. The redesign replaces the content of `tokens.css` with new OKLCH values. No second CSS file, no per-app token override.

### Theme Switching (Light/Dark)

**Current state:** `packages/ui/components/common/theme-provider.tsx` wraps `next-themes`. Both `apps/web` and `apps/desktop` wrap their root in `<ThemeProvider>`. The `.dark` CSS class is added to `<html>` by next-themes when dark mode is active. The desktop renderer is a pure Vite SPA — no SSR — so next-themes' `attribute="class"` + `defaultTheme="system"` works without hydration issues.

**For the redesign:** This is already correct architecture. Add a Zustand theme store in `packages/core/ui/theme-store.ts` (or `packages/core/preferences/`) that surfaces `useTheme` from `packages/ui` as a stable, workspace-unscoped preference. The toggle button in the new Sidebar calls this store's `setTheme()`. The store persists to `localStorage` (via `defaultStorage`).

```
ThemeProvider (next-themes, in packages/ui)
  └── attribute="class" → adds .dark to <html>
  └── defaultTheme="system"

New DarkModeToggle (in packages/views/layout/app-sidebar.tsx)
  └── calls useTheme() from "@multica/ui/components/common/theme-provider"
       (re-exported from packages/ui — no next/* import in views)
```

`useTheme` from `next-themes` is framework-agnostic (reads from React context). It is safe to call in `packages/views/` because it comes from `@multica/ui`, which is allowed to depend on `next-themes`.

### View Toggle (Board/List) Persistence

Already implemented. `view-store.ts` in `packages/core/issues/stores/` has:
- `ViewMode = "board" | "list"` with `setViewMode(mode)`
- Persistence via `createWorkspaceAwareStorage(defaultStorage)` — scoped per workspace slug
- Separate `createIssueViewStore(persistKey)` factory for non-global pages (projects, my-issues)

**Scope:** view preference is per-user-per-workspace-per-page, keyed by the persist key (e.g. `"multica_issues_view"` for /issues, a factory key for /:project/issues). This is correct and complete — no architecture change needed.

### Drag-and-Drop (Kanban)

```
packages/views/issues/components/board-view.tsx
  └── @dnd-kit/core (DndContext, DragOverlay, sensors, collision detection)
  └── @dnd-kit/sortable (SortableContext, arrayMove)
  └── calls onMoveIssue(issueId, newStatus, newPosition)
         └── packages/core/issues/mutations.ts (optimistic update, server sync)
              └── server PATCH /issues/:id
```

The DnD layer is fully within `packages/views/` and calls a mutation callback from `packages/core/`. No framework APIs involved. Desktop and web render the identical `BoardView`.

---

## Patterns to Follow

### Pattern 1: Slot-Based Platform Composition

`DashboardLayout` in `packages/views/layout/` has props `extra`, `searchSlot`, `loadingIndicator`. Each app injects platform-specific chrome through these slots without touching shared code.

**New sidebar slots needed for the redesign:**

```typescript
// packages/views/layout/app-sidebar.tsx
interface AppSidebarProps {
  searchSlot?: ReactNode;
  topSlot?: ReactNode;      // NEW: for desktop DragStrip or web header extras
  bottomSlot?: ReactNode;   // NEW: for desktop back/forward nav or web user menu
}
```

Desktop injects `<DragStrip />` via `topSlot`. Web leaves it undefined. The `DragStrip` component lives in `packages/views/platform/` (already exists).

### Pattern 2: Workspace-Scoped Persist

All view preferences that should survive workspace switching use `createWorkspaceAwareStorage()`. This namespaces the localStorage key by workspace slug. The global `/issues` page uses the singleton `useIssueViewStore`; per-project views use `createIssueViewStore(projectId + "_view")`.

**For new view preferences** (category filter, priority grid selection): extend `IssueViewState` in `view-store.ts` or create a separate `preferences-store.ts` if the new fields are dashboard-wide (not per-view).

### Pattern 3: Issue Mutations Stay in packages/core

```typescript
// packages/core/issues/mutations.ts
export function useMoveIssueMutation() { ... }  // already exists via onMoveIssue callback
export function useCreateIssue() { ... }         // for inline-add in columns
```

`BoardView` receives `onMoveIssue` as a prop from the parent page component (in `packages/views/issues/`). The page imports the mutation from `@multica/core`. This keeps `packages/views/` free of direct TanStack Query calls at the mutation level.

### Pattern 4: Token Replacement Strategy (no feature flag)

Per the "no backwards-compatibility" constraint: replace `tokens.css` in one atomic commit. There is no dual-theme system, no CSS class prefix to toggle between old and new. The new OKLCH values for the deep-forest-green / mint-sage / white palette replace the current neutral palette in-place. The `.dark` block also replaces in-place.

**Sequence:**
1. New tokens land in `packages/ui/styles/tokens.css` (replaces existing)
2. Tailwind utility classes are semantic (`bg-background`, `bg-sidebar`, `text-foreground`) — they automatically reflect new token values
3. Any hardcoded colors discovered during audit get migrated to tokens at the same time
4. Zero feature flag, zero compatibility shim

### Pattern 5: New Atomic Components via shadcn + Base UI

```bash
# Adds to packages/ui/components/ui/
pnpm ui:add badge          # for tag chips (P0, P1 priority badges)
pnpm ui:add toggle-group   # for SegmentedControl (P0/P1/P2/P3, S/M/L/XL effort)
```

Hand-write non-shadcn atomic components (`AccentBar`, `AvatarInitial`, `PhaseBadge`) directly in `packages/ui/components/ui/`. These have zero business logic — pure CSS + HTML.

---

## Anti-Patterns to Avoid

### Anti-Pattern 1: Zustand Selector Returning Fresh Objects

**What:** `s => ({ a: s.a, b: s.b })` creates a new object every render.
**Why bad:** Infinite re-renders. This already bites the sidebar which subscribes to workspace data.
**Instead:** Select primitives separately: `const a = useStore(s => s.a); const b = useStore(s => s.b);`

This is especially important when the new Sidebar renders category chips and priority grid from store state — each must be a primitive selector or use `shallow` from zustand.

### Anti-Pattern 2: next/* Imports in packages/views

**What:** `import { useRouter } from "next/navigation"` in any file under `packages/views/`
**Why bad:** Breaks desktop compilation.
**Instead:** `useNavigation()` from `@multica/core/navigation`

The new sidebar's navigation items (Issues, Inbox, Agents, Settings) must all use `useNavigation().push()` or `<AppLink>`.

### Anti-Pattern 3: next-themes Inside packages/views

**What:** `import { useTheme } from "next-themes"` in `packages/views/layout/app-sidebar.tsx`
**Why bad:** Violates boundary — `packages/views/` cannot import `next-themes` directly (it's a Next.js-associated library by name, though technically framework-agnostic).
**Instead:** Re-export `useTheme` from `packages/ui/components/common/theme-provider.tsx`:

```typescript
// packages/ui/components/common/theme-provider.tsx (already does this)
export { useTheme } from "next-themes";
```

The sidebar imports `useTheme` from `@multica/ui/components/common/theme-provider` — this is already the pattern used in the codebase.

### Anti-Pattern 4: Storybook Importing from apps/

**What:** Stories that import from `apps/web/` or `apps/desktop/`
**Why bad:** Breaks isolation, pulls in Next.js/Electron dependencies.
**Instead:** All stories import only from `@multica/ui` and `@multica/views`. App-specific wiring (NavigationProvider, CoreProvider) is mocked in `.storybook/preview.ts`.

### Anti-Pattern 5: Duplicating Board Logic Per App

**What:** Creating a second `KanbanBoard.tsx` in `apps/web/` with slightly different styling
**Why bad:** DRY violation; both apps drift.
**Instead:** The single `BoardView` in `packages/views/issues/components/` is the source of truth. Token changes in `packages/ui/styles/` propagate automatically.

---

## Storybook App Architecture

### Placement

`apps/showroom/` — a new Turborepo app alongside `apps/web` and `apps/desktop`. It is **not** a package; it is a runnable Vite app. This keeps Storybook's dev/build tooling out of shared package `devDependencies`.

```
apps/showroom/
  package.json           # name: "@multica/showroom", private: true
  tsconfig.json          # extends "@multica/tsconfig/react-library.json"
  vite.config.ts         # @tailwindcss/vite plugin, path alias resolution
  globals.css            # @import tokens, @source directives for packages/ui + packages/views
  .storybook/
    main.ts              # @storybook/react-vite, viteFinal for path aliases
    preview.ts           # globals.css import, ThemeProvider decorator, mock NavigationProvider
```

### Key Configuration for Internal Packages Pattern

Because `packages/ui` and `packages/views` export raw `.tsx` (no pre-compilation), Storybook's Vite builder handles them natively — Vite resolves and transpiles them the same as local source. No special plugin needed.

The one requirement is that Tailwind v4 knows where to scan for class names:

```css
/* apps/showroom/globals.css */
@import "tailwindcss";
@import "@multica/ui/styles/tokens.css";
@import "@multica/ui/styles/base.css";

/* Explicit source scanning for raw package files */
@source "../../packages/ui/components";
@source "../../packages/views";
```

`vite.config.ts` resolves package path aliases the same way `apps/web/next.config.ts` does — by pointing Vite's `resolve.alias` at the package directories (or relying on pnpm's workspace `exports` map, which Vite handles automatically via `moduleResolution: bundler`).

### TypeScript Config

```json
// apps/showroom/tsconfig.json
{
  "extends": "@multica/tsconfig/react-library.json",
  "compilerOptions": {
    "baseUrl": "."
  },
  "include": ["**/*.ts", "**/*.tsx", "../../packages/ui/**/*.tsx", "../../packages/views/**/*.tsx"]
}
```

### Storybook Mock Providers (preview.ts)

```typescript
// apps/showroom/.storybook/preview.ts
import "../globals.css";
import { ThemeProvider } from "@multica/ui/components/common/theme-provider";
import { MockNavigationProvider } from "./mocks/navigation";
import { MockQueryProvider } from "./mocks/query";

export const decorators = [
  (Story) => (
    <ThemeProvider>
      <MockQueryProvider>
        <MockNavigationProvider>
          <Story />
        </MockNavigationProvider>
      </MockQueryProvider>
    </ThemeProvider>
  ),
];
```

`MockNavigationProvider` implements the `NavigationAdapter` interface with no-op push/replace. `MockQueryProvider` wraps `QueryClient`. This lets stories render `packages/views/` components without a real backend.

### Turbo Pipeline

Add to `turbo.json`:
```json
"storybook": { "cache": false, "persistent": true },
"build-storybook": { "dependsOn": ["^build"], "outputs": ["storybook-static/**"] }
```

Add to root `package.json` scripts:
```json
"storybook": "turbo run storybook --filter=@multica/showroom"
```

---

## Sidebar Composition: Shared vs Platform Chrome

### What the Shared Sidebar Provides

`packages/views/layout/app-sidebar.tsx` currently provides: workspace switcher, nav items (Issues, Inbox, Agents, My Issues, Projects, Runtimes, Autopilots, Settings), project list with drag-reorder, user menu. The redesign extends this with: categories chips, priority grid, view filter, dark-mode toggle.

**All of this is platform-neutral — it goes in `packages/views/layout/app-sidebar.tsx`.**

### What Each App Adds

| Platform | Addition | Mechanism |
|----------|----------|-----------|
| Desktop | DragStrip (macOS title bar) | `topSlot` prop on `AppSidebar` or `DashboardLayout` |
| Desktop | Back/Forward nav buttons | `SidebarTopBar` component inside `apps/desktop` desktop-layout |
| Desktop | Tab bar | Outside `DashboardLayout`, above `SidebarInset` in `desktop-layout.tsx` |
| Web | Nothing additional | `topSlot` left undefined |

The `SidebarTopBar` (back/forward) is already desktop-specific and lives in `apps/desktop/src/renderer/src/components/desktop-layout.tsx`. It does not need to move.

### Proposed AppSidebar Props

```typescript
// packages/views/layout/app-sidebar.tsx
interface AppSidebarProps {
  searchSlot?: ReactNode;
  /** Desktop: <DragStrip /> sits as first child of sidebar header. Web: undefined. */
  topSlot?: ReactNode;
}
```

`DashboardLayout` receives `topSlot` and passes it to `AppSidebar`. Each app's root layout provides the value:

```typescript
// apps/desktop/src/renderer/src/components/desktop-layout.tsx
<DashboardLayout topSlot={<DragStrip />} ...>
```

---

## Build Order

This is the dependency-driven sequence. Each step can only begin when its predecessors are stable.

```
Phase 1: Token Foundation
  └── Replace packages/ui/styles/tokens.css (OKLCH palette)
  └── Replace packages/ui/styles/base.css (Inter font, reset)
  └── Verify both apps render with new tokens (smoke test)

Phase 2: Atomic UI Primitives
  └── packages/ui/components/ui/ — Tag, AccentBar, AvatarInitial, SegmentedControl
  └── Test via packages/views tests (Vitest + jsdom)

Phase 3: Storybook Showroom
  └── apps/showroom/ — new app, wired to Turbo
  └── Import packages/ui primitives into stories
  └── Visual review before any view-level changes land

Phase 4: Dashboard Shell Redesign
  └── packages/views/layout/app-sidebar.tsx — new visual design
  └── packages/views/layout/dashboard-layout.tsx — add topSlot if needed
  └── Both apps pick up changes automatically (shared)
  └── Desktop DragStrip integration tested

Phase 5: Issues Views Restyle
  └── packages/views/issues/components/* — board-card, board-column, board-view, list-row, list-view
  └── packages/views/issues/components/issues-header.tsx — view toggle, filter chips
  └── Inline task add per column (new component in packages/views/issues/components/)

Phase 6: Issue Detail Redesign
  └── packages/views/issues/components/issue-detail.tsx — segmented controls, tag chip row

Phase 7: Remaining Views
  └── packages/views/auth/ — login, signup, email-verify, password-reset
  └── packages/views/inbox/, settings/, agents/, workspace/
  └── Error/empty states

Phase 8: Rebrand Strings
  └── All "Multica" → "AlgoPlan" in user-facing strings
  └── Logo/wordmark/favicon (apps/web/public/, apps/desktop assets)
  └── Electron window title, macOS dock icon (apps/desktop/src/main/)
  └── HTML title/meta-description (apps/web/app/layout.tsx)
```

**Why this order:**
- Tokens must land first because every subsequent restyling uses the new semantic token names
- Primitives before views because views compose primitives
- Storybook before view restyling to enable visual review without deploying
- Shell before content because visual regressions in the shell affect every page
- Rebrand strings last because they are superficial and string-only; touching them early creates unnecessary diff noise

---

## Scalability Considerations

| Concern | Current (redesign scope) | Future (>50 cards/column) |
|---------|-------------------------|--------------------------|
| Kanban column rendering | Direct array render, InfiniteScrollSentinel for pagination | Add `@tanstack/react-virtual` inside `BoardColumn`; dnd-kit supports virtual lists via documented patterns |
| WS re-render cascade | WS events invalidate TQ cache → single re-render per component subscribing to that query | No change needed at redesign scale; memo guards on BoardCard |
| Token changes | Single CSS file replace, zero runtime overhead | N/A |
| Storybook build | `build-storybook` is a separate Turbo task, never in production path | N/A |

**Virtualization note:** The existing `BoardColumn` renders all resolved issues in the column directly. The project constraint says to add virtualization "if Performance-Tests fordern" — meaning it is conditional. The architecture of `BoardColumn` (receives `issueIds` + `issueMap` as props) is already compatible with a virtual list wrapper: the inner render of each card is already extracted as `DraggableBoardCard`. Adding `@tanstack/react-virtual` would be a `BoardColumn`-internal change with zero external API change.

---

## Sources

- Verified against `/Users/steph/dev/multica/packages/views/issues/components/board-view.tsx` — dnd-kit integration, DragOverlay, optimistic move
- Verified against `/Users/steph/dev/multica/packages/core/issues/stores/view-store.ts` — ViewMode, createWorkspaceAwareStorage, persist pattern
- Verified against `/Users/steph/dev/multica/packages/ui/styles/tokens.css` — @theme inline, :root + .dark, existing OKLCH structure
- Verified against `/Users/steph/dev/multica/packages/ui/components/common/theme-provider.tsx` — next-themes wrapper, useTheme re-export
- Verified against `/Users/steph/dev/multica/apps/desktop/src/renderer/src/App.tsx` — ThemeProvider from @multica/ui already wraps desktop root
- Verified against `/Users/steph/dev/multica/packages/views/layout/dashboard-layout.tsx` — slot pattern (extra, searchSlot, loadingIndicator)
- Verified against `/Users/steph/dev/multica/packages/views/layout/app-sidebar.tsx` — current sidebar structure
- Verified against `/Users/steph/dev/multica/apps/desktop/src/renderer/src/components/desktop-layout.tsx` — DragStrip, TabBar, SidebarTopBar placement
- Storybook + Tailwind v4 @source directive: [Tailwind v4 + Vite + Storybook discussion](https://github.com/tailwindlabs/tailwindcss/discussions/16451)
- dnd-kit + virtualization: [dnd-kit virtualization discussion](https://github.com/clauderic/dnd-kit/discussions/1372)
- Turborepo + Tailwind v4 tokens: [Setting up Tailwind CSS v4 in a Turbo Monorepo](https://medium.com/@philippbtrentmann/setting-up-tailwind-css-v4-in-a-turbo-monorepo-7688f3193039)

---

*Architecture research: 2026-04-23*
