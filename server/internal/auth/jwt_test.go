package auth

import (
	"encoding/base64"
	"testing"
)

// TestGenerateAuthToken verifies the opaque-token helper produces
// 256-bit URL-safe tokens (43 base64url chars, no padding) suitable for
// password-reset and email-verify links.
func TestGenerateAuthToken(t *testing.T) {
	a, err := GenerateAuthToken()
	if err != nil {
		t.Fatalf("GenerateAuthToken: %v", err)
	}
	if len(a) != 43 {
		t.Fatalf("token length: want 43 chars, got %d (%q)", len(a), a)
	}

	raw, err := base64.RawURLEncoding.DecodeString(a)
	if err != nil {
		t.Fatalf("decode token: %v", err)
	}
	if len(raw) != 32 {
		t.Fatalf("decoded entropy: want 32 bytes, got %d", len(raw))
	}

	// Two consecutive tokens MUST differ — collision indicates broken CSPRNG.
	b, err := GenerateAuthToken()
	if err != nil {
		t.Fatalf("GenerateAuthToken (second): %v", err)
	}
	if a == b {
		t.Fatal("two GenerateAuthToken calls returned identical token")
	}

	// HashToken should produce a 64-char lowercase hex digest of any token.
	h := HashToken(a)
	if len(h) != 64 {
		t.Fatalf("HashToken: want 64-char hex, got %d (%q)", len(h), h)
	}
}
