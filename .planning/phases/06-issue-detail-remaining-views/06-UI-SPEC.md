---
phase: 6
slug: issue-detail-remaining-views
status: draft
shadcn_initialized: true
preset: base-nova (Base UI variant) — packages/ui/components.json
created: 2026-04-25
revised: 2026-04-26
revision_reason: Phase 5.1 (Auth Backend Endpoints) shipped 27/27 GREEN. AUTH-02..05 now have confirmed backend contracts. DTL-03 (Issue Tag Row) dropped from scope per 06-BLOCKED.md (deferred to Tags v1). UI-CHECK FLAGs 2.1, 2.2, 5.1, 5.2, 5.3 resolved; BLOCK-6.1 resolved; FLAG-6.2 resolved (DTL-03 deferred).
---

# Phase 6 — UI Design Contract

> Visual and interaction contract for every remaining user-facing view: the issue detail modal (DTL), the auth + pre-workspace flows (AUTH), the inbox (INB), the settings page (SET), workspace management + agents + error states (WS). Tokens (Phase 1), atoms (Phase 2 — `TagChip`, `AccentBar`, `AvatarInitial`, `SegmentedControl`), the dashboard shell (Phase 4 — `DashboardShell`, `AppSidebar`, `AppTopbar`), and the Phase 5 Italic-Inter convention for display headers are inherited; this contract reuses them and introduces zero new tokens.
>
> **Scope shape note.** Phase 6 is the largest visual phase of the rebrand. The 20 in-scope requirements (DTL-03 deferred to Tags v1 per `06-BLOCKED.md`) split into five sub-phases that the planner is expected to commit independently:
>
> 1. **DTL** — Issue detail modal restructure (3 reqs: DTL-01, DTL-02, DTL-04). Two-pane layout, SegmentedControl priority, modal footer. *(DTL-03 Tag Row dropped — see header.)*
> 2. **AUTH** — Auth + pre-workspace flow restyle (6 reqs). New AlgoPlan brand chrome, **NEW** signup/verify-email/reset-password pages with `@zxcvbn-ts/core` strength meter, refresh of existing OTP `LoginPage`, NewWorkspacePage + InvitePage + OnboardingFlow visual pass. Backend endpoints confirmed live in Phase 5.1.
> 3. **INB** — Inbox restyle (3 reqs). Date-bucket grouping, mark-all-read button, keyboard shortcut `E`, optional type filter chips.
> 4. **SET** — Settings restructure (3 reqs). Sectioned layout, Danger Zone, Light/Dark/System radio.
> 5. **WS** — Workspace + agent + error states (5 reqs). Workspace switcher refresh, AgentsPage with AvatarInitial, empty-states with illustration slot, NoAccessPage + 404 redesign, Desktop destructive-ops safe-order verification.
>
> Cross-cutting: every full-window desktop view (anything outside `<DashboardShell>`) MUST mount `<DragStrip />` from `@multica/views/platform` as the first flex child of its page root — otherwise the macOS window cannot be dragged. Phase 6 enumerates and audits every such view.

---

## Design System

| Property | Value |
|----------|-------|
| Tool | shadcn (already initialized in `packages/ui/components.json`) — INHERITED |
| Preset | `base-nova` style, Base UI variant — repo-local config; no third-party registry |
| Component library | `@base-ui/react` (NOT Radix — project-wide convention) |
| Icon library | `lucide-react` (per `components.json`) |
| Font | Inter via `--font-sans` (Phase 1). **Italic axis IS used** in Phase 6 for: (a) auth page titles per AUTH-01, (b) Settings section headings (subtle display use), (c) Inbox date-bucket headings. Body, buttons, inputs, table cells stay UPRIGHT. |
| Style helper | `cva` from `class-variance-authority` for variants; `cn` from `@multica/ui/lib/utils` for class merging |
| Render helper | `useRender` + `mergeProps` from `@base-ui/react` only where polymorphism is required (auth pages stay plain components) |
| Strength-meter library | `@zxcvbn-ts/core` `^3.0.4` + `@zxcvbn-ts/language-common` `^3.0.4` + `@zxcvbn-ts/language-en` `^3.0.4`. NEW catalog entries in `pnpm-workspace.yaml`. Imported only inside the new `password-strength-meter.tsx` atom (lazy loaded via `import()` so the kilobytes never leak into the login bundle). Rationale below in Sub-Phase AUTH. |
| Imports BLOCKED inside Phase 6 view directories | `next/*`, `react-router-dom`, any hex color, any RGB color, any `dark:bg-*` / `dark:text-*` override (theming flows through tokens — same rule as Phases 2 + 4 + 5). Existing `bg-priority`/`text-white` literals in `PRIORITY_CONFIG` are grandfathered (Phase 1 chose them) but no NEW non-token color literal may be introduced. |
| Imports REQUIRED outward direction | Phase 6 views may import from `@multica/core/*` (auth, workspace, queries, mutations, navigation, modals, paths), `@multica/ui/*` (atoms + primitives), Phase 2 atoms, Phase 4 shell components, and existing same-directory siblings. They MUST NOT import any app-specific code (no `next/*`, no `react-router-dom` from `apps/desktop`, no `electron`). |

---

## Spacing Scale

Inherits Phase 1's 8-point scale. Declared values used by this phase:

| Token | Value | Usage in Phase 6 |
|-------|-------|------------------|
| xs | 4px (`gap-1`, `p-1`) | Modal-footer button gap; PropRow internal label gap; password-strength meter segment gap |
| sm | 8px (`gap-2`, `p-2`) | Issue detail right-pane PropRow vertical gap; Inbox row internal padding; Settings tab list gap; auth card form-field gap |
| md | 16px (`gap-4`, `p-4`) | Issue detail content `px-4`; Inbox bucket header padding; auth card outer padding (`p-6`); Settings section padding |
| lg | 24px (`p-6`, `gap-6`) | Auth card outer padding; settings section vertical gap; agents-page detail body padding |
| xl | 32px (`p-8`) | Issue detail content area horizontal padding (`px-8` — preserved from existing); auth page vertical breathing |
| 2xl | 48px (`h-12`) | DragStrip height (existing); auth page top-affordance row top offset (`top-16` from existing pages, ≈64px to clear traffic lights and DragStrip together); Inbox/Settings PageHeader height; Issue detail modal-footer height |
| 3xl | 64px | (not used in this phase) |

### Issue detail layout contract

| Aspect | Value |
|--------|-------|
| Outer container | `<ResizablePanelGroup orientation="horizontal" className="flex-1 min-h-0">` (existing — kept verbatim) |
| Left pane (content) | `<ResizablePanel id="content" minSize="50%">` — title + description + sub-issues + activity + comments. `flex-col`, scroll body uses `flex-1 overflow-y-auto`. Inner content rail: `mx-auto w-full max-w-4xl px-8 py-8` (UNCHANGED — existing rail width is correct for AlgoPlan layout; widening would dilute the editorial column). |
| Right pane (properties) | `<ResizablePanel id="sidebar" defaultSize={320} minSize={260} maxSize={420} collapsible>` (existing — sizing unchanged). Inner padding `p-4`, vertical section gap `space-y-5`. |
| Mobile fallback | `<Sheet>` slide-over for the right pane; left pane fills the viewport (existing — kept verbatim). |
| Modal-footer band | NEW. A 48px sticky band at the BOTTOM of the LEFT pane (NOT the right pane) holding `[Löschen]` (left) + `[Esc schließen]` + `[Fertig]` (right). Implementation: render `<IssueDetailFooter>` as the last flex child of the left pane with `border-t bg-card sticky bottom-0`. Replaces the current pattern where Delete is buried in the More-actions dropdown. |

### Auth card layout contract (shared by Login / Signup / VerifyEmail / RequestPasswordReset / ResetPassword)

| Aspect | Value |
|--------|-------|
| Outer page | `flex min-h-svh flex-col bg-background` — DragStrip is FIRST flex child; centered card region fills the rest. |
| Centered region | `flex flex-1 flex-col items-center justify-center px-6 pb-12` (matches existing `NewWorkspacePage` pattern) |
| Card | `<Card class="w-full max-w-sm">` (existing pattern from `LoginPage`). Verify-email + reset-password may be `max-w-md` to accommodate token-state messaging + helper copy more comfortably. |
| Card header | `<CardHeader class="text-center">` containing: (1) `<AlgoPlanWordmark size="lg" />` (NEW shared atom — see Component Inventory), (2) `<CardTitle class="text-2xl italic font-semibold">{German title}</CardTitle>` per AUTH-01, (3) `<CardDescription>{German subtitle}</CardDescription>`. |
| Top affordance row | When the page is reachable from elsewhere (Back, Log out): two ghost buttons absolutely positioned `top-16 left-12` and `top-16 right-12` (existing convention from `NewWorkspacePage`). Phase 6 KEEPS this convention — a header bar would compete with the centered card visual. |

### Inbox layout contract

| Aspect | Value |
|--------|-------|
| Outer container | `<ResizablePanelGroup>` (existing) — list pane + detail pane. UNCHANGED. |
| List PageHeader | `h-12` (existing). |
| List bucket header | NEW. `<InboxBucketHeader>` row, `h-9` (36px), sticky `top-0 z-10 bg-card`. Contains the German bucket label (italic) + count, plus `border-b border-border` to separate from rows. |
| Row | `<InboxListItem>` — existing row, restyled per Sub-Phase INB. Height stays at content-driven (current `py-2.5` ≈ 40px). Adds optional left AccentBar (read state) — see INB section. |

### Settings layout contract

| Aspect | Value |
|--------|-------|
| Outer container | `<Tabs orientation="vertical">` — UNCHANGED. |
| Left nav | `w-52 shrink-0 border-r overflow-y-auto p-4` — UNCHANGED. |
| Right pane | `flex-1 overflow-y-auto` containing `mx-auto max-w-3xl p-6` rail — UNCHANGED. |
| Section block | `<SettingsSection>` (NEW shared atom — see Inventory). Each section: italic heading row (`text-sm italic font-semibold`) + body card. Section vertical gap `space-y-8` (existing). |
| Danger Zone visual | Same `<SettingsSection>` shell but heading carries the destructive accent dot and the section body has a `border-destructive/30` ring (NEW) — soft signal that the surface is destructive without being noisy. |

### Auth-card auto-margins

`max-w-sm` (24rem = 384px) keeps the card from growing on wide screens; vertical centering is handled by `min-h-svh + items-center justify-center`. For windows under ~480px tall (rare on desktop), the centering yields scroll on `pb-12` overflow — acceptable.

---

## Typography

This phase uses ONE additional typography role beyond Phases 2/4/5: **Display title (italic)** for auth and section headings. All other roles inherit.

| Role | Tailwind class | Computed | Weight | Line height | Used by |
|------|---------------|----------|--------|-------------|---------|
| Display (italic) — auth title | `text-2xl italic` | 24px | `font-semibold` (600) | `leading-tight` (1.25) | `<CardTitle>` of LoginPage / SignupPage / VerifyEmailPage / RequestPasswordResetPage / ResetPasswordPage |
| Display (italic) — settings section heading | `text-sm italic` | 14px | `font-semibold` (600) | default | `<SettingsSection>` heading; Danger Zone heading |
| Display (italic) — inbox bucket heading | `text-sm italic` | 14px | `font-semibold` (600) | default | InboxBucketHeader (Heute/Gestern/Diese Woche/Älter) |
| Page title (upright) | `text-base` | 16px | `font-semibold` (600) | `leading-tight` (1.25) | Settings sidebar `"Einstellungen"`; Inbox PageHeader `"Posteingang"`; Issue detail breadcrumb |
| Issue title input | `text-2xl` | 24px | `font-bold` (700) | `leading-snug` (1.375) | `<TitleEditor>` inside issue detail (UNCHANGED from current; bold matches Linear-style title weight) |
| Body | `text-sm` | 14px | `font-medium` (500) | `leading-snug` (1.375) | Form labels, button labels, list item titles, modal copy |
| Body — secondary | `text-sm` | 14px | `font-normal` (400) | `leading-relaxed` (1.625) | CardDescription; long-form helper paragraphs (welcome copy, danger-zone descriptions) |
| Caption | `text-xs` | 12px | `font-medium` (500) | default | PropRow label; Inbox row time-ago; settings field hint; password-strength label |
| Caption — heavy | `text-xs` | 12px | `font-semibold` (600) | `leading-none` | Inbox unread count; PropRow value badge; password-strength score word |
| Numerals | — | — | — | — | All numeric badges (inbox unread, settings count) carry `tabular-nums`. |

**Italic usage:** Auth display titles and section/bucket display headings ONLY. Body text, labels, buttons, inputs, table content, modal copy, dropdown items stay upright. Never italicize destructive copy — italic destructive reads as a typography mistake, not a brand element.

**Numerals:** `tabular-nums` on every count badge to prevent jitter (inbox unread, agent counts, member counts).

**Font-family token:** `--font-sans` only. Phase 6 never touches `--font-serif` / `--font-mono`. The DeleteWorkspaceDialog's `<code>{workspaceName}</code>` element is the lone exception — `font-mono` is intentional there to make the typed name visually distinct from prose. Existing behavior, kept.

---

## Color

Phase 6 consumes Phase 1 semantic tokens exclusively. Status colors flow through `STATUS_CONFIG`; priority colors flow through `PRIORITY_CONFIG` (both existing, unchanged in Phase 6).

