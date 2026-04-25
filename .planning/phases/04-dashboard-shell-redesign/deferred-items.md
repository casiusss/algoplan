# Phase 4 — Deferred Items

Out-of-scope discoveries logged during execution. NOT to be fixed by the
phase 4 executor — surface to backlog grooming.

| Found in | File | Issue | Notes |
|----------|------|-------|-------|
| Plan 01 typecheck | `packages/ui/components/ui/calendar.tsx:141` | `error TS2322: Type 'React.Ref<HTMLDivElement>' is not assignable…` ("Two different types with this name exist, but they are unrelated") — looks like duplicate `@types/react` package version drift, not a real bug | Pre-existing on `feat/repos-per-project` HEAD; reproducible without Plan 01 changes. Out of scope per Plan 01 SCOPE BOUNDARY. |
