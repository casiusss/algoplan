---
phase: 06-issue-detail-remaining-views
status: resolved
blocked_on: 05-1-auth-backend-endpoints
created: 2026-04-26
resolved: 2026-04-26
resolution: Phase 5.1 shipped (27/27 GREEN, all 6 endpoints live). UI-SPEC re-research scheduled. DTL-03 dropped from scope (deferred to Tags v1).
---

# Phase 6 — Blocked on Phase 5.1

UI-CHECK identified that Phase 6 cannot ship as originally scoped because:

## Backend gaps (BLOCKER)

- **AUTH-02 (Signup)** — `POST /api/auth/signup` does not exist. `server/internal/handler/auth.go` is OTP-only.
- **AUTH-03 (Email Verify)** — no `email_verified_at` column on users; no verify endpoint
- **AUTH-04 (Password Reset request)** — no reset token machinery
- **AUTH-05 (Password Reset confirm)** — no `password_hash` column on users; no confirm endpoint

## Other gap (separate decision)

- **DTL-03 (Issue Tag Row)** — `Issue` type has no `tags` field. Recommend deferring DTL-03 to a future "Tags v1" phase.

## Resolution

User decision: insert Phase 5.1 (Auth Backend Endpoints) before Phase 6.

After Phase 5.1 ships:
- Re-run Phase 6 ui-phase to update UI-SPEC with confirmed backend signatures
- Drop DTL-03 from Phase 6 scope (defer to future Tags phase)
- Proceed with full Phase 6 (DTL-01/02/04, AUTH-01..06, INB-01..03, SET-01..03, WS-01..05)

## Existing artifacts (kept for reference, will be revised)

- `06-CONTEXT.md` — phase boundary
- `06-UI-SPEC.md` — design contract draft (~750 lines, needs revision after 5.1)
- `06-UI-CHECK.md` — verification report flagging 1 BLOCK + 5 FLAGs
