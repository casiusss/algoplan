---
phase: 04-dashboard-shell-redesign
plan: 00
subsystem: dashboard-shell-scaffold
tags: [scaffold, infra, ci, wave-0, nyquist]
requires: []
provides:
  - "packages/views/dashboard-shell/ (empty barrel)"
  - "packages/core/issues/derived/ (RED test scaffolds)"
  - "scripts/grep-no-useworkspaceid-in-shell.sh (CI invariant for SC#4)"
  - "e2e/dashboard-shell.spec.ts (skipped E2E skeleton)"
affects:
  - "Plans 01–05 (test files exist so their <verify> commands won't 404)"
  - "Plan 02 (later mutates packages/views/layout/index.ts to re-export from dashboard-shell/)"
  - "Plan 06 (later mutates layout/index.ts again, fills E2E spec, both apps wire DashboardShell)"
tech-stack:
  added: []
  patterns:
    - "Wave-0 scaffold pattern: create RED test files BEFORE implementation lands (Nyquist gate)"
    - "Grep CI invariant pattern: shell script asserts no useWorkspaceId() inside dashboard-shell/ (UI-SPEC SC#4)"
    - "vitest it.todo() for RED stability tests — pending cases pass, document intent"
key-files:
  created:
    - "packages/views/dashboard-shell/index.ts"
    - "packages/core/issues/derived/use-issue-count-by-priority.test.tsx"
    - "packages/core/issues/derived/use-blocker-count.test.tsx"
    - "e2e/dashboard-shell.spec.ts"
    - "scripts/grep-no-useworkspaceid-in-shell.sh"
  modified: []
decisions:
  - "IssuePriority enum verified: \"urgent\" | \"high\" | \"medium\" | \"low\" | \"none\" (NOT P0-P3 as UI-SPEC §4 assumed). Plan 05 must apply the mapping urgent→P0, high→P1, medium→P2, low→P3, none→excluded — documented inline in test scaffolds so Plan 05's executor cannot miss it."
  - "Comment in barrel placeholder uses \"the useWorkspaceId hook\" instead of \"useWorkspaceId()\" to avoid the grep CI hook matching its own documentation."
  - "Did not modify packages/views/layout/index.ts in Wave 0 — its behavior is mutated by Plans 02 and 06 (re-export from dashboard-shell/ once those source files exist)."
metrics:
  duration: "2m"
  tasks_completed: 1
  files_created: 5
  files_modified: 0
  commits: 1
  completed: 2026-04-25T14:06:27Z
---

# Phase 4 Plan 00: Dashboard Shell Wave-0 Scaffolds Summary

Wave 0 created the five test/CI scaffolds Plans 01–06 depend on (new shell directory, two RED stability tests, an E2E skeleton, the grep CI hook), verified the IssuePriority enum shape (and baked the descriptive→P0/P1/P2/P3 mapping into both test scaffolds for Plan 05), and shipped a single atomic commit — no production code yet.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 0 | Verify enum + create dashboard-shell/ + scaffolds + grep hook + e2e skeleton | `0fde87cf` | 5 created |

## Files Created

| Path | Purpose | Lines |
|------|---------|-------|
| `packages/views/dashboard-shell/index.ts` | Barrel placeholder (empty `export {}`) — fills as Plans 01–05 land | 4 |
| `packages/core/issues/derived/use-issue-count-by-priority.test.tsx` | Vitest stability scaffold (RED) — 3 `it.todo` cases for SHL-05 | 19 |
| `packages/core/issues/derived/use-blocker-count.test.tsx` | Vitest scaffold (RED) — 2 `it.todo` cases for SHL-05 | 11 |
| `e2e/dashboard-shell.spec.ts` | Playwright skeleton — single `test.skip` for dark-mode persistence (Plan 06 fills) | 19 |
| `scripts/grep-no-useworkspaceid-in-shell.sh` | CI invariant: exits 1 if `useWorkspaceId(` appears inside dashboard-shell/ | 12 |

## Validation Results

All `<verify>` and `<verification>` checks from the plan passed.

| Check | Command | Result |
|-------|---------|--------|
| 5 files exist | `test -f …` × 5 | PASS |
| grep hook executable | `test -x scripts/grep-no-useworkspaceid-in-shell.sh` | PASS |
| grep hook exits 0 on empty dir | `bash scripts/grep-no-useworkspaceid-in-shell.sh` | `OK: no useWorkspaceId() calls in dashboard-shell/` (exit 0) |
| Vitest discovers + runs scaffolds | `pnpm --filter @multica/core exec vitest run issues/derived` | 2 test files, 5 todo (pending), 0 failures |
| Core typecheck green | `pnpm --filter @multica/core exec tsc --noEmit` | clean |
| Views typecheck green | `pnpm --filter @multica/views exec tsc --noEmit` | clean |
| Playwright parses spec | `pnpm exec playwright test e2e/dashboard-shell.spec.ts --list` | 1 test discovered (skipped) |

## Key Decisions

### IssuePriority enum verification (assumption A1 from RESEARCH)

The actual enum is descriptive, not P0–P3:

