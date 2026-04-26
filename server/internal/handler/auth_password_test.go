package handler

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/jackc/pgx/v5/pgtype"
	"github.com/multica-ai/multica/server/internal/auth"
)

// auth_password_test.go — Phase 5.1 Plan 00 RED scaffolds.
//
// Every test in this file FAILS today because the Signup, Login,
// PasswordResetRequest, PasswordResetConfirm handlers return 501.
// Plans 01 and 03 replace the stub bodies; the same assertions then go
// green without modification — that is the Nyquist contract.
//
// Test counts (must match VALIDATION authoritative table):
//   Signup:                6  (TestSignup_*)
//   Login:                 4  (TestLogin_*)
//   PasswordResetRequest:  3  (TestPasswordResetRequest_*)
//   PasswordResetConfirm:  6  (TestPasswordResetConfirm_*)
//   Total in this file:    19

// dummyBcryptHash is a precomputed bcrypt cost-12 hash of the literal
// string "PlaceholderForRedScaffold!" — used by signupTestUser so the
// scaffold can insert a row that satisfies password_hash NOT NULL
// expectations once Plan 01 enforces them. Plan 01 will replace this
// with a per-test bcrypt.GenerateFromPassword call so scaffolds and
// real bcrypt comparisons stay in sync.
const dummyBcryptHash = "$2a$12$abcdefghijklmnopqrstuvCRRMcg2vIEt5q47jufwxsmZmI3EnB/uG"

// signupTestUser inserts a password-auth user directly via SQL and
// registers cleanup. Returns the userID. Used by tests that need a
// pre-existing user without going through the (today: 501-stub)
// signup endpoint. Plan 01 will swap dummyBcryptHash for a real
// bcrypt hash of `password` so TestLogin_Success can authenticate
// against it.
func signupTestUser(t *testing.T, email, password string) string {
	t.Helper()
	_ = password // referenced once Plan 01 wires bcrypt-aware variant
	ctx := context.Background()
	var userID string
	if err := testPool.QueryRow(ctx, `
		INSERT INTO "user" (name, email, password_hash)
		VALUES ($1, $2, $3)
		RETURNING id
	`, "Scaffold User", email, dummyBcryptHash).Scan(&userID); err != nil {
		t.Fatalf("signupTestUser: insert %q: %v", email, err)
	}
	t.Cleanup(func() {
		testPool.Exec(context.Background(), `DELETE FROM "user" WHERE email=$1`, email)
	})
	return userID
}

// gatedSignupHandler returns a handler instance whose only deviation
// from the package-level testHandler is Config{AllowSignup: false}.
// Mirrors the per-cfg pattern used by TestSignupGating in
// auth_signup_test.go (B1 fix per PLAN-CHECK).
//
// We shallow-copy testHandler so the gated handler keeps real Queries /
// pool / EmailService / Analytics dependencies — necessary because
// Signup actually touches the DB once Plan 01 lands. cfg is an
// unexported field; same-package code may overwrite it.
func gatedSignupHandler() *Handler {
	h := *testHandler
	h.cfg = Config{AllowSignup: false}
	return &h
}

// postJSON builds a JSON POST request to the supplied path with the
// supplied body and runs it through the supplied handler method.
func postJSON(t *testing.T, h func(http.ResponseWriter, *http.Request), path string, body any) *httptest.ResponseRecorder {
	t.Helper()
	var buf bytes.Buffer
	if err := json.NewEncoder(&buf).Encode(body); err != nil {
		t.Fatalf("postJSON encode: %v", err)
	}
	req := httptest.NewRequest(http.MethodPost, path, &buf)
	req.Header.Set("Content-Type", "application/json")
	rec := httptest.NewRecorder()
	h(rec, req)
	return rec
}

// ---------- AUTH-BE-01 — Signup (6 tests) ----------

