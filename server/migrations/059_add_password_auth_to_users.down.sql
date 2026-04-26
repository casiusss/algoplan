-- WARNING: Dropping these columns is destructive — any user accounts created
-- via password signup after this migration ran will lose their password_hash
-- and become unable to log in via password until they re-register.
-- This down migration is intended for development rollback only.

DROP INDEX IF EXISTS idx_user_email_verify_token_hash;
DROP INDEX IF EXISTS idx_user_password_reset_token_hash;

ALTER TABLE "user"
  DROP COLUMN IF EXISTS email_verify_expires_at,
  DROP COLUMN IF EXISTS email_verify_token_hash,
  DROP COLUMN IF EXISTS password_reset_expires_at,
  DROP COLUMN IF EXISTS password_reset_token_hash,
  DROP COLUMN IF EXISTS email_verified_at,
  DROP COLUMN IF EXISTS password_hash;
