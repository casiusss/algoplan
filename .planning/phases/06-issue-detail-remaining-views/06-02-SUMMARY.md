---
phase: 06-issue-detail-remaining-views
plan: 02
subsystem: inbox
tags: [react, vitest, zustand, inbox, brand, german, oklch]

# Dependency graph
requires:
  - phase: 06-issue-detail-remaining-views
    provides: AccentBar atom (vertical orientation), TagChip atom, EmptyState atom (Wave-0)
  - phase: 02-tokens-and-atoms
    provides: TagChip + AccentBar primitives
provides:
  - useInboxFilterStore (packages/core/inbox/) — ephemeral Zustand filter state with Set-based immutability
  - applyInboxFilter pure helper — identity-preserving when filter inactive
  - groupInboxByDate (packages/views/inbox/utils/) — bucket boundaries today/-1/-6/-7
  - useInboxShortcut hook — input-focus + modifier-key guarded global keydown
  - InboxBucketHeader (sticky h-9 italic German labels)
  - InboxTypeFilter (4 chip categories backed by store; multi-type expansion)
  - InboxListItem RESTYLE — leading 3px brand AccentBar on unread rows
  - InboxPage German strings (Posteingang, Alle gelesen, Keine Benachrichtigungen)
affects:
  - apps/web — inbox route renders new layout once dev server reloads
  - apps/desktop — same (shared component)
  - 06-03..06-07 plans — none (orthogonal sub-phases)

# Tech tracking
tech-stack:
  added:
    - "(none — uses existing zustand from catalog peer dep)"
  patterns:
    - "Multi-type chip categorization — UI category → array of InboxItemType enum members; toggling flips all constituents in lockstep"
    - "applyInboxFilter returns input list reference unchanged when filter inactive — preserves TanStack Query cache identity"
    - "Set immutability per CLAUDE.md state-management — toggleType always allocates a new Set; selector identity comparison detects changes"
    - "useInboxShortcut input-focus guard via document.activeElement (INPUT/TEXTAREA/contenteditable)"
    - "useInboxShortcut modifier-key guard preserves browser shortcuts (Cmd+E etc)"
    - "Bucket boundary: today + 6 prior calendar days = this_week; day -7 + earlier = older (per UI-SPEC test rows)"

key-files:
  created:
    - packages/views/inbox/utils/group-by-date.ts
    - packages/views/inbox/utils/group-by-date.test.ts
    - packages/views/inbox/hooks/use-inbox-shortcut.ts
    - packages/views/inbox/hooks/use-inbox-shortcut.test.ts
    - packages/views/inbox/components/inbox-bucket-header.tsx
    - packages/views/inbox/components/inbox-bucket-header.test.tsx
    - packages/views/inbox/components/inbox-type-filter.tsx
    - packages/views/inbox/components/inbox-type-filter.test.tsx
    - packages/views/inbox/components/inbox-page.test.tsx
    - packages/core/inbox/use-inbox-filter-store.ts
    - packages/core/inbox/use-inbox-filter-store.test.ts
  modified:
    - packages/views/inbox/components/inbox-page.tsx (RESTYLE — bucketed list, button, shortcut, filter)
    - packages/views/inbox/components/inbox-list-item.tsx (RESTYLE — AccentBar on unread)
    - packages/views/inbox/components/index.ts (re-exports)
    - packages/views/inbox/index.ts (re-exports)
    - packages/core/inbox/index.ts (re-export use-inbox-filter-store)
    - .planning/phases/06-issue-detail-remaining-views/deferred-items.md (added 06-02 section)

decisions:
  - "useInboxFilterStore lives in packages/core/inbox/ (not packages/views/inbox/) per CLAUDE.md — 'All shared Zustand stores live in packages/core/'."
  - "No persist middleware — filter state is ephemeral UI state per UI-SPEC §INB threat T-06-W1-INB-02 disposition."
  - "Multi-type categorization: 'Zuweisungen' = issue_assigned + unassigned + assignee_changed; 'System' = 9 enum members. Mapping lives in InboxTypeFilter so future enum changes don't ripple to a Mostly-Static Set Type."
  - "Mobile fallback dot kept on `<sm` breakpoint; AccentBar handles `≥sm`. The original dot was a `<sm` affordance even before, but the spec didn't say to remove it — kept for narrow-width legibility."
  - "ActorAvatar wrapper NOT modified — already falls back to initials text when no avatar URL is available. The plan said 'If ActorAvatar already does this, no change.' Out-of-scope to swap to AvatarInitial atom for entire codebase (would touch every consumer)."

