# Roadmap: AlgoPlan v0.6.0 — Agent Review Loop

## Overview

The v0.5.0 frontend redesign + rebrand is shipped (Phases 1–8 complete). v0.6.0 schärft den Agent-Workflow: Agenten erzeugen am Ende ihrer Arbeit strukturierte Acceptance-Tests, der Mensch-Reviewer hakt sie am Issue ab und zieht Issues per Drag-&-Drop durch das Board. Beim Erstellen helfen AI-Refinement-Buttons, Issue-Descriptions zu schärfen.

Sechs Phasen (9–14), entlang der natürlichen Abhängigkeitskette: Backend-Datenmodell zuerst, dann der Agent-Hook, der das Modell befüllt, dann das GUI, das es anzeigt; das Board (mit Soft-Gate gegen das gleiche Modell) und die Auto-Pickup-Verifikation laufen parallel zur GUI. Die AI-Description-Refinement-Pipeline ist die einzige Phase, die in keiner Abhängigkeit zu Acceptance-Tests steht — sie kann jederzeit nach Phase 9 starten, wird aber zuletzt sequenziert, um Reviewer-Loop-Risiko zu isolieren.

Bestehender Stack: `@dnd-kit/react@0.4.0` aus Phase 5, Agent-Daemon mit Auto-Pickup aus v0.4.x (PCK ist Verifikation, kein Greenfield). Bild-Upload-Pipeline ist neu für REF-06 (multipart, S3-kompatibel oder local-storage).

## Phases

**Phase Numbering:**
- Integer phases (9, 10, 11, 12, 13, 14): Planned milestone work for v0.6.0
- v0.5.0 ended at Phase 8; v0.6.0 starts at Phase 9
- Decimal phases (e.g. 9.1): Reserved for urgent insertions

- [ ] **Phase 9: Acceptance-Test Backend Foundation** — DB-Tabelle `acceptance_tests`, sqlc queries, REST-Endpoints (POST/PATCH), JSON-Schema-Validation, WS-Event broadcast
- [ ] **Phase 10: Agent Hook + Test Generation** — Daemon-Hook auf `in_progress → in_review`, Prompt-Template, LLM-Call mit JSON-Validation + 1× Re-Prompt, Issue-Comment
- [ ] **Phase 11: Reviewer Checklist GUI** — Issue-Detail-Section „Akzeptanzkriterien", Toggle pass/fail, Edit, manuelles Hinzufügen, Status-Badges, optimistic Update
- [ ] **Phase 12: Drag-&-Drop Board (Cross-Column)** — Cross-Column-Drag mit `@dnd-kit/react`, optimistic Status-Mutation, Soft-Gate-Dialog für Done-Drop bei pending/failed Tests, a11y
- [ ] **Phase 13: Auto-Pickup Verification** — E2E-Test gegen bestehenden Daemon, Settings-Toggle pro Agent, Activity-Feed-Logging, Race-Resilienz-Test
- [ ] **Phase 14: AI Description-Refinement** — Sparkle-Button, Quick-Polish-Endpoint mit Diff-Preview, Full-Spec-Agent-Spawn, Bild-/Attachment-Upload, Cancel + Edit-Mode

## Phase Details

### Phase 9: Acceptance-Test Backend Foundation
**Goal**: Backend stellt eine vollständige REST + WS API für Acceptance-Tests bereit — Agent kann Tests anlegen, Reviewer kann Status togglen, beides idempotent, validiert und live im Workspace-Channel broadcastet
**Depends on**: Nothing (first phase of milestone, builds on existing v0.5.0 codebase)
**Requirements**: AT-01, AT-02, AT-03, AT-04, AT-05, AT-06
**Success Criteria** (what must be TRUE):
  1. Ein Agent mit gültigem PAT kann via `POST /issues/:id/acceptance-tests` einen Test mit `{title, description, category, external_id}` anlegen — Server persistiert mit Status `pending`, antwortet mit dem erstellten Resource (mit Server-vergebener ID + Position)
  2. Wiederholter `POST` mit gleichem `external_id` aktualisiert den existierenden Test statt einen Duplikat anzulegen (200 OK statt 201 Created)
  3. Ein Reviewer (Member-Auth) kann via `PATCH /acceptance-tests/:id` Status zwischen `pending|passed|failed` togglen und optional eine `failure_note` setzen — Server validiert Workspace-Membership und antwortet mit aktualisiertem Resource
  4. Ungültiger Payload (fehlendes Feld, ungültige Category, ungültiger Status) liefert HTTP 422 mit klarer Field-Liste — keine 500-Fehler
  5. Jede Mutation broadcastet ein WS-Event `acceptance_test.created` oder `acceptance_test.updated` im Workspace-Channel — verbundene Clients sehen das Event ohne Polling
**Plans**: TBD

