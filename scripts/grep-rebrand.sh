#!/usr/bin/env bash
set -euo pipefail

# Phase 7 rebrand audit — exits 0 when no user-visible "Multica" leaks remain.
# Run manually before merging Phase 7 PR. NOT a CI rule (per Phase 1 D-19
# precedent). Documented exclusions reflect Phase 7 hard scope:
#
#   PRESERVED (NOT a leak):
#     - @multica/*                    package imports — internal monorepo names (D-3)
#     - multica_*                     localStorage keys — silent data loss risk (D-2)
#     - multica:chat / multica:backlog localStorage keys (colon-prefixed) — same (D-2 extended)
#     - multica:navigate              custom DOM event — internal pub/sub
#     - MULTICA_*                     env var names — would break user .env files (D-2 extended)
#     - ai.multica.desktop            Electron appId (FLIPPED to ai.algoplan.desktop in Plan 07-03; before that, allowed)
#     - multica-ai/multica            git remote / GitHub org — out of scope (D-4)
#     - multica.git                   repo URL fragment — out of scope (D-4)
#     - multica-desktop-              electron-builder artifactName template — internal release filename
#     - multica-cli-                  CLI release archive filename prefix (matches Goreleaser output) — internal
#     - .multica                      ~/.multica config dir on disk — kept per planner Q1
#     - "multica"/"multica.exe"       CLI binary basenames — kept per planner Q1
#     - server/cmd/multica            CLI binary path — kept per planner Q1
#     - multica setup / daemon / ...  CLI subcommand strings (rendered in onboarding/runtime UI)
#                                     — kept per planner Q1 (CLI binary `multica` stays)
#     - MulticaIcon / multica-icon    aesthetic asterisk component — kept verbatim
#     - reserved-slugs.ts             "multica" anti-impersonation slug — kept (alongside new "algoplan")
#     - "Multica → AlgoPlan"          regression-lock test descriptions referencing both names
#     - "(not multica)"               regression-lock assertion strings asserting the negative state
#     - deep-link.test.ts             entire file is a regression-lock contract — every "multica" hit is an
#                                     intentional negative-case fixture asserting the legacy scheme is REJECTED (Plan 07-04)
#     - "repo: multica" / repo: "multica"  electron-builder publish.repo — kept (D-4)
#     - multica-static.copilothub.ai  JSDoc example CDN hostname — documentation, not production
#     - multica-locale                cookie name for landing-page locale persistence (D-2 ext.) — silent loss of language pref
#     - MulticaLanding                landing component function name — file rename out of plan scope (07-02 plan body)
#
# See .planning/phases/07-rebrand-pass/07-PATTERNS.md for the full rules.

TARGETS="apps/web apps/desktop packages/views packages/ui packages/core"

# Single OR-regex of preserved patterns. Lines matching ANY of these are dropped.
EXCLUDE='(@multica/|multica_[a-zA-Z]|multica_\$|multica_<|multica:chat|multica:backlog|multica:navigate|multica-locale|MULTICA_|ai\.multica|multica-ai|multica\.git|multica-desktop-|multica-cli-|server/cmd/multica|multica setup|multica daemon|multica agent|multica config|multica update|multica CLI|"multica"|"multica\.exe"|\.multica/|\.multica"|\.multica,|\.multica`|\.multica .|bin/multica|MulticaIcon|MulticaLanding|multica-landing|multica-icon\.tsx|multica-static|reserved-slugs|/multica workspaces|multica.*brand slugs are reserved|legacy brand name|`multica`|RESERVED_SLUGS.has..multica..|Multica → AlgoPlan|not multica|repo: multica|repo..multica|"multica\.git")'

HITS=$(grep -rnE "[Mm]ultica" $TARGETS \
  --include="*.tsx" --include="*.ts" --include="*.json" --include="*.yml" \
  --include="*.yaml" --include="*.css" --include="*.html" --include="*.md" \
  --include="*.go" 2>/dev/null \
  | grep -v node_modules | grep -v "\.next" | grep -v "\.turbo" \
  | grep -v "deep-link\.test\.ts" \
  | grep -vE "$EXCLUDE" || true)

if [ -n "$HITS" ]; then
  COUNT=$(printf "%s\n" "$HITS" | wc -l | tr -d ' ')
  echo "✗ User-visible 'Multica' references remain ($COUNT lines):" >&2
  printf "%s\n" "$HITS" >&2
  echo >&2
  echo "  Each line above is either:" >&2
  echo "    (a) a string that should be 'AlgoPlan' — replace it, OR" >&2
  echo "    (b) a NEW exclusion pattern that should be added to this script." >&2
  echo "  See .planning/phases/07-rebrand-pass/07-PATTERNS.md for the rules." >&2
  exit 1
fi

echo "✓ No user-visible 'Multica' references found in scanned targets."
echo "  (Excluded: @multica/ imports, multica_* / multica:* keys, MULTICA_ env, internal IDs.)"
exit 0
