---
phase: 6
slug: issue-detail-remaining-views
status: revision-required
reviewed_at: 2026-04-25
reviewer: gsd-ui-checker
ui_safety_gate: true
---

# Phase 6 — UI-SPEC Review

> Verification of `06-UI-SPEC.md` against the 6 quality dimensions defined for the Multica → AlgoPlan rebrand. The spec is comprehensive (~990 lines, ~52 file touches) but contains one structural blocker (AUTH-02..05 backend gap) and one inventory inconsistency that must be resolved before the planner can proceed.

---

## Per-Dimension Verdict

| # | Dimension                         | Verdict | One-line summary |
|---|-----------------------------------|---------|------------------|
| 1 | Token Discipline                  | PASS    | Zero new tokens, zero hex/RGB except grandfathered Google SVG, zero `dark:*` on real surfaces. |
| 2 | Composition Clarity               | FLAG    | Inventory complete and grouped by sub-phase; one minor file-path inconsistency (test file listed but no implementation). |
| 3 | DragStrip Coverage                | PASS    | All full-window views enumerated with explicit DragStrip mounting requirement; grep test gate documented. |
| 4 | WindowOverlay vs Route correctness| PASS    | Pre-workspace flows (signup, email-verify, password-reset variants) explicitly added as new WindowOverlay types — never as desktop routes. |
| 5 | Validation Architecture Coverage  | FLAG    | Per-component vitest commands enumerated; SC#1..5 mapped to E2E specs; one Hard Constraint (#6 lazy zxcvbn) lacks a verifiable test. |
| 6 | Hard Constraints Completeness     | BLOCK   | DTL/AUTH/INB/SET/WS each have ≥1 Hard Constraint, BUT 5 of 15 constraints (AUTH-02..05) sit on top of a confirmed-missing backend; spec calls this a FLAG when the audit shows it should be a BLOCK. |

---

## Dimension 1 — Token Discipline (PASS)

**Evidence:**
- Lines 794-796 enumerate the exact Phase 1 OKLCH token inventory consumed; spec states "If implementation surfaces a need for a token outside this list, STOP and re-open the Phase 1 token contract."
- Line 38: imports BLOCKED inside Phase 6 view directories include "any hex color, any RGB color, any `dark:bg-*` / `dark:text-*` override".
- Line 159: Google logo SVG hex literals explicitly grandfathered with reasoning ("Google brand requires exact hex"); no other hex permitted.
- Line 163: `dark:` overrides forbidden; existing `WindowMockup` `dark:` literals grandfathered with documented justification (theme-preview mockups, not real surfaces).
- Line 38: existing `bg-priority`/`text-white` literals in `PRIORITY_CONFIG` are grandfathered (Phase 1 chose them) but no NEW non-token color literal may be introduced.

**Verdict:** PASS. The token discipline contract is locked tighter than the dimension requires — three explicit exceptions with named rationale, zero blanket allowances.

---

## Dimension 2 — Composition Clarity (FLAG)

**Evidence:**
- Component Inventory (lines 348-429) enumerates **every** file with: file path, status (NEW / RESTYLE + COPY / EDIT / RESTRUCTURE), role description, reused atoms.
- Inventory grouped by sub-phase (DTL / AUTH / INB / SET / WS) — sub-phase boundaries unambiguous.
- Reused atoms explicitly traced: TagChip ×4, AccentBar ×1, AvatarInitial ×4, SegmentedControl ×1.
- Total file count published (~52 files, ~23 NEW).

