# Phase 7 — Rebrand Pass: Patterns Reference

**Authored:** 2026-04-26 (Plan 07-00 Task 3)
**Owners:** Plans 07-01 .. 07-05 consult this document.
**Source-of-truth scope:** What gets renamed, what stays, the asset matrix, and the test-update plan.

This is the single reference Plans 01–05 read when deciding whether a `Multica` string is a leak (rename to `AlgoPlan`) or a preserved internal identifier (do nothing). It mirrors the exclusion regex in `scripts/grep-rebrand.sh` — when the two disagree, this document is authoritative and the script must be updated.

---

## §1 — Replacement Table

Every distinct user-visible "Multica" surface, grouped by location, with the AlgoPlan target. **Plan owners MUST check off rows in their SUMMARY.** A row checked off in two SUMMARY files is a duplicate-edit bug.

### apps/web — global metadata, callback, robots, sitemap, custom CSS

| Surface                                                          | Multica → AlgoPlan                                                                            | Owning plan |
| ---------------------------------------------------------------- | --------------------------------------------------------------------------------------------- | ----------- |
| `apps/web/app/layout.tsx` `metadata.title.default`               | `"Multica — Project Management for Human + Agent Teams"` → `"AlgoPlan — …"`                   | 07-02       |
| `apps/web/app/layout.tsx` `metadata.title.template`              | `"%s | Multica"` → `"%s | AlgoPlan"`                                                          | 07-02       |
| `apps/web/app/layout.tsx` `metadata.openGraph.siteName`          | `"Multica"` → `"AlgoPlan"`                                                                    | 07-02       |
| `apps/web/app/layout.tsx` `metadata.twitter.site`                | `"@multica_hq"` → `"@algoplan_hq"` (or owner-confirmed handle)                                | 07-02       |
| `apps/web/app/layout.tsx` `metadataBase`                         | `"https://www.multica.ai"` → `"https://plan.algoview.com"` (USER DECISION 2 — production URL) | 07-02       |
| `apps/web/app/robots.ts` `baseUrl`                               | `"https://www.multica.ai"` → `"https://plan.algoview.com"`                                    | 07-02       |
| `apps/web/app/sitemap.ts` `baseUrl`                              | `"https://www.multica.ai"` → `"https://plan.algoview.com"`                                    | 07-02       |
| `apps/web/app/custom.css` (header comment line 2)                | `"Multica Web — Custom styles"` → `"AlgoPlan Web — Custom styles"`                            | 07-02       |
| `apps/web/app/auth/callback/page.tsx` deep-link href (2 sites)   | `"multica://auth/callback?token=…"` → `"algoplan://auth/callback?token=…"`                    | 07-04       |
| `apps/web/app/auth/callback/page.tsx` `<CardTitle>`              | `"Opening Multica"` → `"Opening AlgoPlan"`                                                    | 07-04       |
| `apps/web/app/auth/callback/page.tsx` body copy                  | `"You should see a prompt to open the Multica desktop app…"` → `"…AlgoPlan desktop app…"`     | 07-04       |
| `apps/web/app/auth/callback/page.tsx` button label               | `"Open Multica Desktop"` → `"Open AlgoPlan Desktop"`                                          | 07-04       |
| `apps/web/app/(auth)/login/page.tsx` heading                     | `"Sign in to Multica"` → `"Sign in to AlgoPlan"`                                              | 07-02       |

### apps/web — landing pages + i18n

