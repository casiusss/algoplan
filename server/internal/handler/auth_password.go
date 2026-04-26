package handler

import "net/http"

// auth_password.go contains the password-based auth handlers for Phase 5.1.
// Plan 00 ships these as 501 stubs to lock in the route surface and avoid
// router.go merge conflicts between Plans 01/02/03. Plans 01 and 03 replace
// the bodies with real logic; signatures must remain stable.

// Signup handles POST /auth/signup.
// Plan 01 implements: validate, bcrypt-hash password, create user with
// email-verify token, send signup-verify email, issue JWT + cookies.
func (h *Handler) Signup(w http.ResponseWriter, r *http.Request) {
	writeError(w, http.StatusNotImplemented, "not implemented")
}

// Login handles POST /auth/login.
// Plan 01 implements: lookup by email, bcrypt.CompareHashAndPassword,
// issue JWT + cookies. Returns 401 for unknown email AND wrong password
// (no enumeration).
func (h *Handler) Login(w http.ResponseWriter, r *http.Request) {
	writeError(w, http.StatusNotImplemented, "not implemented")
}

// PasswordResetRequest handles POST /auth/password-reset/request.
// Plan 03 implements: lookup user, rate-limit, generate reset token,
// store hash + 1h expiry, send reset email. Idempotent response shape
// regardless of email existence.
func (h *Handler) PasswordResetRequest(w http.ResponseWriter, r *http.Request) {
	writeError(w, http.StatusNotImplemented, "not implemented")
}

// PasswordResetConfirm handles POST /auth/password-reset/confirm.
// Plan 03 implements: hash incoming token, lookup user via
// GetUserByPasswordResetTokenHash, validate password strength,
// bcrypt-hash new password, atomically clear reset token. Does NOT
// auto-login (no token in body, no Set-Cookie).
func (h *Handler) PasswordResetConfirm(w http.ResponseWriter, r *http.Request) {
	writeError(w, http.StatusNotImplemented, "not implemented")
}
