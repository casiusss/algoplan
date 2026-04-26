package handler

import (
	"encoding/json"
	"log/slog"
	"net/http"
	"strings"
	"time"

	"github.com/jackc/pgx/v5/pgtype"

	"github.com/multica-ai/multica/server/internal/auth"
	db "github.com/multica-ai/multica/server/pkg/db/generated"
)

// auth_email_verify.go contains the email verification handlers for
// Phase 5.1. Plan 00 shipped these as 501 stubs to lock in the route
// surface and avoid router.go merge conflicts between Plans 01/02/03.
// Plan 02 replaces the bodies with real logic.
//
// Routes mounted in server/cmd/server/router.go (do not re-mount here):
//   POST /auth/email-verify         → EmailVerify
//   POST /auth/email-verify/resend  → ResendEmailVerify

// EmailVerifyRequest is the body of POST /auth/email-verify.
type EmailVerifyRequest struct {
	Token string `json:"token"`
}

// EmailVerify handles POST /auth/email-verify. Public endpoint — the
// token IS the auth.
//
// Flow: decode {token}, hash via auth.HashToken, lookup via
// Queries.GetUserByEmailVerifyTokenHash (which filters by
// expires_at > now() server-side, so expired tokens collapse to
// ErrNoRows), then call Queries.ConfirmEmailVerification to set
// email_verified_at and clear the verify token columns atomically.
//
// Returns 200 + updated UserResponse on success, 401 on
// invalid / expired / reused tokens.
func (h *Handler) EmailVerify(w http.ResponseWriter, r *http.Request) {
	var req EmailVerifyRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	if strings.TrimSpace(req.Token) == "" {
		writeError(w, http.StatusBadRequest, "token is required")
		return
	}

	tokenHash := auth.HashToken(req.Token)
	user, err := h.Queries.GetUserByEmailVerifyTokenHash(r.Context(),
		pgtype.Text{String: tokenHash, Valid: true})
	if err != nil {
		if isNotFound(err) {
			writeError(w, http.StatusUnauthorized, "invalid or expired token")
			return
		}
		writeError(w, http.StatusInternalServerError, "failed to validate token")
		return
	}

	updated, err := h.Queries.ConfirmEmailVerification(r.Context(), user.ID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to verify email")
		return
	}

	slog.Info("email verified", "user_id", uuidToString(user.ID), "email", user.Email)
	writeJSON(w, http.StatusOK, map[string]any{
		"message": "Email verified.",
		"user":    userToResponse(updated),
	})
}

// ResendEmailVerifyRequest is the body of POST /auth/email-verify/resend.
type ResendEmailVerifyRequest struct {
	Email string `json:"email"`
}

// emailVerifyIssuanceWindow is the lifetime stamped into
// email_verify_expires_at when issuing a token. The handler uses this
// constant to reconstruct the issuance timestamp for rate-limit
// comparisons (the only column we have on disk is the expiry, but
// because we always set expiry = now + window, issuedAt is just
// expiry - window — deterministic, no clock-skew sensitivity).
const emailVerifyIssuanceWindow = 24 * time.Hour

// emailVerifyResendCooldown is the minimum time between two resend
// attempts for the same email. Per-email rate limit; per-IP is out of
// scope for Phase 5.1 (Open Q §1, accepted).
const emailVerifyResendCooldown = 60 * time.Second

// resendEmailVerifyOKMessage is the canonical response body for ALL
// success paths (unknown email, already verified, fresh token issued).
// Same shape regardless of state — defeats email-existence and
// verification-state enumeration via response inspection.
const resendEmailVerifyOKMessage = "If an account exists, a new verification link has been sent."

// ResendEmailVerify handles POST /auth/email-verify/resend. Public
// endpoint with idempotent response shape: 200 returned regardless of
// whether the email exists, whether the user is already verified, or
// whether a new token was actually written. Only failure modes that
// indicate a malformed request (400) or DB outage (500) leak.
//
// Flow: decode {email}, lookup user. If unknown OR already verified,
// return 200 without touching the DB (no enumeration). Otherwise check
// the per-email 60s cooldown by reconstructing issuedAt from
// email_verify_expires_at - emailVerifyIssuanceWindow; if too recent,
// return 429. Otherwise generate a fresh auth.GenerateAuthToken, store
// its hash with 24h expiry via Queries.SetEmailVerifyToken, then call
// EmailService.SendEmailVerification (best-effort; email-send failures
// are logged but do not change the 200 response).
func (h *Handler) ResendEmailVerify(w http.ResponseWriter, r *http.Request) {
	var req ResendEmailVerifyRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	email := strings.ToLower(strings.TrimSpace(req.Email))
	if email == "" {
		writeError(w, http.StatusBadRequest, "email is required")
		return
	}

	user, err := h.Queries.GetUserByEmail(r.Context(), email)
	if err != nil {
		if isNotFound(err) {
			// Unknown email — no DB write, same response shape.
			writeJSON(w, http.StatusOK, map[string]string{"message": resendEmailVerifyOKMessage})
			return
		}
		writeError(w, http.StatusInternalServerError, "failed to lookup user")
		return
	}

	// Already verified — no work, same response shape (no enumeration of verification state).
	if user.EmailVerifiedAt.Valid {
		writeJSON(w, http.StatusOK, map[string]string{"message": resendEmailVerifyOKMessage})
		return
	}

	// Rate limit: 60s per email. Reconstruct the issuance timestamp from
	// the expiry minus the known issuance window, then compare elapsed
	// time to the cooldown. This is deterministic — no `time.Until`
	// against a far-future expiry, no clock-skew sensitivity at the
	// minute boundary (W5 fix).
	if user.EmailVerifyExpiresAt.Valid {
		issuedAt := user.EmailVerifyExpiresAt.Time.Add(-emailVerifyIssuanceWindow)
		if time.Since(issuedAt) < emailVerifyResendCooldown {
			writeError(w, http.StatusTooManyRequests, "please wait before requesting another email")
			return
		}
	}

	verifyToken, err := auth.GenerateAuthToken()
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to generate token")
		return
	}
	verifyTokenHash := auth.HashToken(verifyToken)

	if _, err := h.Queries.SetEmailVerifyToken(r.Context(), db.SetEmailVerifyTokenParams{
		ID:                   user.ID,
		EmailVerifyTokenHash: pgtype.Text{String: verifyTokenHash, Valid: true},
		EmailVerifyExpiresAt: pgtype.Timestamptz{Time: time.Now().Add(emailVerifyIssuanceWindow), Valid: true},
	}); err != nil {
		writeError(w, http.StatusInternalServerError, "failed to store verify token")
		return
	}

	if err := h.EmailService.SendEmailVerification(email, verifyToken); err != nil {
		slog.Error("failed to send verify email", "email", email, "error", err)
	}

	writeJSON(w, http.StatusOK, map[string]string{"message": resendEmailVerifyOKMessage})
}
