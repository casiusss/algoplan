---
phase: 04-dashboard-shell-redesign
status: clean
verdict: CLEAN
created: 2026-04-25
critical: 0
high: 0
medium: 2
low: 4
info: 2
---

# Phase 4 — Code Review

**Verdict: CLEAN** (2 MEDIUM + 4 LOW non-blocking observations; no CRITICAL/HIGH)

All 10 hard rules verified PASS.

## Per-Rule Verdict

| # | Rule | Verdict |
|---|------|---------|
| 1 | Token discipline (no hex/RGB/`dark:*`) | PASS |
| 2 | Workspace context discipline (no `useWorkspaceId()` in shell) | PASS |
| 3 | Selector stability (Object.is across rerenders) | PASS |
| 4 | Re-export shim preserves `@multica/views/layout` | PASS |
| 5 | Dual slot pattern (`topSlot` + `sidebarTopSlot`) | PASS |
| 6 | Zero-DOM contract (SC#2) | PASS |
| 7 | Legacy `app-sidebar.tsx` + `dashboard-layout.tsx` deleted | PASS |
| 8 | IssuePriority enum mapping urgent→p0..low→p3, none excluded | PASS |
| 9 | PHASE-4-INLINE-STUB cleanup | PASS |
| 10 | No `__forTesting` exports remaining | PASS |

## Findings

### MEDIUM

**MD-01 — `BlockerBadge` icon-button overflows when count > 0**
- File: `packages/views/dashboard-shell/blocker-badge.tsx:32-47`
- Issue: `size="icon-sm"` resolves to fixed `size-7` (28×28). When count badge `<span>` renders alongside icon, fixed-width button cannot accommodate icon + badge — visual overflow/clipping.
- Fix: Switch to auto-width when `count > 0` via conditional className.

**MD-02 — `FilterChipRow` regex matches issue detail pages too**
- File: `packages/views/dashboard-shell/filter-chip-row.tsx:56`
- Issue: `/\/[^/]+\/(issues|my-issues)\b/` matches `/ws-1/issues/ABC-123`. UI-SPEC §9 says FilterChipRow renders nothing on non-listing pages.
- Fix: Anchor regex to terminate at end-or-query-string: `/^\/[^/]+\/(issues|my-issues)(?:\?|$)/`.

### LOW

- **LO-01** — `PinRow.wsId: string` (not optional) called with `wsId={resolvedWsId ?? ""}` (`app-sidebar.tsx:253`)
- **LO-02** — `NotificationsBadge` uses literal `["inbox", "disabled"]` queryKey instead of `inboxKeys.*` (`notifications-badge.tsx:35`)
- **LO-03** — `useIssueCountByPriority` builds queryKey with `wsId ?? ""` (`use-issue-count-by-priority.ts:31`)
- **LO-04** — `DashboardShell` always renders `loadingFallback` wrapper even when `loadingIndicator` undefined (`dashboard-shell.tsx:57-61`)

### INFO

- **IN-01** — `PriorityGrid.activeMap` builds 5 keys including unused `none` (`priority-grid.tsx:117-125`)
- **IN-02** — `WordmarkText.charAt(0)` magic-letter `"A"` — could be named constant (`app-sidebar.tsx:459`)

## Action

MD-01 + MD-02 fixed inline this commit. LOW + INFO items deferred to Phase 5/6 polish.
