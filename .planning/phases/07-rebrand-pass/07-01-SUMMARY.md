---
phase: 07-rebrand-pass
plan: 01
subsystem: views-ui-core
tags: [rebrand, string-sweep, anti-impersonation, reserved-slugs, brand-strings, css-comments, jsdoc, view-package]

# Dependency graph
requires:
  - phase: 07-rebrand-pass
    plan: 00
    provides: scripts/grep-rebrand.sh audit + 07-PATTERNS.md replacement table + USER-DEC-2 production URL plan.algoview.com
  - phase: 06-issue-detail-remaining-views
    provides: AlgoPlanWordmark atom (packages/views/auth/algoplan-wordmark.tsx) — consumed by workspace-loader swap

provides:
  - All packages/{views,ui,core} user-visible Multica strings replaced with AlgoPlan
  - Reserved-slugs guard now blocks BOTH "multica" AND "algoplan" (anti-impersonation)
  - C6 consistency test asserting both brand names are reserved (regression lock)
  - WorkspaceLoader uses AlgoPlanWordmark (size="lg") instead of MulticaIcon — first wordmark-appropriate swap
  - Updated grep-rebrand.sh exclusion regex (CLI subcommands, JSDoc CDN, anti-impersonation test references)

affects:
  - 07-02-web-strings-metadata (apps/web sweep, NOW gating on apps/web typecheck pre-existing import bug)
  - 07-03-electron-chrome (Electron build config)
  - 07-04-deep-link-scheme-flip (multica:// → algoplan:// atomic flip)
  - 07-05-test-assertion-edits (final test sweep)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Brand-identity vs decorative MulticaIcon split: workspace-loader uses AlgoPlanWordmark (brand identity); step-welcome keeps MulticaIcon (decorative inline asterisk)"
    - "Anti-impersonation reserved-slugs invariant: legacy brand name stays reserved forever post-rebrand"
    - "Audit script EXCLUDE regex evolves with the codebase — added CLI subcommand strings, JSDoc CDN example, anti-impersonation test descriptors"
    - "Direct relative cross-domain import in views/ (layout/ → ../auth/) avoids re-export overhead for a single-symbol consume"

key-files:
  created: []
  modified:
    - packages/views/chat/components/context-anchor.tsx
    - packages/views/chat/components/chat-fab.tsx
    - packages/views/chat/components/chat-window.tsx
    - packages/views/layout/help-launcher.tsx
    - packages/views/layout/workspace-loader.tsx
    - packages/views/workspace/create-workspace-form.tsx
    - packages/views/runtimes/components/update-section.tsx
    - packages/views/onboarding/utils/starter-content-templates.ts
    - packages/views/onboarding/components/starter-content-prompt.tsx
    - packages/views/onboarding/steps/step-welcome.tsx
    - packages/views/onboarding/steps/step-workspace.tsx
    - packages/views/onboarding/steps/step-runtime-connect.tsx
    - packages/views/onboarding/steps/step-questionnaire.tsx
    - packages/views/onboarding/steps/cli-install-instructions.tsx
    - packages/views/search/search-command.test.tsx
    - packages/ui/styles/tokens.css
    - packages/ui/styles/base.css
    - packages/ui/markdown/file-cards.ts
    - packages/ui/markdown/Markdown.tsx
    - packages/core/paths/reserved-slugs.ts
    - packages/core/paths/consistency.test.ts
    - scripts/grep-rebrand.sh

key-decisions:
  - "Help-launcher docs URL uses USER-DEC-2 production target plan.algoview.com (NOT algoplan.ai which is unowned)"
  - "WorkspaceLoader swap: full-screen workspace-loading splash IS brand identity → AlgoPlanWordmark size=lg; step-welcome decorative asterisk → KEEP MulticaIcon"
  - "Reserved-slug 'multica' KEPT alongside new 'algoplan' (anti-impersonation; both names protected forever post-rebrand)"
  - "Workspace-loader cross-domain import via relative path (../auth/algoplan-wordmark) avoids re-export ceremony; no circular dependency"
  - "Plan scope expanded inline (Rule 2 — auto-add critical functionality) to cover ALL user-visible Multica strings in packages/views/onboarding/* (step-welcome heading, step-workspace pills, step-runtime-connect headlines, step-questionnaire question, cli-install-instructions step label, starter-content-prompt copy) — not just the originally listed starter-content-templates.ts. Without this, success criterion 'zero hits originating from packages/views' would fail."
  - "Audit script EXCLUDE expanded with CLI subcommand patterns (multica setup/daemon/agent/config/update) per planner Q1 (CLI binary stays multica), the multica-static JSDoc example, and four targeted patterns covering the new C6 anti-impersonation test"

requirements-completed: [RBR-01]

# Metrics
duration: 10min
completed: 2026-04-26
---

# Phase 7 Plan 01: Rebrand Sweep — packages/{views,ui,core} Summary

**21 user-visible Multica → AlgoPlan replacements across 22 files in three shared packages, plus anti-impersonation reserved-slug guard (both brand names blocked), plus WorkspaceLoader swap to AlgoPlanWordmark — packages-level audit drops from 65 leaks to 0.**

## Performance

- **Duration:** ~10 min (3 tasks, no checkpoints — all auth gates / decisions pre-resolved by Plan 07-00)
- **Started:** 2026-04-26T13:19:24Z
- **Completed:** 2026-04-26T13:29:52Z
- **Tasks:** 3 of 3
- **Files modified:** 22 (16 packages/views + 4 packages/ui + 2 packages/core)

## Accomplishments

- **packages/views (16 files, ~21 string sites swept):** All chat, layout, workspace, runtimes, onboarding (step-welcome / step-workspace / step-runtime-connect / step-questionnaire / cli-install-instructions / starter-content-prompt / starter-content-templates), and search-test fixture user-visible "Multica" strings replaced with "AlgoPlan". URLs follow USER-DEC-2 production target `plan.algoview.com` (NOT `algoplan.ai`).
- **WorkspaceLoader swap:** First wordmark-appropriate `MulticaIcon → AlgoPlanWordmark` swap. Full-screen workspace-loading splash is brand identity (not decorative); step-welcome's inline asterisk stays MulticaIcon (decorative ornament).
- **packages/ui (4 files):** CSS comment headers (`tokens.css`, `base.css`) say AlgoPlan; markdown JSDoc CDN example hostnames updated `multica-static.copilothub.ai` → `algoplan-static.copilothub.ai` (documentation example only — runtime hostname is passed via `cdnDomain` prop). MulticaIcon component file kept verbatim (decorative asterisk).
- **packages/core (2 files):** RESERVED_SLUGS now blocks BOTH `multica` (legacy) AND `algoplan` (current) — anti-impersonation guard. New C6 consistency test asserts both names are reserved (regression lock). All `multica:chat:*` localStorage keys preserved verbatim (D-2 ext.).
- **Audit script tightened:** `scripts/grep-rebrand.sh` EXCLUDE regex extended with CLI subcommand strings (`multica setup` / `multica daemon` / `multica agent` / `multica config` / `multica update`), JSDoc CDN example (`multica-static`), and targeted patterns for the new C6 anti-impersonation test (which intentionally references both brand names). Packages-level audit now exits 0 from this plan; total leak count drops from 247 → 63 (all remaining in apps/* — Plans 07-02..07-04 territory).

## Task Commits

Each task committed atomically on `feat/repos-per-project`:

1. **Task 1: packages/views sweep + script CLI exclusion** — `5d611a51` (`feat(07-01): sweep Multica → AlgoPlan in packages/views`)
2. **Task 2: packages/ui sweep** — `ad88c87f` (`feat(07-01): sweep Multica → AlgoPlan in packages/ui`)
3. **Task 3: reserved-slugs anti-impersonation + C6 test** — `2517f927` (`feat(07-01): reserve both algoplan and multica brand slugs (anti-impersonation)`)
4. **Task 3 follow-up: script test-exclusion patterns** — `571fc29a` (`fix(07-01): exclude consistency.test.ts anti-impersonation assertions from rebrand audit`)

## Replacement-Table Rows Completed (07-PATTERNS.md §1)

Per the per-row check-off contract:

| §1 Row | File | Status |
|--------|------|--------|
| `packages/views/chat/components/context-anchor.tsx` | All 6 user-visible "Multica" sites | DONE |
| `packages/views/chat/components/chat-fab.tsx` | "Multica is working" + "Ask Multica" | DONE |
| `packages/views/chat/components/chat-window.tsx` | "Welcome to Multica" | DONE |
| `packages/views/onboarding/utils/starter-content-templates.ts` | All 14 user-visible Multica strings (welcome titles + descriptions + project copy) | DONE |
| `packages/views/runtimes/components/update-section.tsx` | "managed by Multica Desktop" → "managed by AlgoPlan Desktop" | DONE |
| `packages/views/workspace/create-workspace-form.tsx` | "multica.ai/" placeholder → "plan.algoview.com/" | DONE |
| `packages/views/layout/help-launcher.tsx` | DOCS_URL + CHANGELOG_URL → plan.algoview.com (USER-DEC-2) | DONE |
| `packages/views/layout/workspace-loader.tsx` | MulticaIcon → AlgoPlanWordmark size=lg (brand identity) | DONE |
| `packages/views/dashboard-shell/app-sidebar.test.tsx` | Already-correct AlgoPlan regression assertion | VERIFIED (no edit) |
| `packages/ui/styles/tokens.css` line 1 | "/* AlgoPlan design tokens — …" | DONE |
| `packages/ui/styles/base.css` lines 2 + 25 | AlgoPlan shared base styles + AlgoPlan icon | DONE |
| `packages/ui/components/common/multica-icon.tsx` | KEEP (decorative asterisk) | NO-EDIT (per §2) |

## Rows expanded inline (Rule 2 — auto-add critical functionality)

The plan's `files_modified` list named only `starter-content-templates.ts` for onboarding, but six other onboarding files contained user-visible "Multica" strings that would have failed the success criterion "zero hits originating from packages/views". Added inline:

| File | What | Rationale |
|------|------|-----------|
| `packages/views/onboarding/steps/step-welcome.tsx` | "Welcome to Multica" → "Welcome to AlgoPlan" | User-visible H1; Rule 2 |
| `packages/views/onboarding/steps/step-workspace.tsx` | 3 × "multica.ai/" pills + 1 comment | URL pills are pedagogical preview shown to users; Rule 2 |
| `packages/views/onboarding/steps/step-runtime-connect.tsx` | 2 × "Multica drives local AI coding tools…" + 1 comment | Hero copy on runtime-connect screens; Rule 2 |
| `packages/views/onboarding/steps/step-questionnaire.tsx` | "What do you want to do with Multica?" question + ariaLabel | Question rendered to users; Rule 2 |
| `packages/views/onboarding/steps/cli-install-instructions.tsx` | "Install the Multica CLI" → "Install the AlgoPlan CLI" | Step label rendered to users (CLI binary itself stays `multica` per Q1) |
| `packages/views/onboarding/components/starter-content-prompt.tsx` | "agents, issues, and context work in Multica" → "…in AlgoPlan" | Dialog body copy; Rule 2 |

## Decisions Made

### Plan-level

- **USER-DEC-2 applied:** All `multica.ai` URLs in scope rewritten to `plan.algoview.com` (NOT `algoplan.ai`). Affects `help-launcher.tsx` (DOCS / CHANGELOG URLs), `workspace/create-workspace-form.tsx` (slug pill prefix), and `step-workspace.tsx` (3 pills + 1 comment).
- **WorkspaceLoader swap rule applied:** Per plan interface decision rule, the full-screen workspace-loading splash is BRAND IDENTITY (user perceives "the app is loading" → wordmark) → swap to AlgoPlanWordmark size="lg". The step-welcome decorative asterisk inside a step card is ORNAMENT → keep MulticaIcon.
- **Cross-domain import via relative path:** `workspace-loader.tsx` (in `layout/`) imports `AlgoPlanWordmark` via `../auth/algoplan-wordmark` rather than the re-export `@multica/views/auth`. Direct path is one symbol, no circular dependency, and avoids the package.json `exports` complication that bit apps/web (see Deferred Issues).

### Audit-script evolution

The exclusion regex was tightened during execution to keep the audit truthful:

- Added `multica setup|multica daemon|multica agent|multica config|multica update` — CLI subcommand strings rendered in onboarding/runtime UI (binary stays `multica` per planner Q1)
- Added `multica-static` — JSDoc example CDN hostname in markdown package (documentation, not production)
- Added `Multica → AlgoPlan` — regression-lock test description prefix (intentionally references both names)
- Added `/multica workspaces`, `multica.*brand slugs are reserved`, `legacy brand name`, `` `multica` ``, `RESERVED_SLUGS.has..multica..` — covers the new C6 anti-impersonation test which intentionally references both brand names in test code, comments, and assertions

(The user / linter also added: `multica-locale` cookie name, `MulticaLanding` / `multica-landing` landing component pending 07-02 file rename, `multica CLI` user-doc string. These are independent additions covering apps/web rows owned by Plan 07-02.)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 — Critical functionality] Expanded onboarding sweep beyond plan's files_modified list**
- **Found during:** Task 1 verification re-grep
- **Issue:** The plan's `files_modified` list named only `packages/views/onboarding/utils/starter-content-templates.ts` for onboarding, but six other onboarding files (`step-welcome.tsx`, `step-workspace.tsx`, `step-runtime-connect.tsx`, `step-questionnaire.tsx`, `cli-install-instructions.tsx`, `starter-content-prompt.tsx`) contained user-visible "Multica" strings. Without sweeping these, the plan's success criterion ("`bash scripts/grep-rebrand.sh` shows zero hits originating from `packages/views`") would have failed by ~13 lines.
- **Fix:** Edited the additional 6 files inline as part of Task 1.
- **Files modified:** see "Rows expanded inline" table above
- **Committed in:** `5d611a51`

**2. [Rule 3 — Blocking] Audit script EXCLUDE regex did not recognize CLI subcommand strings**
- **Found during:** Task 1 verification (post-edit re-grep)
- **Issue:** Per planner Q1, the CLI binary `multica` stays unchanged. UI strings rendering `multica setup` / `multica daemon` (in onboarding step-platform-fork, runtime-list, cli-install-instructions, starter-content-templates) were correctly preserved, but the audit script flagged them as leaks — preventing success-criterion verification.
- **Fix:** Extended `EXCLUDE` regex with `multica setup|multica daemon|multica agent|multica config|multica update`. Also added `multica-static` (Markdown JSDoc example) and `Multica → AlgoPlan` (regression-lock test descriptor).
- **Files modified:** `scripts/grep-rebrand.sh`
- **Committed in:** `5d611a51` (bundled with Task 1)

**3. [Rule 2 — Critical functionality] Added C6 consistency test for anti-impersonation invariant**
- **Found during:** Task 3 (no existing test asserted brand-slug reservation)
- **Issue:** The plan instructed: "if a unit test asserting reserved slug behavior exists, extend it to assert both `multica` AND `algoplan` are blocked". No such test existed. Without a regression lock, the anti-impersonation guard could silently regress (e.g. someone removes the legacy `multica` entry thinking it's a stale leftover).
- **Fix:** Added a new `it("both algoplan and multica brand slugs are reserved (anti-impersonation)")` test case in `packages/core/paths/consistency.test.ts` under the existing "global path / reserved slug consistency" describe block.
- **Files modified:** `packages/core/paths/consistency.test.ts`
- **Committed in:** `2517f927`

**4. [Rule 3 — Blocking] Audit script flagged the new C6 test as a leak**
- **Found during:** Task 3 verification re-grep
- **Issue:** The new C6 test (3 lines of code + 2 lines of explanatory comments) intentionally references both brand names — the audit script counted these as new "leaks", preventing zero-leak assertion.
- **Fix:** Extended `EXCLUDE` regex with four targeted patterns matching the test's intentional references: `/multica workspaces`, `multica.*brand slugs are reserved`, `legacy brand name`, `` `multica` `` (markdown-quoted), and `RESERVED_SLUGS.has..multica..` (the assertion). These patterns are narrow enough to leave future legitimate leaks visible.
- **Files modified:** `scripts/grep-rebrand.sh`
- **Committed in:** `571fc29a`

---

**Total deviations:** 4 auto-fixed (2 Rule 2 — missing critical functionality, 2 Rule 3 — blocking on script). All within plan boundaries; no architectural decisions required.

## Files SKIPPED (per plan exclusion rules)

Per plan instructions, the following files were intentionally NOT edited even though they contain `multica` strings:

| File | Why | Exclusion rule |
|------|-----|----------------|
| `packages/views/auth/login-page.tsx` | Single ref is a developer comment ("legacy MulticaIcon during transitional") explaining historical migration; not user-visible | (comment) |
| `packages/views/issues/components/issue-detail.tsx` | `multica:backlog-agent-hint-dismissed` localStorage key (lines 475, 983) | D-2 ext. |
| `packages/views/editor/utils/link-handler.ts` | `multica:navigate` custom DOM event (lines 34, 55) | (internal pub/sub) |
| `packages/views/runtimes/components/runtime-list.tsx` | `multica daemon start` CLI command (line 234) | Q1 (CLI binary stays) |
| `packages/views/onboarding/steps/step-platform-fork.tsx` | 4 × `multica setup` CLI command refs | Q1 |
| `packages/views/onboarding/steps/cli-install-instructions.tsx` (CMD const) | `SETUP_CMD = "multica setup"` constant + comment | Q1 |
| `packages/views/onboarding/utils/starter-content-templates.ts` (lines 370/377/381) | GitHub URLs `github.com/multica-ai/multica` + `multica setup` CLI | D-4 + Q1 |
| `packages/views/dashboard-shell/app-sidebar.test.tsx:313` | Test description "(Multica → AlgoPlan regression lock)" | (test descriptor) |
| `packages/ui/components/common/multica-icon.tsx` | Aesthetic asterisk component file | (visual) |
| `packages/ui/styles/base.css` keyframe identifier `multica-icon-spin` | Referenced by MulticaIcon component | (paired with MulticaIcon kept) |
| `packages/core/chat/store.ts`, `packages/core/platform/storage-cleanup.ts` (and test) | `multica:chat:*` localStorage keys | D-2 ext. |

## Issues Encountered

**Pre-existing apps/web typecheck error (out of plan scope):**
`apps/web/app/[workspaceSlug]/layout.tsx:11` imports `@multica/views/auth/algoplan-wordmark` (deep subpath), but `packages/views/package.json` only exports `./auth` (the index). The symbol is available via the index re-export. This pre-existing modification was NOT made by Plan 07-01 (apps/web edits are owned by Plan 07-02). Documented in `.planning/phases/07-rebrand-pass/deferred-items.md`. Per-package typecheck (`pnpm --filter @multica/{views,ui,core} typecheck`) is GREEN — Plan 07-01 introduces no typecheck errors.

## Verification Results

| Check | Expected | Actual | Status |
|-------|----------|--------|--------|
| `bash scripts/grep-rebrand.sh` packages-only count | 0 | 0 | PASS |
| `bash scripts/grep-rebrand.sh` total count | < 247 (baseline) | 63 (all in apps/*) | PASS |
| `pnpm --filter @multica/views exec vitest run` | green | 76 files / 621 tests passed | PASS |
| `pnpm --filter @multica/core exec vitest run` | green | 19 files / 127 tests passed | PASS |
| `pnpm --filter @multica/ui exec vitest run` | green | 6 files / 74 tests passed | PASS |
| `pnpm --filter @multica/views typecheck` | green | clean | PASS |
| `pnpm --filter @multica/ui typecheck` | green | clean | PASS |
| `pnpm --filter @multica/core typecheck` | green | clean | PASS |
| `pnpm typecheck` (full repo) | green | FAILS at apps/web (pre-existing modification) | NOT-OUR-BUG |
| `multica:chat:*` / `multica:backlog-*` localStorage keys preserved | grep > 0 | unchanged | PASS |
| `multica:navigate` custom DOM event preserved | unchanged | unchanged | PASS |
| `MulticaIcon` component file untouched | no edit | no edit | PASS |
| reserved-slugs.ts contains both `algoplan` and `multica` | both | both present | PASS |
| C6 consistency test asserts both brand slugs | passes | passes | PASS |

## Threat Surface

Per plan §threat_model:

- **T-07-01-01 (Spoofing / reserved-slugs.ts):** mitigated. Both `multica` and `algoplan` are reserved; users cannot create either workspace slug. C6 regression test prevents silent removal.
- **T-07-01-02 (Information Disclosure / localStorage):** mitigated by verify-by-grep. All `multica_*` and `multica:*` localStorage keys are unchanged (script EXCLUDE regex preserves them; verified by re-grep across packages).

No new threat surface introduced (only string replacements + one slug addition + one test addition; no new endpoints, auth paths, or schema changes).

## DNS Readiness Note

Per plan: "if `algoplan.ai` is not yet owned, executor MUST checkpoint before applying [help-launcher.tsx]". This was resolved by USER-DEC-2 (Plan 07-00 Task 0): production URL is `plan.algoview.com`, NOT `algoplan.ai`. No checkpoint required — the URL was changed to `plan.algoview.com` (which the user has already designated as the production target). Help-launcher.tsx now points to `https://plan.algoview.com/docs` and `https://plan.algoview.com/changelog`.

## Self-Check: PASSED

**Files (verified existent):**
- FOUND: `packages/views/chat/components/context-anchor.tsx`
- FOUND: `packages/views/chat/components/chat-fab.tsx`
- FOUND: `packages/views/chat/components/chat-window.tsx`
- FOUND: `packages/views/layout/help-launcher.tsx`
- FOUND: `packages/views/layout/workspace-loader.tsx`
- FOUND: `packages/views/workspace/create-workspace-form.tsx`
- FOUND: `packages/views/runtimes/components/update-section.tsx`
- FOUND: `packages/views/onboarding/utils/starter-content-templates.ts`
- FOUND: `packages/views/onboarding/components/starter-content-prompt.tsx`
- FOUND: `packages/views/onboarding/steps/step-welcome.tsx`
- FOUND: `packages/views/onboarding/steps/step-workspace.tsx`
- FOUND: `packages/views/onboarding/steps/step-runtime-connect.tsx`
- FOUND: `packages/views/onboarding/steps/step-questionnaire.tsx`
- FOUND: `packages/views/onboarding/steps/cli-install-instructions.tsx`
- FOUND: `packages/views/search/search-command.test.tsx`
- FOUND: `packages/ui/styles/tokens.css`
- FOUND: `packages/ui/styles/base.css`
- FOUND: `packages/ui/markdown/file-cards.ts`
- FOUND: `packages/ui/markdown/Markdown.tsx`
- FOUND: `packages/core/paths/reserved-slugs.ts`
- FOUND: `packages/core/paths/consistency.test.ts`
- FOUND: `scripts/grep-rebrand.sh`

**Commits (verified in `git log --oneline`):**
- FOUND: `5d611a51 feat(07-01): sweep Multica → AlgoPlan in packages/views`
- FOUND: `ad88c87f feat(07-01): sweep Multica → AlgoPlan in packages/ui`
- FOUND: `2517f927 feat(07-01): reserve both algoplan and multica brand slugs (anti-impersonation)`
- FOUND: `571fc29a fix(07-01): exclude consistency.test.ts anti-impersonation assertions from rebrand audit`

## Next Plan Readiness

- **Plan 07-02 (apps/web sweep) ready** — all packages-level dependencies in place (AlgoPlanWordmark exported from `@multica/views/auth`; reserved-slugs guards both names; CSS tokens say AlgoPlan). 07-02 will need to:
  1. Fix the pre-existing apps/web/app/[workspaceSlug]/layout.tsx import (use `@multica/views/auth` re-export OR add `./auth/algoplan-wordmark` to package.json exports)
  2. Sweep apps/web/* per 07-PATTERNS.md §1 web rows (63 leaks remaining)

- **Plans 07-03 / 07-04 / 07-05** — no Plan 07-01 outputs block these; their dependencies are entirely on apps/desktop and final test sweeps.

---
*Phase: 07-rebrand-pass*
*Completed: 2026-04-26*
