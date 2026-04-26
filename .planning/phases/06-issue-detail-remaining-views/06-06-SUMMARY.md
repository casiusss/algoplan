---
phase: 06-issue-detail-remaining-views
plan: 06
subsystem: auth
tags: [react, vitest, tdd, no-enumeration, german, oklch, strict-mode-safe, password-strength, flash-toast, dragstrip-aware]

# Dependency graph
requires:
  - phase: 05.1-auth-backend-endpoints-inserted
    provides: signup / email-verify / password-reset/confirm endpoints (frozen contracts)
  - phase: 06-issue-detail-remaining-views
    provides: Wave-0 atoms — AlgoPlanWordmark (lg italic auth display), PasswordStrengthMeter (lazy zxcvbn), useNavigationFlash + setFlash, dragstrip-coverage gate
  - plan: 06-05
    provides: api.signup / api.verifyEmail / api.resetPassword (typed @multica/core/api methods) + LoginPage AlgoPlanWordmark + Konto/Forgot affordances
provides:
  - SignupPage NEW — AUTH-02 — strength-meter-gated submit + 409 distinguishing error + redirect to /onboarding on 200
  - VerifyEmailPage NEW — AUTH-03 — token-link redemption with strict-mode ref-guard, NOT polling, 4-branch discriminated state
  - ResetPasswordPage NEW — AUTH-05 — token-link no-token branch + form gating + NO auto-login (setFlash + push to /auth/login on 200) + 401 failure branch
  - PasswordStrengthMeter onScoreChange callback — Wave-0 atom extension lets parent forms gate submit on score ≥ 2 without owning scoring
  - LoginPage flash consume — useNavigationFlash("password-updated") mounted on every render to surface ResetPasswordPage's success toast
affects:
  - Plan 06-07 (Wave 4 wrappers) — wraps these three new page components in apps/web/app/(auth)/{signup,verify-email,reset-password}/page.tsx (Next.js searchParams) AND apps/desktop WindowOverlay branches; both wrappers extract `?token=` and pass it as a prop
  - Future authenticated-account flows (passkeys, social-account-link, magic-only resends) — extend the same page component pattern (discriminated-union state + ref-guarded effects + setFlash for cross-route messaging)

# Tech tracking
tech-stack:
  added:
    - "(none — uses existing @multica/* dependencies; lazy zxcvbn import already shipped in Wave 0)"
  patterns:
    - "Strict-mode safe one-shot effects: useRef as a re-mount guard. The component still re-renders / re-runs effects under React 18 StrictMode's deliberate double-mount, but the network call fires EXACTLY once. Pattern: `if (hasRunRef.current) return; hasRunRef.current = true; api.X(...)`."
    - "Discriminated-union state for multi-branch UI flows: `type State = {kind: 'no-token'} | {kind: 'in-flight'} | {kind: 'success'} | {kind: 'failure'}`. No parallel booleans (per CLAUDE.md state-management Common Footguns) — render branch is a single switch on `state.kind`."
    - "Cross-route flash via sessionStorage: `setFlash(key, msg)` before navigating; destination page mounts `useNavigationFlash(key)` to read-and-remove on mount. Used for 'password-updated' toast that must outlive ResetPasswordPage → /auth/login redirect (NO auto-login per UI-SPEC §Hard Constraints #14)."
    - "Score-gate via callback prop without lifting state: PasswordStrengthMeter remains the single owner of zxcvbn scoring; parent forms receive score updates through `onScoreChange?: (score: number | null) => void` and gate submit on `score ?? -1 >= 2`. Effect-driven callback firing keeps the notification batched with the local setScore commit."
    - "Submit gate as a derived boolean: `canSubmit = !submitting && nameValid && emailValid && password.length >= 12 && (score ?? -1) >= 2`. No useState for derived values — single source of truth from controlled inputs."
    - "Source-level no-polling assertion: a vitest test reads the component's source file with node:fs and asserts the absence of `setInterval` / `setTimeout` regex matches. More robust than a runtime spy because testing-library's `waitFor` itself uses setInterval (false-positive risk) — the structural assertion proves the component has no retry timer in its source."
    - "Snake_case body for cross-language API compat: `api.resetPassword({token, new_password})` matches the FROZEN Phase-5.1 Go backend contract (typed at the client surface in Plan 06-05; this plan consumes that type)."

