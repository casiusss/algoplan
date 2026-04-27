# AlgoPlan — AI-native Issue Platform

## What This Is

AlgoPlan ist eine AI-native Linear-Alternative für 2-10 Personen Teams. Agenten sind First-Class-Citizens — sie ziehen Issues aus dem Backlog, arbeiten sie ab, dokumentieren ihre Arbeit und übergeben sauber an menschliche Reviewer. Stack: Go-Backend (Chi/sqlc/pgvector), Next.js Web + Electron Desktop, beide auf shared `@multica/views` + `@multica/core` + `@multica/ui` Packages. v0.5.0 hat den Frontend-Redesign + Rebrand zu AlgoPlan abgeschlossen; v0.6.0 schärft den Agent-Workflow.

## Core Value

**Agenten und Menschen teilen sich denselben Issue-Workflow ohne Reibung.** Ein Agent zieht Issues, arbeitet sie ab, übergibt strukturierte Acceptance-Tests an den Reviewer; der Reviewer hakt ab oder failt direkt am Issue, zieht es per Drag-&-Drop in „Done". Wenn der Hand-off zwischen Agent und Reviewer unklar bleibt (was wurde gebaut, wie verifiziere ich es?), bricht das Vertrauensmodell.

## Current Milestone: v0.6.0 Agent Review Loop

**Goal:** Agenten erzeugen am Ende ihrer Arbeit strukturierte Acceptance-Tests, der Reviewer hakt sie am Issue ab und zieht das Issue per Drag-&-Drop durch das Board. Beim Erstellen helfen AI-Refinement-Buttons, Issue-Descriptions zu schärfen.

**Target features:**
- Acceptance-Test JSON-Contract: Agent emittiert nach Status-Wechsel `in_progress → in_review` eine validierbare Test-Liste
- Acceptance-Test GUI-Checklist: Mensch-Reviewer hakt am Issue ab, Status-Toggle `pending → passed | failed`
- Drag-&-Drop Board: Issues per Drag zwischen Status-Spalten ziehen, optimistische Server-Mutation
- Auto-Pickup verifiziert: Agent zieht selbständig zugewiesene Issues mit Status `todo`
- Description-Refinement: Sparkle-Button im Issue-Form mit zwei Modi (Quick-Polish via inline LLM, Full-Spec via spawned Agent mit Bild-/Anhang-Support)

**Key context:**
- Reviewer-Modell: nur Mensch hakt ab (kein Agent-Self-Pass) — v0.7+ Diskussion
- Soft-Gate: failende Tests blocken Done nicht, sind nur Warning
- Test-Generierung-Kontext: Diff (primär) + Issue-Description (sekundär)
- Retroaktiv: nein — nur neu erzeugte Issues ab Release

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

<!-- v0.6.0 Agent Review Loop — hypotheses until shipped -->

**Acceptance-Test Datenmodell + API**
- [ ] DB-Tabelle `acceptance_tests(id, issue_id, title, description, category, status, position, created_by_agent_id, ...)` mit Status-Enum `pending|passed|failed`
- [ ] JSON-Schema-Contract definiert + server-side validiert (Title, Description, Category)
- [ ] `POST /issues/:id/acceptance-tests` (Agent-Auth via PAT, idempotent via external_id)
- [ ] `PATCH /acceptance-tests/:id` (Status-Toggle, Reviewer-Auth)
- [ ] WS-Event `acceptance_test.created|updated` broadcastet im Workspace-Channel

**Agent-Hook „on transition to In Review"**
- [ ] Agent-Daemon hookt Status-Wechsel `in_progress → in_review` und triggert Test-Generierung
- [ ] Prompt-Template versioniert in `server/internal/agents/acceptance/prompt.md` (Diff + Issue-Description als Context)
- [ ] LLM-Output JSON-Schema-validiert; 1 Retry bei kaputtem JSON, sonst Issue-Comment statt Block
- [ ] Tests werden via API persistiert, Issue erhält Comment-Eintrag „N Acceptance-Tests erstellt"

**Acceptance-Test GUI-Checklist**
- [ ] Neue Section „Akzeptanzkriterien" auf Issue-Detail-View (zwischen Description und Comments)
- [ ] Checkbox je Test mit Title + expandable Description, Status-Badge `pending|passed|failed`
- [ ] Reviewer-Action: pass/fail-Toggle mit optionaler Failure-Note
- [ ] Optimistic Update + WS-Invalidate
- [ ] Soft-Gate-Warning: rote Banner-Notice wenn Issue auf Done gezogen wird, aber pending/failed Tests existieren

**Drag-&-Drop Board (Cross-Column)**
- [ ] Bestehendes `@dnd-kit/react@0.4.0` Board um Cross-Column-Drag erweitern
- [ ] Drop in andere Column triggert Status-Update-Mutation optimistisch
- [ ] WS-Echo invalidiert sauber ohne Re-Render-Storm
- [ ] Soft-Gate-Warning beim Drop nach Done bei pending/failed Tests

