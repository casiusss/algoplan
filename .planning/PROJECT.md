# AlgoPlan — Frontend Redesign & Rebrand

## What This Is

Kompletter Frontend-Redesign der Multica-Plattform inklusive Rebrand zu **AlgoPlan** (app-facing). Die bestehende Linear-artige Issue-Plattform wird visuell auf eine neue Board-zentrierte Identität umgestellt: Algorivo OKLCH Palette (brand-green #008757 auf neutralem Surface, near-white #fafbfc light / near-black #0f1318 dark), Inter als Schriftfamilie (inkl. italic für Headlines), neues Kanban-Board als alternative Issue-View, neuer Komponenten-Showroom. Code-Internals (Paketnamen `@multica/*`, DB-Schemas, CLI-Binary, Repo) bleiben unverändert — nur die User-facing Oberfläche wird getauscht.

## Core Value

**Beide Apps (`apps/web` + `apps/desktop`) tragen konsistent die neue AlgoPlan-Identität — jede existierende User-facing View ist im neuen Designsystem umgesetzt.** Wenn einzelne Views (Auth, Issues, Settings, Inbox, Workspace-Mgmt) im alten Look bleiben, scheitert der Redesign sichtbar.

## Requirements

### Validated

<!-- From existing codebase (see .planning/codebase/) -->

- ✓ Go-Backend mit Chi Router, sqlc, gorilla/websocket, pgvector — `server/`
- ✓ Monorepo mit pnpm workspaces + Turborepo + pnpm catalog — existing
- ✓ Internal-Packages-Pattern: `packages/core`, `packages/ui`, `packages/views`, `packages/tsconfig` — existing
- ✓ Next.js App Router auf `apps/web` (Port 3000) — existing
- ✓ Electron + electron-vite auf `apps/desktop` (Session-Tabs pro Workspace) — existing
- ✓ TanStack Query = Server State / Zustand = Client State / WS invalidates Query — existing
- ✓ Shadcn-Components auf Base-UI-Primitives via `pnpm ui:add` — existing
- ✓ Multi-Tenancy via `workspace_id` + `X-Workspace-ID` Header — existing
- ✓ Agent-Assignees (polymorphic `assignee_type`/`assignee_id`) — existing
- ✓ CoreProvider / NavigationAdapter / WorkspaceIdProvider Platform-Bridge — existing

### Active

<!-- Frontend redesign scope — hypotheses until shipped -->

**Foundation & Tokens**
- [ ] Neues Farbsystem (Algorivo-derived OKLCH-Palette: brand-green #008757 primary, near-white/-black backgrounds, weiße/dark Cards) via CSS-Variablen in `packages/ui/styles/`
- [ ] Inter-Font als Primary-Font inkl. italic-Variante für Display-Headlines (mit System-Fallback)
- [ ] Light- und Dark-Mode als vollwertige Themes
- [ ] Semantische Design-Tokens (`bg-background`, `bg-sidebar`, `bg-canvas`, `text-muted-foreground`…) — keine hardcoded Tailwind-Farben
- [ ] Colored Tag/Chip-Komponenten (Priority P0-P3, Kategorien Backend/Frontend/Launch/Legal/DevOps, Launch-Blocker-Badge)
- [ ] Avatar-Komponente mit generierten farbigen Initial-Kreisen

**Komponenten-Showroom**
- [ ] Neue App/Route als Storybook-Showroom für alle Shadcn-/AlgoPlan-Komponenten (Review vor App-Integration)
- [ ] Alle getauschten Komponenten sind im Showroom gelistet und interaktiv prüfbar

**Dashboard-Shell**
- [ ] Dashboard-Layout mit neuer Sidebar (Team-Liste, Kategorien-Chips, Priority-Grid, View-Filter, Dark-Mode-Toggle)
- [ ] Topbar mit AlgoPlan-Branding, Priority-Filter-Chips, Blocker-Badge, Search, Label-Dropdown, primärer Task-CTA
- [ ] Phase-Timeline-Bar (Progress-Anzeige, erstmal visuell mit Mock-Daten — Logik nachträglich)
- [ ] Desktop: Tab-Bar passt ins neue Chrome (DragStrip bleibt funktional auf macOS)

**Kanban-Board-View (neu)**
- [ ] Kanban-Board mit Status-Columns (Backlog / To Do / In Progress / Review / Done)
- [ ] Drag-&-Drop zwischen Columns ändert Issue-Status (Server-Update via Mutation, optimistic)
- [ ] Inline-Task-Add pro Column (Input + "Task hinzufügen"/"Abbrechen")
- [ ] Task-Card mit colored accent bars (Tag-Farben), Titel, Meta (ID, Estimate), Avatar
- [ ] View-Toggle Board ↔ List pro Issues-Page (UI-Preference pro User persistiert)

**Issues-Listen- & Detail-Views**
- [ ] Bestehende Issues-List im neuen Look (Typografie, Colored Bars, Cards)
- [ ] Issue-Detail-Modal redesigned (Tags-Chip-Row, Status/Priority/Kategorie/Effort rechts, Assignee-Cards, Kommentar-Section, Footer mit Delete/Esc/Fertig)
- [ ] Priority als segmented Control P0/P1/P2/P3
- [ ] Effort als segmented Control S/M/L/XL (erstmal Mock — Logik später)
- [ ] Launch-Blocker-Toggle (erstmal Mock — Logik später)

**Auth & Pre-Workspace Flows**
- [ ] Login, Signup, Email-Verify, Password-Reset Views im neuen Look
- [ ] Create-Workspace Flow (Web: Route, Desktop: WindowOverlay) redesigned
- [ ] Invite-Accept Flow redesigned
- [ ] Logo/Wordmark "AlgoPlan" auf allen Pre-Workspace-Views

**Workspace-Interne Views**
- [ ] Inbox-View redesigned
- [ ] Settings (User-, Workspace-, Member-Settings) redesigned
- [ ] Workspace-Management (Switcher, Leave, Delete) redesigned
- [ ] Agents-View redesigned (Assignee-Auswahl, Agent-Profile)
- [ ] Error-/Empty-States (NoAccess, 404, leeres Board) redesigned

**Rebrand (app-facing)**
- [ ] Alle User-facing Strings "Multica" → "AlgoPlan"
- [ ] App-Logo / Wordmark / Favicon / OG-Images neu
- [ ] HTML-Titel / Meta-Description
- [ ] Electron-Window-Title, macOS-Menu, Dock-Icon

### Out of Scope

**Konzepte aus den Mocks — vollständig aus v1 entfernt (v2+):**
- **Phase-Timeline-Bar** — User hat abgewählt; kein Widget ohne Phase-Logik
- **Effort-Segmented-Control S/M/L/XL** — User hat Mock abgewählt; UI-only ohne Backend wertlos
- **Launch-Blocker-Toggle** — User hat Mock abgewählt; UI-only ohne Backend wertlos
- **Top-Performer-Widget** — kein Metrik-Backend
- **Kategorien-Taxonomie** (Backend/Frontend/Launch/Legal/DevOps) — nur als Mock-Labels im Design, keine First-Class-Struktur

**Code-Internals bleiben:**
- Paketnamen `@multica/*` NICHT umbenannt — Umbenennung wäre invasive Refactor-Welle ohne User-Value
- DB-Namen, Migrationen, sqlc-generierter Code bleiben auf `multica`
- CLI-Binary `multica`, GoReleaser-Config, Homebrew-Tap bleiben auf `multica`
- Repo-Name `multica` bleibt
- GitHub-Release-Tag-Schema bleibt

**Nicht Teil dieses Milestones:**
- Backend-Änderungen (neue Felder, Migrationen, neue Endpoints) — reiner Frontend-/UI-Milestone
- Neues Auth-Modell / Permissions-Redesign — visueller Refresh der bestehenden Flows
- E2E-Test-Rewrite — bestehende E2E-Tests werden an neue Selektoren angepasst, keine Neuarchitektur
- Mobile-/Responsive-Optimierung über existierende Breakpoints hinaus — Desktop-first wie bisher

## Context

**Codebase-Zustand** (siehe `.planning/codebase/`):
- 2500+ Zeilen Codebase-Map existieren — ARCHITECTURE.md, STRUCTURE.md, CONVENTIONS.md, TESTING.md, CONCERNS.md, STACK.md, INTEGRATIONS.md
- Monorepo ist gesund, Boundaries klar (`views/ → core/ + ui/`, keine `next/*`-Imports in shared packages)
- Shadcn-Config liegt in `packages/ui/components.json` (Base-UI-Variant, `base-nova` Style)
- Bestehende CSS-Foundation in `packages/ui/styles/` wird ersetzt, nicht erweitert
- Aktueller Branch `feat/repos-per-project` (unrelated — wird gemerged bevor Redesign startet)

**Bekannte Fragile Areas** (aus CONCERNS.md — für Redesign relevant):
- Zustand-Selector-Footguns (fresh objects → infinite re-renders) — beim Refactor der View-Components nicht neu triggern
- `useWorkspaceId()` innerhalb von Hooks bricht außerhalb von WorkspaceIdProvider — neue Components die vor Workspace-Load rendern (z.B. Sidebar während Loading) müssen `wsId` als Prop nehmen
- Desktop-DragStrip muss auf allen Vollfenster-Views weiter erster Flex-Child bleiben

**Mock-Basis**: 4 Screenshots mit "AlgoPlan BETA" als Referenz-Design. Deep-forest-green Sidebar, mint-sage Canvas, white cards, Inter-Font mit italic-Headlines, Kanban mit 5 Status-Columns, colored tag accent bars, Issue-Detail-Modal mit segmented controls.

**Zielteam**: 2-10 Personen AI-native Teams (unverändert — Multica-Positioning bleibt, nur Brand ändert sich).

## Constraints

- **Tech Stack**: Muss auf bestehender Shadcn/Base-UI/Tailwind-Stack bleiben. Kein Material-UI, kein Chakra, kein Mantine — reiner Token- und Component-Refresh.
- **Package Boundaries**: Hard rules aus `CLAUDE.md` bleiben. `packages/ui` ohne Business-Logik, `packages/views` ohne `next/*`/`react-router-dom`, `packages/core` ohne react-dom. Neue Board-Komponenten kommen in `packages/views/` (geteilt), atomic UI in `packages/ui/`.
- **DRY zwischen Apps**: Jede View existiert genau einmal in `packages/views/`. Web und Desktop wrappen identischen Content, nur Platform-Chrome unterscheidet sich (DragStrip, WindowOverlay, Tabs).
- **Keine Backwards-Compatibility**: Altes Design wird entfernt, nicht feature-gated. Monorepo läuft nicht lange parallel mit zwei Designsystemen.
- **Testabdeckung**: Bestehende Vitest-/Playwright-Tests laufen grün nach Migration. Wo Selektoren brechen, werden Tests aktualisiert — keine Tests gelöscht oder übersprungen.
- **Performance**: WS-Events dürfen nicht über neue Board-Komponenten Re-Render-Kaskaden auslösen. Virtualisierung für große Kanban-Columns (>50 Cards) nötig, falls Performance-Tests sie fordern.
- **Accessibility**: Segmented Controls, Drag-&-Drop, Modals müssen Keyboard-erreichbar bleiben (Base UI liefert das — nicht regressieren).

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Rebrand zu AlgoPlan nur app-facing, Code bleibt `@multica/*` | Paket-Rename wäre invasive Refactor-Welle ohne User-Value; Trennung erlaubt kleinen Scope | — Pending |
| Inter als alleinige Font-Familie (inkl. italic für Headlines); Source_Serif_4 nur für Landing + Onboarding behalten (Phase 1 planner Q4 deviation von D-12) | User hat Inter lokal evtl. nicht geladen, Mock zeigt serif-Fallback — echte Absicht ist Inter; Onboarding consumes font-serif (14 lines / 7 files), kann nicht ohne View-Redesign entfernt werden | — Pending Phase 1 ship; full Source_Serif_4 removal deferred to onboarding-redesign phase |
| Kanban als zusätzliche View mit Toggle (nicht Listen-Ersatz) | User-Workflow bleibt, Board ist opt-in pro Page — UI-Preference persistieren | — Pending |
| Storybook-Showroom als separate App | Komponenten vor App-Integration review-bar — reduziert Risiko beim Umschalten | — Pending |
| Phase-Progress / Effort / Launch-Blocker / Top-Performer = Mock-only | Backend-Erweiterungen würden Scope verdoppeln; UI vorbereiten, Logik später | — Pending |
| Standard Granularität (5-8 Phasen) | Balance zwischen Foundation-first-Sequenzierung und vertikal-vollständigen Feature-Drops | — Pending |
| Both Modes (Light + Dark) von Anfang an | Token-System muss Dark mitdenken, nachträglich doppelte Arbeit | — Pending |
| Algorivo OKLCH-Palette adoptiert (FND-01); FND-04 CI-Regel gedroppt (D-19) | Brand-direction-shift weg von mint-sage hin zu Algorivo brand-green; user explicit "CI-Regel unnötig" | — Pending Phase 1 ship |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-04-23 after initialization*
