# Roadmap: AlgoPlan Frontend Redesign & Rebrand

## Overview

The existing Multica platform is reskinned and rebranded as AlgoPlan in seven sequenced phases. Each phase builds on the last: design tokens first, then the atomic components that consume them, then the showroom that lets each subsequent phase be reviewed in isolation, then the dashboard shell, then the headline Kanban feature, then all remaining views, and finally a dedicated rebrand string-and-asset pass. Every phase delivers a verifiable capability; nothing is speculative. Code internals (`@multica/*`, DB, CLI) remain unchanged throughout.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 1: Token Foundation + Typography** - New OKLCH palette, Inter italic, dark-mode FOUC fix, hardcoded-color CI rule
- [x] **Phase 2: Atomic UI Primitives** - TagChip, AccentBar, AvatarInitial, SegmentedControl with tests
- [x] **Phase 3: Storybook Showroom** - `apps/showroom` Storybook 9.1.5 with mock providers, a11y, theme toggle
- [x] **Phase 4: Dashboard Shell Redesign** - New sidebar, topbar, layout slot system, Zustand selector guard
- [x] **Phase 5: Issues Views + Kanban + dnd-kit Migration** - `@dnd-kit/react` v0.4.0 migration, board restyle, list restyle, view toggle, inline task-add, WS race fix
- [x] **Phase 5.1: Auth Backend Endpoints** (INSERTED) - Signup, password-reset request/confirm, email-verify, resend verification — backend Go endpoints + DB schema for AUTH-02..05 unblock
- [x] **Phase 6: Issue Detail + Remaining Views** - Issue detail, auth flows, inbox, settings, agents, workspace, error states
- [x] **Phase 7: Rebrand Pass** - Strings, assets, metadata, deep-link scheme, Electron chrome, test updates
- [ ] **Phase 8: Internal Rebrand Completion** - `@multica/*` packages, `multica_*` localStorage, `MULTICA_*` env vars, `multica` CLI binary, `~/.multica/` config dir, Docker images, GoReleaser, Homebrew tap, default email FROM — with backwards-compat migration shims

## Phase Details

### Phase 1: Token Foundation + Typography
**Goal**: Both apps render every surface in the new AlgoPlan OKLCH palette with Inter (including italic) and dark mode works correctly from the first paint — no flash, no hardcoded color escapes
**Depends on**: Nothing (first phase)
**Requirements**: FND-01, FND-02, FND-03
**Success Criteria** (what must be TRUE):
  1. Toggling `.dark` on `<html>` in DevTools flips every redesigned surface correctly — no invisible text, no wrong backgrounds — on both web and desktop
  2. Electron desktop starts in dark mode with no visible light flash (pre-React inline script sets `.dark` before React mounts)
  3. Display headlines in the web app render in Inter italic (Network tab shows the italic woff2 loaded, no serif fallback)
  4. Running `bash scripts/grep-hardcoded-colors.sh` returns zero results — one-shot post-Phase-1 manual verification (no CI rule per CONTEXT D-19; future regressions are caught at PR review only)
**Plans**: 6 plans

Plans:
- [x] 01-00-PLAN.md — Wave 0 test scaffolds + manual FOUC recipe + grep verification helper (Nyquist gate)
- [x] 01-01-PLAN.md — Replace tokens.css :root + .dark with Algorivo OKLCH palette; add --tag-p0..p3, --highlight tokens
- [x] 01-02-PLAN.md — Inter italic axis on web + desktop; remove Source_Serif_4 italic axis from desktop (partial D-12)
- [x] 01-03-PLAN.md — storageKey=multica_theme on shared ThemeProvider; desktop FOUC inline script; @multica/core/theme barrel
- [x] 01-04-PLAN.md — Migrate 22 hardcoded Tailwind color violations across 8 files in packages/views to semantic tokens
- [x] 01-05-PLAN.md — Documentation updates: drop FND-04 to Out of Scope (D-19); update PROJECT.md to Algorivo direction; STATE.md Source_Serif_4 partial closure

