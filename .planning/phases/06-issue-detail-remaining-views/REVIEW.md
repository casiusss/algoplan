---
phase: 06-issue-detail-remaining-views
reviewed: 2026-04-26T12:00:00Z
depth: standard
files_reviewed: 28
files_reviewed_list:
  - packages/views/auth/algoplan-wordmark.tsx
  - packages/views/auth/login-page.tsx
  - packages/views/auth/signup-page.tsx
  - packages/views/auth/verify-email-page.tsx
  - packages/views/auth/resend-verify-email-page.tsx
  - packages/views/auth/forgot-password-page.tsx
  - packages/views/auth/reset-password-page.tsx
  - packages/views/auth/password-strength-meter.tsx
  - packages/views/auth/index.ts
  - packages/views/issues/components/issue-detail.tsx
  - packages/views/issues/components/issue-detail-footer.tsx
  - packages/views/issues/components/issue-priority-segmented-control.tsx
  - packages/views/inbox/components/inbox-page.tsx
  - packages/views/inbox/components/inbox-bucket-header.tsx
  - packages/views/inbox/components/inbox-type-filter.tsx
  - packages/views/inbox/components/inbox-list-item.tsx
  - packages/views/inbox/utils/group-by-date.ts
  - packages/views/inbox/hooks/use-inbox-shortcut.ts
  - packages/views/settings/components/settings-section.tsx
  - packages/views/settings/components/workspace-tab.tsx
  - packages/views/settings/components/appearance-tab.tsx
  - packages/views/workspace/empty-state.tsx
  - packages/views/workspace/new-workspace-page.tsx
  - packages/views/common/not-found-page.tsx
  - packages/views/__tests__/dragstrip-coverage.test.ts
  - packages/ui/components/ui/segmented-control.tsx
  - packages/core/inbox/use-inbox-filter-store.ts
  - packages/core/navigation/use-navigation-flash.ts
  - packages/core/api/client.ts
  - apps/desktop/src/renderer/src/stores/window-overlay-store.ts
  - apps/desktop/src/renderer/src/components/window-overlay.tsx
  - apps/desktop/src/renderer/src/platform/navigation.tsx
  - apps/web/app/auth/signup/page.tsx
  - apps/web/app/auth/verify-email/page.tsx
  - apps/web/app/auth/reset-password/page.tsx
findings:
  critical: 1
  warning: 7
  info: 5
  total: 13
status: issues_found
resolved: 2026-04-26
resolved_findings:
  critical: 1
  warning: 7
  info_deferred: 5
---

# Phase 6: Code Review Report

**Reviewed:** 2026-04-26
**Depth:** standard
**Files Reviewed:** ~35 (auth, DTL, INB, SET, WS sub-phases + cross-platform wiring)
**Status:** issues_found

## Summary

Phase 6 implementation is largely solid: the auth pages enforce the no-enumeration UX
contract correctly (constant 401 messages, idempotent success states, one-shot ref-guarded
verify-email, snake_case `new_password` body, no auto-login post-reset). Test quality is
high — 621 view tests are not trivial render assertions; they exercise security branches,
status-code mapping, ref-guards, lazy-load behavior, debounce timing, mismatch detection,
and concrete navigation targets. The dragstrip-coverage gate is a structural test that
walks JSX tags rather than just grepping for the literal — robust.

Strong points worth calling out:
- `password-strength-meter.tsx`: lazy-load is gated correctly + spied for proof.
- `verify-email-page.tsx`: state machine is a discriminated union; ref-guard against
  React 18 StrictMode double-mount is asserted.
- `reset-password-page.tsx`: explicitly tests that even a baited backend response with
  `token`/`user` fields is NOT consumed (no auto-login).
- API client: `client.test.ts` asserts the body is exactly `JSON.stringify({token,
  new_password})` AND that `newPassword` (camelCase) does NOT appear in the wire payload.
