# Requirements: AlgoPlan Frontend Redesign

**Defined:** 2026-04-24
**Core Value:** Beide Apps (`apps/web` + `apps/desktop`) tragen konsistent die neue AlgoPlan-Identität — jede existierende User-facing View ist im neuen Designsystem umgesetzt.

## v1 Requirements

Requirements für initialen Release. Jedes mappt zu genau einer Roadmap-Phase.

### Foundation (Tokens & Typografie)

- [ ] **FND-01**: Neue OKLCH-Farbpalette (deep-forest-green Sidebar, mint-sage Canvas, weiße Cards, colored tag chips) in `packages/ui/styles/tokens.css` ersetzt bestehende Werte atomar — beide Apps konsumieren die gleichen Tokens
- [ ] **FND-02**: Inter-Font in `next/font/google` mit `style: ["normal", "italic"]` auf `apps/web` geladen; `@fontsource-variable/inter` auf `apps/desktop` und `apps/showroom` mit italic-Axis
- [ ] **FND-03**: Dark Mode funktioniert auf beiden Apps per `.dark`-Class (next-themes auf web, Desktop pre-React inline script in `index.html` verhindert FOUC)

### Atomic UI Primitives

- [ ] **UI-01**: `TagChip`-Komponente in `packages/ui/components/ui/` mit color-prop (semantic tokens, keine hex), optional X-to-remove, getestet in Light + Dark Mode
- [ ] **UI-02**: `AccentBar`-Komponente für farbige Leiste oben auf Task-Cards, variable Segmente (1-4 Stripes nebeneinander)
- [ ] **UI-03**: `AvatarInitial`-Komponente rendert farbigen Kreis mit Initialen, generiert Farbe deterministisch aus Name oder User-ID
- [ ] **UI-04**: `SegmentedControl`-Komponente (Base UI ToggleGroup) für P0/P1/P2/P3 und andere Enum-Werte, keyboard-accessible

### Storybook Showroom

- [ ] **SB-01**: Neue App `apps/showroom` im pnpm-Workspace + Turborepo-Pipeline, Storybook 9.1.5 mit `@storybook/react-vite`, private package
- [ ] **SB-02**: `preview.ts` stellt `ThemeProvider`, `MockQueryProvider`, `MockNavigationProvider` bereit — Stories crashen nicht durch echten API-Client
- [ ] **SB-03**: Tailwind v4 `@source` scannt `packages/ui/**` und `packages/views/**`; Smoke-Story mit `bg-sidebar` rendert korrekt
- [ ] **SB-04**: `addon-a11y` (axe-core WCAG Checks) und `addon-themes` (light/dark toggle) aktiv; Stories für alle UI-01 bis UI-04 Atome

### Dashboard Shell

- [ ] **SHL-01**: `packages/views/layout/app-sidebar.tsx` redesigned mit AlgoPlan-Wordmark, Team-Liste, Kategorien-Chips, Priority-Grid, Notifications-Badge, Sidebar-Collapse
- [ ] **SHL-02**: `dashboard-layout.tsx` exposiert `topSlot?: ReactNode` prop; Desktop-App injiziert `<DragStrip />` darüber; Web lässt leer
- [ ] **SHL-03**: Topbar mit Priority-Filter-Chips (P0/P1/P2/P3), Blocker-Count-Badge (read-only Mock), Search-Input, Labels-Dropdown, primary "+ Task"-Button
- [ ] **SHL-04**: Sidebar-Hooks nehmen `wsId` als Parameter (nicht intern `useWorkspaceId()` — Sidebar rendert teilweise außerhalb WorkspaceIdProvider)
- [ ] **SHL-05**: Zustand-Selectors für Filter-/Priority-State retournieren stabile Refs (keine fresh objects → keine infinite re-renders)

### Kanban + Issues Views