### Phase 2: Atomic UI Primitives
**Goal**: The four new atomic components (`TagChip`, `AccentBar`, `AvatarInitial`, `SegmentedControl`) exist in `packages/ui/components/ui/`, are keyboard-accessible, and pass Vitest tests in both light and dark mode — ready for any view phase to import
**Depends on**: Phase 1
**Requirements**: UI-01, UI-02, UI-03, UI-04
**Success Criteria** (what must be TRUE):
  1. A developer can render `<TagChip color="tag-p0" />` and see the correct priority red in both light and dark mode without touching any hex value
  2. `<SegmentedControl>` responds to arrow keys and Tab — keyboard navigation moves selection without mouse (WCAG keyboard accessible)
  3. `<AvatarInitial name="Stephan" />` deterministically produces the same color for the same name across renders (no randomness)
  4. Vitest tests for all four components pass with zero failures; components are imported from `packages/ui` with zero `next/*` or `react-router-dom` dependencies
**Plans**: 6 plans
**UI hint**: yes

Plans:
- [x] 02-00-PLAN.md — Wave 0: Vitest + jsdom + Testing Library infrastructure for packages/ui (config, setup, devDeps via catalog)
- [x] 02-01-PLAN.md — Wave 1: Pure avatar-color utility (djb2 hash + extractInitials + AVATAR_PALETTE) — TDD with regression-locked fixture
- [x] 02-02-PLAN.md — Wave 2: TagChip atom (cva + useRender polymorphism + optional X-to-remove, 5 colors locked to Phase 1 tokens)
- [x] 02-03-PLAN.md — Wave 2: AccentBar atom (decorative role=presentation bar, 1–4 segments, 6 colors)
- [x] 02-04-PLAN.md — Wave 2: AvatarInitial atom (deterministic color from name, 3 sizes, consumes Plan 01 utility)
- [x] 02-05-PLAN.md — Wave 2: SegmentedControl atom (single-select adapter over Base UI ToggleGroup with keyboard navigation)

### Phase 3: Storybook Showroom
**Goal**: `apps/showroom` is a running Storybook 9 instance that renders stories for all Phase 2 atoms with live theme toggle and WCAG panel — providing a visual review sandbox before any app-level view work begins
**Depends on**: Phase 2
**Requirements**: SB-01, SB-02, SB-03, SB-04
**Success Criteria** (what must be TRUE):
  1. Running `pnpm --filter @multica/showroom storybook` starts Storybook with zero console errors about missing environment variables or API client initialization
  2. Clicking the theme toggle in Storybook switches all stories between light and dark mode correctly — `bg-sidebar` renders deep-forest-green in dark mode, not transparent
  3. The a11y panel shows zero critical WCAG violations on all four Phase 2 atom stories
  4. Stories import real component source from `packages/ui/` — no mocked component implementations, only mocked providers
**Plans**: TBD
**UI hint**: yes

### Phase 4: Dashboard Shell Redesign
**Goal**: The dashboard layout wraps every workspace page in the new AlgoPlan chrome — new sidebar (wordmark, priority grid, collapse, dark-mode toggle, notifications badge) and topbar (filter chips, search, primary CTA) — with the slot system that lets desktop inject DragStrip without duplicating layout code
**Depends on**: Phase 3
**Requirements**: SHL-01, SHL-02, SHL-03, SHL-04, SHL-05
**Success Criteria** (what must be TRUE):
  1. The sidebar renders the AlgoPlan wordmark, collapses and expands via toggle, and the dark-mode toggle persists the preference across page loads on both apps
  2. Desktop app injects `<DragStrip />` via `topSlot` prop — macOS users can drag the window by the top edge of the dashboard; web app leaves `topSlot` empty with no visual gap
  3. Every new Zustand selector in sidebar and topbar components passes a stability assertion test (same input → same reference) — no infinite re-render cascade
  4. Sidebar hooks that run before WorkspaceIdProvider accept `wsId` as a parameter — no `useWorkspaceId()` call inside sidebar code that could throw on pre-workspace routes
**Plans**: TBD
**UI hint**: yes

### Phase 5: Issues Views + Kanban + dnd-kit Migration
**Goal**: The issues page delivers a fully restyled list view and a new Kanban board view, both switchable via persistent toggle, with drag-and-drop powered by `@dnd-kit/react` v0.4.0 — the legacy `@dnd-kit/core` packages are removed and the board is immune to WS race conditions and scroll collision
**Depends on**: Phase 4
**Requirements**: KBN-01, KBN-02, KBN-03, KBN-04, KBN-05, KBN-06, KBN-07
**Success Criteria** (what must be TRUE):
  1. Dragging a card between Kanban columns updates the issue status — the card settles in the new column without flickering back (WS event from a second browser tab does not interrupt the drop)
  2. Dragging a card in a scrolled column drops into the visually indicated position — the drop target does not drift from scroll offset
  3. Clicking "Task hinzufügen" in any column opens an inline input; submitting creates the issue with that column's status pre-filled
  4. The Board/List view toggle persists across page reloads; switching is instant with no full re-mount
  5. All existing board-view tests pass after the `@dnd-kit/react` migration with the `onMoveIssue` signature unchanged