**Auto-Pickup verifizieren**
- [ ] E2E-Test: Agent mit `assignee_type=agent`, Issue auf `todo` → Daemon pickt automatisch, transitioniert zu `in_progress`
- [ ] Settings-Toggle pro Agent: „Auto-Pickup aktiv" (default an)
- [ ] Logging: Pickup-Events sichtbar in Agent-Activity-Feed

**AI Description-Refinement**
- [ ] Sparkle-/Star-Button im Issue-Erstell-Form (neben Description-Textarea), erscheint sobald Description nicht leer ist
- [ ] Klick öffnet Mode-Auswahl: „Quick-Polish" (inline LLM-Rewrite) vs „Full-Spec erstellen" (Agent-Task)
- [ ] Quick-Polish: serverseitiger LLM-Call (`POST /issues/refine-description`), liefert Diff-Vorschau, User akzeptiert/ablehnt
- [ ] Full-Spec: triggert Spawn eines dedizierten Agenten als neue Sub-Task; Original-Issue bleibt im Form-State, Agent arbeitet asynchron, schreibt Vollständige Spec inkl. Bild-Beschreibung in Issue-Description zurück
- [ ] Bild-/Attachment-Support: Drag-&-Drop oder Paste in Description leitet Bilder als multipart in den Agenten-Context weiter
- [ ] Loading-State + Cancel-Möglichkeit; bei Full-Spec Toast „Agent arbeitet, schreibt Spec in 1-3 Min zurück"

### Out of Scope

**v0.6.0 — Agent Review Loop bewusst nicht enthalten:**
- **Agent-Self-Pass / Agent-hakt-Tests-ab** — User-Entscheidung: nur Mensch reviewt in v0.6, Diskussion v0.7+
- **Hard-Gate** (Done blockiert ohne 100% passed Tests) — Soft-Gate (Warning) reicht; Hard-Gate wäre v0.7+ Policy-Diskussion
- **Retroaktive Test-Generierung** für bestehende Issues — nur neue Issues ab Release
- **Multi-Agent-Voting** auf Tests — ein Agent generiert, ein Mensch reviewt
- **Test-Templates / Test-Library** — Generierung ist rein LLM-driven, keine kuratierte Pattern-DB
- **Acceptance-Test-Editing durch Agent nach Erstellung** — Tests sind nach Erstellung Read-only für Agent; Reviewer kann editieren

**Code-Internals bleiben** (v0.5.0 Carve-out, weiterhin gültig):
- Paketnamen `@multica/*` NICHT umbenannt — Umbenennung wäre invasive Refactor-Welle ohne User-Value
- Go-Modul-Pfad `github.com/multica-ai/multica/server` bleibt
- DB-Namen, Migrationen, sqlc-generierter Code bleiben auf `multica`-Schema-Naming
- API-Cloud-URL `api.multica.ai` bleibt (Cloud-Mode, falls jemals aktiviert)

**Nicht Teil dieses Milestones:**
- Mobile-/Responsive-Anpassungen über bestehende Desktop-first-Breakpoints hinaus
- Permissions-Redesign / RBAC — bestehende Member-Roles reichen für Review
- E2E-Suite-Refactor — neue E2E-Tests kommen für die neuen Flows, alte bleiben unverändert

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
| Algorivo OKLCH-Palette adoptiert (FND-01); FND-04 CI-Regel gedroppt (D-19) | Brand-direction-shift weg von mint-sage hin zu Algorivo brand-green; user explicit "CI-Regel unnötig" | ✓ Shipped v0.5.0 |

### v0.6.0 — pending
| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Reviewer = nur Mensch (kein Agent-Self-Pass) | Vertrauensmodell braucht Mensch-im-Loop bevor Agenten sich selbst reviewen; v0.7+ separater Diskurs | — Pending |
| Soft-Gate (Warning, kein Block) bei Done-Drop mit pending/failed Tests | Reviewer-Workflow soll fließen; Hard-Gate wäre rigide Policy-Entscheidung für später | — Pending |
| Test-Generierungs-Kontext = Diff (primär) + Issue-Description (sekundär) | Diff zeigt was wirklich gebaut wurde, Description ergänzt Intent | — Pending |
| Retroaktive Test-Generierung = nein, nur neue Issues ab Release | Vermeidet Backfill-Kosten + LLM-Quota; alte Issues bleiben unverändert | — Pending |
| Description-Refinement: zwei Modi (Quick-Polish vs Full-Spec via spawned Agent) | Quick = inline LLM-Call für schnellen Polish; Full-Spec = echte Agent-Task (eigenes Issue), erlaubt Bilder + längere Verarbeitung | — Pending |

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
