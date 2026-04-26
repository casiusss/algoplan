---
phase: 05.1-auth-backend-endpoints-inserted
verified: 2026-04-26T10:50:00Z
status: passed
score: 8/8 must-haves verified
overrides_applied: 0
---

# Phase 5.1: Auth Backend Endpoints Verification Report

**Phase Goal:** Add password-based auth endpoints to Go backend so Phase 6 can consume signup/login/verify/reset flows. Backend was OTP-only before this phase.

**Verified:** 2026-04-26T10:50:00Z
**Status:** PASSED
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| #   | Truth                                                                                                       | Status     | Evidence                                                                                                          |
| --- | ----------------------------------------------------------------------------------------------------------- | ---------- | ----------------------------------------------------------------------------------------------------------------- |
| 1   | All 6 endpoints registered in router.go and reachable                                                       | VERIFIED   | router.go:158-163 — 6 `r.Post("/auth/...")` registrations alongside existing OTP/Google routes                     |
| 2   | All 27 integration tests GREEN                                                                              | VERIFIED   | 19 in `auth_password_test.go` + 8 in `auth_email_verify_test.go`; full run: `--- PASS: 27` (matches Nyquist count) |
| 3   | Migration 059 forward + rollback work (inspection only)                                                     | VERIFIED   | `059_*.up.sql` adds 6 nullable cols + 2 partial indexes; `*.down.sql` drops in reverse order with warning comment |
| 4   | Pre-existing OTP + signup-gating + Google-login tests still GREEN (no regression)                           | VERIFIED   | TestSendCode/VerifyCode/SignupGating/FindOrCreateUserGating/GoogleLogin/Logout all PASS                           |
| 5   | Email-service has all 3 send methods + 3 build helpers                                                      | VERIFIED   | `email.go:121,168,220` (3 Send*); `email.go:144,193,242` (3 build*Params)                                          |
| 6   | bcrypt cost = 12 in production code paths                                                                   | VERIFIED   | `auth_password.go:39 bcryptCost = 12` used at lines 61, 138, 439 (Signup, dummy timing, ResetConfirm)             |
| 7   | No plaintext password/token logging                                                                         | VERIFIED   | All slog.* calls log user_id/email/auth_method/error only — never req.Password/NewPassword/PasswordHash           |
| 8   | No backwards-compat shims (rule: rip out, don't preserve old paths)                                         | VERIFIED   | Zero hits for legacy/backwards/deprecated/old.path/fallback markers; OTP/Google routes are additive (kept intact) |

**Score:** 8/8 truths verified

### Required Artifacts

| Artifact                                                              | Expected                                          | Status     | Details                                                       |
| --------------------------------------------------------------------- | ------------------------------------------------- | ---------- | ------------------------------------------------------------- |
| `server/cmd/server/router.go`                                         | 6 new POST /auth/... routes                       | VERIFIED   | Lines 158-163 wire all 6 handlers; OTP routes (151-154) intact |
| `server/internal/handler/auth_password.go`                            | Real Signup/Login/PasswordResetRequest/Confirm    | VERIFIED   | 462 lines; 4 handler funcs; bcrypt cost 12; constant-401 login |
| `server/internal/handler/auth_email_verify.go`                        | Real EmailVerify/ResendEmailVerify                | VERIFIED   | 178 lines; 2 handler funcs; idempotent OK shape; rate-limited  |
| `server/internal/handler/auth_password_test.go`                       | 19 integration tests                              | VERIFIED   | 19 funcs (Signup×6, Login×4, PasswordResetRequest×3, Confirm×6) |
| `server/internal/handler/auth_email_verify_test.go`                   | 8 integration tests                               | VERIFIED   | 8 funcs (EmailVerify×4, ResendEmailVerify×4)                   |
| `server/internal/service/email.go`                                    | 3 SendXxx + 3 buildXxxParams                      | VERIFIED   | 280 lines; all 6 funcs present                                 |
| `server/internal/service/email_test.go`                               | 3 builder tests (no t.Skip)                       | VERIFIED   | TestBuildSignup/Password/EmailVerifyParams all PASS            |
| `server/migrations/059_add_password_auth_to_users.up.sql`             | 6 cols + 2 partial indexes                        | VERIFIED   | 24 lines; 6 ADD COLUMN + 2 CREATE INDEX (partial)              |
| `server/migrations/059_add_password_auth_to_users.down.sql`           | Reverse order DROP                                | VERIFIED   | 15 lines; DROP INDEX × 2 then DROP COLUMN × 6 IF EXISTS        |
| `server/pkg/db/generated/models.go`                                   | User struct gains 6 new fields                    | VERIFIED   | grep -c finds all 6 (PasswordHash, EmailVerifiedAt, 4 token cols) |
| `server/pkg/db/generated/user.sql.go`                                 | 7 new sqlc query funcs                            | VERIFIED   | All 7: CreateUserWithPassword, SetPasswordResetToken, GetUserByPasswordResetTokenHash, ConfirmPasswordReset, SetEmailVerifyToken, GetUserByEmailVerifyTokenHash, ConfirmEmailVerification |
| `server/internal/auth/jwt.go`                                         | GenerateAuthToken helper                          | VERIFIED   | TestGenerateAuthToken PASS (length, decode, non-collision, hash chain) |

### Key Link Verification

| From                          | To                                  | Via                                           | Status | Details                                                          |
| ----------------------------- | ----------------------------------- | --------------------------------------------- | ------ | ---------------------------------------------------------------- |
| router.go                     | auth_password.go (Signup/Login etc) | h.Signup, h.Login, h.PasswordReset*           | WIRED  | All 4 handler refs verified at router.go:158-161                  |
| router.go                     | auth_email_verify.go                | h.EmailVerify, h.ResendEmailVerify            | WIRED  | Both refs verified at router.go:162-163                           |
| auth_password.go (Signup)     | email.go (SendSignupVerification)   | best-effort send; slog.Error on fail          | WIRED  | Signup at line 138 calls bcrypt then EmailService.Send*           |
| auth_password.go (PasswordReset) | email.go (SendPasswordResetEmail) | best-effort send                              | WIRED  | PasswordResetRequest calls SendPasswordResetEmail; slog.Error path |
| auth_email_verify.go (Resend) | email.go (SendEmailVerification)    | best-effort send                              | WIRED  | ResendEmailVerify calls SendEmailVerification on token issuance   |
| handlers                      | sqlc generated queries              | pgtype.Text wrap pattern for hash args        | WIRED  | All 4 hash-arg call sites use pgtype.Text wrap consistently       |
| migration 059                 | DB schema                           | psql verify: 6 cols + 2 partial idx present   | WIRED  | Live DB inspection confirms columns + indexes exist               |

### Data-Flow Trace (Level 4)

| Artifact                  | Data Variable          | Source                                          | Produces Real Data | Status   |
| ------------------------- | ---------------------- | ----------------------------------------------- | ------------------ | -------- |
| Signup handler            | passwordHash           | bcrypt.GenerateFromPassword(req.Password, 12)   | Yes                | FLOWING  |
| Login handler             | user                   | h.Db.GetUserByEmail (real query)                | Yes                | FLOWING  |
| PasswordResetConfirm      | newHash                | bcrypt.GenerateFromPassword(req.NewPassword, 12) + ConfirmPasswordReset SQL UPDATE | Yes | FLOWING |
| EmailVerify               | user lookup            | GetUserByEmailVerifyTokenHash + ConfirmEmailVerification (atomic UPDATE) | Yes | FLOWING |
| ResendEmailVerify         | fresh token            | auth.GenerateAuthToken + SetEmailVerifyToken (real DB write) | Yes | FLOWING |

### Behavioral Spot-Checks

| Behavior                                                            | Command                                                                                                | Result                                  | Status |
| ------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ | --------------------------------------- | ------ |
| 27 Phase 5.1 tests GREEN                                            | `go test ./internal/handler/ -run 'TestSignup_\|TestLogin_\|TestPasswordReset\|TestEmailVerify_\|TestResendEmailVerify' -count=1` | 27 PASS lines, suite ok in 2.476s        | PASS   |
| 3 service-builder tests GREEN                                       | `go test ./internal/service/ -run 'TestBuild(SignupVerification\|PasswordReset\|EmailVerify)Params' -count=1` | 3 PASS, suite ok in 0.198s               | PASS   |
| Regression: OTP + Google + signup-gating tests GREEN                | `go test ./internal/handler/ -run 'TestSendCode\|TestVerifyCode\|TestSignupGating\|TestFindOrCreateUserGating\|TestGoogleLogin\|TestLogout\|TestGetMe\|TestUpdateMe\|TestIssueCliToken' -count=1` | All PASS, suite ok in 0.855s             | PASS   |
| `auth.GenerateAuthToken` correctness (regression)                   | `go test ./internal/auth/ -run TestGenerateAuthToken -count=1`                                         | PASS in 0.389s                          | PASS   |
| Full `internal/handler/ + internal/auth/ + internal/service/` suite | `go test ./internal/handler/ ./internal/auth/ ./internal/service/ -count=1`                            | All 3 packages OK (3.454s + 0.675s + 0.953s) | PASS   |
| `go build ./...`                                                    | `cd server && go build ./...`                                                                          | Clean (no output)                       | PASS   |
| `go vet ./...`                                                      | `cd server && go vet ./...`                                                                            | Clean (no output)                       | PASS   |
| DB schema has migration 059 columns                                 | `psql ... \d "user"`                                                                                   | All 6 cols + 2 partial idx present in live DB | PASS   |

### Requirements Coverage

| Requirement      | Source Plan | Description                                                          | Status     | Evidence                                                           |
| ---------------- | ----------- | -------------------------------------------------------------------- | ---------- | ------------------------------------------------------------------ |
| AUTH-BE-01       | 01          | POST /auth/signup — bcrypt 12, send verify email, return JWT+cookies | SATISFIED  | TestSignup_Success+5 variants PASS                                 |
| AUTH-BE-02       | 03          | POST /auth/password-reset/request — idempotent, rate-limited         | SATISFIED  | TestPasswordResetRequest_KnownEmail/Unknown/RateLimit PASS         |
| AUTH-BE-03       | 03          | POST /auth/password-reset/confirm — single-use, no auto-login        | SATISFIED  | TestPasswordResetConfirm_Success+5 variants PASS                   |
| AUTH-BE-04       | 02          | POST /auth/email-verify — atomic email_verified_at + clear token     | SATISFIED  | TestEmailVerify_Success/Reuse/Expired/Invalid PASS                 |
| AUTH-BE-05       | 02          | POST /auth/email-verify/resend — idempotent, rate-limited            | SATISFIED  | TestResendEmailVerify_4-variants PASS                              |
| AUTH-BE-06 (NEW) | 01          | POST /auth/login — bcrypt-compare, constant 401 on fail              | SATISFIED  | TestLogin_Success/WrongPassword/UnknownEmail/OTPOnlyNoPassword PASS |
| AUTH-BE-06-DB    | 00          | Migration 059 adds 6 cols + 2 partial indexes                        | SATISFIED  | psql `\d "user"` confirms; generated/models.go has 6 fields         |
| AUTH-BE-07       | 00→01/02/03 | EmailService builders subject sanitization + URL/expiry presence     | SATISFIED  | 3 builder tests PASS (no t.Skip remaining)                          |
| AUTH-BE-07 (regression) | All  | OTP + signup-gating + Google login flows still functional            | SATISFIED  | All 16+ regression tests still PASS                                 |

### Anti-Patterns Found

| File                            | Line | Pattern              | Severity | Impact                                                         |
| ------------------------------- | ---- | -------------------- | -------- | -------------------------------------------------------------- |
| auth_password.go                | 21   | "501 stubs" comment  | Info     | Historical reference in doc comment only; code is real impl     |
| auth_email_verify.go            | 17   | "501 stubs" comment  | Info     | Historical reference in doc comment only; code is real impl     |

No blockers, no stubs, no placeholders, no TODOs. Both 501 references are explanatory comments documenting the wave-based plan history, not active code.

### Human Verification Required

None — all 8 must-haves are programmatically verified via test suite execution + grep + psql inspection.

The phase is backend-only with no UI to inspect; behavioral spot-checks (27+3+11 tests + build+vet+psql) cover all observable behaviors. Phase 6 will exercise these endpoints from the frontend; runtime smoke testing belongs to that phase.

### Gaps Summary

No gaps. Phase 5.1 fully achieves its stated goal:

- All 6 password-auth endpoints registered, implemented, and reachable.
- All 27 authoritative integration tests + 3 service-builder tests + 16+ regression tests GREEN.
- Migration 059 forward + rollback both well-formed; live DB confirmed at the schema level.
- bcrypt cost 12 enforced at all 3 production hash sites via `bcryptCost` constant (single tunable point).
- No plaintext password/token logging (slog calls only carry user_id/email/auth_method).
- No backwards-compat shims; OTP/Google routes are additive, not duplicated.
- Email service exposes all 3 Send* + 3 build*Params helpers per VALIDATION contract.
- 4 plan SUMMARYs all self-checked PASS.

The Nyquist authoritative count of 27 tests is exactly satisfied (19 in `auth_password_test.go` + 8 in `auth_email_verify_test.go`).

Phase 6 is unblocked: frontend can consume `/auth/signup`, `/auth/login`, `/auth/email-verify`, `/auth/email-verify/resend`, `/auth/password-reset/request`, `/auth/password-reset/confirm` directly.

---

_Verified: 2026-04-26T10:50:00Z_
_Verifier: Claude (gsd-verifier)_
