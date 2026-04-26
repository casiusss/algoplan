package handler

import (
	"context"
	"net/http"
	"testing"
	"time"

	"github.com/jackc/pgx/v5/pgtype"
	"github.com/multica-ai/multica/server/internal/auth"
)

// auth_email_verify_test.go — Phase 5.1 Plan 00 RED scaffolds.
//
// Every test in this file FAILS today because the EmailVerify and
// ResendEmailVerify handlers return 501. Plan 02 replaces the stub
// bodies; the same assertions then go green without modification.
//
// Test counts (must match VALIDATION authoritative table):
//   EmailVerify:        4 (TestEmailVerify_*)
//   ResendEmailVerify:  4 (TestResendEmailVerify_*)
//   Total in this file: 8

// verifyUserWithToken inserts a user with a pre-stored email-verify
// token hash and returns (userID, plaintext token). expiresIn controls
// freshness: positive = future-dated, negative = expired backdate.
func verifyUserWithToken(t *testing.T, email string, expiresIn time.Duration) (userID, plainToken string) {
	t.Helper()
	ctx := context.Background()

	plainToken, err := auth.GenerateAuthToken()
	if err != nil {
		t.Fatalf("GenerateAuthToken: %v", err)
	}
	hash := auth.HashToken(plainToken)
	expires := time.Now().Add(expiresIn)

	if err := testPool.QueryRow(ctx, `
		INSERT INTO "user" (name, email, password_hash, email_verify_token_hash, email_verify_expires_at)
		VALUES ($1, $2, $3, $4, $5)
		RETURNING id
	`, "Email Verify User", email, dummyBcryptHash, hash, expires).Scan(&userID); err != nil {
		t.Fatalf("verifyUserWithToken: insert %q: %v", email, err)
	}
	t.Cleanup(func() {
		testPool.Exec(context.Background(), `DELETE FROM "user" WHERE email=$1`, email)
	})
	return userID, plainToken
}

// ---------- AUTH-BE-04 — Email verify (4 tests) ----------

// TestEmailVerify_Success: valid token → 200, email_verified_at set,
// verify token cleared.
func TestEmailVerify_Success(t *testing.T) {
	const email = "verify-success@example.com"
	_, plainToken := verifyUserWithToken(t, email, 24*time.Hour)

	rec := postJSON(t, testHandler.EmailVerify, "/auth/email-verify",
		map[string]string{"token": plainToken})
	if rec.Code != http.StatusOK {
		t.Fatalf("EmailVerify success: want 200, got %d (body=%s)", rec.Code, rec.Body.String())
	}

	var verifiedAt pgtype.Timestamptz
	var verifyHash pgtype.Text
	if err := testPool.QueryRow(context.Background(),
		`SELECT email_verified_at, email_verify_token_hash FROM "user" WHERE email=$1`, email,
	).Scan(&verifiedAt, &verifyHash); err != nil {
		t.Fatalf("post-verify lookup: %v", err)
	}
	if !verifiedAt.Valid {
		t.Fatal("EmailVerify success: email_verified_at not set")
	}
	if verifyHash.Valid {
		t.Fatal("EmailVerify success: email_verify_token_hash should be cleared")
	}
}

// TestEmailVerify_Reuse: 2nd call with same token → 401.
func TestEmailVerify_Reuse(t *testing.T) {
	const email = "verify-reuse@example.com"
	_, plainToken := verifyUserWithToken(t, email, 24*time.Hour)

	first := postJSON(t, testHandler.EmailVerify, "/auth/email-verify",
		map[string]string{"token": plainToken})
	if first.Code != http.StatusOK {
		t.Fatalf("EmailVerify first: want 200, got %d (body=%s)", first.Code, first.Body.String())
	}

	second := postJSON(t, testHandler.EmailVerify, "/auth/email-verify",
		map[string]string{"token": plainToken})
	if second.Code != http.StatusUnauthorized {
		t.Fatalf("EmailVerify reuse: want 401, got %d (body=%s)", second.Code, second.Body.String())
	}
}

// TestEmailVerify_Expired: token whose expires_at is in the past → 401.
func TestEmailVerify_Expired(t *testing.T) {
	const email = "verify-expired@example.com"
	_, plainToken := verifyUserWithToken(t, email, -time.Minute)

	rec := postJSON(t, testHandler.EmailVerify, "/auth/email-verify",
		map[string]string{"token": plainToken})
	if rec.Code != http.StatusUnauthorized {
		t.Fatalf("EmailVerify expired: want 401, got %d (body=%s)", rec.Code, rec.Body.String())
	}
}

// TestEmailVerify_Invalid: random token → 401.
func TestEmailVerify_Invalid(t *testing.T) {
	bogus, err := auth.GenerateAuthToken()
	if err != nil {
		t.Fatal(err)
	}
	rec := postJSON(t, testHandler.EmailVerify, "/auth/email-verify",
		map[string]string{"token": bogus})
	if rec.Code != http.StatusUnauthorized {
		t.Fatalf("EmailVerify invalid: want 401, got %d (body=%s)", rec.Code, rec.Body.String())
	}
}

// ---------- AUTH-BE-05 — Resend email verify (4 tests) ----------

