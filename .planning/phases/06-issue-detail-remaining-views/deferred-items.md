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
