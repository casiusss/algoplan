# Manual FOUC Verification — Desktop Pre-React Theme

**Phase:** 1 (Token Foundation + Typography)
**Requirement:** FND-03, ROADMAP.md Phase 1 Success Criterion #2
**Why manual:** Perceptual flash detection requires visual regression tooling. Chromatic / equivalent is deferred per REQUIREMENTS.md "Out of Scope". This procedure is the documented acceptance check.

## Pre-conditions

1. Plan 03 has shipped (FOUC inline `<script>` exists in `apps/desktop/src/renderer/index.html` `<head>` between `<title>` and `</head>`).
2. Plan 01 has shipped (new OKLCH palette in `tokens.css` — `--background` is `oklch(0.985 0.002 250)` light / `oklch(0.18 0.012 250)` dark).
3. Local dev stack runs: `make dev` succeeds; PostgreSQL container up; backend on :8080.

## Procedure

### Test 1 — Forced dark mode boots in dark from first paint

1. Run `pnpm dev:desktop` from the repo root. Wait for the Electron window to open.
2. Open Chromium DevTools (Cmd+Opt+I on macOS, Ctrl+Shift+I on Linux/Windows).
3. In the Console, run:
   ```js
   localStorage.setItem('multica_theme', 'dark');
   ```
4. Reload the renderer window (Cmd+R).
5. **Pass criterion:** During the reload, the window background renders dark (`#0f1318` / approx `oklch(0.18 0.012 250)`) from the very first frame. There is NO visible white/light flash before the colors settle.
6. **Inspect:** In Elements, confirm `<html class="h-full dark">` is present immediately. The `dark` class must be on `<html>` BEFORE the first paint.

### Test 2 — Forced light mode does not add `.dark`

1. In Console, run:
   ```js
   localStorage.setItem('multica_theme', 'light');
   ```
2. Reload window.
3. **Pass criterion:** Window renders light (`#fafbfc` / approx `oklch(0.985 0.002 250)`) from first paint.
4. **Inspect:** `<html class="h-full">` — no `dark` class.

### Test 3 — System mode follows OS preference

1. In Console, run:
   ```js
   localStorage.setItem('multica_theme', 'system');
   ```
2. Reload window. Confirm theme matches the OS dark/light setting.
3. Toggle the OS-level dark mode preference (macOS: System Settings → Appearance). Reload window. Confirm the renderer follows the new OS state on the next reload.

### Test 4 — Missing key defaults to system

1. In Console, run:
   ```js
   localStorage.removeItem('multica_theme');
   ```
2. Reload window.
3. **Pass criterion:** Renderer resolves to OS-system preference (no error, no white-screen).

### Test 5 — Private/quota error path is silent

1. (Skip if your test environment doesn't support disabling localStorage.) Open a private window or temporarily disable localStorage in DevTools → Application → Storage. Reload renderer.
2. **Pass criterion:** Renderer still mounts (the `try/catch` in the FOUC script swallows the storage error). Theme defaults to whatever next-themes resolves at mount.

## Failure modes

| Symptom | Likely cause |
|---|---|
| Brief white flash before dark colors appear | FOUC `<script>` not in `<head>`, OR `<script type="module">` (which makes it async) |
| `<html>` has `dark` class but background is white | tokens.css `.dark` block missing OR `@theme inline` keyword missing (RESEARCH §Pitfall 2) |
| Renderer crashes on first paint | FOUC `<script>` body not wrapped in `try/catch` (RESEARCH §Pitfall 4) |
| Theme flips after ~50ms in dev | `multica_theme` key mismatch — FOUC reads `multica_theme`, next-themes reads `theme` (RESEARCH §Pitfall 6) |

## Sign-off

When all 5 tests pass, append this checklist to the Plan 03 SUMMARY:

- [ ] Test 1 (dark boot) — PASS
- [ ] Test 2 (light boot) — PASS
- [ ] Test 3 (system follows OS) — PASS
- [ ] Test 4 (missing key) — PASS
- [ ] Test 5 (storage error silent) — PASS

Verifier: ____________  Date: ____________