### Phase 10: Agent Hook + Test Generation
**Goal**: Wenn ein Agent ein Issue auf `in_review` setzt, erzeugt der Daemon asynchron 3-7 strukturierte Acceptance-Tests und persistiert sie über die Phase-9-API; bei LLM-Fehlern liefert der Daemon einen klaren Fallback-Comment statt das Issue blockiert zu lassen
**Depends on**: Phase 9 (uses POST /issues/:id/acceptance-tests + AT-04 idempotency)
**Requirements**: AGT-01, AGT-02, AGT-03, AGT-04, AGT-05
**Success Criteria** (what must be TRUE):
  1. Wenn ein Agent ein Issue von `in_progress` zu `in_review` transitioniert, sieht der Reviewer innerhalb von ≤30 Sekunden einen Comment „N Acceptance-Tests erstellt" am Issue — der Status-Wechsel selbst ist nicht blockiert (asynchron)
  2. Die generierten Tests sind im JSON-Schema gültig (Title, Description, Category eines aus `functional|edge|regression`) und passen zum Issue-Diff (z.B. neue Tests beziehen sich auf neu hinzugefügte Funktionen, nicht auf nicht-touchierte Bereiche)
  3. Liefert das LLM beim ersten Versuch ungültiges JSON, retried der Daemon genau 1× — bleibt es kaputt, erscheint stattdessen ein Comment „Acceptance-Test-Generierung fehlgeschlagen — bitte manuell ergänzen"
  4. Das Prompt-Template liegt versioniert in `server/internal/agents/acceptance/prompt.md` und nimmt Diff (primär) + Issue-Description (sekundär) als Context — Änderungen am Prompt sind im Git-Log nachvollziehbar
**Plans**: TBD

