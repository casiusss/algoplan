---
phase: 05.1-auth-backend-endpoints-inserted
reviewed: 2026-04-26T00:00:00Z
depth: standard
files_reviewed: 11
files_reviewed_list:
  - server/migrations/059_add_password_auth_to_users.up.sql
  - server/migrations/059_add_password_auth_to_users.down.sql
  - server/pkg/db/queries/user.sql
  - server/internal/auth/jwt.go
  - server/internal/auth/jwt_test.go
  - server/internal/handler/auth_password.go
  - server/internal/handler/auth_email_verify.go
  - server/internal/handler/auth_password_test.go
  - server/internal/handler/auth_email_verify_test.go
  - server/internal/service/email.go
  - server/internal/service/email_test.go
findings:
  critical: 0
  high: 1
  medium: 4
  low: 6
  total: 11
status: issues_found
---

# Phase 5.1: Code Review Report — Auth Backend Endpoints

**Reviewed:** 2026-04-26
**Depth:** standard
**Files Reviewed:** 11
**Status:** issues_found

## Summary

Phase 5.1 adds six password-based auth endpoints (signup, login, password-reset request/confirm, email-verify, resend) to the Go backend. The implementation is **strong on security fundamentals**: bcrypt cost 12, SHA-256-hashed token storage, parameterized sqlc queries, constant-401 messages, dummy-bcrypt timing equalization on Login, deterministic clock-skew-resistant rate limiting, and idempotent 200 responses on enumeration-sensitive endpoints. HTML escaping is applied as defense-in-depth in the email body builders even though tokens come from server CSPRNG.

The design correctly resists email enumeration via response-shape uniformity and pays the timing cost up front (one-time `init()` bcrypt) rather than per-request. Single-use token semantics are enforced at the SQL layer via atomic `UPDATE … RETURNING`, not by app-level flags. Tests cover the spec well: 27 handler tests across 6 endpoints + 3 email-builder tests + 1 token helper test.

