---
phase: 06-issue-detail-remaining-views
plan: 05
subsystem: auth
tags: [react, vitest, api-client, no-enumeration, idempotent, german, oklch, dragstrip-aware]

# Dependency graph
requires:
  - phase: 05.1-auth-backend-endpoints-inserted
    provides: signup / login / verify-email / resend / password-reset endpoints (frozen contracts)
  - phase: 06-issue-detail-remaining-views
    provides: Wave-0 atoms — AlgoPlanWordmark (lg italic auth display), DragStrip atom, dragstrip-coverage gate
provides:
  - 6 new @multica/core/api client methods — signup, login, verifyEmail, resendVerifyEmail, requestPasswordReset, resetPassword
  - LoginPage RESTYLE — AlgoPlanWordmark default + italic German title + password sub-mode + Konto erstellen + Passwort vergessen affordances + constant 401 message
  - ForgotPasswordPage NEW — idempotent success state, no-enumeration UX
  - ResendVerifyEmailPage NEW — idempotent success state + 60s client-side cooldown
affects:
  - Plan 06 (SignupPage / VerifyEmailPage / ResetPasswordPage) — consumes the api client methods this plan adds
  - Plan 07 (auth wrappers) — wraps these three page components in Web (apps/web/app/(auth)/...) and Desktop (WindowOverlay) shells with DragStrip
  - Future "Forgot CLI auth" or "passkey" flows — extend the same api client surface

# Tech tracking
tech-stack:
  added:
    - "(none — uses existing @multica/* dependencies)"
  patterns:
    - "No-enumeration error mapping: branch on err.status only (never on a sub-reason discriminator). UI emits a single CONSTANT German message for any 401 from api.login. Mirrors backend Phase 5.1 collapsed-error contract."
    - "Idempotent always-success UI for /auth/email-verify/resend and /auth/password-reset/request — render the success state regardless of API outcome, including network errors. Surfacing transport failures would create an enumeration oracle the backend deliberately avoids."
    - "Snake_case body field for cross-language API compat: api.resetPassword({token, new_password}) NOT newPassword — Go backend FROZEN contract, typed in TS to catch mismatches at compile time."
    - "Module-scope CONSTANT strings for security-critical user messages (ERROR_INVALID_CREDENTIALS) — single source of truth. Both production code and tests import the same literal."
    - "Sub-mode toggle as a small button (not tabs / not a route) inside the existing email step — preserves all existing OTP test paths via a single boolean state additionally to step machine."
    - "Wave-0 atom default with optional override: LoginPage's `logo` prop defaults to <AlgoPlanWordmark size=lg /> when omitted; legacy callers (desktop MulticaIcon) keep working until Plan 07 retires the override."
    - "Setting cooldown=60 inside the success branch's finally{} so it starts ticking the moment the success state mounts — separate `cooldown` state from `submitting` keeps button disabled across both gates."

key-files:
  created:
    - packages/views/auth/forgot-password-page.tsx
    - packages/views/auth/forgot-password-page.test.tsx
    - packages/views/auth/resend-verify-email-page.tsx
    - packages/views/auth/resend-verify-email-page.test.tsx
  modified:
    - packages/core/api/client.ts (added 6 auth methods, ~85 lines)
    - packages/core/api/client.test.ts (added 13 ApiClient auth assertions, ~270 lines)
    - packages/views/auth/login-page.tsx (restyle: German strings, AlgoPlanWordmark default, password sub-mode, new affordances; +203 lines)
    - packages/views/auth/login-page.test.tsx (rewritten for German + password mode + 401 constant + new affordances; +485 lines)
    - packages/views/auth/index.ts (re-export ForgotPasswordPage + ResendVerifyEmailPage)
    - .planning/phases/06-issue-detail-remaining-views/deferred-items.md (Plan-05 entry for pre-existing untracked workspace-tab errors)