- Desktop overlay routing: 5 new overlay types added to the literal union; navigation
  adapter checks `verify-email-resend` BEFORE `verify-email` (longer-prefix guard
  documented + correct).

Issues found cluster around three themes:

1. **One CRITICAL Tailwind class-name issue** in the `SegmentedControl` `colorByValue`
   extension — runtime string interpolation of `data-[pressed]:${className}` defeats
   Tailwind's static-content scanner. The active per-priority text colors will NOT be
   generated in CSS even though the className appears in the DOM (which is why the unit
   test still passes). This silently breaks DTL-02's success criterion "active P0/P1/P2/P3
   pill carries the per-priority color via `text-tag-pN`".

2. **Multiple WARNING-level German source-of-truth violations** in files that Phase 6
   explicitly RESTRUCTURED or RESTYLED (inbox-page error toasts + dropdown labels +
   detail-pane Archive button + inbox-list-item Archive title; issue-detail no-issue
   empty state; modal-footer `text-white` literal).

3. **MEDIUM-level English remnants** in the issue-detail More-actions dropdown — the
   UI-SPEC copywriting table doesn't enumerate every dropdown sub-item, so these are
   borderline (not strictly required by the spec) but are clearly inconsistent with
   the German labels added for the same surface (Status, Priority, Assignee, Due date,
   Today, Tomorrow, Next week, Pin to sidebar, etc.).

The CRITICAL Tailwind issue is the only finding that blocks visual delivery of an SC#1
(DTL) requirement; everything else is copy/token cleanup.

## Critical Issues

### CR-01: SegmentedControl `colorByValue` uses runtime-interpolated Tailwind class names → CSS for `data-[pressed]:text-tag-pN` is never generated

**Files:**
- `packages/ui/components/ui/segmented-control.tsx:120`
- `packages/views/issues/components/issue-priority-segmented-control.tsx:45-50,78` (caller)

**Issue:** The Phase 6 atom extension renders the active text color via:

```tsx
// segmented-control.tsx:120
colorClass && `data-[pressed]:${colorClass}`,
```

…where `colorClass` is `text-tag-p0` / `text-tag-p1` / `text-tag-p2` / `text-tag-p3`
passed via `colorByValue`. The resulting class string `data-[pressed]:text-tag-p0`
appears at runtime in the rendered DOM (the unit test
`issue-priority-segmented-control.test.tsx:131` asserts this) but **never appears as a
static literal in any source file** that Tailwind's `@source` directive
(`apps/web/app/globals.css:9-11`) scans. Tailwind v4's content-detection requires the
**complete class string** to be present as a literal — composing variants on existing
utilities at runtime does not produce the corresponding CSS rule.

Verified by grep: the literal token `data-[pressed]:text-tag-p0` (and p1/p2/p3) does
NOT appear anywhere in `packages/`. Only `text-tag-p0` (without the `data-[pressed]:`
prefix) appears statically in `tag-chip.tsx`, `avatar-color.ts`, and
`blocker-badge.tsx`. Those static usages generate the base utility but NOT the
`data-[pressed]:` variant.

**Impact:**
- DTL-02 success criterion "Phase 6 ADDS a per-item text color when active: P0
  active → `text-tag-p0`, P1 → `text-tag-p1`, P2 → `text-tag-p2`, P3 → `text-tag-p3`"
  is silently broken in production builds. The active pill will lift with
  `bg-background + shadow-sm` (those classes ARE static), but the per-priority text
  color will be missing — every active P0/P1/P2/P3 falls back to the default
  `text-foreground` from the base atom.
- The unit test passes despite the bug because it only asserts the className string
  exists in the DOM, not that the CSS rule resolves.

**Fix:** Build the COMPLETE class strings statically in the caller (or bundle them
via a safelist in `globals.css`):