| Surface                                                                         | Multica → AlgoPlan                                                                                  | Owning plan |
| ------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- | ----------- |
| `apps/web/app/(landing)/homepage/page.tsx` `<MulticaLanding>` import + render   | Rename component → `<AlgoPlanLanding>` (file `multica-landing.tsx` → `algoplan-landing.tsx`)        | 07-02       |
| `apps/web/app/(landing)/homepage/page.tsx` description + title metadata         | `"Multica — open-source platform…"` / `"Multica — Project Management…"` → `"AlgoPlan — …"`          | 07-02       |
| `apps/web/app/(landing)/changelog/page.tsx` description                         | `"See what's new in Multica…"` → `"See what's new in AlgoPlan…"`                                    | 07-02       |
| `apps/web/features/landing/components/multica-landing.tsx` (file rename)        | Rename → `algoplan-landing.tsx`; component identifier follows                                       | 07-02       |
| `apps/web/features/landing/i18n/en.ts`                                          | All brand mentions → `AlgoPlan` (line-by-line during plan execution)                                | 07-02       |
| `apps/web/features/landing/i18n/zh.ts`                                          | All brand mentions → `AlgoPlan` (Latin transliteration kept, mirrors EN)                            | 07-02       |

### apps/desktop — Electron chrome, build config, deep-link scheme

| Surface                                                                  | Multica → AlgoPlan                                                                              | Owning plan |
| ------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------- | ----------- |
| `apps/desktop/electron-builder.yml` `productName`                        | `"Multica"` → `"AlgoPlan"`                                                                      | 07-03       |
| `apps/desktop/electron-builder.yml` `appId`                              | `"ai.multica.desktop"` → `"ai.algoplan.desktop"`                                                | 07-03       |
| `apps/desktop/electron-builder.yml` `protocols.name`                     | `"Multica"` → `"AlgoPlan"`                                                                      | 07-03       |
| `apps/desktop/electron-builder.yml` `protocols.schemes`                  | `["multica"]` → `["algoplan"]` (atomic with web auth callback — D-1)                            | 07-04       |
| `apps/desktop/src/main/index.ts` `PROTOCOL` const                        | `"multica"` → `"algoplan"`                                                                      | 07-04       |
| `apps/desktop/src/main/index.ts` `DEV_APP_NAME`                          | `"Multica Canary"` → `"AlgoPlan Canary"`                                                        | 07-03       |
| `apps/desktop/src/main/index.ts` `setAppUserModelId(...)`                | `"ai.multica.desktop[.dev]"` → `"ai.algoplan.desktop[.dev]"`                                    | 07-03       |
| `apps/desktop/package.json` `name`                                       | `"@multica/desktop"` → KEEP (internal package name; D-3)                                        | (no edit)   |
| `apps/desktop/package.json` `description`                                | `"Multica Desktop — native…"` → `"AlgoPlan Desktop — …"`                                        | 07-03       |
| `apps/desktop/package.json` `homepage`                                   | `"https://multica.ai"` → `"https://plan.algoview.com"`                                          | 07-03       |
| `apps/desktop/package.json` `author.email`                               | `"support@multica.ai"` → `"support@algoplan.ai"` (or owner-confirmed support address)           | 07-03       |
| `apps/desktop/package.json` `repository.url`                             | `"github.com/multica-ai/multica.git"` → KEEP (D-4 / out of scope)                               | (no edit)   |
| `apps/desktop/src/renderer/src/App.tsx` brand strings (if any)           | `"Multica"` → `"AlgoPlan"`                                                                      | 07-01       |
| `apps/desktop/src/renderer/src/components/desktop-layout.tsx`            | `"Multica"` brand strings → `"AlgoPlan"`                                                        | 07-01       |
| `apps/desktop/src/renderer/src/pages/login.tsx`                          | `"Multica"` brand strings → `"AlgoPlan"`                                                        | 07-01       |

### packages/views — shared UI brand copy

