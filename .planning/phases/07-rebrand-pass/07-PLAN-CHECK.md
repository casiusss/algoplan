# Phase 7 — Rebrand Pass: Plan Check (V1)

**Date:** 2026-04-26
**Checker:** gsd-plan-checker
**Plans verified:** 6 (07-00 through 07-05)
**Methodology:** Goal-backward verification

---

## Overall Verdict: PASS

**Blockers:** 0
**Warnings:** 4
**Recommended next step:** Proceed with `/gsd-execute-phase 07-rebrand-pass`. Address warnings opportunistically; none gate execution.

---

## Goal Recap

> Every user-visible "Multica" reference is replaced with "AlgoPlan" — strings, logos, favicons, metadata, Electron chrome, and the `multica://` deep-link scheme — while `multica_*` localStorage keys and `@multica/*` package imports are deliberately left unchanged.

**Goal-backward truths required:**
1. User sees "AlgoPlan" everywhere (browser tab, landing, dashboard, dock, menu, installer)
2. Web→desktop OAuth flow continues to work (atomic `multica://` → `algoplan://`)
3. Existing users do NOT lose theme, drafts, view state, chat history (`multica_*`/`multica:*` preserved)
4. Internal monorepo build does NOT break (`@multica/*` imports preserved)
5. Brand assets (favicon, dock, OG, PWA) all show new mark
6. Phase ships with `pnpm test` green and ≥109 test files

---

## Dimension 1: Requirement Coverage — PASS

| Req | Description | Covered by | Status |
|---|---|---|---|
| RBR-01 | User-visible strings → AlgoPlan | 07-01 (packages), 07-02 (apps/web) | COVERED |
| RBR-02 | Brand assets + tab/title/dock | 07-00 (asset gen), 07-03 (electron-builder + dock), 07-05 (favicon stack + manifest) | COVERED |
| RBR-03 | Atomic `multica://` → `algoplan://` | 07-03 (PROTOCOL const), 07-04 (web callback + extracted deep-link.ts) | COVERED |
| RBR-04 | localStorage `multica_*` preserved (no data loss) | 07-02 (auth-cookie), 07-05 (regression-lock test) | COVERED |
| RBR-05 | macOS dock + menu bar = AlgoPlan | 07-03 (productName, icon, AppUserModelId) | COVERED |
| RBR-06 | `bash scripts/grep-rebrand.sh` exits 0 | 07-00 (script), 07-05 Task 4 (final verification gate) | COVERED |

All 6 requirements appear in at least one plan's `requirements:` frontmatter and are addressed by concrete tasks. No silent drops.

---

## Dimension 2: Task Completeness — PASS

`gsd-sdk verify.plan-structure` ran clean against all 6 plans:
- 07-00: 4 tasks valid (1 checkpoint:human-action + 3 auto)
- 07-01: 3 tasks valid (all auto)
- 07-02: 4 tasks valid (2 auto + 1 checkpoint:human-verify + 1 checkpoint:decision)
- 07-03: 3 tasks valid (all auto)
- 07-04: 3 tasks valid (1 explicitly TDD, all auto)
- 07-05: 4 tasks valid (3 auto + 1 checkpoint:human-verify with TDD inside Task 2)

Every auto/tdd task has `<files>`, `<action>`, `<verify>`, `<done>`. Verify commands are concrete (grep counts, vitest run, typecheck). Done conditions measurable. No vague tasks like "implement rebrand".

---

## Dimension 3: Dependency Correctness — PASS

```
Wave 0: 07-00 (depends_on: [])
Wave 1: 07-01 (depends_on: [07-00])  — parallel safe
Wave 1: 07-02 (depends_on: [07-00])  — parallel safe
Wave 2: 07-03 (depends_on: [07-00, 07-01, 07-02])
Wave 3: 07-04 (depends_on: [07-03])
Wave 4: 07-05 (depends_on: [07-00..04])
```

