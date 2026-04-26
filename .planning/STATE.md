---
gsd_state_version: 1.0
milestone: v0.4.0
milestone_name: milestone
status: completed
stopped_at: Completed 06-05-PLAN.md
last_updated: "2026-04-26T10:23:23.798Z"
last_activity: 2026-04-26
progress:
  total_phases: 8
  completed_phases: 6
  total_plans: 41
  completed_plans: 39
  percent: 95
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-04-23)

**Core value:** Both apps (`apps/web` + `apps/desktop`) consistently carry the new AlgoPlan identity — every existing user-facing view is implemented in the new design system
**Current focus:** Phase --phase — 02

## Current Position

Phase: 6
Plan: 00 (complete — Wave-0 atoms + dragstrip-coverage gate + zxcvbn catalog); ready for Wave-1 (06-01..06-04)
Status: Phase 6 Wave-0 complete; Wave-1 unblocked
Last activity: 2026-04-26

Progress: [██████████] 95%

## Performance Metrics

**Velocity:**

- Total plans completed: 17
- Average duration: -
- Total execution time: 0 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 01 | 6 | - | - |
| 02 | 6 | - | - |
| 03 | 4 | - | - |
| 04 P00 | 1 | 2m | 2m |
| 04 P01 | 1 | ~5m | ~5m |

**Recent Trend:**

- Last 5 plans: -
- Trend: -