key-decisions:
  - "Sub-mode is a `useState<'otp' | 'password'>` boolean alongside the existing step machine, NOT a separate step. Toggle button below the email field reads 'Mit Passwort anmelden' / 'Code anfordern' depending on current mode. Reasons: (a) preserves the entire OTP test path unchanged, (b) one form element id stays stable so autofill works across mode swaps, (c) avoids a third step that would need its own back/forward UX."
  - "LoginPage `logo` prop kept as optional override (defaults to AlgoPlanWordmark size=lg). Per CLAUDE.md no-compat-layers we'd remove it, but the desktop call site at apps/desktop/src/renderer/src/pages/login.tsx still passes a legacy MulticaIcon — out of this plan's file scope. Plan 07 (or whoever retires MulticaIcon) can drop the override path then."
  - "Cooldown countdown implemented with setTimeout-based one-second tick (NOT setInterval) inside a useEffect that re-runs each time `cooldown` changes — mirrors the established LoginPage OTP-resend cooldown idiom; a single reusable test pattern (`for (let i=0; i<61; i++) advanceTimersByTime(1000)`) covers both."
  - "Cooldown starts in the success branch's `finally` block, so even if the API throws (network), the user-visible success state still gets the 60s gate. Backend already enforces 60s/email server-side; the client cooldown is purely UX-grade rapid-click protection per UI-SPEC."
  - "Test-time mock of @multica/core/api EXPORTS BOTH `api` (the singleton) AND a local `ApiError` class with the same shape — needed because login-page's `loginErrorMessage()` does `err instanceof ApiError`, which would always be false if the test only mocked `api`. The mock ApiError matches the real class's `name`, `status`, `statusText` triplet."
  - "Network errors on idempotent endpoints (resend / request-reset) are SILENTLY caught and the success branch is rendered. Documented in code comments. Rationale: the backend contract is always-200 — any visible-in-UI failure mode would let an attacker probe transient infrastructure to learn whether their request was actually processed."

# Metrics
duration: 15m
completed: 2026-04-26
---

# Phase 6 Plan 05: AUTH Wave-2 entry — API client + LoginPage restyle + Forgot/Resend pages Summary

