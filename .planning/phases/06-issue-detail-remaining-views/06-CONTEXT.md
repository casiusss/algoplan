# Phase 6: Issue Detail + Remaining Views - Context

**Gathered:** 2026-04-25
**Status:** Ready for UI design contract
**Mode:** Auto-generated (discuss skipped via workflow.skip_discuss)

<domain>
## Phase Boundary

Every user-facing view outside the shell and issues list — issue detail modal, auth flows, inbox, settings, agents, workspace management, and error states — is fully restyled in the AlgoPlan design system with DragStrip on all desktop full-window views.

**Requirements:** DTL-01, DTL-02, DTL-04, AUTH-01, AUTH-02, AUTH-03, AUTH-04, AUTH-05, AUTH-06, INB-01, INB-02, INB-03, SET-01, SET-02, SET-03, WS-01, WS-02, WS-03, WS-04, WS-05

**Note:** DTL-03 (Issue Tag Row) DEFERRED to future "Tags v1" phase per 06-BLOCKED.md — `Issue` type has no `tags` field yet. 20 requirements in scope (was 21).

**Depends on:** Phase 5.1 (Auth Backend Endpoints — provides `/auth/signup`, `/auth/login`, `/auth/email-verify`, `/auth/email-verify/resend`, `/auth/password-reset/request`, `/auth/password-reset/confirm`) + Phase 5 (DashboardShell + atoms + dnd-kit migration complete)

**Backend contract (consumable from Phase 5.1):**
- `POST /auth/signup` — `{email, password (12-72 bytes), name}` → 200 LoginResponse + cookies, 403 if signup gated, 409 on duplicate, 400 on weak password
- `POST /auth/login` — `{email, password}` → 200 + cookies, 401 on any failure (constant message — no enumeration)
- `POST /auth/email-verify` — `{token}` → 200 UserResponse, 401 on reuse/expired/invalid
- `POST /auth/email-verify/resend` — `{email}` → always 200 (idempotent, 60s rate-limited)
- `POST /auth/password-reset/request` — `{email}` → always 200 (idempotent, 1h rate-limited)
- `POST /auth/password-reset/confirm` — `{token, new_password}` → 200 (no auto-login), 401 on bad token, 400 on weak password
- Verify link contract: `{FRONTEND_ORIGIN}/auth/verify-email?token=<token>`
- Reset link contract: `{FRONTEND_ORIGIN}/auth/reset-password?token=<token>`

</domain>

<decisions>
## Implementation Decisions

### Claude's Discretion
All implementation choices are at Claude's discretion. Key constraints from CLAUDE.md:
- Shared business pages/components in `packages/views/`, never `next/*` or `react-router-dom`
- Pre-workspace flows on Desktop are NOT routes — they are `WindowOverlay` state
- Every full-window desktop view (anything outside the dashboard shell) MUST mount `<DragStrip />` from `@multica/views/platform` as the first flex child
- Reuse Phase 2 atoms (TagChip, AccentBar, AvatarInitial, SegmentedControl) wherever possible
- Reuse Phase 4 atoms (DashboardShell, AppSidebar, AppTopbar, etc.)
- Token discipline strict: only Phase 1 OKLCH tokens, no hex/RGB/`dark:*`

### Likely Sub-Phases (planner discretion)
The 21 requirements split into ~6 thematic clusters:
- **DTL** — Issue detail modal (4 reqs)
- **AUTH** — Login, signup, email-verify, password-reset (6 reqs)
- **INB** — Inbox grouping + mark-all-read + keyboard shortcut (3 reqs)
- **SET** — Settings (Danger Zone + dark-mode radio) (3 reqs)
- **WS** — Workspace management (5 reqs)
- DragStrip on every pre-workspace desktop view (cross-cutting)

</decisions>

<code_context>
## Existing Code Insights

Codebase context will be gathered during plan-phase research. Likely touch points:
- `packages/views/issues/components/issue-detail/` — existing detail modal
- `packages/views/auth/` — login/signup/email-verify/password-reset pages
- `packages/views/inbox/` — inbox view
- `packages/views/settings/` — settings panel
- `packages/views/workspace/` — workspace pages (new, accept invite, etc.)
- `apps/web/app/(auth)/...` — Next.js routes for pre-workspace flows
- `apps/desktop/src/renderer/src/components/window-overlay.tsx` — overlay registry for pre-workspace flows
- `packages/ui/components/ui/segmented-control.tsx` — Phase 2 atom (priority P0..P3 selector)

</code_context>

<specifics>
## Specific Ideas

Success criteria from ROADMAP:

1. The issue detail modal opens two-pane: title and comments on the left, status/priority/tags/assignees on the right; priority is a SegmentedControl P0-P3 (not a dropdown)
2. Login, signup, email-verify, and password-reset pages render with AlgoPlan wordmark and Inter italic title; signup shows a 4-level password strength meter
3. macOS desktop users can drag the window on every pre-workspace view (login, signup, create-workspace, invite) — `DragStrip` is the first flex child on each
4. Settings page has a Danger Zone section with typed-name confirmation before Leave/Delete; Dark-mode radio (Light/Dark/System) saves and persists
5. Inbox shows items grouped by date (Today/Yesterday/This Week/Older) with a mark-all-read button and keyboard shortcut `E`

</specifics>

<deferred>
## Deferred Ideas

- Password strength meter library (`@zxcvbn-ts/core` per ROADMAP deferred items) — decide during plan-phase, add catalog entry if accepted
- IssuePriority enum mapping for SegmentedControl P0..P3: per Phase 4 mapping `urgent→P0, high→P1, medium→P2, low→P3, none→excluded`

</deferred>