```typescript
// packages/core/types/issue.ts
export type IssuePriority = "urgent" | "high" | "medium" | "low" | "none";
```

UI-SPEC §4 and RESEARCH §A1 had assumed `"P0" | "P1" | "P2" | "P3"`. The mismatch is documented inline at the top of `use-issue-count-by-priority.test.tsx` so Plan 05 cannot miss it:

```
PRIORITY MAPPING (per Plan 00 verification of packages/core/types/issue.ts):
  "urgent" → P0, "high" → P1, "medium" → P2, "low" → P3, "none" → excluded
```

Plan 05's `useIssueCountByPriority` MUST apply this mapping when grouping issues into the priority grid.

### Grep hook self-match avoidance

The grep CI hook matches the literal pattern `useWorkspaceId(` (parenthesis included). The barrel placeholder originally documented the invariant with `"… may not import useWorkspaceId()."` which itself triggered the hook. The comment was rewritten to `"… may not call the useWorkspaceId hook."` (no parenthesis) so the hook stays passing while documentation remains intact.

### Layout barrel left alone

`packages/views/layout/index.ts` was NOT modified in Wave 0 even though `files_modified` lists it. The plan action explicitly states "DO NOT modify packages/views/layout/index.ts in Wave 0 — it still has to keep working through Plans 01–05." Plans 02 and 06 will mutate it once the new source files exist.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Grep hook self-matched its own documentation**

- **Found during:** Task 0 verification
- **Issue:** The barrel placeholder comment contained the literal `useWorkspaceId()`. The grep CI hook matches `useWorkspaceId(` anywhere in `*.ts`/`*.tsx` files within `packages/views/dashboard-shell/`, which caused it to fail on its own documentation.
- **Fix:** Rewrote the comment to `"… may not call the useWorkspaceId hook"` (parenthesis removed). The invariant is still clearly documented; the grep hook now exits 0.
- **Files modified:** `packages/views/dashboard-shell/index.ts` (comment text only — `export {}` unchanged)
- **Commit:** `0fde87cf` (folded into Task 0 commit pre-finalization)

**2. [Rule 2 - Critical functionality] Unused `page` parameter in skipped E2E**

- **Found during:** Authoring
- **Issue:** TypeScript `noUnusedParameters` would flag the `page` param in the skipped Playwright test.
- **Fix:** Added `void page;` inside the body to mark it intentionally unused in the skeleton. Plan 06 will remove this line when it wires the real assertions.
- **Files modified:** `e2e/dashboard-shell.spec.ts`
- **Commit:** included in `0fde87cf`

### `files_modified` vs reality

The plan frontmatter listed `packages/views/layout/index.ts` as modified, but the Step 6 instruction (line 203) explicitly forbade touching it in Wave 0. The instruction takes precedence — Plans 02/06 mutate the file. This is a docs-only inconsistency in the plan; no code action was needed.

### `must_haves.artifacts` for `packages/views/layout/index.ts`

The artifact entry described the file as "documents the impending migration via comment" but the action step said not to touch it. Resolved by following the explicit action (do not modify). The comment-on-migration could be added in Plan 02 alongside the actual re-export change without losing any auditability.

## Wave 0 Hand-Off Map

Where each scaffold gets filled in:

| Scaffold | Filled by |
|----------|-----------|
| `dashboard-shell/index.ts` (barrel) | Plans 01 (atom exports), 02 (AppSidebar), 03 (topbar atoms), 04 (AppTopbar), 05 (DashboardShell + derived hooks) |
| `use-issue-count-by-priority.test.tsx` | Plan 05 Task 2 (real assertions; implementation in `use-issue-count-by-priority.ts` alongside) |
| `use-blocker-count.test.tsx` | Plan 05 Task 2 (primitive `0` stub; v2 backend wires real count) |
| `e2e/dashboard-shell.spec.ts` | Plan 06 Task 2 (removes `test.skip`, fills steps 1–6 already documented inline) |
| `scripts/grep-no-useworkspaceid-in-shell.sh` | Used as `<verify>` step by Plans 02, 04, 05, 06 (six independent reinforcement points for SC#4) |

## Threat Mitigation Status

| Threat ID | Disposition | Status |
|-----------|-------------|--------|
| T-04-00-01 (Tampering — useWorkspaceId leak in shell) | mitigate | MITIGATED — grep CI hook in place, exit 0 verified on Wave 0 empty dir |
| T-04-00-02 (Info disclosure — E2E spec) | accept | ACCEPTED — `test.skip` only, no auth flow exercised |

## Self-Check: PASSED

Verified after writing this SUMMARY:

- `packages/views/dashboard-shell/index.ts` — FOUND
- `packages/core/issues/derived/use-issue-count-by-priority.test.tsx` — FOUND
- `packages/core/issues/derived/use-blocker-count.test.tsx` — FOUND
- `e2e/dashboard-shell.spec.ts` — FOUND
- `scripts/grep-no-useworkspaceid-in-shell.sh` — FOUND (executable)
- Commit `0fde87cf` — FOUND in `git log`
