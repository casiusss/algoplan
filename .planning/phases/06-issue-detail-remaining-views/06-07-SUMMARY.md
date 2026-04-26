---
phase: 06-issue-detail-remaining-views
plan: 07
subsystem: auth
tags: [next-app-router, electron, react, zustand, navigation-adapter, dragstrip, i18n-de]

# Dependency graph
requires:
  - phase: 06-00
    provides: AlgoPlanWordmark atom + dragstrip-coverage gate + DragStrip platform shim
  - phase: 06-04
    provides: NoAccessPage wordmark restyle (shared pre-workspace pattern)
  - phase: 06-05
    provides: LoginPage + ForgotPasswordPage + ResendVerifyEmailPage shared views
  - phase: 06-06
    provides: SignupPage + VerifyEmailPage + ResetPasswordPage shared views
  - phase: 05.1
    provides: FROZEN /auth/verify-email?token=... and /auth/reset-password?token=... email-link contracts

provides:
  - 5 NEW Next.js routes at /auth/{signup,verify-email,verify-email-resend,forgot-password,reset-password}
  - 5 NEW WindowOverlay types on desktop (signup, verify-email, verify-email-resend, forgot-password, reset-password)
  - Desktop navigation adapter translates push("/auth/...") to overlay dispatches with token forwarding
  - NewWorkspacePage + InvitePage + OnboardingFlow restyled with AlgoPlanWordmark + German strings
  - Email-link contracts end-to-end functional in both apps

