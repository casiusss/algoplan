# Phase 8 — Human UAT (Internal Rebrand Completion)

**Created:** 2026-04-27
**Phase:** 08-internal-rebrand-completion
**Scope:** Manual acceptance tests for migrations no automated test can cover (real-user upgrade paths, persistent state, deprecation warnings).

> **Vorab:** Phase 8 hat alle internen `multica` Surfaces auf `algoplan` umbenannt, mit Migration-Shims für localStorage, Env-Vars, Config-Dir und CLI-Binary. Die folgenden UATs prüfen, dass **kein Bestandsuser State verliert** und **kein Self-Hoster's `.env` silent bricht**.

---

## U1 — Existing User behält Theme nach Upgrade

**Annahme:** User hat vor Upgrade `multica_theme=dark` in localStorage.

**Schritte:**
1. Browser DevTools → Application → Local Storage → manuell setzen: `multica_theme=dark`
2. App auf alten Build laden, Dark-Mode bestätigen.
3. Auf neuen Build (`@algoplan/*`) upgraden.
4. App neu laden.
5. DevTools → Local Storage prüfen.

**Erwartet:**
- Dark-Mode bleibt aktiv ohne Flash auf Light.
- `algoplan_theme=dark` existiert.
- `multica_theme` wurde gelöscht.
- Keine Console-Errors.

**Pass-Kriterium:** Beide Bedingungen erfüllt.

---

## U2 — Existing User behält Issue-Drafts pro Workspace

**Annahme:** User hat Workspace-scoped Drafts unter `multica_issue_draft:<slug>`.

**Schritte:**
1. DevTools → Local Storage → setzen: `multica_issue_draft:algoview={"title":"Test draft","desc":"foo"}`
2. Auf neuen Build upgraden.
3. App laden, Workspace `algoview` öffnen.
4. Issue-Draft-View öffnen.

**Erwartet:**
- Draft-Inhalt erscheint in der UI (Title "Test draft", Desc "foo").
- Local Storage zeigt `algoplan_issue_draft:algoview=...`.
- `multica_issue_draft:algoview` ist weg.

**Pass-Kriterium:** Draft sichtbar UND alter Key entfernt.

---

## U3 — Self-Hoster mit `MULTICA_*` Env-Vars sieht Deprecation-Warning

**Annahme:** Self-Hoster hat `.env` mit Legacy-Vars: `MULTICA_BACKEND_IMAGE`, `MULTICA_WEB_IMAGE`, `MULTICA_APP_URL`.

**Schritte:**
1. `.env` mit nur `MULTICA_*` Vars (keine `ALGOPLAN_*`) schreiben.
2. `docker compose -f docker-compose.selfhost.yml up` (oder lokaler Backend-Start).
3. Backend-Logs prüfen.
4. App im Browser öffnen, einloggen, Issues laden.

**Erwartet:**
- Backend startet erfolgreich.
- Logs enthalten **genau einmal pro Var**: `deprecated env var MULTICA_BACKEND_IMAGE, use ALGOPLAN_BACKEND_IMAGE`.
- App funktioniert vollständig (kein Auth-Reset, kein 500).

**Pass-Kriterium:** Warning erscheint UND App läuft.

---

## U4 — CLI-User mit `~/.multica/config.json` wird auto-migriert

**Annahme:** Bestandsuser hat alte Config-Dir `~/.multica/` mit `config.json` + `daemon.log`.

**Schritte:**
1. Sicherstellen `~/.algoplan/` existiert nicht (oder umbenennen zu Backup).
2. `~/.multica/` mit `config.json` (Token, Base-URL) erstellen.
3. `algoplan daemon status` ausführen.
4. Verzeichnis prüfen: `ls -la ~/.algoplan/ ~/.multica*`.

**Erwartet:**
- `~/.algoplan/` existiert mit identischem Inhalt zu `~/.multica/`.
- `~/.multica/` ist umbenannt in `~/.multica.migrated-<timestamp>/` (rename-aside, nicht gelöscht).
- `algoplan daemon status` zeigt Daemon-State korrekt (Token vorhanden).

**Pass-Kriterium:** Auto-Migration erfolgt, alter Dir als Backup erhalten.

---

## U5 — Mixed-Version: alter `multica` CLI delegiert an `algoplan`

**Annahme:** User hat alten `multica` Shim aus Homebrew + neuen `algoplan` installiert.

**Schritte:**
1. `which multica algoplan` — beide müssen existieren.
2. `multica --help` ausführen.
3. `multica daemon status` ausführen.

**Erwartet:**
- `multica --help` druckt: `deprecated: the `multica` CLI is renamed to `algoplan`. This shim will be removed in v0.6.0. Update your scripts and shell aliases.`
- Anschließend zeigt es algoplan's Help-Text.
- `multica daemon status` zeigt korrekten Daemon-State (Shim delegiert sauber).

**Pass-Kriterium:** Deprecation-Notice erscheint UND echtes Kommando läuft.

---

## U6 — End-to-End: User loggt sich ein, lädt Issues, kein Auth-Reset

**Annahme:** Existing User mit `multica_token=<jwt>` in localStorage, normales Web-App-Profil.

**Schritte:**
1. Auf altem Build einloggen — `multica_token` wird gesetzt.
2. App schließen.
3. Auf neuen Build upgraden (`@algoplan/*` build).
4. App öffnen ohne Re-Login.
5. Issues-Liste, Inbox, Settings ansurfen.

**Erwartet:**
- User bleibt eingeloggt (kein Login-Redirect).
- `algoplan_token` existiert, `multica_token` ist weg.
- WebSocket verbindet sich, Issues laden.
- Keine 401-Errors in Network-Tab.

**Pass-Kriterium:** Vollständiger Flow ohne Auth-Reset.

---

## Sign-Off

| UAT | Tester | Datum | Pass/Fail | Bemerkung |
|-----|--------|-------|-----------|-----------|
| U1  |        |       |           |           |
| U2  |        |       |           |           |
| U3  |        |       |           |           |
| U4  |        |       |           |           |
| U5  |        |       |           |           |
| U6  |        |       |           |           |

**Gesamt-Verdict:** [ ] PASS  [ ] FAIL  [ ] PARTIAL

**Freigabe für `v0.5.0` Tag:** [ ] Ja  [ ] Nein

---

## Rollback-Plan (falls UATs failen)

- localStorage-Migration ist idempotent + reversibel via DevTools-Cleanup.
- Env-Var-Shim bleibt bis v0.6.0 — User kann auf alte Var-Namen zurückrollen.
- Config-Dir-Migration: `mv ~/.multica.migrated-* ~/.multica && rm -rf ~/.algoplan`
- CLI-Shim bleibt bis v0.6.0 — Hard-Cut erst dann.

Wenn U1/U2/U6 failen → Rollback auf v0.4.0 Build, Migration-Helper debuggen, neuer Tag.
