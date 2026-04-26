package handler

import (
	"encoding/json"
	"errors"
	"log/slog"
	"net/http"
	"strings"
	"time"

	"github.com/jackc/pgx/v5/pgtype"
	"golang.org/x/crypto/bcrypt"

	"github.com/multica-ai/multica/server/internal/analytics"
	"github.com/multica-ai/multica/server/internal/auth"
	"github.com/multica-ai/multica/server/internal/logger"
	db "github.com/multica-ai/multica/server/pkg/db/generated"
)

// auth_password.go contains the password-based auth handlers for Phase 5.1.
// Plan 00 shipped these as 501 stubs to lock in the route surface and avoid
// router.go merge conflicts between Plans 01/02/03. Plan 01 implements
// Signup + Login. Plan 03 implements PasswordResetRequest + Confirm.

const (
	// minPasswordLength is the floor enforced at signup, login (length cap
	// only — no minimum on login since the user may have set a weaker
	// password before we tightened the rule), and password-reset confirm.
	minPasswordLength = 12
	// maxPasswordBytes is bcrypt's hard limit; passwords beyond this are
	// silently truncated by bcrypt.GenerateFromPassword. We reject them
	// explicitly so users don't end up with a hash bound only to the first
	// 72 bytes of their password.
	maxPasswordBytes = 72
	// bcryptCost is the work factor for password hashing. Cost 12 (~250ms
	// per hash on commodity hardware in 2026) is the OWASP V2.4.1 sweet
	// spot — strong enough that brute force is impractical, fast enough
	// that a real user signup/login feels instant.
	bcryptCost = 12
)

// SignupRequest is the body schema for POST /auth/signup.
type SignupRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
	Name     string `json:"name"`
}

// Signup handles POST /auth/signup. Validates input, enforces signup
// gating, rejects duplicates with strict 409, bcrypt-hashes the password,
// generates and stores the email-verify token (hashed), inserts the user
// via CreateUserWithPassword, fires the verification email best-effort,
// then issues JWT + cookies and returns LoginResponse.
//
// Email-send failures are logged but do NOT roll back the signup — the
// account exists either way and the user can request a resend later. This
// also prevents an adversary from inferring email-service health from the
// response.
func (h *Handler) Signup(w http.ResponseWriter, r *http.Request) {
	var req SignupRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	email := strings.ToLower(strings.TrimSpace(req.Email))
	name := strings.TrimSpace(req.Name)
	if email == "" || req.Password == "" || name == "" {
		writeError(w, http.StatusBadRequest, "email, password and name are required")
		return
	}
	// Length checks BEFORE bcrypt — bcrypt silently truncates >72 bytes
	// (Plan PITFALL §2). Reject explicitly so the stored hash actually
	// covers the user's full password.
	if len(req.Password) < minPasswordLength {
		writeError(w, http.StatusBadRequest, "password must be at least 12 characters")
		return
	}
	if len(req.Password) > maxPasswordBytes {
		writeError(w, http.StatusBadRequest, "password must be at most 72 bytes")
		return
	}

	if err := h.checkSignupAllowed(email, true); err != nil {
		var signupErr SignupError
		if errors.As(err, &signupErr) {
			writeError(w, http.StatusForbidden, signupErr.Error())
			return
		}
		writeError(w, http.StatusForbidden, "user registration is disabled")
		return
	}

	// Strict 409 on existing email — no password-upgrade flow for
	// OTP-only users (Open Q §5 decision). An OTP-only user wishing to
	// add a password must do it via the (future) account-settings flow
	// while authenticated, never anonymously.
	if _, err := h.Queries.GetUserByEmail(r.Context(), email); err == nil {
		writeError(w, http.StatusConflict, "email already registered")
		return
	} else if !isNotFound(err) {
		writeError(w, http.StatusInternalServerError, "failed to check email")
		return
	}

	passwordHash, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcryptCost)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to hash password")
		return
	}

	verifyToken, err := auth.GenerateAuthToken()
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to generate token")
		return
	}
	verifyTokenHash := auth.HashToken(verifyToken)

	user, err := h.Queries.CreateUserWithPassword(r.Context(), db.CreateUserWithPasswordParams{
		Name:                 name,
		Email:                email,
		PasswordHash:         pgtype.Text{String: string(passwordHash), Valid: true},
		EmailVerifyTokenHash: pgtype.Text{String: verifyTokenHash, Valid: true},
		EmailVerifyExpiresAt: pgtype.Timestamptz{Time: time.Now().Add(24 * time.Hour), Valid: true},
	})
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to create user")
		return
	}

	// Best-effort email send. Account exists either way; user can resend
	// later via /auth/email-verify/resend (Plan 02). We log but never
	// surface the failure — adversary must not be able to infer
	// email-service health from the signup response.
	if err := h.EmailService.SendSignupVerification(email, verifyToken); err != nil {
		slog.Error("failed to send signup verification", "email", email, "error", err)
	}

	evt := analytics.Signup(uuidToString(user.ID), user.Email, signupSourceFromRequest(r))
	evt.Properties["auth_method"] = "password"
	h.Analytics.Capture(evt)

	tokenString, err := h.issueJWT(user)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to generate session")
		return
	}
	if err := auth.SetAuthCookies(w, tokenString); err != nil {
		slog.Warn("failed to set auth cookies", "error", err)
	}

	slog.Info("user signed up", append(logger.RequestAttrs(r), "user_id", uuidToString(user.ID), "email", email, "auth_method", "password")...)
	writeJSON(w, http.StatusOK, LoginResponse{
		Token: tokenString,
		User:  userToResponse(user),
	})
}

// Login handles POST /auth/login.
// Plan 01 Task 03 implements: lookup by email, bcrypt.CompareHashAndPassword,
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