| Role | Token | Usage in Phase 6 |
|------|-------|------------------|
| Dominant (60%) | `--background`, `--card`, `--sidebar` | Auth pages: `bg-background`. Cards: `bg-card`. Settings nav: `bg-sidebar` (NEW — was `bg-background`; brings settings nav in line with main app sidebar so the visual rhythm doesn't break when navigating from sidebar→settings). |
| Secondary (30%) | `--muted` (form-field disabled, helper text background, slug display block), `--muted-foreground` (caption text), `--border` (card borders, separator lines, danger-zone ring) | Form input chrome, helper text, separators. |
| Accent (10%) | `--brand`, `--tag-p0..p3`, `--success`, `--info`, `--warning`, `--destructive` | Reserved-for list below. |
| Destructive | `--destructive` | Delete-workspace primary; Danger-Zone ring + heading dot; password-meter score 0-1 fill; "remove avatar" button hover; toast errors (existing); modal-footer Delete button. |
| Focus ring | `--ring` | All interactive elements: `focus-visible:ring-[3px] focus-visible:ring-ring/50`. Inherits from button/input primitives. |

**Accent reserved for** (exhaustive — accent MUST NOT appear elsewhere on Phase 6 surfaces):

1. **Issue detail — modal-footer "Fertig" button** — `<Button variant="default">` (`bg-primary` brand-green). The ONE primary CTA in the modal.
2. **Issue detail — modal-footer "Löschen" button** — `<Button variant="destructive">`. NEW: surfaces destructive at modal footer instead of buried in dropdown.
3. **Issue detail — Priority SegmentedControl active item** — Phase 2 atom's standard active treatment (`bg-background` lift over `bg-muted` track). The active P0/P1/P2/P3 pill carries the per-priority color via `text-tag-pN` on the active item only.
4. **Issue detail — Assignee `<AvatarInitial>`** — Phase 2 atom; deterministic palette per name. Replaces the current `<ActorAvatar>` fallback path WHEN the actor has no image.
5. **Auth pages — primary CTA** — `<Button variant="default" size="lg" class="w-full">` reading `"Weiter"`, `"Anmelden"`, `"Konto erstellen"`, `"Code bestätigen"`, `"Passwort speichern"`, `"Link senden"`. Brand-green. Single primary CTA per auth page.
6. **Auth pages — Google button** — `<Button variant="outline" size="lg" class="w-full">` (existing — kept). Carries the Google logo SVG (existing four-color hex literals are GRANDFATHERED — Google brand requires exact hex). NO other hex literals are introduced.
7. **Password-strength meter — segment fills** — 4 segments mapped to score buckets: `score 0-1 → bg-destructive` (1 segment filled), `score 2 → bg-warning` (2 segments), `score 3 → bg-info` (3 segments), `score 4 → bg-success` (4 segments). Empty segments use `bg-muted`. NO new tokens.
8. **Inbox — unread row indicator** — `<AccentBar color="brand" orientation="vertical" />` as a 3px-wide leading edge on each UNREAD row. Read rows show `bg-transparent` in that slot.
9. **Inbox — Mark-all-read button** — `<Button variant="ghost" size="sm">{checkmarkIcon} Alle gelesen</Button>` in the inbox PageHeader. Brand-green only on hover via `hover:text-brand`.
10. **Settings — Danger Zone heading dot** — `size-1.5 rounded-full bg-destructive` decorative dot left of the heading text. The ONE destructive accent in the settings nav and section header.
11. **Settings — Dark-mode active radio** — current `appearance-tab.tsx` uses `ring-2 ring-brand` on the active option; Phase 6 KEEPS this. NEW: also adds a brand-green check-mark icon at the top-right corner of the active mockup (`absolute top-1 right-1`) for an extra visual cue.
12. **Workspace tab — Save button** — `<Button>` (default brand-green). Existing.
13. **Workspace switcher dropdown — active workspace row** — `data-state=open:bg-sidebar-accent` (existing). NO accent inside the dropdown rows.
14. **AgentsPage — selected agent row** — `data-selected:bg-accent` (existing pattern). The agent's `<AvatarInitial>` carries the per-name color (Phase 2 atom).
15. **NoAccessPage — primary CTA** — `<Button>{Zu meinen Workspaces}</Button>` brand-green (existing). Single CTA.
16. **404 page (NEW)** — `<Button>{Zur Startseite}</Button>` brand-green. Single CTA. Mirror of NoAccessPage with different copy.

**No hex / no RGB.** Same Phase 1 contract. The Google logo SVG is the lone exception — explicitly grandfathered and limited to the LoginPage Google button.

**60/30/10 verification:** On the issue detail modal: left pane (cards/canvas, ~60%) + right pane (PropRow muted backgrounds + sidebar tone, ~30%) + accent surfaces (SegmentedControl active pill + assignee avatars + modal-footer buttons, ~10%). On auth pages: page background (~60%) + Card surface (~30%) + brand CTA + wordmark dot + strength-meter (~10%).

**Dark mode:** Phase 1 tokens already include dark variants for every color used here. Phase 6 introduces ZERO `dark:*` overrides. Existing `dark:` overrides in `WindowMockup` of `appearance-tab.tsx` are GRANDFATHERED (the mockups are deliberate visual previews of light/dark themes, NOT real surfaces). Audit: no NEW `dark:` overrides may be added in Phase 6.

---

## Copywriting Contract

Phase 6 surfaces are the most visible product copy after Phase 5. **German source-of-truth** for all NEW Phase 6 strings (per response_language guidance + matching Phase 5 KBN-03 inline-add convention). Existing English strings are kept where the file is otherwise untouched in Phase 6 — Phase 7 (RBR) handles the full English→German translation pass, NOT Phase 6. Phase 6 only owns the strings in the table below (NEW or REPLACED).

### Issue Detail (DTL)

| Element | Copy | Language |
|---------|------|----------|
| Modal-footer Delete button | `"Löschen"` | German (NEW) |
| Modal-footer Esc-close hint | `"Esc zum Schließen"` | German (NEW) |
| Modal-footer Done button | `"Fertig"` | German (NEW) |
| Right-pane section heading — Properties | `"Eigenschaften"` | German (REPLACES `"Properties"`) |
| Right-pane section heading — Details | `"Details"` | German (same word) |
| Right-pane section heading — Parent issue | `"Übergeordnetes Issue"` | German (REPLACES `"Parent issue"`) |
| Right-pane section heading — Token usage | `"Token-Verbrauch"` | German (REPLACES `"Token usage"`) |
| PropRow Status label | `"Status"` | German (same) |
| PropRow Priority label | `"Priorität"` | German (REPLACES `"Priority"`) |
| PropRow Assignee label | `"Verantwortlich"` | German (REPLACES `"Assignee"`) |
| PropRow Due date label | `"Fällig"` | German (REPLACES `"Due date"`) |
| PropRow Project label | `"Projekt"` | German (REPLACES `"Project"`) |
| Sub-issues heading | `"Unter-Issues"` | German (REPLACES `"Sub-issues"`) |
| Add sub-issues link | `"+ Unter-Issue hinzufügen"` | German (REPLACES `"Add sub-issues"`) |
| Activity heading | `"Aktivität"` | German (REPLACES `"Activity"`) |
| Subscribe / Unsubscribe | `"Abonnieren"` / `"Abbestellen"` | German (REPLACES `"Subscribe"` / `"Unsubscribe"`) |
| Delete confirmation dialog title | `"Issue löschen?"` | German (REPLACES `"Delete issue"`) |
| Delete confirmation body | `"Dieses Issue und alle Kommentare werden dauerhaft gelöscht. Diese Aktion kann nicht rückgängig gemacht werden."` | German (REPLACES current English) |
| Delete confirmation cancel | `"Abbrechen"` | German |
| Delete confirmation confirm | `"Löschen"` | German |
| Delete success toast | `"Issue gelöscht"` | German (REPLACES `"Issue deleted"`) |
| Delete failure toast | `"Issue konnte nicht gelöscht werden"` | German (REPLACES `"Failed to delete issue"`) |

> **DTL-03 dropped from scope** — see `06-BLOCKED.md`. The Issue type has no `tags` field; row deferred to Tags v1. No tag-row copy in this phase.

### Auth Flows (AUTH)

> **All AUTH pages communicate failures with constant messaging — NO user enumeration.** The backend returns `401 "invalid credentials"` on Login regardless of whether the email exists or the password was wrong (Phase 5.1 SC#1). Frontend mirrors: NEVER distinguish "Unbekannte E-Mail" vs "Falsches Passwort". Same for password-reset/request and email-verify/resend — these always return 200 (idempotent) and the UI displays a generic "Wenn die E-Mail existiert, …" message.

| Element | Copy | Language |
|---------|------|----------|
| AlgoPlanWordmark text | `"AlgoPlan"` | English (brand) |
| LoginPage email step title | `"Willkommen zurück"` | German (REPLACES `"Sign in to Multica"`) |
| LoginPage email step description | `"Melde dich mit deinem Passwort an oder fordere einen Anmeldecode an."` | German |
| LoginPage email field label | `"E-Mail"` | German |
| LoginPage password field label | `"Passwort"` | German (NEW — visible when password mode is the active sub-step) |
| LoginPage primary CTA (password mode) | `"Anmelden"` | German |
| LoginPage primary CTA (OTP request) | `"Code anfordern"` | German |
| LoginPage Google CTA | `"Mit Google fortfahren"` | German (REPLACES `"Continue with Google"`) |
| LoginPage "or" separator | `"oder"` | German (REPLACES `"or"`) |
| LoginPage signup nudge | `"Noch kein Konto? "` + `<AppLink>"Konto erstellen"</AppLink>` | German (NEW — links to /auth/signup) |
| LoginPage password-reset nudge | `"Passwort vergessen?"` | German (NEW — links to /auth/forgot-password) |
| LoginPage error — invalid credentials | `"E-Mail oder Passwort ist falsch."` | German (NEW — constant 401 message; covers both unknown-email AND wrong-password to match backend no-enumeration contract) |
| LoginPage error — gated signup (403) | `"Registrierung nicht verfügbar."` | German |
| LoginPage error — generic (5xx) | `"Etwas ist schiefgelaufen. Bitte versuche es erneut."` | German |
| Code step title | `"Code prüfen"` | German (REPLACES `"Check your email"`) |
| Code step description | `"Wir haben einen Code an {email} gesendet."` | German |
| Code step Resend (cooldown active) | `"Erneut senden in {n}s"` | German |
| Code step Resend (active) | `"Code erneut senden"` | German |
| Code step Back | `"Zurück"` | German |
| Code step error — invalid | `"Ungültiger oder abgelaufener Code."` | German |
| CLI authorize title | `"CLI autorisieren"` | German |
| CLI authorize body | `"CLI als {email} auf AlgoPlan zugreifen lassen?"` | German |
| CLI authorize confirm | `"Autorisieren"` | German |
| CLI authorize switch account | `"Anderes Konto verwenden"` | German |
| **SignupPage** — title | `"Konto erstellen"` | German (NEW page) |
| **SignupPage** — description | `"Erstelle dein AlgoPlan-Konto in einer Minute."` | German |
| **SignupPage** — name field label | `"Name"` | German |
| **SignupPage** — email field label | `"E-Mail"` | German |
| **SignupPage** — password field label | `"Passwort"` | German |
| **SignupPage** — password hint | `"Mindestens 12 Zeichen."` | German (matches backend 12-byte min) |
| **SignupPage** — strength meter labels | Score 0: `"Sehr schwach"`, 1: `"Schwach"`, 2: `"Okay"`, 3: `"Stark"`, 4: `"Sehr stark"` | German |
| **SignupPage** — primary CTA | `"Konto erstellen"` | German |
| **SignupPage** — primary CTA (in flight) | `"Wird erstellt…"` | German |
| **SignupPage** — login nudge | `"Bereits ein Konto? "` + `<AppLink>"Anmelden"</AppLink>` | German |
| **SignupPage** — error: 409 duplicate | `"Diese E-Mail ist bereits registriert."` | German (the ONE place where we must distinguish — backend returns 409 for duplicate; UI shows it because the user opted to create an account, not log in) |
| **SignupPage** — error: 400 weak password | `"Passwort entspricht nicht den Mindestanforderungen."` | German (matches backend 12-72 byte band) |
| **SignupPage** — error: 403 gated | `"Registrierung ist derzeit nicht verfügbar."` | German |
| **SignupPage** — error: generic | `"Konto konnte nicht erstellt werden. Bitte versuche es erneut."` | German |
| **SignupPage** — success (post-signup, before redirect) | (no toast — signup returns 200 + cookies; immediately redirect to `/onboarding` if first-time, else `/auth/verify-email` reminder) | — |
| **VerifyEmailPage** — title (in-flight) | `"E-Mail wird bestätigt…"` | German (NEW page; reached via `/auth/verify-email?token=<token>` link from email) |
| **VerifyEmailPage** — title (success) | `"E-Mail bestätigt"` | German |
| **VerifyEmailPage** — body (success) | `"Du kannst jetzt loslegen."` | German |
| **VerifyEmailPage** — primary CTA (success) | `"Weiter zu AlgoPlan"` | German (links to root — workspace switcher will pick the right destination) |
| **VerifyEmailPage** — title (failure) | `"Bestätigung fehlgeschlagen"` | German |
| **VerifyEmailPage** — body (failure) | `"Dieser Link ist abgelaufen oder wurde bereits verwendet."` | German (matches backend 401 — single message for reuse/expired/invalid) |
| **VerifyEmailPage** — failure CTA | `"Neuen Link anfordern"` | German (links to `/auth/verify-email-resend`) |
| **VerifyEmailPage** — title (no token in URL) | `"Ungültiger Link"` | German |
| **VerifyEmailPage** — body (no token in URL) | `"Dieser Bestätigungslink ist unvollständig. Fordere einen neuen Link an."` | German |
| **ResendVerifyEmailPage** — title | `"Bestätigungslink erneut senden"` | German (NEW page at `/auth/verify-email-resend`) |
| **ResendVerifyEmailPage** — description | `"Gib deine E-Mail-Adresse ein. Wir senden einen neuen Bestätigungslink."` | German |
| **ResendVerifyEmailPage** — email field label | `"E-Mail"` | German |
| **ResendVerifyEmailPage** — primary CTA | `"Link senden"` | German |
| **ResendVerifyEmailPage** — primary CTA (in flight) | `"Wird gesendet…"` | German |
| **ResendVerifyEmailPage** — success state | `"Wenn ein Konto mit dieser E-Mail existiert und noch nicht bestätigt ist, haben wir einen neuen Link gesendet."` | German (mirrors backend always-200 idempotent contract — no enumeration) |
| **ForgotPasswordPage** — title | `"Passwort zurücksetzen"` | German (NEW page at `/auth/forgot-password`) |
| **ForgotPasswordPage** — description | `"Gib deine E-Mail-Adresse ein. Wir senden dir einen Link zum Zurücksetzen."` | German |
| **ForgotPasswordPage** — email field label | `"E-Mail"` | German |
| **ForgotPasswordPage** — primary CTA | `"Link senden"` | German |
| **ForgotPasswordPage** — primary CTA (in flight) | `"Wird gesendet…"` | German |
| **ForgotPasswordPage** — success state | `"Wenn ein Konto mit dieser E-Mail existiert, haben wir einen Link zum Zurücksetzen gesendet. Prüfe dein Postfach."` | German (mirrors backend always-200 idempotent contract — no enumeration) |
| **ForgotPasswordPage** — back-to-login link | `"Zurück zur Anmeldung"` | German |
| **ResetPasswordPage** — title | `"Neues Passwort wählen"` | German (NEW page at `/auth/reset-password?token=<token>`) |
| **ResetPasswordPage** — description | `"Wähle ein starkes Passwort, das du nirgendwo sonst verwendest."` | German |
| **ResetPasswordPage** — new-password field label | `"Neues Passwort"` | German |
| **ResetPasswordPage** — confirm-password field label | `"Passwort bestätigen"` | German |
| **ResetPasswordPage** — password hint | `"Mindestens 12 Zeichen."` | German |
| **ResetPasswordPage** — strength meter labels | (reuse SignupPage labels) | German |
| **ResetPasswordPage** — confirm-mismatch inline error | `"Passwörter stimmen nicht überein."` | German |
| **ResetPasswordPage** — primary CTA | `"Passwort speichern"` | German |
| **ResetPasswordPage** — primary CTA (in flight) | `"Wird gespeichert…"` | German |
| **ResetPasswordPage** — success toast (after redirect to /auth/login) | `"Passwort aktualisiert. Bitte melde dich an."` | German (mirrors backend `"Password updated. Please log in."` — backend intentionally does NOT auto-login per Phase 5.1 Pitfall §6) |
| **ResetPasswordPage** — title (failure / 401) | `"Link abgelaufen"` | German |
| **ResetPasswordPage** — body (failure / 401) | `"Dieser Link ist abgelaufen oder wurde bereits verwendet."` | German (matches backend single 401 message) |
| **ResetPasswordPage** — failure CTA | `"Neuen Link anfordern"` | German (links to /auth/forgot-password) |
| **ResetPasswordPage** — title (no token in URL) | `"Ungültiger Link"` | German |
| **ResetPasswordPage** — body (no token in URL) | `"Dieser Link ist unvollständig. Fordere einen neuen Link an."` | German |
| **ResetPasswordPage** — error: 400 weak password | `"Passwort entspricht nicht den Mindestanforderungen."` | German |
| **ResetPasswordPage** — error: generic | `"Passwort konnte nicht aktualisiert werden. Bitte versuche es erneut."` | German |
| Sign-out button (universal — sidebar workspace switcher dropdown) | `"Abmelden"` | German (REPLACES `"Log out"` in pre-workspace pages — NewWorkspacePage / InvitePage / NoAccessPage / OnboardingFlow shells) |
| **NewWorkspacePage** — title | `"Willkommen bei AlgoPlan"` | German (REPLACES `"Welcome to Multica"`) |
| **NewWorkspacePage** — body | `"Ein Workspace, in dem du und deine KI-Teamkollegen Hand in Hand arbeiten — Issues übernehmen, kommentieren, denselben Kontext teilen."` | German |
| **NewWorkspacePage** — invite hint | `"Du kannst nach dem Erstellen Teammitglieder einladen."` | German |
| **NewWorkspacePage** — Back button | `"Zurück"` | German |
| **InvitePage** — Join title | `"{Workspace} beitreten"` | German |
| **InvitePage** — Join body | `"{Inviter} hat dich als {Rolle} eingeladen."` | German |
| **InvitePage** — Decline | `"Ablehnen"` | German |
| **InvitePage** — Accept | `"Annehmen & beitreten"` | German |
| **InvitePage** — Joined success | `"Du bist {Workspace} beigetreten!"` | German |
| **InvitePage** — Not found title | `"Einladung nicht gefunden"` | German |
| **InvitePage** — Already-handled message | `"Diese Einladung wurde bereits {akzeptiert/abgelehnt}."` | German |

### Inbox (INB)

| Element | Copy | Language |
|---------|------|----------|
| InboxPage PageHeader title | `"Posteingang"` | German (REPLACES `"Inbox"`) |
| Bucket — today | `"Heute"` | German |
| Bucket — yesterday | `"Gestern"` | German |
| Bucket — this week | `"Diese Woche"` | German |
| Bucket — older | `"Älter"` | German |
| Mark-all-read button label | `"Alle gelesen"` | German |
| Mark-all-read tooltip | `"Alle als gelesen markieren (E)"` | German |
| Mark-all-read success toast | (silent — match existing behaviour) | — |
| Mark-all-read failure toast | `"Konnte nicht als gelesen markiert werden"` | German |
| Empty state | `"Keine Benachrichtigungen"` | German |
| No-selection placeholder | `"Wähle eine Benachrichtigung."` | German |
| Empty inbox detail-pane | `"Dein Posteingang ist leer"` | German |
| Filter chip — Mentions | `"Erwähnungen"` | German (NEW — only if INB-03 type-filter ships) |
| Filter chip — Assignments | `"Zuweisungen"` | German |
| Filter chip — Comments | `"Kommentare"` | German |
| Filter chip — System | `"System"` | German |
| Archive icon button tooltip | `"Archivieren"` | German |

### Settings (SET)

| Element | Copy | Language |
|---------|------|----------|
| SettingsPage left-nav title | `"Einstellungen"` | German |
| SettingsPage left-nav group — My Account | `"Mein Konto"` | German |
| SettingsPage left-nav group — Workspace | `{workspace.name}` (existing fallback) or `"Workspace"` | German |
| Tabs labels — Profile | `"Profil"` | German |
| Tabs labels — Appearance | `"Erscheinungsbild"` | German |
| Tabs labels — API Tokens | `"API-Tokens"` | German |
| Tabs labels — General | `"Allgemein"` | German |
| Tabs labels — Repositories | `"Repositories"` | German |
| Tabs labels — Members | `"Mitglieder"` | German |
| AppearanceTab section heading | `"Theme"` | German (same word) |
| AppearanceTab option — Light | `"Hell"` | German |
| AppearanceTab option — Dark | `"Dunkel"` | German |
| AppearanceTab option — System | `"System"` | German |
| AppearanceTab radio aria-label root | `"Theme auswählen"` | German |
| AppearanceTab radio aria-label per option | `"{Hell/Dunkel/System} auswählen"` | German |
| WorkspaceTab section — General | `"Allgemein"` | German |
| WorkspaceTab Save button | `"Speichern"` | German |
| WorkspaceTab Save in-progress | `"Wird gespeichert…"` | German |
| WorkspaceTab field labels — Name / Description / Context / Slug | `"Name"` / `"Beschreibung"` / `"Kontext"` / `"Slug"` | German |
| WorkspaceTab non-admin hint | `"Nur Admins und Owner können Workspace-Einstellungen ändern."` | German |
| Danger Zone section title | `"Gefahrenzone"` | German |
| Leave workspace heading | `"Workspace verlassen"` | German |
| Leave workspace body | `"Entferne dich aus diesem Workspace."` (or sole-owner variants) | German |
| Leave workspace button | `"Workspace verlassen"` | German |
| Leave-in-progress | `"Wird verlassen…"` | German |
| Delete workspace heading | `"Workspace löschen"` | German |
| Delete workspace body | `"Lösche diesen Workspace und alle Daten dauerhaft."` | German |
| Delete workspace button | `"Workspace löschen"` | German |
| Delete-workspace dialog title | `"Workspace löschen"` | German |
| Delete-workspace dialog body | `"Diese Aktion kann nicht rückgängig gemacht werden. Alle Issues, Agenten und Daten werden dauerhaft entfernt."` | German |
| Delete-workspace dialog confirm-instruction | `"Zur Bestätigung tippe `{workspaceName}` unten ein."` | German |
| Delete-workspace dialog Cancel | `"Abbrechen"` | German |
| Delete-workspace dialog confirm button | `"Workspace löschen"` | German |
| Delete-workspace in-progress | `"Wird gelöscht…"` | German |

### Workspace / Agents / Error States (WS)

| Element | Copy | Language |
|---------|------|----------|
| AgentsPage PageHeader title | `"Agenten"` | German |
| AgentsPage Create CTA | `"Agent erstellen"` | German |
| AgentsPage empty (no agents) | `"Noch keine Agenten"` | German |
| AgentsPage empty (active hidden) | `"Keine aktiven Agenten"` | German |
| AgentsPage empty (archived) | `"Keine archivierten Agenten"` | German |
| AgentsPage detail placeholder | `"Wähle einen Agenten."` | German |
| AgentsPage archive tooltip — show | `"Archivierte Agenten anzeigen"` | German |
| AgentsPage archive tooltip — hide | `"Aktive Agenten anzeigen"` | German |
| NoAccessPage title | `"Workspace nicht verfügbar"` | German |
| NoAccessPage body | `"Dieser Workspace existiert nicht oder du hast keinen Zugriff."` | German |
| NoAccessPage primary CTA | `"Zu meinen Workspaces"` | German |
| NoAccessPage secondary CTA | `"Mit anderem Konto anmelden"` | German |
| **404 page (NEW shared)** title | `"Seite nicht gefunden"` | German |
| **404 page** body | `"Diese Seite gibt es nicht oder sie wurde verschoben."` | German |
| **404 page** primary CTA | `"Zur Startseite"` | German |
| Workspace switcher dropdown header | `"AlgoPlan"` | English (brand) |
| Workspace switcher footer logout | `"Abmelden"` | German |
| Workspace switcher add-workspace | `"Workspace erstellen"` | German |

**Internationalization seam:** All NEW strings authored as plain literals in source. Aria-labels with dynamic counts (`"{count} ungelesen"`) MUST use a small pluralization helper (`count === 1 ? "ungelesene Benachrichtigung" : "ungelesene Benachrichtigungen"`).

**Destructive actions in this phase:** Issue delete (DTL-04 modal-footer) — confirmation dialog with the existing `<AlertDialog>` primitive, German strings above. Workspace leave / delete (SET-03) — Leave is `<AlertDialog>` confirmation, Delete is the typed-name `<DeleteWorkspaceDialog>`.

---

## Backend Contract (consumed by AUTH sub-phase)

These signatures are **frozen by Phase 5.1** (27/27 GREEN, all six endpoints live). Phase 6 implementations MUST match exactly:

| Endpoint | Request body | Success | Failure modes | UI handling |
|----------|-------------|---------|---------------|-------------|
| `POST /auth/signup` | `{email: string, password: string (12-72 bytes UTF-8), name: string}` | `200 LoginResponse` + `Set-Cookie multica_auth` | `400` weak password, `403` signup gated, `409` duplicate email, `5xx` generic | Error mapping per copywriting rows. **Auto-login on success** (cookie set). Redirect to `/onboarding` (first-time) or `/auth/verify-email-pending` reminder. |
| `POST /auth/login` | `{email: string, password: string}` | `200 LoginResponse` + `Set-Cookie multica_auth` | `401` invalid credentials (constant message — covers unknown email AND wrong password — backend deliberately collapses both into one to prevent enumeration) | UI MUST show ONE message for any 401: `"E-Mail oder Passwort ist falsch."` Never branch on which side failed. |
| `POST /auth/email-verify` | `{token: string}` | `200 UserResponse` | `401` invalid/expired/reused token (backend collapses these three — single message) | VerifyEmailPage reads `?token=` from URL on mount, fires this once. Three render branches: in-flight / success / failure (single message + "Neuen Link anfordern"). |
| `POST /auth/email-verify/resend` | `{email: string}` | `200` always (idempotent) | none surfaced — even unknown email returns 200; rate-limited 60s/email server-side | UI shows generic success message regardless of email validity. Cooldown enforced client-side via 60s timer that disables the resend button. |
| `POST /auth/password-reset/request` | `{email: string}` | `200` always (idempotent) | none surfaced — rate-limited 1h/email server-side | UI shows generic "Wenn ein Konto mit dieser E-Mail existiert…" message. NO cooldown UI affordance (1h is too long to display a countdown — just submit + show success once). |
| `POST /auth/password-reset/confirm` | `{token: string, new_password: string (12-72 bytes)}` | `200 {message: "Password updated. Please log in."}` — **NO cookies, NO auto-login** | `401` invalid/expired/reused token, `400` weak password, `5xx` generic | On success: navigate to `/auth/login` with toast `"Passwort aktualisiert. Bitte melde dich an."`. The toast appears via `useNavigationFlash()` (Phase 4 utility) so it survives the page transition. |

**Email link contracts (built by backend, consumed by frontend):**

| Email | Link template |
|-------|---------------|
| Email verification | `{FRONTEND_ORIGIN}/auth/verify-email?token=<token>` |
| Password reset | `{FRONTEND_ORIGIN}/auth/reset-password?token=<token>` |

**Critical security constraints baked into the UI:**

1. **No user-enumeration via UI.** The login error message MUST NOT distinguish "unknown email" from "wrong password". Backend collapses both into 401-with-constant-message; the UI MUST do the same. Same for `verify-email/resend` and `password-reset/request` — both always succeed visibly.
2. **No auto-login after password reset.** Per Phase 5.1 Pitfall §6: a brief-inbox-access adversary should not walk away with a long-lived session. UI redirects to `/auth/login` and shows a success toast — user re-authenticates with their new password.
3. **Constant messaging for all "verification failed" states.** Reused token, expired token, malformed token — all collapse to a single user-facing message. Distinguishing them helps an attacker probing token validity more than it helps a legitimate user.

---

## Component Inventory

Every file added, replaced, or rewritten in Phase 6 with role and reused atoms. Grouped by sub-phase. **Test-file rows are explicit** (resolves UI-CHECK FLAG-2.1 + FLAG-2.2).

### Sub-Phase DTL — Issue Detail Modal

| File | Status | Role | Reused atoms / components |
|------|--------|------|---------------------------|
| `packages/views/issues/components/issue-detail.tsx` | RESTRUCTURE | Adds `<IssueDetailFooter>` as last left-pane child; replaces priority `<PriorityPicker>` with `<IssuePrioritySegmentedControl>`; removes Delete from More-actions dropdown; rewrites all property-section copy to German. | Phase 2 `<SegmentedControl>`, `<AvatarInitial>`; existing `<ResizablePanelGroup>`, `<Sheet>`, `<DropdownMenu>`, `<AlertDialog>`, `<TitleEditor>`, `<ContentEditor>`, `<CommentCard>`, `<CommentInput>` |
| `packages/views/issues/components/issue-detail-footer.tsx` | NEW | The 48px sticky modal footer. `border-t bg-card sticky bottom-0` containing `[Löschen]` left + `[Esc schließen]` hint + `[Fertig]` right. | `<Button>` |
| `packages/views/issues/components/issue-detail-footer.test.tsx` | NEW | Renders left/right halves; Löschen click opens AlertDialog; Esc hint visible; Fertig only renders when `onDone` defined. | — |
| `packages/views/issues/components/issue-priority-segmented-control.tsx` | NEW | Wraps Phase 2 `<SegmentedControl>` for the priority picker. Maps `IssuePriority` enum (urgent/high/medium/low/none) to P0/P1/P2/P3 (none→excluded by default, accessible via "Clear" affordance). Active item carries the per-priority text color. | Phase 2 `<SegmentedControl>` + `<SegmentedControlItem>` |
| `packages/views/issues/components/issue-priority-segmented-control.test.tsx` | NEW | Renders 4 items P0..P3; clicking P2 → fires `onUpdate({ priority: "medium" })`; mapping table is exhaustive; "Priorität entfernen" button appears only when priority is set. | — |
| `packages/views/issues/components/issue-detail.test.tsx` | EDIT | Update assertions: title-button now German "Eigenschaften"; Priority slot is SegmentedControl (assert role + 4 items); Modal footer renders Löschen/Fertig; clicking Löschen opens AlertDialog with German title. | — |

### Sub-Phase AUTH — Auth + Pre-Workspace Flows

| File | Status | Role | Reused atoms / components |
|------|--------|------|---------------------------|
| `packages/views/auth/algoplan-wordmark.tsx` | NEW | Shared brand atom: small geometric mark + `"AlgoPlan"` italic Inter Semibold. Two sizes: `default` (sidebar use — already in Phase 4) and `lg` (auth pages, larger leading). | none (pure visual) |
| `packages/views/auth/algoplan-wordmark.test.tsx` | NEW | Renders both size variants; brand dot present; text reads "AlgoPlan". | — |
| `packages/views/auth/password-strength-meter.tsx` | NEW | 4-segment colored meter + score label. Lazy-loads `@zxcvbn-ts/core` via dynamic `import()` so the kilobytes never hit the login bundle. Memoizes the loaded core for re-use. | `<div>` segments only; no other atoms |
| `packages/views/auth/password-strength-meter.test.tsx` | NEW | (1) Renders empty 4-segment placeholder when password is empty. (2) After typing, asserts the right number of filled segments per score bucket. (3) **Lazy-load assertion**: spies on `import()` and asserts it is NOT called at module-load time but IS called after the first non-empty render. (4) Score-label text matches German bucket names. | — |
| `packages/views/auth/login-page.tsx` | RESTYLE + COPY | Existing OTP login page. Changes: AlgoPlan wordmark + italic title; German strings; new `[Konto erstellen]` link below the Continue button; new `[Passwort vergessen?]` link; new password-mode sub-step (email + password fields → `api.login()`; OTP path unchanged). | `<AlgoPlanWordmark>` |
| `packages/views/auth/login-page.test.tsx` | EDIT | Update text assertions to German; new test: 401 from `api.login()` shows constant message regardless of which side failed. | — |
| `packages/views/auth/signup-page.tsx` | NEW | Brand-new page. Form: Name + Email + Password fields; password-strength meter under password field; primary CTA `"Konto erstellen"`; secondary link `"Bereits ein Konto? Anmelden"`. Submits to `api.signup({ name, email, password })`. On success: cookies set by backend, redirect to `/onboarding`. Error handling per copywriting. | `<AlgoPlanWordmark>`, `<PasswordStrengthMeter>`, `<Card>`, `<Input>`, `<Label>`, `<Button>` |
| `packages/views/auth/signup-page.test.tsx` | NEW | Renders all fields; submit disabled until name non-empty + email valid + password score ≥ 2; submit fires `api.signup`; 409 shows duplicate-email error; 400 shows weak-password error; success redirects to /onboarding. | — |
| `packages/views/auth/verify-email-page.tsx` | NEW | Brand-new page at `/auth/verify-email?token=<token>`. On mount: reads `?token=` from URL; if absent renders "Ungültiger Link" branch; otherwise fires `api.verifyEmail({ token })` once. Renders one of three states: in-flight (spinner + title), success (checkmark + CTA), failure (error icon + "Neuen Link anfordern" CTA). | `<AlgoPlanWordmark>`, `<Card>`, `<Button>` |
| `packages/views/auth/verify-email-page.test.tsx` | NEW | (1) No-token URL renders "Ungültiger Link" branch without API call. (2) Valid token fires `api.verifyEmail` once on mount. (3) 200 response renders success state + CTA. (4) 401 response renders failure state + resend link. (5) Calling `api.verifyEmail` twice (re-render) does NOT re-fire. | — |
| `packages/views/auth/resend-verify-email-page.tsx` | NEW | Brand-new page at `/auth/verify-email-resend`. Single email field + "Link senden" CTA. On submit: fires `api.resendVerifyEmail({ email })`, replaces form with generic success message regardless of response. | `<AlgoPlanWordmark>`, `<Card>`, `<Input>`, `<Label>`, `<Button>` |
| `packages/views/auth/resend-verify-email-page.test.tsx` | NEW | Submits email; success state renders generic message; resend button has 60s cooldown after submit (client-side guard against rapid resubmits). | — |
| `packages/views/auth/forgot-password-page.tsx` | NEW | Brand-new page at `/auth/forgot-password`. Single email field + "Link senden" CTA. On submit: fires `api.requestPasswordReset({ email })`, replaces form with generic success message regardless of response. | `<AlgoPlanWordmark>`, `<Card>`, `<Input>`, `<Label>`, `<Button>` |
| `packages/views/auth/forgot-password-page.test.tsx` | NEW | Submits email; success state replaces form; back-to-login link navigates correctly. | — |
| `packages/views/auth/reset-password-page.tsx` | NEW | Brand-new page at `/auth/reset-password?token=<token>`. Reads `?token=` from URL. No-token branch renders "Ungültiger Link". Otherwise renders form: New + Confirm password fields, PasswordStrengthMeter under New, primary CTA `"Passwort speichern"`. On submit: fires `api.resetPassword({ token, new_password })`. **On success**: navigate to `/auth/login` with toast `"Passwort aktualisiert. Bitte melde dich an."` (NO auto-login per Phase 5.1 contract). On 401: render failure branch with "Neuen Link anfordern" CTA → /auth/forgot-password. | `<AlgoPlanWordmark>`, `<PasswordStrengthMeter>`, `<Card>`, `<Input>`, `<Label>`, `<Button>` |
| `packages/views/auth/reset-password-page.test.tsx` | NEW | (1) No-token URL renders "Ungültiger Link" branch. (2) Renders both password fields; confirm-mismatch shows inline error; submit disabled until match + score ≥ 2. (3) Submit fires `api.resetPassword`; success navigates to /auth/login + flashes toast. (4) 401 shows failure branch + resend link. (5) 400 shows weak-password error. | — |
| `packages/views/auth/index.ts` | EDIT | Re-export new pages + the wordmark atom + the strength meter atom. | — |
| `packages/views/workspace/new-workspace-page.tsx` | RESTYLE + COPY | Add `<AlgoPlanWordmark size="lg" />` to the title block; convert title to italic; German strings. DragStrip stays as first flex child. | `<AlgoPlanWordmark>` |
| `packages/views/invite/invite-page.tsx` | RESTYLE + COPY | Add wordmark to the InviteShell; German strings throughout the 5 render branches (loading / error / default / accepted / declined). DragStrip stays first flex child. | `<AlgoPlanWordmark>` |
| `packages/views/onboarding/onboarding-flow.tsx` | LIGHT EDIT | Onboarding is its own multi-step shell — Phase 6 only updates the "Welcome to Multica" + similar copy via the wordmark atom + German strings. Step internals stay unchanged. | `<AlgoPlanWordmark>` |

### Sub-Phase INB — Inbox

| File | Status | Role | Reused atoms / components |
|------|--------|------|---------------------------|
| `packages/views/inbox/components/inbox-page.tsx` | RESTRUCTURE | Add `<InboxBucketHeader>` rows interleaved with `<InboxListItem>` rows, computed via `groupInboxByDate()`. Replace dropdown-buried "Mark all as read" with a header `[Alle gelesen]` button. Add keyboard shortcut `E` (handled at page level — guarded against input/textarea focus). German strings. | `<InboxBucketHeader>` (NEW), `<InboxListItem>` (existing, restyled), `<TagChip>` (NEW — for INB-03 type filter chips) |
| `packages/views/inbox/components/inbox-page.test.tsx` | EDIT | Renders bucket headers in correct order; mark-all-read button calls mutation; E shortcut fires; E inside input does NOT fire. | — |
| `packages/views/inbox/components/inbox-bucket-header.tsx` | NEW | Sticky header row: italic German label (Heute/Gestern/Diese Woche/Älter) + count + `border-b border-border bg-card`. `h-9 sticky top-0 z-10`. | none (pure layout) |
| `packages/views/inbox/components/inbox-bucket-header.test.tsx` | NEW | Renders label + count; sticky styles applied; correct German label per bucket key. | — |
| `packages/views/inbox/components/inbox-list-item.tsx` | RESTYLE | Add leading `<AccentBar color="brand" orientation="vertical" />` 3px-wide for unread rows; `bg-transparent` for read. Keep mobile-fallback dot. Replace `<ActorAvatar>` no-image fallback with `<AvatarInitial>`. | Phase 2 `<AccentBar>`, `<AvatarInitial>` |
| `packages/views/inbox/utils/group-by-date.ts` | NEW | Pure function: `groupInboxByDate(items: InboxItem[]): Array<{ bucket: "today" \| "yesterday" \| "this_week" \| "older"; items: InboxItem[] }>`. Date math uses `created_at`; bucketing relative to NOW each render. Stable sort: items inside a bucket keep server order (newest first). | none |
| `packages/views/inbox/utils/group-by-date.test.ts` | NEW | Unit tests for fixed dates around boundaries: 23:59 today, 00:01 yesterday, 6 days ago, 7 days ago, 30 days ago. | — |
| `packages/views/inbox/hooks/use-inbox-shortcut.ts` | NEW | `useEffect` that registers a global keydown listener for `E`. Calls handler unless `document.activeElement` is INPUT, TEXTAREA, or `[contenteditable=true]`, AND no modifier keys are pressed. | none |
| `packages/views/inbox/hooks/use-inbox-shortcut.test.ts` | NEW | Pressing E fires handler; pressing E with focus inside an input does NOT fire; Cmd+E does NOT fire; cleanup removes listener. | — |
| `packages/views/inbox/components/inbox-type-filter.tsx` | NEW (per INB-03) | Row of `<TagChip color="brand">` filter chips. Reads/writes a small Zustand `useInboxFilterStore` with selected type set. Backend `InboxItem.type` field confirmed PRESENT (UI-CHECK PASS-6.3). | Phase 2 `<TagChip>` |
| `packages/views/inbox/components/inbox-type-filter.test.tsx` | NEW | Toggling a chip updates store; client-side filter applied to list. | — |

### Sub-Phase SET — Settings

| File | Status | Role | Reused atoms / components |
|------|--------|------|---------------------------|
| `packages/views/settings/components/settings-page.tsx` | RESTYLE + COPY | German strings; sidebar-tone background on left nav. Tab list ordering unchanged. Add a `[Gefahrenzone]` quick-jump in the Workspace group that scrolls to the danger-zone section in WorkspaceTab. | `<SettingsSection>` (NEW) |
| `packages/views/settings/components/settings-page.test.tsx` | EDIT | German string assertions; Gefahrenzone quick-jump scrolls to danger zone section. | — |
| `packages/views/settings/components/settings-section.tsx` | NEW | Shared section wrapper: italic heading row + Card body. Variant `tone="default" \| "danger"` — danger wraps body in `border-destructive/30` ring AND adds the destructive heading dot. | `<Card>` |
| `packages/views/settings/components/settings-section.test.tsx` | NEW | Renders heading + body; tone="danger" applies ring class + heading dot; default tone has neither. | — |
| `packages/views/settings/components/appearance-tab.tsx` | RESTYLE + COPY | Existing 3-mockup radio (Hell/Dunkel/System). Phase 6 changes: German labels; ensure `setTheme` writes via `useTheme()` from `@multica/ui/components/common/theme-provider` (which uses `storageKey="multica_theme"`). The Phase 4 sidebar `DarkModeToggle` and this radio MUST stay in sync. | existing `useTheme`, `<button role="radio">` |
| `packages/views/settings/components/appearance-tab.test.tsx` | EDIT | German label assertions; clicking each option calls `setTheme` with correct value; sync-with-sidebar test (assert that re-rendering after sidebar toggle reflects new theme). | — |
| `packages/views/settings/components/workspace-tab.tsx` | RESTYLE + COPY | German strings throughout. Wrap each section in `<SettingsSection>`. Danger Zone uses `<SettingsSection tone="danger">`. **Logic UNCHANGED** (especially the `navigateAwayFromCurrentWorkspace` safe-order pattern — WS-05). | `<SettingsSection>` |
| `packages/views/settings/components/workspace-tab.test.tsx` | EDIT | German string assertions; visual structure assertions; preserves existing `navigateAwayFromCurrentWorkspace` order tests verbatim. |
| `packages/views/settings/components/account-tab.tsx` | RESTYLE + COPY | German strings; wrap in `<SettingsSection>`. AvatarInitial used for the avatar fallback when user has no avatar URL. | `<SettingsSection>`, `<AvatarInitial>` |
| `packages/views/settings/components/members-tab.tsx` | RESTYLE + COPY | German strings; AvatarInitial for member rows without avatar; wrap in `<SettingsSection>`. | `<SettingsSection>`, `<AvatarInitial>` |
| `packages/views/settings/components/repositories-tab.tsx` | RESTYLE + COPY | German strings; wrap in `<SettingsSection>`. | `<SettingsSection>` |
| `packages/views/settings/components/tokens-tab.tsx` | RESTYLE + COPY | German strings; wrap in `<SettingsSection>`. | `<SettingsSection>` |
| `packages/views/settings/components/delete-workspace-dialog.tsx` | RESTYLE + COPY | German strings; visual unchanged (typed-name pattern is well-designed). | — |
| `packages/views/settings/components/delete-workspace-dialog.test.tsx` | EDIT | German string assertions. | — |

> **Note for SET RESTYLE + COPY rows (account-tab, members-tab, repositories-tab, tokens-tab):** No new test files added because the operation is string-only + section-wrapper insertion. Existing `.test.tsx` files (where present) are EDITED to update German string assertions; where absent (repositories-tab, tokens-tab, members-tab) the planner MAY add a smoke test in plan-phase or rely on the broader `settings-page.test.tsx` integration coverage. This explicit note resolves UI-CHECK FLAG-2.2.

### Sub-Phase WS — Workspace Management + Agents + Error States

| File | Status | Role | Reused atoms / components |
|------|--------|------|---------------------------|
| `packages/views/agents/components/agents-page.tsx` | RESTYLE + COPY | German strings; restyle empty states using `<EmptyState>`; replace ad-hoc avatars in `<AgentListItem>` with `<AvatarInitial>` for agents without custom avatar. PageHeader stays as-is for `h-12`. | `<EmptyState>`, `<AvatarInitial>` |
| `packages/views/agents/components/agent-list-item.tsx` | RESTYLE | Use `<AvatarInitial>` when agent has no image URL; keep image when present. | Phase 2 `<AvatarInitial>` |
| `packages/views/agents/components/agent-detail.tsx` | RESTYLE + COPY | German strings; visual structure UNCHANGED. | — |
| `packages/views/agents/components/create-agent-dialog.tsx` | RESTYLE + COPY | German strings. | — |
| `packages/views/workspace/no-access-page.tsx` | RESTYLE + COPY | German strings; add `<AlgoPlanWordmark size="lg" />` above the heading; DragStrip stays first flex child. | `<AlgoPlanWordmark>` |
| `packages/views/workspace/no-access-page.test.tsx` | EDIT | German assertions. | — |
| `packages/views/common/not-found-page.tsx` | NEW | 404 page. `flex min-h-svh flex-col` with DragStrip first. AlgoPlan wordmark + heading + body + primary CTA `"Zur Startseite"`. Web mounts at `apps/web/app/not-found.tsx`; Desktop mounts via WindowOverlay-style fallback in the tab router. | `<AlgoPlanWordmark>`, `<DragStrip>`, `<Button>` |
| `packages/views/common/not-found-page.test.tsx` | NEW | Renders heading + body + CTA; CTA navigates to root. | — |
| `packages/views/workspace/empty-state.tsx` | NEW (per WS-03) | Reusable empty-state shell: optional `illustration?: ReactNode` slot + heading + body + optional CTA. Used by board/list, Inbox empty, Agents empty, Search empty, etc. | `<Button>` |
| `packages/views/workspace/empty-state.test.tsx` | NEW | Renders heading/body/CTA; renders illustration when slot provided; CTA fires onClick. | — |
| `packages/views/dashboard-shell/workspace-switcher.tsx` (existing — Phase 4) | LIGHT EDIT | German strings on dropdown items: `"Workspace erstellen"`, `"Abmelden"`. Visual unchanged. | — |
| `apps/desktop/src/renderer/src/components/window-overlay.tsx` | EDIT | Add 5 new overlay branches (`signup`, `verify-email`, `verify-email-resend`, `forgot-password`, `reset-password`) wrapping the new shared auth pages. Each branch renders DragStrip-bearing shell. | new auth pages |
| `apps/desktop/src/renderer/src/stores/window-overlay-store.ts` | EDIT | Add 5 new overlay TYPES (literal union extension): `"signup"`, `"verify-email"`, `"verify-email-resend"`, `"forgot-password"`, `"reset-password"`. | — |
| `apps/desktop/src/renderer/src/platform/navigation.tsx` | EDIT | Translate `push("/auth/signup")`, `push("/auth/verify-email")`, etc. into overlay dispatches (mirroring the existing `/workspaces/new` → `new-workspace` overlay translation). | — |
| `apps/web/app/(auth)/signup/page.tsx` | NEW | Next.js route. Wraps `<SignupPage>` from shared views. | — |
| `apps/web/app/(auth)/verify-email/page.tsx` | NEW | Next.js route. Wraps `<VerifyEmailPage>` from shared views. Reads `?token=` via Next searchParams. |  — |
| `apps/web/app/(auth)/verify-email-resend/page.tsx` | NEW | Next.js route. Wraps `<ResendVerifyEmailPage>`. | — |
| `apps/web/app/(auth)/forgot-password/page.tsx` | NEW | Next.js route. Wraps `<ForgotPasswordPage>`. | — |
| `apps/web/app/(auth)/reset-password/page.tsx` | NEW | Next.js route. Wraps `<ResetPasswordPage>`. Reads `?token=` via Next searchParams. | — |
| `apps/web/app/not-found.tsx` | NEW (or EDIT if exists) | Wraps `<NotFoundPage>` from shared views. | — |
| `packages/core/api/client.ts` | EDIT | Add 6 new client methods: `signup({email, password, name})`, `login({email, password})`, `verifyEmail({token})`, `resendVerifyEmail({email})`, `requestPasswordReset({email})`, `resetPassword({token, new_password})`. Existing OTP methods (`sendCode`, `verifyCode`) UNCHANGED. | — |
| `packages/core/api/client.test.ts` | EDIT | Tests for 6 new methods: request shape; success cookie handling; 401 / 403 / 409 error mapping; idempotent-200 success regardless of email validity for resend + request-reset. | — |

**Total inventory:** 6 NEW + 1 EDIT in DTL = 7 files; 18 NEW + 7 EDIT in AUTH (incl. web routes + window-overlay) = 25 files; 9 NEW + 1 EDIT in INB = 10 files; 1 NEW + 1 NEW test + 8 RESTYLE/EDIT in SET = 10 files; 4 RESTYLE + 4 NEW + 4 EDIT (desktop wiring + web route) in WS = 12 files. **Total: ~64 file touches**, of which **~38 are NEW**. Each NEW component ships its `.test.tsx` (now explicit per row).

---

## Sub-Phase DTL — Issue Detail Modal

Per DTL-01, DTL-02, DTL-04. (DTL-03 deferred — see header.) The detail modal is the most-visited surface in the app after the issues list — its restructure is the highest-value DTL work.

### Two-pane layout (DTL-01)

| Aspect | Contract |
|--------|----------|
| Pane split | Existing `<ResizablePanelGroup horizontal>` is KEPT verbatim. Default 320px right pane, `minSize=260`, `maxSize=420`, collapsible. |
| Left pane content order | (1) PageHeader breadcrumb + tools (existing) → (2) Title editor → (3) Sub-issue-of breadcrumb (when parent) → (4) Description editor + reaction bar → (5) Sub-issues block → (6) `<hr />` divider → (7) Activity heading + subscribe-row + AgentLiveCard + TaskRunHistory + timeline + comments → (8) Comment input → (9) **NEW**: `<IssueDetailFooter>` sticky band. |
| Right pane content order | (1) Properties section: Status / Priority / Assignee / Due date / Project (Priority is now SegmentedControl per DTL-02) → (2) Parent issue section (when parent) → (3) Details section: Created by / Created / Updated → (4) Token usage section (when usage data present). *(No tag row — DTL-03 deferred.)* |
| Mobile fallback | `<Sheet>` slide-over preserved (existing). Modal-footer band hides on mobile (no room) — Delete remains in More-actions dropdown on mobile only. |

### Priority SegmentedControl (DTL-02)

| Aspect | Contract |
|--------|----------|
| Component | `<IssuePrioritySegmentedControl value={issue.priority} onChange={p => handleUpdateField({ priority: p })} aria-label="Priorität" />` |
| Visible items (4) | `P0` (urgent), `P1` (high), `P2` (medium), `P3` (low). The `none` enum value is NOT shown as a tab — instead, when `priority === "none"`, the SegmentedControl renders with NO active item. A small `[× Priorität entfernen]` button appears below the control when priority IS set. |
| Mapping | `IssuePriority → P-label`: `urgent → P0`, `high → P1`, `medium → P2`, `low → P3`, `none → (cleared)`. |
| Active item color | The Phase 2 `<SegmentedControl>` lifts the active item with `bg-background + shadow-sm`. Phase 6 ADDS a per-item text color when active: P0 active → `text-tag-p0`, P1 → `text-tag-p1`, P2 → `text-tag-p2`, P3 → `text-tag-p3`. Implementation: pass a NEW `colorByValue?: Record<string, string>` prop to `<SegmentedControl>` (planner: confirm Phase 2 atom can accept this; if not, extend the atom rather than fork the styling). |
| Replaces | `<PriorityPicker>` dropdown. The dropdown component remains in the codebase for use in More-actions menu and inline pickers — NOT deleted. |
| Width | `w-full` inside the right pane. |
| Keyboard | Inherited from Phase 2: ArrowLeft/Right cycle items; Tab leaves the control. |

### Modal footer (DTL-04)

| Aspect | Contract |
|--------|----------|
| File | `packages/views/issues/components/issue-detail-footer.tsx` |
| Position | Sticky bottom of the LEFT pane: `<div class="sticky bottom-0 z-10 flex h-12 items-center justify-between gap-2 border-t border-border bg-card px-4">` |
| Left side | `<Button variant="destructive" size="sm" onClick={() => setDeleteDialogOpen(true)}>{TrashIcon} Löschen</Button>` |
| Right side | `<span class="text-xs text-muted-foreground">Esc zum Schließen</span>` + `<Button variant="default" size="sm" onClick={onDone}>Fertig</Button>` |
| `onDone` behavior | When the modal is opened from a list/board (not as a routed page), `Fertig` closes the modal. When opened as a dedicated page (e.g. `/:slug/issues/:id`), `Fertig` is hidden — Esc is enough. The component accepts `onDone?: () => void` and only renders `Fertig` when defined. |
| Esc key | Existing modal Esc handling (already routed by `<Dialog>` primitive when modal-mode). Phase 6 keeps both behaviors. |
| Confirmation | Clicking Löschen opens the existing `<AlertDialog>` confirmation dialog (German strings per Copywriting Contract). |

---

## Sub-Phase AUTH — Auth + Pre-Workspace Flows

Per AUTH-01..06. The largest *file-count* sub-phase — 5 NEW pages backed by Phase 5.1's confirmed endpoints.

### Web routes (NEW)

These five Next.js route files are NEW (existing `(auth)` group already contains `invite`, `login`, `onboarding`, `workspaces`):

| Route | File | Wraps |
|-------|------|-------|
| `/auth/signup` | `apps/web/app/(auth)/signup/page.tsx` | `<SignupPage>` |
| `/auth/verify-email` | `apps/web/app/(auth)/verify-email/page.tsx` | `<VerifyEmailPage>` (reads `?token=` via Next searchParams) |
| `/auth/verify-email-resend` | `apps/web/app/(auth)/verify-email-resend/page.tsx` | `<ResendVerifyEmailPage>` |
| `/auth/forgot-password` | `apps/web/app/(auth)/forgot-password/page.tsx` | `<ForgotPasswordPage>` |
| `/auth/reset-password` | `apps/web/app/(auth)/reset-password/page.tsx` | `<ResetPasswordPage>` (reads `?token=` via Next searchParams) |

**Routing rule alignment** — These all use `/{noun}/{verb}` form per CLAUDE.md "no hyphenated word-group root routes" rule. The `auth` noun reserves `/auth/*` from colliding with workspace slugs. `verify-email` and `reset-password` are SECOND-segment verbs (allowed — only ROOT routes are restricted). Verified safe.

### AlgoPlanWordmark atom

| Aspect | Contract |
|--------|----------|
| File | `packages/views/auth/algoplan-wordmark.tsx` |
| Sizes | `default` (24px height — sidebar use, matches Phase 4 wordmark) and `lg` (40px height — auth pages, larger leading) |
| Composition | `<span class="size-2 rounded-full bg-brand" />` (the brand dot — slightly larger than Phase 4's `size-1` for the lg variant) + `<span class="text-{size} font-semibold italic leading-none">AlgoPlan</span>` |
| Italic | YES on auth pages per AUTH-01. Phase 4 sidebar wordmark stays UPRIGHT (per Phase 4 D-12); Phase 6 introduces the italic variant for auth-display use only. The two are distinguished by the `lg` size prop selecting italic. |
| Tooltip | None. |

### Login page (AUTH-01) — RESTYLE existing + ADD password mode

| Aspect | Contract |
|--------|----------|
| File | `packages/views/auth/login-page.tsx` |
| Visual | `<AlgoPlanWordmark size="lg" />` above title; title becomes `<CardTitle class="text-2xl italic font-semibold">{title}</CardTitle>`; description below. German strings throughout. |
| Email step | Add a **Password** sub-mode toggle alongside the existing OTP-request affordance. Email field stays. The existing 6-slot `InputOTP` step stays for OTP path. New password sub-mode: shows password field + `[Anmelden]` CTA → `api.login({email, password})`. |
| Login submit | Calls `api.login({email, password})`. On 200: backend sets cookies; redirect to root (workspace switcher picks destination). On 401: render constant message `"E-Mail oder Passwort ist falsch."` — DO NOT branch on which side failed. On 5xx: generic error. |
| OTP path | UNCHANGED logic. The 6-slot `InputOTP` stays as-is. Email step + Code step + CLI confirm step all kept. |
| Google button | UNCHANGED logic. Strings → German. SVG hex literals grandfathered. |
| New affordances | (1) `[Konto erstellen]` link below CTA → /auth/signup. (2) `[Passwort vergessen?]` link → /auth/forgot-password. |

### Signup page (AUTH-02) — NEW

| Aspect | Contract |
|--------|----------|
| File | `packages/views/auth/signup-page.tsx` |
| Layout | Same auth-card layout as Login. AlgoPlanWordmark + italic title `"Konto erstellen"` + description. |
| Form fields | Name (`<Input>`), Email (`<Input type="email">`), Password (`<Input type="password" minLength="12">`). Tab order: Name → Email → Password → Submit. |
| Password-strength meter | `<PasswordStrengthMeter password={password} />` rendered immediately under the password field. Updates on every keystroke (debounced 200ms inside the meter). |
| Submit enable | Disabled until: name non-empty, email matches `/^.+@.+\..+$/`, password length ≥ 12 (matches backend min) AND password score ≥ 2 (`Okay` or higher per zxcvbn). |
| Submit handler | Calls `api.signup({ name, email, password })`. **On 200**: backend sets `multica_auth` cookie + returns LoginResponse. Frontend navigates to `/onboarding` (workspace creation flow). **On 409**: inline error `"Diese E-Mail ist bereits registriert."` + offer login link. **On 400**: inline error `"Passwort entspricht nicht den Mindestanforderungen."`. **On 403**: inline error `"Registrierung ist derzeit nicht verfügbar."`. **On 5xx**: generic error. |
| Login nudge | Below the card: `"Bereits ein Konto? Anmelden"` linking to `/auth/login`. |

### PasswordStrengthMeter atom

| Aspect | Contract |
|--------|----------|
| File | `packages/views/auth/password-strength-meter.tsx` |
| Visual | `<div class="space-y-1.5">` containing: (1) `<div class="flex gap-1 h-1">` with 4 `<span>` segments; (2) `<p class="text-xs">{scoreLabel}</p>` |
| Segments | 4 equal `flex-1 rounded-sm` segments. Each is `bg-muted` by default. Filled segments take the score-bucket color: 0-1 → `bg-destructive`, 2 → `bg-warning`, 3 → `bg-info`, 4 → `bg-success`. Number of filled = `score + 1` for score 0-3, all 4 for score 4. |
| Score label | `text-xs` colored to match the score bucket. Strings in Copywriting table. |
| Library | `@zxcvbn-ts/core` lazy-loaded via dynamic `import()` inside a `useEffect` — keeps the kilobytes out of the login bundle. While loading, render an empty 4-segment placeholder (`bg-muted` everywhere, no label). |
| Debouncing | Internal 200ms debounce on the password input — prevents recomputing zxcvbn on every keystroke. |
| Locale | English language pack only for v1 (`@zxcvbn-ts/language-en`). The German UI labels are static (Phase 6 doesn't translate zxcvbn warning messages). |
| Empty password | Render with no filled segments and no label (clean state). |
| Test fixtures | Test against well-known passwords: `"password"` → score 0, `"Tr0ub4dor&3"` → score 3, `"correct horse battery staple"` → score 4. |
| Lazy-load test | `password-strength-meter.test.tsx` MUST assert that `import("@zxcvbn-ts/core")` is NOT called when the module is loaded but IS called after the first non-empty render. Implementation hint: use `vi.fn` to spy on the dynamic import via test-only module factory. (Resolves UI-CHECK FLAG-5.1.) |

### VerifyEmailPage (AUTH-03) — NEW (TOKEN-LINK FLOW)

| Aspect | Contract |
|--------|----------|
| File | `packages/views/auth/verify-email-page.tsx` |
| Reached via | Email link `{FRONTEND_ORIGIN}/auth/verify-email?token=<token>`. Direct URL only — no in-app entry. |
| On mount | Read `?token=` from URL. If absent → render "Ungültiger Link" branch (no API call). If present → fire `api.verifyEmail({ token })` ONCE (use a ref guard against React 18 strict-mode double-effect). |
| Render branches | (1) **In-flight**: title `"E-Mail wird bestätigt…"` + spinner. (2) **Success** (200): big checkmark icon (`<CheckCircle class="size-12 text-success" />`) + title `"E-Mail bestätigt"` + body + CTA `"Weiter zu AlgoPlan"` → root. (3) **Failure** (401): big X icon (`<XCircle class="size-12 text-destructive" />`) + title `"Bestätigung fehlgeschlagen"` + body + CTA `"Neuen Link anfordern"` → /auth/verify-email-resend. (4) **No token in URL**: title `"Ungültiger Link"` + body + CTA `"Neuen Link anfordern"`. |
| **NOT polling** | This is a one-shot token-redemption flow, not a polling loop. The user clicks the email link from any device; the page fires once and shows the result. Earlier UI-SPEC drafts considered polling `api.getMe()` — that design is REJECTED in favor of the simpler token-link flow that matches the backend contract directly. |

### ResendVerifyEmailPage (AUTH-03 — companion) — NEW

| Aspect | Contract |
|--------|----------|
| File | `packages/views/auth/resend-verify-email-page.tsx` |
| Reached via | "Neuen Link anfordern" link from VerifyEmailPage failure / no-token branches |
| Layout | Standard auth card. Title `"Bestätigungslink erneut senden"`. Single email field + "Link senden" CTA. |
| Submit | Calls `api.resendVerifyEmail({ email })`. **Always succeeds visibly** — backend returns 200 even for unknown emails per Phase 5.1 idempotent contract. UI replaces form with generic success message: `"Wenn ein Konto mit dieser E-Mail existiert und noch nicht bestätigt ist, haben wir einen neuen Link gesendet."` |
| Cooldown | After successful submit, the resend button (if shown again) shows 60s cooldown via local timer. (Backend enforces 60s/email rate limit silently.) |

### ForgotPasswordPage (AUTH-04) — NEW

| Aspect | Contract |
|--------|----------|
| File | `packages/views/auth/forgot-password-page.tsx` |
| Reached via | "Passwort vergessen?" link on LoginPage; route: `/auth/forgot-password` |
| Layout | Standard auth card. Title `"Passwort zurücksetzen"`. Single email field + "Link senden" CTA. |
| Submit | Calls `api.requestPasswordReset({ email })`. **Always succeeds visibly** — backend returns 200 idempotently per Phase 5.1 (1h rate-limit per email server-side). UI replaces form with generic success message: `"Wenn ein Konto mit dieser E-Mail existiert, haben wir einen Link zum Zurücksetzen gesendet. Prüfe dein Postfach."` |
| Success state | Big checkmark icon + success message + `[Zurück zur Anmeldung]` link. |

### ResetPasswordPage (AUTH-05) — NEW

| Aspect | Contract |
|--------|----------|
| File | `packages/views/auth/reset-password-page.tsx` |
| Reached via | Email link `{FRONTEND_ORIGIN}/auth/reset-password?token=<token>` |
| Layout | Standard auth card. Title `"Neues Passwort wählen"`. Two password fields: New + Confirm. PasswordStrengthMeter under New field. |
| No-token branch | If `?token=` is absent or empty: render `"Ungültiger Link"` branch with CTA `"Neuen Link anfordern"` → /auth/forgot-password. NO API call. |
| Validation | Confirm must equal New (inline error on blur or on submit). New must be ≥ 12 chars AND score ≥ 2. |
| Submit | Calls `api.resetPassword({ token, new_password: newPassword })`. **On 200**: navigate to `/auth/login` and flash toast `"Passwort aktualisiert. Bitte melde dich an."` (use `useNavigationFlash()` so toast survives the navigation). **NO auto-login** — backend deliberately omits cookies per Phase 5.1 Pitfall §6. **On 401**: render failure branch (title `"Link abgelaufen"`, body, `"Neuen Link anfordern"` CTA → /auth/forgot-password). **On 400**: inline weak-password error. **On 5xx**: generic error. |

### Pre-workspace pages (AUTH-05) — RESTYLE existing

| Page | Phase 6 changes |
|------|-----------------|
| `NewWorkspacePage` | (1) Add `<AlgoPlanWordmark size="lg" />` to title block. (2) Title becomes `text-3xl italic font-semibold`. (3) German strings. (4) DragStrip stays first flex child. |
| `InvitePage` | (1) AlgoPlanWordmark inside InviteShell (above the card). (2) Title `text-xl italic font-semibold`. (3) German strings in all 5 render branches. (4) DragStrip stays first flex child. |
| `OnboardingFlow` | (1) Each step's hero header gets the AlgoPlanWordmark. (2) German strings limited to step-shell strings. |

### Test string updates (AUTH-06) — EDIT

All existing `*.test.tsx` files for restyled pages get their string assertions updated to German. Specifically:
- `login-page.test.tsx` (existing) — German strings + new test for constant 401 message.
- `new-workspace-page.test.tsx`, `invite-page.test.tsx`, `no-access-page.test.tsx` (existing) — German string assertions.
- `onboarding-flow.test.tsx` (existing) — German string assertions for shell strings only.

### Desktop WindowOverlay extensions (NEW types)

`apps/desktop/src/renderer/src/stores/window-overlay-store.ts` currently has 3 overlay types: `new-workspace`, `invite`, `onboarding`. **Phase 6 ADDS five overlay types**: `signup`, `verify-email`, `verify-email-resend`, `forgot-password`, `reset-password`. Each is registered in the literal union in the store, and each gets a corresponding render branch in `apps/desktop/src/renderer/src/components/window-overlay.tsx` that wraps the shared auth page in a DragStrip-bearing shell.

Navigation translation: `apps/desktop/src/renderer/src/platform/navigation.tsx` recognizes pushes to `/auth/signup`, `/auth/verify-email?token=...`, `/auth/verify-email-resend`, `/auth/forgot-password`, `/auth/reset-password?token=...` and dispatches the corresponding overlay type (passing `?token=` query as overlay payload). Mirrors the existing `/workspaces/new` → `new-workspace` overlay translation.

**CLAUDE.md alignment:** Pre-workspace flows on Desktop are NOT routes — they are `WindowOverlay` state. All five new auth flows are pre-workspace; this is the correct extension.

### AUTH DragStrip enumeration (cross-cutting — see also DragStrip section below)

Every full-window desktop view that lives OUTSIDE `<DashboardShell>` MUST mount `<DragStrip />` as the FIRST flex child of its page root. Phase 6 audit table:

| File | DragStrip status before Phase 6 | Phase 6 action |
|------|--------------------------------|----------------|
| `packages/views/workspace/new-workspace-page.tsx` | Present (line 34) | KEEP — verify still first flex child after restyle |
| `packages/views/invite/invite-page.tsx` (InviteShell) | Present (line 241) | KEEP |
| `packages/views/workspace/no-access-page.tsx` | Present (line 20) | KEEP |
| `packages/views/onboarding/onboarding-flow.tsx` | Present (line 257) | KEEP |
| `packages/views/onboarding/steps/step-welcome.tsx` | Present (lines 76, 180) | KEEP |
| `packages/views/onboarding/steps/step-questionnaire.tsx` | Present (lines 103, 267) | KEEP |
| `packages/views/onboarding/steps/step-workspace.tsx` | Present (line 246) | KEEP |
| `packages/views/onboarding/steps/step-platform-fork.tsx` | Present (lines 152, 229) | KEEP |
| `packages/views/onboarding/steps/step-runtime-connect.tsx` | (verify in plan-phase) | If absent and the step is full-window: ADD |
| `packages/views/onboarding/steps/step-agent.tsx` | (verify in plan-phase) | Same |
| `packages/views/onboarding/steps/step-first-issue.tsx` | (verify in plan-phase) | Same |
| `packages/views/auth/login-page.tsx` | NOT PRESENT in shared view | App-level wrapping: Web's `(auth)/login/page.tsx` and Desktop's login overlay each mount their own DragStrip OUTSIDE the LoginPage component. Phase 6 verifies. |
| `packages/views/auth/signup-page.tsx` (NEW) | — | Same pattern: Web mounts at `apps/web/app/(auth)/signup/page.tsx` (NEW) wrapping with DragStrip-bearing shell. Desktop adds WindowOverlay type `signup` (NEW). |
| `packages/views/auth/verify-email-page.tsx` (NEW) | — | Same pattern. WindowOverlay type `verify-email` (NEW). |
| `packages/views/auth/resend-verify-email-page.tsx` (NEW) | — | Same pattern. WindowOverlay type `verify-email-resend` (NEW). |
| `packages/views/auth/forgot-password-page.tsx` (NEW) | — | Same pattern. WindowOverlay type `forgot-password` (NEW). |
| `packages/views/auth/reset-password-page.tsx` (NEW) | — | Same pattern. WindowOverlay type `reset-password` (NEW). |
| `packages/views/common/not-found-page.tsx` (NEW) | — | DragStrip as first flex child (NEW). |
| `packages/views/modals/create-workspace.tsx` | Present (line 36) | Modal variant; keep DragStrip. |

**Pitfall reminder:** DragStrip MUST be the FIRST flex child of the page-root flex container. Inserting AlgoPlanWordmark "before" the DragStrip during the restyle would break window dragging. Wordmark goes INSIDE the centered card region, not above DragStrip.

---

## Sub-Phase INB — Inbox

Per INB-01..03.

### Date-bucket grouping (INB-01)

| Bucket | Definition | German label |
|--------|------------|--------------|
| Today | `created_at` is on today's calendar date (local time) | `Heute` |
| Yesterday | `created_at` is on yesterday's calendar date | `Gestern` |
| This week | `created_at` is within the last 7 days, but not today/yesterday | `Diese Woche` |
| Older | Everything else | `Älter` |

Empty buckets are NOT rendered (no header for an empty bucket). Bucket order is fixed: today → yesterday → this week → older.

The header is sticky (`sticky top-0 z-10 bg-card`) so when a user scrolls the list, the current bucket header stays visible until the next bucket scrolls into view.

Implementation lives in `packages/views/inbox/utils/group-by-date.ts` as a pure function — testable in isolation.

### Mark-all-read button + keyboard shortcut (INB-02)

| Aspect | Contract |
|--------|----------|
| Button position | Inside the Inbox PageHeader, RIGHT side, BEFORE the More-actions dropdown |
| Button visual | `<Button variant="ghost" size="sm">{CheckCheck} Alle gelesen</Button>` — gray text by default, brand-green text on hover |
| Disabled state | When `unreadCount === 0`: button hidden entirely (not disabled — hidden) |
| Tooltip | `"Alle als gelesen markieren (E)"` — exposes the keyboard shortcut |
| Keyboard shortcut | `E` triggers the same handler. Implementation: `useInboxShortcut(handleMarkAllRead)` hook. |
| Input-focus guard | Hook MUST check `document.activeElement` is not INPUT/TEXTAREA/[contenteditable=true] before firing. |
| Modifier conflict | Bare `E` only — `Ctrl+E` / `Cmd+E` browser shortcuts MUST NOT be intercepted. Hook checks `!event.metaKey && !event.ctrlKey && !event.altKey`. |
| Existing dropdown items | "Mark all as read" dropdown item is REMOVED from the More-actions menu. Other batch operations (Archive all, Archive read, Archive completed) STAY in the dropdown. |

### Type filter chips (INB-03) — confirmed shippable

UI-CHECK PASS-6.3 verified `InboxItem.type: InboxItemType` exists in `packages/core/types/inbox.ts` line 28. Phase 6 ships this as functional (not a stub).

UI contract: `<InboxTypeFilter>` component renders 4 `<TagChip color="brand" onRemove={removeFromSet}>` chips below the bucket-grouped list (in PageHeader area, below the title row). Active chips have full opacity; inactive chips have `opacity-60`. Filter state in a small Zustand `useInboxFilterStore` (per CLAUDE.md state-management rules — all stores live in `packages/core/`, but for Phase 6 we make an exception by colocating with the view since it's purely UI-filter state and not consumed elsewhere; planner may relocate to `packages/core/inbox/` during implementation if cross-cutting use is anticipated).

### Row restyle

| Aspect | Contract |
|--------|----------|
| Leading edge | NEW. `<AccentBar color="brand" orientation="vertical" />` for unread rows; transparent for read. 3px wide, full row height, absolute-positioned `left-0 inset-y-0`. |
| Mobile fallback | Phone-narrow rows (`<sm`) keep the existing brand-green dot inline with the title. |
| Avatar | `<ActorAvatar>` continues to be used. Phase 6 ensures the no-image fallback path inside `<ActorAvatar>` uses `<AvatarInitial>` (Phase 2 atom). |
| Status indicator | Existing `<StatusIcon>` continues. |
| Time-ago | Existing `timeAgo()` helper continues. |
| Hover/select | Existing `bg-accent/50` hover, `bg-accent` selected. UNCHANGED. |

---

## Sub-Phase SET — Settings

Per SET-01..03.

### Sectioned layout (SET-01)

The current settings page already uses Tabs orientation="vertical" with two grouped headings (My Account / Workspace).

| Existing tab | Target Phase 6 grouping |
|-------------|-------------------------|
| Profile | "Mein Konto" group → keep as `profile` tab |
| Appearance | "Mein Konto" group → keep as `appearance` tab |
| API Tokens | "Mein Konto" group → keep |
| Workspace General | "Workspace" group → keep |
| Repositories | "Workspace" group → keep |
| Members | "Workspace" group → keep |
| Notifications (NEW per SET-01) | DEFERRED — no notifications-preferences feature exists yet. Planner notes; v2 INB2-02 covers it. |
| Danger Zone (NEW per SET-01) | NOT a separate tab — bottom section of the Workspace General tab (existing convention). The left-nav "Workspace" group label carries a small `[Gefahrenzone]` quick-jump button that scrolls to the section. |

### Dark-mode radio (SET-02) — already implemented

The existing `appearance-tab.tsx` already implements the Light/Dark/System radio with mockups. Phase 6 changes:
- German labels (Hell/Dunkel/System).
- Verify it uses `useTheme()` from `@multica/ui/components/common/theme-provider` (Phase 1 wrapper) — which writes to `localStorage` with `storageKey="multica_theme"`.
- Active option's `[ring-2 ring-brand]` styling stays.

**Critical:** Phase 4's `<DarkModeToggle>` in the sidebar AND the Phase 6 settings radio MUST share state via the same next-themes provider. Test: open settings, switch to Dark, navigate to dashboard, observe sidebar's DarkModeToggle now shows Sun icon.

### Danger Zone (SET-03) — typed-name confirmation

The current `<DeleteWorkspaceDialog>` already implements typed-name confirmation. Phase 6 changes: German strings only — visual unchanged.

The Leave-Workspace flow has its own `<AlertDialog>` (no typed-name — Leave is reversible). Phase 6 keeps this distinction:
- Leave → simple AlertDialog with German strings
- Delete → typed-name dialog (forceful friction)

Both flows use the existing `navigateAwayFromCurrentWorkspace()` safe-order pattern (WS-05) — UNCHANGED. Existing tests at `workspace-tab.test.tsx` and `delete-workspace-dialog.test.tsx` cover the safe-order regression — see Validation Architecture below for explicit reference (resolves UI-CHECK FLAG-5.2).

---

## Sub-Phase WS — Workspace + Agents + Error States

Per WS-01..05.

### WS-01 — Workspace switcher

The Phase 4 wordmark already implements the workspace switcher dropdown. Phase 6:
- German strings on dropdown items
- Wordmark styling stays UPRIGHT (per Phase 4 D-12) — NOT italic. Italic is for auth-page display only.

### WS-02 — Agents view

| Component | Phase 6 change |
|-----------|----------------|
| `AgentsPage` | German strings; restyle empty states using `<EmptyState>` |
| `AgentListItem` | Use `<AvatarInitial>` for agents without image |
| `AgentDetail` | German strings; visual unchanged |
| `CreateAgentDialog` | German strings |

### WS-03 — Empty states with illustration slot

NEW shared `<EmptyState>` component:

```typescript
interface EmptyStateProps {
  illustration?: ReactNode;      // optional SVG/icon block above heading
  heading: string;               // German display string
  body?: string;                 // optional supporting paragraph
  cta?: { label: string; onClick: () => void };
}
```

Used by:
- Inbox empty (`Keine Benachrichtigungen`)
- Agents empty (`Noch keine Agenten`)
- Search-no-results
- Future v2 surfaces

Phase 5 already shipped board-empty / list-empty inline strings — Phase 6 refactors those into `<EmptyState>` for consistency.

Default illustration when `illustration` not provided: a muted icon (e.g. `<Inbox class="size-10 text-muted-foreground/40" />`) appropriate to the surface.

### WS-04 — Error states

| State | Web behavior | Desktop behavior |
|-------|-------------|------------------|
| 404 (page not found) | Render `<NotFoundPage>` via Next.js `app/not-found.tsx` | Render `<NotFoundPage>` via tab-router fallback |
| Workspace not accessible | `<NoAccessPage>` via Next.js `app/[workspaceSlug]/(dashboard)/_error.tsx` (existing) | Silent heal: `WorkspaceRouteLayout` drops the stale tab from the store; user lands on a valid workspace tab. NO error page rendered. |

Phase 6 confirms the desktop silent-heal already works. The Phase 6 visual restyle of `NoAccessPage` (German strings + AlgoPlanWordmark) does NOT affect desktop.

### WS-05 — Destructive ops safe order

Existing `WorkspaceTab.navigateAwayFromCurrentWorkspace()` already follows the CLAUDE.md safe order:
1. Read destination from cached workspace list
2. `setCurrentWorkspace(null, null)`
3. `navigation.push(destination)`
4. THEN `await mutation.mutateAsync(workspaceId)`

Phase 6 changes ZERO of this logic. The German string updates do not touch the destructive code path. Verification: existing `workspace-tab.test.tsx` covers the safe-order property — see Validation Architecture for explicit reference.

---

## DragStrip Enumeration (Cross-Cutting)

Audit table — every full-window desktop view that needs `<DragStrip />` as first flex child.

| Surface | DragStrip slot | Phase 6 verifies |
|---------|---------------|------------------|
| `<DashboardShell>` (Phase 4) | `topSlot` prop, Desktop injects `<DragStrip />` | Already correct (Phase 4 SC#2) |
| `NewWorkspacePage` | First child of root flex | Existing — verify after restyle |
| `InvitePage` (InviteShell) | First child of root flex | Existing — verify after restyle |
| `NoAccessPage` | First child of root flex | Existing — verify after restyle |
| `OnboardingFlow` | First child of root flex | Existing — verify after restyle |
| `step-welcome.tsx` | Two columns; DragStrip in each | Existing |
| `step-questionnaire.tsx` | Two columns; DragStrip in each | Existing |
| `step-workspace.tsx` | First child | Existing |
| `step-platform-fork.tsx` | Two columns; DragStrip in each | Existing |
| `step-runtime-connect.tsx` | (audit in plan-phase) | If full-window, add |
| `step-agent.tsx` | (audit in plan-phase) | Same |
| `step-first-issue.tsx` | (audit in plan-phase) | Same |
| `LoginPage` (and 5 NEW auth pages) | NOT in shared view; injected by app wrapper | Web: `apps/web/app/(auth)/{login,signup,verify-email,verify-email-resend,forgot-password,reset-password}/page.tsx` wraps with DragStrip-bearing shell. Desktop: WindowOverlay shell mounts overlay+DragStrip. NEW types added to `window-overlay-store.ts`. |
| `NotFoundPage` (NEW) | First child | NEW — must include DragStrip |
| `<CreateWorkspaceDialog>` modal | First child of dialog content | Existing |

**Test gate (automated — promoted from manual to automated per UI-CHECK FLAG-5.3):** A vitest smoke test in `packages/views/__tests__/dragstrip-coverage.test.ts` reads each enumerated source file via Node `fs` and asserts the file contains the literal string `"<DragStrip"` AND that the first JSX child of the page-root flex container is `<DragStrip` (regex match). This runs in the standard `pnpm test` cycle — no separate grep step required. Maintains the audit as code, not a manual checklist.

---

## Token Discipline

Phase 6 consumes ONLY tokens that already exist in `packages/ui/styles/tokens.css`:

`--background` · `--foreground` · `--card` · `--card-foreground` · `--popover` · `--popover-foreground` · `--primary` · `--primary-foreground` · `--secondary` · `--secondary-foreground` · `--muted` · `--muted-foreground` · `--accent` · `--accent-foreground` · `--destructive` · `--border` · `--input` · `--ring` · `--brand` · `--brand-foreground` · `--success` · `--warning` · `--info` · `--sidebar` · `--sidebar-foreground` · `--sidebar-primary` · `--sidebar-primary-foreground` · `--sidebar-accent` · `--sidebar-accent-foreground` · `--sidebar-border` · `--sidebar-ring` · `--tag-p0` · `--tag-p0-foreground` · `--tag-p1` · `--tag-p1-foreground` · `--tag-p2` · `--tag-p2-foreground` · `--tag-p3` · `--tag-p3-foreground` · `--highlight` · `--highlight-foreground` · `--radius` · `--radius-sm` · `--radius-md` · `--radius-lg` · `--font-sans`

If implementation surfaces a need for a token outside this list, STOP and re-open the Phase 1 token contract.

### Status / Priority palette mapping (existing — Phase 6 consumes only)

| Priority enum | SegmentedControl label | TagChip color | Active text color |
|--------------|------------------------|---------------|-------------------|
| `urgent` | P0 | `tag-p0` (red) | `text-tag-p0` |
| `high` | P1 | `tag-p1` (orange) | `text-tag-p1` |
| `medium` | P2 | `tag-p2` (info blue) | `text-tag-p2` |
| `low` | P3 | `tag-p3` (grey) | `text-tag-p3` |
| `none` | (excluded from SegmentedControl) | (no chip) | — |

---

## Validation Architecture

### Per-component test commands

```bash
# DTL
pnpm --filter @multica/views exec vitest run issues/components/issue-detail.test.tsx
pnpm --filter @multica/views exec vitest run issues/components/issue-priority-segmented-control.test.tsx
pnpm --filter @multica/views exec vitest run issues/components/issue-detail-footer.test.tsx

# AUTH
pnpm --filter @multica/views exec vitest run auth/login-page.test.tsx
pnpm --filter @multica/views exec vitest run auth/signup-page.test.tsx
pnpm --filter @multica/views exec vitest run auth/verify-email-page.test.tsx
pnpm --filter @multica/views exec vitest run auth/resend-verify-email-page.test.tsx
pnpm --filter @multica/views exec vitest run auth/forgot-password-page.test.tsx
pnpm --filter @multica/views exec vitest run auth/reset-password-page.test.tsx
pnpm --filter @multica/views exec vitest run auth/password-strength-meter.test.tsx
pnpm --filter @multica/views exec vitest run auth/algoplan-wordmark.test.tsx

# AUTH — API client (lives in @multica/core)
pnpm --filter @multica/core exec vitest run api/client.test.ts

# INB
pnpm --filter @multica/views exec vitest run inbox/components/inbox-page.test.tsx
pnpm --filter @multica/views exec vitest run inbox/components/inbox-bucket-header.test.tsx
pnpm --filter @multica/views exec vitest run inbox/components/inbox-type-filter.test.tsx
pnpm --filter @multica/views exec vitest run inbox/utils/group-by-date.test.ts
pnpm --filter @multica/views exec vitest run inbox/hooks/use-inbox-shortcut.test.ts

# SET
pnpm --filter @multica/views exec vitest run settings/components/settings-page.test.tsx
pnpm --filter @multica/views exec vitest run settings/components/appearance-tab.test.tsx
pnpm --filter @multica/views exec vitest run settings/components/workspace-tab.test.tsx
pnpm --filter @multica/views exec vitest run settings/components/delete-workspace-dialog.test.tsx
pnpm --filter @multica/views exec vitest run settings/components/settings-section.test.tsx

# WS
pnpm --filter @multica/views exec vitest run agents/components/agents-page.test.tsx
pnpm --filter @multica/views exec vitest run workspace/no-access-page.test.tsx
pnpm --filter @multica/views exec vitest run workspace/empty-state.test.tsx
pnpm --filter @multica/views exec vitest run common/not-found-page.test.tsx

# Cross-cutting — DragStrip coverage gate (NEW per UI-CHECK FLAG-5.3)
pnpm --filter @multica/views exec vitest run __tests__/dragstrip-coverage.test.ts
```

### Existing tests inherited (regression coverage — no new tests added; resolves UI-CHECK FLAG-5.2)

| Existing test file | Covers |
|--------------------|--------|
| `packages/views/settings/components/workspace-tab.test.tsx` | `navigateAwayFromCurrentWorkspace()` safe-order property — read destination first → setCurrentWorkspace(null,null) → push(destination) → await mutation. Phase 6 changes only strings; this test must continue to pass unchanged. |
| `packages/views/settings/components/delete-workspace-dialog.test.tsx` | Typed-name confirmation gate (button disabled until name matches). |
| `packages/views/auth/login-page.test.tsx` (existing OTP path) | OTP request + 6-slot code entry + CLI authorize step. Phase 6 only adds password-mode tests on top. |

### E2E commands per Success Criterion

```bash
# SC#1 — Issue detail two-pane + SegmentedControl P0..P3 (DTL-01, DTL-02, DTL-04)
pnpm exec playwright test e2e/tests/issue-detail-modal.spec.ts

# SC#2 — Auth pages with AlgoPlan wordmark + italic title + password strength meter (AUTH-01..05)
pnpm exec playwright test e2e/tests/auth-flows.spec.ts
# Sub-flows covered:
#   - signup → cookies set → /onboarding redirect
#   - login (password) → 401 constant message on bad creds → 200 + redirect
#   - login (OTP) → existing flow regression
#   - verify-email link → success branch
#   - verify-email link with bad token → failure branch + resend CTA
#   - forgot-password → idempotent success message regardless of email validity
#   - reset-password → success → /auth/login + toast (no auto-login)
#   - reset-password with bad token → failure branch

# SC#3 — DragStrip on every pre-workspace desktop view (AUTH-05)
pnpm exec playwright test e2e/tests/desktop-drag-region.spec.ts
# (plus a manual verification: build the desktop app, open each pre-workspace overlay, drag the window from the top edge, verify it moves)

# SC#4 — Settings Danger Zone typed-name + dark-mode radio persists (SET-02, SET-03)
pnpm exec playwright test e2e/tests/settings-danger-zone.spec.ts
pnpm exec playwright test e2e/tests/settings-dark-mode-persists.spec.ts

# SC#5 — Inbox date-bucket grouping + mark-all-read button + E shortcut (INB-01..03)
pnpm exec playwright test e2e/tests/inbox-grouping.spec.ts
pnpm exec playwright test e2e/tests/inbox-mark-all-read-shortcut.spec.ts
```

### Manual verification checklist

- [ ] Run `pnpm test` — `dragstrip-coverage.test.ts` passes (no full-window view missing DragStrip)
- [ ] Open Settings → Appearance → toggle Dark; navigate to dashboard; verify sidebar DarkModeToggle reflects new theme
- [ ] Open issue detail; verify Priority is SegmentedControl (not dropdown); cycle P0..P3 with arrow keys
- [ ] Open issue detail; verify modal-footer Löschen/Fertig/Esc band visible
- [ ] Open Inbox; scroll list; verify bucket headers stick at top during scroll
- [ ] Inbox: press E with no input focused → mark-all-read fires; press E inside a comment input → does NOT fire; Cmd+E does NOT fire
- [ ] Build desktop; open New Workspace overlay; drag window from top edge → window moves
- [ ] Build desktop; open Invite overlay; drag window → window moves
- [ ] Build desktop; signup overlay (NEW); drag window → window moves
- [ ] Build desktop; reset-password overlay (NEW, simulate via deeplink); drag window → window moves
- [ ] Login: enter unknown email + any password → see constant `"E-Mail oder Passwort ist falsch."` (NOT "user not found"); enter known email + wrong password → see same constant message
- [ ] Forgot-password: submit unknown email → see generic success (NOT "email not found")
- [ ] Reset-password: complete flow → confirm landing on `/auth/login` with success toast (NOT auto-logged in)

### Bundle-size gate (resolves UI-CHECK FLAG-5.1 — primary)

The PasswordStrengthMeter test asserts dynamic-import behavior (see DTL Inventory row + AUTH section). Belt-and-suspenders verification at build time:

```bash
pnpm --filter @multica/web build
# Then verify zxcvbn does NOT appear in the login-page chunk:
grep -L "zxcvbn" .next/static/chunks/app/\(auth\)/login/*.js
# Expected: file LISTED (no zxcvbn match) → lazy-load is working
```

This is added to the Phase 6 manual verification checklist.

---

## Light + Dark Mode Verification

Phase 6 introduces ZERO `dark:*` overrides on real surfaces. Inherits Phase 1 token correctness.

Verification gate:
1. Light mode: every Phase 6 surface renders correctly with no missing colors.
2. Toggle dark via sidebar DarkModeToggle. Every surface above renders correctly in dark.
3. Refresh in dark mode. Surfaces stay dark on first paint.
4. Open Settings → Appearance → Light. Surfaces flip to light. Sidebar DarkModeToggle now shows Moon.
5. AppearanceTab's WindowMockup `dark:` literals are GRANDFATHERED (preview-only).

---

## Hard Constraints Summary (consumed by gsd-ui-checker)

1. **DragStrip MUST be the FIRST flex child** of every full-window desktop view (CLAUDE.md). Inserting wordmark/branding above DragStrip breaks window dragging. Verified by `dragstrip-coverage.test.ts` automated gate.
2. **Pre-workspace flows on Desktop are NOT routes** — they are `WindowOverlay` state per CLAUDE.md desktop route categories. Phase 6 ADDS five overlay types: `signup`, `verify-email`, `verify-email-resend`, `forgot-password`, `reset-password`.
3. **Priority SegmentedControl mapping is fixed**: `urgent→P0, high→P1, medium→P2, low→P3, none→excluded` (with separate "Clear" affordance for `none`).
4. **Settings dark-mode radio MUST persist via `multica_theme` localStorage** — the Phase 1 next-themes wrapper is the single source of truth. Sidebar DarkModeToggle and settings radio share state via `useTheme()`.
5. **Inbox `E` shortcut MUST NOT fire when input/textarea/contenteditable is focused** — guard via `document.activeElement` check + modifier-key check.
6. **`@zxcvbn-ts/core` is lazy-loaded** in `password-strength-meter.tsx` via dynamic `import()` so the kilobytes never hit the login bundle. Verified by (a) unit test spying on `import()`, (b) post-build grep on the login chunk.
7. **No `dark:*` overrides** on real surfaces. AppearanceTab WindowMockup is grandfathered (preview-only).
8. **No new tokens.** Only Phase 1 OKLCH inventory.
9. **German source-of-truth for new strings**; existing English in unrelated files stays for Phase 7.
10. **Modal-footer Löschen** opens existing `<AlertDialog>` (NOT inline destruction). Typed-name confirmation only for workspace deletion.
11. **`navigateAwayFromCurrentWorkspace()` safe order is unchanged** — WS-05 is verified by existing `workspace-tab.test.tsx` continuing to pass after string updates.
12. **AvatarInitial wraps `<ActorAvatar>` no-image fallback** — does NOT replace `<ActorAvatar>` everywhere. Image-bearing actors keep their image.
13. **No user enumeration via UI.** Login 401 = constant `"E-Mail oder Passwort ist falsch."`. `verify-email/resend` and `password-reset/request` always show generic success regardless of email validity. Mirrors backend Phase 5.1 contract.
14. **No auto-login after password reset.** ResetPasswordPage success → navigate to `/auth/login` + toast. Backend deliberately omits cookies.
15. **VerifyEmailPage is a one-shot token-redemption flow, not a polling loop.** Reads `?token=` once, fires `api.verifyEmail()` once (ref-guarded against React 18 strict-mode double-effect), renders one of three branches.
16. **Existing PageHeader-per-page pattern is kept** (Inbox, Settings, Agents). Phase 6 does NOT replace per-page headers with the Phase 4 AppTopbar.
17. **Web auth route convention**: `/auth/{verb}` form (e.g. `/auth/signup`, `/auth/verify-email`, `/auth/reset-password`). The `auth` noun reserves `/auth/*` from colliding with workspace slugs. Matches CLAUDE.md "no hyphenated word-group root routes" rule (only ROOT routes are restricted; second-segment hyphenation is allowed).
18. **Email link contracts are FROZEN by Phase 5.1**: `{FRONTEND_ORIGIN}/auth/verify-email?token=<token>` and `{FRONTEND_ORIGIN}/auth/reset-password?token=<token>`. Frontend route paths MUST match exactly.

---

## BLOCK / FLAG / PASS

### BLOCK

None — Phase 5.1 backend is shipped (27/27 GREEN). All endpoints consumed by Phase 6 AUTH sub-phase exist and have frozen contracts.

### FLAG

1. **`<SegmentedControl>` colorByValue prop extension.**
   The Phase 2 atom does not currently have a `colorByValue` prop. Phase 6 needs it for the per-priority active-item text color. Two options:
   - Extend Phase 2 atom (preferred — keeps atom rich)
   - Style override at the Phase 6 wrapper via class injection
   Planner picks. Recommendation: extend the atom.

2. **`useNavigationFlash()` utility availability.**
   ResetPasswordPage success-toast-after-redirect needs a way to flash a toast that survives a navigation. If `useNavigationFlash()` (or equivalent) does not exist in `@multica/core/`, planner adds it (small utility — store toast intent in sessionStorage, consume on next mount). If alternative pattern preferred (e.g. URL query param `?flash=password-updated`), planner picks during plan-phase.

3. **PageHeader vs AppTopbar coexistence.**
   Phase 4 explicitly deferred the question of whether to replace per-page PageHeader with AppTopbar for Inbox/Settings/Agents. Phase 6 KEEPS PageHeader per existing convention. Flagged for visibility, not blocking.

4. **InboxFilterStore location.**
   `useInboxFilterStore` is colocated in `packages/views/inbox/` for Phase 6 simplicity but CLAUDE.md says "All shared Zustand stores live in `packages/core/`". The store is purely UI-filter state with no cross-package consumers, so colocating with the view is defensible. Planner may relocate to `packages/core/inbox/` during implementation if cross-cutting use is anticipated.

### PASS

- Token discipline strict (no new tokens; no dark: overrides on real surfaces; no hex/RGB except grandfathered Google logo SVG)
- DragStrip enumeration complete + automated coverage gate
- 60/30/10 color discipline verified per surface
- German source-of-truth applied to all NEW Phase 6 strings; English preserved on out-of-Phase-6 surfaces
- Reused atoms: TagChip (×1 — inbox type filter), AccentBar (×1 — inbox unread), AvatarInitial (×4 — assignee, member, agent, ActorAvatar fallback), SegmentedControl (×1 — priority)
- Reused Phase 4 components: DashboardShell, AppSidebar, AppTopbar (transitive), DarkModeToggle (state-shared with settings radio)
- Reused Phase 5 conventions: Italic for display headers, German action verbs, no destructive italic
- WS-05 destructive-ops safe order preserved (no logic changes in `navigateAwayFromCurrentWorkspace`); regression covered by existing test
- Backend contract frozen by Phase 5.1; all 6 endpoints exist with confirmed signatures
- 20 in-scope requirements (DTL-03 deferred per BLOCKED.md) mapped to ~64 file touches (~38 NEW)
- Test commands per file + E2E commands per success criterion + automated DragStrip gate enumerated
- No-enumeration UX baked into UI for login + verify-resend + password-reset (matches backend security contract)
- No auto-login after password reset (matches backend Phase 5.1 Pitfall §6)

---

## Design Token Inventory (from Phase 1 — no new tokens introduced)

This phase consumes ONLY tokens already in `packages/ui/styles/tokens.css`. See full list in **Token Discipline** section above.

---

## Checker Sign-Off

- [ ] Dimension 1 Token Discipline: PASS (zero new tokens; lazy-load gate; grandfathered Google SVG only)
- [ ] Dimension 2 Composition Clarity: PASS (every NEW component has explicit test row; SET RESTYLE notes added)
- [ ] Dimension 3 DragStrip Coverage: PASS (automated gate via `dragstrip-coverage.test.ts`)
- [ ] Dimension 4 WindowOverlay vs Route: PASS (5 new overlay types, no new desktop routes)
- [ ] Dimension 5 Validation Architecture: PASS (lazy-load test, safe-order regression test reference, automated DragStrip gate)
- [ ] Dimension 6 Hard Constraints: PASS (18 constraints, all 5 sub-phases covered, all backend dependencies resolved by Phase 5.1)

**Approval:** pending
