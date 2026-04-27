#!/usr/bin/env bash
# Phase 8 ship-gate verification.
#
# Asserts that the v0.5.0 internal-rebrand release meets all 6 success
# criteria from the Phase 8 ROADMAP entry. Run as the final gate before
# `git tag v0.5.0`.
#
# Exit code: 0 on full pass, 1 on any failure.
#
# Requirements covered: RBR-07, RBR-08, RBR-09, RBR-10, RBR-11, RBR-12, RBR-13, RBR-14

set -euo pipefail

# Color helpers (NO_COLOR honored)
if [[ -t 1 && "${NO_COLOR:-0}" != "1" ]]; then
    GREEN="$(printf '\033[0;32m')"
    RED="$(printf '\033[0;31m')"
    RESET="$(printf '\033[0m')"
else
    GREEN=""; RED=""; RESET=""
fi

PASS_COUNT=0
FAIL_COUNT=0
FAIL_DETAILS=()

check() {
    local name="$1"
    local cmd="$2"
    printf "%-70s" "  ▸ $name"
    # Run in a subshell so that `cd` inside the cmd does not affect
    # the script's working directory for subsequent checks.
    if (eval "$cmd") >/dev/null 2>&1; then
        echo "${GREEN}PASS${RESET}"
        PASS_COUNT=$((PASS_COUNT + 1))
    else
        echo "${RED}FAIL${RESET}"
        FAIL_COUNT=$((FAIL_COUNT + 1))
        FAIL_DETAILS+=("$name -- run: $cmd")
    fi
}

echo "================================================================"
echo "Phase 8 ship gate — verifying v0.5.0 readiness"
echo "================================================================"

# ---- Check 1: pnpm install + typecheck + test all green (D-1, RBR-07) ------
echo ""
echo "Check 1 — pnpm install, typecheck, test all green (D-1, RBR-07)"

check "pnpm install resolves cleanly" \
    "pnpm install --frozen-lockfile=false"

check "pnpm typecheck across all packages" \
    "pnpm typecheck"

check "pnpm test across all packages" \
    "pnpm test"

check "Zero @multica/ imports remain in source" \
    "! grep -rln '@multica/' packages apps scripts --include='*.ts' --include='*.tsx' --include='*.mjs' --include='*.js' --include='*.cjs' 2>/dev/null | grep -v '/out/' | grep -v '/dist/' | grep -v '/.next/'"

check "All 9 workspace packages declare @algoplan/ scope" \
    "test \"\$(grep -rl '\"name\": \"@algoplan/' package.json packages/*/package.json apps/*/package.json 2>/dev/null | wc -l | tr -d ' ')\" -ge 9"

# ---- Check 2: localStorage migration round-trip (D-2, RBR-08) ---------------
echo ""
echo "Check 2 — localStorage migration shim works (D-2, RBR-08)"

check "migrateLocalStorage helper exists and exports correctly" \
    "test -f packages/core/migrations/localstorage.ts && grep -q 'export function migrateLocalStorage' packages/core/migrations/localstorage.ts"

check "Vitest migration tests pass" \
    "cd packages/core && pnpm exec vitest run migrations/localstorage.test.ts"

check "CoreProvider invokes migration before token read" \
    "awk '/migrateLocalStorage/{m=NR} /algoplan_token/{g=NR} END{exit !(m && g && m<g)}' packages/core/platform/core-provider.tsx"

check "Theme provider uses algoplan_theme storageKey" \
    "grep -q 'storageKey=\"algoplan_theme\"' packages/ui/components/common/theme-provider.tsx"

check "Auth store uses algoplan_token literal" \
    "grep -c 'algoplan_token' packages/core/auth/store.ts | grep -qE '^[5-9]|^[0-9]{2,}'"

# ---- Check 3: env-var dual-read shim works (D-3, RBR-09) --------------------
echo ""
echo "Check 3 — env-var dual-read shim active (D-3, RBR-09)"

check "config.GetEnv helper exists" \
    "test -f server/internal/config/env.go && grep -q 'func GetEnv' server/internal/config/env.go"

check "Go shim tests pass" \
    "cd server && go test ./internal/config/... -count=1"

check "Self-hoster vars use config.GetEnv (cmd_auth.go sample)" \
    "grep -E 'config\.GetEnv' server/cmd/algoplan/cmd_auth.go"

check "Zero os.Getenv(\"ALGOPLAN_\") literals in production Go (all must route through shim)" \
    "! grep -rln 'os\.Getenv(\"ALGOPLAN_' server/cmd server/internal --include='*.go' 2>/dev/null | grep -v -E '(_test\.go|internal/config/env\.go)'"

check "docker-compose uses ALGOPLAN_ variable names" \
    "! grep -E '^[[:space:]]*MULTICA_' docker-compose.selfhost.yml"

check ".env.example documents ALGOPLAN_ as primary" \
    "! grep -E '^MULTICA_' .env.example"

# ---- Check 4: CLI config-dir migration (D-4, RBR-10) -----------------------
echo ""
echo "Check 4 — CLI binary + config-dir migration (D-4, RBR-10)"

check "MigrateConfigDir helper exists" \
    "test -f server/internal/cli/configdir.go && grep -q 'func MigrateConfigDir' server/internal/cli/configdir.go"

check "configdir tests pass" \
    "cd server && go test ./internal/cli/... -run TestMigrateConfigDir -count=1"

check "cmd/algoplan directory exists with main.go" \
    "test -f server/cmd/algoplan/main.go"