- [x] **KBN-01**: `packages/views/issues/components/board-view.tsx` von `@dnd-kit/core` auf `@dnd-kit/react` v0.4.0 migriert — bestehende Tests grün, `onMoveIssue`-Signatur unverändert (Phase 5 Plans 01 + 05)
- [x] **KBN-02**: Board visuell restyled: Columns mit neuer Typografie (Inter italic für Headers), Cards mit `AccentBar`, `TagChip`, `AvatarInitial` (Phase 5 Plans 02 + 05)
- [x] **KBN-03**: Inline Task-Add pro Column — Input + "Task hinzufügen"/"Abbrechen"-Row, feuert bestehenden `useCreateIssue` mit Column-Status (Phase 5 Plans 04 + 05)
- [x] **KBN-04**: View-Toggle Board↔List UI in `issues-header.tsx` (Store `view-store.ts` existiert bereits); selected-state visuell klar (Phase 5 Plans 04 + 05)
- [x] **KBN-05
**: Listen-View (`list-view.tsx`, `list-row.tsx`) im neuen Look (Colored Bars, Chips, neue Typografie)
- [x] **KBN-06
**: WS-Invalidation-Race fixed: `queryClient.cancelQueries` vor optimistic mutation; drag-freeze bleibt 1 Frame nach `handleDragEnd` aktiv
- [x] **KBN-07
**: Scroll-Collision fixed: `MeasuringStrategy.Always` oder `autoScroll` auf Column-Scroll-Container — Drop-Targets stimmen bei gescrollter Column

### Issue Detail

- [x] **DTL-01
**: `issue-detail.tsx` redesigned zweispaltig: links Titel + Beschreibung + Kommentare, rechts Status / Priority / Kategorie / Assignees / Tags
- [x] **DTL-02
**: Priority als `SegmentedControl` P0/P1/P2/P3 (ersetzt Dropdown)
- [ ] **DTL-03**: Tag-Chip-Row mit X-to-remove je Chip, "+ Neues Tag"-Input darunter
- [x] **DTL-04
**: Modal-Footer mit "Löschen" links, "Esc schließen" + "Fertig" rechts wie im Mock

### Auth / Pre-Workspace

- [x] **AUTH-01
**: `login-page.tsx`, `signup-page.tsx`, `email-verify-page.tsx`, `password-reset-page.tsx` im neuen Look — AlgoPlan-Wordmark, zentrierte Card, Inter italic für Title
- [x] **AUTH-02
**: Password-Strength-Meter bei Signup mittels `@zxcvbn-ts/core` (+ language pack), 4-Level-Indikator
- [x] **AUTH-03
**: Create-Workspace Flow redesigned (Web: Route `/workspaces/new`, Desktop: `WindowOverlay`) mit gemeinsamer `NewWorkspacePage`-View
- [x] **AUTH-04
**: Invite-Accept-Flow redesigned (shared view, Overlay-wrap auf Desktop)
- [x] **AUTH-05
**: Desktop-Pre-Workspace-Views haben `<DragStrip />` als erster Flex-Child (macOS draggable window)
- [x] **AUTH-06
**: Test-Strings in `login-page.test.tsx` und verwandten Tests auf "AlgoPlan" aktualisiert

### Inbox

- [x] **INB-01
**: Inbox-View redesigned mit Date-Grouping (Heute / Gestern / Diese Woche / Älter)
- [x] **INB-02
**: Mark-all-read Button in Header, keyboard shortcut `E`
- [x] **INB-03
**: Filter-by-type Chips (Mentions / Assignments / Comments / System) — falls `type`-Feld existiert; sonst als Annotation vermerkt und UI-only Mock

### Settings

- [x] **SET-01
**: Settings-Page mit sectioned layout (Account / Notifications / Appearance / Workspace / Danger Zone)
- [x] **SET-02
**: Dark-Mode-Toggle in Appearance-Section (Light / Dark / System radio)
- [x] **SET-03
**: Destructive Actions (Leave Workspace, Delete Workspace) in eigener "Danger Zone"-Section mit typed-name Confirmation Modal

