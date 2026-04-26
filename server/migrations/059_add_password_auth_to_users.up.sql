-- Add password-based auth + email verification + password reset to users.
-- All columns are nullable so existing OTP-only and Google-only users remain
-- valid. password_hash is set on signup or password-reset/confirm; email
-- verification timestamp is set on email-verify; reset/verify tokens are
-- transient and cleared after use.

ALTER TABLE "user"
  ADD COLUMN password_hash TEXT,
  ADD COLUMN email_verified_at TIMESTAMPTZ,
  ADD COLUMN password_reset_token_hash TEXT,
  ADD COLUMN password_reset_expires_at TIMESTAMPTZ,
  ADD COLUMN email_verify_token_hash TEXT,
  ADD COLUMN email_verify_expires_at TIMESTAMPTZ;

-- Lookup index for password-reset/confirm: query is "SELECT WHERE
-- password_reset_token_hash = $1 AND password_reset_expires_at > now()".
-- Partial index on non-null hash keeps the index small (most users have NULL).
CREATE INDEX idx_user_password_reset_token_hash
  ON "user"(password_reset_token_hash)
  WHERE password_reset_token_hash IS NOT NULL;

CREATE INDEX idx_user_email_verify_token_hash
  ON "user"(email_verify_token_hash)
  WHERE email_verify_token_hash IS NOT NULL;
