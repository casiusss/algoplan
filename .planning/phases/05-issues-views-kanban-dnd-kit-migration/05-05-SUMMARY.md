---
phase: 05-issues-views-kanban-dnd-kit-migration
plan: 05
subsystem: e2e-verification
tags: [wave-4, e2e, playwright, kbn-01, kbn-02, kbn-03, kbn-04, phase-exit]

dependency_graph:
  requires:
    - "Plan 05-02 (Visual restyle + data-* test seams: data-board-card-root, data-issue-id, data-board-column-root, data-board-column-status-label, data-board-column-add-trigger, data-board-column-body)"
    - "Plan 05-04 (ViewToggle SegmentedControl with German 'Liste' label + InlineTaskAdd with aria-label='Aufgabentitel eingeben' + data-board-column-inline-add / data-list-view-inline-add seams)"
    - "Plan 05-01 (recentlyMovedRef + isDraggingRef gate in board-view.tsx — the WS-race protection that KBN-01 spec proves)"
  provides:
    - "e2e/board-inline-add.spec.ts — KBN-03 end-to-end proof"
    - "e2e/issues-view-toggle.spec.ts — KBN-04 persistence proof"
    - "e2e/board-scroll-collision.spec.ts — KBN-02 AutoScroller drift fix proof"
    - "e2e/board-drag-ws-race.spec.ts — KBN-01 two-context WS-race immunity proof"
    - "TestApiClient.trackIssue(id) + TestApiClient.updateIssue(id, patch) helpers (e2e/fixtures.ts)"
    - "Phase 5 exit gate signal"
  affects:
    - "e2e/issues.spec.ts (selector update: text=List → getByRole('group', { name: 'Ansicht wechseln' }).getByText('Liste'))"

tech_stack:
  added: []
  patterns:
    - "Two-context drag race spec (browser.newContext × 2) for WS-race scenarios"
    - "Pointer-event drag (mouse.down/move(steps)/up) instead of HTML5 dragTo — required by dnd-kit/react v0.4 pointer sensor"
    - "data-board-column-root scoping pattern: filter columns by inner data-board-column-status-label text"
    - "data-issue-id direct lookup avoids brittle text-match traversal"

key_files:
  created:
    - "e2e/board-inline-add.spec.ts"
    - "e2e/issues-view-toggle.spec.ts"
    - "e2e/board-scroll-collision.spec.ts"
    - "e2e/board-drag-ws-race.spec.ts"
    - ".planning/phases/05-issues-views-kanban-dnd-kit-migration/05-05-SUMMARY.md"
  modified:
    - "e2e/issues.spec.ts (selector update)"
    - "e2e/fixtures.ts (trackIssue + updateIssue helpers)"

decisions:
  - "Live E2E execution deferred — local environment couldn't authenticate the test user against the running backend (the existing reference spec e2e/dashboard-shell.spec.ts also fails with the same loginAsDefault timeout, confirming the issue is environmental, not introduced by Plan 05). Specs verified via Playwright --list (parse + discovery) and tsc --noEmit (typecheck). User runs `make check` / `pnpm exec playwright test` in their own dev env for live verification."
  - "Extended TestApiClient (Rule 3) with trackIssue + updateIssue helpers instead of bypassing the private createdIssueIds field via bracket access. trackIssue lets specs register UI-created issues for cleanup (KBN-03 spec); updateIssue (PUT /api/issues/{id}) lets the WS-race spec trigger a remote update from a second context."
  - "WS-race spec triggers the remote update via TestApiClient.updateIssue (not via page2 UI) for determinism — page2 is opened solely to keep its WS subscription live, so the broadcast actually reaches page1."
  - "Scroll-collision spec uses lower-half tolerance instead of strict ±1 adjacency — pointer-to-index mapping varies by browser timing (per plan §pitfalls); the old scroll-drift bug always landed at index 0, so a drop in the lower half rules it out."

metrics:
  duration_minutes: 10
  completed_date: "2026-04-25"
  tasks_total: 6
  tasks_completed: 6
  files_created: 5
  files_modified: 2
  commits_count: 6
  tests_added: 5
  e2e_specs_added: 4
  e2e_specs_updated: 1
---

# Phase 5 Plan 05: E2E Verification + Phase Exit Gate Summary