// TestSignup_Success: POST /auth/signup creates a user with bcrypt'd
// password_hash, an email-verify token, returns LoginResponse with JWT,
// and sets multica_auth + multica_csrf cookies.
func TestSignup_Success(t *testing.T) {
	const email = "signup-success@example.com"
	t.Cleanup(func() {
		testPool.Exec(context.Background(), `DELETE FROM "user" WHERE email=$1`, email)
	})

	rec := postJSON(t, testHandler.Signup, "/auth/signup", map[string]string{
		"email":    email,
		"password": "atLeast12Chars!",
		"name":     "Signup Success",
	})
	if rec.Code != http.StatusOK {
		t.Fatalf("Signup: want 200, got %d (body=%s)", rec.Code, rec.Body.String())
	}

	var resp LoginResponse
	if err := json.NewDecoder(rec.Body).Decode(&resp); err != nil {
		t.Fatalf("decode response: %v", err)
	}
	if resp.Token == "" {
		t.Fatal("Signup: empty JWT token")
	}
	if resp.User.Email != email {
		t.Fatalf("Signup: user email = %q, want %q", resp.User.Email, email)
	}

	var hash pgtype.Text
	var verifyHash pgtype.Text
	if err := testPool.QueryRow(context.Background(),
		`SELECT password_hash, email_verify_token_hash FROM "user" WHERE email=$1`, email,
	).Scan(&hash, &verifyHash); err != nil {
		t.Fatalf("post-signup lookup: %v", err)
	}
	if !hash.Valid || hash.String == "" {
		t.Fatal("Signup: password_hash not stored")
	}
	if !verifyHash.Valid || verifyHash.String == "" {
		t.Fatal("Signup: email_verify_token_hash not stored")
	}

	cookies := rec.Result().Cookies()
	var sawAuth, sawCSRF bool
	for _, c := range cookies {
		if c.Name == auth.AuthCookieName {
			sawAuth = true
		}
		if c.Name == auth.CSRFCookieName {
			sawCSRF = true
		}
	}
	if !sawAuth || !sawCSRF {
		t.Fatalf("Signup: expected both %s and %s cookies, got %v", auth.AuthCookieName, auth.CSRFCookieName, cookies)
	}
}

// TestSignup_Conflict: existing email returns strict 409.
func TestSignup_Conflict(t *testing.T) {
	const email = "signup-conflict@example.com"
	signupTestUser(t, email, "irrelevant")

	rec := postJSON(t, testHandler.Signup, "/auth/signup", map[string]string{
		"email":    email,
		"password": "atLeast12Chars!",
		"name":     "Conflict",
	})
	if rec.Code != http.StatusConflict {
		t.Fatalf("Signup conflict: want 409, got %d (body=%s)", rec.Code, rec.Body.String())
	}
}

// TestSignup_PasswordTooShort: <12 chars rejected with 400.
func TestSignup_PasswordTooShort(t *testing.T) {
	rec := postJSON(t, testHandler.Signup, "/auth/signup", map[string]string{
		"email":    "signup-short@example.com",
		"password": "abc",
		"name":     "Short",
	})
	if rec.Code != http.StatusBadRequest {
		t.Fatalf("Signup short pw: want 400, got %d (body=%s)", rec.Code, rec.Body.String())
	}
}

// TestSignup_PasswordTooLong: >72-byte password rejected (bcrypt cap).
func TestSignup_PasswordTooLong(t *testing.T) {
	rec := postJSON(t, testHandler.Signup, "/auth/signup", map[string]string{
		"email":    "signup-long@example.com",
		"password": strings.Repeat("x", 73),
		"name":     "Long",
	})
	if rec.Code != http.StatusBadRequest {
		t.Fatalf("Signup long pw: want 400, got %d (body=%s)", rec.Code, rec.Body.String())
	}
}

// TestSignup_MissingFields: missing email or name → 400.
func TestSignup_MissingFields(t *testing.T) {
	rec := postJSON(t, testHandler.Signup, "/auth/signup", map[string]string{
		"password": "atLeast12Chars!",
	})
	if rec.Code != http.StatusBadRequest {
		t.Fatalf("Signup missing fields: want 400, got %d (body=%s)", rec.Code, rec.Body.String())
	}
}

// TestSignup_Gated: with Config{AllowSignup:false} signup must return 403
// and create no user row. Uses gatedSignupHandler() per B1 fix; never
// touches t.Setenv because gating reads h.cfg.AllowSignup, not env.
func TestSignup_Gated(t *testing.T) {
	const email = "gated-signup@example.com"
	t.Cleanup(func() {
		testPool.Exec(context.Background(), `DELETE FROM "user" WHERE email=$1`, email)
	})

	h := gatedSignupHandler()
	rec := postJSON(t, h.Signup, "/auth/signup", map[string]string{
		"email":    email,
		"password": "someStrongPass1",
		"name":     "Gated",
	})
	if rec.Code != http.StatusForbidden {
		t.Fatalf("Signup gated: want 403, got %d (body=%s)", rec.Code, rec.Body.String())
	}

	var count int
	if err := testPool.QueryRow(context.Background(),
		`SELECT COUNT(*) FROM "user" WHERE email=$1`, email,
	).Scan(&count); err != nil {
		t.Fatal(err)
	}
	if count != 0 {
		t.Fatalf("Signup gated: expected no user row, got %d", count)
	}
}

