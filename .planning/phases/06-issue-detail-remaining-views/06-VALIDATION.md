---
phase: 06-issue-detail-remaining-views
contract: nyquist
revised: 2026-04-26
status: planned
---

# Phase 6 — Validation Contract (Nyquist)

> **Authoritative test count for every NEW or EDITED test file across all 8 plans.** This is the gate the phase exit must reach: each test file MUST contain *at least* the specified number of `it`/`test` cases (more is allowed; less means missing coverage).
>
> "EDIT" rows count delta only when the existing baseline is known. Otherwise count expressed as "≥ N total" (existing + new combined).

---

## Per-plan authoritative test counts

### Plan 06-00 — Wave 0 foundation (atoms + utilities + DragStrip gate)

| Test file | Status | Authoritative count | What it covers |
|-----------|--------|---------------------|----------------|
| `packages/views/auth/algoplan-wordmark.test.tsx` | NEW | 5 | renders text, brand-dot present, default-size upright, lg-size italic + larger dot, font-semibold across sizes |
| `packages/views/auth/password-strength-meter.test.tsx` | NEW | 6 | empty state (no label, all muted), lazy-import gate (NOT called at module load + called after first non-empty render), score 0 (1 destructive), score 4 (4 success), memoization (no second import for same/different password), 200ms debounce |
| `packages/views/settings/components/settings-section.test.tsx` | NEW | 4 | renders heading + children, default-tone has no danger ring/dot, danger-tone has ring + decorative dot (aria-hidden), id passes through |
| `packages/views/workspace/empty-state.test.tsx` | NEW | 4 | renders heading + body, illustration slot when provided, CTA fires onClick when set, body omitted when not provided |
| `packages/views/common/not-found-page.test.tsx` | NEW | 4 | renders title/body/CTA, CTA navigates to root, AlgoPlanWordmark present, DragStrip is first child of root flex |
| `packages/views/__tests__/dragstrip-coverage.test.ts` | NEW | 26 | 13 enumerated full-window views × 2 assertions each (contains "<DragStrip" + first-flex-child structural check) |
| `packages/core/navigation/use-navigation-flash.test.ts` | NEW | 5 | setFlash writes namespaced sessionStorage, consumeFlash returns + clears, consumeFlash returns null when absent, useNavigationFlash calls toast on mount, idempotent across renders |

**Plan 06-00 total: 54 test cases (NEW)**

---

### Plan 06-01 — DTL (Issue Detail Modal)

| Test file | Status | Authoritative count | What it covers |
|-----------|--------|---------------------|----------------|
| `packages/ui/components/ui/segmented-control.test.tsx` | EDIT | ≥ 7 total (existing baseline + 3 new) | New: colorByValue absent (no data-color), colorByValue present applies to matching item, unknown key is harmless |
| `packages/views/issues/components/issue-priority-segmented-control.test.tsx` | NEW | 6 | renders 4 P-labeled items, exhaustive enum mapping (5 IssuePriority values), click P2 fires onChange("medium"), "Priorität entfernen" appears only when value !== "none", clicking it fires onChange("none"), aria-label="Priorität" |
| `packages/views/issues/components/issue-detail-footer.test.tsx` | NEW | 7 | Löschen on left, Esc-hint right, Fertig only when onDone defined, Fertig hidden when onDone undefined, Löschen click fires onDelete, Fertig click fires onDone, root container classes (sticky bottom-0 h-12 border-t) |
| `packages/views/issues/components/issue-detail.test.tsx` | EDIT | +10 new assertions | Eigenschaften heading, German prop labels (Status/Priorität/Verantwortlich/Fällig/Projekt), SegmentedControl 4 items present, modal-footer Löschen+Fertig, AlertDialog opens with German title "Issue löschen?", AlertDialog body German, confirm fires delete mutation, German toast strings, Fertig only in modal mode, More-actions Delete REMOVED (desktop) / kept (mobile) |

**Plan 06-01 total: 23 NEW + 10 EDIT assertions = ~33 contributions**

---

### Plan 06-02 — INB (Inbox)

