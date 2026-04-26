---
phase: 6
slug: issue-detail-remaining-views
status: draft
shadcn_initialized: true
preset: base-nova (Base UI variant) — packages/ui/components.json
created: 2026-04-25
---

# Phase 6 — UI Design Contract

> Visual and interaction contract for every remaining user-facing view: the issue detail modal (DTL), the auth and pre-workspace flows (AUTH), the inbox (INB), the settings page (SET), workspace management + agents + error states (WS). Tokens (Phase 1), atoms (Phase 2 — `TagChip`, `AccentBar`, `AvatarInitial`, `SegmentedControl`), the dashboard shell (Phase 4 — `DashboardShell`, `AppSidebar`, `AppTopbar`), and the Phase 5 Italic-Inter convention for display headers are inherited; this contract reuses them and introduces zero new tokens.
>
> **Scope shape note.** Phase 6 is the largest visual phase of the rebrand. The 21 requirements split into five sub-phases that the planner is expected to commit independently:
>
> 1. **DTL** — Issue detail modal restructure (4 reqs). Two-pane layout, SegmentedControl priority, tag-chip row, modal footer.
> 2. **AUTH** — Auth + pre-workspace flow restyle (6 reqs). New AlgoPlan brand chrome, **NEW** signup/email-verify/password-reset pages with `@zxcvbn-ts/core` strength meter, refresh of existing OTP `LoginPage`, NewWorkspacePage + InvitePage + OnboardingFlow visual pass.
> 3. **INB** — Inbox restyle (3 reqs). Date-bucket grouping, mark-all-read button, keyboard shortcut `E`, optional type filter chips.
> 4. **SET** — Settings restructure (3 reqs). Sectioned layout, Danger Zone, Light/Dark/System radio (extends existing `AppearanceTab` from Phase-1 work).
> 5. **WS** — Workspace + agent + error states (5 reqs). Workspace switcher refresh, AgentsPage list-with-AvatarInitial, empty-states with illustration slot, NoAccessPage + 404 redesign, Desktop destructive-ops safe-order verification.
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
| 2xl | 48px (`h-12`) | DragStrip height (existing); auth page top-affordance row top offset (`top-16` from existing pages, ≈64px to clear traffic lights and DragStrip together); Inbox/Settings PageHeader height |
| 3xl | 64px | (not used in this phase) |

### Issue detail layout contract

| Aspect | Value |
|--------|-------|
| Outer container | `<ResizablePanelGroup orientation="horizontal" className="flex-1 min-h-0">` (existing — kept verbatim) |
| Left pane (content) | `<ResizablePanel id="content" minSize="50%">` — title + description + sub-issues + activity + comments. `flex-col`, scroll body uses `flex-1 overflow-y-auto`. Inner content rail: `mx-auto w-full max-w-4xl px-8 py-8` (UNCHANGED — existing rail width is correct for AlgoPlan layout; widening would dilute the editorial column). |
| Right pane (properties) | `<ResizablePanel id="sidebar" defaultSize={320} minSize={260} maxSize={420} collapsible>` (existing — sizing unchanged). Inner padding `p-4`, vertical section gap `space-y-5`. |
| Mobile fallback | `<Sheet>` slide-over for the right pane; left pane fills the viewport (existing — kept verbatim). |
| Modal-footer band | NEW. A 48px sticky band at the BOTTOM of the LEFT pane (NOT the right pane) holding `[Löschen]` (left) + `[Esc schließen]` + `[Fertig]` (right). Implementation: render `<IssueDetailFooter>` as the last flex child of the left pane with `border-t bg-card sticky bottom-0`. Replaces the current pattern where Delete is buried in the More-actions dropdown. |

### Auth card layout contract (shared by Login / Signup / EmailVerify / PasswordReset)

| Aspect | Value |
|--------|-------|
| Outer page | `flex min-h-svh flex-col bg-background` — DragStrip is FIRST flex child; centered card region fills the rest. |
| Centered region | `flex flex-1 flex-col items-center justify-center px-6 pb-12` (matches existing `NewWorkspacePage` pattern) |
| Card | `<Card class="w-full max-w-sm">` (existing pattern from `LoginPage`) — DOES NOT change for signup or password-reset; same width keeps visual continuity across the auth set. Email-verify card may be `max-w-md` to fit the OTP grid + helper copy more comfortably. |
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
| Section block | `<SettingsSection>` (NEW shared atom — see Inventory). Each section: italic heading row (`text-sm italic font-semibold` — Phase 6 italic note above) + body card. Section vertical gap `space-y-8` (existing). |
| Danger Zone visual | Same `<SettingsSection>` shell but heading carries the destructive accent dot and the section body has a `border-destructive/30` ring (NEW) — soft signal that the surface is destructive without being noisy. |

### Auth-card auto-margins

`max-w-sm` (24rem = 384px) keeps the card from growing on wide screens; vertical centering is handled by `min-h-svh + items-center justify-center`. For windows under ~480px tall (rare on desktop), the centering yields scroll on `pb-12` overflow — acceptable.

---

## Typography

This phase uses ONE additional typography role beyond Phases 2/4/5: **Display title (italic)** for auth and section headings. All other roles inherit.

