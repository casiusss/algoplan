# Milestone v0.6.0 — Agent Review Loop

**Defined:** 2026-04-27
**Goal:** Agenten erzeugen strukturierte Acceptance-Tests beim Status-Wechsel zu In-Review; Mensch-Reviewer hakt sie ab und zieht Issues per Drag-&-Drop; AI hilft beim Schärfen der Issue-Description.

---

## v0.6.0 Requirements

### Acceptance-Test Datenmodell + API

- [ ] **AT-01**: Backend persistiert Acceptance-Tests pro Issue mit Status `pending|passed|failed`, Title, Description, Category (`functional|edge|regression`), Position
- [ ] **AT-02**: Agent kann Tests via `POST /issues/:id/acceptance-tests` mit JSON-Schema-validiertem Payload erstellen (PAT-Auth)
- [ ] **AT-03**: Reviewer kann Test-Status via `PATCH /acceptance-tests/:id` togglen (Member-Auth)
- [ ] **AT-04**: Idempotenz: gleicher `external_id` führt zu Update statt Duplicate
- [ ] **AT-05**: WS-Event `acceptance_test.created|updated` broadcastet im Workspace-Channel
- [ ] **AT-06**: Server-side JSON-Schema bei Validierungs-Fehler liefert 422 mit klarer Field-Liste

### Agent-Hook „on transition to In Review"

- [ ] **AGT-01**: Agent-Daemon erkennt Status-Wechsel `in_progress → in_review` und triggert Test-Generierung
- [ ] **AGT-02**: Prompt-Template versioniert in `server/internal/agents/acceptance/prompt.md`, nimmt Diff (primär) + Issue-Description (sekundär) als Kontext
- [ ] **AGT-03**: LLM-Output wird gegen JSON-Schema validiert; bei kaputtem JSON 1× Re-Prompt, sonst Issue-Comment „Acceptance-Test-Generierung fehlgeschlagen"
- [ ] **AGT-04**: Erfolgreiche Generierung erzeugt Issue-Comment „N Acceptance-Tests erstellt" mit Inline-Liste
- [ ] **AGT-05**: Generierung läuft asynchron — Status-Wechsel ist nicht blockiert wenn LLM-Call lange dauert

### Acceptance-Test GUI-Checklist

- [ ] **REV-01**: Issue-Detail zeigt Section „Akzeptanzkriterien" zwischen Description und Comments wenn Tests existieren
- [ ] **REV-02**: Reviewer kann pro Test pass/fail togglen mit optionalem Failure-Note-Textfeld
- [ ] **REV-03**: Reviewer kann Tests editieren (Title, Description) — write-through zur API
- [ ] **REV-04**: Optimistic Update mit Rollback bei API-Fehler; WS-Event invalidiert Query-Cache
- [ ] **REV-05**: Status-Badge je Test (pending = neutral, passed = green, failed = red)
- [ ] **REV-06**: Reviewer kann manuell Test hinzufügen (kein Agent-Trigger nötig)

### Drag-&-Drop Board

- [ ] **BRD-01**: Issues lassen sich per Drag-&-Drop zwischen Status-Spalten verschieben (Backlog / Todo / In Progress / In Review / Done)
- [ ] **BRD-02**: Drop in andere Column triggert Status-Update-Mutation optimistisch; UI-State-Reorder vor Server-Bestätigung
- [ ] **BRD-03**: Bei Mutation-Fehler Rollback mit Toast-Notification
- [ ] **BRD-04**: WS-Echo invalidiert Issue-Query ohne Re-Render-Storm (cache-update statt refetch)
- [ ] **BRD-05**: Soft-Gate-Warning beim Drop in Done-Spalte falls Issue pending oder failed Tests hat — User-Confirmation per Dialog, kein Hard-Block
- [ ] **BRD-06**: Cross-Column-Drag Keyboard-erreichbar (Base-UI / dnd-kit a11y-Standards)

### Auto-Pickup Verifikation

- [ ] **PCK-01**: E2E-Test: Issue mit `assignee_type=agent`, Status `todo` wird vom Daemon innerhalb von ≤30s gepickt → Status auf `in_progress` gesetzt
- [ ] **PCK-02**: Settings-Toggle pro Agent: „Auto-Pickup aktiv" (default `true`); deaktiviert verhindert Pickup
- [ ] **PCK-03**: Pickup-Events erscheinen im Agent-Activity-Feed mit Timestamp + Issue-ID
- [ ] **PCK-04**: Race-Resilienz: zwei Daemons (Multi-Worker-Setup) picken nicht dasselbe Issue (DB-Lock oder atomic-claim)

