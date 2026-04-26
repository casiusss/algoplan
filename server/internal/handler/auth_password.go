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
	// invalidLoginMessage is the constant 401 body returned on every login
	// failure mode (unknown email, wrong password, NULL password_hash).
	// Identical wording across paths blocks email-enumeration attacks.
	invalidLoginMessage = "invalid email or password"
	// maxAuthRequestBody caps the size of any request body accepted by
	// the password / email-verify auth handlers. 16 KiB comfortably fits
	// {email, password, name} (RFC 5321 email ≤254 bytes, password ≤72,
	// reasonable name) while preventing an unauthenticated client from
	// forcing the server to allocate megabytes of JSON before the
	// per-field length checks reject it. Asymmetric DoS defense: cheap
	// cap, expensive bcrypt cost on the success path.
	maxAuthRequestBody = 16 * 1024
)

// dummyBcryptHashForTiming is a precomputed bcrypt hash used to equalize
// timing on the unknown-email and NULL-password-hash paths of Login. We
// pre-compute it ONCE in init() — bcrypt cost 12 is ~250ms, so doing it
// per-request would add quarter-second latency to every "no such user"
// attempt. Paying it once at startup is the documented trade-off:
// ~250ms boot delay vs constant-time-ish safety on every failed login.
//
// Named "...ForTiming" to avoid collision with the test-fixture const
// `dummyBcryptHash` (auth_password_test.go) which is a different concept
// — that one is a static bcrypt blob used to seed pre-existing rows in
// helper inserts; this one is a real bcrypt blob used during request
// handling.
var dummyBcryptHashForTiming []byte

func init() {
	h, err := bcrypt.GenerateFromPassword([]byte("dummy-password-for-timing-equalization"), bcryptCost)
	if err != nil {
		panic("failed to precompute dummy bcrypt hash: " + err.Error())
	}
	dummyBcryptHashForTiming = h
}

// LoginRequest is the body schema for POST /auth/login.
type LoginRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

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
	r.Body = http.MaxBytesReader(w, r.Body, maxAuthRequestBody)
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
	//
	// Pay the dummy bcrypt cost on the 409 (and the 500) path so the
	// duplicate check doesn't return in single-digit ms while the
	// success path takes ~250ms. The 409 already enumerates the email
	// explicitly, but when AllowSignup=false hides the 409 behind a
	// 403 the timing channel would still distinguish "would have been
	// 409" from "would have been 200" — closing it removes the
	// gating-bypass leak.
	if _, err := h.Queries.GetUserByEmail(r.Context(), email); err == nil {
		_ = bcrypt.CompareHashAndPassword(dummyBcryptHashForTiming, []byte(req.Password))
		writeError(w, http.StatusConflict, "email already registered")
		return
	} else if !isNotFound(err) {
		_ = bcrypt.CompareHashAndPassword(dummyBcryptHashForTiming, []byte(req.Password))
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

// Login handles POST /auth/login. Looks up the user by email, bcrypt-
// compares the provided password, then issues JWT + cookies.
//
// All failure modes (unknown email, wrong password, OTP-only user with
// NULL password_hash) return 401 with the SAME body to prevent email
// enumeration. On the unknown-email and NULL-password paths we still
// invoke bcrypt.CompareHashAndPassword against a precomputed dummy hash
// so the timing channel is roughly equalized.
//
// Note: this endpoint does NOT require email_verified_at to be non-NULL.
// Verification gating is a frontend / middleware concern (out of scope
// for Phase 5.1) — users with unverified email must still be able to log
// in to access the resend-verification flow.
func (h *Handler) Login(w http.ResponseWriter, r *http.Request) {
	r.Body = http.MaxBytesReader(w, r.Body, maxAuthRequestBody)
	var req LoginRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	email := strings.ToLower(strings.TrimSpace(req.Email))
	if email == "" || req.Password == "" {
		writeError(w, http.StatusBadRequest, "email and password are required")
		return
	}
	// Length cap BEFORE bcrypt — same reasoning as Signup. We collapse
	// "too long" into the constant 401 instead of 400 here so that a
	// password-length probe can't distinguish "user exists" from "user
	// does not exist with too-long password". Pay the dummy bcrypt
	// cost first so timing matches the unknown-email path (a probe
	// using a 73-byte password vs a 12-byte one would otherwise show
	// microseconds vs ~250ms — trivially distinguishable).
	if len(req.Password) > maxPasswordBytes {
		_ = bcrypt.CompareHashAndPassword(dummyBcryptHashForTiming, []byte(req.Password[:maxPasswordBytes]))
		writeError(w, http.StatusUnauthorized, invalidLoginMessage)
		return
	}

	user, err := h.Queries.GetUserByEmail(r.Context(), email)
	if err != nil {
		if isNotFound(err) {
			// Equalize timing: do the bcrypt work even on unknown email.
			_ = bcrypt.CompareHashAndPassword(dummyBcryptHashForTiming, []byte(req.Password))
			writeError(w, http.StatusUnauthorized, invalidLoginMessage)
			return
		}
		// Real DB error → still pay the bcrypt cost before responding so
		// a partial-outage attacker can't distinguish "DB hiccup on this
		// email" (fast) from "valid email" (slow). Perfect timing
		// equalization on a network endpoint is impossible, but closing
		// the order-of-magnitude gap (microseconds vs ~250ms) is worth
		// the cycles.
		_ = bcrypt.CompareHashAndPassword(dummyBcryptHashForTiming, []byte(req.Password))
		writeError(w, http.StatusInternalServerError, "failed to lookup user")
		return
	}

	// OTP-only users have NULL password_hash — they can never log in via
	// password. Same constant 401 as the unknown-email branch.
	if !user.PasswordHash.Valid {
		_ = bcrypt.CompareHashAndPassword(dummyBcryptHashForTiming, []byte(req.Password))
		writeError(w, http.StatusUnauthorized, invalidLoginMessage)
		return
	}

	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash.String), []byte(req.Password)); err != nil {
		writeError(w, http.StatusUnauthorized, invalidLoginMessage)
		return
	}

	tokenString, err := h.issueJWT(user)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to generate session")
		return
	}
	if err := auth.SetAuthCookies(w, tokenString); err != nil {
		slog.Warn("failed to set auth cookies", "error", err)
	}
	slog.Info("user logged in", append(logger.RequestAttrs(r), "user_id", uuidToString(user.ID), "email", email, "auth_method", "password")...)

	writeJSON(w, http.StatusOK, LoginResponse{
		Token: tokenString,
		User:  userToResponse(user),
	})
}