| Role | Tailwind class | Computed | Weight | Line height | Used by |
|------|---------------|----------|--------|-------------|---------|
| Display (italic) — auth title | `text-2xl italic` | 24px | `font-semibold` (600) | `leading-tight` (1.25) | `<CardTitle>` of LoginPage / SignupPage / EmailVerifyPage / PasswordResetPage / PasswordResetRequestPage |
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
| Dominant (60%) | `--background` (auth page canvas; detail-modal canvas; settings right-pane canvas), `--card` (every Card surface; inbox row hover transparent over card), `--sidebar` (settings left nav inherits sidebar tone) | Auth pages: `bg-background`. Cards: `bg-card`. Settings nav: `bg-sidebar` (NEW — was `bg-background`; brings settings nav in line with main app sidebar so the visual rhythm doesn't break when navigating from sidebar→settings). |
| Secondary (30%) | `--muted` (form-field disabled, helper text background, slug display block), `--muted-foreground` (caption text), `--border` (card borders, separator lines, danger-zone ring) | Form input chrome, helper text, separators. |
| Accent (10%) | `--brand`, `--tag-p0..p3`, `--success`, `--info`, `--warning`, `--destructive` | Reserved-for list below. |
| Destructive | `--destructive` | Delete-workspace primary; Danger-Zone ring + heading dot; password-meter score 0-1 fill; "remove avatar" button hover; toast errors (existing); modal-footer Delete button. |
| Focus ring | `--ring` | All interactive elements: `focus-visible:ring-[3px] focus-visible:ring-ring/50`. Inherits from button/input primitives. |

**Accent reserved for** (exhaustive — accent MUST NOT appear elsewhere on Phase 6 surfaces):

1. **Issue detail — modal-footer "Fertig" button** — `<Button variant="default">` (`bg-primary` brand-green). The ONE primary CTA in the modal.
2. **Issue detail — modal-footer "Löschen" button** — `<Button variant="destructive">`. NEW: surfaces destructive at modal footer instead of buried in dropdown.
3. **Issue detail — Priority SegmentedControl active item** — Phase 2 atom's standard active treatment (`bg-background` lift over `bg-muted` track). The active P0/P1/P2/P3 pill carries the per-priority color via `text-tag-pN` on the active item only. (Implementation: pass `colorByValue` prop to `<SegmentedControl>` — NEW prop — that maps each value to its `text-tag-pN` class. See DTL Sub-Phase.)
4. **Issue detail — Tag chips** — `<TagChip color="brand" onRemove={...}>{tag}</TagChip>` for user-defined tags; `<TagChip color="tag-pN">{priorityLabel}</TagChip>` for the priority chip when shown inline. Reuse Phase 2 atom verbatim.
5. **Issue detail — Assignee `<AvatarInitial>`** — Phase 2 atom; deterministic palette per name. Replaces the current `<ActorAvatar>` fallback path WHEN the actor has no image. (`<ActorAvatar>` already prefers `<AvatarInitial>` styling for memberless actors; Phase 6 standardizes the swap.)
6. **Auth pages — primary CTA** — `<Button variant="default" size="lg" class="w-full">` reading `"Weiter"`, `"Anmelden"`, `"Konto erstellen"`, `"Code bestätigen"`, `"Passwort zurücksetzen"`. Brand-green. Single primary CTA per auth page.
7. **Auth pages — Google button** — `<Button variant="outline" size="lg" class="w-full">` (existing — kept). Carries the Google logo SVG (existing four-color hex literals are GRANDFATHERED — Google brand requires exact hex). NO other hex literals are introduced.
8. **Password-strength meter — segment fills** — 4 segments mapped to score buckets: `score 0-1 → bg-destructive` (1 segment filled), `score 2 → bg-warning` (2 segments), `score 3 → bg-info` (3 segments), `score 4 → bg-success` (4 segments). Empty segments use `bg-muted`. NO new tokens.
9. **Inbox — unread row indicator** — `<AccentBar color="brand" orientation="vertical" />` as a 3px-wide leading edge on each UNREAD row. Read rows show `bg-transparent` in that slot. Replaces the current `bg-brand` mini-dot inline with the title (which is preserved as a fallback for sm-screen mobile rows where the leading bar is too narrow to scan).
10. **Inbox — Mark-all-read button** — `<Button variant="ghost" size="sm">{checkmarkIcon} Alle gelesen</Button>` in the inbox PageHeader. Brand-green only on hover via `hover:text-brand`. NEW button — replaces the dropdown-buried "Mark all as read" in current `inbox-page.tsx`.
11. **Settings — Danger Zone heading dot** — `size-1.5 rounded-full bg-destructive` decorative dot left of the heading text. The ONE destructive accent in the settings nav and section header.
12. **Settings — Dark-mode active radio** — current `appearance-tab.tsx` uses `ring-2 ring-brand` on the active option; Phase 6 KEEPS this. NEW: also adds a brand-green check-mark icon at the top-right corner of the active mockup (`absolute top-1 right-1`) for an extra visual cue.
13. **Workspace tab — Save button** — `<Button>` (default brand-green). Existing.
14. **Workspace switcher dropdown — active workspace row** — `data-state=open:bg-sidebar-accent` (existing). NO accent inside the dropdown rows.
15. **AgentsPage — selected agent row** — `data-selected:bg-accent` (existing pattern). The agent's `<AvatarInitial>` carries the per-name color (Phase 2 atom).
16. **NoAccessPage — primary CTA** — `<Button>{Go to my workspaces}</Button>` brand-green (existing). Single CTA.
17. **404 page (NEW)** — `<Button>{Zur Startseite}</Button>` brand-green. Single CTA. Mirror of NoAccessPage with different copy.

**No hex / no RGB.** Same Phase 1 contract. The Google logo SVG is the lone exception — explicitly grandfathered and limited to the LoginPage Google button.

**60/30/10 verification:** On the issue detail modal: left pane (cards/canvas, ~60%) + right pane (PropRow muted backgrounds + sidebar tone, ~30%) + accent surfaces (SegmentedControl active pill + chips + assignee avatars + modal-footer buttons, ~10%). On auth pages: page background (~60%) + Card surface (~30%) + brand CTA + wordmark dot + strength-meter (~10%).

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
| Right-pane section heading — Details | `"Details"` | German (REPLACES `"Details"` — same word in German, kept) |
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
| New tag input placeholder | `"+ Neues Tag"` | German (NEW per DTL-03) |
| Tag-chip remove `aria-label` | `"Tag entfernen"` | German (NEW) |
| Delete confirmation dialog title | `"Issue löschen?"` | German (REPLACES `"Delete issue"`) |
| Delete confirmation body | `"Dieses Issue und alle Kommentare werden dauerhaft gelöscht. Diese Aktion kann nicht rückgängig gemacht werden."` | German (REPLACES current English) |
| Delete confirmation cancel | `"Abbrechen"` | German |
| Delete confirmation confirm | `"Löschen"` | German |
| Delete success toast | `"Issue gelöscht"` | German (REPLACES `"Issue deleted"`) |
| Delete failure toast | `"Issue konnte nicht gelöscht werden"` | German (REPLACES `"Failed to delete issue"`) |

### Auth Flows (AUTH)

| Element | Copy | Language |
|---------|------|----------|
| AlgoPlanWordmark text | `"AlgoPlan"` | English (brand) |
| LoginPage email step title | `"Willkommen zurück"` | German (REPLACES `"Sign in to Multica"`) |
| LoginPage email step description | `"Gib deine E-Mail-Adresse ein, um einen Anmeldecode zu erhalten."` | German |
| LoginPage email field label | `"E-Mail"` | German |
| LoginPage primary CTA | `"Weiter"` | German (REPLACES `"Continue"`) |
| LoginPage Google CTA | `"Mit Google fortfahren"` | German (REPLACES `"Continue with Google"`) |
| LoginPage "or" separator | `"oder"` | German (REPLACES `"or"`) |
| LoginPage signup nudge | `"Noch kein Konto? "` + `<AppLink>"Konto erstellen"</AppLink>` | German (NEW — links to /signup) |
| LoginPage password-reset nudge | `"Passwort vergessen?"` | German (NEW — links to /password-reset/request — only shown when password-mode is active; OTP-only login has no password) |
| Code step title | `"Code prüfen"` | German (REPLACES `"Check your email"`) |
| Code step description | `"Wir haben einen Code an {email} gesendet."` | German (REPLACES current) |
| Code step Resend (cooldown active) | `"Erneut senden in {n}s"` | German (REPLACES `"Resend in {n}s"`) |
| Code step Resend (active) | `"Code erneut senden"` | German (REPLACES `"Resend code"`) |
| Code step Back | `"Zurück"` | German (REPLACES `"Back"`) |
| Code step error — invalid | `"Ungültiger oder abgelaufener Code"` | German (REPLACES current) |
| CLI authorize title | `"CLI autorisieren"` | German (REPLACES `"Authorize CLI"`) |
| CLI authorize body | `"CLI als {email} auf AlgoPlan zugreifen lassen?"` | German (REPLACES current) |
| CLI authorize confirm | `"Autorisieren"` | German (REPLACES `"Authorize"`) |
| CLI authorize switch account | `"Anderes Konto verwenden"` | German (REPLACES `"Use a different account"`) |
| **SignupPage** — title | `"Konto erstellen"` | German (NEW page) |
| **SignupPage** — description | `"Erstelle dein AlgoPlan-Konto in einer Minute."` | German |
| **SignupPage** — name field | `"Name"` | German |
| **SignupPage** — email field | `"E-Mail"` | German |
| **SignupPage** — password field | `"Passwort"` | German |
| **SignupPage** — strength meter labels | Score 0: `"Sehr schwach"`, 1: `"Schwach"`, 2: `"Okay"`, 3: `"Stark"`, 4: `"Sehr stark"` | German |
| **SignupPage** — primary CTA | `"Konto erstellen"` | German |
| **SignupPage** — login nudge | `"Bereits ein Konto? "` + `<AppLink>"Anmelden"</AppLink>` | German |
| **EmailVerifyPage** — title | `"E-Mail bestätigen"` | German (NEW page) |
| **EmailVerifyPage** — description | `"Wir haben einen Bestätigungslink an {email} gesendet. Klick den Link in der E-Mail."` | German |
| **EmailVerifyPage** — resend CTA | `"E-Mail erneut senden"` | German |
| **EmailVerifyPage** — change-email nudge | `"Andere E-Mail verwenden"` | German |
| **PasswordResetRequestPage** — title | `"Passwort zurücksetzen"` | German (NEW page) |
| **PasswordResetRequestPage** — description | `"Gib deine E-Mail-Adresse ein. Wir senden dir einen Link zum Zurücksetzen."` | German |
| **PasswordResetRequestPage** — primary CTA | `"Link senden"` | German |
| **PasswordResetRequestPage** — success state | `"E-Mail gesendet. Prüfe dein Postfach."` | German |
| **PasswordResetPage** — title | `"Neues Passwort wählen"` | German (NEW page; reached via `?token=...` link) |
| **PasswordResetPage** — description | `"Wähle ein starkes Passwort, das du nirgendwo sonst verwendest."` | German |
| **PasswordResetPage** — primary CTA | `"Passwort speichern"` | German |
| **PasswordResetPage** — invalid-token state | `"Dieser Link ist abgelaufen. Fordere einen neuen an."` | German |
| Sign-out button (universal — sidebar workspace switcher dropdown) | `"Abmelden"` | German (REPLACES `"Log out"` in pre-workspace pages — NewWorkspacePage / InvitePage / NoAccessPage / OnboardingFlow shells) |
| **NewWorkspacePage** — title | `"Willkommen bei AlgoPlan"` | German (REPLACES `"Welcome to Multica"`) |
| **NewWorkspacePage** — body | `"Ein Workspace, in dem du und deine KI-Teamkollegen Hand in Hand arbeiten — Issues übernehmen, kommentieren, denselben Kontext teilen."` | German (REPLACES current) |
| **NewWorkspacePage** — invite hint | `"Du kannst nach dem Erstellen Teammitglieder einladen."` | German (REPLACES current) |
| **NewWorkspacePage** — Back button | `"Zurück"` | German |
| **InvitePage** — Join title | `"{Workspace} beitreten"` | German (REPLACES `"Join {Workspace}"`) |
| **InvitePage** — Join body | `"{Inviter} hat dich als {Rolle} eingeladen."` | German |
| **InvitePage** — Decline | `"Ablehnen"` | German (REPLACES `"Decline"`) |
| **InvitePage** — Accept | `"Annehmen & beitreten"` | German (REPLACES `"Accept & Join"`) |
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
| Mark-all-read success toast | `"Posteingang aktualisiert"` | German (REPLACES `"Failed to mark all as read"` for the ERROR; success was previously silent — Phase 6 keeps it silent or shows a 1.2s toast — planner's call) |
| Mark-all-read failure toast | `"Konnte nicht als gelesen markiert werden"` | German |
| Empty state | `"Keine Benachrichtigungen"` | German (REPLACES `"No notifications"`) |
| No-selection placeholder | `"Wähle eine Benachrichtigung."` | German (REPLACES `"Select a notification to view details"`) |
| Empty inbox detail-pane | `"Dein Posteingang ist leer"` | German (REPLACES `"Your inbox is empty"`) |
| Filter chip — Mentions | `"Erwähnungen"` | German (NEW — only if INB-03 type-filter ships) |
| Filter chip — Assignments | `"Zuweisungen"` | German |
| Filter chip — Comments | `"Kommentare"` | German |
| Filter chip — System | `"System"` | German |
| Archive icon button tooltip | `"Archivieren"` | German (REPLACES `"Archive"`) |

### Settings (SET)

| Element | Copy | Language |
|---------|------|----------|
| SettingsPage left-nav title | `"Einstellungen"` | German (REPLACES `"Settings"`) |
| SettingsPage left-nav group — My Account | `"Mein Konto"` | German (REPLACES `"My Account"`) |
| SettingsPage left-nav group — Workspace | `{workspace.name}` (existing fallback) or `"Workspace"` | German |
| Tabs labels — Profile | `"Profil"` | German (REPLACES `"Profile"`) |
| Tabs labels — Appearance | `"Erscheinungsbild"` | German (REPLACES `"Appearance"`) |
| Tabs labels — API Tokens | `"API-Tokens"` | German |
| Tabs labels — General | `"Allgemein"` | German (REPLACES `"General"`) |
| Tabs labels — Repositories | `"Repositories"` | German |
| Tabs labels — Members | `"Mitglieder"` | German (REPLACES `"Members"`) |
| AppearanceTab section heading | `"Theme"` | German (same word) |
| AppearanceTab option — Light | `"Hell"` | German (REPLACES `"Light"`) |
| AppearanceTab option — Dark | `"Dunkel"` | German (REPLACES `"Dark"`) |
| AppearanceTab option — System | `"System"` | German (same) |
| AppearanceTab radio aria-label root | `"Theme auswählen"` | German |
| AppearanceTab radio aria-label per option | `"{Hell/Dunkel/System} auswählen"` | German |
| WorkspaceTab section — General | `"Allgemein"` | German |
| WorkspaceTab Save button | `"Speichern"` | German (REPLACES `"Save"`) |
| WorkspaceTab Save in-progress | `"Wird gespeichert…"` | German |
| WorkspaceTab field labels — Name / Description / Context / Slug | `"Name"` / `"Beschreibung"` / `"Kontext"` / `"Slug"` | German |
| WorkspaceTab non-admin hint | `"Nur Admins und Owner können Workspace-Einstellungen ändern."` | German (REPLACES current) |
| Danger Zone section title | `"Gefahrenzone"` | German (NEW heading wording — replaces `"Danger Zone"`) |
| Leave workspace heading | `"Workspace verlassen"` | German (REPLACES `"Leave workspace"`) |
| Leave workspace body | `"Entferne dich aus diesem Workspace."` (or sole-owner variants) | German (REPLACES current English variants) |
| Leave workspace button | `"Workspace verlassen"` | German |
| Leave-in-progress | `"Wird verlassen…"` | German |
| Delete workspace heading | `"Workspace löschen"` | German (REPLACES `"Delete workspace"`) |
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
| AgentsPage PageHeader title | `"Agenten"` | German (REPLACES `"Agents"`) |
| AgentsPage Create CTA | `"Agent erstellen"` | German (REPLACES `"Create Agent"`) |
| AgentsPage empty (no agents) | `"Noch keine Agenten"` | German (REPLACES `"No agents yet"`) |
| AgentsPage empty (active hidden) | `"Keine aktiven Agenten"` | German |
| AgentsPage empty (archived) | `"Keine archivierten Agenten"` | German |
| AgentsPage detail placeholder | `"Wähle einen Agenten."` | German (REPLACES `"Select an agent to view details"`) |
| AgentsPage archive tooltip — show | `"Archivierte Agenten anzeigen"` | German |
| AgentsPage archive tooltip — hide | `"Aktive Agenten anzeigen"` | German |
| NoAccessPage title | `"Workspace nicht verfügbar"` | German (REPLACES `"Workspace not available"`) |
| NoAccessPage body | `"Dieser Workspace existiert nicht oder du hast keinen Zugriff."` | German |
| NoAccessPage primary CTA | `"Zu meinen Workspaces"` | German |
| NoAccessPage secondary CTA | `"Mit anderem Konto anmelden"` | German |
| **404 page (NEW shared)** title | `"Seite nicht gefunden"` | German |
| **404 page** body | `"Diese Seite gibt es nicht oder sie wurde verschoben."` | German |
| **404 page** primary CTA | `"Zur Startseite"` | German |
| Workspace switcher dropdown header | `"AlgoPlan"` | English (brand) |
| Workspace switcher footer logout | `"Abmelden"` | German (REPLACES `"Log out"`) |
| Workspace switcher add-workspace | `"Workspace erstellen"` | German |

**Internationalization seam:** All NEW strings authored as plain literals in source. Aria-labels with dynamic counts (`"{count} ungelesen"`) MUST use a small pluralization helper (`count === 1 ? "ungelesene Benachrichtigung" : "ungelesene Benachrichtigungen"`) — German plural is uniform `-en` here, but the helper guards future locale work.

**Destructive actions in this phase:** Issue delete (DTL-04 modal-footer) — confirmation dialog with the existing `<AlertDialog>` primitive, German strings above. Workspace leave / delete (SET-03) — Leave is `<AlertDialog>` confirmation, Delete is the typed-name `<DeleteWorkspaceDialog>` (existing — only strings change).

---

## Component Inventory

Every file added, replaced, or rewritten in Phase 6 with role and reused atoms. Grouped by sub-phase.

### Sub-Phase DTL — Issue Detail Modal

| File | Status | Role | Reused atoms / components |
|------|--------|------|---------------------------|
| `packages/views/issues/components/issue-detail.tsx` | RESTRUCTURE | The big one. Adds `<IssueDetailFooter>` as last left-pane child; replaces priority `<PriorityPicker>` with `<IssuePrioritySegmentedControl>`; adds `<IssueDetailTagRow>` to right pane below Properties; removes Delete from More-actions dropdown; rewrites all property-section copy to German. | Phase 2 `<SegmentedControl>`, `<TagChip>`, `<AvatarInitial>`; existing `<ResizablePanelGroup>`, `<Sheet>`, `<DropdownMenu>`, `<AlertDialog>`, `<TitleEditor>`, `<ContentEditor>`, `<CommentCard>`, `<CommentInput>` |
| `packages/views/issues/components/issue-detail-footer.tsx` | NEW | The 48px sticky modal footer. `border-t bg-card sticky bottom-0` containing `[Löschen]` left + `[Esc schließen]` hint + `[Fertig]` right. | `<Button>` |
| `packages/views/issues/components/issue-priority-segmented-control.tsx` | NEW | Wraps Phase 2 `<SegmentedControl>` for the priority picker. Maps `IssuePriority` enum (urgent/high/medium/low/none) to P0/P1/P2/P3 (none→excluded by default, accessible via "Clear" affordance). Active item carries the per-priority text color. | Phase 2 `<SegmentedControl>` + `<SegmentedControlItem>` |
| `packages/views/issues/components/issue-detail-tag-row.tsx` | NEW | Per DTL-03: a wrapping row of `<TagChip>` chips with X-to-remove + a `+ Neues Tag` input below. Reads/writes `issue.tags` via existing update-issue mutation. **NOTE — backend gap:** the current `Issue` type doesn't have a `tags` field. If the backend doesn't expose tags, this component renders a UI-only stub (PR review must confirm — see FLAG section). | Phase 2 `<TagChip>`, `<Input>`, `<Button>` |
| `packages/views/issues/components/issue-detail.test.tsx` | EDIT (medium) | Update assertions: title-button now German "Eigenschaften"; Priority slot is SegmentedControl (assert role + 4 items); Modal footer renders Löschen/Fertig; clicking Löschen opens AlertDialog with German title. | — |
| `packages/views/issues/components/issue-priority-segmented-control.test.tsx` | NEW | Renders 4 items P0..P3; clicking P2 → fires `onUpdate({ priority: "medium" })`; mapping table is exhaustive. | — |
| `packages/views/issues/components/issue-detail-tag-row.test.tsx` | NEW | Renders all tags as TagChips; X click fires remove; new-tag input submit fires add; Enter submits, Esc clears. | — |

### Sub-Phase AUTH — Auth + Pre-Workspace Flows

| File | Status | Role | Reused atoms / components |
|------|--------|------|---------------------------|
| `packages/views/auth/algoplan-wordmark.tsx` | NEW | Shared brand atom: small geometric mark + `"AlgoPlan"` italic Inter Semibold. Two sizes: `default` (sidebar use — already in Phase 4) and `lg` (auth pages, larger leading). Replaces ad-hoc text in current pages. | none (pure visual) |
| `packages/views/auth/password-strength-meter.tsx` | NEW | 4-segment colored meter + score label. Lazy-loads `@zxcvbn-ts/core` via `import()` so the kilobytes never hit the login bundle. Memoizes the loaded core for re-use. | `<div>` segments only; no other atoms |
| `packages/views/auth/login-page.tsx` | RESTYLE + COPY | Existing OTP login page. Changes: AlgoPlan wordmark + italic title; German strings; new `[Konto erstellen]` link below the Continue button; new `[Passwort vergessen?]` link (only when password-mode supported — see FLAG). All existing logic (OTP, CLI callback, Google) UNCHANGED. | `<AlgoPlanWordmark>` |
| `packages/views/auth/login-page.test.tsx` | EDIT | Update text assertions: `getByText("Willkommen zurück")`, `getByText("Weiter")`, etc. Per AUTH-06. | — |
| `packages/views/auth/signup-page.tsx` | NEW | Brand-new page. Form: Name + Email + Password fields; password-strength meter under password field; primary CTA `"Konto erstellen"`; secondary link `"Bereits ein Konto? Anmelden"`. Submits to NEW backend endpoint `api.signup({ name, email, password })` (must exist; see FLAG). | `<AlgoPlanWordmark>`, `<PasswordStrengthMeter>`, `<Card>`, `<Input>`, `<Label>`, `<Button>` |
| `packages/views/auth/signup-page.test.tsx` | NEW | Renders all fields; submitting calls signup; password-strength meter updates as user types. | — |
| `packages/views/auth/email-verify-page.tsx` | NEW | Brand-new page. Reads `?email=...` from query params; shows "We sent you a link" copy + Resend CTA + "Use different email" link. Polls `api.getMe()` every 5s OR listens for a verification websocket event (planner decision; FLAG). | `<AlgoPlanWordmark>`, `<Card>`, `<Button>` |
| `packages/views/auth/email-verify-page.test.tsx` | NEW | Renders the email; Resend fires `api.resendVerification`; success state appears after verification. | — |
| `packages/views/auth/password-reset-request-page.tsx` | NEW | Brand-new page. Single email field + "Link senden" CTA + success state. | `<AlgoPlanWordmark>`, `<Card>`, `<Input>`, `<Label>`, `<Button>` |
| `packages/views/auth/password-reset-request-page.test.tsx` | NEW | Submits email; success state replaces form. | — |
| `packages/views/auth/password-reset-page.tsx` | NEW | Brand-new page. Reads `?token=...` from query; renders new-password + confirm-password fields with password-strength meter; primary CTA `"Passwort speichern"`. Invalid-token state shows error + link back to request page. | `<AlgoPlanWordmark>`, `<PasswordStrengthMeter>`, `<Card>`, `<Input>`, `<Label>`, `<Button>` |
| `packages/views/auth/password-reset-page.test.tsx` | NEW | Renders both password fields; submit fires reset; mismatched passwords show inline error. | — |
| `packages/views/auth/index.ts` | EDIT | Re-export new pages and the wordmark atom. | — |
| `packages/views/workspace/new-workspace-page.tsx` | RESTYLE + COPY | Add `<AlgoPlanWordmark size="lg" />` to the title block; convert title to italic; German strings. DragStrip stays as first flex child (existing — verified). | `<AlgoPlanWordmark>` |
| `packages/views/invite/invite-page.tsx` | RESTYLE + COPY | Add wordmark to the InviteShell; German strings throughout the 5 render branches (loading / error / default / accepted / declined). DragStrip stays first flex child. | `<AlgoPlanWordmark>` |
| `packages/views/onboarding/onboarding-flow.tsx` | LIGHT EDIT | Onboarding is its own multi-step shell — Phase 6 only updates the "Welcome to Multica" + similar copy via the wordmark atom + German strings. Step internals stay unchanged; rebrand pass (Phase 7) handles deep copy review. | `<AlgoPlanWordmark>` |

### Sub-Phase INB — Inbox

| File | Status | Role | Reused atoms / components |
|------|--------|------|---------------------------|
| `packages/views/inbox/components/inbox-page.tsx` | RESTRUCTURE | Add `<InboxBucketHeader>` rows interleaved with `<InboxListItem>` rows, computed via `groupInboxByDate()`. Replace dropdown-buried "Mark all as read" with a header `[Alle gelesen]` button. Add keyboard shortcut `E` (handled at page level — guarded against input/textarea focus). German strings. | `<InboxBucketHeader>` (NEW), `<InboxListItem>` (existing, restyled), `<TagChip>` (NEW — for INB-03 type filter chips if shipped) |
| `packages/views/inbox/components/inbox-bucket-header.tsx` | NEW | Sticky header row: italic German label (Heute/Gestern/Diese Woche/Älter) + count + `border-b border-border bg-card`. `h-9 sticky top-0 z-10`. | none (pure layout) |
| `packages/views/inbox/components/inbox-list-item.tsx` | RESTYLE | Add leading `<AccentBar color="brand" orientation="vertical" />` 3px-wide for unread rows; `bg-transparent` for read. Keep mobile-fallback dot. Replace `<ActorAvatar>` no-image fallback with `<AvatarInitial>`. | Phase 2 `<AccentBar>`, `<AvatarInitial>` |
| `packages/views/inbox/utils/group-by-date.ts` | NEW | Pure function: `groupInboxByDate(items: InboxItem[]): Array<{ bucket: "today" \| "yesterday" \| "this_week" \| "older"; items: InboxItem[] }>`. Date math uses `created_at`; bucketing relative to NOW each render. Stable sort: items inside a bucket keep server order (newest first). | none |
| `packages/views/inbox/utils/group-by-date.test.ts` | NEW | Unit tests for fixed dates around boundaries: 23:59 today, 00:01 yesterday, 6 days ago, 7 days ago, 30 days ago. | — |
| `packages/views/inbox/hooks/use-inbox-shortcut.ts` | NEW | `useEffect` that registers a global keydown listener for `E`. Calls handler unless `document.activeElement` is INPUT, TEXTAREA, or `[contenteditable=true]`. Returns nothing — wires the page's mark-all-read mutation. | none |
| `packages/views/inbox/hooks/use-inbox-shortcut.test.ts` | NEW | Pressing E fires handler; pressing E with focus inside an input does NOT fire; cleanup removes listener. | — |
| `packages/views/inbox/components/inbox-type-filter.tsx` | NEW (only if INB-03 ships) | Row of `<TagChip color="brand">` filter chips. Reads/writes a small Zustand `useInboxFilterStore` with selected type set. NOTE: `InboxItem.type` field MUST exist in the backend — confirm in Phase 6 plan-phase. If not, this component is deferred. | Phase 2 `<TagChip>` |
| `packages/views/inbox/components/inbox-page.test.tsx` | NEW | Renders bucket headers in correct order; mark-all-read button calls mutation; E shortcut fires; E inside input does NOT fire. | — |

### Sub-Phase SET — Settings

| File | Status | Role | Reused atoms / components |
|------|--------|------|---------------------------|
| `packages/views/settings/components/settings-page.tsx` | RESTYLE + COPY | German strings; sidebar-tone background on left nav. Tab list ordering unchanged. Add a `[Gefahrenzone]` virtual tab in the Workspace group that scrolls to the danger-zone section in WorkspaceTab (NOT a separate tab — same tab, but a quick-jump). | `<SettingsSection>` (NEW) |
| `packages/views/settings/components/settings-section.tsx` | NEW | Shared section wrapper: italic heading row + Card body. Variant `tone="default" \| "danger"` — danger wraps body in `border-destructive/30` ring AND adds the destructive heading dot. | `<Card>` |
| `packages/views/settings/components/appearance-tab.tsx` | RESTYLE + COPY | Existing 3-mockup radio (Hell/Dunkel/System). Phase 6 changes: German labels; ensure `setTheme` writes via `useTheme()` from `@multica/ui/components/common/theme-provider` (which uses `storageKey="multica_theme"` per Phase 1). The Phase 4 sidebar `DarkModeToggle` and this radio MUST stay in sync — they share the next-themes provider. | existing `useTheme`, `<button role="radio">` |
| `packages/views/settings/components/workspace-tab.tsx` | RESTYLE + COPY | German strings throughout. Wrap each section in `<SettingsSection>`. Danger Zone uses `<SettingsSection tone="danger">`. Logic UNCHANGED (especially the `navigateAwayFromCurrentWorkspace` safe-order pattern — WS-05). | `<SettingsSection>` |
| `packages/views/settings/components/account-tab.tsx` | RESTYLE + COPY | German strings; wrap in `<SettingsSection>`. AvatarInitial used for the avatar fallback when user has no avatar URL. | `<SettingsSection>`, `<AvatarInitial>` |
| `packages/views/settings/components/members-tab.tsx` | RESTYLE + COPY | German strings; AvatarInitial for member rows without avatar; wrap in `<SettingsSection>`. | `<SettingsSection>`, `<AvatarInitial>` |
| `packages/views/settings/components/repositories-tab.tsx` | RESTYLE + COPY | German strings; wrap in `<SettingsSection>`. | `<SettingsSection>` |
| `packages/views/settings/components/tokens-tab.tsx` | RESTYLE + COPY | German strings; wrap in `<SettingsSection>`. | `<SettingsSection>` |
| `packages/views/settings/components/delete-workspace-dialog.tsx` | RESTYLE + COPY | German strings; visual unchanged (typed-name pattern is well-designed). | — |
| `packages/views/settings/components/delete-workspace-dialog.test.tsx` | EDIT | German string assertions. | — |

### Sub-Phase WS — Workspace Management + Agents + Error States

| File | Status | Role | Reused atoms / components |
|------|--------|------|---------------------------|
| `packages/views/agents/components/agents-page.tsx` | RESTYLE + COPY | German strings; restyle empty states; replace ad-hoc avatars in `<AgentListItem>` with `<AvatarInitial>` for agents without custom avatar. PageHeader stays as-is for `h-12`. | `<AvatarInitial>` |
| `packages/views/agents/components/agent-list-item.tsx` | RESTYLE | Use `<AvatarInitial>` when agent has no image URL; keep image when present. | Phase 2 `<AvatarInitial>` |
| `packages/views/agents/components/agent-detail.tsx` | RESTYLE + COPY | German strings; visual structure UNCHANGED. | — |
| `packages/views/agents/components/create-agent-dialog.tsx` | RESTYLE + COPY | German strings. | — |
| `packages/views/workspace/no-access-page.tsx` | RESTYLE + COPY | German strings; add `<AlgoPlanWordmark size="lg" />` above the heading; DragStrip stays first flex child. | `<AlgoPlanWordmark>` |
| `packages/views/workspace/no-access-page.test.tsx` | EDIT | German assertions. | — |
| `packages/views/common/not-found-page.tsx` | NEW | 404 page. `flex min-h-svh flex-col` with DragStrip first. AlgoPlan wordmark + heading + body + primary CTA `"Zur Startseite"`. Web mounts at `apps/web/app/not-found.tsx`; Desktop mounts via WindowOverlay-style fallback in the tab router. | `<AlgoPlanWordmark>`, `<DragStrip>`, `<Button>` |
| `packages/views/common/not-found-page.test.tsx` | NEW | Renders heading + body + CTA; CTA navigates to root. | — |
| `packages/views/workspace/empty-state.tsx` | NEW (per WS-03) | Reusable empty-state shell: optional `illustration?: ReactNode` slot + heading + body + optional CTA. Used by board/list (already shipped from Phase 5 — refactor existing inline copy into this component for reuse), Inbox empty, Agents empty, Search empty, etc. | `<Button>` |
| `packages/views/workspace/empty-state.test.tsx` | NEW | Renders heading/body/CTA; renders illustration when slot provided. | — |
| `packages/views/dashboard-shell/workspace-switcher.tsx` (existing — Phase 4) | LIGHT EDIT | German strings on dropdown items: `"Workspace erstellen"`, `"Abmelden"`. Visual unchanged (Phase 4 already established the wordmark + chevron pattern). | — |
| `apps/desktop/src/renderer/src/components/window-overlay.tsx` | EDIT | NO visual change inside this file (it's a fixed-positioning shell only). Only verify that the wrapped views (`NewWorkspacePage`, `InvitePage`, `OnboardingFlow`) still render their own DragStrip as first flex child after Phase 6 restyle. | — |

**Total inventory:** 7 NEW files in DTL + 12 NEW + 5 EDITED in AUTH + 6 NEW + 2 RESTYLE in INB + 1 NEW + 8 RESTYLE in SET + 4 RESTYLE + 4 NEW in WS = **~52 files touched**, of which **23 are NEW**. Plus the test files (each NEW component ships its `.test.tsx`).

---

## Sub-Phase DTL — Issue Detail Modal

Per DTL-01..04. The detail modal is the most-visited surface in the app after the issues list — its restructure is the highest-value DTL work.

### Two-pane layout (DTL-01)

| Aspect | Contract |
|--------|----------|
| Pane split | Existing `<ResizablePanelGroup horizontal>` is KEPT verbatim. Default 320px right pane (existing default), `minSize=260`, `maxSize=420`, collapsible. The "two-pane" requirement is already satisfied by the existing layout — Phase 6 only needs to confirm Title+Comments live in left, Status/Priority/Tags/Assignees live in right. |
| Left pane content order | (1) PageHeader breadcrumb + tools (existing) → (2) Title editor → (3) Sub-issue-of breadcrumb (when parent) → (4) Description editor + reaction bar → (5) Sub-issues block → (6) `<hr />` divider → (7) Activity heading + subscribe-row + AgentLiveCard + TaskRunHistory + timeline + comments → (8) Comment input → (9) **NEW**: `<IssueDetailFooter>` sticky band. |
| Right pane content order | (1) **NEW**: `<IssueDetailTagRow>` at the very TOP (above Properties — tags are the most variable property and deserve top placement) → (2) Properties section: Status / Priority / Assignee / Due date / Project (Priority is now SegmentedControl per DTL-02) → (3) Parent issue section (when parent) → (4) Details section: Created by / Created / Updated → (5) Token usage section (when usage data present). |
| Mobile fallback | `<Sheet>` slide-over preserved (existing). Modal-footer band hides on mobile (no room) — Delete remains in More-actions dropdown on mobile only. |

### Priority SegmentedControl (DTL-02)

| Aspect | Contract |
|--------|----------|
| Component | `<IssuePrioritySegmentedControl value={issue.priority} onChange={p => handleUpdateField({ priority: p })} aria-label="Priorität" />` |
| Visible items (4) | `P0` (urgent), `P1` (high), `P2` (medium), `P3` (low). The `none` enum value is NOT shown as a tab — instead, when `priority === "none"`, the SegmentedControl renders with NO active item (all 4 unhighlighted). A small `[× Priorität entfernen]` button appears below the control when priority IS set. Clicking it sets `priority: "none"`. |
| Mapping | `IssuePriority → P-label`: `urgent → P0`, `high → P1`, `medium → P2`, `low → P3`, `none → (cleared)`. |
| Active item color | The Phase 2 `<SegmentedControl>` lifts the active item with `bg-background + shadow-sm`. Phase 6 ADDS a per-item text color when active: P0 active → `text-tag-p0`, P1 → `text-tag-p1`, P2 → `text-tag-p2`, P3 → `text-tag-p3`. Implementation: pass a NEW `colorByValue?: Record<string, string>` prop to `<SegmentedControl>` (planner: confirm Phase 2 atom can accept this; if not, extend the atom rather than fork the styling). |
| Replaces | `<PriorityPicker>` dropdown. The dropdown component remains in the codebase for use in More-actions menu and inline pickers (e.g. Kanban context menu) — NOT deleted. |
| Width | `w-full` inside the right pane (PropRow gives the SegmentedControl the row's full content width, so the 4 items distribute evenly). |
| Keyboard | Inherited from Phase 2: ArrowLeft/Right cycle items; Tab leaves the control. |

### Tag-chip row (DTL-03)

| Aspect | Contract |
|--------|----------|
| Component | `<IssueDetailTagRow tags={issue.tags ?? []} onAdd={(t) => ...} onRemove={(t) => ...} />` |
| Layout | `flex flex-wrap gap-1.5` containing `<TagChip color="brand" onRemove={...}>{tag}</TagChip>` for each tag, followed by an inline `+ Neues Tag` input (toggleable with click). |
| Add UX | Click the `+` chip → input replaces it inline → user types → Enter submits + clears input + re-shows the `+` chip → Esc cancels. |
| Remove UX | X icon on each chip (built into `<TagChip onRemove>` from Phase 2). |
| Backend gap (FLAG) | The current `Issue` type has no `tags: string[]` field. If the backend does not expose tags, this component should ship as a UI-only stub (writes to local state only) with a TODO comment + a console.warn pointing to `FTR-04` in Out-of-Scope. **Planner decides during Phase-6 plan-phase: ship UI-only, defer entirely, or cancel DTL-03.** |

### Modal footer (DTL-04)

| Aspect | Contract |
|--------|----------|
| File | `packages/views/issues/components/issue-detail-footer.tsx` |
| Position | Sticky bottom of the LEFT pane: `<div class="sticky bottom-0 z-10 flex h-12 items-center justify-between gap-2 border-t border-border bg-card px-4">` |
| Left side | `<Button variant="destructive" size="sm" onClick={() => setDeleteDialogOpen(true)}>{TrashIcon} Löschen</Button>` |
| Right side | `<span class="text-xs text-muted-foreground">Esc zum Schließen</span>` + `<Button variant="default" size="sm" onClick={onDone}>Fertig</Button>` |
| `onDone` behavior | When the modal is opened from a list/board (not as a routed page), `Fertig` closes the modal. When opened as a dedicated page (e.g. `/:slug/issues/:id`), `Fertig` is hidden — Esc is enough. The component accepts `onDone?: () => void` and only renders `Fertig` when defined. |
| Esc key | Existing modal Esc handling (already routed by `<Dialog>` primitive when modal-mode; for the routed page, Esc currently falls through to navigation back). Phase 6 keeps both behaviors. |
| Confirmation | Clicking Löschen opens the existing `<AlertDialog>` confirmation dialog (German strings per Copywriting Contract). |

---

## Sub-Phase AUTH — Auth + Pre-Workspace Flows

Per AUTH-01..06. The largest *file-count* sub-phase because three pages are NEW (signup, email-verify, password-reset).

### AlgoPlanWordmark atom

| Aspect | Contract |
|--------|----------|
| File | `packages/views/auth/algoplan-wordmark.tsx` (also re-exported from `packages/views/dashboard-shell/wordmark.tsx` if needed; for now keep in `auth/` so auth pages can import without touching shell layer) |
| Sizes | `default` (24px height — sidebar use, matches Phase 4 wordmark) and `lg` (40px height — auth pages, larger leading) |
| Composition | `<span class="size-2 rounded-full bg-brand" />` (the brand dot — slightly larger than Phase 4's `size-1` for the lg variant) + `<span class="text-{size} font-semibold italic leading-none">AlgoPlan</span>` |
| Italic | YES on auth pages per AUTH-01. Phase 4 sidebar wordmark stays UPRIGHT (per Phase 4 D-12); Phase 6 introduces the italic variant for auth-display use only. The two are distinguished by the `lg` size prop selecting italic. |
| Tooltip | None (the wordmark sits inside its own card; no tooltip needed). |

### Login page (AUTH-01) — RESTYLE existing

| Aspect | Contract |
|--------|----------|
| File | `packages/views/auth/login-page.tsx` |
| Visual | `<AlgoPlanWordmark size="lg" />` above title; title becomes `<CardTitle class="text-2xl italic font-semibold">{title}</CardTitle>`; description below. German strings throughout. |
| OTP path | UNCHANGED logic. The 6-slot `InputOTP` stays as-is. Email step + Code step + CLI confirm step all kept. |
| Google button | UNCHANGED logic. Strings → German. SVG hex literals grandfathered. |
| New affordances | (1) `[Konto erstellen]` link below CTA. (2) `[Passwort vergessen?]` link — ONLY rendered when password-mode is active (see FLAG below). For OTP-only login (current state), neither link is shown. |

### Signup page (AUTH-02) — NEW

| Aspect | Contract |
|--------|----------|
| File | `packages/views/auth/signup-page.tsx` |
| Layout | Same auth-card layout as Login. AlgoPlanWordmark + italic title `"Konto erstellen"` + description. |
| Form fields | Name (`<Input>`), Email (`<Input type="email">`), Password (`<Input type="password">`). Tab order: Name → Email → Password → Submit. |
| Password-strength meter | `<PasswordStrengthMeter password={password} />` rendered immediately under the password field. Updates on every keystroke (debounced 200ms inside the meter). |
| Submit | `<Button class="w-full" size="lg">Konto erstellen</Button>` — disabled until: name non-empty, email matches `/^.+@.+\..+$/`, password score ≥ 2 (`Okay` or higher per zxcvbn). |
| Submit handler | Calls `api.signup({ name, email, password })`. On success: redirect to `email-verify-page` with `?email=...`. On error: inline `<p class="text-sm text-destructive">{message}</p>`. |
| Login nudge | Below the card: `"Bereits ein Konto? Anmelden"` linking to `/login`. |
| Backend gap (FLAG) | `api.signup`, `api.verifyEmail`, `api.resendVerification`, `api.requestPasswordReset`, `api.resetPassword` may NOT exist in the current API client. Phase 6 plan-phase MUST audit `packages/core/api/`. If absent: planner decides whether to (a) deliver pages with stubbed handlers + backend ticket, (b) defer the whole password mode to v2 (keep AUTH-02 strength meter for an eventual signup, ship signup page UI without submit), or (c) drop AUTH-02..05 entirely. **This is the largest scope decision in Phase 6.** |

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

### EmailVerifyPage (AUTH-01) — NEW

| Aspect | Contract |
|--------|----------|
| File | `packages/views/auth/email-verify-page.tsx` |
| Reached via | Redirect from SignupPage with `?email=...`. Or directly from a "verify email" reminder shown inside the dashboard for unverified users (out of scope for v1; planner notes if added). |
| Visual | Standard auth card. Title `"E-Mail bestätigen"` italic. Description with the email. Big icon (e.g. `<Mail class="size-12 text-brand" />`) above the description. |
| Resend | `<Button variant="outline" size="lg">{Mail} E-Mail erneut senden</Button>` with 60s cooldown (mirror existing OTP resend pattern). |
| Change-email link | Below the card, plain link: `"Andere E-Mail verwenden"` → navigates back to /signup. |
| Polling vs WS (FLAG) | Two implementation options for "verification complete" detection: (a) Poll `api.getMe()` every 5s; if `user.email_verified_at` is set, redirect to `/onboarding`. (b) Subscribe to a `email:verified` WS event. Planner picks during plan-phase. Default: option (a) — simpler. |

### PasswordResetRequestPage (AUTH-01) — NEW

| Aspect | Contract |
|--------|----------|
| File | `packages/views/auth/password-reset-request-page.tsx` |
| Layout | Standard auth card. Title `"Passwort zurücksetzen"`. Single email field + "Link senden" CTA. |
| Submit | Calls `api.requestPasswordReset(email)`. On success: replace form with success state (`"E-Mail gesendet. Prüfe dein Postfach."`). On error: inline error. |
| Success state | Big checkmark icon + success message + `[Zurück zur Anmeldung]` link. |

### PasswordResetPage (AUTH-01) — NEW

| Aspect | Contract |
|--------|----------|
| File | `packages/views/auth/password-reset-page.tsx` |
| Reached via | `/password-reset?token=...` link from email |
| Layout | Standard auth card. Title `"Neues Passwort wählen"`. Two password fields: New + Confirm. PasswordStrengthMeter under New field. |
| Validation | Confirm must equal New (inline error otherwise). New must score ≥ 2. |
| Submit | Calls `api.resetPassword(token, newPassword)`. On success: redirect to `/login` with success toast. On invalid-token error: render error state with `[Neuen Link anfordern]` link → /password-reset/request. |

### Pre-workspace pages (AUTH-03..05) — RESTYLE existing

| Page | Phase 6 changes |
|------|-----------------|
| `NewWorkspacePage` | (1) Add `<AlgoPlanWordmark size="lg" />` to title block. (2) Title becomes `text-3xl italic font-semibold` (existing was `text-3xl font-semibold` upright — italic per Phase 6 italic note). (3) German strings. (4) DragStrip stays first flex child (existing — verified). |
| `InvitePage` | (1) AlgoPlanWordmark inside InviteShell (above the card). (2) Title `text-xl italic font-semibold` per Phase 6 italic note. (3) German strings in all 5 render branches. (4) DragStrip stays first flex child. |
| `OnboardingFlow` | (1) Each step's hero header gets the AlgoPlanWordmark (per existing per-step DragStrip + StepHeader pattern). (2) German strings limited to step-shell strings (deeper step content stays for Phase 7). |

### AUTH-05 DragStrip enumeration

Every full-window desktop view that lives OUTSIDE `<DashboardShell>` MUST mount `<DragStrip />` as the FIRST flex child of its page root. Phase 6 audit:

| File | DragStrip status before Phase 6 | Phase 6 action |
|------|--------------------------------|----------------|
| `packages/views/workspace/new-workspace-page.tsx` | Present (line 34) | KEEP — verify still first flex child after restyle |
| `packages/views/invite/invite-page.tsx` (InviteShell) | Present (line 241) | KEEP — verify still first flex child |
| `packages/views/workspace/no-access-page.tsx` | Present (line 20) | KEEP — verify still first flex child |
| `packages/views/onboarding/onboarding-flow.tsx` (legacy single-column shell) | Present (line 257) | KEEP |
| `packages/views/onboarding/steps/step-welcome.tsx` | Present (lines 76, 180) | KEEP |
| `packages/views/onboarding/steps/step-questionnaire.tsx` | Present (lines 103, 267) | KEEP |
| `packages/views/onboarding/steps/step-workspace.tsx` | Present (line 246) | KEEP |
| `packages/views/onboarding/steps/step-platform-fork.tsx` | Present (lines 152, 229) | KEEP |
| `packages/views/onboarding/steps/step-runtime-connect.tsx` | (verify in plan-phase) | If absent and the step is full-window: ADD |
| `packages/views/onboarding/steps/step-agent.tsx` | (verify in plan-phase) | Same |
| `packages/views/onboarding/steps/step-first-issue.tsx` | (verify in plan-phase) | Same |
| `packages/views/auth/login-page.tsx` | NOT PRESENT in shared view | Login page is wrapped by app-level layout. Web's `(auth)/login/page.tsx` and Desktop's login overlay each mount their own DragStrip OUTSIDE the LoginPage component. Phase 6 verifies. |
| `packages/views/auth/signup-page.tsx` (NEW) | — | App-level wrapping: Web mounts at `apps/web/app/(auth)/signup/page.tsx` (NEW route), Desktop adds a WindowOverlay type `signup` (NEW). Both wrap with DragStrip. |
| `packages/views/auth/email-verify-page.tsx` (NEW) | — | Same wrapping pattern. |
| `packages/views/auth/password-reset-request-page.tsx` (NEW) | — | Same wrapping pattern. |
| `packages/views/auth/password-reset-page.tsx` (NEW) | — | Same wrapping pattern. |
| `packages/views/common/not-found-page.tsx` (NEW) | — | DragStrip as first flex child. |
| `packages/views/modals/create-workspace.tsx` | Present (line 36) | This is the modal variant of new-workspace; keep DragStrip. |

**Pitfall reminder:** DragStrip MUST be the FIRST flex child of the page-root flex container. Inserting AlgoPlanWordmark "before" the DragStrip during the restyle would break window dragging. Wordmark goes INSIDE the centered card region, not above DragStrip.

### Desktop WindowOverlay extensions (NEW types)

`apps/desktop/src/renderer/src/stores/window-overlay-store.ts` currently has 3 overlay types: `new-workspace`, `invite`, `onboarding`. Phase 6 plan-phase MUST decide whether to add: `signup`, `email-verify`, `password-reset-request`, `password-reset`. Recommended: YES — pre-workspace flows are NOT routes per CLAUDE.md desktop route categories; auth flows are pre-workspace. Adding 4 more overlay types in `window-overlay-store.ts` and 4 corresponding branches in `window-overlay.tsx` is the correct extension.

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
| Input-focus guard | Hook MUST check `document.activeElement` is not INPUT/TEXTAREA/[contenteditable=true] before firing. Otherwise users typing in the issue detail comment-input (which is rendered in the right pane while inbox detail is selected) would inadvertently mark everything read while typing the letter "e". |
| Modifier conflict | Bare `E` only — `Ctrl+E` / `Cmd+E` browser shortcuts (URL bar focus) MUST NOT be intercepted. Hook checks `!event.metaKey && !event.ctrlKey && !event.altKey`. |
| Existing dropdown items | "Mark all as read" dropdown item is REMOVED from the More-actions menu (replaced by the button). Other batch operations (Archive all, Archive read, Archive completed) STAY in the dropdown. |

### Type filter chips (INB-03)

OPTIONAL per requirement. The requirement says: "Filter-by-type Chips (Mentions / Assignments / Comments / System) — falls `type`-Feld existiert; sonst als Annotation vermerkt und UI-only Mock". Plan-phase decision:

| Path | When |
|------|------|
| Ship as functional | If `InboxItem.type` field exists and is enum-typed (audit `packages/core/types`) |
| Ship as UI-only mock | If field exists but is freeform — render the chips, store selected set in `useInboxFilterStore`, but client-side filter only |
| Defer | If field doesn't exist — annotate INB-03 as "needs backend" and ship without |

Phase 6 plan-phase verifies. UI contract if shipped: `<InboxTypeFilter>` component renders 4 `<TagChip color="brand" onRemove={removeFromSet}>` chips below the bucket-grouped list (in PageHeader area, below the title row). Active chips have full opacity; inactive chips have `opacity-60`.

### Row restyle

| Aspect | Contract |
|--------|----------|
| Leading edge | NEW. `<AccentBar color="brand" orientation="vertical" />` for unread rows; transparent for read. 3px wide, full row height, absolute-positioned `left-0 inset-y-0`. |
| Mobile fallback | Phone-narrow rows (`<sm`) keep the existing brand-green dot inline with the title (because the 3px leading edge is too narrow to be a useful read-state signal at touch density). |
| Avatar | `<ActorAvatar>` continues to be used. Phase 6 ensures the no-image fallback path inside `<ActorAvatar>` uses `<AvatarInitial>` (Phase 2 atom) — verify in plan-phase that `<ActorAvatar>` already does this; otherwise add a thin wrapper. |
| Status indicator | Existing `<StatusIcon>` continues. |
| Time-ago | Existing `timeAgo()` helper continues. |
| Hover/select | Existing `bg-accent/50` hover, `bg-accent` selected. UNCHANGED. |

---

## Sub-Phase SET — Settings

Per SET-01..03.

### Sectioned layout (SET-01)

The current settings page already uses Tabs orientation="vertical" with two grouped headings (My Account / Workspace). SET-01 says "Account / Notifications / Appearance / Workspace / Danger Zone" — but the existing structure splits this slightly differently. Phase 6 audit:

| Existing tab | Target Phase 6 grouping |
|-------------|-------------------------|
| Profile | "Mein Konto" group → keep as `profile` tab |
| Appearance | "Mein Konto" group → keep as `appearance` tab |
| API Tokens | "Mein Konto" group → keep |
| Workspace General | "Workspace" group → keep |
| Repositories | "Workspace" group → keep |
| Members | "Workspace" group → keep |
| Notifications (NEW per SET-01) | If a notifications-preferences feature exists → add tab. If not → defer (planner notes this; v2 INB2-02 covers it). Default: DEFER. |
| Danger Zone (NEW per SET-01) | NOT a separate tab — it's the bottom section of the Workspace General tab (existing pattern). Phase 6 KEEPS this convention (Linear, Notion, Slack all do the same). The left-nav "Workspace" group label can carry a small `[Gefahrenzone]` quick-jump button that scrolls to the section. |

### Dark-mode radio (SET-02) — already implemented

The existing `appearance-tab.tsx` already implements the Light/Dark/System radio with mockups. Phase 6 changes:
- German labels (Hell/Dunkel/System).
- Verify it uses `useTheme()` from `@multica/ui/components/common/theme-provider` (Phase 1 wrapper) — which writes to `localStorage` with `storageKey="multica_theme"`. Confirm no parallel state.
- Active option's `[ring-2 ring-brand]` styling stays.

**Critical:** Phase 4's `<DarkModeToggle>` in the sidebar AND the Phase 6 settings radio MUST share state via the same next-themes provider. Toggle in sidebar → radio in settings re-renders to reflect new value. Test: open settings, switch to Dark, navigate to dashboard, observe sidebar's DarkModeToggle now shows Sun icon (the inverse).

### Danger Zone (SET-03) — typed-name confirmation

The current `<DeleteWorkspaceDialog>` already implements typed-name confirmation (see existing file). Phase 6 changes:
- German strings throughout.
- Visual: keep the typed-name pattern verbatim (it's a well-designed dialog — no need to restyle).

The Leave-Workspace flow has its own `<AlertDialog>` (no typed-name — Leave is reversible). Phase 6 keeps this distinction:
- Leave → simple AlertDialog with German strings
- Delete → typed-name dialog (forceful friction)

Both flows use the existing `navigateAwayFromCurrentWorkspace()` safe-order pattern (WS-05) — UNCHANGED.

---

## Sub-Phase WS — Workspace + Agents + Error States

Per WS-01..05.

### WS-01 — Workspace switcher

The Phase 4 wordmark already implements the workspace switcher dropdown (it IS the wordmark trigger). Phase 6:
- German strings on dropdown items
- Wordmark styling stays UPRIGHT (per Phase 4 D-12) — NOT italic. Italic is for auth-page display only.

### WS-02 — Agents view

| Component | Phase 6 change |
|-----------|----------------|
| `AgentsPage` | German strings; restyle empty states |
| `AgentListItem` | Use `<AvatarInitial>` for agents without image (per UI-03) |
| `AgentDetail` | German strings; visual unchanged |
| `CreateAgentDialog` | German strings |

### WS-03 — Empty states with illustration slot

NEW shared `<EmptyState>` component in `packages/views/workspace/empty-state.tsx`:

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

Phase 5 already shipped board-empty / list-empty inline strings — Phase 6 refactors those into `<EmptyState>` for consistency (low-risk: same strings, same visual, just consolidated component).

Default illustration when `illustration` not provided: a muted icon (e.g. `<Inbox class="size-10 text-muted-foreground/40" />`) appropriate to the surface. Each consumer passes the right icon.

### WS-04 — Error states

| State | Web behavior | Desktop behavior |
|-------|-------------|------------------|
| 404 (page not found) | Render `<NotFoundPage>` via Next.js `app/not-found.tsx` | Render `<NotFoundPage>` via tab-router fallback |
| Workspace not accessible | `<NoAccessPage>` via Next.js `app/[workspaceSlug]/(dashboard)/_error.tsx` (existing) | Silent heal: `WorkspaceRouteLayout` drops the stale tab from the store; user lands on a valid workspace tab. NO error page rendered. (Per CLAUDE.md desktop route categories.) |

Phase 6 confirms the desktop silent-heal already works — the Phase 6 visual restyle of `NoAccessPage` (German strings + AlgoPlanWordmark) does NOT affect desktop because desktop never renders the page.

### WS-05 — Destructive ops safe order

Existing `WorkspaceTab.navigateAwayFromCurrentWorkspace()` already follows the CLAUDE.md safe order:
1. Read destination from cached workspace list
2. `setCurrentWorkspace(null, null)`
3. `navigation.push(destination)`
4. THEN `await mutation.mutateAsync(workspaceId)`

Phase 6 changes ZERO of this logic. The German string updates do not touch the destructive code path. Test verification: existing tests for Leave/Delete continue to pass after string updates.

---

## DragStrip Enumeration (Cross-Cutting)

Audit table — every full-window desktop view that needs `<DragStrip />` as first flex child. Mandatory because: no DragStrip = users cannot drag the macOS window from the top edge.

| Surface | DragStrip slot | Phase 6 verifies |
|---------|---------------|------------------|
| `<DashboardShell>` (Phase 4) | `topSlot` prop, Desktop injects `<DragStrip />` | Already correct (Phase 4 SC#2) |
| `NewWorkspacePage` | First child of root flex | Existing (line 34) — verify after restyle |
| `InvitePage` (InviteShell) | First child of root flex | Existing (line 241) — verify after restyle |
| `NoAccessPage` | First child of root flex | Existing (line 20) — verify after restyle |
| `OnboardingFlow` (legacy single-column shell) | First child of root flex | Existing (line 257) — verify after restyle |
| `step-welcome.tsx` | Two columns; DragStrip in each | Existing (lines 76, 180) — verify |
| `step-questionnaire.tsx` | Two columns; DragStrip in each | Existing (lines 103, 267) — verify |
| `step-workspace.tsx` | First child | Existing (line 246) — verify |
| `step-platform-fork.tsx` | Two columns; DragStrip in each | Existing (lines 152, 229) — verify |
| `step-runtime-connect.tsx` | (audit in plan-phase) | If full-window, add |
| `step-agent.tsx` | (audit in plan-phase) | If full-window, add |
| `step-first-issue.tsx` | (audit in plan-phase) | If full-window, add |
| `LoginPage` (and 4 NEW auth pages) | NOT in shared view; injected by app wrapper | Web: `apps/web/app/(auth)/{login,signup,email-verify,password-reset,password-reset-request}/page.tsx` wraps with DragStrip-bearing shell. Desktop: WindowOverlay shell mounts overlay+DragStrip. NEW types added to `window-overlay-store.ts`. |
| `NotFoundPage` (NEW) | First child | NEW — must include DragStrip |
| `<CreateWorkspaceDialog>` modal (`packages/views/modals/create-workspace.tsx`) | First child of dialog content | Existing (line 36) — verify after any string updates |

**Test gate:** A simple grep `grep -L "DragStrip" packages/views/**/*-page.tsx packages/views/onboarding/**/step-*.tsx packages/views/auth/*.tsx packages/views/common/not-found-page.tsx packages/views/workspace/*-page.tsx packages/views/invite/invite-page.tsx` should output ZERO files. Add this to the Phase 6 manual-verification checklist.

---

## Token Discipline

Phase 6 consumes ONLY tokens that already exist in `packages/ui/styles/tokens.css` (per Phase 1 inventory):

`--background` · `--foreground` · `--card` · `--card-foreground` · `--popover` · `--popover-foreground` · `--primary` · `--primary-foreground` · `--secondary` · `--secondary-foreground` · `--muted` · `--muted-foreground` · `--accent` · `--accent-foreground` · `--destructive` · `--border` · `--input` · `--ring` · `--brand` · `--brand-foreground` · `--success` · `--warning` · `--info` · `--sidebar` · `--sidebar-foreground` · `--sidebar-primary` · `--sidebar-primary-foreground` · `--sidebar-accent` · `--sidebar-accent-foreground` · `--sidebar-border` · `--sidebar-ring` · `--tag-p0` · `--tag-p0-foreground` · `--tag-p1` · `--tag-p1-foreground` · `--tag-p2` · `--tag-p2-foreground` · `--tag-p3` · `--tag-p3-foreground` · `--highlight` · `--highlight-foreground` · `--radius` · `--radius-sm` · `--radius-md` · `--radius-lg` · `--font-sans`

If implementation surfaces a need for a token outside this list, STOP and re-open the Phase 1 token contract. Do NOT silently introduce new tokens.

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
pnpm --filter @multica/views exec vitest run issues/components/issue-detail-tag-row.test.tsx
pnpm --filter @multica/views exec vitest run issues/components/issue-detail-footer.test.tsx

# AUTH
pnpm --filter @multica/views exec vitest run auth/login-page.test.tsx
pnpm --filter @multica/views exec vitest run auth/signup-page.test.tsx
pnpm --filter @multica/views exec vitest run auth/email-verify-page.test.tsx
pnpm --filter @multica/views exec vitest run auth/password-reset-page.test.tsx
pnpm --filter @multica/views exec vitest run auth/password-reset-request-page.test.tsx
pnpm --filter @multica/views exec vitest run auth/password-strength-meter.test.tsx
pnpm --filter @multica/views exec vitest run auth/algoplan-wordmark.test.tsx

# INB
pnpm --filter @multica/views exec vitest run inbox/components/inbox-page.test.tsx
pnpm --filter @multica/views exec vitest run inbox/components/inbox-bucket-header.test.tsx
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
```

### E2E commands per Success Criterion

```bash
# SC#1 — Issue detail two-pane + SegmentedControl P0..P3 (DTL-01, DTL-02)
pnpm exec playwright test e2e/tests/issue-detail-modal.spec.ts

# SC#2 — Auth pages with AlgoPlan wordmark + italic title + password strength meter (AUTH-01, AUTH-02)
pnpm exec playwright test e2e/tests/auth-flows.spec.ts

# SC#3 — DragStrip on every pre-workspace desktop view (AUTH-05)
pnpm exec playwright test e2e/tests/desktop-drag-region.spec.ts
# (plus a manual verification: build the desktop app, open each pre-workspace overlay, drag the window from the top edge, verify it moves)

# SC#4 — Settings Danger Zone typed-name + dark-mode radio persists (SET-02, SET-03)
pnpm exec playwright test e2e/tests/settings-danger-zone.spec.ts
pnpm exec playwright test e2e/tests/settings-dark-mode-persists.spec.ts

# SC#5 — Inbox date-bucket grouping + mark-all-read button + E shortcut (INB-01, INB-02)
pnpm exec playwright test e2e/tests/inbox-grouping.spec.ts
pnpm exec playwright test e2e/tests/inbox-mark-all-read-shortcut.spec.ts
```

### Manual verification checklist

- [ ] Run grep audit: every full-window desktop view has DragStrip as first flex child
- [ ] Open Settings → Appearance → toggle Dark; navigate to dashboard; verify sidebar DarkModeToggle reflects new theme
- [ ] Open issue detail; verify Priority is SegmentedControl (not dropdown); cycle P0..P3 with arrow keys
- [ ] Open issue detail; verify modal-footer Löschen/Fertig/Esc band visible
- [ ] Open Inbox; scroll list; verify bucket headers stick at top during scroll
- [ ] Inbox: press E with no input focused → mark-all-read fires; press E inside a comment input → does NOT fire
- [ ] Build desktop; open New Workspace overlay; drag window from top edge → window moves
- [ ] Build desktop; open Invite overlay; drag window → window moves
- [ ] Build desktop; signup overlay (NEW); drag window → window moves

---

## Light + Dark Mode Verification

Phase 6 introduces ZERO `dark:*` overrides on real surfaces. Inherits Phase 1 token correctness.

Verification gate:
1. Light mode: every Phase 6 surface (issue detail, auth pages, inbox, settings, agents, error pages) renders correctly with no missing colors.
2. Toggle dark via sidebar DarkModeToggle. Every surface above renders correctly in dark.
3. Refresh in dark mode. Surfaces stay dark on first paint (Phase 1 FOUC fix).
4. Open Settings → Appearance → Light. Surfaces flip to light. Sidebar DarkModeToggle now shows Moon (action = back to dark).
5. AppearanceTab's WindowMockup `dark:` literals are GRANDFATHERED (preview-only).

---

## Hard Constraints Summary (consumed by gsd-ui-checker)

1. **DragStrip MUST be the FIRST flex child** of every full-window desktop view (CLAUDE.md). Inserting wordmark/branding above DragStrip breaks window dragging.
2. **Pre-workspace flows on Desktop are NOT routes** — they are `WindowOverlay` state per CLAUDE.md desktop route categories. Phase 6 ADDS `signup`, `email-verify`, `password-reset-request`, `password-reset` overlay types.
3. **Priority SegmentedControl mapping is fixed**: `urgent→P0, high→P1, medium→P2, low→P3, none→excluded` (with separate "Clear" affordance for `none`).
4. **Settings dark-mode radio MUST persist via `multica_theme` localStorage** — the Phase 1 next-themes wrapper is the single source of truth. Sidebar DarkModeToggle and settings radio share state via `useTheme()`.
5. **Inbox `E` shortcut MUST NOT fire when input/textarea/contenteditable is focused** — guard via `document.activeElement` check + modifier-key check.
6. **`@zxcvbn-ts/core` is lazy-loaded** in `password-strength-meter.tsx` via dynamic `import()` so the kilobytes never hit the login bundle.
7. **No `dark:*` overrides** on real surfaces. AppearanceTab WindowMockup is grandfathered (preview-only).
8. **No new tokens.** Only Phase 1 OKLCH inventory.
9. **German source-of-truth for new strings**; existing English in unrelated files stays for Phase 7.
10. **Modal-footer Löschen** opens existing `<AlertDialog>` (NOT inline destruction). Typed-name confirmation only for workspace deletion.
11. **`navigateAwayFromCurrentWorkspace()` safe order is unchanged** — WS-05 is verified by existing tests passing after string updates.
12. **AvatarInitial wraps `<ActorAvatar>` no-image fallback** — does NOT replace `<ActorAvatar>` everywhere. Image-bearing actors keep their image.
13. **The Issue type may not have a `tags` field** — DTL-03 implementation must verify and downgrade to UI-only if absent (FLAG below).
14. **Backend `signup` / `verifyEmail` / `passwordReset` endpoints may not exist** — AUTH-02..AUTH-05 implementation must verify (FLAG below). The largest scope question of Phase 6.
15. **Existing PageHeader-per-page pattern is kept** (Inbox, Settings, Agents). Phase 6 does NOT replace per-page headers with the Phase 4 AppTopbar (per Phase 4 deferred decision).

---

## BLOCK / FLAG / PASS

### BLOCK

None — Phase 6 has no upstream blockers. Phase 5 is complete (code-side); Phase 4 shell is in progress but does not gate the Phase 6 view-level work.

### FLAG

1. **AUTH-02..AUTH-05 require backend endpoints that may not exist.**
   The current `LoginPage` uses email + 6-digit OTP code (`api.sendCode` + `api.verifyCode`). There is NO existing signup, no password verification, no password-reset request, no password-reset confirmation. AUTH-02 mandates a 4-level password strength meter — which only makes sense if password mode is being introduced.
   **Required plan-phase decision:** audit `packages/core/api/` for `signup`, `verifyEmail`, `requestPasswordReset`, `resetPassword`, `resendVerification` methods. If absent, planner picks one of:
     - (a) Ship pages with stubbed handlers; cut backend tickets for parallel work
     - (b) Defer AUTH-02..AUTH-05 to v2; ship only AUTH-01 (LoginPage restyle) + AUTH-06 (test string updates)
     - (c) Drop AUTH-02..AUTH-05 entirely; treat AlgoPlan as OTP-only
   **Recommendation:** option (b) — ship AUTH-01 + AUTH-06 in Phase 6; defer the new pages to a follow-up "Auth v2" phase. This is the fastest path to a coherent v1 release without entangling frontend with backend work.

2. **DTL-03 tag row requires `Issue.tags` field.**
   The current `Issue` type has NO `tags: string[]` field. If the backend doesn't expose tags, DTL-03 is UI-only.
   **Required plan-phase decision:** audit `packages/core/types`. If absent, planner picks: (a) ship UI-only stub, (b) defer DTL-03 to v2.
   **Recommendation:** option (b) — defer to FTR-04 (Out-of-Scope → v2).

3. **INB-03 type filter requires `InboxItem.type` field.**
   Same pattern as DTL-03. Plan-phase audits `packages/core/types`. Probably the field DOES exist (inbox already differentiates assignment vs comment vs mention notifications). If yes, ship as functional. If no, defer per requirement language.

4. **`<SegmentedControl>` colorByValue prop extension.**
   The Phase 2 atom does not currently have a `colorByValue` prop. Phase 6 needs it for the per-priority active-item text color in the issue detail Priority control. Two options:
   - Extend Phase 2 atom (preferred — keeps atom rich)
   - Style override at the Phase 6 wrapper (`<IssuePrioritySegmentedControl>`) via class injection
   Planner picks. Either is acceptable. Recommendation: extend the atom (lower long-term complexity).

5. **PageHeader vs AppTopbar coexistence.**
   Phase 4 explicitly deferred the question of whether to replace per-page PageHeader with AppTopbar for Inbox/Settings/Agents. Phase 6 KEEPS PageHeader per existing convention — a future phase can audit. Flagged for visibility, not blocking.

6. **EmailVerifyPage detection mechanism.**
   Two options for detecting "verification complete": polling `api.getMe()` vs WS event. Planner picks default. Plan-phase decision.

### PASS

- Token discipline strict (no new tokens; no dark: overrides on real surfaces; no hex/RGB except grandfathered Google logo SVG)
- DragStrip enumeration complete
- 60/30/10 color discipline verified per surface
- German source-of-truth applied to all NEW Phase 6 strings; English preserved on out-of-Phase-6 surfaces
- Reused atoms: TagChip (×4 surfaces), AccentBar (×1), AvatarInitial (×4), SegmentedControl (×1)
- Reused Phase 4 components: DashboardShell, AppSidebar, AppTopbar (transitive), DarkModeToggle (state-shared with settings radio)
- Reused Phase 5 conventions: Italic for display headers, German action verbs, no destructive italic
- WS-05 destructive-ops safe order preserved (no logic changes in `navigateAwayFromCurrentWorkspace`)
- Backend gaps (AUTH-02..05, DTL-03, INB-03) flagged for plan-phase decision rather than silently shipped as broken
- 21 requirements mapped to ~52 file touches (~23 NEW)
- Test commands per file + E2E commands per success criterion enumerated

---

## Design Token Inventory (from Phase 1 — no new tokens introduced)

This phase consumes ONLY tokens already in `packages/ui/styles/tokens.css`. See full list in **Token Discipline** section above. If implementation surfaces a need for a token outside this list, STOP and re-open the Phase 1 token contract.

---

## Checker Sign-Off

- [ ] Dimension 1 Copywriting: PASS
- [ ] Dimension 2 Visuals: PASS
- [ ] Dimension 3 Color: PASS
- [ ] Dimension 4 Typography: PASS
- [ ] Dimension 5 Spacing: PASS
- [ ] Dimension 6 Registry Safety: PASS

**Approval:** pending
