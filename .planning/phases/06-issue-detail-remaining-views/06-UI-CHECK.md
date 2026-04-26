---
phase: 6
slug: issue-detail-remaining-views
status: approved
reviewed_at: 2026-04-26
spec_revision: 2 (post-Phase-5.1)
verdict: PASS
---

# Phase 6 — UI-CHECK v2 (post-revision)

## Overall: **PASS** (APPROVED)

UI-SPEC.md revised after Phase 5.1 (Auth Backend Endpoints) shipped 27/27 GREEN. Re-validation confirmed contract-complete and ready for plan-phase.

## Tally

- **Per-Requirement:** 20/20 PASS, 0 FLAG, 0 BLOCK
- **Per-Dimension (6):** 6/6 PASS — Token Discipline, Atom Reuse, Backend Contract Alignment, DragStrip Coverage, Cross-cutting SC, No-regression

## Resolution of Prior Issues (v1 had 1 BLOCK + 5 FLAGs)

| ID | Resolution |
|----|------------|
| BLOCK-6.1 (AUTH backend gap) | RESOLVED — Phase 5.1 shipped; 6 endpoints contracted into spec |
| FLAG-2.1 (issue-detail-footer test missing) | RESOLVED — explicit row added to DTL inventory |
| FLAG-2.2 (SET RESTYLE test status silent) | RESOLVED — EDIT markers + smoke-test discretion documented |
| FLAG-5.1 (zxcvbn lazy-load not testable) | RESOLVED — `password-strength-meter.test.tsx` mandates `import()` spy + bundle-grep gate |
| FLAG-5.2 (safe-order regression untraced) | RESOLVED — `workspace-tab.test.tsx` referenced in inherited table |
| FLAG-5.3 (DragStrip grep gate not automated) | RESOLVED — `dragstrip-coverage.test.ts` Vitest replaces manual grep |
| FLAG-6.2 (DTL-03 tags-field gap) | RESOLVED — DTL-03 dropped from scope (deferred to Tags v1) |

## Backend Contract Alignment (Phase 5.1)

All 6 endpoints verified end-to-end:
- POST /auth/signup (12-72 byte band, 200/400/403/409 mapped)
- POST /auth/login (single 401 message — no enumeration)
- POST /auth/email-verify (one-shot ref-guard, single 401)
- POST /auth/email-verify/resend (always-200 idempotent)
- POST /auth/password-reset/request (always-200 idempotent)
- POST /auth/password-reset/confirm (NO auto-login — flash toast on /auth/login)

Email link contracts frozen: `{FRONTEND_ORIGIN}/auth/verify-email?token=<token>` and `/auth/reset-password?token=<token>`.

## Planner-discretion Items (non-blocking)

1. `<SegmentedControl>` `colorByValue` extension (atom vs wrapper)
2. `useNavigationFlash()` utility — confirm exists in @multica/core or add (sessionStorage-based)
3. PageHeader vs AppTopbar coexistence (decision deferred from Phase 4)
4. InboxFilterStore location (views vs core)
5. `@zxcvbn-ts/core` catalog entries (3 packages, ^3.0.4)

## Hard Constraints

18 constraints captured in spec (up from 15 — new ones from Phase 5.1 contract: #13 no enumeration, #14 no auto-login on reset, #15 one-shot verify ref-guard, #17 web auth route convention, #18 email link contracts frozen).

## Status

Plan-phase **GREEN-LIT**. UI-SPEC.md (`~990 lines`) is the authoritative design contract.