// PasswordResetRequestRequest is the body schema for
// POST /auth/password-reset/request.
type PasswordResetRequestRequest struct {
	Email string `json:"email"`
}

// passwordResetIssuanceWindow is the lifetime stamped into
// password_reset_expires_at when issuing a reset token. The handler uses
// this constant to reconstruct the issuance timestamp for rate-limit
// comparisons (the only column we have on disk is the expiry, but
// because we always set expiry = now + window, issuedAt is just
// expiry - window — deterministic, no clock-skew sensitivity). Mirrors
// the emailVerifyIssuanceWindow / cooldown pair in auth_email_verify.go.
const passwordResetIssuanceWindow = 1 * time.Hour

// passwordResetRequestCooldown is the minimum gap between two reset-
// request calls for the same email. Per-email rate limit only; per-IP
// is out of scope for Phase 5.1 (Open Q §1, accepted).
const passwordResetRequestCooldown = 60 * time.Second

// passwordResetRequestOKMessage is the canonical response body for ALL
// success paths (unknown email, fresh token issued). Same shape
// regardless of state — defeats email-existence enumeration via
// response inspection.
const passwordResetRequestOKMessage = "If an account exists for this email, a reset link has been sent."

// PasswordResetRequest handles POST /auth/password-reset/request.
// Public endpoint with idempotent response shape: 200 returned whether
// or not the email exists. Only failure modes that indicate a malformed
// request (400), too-frequent retries (429), or DB outage (500) leak.
//
// Flow: decode {email}, lookup user. If unknown, return 200 without
// touching the DB (no enumeration, no email-send, no dummy bcrypt —
// parity with OTP SendCode per Open Q §4 RESOLVED). Otherwise check
// the per-email 60s cooldown by reconstructing issuedAt from
// password_reset_expires_at - passwordResetIssuanceWindow; if too
// recent, return 429. Otherwise generate a fresh auth.GenerateAuthToken,
// store its hash with 1h expiry via Queries.SetPasswordResetToken,
// then call EmailService.SendPasswordResetEmail (best-effort; email-
// send failures are logged but do not change the 200 response).
func (h *Handler) PasswordResetRequest(w http.ResponseWriter, r *http.Request) {
	r.Body = http.MaxBytesReader(w, r.Body, maxAuthRequestBody)
	var req PasswordResetRequestRequest
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
			// OWASP: same response shape as the known-email path — no
			// DB write, no email send, no dummy bcrypt.
			writeJSON(w, http.StatusOK, map[string]string{"message": passwordResetRequestOKMessage})
			return
		}
		writeError(w, http.StatusInternalServerError, "failed to lookup user")
		return
	}

	// Per-email rate limit: 60s. Reconstruct issuance timestamp from
	// expiry minus the known issuance window — deterministic, not
	// sensitive to clock skew or future expiry-window arithmetic
	// changes.
	if user.PasswordResetExpiresAt.Valid {
		issuedAt := user.PasswordResetExpiresAt.Time.Add(-passwordResetIssuanceWindow)
		if time.Since(issuedAt) < passwordResetRequestCooldown {
			writeError(w, http.StatusTooManyRequests, "please wait before requesting another reset")
			return
		}
	}

	resetToken, err := auth.GenerateAuthToken()
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to generate token")
		return
	}
	resetTokenHash := auth.HashToken(resetToken)

	if _, err := h.Queries.SetPasswordResetToken(r.Context(), db.SetPasswordResetTokenParams{
		ID:                     user.ID,
		PasswordResetTokenHash: pgtype.Text{String: resetTokenHash, Valid: true},
		PasswordResetExpiresAt: pgtype.Timestamptz{Time: time.Now().Add(passwordResetIssuanceWindow), Valid: true},
	}); err != nil {
		writeError(w, http.StatusInternalServerError, "failed to store reset token")
		return
	}

	// Best-effort: the row exists either way and the user can request
	// another link after the cooldown if delivery fails. Same rationale
	// as Signup's SendSignupVerification call.
	if err := h.EmailService.SendPasswordResetEmail(email, resetToken); err != nil {
		slog.Error("failed to send password reset email", "email", email, "error", err)
	}

	writeJSON(w, http.StatusOK, map[string]string{"message": passwordResetRequestOKMessage})
}