**Six new @multica/core/api client methods (signup/login/verifyEmail/resendVerifyEmail/requestPasswordReset/resetPassword), a fully-restyled German LoginPage with password sub-mode + AlgoPlanWordmark + Konto-erstellen / Passwort-vergessen affordances + a constant no-enumeration 401 message, plus two new pages — ForgotPasswordPage and ResendVerifyEmailPage — both with idempotent always-success UX (mirroring the backend's no-enumeration contract) and a 60s client-side resend cooldown on the verify page.**

## Performance

- **Duration:** ~15 min
- **Started:** 2026-04-26T10:03:20Z
- **Completed:** 2026-04-26T10:18:43Z
- **Tasks:** 3
- **Files created:** 4
- **Files modified:** 6
- **Vitest assertions added:** 32 (13 in @multica/core api + 19 in @multica/views auth)

## Accomplishments

- API client surface extended with 6 password-flow methods against the FROZEN Phase-5.1 contracts; OTP methods (sendCode / verifyCode) untouched
- LoginPage restyle ships the AlgoPlanWordmark default, italic German title, password sub-mode pivot, and the new "Konto erstellen" / "Passwort vergessen?" affordances — every existing OTP and Google OAuth test path stays GREEN
- The no-enumeration contract is provable in tests: two 401 simulations on api.login produce identical thrown errors (`status === 401`, same `message`); two LoginPage mount/click cycles produce the same constant German text on screen
- ForgotPasswordPage + ResendVerifyEmailPage idempotent success branches render regardless of API outcome (including network errors) — verified by explicit "ghost@nobody.test" tests
- ResendVerifyEmailPage 60s cooldown re-enables correctly after `61 × advanceTimersByTime(1_000)` with the second click triggering another `api.resendVerifyEmail` and resetting the cooldown
- Wave-0 dragstrip-coverage gate stays GREEN at 24/24 (these new pages are correctly excluded — wrappers own DragStrip, per UI-SPEC §Pre-workspace pages)

## Task Commits

Each task was committed atomically:

1. **Task 1: API client + 13 auth tests** — `adabbac2` (feat)
2. **Task 2: LoginPage restyle + password sub-mode + new affordances + German strings (41/41 GREEN)** — `16c44f07` (feat)
3. **Task 3: ForgotPasswordPage + ResendVerifyEmailPage NEW + idempotent UX + 60s cooldown (19/19 GREEN)** — `9531e940` (feat)

_TDD note: each task wrote tests first (RED), then implemented (GREEN), all in a single feat commit per the GSD task contract._

## Files Created/Modified

### Created (4)

- `packages/views/auth/forgot-password-page.tsx` — 124 lines. AlgoPlanWordmark + italic German title + email field + idempotent always-success branch with CheckCircle2 icon + "Zurück zur Anmeldung" navigation.
- `packages/views/auth/forgot-password-page.test.tsx` — 8 vitest assertions: render, in-flight label, idempotent success on any email, no-enumeration (no "nicht registriert" / "existiert nicht" leakage), network-error resilience, body shape `{email}`, navigation on back-to-login click.
- `packages/views/auth/resend-verify-email-page.tsx` — 145 lines. Same shell as ForgotPasswordPage with "Bestätigungslink erneut senden" + 60s cooldown on the success-state "Erneut senden" button (setTimeout-based tick).
- `packages/views/auth/resend-verify-email-page.test.tsx` — 11 vitest assertions including the two cooldown gates: (1) initial 60s disable, (2) re-enable after 61 ticks, plus the cooldown-reset assertion after the second click.

### Modified (6)

- `packages/core/api/client.ts` — six new methods grouped under a "Phase 6 additions" comment block. All call `this.fetch` with the FROZEN Phase-5.1 paths. resetPassword body uses snake_case `new_password` per the backend contract; method is typed to enforce that at compile time.
- `packages/core/api/client.test.ts` — added a `describe("ApiClient — auth (Phase 6 additions)")` block with 13 assertions covering: signup 200/400/403/409, login 200 + the no-enumeration 401 proof (two simulations produce identical ApiError shape), verifyEmail 200/401, resendVerifyEmail 200, requestPasswordReset 200, resetPassword 200/400/401 with body-shape assertion that confirms `new_password` (snake) and the absence of `newPassword` (camel).
- `packages/views/auth/login-page.tsx` — full rewrite: German strings throughout, AlgoPlanWordmark default header (logo prop preserved as optional override), password sub-mode toggle, `handlePasswordLogin` that calls api.login → seeds workspace cache → getMe → onSuccess, `loginErrorMessage()` helper that branches strictly on `err.status` (no sub-reason), AppLink-based "Konto erstellen" + "Passwort vergessen?" footer affordances.
- `packages/views/auth/login-page.test.tsx` — full rewrite: 41 assertions covering German strings, password-mode flow, the constant-401 proof (two different rejection messages produce the same UI text), 403/5xx mapping, OTP regression, Google OAuth regression, CLI authorize regression, custom-logo override.
- `packages/views/auth/index.ts` — re-export ForgotPasswordPage + ResendVerifyEmailPage.
- `.planning/phases/06-issue-detail-remaining-views/deferred-items.md` — added a 06-05 entry tracking the four pre-existing typecheck errors in the untracked `workspace-tab.test.tsx` file (confirmed via `git stash + tsc` baseline check before my Task 2 commit).

## Decisions Made

- **Sub-mode as boolean state, not a third step.** A `useState<"otp" | "password">` alongside the existing step machine keeps the component coherent: one email field id, one CTA button slot, one error region, no back/forward UX needed for the toggle. The toggle button reads "Mit Passwort anmelden" in OTP mode, "Code anfordern" in password mode.
- **`logo` prop preserved as override.** AlgoPlanWordmark is the new default, but the desktop's `pages/login.tsx` still passes `<MulticaIcon bordered size="lg" />` — that file is OUT of this plan's scope. Removing the prop would break it. Override pattern: `const headerLogo = logo ?? <AlgoPlanWordmark size="lg" />`. Plan 07 (or a follow-up rebrand pass) can drop the override path then.
- **Cooldown countdown uses `setTimeout` inside `useEffect`.** Re-runs on each `cooldown` change, ticking once per second. Matches the established LoginPage OTP-resend pattern, so the same `for (let i=0; i<61; i++) advanceTimersByTime(1000)` test idiom works for both. Test infrastructure choice: `userEvent.setup({ advanceTimers: vi.advanceTimersByTime })` so user interactions still work under fake timers.
- **No-enumeration UI on network errors.** Both ForgotPasswordPage and ResendVerifyEmailPage swallow API errors silently in `try/catch/finally` and render the success branch unconditionally. Documented inline in both files. Rationale: backend always returns 200; turning a transport failure into UI signal would let an attacker probe whether their request was processed (which is the exact threat model the no-enumeration design defeats).
- **Mock ApiError class in test files.** Vitest mock of `@multica/core/api` exports BOTH the `api` singleton AND an `ApiError` class — needed because `login-page.tsx` does `err instanceof ApiError` in `loginErrorMessage()`. The mock class matches the real one's `name === "ApiError"`, `.status`, `.statusText` triplet so `instanceof` and shape assertions agree.
- **Test mocks return `"{}"` for idempotent endpoints' 200 body.** First test draft used empty `""` body, but `client.fetch` calls `res.json()` for any non-204 response — empty string throws. Adjusted test mocks to return `"{}"` matching the real backend's idempotent JSON envelope (Phase 5.1 ships these endpoints with `200 + {}` for the always-OK path).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 — Bug] Initial test mock used empty body `""` for idempotent 200 endpoints**