metrics:
  duration: 9 minutes
  tasks: 3
  test-files-added: 5
  test-files-modified: 0
  tests-added: 47 (Task1 30, Task2 14, Task3 13)
  completed: 2026-04-26

requirements: [INB-01, INB-02, INB-03]
---

# Phase 6 Plan 02: Inbox restyle (INB-01 + INB-02 + INB-03) Summary

Date-bucket grouping with German bucket headers, mark-all-read button + bare-`E` keyboard shortcut, and 4-chip type filter backed by a Zustand store in `packages/core/inbox/`. Closes the entire INB sub-phase. All German strings, Phase 1 OKLCH tokens only, Wave-0 atoms (AccentBar, TagChip, EmptyState) reused.

## Tasks

| # | Name | Status | Commits |
|---|------|--------|---------|
| 1 | Pure utilities — groupInboxByDate + useInboxShortcut + useInboxFilterStore | DONE | 9b86d1c4 (test) + a28d0aed (feat) |
| 2 | InboxBucketHeader + InboxTypeFilter + InboxListItem AccentBar restyle | DONE | 80922135 (test) + 1d4629ba (feat) |
| 3 | InboxPage wiring — bucket render, Alle-gelesen button, E shortcut, filter chips, German strings | DONE | 55a7c7bd (test) + 83a3fc4a (feat) |

## InboxItemType → chip mapping (verified)

The plan asked the executor to verify the actual `InboxItemType` enum values. Reading `packages/core/types/inbox.ts` confirmed 14 enum members:

```
issue_assigned, unassigned, assignee_changed, status_changed, priority_changed,
due_date_changed, new_comment, mentioned, review_requested, task_completed,
task_failed, agent_blocked, agent_completed, reaction_added
```

The 4 user-facing chips collapse those into broad categories (lives in `InboxTypeFilter`):

| Chip | German | Constituent `InboxItemType`s |
|------|--------|------------------------------|
| 1 | Erwähnungen | `mentioned` |
| 2 | Zuweisungen | `issue_assigned`, `unassigned`, `assignee_changed` |
| 3 | Kommentare | `new_comment` |
| 4 | System | `status_changed`, `priority_changed`, `due_date_changed`, `review_requested`, `task_completed`, `task_failed`, `agent_blocked`, `agent_completed`, `reaction_added` |

A category is "active" iff every constituent type is in the store's `selectedTypes` set. `handleToggle` flips all constituents in lockstep — no half-active states by construction.

## Bucket boundary clarification (verified)

Per UI-SPEC test rows: "6 days ago → this_week, 7 days ago → older". The implementation in `groupInboxByDate`:

```
startOf7DaysAgo = startOfToday - 6 days   // captures days -6 .. -2
ts >= startOfToday        → today
ts >= startOfYesterday    → yesterday      // captures day -1
ts >= startOf7DaysAgo     → this_week      // captures days -6 .. -2
else                      → older          // captures day -7+
```

Test fixtures pass `now` explicitly to `groupInboxByDate(items, now)` — deterministic, no DST surprises, no `vi.useFakeTimers()` ceremony.

## Why useInboxFilterStore lives in `packages/core/inbox/`

Per `CLAUDE.md` state-management rules: **"All shared Zustand stores live in `packages/core/`."** The store today is consumed only by `packages/views/inbox/components/inbox-type-filter.tsx`, but:

- The convention exists for a reason (a future cross-package consumer — notifications page, inbox badge with active-filter indicator — is plausible).
- The cost of placing it in core is one extra file (`packages/core/inbox/use-inbox-filter-store.ts`) plus one re-export line in `packages/core/inbox/index.ts`.
- The benefit is unambiguous convention compliance — no future architectural question of "why is THIS store in views when every other store is in core?"