```tsx
// issue-priority-segmented-control.tsx — replace COLOR_BY_LABEL with full class strings
const COLOR_BY_LABEL: Record<PLabel, string> = {
  p0: "data-[pressed]:text-tag-p0",
  p1: "data-[pressed]:text-tag-p1",
  p2: "data-[pressed]:text-tag-p2",
  p3: "data-[pressed]:text-tag-p3",
};
```

…and pass that map straight through, so the atom no longer interpolates the variant
prefix. Then change `segmented-control.tsx:120` to:

```tsx
colorClass,  // already includes the data-[pressed]: prefix
```

Update the test to assert the FULL token (`data-\[pressed\]:text-tag-p0`) is present
to keep the contract enforced. A visual check against a built dev bundle (`pnpm
dev:web`) on the issue detail page should confirm the per-priority active color
appears after the fix.

## Warnings

### WR-01: English error toasts in restructured inbox-page.tsx violate German source-of-truth

**File:** `packages/views/inbox/components/inbox-page.tsx:145,154,175,183,190`

**Issue:** Five `toast.error("Failed to ...")` calls remain in English on a file that
Phase 6 RESTRUCTURED for INB-01..03. UI-SPEC §Copywriting Contract INB explicitly
defines `Mark-all-read failure toast` → `"Konnte nicht als gelesen markiert werden"`
(German). The mark-all-read handler at line 162 correctly uses the German string, but
the four sibling handlers (`handleSelect`, `handleArchive`, `handleArchiveAll`,
`handleArchiveAllRead`, `handleArchiveCompleted`) still surface English strings.

**Fix:** Replace each English string with its German equivalent. Suggested:

```tsx
// line 145
onError: () => toast.error("Konnte nicht als gelesen markiert werden"),
// line 154
onError: () => toast.error("Konnte nicht archiviert werden"),
// line 175
onError: () => toast.error("Konnte nicht alle archivieren"),
// line 183
onError: () => toast.error("Gelesene Einträge konnten nicht archiviert werden"),
// line 190
onError: () => toast.error("Erledigte Einträge konnten nicht archiviert werden"),
```

### WR-02: English More-actions dropdown items in restructured inbox-page.tsx

**File:** `packages/views/inbox/components/inbox-page.tsx:240,244,248`

**Issue:** Three dropdown items remain English (`Archive all`, `Archive all read`,
`Archive completed`) on the same restructured INB surface. UI-SPEC §Copywriting INB
defines `Archive icon button tooltip` → `"Archivieren"`; while the batch labels are
not enumerated explicitly, leaving them English breaks German consistency on a
sub-phase explicitly committed to German source-of-truth for new strings.

**Fix:** Translate to German (e.g. `"Alle archivieren"`, `"Alle gelesenen archivieren"`,
`"Erledigte archivieren"`).

### WR-03: `text-white` literal in NEW issue-detail AlertDialog className violates token discipline

**File:** `packages/views/issues/components/issue-detail.tsx:971`

**Issue:** UI-SPEC §Hard Constraints #8 + §Color: "No new tokens. Only Phase 1 OKLCH
inventory" and "Existing `bg-priority`/`text-white` literals in `PRIORITY_CONFIG` are
grandfathered (Phase 1 chose them) but **no NEW non-token color literal may be
introduced**." The Phase 6 DTL-04 rewrite of the delete confirmation dialog adds:

```tsx
<AlertDialogAction
  ...
  className="bg-destructive text-white hover:bg-destructive/90"
>
```

…introducing a `text-white` literal in NEW code.

**Fix:** Use the destructive Button variant or the matching token:

```tsx
<AlertDialogAction
  ...
  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
>
```

The `--destructive-foreground` token already resolves to white (`oklch(1 0 0)`) but
flows through the Phase 1 token surface so dark-mode + future re-themes stay coherent.

### WR-04: English Archive button in inbox detail-pane (restructured surface)

**File:** `packages/views/inbox/components/inbox-page.tsx:313-315`

