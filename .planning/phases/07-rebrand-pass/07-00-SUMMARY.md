---
phase: 07-rebrand-pass
plan: 00
subsystem: infra
tags: [rebrand, audit-script, asset-pipeline, sharp, png2icons, brand-assets, electron-icons, pwa]

# Dependency graph
requires:
  - phase: 06-issue-detail-remaining-views
    provides: AlgoPlanWordmark atom (packages/views/auth/algoplan-wordmark.tsx) — composition reference for the brand mark seed
  - phase: 01-token-foundation-typography
    provides: --brand token (packages/ui/styles/tokens.css line 99) — sRGB hex #008757 source

provides:
  - scripts/grep-rebrand.sh — one-shot audit of user-visible "Multica" leaks across apps + shared packages
  - scripts/generate-brand-assets.mjs — deterministic SVG → 10-target raster pipeline
  - apps/web/public/algoplan-mark.svg — single brand-mark source of truth (square, white background, brand-green circle)
  - 10 generated brand assets (favicon stack + PWA icons + OG image + Electron app icons mac/win/linux + dev-mode dock icon)
  - .planning/phases/07-rebrand-pass/07-PATTERNS.md — replacement table + exclusion rules + asset matrix + test plan + decision log

affects:
  - 07-01-string-sweep-views-ui     (consumes §1 replacement table for shared-package edits)
  - 07-02-web-strings-metadata      (consumes §1 web rows + production URL plan.algoview.com)
  - 07-03-electron-chrome           (consumes §1 desktop rows + appId/protocol/productName mapping)
  - 07-04-deep-link-scheme-flip     (consumes atomic flip rule between electron-builder.yml + auth/callback)
  - 07-05-test-assertion-edits      (consumes §4 test update plan + 109-floor)

# Tech tracking
tech-stack:
  added:
    - sharp@^0.34.5 (devDep, root) — SVG → PNG raster generation with density-aware resize
    - png-to-ico@^3.0.1 (devDep, root) — multi-size Windows .ico container assembly
    - png2icons@^2.0.1 (devDep, root) — macOS .icns container generation from single high-res PNG
  patterns:
    - "Single seed SVG → many rasters (deterministic re-run guarantee verified by SHA256)"
    - "Audit script + patterns doc + exclusion regex are co-evolved in lock-step (single source of truth split across 2 files)"
    - "Phase 1 D-19 precedent reused: brand audit is one-shot manual, NOT CI gate"
    - "Brand color #008757 inlined in SVG seed (asset must render outside CSS context)"

key-files:
  created:
    - scripts/grep-rebrand.sh
    - scripts/generate-brand-assets.mjs
    - apps/web/public/algoplan-mark.svg
    - apps/web/public/favicon.ico
    - apps/web/public/apple-touch-icon.png
    - apps/web/public/icon-192.png
    - apps/web/public/icon-512.png
    - apps/web/public/og-image.png
    - .planning/phases/07-rebrand-pass/07-PATTERNS.md
    - .planning/phases/07-rebrand-pass/deferred-items.md
  modified:
    - apps/web/public/favicon.svg (was Multica X-glyph; now AlgoPlan brand-mark seed)
    - apps/desktop/build/icon.png
    - apps/desktop/build/icon.ico
    - apps/desktop/build/icon.icns
    - apps/desktop/resources/icon.png
    - package.json (devDeps)
    - pnpm-lock.yaml

key-decisions:
  - "USER-DEC-1: SVG seed + sharp/png-to-ico/png2icons pipeline; brand color #008757 (sRGB hex of --brand token oklch(0.55 0.13 156))"
  - "USER-DEC-2: Production URL is plan.algoview.com (NOT algoplan.ai) — used by Plans 07-02 / 07-03 for metadataBase, robots, sitemap, package.json homepage, help-launcher docs link"
  - "Brand mark composition: filled green circle on rounded white square — extracts the dot atom from AlgoPlanWordmark (no text glyph since icon canvas is square)"
  - "Static favicon.ico written to apps/web/public/favicon.ico (NOT apps/web/app/favicon.ico/ — that path already has a 308-redirect Next.js route handler; both serve /favicon.ico)"
  - "grep-rebrand.sh EXCLUDE regex covers BOTH multica_* (underscore) AND multica:* (colon-prefix chat/backlog) — extension of D-2 from CONTEXT"
  - "Reserved-slug 'multica' KEPT in packages/core/paths/reserved-slugs.ts (anti-impersonation); Plan 07-01 will ADD 'algoplan' alongside (not replace)"

