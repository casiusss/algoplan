# Phase 7 — Rebrand Pass: Validation Contract

**Authored:** 2026-04-26 (planner)
**Phase:** 07-rebrand-pass
**Purpose:** Nyquist gate — declare every test that must exist by phase end so executors cannot quietly drop coverage. Ship/no-ship enforcement runs `pnpm test` and counts.

---

## Baseline (pre-Phase-7 snapshot)

Captured 2026-04-26 (post-Phase-6, pre-Phase-7).

| Surface | Test files | Notes |
|---|---|---|
| `apps/web` (`*.test.tsx`/`.test.ts`) | covered by global `pnpm test` | layout, auth, callback, login |
| `apps/desktop` | covered by global `pnpm test` | external-url, version-decision, cli-release-asset |
| `packages/views` | covered by global `pnpm test` | auth/inbox/issues/settings/dashboard-shell, etc. |
| `packages/ui` | covered by global `pnpm test` | atoms (TagChip, AccentBar, AvatarInitial, SegmentedControl, etc.) |
| `packages/core` | covered by global `pnpm test` | auth/store, paths, storage-cleanup, navigation, realtime |
| **All packages combined** | **108 `*.test.{ts,tsx}` files** | (`find apps packages -name "*.test.ts" -o -name "*.test.tsx"`) |
| Playwright `e2e/*.spec.ts` | 13 spec files | not run by `pnpm test`; run via `pnpm exec playwright test` |

ROADMAP success criterion 5: *"`pnpm test` passes with at least as many tests as before the rebrand phase began."*

---

## Phase-7 test deltas (must exist at phase end)

### Plans that ADD tests

| Plan | New test file(s) | Asserts |
|---|---|---|
| **07-00** (Wave 0 audit + asset prep) | `scripts/grep-rebrand.sh` (no test file — script is the assertion; exits 0 = pass) | Zero user-visible "Multica" leaks across `apps/web` `apps/desktop` `packages/views` `packages/ui` `packages/core` after exclusion patterns |
| **07-04** (deep-link scheme atomic flip) | `apps/web/app/auth/callback/page.test.tsx` (existing — extended) | Asserts `algoplan://` redirect (NOT `multica://`); preserved `multica_*` localStorage |
| **07-04** | `apps/desktop/src/main/deep-link.test.ts` (NEW) | `handleDeepLink('algoplan://auth/callback?token=...')` invokes `webContents.send('auth:token', token)`; `multica://` URLs are rejected |
| **07-05** (test+localStorage preservation) | `packages/core/auth/store.test.ts` (existing — assertion-extended) | `multica_token` key preserved (NOT `algoplan_token`) — explicit regression lock |
| **07-05** | `packages/core/platform/storage-cleanup.test.ts` (existing — preserved as-is) | Verifies `multica_*` AND `multica:*` keys are cleaned with workspace suffix — confirms no rename happened |
| **07-05** | `packages/core/chat/store.test.ts` (NEW or extended) | Storage keys `multica:chat:*` preserved verbatim |

### Plans that EDIT existing test assertions (no count change)

| Plan | Test file | Change |
|---|---|---|
| **07-01** (string sweep — views) | `packages/views/dashboard-shell/app-sidebar.test.tsx:313` | Already-correct AlgoPlan regression assertion — no edit |
| **07-01** | `packages/views/chat/__tests__/*.test.tsx` (if present) | "Multica" → "AlgoPlan" in chat brand text assertions |
| **07-02** (web app strings + landing) | `apps/web/app/(auth)/login/page.test.tsx:90` | `getByText("Sign in to Multica")` → `getByText("Sign in to AlgoPlan")` |
| **07-02** | `apps/web/app/auth/callback/page.test.tsx` (any "Multica" string assertion) | "Multica" → "AlgoPlan" |
| **07-02** | `apps/web/features/landing/*.test.{ts,tsx}` (if any landing tests) | brand strings → AlgoPlan |
| **07-03** (metadata + assets) | `apps/desktop/test/electron-builder.test.ts` (NEW or extend) | Asserts `productName: "AlgoPlan"`, `appId: "ai.algoplan.desktop"`, `protocols.schemes: ["algoplan"]` |
| **07-05** | `e2e/auth.spec.ts:8` | `toContainText("Multica")` → `toContainText("AlgoPlan")` |

### Plans that REMOVE tests

