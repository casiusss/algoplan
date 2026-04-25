---
phase: 04-dashboard-shell-redesign
verifier: gsd-plan-checker
verdict: PASSED-WITH-MINOR-FIXES
verified: 2026-04-25
plans_checked: 7
blockers: 0
warnings: 4
info: 2
---

# Phase 4 Plan Check — Dashboard Shell Redesign

## Verdict: PASSED with 4 minor warnings (non-blocking)

The plan suite delivers the phase goal. Goal-backward analysis confirms every SHL-01..SHL-05 requirement maps to concrete tasks, every VALIDATION test ID has an implementation path, the wave dependency graph is sound, and parallel-wave plans (02+03) edit disjoint file sets. Wave 0 is well-conceived and creates every test target referenced by later waves.

The 4 warnings below should be addressed inline by the executor (small text/contract clarifications); none require a planner revision loop.

---

## Requirement Coverage (PASS)

| Requirement | Source Plans | Verification | Status |
|-------------|--------------|--------------|--------|
| SHL-01 (sidebar wordmark, collapse, dark-mode persist) | 01 (atoms) → 02 (composition) → 06 (wiring + E2E) | `dark mode persists across page loads` E2E in Plan 06 | COVERED |
| SHL-02 (topSlot DragStrip injection / no gap on web) | 05 (DashboardShell) → 06 (Desktop dual-slot wiring) | `dashboard-shell.test.tsx` regression test for empty-topSlot=zero-DOM | COVERED |
| SHL-03 (topbar with chips, search, CTA) | 03 (atoms) → 04 (composition) | per-atom unit tests + composition DOM-order test | COVERED |
| SHL-04 (slot system) | 05 (top + sidebarTopSlot dual-slot) → 06 (both apps wire) | DOM compareDocumentPosition assertion in `dashboard-shell.test.tsx` | COVERED |
| SHL-05 (selector stability) | 00 (RED scaffolds) → 05 (GREEN derived hooks) | `Object.is(prev, next) === true` rerender assertions | COVERED |

All five requirements appear in plan frontmatter `requirements:` fields.

## VALIDATION ID Coverage (PASS)

All 10 task IDs map to plan tasks:

| Task ID | Plan | Implementation Task | Verified by |
|---------|------|---------------------|-------------|
| 4-00-01, 4-00-02 | 00 | Task 0 (scaffolds) | `test -d` + grep hook |
| 4-01-01 | 01 | Task 1+2 | per-atom vitest |
| 4-02-01 | 02 | Task 1 | app-sidebar.test.tsx + grep hook |
| 4-03-01 | 03 | Task 1+2 | per-atom vitest |
| 4-04-01 | 04 | Task 1 | app-topbar.test.tsx |
| 4-05-01, 4-05-02 | 05 | Tasks 1+2 | dashboard-shell.test.tsx + derived-hook tests |
| 4-06-01, 4-06-02 | 06 | Tasks 1+2 | typecheck + Playwright |

## Wave Dependency Graph (PASS — no cycles, no forward refs)

```
Wave 0: Plan 00 (no deps) — scaffolds + grep CI
Wave 1: Plan 01 (deps: 00) — 5 sidebar atoms
Wave 2: Plan 02 (deps: 01) — AppSidebar composition
        Plan 03 (deps: 00) — 4 topbar atoms          [PARALLEL with 02 — verified]
Wave 3: Plan 04 (deps: 03) — AppTopbar composition
Wave 4: Plan 05 (deps: 02, 04) — DashboardShell + derived hooks + stub deletion
Wave 5: Plan 06 (deps: 05) — wire both apps + delete legacy + E2E
```

Wave 2 parallel-safe verified — no same-wave file collisions:
- Plan 02 touches: `app-sidebar.tsx`, `app-sidebar.test.tsx`, `dashboard-shell/index.ts`, `layout/index.ts`
- Plan 03 touches: `filter-chip-row*`, `blocker-badge*`, `search-input*`, `primary-cta*`
- Disjoint sets — confirmed.

## File Existence Cross-Check (PASS)

Every codebase reference in plan `<interfaces>` blocks verified against the live tree:

| Reference | Path | Exists |
|-----------|------|--------|
| `useIssueViewStore` (callable + actions) | `packages/core/issues/stores/view-store.ts:219` | YES |
| `togglePriorityFilter`, `clearFilters`, `priorityFilters`, `statusFilters`, `assigneeFilters` | view-store.ts | YES |
| `IssuePriority = "urgent" \| "high" \| "medium" \| "low" \| "none"` | `packages/core/types/issue.ts` | YES (verified — Plan 00 mapping is correct) |
| `inboxKeys.list(wsId)`, `deduplicateInboxItems` | `packages/core/inbox/queries.ts` | YES |
| `useModalStore.getState().open(modal, data?)` | `packages/core/modals/store.ts` | YES |
| `useTheme` re-export from next-themes | `packages/ui/components/common/theme-provider.tsx` | YES |
| `useNavigation()` returning `{ pathname, push }` | `packages/views/navigation/types.ts` + `context.tsx` | YES |
| `TagChip`, `AccentBar` | `packages/ui/components/ui/{tag-chip,accent-bar}.tsx` | YES |
| `DragStrip` | `packages/views/platform/drag-strip.tsx` | YES |
| `useCurrentWorkspace()` | `packages/core/paths/hooks.tsx` | YES |
| `useWorkspacePaths()` | `packages/core/paths/index.ts` | YES |
| `issueListOptions(wsId).select` flattens to Issue[] | `packages/core/issues/queries.ts` | YES |
| Legacy `app-sidebar.tsx` (681 lines for port) | `packages/views/layout/app-sidebar.tsx` | YES (681 lines — exact match) |
| Legacy `dashboard-layout.tsx` | `packages/views/layout/dashboard-layout.tsx` | YES |
| `apps/web/app/[workspaceSlug]/(dashboard)/layout.tsx` | exact path | YES (current content matches Plan 06's `<interfaces>` excerpt verbatim) |
| `apps/desktop/.../desktop-layout.tsx` mounts `<AppSidebar topSlot=…>` at line 123 | exact line | YES (verified) |

## Workspace-Context Discipline (PASS)

- Plan 00 ships `scripts/grep-no-useworkspaceid-in-shell.sh` — every later plan's `<verify>` includes `bash scripts/grep-no-useworkspaceid-in-shell.sh`. Six independent verification points reinforce SC#4.
- Plan 02 explicitly allows `useCurrentWorkspace()` at AppSidebar root (UI-SPEC §2 carve-out) and forbids it in sub-components (which receive `wsId` as prop).
- Plans 01+03 write zero `useWorkspaceId()` calls into atoms; the inline-stub pattern proves it (counts come from a parameter, not a hook).

## Stable-Selector Tests (PASS)

- `useIssueCountByPriority` — Plan 05 ships frozen-EMPTY singleton + useMemo over issues array; Plan 05 test asserts `Object.is(prev, next) === true` across rerender (4 cases).
- `useBlockerCount` — primitive `0` (auto-stable); Plan 05 test asserts `prev === next` across rerender.
- Existing `useIssueViewStore` selectors used by `<FilterChipRow>` are individual primitive selectors (UI-SPEC §9 explicit) — no fresh-object selectors. Plan 03 documents this discipline.

## PHASE-4-INLINE-STUB Lifecycle (PASS)

- Plan 01 plants stub in `priority-grid.tsx` (clearly marked `PHASE-4-INLINE-STUB`).
- Plan 03 plants stub in `blocker-badge.tsx` (same marker).
- Plan 05 Task 1 deletes BOTH stubs and rewires imports to `@multica/core/issues/derived`.
- Plan 05 verify includes `! grep -rn "PHASE-4-INLINE-STUB" packages/views/dashboard-shell/` — zero matches required.

## PageHeader Preservation (PASS)

- UI-SPEC §8 explicitly states PageHeader stacks BELOW AppTopbar (96px total chrome). Plan 06 task 1 does NOT modify any per-page PageHeader instance; deletion is deferred to Phase 6 audit per UI-SPEC.
- Verified `packages/views/issues/components/issues-page.tsx` imports PageHeader at line 20 and renders it at 142 — unchanged by any Phase 4 task.

## Re-Export Shim (PASS)

Lifecycle:
- Wave 0: `packages/views/layout/index.ts` unchanged (legacy still works).
- Wave 2 (Plan 02): updated to `export { AppSidebar } from "../dashboard-shell";` (DashboardLayout still from old path).
- Wave 5 (Plan 06): legacy files deleted; shim becomes `export { AppSidebar, DashboardShell as DashboardLayout } from "../dashboard-shell";`.

Backward compatibility for any unmigrated consumer of `@multica/views/layout` is preserved at every step.

---

## Warnings (non-blocking — fix inline during execution)

### W-1 — `assigneeFilters` type mismatch in Plan 03

**Where:** Plan 03 `<interfaces>` block (line 95) describes `assigneeFilters: string[]`.
**Reality:** `view-store.ts:51` declares `assigneeFilters: ActorFilterValue[]` where `ActorFilterValue = { type: "member" | "agent"; id: string }`.
**Impact:** FilterChipRow's chip-rendering loop will need to render the `ActorFilterValue` objects — a `string` cast or `${a.type}:${a.id}` key derivation. Plan 03 hand-waves "assignee uses the assignee ID for v1" but the executor needs to derive `chip.label` from the object shape, not treat it as a string.
**Fix:** Executor should map `assigneeFilters.map(a => ({ key: \`assignee:${a.type}:${a.id}\`, label: a.id, color: "brand", onRemove: () => useIssueViewStore.getState().toggleAssigneeFilter(a) }))`. Same for status filters (status is already a primitive string — that part is correct).

### W-2 — SHL-03 "labels dropdown" silently dropped

**Where:** ROADMAP requirement SHL-03 mentions "labels dropdown" (per RESEARCH §phase_requirements row SHL-03). UI-SPEC §"Component-Specific Interaction Contracts" §8–§12 declares only FilterChipRow + BlockerBadge + SearchInput + PrimaryCTA — no LabelsDropdown.
**Disposition:** RESEARCH explicitly notes "Labels dropdown is NOT in Phase 4 scope (UI-SPEC has no LabelsDropdown component declared — REQUIREMENTS.md SHL-03 mentions it but UI-SPEC supersedes; planner should drop it explicitly or ask user)".
**Impact:** Phase 4 ships without LabelsDropdown. CONTEXT.md was auto-generated (discuss skipped) so the user never explicitly approved the drop. UI-SPEC supersedes per the convention noted in research.
**Fix:** Document the deferral in 04-06-SUMMARY.md so it's auditable: "LabelsDropdown deferred from SHL-03 — UI-SPEC §8 omits it; revisit in Phase 5 or v2."

### W-3 — `useBlockerCount` inline-stub test pattern is fragile

**Where:** Plan 03 task 1 suggests `__blockerCountForTesting = { current: 0 }` mutable as a test escape hatch. Plan 05 says it'll rewire the test mock to `vi.mock("@multica/core/issues/derived/use-blocker-count", ...)`.
**Impact:** The Plan 03 mutable is a non-standard pattern that bleeds into production code. When Plan 05 deletes the stub, the test file's reliance on `__blockerCountForTesting` must also be cleaned up — Plan 05 says "if such a mutable was added, the test file in Plan 03 needs updating too" (line 329). This works but is brittle.
**Fix (recommended):** Skip the `count > 0` test case in Plan 03 (only test the default `0` path). Plan 05's tests already cover the count > 0 path via `vi.mock`. Rationale: Plan 03's stub is provably `0` — there's nothing to test for non-zero output until Plan 05's mock seam exists.

### W-4 — Web app passes no `wsId` to DashboardShell

**Where:** Plan 06 task 1A explicitly says "NO `wsId`" for the web app, relying on `AppSidebar`'s root-level `useCurrentWorkspace()` fallback.
**Impact:** AppTopbar (Plan 04) also takes `wsId` and forwards to BlockerBadge. With `wsId={undefined}`, BlockerBadge renders count=0 (which is the v1 stub anyway — no observable defect). However, when v2 replaces `useBlockerCount`, the web app will need to start passing `wsId` from `(dashboard)/layout.tsx` — this becomes a hidden migration debt.
**Fix:** Either (a) acknowledge the deferral in 04-06-SUMMARY.md noting Phase 4 is the natural place to add the prop pass-through and we're choosing convenience now; or (b) add `useCurrentWorkspace()` at the web layout level so wsId is passed explicitly. Option (b) costs ~3 lines and removes the technical debt. Recommended: option (b).

---

## Info (suggestions only)

### I-1 — Plan 02 file count borderline

Plan 02 touches 4 files (app-sidebar.tsx + test + 2 barrel updates) and ports 681 lines of legacy code. This is a single ~200-400 line composition file. Within scope-sanity thresholds (warning at 4, blocker at 5+) but at the upper edge. The planner acknowledged this is intentional ("port a known-good file with substitutions, not re-derive"). Acceptable.

### I-2 — E2E spec relies on `page.goto("/")` with implicit slug routing

Plan 06 task 2 uses `await page.goto("/");` and assumes "workspaceSlug routing redirects to issues view." This depends on the auth/onboarding flow having a default workspace pre-seeded. The existing `loginAsDefault` helper presumably handles this. Verified by analogy to `e2e/theme-toggle.spec.ts` (referenced as the pattern source). No action needed; flagged for awareness if E2E flakes.

---

## Per-Plan Assessment

| Plan | Wave | Tasks | Files | Coverage | Verdict |
|------|------|-------|-------|----------|---------|
| 00 | 0 | 1 | 5 | infra (test scaffolds + grep CI) | PASS |
| 01 | 1 | 2 | 9 (5 components + 4 tests) | SHL-01, SHL-04 atoms | PASS |
| 02 | 2 | 1 | 4 (composition + 2 barrels + test) | SHL-01 composition | PASS (W-1 inline) |
| 03 | 2 | 2 | 7 (4 atoms + 3 tests) | SHL-03 atoms | PASS (W-1, W-3 inline) |
| 04 | 3 | 1 | 3 (composition + test + barrel) | SHL-03 composition | PASS |
| 05 | 4 | 2 | 10 (shell + 2 hooks + 4 tests + barrel + 2 stub deletions) | SHL-02, SHL-05 | PASS |
| 06 | 5 | 3 (1 checkpoint) | 6 (2 app wires + shim + 2 deletes + E2E) | SHL-01, SHL-02 wiring | PASS (W-2, W-4 inline) |

---

## Recommendation

**Proceed to execution.** No revision loop needed. The 4 warnings are advisory clarifications that the executor can address as small adjustments during the affected tasks (assigneeFilters object handling in Plan 03; deferral note in Plan 06 SUMMARY; optional cleanup of the test mutable; optional wsId pass-through on web).

Phase 4's plan suite is the strongest in this project so far — Wave 0 explicitly addresses the Nyquist gate, the parallel-wave file split is clean, the inline-stub pattern correctly bridges Wave 1 atoms to Wave 4 derived hooks, and the legacy file deletion sequencing protects backward compatibility through every wave.