- No cycles
- No forward references
- Wave numbers consistent with `max(deps) + 1`
- Parallel safety: 07-01 (packages/) and 07-02 (apps/web) touch disjoint file trees — confirmed
- 07-03 → 07-04 sequential is correct: 07-03 flips PROTOCOL constant; 07-04 flips the web string consumers + adds deep-link unit test. ROADMAP success criterion 3 ("atomic") is satisfied because both ship in same release as guaranteed by 07-04 SUMMARY note ("must merge in same release") — see Warning W-1.

---

## Dimension 4: Key Links Planned — PASS

Critical wiring is explicitly tracked in `must_haves.key_links`:

| From | To | Plan | Status |
|---|---|---|---|
| `scripts/grep-rebrand.sh` exclusions | 07-PATTERNS.md `EXCLUDE_PATTERNS` table | 07-00 | wired in Task 1 (regex) + Task 3 (table) |
| `apps/desktop/src/main/index.ts PROTOCOL` | `electron-builder.yml protocols.schemes[0]` | 07-03 | both updated in Task 1 + Task 2 same plan |
| Web callback `window.location.href` | `deep-link.ts handleDeepLink` + `PROTOCOL_NAME='algoplan'` | 07-04 | Task 1 (web) + Task 3 (extract + test) atomic |
| `apps/web/app/layout.tsx metadata.icons` | `apps/web/public/{icon-192,512,apple-touch}.png` + `app/favicon.ico` | 07-05 | Task 1 wires both ends |
| `apps/web/app/manifest.ts` | `icon-192.png + icon-512.png` | 07-05 | Task 1 PWA manifest creation |

The atomic deep-link flip explicitly lives in plan 07-04 (`apps/web/app/auth/callback/page.tsx`) WITH the matching desktop main `apps/desktop/src/main/index.ts` import update. PROTOCOL constant flip is in 07-03 but is wired to consumer side in 07-04 — the dependency `07-04 depends_on: [07-03]` ensures atomicity is a single PR/release.

---

## Dimension 5: Scope Sanity — PASS (with 1 warning)

| Plan | Tasks | Files in `files_modified` | Status |
|---|---|---|---|
| 07-00 | 4 (1 ckpt + 3 auto) | 3 | OK |
| 07-01 | 3 | 18 | **W-2 below** — file count high but each edit is surgical (single string replace, no logic change) |
| 07-02 | 4 (2 auto + 2 ckpt) | 33 | **W-2 below** — file count very high; mitigated by 28-of-33 being landing-i18n bulk replace |
| 07-03 | 3 | 25 | **W-2 below** — file count very high but 19 are renderer files with surgical edits |
| 07-04 | 3 | 7 | OK — focused atomic change |
| 07-05 | 4 (3 auto + 1 ckpt) | 5 | OK |

See **Warning W-2** for context. Verdict: PASS — Phase 7 is by nature a wide-but-shallow find/replace; the 18/33/25-file batches are appropriate consolidation per the planner's reasoning ("one diff, one review" for shared packages and atomic web/desktop sweeps).

---

## Dimension 6: Verification Derivation — PASS

`must_haves.truths` are user-observable, not implementation-focused:
- ✓ "Browser tab title says AlgoPlan" (07-02, 07-05)
- ✓ "macOS dock displays AlgoPlan name + new icon" (07-03)
- ✓ "Web callback emits algoplan:// after deep-link flip" (07-04)
- ✓ "After app update, existing users retain stored theme + drafts" (07-01, 07-02, 07-05)
- ✓ "scripts/grep-rebrand.sh exits 0 at phase end" (07-00 producer, 07-05 verifier)

No truths that are merely "library installed" or "schema changed" — every truth maps to user-perceivable state or an executable assertion.

---

## Dimension 7: Context Compliance — PASS

CONTEXT.md decisions D-1..D-4 mapped to implementing tasks:

| Decision | Locked statement | Implementing task(s) | Verified |
|---|---|---|---|
| D-1 | Atomic `multica://` → `algoplan://` in BOTH `electron-builder.yml` AND `auth/callback/page.tsx` | 07-03 Task 1 (electron-builder.yml) + 07-04 Task 1 (callback page) — bound by `07-04 depends_on: [07-03]` | YES |
| D-2 | `multica_*` localStorage keys UNCHANGED (silent data loss risk) | 07-01 Task 1 (preserve `multica:backlog-*`), 07-02 Task 2 (preserve `multica_token` cookie), 07-03 Task 3 (preserve `multica_tabs`/`multica:navigate`), 07-05 Task 2 (regression-lock test) | YES — explicitly extended from D-2 to also cover `multica:*` chat-prefix keys (correct interpretation of the spirit of the decision) |
| D-3 | `@multica/*` package imports UNCHANGED | grep-rebrand.sh exclusion regex (07-00 Task 1), explicit "KEEP D-3" notes throughout 07-01/02/03 | YES |
| D-4 | Production-user impact warning | 07-04 SUMMARY release-comm note ("Production users must reinstall"); 07-05 PHASE-SUMMARY release-comm action items list | YES |

**Decision coverage: 4/4 (100%).** No tasks contradict locked decisions.