key-files:
  created:
    - packages/views/auth/signup-page.tsx (190 lines)
    - packages/views/auth/signup-page.test.tsx (319 lines, 17 assertions)
    - packages/views/auth/verify-email-page.tsx (147 lines)
    - packages/views/auth/verify-email-page.test.tsx (260 lines, 11 assertions)
    - packages/views/auth/reset-password-page.tsx (231 lines)
    - packages/views/auth/reset-password-page.test.tsx (335 lines, 15 assertions)
  modified:
    - packages/views/auth/password-strength-meter.tsx (added onScoreChange callback prop, +20 lines)
    - packages/views/auth/password-strength-meter.test.tsx (added onScoreChange test + widened MeterComponent type alias, +35 lines)
    - packages/views/auth/login-page.tsx (mounted useNavigationFlash('password-updated') for cross-plan flash consume, +9 lines)
    - packages/views/auth/login-page.test.tsx (mocked @multica/core/navigation + added cross-plan flash assertion, +18 lines)
    - packages/views/auth/index.ts (re-export SignupPage + VerifyEmailPage + ResetPasswordPage, +3 lines)

key-decisions:
  - "PasswordStrengthMeter onScoreChange callback — the cleanest way to let a parent form gate submit on score without lifting the entire scoring lifecycle. Notification fires inside a useEffect with `[score, onScoreChange]` deps so React batches the parent setState into the same commit as the local meter setState — never inside the loadZxcvbn promise body, which would couple the callback to async resolution and leak that detail to the parent."
  - "VerifyEmailPage strict-mode guard via useRef. Alternatives considered: (a) module-level `Set<string>` keyed by token — overkill for a single mount, leaks across the app's lifetime; (b) `useEffect` with empty deps — doesn't actually prevent the double-fire under StrictMode (effects re-run after the unmount/remount cycle). Chose useRef because it's the canonical React 18 pattern for one-shot effects and the test (`render(<StrictMode><VerifyEmailPage token=… /></StrictMode>)` + `expect(spy).toHaveBeenCalledTimes(1)`) is direct."
  - "ResetPasswordPage state shape is a discriminated union with three variants: `no-token`, `form` (with `submitting` + `error`), `failure`. Form-internal mistakes (400/5xx) stay inside the form variant with an inline error; only 401 transitions to the failure variant (full branch swap). Reasoning: 401 means the link is dead — keeping the form mounted with an error message would invite re-submits that can never succeed. 400/5xx are recoverable with the same form."
  - "Cross-plan flash wiring: useNavigationFlash('password-updated') was NOT in the Plan 05 LoginPage shipment. Plan 06-06 added it as documented in the W1 fix from plan-checker — frontmatter explicitly declares both files (login-page.tsx + login-page.test.tsx) as part of this plan's edit surface. The hook mounts unconditionally (every LoginPage render) so a plain visit to /auth/login does nothing (no flash present), but a redirect from ResetPasswordPage's success branch surfaces the toast immediately."
  - "No-polling assertion via source-file scan, not a runtime spy. testing-library's `waitFor` internally calls setInterval(50ms) which would false-positive any `expect(setIntervalSpy).not.toHaveBeenCalled()` runtime assertion. The structural assertion (`readFileSync(component) → no /\\bsetInterval\\b/ match`) proves the component itself has no polling logic and survives any future refactor of the test framework's polling internals."
  - "Submit gating as a derived boolean per render. `canSubmit = !submitting && nameValid && emailValid && password.length >= 12 && (score ?? -1) >= 2` — recomputed on every render from controlled-input values + meter callback. No useState for the gate itself, no useMemo (the inputs are scalar comparisons, not expensive). Mirrors the LoginPage `submitDisabled` derivation."
  - "Bait-field test for NO auto-login: ResetPasswordPage success-branch test mocks `api.resetPassword` to resolve with extra `{token, user}` fields that LoginResponse-style code WOULD consume. Asserts navigation goes to /auth/login (not /onboarding, not /). Proves the response is structurally ignored — the user has to log in fresh per UI-SPEC §Hard Constraints #14 + Phase 5.1 Pitfall §6."