### AI Description-Refinement

- [ ] **REF-01**: Sparkle-Button erscheint im Issue-Form sobald Description-Textarea Inhalt hat (≥1 Zeichen)
- [ ] **REF-02**: Klick öffnet Mode-Auswahl: „Quick-Polish" vs „Full-Spec erstellen"
- [ ] **REF-03**: Quick-Polish triggert `POST /issues/refine-description` mit aktuellem Description-Text; Server ruft LLM und liefert verbesserte Version
- [ ] **REF-04**: Diff-Preview vor Akzeptanz: User sieht Vorher/Nachher und kann Akzeptieren oder Ablehnen
- [ ] **REF-05**: Full-Spec triggert Spawn eines dedizierten Agent-Tasks; Issue-Form bleibt offen mit „Spec wird erstellt — 1-3 Min"-Toast; Agent schreibt erweiterte Spec asynchron in Issue-Description zurück
- [ ] **REF-06**: Bild-/Attachment-Support: Drag-&-Drop oder Paste in Description leitet Bilder als multipart-Upload in Agent-Context weiter (Quick + Full)
- [ ] **REF-07**: Cancel-Button während laufender Refinement-Operation; abgebrochener Quick-Polish hinterlässt nichts; abgebrochener Full-Spec stoppt Agent-Task
- [ ] **REF-08**: Refinement funktioniert auch beim Editieren existierender Issues (nicht nur beim Anlegen)

---

## Future Requirements (deferred)

- Agent-Self-Pass für Acceptance-Tests (v0.7+)
- Hard-Gate (Done blockiert ohne 100% passed) als optionale Workspace-Policy (v0.7+)
- Multi-Agent-Voting / Cross-Review (v0.7+)
- Test-Library / kuratierte Pattern-DB für Test-Generierung (v0.7+)
- Retroaktive Test-Generierung für bestehende Issues (v0.7+ on-demand)

---

## Out of Scope

- **Mobile-/Responsive-Optimierung** über Desktop-first-Breakpoints hinaus
- **Permissions-Redesign** — bestehende Member-Rollen reichen für Reviewer-Toggle
- **E2E-Suite-Refactor** — neue Specs für neue Flows; alte bleiben unverändert
- **Code-Internals-Rebrand** (`@multica/*` Pakete, Go-Modul-Pfad, DB-Schema) — bleibt aus v0.5.0
- **Hard-Gate-Policy-Engine** — Soft-Gate reicht für v0.6
- **Test-Generierung für nicht-Code-Issues** (z.B. Discussion / Question Issues) — nur Issues mit Code-Diff

---

## Traceability

| Requirement | Phase | Plan | Status |
|-------------|-------|------|--------|
| AT-01 | Phase 9 | — | Pending |
| AT-02 | Phase 9 | — | Pending |
| AT-03 | Phase 9 | — | Pending |
| AT-04 | Phase 9 | — | Pending |
| AT-05 | Phase 9 | — | Pending |
| AT-06 | Phase 9 | — | Pending |
| AGT-01 | Phase 10 | — | Pending |
| AGT-02 | Phase 10 | — | Pending |
| AGT-03 | Phase 10 | — | Pending |
| AGT-04 | Phase 10 | — | Pending |
| AGT-05 | Phase 10 | — | Pending |
| REV-01 | Phase 11 | — | Pending |
| REV-02 | Phase 11 | — | Pending |
| REV-03 | Phase 11 | — | Pending |
| REV-04 | Phase 11 | — | Pending |
| REV-05 | Phase 11 | — | Pending |
| REV-06 | Phase 11 | — | Pending |
| BRD-01 | Phase 12 | — | Pending |
| BRD-02 | Phase 12 | — | Pending |
| BRD-03 | Phase 12 | — | Pending |
| BRD-04 | Phase 12 | — | Pending |
| BRD-05 | Phase 12 | — | Pending |
| BRD-06 | Phase 12 | — | Pending |
| PCK-01 | Phase 13 | — | Pending |
| PCK-02 | Phase 13 | — | Pending |
| PCK-03 | Phase 13 | — | Pending |
| PCK-04 | Phase 13 | — | Pending |
| REF-01 | Phase 14 | — | Pending |
| REF-02 | Phase 14 | — | Pending |
| REF-03 | Phase 14 | — | Pending |
| REF-04 | Phase 14 | — | Pending |
| REF-05 | Phase 14 | — | Pending |
| REF-06 | Phase 14 | — | Pending |
| REF-07 | Phase 14 | — | Pending |
| REF-08 | Phase 14 | — | Pending |