| Test file | Status | Authoritative count | What it covers |
|-----------|--------|---------------------|----------------|
| `packages/views/inbox/utils/group-by-date.test.ts` | NEW | 10 | day 0 (today 23:59) → today, day -1 (yesterday 00:01) → yesterday, day -2 → this_week, day -6 → this_week, day -7 → older, day -30 → older, empty input → [], bucket order fixed (today→yesterday→this_week→older), empty buckets omitted, stable sort within bucket |
| `packages/views/inbox/hooks/use-inbox-shortcut.test.ts` | NEW | 7 | lowercase "e" fires, uppercase "E" fires, INPUT focus blocks, TEXTAREA focus blocks, contenteditable=true blocks, modifier keys (meta/ctrl/alt) block, unmount removes listener |
| `packages/core/inbox/use-inbox-filter-store.test.ts` | NEW | 6 | initial empty Set, toggleType adds + toggles off, clearFilters empties, applyInboxFilter passes-through when empty, applyInboxFilter narrows when populated, selector stability (same ref across renders unless mutated) |
| `packages/views/inbox/components/inbox-bucket-header.test.tsx` | NEW | 4 | German label per bucket key (4 cases via it.each), count rendered, sticky/border/h-9 classes, italic+font-semibold heading |
| `packages/views/inbox/components/inbox-type-filter.test.tsx` | NEW | 5 | renders 4 chips (Erwähnungen/Zuweisungen/Kommentare/System), TagChip color="brand", inactive opacity-60, click toggles store, aria-pressed reflects state |
| `packages/views/inbox/components/inbox-page.test.tsx` | EDIT | +11 new assertions | Title "Posteingang", buckets interleaved with rows, Alle gelesen button hidden when unreadCount===0, button visible+ click fires mutation, E shortcut fires, E inside textarea blocked, More-actions Mark all as read REMOVED, type filter narrows list, tooltip "Alle als gelesen markieren (E)", failure toast German, EmptyState heading "Keine Benachrichtigungen" |

**Plan 06-02 total: 32 NEW + 11 EDIT assertions = ~43 contributions**

---

### Plan 06-03 — SET (Settings)

| Test file | Status | Authoritative count | What it covers |
|-----------|--------|---------------------|----------------|
| `packages/views/settings/components/settings-page.test.tsx` | EDIT | +6 new assertions | German group labels (Mein Konto + Workspace), German tab labels (Profil/Erscheinungsbild/API-Tokens/Allgemein/Repositories/Mitglieder), title "Einstellungen", bg-sidebar on left nav, Gefahrenzone quick-jump renders, click scrollIntoView on #danger-zone |
| `packages/views/settings/components/appearance-tab.test.tsx` | EDIT | +8 new assertions | German labels Hell/Dunkel/System, section heading "Theme", group aria-label "Theme auswählen", per-option aria-labels, click each → setTheme(correct value), active option ring-2 ring-brand, brand-green check-icon at top-right of active mockup, sync-with-sidebar |
| `packages/views/settings/components/workspace-tab.test.tsx` | EDIT | +7 new assertions; existing safe-order unchanged | German section headings (Allgemein/Gefahrenzone/Workspace verlassen/Workspace löschen), German field labels (Name/Beschreibung/Kontext/Slug), Save button German, in-progress German, non-admin hint German, SettingsSection wrappers present, Danger Zone tone="danger" + id="danger-zone"; **safe-order test stays GREEN unchanged** |
| `packages/views/settings/components/delete-workspace-dialog.test.tsx` | EDIT | +5 new assertions; existing typed-name gate unchanged | Dialog title German, body German, confirm-instruction German with backtick markup, Cancel German, confirm button German, in-progress German; **typed-name gate test stays GREEN unchanged** |
| `packages/views/settings/components/account-tab.test.tsx` | NEW (smoke) | 2 | renders SettingsSection wrapper, German Profil heading + 1 German label |
| `packages/views/settings/components/members-tab.test.tsx` | NEW (smoke) | 2 | renders SettingsSection wrapper, German Mitglieder heading |
| `packages/views/settings/components/repositories-tab.test.tsx` | NEW (smoke) | 2 | renders SettingsSection wrapper, German Repositories heading |
| `packages/views/settings/components/tokens-tab.test.tsx` | NEW (smoke) | 2 | renders SettingsSection wrapper, German API-Tokens heading |

**Plan 06-03 total: 8 NEW + 26 EDIT assertions = ~34 contributions**

---

### Plan 06-04 — WS (Workspace + Agents + Error states + Web 404)

| Test file | Status | Authoritative count | What it covers |
|-----------|--------|---------------------|----------------|
| `packages/views/workspace/no-access-page.test.tsx` | EDIT | +5 new assertions | German title, German body, German primary CTA, German secondary CTA, AlgoPlanWordmark size="lg" present above heading |
| `packages/views/agents/components/agents-page.test.tsx` (if exists; otherwise N/A) | EDIT | +4 new assertions | PageHeader title "Agenten", Create CTA "Agent erstellen", EmptyState heading "Noch keine Agenten" for no-agents branch, archive tooltip German |