check "main.go invokes MigrateConfigDir before rootCmd.Execute" \
    "awk '/cli\.MigrateConfigDir/{m=NR} /rootCmd\.Execute/{e=NR} END{exit !(m && e && m<e)}' server/cmd/algoplan/main.go"

check "config.go uses AlgoPlanConfigDirName" \
    "grep -q 'AlgoPlanConfigDirName' server/internal/cli/config.go"

check "make build produces both algoplan and multica binaries" \
    "make build && test -x server/bin/algoplan && test -x server/bin/multica"

check "multica shim prints deprecation and delegates" \
    "server/bin/multica version 2>&1 | grep -i deprecated > /dev/null"

# ---- Check 5: release pipeline configured for algoplan (D-5, D-6, RBR-11, RBR-12) ----
echo ""
echo "Check 5 — release pipeline ready for v0.5.0 (D-5, D-6, RBR-11, RBR-12)"

check "GoReleaser project_name is algoplan" \
    "grep -q '^project_name: algoplan' .goreleaser.yml"

check "GoReleaser builds.binary is algoplan" \
    "grep -q 'binary: algoplan' .goreleaser.yml"

check "Legacy archive template uses literal multica_ for backwards-compat" \
    "grep -E 'multica_' .goreleaser.yml"

check "Release workflow publishes algoplan-backend" \
    "grep -q 'algoplan-backend' .github/workflows/release.yml"

check "Release workflow publishes algoplan-web" \
    "grep -q 'algoplan-web' .github/workflows/release.yml"

check "Zero multica-{backend,web} substrings in release.yml" \
    "! grep -E 'multica-(backend|web)' .github/workflows/release.yml"

check "docker-compose default images use algoplan-{backend,web}" \
    "grep -E 'algoplan-(backend|web)' docker-compose.selfhost.yml"

check "releaseAssetCandidates returns algoplan-cli FIRST in update.go" \
    "awk '/releaseAssetCandidates/{f=1} f && /algoplan-cli/{a=NR} f && /multica-cli/{m=NR} END{exit !(a && m && a<m)}' server/internal/cli/update.go"

# ---- Check 6: grep audit + email FROM + hard-exclusion preservation (D-7, D-8, RBR-13, RBR-14) ----
echo ""
echo "Check 6 — final grep audit + email + hard-exclusion preservation (D-7, D-8, RBR-13, RBR-14)"

check "grep-rebrand.sh exits 0 (no user-visible Multica leaks)" \
    "bash scripts/grep-rebrand.sh"

check "Email service default sender is noreply@algoplan.ai" \
    "grep -q 'noreply@algoplan.ai' server/internal/service/email.go && ! grep -q 'noreply@multica.ai' server/internal/service/email.go"

check ".env.example RESEND_FROM_EMAIL uses algoplan.ai" \
    "grep -q 'noreply@algoplan.ai' .env.example"

# Hard-exclusion preservation (D-8):
check "D-8: multica-ai/multica git remote URL preserved in update.go" \
    "grep -q 'multica-ai/multica' server/internal/cli/update.go"

check "D-8: multica.ai cloud URL preserved in cmd_setup.go" \
    "grep -q 'api.multica.ai' server/cmd/algoplan/cmd_setup.go"

check "D-8: Go module declaration github.com/multica-ai/multica preserved in go.mod" \
    "grep -q '^module github.com/multica-ai/multica' server/go.mod"

check "D-8: .planning historical artifacts untouched" \
    "test -f .planning/phases/07-rebrand-pass/07-PHASE-SUMMARY.md && grep -q 'Multica' .planning/phases/07-rebrand-pass/07-PHASE-SUMMARY.md"

check "Cookie names preserved per Plan 08-05 deferral (multica_auth)" \
    "grep -q 'multica_auth' server/internal/auth/cookie.go"

check "Cookie names preserved per Plan 08-05 deferral (multica_csrf)" \
    "grep -q 'multica_csrf' server/internal/auth/cookie.go"

# B-03 removed: 'Test count >= 111' file-count gate is the wrong metric (test FILES != test CASES).
# Authority for test-count regression is Check 1 ('pnpm test across all packages') — pnpm exits non-zero on any failure.
# Phase 7 baseline test_floor_post: 111 (test cases). Adding a fragile file-count gate buys nothing.

# B-04: Workspace-scoped legacy localStorage keys must be zero in production source.
# Plan 08-04b ships migrateWorkspaceScopedKeys via WorkspaceRouteLayout; production code must not write
# 'multica_*:<slug>' or 'multica:*:<slug>' literals.
# Exclusions: migrations/localstorage (helper holds the legacy names), test fixtures, .planning/ historical artifacts.
check "B-04: zero workspace-scoped multica_*: literal references in production source" \
    "! grep -rEn 'multica_[a-z_]+:|multica:[a-z_:]+' packages apps --include='*.ts' --include='*.tsx' 2>/dev/null | grep -v -E '(\.test\.|migrations/localstorage|use-workspace-storage-migration)'"

echo ""
echo "================================================================"
echo "Phase 8 ship gate result: ${GREEN}${PASS_COUNT} pass${RESET}, ${RED}${FAIL_COUNT} fail${RESET}"
echo "================================================================"

if [[ $FAIL_COUNT -gt 0 ]]; then
    echo ""
    echo "${RED}Failures:${RESET}"
    for d in "${FAIL_DETAILS[@]}"; do
        echo "  x $d"
    done
    exit 1
fi

echo ""
echo "${GREEN}All Phase 8 ship-gate checks passed.${RESET}"
echo "Next: review SUMMARY, then \`git tag v0.5.0 && git push origin v0.5.0\`"
exit 0