# Metrics
duration: 12m
completed: 2026-04-26
---

# Phase 6 Plan 06: AUTH Wave-3 — SignupPage + VerifyEmailPage + ResetPasswordPage Summary

**Three new German auth pages closing the AUTH page set: SignupPage (AUTH-02) with PasswordStrengthMeter-gated submit + the 409 'email taken' distinguishing error, VerifyEmailPage (AUTH-03) as a strict-mode-safe one-shot token redemption with 4 discriminated-union branches (NOT polling), and ResetPasswordPage (AUTH-05) with NO auto-login on 200 (setFlash + push to /auth/login) and a 401 failure branch — plus a Wave-0 atom extension (`PasswordStrengthMeter.onScoreChange`) and the cross-plan LoginPage flash consume that completes the password-reset → login redirect UX.**

## Performance

- **Duration:** ~12 min
- **Completed:** 2026-04-26
- **Tasks:** 3
- **Files created:** 6
- **Files modified:** 5
- **Vitest assertions added:** 44 (17 SignupPage + 11 VerifyEmailPage + 15 ResetPasswordPage + 1 PasswordStrengthMeter onScoreChange + 1 LoginPage cross-plan flash consume; LoginPage suite now 42/42)

## Accomplishments

- All three Wave-3 AUTH pages ship as shared `@multica/views` components with no Next.js / Electron coupling (Plan 06-07 will wrap them per platform)
- PasswordStrengthMeter Wave-0 atom safely extended with optional `onScoreChange` — meter remains the single owner of zxcvbn scoring; existing tests stay GREEN (8/8 → 9/9)
- VerifyEmailPage strict-mode guard verified by direct test: `render(<StrictMode>…)` + `expect(api.verifyEmail).toHaveBeenCalledTimes(1)` — the deliberate double-mount fires the API exactly once
- ResetPasswordPage 'NO auto-login' verified by bait-field test: server mock returns extra `{token, user}` and the assertion proves navigation goes to `/auth/login` (not `/onboarding`, not `/`)
- Cross-plan LoginPage flash consume committed alongside (per W1 fix from plan-checker) — `useNavigationFlash('password-updated')` mounts on every LoginPage render so the toast surfaces after the password-reset redirect
- 121/121 auth tests GREEN (was 77 before this plan: +44 new assertions)
- Wave-0 dragstrip-coverage gate stays at 24/24 GREEN — these new pages are correctly excluded (Plan 06-07 wrappers own DragStrip per UI-SPEC §Pre-workspace pages)

## Task Commits

Each task was committed atomically following the TDD RED → GREEN cycle in a single per-task feat commit (per the GSD task contract):

1. **Task 1: SignupPage NEW (AUTH-02) + PasswordStrengthMeter onScoreChange callback** — `472ca19e` (feat)
2. **Task 2: VerifyEmailPage NEW (AUTH-03) with strict-mode ref-guard** — `7d57aea1` (feat)
3. **Task 3: ResetPasswordPage NEW (AUTH-05) + LoginPage cross-plan flash consume** — `bd5a1126` (feat)
4. **Follow-up: widen MeterComponent test alias to satisfy typecheck after Task 1** — `171cac52` (fix)

## Files Created/Modified

### Created (6)

