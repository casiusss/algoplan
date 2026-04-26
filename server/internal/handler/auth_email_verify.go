package handler

import (
	"encoding/json"
	"log/slog"
	"net/http"
	"strings"

	"github.com/jackc/pgx/v5/pgtype"

	"github.com/multica-ai/multica/server/internal/auth"
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