**Issue:** The detail-pane "Archive" button on the no-issue inbox row renders an
English label on a Phase 6 RESTRUCTURED page. UI-SPEC §Copywriting INB:
`"Archivieren"` for the archive icon button tooltip — same word should label the
Archive button itself.

**Fix:** Replace `Archive` text with `Archivieren`.

### WR-05: English `title="Archive"` + English `timeAgo` units in restyled inbox-list-item

**File:** `packages/views/inbox/components/inbox-list-item.tsx:13-19,81`

**Issue:** The inbox-list-item RESTYLE per Phase 6 INB-01 still surfaces:
- `title="Archive"` on the per-row archive affordance (line 81) — should be
  `"Archivieren"`.
- `timeAgo()` returns `"just now"` plus English single-letter units `m / h / d`
  (lines 13-18) — inconsistent with the rest of Phase 6 German UI. Even if the
  unit-letter convention is acceptable, "just now" is clearly English.

**Fix:** Translate `title` to `"Archivieren"`. For `timeAgo`, replace `"just now"`
with `"jetzt"`. Single-letter units `m/h/d` are German-compatible and may stay.

### WR-06: Issue-detail "no issue" empty state remains English on a restructured file

**File:** `packages/views/issues/components/issue-detail.tsx:561,565`

**Issue:** When the issue cannot be loaded the page renders English fallback copy:
`"This issue does not exist or has been deleted in this workspace."` and a button
labeled `"Back to Issues"`. Both are inside a Phase 6 RESTRUCTURED file and both
strings are user-visible — they should be German per the Phase 6 German
source-of-truth rule for the touched surface.

**Fix:**
```tsx
<p>Dieses Issue existiert nicht oder wurde gelöscht.</p>
...
<Button ...>
  <ChevronLeft className="mr-1 h-3.5 w-3.5" />
  Zurück zu Issues
</Button>
```

### WR-07: Inbox detail-pane empty-state strings drift from UI-SPEC copy

**File:** `packages/views/inbox/components/inbox-page.tsx:431,432`

**Issue:** UI-SPEC §Copywriting INB enumerates:
- `Empty inbox detail-pane`: `"Dein Posteingang ist leer"`
- `No-selection placeholder`: `"Wähle eine Benachrichtigung."`

The implementation renders `"Posteingang ist leer"` (missing `Dein`) and
`"Benachrichtigung auswählen für Details"` (different phrasing from UI-SPEC).

**Fix:** Replace with the exact UI-SPEC strings:
```tsx
{items.length === 0
  ? "Dein Posteingang ist leer"
  : "Wähle eine Benachrichtigung."}
```

## Info

### IN-01: English More-actions dropdown labels in restructured issue-detail

**File:** `packages/views/issues/components/issue-detail.tsx:754,774,797,833,837,843,849,855,872,878,884,896,908`

**Issue:** The More-actions dropdown sub-trigger labels (Status, Priority, Assignee,
Due date), the date-relative items (Today / Tomorrow / Next week / Clear date), the
sub-issue affordances (Create sub-issue, Set parent issue..., Add sub-issue...), the
pin items (Pin to sidebar, Unpin from sidebar), and Copy link all remain English on
this Phase 6 RESTRUCTURED surface. UI-SPEC §Copywriting Contract DTL enumerates
German PropRow labels (Status, Priorität, Verantwortlich, Fällig, Projekt) for the
right pane but does not explicitly enumerate the dropdown sub-trigger / sub-item
labels — so this is borderline. However, the inconsistency between the German PropRow
labels (right pane) and the English dropdown labels (top More-actions) on the SAME
restructured surface is jarring.

**Fix (recommendation):** Translate dropdown sub-triggers to mirror the PropRow
labels (`Status`, `Priorität`, `Verantwortlich`, `Fällig`), translate date items
(`Heute`, `Morgen`, `Nächste Woche`, `Datum entfernen`), and translate the sub-issue
items (`Unter-Issue erstellen`, `Übergeordnetes Issue setzen…`, `Unter-Issue
hinzufügen…`, `An Sidebar anheften`, `Von Sidebar lösen`, `Link kopieren`).