*Updated after each plan completion*
| Phase 5 P00 | 289 | 4 tasks | 9 files |
| Phase 5 P05 | 584 | 6 tasks | 5 created, 2 modified (4 new E2E specs + selector update + fixture helpers) |
| Phase 05.1 P02 | 6min | 3 tasks | 4 files |
| Phase 05.1 P03 | 5min | 3 tasks | 3 files |
| Phase 06 P00 | 13 | 3 tasks | 13 files |
| Phase 06 P02 | 9m | 3 tasks | 11 files |
| Phase 06 P04 | 14m | 2 tasks | 9 files |
| Phase 06 P01 | 12m | 3 tasks | 9 files |
| Phase 06 P05 | 15m | 3 tasks | 10 files |
| Phase 06 P03 | 16m | 3 tasks | 17 files |
| Phase 06 P05 | 15m | 3 tasks | 10 files |

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- Roadmap: 7-phase structure derived from strict dependency order (tokens → primitives → showroom → shell → kanban → remaining views → rebrand)
- Phase 5: Two-commit split recommended within Kanban phase (API migration first, then restyle) to isolate dnd-kit bugs from visual regressions
- Phase 7: `multica://` → `algoplan://` scheme change is app-facing; must update atomically in both locations. `multica_*` localStorage keys intentionally unchanged (would cause silent data loss)
- Research: Phase 5 requires phase-specific `@dnd-kit/react` v0.4.0 migration research before implementation starts
- Phase 4 Plan 00: IssuePriority enum verified as descriptive ('urgent' | 'high' | 'medium' | 'low' | 'none'); priority mapping urgent->P0, high->P1, medium->P2, low->P3, none->excluded baked into Plan 05 test scaffolds
- Phase 4 Plan 01: Five sidebar atoms shipped with 29 vitest assertions; PriorityGrid carries a delimited PHASE-4-INLINE-STUB for useIssueCountByPriority that Plan 05 must replace with the real hook from @multica/core/issues/derived/use-issue-count-by-priority
- Phase 4 Plan 01: Pre-existing typecheck error in packages/ui/components/ui/calendar.tsx:141 (duplicate @types/react drift) logged in deferred-items.md; out-of-scope per SCOPE BOUNDARY
- Phase 5 Wave 0: pinned @dnd-kit/{abstract,dom,helpers,react}@0.4.0 in catalog (no caret); removed legacy @dnd-kit/{core,sortable,utilities} from apps/web + apps/desktop (transitive via @multica/views, .npmrc shamefully-hoist=true); KEPT @dnd-kit/modifiers in apps/desktop (only consumer); priorityToAccentColor helper landed in packages/views/issues/utils/ (lifted from Plan 02 per B-1).
- Phase 5 Wave 4: 4 neue Playwright-Specs (board-inline-add KBN-03, issues-view-toggle KBN-04, board-scroll-collision KBN-02, board-drag-ws-race KBN-01) + 1 selector-update (issues.spec.ts text=List → getByRole('group',{name:'Ansicht wechseln'}).getByText('Liste')). TestApiClient erweitert um trackIssue + updateIssue (Rule 3 deviation). Live E2E in dieser Worktree-Env nicht ausführbar (auch dashboard-shell.spec.ts schlägt mit demselben loginAsDefault timeout fehl — env-issue, nicht Plan-05-Regression). Specs verifiziert via tsc + Playwright --list; KBN-05 grep clean; vitest issues/ 102/102 GREEN.
- Plan 02 (email-verify): Used pgtype.Text wrap for the SHA-256 hash arg to GetUserByEmailVerifyTokenHash — sqlc codegen always uses pgtype.Text for nullable columns regardless of caller intent. Same pattern as Plan 01 CreateUserWithPassword call site.
- Plan 02 (email-verify): Established 'idempotent OK shape' idiom — same 200 body for unknown-email / already-verified / fresh-issuance paths. Defeats enumeration via response inspection. Plan 03 will reuse for POST /auth/password-reset/request.
- Plan 02 (email-verify): Established 'deterministic rate-limit reconstruction from server-stamped expiry' idiom — derive issuedAt from expires_at minus the known 24h issuance window instead of trusting time.Until against a far-future expiry. Robust to clock skew at the cooldown boundary (W5 fix). Plan 03 will reuse for password_reset_expires_at with 1h window.
- Phase 5.1 P03: Idempotent password-reset request (no enumeration), atomic single-SQL password+token rotation, intentional no-auto-login on confirm
- Phase 6 Wave-0: Shipped 5 atoms + useNavigationFlash + automated dragstrip-coverage gate + @zxcvbn-ts/* catalog. Resolved UI-CHECK FLAG-5.1 (lazy import gate) and FLAG-5.3 (DragStrip audit promoted to test). language-en pinned at ^3.0.2 (registry latest in v3.x).
- useInboxFilterStore lives in packages/core/inbox/ per CLAUDE.md state-management — no persist (ephemeral filter)
- InboxTypeFilter collapses 14 InboxItemType enum values into 4 user-facing chip categories (Erwähnungen/Zuweisungen/Kommentare/System)
- Phase 6 Plan 04: Workspace switcher dropdown lives inline in app-sidebar.tsx — no separate workspace-switcher.tsx file exists. WS-05 verification is a no-op on main checkout (workspace-tab.test.tsx is Plan-03-owned).
- Phase 6 Plan 01: extended Phase 2 SegmentedControl with colorByValue?: Record<string,string> via module-private React Context (rejected per-item className override that duplicates mapping). IssuePrioritySegmentedControl maps urgent->P0, high->P1, medium->P2, low->P3, none->excluded with separate 'Priorität entfernen' affordance. Modal-footer hidden on mobile; Delete stays in More-actions dropdown on mobile only — desktop sees Löschen exclusively in modal-footer band. Modal-mode signal via optional onClose?: () => void prop on IssueDetail (no new context, no new store).
- Phase 6 P05: Sub-mode toggle as boolean state alongside existing step machine (preserves OTP test paths); LoginPage logo prop kept as optional override of new AlgoPlanWordmark default; idempotent endpoints render success on network errors (no enumeration oracle); resetPassword body uses snake_case new_password per FROZEN Phase 5.1 contract
- Phase 6 Plan 03: Made Settings Tabs controlled (value/onValueChange) so the [Gefahrenzone] quick-jump can swap+scroll in one click via requestAnimationFrame; Tabs were uncontrolled (defaultValue) before
- Phase 6 Plan 03: Added smoke tests for Account/Members/Repositories/Tokens tabs (planner left at planner discretion) — small cost, high regression value for the new German + SettingsSection contract
- Plan 06-05: Sub-mode is useState boolean alongside step machine, not a third step (preserves OTP test path; one form id stays stable for autofill)
- Plan 06-05: Idempotent endpoints (resend/forgot-password) silently swallow network errors and render success — backend always-200 contract; visible failure would leak enumeration oracle
- Plan 06-05: api.resetPassword body uses snake_case new_password (not newPassword) — matches FROZEN Phase 5.1 Go backend contract; typed in TS to enforce at compile time

### Pending Todos

None yet.

### Blockers/Concerns

- Phase 5 pre-implementation: Verify `@dnd-kit/react` v0.4.0 cross-column `group` pattern and optimistic mutation edge cases before writing any code
- Phase 7 pre-ship: Confirm whether production users have Electron app installed — if yes, add `multica://` scheme change to release communications

## Deferred Items

Items acknowledged and carried forward from previous milestone close:

| Category | Item | Status | Deferred At |
|----------|------|--------|-------------|
| Open question | dnd-kit: unified diff vs separate commits in Phase 5 | Recommendation: two commits (API migrate, then restyle) | Roadmap creation |
| Open question | Kanban column virtualization decision gate | Decision: run perf test with 50+ mock cards in Phase 5; go/no-go within phase | Roadmap creation |
| Open question | Password strength meter library (`@zxcvbn-ts/core`) | Decision needed before Phase 6; add catalog entry at Phase 5→6 transition | Roadmap creation |
| Partial closure | `Source_Serif_4` removal | PARTIAL: italic axis removed from desktop (Phase 1 Plan 02 Task 2.2). Base import + `--font-serif` token KEPT — onboarding (`packages/views/onboarding/**`) consumes `font-serif` (14 lines / 7 files). Full removal deferred to onboarding-redesign phase. | Roadmap creation; partial closure 2026-04-25 (Phase 1 planner Q4 deviation from D-12) |

## Session Continuity

Last session: 2026-04-26T10:23:12.738Z
Stopped at: Completed 06-05-PLAN.md
Resume file: None

**Planned Phase:** 01 (token-foundation-typography) — 6 plans — 2026-04-24T23:07:23.601Z