- **Found during:** Task 1 (first run of new client tests)
- **Issue:** My test draft for `resendVerifyEmail` and `requestPasswordReset` used `new Response("", {status:200})`. But `ApiClient.fetch` only special-cases 204 — for any other 2xx it calls `res.json()`, which throws `SyntaxError: Unexpected end of JSON input` on empty body. 15/17 tests passed; these 2 failed.
- **Fix:** Changed mock to `new Response("{}", {status:200})`, matching the actual Phase 5.1 backend contract (idempotent endpoints return `200 + {}` envelope, not `204`). Renamed helper `emptyResponse → emptyJsonResponse` and added a code comment documenting the contract.
- **Files modified:** `packages/core/api/client.test.ts` (test-only)
- **Verification:** All 17 client tests GREEN after the fix.
- **Committed in:** `adabbac2` (Task 1 commit)

**2. [Rule 1 — Bug] Initial CLI-confirm body-text test matcher was ambiguous**

- **Found during:** Task 2 (first full run of LoginPage tests — 40/41 GREEN)
- **Issue:** I used `screen.getByText` with a custom matcher function that returned true for any node whose `textContent` contained "CLI als" + "AlgoPlan" + "zugreifen lassen". That matched MULTIPLE elements (the parent span AND a containing div) and Testing Library threw "Found multiple elements".
- **Fix:** Replaced with two narrower `getByText(/CLI als/i)` and `getByText(/auf AlgoPlan zugreifen lassen\?/i)` assertions — each matches a single text segment split by the email span.
- **Files modified:** `packages/views/auth/login-page.test.tsx`
- **Verification:** 41/41 LoginPage tests GREEN.
- **Committed in:** `16c44f07` (Task 2 commit)

---

**Total deviations:** 2 auto-fixed (both Rule 1 — test infrastructure correctness)
**Impact on plan:** Both were test mechanics, not contract issues. The plan's behavioral assertions and API shapes were correct as written.

## Authentication Gates

None encountered. All work was local — no external service auth needed.

## Issues Encountered

