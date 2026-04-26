# Phase 5.1: Auth Backend Endpoints (INSERTED) - Context

**Gathered:** 2026-04-26
**Status:** Ready for planning (skipping ui-phase — backend only)
**Mode:** Auto-generated (INSERTED phase to unblock Phase 6 AUTH-02..05)
**Reason for insertion:** Phase 6 UI-CHECK identified that AUTH-02..05 (signup, password-reset request/confirm, email-verify, resend verification) require backend endpoints that don't exist. Current `server/internal/handler/auth.go` is OTP-only with no password column or reset-token machinery.

<domain>
## Phase Boundary

Add password-based auth backend endpoints (signup, password-reset request/confirm, email-verify, resend verification) to the Go server so Phase 6 can build the AUTH-02..05 frontend pages. DB schema gets `password_hash`, `email_verified_at`, and reset/verify token columns on `users`. Existing OTP login flow remains functional.

**Requirements:** AUTH-BE-01 (signup), AUTH-BE-02 (password-reset request), AUTH-BE-03 (password-reset confirm), AUTH-BE-04 (email-verify), AUTH-BE-05 (resend verification)
**Depends on:** Phase 5 (no shared frontend; pure backend insertion)
**Unblocks:** Phase 6 AUTH-02..05 + DTL-03 (separate concern, deferred)

</domain>

<decisions>
## Implementation Decisions

### Claude's Discretion
All implementation choices at Claude's discretion. Key constraints from CLAUDE.md:
- Go backend with Chi router, sqlc for DB, gorilla/websocket for real-time
- `make sqlc` regenerates code after editing SQL in `server/pkg/db/queries/`
- `make migrate-up` / `make migrate-down` for schema changes
- Standard Go conventions (gofmt, go vet)
- All queries filter by `workspace_id` (n/a for auth — pre-workspace)
- Tests via `go test`; integration tests should create their own fixture data

### Stack Choices (planner discretion)
- Password hashing: `golang.org/x/crypto/bcrypt` (cost 12)
- Reset tokens: 256-bit random + base64url; stored hashed (sha256) in DB; expires 1 hour
- Email verify tokens: 256-bit random + base64url; stored hashed; expires 24 hours
- Email delivery: existing email mechanism (likely already wired for OTP) — reuse, don't introduce new provider
- Rate limiting: per-email + per-IP for resend/reset-request endpoints

### Out of Scope
- Frontend pages (Phase 6 owns)
- OAuth providers (separate future phase)
- 2FA (separate future phase)
- Magic-link login (separate from OTP code login)

</decisions>

<code_context>
## Existing Code Insights

Codebase context will be gathered during plan-phase research. Likely touch points:
- `server/internal/handler/auth.go` — current OTP-only handler; ADD password endpoints
- `server/internal/handler/auth_test.go` — extend with new endpoint tests
- `server/pkg/db/queries/users.sql` — sqlc queries for password operations
- `server/pkg/db/migrations/` — NEW migration adding password + token columns
- `server/internal/email/` — reuse existing email send mechanism for OTP
- `server/internal/router/router.go` — wire new routes
- `packages/core/api/client.ts` — frontend client (Phase 6 will add these methods, NOT this phase)

</code_context>

<specifics>
## Specific Ideas

Success criteria from ROADMAP:

1. `POST /api/auth/signup` accepts `{email, password, name}`, hashes password (bcrypt), inserts user + sends verify email, returns session token
2. `POST /api/auth/password-reset/request` accepts `{email}`, generates time-bound reset token, sends reset email (idempotent — same response for unknown emails)
3. `POST /api/auth/password-reset/confirm` accepts `{token, newPassword}`, validates token, updates password hash, invalidates token
4. `POST /api/auth/email-verify` accepts `{token}`, marks user `email_verified_at`, invalidates token
5. `POST /api/auth/email-verify/resend` accepts `{email}`, generates new verify token, sends email (rate-limited)
6. DB migration adds `password_hash`, `email_verified_at`, `password_reset_token`, `password_reset_expires_at`, `email_verify_token`, `email_verify_expires_at` columns to `users` table
7. All endpoints have integration tests; existing OTP login flow remains functional

</specifics>

<deferred>
## Deferred Ideas

- Magic-link login (passwordless via emailed link) — separate from OTP code, separate from password
- OAuth (Google, GitHub) — separate future phase
- 2FA (TOTP, WebAuthn) — separate future phase
- Account lockout after N failed login attempts — could be added here or deferred
- Password complexity rules (min length, etc.) — planner decides during plan-phase

</deferred>