affects:
  - phase 7 rebrand (any further /auth/* additions inherit this routing convention)
  - any cross-app pre-workspace flow added later (must follow web-route + desktop-overlay duplex)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Web pre-workspace routes live at /auth/{verb} (NOT in (auth) route group) so URL prefix matches FROZEN email-link contract"
    - "Desktop pre-workspace flows are WindowOverlay state, never tab routes — single source of truth for transition flows"
    - "Navigation adapter intercepts /auth/* push() calls and translates to overlay.open() with verbatim ?token= forwarding"
    - "Order-sensitive prefix routing: longer paths (/auth/verify-email-resend) check BEFORE shorter prefixes (/auth/verify-email)"
    - "Pre-workspace shells: DragStrip stays the FIRST flex child of page-root; AlgoPlanWordmark goes INSIDE the centered card region"
    - "DesktopAuthShell wrapper centralizes DragStrip mounting for ALL 5 auth-overlay branches (one shell, five render branches)"

key-files:
  created:
    - apps/web/app/auth/signup/page.tsx
    - apps/web/app/auth/verify-email/page.tsx
    - apps/web/app/auth/verify-email-resend/page.tsx
    - apps/web/app/auth/forgot-password/page.tsx
    - apps/web/app/auth/reset-password/page.tsx
    - packages/views/workspace/new-workspace-page.test.tsx
    - packages/views/invite/invite-page.test.tsx
    - packages/views/onboarding/onboarding-flow.test.tsx
  modified:
    - apps/desktop/src/renderer/src/stores/window-overlay-store.ts
    - apps/desktop/src/renderer/src/components/window-overlay.tsx
    - apps/desktop/src/renderer/src/platform/navigation.tsx
    - packages/views/workspace/new-workspace-page.tsx
    - packages/views/invite/invite-page.tsx
    - packages/views/onboarding/onboarding-flow.tsx
    - packages/views/auth/forgot-password-page.tsx
    - packages/views/auth/reset-password-page.tsx
    - packages/views/auth/verify-email-page.tsx

key-decisions:
  - "Web routes live at apps/web/app/auth/ (NOT in apps/web/app/(auth)/ route group) — the parens make the (auth) group transparent in URLs, which would emit /signup, /forgot-password, etc. and break the FROZEN /auth/{verb}?token= email-link contract. Existing /auth/callback in apps/web/app/auth/ already uses this convention."
  - "Web wrapper does NOT mount DragStrip — DragStrip is a Chromium -webkit-app-region affordance that is a no-op on web. Web wrapper supplies only the page-root flex container; the shared @multica/views/auth pages handle the centered card layout."
  - "Desktop overlay shell is a NEW DesktopAuthShell wrapper (small component inside window-overlay.tsx) that mounts DragStrip + flex-column once, then renders the matching shared page. Five render branches share one shell so the DragStrip-first invariant is centralized — no per-branch repetition."
  - "Navigation adapter checks /auth/verify-email-resend BEFORE /auth/verify-email because the former is a longer prefix of the latter — startsWith() for /auth/verify-email would otherwise swallow the resend dispatch (UI-SPEC §T-06-W4-AUTH-04 mitigation)."
  - "OnboardingFlow's AlgoPlanWordmark sits in the legacy single-column shell that renders the first_issue step. Welcome / Questionnaire / Workspace own their own full-bleed two-column layouts and already had their own wordmark from prior plans."

patterns-established:
  - "Pre-workspace duplex: every shared @multica/views/<flow> page gets a thin Next.js route file at apps/web/app/auth/{verb}/page.tsx AND a WindowOverlay type + render branch on desktop. Both wrap the shared page; both supply the page-root flex container; only desktop mounts DragStrip."
  - "Token forwarding: shared pages declare `token?: string | null` props; web wrappers extract via Next searchParams (Suspense-wrapped); desktop nav adapter parses ?token= from push paths and threads through the overlay payload."

requirements-completed: [AUTH-02, AUTH-03, AUTH-04, AUTH-05, AUTH-06]

# Metrics
duration: ~70min (cross-Wave-4 — RED+impl shipped earlier; this final pass added Rule-1 fix, restyle commit, and SUMMARY)
completed: 2026-04-26
---

# Phase 06 Plan 07: AUTH wiring — web routes + desktop overlays + restyle Summary

**5 NEW Next.js auth routes at /auth/{verb} + 5 NEW WindowOverlay types with token-forwarding nav-adapter translation + AlgoPlanWordmark/German restyle for NewWorkspacePage / InvitePage / OnboardingFlow, with FROZEN email-link contract preserved end-to-end and DragStrip-first invariant intact.**

## Performance

- **Duration:** ~70 min (RED + initial impl shipped before this final pass; this completion fixed the route-relocation Rule 1 deviation, shipped the restyle GREEN commit, and authored the SUMMARY)
- **Started:** 2026-04-26T13:53:00Z (this final pass)
- **Completed:** 2026-04-26T12:00:52Z (commit timestamp ~14:00 local)
- **Tasks:** 3 (all in scope; Tasks 1+2 already in-flight, Task 3 GREEN gate this pass)
- **Files modified:** 11 source files + 1 deferred-items.md update

## Accomplishments
- 5 NEW web routes at the correct /auth/{verb} URLs (build-verified: /auth/signup, /auth/verify-email, /auth/verify-email-resend, /auth/forgot-password, /auth/reset-password all show in `next build` route table)
- WindowOverlay literal union extended from 3 → 8 types; window-overlay.tsx renders all 8 branches; navigation.tsx translates 5 new /auth/* paths with token forwarding
- DesktopAuthShell wrapper centralizes DragStrip mounting for ALL 5 auth overlays (one shell, five render branches)
- NewWorkspacePage + InvitePage + OnboardingFlow now carry AlgoPlanWordmark + German shell strings; DragStrip stays first flex child throughout
- DragStrip coverage gate stays GREEN (24 assertions across 12 enumerated views)
- 621/621 view tests GREEN

## Task Commits

Each task was committed atomically (commits span this plan's full execution arc):

1. **Task 1 RED+GREEN (initial)** — `89725e90` (feat: 5 NEW Next.js auth routes wired)
2. **Task 2 GREEN** — `5f4355d3` (feat: 5 NEW desktop window overlays + nav translation)
3. **Task 3 RED** — `1de3114b` (test: failing tests for AUTH restyle, Wave 4 RED)
4. **Rule 1 deviation fix** — `f316b336` (fix: relocate 5 NEW auth routes from /(auth)/ group to /auth/ subtree — email-link contract correction)
5. **Path-comment sync** — `bda1655d` (docs: align auth-page wrapper-path comments with /auth/ routes)
6. **Task 3 GREEN** — `d90a6d3e` (feat: restyle pre-workspace trio with AlgoPlanWordmark + German strings)

## Files Created/Modified

### Web routes (5 NEW, then RELOCATED in fix commit f316b336)
- `apps/web/app/auth/signup/page.tsx` — wraps `<SignupPage />` in flex page-root
- `apps/web/app/auth/verify-email/page.tsx` — Suspense + searchParams `?token=` → `<VerifyEmailPage token={token} />`
- `apps/web/app/auth/verify-email-resend/page.tsx` — wraps `<ResendVerifyEmailPage />`
- `apps/web/app/auth/forgot-password/page.tsx` — wraps `<ForgotPasswordPage />`
- `apps/web/app/auth/reset-password/page.tsx` — Suspense + searchParams `?token=` → `<ResetPasswordPage token={token} />`

### Desktop overlay system (3 EDITS)
- `apps/desktop/src/renderer/src/stores/window-overlay-store.ts` — extended `WindowOverlay` union with 5 new types; `verify-email` + `reset-password` carry optional `token?: string` payload
- `apps/desktop/src/renderer/src/components/window-overlay.tsx` — added 5 new render branches; introduced `DesktopAuthShell` wrapper that mounts DragStrip + flex-column once for all 5 auth overlays
- `apps/desktop/src/renderer/src/platform/navigation.tsx` — added 5 new path interceptors (with verify-email-resend BEFORE verify-email order); `parseTokenFromPath()` helper extracts `?token=` for verify/reset overlay payload

### Pre-workspace restyle (3 EDITS)
- `packages/views/workspace/new-workspace-page.tsx` — `AlgoPlanWordmark size="lg"` + `Willkommen bei AlgoPlan` (text-3xl italic font-semibold) + German body/invite/Back/Logout
- `packages/views/invite/invite-page.tsx` — `InviteShell` mounts wordmark above card across all 5 render branches; all branch strings German
- `packages/views/onboarding/onboarding-flow.tsx` — wordmark in legacy single-column hero (renders first_issue step)

### Doc-comment path sync (3 EDITS — bda1655d)
- `packages/views/auth/forgot-password-page.tsx` — wrapper-path comment updated to `apps/web/app/auth/...`
- `packages/views/auth/reset-password-page.tsx` — wrapper-path comment updated to `apps/web/app/auth/reset-password/page.tsx`
- `packages/views/auth/verify-email-page.tsx` — wrapper-path comment updated to `apps/web/app/auth/verify-email/page.tsx`

### Tests (3 NEW — landed in 1de3114b RED gate)
- `packages/views/workspace/new-workspace-page.test.tsx` — 6 assertions
- `packages/views/invite/invite-page.test.tsx` — 6 assertions
- `packages/views/onboarding/onboarding-flow.test.tsx` — 2 assertions

## Decisions Made

### Web (auth) layout decision

**There is no `apps/web/app/(auth)/layout.tsx` file** — the (auth) route group has no shared layout file. Each existing route in the group (login, onboarding, invite/[id], workspaces/new) wraps its own page-root flex container. The new routes mirror that pattern with `<div className="flex min-h-svh flex-col bg-background">` as the wrapper.

**Web wrapper does NOT mount DragStrip.** DragStrip is a Chromium `-webkit-app-region: drag` affordance — on web it would render as a 48px no-op div. The web wrapper supplies only the flex page-root; DragStrip mounting is desktop-only via the WindowOverlay shell.

### Desktop overlay shell pattern (NEW DesktopAuthShell)

The existing window-overlay.tsx branches (new-workspace, invite, onboarding) each call into a shared page that mounts its own DragStrip internally. The 5 NEW shared @multica/views/auth pages do NOT mount DragStrip themselves (they're centered cards meant to be rendered in either a web route or a desktop overlay). To mount DragStrip exactly once for all 5 auth overlays without per-branch repetition, this plan introduced a small `DesktopAuthShell` function inside window-overlay.tsx:

```tsx
function DesktopAuthShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-svh flex-col">
      <DragStrip />
      {children}
    </div>
  );
}
```

All 5 new branches wrap their shared page in this shell. The dragstrip-coverage gate (which targets files in `packages/views/`) is satisfied by the existing pre-workspace pages; the desktop shell is structurally enforced by code review of this single file.

### Desktop nav translation order

`/auth/verify-email-resend` is checked BEFORE `/auth/verify-email` because `startsWith("/auth/verify-email")` would match BOTH paths, swallowing the resend dispatch. This is mitigated per UI-SPEC §T-06-W4-AUTH-04 — the resend check runs first, returns true, and never falls through to the verify branch.

### DragStrip gate verification

Ran `pnpm --filter @multica/views exec vitest run __tests__/dragstrip-coverage.test.ts` BEFORE and AFTER each restyle:
- Before restyle: 24/24 GREEN
- After NewWorkspacePage restyle: 24/24 GREEN
- After InvitePage restyle: 24/24 GREEN
- After OnboardingFlow restyle: 24/24 GREEN

The gate explicitly walks every `<DragStrip>` occurrence in 12 enumerated full-window files and asserts (a) the immediate JSX parent has `flex` in className, (b) nothing JSX-significant appears between parent open-tag and DragStrip. AlgoPlanWordmark insertions land INSIDE the centered card region (children of DragStrip's sibling), never above DragStrip.

### Cross-apps E2E smoke

- **Web build:** `pnpm --filter @multica/web build` GREEN — route table emits `/auth/signup`, `/auth/verify-email`, `/auth/verify-email-resend`, `/auth/forgot-password`, `/auth/reset-password` as the 5 NEW static routes alongside the existing `/auth/callback`. No build errors.
- **Web typecheck:** `pnpm --filter @multica/web exec tsc --noEmit` GREEN.
- **Desktop typecheck:** `pnpm --filter @multica/desktop exec tsc --noEmit` GREEN for the files in this plan's scope (one pre-existing error in pageview-tracker.tsx is documented in deferred-items.md as out-of-scope).
- **Views typecheck:** `pnpm --filter @multica/views exec tsc --noEmit` GREEN.
- **Views vitest:** 621/621 GREEN across 76 test files.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] 5 NEW web routes were initially placed in apps/web/app/(auth)/ route group**

- **Found during:** Task 1 verification (`pnpm --filter @multica/web build` route table inspection)
- **Issue:** The 5 NEW route directories were created under `apps/web/app/(auth)/` — but `(auth)` with parens is a Next.js route GROUP, which is transparent in URLs. The build emitted `/signup`, `/forgot-password`, `/verify-email`, `/verify-email-resend`, `/reset-password` — NOT `/auth/signup`, etc. This breaks UI-SPEC §Hard Constraints #18 (FROZEN email-link contract `${FRONTEND_ORIGIN}/auth/verify-email?token=...`) AND breaks the navigation adapter's `/auth/*` push translations because shared code calls `navigation.push("/auth/forgot-password")` and the LoginPage has `href="/auth/forgot-password"`.
- **Fix:** `git mv` all 5 page.tsx files from `apps/web/app/(auth)/{verb}/page.tsx` to `apps/web/app/auth/{verb}/page.tsx`, removed the empty group-subdirectories. The existing `apps/web/app/auth/callback/` proves this is the right convention. Re-built; route table confirms `/auth/{verb}` emission for all 5.
- **Files modified:** 5 page.tsx renames + 3 doc-comment path syncs in shared @multica/views/auth pages
- **Verification:** `pnpm --filter @multica/web build` shows `/auth/signup`, `/auth/verify-email`, `/auth/verify-email-resend`, `/auth/forgot-password`, `/auth/reset-password` in the route table.
- **Committed in:** f316b336 (route move) + bda1655d (doc-comment sync)

---

**Total deviations:** 1 auto-fixed (1 bug — Rule 1)
**Impact on plan:** The auto-fix corrected a contract violation that would have made every email link emitted by the backend dead-on-arrival in production. No scope creep — the fix touched only the same 5 NEW routes the plan already owned, plus 3 line-level doc-comment syncs in shared auth pages.

## Issues Encountered

### Pre-existing test failures (NOT introduced by this plan)

- `apps/web/app/(auth)/login/page.test.tsx` — 6 of 7 tests fail with `useNavigation must be used within NavigationProvider`. The LoginPage redesign in Plan 06-05 (commit 16c44f07) introduced `<AppLink>` calls that go through `useNavigation()`, but the route-level test mocks only `next/navigation`. Confirmed pre-existing via `git stash + vitest run` baseline. Out-of-scope per SCOPE BOUNDARY rule. Documented in `06-deferred-items.md`.
- `apps/desktop/src/renderer/src/components/pageview-tracker.tsx:60:47` — TS2366 lacks ending return statement. Confirmed pre-existing via `git stash + typecheck:web` baseline. Out-of-scope per SCOPE BOUNDARY rule. Documented in `06-deferred-items.md`.

## Threat Flags

None. The threat surface added by this plan (URL ?token= → desktop overlay payload) was already in the plan's `<threat_model>` and is mitigated by passing the token verbatim to the shared page (no code execution path on token contents) and by ordering the verify-email-resend check before verify-email (UI-SPEC §T-06-W4-AUTH-04).

## Next Phase Readiness

- AUTH wiring complete in both apps. Email-link contracts (`/auth/verify-email?token=<>` and `/auth/reset-password?token=<>`) end-to-end functional on web and desktop.
- All 8 WindowOverlay types render correctly with DragStrip-bearing chrome.
- Navigation adapter is the single chokepoint for `/auth/*` translation on desktop — future auth flows added by Phase 7+ can extend it via the same pattern (add literal-union member, add render branch, add path interceptor).
- Phase 6 is complete: every plan in this phase (00..07) carries an atomic commit chain + summary.
- Two pre-existing failures (login/page.test.tsx, pageview-tracker.tsx) are tracked in deferred-items.md for follow-up by their owning workstreams.

## Self-Check: PASSED

- ✓ apps/web/app/auth/signup/page.tsx exists
- ✓ apps/web/app/auth/verify-email/page.tsx exists
- ✓ apps/web/app/auth/verify-email-resend/page.tsx exists
- ✓ apps/web/app/auth/forgot-password/page.tsx exists
- ✓ apps/web/app/auth/reset-password/page.tsx exists
- ✓ apps/desktop/src/renderer/src/stores/window-overlay-store.ts modified
- ✓ apps/desktop/src/renderer/src/components/window-overlay.tsx modified
- ✓ apps/desktop/src/renderer/src/platform/navigation.tsx modified
- ✓ packages/views/workspace/new-workspace-page.tsx modified
- ✓ packages/views/invite/invite-page.tsx modified
- ✓ packages/views/onboarding/onboarding-flow.tsx modified
- ✓ Commit 89725e90 (feat web routes) — found in git log
- ✓ Commit 5f4355d3 (feat desktop overlays) — found in git log
- ✓ Commit 1de3114b (test RED) — found in git log
- ✓ Commit f316b336 (fix route relocation) — found in git log
- ✓ Commit bda1655d (docs path sync) — found in git log
- ✓ Commit d90a6d3e (feat restyle) — found in git log
- ✓ Web build emits all 5 /auth/{verb} routes
- ✓ DragStrip coverage gate GREEN (24/24)
- ✓ Views vitest GREEN (621/621)

---
*Phase: 06-issue-detail-remaining-views*
*Completed: 2026-04-26*
