---
gsd_state_version: 1.0
milestone: v0.4.0
milestone_name: milestone
status: executing
stopped_at: Completed 07-05-PLAN.md (Plan 07-05 + Phase 7 close-out)
last_updated: "2026-04-26T23:04:48.325Z"
last_activity: 2026-04-26 -- Phase 08 execution started
progress:
  total_phases: 9
  completed_phases: 8
  total_plans: 57
  completed_plans: 48
  percent: 84
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-04-23)

**Core value:** Both apps (`apps/web` + `apps/desktop`) consistently carry the new AlgoPlan identity — every existing user-facing view is implemented in the new design system
**Current focus:** Phase 08 — internal-rebrand-completion

## Current Position

Phase: 08 (internal-rebrand-completion) — EXECUTING
Plan: 1 of 10
Status: Executing Phase 08
Last activity: 2026-04-26 -- Phase 08 execution started

Progress: [██████████] 100%

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
| Phase 06 P07 | 70min | 3 tasks | 11 files |
| Phase 07 P00 | 8min | 3 tasks | 16 files |
| Phase 07 P02 | 13min | 2 tasks | 21 files |
| Phase 07 P03 | 8min | 3 tasks | 13 files |
| Phase 07 P04 | 6min | 3 tasks | 12 files (atomic single-commit per D-1; 2 created, 10 modified) |
| Phase 07 P05 | 7min | 4 tasks | 8 files |

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
- Phase 6 Plan 07: Web auth routes live at apps/web/app/auth/ (NOT route group) so URLs match FROZEN /auth/{verb}?token= email-link contract; Rule 1 deviation fix relocated 5 NEW routes from /(auth)/ group
- Phase 6 Plan 07: DesktopAuthShell wrapper centralizes DragStrip mounting for ALL 5 auth WindowOverlay branches (one shell, five render branches) so DragStrip-first invariant lives in a single source
- Phase 6 Plan 07: Navigation adapter checks /auth/verify-email-resend BEFORE /auth/verify-email (longer prefix wins, mitigates UI-SPEC §T-06-W4-AUTH-04 swallowing)
- Phase 7 Plan 00: USER-DEC-1 brand asset pipeline = SVG seed (#008757) + sharp + png-to-ico + png2icons; deterministic SHA256-stable 10-target generation
- Phase 7 Plan 00: USER-DEC-2 production URL = plan.algoview.com (NOT algoplan.ai); Plans 07-02/07-03 use this for metadataBase, robots, sitemap, package.json homepage, help-launcher
- Phase 7 Plan 00: 07-PATTERNS.md is single-source-of-truth contract for Plans 01-05 — exclusion regex EXCLUDE in grep-rebrand.sh + §2 must be co-edited; asset matrix in generate-brand-assets.mjs TARGETS + §3 must be co-edited with regenerated binaries
- Plan 07-02: USER-DEC-2 applied — production URL plan.algoview.com (NOT algoplan.ai) used for metadataBase + robots + sitemap + JSON-LD
- Plan 07-02: en.ts ↔ zh.ts AlgoPlan parity = 23 each (verified post-sweep)
- Plan 07-02: 14 multica:// + deep-link UI strings in apps/web preserved for Plan 07-04 atomic flip
- 07-03: PROTOCOL='algoplan' constant in main/index.ts shipped here (with electron-builder.yml protocols.schemes); apps/web auth callback strings owned by 07-04 atomic flip
- 07-03: artifactName template multica-desktop-* PRESERVED in electron-builder.yml — Homebrew tap + electron-updater binary URLs depend on this filename pattern
- 07-03: extended scripts/grep-rebrand.sh EXCLUDE regex with 5 documented preserved patterns (CLI binary basenames, ~/.multica config dir, bin/multica path, multica-cli- archive, multica_<os>_<arch> legacy archive); 07-PATTERNS §2 updated in lock-step
- 07-04: ATOMIC FLIP (single commit ce5dc285) — multica:// → algoplan:// across web callback + login emit sites AND desktop main handler. Per D-1 atomicity (cross-process protocol contract); standard per-task commits and TDD two-commit cadence overridden. Production-user reinstall warning logged for v0.4.0 release notes
- 07-04: handleDeepLink extracted from index.ts inline closure to apps/desktop/src/main/deep-link.ts (pure function, SendFn injected); PROTOCOL_NAME = "algoplan" is now SINGLE source of truth. 8/8 GREEN regression-lock test (deep-link.test.ts) explicitly asserts multica:// is REJECTED
- 07-04: scripts/grep-rebrand.sh extended with deep-link.test.ts whole-file exclusion (every "multica" hit there is intentional negative-case fixture); 07-PATTERNS.md §2 updated in lock-step per maintenance protocol
- Phase 7 complete: Multica → AlgoPlan rebrand across web + desktop + shared packages; 247→0 user-visible leaks; atomic deep-link flip; PWA manifest; localStorage regression locks (D-2 safety net); ship gate 5/6 PASS (Check 3 caveat = pre-existing Phase 6 carry-over)

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

Last session: 2026-04-26T14:10:44.956Z
Stopped at: Completed 07-05-PLAN.md (Plan 07-05 + Phase 7 close-out)
Resume file: None

**Planned Phase:** 01 (token-foundation-typography) — 6 plans — 2026-04-24T23:07:23.601Z