**Phase annotation**: Phase 5 requires phase-specific research on `@dnd-kit/react` v0.4.0 migration before implementation. The cross-column `group` pattern and optimistic mutation handling under the new event system have potential undocumented edge cases. Recommended commit split within phase: (1) API migration with existing tests passing, (2) visual restyle, (3) inline task add and WS/scroll fixes.
**Plans**: 6 plans
**UI hint**: yes

Plans:
- [x] 05-00-PLAN.md — Wave 0 catalog @dnd-kit/react@0.4.0 + RED test scaffolds (Nyquist gate)
- [x] 05-01-PLAN.md — Wave 1 dnd-kit API migration (board-view + board-column + board-card + test mocks; KBN-06)
- [x] 05-02-PLAN.md — Wave 2 board visual restyle (priority-color helper + AccentBar + italic header + ring-brand drop; KBN-07)
- [x] 05-03-PLAN.md — Wave 2 list visual restyle (sticky h-12 italic headers + vertical AccentBar leading edges; KBN-07)
- [x] 05-04-PLAN.md — Wave 3 ViewToggle + InlineTaskAdd + header/page wiring (KBN-03 + KBN-04)
- [x] 05-05-PLAN.md — Wave 4 E2E specs (KBN-01 WS race, KBN-02 scroll, KBN-03 inline, KBN-04 toggle persistence)

### Phase 5.1: Auth Backend Endpoints (INSERTED)
**Goal**: Add password-based auth backend endpoints (signup, login, password-reset request/confirm, email-verify, resend verification) so Phase 6 can build the AUTH-02..05 frontend pages — current `server/internal/handler/auth.go` is OTP-only with no password column or reset-token machinery
**Depends on**: Phase 5 (no shared frontend; pure backend insertion)
**Requirements**: AUTH-BE-01 (signup), AUTH-BE-02 (password-reset request), AUTH-BE-03 (password-reset confirm), AUTH-BE-04 (email-verify), AUTH-BE-05 (resend verification), AUTH-BE-06 (login — added per security review Open Q §6)
**Success Criteria** (what must be TRUE):
  1. `POST /auth/signup` accepts `{email, password, name}`, hashes password (bcrypt cost 12), inserts user + sends verify email, returns session token + sets cookies
  2. `POST /auth/password-reset/request` accepts `{email}`, generates time-bound reset token, sends reset email (idempotent — same response for unknown emails)
  3. `POST /auth/password-reset/confirm` accepts `{token, newPassword}`, validates token, updates password hash, invalidates token, does NOT auto-login
  4. `POST /auth/email-verify` accepts `{token}`, marks user `email_verified_at`, invalidates token
  5. `POST /auth/email-verify/resend` accepts `{email}`, generates new verify token, sends email (rate-limited)
  6. DB migration 059 adds `password_hash`, `email_verified_at`, `password_reset_token_hash`, `password_reset_expires_at`, `email_verify_token_hash`, `email_verify_expires_at` columns to `user` table
  7. All endpoints have integration tests (`server/internal/handler/auth_password_test.go`, `auth_email_verify_test.go`); existing OTP login flow remains functional
  8. `POST /auth/login` accepts `{email, password}`, bcrypt-compares against `password_hash`, returns 200+JWT+cookies on success or constant 401 on failure (added per security review)
**Plans**: 4 plans
**UI hint**: no (backend-only)

Plans:
- [x] 05.1-00-PLAN.md — Wave 0: migration 059 + sqlc regen + bcrypt dep + auth.GenerateAuthToken + EmailService stubs + 6 router stubs + RED test scaffolds (Nyquist gate)
- [x] 05.1-01-PLAN.md — Wave 1: Signup (AUTH-BE-01) + Login (AUTH-BE-06 NEW) + SendSignupVerification — auth_password.go (Signup half) + email.go
- [x] 05.1-02-PLAN.md — Wave 1 (parallel-safe with 01): EmailVerify (AUTH-BE-04) + ResendEmailVerify (AUTH-BE-05) + SendEmailVerification — auth_email_verify.go (own file) + email.go (different methods)
- [x] 05.1-03-PLAN.md — Wave 2 (after 01): PasswordResetRequest (AUTH-BE-02) + PasswordResetConfirm (AUTH-BE-03) + SendPasswordResetEmail — auth_password.go (sequential with 01) + email.go