patterns-established:
  - "Audit script EXCLUDE regex + 07-PATTERNS.md §2 must be co-edited in the same commit (maintenance protocol documented at end of patterns doc)"
  - "Asset matrix changes require atomic edit of generate-brand-assets.mjs TARGETS + 07-PATTERNS.md §3 + regenerated binaries (single commit)"
  - "Plan SUMMARY check-off pattern: each row in §1 replacement table is owned by a single plan; check off in that plan's SUMMARY when complete"

requirements-completed: [RBR-06]

# Metrics
duration: 8min
completed: 2026-04-26
---

# Phase 7 Plan 00: Rebrand Audit Infrastructure + Asset Pipeline Summary

**Deterministic SVG-seeded brand asset generator (sharp + png-to-ico + png2icons producing 10 stable-SHA256 targets) + one-shot Multica-leak audit script + 227-line patterns reference contract that Plans 07-01..07-05 consume.**

## Performance

- **Duration:** ~8 min (3 tasks, no checkpoints — Task 0 user-decisions pre-supplied)
- **Started:** 2026-04-26T13:05:20Z
- **Completed:** 2026-04-26T13:13:00Z
- **Tasks:** 3 of 3 (Task 0 checkpoint resolved by user before execution)
- **Files created/modified:** 16 (4 new tool/doc files + 11 generated assets + 2 dependency manifests; one favicon.svg overwritten)

## Accomplishments