| Surface                                                                            | Multica → AlgoPlan                                                                          | Owning plan |
| ---------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- | ----------- |
| `packages/views/chat/components/context-anchor.tsx`                                | `"Multica knows you're viewing…"` → `"AlgoPlan knows…"`                                     | 07-01       |
| `packages/views/chat/components/chat-fab.tsx`                                      | `"Welcome to Multica"` → `"Welcome to AlgoPlan"`                                            | 07-01       |
| `packages/views/onboarding/utils/starter-content-templates.ts`                     | `"Welcome to Multica! 👋"` → `"Welcome to AlgoPlan! 👋"`                                     | 07-01       |
| `packages/views/runtimes/components/update-section.tsx`                            | `"…managed by Multica Desktop"` → `"…managed by AlgoPlan Desktop"`                          | 07-01       |
| `packages/views/workspace/create-workspace-form.tsx`                               | `"multica.ai/"` placeholder → `"plan.algoview.com/"`                                        | 07-01       |
| `packages/views/layout/help-launcher.tsx`                                          | `"https://multica.ai/docs"` → `"https://plan.algoview.com/docs"`                            | 07-01       |
| `packages/views/layout/workspace-loader.tsx`                                       | `<MulticaIcon/>` consumer — swap to `<AlgoPlanWordmark size="lg"/>` if wordmark appropriate | 07-01       |
| `packages/views/dashboard-shell/app-sidebar.tsx`                                   | (verify already-AlgoPlan; existing test asserts "AlgoPlan" — see §4)                        | 07-01       |

### packages/ui — token + base CSS comment headers

| Surface                                                  | Multica → AlgoPlan                                                                            | Owning plan |
| -------------------------------------------------------- | --------------------------------------------------------------------------------------------- | ----------- |
| `packages/ui/styles/tokens.css` line 1 (file header)     | `"/* Multica design tokens — shared across Web + Desktop */"` → `"/* AlgoPlan design tokens — …"` | 07-01       |
| `packages/ui/styles/base.css` lines 2, 25 (headers)      | `"Multica shared base styles"` / `"Multica icon"` → `"AlgoPlan …"`                            | 07-01       |
| `packages/ui/components/common/multica-icon.tsx`         | KEEP file + symbol (aesthetic asterisk; not the wordmark — see §2 exclusions)                 | (no edit)   |

### Plan ownership summary

| Plan  | Wave | Domain                                                                  |
| ----- | ---- | ----------------------------------------------------------------------- |
| 07-00 | 0    | Audit script + asset generator + this patterns doc (NO user-visible edits) |
| 07-01 | 1    | String sweep — `packages/views`, `packages/ui` headers, desktop renderer  |
| 07-02 | 2    | `apps/web` strings + landing + i18n + metadata + asset wire-up            |
| 07-03 | 3    | Electron chrome — `electron-builder.yml`, `index.ts`, `package.json`      |
| 07-04 | 4    | Deep-link scheme atomic flip (`multica://` → `algoplan://`)               |
| 07-05 | 5    | Test assertion edits + localStorage preservation regression test          |

---

## §2 — Exclusion Rules (preserved patterns)

These mirror `scripts/grep-rebrand.sh` `EXCLUDE` regex. **When a new exclusion is added, both this section AND the script must be updated together.**

