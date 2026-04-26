# Phase 7: Rebrand Pass - Context

**Gathered:** 2026-04-26
**Status:** Ready for plan-phase
**Mode:** Auto-generated (workflow.skip_discuss=true)

<domain>
## Phase Boundary

Every user-visible "Multica" reference is replaced with "AlgoPlan" — strings, logos, favicons, metadata, Electron chrome, and the `multica://` deep-link scheme — while `multica_*` localStorage keys and `@multica/*` package imports are deliberately left unchanged.

**Requirements:** RBR-01, RBR-02, RBR-03, RBR-04, RBR-05, RBR-06

**Depends on:** Phase 6 (all user-facing views in AlgoPlan design system)
</domain>

<decisions>
## Implementation Decisions

### LOCKED (from ROADMAP + STATE.md)

- **D-1:** `multica://` → `algoplan://` deep-link scheme change is app-facing. Must update atomically in BOTH:
  - `apps/desktop/electron-builder.yml` (protocols.schemes)
  - `apps/web/app/auth/callback/page.tsx` (deep-link redirect target)
- **D-2:** `multica_*` localStorage keys intentionally UNCHANGED. Renaming would cause silent data loss (users lose dark-mode preference, drafts, view state). Search for `multica_` in localStorage.* calls and explicitly preserve.
- **D-3:** `@multica/*` package imports UNCHANGED (internal package names — not user-visible). Grep targeting must EXCLUDE `@multica/`.
- **D-4:** Production-user impact warning: Old `multica://` scheme stops working after update. Add to release communications if production users exist (per BLOCKER from STATE.md).

### Claude's Discretion

- Implementation strategy (string replacement, asset swap, metadata bumps)
- Asset sources (logos, favicons — use existing AlgoPlanWordmark + design system or generate from brand reference)
- Test update approach (snapshot updates vs assertion edits)
</decisions>

<code_context>
## Existing Code Insights

**Likely touch points (planner discretion to refine):**
- `apps/web/app/layout.tsx` — `<title>`, OG metadata, favicon link
- `apps/web/app/manifest.ts` or `apps/web/public/manifest.json` — PWA manifest
- `apps/web/public/favicon.*`, `apps/web/public/apple-touch-icon.*`
- `apps/desktop/electron-builder.yml` — `productName`, `appId`, `protocols.schemes`
- `apps/desktop/build/icon.*` (icon assets — png/icns/ico)
- `apps/desktop/src/main/index.ts` — `BrowserWindow` title, app name
- `apps/desktop/src/main/menu.ts` — macOS menu bar
- `apps/web/app/auth/callback/page.tsx` — `multica://` redirect target
- `package.json` files (root + apps + packages) — `name` (only user-visible ones; @multica/* internal stays)
- All `*.tsx` / `*.ts` / `*.md` files containing user-visible "Multica" string
- All test files asserting brand copy (e.g. `expect(screen.getByText("Multica"))`)

**Hard exclusions (must NOT change):**
- `@multica/*` package imports (internal — Phase 7 explicitly preserves)
- `multica_*` localStorage keys (silent data loss risk)
- `multica` git remote, repo URL, GitHub org references
- `MULTICA_*` env var names (would break user .env files)
- Docs internal to dev workflow (CLAUDE.md, .planning/*) — those reference the project
</code_context>

<specifics>
## Specific Ideas (Success Criteria from ROADMAP)

1. The targeted grep (excluding `@multica/*` imports and `node_modules`) returns zero "Multica" hits in user-visible string positions across both apps
2. Browser tab, OG preview, and Electron window title all show "AlgoPlan"; macOS dock shows the new icon; macOS menu bar reads "AlgoPlan"
3. The web-to-desktop auth callback flow works end-to-end on a built Electron app after the `multica://` → `algoplan://` scheme change — both `electron-builder.yml` and `apps/web/app/auth/callback/page.tsx` updated atomically
4. After an app update, existing users retain their stored theme preference, view state, and drafts — `multica_*` localStorage keys are confirmed unchanged in a browser session
5. All tests that previously asserted brand copy now assert "AlgoPlan" — `pnpm test` passes with at least as many tests as before the rebrand phase began
6. Recommended automated gate: `bash scripts/grep-rebrand.sh` (script TBD by planner) — fails CI if user-visible "Multica" leaks through

## Suggested Sub-Phases (planner discretion)

- **Wave 0:** Grep audit script + asset prep (logo SVG, favicons in all sizes, .icns/.ico/.png)
- **Wave 1:** Strings — find/replace user-visible "Multica" → "AlgoPlan" across packages/views, apps/web, apps/desktop (NOT @multica/* imports, NOT multica_* localStorage, NOT env vars)
- **Wave 2:** Assets — swap favicon, app icon (mac + windows + linux), PWA manifest icons, OG image
- **Wave 3:** Metadata — package.json `name` (user-visible only), apps/web layout title + OG, electron-builder.yml productName/appId
- **Wave 4:** Deep-link scheme — `multica://` → `algoplan://` atomic in electron-builder.yml + auth callback page
- **Wave 5:** Test updates — bump assertions to "AlgoPlan"; verify pnpm test passes; localStorage assertion confirms `multica_*` keys preserved
</specifics>

<deferred>
## Deferred Ideas

- GitHub org rename (`multica-ai/multica` → `algoplan-ai/algoplan`) — out of scope; repo URL stays
- @multica/* package rename — out of scope; would break entire monorepo
- Production-user release communication — flag in SUMMARY for stakeholder action (not code)
- CLI binary rename (`multica` → `algoplan`) — TBD by planner; if user-facing, include; if dev-internal, defer
</deferred>
