#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
go run ./cmd/migrate down
go run ./cmd/migrate up
echo "058 rollback smoke OK"