| Pattern                                      | Why preserved                                                          | Decision   |
| -------------------------------------------- | ---------------------------------------------------------------------- | ---------- |
| `@multica/*` package imports (1127 hits)     | Internal monorepo package names — renaming would force `pnpm install` cascading + break editor go-to-definition for every consumer. NOT user-visible. | D-3        |
| `multica_*` localStorage keys                | Renaming would silently lose user preferences (theme, drafts, view state) on the first run after upgrade. | D-2        |
| `multica:chat`, `multica:backlog` localStorage | Same data-loss risk as `multica_*`; `multica:` colon-prefixed keys are extension of D-2. | D-2 ext.   |
| `multica:navigate` custom DOM event          | Internal pub/sub channel between window/router — never rendered or logged to user. Renaming forces atomic edit at every emitter + listener. | (internal) |
| `MULTICA_*` env var names                    | Would break user `.env` files and Docker Compose / CI manifests in the wild. | D-2 ext.   |
| `ai.multica.desktop` Electron `appId`        | Allowed pre-Plan 07-03; FLIPPED to `ai.algoplan.desktop` in Plan 07-03 atomically with `electron-builder.yml`. | 07-03      |
| `multica-ai/multica` git remote / GitHub org | Repo URL stays — GitHub org rename out of scope.                        | D-4        |
| `multica.git` repo URL fragment              | Same — out of scope.                                                    | D-4        |
| `multica-desktop-` artifactName template     | Internal release filename in `electron-builder.yml`; not visible in app chrome. | (internal) |
| `multica-cli-` archive prefix                | CLI release archive filename (Goreleaser output: `multica-cli-<v>-<os>-<arch>.<ext>`); same rationale as `multica-desktop-`. | (internal) |
| `multica_<os>_<arch>` legacy archive name    | Legacy CLI archive name pattern preserved for older releases (`cli-release-asset.ts` legacyName fallback) — Q1 + internal release identity. | Q1         |
| `"multica"` / `"multica.exe"` binary basenames | CLI binary filename strings inside `cli-bootstrap.ts` / `daemon-manager.ts`; preserved per Q1. | Q1         |
| `~/.multica` config dir paths (`.multica/`, `.multica"`, `` `multica.exe` ``) | Daemon manager + cli-bootstrap reference user config dir on disk; preserved per Q1. | Q1         |
| `bin/multica` packaged-binary path           | `apps/desktop/resources/bin/multica` — bundled CLI path comment in `daemon-manager.ts`; preserved per Q1. | Q1         |
| `server/cmd/multica` CLI binary path         | Developer-facing CLI; rename out of scope.                              | Q1         |
| `MulticaIcon` / `multica-icon.tsx`           | Aesthetic asterisk component — NOT the wordmark. `AlgoPlanWordmark` is the brand atom; this file decorates other surfaces. Kept verbatim. | (visual)   |
| `multica` reserved slug in `packages/core/paths/reserved-slugs.ts:31` | Anti-impersonation guard — prevents users creating workspace slug `multica`. KEEP and ADD `algoplan` alongside (per Plan 07-01 task). | (security) |
| `apps/docs/`                                 | Out-of-phase scope — separate publishing pipeline (fumadocs).           | (scope)    |
| `apps/showroom/`                             | Storybook stories — not production user-facing.                         | (scope)    |

### Production URL note (USER DECISION 2)

Production URL = **`plan.algoview.com`** (NOT `algoplan.ai`). All `https://www.multica.ai` and `https://multica.ai` references in `apps/web/app/{robots,sitemap,layout}.ts`, `apps/web/features/landing/i18n/*`, `apps/desktop/package.json`, and `packages/views/layout/help-launcher.tsx` resolve to this hostname during Plans 07-02 / 07-03. The metadata `metadataBase` URL becomes `https://plan.algoview.com`.

---

## §3 — Asset Size Matrix

Mirrors `scripts/generate-brand-assets.mjs` `TARGETS` array. Re-running the generator with no SVG edit produces byte-identical outputs (deterministic by SHA256 — verified during Plan 07-00 commit).

| Target path                                  | Size(s)                          | Format | Consumer                                    |
| -------------------------------------------- | -------------------------------- | ------ | ------------------------------------------- |
| `apps/web/public/algoplan-mark.svg`          | source (100x100 viewBox)         | SVG    | Generator seed (single source of truth)     |
| `apps/web/public/favicon.svg`                | source (verbatim copy)           | SVG    | `<link rel="icon" type="image/svg+xml">`    |
| `apps/web/public/favicon.ico`                | 16, 32, 48                       | ICO    | Browser fallback (legacy clients)           |
| `apps/web/public/apple-touch-icon.png`       | 180                              | PNG    | iOS home screen                             |
| `apps/web/public/icon-192.png`               | 192                              | PNG    | PWA manifest icon                           |
| `apps/web/public/icon-512.png`               | 512                              | PNG    | PWA manifest icon                           |
| `apps/web/public/og-image.png`               | 512 mark on 1200x630 canvas      | PNG    | `metadata.openGraph.images`                 |
| `apps/desktop/build/icon.png`                | 512                              | PNG    | electron-builder Linux                      |
| `apps/desktop/build/icon.ico`                | 16, 32, 48, 64, 128, 256         | ICO    | electron-builder Windows                    |
| `apps/desktop/build/icon.icns`               | 16, 32, 64, 128, 256, 512, 1024  | ICNS   | electron-builder macOS                      |
| `apps/desktop/resources/icon.png`            | 256                              | PNG    | dev-mode dock icon (electron BrowserWindow) |