### Workspace / Agents / Error States

- [x] **WS-01
**: Workspace-Switcher im neuen Look (Dropdown aus Sidebar-Wordmark oder User-Menü)
- [x] **WS-02
**: Agents-View redesigned (Liste mit `AvatarInitial`, Agent-Profile-Detail)
- [x] **WS-03
**: Empty-States (leeres Board, leere Inbox, keine Ergebnisse) im neuen Look mit Illustration-Slot
- [x] **WS-04
**: Error-States (NoAccessPage auf Web, 404) redesigned
- [x] **WS-05
**: Desktop-Destructive-Ops (Leave / Delete) folgen weiterhin der safe order: read destination → `setCurrentWorkspace(null, null)` → `navigation.push` → mutate

### Rebrand Pass

- [ ] **RBR-01**: Alle user-facing Strings "Multica" → "AlgoPlan" via targeted grep (schließt `@multica/*`-Imports aus) in beiden Apps
- [ ] **RBR-02**: AlgoPlan-Logo / Wordmark / Favicon / OG-Image als neue Assets unter `packages/ui/assets/` und app-spezifisch verlinkt
- [ ] **RBR-03**: `apps/web/app/layout.tsx` Title/Meta/OG/siteName auf "AlgoPlan"; Electron `productName`, Window-Title, macOS Dock-Icon, macOS-Menu auf "AlgoPlan"
- [ ] **RBR-04**: Deep-Link-Scheme `multica://` → `algoplan://` atomar in `electron-builder.yml` + `apps/web/app/auth/callback/page.tsx`; Web-to-Desktop Callback getestet
- [ ] **RBR-05**: localStorage-Keys bleiben `multica_*` (explizite Nicht-Änderung — sonst silent logout aller User); Entscheidung in Commit-Body dokumentiert
- [x] **RBR-06
**: Alle Tests die Brand-Copy asserten (`getByText(/Multica/)` etc.) auf "AlgoPlan" aktualisiert

## v2 Requirements

Akzeptiert aber nach v1 verschoben. Nicht in aktueller Roadmap.

### Command Palette

- **CMD-01**: Cmd+K Command Palette für schnelle Navigation + Aktionen
- **CMD-02**: Keyboard-Shortcut-Overlay (`?`) listet verfügbare Shortcuts

### Kanban Advanced

- **KBN2-01**: Card-Virtualization für Columns mit 50+ Cards (`@tanstack/react-virtual`) — nur wenn Perf-Tests es fordern
- **KBN2-02**: Card-Hover-Quick-Actions (quick-assign, quick-priority)

### Inbox Advanced

- **INB2-01**: Inbox-Archive (benötigt Backend-Support)
- **INB2-02**: Notification-Preferences pro Event-Type

### Feature-Mocks → Echte Logik

- **FTR-01**: Phase-Concept als First-Class-Feature (Phase-Timeline-Bar wird echt)
- **FTR-02**: Effort-Feld S/M/L/XL im Backend (Schema-Erweiterung)
- **FTR-03**: Launch-Blocker-Feld im Backend
- **FTR-04**: Kategorien-Taxonomie (Backend/Frontend/Launch/Legal/DevOps) als First-Class-Feld
- **FTR-05**: Top-Performer-Metrik + Widget

### Auth Advanced

- **AUTH2-01**: Magic-Link-Login
- **AUTH2-02**: OAuth (Google, GitHub)
- **AUTH2-03**: 2FA / TOTP
- **AUTH2-04**: SSO/SAML

## Out of Scope

Explizit ausgeschlossen. Dokumentiert um Scope-Creep zu verhindern.