### Phase 6: Issue Detail + Remaining Views
**Goal**: Every user-facing view outside the shell and issues list — issue detail modal, auth flows, inbox, settings, agents, workspace management, and error states — is fully restyled in the AlgoPlan design system with DragStrip on all desktop full-window views
**Depends on**: Phase 5
**Requirements**: DTL-01, DTL-02, DTL-04, AUTH-01, AUTH-02, AUTH-03, AUTH-04, AUTH-05, AUTH-06, INB-01, INB-02, INB-03, SET-01, SET-02, SET-03, WS-01, WS-02, WS-03, WS-04, WS-05
**Success Criteria** (what must be TRUE):
  1. The issue detail modal opens two-pane: title and comments on the left, status/priority/tags/assignees on the right; priority is a SegmentedControl P0-P3 (not a dropdown)
  2. Login, signup, email-verify, and password-reset pages render with AlgoPlan wordmark and Inter italic title; signup shows a 4-level password strength meter
  3. macOS desktop users can drag the window on every pre-workspace view (login, signup, create-workspace, invite) — `DragStrip` is the first flex child on each
  4. Settings page has a Danger Zone section with typed-name confirmation before Leave/Delete; Dark-mode radio (Light/Dark/System) saves and persists
  5. Inbox shows items grouped by date (Today/Yesterday/This Week/Older) with a mark-all-read button and keyboard shortcut `E`
**Plans**: 8 plans
**UI hint**: yes