A handful of medium-severity issues should be addressed before this ships behind a public URL, the most notable being **no request body size limit** (DoS via huge JSON), an **unused/dead helper** (`gatedSignupHandler`'s `Config{AllowSignup:false}` setting interacts oddly with the test suite — verified, but flagging for documentation), and a **timing leak** on Login that distinguishes "DB error" (no bcrypt run) from "valid email" (bcrypt run). Also: the Signup path does not equalize timing the same way Login does, so a Signup probe against an existing email returns 409 *before* bcrypt runs while a fresh email pays the bcrypt cost.

## High

### HI-01: No `http.MaxBytesReader` cap on request bodies for any of the new auth endpoints

**Files:** `server/internal/handler/auth_password.go:91-93, 204-206, 305-307, 400-402`, `server/internal/handler/auth_email_verify.go:41-43, 115-117`
**Issue:** All six handlers decode JSON directly via `json.NewDecoder(r.Body).Decode(&req)` without bounding the request body. An unauthenticated client can POST a multi-megabyte JSON document — the decoder will allocate proportionally before the password-length check rejects it. Combined with the per-request bcrypt cost (~250ms on Signup/Login/PasswordResetConfirm), this is an asymmetric DoS vector: cheap for the attacker, expensive for the server. The `maxPasswordBytes = 72` check in Signup happens *after* the entire body has been parsed, and string fields (`name`, `email`) have no length cap at all.

**Fix:**
```go
const maxAuthRequestBody = 16 * 1024 // 16 KiB is plenty for {email, password, name}

func (h *Handler) Signup(w http.ResponseWriter, r *http.Request) {
    r.Body = http.MaxBytesReader(w, r.Body, maxAuthRequestBody)
    var req SignupRequest
    if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
        writeError(w, http.StatusBadRequest, "invalid request body")
        return
    }
    // ... existing logic
}
```
Apply to all six handlers. Also consider explicit length caps on `email` (RFC 5321 says ≤254) and `name` (e.g., 200 bytes) before processing — defends against pathological inputs that pass JSON validation but bloat downstream logging / DB insertion.

## Medium

### ME-01: Login timing leak — DB error path skips bcrypt; unknown-email paths pay it

**File:** `server/internal/handler/auth_password.go:224-247`
**Issue:** Login does the right thing for `isNotFound(err)` and the NULL-`password_hash` branch (both call `bcrypt.CompareHashAndPassword(dummyBcryptHashForTiming, …)` to equalize timing), **but** the `else` branch on line 232 (`failed to lookup user` — i.e., a real DB error) returns 500 immediately without running bcrypt. While DB errors should be rare, an attacker who can induce them (e.g., by hitting a specific email pattern that triggers a slow query, or during a partial DB outage) gets a strong timing/status signal. More relevantly, the DB-error → 500 path itself is an enumeration vector independent of bcrypt: it tells the attacker "this email caused a DB issue" vs the constant-401 silence on every other path.

Additionally, the `len(req.Password) > maxPasswordBytes` short-circuit on line 219-222 returns 401 *without* running bcrypt, so a too-long password against an existing email is fast (~microseconds) while a normal-length password against an unknown email is slow (~250ms). A timing probe with a 73-byte password vs a 12-byte password trivially distinguishes the two cases.

**Fix:** Run the dummy bcrypt on every error path that doesn't already bcrypt-compare, including the too-long-password short-circuit:
```go
if len(req.Password) > maxPasswordBytes {
    _ = bcrypt.CompareHashAndPassword(dummyBcryptHashForTiming, []byte(req.Password[:maxPasswordBytes]))
    writeError(w, http.StatusUnauthorized, invalidLoginMessage)
    return
}
// ... and on the DB-error 500 path, same dummy bcrypt before responding.
```
Acknowledge in a comment that perfect timing equalization on a network endpoint is impossible — but distinguishable order-of-magnitude differences (microseconds vs hundreds of milliseconds) are worth closing.

### ME-02: Signup leaks "email exists" in <100ms while the success path takes ~250ms

**File:** `server/internal/handler/auth_password.go:130-136`
**Issue:** Signup's existing-email check happens *before* bcrypt:
```go
if _, err := h.Queries.GetUserByEmail(...); err == nil {
    writeError(w, http.StatusConflict, "email already registered")  // fast: ~ms
    return
}
// ... then 250ms of bcrypt for the success path
```
The strict 409 is intentional (per Open Q §5), but combined with the timing differential it makes Signup a one-shot email-enumeration oracle: response time alone tells the attacker whether the address is registered. This is partially compensated by the 409 being explicit anyway (no enumeration via response code), but for an environment where signup is gated and the attacker shouldn't even be able to get a 409 (because the gating returns 403 first), the timing channel becomes the leak.

**Fix:** Either accept this as-is and document it (the 409 already leaks the same information explicitly), OR run a dummy bcrypt on the conflict path so timing is roughly equal:
```go
if _, err := h.Queries.GetUserByEmail(r.Context(), email); err == nil {
    _ = bcrypt.CompareHashAndPassword(dummyBcryptHashForTiming, []byte(req.Password))
    writeError(w, http.StatusConflict, "email already registered")
    return
}
```
Recommend the timing fix because Signup's 403 (gating) path can hide the email-exists check entirely when gating is on, but a timing probe still distinguishes "would have been 409" from "would have been 200".

### ME-03: `EmailVerify` does not include `RequestAttrs(r)` in the success log; sibling handlers do

**File:** `server/internal/handler/auth_email_verify.go:70`
**Issue:** Compare the two log lines:
```go
// auth_email_verify.go:70
slog.Info("email verified", "user_id", ..., "email", user.Email)

// auth_password.go:184 (Signup), :257 (Login), :458 (PasswordResetConfirm)
slog.Info("...", append(logger.RequestAttrs(r), "user_id", ..., "email", ...)...)
```
The EmailVerify success log is missing the request context (request ID, IP, user-agent) that every other auth event in this phase records. This makes it impossible to correlate an email-verification event with the originating request when investigating abuse (e.g., a token-stuffing attack from a single IP that succeeds). The DRY violation is also a code-smell: every other auth log uses the same prefix.

**Fix:**
```go
slog.Info("email verified",
    append(logger.RequestAttrs(r), "user_id", uuidToString(user.ID), "email", user.Email)...)
```

### ME-04: Email logging on send-failure may write user emails to logs at info level — verify policy

**Files:** `server/internal/handler/auth_password.go:168, 361`, `server/internal/handler/auth_email_verify.go:174`
**Issue:** All three best-effort email-send failures log the recipient email at `slog.Error` level:
```go
slog.Error("failed to send signup verification", "email", email, "error", err)
```
This is fine if your log retention / log destination is treated as PII-equivalent (and CLAUDE.md doesn't currently mandate otherwise), but it's worth confirming: an OWASP-compliant audit log policy would either redact the local-part (`u***@example.com`), hash it, or restrict log access. The same email-as-log-attribute pattern appears in the success-path logs (Signup, Login, PasswordResetConfirm) and matches the existing OTP handler convention in `auth.go`, so this isn't a new violation — but Phase 5.1 *adds* three new email-attribute log sites and is a good moment to decide whether this is policy.

**Fix:** Document the policy in CLAUDE.md (or `docs/security/`) explicitly: either "user email may appear in server logs" (current behavior) or "redact local-part of email in logs". If redaction is the chosen policy, add a `logger.RedactEmail(email)` helper and use it in all six new log sites.

## Low

### LO-01: `dummyBcryptHashForTiming` panic on init blocks server startup if bcrypt fails — acceptable but undocumented

**File:** `server/internal/handler/auth_password.go:60-66`
**Issue:** The `init()` `panic` is correct (the precomputed hash is required for Login timing equalization, and a failure here would silently disable a security control), but it's not surfaced in the function's doc comment. A reader has to scan all the way down to `init()` to discover this.

**Fix:** Add to the `dummyBcryptHashForTiming` comment block: "Initialized once in init(); panics if bcrypt itself is broken (which would also break every Signup, so the panic is the right failure mode)."

### LO-02: `passwordResetRequestOKMessage` wording leaks the rate-limit branch

**File:** `server/internal/handler/auth_password.go:289, 336`
**Issue:** The 429 response body is `"please wait before requesting another reset"` but the success body is `"If an account exists for this email, a reset link has been sent."` Per the comment on line 286-288, the design intent is "Same shape regardless of state — defeats email-existence enumeration via response inspection." The 429 violates that intent: it implies the email *does* exist (otherwise there'd be nothing to rate-limit on). An attacker can probe an email address, then probe again immediately — if the second response is 429 the email exists, if it's 200 the email is unknown.

**Fix:** Either suppress the 429 (collapse to a constant 200 with the same message even when rate-limited — the user gets confused but the enumeration channel closes) OR accept this as a known limitation and document it in the open-question log. The same comment applies to `ResendEmailVerify` at line 152.

### LO-03: `dummyBcryptHash` test constant uses bcrypt cost 12 instead of cost 4 — slow tests on fixture insertion

**File:** `server/internal/handler/auth_password_test.go:40`
**Issue:** `dummyBcryptHash` is a hard-coded cost-12 hash used by `resetUserWithToken` and `verifyUserWithToken` to seed `password_hash NOT NULL` rows. It's not bcrypt-compared in those tests (the test path doesn't go through Login), so cost is irrelevant for runtime correctness — but the comment on line 36-39 says "Plan 01 will replace this with a per-test bcrypt.GenerateFromPassword call so scaffolds and real bcrypt comparisons stay in sync." That replacement didn't happen. The static cost-12 hash is fine functionally, but the comment is stale.

**Fix:** Either delete the stale comment, or replace `dummyBcryptHash` with a `var dummyBcryptHash = mustHash("PlaceholderForRedScaffold!")` initialized once at package level using `bcrypt.MinCost`. The latter keeps `TestPasswordResetConfirm_Success`'s "old password no longer logs in" assertion (line 449-455) honest — currently that assertion can't actually compare against the old password because `dummyBcryptHash` doesn't match the `signupTestUser` cost-4 hash; check that the test passes for the right reason.

### LO-04: `auth_password.go` `slog.Warn` on cookie-set failure could swallow real errors

**Files:** `server/internal/handler/auth_password.go:181, 255`
**Issue:**
```go
if err := auth.SetAuthCookies(w, tokenString); err != nil {
    slog.Warn("failed to set auth cookies", "error", err)
}
```
The handler proceeds to write the 200 response anyway, so a user who *should* be logged in by cookie but fails the cookie set silently gets a JWT in the body but no session cookie. The response is still successful (HTTP 200, JWT in body), so a JS frontend can fall back to header-based auth — but a server-rendered or cookie-only client (e.g., the desktop app's webview) will appear to "successfully sign up" and then immediately fail the next request. Since `SetAuthCookies` errors are extremely rare (only fails on misconfigured `SameSite=None` without `Secure` per `cookie.go`), this is low priority — but the silent-degradation pattern is a footgun for whoever debugs it next.

**Fix:** Either return 500 on cookie-set failure (cleaner contract, breaks header-only clients) OR add a response header like `X-Auth-Cookies-Set: false` that the frontend can branch on. At minimum, escalate the log level from `Warn` to `Error` since this represents a partial auth-flow failure.

### LO-05: `EmailVerify` does not enforce a per-user/IP rate limit on the verify endpoint itself

**File:** `server/internal/handler/auth_email_verify.go:41-75`
**Issue:** The `ResendEmailVerify` endpoint has a 60s per-email cooldown, but `EmailVerify` (which actually consumes the token) has no rate limit at all. An attacker who has somehow obtained a token-prefix can brute-force the remaining bytes via repeated POSTs — though the 256-bit token entropy makes this infeasible in practice (43 base64url chars, 2^256 search space), defense-in-depth would still rate-limit the endpoint. Per Open Q §1 ("per-IP rate limiting is out of scope for Phase 5.1"), this is intentional and accepted; flagging as Low so it lands in the followup tracker.

**Fix:** Out of scope per Open Q §1. Re-evaluate when per-IP rate limiting lands (Phase 6+). Document on the EmailVerify handler that intentional brute-force resistance is delegated to token entropy alone.

### LO-06: SQL migration adds three tokens columns with no `NOT NULL` constraint and no comment column for audit

**File:** `server/migrations/059_add_password_auth_to_users.up.sql`
**Issue:** The columns are correctly nullable (existing OTP/Google users have NULL `password_hash`), but `password_reset_expires_at` and `email_verify_expires_at` lack `CHECK (… > created_at)` constraints. This is fine because all writes go through sqlc-generated code that always sets `now() + window`, but a future ad-hoc UPDATE could plant a backwards expiry. Also: there's no `password_changed_at` column, which is the documented follow-up for JWT invalidation per Open Q §2 — reserving the column name now (even as nullable) would save a migration later.

**Fix:** Optional; both are deferrable to a follow-up migration. If addressed now:
```sql
ALTER TABLE "user"
  ADD CONSTRAINT password_reset_expiry_in_future
    CHECK (password_reset_expires_at IS NULL OR password_reset_expires_at > created_at),
  ADD CONSTRAINT email_verify_expiry_in_future
    CHECK (email_verify_expires_at IS NULL OR email_verify_expires_at > created_at);
```
Skip if you prefer to ship the smaller migration now and add constraints in a Phase 6 migration alongside `password_changed_at`.

---

## Findings Summary

| Severity | Count |
|----------|-------|
| Critical | 0 |
| High     | 1 |
| Medium   | 4 |
| Low      | 6 |
| **Total**| **11** |

**Strengths confirmed:**
- bcrypt cost 12 (OWASP-aligned), 12-72 byte length cap pre-bcrypt
- SHA-256-hashed token storage (plaintext only in email)
- Constant 401 wording across all login failure modes
- Dummy bcrypt timing equalization on unknown-email + NULL-password-hash paths
- Idempotent 200 responses on PasswordResetRequest + ResendEmailVerify success/unknown/already-verified
- Deterministic rate-limit clock (issuedAt = expiresAt - issuanceWindow) — clock-skew-resistant
- HTML-escaped URLs in email bodies (defense-in-depth)
- All sqlc-generated queries are parameterized — no SQL injection surface
- Atomic single-statement UPDATEs enforce single-use tokens at SQL layer
- Email-send failures logged but non-blocking (no rollback, no enumeration)
- No password ever logged or returned in any response body
- No auto-login after PasswordResetConfirm (test enforced)
- 27 handler tests + 3 email-builder tests + 1 token-helper test = strong coverage

**Recommended priority for fixes:**
1. **HI-01** (request body size cap) — ship before public exposure
2. **ME-01, ME-02** (timing equalization) — close before public exposure
3. **ME-03** (log attrs consistency) — cheap, do now
4. **ME-04** (PII-in-logs policy) — decide and document
5. Low-severity items can land as a followup batch

---

_Reviewed: 2026-04-26_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_

---

## Review Resolution (2026-04-26)

| Finding | Status   | Commit     | Notes |
|---------|----------|------------|-------|
| HI-01   | RESOLVED | `633c2bee` | All 6 auth handlers wrap `r.Body` with `http.MaxBytesReader(w, r.Body, 16*1024)` before `json.NewDecoder`. |
| ME-01   | RESOLVED | `6fce89db` | Login now runs `bcrypt.CompareHashAndPassword(dummyBcryptHashForTiming, …)` on both the too-long-password 401 short-circuit and the DB-error 500 path. |
| ME-02   | RESOLVED | `df36a5d8` | Signup now runs the dummy bcrypt on the duplicate-email 409 and the DB-error 500 paths. Closes the gating-bypass timing channel under `AllowSignup=false`. |
| ME-03   | RESOLVED | `f4860412` | EmailVerify success log prepends `logger.RequestAttrs(r)`, matching Signup / Login / PasswordResetConfirm convention. |
| ME-04   | DEFERRED | —          | PII-in-logs policy needs explicit user decision (redact local-part vs accept current behaviour). Tracked separately; will land alongside CLAUDE.md / docs/security policy update. |
| LO-01 — LO-06 | OUT OF SCOPE | — | Low-severity items batched for a follow-up pass; none block Phase 5.1 shipping. |

**Verification:** Full Phase 5.1 handler suite remains 27/27 GREEN
(`go test ./internal/handler/ -run "TestSignup_|TestLogin_|TestPasswordReset|TestEmailVerify_|TestResendEmailVerify_" -v -count=1`).
`TestSignup_Conflict` runtime moved from ~10ms to ~230ms — confirms the
ME-02 dummy bcrypt is now executing on the conflict path.

_Resolved: 2026-04-26_
_Fixer: Claude (gsd-code-fixer)_