| Feature | Reason |
|---------|--------|
| Effort-Segmented-Control S/M/L/XL UI | User hat Mock explizit abgewählt — kein Backend-Feld, UI-only hätte keinen Nutzen; in FTR-02 aufgenommen für v2 |
| Launch-Blocker-Toggle UI | User hat Mock explizit abgewählt — kein Backend-Feld; in FTR-03 aufgenommen |
| Phase-Timeline-Bar (Mock) | User hat abgewählt — ohne Phase-Logik wäre Widget leer; in FTR-01 für v2 |
| Top-Performer-Widget | Kein Metrik-Backend; in FTR-05 für v2 |
| Kategorien als First-Class-Feld | Nur als Mock-Labels im Design; echte Taxonomie wäre Backend-Change |
| Paket-Rename `@multica/*` → `@algoplan/*` | Invasive Refactor-Welle ohne User-Value; explizit nur app-facing Rebrand |
| DB-/Migration-Rename | Internals bleiben `multica`; kein User-Value |
| CLI-Binary / Homebrew-Tap / Repo-Name | Internals bleiben `multica` |
| localStorage-Keys `multica_*` → `algoplan_*` | Würde alle bestehenden User silent ausloggen |
| WIP-Limits / Swimlanes / Multi-Card-Drag | Anti-Features — gegen "minimal board wins" Philosophie (Linear-Style) |
| Multi-Assignee | Backend-Schema-Change nötig — Scope-Sprengung |
| Attachment-Upload-UI im Issue-Detail | Neuer S3-Flow benötigt — Backend-Change |
| Rich-Text im Issue-Titel | Titel bleibt plain-text |
| Auto-Save für Settings-Felder | Explicit Save-Button pattern wird beibehalten |
| Mobile-/Responsive-Optimierung über bestehende Breakpoints hinaus | Desktop-first bleibt; kein Mobile-Milestone |
| Backend-Änderungen (neue Felder, Endpoints, Migrationen) | Reiner Frontend-/UI-Milestone |
| Neues Auth-Modell / Permissions-Redesign | Visueller Refresh der bestehenden Flows |
| E2E-Test-Neuarchitektur | Selektoren angepasst, keine Neuarchitektur |
| Visual Regression Tests (Chromatic) | v2+ |
| FND-04 CI-Regel gegen hardcoded Tailwind-Farben | User explicit dropped enforcement (CONTEXT D-19, 2026-04-24) — "keine — unnötig". Bestehende Verstöße werden Phase 1 Plan 04 als one-shot Migration entfernt; keine Lint-/CI-Regel verhindert neue Einführungen. Re-evaluate if Phase 2+ regressions appear. |

## Traceability

Welche Phasen decken welche Requirements. Befüllt beim Roadmap-Erstellen.

| Requirement | Phase | Status |
|-------------|-------|--------|
| FND-01 → FND-03 | Phase 1 | Pending |
| UI-01 → UI-04 | Phase 2 | Pending |
| SB-01 → SB-04 | Phase 3 | Pending |
| SHL-01 → SHL-05 | Phase 4 | Pending |
| KBN-01 → KBN-07 | Phase 5 | Complete (code-side); awaiting user live-E2E sign-off |
| DTL-01 → DTL-04 | Phase 6 | Pending |
| AUTH-01 → AUTH-06 | Phase 6 | Pending |
| INB-01 → INB-03 | Phase 6 | Pending |
| SET-01 → SET-03 | Phase 6 | Pending |
| WS-01 → WS-05 | Phase 6 | Pending |
| RBR-01 → RBR-06 | Phase 7 | Pending |

**Coverage:**
- v1 requirements: 50 total (FND×3, UI×4, SB×4, SHL×5, KBN×7, DTL×4, AUTH×6, INB×3, SET×3, WS×5, RBR×6) — FND-04 dropped to Out of Scope per CONTEXT D-19 (2026-04-24)
- Mapped to phases: 50/50 — verified by Phase 1 planner 2026-04-25
- Unmapped: 0 ✓

---
*Requirements defined: 2026-04-24*
*Last updated: 2026-04-25 — FND-04 dropped to Out of Scope per Phase 1 CONTEXT D-19; coverage count 51 → 50*
