# Phase 6 — Deferred / Out-of-Scope Items

Items discovered during plan execution that are out-of-scope for the current
plan but should be tracked for follow-up.

## 06-03 (Settings restyle)

### Pre-existing typecheck errors (not introduced by 06-03)

- `packages/views/issues/components/issue-priority-segmented-control.test.tsx:7` — Cannot find module `./issue-priority-segmented-control` (will be created by 06-02).
- `packages/views/issues/components/issue-priority-segmented-control.test.tsx:22` — implicit `any` type on parameter `p` (companion to the missing module — same plan).

Both errors are scoped to a Plan 02 (DTL) test file that references a
component to be added by Plan 02. Out-of-scope for Plan 03 per the
SCOPE BOUNDARY rule. They will resolve when Plan 02 lands.

## 06-02 (INB Inbox restyle)

### Pre-existing typecheck errors (not introduced by 06-02)

Confirmed via `git stash + tsc --noEmit` baseline — these errors exist on
the parent commit and are NOT caused by this plan:

- `packages/views/issues/components/issue-detail.tsx:65,67,335` — TS6133 unused-import warnings introduced by parallel 06-01 work (`PriorityPicker`, `IssueDetailFooter`, `onClose`).
- `packages/views/issues/components/issue-detail.test.tsx:570,625` — `userEvent` not found (pre-existing 06-01 test scaffolding gap).
- `packages/views/settings/components/workspace-tab.test.tsx:87,93,124,272,353` — six type errors in workspace-tab tests added by parallel 06-03 work.

All seven errors live in files outside Plan 06-02's `files_modified` scope.
Out-of-scope per SCOPE BOUNDARY rule; tracked for the owning plans (06-01,
06-03) to address.

## 06-05 (AUTH entry — api client + LoginPage + simple pages)

### Pre-existing typecheck errors in untracked workspace-tab.test.tsx (not introduced by 06-05)

- `packages/views/settings/components/workspace-tab.test.tsx:93` — TS2554: Expected 0 arguments, but got 1.
- `packages/views/settings/components/workspace-tab.test.tsx:124` — TS2556: A spread argument must either have a tuple type or be passed to a rest parameter.
- `packages/views/settings/components/workspace-tab.test.tsx:272` — TS2322: Type incompatibility on a Promise resolver.
- `packages/views/settings/components/workspace-tab.test.tsx:353` — TS2345: HTMLElement | undefined not assignable to Element.

All four errors are scoped to an UNTRACKED test file (`?? packages/views/settings/components/workspace-tab.test.tsx`) that exists on the working tree but is not in any commit. Confirmed pre-existing via `git stash` baseline check before Task 2 commit. Out-of-scope for Plan 05 per the SCOPE BOUNDARY rule. The file is part of an unrelated in-progress workstream — whoever lands the matching component change should resolve them at that time.