Vier neue Playwright-Specs (KBN-01 WS-Race, KBN-02 Scroll-Drift, KBN-03 Inline-Add, KBN-04 View-Toggle-Persistenz) plus Selector-Update an `e2e/issues.spec.ts` für das deutsche `Liste`-Label des SegmentedControl. KBN-05-Grep clean; Vitest-Issues-Subtree 102/102 GREEN; Typecheck (alle 7 Pakete) clean. Live E2E in dieser Worktree-Umgebung nicht ausführbar (Auth-Setup fehlt — Reference-Spec `dashboard-shell.spec.ts` schlägt mit demselben Login-Timeout fehl), daher zur Live-Verifizierung an den User übergeben.

## What was built

### Task 5-05-01 — `e2e/board-inline-add.spec.ts` (KBN-03) — commit `39d9c843`

Zwei Tests:

1. **`+ in der Todo-Spalte öffnet Inline-Eingabe; Enter erstellt Issue mit Status pre-filled`** —
   - Lokalisiert die Todo-Spalte über `[data-board-column-root]` gefiltert nach innerem `[data-board-column-status-label]:has-text("Todo")`.
   - Klickt `[data-board-column-add-trigger]` → erwartet `[data-board-column-inline-add]` sichtbar + Eingabefeld fokussiert (`aria-label="Aufgabentitel eingeben"`).
   - Tippt einen einzigartigen Titel + Enter → erwartet eine neue Karte mit dem Titel innerhalb der Todo-Spalte.
   - Liest die `data-issue-id` der neuen Karte und ruft `api.trackIssue(id)` für den Cleanup auf.
2. **`Esc schließt die Inline-Eingabe, ohne ein Issue zu erstellen`** —
   - Klickt den Add-Trigger, tippt einen Geistertitel, drückt Esc → erwartet `[data-board-column-inline-add]` versteckt UND keine Karte mit dem Geistertitel auf dem gesamten Board.

`e2e/fixtures.ts` erhält zwei neue Helfer (Rule 3 Deviation — siehe unten).

### Task 5-05-02 — `e2e/issues-view-toggle.spec.ts` (KBN-04) — commit `1dc47db0`

Ein Test, vier Reload-Zyklen:

- Default = Board → klick `Liste` (gescoped via `getByRole('group', { name: 'Ansicht wechseln' })`) → Liste sichtbar (`[data-list-view-header]`), keine Board-Spalten (`[data-board-column-body]` count = 0).
- `page.reload()` + `waitForLoadState('networkidle')` → Liste immer noch aktiv.
- Klick `Board` → Board sichtbar, keine Liste.
- Reload → Board persistiert.

Beweist die `viewMode`-Persistenz via `view-store` partialize (lines 193–194) end-to-end.

### Task 5-05-03 — `e2e/board-scroll-collision.spec.ts` (KBN-02) — commit `0005757e`

- 15 Issues in `in_progress` säen, sodass die Spalte vertikal scrollt.
- 1 Quellkarte in `todo`.
- `inProgressBody.evaluate(el => el.scrollTop = el.scrollHeight)` — programmatisches Scrollen bis zum Ende.
- Pointer-basierter Drag (`mouse.down` + `mouse.move(targetCenter, { steps: 20 })` + `mouse.up`) — HTML5 `dragTo` triggert `dnd-kit/react` v0.4 nicht (Pointer-Sensor).
- 100 ms Pause vor `mouse.up`, damit Auto-Scroller / Collision-Detection einrasten.
- Assertion: Quellkarte landet in `in_progress`, **in der unteren Hälfte** der sichtbaren Liste. Strikte ±1-Adjazenz wäre spröde (siehe Plan §Pitfalls); aber ein Drop in der oberen Hälfte (der alte Drift-Bug) ist eindeutig ausgeschlossen. Wenn `Scroll seed 14` lokalisierbar ist, zusätzlich `Math.abs(sourceIdx - lastSeedIdx) ≤ 2`.

### Task 5-05-04 — `e2e/board-drag-ws-race.spec.ts` (KBN-01) — commit `1b152c41`

Härtester Spec — zwei Browser-Kontexte, kontrolliertes Mid-Flight-Race:

