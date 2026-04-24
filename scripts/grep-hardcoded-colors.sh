#!/usr/bin/env bash
set -euo pipefail

# One-shot post-Phase-1 verification: zero hardcoded Tailwind color classes
# in shared packages. NOT a CI rule (per CONTEXT D-19); intended for manual
# pre-merge validation.
#
# Documented exceptions (the script does NOT special-case these — reviewer
# must visually confirm any remaining hits fall into one of these buckets):
#   - apps/web/app/(landing)/**            — landing palette out of scope (not scanned)
#   - packages/views/settings/components/appearance-tab.tsx
#       LIGHT_COLORS / DARK_COLORS / macOS traffic-light hex (arbitrary-value
#       brackets like bg-[#ff5f57] — won't match this regex anyway)
#
# Phase 1 Plan 04 migrates the 22 violations across 8 files documented in
# RESEARCH §"Hardcoded Color Violation Map". After Plan 04 ships this script
# must exit 0.

PATTERN='\b(text|bg|border|ring|fill|stroke|from|to|via|outline|decoration|divide|placeholder|caret|accent|shadow)-(red|blue|yellow|green|orange|purple|pink|indigo|amber|emerald|cyan|teal|sky|violet|fuchsia|rose|lime)-[0-9]+'

if grep -rn -E "${PATTERN}" packages/views packages/ui; then
  echo ""
  echo "✗ Hardcoded Tailwind color classes found in shared packages." >&2
  echo "  Migrate to semantic tokens (text-info / bg-success / bg-tag-p0 etc.)." >&2
  echo "  See .planning/phases/01-token-foundation-typography/01-PATTERNS.md" >&2
  echo "      §'Hardcoded color migrations' for the migration table." >&2
  exit 1
fi

echo "✓ No hardcoded Tailwind color classes in packages/views or packages/ui."
exit 0
