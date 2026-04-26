package handler

import "net/http"

// auth_email_verify.go contains the email verification handlers for
// Phase 5.1. Plan 00 ships these as 501 stubs to lock in the route
// surface and avoid router.go merge conflicts between Plans 01/02/03.
// Plan 02 replaces the bodies with real logic; signatures must remain
// stable.

// EmailVerify handles POST /auth/email-verify.
// Plan 02 implements: hash incoming token, lookup user via
// GetUserByEmailVerifyTokenHash, call ConfirmEmailVerification.
// Public endpoint — the token IS the auth.
func (h *Handler) EmailVerify(w http.ResponseWriter, r *http.Request) {
	writeError(w, http.StatusNotImplemented, "not implemented")
}

// ResendEmailVerify handles POST /auth/email-verify/resend.
// Plan 02 implements: lookup user, skip if already verified,
// rate-limit per email, generate fresh token, store hash + 24h expiry,
// send verify email. Idempotent response shape.
func (h *Handler) ResendEmailVerify(w http.ResponseWriter, r *http.Request) {
	writeError(w, http.StatusNotImplemented, "not implemented")
}