**Note on `apps/web/app/favicon.ico`:** The plan originally specified the ICO at `apps/web/app/favicon.ico`, but `apps/web/app/favicon.ico/route.ts` exists as a Next.js dynamic route that 308-redirects to `/favicon.svg`. The generator writes the static ICO to `apps/web/public/favicon.ico` instead (where Next.js serves `/favicon.ico` from `public/` automatically). Plan 07-02 may delete the redirect route handler if a static ICO is preferred; both serve the same URL.

### Re-generation contract

- **When to re-run:** Only after editing `apps/web/public/algoplan-mark.svg` (the seed).
- **How to re-run:** `node scripts/generate-brand-assets.mjs` from repo root.
- **Verification:** `git status --short apps/web/public apps/desktop/build apps/desktop/resources` — empty diff means deterministic.

---

## §4 — Test Update Plan

Mirrors `07-VALIDATION.md` deltas. **No test files are deleted.** Phase 7 is additive + edit-in-place.

### Plans that ADD tests (NEW files)

| Plan  | New file                                            | Asserts                                                                     |
| ----- | --------------------------------------------------- | --------------------------------------------------------------------------- |
| 07-04 | `apps/desktop/src/main/deep-link.test.ts`           | `handleDeepLink('algoplan://auth/callback?token=…')` invokes `webContents.send('auth:token', token)`; `multica://` URLs are rejected |
| 07-05 | `packages/core/chat/store.test.ts` (NEW or extended)| Storage keys `multica:chat:*` preserved verbatim                            |

### Plans that EDIT existing test assertions (no count change)

| Plan  | Test file                                                                  | Change                                                                          |
| ----- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| 07-01 | `packages/views/dashboard-shell/app-sidebar.test.tsx:313`                  | Already-correct AlgoPlan regression assertion — verify, no edit                 |
| 07-01 | `packages/views/chat/__tests__/*.test.tsx` (if present)                    | "Multica" → "AlgoPlan" in chat brand text assertions                            |
| 07-02 | `apps/web/app/(auth)/login/page.test.tsx:90`                               | `getByText("Sign in to Multica")` → `getByText("Sign in to AlgoPlan")`          |
| 07-02 | `apps/web/app/auth/callback/page.test.tsx`                                 | "Multica" string assertions → "AlgoPlan"                                        |
| 07-02 | `apps/web/features/landing/utils/github-release.test.ts` (if any)          | Brand strings → AlgoPlan                                                        |
| 07-03 | `apps/desktop/test/electron-builder.test.ts` (NEW or extend)               | Asserts `productName: "AlgoPlan"`, `appId: "ai.algoplan.desktop"`, `protocols.schemes: ["algoplan"]` |
| 07-04 | `apps/web/app/auth/callback/page.test.tsx`                                 | Asserts `algoplan://` redirect (NOT `multica://`)                               |
| 07-05 | `packages/core/auth/store.test.ts`                                         | `multica_token` key preserved (NOT `algoplan_token`) — regression lock          |
| 07-05 | `packages/core/platform/storage-cleanup.test.ts`                           | `multica_*` AND `multica:*` keys cleaned with workspace suffix — confirms no rename |
| 07-05 | `e2e/auth.spec.ts:8`                                                       | `toContainText("Multica")` → `toContainText("AlgoPlan")`                        |

### Test count floor

```
baseline_test_files = 108
plus_new_files      = 2  (apps/desktop/src/main/deep-link.test.ts; packages/core/chat/store.test.ts)
hard_floor          = >= 109
soft_expectation    = >= 110
```