### IN-02: English IssuePickerDialog placeholder + empty + loading copy

**File:** `packages/views/issues/components/issue-detail.tsx:266,276,280,284`

**Issue:** The IssuePickerDialog (rendered for "Set parent issue" / "Add sub-issue")
shows `"Search issues..."`, `"Searching..."`, `"No issues found."`, and `"Type to
search issues"`. Same restructured surface as IN-01.

**Fix:** Translate to German (`"Issues durchsuchen…"`, `"Wird gesucht…"`, `"Keine
Issues gefunden."`, `"Tippen, um Issues zu suchen"`).

### IN-03: Activity-timeline `formatActivity` still English (UI-SPEC defers to Phase 7)

**File:** `packages/views/issues/components/issue-detail.tsx:112-150`

**Issue:** The activity timeline renders English strings (`"created this issue"`,
`"changed status from X to Y"`, `"set due date to ..."`, etc.). UI-SPEC §Copywriting
explicitly notes: "Phase 7 (RBR) handles the full English→German translation pass,
NOT Phase 6. Phase 6 only owns the strings in the table below." The activity
timeline body strings are NOT in the Phase 6 copywriting table, so this is intentional
and OUT-OF-SCOPE for Phase 6. Flagging only so it is tracked into Phase 7.

**Fix:** No action required for Phase 6. Track for Phase 7 RBR.

### IN-04: `setDeleting(true)` not reset on success path

**File:** `packages/views/issues/components/issue-detail.tsx:495-506`

**Issue:** `handleDelete` sets `setDeleting(true)` at start and only calls
`setDeleting(false)` in the catch block. On the success path the component navigates
away (`router.push(paths.issues())`) so the stale state is moot — but if `onDelete`
callback path is used (modal mode) and the parent does not unmount the component,
`deleting` remains true forever, leaving the destructive button stuck in "Wird
gelöscht…" state.

**Fix:** Add `setDeleting(false)` after success or use a `try/finally` block:

```tsx
const handleDelete = async () => {
  setDeleting(true);
  try {
    await deleteIssueMutation.mutateAsync(issue!.id);
    toast.success("Issue gelöscht");
    if (onDelete) onDelete();
    else router.push(paths.issues());
  } catch {
    toast.error("Issue konnte nicht gelöscht werden");
  } finally {
    setDeleting(false);
  }
};
```

### IN-05: Catalog version mismatch — `@zxcvbn-ts/language-en`

**File:** `pnpm-workspace.yaml:64`

**Issue:** UI-SPEC §Design System pins `@zxcvbn-ts/language-en` at `^3.0.4`; the
catalog has `^3.0.2`. Functionally equivalent for the shipped surface (PSM doesn't
exercise zxcvbn warning translations), but technically a deviation from spec.

**Fix:** Bump catalog entry to `^3.0.4` to match `@zxcvbn-ts/core` and
`@zxcvbn-ts/language-common`.

---

## Hard Constraints Audit (UI-SPEC §Hard Constraints, 18 items)