### Phase 11: Reviewer Checklist GUI
**Goal**: Reviewer sieht und steuert Acceptance-Tests direkt am Issue-Detail — Section „Akzeptanzkriterien" zwischen Description und Comments, mit Status-Badges, pass/fail-Toggle, Edit, manuelles Hinzufügen; alle Mutations sind optimistic mit WS-Live-Sync
**Depends on**: Phase 9 (consumes acceptance_tests API + WS events)
**Requirements**: REV-01, REV-02, REV-03, REV-04, REV-05, REV-06
**Success Criteria** (what must be TRUE):
  1. Wenn ein Issue Acceptance-Tests hat, sieht der Reviewer auf der Issue-Detail-Page eine neue Section „Akzeptanzkriterien" zwischen Description und Comments — jeder Test mit Title, expandable Description, Status-Badge (pending/passed/failed) und einem klaren pass/fail-Toggle
  2. Klick auf den Toggle ändert den Status sofort visuell (optimistic) und persistiert über `PATCH /acceptance-tests/:id` — bei Fehler rollback mit Toast-Notification
  3. Ein anderer Reviewer-Tab sieht den Status-Wechsel innerhalb 1-2 Sekunden via WS-Invalidate ohne manuellen Refresh
  4. Reviewer kann pro Test eine Failure-Note hinzufügen (Textfeld erscheint bei „failed"-Toggle), Title + Description in-place editieren und manuell einen neuen Test anlegen — alles über die gleiche optimistic-Mutation-Pipeline
  5. Status-Badges nutzen semantische Tokens (pending = neutral, passed = grün, failed = rot) konsistent mit Phase-1-Token-System — keine hardcoded colors
**Plans**: TBD
**UI hint**: yes

### Phase 12: Drag-&-Drop Board (Cross-Column)
**Goal**: Issues lassen sich per Drag-&-Drop zwischen Status-Spalten ziehen mit optimistischer Server-Mutation; Drop in Done bei pending/failed Acceptance-Tests öffnet einen Confirmation-Dialog (Soft-Gate), kein Hard-Block; Cross-Column-Drag ist Keyboard-erreichbar
**Depends on**: Phase 9 (consumes acceptance_test status for Soft-Gate); existing Phase-5 `@dnd-kit/react@0.4.0` foundation
**Requirements**: BRD-01, BRD-02, BRD-03, BRD-04, BRD-05, BRD-06
**Success Criteria** (what must be TRUE):
  1. Ein Reviewer zieht eine Issue-Karte aus „In Progress" in „In Review" — die Karte landet sofort visuell in der Ziel-Spalte (optimistic), die Status-Update-Mutation feuert serverseitig, ein zweiter Browser-Tab sieht die Bewegung via WS-Echo ohne Re-Render-Storm
  2. Schlägt die Mutation fehl (z.B. 5xx), springt die Karte zurück mit Toast-Notification — kein zerbrochener UI-State
  3. Zieht der Reviewer eine Karte mit pending oder failed Acceptance-Tests in „Done", öffnet sich ein Dialog mit Liste der offenen Tests und zwei Buttons („Trotzdem auf Done", „Abbrechen") — Dialog blockt das Drop bis zur Entscheidung, Hard-Block existiert nicht
  4. Issues ohne Tests oder mit allen Tests `passed` droppen in Done ohne Dialog — der Soft-Gate ist nur ein Warning, kein Audit-Gate
  5. Cross-Column-Drag funktioniert per Keyboard (Tab → Space → Pfeiltasten → Enter) — `@dnd-kit/react` a11y-Standards passen
**Plans**: TBD
**UI hint**: yes

### Phase 13: Auto-Pickup Verification
**Goal**: Bestehender Auto-Pickup-Daemon (aus v0.4.x) wird via E2E-Test gegen reale Multi-Worker-Setup verifiziert, Settings-Toggle pro Agent ergänzt, und Pickup-Events erscheinen im Activity-Feed mit Timestamp + Issue-ID
**Depends on**: Phase 9 (no direct dependency; standalone verification phase, scheduled here to not block GUI work)
**Requirements**: PCK-01, PCK-02, PCK-03, PCK-04
**Success Criteria** (what must be TRUE):
  1. Ein E2E-Test belegt: Issue mit `assignee_type=agent` + Status `todo` wird vom Daemon innerhalb von ≤30 Sekunden gepickt — Status springt automatisch auf `in_progress`, Test läuft repeatable in CI
  2. Im Agent-Settings-Tab gibt es einen Toggle „Auto-Pickup aktiv" (default `true`) — wird er auf `false` gesetzt, ignoriert der Daemon zugewiesene Issues für diesen Agent
  3. Jeder Pickup-Event erscheint im Agent-Activity-Feed mit Timestamp + Issue-ID + Workspace-Kontext — Reviewer kann nachvollziehen, wann ein Agent welches Issue übernommen hat
  4. Bei Multi-Worker-Setup (zwei Daemon-Prozesse derselben Agent-Identität) pickt nur einer das Issue — der zweite Daemon erkennt die Race über DB-Lock oder atomic-claim und setzt nicht erneut auf `in_progress`
**Plans**: TBD
**UI hint**: yes

### Phase 14: AI Description-Refinement
**Goal**: Issue-Form bietet einen Sparkle-Button mit zwei Modi — Quick-Polish (inline LLM-Call mit Diff-Preview) und Full-Spec (gespawnter Agent-Task, schreibt Vollständige Spec inkl. Bild-Beschreibung asynchron zurück); Bild-/Attachment-Upload via Drag-&-Drop oder Paste in Description; Cancel-Möglichkeit; funktioniert beim Anlegen UND Editieren
**Depends on**: Phase 9 (no functional dependency on Acceptance-Tests; sequenced last to isolate Reviewer-Loop risk and stand up image-upload pipeline without disrupting earlier phases)
**Requirements**: REF-01, REF-02, REF-03, REF-04, REF-05, REF-06, REF-07, REF-08
**Success Criteria** (what must be TRUE):
  1. Sobald die Description-Textarea Inhalt hat, erscheint der Sparkle-Button neben der Textarea — Klick öffnet eine Mode-Auswahl mit „Quick-Polish" und „Full-Spec erstellen"
  2. Quick-Polish triggert `POST /issues/refine-description` mit aktuellem Text + ggf. angehängten Bildern (multipart) — Server liefert verbesserte Version, der Client rendert eine Vorher/Nachher-Diff-Preview, User akzeptiert oder lehnt ab
  3. Full-Spec spawnt einen dedizierten Agent als Sub-Task — Issue-Form zeigt Toast „Spec wird erstellt — 1-3 Min", User kann das Form verlassen oder weiterarbeiten, Agent schreibt fertige Spec asynchron in Issue-Description zurück (mit Bild-Beschreibung wenn vorhanden)
  4. Drag-&-Drop oder Paste eines Bildes in die Description-Textarea hängt das Bild als multipart-Upload an die Refinement-Operation — funktioniert in beiden Modi (Quick + Full)
  5. Cancel-Button stoppt eine laufende Operation — Quick-Polish hinterlässt nichts, Full-Spec stoppt den Agent-Task; Refinement funktioniert identisch beim Anlegen neuer Issues UND beim Editieren existierender Issues
**Plans**: TBD
**UI hint**: yes

## Progress

**Execution Order:**
Phases execute in numeric order: 9 → 10 → 11 → 12 → 13 → 14

**Cross-phase dependencies:**
- Phase 10 reads/writes Phase 9's `acceptance_tests` API
- Phase 11 reads/writes Phase 9's API + listens to its WS events
- Phase 12's Soft-Gate reads Phase 9's test-status for an Issue
- Phase 13 is standalone (uses existing Daemon code)
- Phase 14 is standalone (introduces new image-upload pipeline)

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 9. Acceptance-Test Backend Foundation | 0/TBD | Not started | - |
| 10. Agent Hook + Test Generation | 0/TBD | Not started | - |
| 11. Reviewer Checklist GUI | 0/TBD | Not started | - |
| 12. Drag-&-Drop Board (Cross-Column) | 0/TBD | Not started | - |
| 13. Auto-Pickup Verification | 0/TBD | Not started | - |
| 14. AI Description-Refinement | 0/TBD | Not started | - |