- **Audit script wired:** `scripts/grep-rebrand.sh` greps 5 directories with a single OR-regex EXCLUDE that preserves all 13 documented patterns (D-2 / D-3 / D-4 + internals). Currently exits 1 with **247 user-visible leaks** on `feat/repos-per-project` (will exit 0 after Plans 01–05 ship).
- **Asset pipeline shipped:** `scripts/generate-brand-assets.mjs` reads ONE seed (`apps/web/public/algoplan-mark.svg`, 929 bytes, white-square + #008757 circle) and emits 10 deterministic targets totaling ~493 KB. Re-running with no SVG edit yields **byte-identical** SHA256 fingerprints (verified across two runs).
- **Patterns contract shipped:** `07-PATTERNS.md` (227 lines, 5 sections) is the single reference Plans 01–05 consult — owns the replacement table (per-row plan annotations), exclusion rules (mirrors grep-rebrand.sh EXCLUDE), asset matrix (mirrors generator TARGETS), test update plan (mirrors VALIDATION 109-floor), and decision log (Q1–Q4 + USER-DEC-1 + USER-DEC-2).

## Task Commits

Each task committed atomically on `feat/repos-per-project`:

1. **Task 1: scripts/grep-rebrand.sh** — `5f05bdbf` (`feat(07-00): add grep-rebrand.sh user-visible Multica audit`)
2. **Task 2: asset generator + seed SVG + 10 generated assets + devDeps** — `33a6feba` (`feat(07-00): add brand asset generator + seed SVG + 10 generated assets`)
3. **Task 3: 07-PATTERNS.md** — `000a3942` (`docs(07-00): add 07-PATTERNS.md replacement table + exclusions + asset matrix`)

(Task 0 was a `checkpoint:human-action` — user pre-supplied resolution `script + #008757` and `production URL = plan.algoview.com`. No commit; decisions recorded in §5 of 07-PATTERNS.md.)

## Generated Asset SHA256 Fingerprints

These are the deterministic-regeneration check baseline. Re-running `node scripts/generate-brand-assets.mjs` against the unchanged seed MUST produce these exact fingerprints. Any drift is a generator bug or a seed-edit that wasn't intended.

```
ce328c80e23acaec8ec39674ff86de618d1a324eda9896d005a3871b4f8ca5c4  apps/web/public/algoplan-mark.svg          (seed, 929 B)
ce328c80e23acaec8ec39674ff86de618d1a324eda9896d005a3871b4f8ca5c4  apps/web/public/favicon.svg               (verbatim copy of seed)
90933abf20b82073d013f32475dd1e2f9d3d8aedf6f9d36ac4e322a3220eefab  apps/web/public/favicon.ico               (16, 32, 48; 15 KB)
30d4bdcfea5b37186b0810da0338aee066984f4ed4f1985191a0724560adc834  apps/web/public/apple-touch-icon.png      (180px; 3.6 KB)
ffd5a45a15715074e338319874ad93b3bdc49e499c43967f17dc4436608e5ca6  apps/web/public/icon-192.png              (192px; 3.8 KB)
ee1bd36385c752c5140885b2f3f9b1b0fe1d59942a7f998d10bb978809cef70d  apps/web/public/icon-512.png              (512px; 13 KB)
7d6da508e576071bbec40a65c7e7d56dec949879b9238367b37fb45894eab777  apps/web/public/og-image.png              (512 mark on 1200x630 white; 14 KB)
ee1bd36385c752c5140885b2f3f9b1b0fe1d59942a7f998d10bb978809cef70d  apps/desktop/build/icon.png               (512px; identical to icon-512.png)
af085a15f84bec5e9efe46de3e246b74acc81a866492f92ac278292ccb84ad6b  apps/desktop/build/icon.ico               (16/32/48/64/128/256; 370 KB)
75466f0353d573f4f0d4300d5b35a33f8f78e5d03ccb60ba6bb7046b92c76c40  apps/desktop/build/icon.icns              (16..1024; 54 KB; verified `Mac OS X icon` magic)
bce7dfd1fb486e42fc8763bdbe85bcdc033e133a7a029dbe1b899208bc16f859  apps/desktop/resources/icon.png           (256px dev-mode dock; 5.4 KB)
```

Binary magic-number sniff (`file(1)`):
- `apps/desktop/build/icon.icns` → `Mac OS X icon, 54312 bytes, "ic12" type` ✓
- `apps/desktop/build/icon.ico` → `MS Windows icon resource - 6 icons, 16x16, 32 bits/pixel, 32x32, 32 bits/pixel` ✓
- `apps/web/public/favicon.ico` → `MS Windows icon resource - 3 icons, 16x16, 32 bits/pixel, 32x32, 32 bits/pixel` ✓

## Decisions Made

### USER DECISIONS (resolved Task 0 checkpoint before execution)

**USER-DEC-1: Asset strategy + brand hex** — `script + #008757`
- Pipeline: SVG seed → `sharp` (density-scaled raster) → `png-to-ico` (Windows multi-size container) → `png2icons.createICNS` (macOS container from single high-res PNG)
- Brand color `#008757` is the sRGB hex of `--brand` token `oklch(0.55 0.13 156)`, confirmed via inline comment in `packages/ui/styles/tokens.css:99` ("brand-green")
- Source-of-truth atom: `packages/views/auth/algoplan-wordmark.tsx` (per AlgoPlanWordmark composition: brand dot at full canvas)

**USER-DEC-2: Production URL** — `plan.algoview.com` (NOT `algoplan.ai`)
- Used by Plans 07-02 / 07-03 for `metadataBase`, `robots.ts` baseUrl, `sitemap.ts` baseUrl, `package.json` homepage, `help-launcher.tsx` docs URL, `create-workspace-form.tsx` placeholder
- Recorded in 07-PATTERNS.md §2 + §5 + every relevant §1 row

### Planner-resolved (Q1–Q4)

- **Q1 — CLI binary:** KEEP `multica` binary at `server/cmd/multica` (developer tool; rename out of phase scope)
- **Q2 — Asset strategy:** SVG seed + `sharp`/`png2icons` script
- **Q3 — Audit script gating:** One-shot manual audit (NOT CI rule), per Phase 1 D-19 precedent
- **Q4 — Test updates:** Assertion edits (NOT snapshot regen)

### Implementation choices made during execution

- **`apps/web/public/favicon.ico` not `apps/web/app/favicon.ico`:** The plan originally specified `apps/web/app/favicon.ico` but `apps/web/app/favicon.ico/route.ts` already exists as a Next.js 308-redirect to `/favicon.svg`. Putting a static file at that path collides with the route handler. The static ICO landed in `apps/web/public/` (Next.js auto-serves `/favicon.ico` from `public/`); both URLs resolve to the same content. Plan 07-02 may delete the redirect route if a static-file-only approach is preferred.
- **PNG raster density:** `sharp` defaults to 72 DPI which under-samples vector edges at large sizes. The generator passes `density: Math.max(72, size * 2)` so a 512px target renders the SVG at 1024 DPI before resizing, producing crisp circular edges at every output size.
- **OG image canvas:** 512px mark centered on a 1200×630 white-background composite (matches the seed SVG's white square so the mark blends seamlessly into the OG card).
- **Re-using identical PNG between web/desktop:** `apps/web/public/icon-512.png` and `apps/desktop/build/icon.png` are byte-identical (same SHA256 `ee1bd363…`) — both consume the same 512px raster. The generator runs the conversion twice; future optimization could share the buffer, but the determinism guarantee already covers correctness.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 — Bug] SVG XML comment contained `--` (double-hyphen)**
- **Found during:** Task 2 first run of `node scripts/generate-brand-assets.mjs`
- **Issue:** `sharp` (libvips/glib) rejected the seed SVG with `XML parse error: Comment must not contain '--' (double-hyphen)`. The XML 1.0 spec forbids `--` inside comments; the original draft of `algoplan-mark.svg` used em-dash–style markdown punctuation (e.g. `"AlgoPlan brand mark — single source"`) inside the comment block.
- **Fix:** Rewrote the SVG header comment using colon-form punctuation (no `—` em-dashes adjacent to text inside the comment body — colons + parenthetical clauses instead).
- **Files modified:** `apps/web/public/algoplan-mark.svg`
- **Verification:** Generator reruns cleanly, all 10 targets emit successfully.
- **Committed in:** `33a6feba` (Task 2 commit — fix is part of the same commit since the SVG was authored in the same task)

**2. [Rule 3 — Blocking] devDependencies sharp / png-to-ico / png2icons not installed**
- **Found during:** Task 2 (before first generator run)
- **Issue:** `find node_modules` returned no `sharp` directory. The plan's interfaces section called for these libraries but they weren't yet present.
- **Fix:** `pnpm add -D -w sharp png-to-ico png2icons` (root devDependencies).
- **Files modified:** `package.json`, `pnpm-lock.yaml`
- **Verification:** Generator imports succeed; all 10 targets emit.
- **Committed in:** `33a6feba` (Task 2 commit — bundled with the asset generator + assets)

---

**Total deviations:** 2 auto-fixed (1 bug, 1 blocking)
**Impact on plan:** Both fixes were essential prerequisites for the deliverable (generator can't run without deps; SVG can't parse with invalid comment). No scope creep — both stayed inside Task 2 boundaries.

## Issues Encountered

None during planned work — Tasks 1, 2, 3 each succeeded on the first attempt after the two Task-2 auto-fixes above.

## Verification Results

| Check                                              | Expected                                  | Actual                                                        | Status |
| -------------------------------------------------- | ----------------------------------------- | ------------------------------------------------------------- | ------ |
| `bash scripts/grep-rebrand.sh` baseline            | exits 1 with leak count printed to stderr | exits 1 with **247 leaks** printed                            | PASS   |
| All 10 generated assets exist on disk              | non-empty files                           | 11 files (10 + seed); sizes 929 B .. 370 KB                   | PASS   |
| `file(1)` magic-number sniff on binary containers  | ICNS = `Mac OS X icon`; ICO = `MS Windows icon resource` | All three binaries match expected magic                       | PASS   |
| Determinism: rerun → SHA256 stable                 | identical fingerprints                    | All 11 SHA256 hashes byte-identical across 2 runs             | PASS   |
| 07-PATTERNS.md exists with §§1-5                   | ≥80 lines, all 3 named sections present   | 227 lines; "Replacement Table", "Exclusion Rules", "Asset Size Matrix" all present | PASS   |
| `pnpm typecheck`                                   | green (or pre-existing failures only)     | FAILS at `apps/desktop/.../pageview-tracker.tsx:60` — **PRE-EXISTING** on baseline `5b2d929d` (introduced by `205e8c1e feat(analytics): client_type super-property`) — out of Plan 07-00 scope. Logged in `.planning/phases/07-rebrand-pass/deferred-items.md`. | NOT-OUR-BUG |

## Deferred Issues

| Item                                                                                | Status                                                                                                | Owner                            |
| ----------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- | -------------------------------- |
| `apps/desktop/src/renderer/src/components/pageview-tracker.tsx:60` TS2366 typecheck error | Pre-existing on baseline `5b2d929d`; introduced by analytics PR `205e8c1e`. Out of Plan 07-00 scope. Logged in `deferred-items.md`. | Analytics owner / future maintenance plan |

## Note on Generated Assets

Per plan output spec: **"Generated assets are placeholder mark — Plan 07-02 may overwrite with refined design after design review."** The current mark is a brand-green filled circle on a white rounded-square background — extracted directly from the AlgoPlanWordmark dot atom. If a designer produces a refined wordmark glyph, replace `apps/web/public/algoplan-mark.svg` and re-run `node scripts/generate-brand-assets.mjs`; the generator's deterministic contract guarantees the entire 10-asset cascade updates atomically.

## Self-Check: PASSED

**Files (verified existent):**
- FOUND: `scripts/grep-rebrand.sh` (executable; 1530 bytes; mode 755)
- FOUND: `scripts/generate-brand-assets.mjs` (5.0 KB)
- FOUND: `apps/web/public/algoplan-mark.svg` (929 bytes)
- FOUND: `apps/web/public/favicon.svg` (929 bytes — overwritten from prior Multica X-glyph)
- FOUND: `apps/web/public/favicon.ico` (15086 bytes; 3 sizes)
- FOUND: `apps/web/public/apple-touch-icon.png` (3559 bytes; 180px)
- FOUND: `apps/web/public/icon-192.png` (3770 bytes; 192px)
- FOUND: `apps/web/public/icon-512.png` (13111 bytes; 512px)
- FOUND: `apps/web/public/og-image.png` (13518 bytes; 1200×630)
- FOUND: `apps/desktop/build/icon.png` (13111 bytes; 512px)
- FOUND: `apps/desktop/build/icon.ico` (370070 bytes; 6 sizes)
- FOUND: `apps/desktop/build/icon.icns` (54312 bytes; "ic12" type)
- FOUND: `apps/desktop/resources/icon.png` (5416 bytes; 256px)
- FOUND: `.planning/phases/07-rebrand-pass/07-PATTERNS.md` (227 lines)
- FOUND: `.planning/phases/07-rebrand-pass/deferred-items.md`

**Commits (verified in `git log --oneline`):**
- FOUND: `5f05bdbf feat(07-00): add grep-rebrand.sh user-visible Multica audit`
- FOUND: `33a6feba feat(07-00): add brand asset generator + seed SVG + 10 generated assets`
- FOUND: `000a3942 docs(07-00): add 07-PATTERNS.md replacement table + exclusions + asset matrix`

## Next Phase Readiness

- **Plan 07-01 ready:** §1 replacement table rows annotated with `Owning plan: 07-01` are complete and unambiguous (packages/views chat brand strings, packages/ui CSS comment headers, desktop renderer brand strings, reserved-slug `algoplan` add)
- **Plan 07-02 ready:** §1 web rows + USER-DEC-2 production URL `plan.algoview.com` resolved (no further DNS checkpoint needed; metadataBase target known)
- **Plan 07-03 ready:** §1 Electron chrome rows + USER-DEC-2 (homepage URL) resolved; appId/protocol/productName mapping documented
- **Plan 07-04 ready:** Atomic-flip protocol (electron-builder.yml `protocols.schemes` ↔ apps/web/app/auth/callback/page.tsx deep-link href) documented in §1 owning-plan column
- **Plan 07-05 ready:** §4 test update plan documents 109-floor + 2 net-new files + assertion edits per file; `multica_*` / `multica:*` localStorage preservation regression locks specified

**No blockers.** Phase 7 Wave 0 is complete; Wave 1 (Plan 07-01) can begin immediately.

---
*Phase: 07-rebrand-pass*
*Completed: 2026-04-26*