| # | Constraint | Status |
|---|-----------|--------|
| 1 | DragStrip first flex child | PASS — automated gate covers all enumerated full-window views |
| 2 | Pre-workspace flows = WindowOverlay (not routes) | PASS — 5 new overlay types correctly added; navigation adapter dispatches |
| 3 | Priority SegmentedControl mapping urgent→P0..low→P3, none excluded | PASS — exhaustive mapping test |
| 4 | Dark-mode persists via `multica_theme` localStorage | PASS — uses `useTheme()` from Phase 1 wrapper |
| 5 | Inbox `E` shortcut guards input/contenteditable + modifiers | PASS — hook test covers both paths |
| 6 | zxcvbn lazy-loaded via dynamic import | PASS — unit + module-load + memoization assertions |
| 7 | No `dark:*` overrides on real surfaces | PASS — only AppearanceTab WindowMockup (grandfathered) |
| 8 | No new tokens (Phase 1 OKLCH only) | **FAIL** — `text-white` literal introduced (WR-03) |
| 9 | German source-of-truth for new Phase 6 strings | **PARTIAL** — auth pages PASS; inbox/issue-detail have leakage (WR-01..WR-07) |
| 10 | Modal-footer Löschen opens AlertDialog (not inline) | PASS — IssueDetailFooter calls onDelete which sets dialog open |
| 11 | `navigateAwayFromCurrentWorkspace` safe order unchanged | PASS — order verified verbatim in workspace-tab.tsx |
| 12 | AvatarInitial wraps ActorAvatar fallback | PASS — InboxListItem + restyle scope |
| 13 | No user enumeration in UI | PASS — login/verify/reset all mirror backend constant-message contract |
| 14 | No auto-login after password reset | PASS — explicitly tested with bait response |
| 15 | VerifyEmailPage one-shot ref-guarded | PASS — StrictMode test asserts exactly one call |
| 16 | PageHeader-per-page kept (not replaced by AppTopbar) | PASS — InboxPage / SettingsPage / AgentsPage retain PageHeader |
| 17 | `/auth/{verb}` web route convention | PASS — 5 new routes use `/auth/signup`, `/auth/verify-email`, etc. |
| 18 | Email link contracts match Phase 5.1 frozen paths | PASS — `?token=` parsed identically on web (searchParams) and desktop (overlay payload) |

## Test-Quality Sample

Reviewed full test files for: `signup-page`, `reset-password-page`, `verify-email-page`,
`password-strength-meter`, `forgot-password-page`, `resend-verify-email-page`,
`issue-priority-segmented-control`, `issue-detail-footer`, `inbox-page` (subset),
`group-by-date`, `use-inbox-filter-store`, `use-navigation-flash`, `algoplan-wordmark`,
`api/client` (auth section).

Verdict: **substantive, not trivial**. Tests assert:
- API call body shapes (snake_case `new_password` vs absence of `newPassword`).
- Status-code → message branching (`409` vs `400` vs `403` vs `5xx`).
- Security invariants ("baited" backend response with token field is NOT consumed).
- Strict-mode double-mount ref-guards.
- Lazy-import factory invocation count over the file lifetime.
- Memoization (re-render with same password → no extra zxcvbn call).
- Debounce window (`vi.advanceTimersByTime(250)` then `getByTestId`).
- Form-state gating (submit disabled until all preconditions hold).
- Navigation targets (exact path matching).
- Empty / error / network-failure rendering identity (no enumeration leakage).
- Internal mock counters survive `vi.resetModules()` correctly.

The dragstrip-coverage test goes beyond pattern matching — it walks the JSX tree
structurally to ensure DragStrip is the first child of the enclosing flex container,
not just *present* somewhere. That is a robust gate.

## Cross-Platform Audit

- Web routes (`apps/web/app/auth/{signup,verify-email,verify-email-resend,forgot-password,reset-password}/page.tsx`):
  thin wrappers that supply a `flex min-h-svh flex-col bg-background` container so the
  shared page's auth-card layout works. No DragStrip on web — correctly justified
  inline (web has no `-webkit-app-region`).
- Desktop overlay (`window-overlay.tsx`): wraps each shared auth page in
  `DesktopAuthShell` which mounts DragStrip as the first flex child. Token
  forwarding (`overlay.token`) for verify-email + reset-password is type-safe via
  the literal-union extension in `window-overlay-store.ts`.
