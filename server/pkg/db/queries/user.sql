-- name: GetUser :one
SELECT * FROM "user"
WHERE id = $1;

-- name: GetUserByEmail :one
SELECT * FROM "user"
WHERE email = $1;

-- name: CreateUser :one
INSERT INTO "user" (name, email, avatar_url)
VALUES ($1, $2, $3)
RETURNING *;

-- name: UpdateUser :one
UPDATE "user" SET
    name = COALESCE($2, name),
    avatar_url = COALESCE($3, avatar_url),
    updated_at = now()
WHERE id = $1
RETURNING *;

-- name: MarkUserOnboarded :one
UPDATE "user" SET
    onboarded_at = COALESCE(onboarded_at, now()),
    updated_at = now()
WHERE id = $1
RETURNING *;

-- name: PatchUserOnboarding :one
UPDATE "user" SET
    onboarding_questionnaire = COALESCE(sqlc.narg('questionnaire'), onboarding_questionnaire),
    updated_at = now()
WHERE id = sqlc.arg('id')
RETURNING *;

-- name: JoinCloudWaitlist :one
-- Records interest in cloud runtimes. Does NOT mark onboarding
-- complete — the user still has to pick a real path (CLI / Skip)
-- in Step 3. Repeating the call overwrites email + reason.
UPDATE "user" SET
    cloud_waitlist_email = $2,
    cloud_waitlist_reason = $3,
    updated_at = now()
WHERE id = $1
RETURNING *;

-- name: SetStarterContentState :one
-- Atomically transition starter_content_state. The handler is
-- responsible for checking the current value first (to decide between
-- "transition NULL -> imported and run the seeding" vs "already
-- decided, short-circuit"). Using COALESCE here would swallow the
-- transition, so this is a straight assignment.
UPDATE "user" SET
    starter_content_state = $2,
    updated_at = now()
WHERE id = $1
RETURNING *;

-- name: CreateUserWithPassword :one
-- Inserts a new user with a bcrypt password hash and an email-verify
-- token (already hashed via auth.HashToken). Used by POST /auth/signup.
INSERT INTO "user" (name, email, password_hash, email_verify_token_hash, email_verify_expires_at)
VALUES ($1, $2, $3, $4, $5)
RETURNING *;

-- name: SetPasswordResetToken :one
-- Stores the hashed reset token + expiry. Used by POST /auth/password-reset/request.
-- Overwrites any existing reset token so only the latest emailed link works.
UPDATE "user" SET
    password_reset_token_hash = $2,
    password_reset_expires_at = $3,
    updated_at = now()
WHERE id = $1
RETURNING *;

-- name: GetUserByPasswordResetTokenHash :one
-- Looks up the user owning a non-expired reset token. The expiry filter is
-- inclusive of "now" semantics: tokens whose expires_at is strictly in the
-- future are still valid. Used by POST /auth/password-reset/confirm.
SELECT * FROM "user"
WHERE password_reset_token_hash = $1
  AND password_reset_expires_at > now();

-- name: ConfirmPasswordReset :one
-- Atomically updates password_hash and clears the reset token columns.
-- Single statement so a token is never reusable after a successful confirm.
UPDATE "user" SET
    password_hash = $2,
    password_reset_token_hash = NULL,
    password_reset_expires_at = NULL,
    updated_at = now()
WHERE id = $1
RETURNING *;

-- name: SetEmailVerifyToken :one
-- Stores the hashed verify token + expiry. Used by POST /auth/email-verify/resend
-- and indirectly by signup (CreateUserWithPassword inlines the same columns).
-- Overwrites any existing verify token.
UPDATE "user" SET
    email_verify_token_hash = $2,
    email_verify_expires_at = $3,
    updated_at = now()
WHERE id = $1
RETURNING *;

-- name: GetUserByEmailVerifyTokenHash :one
-- Looks up the user owning a non-expired email-verify token.
-- Used by POST /auth/email-verify.
SELECT * FROM "user"
WHERE email_verify_token_hash = $1
  AND email_verify_expires_at > now();

-- name: ConfirmEmailVerification :one
-- Marks the user's email as verified and clears the verify token columns.
-- COALESCE preserves the original verification timestamp on duplicate-safe
-- replays before the token is cleared. Single statement so a token is never
-- reusable after a successful confirm.
UPDATE "user" SET
    email_verified_at = COALESCE(email_verified_at, now()),
    email_verify_token_hash = NULL,
    email_verify_expires_at = NULL,
    updated_at = now()
WHERE id = $1
RETURNING *;