**Issues:**
- **FLAG-2.1** Inventory lists `issue-detail-footer.tsx` (line 355) as NEW but no `issue-detail-footer.test.tsx` row appears in DTL — yet the validation section (line 821) runs `pnpm ... vitest run issues/components/issue-detail-footer.test.tsx`. Either the test file is missing from the inventory or the test command is unrunnable. Planner must reconcile.
- **FLAG-2.2** Settings inventory rows for `appearance-tab.tsx`, `workspace-tab.tsx`, `account-tab.tsx`, `members-tab.tsx`, `repositories-tab.tsx`, `tokens-tab.tsx`, `settings-page.tsx` (lines 401-409) do not list test files for the RESTYLE + COPY operations, yet validation commands target `appearance-tab.test.tsx`, `workspace-tab.test.tsx`, `settings-page.test.tsx`, `settings-section.test.tsx` (lines 839-843). For RESTYLE-only edits this is reasonable (existing tests likely just need string updates), but the inventory should explicitly state "EDIT existing test" for each — currently silent.

**Verdict:** FLAG. Composition clarity is otherwise excellent (file paths absolute and grouped by domain, role per file documented, sub-phase boundaries unambiguous). The two omissions are remediable in the spec without re-research.

**Remediation:** Add `issue-detail-footer.test.tsx` row to the DTL inventory as NEW (or remove the validation command). For the SET sub-phase, add a one-line note "all RESTYLE + COPY rows include EDIT of the existing `.test.tsx` for German string assertions" — or add explicit test-file rows.

---

## Dimension 3 — DragStrip Coverage (PASS)

**Evidence:**
- Dedicated DragStrip Enumeration section (lines 768-789) tabulates every full-window desktop view with a "Phase 6 verifies" column.
- AUTH-05 sub-section (lines 573-595) re-tabulates the same surfaces with their existing DragStrip line numbers (audit prior to restyle).
- Pitfall reminder (line 597): "DragStrip MUST be the FIRST flex child of the page-root flex container. Inserting AlgoPlanWordmark 'before' the DragStrip during the restyle would break window dragging. Wordmark goes INSIDE the centered card region, not above DragStrip."
- Verifiable test gate (line 788): `grep -L "DragStrip" packages/views/**/*-page.tsx ...` should output ZERO files.
- Manual checklist items (lines 882-884) include physical drag-from-top-edge verification on built desktop binary for New Workspace, Invite, signup overlays.
- New surfaces (4 NEW auth pages + NotFoundPage) each have DragStrip mounting strategy documented (app-level wrapping for auth, first-flex-child for NotFound).

**Verdict:** PASS. Every existing DragStrip is audited with file:line; every new surface has a documented mounting approach; one grep test + one manual test cover the constraint end-to-end.

---

## Dimension 4 — WindowOverlay vs Route correctness (PASS)

**Evidence:**
- Hard Constraint #2 (line 904): "Pre-workspace flows on Desktop are NOT routes — they are `WindowOverlay` state per CLAUDE.md desktop route categories. Phase 6 ADDS `signup`, `email-verify`, `password-reset-request`, `password-reset` overlay types."
- Sub-Phase AUTH section "Desktop WindowOverlay extensions" (line 600): explicitly states the 4 NEW overlay types must be added to `apps/desktop/src/renderer/src/stores/window-overlay-store.ts` and that "pre-workspace flows are NOT routes per CLAUDE.md desktop route categories; auth flows are pre-workspace."
- DragStrip Enumeration row for new auth pages (line 784): "Desktop: WindowOverlay shell mounts overlay+DragStrip. NEW types added to `window-overlay-store.ts`."
- Web counterpart explicit: web mounts new auth pages at `apps/web/app/(auth)/{login,signup,email-verify,password-reset,password-reset-request}/page.tsx` (Next.js routes). Desktop mounts via WindowOverlay.
- WS-04 error-state row (line 750): "Workspace not accessible — Silent heal: `WorkspaceRouteLayout` drops the stale tab from the store; user lands on a valid workspace tab. NO error page rendered. (Per CLAUDE.md desktop route categories.)" — confirms the spec respects the silent-heal pattern instead of routing to a NoAccessPage on desktop.
- NotFoundPage (line 422): "Web mounts at `apps/web/app/not-found.tsx`; Desktop mounts via WindowOverlay-style fallback in the tab router."