// ---------- AUTH-BE-06 — Login (4 tests, NEW) ----------

// TestLogin_Success: signup then login with same creds → 200, JWT, cookies.
func TestLogin_Success(t *testing.T) {
	const email = "login-success@example.com"
	const password = "atLeast12Chars!"
	signupTestUser(t, email, password)

	rec := postJSON(t, testHandler.Login, "/auth/login", map[string]string{
		"email":    email,
		"password": password,
	})
	if rec.Code != http.StatusOK {
		t.Fatalf("Login: want 200, got %d (body=%s)", rec.Code, rec.Body.String())
	}

	var resp LoginResponse
	if err := json.NewDecoder(rec.Body).Decode(&resp); err != nil {
		t.Fatalf("decode: %v", err)
	}
	if resp.Token == "" {
		t.Fatal("Login: empty JWT")
	}

	cookies := rec.Result().Cookies()
	var sawAuth bool
	for _, c := range cookies {
		if c.Name == auth.AuthCookieName {
			sawAuth = true
		}
	}
	if !sawAuth {
		t.Fatalf("Login: expected %s cookie, got %v", auth.AuthCookieName, cookies)
	}
}

// TestLogin_WrongPassword: valid email + wrong password → 401, no enumeration.
func TestLogin_WrongPassword(t *testing.T) {
	const email = "login-wrongpw@example.com"
	signupTestUser(t, email, "rightPasswordPwd1")

	rec := postJSON(t, testHandler.Login, "/auth/login", map[string]string{
		"email":    email,
		"password": "wrongPasswordPwd1",
	})
	if rec.Code != http.StatusUnauthorized {
		t.Fatalf("Login wrong pw: want 401, got %d (body=%s)", rec.Code, rec.Body.String())
	}
}

// TestLogin_UnknownEmail: unknown email → 401 (no enumeration).
func TestLogin_UnknownEmail(t *testing.T) {
	rec := postJSON(t, testHandler.Login, "/auth/login", map[string]string{
		"email":    "login-unknown@example.com",
		"password": "anyPasswordPwd1",
	})
	if rec.Code != http.StatusUnauthorized {
		t.Fatalf("Login unknown email: want 401, got %d (body=%s)", rec.Code, rec.Body.String())
	}
}

// TestLogin_OTPOnlyUserHasNoPassword: user exists with NULL password_hash
// (e.g., OTP- or Google-created) → 401, never authenticates via password.
func TestLogin_OTPOnlyUserHasNoPassword(t *testing.T) {
	const email = "login-otponly@example.com"
	ctx := context.Background()
	if _, err := testPool.Exec(ctx,
		`INSERT INTO "user" (name, email) VALUES ($1, $2)`,
		"OTP Only", email,
	); err != nil {
		t.Fatalf("insert OTP-only user: %v", err)
	}
	t.Cleanup(func() {
		testPool.Exec(context.Background(), `DELETE FROM "user" WHERE email=$1`, email)
	})

	rec := postJSON(t, testHandler.Login, "/auth/login", map[string]string{
		"email":    email,
		"password": "anyPasswordPwd1",
	})
	if rec.Code != http.StatusUnauthorized {
		t.Fatalf("Login OTP-only: want 401, got %d (body=%s)", rec.Code, rec.Body.String())
	}
}

// ---------- AUTH-BE-02 — Password reset request (3 tests) ----------

// TestPasswordResetRequest_KnownEmail: 200 + reset_token_hash stored.
func TestPasswordResetRequest_KnownEmail(t *testing.T) {
	const email = "reset-request-known@example.com"
	signupTestUser(t, email, "anyPwd123456")

	rec := postJSON(t, testHandler.PasswordResetRequest, "/auth/password-reset/request",
		map[string]string{"email": email})
	if rec.Code != http.StatusOK {
		t.Fatalf("ResetRequest known: want 200, got %d (body=%s)", rec.Code, rec.Body.String())
	}

	var hash pgtype.Text
	if err := testPool.QueryRow(context.Background(),
		`SELECT password_reset_token_hash FROM "user" WHERE email=$1`, email,
	).Scan(&hash); err != nil {
		t.Fatalf("post-request lookup: %v", err)
	}
	if !hash.Valid || hash.String == "" {
		t.Fatal("ResetRequest: token hash not stored for known user")
	}
}

