package handler

import "net/http"

// auth_email_verify.go contains the email verification handlers for
// Phase 5.1. Plan 00 ships these as 501 stubs to lock in the route
// surface and avoid router.go merge conflicts between Plans 01/02/03.
// Plan 02 replaces the bodies with real logic; signatures must remain
// stable so test scaffolds in auth_email_verify_test.go bind to the
// final implementation without churn.
//
// Routes mounted in server/cmd/server/router.go (do not re-mount here):
//   POST /auth/email-verify         → EmailVerify
//   POST /auth/email-verify/resend  → ResendEmailVerify

// EmailVerify handles POST /auth/email-verify. Public endpoint — the
// token IS the auth. Plan 02 implements: decode {token}, hash via
// auth.HashToken, lookup via Queries.GetUserByEmailVerifyTokenHash
// (which filters by expires_at > now()), then call
// Queries.ConfirmEmailVerification to set email_verified_at and clear
// the verify token columns atomically. Returns 200 with the updated
// UserResponse on success, 401 on invalid/expired/reused tokens.
func (h *Handler) EmailVerify(w http.ResponseWriter, r *http.Request) {
	writeError(w, http.StatusNotImplemented, "not implemented")
}

// ResendEmailVerify handles POST /auth/email-verify/resend. Public
// endpoint with idempotent response shape (200 regardless of email
// existence or verification state, to prevent enumeration). Plan 02
// implements: decode {email}, lookup user, skip if already verified,
// enforce per-email 60s rate limit (DB-backed via the stored
// email_verify_expires_at timestamp), generate a fresh
// auth.GenerateAuthToken, store its hash with 24h expiry via
// Queries.SetEmailVerifyToken, then call EmailService.SendEmailVerification.
// Returns 200 always; 429 on rate limit; 400 on missing email.
func (h *Handler) ResendEmailVerify(w http.ResponseWriter, r *http.Request) {
	writeError(w, http.StatusNotImplemented, "not implemented")
}