// TestResendEmailVerify_Unverified: 200, fresh token written (different
// from any prior verify hash, expiry ~24h in future).
//
// Backdated expiry: issuedAt = expires_at - 24h, so we set
// expires_at = now + 24h - 2min to make the prior-token issuance
// timestamp appear 2 minutes ago — past the 60s resend cooldown
// (W5 fix in ResendEmailVerify reconstructs issuedAt this way).
func TestResendEmailVerify_Unverified(t *testing.T) {
	const email = "resend-unverified@example.com"
	_, oldPlain := verifyUserWithToken(t, email, 24*time.Hour-2*time.Minute)
	oldHash := auth.HashToken(oldPlain)

	rec := postJSON(t, testHandler.ResendEmailVerify, "/auth/email-verify/resend",
		map[string]string{"email": email})
	if rec.Code != http.StatusOK {
		t.Fatalf("ResendVerify unverified: want 200, got %d (body=%s)", rec.Code, rec.Body.String())
	}

	var newHash pgtype.Text
	var expiresAt pgtype.Timestamptz
	if err := testPool.QueryRow(context.Background(),
		`SELECT email_verify_token_hash, email_verify_expires_at FROM "user" WHERE email=$1`, email,
	).Scan(&newHash, &expiresAt); err != nil {
		t.Fatalf("post-resend lookup: %v", err)
	}
	if !newHash.Valid || newHash.String == "" {
		t.Fatal("ResendVerify unverified: token hash not stored")
	}
	if newHash.String == oldHash {
		t.Fatal("ResendVerify unverified: token hash should be different from prior")
	}
	if !expiresAt.Valid || time.Until(expiresAt.Time) < time.Hour {
		t.Fatalf("ResendVerify unverified: expires_at should be ~24h in future, got %v", expiresAt.Time)
	}
}

// TestResendEmailVerify_AlreadyVerified: 200, NO DB write — already-verified
// users do not receive a new token.
func TestResendEmailVerify_AlreadyVerified(t *testing.T) {
	const email = "resend-alreadyverified@example.com"
	ctx := context.Background()

	if _, err := testPool.Exec(ctx, `
		INSERT INTO "user" (name, email, password_hash, email_verified_at)
		VALUES ($1, $2, $3, now())
	`, "Already Verified", email, dummyBcryptHash); err != nil {
		t.Fatalf("insert verified user: %v", err)
	}
	t.Cleanup(func() {
		testPool.Exec(context.Background(), `DELETE FROM "user" WHERE email=$1`, email)
	})

	rec := postJSON(t, testHandler.ResendEmailVerify, "/auth/email-verify/resend",
		map[string]string{"email": email})
	if rec.Code != http.StatusOK {
		t.Fatalf("ResendVerify already-verified: want 200, got %d (body=%s)", rec.Code, rec.Body.String())
	}

	var hash pgtype.Text
	if err := testPool.QueryRow(context.Background(),
		`SELECT email_verify_token_hash FROM "user" WHERE email=$1`, email,
	).Scan(&hash); err != nil {
		t.Fatalf("post-resend lookup: %v", err)
	}
	if hash.Valid {
		t.Fatalf("ResendVerify already-verified: token hash must remain NULL, got %q", hash.String)
	}
}

// TestResendEmailVerify_UnknownEmail: 200, no DB write (idempotent shape).
func TestResendEmailVerify_UnknownEmail(t *testing.T) {
	const email = "resend-unknown@example.com"

	rec := postJSON(t, testHandler.ResendEmailVerify, "/auth/email-verify/resend",
		map[string]string{"email": email})
	if rec.Code != http.StatusOK {
		t.Fatalf("ResendVerify unknown: want 200, got %d (body=%s)", rec.Code, rec.Body.String())
	}

	var count int
	if err := testPool.QueryRow(context.Background(),
		`SELECT COUNT(*) FROM "user" WHERE email=$1`, email,
	).Scan(&count); err != nil {
		t.Fatal(err)
	}
	if count != 0 {
		t.Fatalf("ResendVerify unknown: expected no user row created, got %d", count)
	}
}

// TestResendEmailVerify_RateLimit: 2nd call within 60s → 429.
// Deterministic via DB-stored issuance timestamp (W5 fix).
//
// Same backdating trick as TestResendEmailVerify_Unverified: the prior
// token must appear issued > 60s ago so the FIRST resend succeeds. The
// SECOND resend is naturally rate-limited because the first call
// stamped expires_at = now + 24h, making issuedAt ≈ now.
func TestResendEmailVerify_RateLimit(t *testing.T) {
	const email = "resend-ratelimit@example.com"
	verifyUserWithToken(t, email, 24*time.Hour-2*time.Minute)

	first := postJSON(t, testHandler.ResendEmailVerify, "/auth/email-verify/resend",
		map[string]string{"email": email})
	if first.Code != http.StatusOK {
		t.Fatalf("ResendVerify first: want 200, got %d (body=%s)", first.Code, first.Body.String())
	}

	second := postJSON(t, testHandler.ResendEmailVerify, "/auth/email-verify/resend",
		map[string]string{"email": email})
	if second.Code != http.StatusTooManyRequests {
		t.Fatalf("ResendVerify second (rate limit): want 429, got %d (body=%s)", second.Code, second.Body.String())
	}
}