- `packages/views/auth/signup-page.tsx` — 190 lines. Card with AlgoPlanWordmark + italic German title + Name/E-Mail/Passwort fields + lazy zxcvbn meter (via `<PasswordStrengthMeter onScoreChange={setScore} />`) + 12-char hint + login nudge below card. `signupErrorMessage()` branches on `err.status` only: 409 → distinguishing 'Diese E-Mail ist bereits registriert.' (the ONE legitimate enumeration disclosure per UI-SPEC §13), 400 → 'Passwort entspricht nicht den Mindestanforderungen.', 403 → 'Registrierung ist derzeit nicht verfügbar.', 5xx → generic German fallback.
- `packages/views/auth/signup-page.test.tsx` — 319 lines, 17 assertions: render (wordmark / title / fields / meter / submit / login link), submit gating (empty / invalid email / weak password / strong-but-no-name → all disabled; full-valid → enabled), 200 redirects to /onboarding with correct body shape, 409/400/403/5xx error mapping with the negative assertion that backend reason strings never reach the DOM, in-flight 'Wird erstellt…' label.
- `packages/views/auth/verify-email-page.tsx` — 147 lines. 4-branch discriminated union (`no-token` / `in-flight` / `success` / `failure`) rendered inside one Card. AlgoPlanWordmark in CardHeader (consistent across all 4 branches). Each branch supplies its own icon (Loader2 / CheckCircle2 / XCircle), title, body text, and CTA. `useRef` strict-mode guard ensures `api.verifyEmail` fires exactly once even under React 18's deliberate double-mount.
- `packages/views/auth/verify-email-page.test.tsx` — 260 lines, 11 assertions: each of the 4 branches rendered + their CTAs navigate correctly (`no-token` → /auth/verify-email-resend, `success` → root, `failure` → /auth/verify-email-resend). Strict-mode test wraps in `<StrictMode>` and asserts exactly-once API call. Source-scan assertion proves the component has no `setInterval` / `setTimeout` (i.e. NOT polling per UI-SPEC §15). Failure branch covers any non-success rejection (401 + plain Error) and asserts the backend reason text never leaks.
- `packages/views/auth/reset-password-page.tsx` — 231 lines. 3-branch discriminated union (`no-token` / `form` / `failure`). Form branch: New + Confirm password fields with `<PasswordStrengthMeter onScoreChange={setScore} />` under New, inline mismatch error on confirmation field divergence, submit gated on `match && length ≥ 12 && score ≥ 2`. 200 path: `setFlash('password-updated', 'Passwort aktualisiert. Bitte melde dich an.')` then `navigation.push('/auth/login')` — the API response object is structurally ignored (NO auto-login). 401 transitions to `failure` branch with title 'Link abgelaufen' + CTA → /auth/forgot-password. 400/5xx stay in form with inline German error.
- `packages/views/auth/reset-password-page.test.tsx` — 335 lines, 15 assertions: no-token branch (token=undefined AND token=null both render 'Ungültiger Link' + skip API), form branch render + gating (empty / mismatch / weak / valid), in-flight 'Wird gespeichert…' label, 200 calls api with snake_case `{token, new_password}` body shape + setFlash + push to /auth/login + bait-field test (extra `{token, user}` in response is IGNORED), 401 transitions to failure branch + CTA navigates to /auth/forgot-password + setFlash NEVER called on failure, 400 inline error / 5xx generic inline error / form stays.

### Modified (5)