**Verdict:** PASS. The spec consistently distinguishes pre-workspace flows from session routes, names the exact files where overlay types are registered, and explicitly cites CLAUDE.md desktop route categories. No accidental "desktop route for new auth flow" leaked into the inventory.

---

## Dimension 5 — Validation Architecture Coverage (FLAG)

**Evidence:**
- Per-component vitest commands (lines 818-849) enumerate test commands for all 22 component test files spanning DTL/AUTH/INB/SET/WS.
- E2E commands (lines 856-871) map cleanly to SC#1..5 from CONTEXT.md `<specifics>` section:
  - SC#1 (issue detail two-pane + SegmentedControl P0..P3) → `issue-detail-modal.spec.ts`
  - SC#2 (auth pages + wordmark + italic + strength meter) → `auth-flows.spec.ts`
  - SC#3 (DragStrip on every pre-workspace view) → `desktop-drag-region.spec.ts` + manual drag verification
  - SC#4 (Settings Danger Zone typed-name + dark-mode persistence) → `settings-danger-zone.spec.ts` + `settings-dark-mode-persists.spec.ts`
  - SC#5 (Inbox date-bucket + mark-all-read + E shortcut) → `inbox-grouping.spec.ts` + `inbox-mark-all-read-shortcut.spec.ts`
- Manual verification checklist (lines 875-884) covers what automated tests cannot (physical drag-from-edge on built desktop binary, sidebar↔settings dark-mode sync).

**Issues:**
- **FLAG-5.1** Hard Constraint #6 ("`@zxcvbn-ts/core` is lazy-loaded via dynamic `import()` so the kilobytes never hit the login bundle") has no explicit test command. The `password-strength-meter.test.tsx` (line 829) tests rendering and score buckets but the lazy-load behavior (login bundle does NOT include zxcvbn at parse time) requires either a bundle-size assertion or a Vitest spy on `import()`. Planner should add either (a) a bundle-size E2E (e.g. `pnpm --filter @multica/web build && stat -f%z .next/static/chunks/login-*.js`) or (b) a test that asserts `import.meta` lazy-load happens after first render.
- **FLAG-5.2** Hard Constraint #11 ("`navigateAwayFromCurrentWorkspace()` safe order is unchanged") is asserted by "existing tests passing" (line 762) but no explicit regression test command is enumerated for the safe-order property itself. Phase 6 inherits the existing tests, which is acceptable; planner should record the test file location for traceability.
- **FLAG-5.3** Hard Constraint #1 (DragStrip first flex child) is verified by the grep gate (line 788) which is a documented manual step but not in the per-component test list. Promoting it to an automated `pnpm test` step would be lower-effort than a Playwright run.

**Verdict:** FLAG. Validation coverage is comprehensive for the user-facing requirements; the gaps are around the auxiliary Hard Constraints (lazy-load, safe-order regression, grep gate). None block planning, but the planner should close them in the test plan.

---

## Dimension 6 — Hard Constraints Completeness (BLOCK)

**Evidence:**
- Hard Constraints Summary (lines 901-918) lists 15 constraints. Coverage by sub-phase:
  - **DTL:** #3 (Priority SegmentedControl mapping), #10 (Modal-footer Löschen → AlertDialog), #12 (AvatarInitial wraps no-image fallback), #13 (Issue type tags-field gap)
  - **AUTH:** #2 (Pre-workspace = WindowOverlay), #6 (zxcvbn lazy-load), #14 (signup/verify/reset endpoint gap)
  - **INB:** #5 (E shortcut input-focus + modifier-key guard)
  - **SET:** #4 (multica_theme localStorage; sidebar↔radio shared state)
  - **WS:** #11 (navigateAwayFromCurrentWorkspace safe order unchanged), #15 (PageHeader-per-page kept)
  - **Cross-cutting:** #1 (DragStrip first flex child), #7 (no `dark:*` overrides), #8 (no new tokens), #9 (German source-of-truth for new strings)