Plans:
- [x] 06-00-PLAN.md — Wave 0: shared atoms (AlgoPlanWordmark, PasswordStrengthMeter, SettingsSection, EmptyState, NotFoundPage), useNavigationFlash util, dragstrip-coverage automated gate, @zxcvbn-ts/* catalog entries
- [x] 06-01-PLAN.md — Wave 1 DTL: issue-detail modal restructure (modal-footer, IssuePrioritySegmentedControl, German strings) + extend Phase 2 SegmentedControl with colorByValue
- [ ] 06-02-PLAN.md — Wave 1 INB: date-bucket grouping, Alle-gelesen button + E shortcut (input-focus guard), TagChip type filter (useInboxFilterStore in @multica/core/inbox), AccentBar unread
- [ ] 06-03-PLAN.md — Wave 1 SET: SettingsSection wrappers, German strings, Gefahrenzone quick-jump, dark-mode check-icon overlay (preserves safe-order + typed-name gate verbatim)
- [ ] 06-04-PLAN.md — Wave 1 WS: Agents German + EmptyState + AvatarInitial fallback, NoAccessPage German + AlgoPlanWordmark, workspace-switcher German strings, web 404 route
- [ ] 06-05-PLAN.md — Wave 2 AUTH: 6 new api client methods (signup/login/verifyEmail/resend/requestReset/resetPassword), LoginPage RESTYLE + password sub-mode + constant-401 message, ForgotPasswordPage + ResendVerifyEmailPage (idempotent success + 60s cooldown)
- [ ] 06-06-PLAN.md — Wave 3 AUTH: SignupPage (strength-meter-gated submit + 409 distinct), VerifyEmailPage (one-shot ref-guarded, NOT polling), ResetPasswordPage (NO auto-login, setFlash+push to /auth/login)
- [ ] 06-07-PLAN.md — Wave 4 AUTH: 5 NEW Next.js (auth) routes, 5 NEW WindowOverlay types + render branches + nav translation (verify-email-resend before verify-email), NewWorkspacePage + InvitePage + OnboardingFlow restyle

### Phase 7: Rebrand Pass
**Goal**: Every user-visible "Multica" reference is replaced with "AlgoPlan" — strings, logos, favicons, metadata, Electron chrome, and the `multica://` deep-link scheme — while `multica_*` localStorage keys and `@multica/*` package imports are deliberately left unchanged
**Depends on**: Phase 6
**Requirements**: RBR-01, RBR-02, RBR-03, RBR-04, RBR-05, RBR-06
**Success Criteria** (what must be TRUE):
  1. The targeted grep (excluding `@multica/*` imports and `node_modules`) returns zero "Multica" hits in user-visible string positions across both apps
  2. Browser tab, OG preview, and Electron window title all show "AlgoPlan"; macOS dock shows the new icon; macOS menu bar reads "AlgoPlan"
  3. The web-to-desktop auth callback flow works end-to-end on a built Electron app after the `multica://` → `algoplan://` scheme change — both `electron-builder.yml` and `apps/web/app/auth/callback/page.tsx` updated atomically
  4. After an app update, existing users retain their stored theme preference, view state, and drafts — `multica_*` localStorage keys are confirmed unchanged in a browser session
  5. All tests that previously asserted brand copy now assert "AlgoPlan" — `pnpm test` passes with at least as many tests as before the rebrand phase began

**Phase annotation**: `multica://` deep-link scheme change affects production users who have the Electron app installed — the old scheme will stop working until reinstall. Flag as a release communication item if production users exist. localStorage keys (`multica_*` AND `multica:*` chat-prefix keys) must NOT be renamed; renaming causes silent data loss (user loses dark-mode preference, drafts, view state, chat history).
**Plans**: 6 plans

Plans:
- [ ] 07-00-PLAN.md — Wave 0: grep audit script + SVG seed + brand asset generator + 07-PATTERNS.md replacement table
- [ ] 07-01-PLAN.md — Wave 1: sweep packages/{views,ui,core} user-visible Multica strings (parallel-safe with 07-02)
- [ ] 07-02-PLAN.md — Wave 1: sweep apps/web (root layout metadata + landing EN/ZH + auth/dashboard pages) (parallel-safe with 07-01)
- [ ] 07-03-PLAN.md — Wave 2: sweep apps/desktop strings + electron-builder.yml metadata + main-process PROTOCOL flip + regression-lock test
- [x] 07-04-PLAN.md — Wave 3: atomic multica:// → algoplan:// deep-link flip (web callback + login + extracted desktop deep-link.ts + 8-test contract lock)
- [ ] 07-05-PLAN.md — Wave 4: PWA manifest + asset wiring in layout + localStorage preservation regression-lock + final 6-check verification gate

### Phase 8: Internal Rebrand Completion
**Goal**: Every internal "Multica" reference that Phase 7 deliberately preserved is renamed to AlgoPlan, with backwards-compatible migration shims so no existing user loses state and no self-hoster's `.env` file silently breaks. Covers `@multica/*` package scope, `multica_*` localStorage keys, `MULTICA_*` env vars, `multica` CLI binary + `~/.multica/` config dir, Docker image names, GoReleaser config + Homebrew tap, and default email FROM
**Depends on**: Phase 7
**Requirements**: RBR-07, RBR-08, RBR-09, RBR-10, RBR-11, RBR-12, RBR-13, RBR-14
**Success Criteria** (what must be TRUE):
  1. `pnpm install && pnpm typecheck && pnpm test` all green after `@multica/*` → `@algoplan/*` mass-rename across 9 workspace packages
  2. Existing user with `multica_theme=dark` in localStorage retains dark mode after upgrade — migration test asserts `algoplan_theme=dark` is set and `multica_theme` is removed (idempotent across reloads)
  3. Self-hoster running with `MULTICA_BACKEND_IMAGE=...` in `.env` sees a one-time deprecation warning but the app still resolves the value via the `ALGOPLAN_BACKEND_IMAGE` dual-read shim
  4. CLI user with existing `~/.multica/config.json` runs `algoplan daemon start` and the daemon auto-migrates state to `~/.algoplan/config.json` without losing the workspace_id or token
  5. `git push origin v0.5.0` triggers the Release workflow with all jobs green — Docker images publish to `ghcr.io/${{ github.repository_owner }}/algoplan-{backend,web}` and the Homebrew job is either deferred (recommended) or publishes to a fork-owned tap
  6. Targeted grep across user-visible Go strings, Makefile help, docker-compose env names, and CLI help output returns zero `multica` matches — excludes git history, `.planning/` historical artifacts, and the migration shim files themselves

**Phase annotation**: This phase ships migration shims FIRST (Wave 0) so subsequent renames cascade safely. localStorage migration MUST be idempotent (test for double-boot). Env var dual-read shim is one-release-cycle compatibility — schedule removal for v0.6.0 or v0.7.0. Homebrew publish targets `multica-ai/homebrew-tap` which is read-only for this fork — recommend deferring Homebrew until `algoplan-ai` org exists OR pointing at a `casiusss/homebrew-tap` repo. CLI binary rename should ship a `multica` shim binary that delegates to `algoplan` and prints a deprecation warning, dropped in a later release.
**Plans**: 10 plans

Plans:
- [ ] 08-00-PLAN.md — Wave 0: localStorage migration helper (`packages/core/migrations/localstorage.ts`) — idempotent multica_*/multica:* → algoplan_*/algoplan:* shim with 8+ Vitest cases (D-2, RBR-08)
- [ ] 08-01-PLAN.md — Wave 0 (parallel-safe with 08-00/02): Go env-var dual-read shim (`server/internal/config/env.go`) — config.GetEnv("ALGOPLAN_X") with one-shot deprecation warning per legacy MULTICA_X var (D-3, RBR-09)
- [ ] 08-02-PLAN.md — Wave 0 (parallel-safe with 08-00/01): CLI config-dir migration helper (`server/internal/cli/configdir.go`) — atomic copy ~/.multica/ → ~/.algoplan/ with rename-aside rollback (D-4, RBR-10)
- [ ] 08-03-PLAN.md — Wave 1: @multica/* → @algoplan/* mass rename across 9 workspace packages, source imports, tsconfig extends, turbo filters, CI workflow + grep-rebrand.sh exclusion update (D-1, RBR-07)
- [ ] 08-04-PLAN.md — Wave 2 (after 08-00 + 08-03): wire migrateLocalStorage into CoreProvider boot + flip theme-provider, auth store, chat store, storage-cleanup to algoplan_*/algoplan:* keys + update Plan 07-05 regression-lock tests (D-2, RBR-08)
- [ ] 08-04b-PLAN.md — Wave 2 (after 08-00 + 08-03 + 08-04): workspace-scoped localStorage migration via shared useWorkspaceStorageMigration hook wired from apps/web + apps/desktop workspace route layouts (B-04 fix from plan-checker iter 1; D-2 / RBR-08)
- [ ] 08-05-PLAN.md — Wave 3 (after 08-01): rewrite Go env-var call sites to config.GetEnv("ALGOPLAN_X") + flip docker-compose, Makefile, .env.example, turbo.json env names + end-to-end legacy-fallback test (D-3, RBR-09)
- [ ] 08-06-PLAN.md — Wave 4 (after 08-02 + 08-05): git mv server/cmd/multica/ → server/cmd/algoplan/ + flip ~/.multica/ → ~/.algoplan/ in config.go + wire MigrateConfigDir at bootstrap + multica shim binary + Makefile + help-text sweep (D-4, RBR-10)
- [ ] 08-07-PLAN.md — Wave 5 (after 08-03 + 08-06; CHECKPOINT for D-6 Homebrew decision): GoReleaser project_name + builds + archives → algoplan; release.yml ghcr image NAMES → algoplan-{backend,web}; docker-compose default images → algoplan-*; email FROM → noreply@algoplan.ai; releaseAssetCandidates lookup order algoplan-cli > multica-cli > multica_ (D-5/D-6/D-7, RBR-11/12/13)
- [ ] 08-08-PLAN.md — Wave 6 (after all): scripts/verify-rebrand.sh 6-check ship gate + grep-rebrand.sh Phase 8 exclusion update (migrations/, configdir, env shim, cookies) + 07-PATTERNS.md §2 co-update + USER CHECKPOINT for v0.5.0 tag (D-8, RBR-14)

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4 → 5 → 6 → 7

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Token Foundation + Typography | 0/TBD | Not started | - |
| 2. Atomic UI Primitives | 0/TBD | Not started | - |
| 3. Storybook Showroom | 0/TBD | Not started | - |
| 4. Dashboard Shell Redesign | 2/7 | In progress | - |
| 5. Issues Views + Kanban + dnd-kit Migration | 6/6 | Complete (code-side); awaiting user live-E2E sign-off | 2026-04-25 |
| 5.1. Auth Backend Endpoints (INSERTED) | 4/4 | Complete (27/27 integration tests GREEN) | 2026-04-26 |
| 6. Issue Detail + Remaining Views | 0/TBD | Not started | - |
| 7. Rebrand Pass | 6/6 | Complete (v0.4.0 shipped 2026-04-26) | 2026-04-26 |
| 8. Internal Rebrand Completion | 0/10 | Plans created (planner; revision 1) | - |