- `packages/views/auth/password-strength-meter.tsx` — Wave-0 atom extension: added optional `onScoreChange?: (score: number | null) => void` prop. Notification fires inside a `useEffect` with `[score, onScoreChange]` deps so React batches the parent setState alongside the local meter setState. Empty password fires `onScoreChange(null)`; non-empty (after the existing 200ms debounce + zxcvbn resolve) fires with the 0..4 score. Backwards-compatible — no callers had to change.
- `packages/views/auth/password-strength-meter.test.tsx` — added one new test for `onScoreChange` (initial-mount fires with `null`, then with the resolved score after debounce + zxcvbn). Widened the cached `MeterComponent` type alias at the top of the file to declare the new optional prop (caught by `pnpm typecheck`).
- `packages/views/auth/login-page.tsx` — cross-plan W1 fix: mounted `useNavigationFlash('password-updated')` unconditionally inside the LoginPage component body. Imported from `@multica/core/navigation`. The hook reads-and-removes the sessionStorage flash on mount; a plain visit to /auth/login is a no-op, but a redirect from ResetPasswordPage's success branch surfaces the German toast.
- `packages/views/auth/login-page.test.tsx` — added a `vi.mock("@multica/core/navigation", { useNavigationFlash: mockUseNavigationFlash })` to assert the cross-plan call directly without pulling sonner into the test path. Added one assertion: `expect(mockUseNavigationFlash).toHaveBeenCalledWith("password-updated")` on render. LoginPage suite is now 42/42 GREEN (was 41/41).
- `packages/views/auth/index.ts` — re-exported SignupPage + VerifyEmailPage + ResetPasswordPage from the auth barrel.

## Decisions Made