**Verification:** `find apps packages -name "*.test.ts" -o -name "*.test.tsx" | grep -v node_modules | wc -l` MUST return ≥ 109 at phase end.

---

## §5 — Open Questions Resolved by Planner + USER DECISIONS

### Planner-resolved (verbatim from final report)

| ID  | Question                                                  | Resolution                                                  |
| --- | --------------------------------------------------------- | ----------------------------------------------------------- |
| Q1  | CLI binary `multica` (`server/cmd/multica`) — rename?     | KEEP. Developer tool; rename out of phase scope.            |
| Q2  | Asset generation strategy?                                | SVG seed + `sharp` + `png-to-ico` + `png2icons` Node script. |
| Q3  | `grep-rebrand.sh` — CI rule or one-shot?                  | One-shot manual pre-merge audit (NOT CI), per Phase 1 D-19 precedent. |
| Q4  | Test updates — assertion edits or snapshot regen?         | Assertion edits. Snapshots not used for brand strings.       |

### USER DECISIONS (Plan 07-00 Task 0 checkpoint resolution)

These were resolved before Plan 07-00 execution started (user pre-approved checkpoint).

| ID         | Question                                                                                                | Resolution                                                                                                                                                                                                                                                                                                  |
| ---------- | ------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| USER-DEC-1 | Asset generation strategy + brand color hex                                                             | **`script + #008757`** — Generate from `AlgoPlanWordmark` lineage. Brand color `#008757` (sRGB hex of `--brand` token `oklch(0.55 0.13 156)`, confirmed via `packages/ui/styles/tokens.css` line 99 comment "brand-green"). Pipeline: SVG seed + `sharp` + `png-to-ico` + `png2icons` (catalog devDeps installed). |
| USER-DEC-2 | DNS / production URL target — `algoplan.ai`?                                                            | **No — production URL is `plan.algoview.com`.** All `multica.ai` / `multica.ai/docs` references in Plans 07-02 / 07-03 resolve to `plan.algoview.com`. The `algoplan.ai` hostname is NOT used.                                                                                                                |

### Hard-scope clarifications recorded during 07-00 execution

- **AlgoPlanWordmark location:** `packages/views/auth/algoplan-wordmark.tsx` (NOT `packages/ui/components/ui/`). Composition is `<dot rounded-full bg-brand>` + `<span>AlgoPlan</span>` — the brand mark for raster generation extracts the dot at full canvas (no text glyph since the icon is square).
- **`multica:*` localStorage keys:** Extension of D-2. Both `multica_*` (underscore-prefixed) AND `multica:*` (colon-prefixed, e.g. `multica:chat:*`, `multica:backlog-agent-hint`) are preserved verbatim. The grep exclusion regex `multica_[a-zA-Z]|multica:chat|multica:backlog` covers both.
- **`multica:navigate` custom DOM event:** Preserved verbatim. Internal pub/sub channel; the regex excludes `multica:navigate` explicitly.
- **`MULTICA_*` env vars:** Preserved verbatim. The regex excludes `MULTICA_` (uppercase).
- **`@multica/*` package imports:** Preserved verbatim (1127 hits in apps + packages). The regex excludes `@multica/` prefix.
- **Reserved slug `multica`:** `packages/core/paths/reserved-slugs.ts:31` — KEEP entry AND ADD `algoplan` alongside (anti-impersonation; both names protected). Plan 07-01 owns this edit.

---

## Maintenance protocol

1. When a plan adds a new exclusion: edit BOTH this document §2 AND `scripts/grep-rebrand.sh` `EXCLUDE` regex in the same commit.
2. When a plan completes its rows in §1: check off in the plan SUMMARY (do not edit this document — it's the static contract).
3. When the asset matrix changes: edit BOTH `scripts/generate-brand-assets.mjs` `TARGETS` array AND §3 in the same commit; re-run the generator and commit the regenerated binaries.