// PasswordResetConfirmRequest is the body schema for
// POST /auth/password-reset/confirm.
type PasswordResetConfirmRequest struct {
	Token       string `json:"token"`
	NewPassword string `json:"newPassword"`
}

// PasswordResetConfirm handles POST /auth/password-reset/confirm.
// Validates the new password length (12-72 bytes), hashes the incoming
// reset token, looks the user up via Queries.GetUserByPasswordResetToken
// Hash (whose SQL filters expires_at > now() — so expired tokens look
// indistinguishable from invalid ones to the caller), bcrypt-hashes the
// new password at cost 12, and atomically updates the password_hash AND
// clears the reset-token columns through Queries.ConfirmPasswordReset.
//
// INTENTIONAL: this endpoint does NOT auto-login. Response body has no
// Token field and no Set-Cookie header. An adversary with brief inbox
// access (e.g., shared device, unattended terminal) must not walk away
// with a long-lived session — the user is forced through /auth/login
// after the reset (Pitfall §6).
//
// JWT invalidation on password reset (rotating server-side state so old
// JWTs stop verifying) is OUT OF SCOPE per Open Q §2 RESOLVED. Stateless
// 30-day JWTs remain valid; the future password_changed_at column +
// middleware check is a known follow-up.
//
// Failure modes:
//   - 400: missing fields, password < 12 chars, password > 72 bytes
//   - 401: token unknown, expired, or already consumed (single 401
//     wording for all three — token-error enumeration is not useful to
//     a legitimate user but is useful to an attacker)
//   - 500: DB outage during lookup, bcrypt hash failure, or DB outage
//     during the atomic ConfirmPasswordReset
func (h *Handler) PasswordResetConfirm(w http.ResponseWriter, r *http.Request) {
	r.Body = http.MaxBytesReader(w, r.Body, maxAuthRequestBody)
	var req PasswordResetConfirmRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	if strings.TrimSpace(req.Token) == "" || req.NewPassword == "" {
		writeError(w, http.StatusBadRequest, "token and newPassword are required")
		return
	}
	// Length checks BEFORE bcrypt — bcrypt silently truncates >72 bytes
	// (Plan PITFALL §2). Reject explicitly so the stored hash actually
	// covers the user's full password. Mirrors Signup.
	if len(req.NewPassword) < minPasswordLength {
		writeError(w, http.StatusBadRequest, "password must be at least 12 characters")
		return
	}
	if len(req.NewPassword) > maxPasswordBytes {
		writeError(w, http.StatusBadRequest, "password must be at most 72 bytes")
		return
	}

	tokenHash := auth.HashToken(req.Token)
	user, err := h.Queries.GetUserByPasswordResetTokenHash(r.Context(),
		pgtype.Text{String: tokenHash, Valid: true})
	if err != nil {
		if isNotFound(err) {
			// Single 401 for invalid / expired / already-consumed —
			// SQL-level expires_at > now() filter folds expiry into
			// the same not-found path. Reuse path: ConfirmPassword
			// Reset's atomic UPDATE has cleared the hash, so the
			// next lookup returns ErrNoRows.
			writeError(w, http.StatusUnauthorized, "invalid or expired token")
			return
		}
		writeError(w, http.StatusInternalServerError, "failed to validate token")
		return
	}

	newHash, err := bcrypt.GenerateFromPassword([]byte(req.NewPassword), bcryptCost)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to hash password")
		return
	}

	// Atomic: single UPDATE writes password_hash AND clears
	// password_reset_token_hash + password_reset_expires_at. A second
	// confirm with the same plaintext token then fails the lookup
	// above — single-use is enforced at the SQL layer, not by an
	// app-level "did we already use it?" flag.
	if _, err := h.Queries.ConfirmPasswordReset(r.Context(), db.ConfirmPasswordResetParams{
		ID:           user.ID,
		PasswordHash: pgtype.Text{String: string(newHash), Valid: true},
	}); err != nil {
		writeError(w, http.StatusInternalServerError, "failed to update password")
		return
	}

	slog.Info("user password reset",
		append(logger.RequestAttrs(r), "user_id", uuidToString(user.ID), "email", user.Email)...)

	writeJSON(w, http.StatusOK, map[string]string{"message": "Password updated. Please log in."})
}