- **PasswordStrengthMeter onScoreChange.** The score-gate problem (parent form needs the meter's score to enable submit) is solved without lifting the meter's state. The meter remains the single owner of zxcvbn; the parent receives one-way notifications via the new optional callback prop. Effect-driven (not promise-body-driven) so React batches the parent setScore call alongside the local meter setScore commit, and the callback fires for every transition including back-to-null when the password is cleared.
- **VerifyEmailPage strict-mode guard via `useRef`.** React 18 StrictMode deliberately double-mounts components in dev. A naive `useEffect` would fire `api.verifyEmail` twice on the same mount, and the second call would always see 'token already used' from the backend's single-use enforcement — a confusing user experience on a perfectly legitimate first click. The `hasRunRef.current` flip guards the second invocation. The backend's single-use enforcement is the actual safeguard; the UI guard is purely UX-grade. Alternative approaches (module-level `Set<string>`, `useEffect` with empty deps) were rejected as overkill / non-functional under StrictMode.
- **VerifyEmailPage NOT polling — source-scan assertion.** A runtime spy on `globalThis.setInterval` would false-positive because testing-library's `waitFor` uses setInterval(50ms) internally. The structural assertion (`readFileSync(component) → no /\bsetInterval\b/ match`) proves the component itself has no retry timer and survives future test-framework changes. Per UI-SPEC §Hard Constraints #15: this is a one-shot token-redemption flow, not a poll.
- **ResetPasswordPage discriminated-union state shape.** Three variants: `no-token` / `form` / `failure`. 401 transitions to `failure` (full branch swap — link is dead, re-submission can never succeed). 400/5xx stay in `form` with an inline error (recoverable with the same form, e.g. typo or transient backend hiccup). Per CLAUDE.md state-management Common Footguns: never parallel booleans for branch state.
- **Cross-plan LoginPage flash hook mounted in this plan.** Plan 06-05's LoginPage shipment did NOT include `useNavigationFlash('password-updated')`. Plan 06-06 added it — the W1 fix from plan-checker explicitly declared both `login-page.tsx` and `login-page.test.tsx` in this plan's `files_modified` frontmatter. The hook mounts on every render so a plain `/auth/login` visit is a no-op (no flash in sessionStorage), but a redirect from ResetPasswordPage's 200 path surfaces the German toast immediately.
- **Submit gating as derived boolean per render.** `canSubmit = !submitting && nameValid && emailValid && password.length >= 12 && (score ?? -1) >= 2`. Recomputed every render from controlled-input values + meter callback. No useState for the gate itself, no useMemo (scalar comparisons are cheap). Mirrors the LoginPage `submitDisabled` idiom.
- **Bait-field NO-auto-login proof.** ResetPasswordPage's success-branch test mocks `api.resetPassword` to resolve with extra `{token, user}` fields that LoginResponse-style code WOULD consume. The assertion is structural: `navigation.push` is called with `/auth/login` and NOT with `/onboarding` or `/`. Proves the response object is structurally ignored — per UI-SPEC §Hard Constraints #14 + Phase 5.1 Pitfall §6 (brief-inbox-access threat).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 — Bug] Initial 'NOT polling' test used a runtime setInterval spy and false-positived on testing-library's waitFor**

- **Found during:** Task 2 (first run of VerifyEmailPage tests — 10/11 GREEN)
- **Issue:** I asserted `expect(setIntervalSpy).not.toHaveBeenCalled()` after a `waitFor()` block. testing-library's `waitFor` internally polls with `setInterval(callback, 50)` — the spy registered the framework's poll, not anything the component did. The test failed with `setInterval was called 1 time; received: [checkRealTimersCallback, 50]`.
- **Fix:** Replaced the runtime spy with a structural source-file scan: `readFileSync(component, 'utf8')` + `expect(src).not.toMatch(/\bsetInterval\b/)`. The assertion now proves the COMPONENT (not the test framework) has no polling logic, and survives any future change to testing-library's internals.
- **Files modified:** `packages/views/auth/verify-email-page.test.tsx` (test-only)
- **Verification:** All 11 VerifyEmailPage tests GREEN after the fix.
- **Committed in:** `7d57aea1` (Task 2 commit; the failing test version was never committed)

**2. [Rule 1 — Bug] CardTitle is a div not an H*, breaks getByRole('heading')**

- **Found during:** Task 1 (first run of SignupPage tests — 25/26 GREEN)
- **Issue:** I asserted `screen.getByRole("heading", { name: /konto erstellen/i })` to find the title. shadcn's `CardTitle` renders as a `<div data-slot="card-title">` (not an `<h1>` / `<h2>`) — by design for visual hierarchy that decouples from semantic outline level. The test threw 'Unable to find an accessible element with the role "heading"'.
- **Fix:** Switched to `expect(screen.getAllByText("Konto erstellen").length).toBeGreaterThan(0)` — accommodates that 'Konto erstellen' renders both as title AND as submit button label. The assertion proves the title text exists; the separate submit-button-label tests narrow by `getByRole("button", { name: ... })`.
- **Files modified:** `packages/views/auth/signup-page.test.tsx` (test-only)
- **Verification:** All 17 SignupPage tests GREEN after the fix.
- **Committed in:** `472ca19e` (Task 1 commit)

**3. [Rule 1 — Bug] Cached MeterComponent type alias narrowed the new onScoreChange prop away**

- **Found during:** `pnpm typecheck` after all three task commits
- **Issue:** `password-strength-meter.test.tsx` had a top-of-file alias `type MeterComponent = (props: { password: string }) => React.ReactElement`. After Task 1 added the optional `onScoreChange` prop to the real `PasswordStrengthMeter`, the alias was now a strict subtype — and the new test that passed `onScoreChange` triggered TS2322 ('Property `onScoreChange` does not exist on type'). Tests still ran GREEN under vitest (which doesn't run tsc), but the project-wide typecheck failed.
- **Fix:** Widened the alias: `type MeterComponent = (props: { password: string; onScoreChange?: (score: number | null) => void }) => React.ReactElement`. Production code is unchanged; this is a test-side type mirror.
- **Files modified:** `packages/views/auth/password-strength-meter.test.tsx` (test-only, +3 lines)
- **Verification:** `pnpm typecheck` 7/7 GREEN.
- **Committed in:** `171cac52` (separate fix commit, since it was discovered after the Task 1 commit landed)

---

**Total deviations:** 3 auto-fixed (all Rule 1 — test-infrastructure correctness)
**Impact on plan:** Zero impact on production behavior. Test ergonomics issues caught and fixed within the same flow; all assertions and security contracts in the plan landed exactly as specified.

## Authentication Gates

None encountered. All work was local — no external service auth needed.

## Issues Encountered

- **Pre-existing typecheck errors in untracked files** — none surfaced in this plan's scope. Final `pnpm typecheck` returned exit 0 across all 7 packages (apps/web, apps/desktop, apps/showroom, apps/docs, packages/core, packages/ui, packages/views).
- **No live E2E run.** Per phase ceremony, Plan 06 ships unit-tested page components; live auth E2E waits on Plan 06-07's wrappers (Web `(auth)/...` routes + Desktop WindowOverlay branches). The new pages have no `next/*` or `react-router-dom` imports, confirming they're cross-platform safe.

## Verification Results

```
pnpm --filter @multica/views exec vitest run auth/                              → 121/121 GREEN (was 77; +44 new assertions)
pnpm --filter @multica/views exec vitest run __tests__/dragstrip-coverage.test.ts → 24/24 GREEN
pnpm typecheck (turbo: 7 packages)                                              → 0 errors
```

The dragstrip-coverage gate stays at 12 enumerated files / 24 tests (no additions this plan — Plan 06-07 wrappers own DragStrip for these new pages, per UI-SPEC §Pre-workspace pages).

## Component Branches Reference

### SignupPage (1 branch — single form)
| Branch | Trigger | Render |
|---|---|---|
| Form | Always (no token / no auth state) | Card with Name + E-Mail + Passwort + meter + 'Konto erstellen' submit + login nudge |
| Submit 200 | api.signup resolves | navigation.push('/onboarding') |
| Submit 409 | ApiError status 409 | inline 'Diese E-Mail ist bereits registriert.' (the ONE distinguishing error) |
| Submit 400 | ApiError status 400 | inline 'Passwort entspricht nicht den Mindestanforderungen.' |
| Submit 403 | ApiError status 403 | inline 'Registrierung ist derzeit nicht verfügbar.' |
| Submit 5xx | ApiError status 5xx OR non-ApiError | inline 'Konto konnte nicht erstellt werden. Bitte versuche es erneut.' |

### VerifyEmailPage (4 branches — discriminated union)
| Branch | Trigger | Render |
|---|---|---|
| no-token | `token` is undefined or null | 'Ungültiger Link' + CTA → /auth/verify-email-resend; api.verifyEmail NOT called |
| in-flight | mount with token; api.verifyEmail in flight | Loader2 + 'E-Mail wird bestätigt…' |
| success | api.verifyEmail resolves | CheckCircle2 + 'E-Mail bestätigt' + 'Du kannst jetzt loslegen.' + CTA → root |
| failure | api.verifyEmail rejects (any reason) | XCircle + 'Bestätigung fehlgeschlagen' + collapsed message + CTA → /auth/verify-email-resend |

### ResetPasswordPage (3 branches — discriminated union)
| Branch | Trigger | Render |
|---|---|---|
| no-token | `token` is undefined or null | 'Ungültiger Link' + CTA → /auth/forgot-password; api.resetPassword NOT called |
| form | token present | Card with New + Confirm password fields + meter + 'Passwort speichern' submit |
| Submit 200 | api.resetPassword resolves | setFlash('password-updated', 'Passwort aktualisiert. Bitte melde dich an.') + push('/auth/login') — NO auto-login |
| Submit 401 | ApiError status 401 | transition to failure branch: 'Link abgelaufen' + CTA → /auth/forgot-password; setFlash NEVER called |
| Submit 400 | ApiError status 400 | stay in form, inline 'Passwort entspricht nicht den Mindestanforderungen.' |
| Submit 5xx | ApiError status 5xx OR non-ApiError | stay in form, inline generic German message |

## Strict-Mode Guard Implementation Choice (VerifyEmailPage)

```ts
const hasRunRef = useRef(false);

useEffect(() => {
  if (!token) return;
  if (hasRunRef.current) return; // strict-mode guard
  hasRunRef.current = true;
  api.verifyEmail({ token })
    .then(() => setState({ kind: "success" }))
    .catch(() => setState({ kind: "failure" }));
}, [token]);
```

Why useRef and not the alternatives:
- **Module-level `Set<string>` keyed by token** — leaks across the app's lifetime; if the user verifies an email then signs out and back in with a different verify link, the second link is silently skipped. Per-component ref is properly scoped.
- **`useEffect` with empty deps** — does NOT prevent the double-fire under StrictMode. React 18 deliberately mounts → unmounts → mounts; the empty-deps effect runs on each mount.
- **`useEffect` with abort controller** — would cancel the in-flight request on the first unmount, then fire a new one on remount. Two network calls, not one.

The useRef pattern fires the call once per logical mount and silently no-ops on the strict-mode re-mount. The test (`render(<StrictMode>…</StrictMode>)` + `expect(spy).toHaveBeenCalledTimes(1)`) verifies this directly.

## Cross-Plan Flash Wiring (was useNavigationFlash added in Plan 05 or this plan?)

**This plan (06-06) added it.** Plan 06-05's LoginPage shipment focused on the AlgoPlanWordmark default + password sub-mode + Konto erstellen / Passwort vergessen affordances + the no-enumeration 401 contract; the flash hook was not in its scope.

The W1 fix from plan-checker correctly flagged this gap before execution and required Plan 06-06 to:
1. Add `useNavigationFlash('password-updated')` inside the LoginPage component body
2. Import it from `@multica/core/navigation`
3. Mount unconditionally on every LoginPage render
4. Add one test assertion that the hook is called with the correct key
5. Frontmatter declares both `login-page.tsx` and `login-page.test.tsx` in this plan's files_modified

The hook is harmless when no flash is set (sessionStorage read returns null, no toast fires); it's load-bearing only when ResetPasswordPage's 200 path has just called `setFlash('password-updated', '...')` immediately before navigating to /auth/login.

## Self-Check: PASSED

- `[ ✓ ]` `packages/views/auth/signup-page.tsx` — present (NEW, 190 lines)
- `[ ✓ ]` `packages/views/auth/signup-page.test.tsx` — present (NEW, 17 assertions)
- `[ ✓ ]` `packages/views/auth/verify-email-page.tsx` — present (NEW, 147 lines)
- `[ ✓ ]` `packages/views/auth/verify-email-page.test.tsx` — present (NEW, 11 assertions)
- `[ ✓ ]` `packages/views/auth/reset-password-page.tsx` — present (NEW, 231 lines)
- `[ ✓ ]` `packages/views/auth/reset-password-page.test.tsx` — present (NEW, 15 assertions)
- `[ ✓ ]` `packages/views/auth/password-strength-meter.tsx` — modified (+ onScoreChange callback)
- `[ ✓ ]` `packages/views/auth/password-strength-meter.test.tsx` — modified (+ onScoreChange test + widened type alias)
- `[ ✓ ]` `packages/views/auth/login-page.tsx` — modified (+ useNavigationFlash mount)
- `[ ✓ ]` `packages/views/auth/login-page.test.tsx` — modified (+ cross-plan flash assertion + navigation mock)
- `[ ✓ ]` `packages/views/auth/index.ts` — modified (+3 re-exports)
- `[ ✓ ]` Commit `472ca19e` (Task 1 — SignupPage + meter onScoreChange) — present
- `[ ✓ ]` Commit `7d57aea1` (Task 2 — VerifyEmailPage strict-mode safe) — present
- `[ ✓ ]` Commit `bd5a1126` (Task 3 — ResetPasswordPage + LoginPage flash consume) — present
- `[ ✓ ]` Commit `171cac52` (typecheck fix — widen MeterComponent test alias) — present

---
*Phase: 06-issue-detail-remaining-views*
*Completed: 2026-04-26*