- **Pre-existing typecheck errors in untracked `packages/views/settings/components/workspace-tab.test.tsx`** — confirmed via `git stash + tsc` baseline check that these four errors exist on the parent commit and are NOT caused by Plan 05. Logged in `deferred-items.md` under "06-05" section. Out of scope per SCOPE BOUNDARY rule (file is part of an unrelated parallel workstream's untracked file).
- **No live E2E run.** Per phase ceremony, Plan 05 ships unit-tested page components; live auth E2E waits on Plan 07's wrappers (Web `(auth)/...` routes + Desktop WindowOverlay branches).

## Verification Results

```
pnpm --filter @multica/core exec vitest run api/                       → 20/20 GREEN
pnpm --filter @multica/views exec vitest run auth/                     → 77/77 GREEN
pnpm --filter @multica/views exec vitest run __tests__/dragstrip-coverage.test.ts → 24/24 GREEN
pnpm --filter @multica/core exec tsc --noEmit                          → 0 errors
pnpm --filter @multica/views exec tsc --noEmit                         → 0 errors
```

The dragstrip-coverage gate stays at 12 enumerated files (no additions this plan — wrappers own DragStrip for these new pages, per UI-SPEC §Pre-workspace pages).

## API Client Method Shapes (final)

| Method | Path | Body | Returns | Throws |
|---|---|---|---|---|
| `signup({email, password, name})` | `POST /auth/signup` | `{email, password, name}` | `LoginResponse` | ApiError 400/403/409/5xx |
| `login({email, password})` | `POST /auth/login` | `{email, password}` | `LoginResponse` | ApiError 401 (constant) / 5xx |
| `verifyEmail({token})` | `POST /auth/email-verify` | `{token}` | `User` | ApiError 401 (constant) |
| `resendVerifyEmail({email})` | `POST /auth/email-verify/resend` | `{email}` | `void` | (always resolves on 200) |
| `requestPasswordReset({email})` | `POST /auth/password-reset/request` | `{email}` | `void` | (always resolves on 200) |
| `resetPassword({token, new_password})` | `POST /auth/password-reset/confirm` | `{token, new_password}` (snake) | `{message}` | ApiError 400/401/5xx |

The OTP path methods (`sendCode`, `verifyCode`, `googleLogin`, `logout`) are unchanged.

## Sub-Mode Toggle Decision (UI-SPEC §AUTH §Login page)

Implementation: a small text-link-styled `<button type="button">` below the email field. Label depends on current mode:
- OTP mode (default): **"Mit Passwort anmelden"**
- Password mode: **"Code anfordern"**

Clicking toggles `subMode` between `"otp"` and `"password"`, clearing any error. The primary CTA label and submit handler swap atomically with the mode:
- OTP mode primary: **"Code anfordern"** → `handleSendCode` → existing OTP path unchanged
- Password mode primary: **"Anmelden"** → `handlePasswordLogin` → `api.login()`

Why button vs tabs vs link: tabs imply equivalence between two separate flows, but the password path is the recommended/primary one for users who set one. A subtle inline toggle keeps the email step visually unified and avoids introducing a third step into the existing step machine.

## Cooldown Implementation Choice (ResendVerifyEmailPage)

`useState<number>(0)` for the cooldown value + `useEffect` that re-runs each time `cooldown` changes:

```ts
useEffect(() => {
  if (cooldown <= 0) return;
  const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
  return () => clearTimeout(t);
}, [cooldown]);
```

Set `cooldown = 60` after every successful send (including the initial submit, in the `finally` block). The "Erneut senden" button is `disabled={cooldown > 0 || submitting}` and reads `Erneut senden in {n}s` until the count reaches 0, then `Erneut senden`.

Why setTimeout (not setInterval): self-cleaning — each tick schedules the next, and React's effect cleanup runs `clearTimeout` if the component unmounts mid-cycle. Same pattern is used in LoginPage's OTP resend cooldown so the test idiom (`for (let i=0; i<61; i++) advanceTimersByTime(1000)`) is shared.

## No-Enumeration Verification (UI-SPEC §Hard Constraints #13)

**LoginPage 401 — UI:** Two test cases (`password mode 401: shows constant message regardless of which credential side failed`) mock `api.login` to reject with `new ApiErrorMock("invalid credentials", 401, "Unauthorized")` and `new ApiErrorMock("password mismatch — different reason text", 401, "Unauthorized")`. Both render the EXACT German constant `"E-Mail oder Passwort ist falsch."`; the second test additionally asserts `screen.queryByText(/password mismatch/i)` returns null — the discriminating reason text never reaches the DOM.

**api.login — client:** The `login: 401 produces a no-enumeration error` test mounts two ApiClient instances and rejects each one's `fetch` with the same 401 body. Both instances' thrown errors are asserted to have identical `name`, `status`, `statusText`, AND `message`. The discriminating shape any caller could observe is provably indistinguishable.

**ForgotPasswordPage:** Two tests render the success message — one for `"real@example.com"`, one for `"ghost@nobody.test"` — and assert the same German body text in both. Two negative assertions confirm `nicht registriert`, `existiert nicht`, and `unknown` text never appear in the DOM in either flow.

**ResendVerifyEmailPage:** Same pattern — two render+submit cycles for known and unknown emails, both produce the same German success message; negative assertions confirm no enumeration leakage.

## Self-Check: PASSED

- `[ ✓ ]` `packages/core/api/client.ts` — present (modified, +85 lines)
- `[ ✓ ]` `packages/core/api/client.test.ts` — present (modified, +270 lines)
- `[ ✓ ]` `packages/views/auth/login-page.tsx` — present (modified, +203 lines)
- `[ ✓ ]` `packages/views/auth/login-page.test.tsx` — present (modified, +485 lines)
- `[ ✓ ]` `packages/views/auth/forgot-password-page.tsx` — present (NEW)
- `[ ✓ ]` `packages/views/auth/forgot-password-page.test.tsx` — present (NEW)
- `[ ✓ ]` `packages/views/auth/resend-verify-email-page.tsx` — present (NEW)
- `[ ✓ ]` `packages/views/auth/resend-verify-email-page.test.tsx` — present (NEW)
- `[ ✓ ]` `packages/views/auth/index.ts` — present (modified, +2 re-exports)
- `[ ✓ ]` Commit `adabbac2` (Task 1) — present
- `[ ✓ ]` Commit `16c44f07` (Task 2) — present
- `[ ✓ ]` Commit `9531e940` (Task 3) — present

---
*Phase: 06-issue-detail-remaining-views*
*Completed: 2026-04-26*
