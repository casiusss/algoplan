#!/usr/bin/env bash
# Phase 4 invariant (UI-SPEC SC#4 + Pitfall 1):
# No file in packages/views/dashboard-shell/ may call useWorkspaceId().
# Sub-components MUST receive wsId as a prop. AppSidebar root is the only
# place allowed to call useCurrentWorkspace() (separate concern).
set -euo pipefail
if grep -rn --include='*.ts' --include='*.tsx' 'useWorkspaceId(' packages/views/dashboard-shell/ 2>/dev/null; then
  echo "ERROR: useWorkspaceId() detected inside packages/views/dashboard-shell/" >&2
  echo "       Sub-components must receive wsId as a prop (UI-SPEC SC#4)." >&2
  exit 1
fi
echo "OK: no useWorkspaceId() calls in dashboard-shell/"
