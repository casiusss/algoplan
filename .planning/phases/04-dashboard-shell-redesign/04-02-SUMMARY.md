---
phase: 04-dashboard-shell-redesign
plan: 02
status: complete
tasks_completed: 2/2
commits:
  - d5371099 test(04-02): add failing test for AppSidebar composition
  - 246f77c4 feat(04-02): compose AppSidebar in dashboard-shell with five Plan 01 atoms
created: 2026-04-25
note: SUMMARY written by orchestrator after agent stalled at SUMMARY-write step. Both implementation commits landed cleanly on feat/repos-per-project before stall.
---

# Plan 04-02 — AppSidebar Composition

## Tasks

- 4-02-01 — AppSidebar composition with 5 Plan-01 atoms — **DONE**

## What landed

`packages/views/dashboard-shell/app-sidebar.tsx` (729 lines) — port of legacy `packages/views/layout/app-sidebar.tsx` (681 lines) with seven substitutions:

1. Multica fallback → `WordmarkText` constant (`'AlgoPlan'`)
2. Inline inbox unread span → `<NotificationsBadge wsId={...} />` (badge owns its `SidebarMenuItem` + query; inbox removed from `personalNav` array)
3. `<PriorityGrid wsId={...} />` wrapped in `SidebarGroup` with `'Priority'` label, between Workspace and Configure groups
4. New `'Personal'` `SidebarGroupLabel` above the personal nav block
5. `<Wordmark workspaceName={...} />` renders inside the existing workspace switcher `SidebarMenuButton` trigger
6. `SidebarFooter` trio: `<HelpLauncher />` on the LEFT, `<DarkModeToggle />` + `<CollapseToggle />` on the RIGHT
7. Active nav row gets `<AccentBar color='brand' orientation='vertical' />` as the first flex child (RESEARCH Pattern 5 leading-flex-child option, opacity-gated so layout never shifts)

`packages/views/dashboard-shell/app-sidebar.test.tsx` (348 lines) — 7 cases:
- Composition (renders all 5 atoms + nav groups)
- `wsId` undefined safety
- AlgoPlan fallback
- Workspace-name trigger
- AccentBar on active row
- `topSlot` prop (Pitfall 2 — dual topSlot pattern preserved)
- Collapsed-state hide class

## Workspace-context discipline

- AppSidebar root calls `useCurrentWorkspace()` (allowed at sidebar root per UI-SPEC §2)
- AppSidebar accepts `wsId` as prop and passes to PriorityGrid + NotificationsBadge
- Sub-components do NOT call `useWorkspaceId()`
- `bash scripts/grep-no-useworkspaceid-in-shell.sh` exit 0

## Re-export shim

- `packages/views/dashboard-shell/index.ts` exports AppSidebar + 5 Plan-01 atoms
- `packages/views/layout/index.ts` re-exports AppSidebar from `../dashboard-shell`
- Legacy `packages/views/layout/app-sidebar.tsx` remains in place (Plan 06 deletes it)

## Consumer state

- `apps/desktop` imports `AppSidebar` → resolves via shim → **NEW** AppSidebar
- `apps/web` imports `DashboardLayout` → still uses legacy via internal `./app-sidebar`
- This intentional split lands the new AppSidebar end-to-end on Desktop while Web stays on legacy until Plan 05 (DashboardShell) + Plan 06 (wire-up + delete legacy)

## Verification

- 7/7 vitest cases for `app-sidebar.test.tsx` pass
- 36/36 dashboard-shell tests pass total
- `pnpm typecheck` green across all 7 packages

## Notes

- Dropdown header gets a small `text-xs WordmarkText` row at the top (UI-SPEC §3 dropdown identity affirmation)
- Plan 06 will delete the legacy `packages/views/layout/app-sidebar.tsx` and update `apps/web` to consume `DashboardShell` directly