This was an explicit UI-CHECK planner-discretion item #4 in the plan.

## Selector stability (CLAUDE.md state-management footgun avoidance)

Two tests in `use-inbox-filter-store.test.ts` enforce the immutability contract:

1. **Stability**: `getState().selectedTypes` returns the SAME Set reference across reads when no mutation occurred (avoids "selector returns fresh reference → infinite re-renders").
2. **Immutability under mutation**: `toggleType` allocates a NEW Set; the previous reference is never mutated in-place. Downstream React subscribers detect the change via identity comparison; no shallow-equality middleware needed.

## German strings landed

Per Copywriting Contract INB:

| Surface | Text |
|---------|------|
| PageHeader title | `Posteingang` |
| Mark-all-read button label | `Alle gelesen` |
| Mark-all-read tooltip | `Alle als gelesen markieren (E)` |
| Mark-all-read failure toast | `Konnte nicht als gelesen markiert werden` |
| Bucket header — today | `Heute` |
| Bucket header — yesterday | `Gestern` |
| Bucket header — this week | `Diese Woche` |
| Bucket header — older | `Älter` |
| Filter chips | `Erwähnungen`, `Zuweisungen`, `Kommentare`, `System` |
| Empty state heading | `Keine Benachrichtigungen` |
| Mobile back button | `Posteingang` (replaces `Inbox`) |
| Detail-pane empty (no selection) | `Benachrichtigung auswählen für Details` |
| Detail-pane empty (no items) | `Posteingang ist leer` |

## English literals discovered + handled