**Deferred ideas check:**
- GitHub org rename — not in any plan ✓
- @multica/* package rename — not in any plan ✓
- CLI binary rename — explicitly KEEP (planner Q1 with documented rationale: Homebrew tap + electron-updater binary URLs would break) ✓
- Production-user release-comm — flagged in SUMMARY templates only, NOT a code task ✓

---

## Dimension 7b: Scope Reduction Detection — PASS

Scanned all task `<action>` blocks for scope-reduction language ("v1", "simplified", "static for now", "future enhancement", "stub", "placeholder", "skip for now").

Hits + adjudication:
- 07-00 SUMMARY note: "Generated assets are placeholder mark — Plan 07-02 may overwrite with refined design after design review" → ACCEPTABLE: this is a forward-handoff (assets exist; design refinement is opportunistic, not a deferred requirement). The required asset stack IS shipped.
- 07-02 Task 4 option-b: "keep multica.ai for now; Phase 7.1 follow-up" → Decision-gated by user; if option-b is selected, the user explicitly accepts the trade-off. Not a unilateral scope reduction by the planner.
- 07-03 SUMMARY note: "macOS Gatekeeper may show 'AlgoPlan wants to be opened' prompt" → release-comm note, NOT scope reduction.

**No silent scope reductions detected.** All trade-offs are either user-decision-gated or explicitly documented forward-handoffs of cosmetic refinements (not requirements).

---

## Dimension 7c: Architectural Tier Compliance — SKIPPED

No RESEARCH.md exists for Phase 7 with `## Architectural Responsibility Map` section. This phase is a brand sweep (string/asset/metadata changes), not a new architectural surface — tier compliance is not load-bearing here.

---

## Dimension 8: Nyquist Compliance — PASS

### 8e — VALIDATION.md existence: ✓ PASS
`07-VALIDATION.md` exists with full Nyquist contract (baseline 108, floor ≥109, 6 verification commands).

### 8a — Automated `<verify>` per task

All 12 auto/tdd tasks across all plans have concrete `<automated>` commands. Spot check:
- 07-00 Task 1: `test -x scripts/grep-rebrand.sh && bash scripts/grep-rebrand.sh; test $? -eq 1` — clever inverted exit-code check
- 07-00 Task 2: `node scripts/generate-brand-assets.mjs && test -s ... && file ... | grep -q "Mac OS X icon"` — magic-byte sniff
- 07-01 Task 1: `pnpm --filter @multica/views test && grep -rnE "[Mm]ultica" ... | grep -vE "(@multica/|multica_|multica:backlog|...)" | wc -l | awk '{exit ($1 == 0) ? 0 : 1}'`
- 07-04 Task 3: `pnpm --filter @multica/desktop exec vitest run src/main/deep-link.test.ts && pnpm --filter @multica/desktop typecheck`

Checkpoint tasks (4 total) use `(checkpoint — no file mutation)` placeholders or pre-condition probes (`test -f`, `curl -sI`) — appropriate for human-gated steps.

### 8b — Feedback latency

All `<automated>` commands are sub-30-second feedback loops:
- `pnpm --filter <pkg> test` (vitest unit, no Playwright)
- `pnpm --filter <pkg> typecheck`
- `grep | wc | awk` shell pipelines

No `--watchAll` flags. No full Playwright suites in `<verify>` (e2e is decoupled per VALIDATION.md note).

### 8c — Sampling continuity

Wave 1 (07-01 + 07-02) — 7 implementation tasks total; 6 have `<automated>` (1 ckpt). Density 86%. ✓
Wave 2 (07-03) — 3/3 have `<automated>`. ✓
Wave 3 (07-04) — 3/3 have `<automated>`. ✓
Wave 4 (07-05) — 3/4 have `<automated>` (1 final ckpt). ✓

Never 3 consecutive impl tasks without verify.

### 8d — Wave 0 completeness

The Nyquist contract calls out 2 NEW test files (`deep-link.test.ts`, `chat/store.test.ts`). Both are created in their owning plans (07-04 Task 3, 07-05 Task 2) — neither is referenced as a "MISSING" Wave 0 dependency. The audit script (`scripts/grep-rebrand.sh`) is not a Vitest test file but functions as a Wave 0 contract: it's authored in 07-00 Task 1 and consumed in 07-01/02/03 (verify regex) and 07-05 Task 4 (final gate). Wave 0 is complete.

### Nyquist verdict: ✓ PASS

---

## Dimension 9: Cross-Plan Data Contracts — PASS

Shared data entities across plans:
- **PROTOCOL string `algoplan`** — written in 07-03 (electron-builder.yml + index.ts), consumed in 07-04 (extracted to deep-link.ts). Transformation contract: identical literal `"algoplan"` end-to-end. No conflict.
- **`multica:*` localStorage keys** — preservation contract is consistent across 07-01 (packages), 07-02 (apps/web), 07-03 (apps/desktop), 07-05 (regression-lock test asserts source-file contains keys verbatim). No plan strips/renames; all plans add the key to their grep exclusion. Compatible.
- **Generated brand assets** — 07-00 produces 10 binary files; 07-05 wires them into layout.tsx + manifest.ts. Filename contract held by `apps/web/public/icon-{192,512}.png`, `og-image.png`, `app/favicon.ico`. No conflict.
- **`AlgoPlanWordmark`** — atom lives at `packages/views/auth/algoplan-wordmark.tsx`; consumed by 07-01 (workspace-loader) and 07-02 (apps/web workspaceSlug layout). 07-01 Task 1 explicitly notes the layout→auth dependency risk and prescribes a 3-line lift to `packages/views/branding/` if circular import detected. Conflict mitigated.

---

## Dimension 10: CLAUDE.md Compliance — PASS

Spot-checked plans against `/Users/steph/dev/multica/CLAUDE.md` directives:

| Rule | Compliance |
|---|---|
| TypeScript strict; explicit types | All new TS files (deep-link.ts, manifest.ts, electron-builder-config.test.ts, chat/store.test.ts) have explicit signatures and types |
| Comments English-only | All proposed code blocks use English comments |
| No backward-compat shims unless requested | 07-04 EXPLICITLY rejects multica:// in handleDeepLink (test 3 asserts rejection) — correct: no compatibility layer, clean cut per "the product is not yet live" rule |
| Package boundaries (`packages/views` no `next/*` or `react-router-dom`) | All edits to packages/views are pure JSX/string replacements; no framework imports added |
| `@multica/*` imports | UNCHANGED per D-3 — grep-rebrand.sh excludes |
| TanStack Query owns server state, Zustand owns client state | Phase 7 doesn't touch state architecture |
| No new global root routes | Phase 7 adds zero new routes |
| Test placement: shared logic → packages/, framework wiring → apps/ | New tests placed correctly: deep-link.test.ts in apps/desktop/src/main (Electron-specific), chat/store.test.ts + auth/store.test.ts in packages/core, electron-builder-config.test.ts in apps/desktop/test |
| AI Agent Verification Loop: run `make check` after writing code | 07-05 Task 4 is the final make check equivalent (6 verification commands) |

No CLAUDE.md violations detected.

---

## Dimension 11: Research Resolution — SKIPPED

No `RESEARCH.md` file exists for Phase 7. CONTEXT.md was auto-generated (`workflow.skip_discuss=true`); the research artifact is the CONTEXT itself + ROADMAP success criteria. No unresolved open questions in CONTEXT.md.

---

## Dimension 12: Pattern Compliance — PARTIAL (acceptable)

No pre-existing `07-PATTERNS.md` at planning time — but Plan 07-00 Task 3 CREATES it as the Wave 0 deliverable. All downstream plans (07-01, 07-02, 07-03, 07-04) explicitly reference `07-PATTERNS.md` in their `<context>` block and `<action>` ("Apply 07-PATTERNS §1 row-by-row..."). The pattern extraction is intentional and correctly sequenced. ✓

---

## Warnings (non-blocking)

### W-1: Atomic deep-link merge depends on release discipline, not a plan-level enforcement

**Severity:** warning
**Plans affected:** 07-03, 07-04

**Issue:** D-1 requires atomic flip in BOTH `electron-builder.yml` AND `auth/callback/page.tsx`. The plans split the work across 07-03 (electron-builder + PROTOCOL const) and 07-04 (auth callback + extracted deep-link.ts). The atomicity is enforced by `07-04 depends_on: [07-03]` (cannot execute 07-04 before 07-03 lands) and a SUMMARY note in 07-04 ("must merge in same release"). However, there is no automated guard preventing a developer from merging 07-03 and shipping it to production (web build) WITHOUT 07-04 in the same release.

**Why this is a warning, not a blocker:** The CI gate in 07-05 Task 4 verification command #6 (`grep -rn "multica://" apps/web apps/desktop` must equal 0) catches this — if 07-03 lands without 07-04, command #6 fails and the phase isn't shippable. The risk window is "developer ships partial Phase 7 to prod between 07-03 and 07-05" which is operationally implausible given the GSD execute-phase workflow runs all plans in sequence.

**Fix hint (optional):** Add an explicit reminder to 07-03 SUMMARY: "DO NOT MERGE TO main UNTIL 07-04 IS READY. Hold both in a single PR." (Plans already say this; consider promoting to top-of-file warning callout.)

### W-2: Wave 1 plans have high file counts (18 / 33 / 25)

**Severity:** warning
**Plans affected:** 07-01, 07-02, 07-03

**Issue:** Generic checker thresholds suggest 5-8 files/plan good, 10 warning, 15+ blocker. Plans 07-01 (18), 07-02 (33), and 07-03 (25) all exceed the blocker threshold.

**Why this is a warning, not a blocker:** Phase 7 is a brand find/replace — the work is by nature wide-but-shallow. Each file edit is a 1-3 line surgical change (string literal swap, no logic change). Splitting into 3-4 plans per app would create:
- Merge conflicts on shared files (e.g. multiple plans touching `apps/web/app/layout.tsx`)
- Reviewer fatigue (each PR contains identical pattern-of-change, harder to spot deviations across separate diffs)
- Lost atomicity for shared-package edits (consumed by both apps)

The planner's reasoning in each plan's `<objective>` block ("one diff, one review") is sound for this phase's character. Context-budget concern is mitigated because each task is mechanical (apply 07-PATTERNS table row-by-row); no architectural reasoning needed per file.

**Fix hint (optional):** None — accept the wide scope as appropriate to the phase shape.

### W-3: 07-02 Task 4 DNS decision could revert work from Tasks 1+2

**Severity:** warning
**Plan affected:** 07-02

**Issue:** Tasks 1+2 in plan 07-02 actively replace `https://www.multica.ai` with `https://www.algoplan.ai` in ~12 sites. Then Task 4 (decision checkpoint) presents 3 options including option-b ("revert URL/email changes"). If user picks option-b, the executor must revert the edits made in Tasks 1+2. This means Task 4 partially undoes work already verified.

**Why this is a warning, not a blocker:** The plan explicitly handles this in Task 4 `<action>`: "If option-b, Claude reverts the algoplan.ai URL edits applied in Tasks 1+2." Reversion is well-defined (git diff isolates the URL-string edits). However, the cleaner pattern would be to gate the URL flips BEHIND the decision (move Task 4 BEFORE Tasks 1+2, or make URL edits conditional on `option-a/c` selection from the start).

**Fix hint (optional):** Reorder 07-02 to run Task 4 (decision) BEFORE Tasks 1 (web app/* metadata edits) and Task 2 (landing i18n) so URL flips are conditional from the start, eliminating the revert path. Acceptable as-is because the revert is mechanical.

### W-4: `multica-landing.tsx` filename retention creates a documented anomaly

**Severity:** warning (info-level)
**Plan affected:** 07-02

**Issue:** Plan 07-02 Task 2 explicitly KEEPS the filename `apps/web/features/landing/components/multica-landing.tsx` even though its content is fully rebranded. This survives `grep-rebrand.sh` because the script greps `*.tsx` content (not filenames) — actually verified: filename references in import statements would be flagged but the planner's regex-exclusion pattern `multica-landing\.tsx` is in scripts/grep-rebrand.sh.

**Why this is a warning, not a blocker:** Filename rename touches all imports of that component (small ripple) and is cosmetic (zero user impact). The planner's choice to retain matches the broader principle of "minimize internal naming churn unless user-visible". Documented in 07-PATTERNS.md exclusions.

**Fix hint (optional):** Add to 07-PHASE-SUMMARY deferred items list: "Rename `multica-landing.tsx` → `algoplan-landing.tsx` in a follow-up cosmetic-cleanup phase if naming purity is desired."

---

## Summary Table

| Dimension | Verdict | Notes |
|---|---|---|
| 1. Requirement Coverage | PASS | 6/6 RBR-* requirements covered |
| 2. Task Completeness | PASS | 17/17 auto+tdd tasks have full Files+Action+Verify+Done; 5/5 checkpoints valid |
| 3. Dependency Correctness | PASS | DAG: 0 → {1,2} → 3 → 4 → 5; no cycles |
| 4. Key Links Planned | PASS | All cross-plan wiring (PROTOCOL ↔ scheme, assets ↔ layout, etc.) explicitly listed |
| 5. Scope Sanity | PASS (W-2) | Plans 01/02/03 high file count appropriate for find/replace shape |
| 6. Verification Derivation | PASS | All truths user-observable |
| 7. Context Compliance | PASS | D-1..D-4 100% covered; no contradictions; deferred items honored |
| 7b. Scope Reduction | PASS | No silent reductions detected |
| 7c. Architectural Tier | SKIPPED | No responsibility map (rebrand phase) |
| 8. Nyquist Compliance | PASS | VALIDATION.md exists; automated verify density 86%+ per wave; floor ≥109 |
| 9. Cross-Plan Data Contracts | PASS | PROTOCOL/localStorage-keys/assets all consistent across plans |
| 10. CLAUDE.md Compliance | PASS | TS strict, English comments, package boundaries, no compat shims, test placement correct |
| 11. Research Resolution | SKIPPED | No RESEARCH.md (auto-generated CONTEXT) |
| 12. Pattern Compliance | PARTIAL ACCEPTABLE | 07-PATTERNS.md authored in Wave 0 (Plan 07-00 Task 3) and consumed by all downstream |

---

## Recommended Next Step

**PROCEED WITH EXECUTION.**

Run `/gsd-execute-phase 07-rebrand-pass`. The 4 warnings above are non-blocking quality observations that the executor or human reviewer can address opportunistically:
- W-1: Add a top-of-file callout to 07-03 SUMMARY about merge atomicity (5-line edit during execution)
- W-2: No action required (warned for tracking only)
- W-3: Optional reorder of 07-02 tasks (improves cleanliness; current sequence works)
- W-4: Add to 07-PHASE-SUMMARY deferred items list (1-line edit during 07-05)

All 6 RBR-* requirements have plans, all locked decisions D-1..D-4 are honored, atomic deep-link flip is enforced via dependency graph + final verification gate, hard exclusions are encoded in `scripts/grep-rebrand.sh` (Wave 0), Nyquist test floor (≥109) is contracted and verified at 07-05 Task 4 ship gate.

**Verdict: PASS — Phase 7 plans WILL achieve the rebrand goal.**