(Workspace switcher German strings + `apps/web/app/not-found.tsx` Next.js 404 wrapper validated by typecheck — no new vitest needed; the Next.js convention is enforced by Next's build.)

**Plan 06-04 total: ~9 EDIT assertions (depends on whether agents-page.test.tsx exists)**

---

### Plan 06-05 — Wave 2 AUTH entry (api client + LoginPage + ForgotPassword + ResendVerifyEmail)

| Test file | Status | Authoritative count | What it covers |
|-----------|--------|---------------------|----------------|
| `packages/core/api/client.test.ts` | EDIT | +18 new assertions | api.signup (200/400/403/409/body shape/path × 5), api.login (200/401-constant-shape × 2 paths/body/path × 4), api.verifyEmail (200/401/body/path × 3), api.resendVerifyEmail (200 always/body/path × 2), api.requestPasswordReset (200 always/body/path × 2), api.resetPassword (200 no-cookie/400/401/body snake_case/path × 5) — total ~21 across 6 methods |
| `packages/views/auth/login-page.test.tsx` | EDIT | +16 new assertions | AlgoPlanWordmark above title, italic German title "Willkommen zurück", description, email label, password sub-mode toggle, password field label "Passwort", password submit calls api.login, **two 401 mocks produce IDENTICAL constant message**, 403 message, 5xx generic message, Google "Mit Google fortfahren", "oder" separator, Konto erstellen link to /auth/signup, Passwort vergessen link to /auth/forgot-password, OTP path regression no-change (count baseline), German step strings (Code prüfen / Erneut senden / Zurück / CLI autorisieren etc.) |
| `packages/views/auth/forgot-password-page.test.tsx` | NEW | 7 | wordmark + title "Passwort zurücksetzen", description, E-Mail label, primary CTA + in-flight, idempotent success message + checkmark icon, **success regardless of email validity** (mocked api always resolves), back-to-login link |
| `packages/views/auth/resend-verify-email-page.test.tsx` | NEW | 7 | wordmark + title "Bestätigungslink erneut senden", description, E-Mail label, primary CTA + in-flight, idempotent success message, 60s cooldown after success (button disabled with countdown text), cooldown re-enables after 60s (fake timers) |

**Plan 06-05 total: 14 NEW + 39 EDIT (~21 + 18) assertions = ~53 contributions**

---

### Plan 06-06 — Wave 3 AUTH (Signup + VerifyEmail + ResetPassword)

| Test file | Status | Authoritative count | What it covers |
|-----------|--------|---------------------|----------------|
| `packages/views/auth/signup-page.test.tsx` | NEW | 11 | wordmark + italic title "Konto erstellen" + description, 3 fields (Name/E-Mail/Passwort), PasswordStrengthMeter renders, submit gating (empty name disabled, invalid email disabled, password<12 disabled, score<2 disabled, all green enabled — 5 micro-cases), 200 → push("/onboarding"), 409 specific error, 400 weak-password error, 403 gated error, 5xx generic error, login nudge to /auth/login |
| `packages/views/auth/password-strength-meter.test.tsx` | EDIT | +1 new assertion | onScoreChange callback fires with new score after compute resolves |
| `packages/views/auth/verify-email-page.test.tsx` | NEW | 7 | no-token branch (api NOT called) + correct title, in-flight branch, success branch with CheckCircle + CTA → root, failure 401 branch with XCircle + CTA → /auth/verify-email-resend, **strict-mode ref-guard** (api.verifyEmail called exactly once across double mount), no setTimeout/setInterval used (NOT polling), token forwarded in body |
| `packages/views/auth/reset-password-page.test.tsx` | NEW | 11 | no-token branch (api NOT called), form branch renders 2 password fields + meter + CTA, confirm-mismatch inline error, submit gating (mismatch disables, length<12 disables, score<2 disables, all green enables), 200 → setFlash + push("/auth/login"), **NO auto-login assertion** (no cookie consumption), 401 → failure branch + CTA → /auth/forgot-password, 400 → inline error, 5xx → generic error, body uses snake_case `new_password`, body sends token from prop |
| `packages/views/auth/login-page.test.tsx` | EDIT | +1 new assertion | LoginPage mounts useNavigationFlash("password-updated") and consumes the toast on mount (test: setFlash before render → render LoginPage → assert toast(message) called once) |

**Plan 06-06 total: 29 NEW + 2 EDIT assertions = ~31 contributions**

---

### Plan 06-07 — Wave 4 AUTH wiring (Web routes + Desktop overlays + nav + pre-workspace restyle)

| Test file | Status | Authoritative count | What it covers |
|-----------|--------|---------------------|----------------|
| **Web routes** (5 files) | NEW | 0 vitest, validated via tsc | Next.js `app/` route convention; verify-email + reset-password extract searchParams; correctness via typecheck + Next build |
| **Desktop overlay store + render + nav** | EDIT | 0 vitest, validated via tsc | Discriminated union exhaustiveness check enforces switch coverage in window-overlay.tsx; navigation.tsx interceptors are imperative (smoke-tested manually + via existing tests if present) |
| `packages/views/workspace/new-workspace-page.test.tsx` | EDIT | +3 new assertions | AlgoPlanWordmark size="lg", German title "Willkommen bei AlgoPlan", DragStrip stays first child |
| `packages/views/invite/invite-page.test.tsx` | EDIT (if exists) | +3 new assertions | wordmark above card, German strings across render branches (loading/error/default), DragStrip stays first child |
| `packages/views/onboarding/onboarding-flow.test.tsx` | EDIT (if exists) | +2 new assertions | wordmark in hero header, German shell strings |
| `packages/views/__tests__/dragstrip-coverage.test.ts` | (run unchanged) | Stays GREEN | Wave-0 gate is the proof that no restyle displaced DragStrip |

**Plan 06-07 total: ~8 EDIT assertions (test count is light because the wiring is mostly typecheck-gated)**

---

## Phase-6 grand total

| Source | NEW assertions | EDIT assertions | Combined contributions |
|--------|----------------|-----------------|------------------------|
| 06-00 (Wave 0) | 54 | 0 | 54 |
| 06-01 (DTL) | 23 | 10 | 33 |
| 06-02 (INB) | 32 | 11 | 43 |
| 06-03 (SET) | 8 | 26 | 34 |
| 06-04 (WS) | 0 | 9 | 9 |
| 06-05 (AUTH Wave 2) | 14 | 39 | 53 |
| 06-06 (AUTH Wave 3) | 29 | 2 | 31 |
| 06-07 (AUTH Wave 4) | 0 | 8 | 8 |
| **TOTAL** | **~160 NEW** | **~105 EDIT** | **~265 contributions** |

**Authoritative test count for Phase 6 exit gate: ≥ 265 test contributions across 8 plans.** Existing inherited regression coverage (workspace-tab safe-order, delete-workspace typed-name, OTP path, board-view, etc.) STAYS GREEN unchanged — no count change owed to those.

---

## E2E commands per Success Criterion (UI-SPEC §Validation Architecture)

```bash
# SC#1 — Issue detail two-pane + SegmentedControl P0..P3 (DTL-01, DTL-02, DTL-04)
pnpm exec playwright test e2e/tests/issue-detail-modal.spec.ts

# SC#2 — Auth pages (AUTH-01..05)
pnpm exec playwright test e2e/tests/auth-flows.spec.ts

# SC#3 — DragStrip on every pre-workspace desktop view
pnpm exec playwright test e2e/tests/desktop-drag-region.spec.ts

# SC#4 — Settings Danger Zone + dark-mode persistence (SET-02, SET-03)
pnpm exec playwright test e2e/tests/settings-danger-zone.spec.ts
pnpm exec playwright test e2e/tests/settings-dark-mode-persists.spec.ts

# SC#5 — Inbox grouping + mark-all-read + E shortcut (INB-01..03)
pnpm exec playwright test e2e/tests/inbox-grouping.spec.ts
pnpm exec playwright test e2e/tests/inbox-mark-all-read-shortcut.spec.ts
```

**Note**: E2E specs are NOT created by Phase 6 plans (they exist or are created later). The vitest-level coverage above is the enforced authoritative gate for plan completion.

---

## Bundle-size gate (UI-CHECK FLAG-5.1 belt-and-suspenders)

```bash
pnpm --filter @multica/web build
grep -L "zxcvbn" .next/static/chunks/app/\(auth\)/login/*.js
# Expected: file LISTED (no zxcvbn match) → lazy-load is working
```

Manual verification only — not part of vitest count.

---

## Dependency wave summary

| Wave | Plans | Parallel? |
|------|-------|-----------|
| 0 | 06-00 | (single) |
| 1 | 06-01 + 06-02 + 06-03 + 06-04 | parallel (no file overlap) |
| 2 | 06-05 | (single — extends api client first) |
| 3 | 06-06 | depends on 06-05's api methods + 06-00's PasswordStrengthMeter |
| 4 | 06-07 | depends on 06-05 + 06-06 (wires the 5 new shared pages into apps) |

Wave 1 and Wave 2 may run in parallel if file scopes do not overlap (they do not — Wave 1 touches DTL/INB/SET/WS surfaces, Wave 2 touches AUTH + api client). Conservative serialization: Wave 0 → Wave 1 ∥ Wave 2 → Wave 3 → Wave 4.