- Each sub-phase has ≥1 Hard Constraint addressed.

**Issues:**
- **BLOCK-6.1 — AUTH backend confirmed missing (verified by checker, not just flagged by spec).**

  The spec's Hard Constraint #14 says "Backend `signup` / `verifyEmail` / `passwordReset` endpoints **may not** exist". I verified directly:
  - `packages/core/api/client.ts` exposes only `sendCode(email)` and `verifyCode(email, code)` — no `signup`, no `verifyEmail`, no `requestPasswordReset`, no `resetPassword`, no `resendVerification`.
  - `server/internal/handler/auth.go` implements OTP magic-link only. The "signup" terminology in the Go code refers to whether the OTP flow allows creating a new user — NOT a password-based signup endpoint.
  - There is NO password column on user, NO password-hash logic, NO token-based reset machinery on the server.

  The spec presents this as a FLAG ("Required plan-phase decision") and lists three options (a) stub handlers + parallel tickets, (b) defer to v2, (c) drop entirely. **It must be promoted to a BLOCK** because:
  1. The UI-SPEC ships full page contracts for SignupPage / EmailVerifyPage / PasswordResetRequestPage / PasswordResetPage including 200ms zxcvbn debouncing, 60s resend cooldown, polling-vs-WS detection logic, validation rules, redirect targets — all of which are unimplementable until a backend contract exists.
  2. The component inventory lists 5 NEW production files + 5 NEW test files for these pages. A planner reading this spec would commit to building UI for nonexistent APIs.
  3. The spec's own recommendation (line 935) is option (b) — defer AUTH-02..AUTH-05 to a follow-up "Auth v2" phase. This recommendation should be lifted into the spec's authoritative scope, not left for the planner to re-decide.

  **Remediation (recommended):** Researcher revises UI-SPEC to scope Phase 6 to **AUTH-01 (LoginPage restyle) + AUTH-06 (test string updates)** only. Move AUTH-02..AUTH-05 (signup, email-verify, password-reset, password-reset-request, plus the PasswordStrengthMeter atom and zxcvbn catalog entries) to a new "Auth v2" phase entry in the roadmap. This is a ~10-line revision to the inventory + a ~5-line revision to the Copywriting Contract.

  **Remediation (alternative — if user insists on shipping page shells now):** Researcher revises UI-SPEC to mark AUTH-02..05 pages as "shell-only, submit handler logs `TODO: backend integration`, no real navigation on success". Strength meter ships fully (it's pure client-side). This keeps the visual phase complete but ships dead UI — worse user experience than option (b) but unblocks the design pipeline.

- **FLAG-6.2 — DTL-03 tags field also confirmed missing.** I verified `packages/core/types/issue.ts` has no `tags` field. Spec's Hard Constraint #13 correctly flags this. Recommended: defer DTL-03 to v2 (FTR-04 in roadmap), do not ship UI-only stub. Planner can promote to BLOCK if they prefer shell-only UI is unacceptable.

- **PASS-6.3 — INB-03 type field confirmed present.** I verified `packages/core/types/inbox.ts` line 28: `type: InboxItemType`. Spec correctly suspects this; planner can ship INB-03 as functional with high confidence.

**Verdict:** BLOCK. Five sub-phases have constraints, but the AUTH cluster (5 of 6 AUTH requirements) sits on top of unimplementable backend dependencies. The spec acknowledges the gap but treats it as a planner decision rather than a scope BLOCK. Without resolution, the planner will either (a) build dead UI or (b) make the scope decision themselves — both are checker-failure modes.

---

## Backend Endpoint Scope Verdict

**Question:** Is the AUTH-02..AUTH-05 backend gap a BLOCKER, or can the UI-SPEC ship page shells with `TODO: backend integration` placeholders?

**Verdict: BLOCKER.**

**Rationale:**
- Confirmed (not just flagged): no password-based auth exists in the codebase. The OTP magic-link flow is the only auth path. Adding password signup/verify/reset is a backend epic in its own right (DB migration for password column, hashing infra, reset-token table, email templates for reset links, rate limiting on reset endpoint, security review).
- A frontend-only UI shell for nonexistent endpoints creates dead surfaces a real user can navigate to. On Desktop, the new WindowOverlay types (`signup`, `email-verify`, `password-reset-request`, `password-reset`) would be reachable from sidebar links — a user clicking "Konto erstellen" on the LoginPage would land in a flow with no completion path.
- The spec's own recommendation (line 935): "option (b) — ship AUTH-01 + AUTH-06 in Phase 6; defer the new pages to a follow-up 'Auth v2' phase. This is the fastest path to a coherent v1 release."

**Recommended scope reduction for Phase 6:**

| Requirement | Status |
|-------------|--------|
| AUTH-01 LoginPage restyle (German + AlgoPlanWordmark + italic title) | KEEP |
| AUTH-06 test string updates | KEEP |
| AUTH-02 SignupPage (NEW) | DEFER to Auth v2 |
| AUTH-03 EmailVerifyPage (NEW) | DEFER to Auth v2 |
| AUTH-04 PasswordResetRequestPage (NEW) | DEFER to Auth v2 |
| AUTH-05 PasswordResetPage (NEW) | DEFER to Auth v2 |
| PasswordStrengthMeter atom | DEFER (only consumed by deferred pages) |
| `@zxcvbn-ts/core` catalog entry | DEFER |
| 4 new WindowOverlay types | DEFER |
| 4 new web routes (`apps/web/app/(auth)/{signup,email-verify,...}`) | DEFER |
| Login-page password-mode affordances ("Konto erstellen" link, "Passwort vergessen?" link) | DEFER (logic is gated on password mode existing — currently FALSE) |

**Net effect on Phase 6:** ~12 NEW files removed from inventory, ~7 NEW Copywriting rows removed (signup/verify/reset titles + buttons + descriptions), ~4 NEW E2E flows reduced to a single LoginPage smoke test. AUTH sub-phase shrinks from 6 reqs to 2 — bringing the AUTH cluster in proportion with INB (3) and SET (3).

The remaining DTL/INB/SET/WS sub-phases stand on their own and can ship as specified.

---

## Overall Verdict: REVISION REQUIRED

| Status | Count | Items |
|--------|-------|-------|
| BLOCK  | 1     | BLOCK-6.1 (AUTH backend gap) |
| FLAG   | 5     | FLAG-2.1 (missing test row), FLAG-2.2 (RESTYLE test status silent), FLAG-5.1 (no zxcvbn lazy-load test), FLAG-5.2 (safe-order regression test untraced), FLAG-5.3 (DragStrip grep gate not automated), FLAG-6.2 (DTL-03 tags field gap unresolved) |
| PASS   | 4     | Token Discipline, DragStrip Coverage, WindowOverlay vs Route, INB-03 type-field availability |

**Required actions before planning can proceed:**

1. **Researcher revises UI-SPEC** to scope down AUTH sub-phase to AUTH-01 + AUTH-06 (defer AUTH-02..05 to a new "Auth v2" phase). Update Component Inventory, Copywriting Contract, DragStrip Enumeration, Validation Architecture sections accordingly. Also revise Hard Constraints #6 and #14 (drop them since their dependencies are deferred).

2. **Researcher resolves DTL-03 tags-field gap** (recommended: defer DTL-03 too; remove `issue-detail-tag-row.tsx` from inventory; remove the right-pane "TagRow at very TOP" content-order line; remove the `+ Neues Tag` copywriting row; remove the test command).

3. **Researcher reconciles inventory ↔ validation commands** for the FLAGs in Dimension 2 and 5.

4. **Re-run gsd-ui-checker** after revisions land. Expected verdict on next pass: APPROVED.