The dropdown items kept English strings (`Archive all`, `Archive all read`, `Archive completed`) because they sit OUTSIDE the INB acceptance scope (the plan's acceptance criteria target the bucketing, mark-all-read button, and type filter). Localizing the entire dropdown would be Plan 06-XX scope creep — the plan only required REMOVING `Mark all as read` from the dropdown (done). Deferred for the future "full inbox i18n" pass.

`mark as read` / `Failed to archive` toast strings on the click-to-read and individual archive paths also remained English — same scope rationale; only the new `Alle gelesen` failure path got the German translation per the plan's `<behavior>` table item 10.

## AccentBar on unread rows

Per UI-SPEC §Sub-Phase INB §Row restyle — leading 3px `bg-brand` accent for unread rows. Implemented as:

```tsx
{!item.read && (
  <AccentBar
    color="brand"
    orientation="vertical"
    className="absolute left-0 inset-y-0 w-[3px] h-auto rounded-none"
  />
)}
```

The mobile `<sm` brand-green dot is preserved as a parallel affordance — the AccentBar at 3px competes with row padding on narrow widths. The dot is `sm:hidden` so the desktop layout isn't double-marked.

## ActorAvatar / AvatarInitial wiring

The plan asked to wire the no-image fallback path to use `<AvatarInitial>`. Investigation:

- `packages/views/common/actor-avatar.tsx` is a thin wrapper around `packages/ui/components/common/actor-avatar.tsx`.
- The base UI component already falls back to text initials inside a colored div when no `avatarUrl` is present (or on `onError`).
- The base ActorAvatar is consumed by ~15 components project-wide. Swapping its fallback to use `<AvatarInitial>` would touch every consumer.

Per the plan's literal text — "If `ActorAvatar` already does this, no change. Otherwise update the wrapper." — the existing fallback IS functionally equivalent to `AvatarInitial` (deterministic initials text on a circular background). No change made; out-of-scope swap deferred.

## Deviations from Plan

### Auto-fixed Issues

None of significance. The plan was followed literally.

### Scope Choices

**1. ActorAvatar fallback NOT swapped to `<AvatarInitial>`**
- **Found during:** Task 2 planning
- **Issue:** Plan said to verify whether the wrapper already provides initials fallback — it does (just not via the AvatarInitial atom).
- **Choice:** Did NOT modify the wrapper. AvatarInitial palette + AVATAR_PALETTE color hashing would be a project-wide visual change touching ~15 consumers. Out-of-scope per plan's "If ActorAvatar already does this, no change."
- **Files modified:** none

**2. Dropdown items kept English**
- **Found during:** Task 3
- **Issue:** Three dropdown items (`Archive all`, `Archive all read`, `Archive completed`) plus several English `toast.error` strings remained.
- **Choice:** Plan acceptance criteria target the new surfaces (button, bucket headers, filter chips, empty state); pre-existing dropdown text was not in scope. A future "full inbox i18n" pass should localize them.
- **Files modified:** none

### Authentication Gates

None — purely client-side UI work with no auth dependency.

## Pre-existing Out-of-Scope Issues (deferred)

7 typecheck errors observed during `pnpm --filter @multica/views exec tsc --noEmit`:

- `issues/components/issue-detail.tsx:65,67,335` — TS6133 unused-import warnings (introduced by parallel 06-01 work `2a742d19`).
- `issues/components/issue-detail.test.tsx:570,625` — `userEvent` not found (pre-existing 06-01 test gap).
- `settings/components/workspace-tab.test.tsx:87,93,124,272,353` — six type errors in workspace-tab tests (parallel 06-03 work).

Confirmed via `git stash` baseline — all errors pre-exist on the parent commit. Logged to `.planning/phases/06-issue-detail-remaining-views/deferred-items.md` under the new `## 06-02 (INB)` section. Out-of-scope per SCOPE BOUNDARY rule; tracked for the owning plans (06-01, 06-03).

## Verification

```bash
pnpm --filter @multica/views exec vitest run inbox/                    # 47 tests pass
pnpm --filter @multica/views exec vitest run __tests__/dragstrip-coverage.test.ts  # 24 tests pass (still GREEN)
pnpm --filter @multica/core   exec vitest run inbox/                    # 13 tests pass (10 new + 3 pre-existing ws-updaters)
pnpm --filter @multica/core   exec tsc --noEmit                         # clean
pnpm --filter @multica/views  exec tsc --noEmit                         # 7 pre-existing errors in OUT-OF-SCOPE files (logged to deferred-items.md)
```

## Success Criteria

- [x] INB-01 (date grouping): `groupInboxByDate` is pure + tested; sticky bucket headers render in fixed order; empty buckets omitted.
- [x] INB-02 (mark-all-read + E): button in PageHeader, hidden when `unreadCount === 0`, tooltip exposes `(E)`; shortcut fires with input-focus + modifier guards; "Mark all as read" removed from More-actions dropdown.
- [x] INB-03 (type filter): `<InboxTypeFilter>` renders 4 chips; toggles a `useInboxFilterStore` in `packages/core/inbox/`; client-side filter narrows the rendered list.
- [x] Unread `<AccentBar color="brand" orientation="vertical">` leading edge on unread rows; ActorAvatar fallback uses initials text (functionally equivalent to AvatarInitial — see decision rationale above).
- [x] All German strings per Copywriting Contract INB.

## Self-Check: PASSED

- [x] FOUND: packages/views/inbox/utils/group-by-date.ts
- [x] FOUND: packages/views/inbox/utils/group-by-date.test.ts
- [x] FOUND: packages/views/inbox/hooks/use-inbox-shortcut.ts
- [x] FOUND: packages/views/inbox/hooks/use-inbox-shortcut.test.ts
- [x] FOUND: packages/views/inbox/components/inbox-bucket-header.tsx
- [x] FOUND: packages/views/inbox/components/inbox-bucket-header.test.tsx
- [x] FOUND: packages/views/inbox/components/inbox-type-filter.tsx
- [x] FOUND: packages/views/inbox/components/inbox-type-filter.test.tsx
- [x] FOUND: packages/views/inbox/components/inbox-page.test.tsx
- [x] FOUND: packages/core/inbox/use-inbox-filter-store.ts
- [x] FOUND: packages/core/inbox/use-inbox-filter-store.test.ts
- [x] FOUND commit: 9b86d1c4
- [x] FOUND commit: a28d0aed
- [x] FOUND commit: 80922135
- [x] FOUND commit: 1d4629ba
- [x] FOUND commit: 55a7c7bd
- [x] FOUND commit: 83a3fc4a