- `beforeEach` legt zwei Issues über `TestApiClient` an: `Drag race source` (todo) + `Other card for update` (todo). IDs werden in Modul-Variablen festgehalten.
- `ctx1` + `page1` führen den Drag aus. `ctx2` + `page2` werden geöffnet, damit deren WS-Subscription läuft (echte Race-Bedingung).
- Drag-Sequenz auf `page1`: `mouse.down` auf der Quelle → `mouse.move` (5 Steps, 20 px-Versatz, überschreitet activation distance) → `mouse.move` zum Ziel-Spaltenkörper (15 Steps).
- **Während** der Drag mid-flight ist (Maus noch unten): `api.updateIssue(otherIssueId, { title: ... })` — backend broadcastet WS-Event an beide Kontexte. Genau die Race, gegen die `recentlyMovedRef` + `isDraggingRef`-Gate in `board-view.tsx` (Plan 01) isolieren muss.
- 250 ms Wartezeit, damit das WS-Event auch wirklich bei `ctx1` ankommt.
- `mouse.up` → Drop abschließen.
- Vier Assertions:
  1. Quellkarte ist in `In Progress`-Spalte (`data-issue-id`-Attribut-Selektor — kein Text-Hunt).
  2. Quellkarte ist NICHT mehr in `Todo`-Spalte (count=0).
  3. Kein `Issue konnte nicht verschoben werden`-Toast.
  4. Nach 500 ms-Settle-Window: Karte ist immer noch in `In Progress` (kein verzögerter Snap-Back).

### Task 5-05-05 — `e2e/issues.spec.ts` Selector-Update — commit `d8c34d93`

```diff
-    await page.click("text=List");
+    await page
+      .getByRole("group", { name: "Ansicht wechseln" })
+      .getByText("Liste", { exact: true })
+      .click();
```

Plan 04 hat die alte Dropdown-View-Picker durch `SegmentedControl` mit deutschem Label `Liste` ersetzt — das nackte `text=List` matched nicht mehr. Neuer Selektor ist robuster (gescoped via aria-label, exakter Text-Match).

### Task 5-05-06 — Phase Exit Gate

- KBN-05 Grep — `grep -rn "@dnd-kit/core\|@dnd-kit/sortable\|@dnd-kit/utilities" packages/views/issues/` → **0 Treffer**.
- `pnpm typecheck` (Turborepo, 7 Pakete) — **clean** (~11 s).
- `pnpm --filter @multica/views exec vitest run issues/` — **102/102 GREEN** (12 Test-Dateien, ~3 s).
- Playwright `--list` — alle 10 Tests in den 5 betroffenen Dateien parsen + werden discovered.
- Live `pnpm exec playwright test` — **deferred** (siehe Deviations).

## ROADMAP Success-Criterion → Plan/Task Mapping

| ROADMAP SC | Test/Spec | Plan/Wave | Status |
|------------|-----------|-----------|--------|
| **SC#1** — Drag updates status, survives WS event from second tab | `e2e/board-drag-ws-race.spec.ts` (Plan 05-05 Task 04) **+** `board-view.test.tsx` `recentlyMovedRef` invariant (Plan 05-01 Task 03) | Wave 1 + Wave 4 | ✅ unit GREEN; E2E parses, live deferred |
| **SC#2** — Drag in scrolled column drops where indicated | `e2e/board-scroll-collision.spec.ts` (Plan 05-05 Task 03) **+** `board-view.test.tsx` AutoScroller config invariant (Plan 05-01 Task 03) | Wave 1 + Wave 4 | ✅ unit GREEN; E2E parses, live deferred |
| **SC#3** — Inline `+ Aufgabe hinzufügen` creates issue with status | `e2e/board-inline-add.spec.ts` (Plan 05-05 Task 01) **+** `inline-task-add.test.tsx` 9 tests (Plan 05-04 Task 02) | Wave 3 + Wave 4 | ✅ unit GREEN; E2E parses, live deferred |
| **SC#4** — View toggle persists across reload | `e2e/issues-view-toggle.spec.ts` (Plan 05-05 Task 02) **+** `view-toggle.test.tsx` 5 tests (Plan 05-04 Task 01) | Wave 3 + Wave 4 | ✅ unit GREEN; E2E parses, live deferred |
| **SC#5** — Existing board-view tests pass; `onMoveIssue` signature unchanged | `issues-page.test.tsx` 6/6 (Plan 05-01 Task 01) **+** `board-view.test.tsx` source invariant on KBN-06 (Plan 05-01 Task 03) | Wave 1 | ✅ alle GREEN |