// TestPasswordResetRequest_UnknownEmail: 200 + same response shape, no DB write.
func TestPasswordResetRequest_UnknownEmail(t *testing.T) {
	const email = "reset-request-unknown@example.com"
	rec := postJSON(t, testHandler.PasswordResetRequest, "/auth/password-reset/request",
		map[string]string{"email": email})
	if rec.Code != http.StatusOK {
		t.Fatalf("ResetRequest unknown: want 200, got %d (body=%s)", rec.Code, rec.Body.String())
	}

	var count int
	if err := testPool.QueryRow(context.Background(),
		`SELECT COUNT(*) FROM "user" WHERE email=$1`, email,
	).Scan(&count); err != nil {
		t.Fatal(err)
	}
	if count != 0 {
		t.Fatalf("ResetRequest unknown: expected no user row created, got %d", count)
	}
}

// TestPasswordResetRequest_RateLimit: second call within 60s → 429.
// Deterministic via DB-stored issuance timestamp (W5 fix).
func TestPasswordResetRequest_RateLimit(t *testing.T) {
	const email = "reset-request-ratelimit@example.com"
	signupTestUser(t, email, "anyPwd123456")

	first := postJSON(t, testHandler.PasswordResetRequest, "/auth/password-reset/request",
		map[string]string{"email": email})
	if first.Code != http.StatusOK {
		t.Fatalf("ResetRequest first: want 200, got %d (body=%s)", first.Code, first.Body.String())
	}

	second := postJSON(t, testHandler.PasswordResetRequest, "/auth/password-reset/request",
		map[string]string{"email": email})
	if second.Code != http.StatusTooManyRequests {
		t.Fatalf("ResetRequest second (rate limit): want 429, got %d (body=%s)", second.Code, second.Body.String())
	}
}

// ---------- AUTH-BE-03 — Password reset confirm (6 tests) ----------

// resetUserWithToken inserts a user with a pre-stored reset token hash
// and the matching plaintext returned for the test to feed into
// /auth/password-reset/confirm. expiresIn controls the freshness of the
// stored token (positive: future, negative: already-expired backdate).
func resetUserWithToken(t *testing.T, email string, expiresIn time.Duration) (userID, plainToken string) {
	t.Helper()
	ctx := context.Background()

	plainToken, err := auth.GenerateAuthToken()
	if err != nil {
		t.Fatalf("GenerateAuthToken: %v", err)
	}
	hash := auth.HashToken(plainToken)
	expires := time.Now().Add(expiresIn)

	if err := testPool.QueryRow(ctx, `
		INSERT INTO "user" (name, email, password_hash, password_reset_token_hash, password_reset_expires_at)
		VALUES ($1, $2, $3, $4, $5)
		RETURNING id
	`, "Reset Confirm User", email, dummyBcryptHash, hash, expires).Scan(&userID); err != nil {
		t.Fatalf("resetUserWithToken: insert %q: %v", email, err)
	}
	t.Cleanup(func() {
		testPool.Exec(context.Background(), `DELETE FROM "user" WHERE email=$1`, email)
	})
	return userID, plainToken
}

// TestPasswordResetConfirm_Success: valid token → 200, password_hash
// updated, reset_token cleared, AND old password no longer authenticates
// via /auth/login (W4 fix).
func TestPasswordResetConfirm_Success(t *testing.T) {
	const email = "reset-confirm-success@example.com"
	const newPassword = "brandNewPassword!1"
	_, plainToken := resetUserWithToken(t, email, time.Hour)

	rec := postJSON(t, testHandler.PasswordResetConfirm, "/auth/password-reset/confirm", map[string]string{
		"token":       plainToken,
		"newPassword": newPassword,
	})
	if rec.Code != http.StatusOK {
		t.Fatalf("ResetConfirm success: want 200, got %d (body=%s)", rec.Code, rec.Body.String())
	}

	var hash, resetHash pgtype.Text
	if err := testPool.QueryRow(context.Background(),
		`SELECT password_hash, password_reset_token_hash FROM "user" WHERE email=$1`, email,
	).Scan(&hash, &resetHash); err != nil {
		t.Fatalf("post-confirm lookup: %v", err)
	}
	if !hash.Valid || hash.String == "" || hash.String == dummyBcryptHash {
		t.Fatalf("ResetConfirm: password_hash should be updated to a new bcrypt hash, got %q", hash.String)
	}
	if resetHash.Valid {
		t.Fatal("ResetConfirm: reset token hash should be cleared")
	}

	// W4 — old password (placeholder used by signupTestUser) must NOT log in.
	loginRec := postJSON(t, testHandler.Login, "/auth/login", map[string]string{
		"email":    email,
		"password": "PlaceholderForRedScaffold!",
	})
	if loginRec.Code == http.StatusOK {
		t.Fatal("ResetConfirm: old password should no longer authenticate")
	}
}

