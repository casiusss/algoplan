# Phase 7 — Deferred Items

Out-of-scope discoveries during phase execution. Per gsd-executor SCOPE BOUNDARY rule, these are logged but NOT fixed by Phase 7 plans.

| Discovered in | Item | Reproducer | Owner |
|---|---|---|---|
| Plan 07-00 (overall verification) | Pre-existing typecheck error: `apps/desktop/src/renderer/src/components/pageview-tracker.tsx:60:47` — `error TS2366: Function lacks ending return statement and return type does not include 'undefined'`. Reproduces against baseline `5b2d929d` (before any Phase 7 work). Introduced by `205e8c1e feat(analytics): client_type super-property + Desktop $pageview (MUL-1253)`. Unrelated to Phase 7 scope (Plan 07-00 only adds `scripts/`, brand assets, and `07-PATTERNS.md`). | `git checkout 5b2d929d -- apps/desktop/src/renderer/src/components/pageview-tracker.tsx && pnpm --filter @multica/desktop run typecheck:web` | Analytics owner / future maintenance plan |