None. Phase 7 is additive + edit-in-place; no test files are deleted.

---

## Required test count at phase end

```
baseline_test_files        = 108
plus_new_files             = 2  (apps/desktop/src/main/deep-link.test.ts; packages/core/chat/store.test.ts if not present)
expected_floor             = >= 109   (108 baseline + at least 1 net new; second new file may overlap an existing chat test)
```

**Hard floor:** `find apps packages -name "*.test.ts" -o -name "*.test.tsx" | grep -v node_modules | wc -l` MUST return **≥ 109** at phase end.

**Soft expectation:** ≥ 110 (counts both new files explicitly).

**`pnpm test` exit code:** 0. No skipped tests introduced by Phase 7.

**Playwright:** `e2e/auth.spec.ts` updated assertion still passes; no new spec files required (deep-link change is unit-tested in `deep-link.test.ts` since Electron deep links are not testable from a browser harness).

---

## Verification commands (executor must run all)

```bash
# 1. Test count floor (Nyquist gate)
test_count=$(find apps packages -name "*.test.ts" -o -name "*.test.tsx" | grep -v node_modules | grep -v "\.next" | wc -l | tr -d ' ')
test "$test_count" -ge 109 || { echo "✗ test count $test_count < 109 floor"; exit 1; }
echo "✓ test count: $test_count (floor 109)"

# 2. Brand grep audit (must exit 0 = no user-visible Multica leaks)
bash scripts/grep-rebrand.sh

# 3. Full TS test suite green
pnpm test

# 4. localStorage preservation regression assertion
grep -rn "multica_token\|multica_theme\|multica:chat:" packages/core apps/web apps/desktop --include="*.ts" --include="*.tsx" \
  | grep -v node_modules | grep -v "\.next" | grep -v "\.test\." | grep -v "rebrand" \
  | wc -l | xargs -I{} test {} -gt 0 \
  || { echo "✗ multica_* / multica:* localStorage keys missing — DATA LOSS RISK"; exit 1; }
echo "✓ multica_* / multica:* localStorage keys preserved"

# 5. @multica/* package imports preserved
grep -rn "from \"@multica/" apps packages --include="*.ts" --include="*.tsx" \
  | grep -v node_modules | wc -l | xargs -I{} test {} -gt 50 \
  || { echo "✗ @multica/* package imports missing — INTERNAL PACKAGES BROKEN"; exit 1; }
echo "✓ @multica/* package imports preserved"

# 6. Deep-link scheme atomically flipped
grep -rn "multica://" apps/web apps/desktop --include="*.ts" --include="*.tsx" --include="*.yml" \
  | grep -v node_modules | grep -v "\.next" | grep -v "\.test\." \
  | wc -l | xargs -I{} test {} -eq 0 \
  || { echo "✗ multica:// scheme still referenced in production code"; exit 1; }
echo "✓ algoplan:// scheme atomically applied"
```

All six checks MUST pass before Phase 7 is marked complete.

---

## Out-of-scope (NOT enforced by this contract)

- `apps/docs/` (fumadocs site) — separate publishing pipeline. Flagged for follow-up phase. Documented in 07-00-PLAN audit script via opt-in `--include-docs` flag.
- `apps/showroom/` — Storybook stories may reference "Multica" in comments. Out of scope; not user-facing in production.
- `multica.ai` domain URL (homepage, OG metadataBase, sitemap, support email) — DNS/marketing surface. Renamed to `algoplan.ai` in plan 07-02 conditionally; if domain not yet owned, executor MUST checkpoint before applying.
- CLI binary name `multica` (`server/cmd/multica`) — kept per planner decision Q1. Documented in SUMMARY.
- `MulticaIcon` component (`packages/ui/components/common/multica-icon.tsx`) — aesthetic asterisk icon, not the wordmark. Kept verbatim; existing `AlgoPlanWordmark` is the brand atom. Plan 07-01 swaps consumers (3 sites) from `MulticaIcon` to `AlgoPlanWordmark` where wordmark is appropriate; pure-icon usages keep `MulticaIcon` (file rename deferred — touches 5+ files for zero user impact).
- Custom DOM event `multica:navigate` — internal app pub/sub channel. Not user-visible; preserved.
- `multica` reserved-slug entry in `packages/core/paths/reserved-slugs.ts:31` — intentional anti-impersonation guard; keep both `multica` and add `algoplan`.