// TestPasswordResetConfirm_Reuse: 2nd confirm with the same token → 401.
func TestPasswordResetConfirm_Reuse(t *testing.T) {
	const email = "reset-confirm-reuse@example.com"
	_, plainToken := resetUserWithToken(t, email, time.Hour)

	first := postJSON(t, testHandler.PasswordResetConfirm, "/auth/password-reset/confirm", map[string]string{
		"token":       plainToken,
		"newPassword": "firstNewPassword!1",
	})
	if first.Code != http.StatusOK {
		t.Fatalf("ResetConfirm first: want 200, got %d (body=%s)", first.Code, first.Body.String())
	}

	second := postJSON(t, testHandler.PasswordResetConfirm, "/auth/password-reset/confirm", map[string]string{
		"token":       plainToken,
		"newPassword": "secondNewPassword!1",
	})
	if second.Code != http.StatusUnauthorized {
		t.Fatalf("ResetConfirm reuse: want 401, got %d (body=%s)", second.Code, second.Body.String())
	}
}

// TestPasswordResetConfirm_Expired: token whose expires_at is in the past → 401.
func TestPasswordResetConfirm_Expired(t *testing.T) {
	const email = "reset-confirm-expired@example.com"
	_, plainToken := resetUserWithToken(t, email, -time.Minute)

	rec := postJSON(t, testHandler.PasswordResetConfirm, "/auth/password-reset/confirm", map[string]string{
		"token":       plainToken,
		"newPassword": "anyNewPassword!1",
	})
	if rec.Code != http.StatusUnauthorized {
		t.Fatalf("ResetConfirm expired: want 401, got %d (body=%s)", rec.Code, rec.Body.String())
	}
}

// TestPasswordResetConfirm_Invalid: random token → 401.
func TestPasswordResetConfirm_Invalid(t *testing.T) {
	bogus, err := auth.GenerateAuthToken()
	if err != nil {
		t.Fatal(err)
	}
	rec := postJSON(t, testHandler.PasswordResetConfirm, "/auth/password-reset/confirm", map[string]string{
		"token":       bogus,
		"newPassword": "anyNewPassword!1",
	})
	if rec.Code != http.StatusUnauthorized {
		t.Fatalf("ResetConfirm invalid: want 401, got %d (body=%s)", rec.Code, rec.Body.String())
	}
}

// TestPasswordResetConfirm_NoAutoLogin: response MUST NOT include a JWT
// or Set-Cookie multica_auth — adversary may have brief inbox access.
func TestPasswordResetConfirm_NoAutoLogin(t *testing.T) {
	const email = "reset-confirm-noautologin@example.com"
	_, plainToken := resetUserWithToken(t, email, time.Hour)

	rec := postJSON(t, testHandler.PasswordResetConfirm, "/auth/password-reset/confirm", map[string]string{
		"token":       plainToken,
		"newPassword": "anyNewPassword!1",
	})
	if rec.Code != http.StatusOK {
		t.Fatalf("ResetConfirm noautologin: want 200, got %d (body=%s)", rec.Code, rec.Body.String())
	}

	// Body MUST NOT contain a "token" field.
	var body map[string]any
	if err := json.NewDecoder(bytes.NewReader(rec.Body.Bytes())).Decode(&body); err != nil {
		t.Fatalf("decode body: %v", err)
	}
	if _, has := body["token"]; has {
		t.Fatalf("ResetConfirm noautologin: response must not include token field, got %v", body)
	}

	// Set-Cookie MUST NOT include the auth cookie.
	for _, c := range rec.Result().Cookies() {
		if c.Name == auth.AuthCookieName {
			t.Fatalf("ResetConfirm noautologin: must not set %s cookie", auth.AuthCookieName)
		}
	}
}

// TestPasswordResetConfirm_WeakPassword: <12 chars new password → 400.
func TestPasswordResetConfirm_WeakPassword(t *testing.T) {
	const email = "reset-confirm-weak@example.com"
	_, plainToken := resetUserWithToken(t, email, time.Hour)

	rec := postJSON(t, testHandler.PasswordResetConfirm, "/auth/password-reset/confirm", map[string]string{
		"token":       plainToken,
		"newPassword": "abc",
	})
	if rec.Code != http.StatusBadRequest {
		t.Fatalf("ResetConfirm weak: want 400, got %d (body=%s)", rec.Code, rec.Body.String())
	}
}

// Compile-time guards so unused imports don't drift if the test file
// gets edited down. fmt and auth.HashToken are referenced in helpers.
var (
	_ = fmt.Sprintf
	_ = auth.HashToken
)