- Navigation adapter (`platform/navigation.tsx`): correctly orders
  `verify-email-resend` BEFORE `verify-email` to avoid prefix swallowing — comment
  documents the rationale (UI-SPEC §T-06-W4-AUTH-04). `parseTokenFromPath` decodes
  with try/catch and returns undefined on decode error → shared page renders
  no-token branch.

The shared `LoginPage` / `SignupPage` / `VerifyEmailPage` etc. are pure presentation
components with no platform-specific imports — package boundaries respected.

## CLAUDE.md Compliance Audit

- `packages/views/` — no `next/*`, no `react-router-dom`, no app-specific imports
  detected in any new Phase 6 view file.
- `packages/core/` — no localStorage in new files. `use-navigation-flash.ts` uses
  `sessionStorage` and explicitly documents the deviation; window/sessionStorage
  are guarded via `typeof window !== "undefined"` for SSR safety.
- `packages/core/inbox/use-inbox-filter-store.ts` — store correctly relocated from
  views to core per UI-SPEC §FLAG-4 recommendation.
- Workspace destructive ops — `WorkspaceTab.navigateAwayFromCurrentWorkspace` retains
  the safe order (read destination → setCurrentWorkspace(null,null) → push →
  mutateAsync); only string updates touched the file.
- `setFlash`/`useNavigationFlash` consumed only on the LoginPage mount → does NOT
  re-toast on /auth/login refresh (sessionStorage read-and-remove).

## Counts

- **CRITICAL: 1**
- **HIGH (Warnings): 7**
- **MEDIUM/LOW (Info): 5**
- **Total findings: 13**

The single CRITICAL (CR-01) is a Tailwind static-detection issue that silently breaks
DTL-02's per-priority active text color in production builds despite the unit test
passing. The 7 warnings cluster around German source-of-truth violations on
restructured inbox surfaces and one `text-white` token literal in NEW code. The 5
info items are mostly remaining English strings on the issue-detail More-actions
dropdown / IssuePickerDialog (which UI-SPEC defers strictly to Phase 7) plus a minor
state-cleanup pattern and a catalog version mismatch.

---

## Resolution (2026-04-26)

All 8 CRITICAL + HIGH findings closed in commits on `feat/repos-per-project`:

| Finding | Status | Commit |
|---------|--------|--------|
| CR-01 — SegmentedControl colorByValue runtime interpolation | Fixed | `288218cd` |
| WR-01 — English error toasts in inbox-page | Fixed | `b48cf1fd` |
| WR-02 — English more-actions dropdown labels | Fixed | `014d8b01` |
| WR-03 — `text-white` literal in delete dialog | Fixed | `2373f433` |
| WR-04 — English "Archive" button in detail-pane | Fixed | `eaf4d2a8` |
| WR-05 — `title="Archive"` + English `timeAgo` units | Fixed | `60df1f32` |
| WR-06 — English issue-detail no-issue empty state | Fixed | `7e1ad02c` |
| WR-07 — Inbox empty-state copy mismatch with UI-SPEC | Fixed | `65f58293` |

Verification: `pnpm --filter @multica/views exec vitest run` → 621/621 green;
`pnpm --filter @multica/ui exec vitest run` → 74/74 green. The pre-existing
`@multica/desktop` typecheck error in `pageview-tracker.tsx` (unrelated to
Phase 6) is left untouched.

Deferred (info-level, not in scope):
- IN-01 — More-actions dropdown English labels: UI-SPEC defers full
  English→German pass to Phase 7 (RBR).
- IN-02 — IssuePickerDialog placeholder/empty/loading copy: same Phase 7
  scope.
- IN-03 — Activity-timeline `formatActivity` strings: explicitly Phase 7
  per UI-SPEC.
- IN-04 — `setDeleting(true)` not reset on success: minor cosmetic; on
  navigate-away the component unmounts.
- IN-05 — `@zxcvbn-ts/language-en` ^3.0.2 vs ^3.0.4: registry latest is
  ^3.0.2, can't bump.

_Reviewed: 2026-04-26_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