Jedes ROADMAP-SC hat mindestens einen Unit-Test in einer früheren Welle UND einen E2E-Test in dieser Welle (außer SC#5, das per Definition keine neue Verhaltens-Surface produziert — nur die nicht-regressionierte Signatur).

## Verification

| Check | Befehl | Ergebnis |
|-------|--------|---------|
| KBN-05 Grep | `grep -rn '@dnd-kit/core\|@dnd-kit/sortable\|@dnd-kit/utilities' packages/views/issues/` | 0 Treffer |
| Typecheck | `pnpm typecheck` (Turborepo) | 7/7 Pakete clean (~11 s) |
| Issues Vitest | `pnpm --filter @multica/views exec vitest run issues/` | 102/102 GREEN (12 Dateien) |
| Playwright Discovery | `pnpm exec playwright test e2e/board-{inline-add,scroll-collision,drag-ws-race}.spec.ts e2e/issues-view-toggle.spec.ts e2e/issues.spec.ts --list` | 10/10 Tests discovered |
| Plan 05-05 Specs Lint | `npx tsc --noEmit ... e2e/*.spec.ts` | clean |
| Live E2E (`make check` Schritt) | `pnpm exec playwright test e2e/board-*` | **deferred** — Worktree-Env hat kein funktionierendes Auth-Setup |

## Deviations from Plan

### [Rule 3 — Blocking issue] TestApiClient lacked trackIssue + updateIssue helpers

- **Found during:** Tasks 5-05-01 + 5-05-04
- **Issue:** Plan 05-05 Task 01 expects das KBN-03-Spec, eine UI-erstellte Issue-ID in den Cleanup-Pool aufzunehmen. Plan 05-05 Task 04 expects das KBN-01-Spec, einen `PUT /api/issues/{id}` zu schicken, um ein WS-Event zu triggern. `TestApiClient` (e2e/fixtures.ts) hatte zu Beginn dieser Plan-Iteration **weder** eine `trackIssue`-API **noch** eine `updateIssue`-API. Das `createdIssueIds`-Feld ist `private`, und Bracket-Access (`api["createdIssueIds"]`) hätte einen `@ts-expect-error`-Suppression erfordert (TS-Lint-Hit + Layering-Bruch).
- **Fix (Rule 3):** Zwei kleine, fokussierte Methoden zu `TestApiClient` hinzugefügt:
  - `trackIssue(id: string): void` — registriert eine externe Issue-ID für `cleanup()`.
  - `updateIssue(id: string, patch: Record<string, unknown>): Promise<unknown>` — `PUT /api/issues/{id}` mit JSON-Body. Wirft mit `${status} ${responseText}` bei nicht-OK.
- **Files modified:** `e2e/fixtures.ts` (additive — keine bestehenden Tests betroffen).
- **Commit:** `39d9c843` (zusammen mit dem Spec gebündelt, der `trackIssue` zuerst konsumiert).

Threat-Modell-Abdeckung: keine — beide Helfer sind nur in E2E-Test-Code aktiv (kein Production-Pfad), DB-Cleanup fragt eindeutig nach Owner-Token (workspace-scoped membership-check).

### [Rule 3 — Blocking issue] Frontend Dev-Server-Port-Mismatch (Live-E2E-Versuch)

- **Found during:** Task 5-05-06 Live-E2E-Versuch.
- **Issue:** `pnpm dev:web` startete defaultmäßig auf Port 3000, aber `.env` konfiguriert `FRONTEND_PORT=3010` und `FRONTEND_ORIGIN=http://localhost:3010`. Playwright las `FRONTEND_ORIGIN` und versuchte den Login auf 3010 → `ERR_CONNECTION_REFUSED`.
- **Fix:** Dev-Server mit `FRONTEND_PORT=3010 pnpm dev:web` neu gestartet. `playwright.config.ts` baseURL und das Backend-Setup waren schon korrekt.
- **Files modified:** keine (nur Runtime-Konfiguration).
- **Commit:** keiner (operational fix während Verifikations-Run).

### [Rule 3 — Blocking issue] E2E-Auth funktioniert in dieser Worktree-Env nicht

- **Found during:** Task 5-05-06 Live-E2E-Versuch (nach der Port-Korrektur).
- **Issue:** Selbst nach korrektem Frontend-Port endeten **alle** E2E-Tests (inklusive der unveränderten Reference-Spec `e2e/dashboard-shell.spec.ts` und der schon vorher-grünen `e2e/issues.spec.ts`) im selben Login-Timeout: `loginAsDefault` setzt das `multica_token` in `localStorage`, navigiert zu `/${slug}/issues`, aber die App leitet zur Marketing-Landing zurück. Das ist **keine** Regression durch Plan 05 — `dashboard-shell.spec.ts` hat keine Plan-05-Touchpoints und schlägt identisch fehl. Wahrscheinliche Ursache: Workspace-Seed / User-Schema-Mismatch zwischen den parallel laufenden 8080- und 8090-Backends in dieser Maschine, oder ein fehlender `.env.worktree`-Setup.
- **Fix:** Live-E2E-Verifikation an den User übergeben — Plan §pitfalls erlaubt das ausdrücklich für Worktree-Runs ohne funktionierendes E2E-Stack-Setup. Dev-Server gestoppt, kein Code geändert.
- **Files modified:** keine.
- **Commit:** keiner.

## Deferred Issues

- **Live-E2E-Run** — `pnpm exec playwright test e2e/board-{inline-add,scroll-collision,drag-ws-race}.spec.ts e2e/issues-view-toggle.spec.ts e2e/issues.spec.ts` muss in der echten Dev-Umgebung des Users (mit funktionierendem Auth-Stack) ausgeführt werden, um die finale Phase-5-Exit-Gate-Bestätigung zu liefern. Erwartete Stabilität:
  - `board-inline-add.spec.ts` — robust (deterministisch, keine Timing-Komponente außer `expect(...).toBeVisible({ timeout: 10000 })`).
  - `issues-view-toggle.spec.ts` — robust (Reload-Persistenz ist ein simpler State-Check).
  - `board-scroll-collision.spec.ts` — moderat (Pointer-Drag ist von Browser-Timing abhängig; das Spec verwendet bewusst eine `lower-half` + `±2` Toleranz statt strikter Adjazenz, um Flakes zu vermeiden).
  - `board-drag-ws-race.spec.ts` — am riskantesten (zwei Kontexte + Mid-Flight-Update + WS-Event-Timing). Wenn flaky: `waitForTimeout(250)` und `waitForTimeout(500)` Settle-Window vergrößern; nicht skippen.
- **Manueller visueller Smoke (Plan §Task 5-05-06 §Manual visual review)** — Light/Dark-Mode-Verifikation ist explizit `Manual-Only` in `05-VALIDATION.md` §Manual-Only Verifications und liegt außerhalb des Auto-Pflichtbereichs. An den User für UI-Spec-§11-Sign-Off übergeben.

## Hand-off — Phase 5 Exit Declaration

**KBN-01..07 alle codierungs-verifiziert:**

- KBN-01 (WS-Race) — Unit-Test `board-view.test.tsx::recentlyMovedRef invariant` (GREEN) + E2E `board-drag-ws-race.spec.ts` (parses, deferred-live).
- KBN-02 (Scroll-Drift) — Unit-Test `board-view.test.tsx::AutoScroller config invariant` (GREEN) + E2E `board-scroll-collision.spec.ts` (parses, deferred-live).
- KBN-03 (Inline-Add) — Unit-Test `inline-task-add.test.tsx` 9/9 (GREEN) + E2E `board-inline-add.spec.ts` (parses, deferred-live).
- KBN-04 (View-Toggle-Persistenz) — Unit-Test `view-toggle.test.tsx` 5/5 (GREEN) + E2E `issues-view-toggle.spec.ts` (parses, deferred-live).
- KBN-05 (Legacy-dnd-kit-Removal) — Grep clean (siehe Verification-Tabelle).
- KBN-06 (`onMoveIssue`-Signatur byte-identisch) — `git diff` Check in Plan 04 SUMMARY (GREEN, Hard-Constraint B6).
- KBN-07 (Visuelle Restyle: AccentBar, italic Headers, ring-brand Drop, etc.) — Plan 02 + 03 Unit-Tests + Manual-Smoke deferred.

Phase 5 ist aus Code-Sicht abgeschlossen; Live-E2E-Bestätigung erfolgt im Phase-Verifier-Schritt durch den User in der lokalen Dev-Umgebung.

## Self-Check: PASSED

Created files:
- `e2e/board-inline-add.spec.ts` — FOUND
- `e2e/issues-view-toggle.spec.ts` — FOUND
- `e2e/board-scroll-collision.spec.ts` — FOUND
- `e2e/board-drag-ws-race.spec.ts` — FOUND
- `.planning/phases/05-issues-views-kanban-dnd-kit-migration/05-05-SUMMARY.md` — FOUND (this file)

Modified files:
- `e2e/issues.spec.ts` — selector update verified via Read at lines 35-41
- `e2e/fixtures.ts` — `trackIssue` + `updateIssue` methods added between lines 155-180

Commit hashes (verified via `git log --oneline`):
- `39d9c843` — `test(05-05): e2e KBN-03 inline task add per column`
- `1dc47db0` — `test(05-05): e2e KBN-04 view toggle persists across reload`
- `0005757e` — `test(05-05): e2e KBN-02 scroll-collision drift fix via AutoScroller`
- `1b152c41` — `test(05-05): e2e KBN-01 WS race immunity (two-context drag survives remote update)`
- `d8c34d93` — `test(05-05): update issues.spec selector to 'Liste' (SegmentedControl rebrand)`
