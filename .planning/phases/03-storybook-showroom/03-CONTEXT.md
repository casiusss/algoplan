# Phase 3: Storybook Showroom - Context

**Gathered:** 2026-04-25
**Status:** Ready for planning
**Mode:** Auto-generated (discuss skipped via workflow.skip_discuss)

<domain>
## Phase Boundary

`apps/showroom` is a running Storybook 9 instance that renders stories for all Phase 2 atoms with live theme toggle and WCAG panel — providing a visual review sandbox before any app-level view work begins.

**Requirements:** SB-01, SB-02, SB-03, SB-04
**Depends on:** Phase 2 (atoms exist + Phase 1 tokens wired)

</domain>

<decisions>
## Implementation Decisions

### Claude's Discretion
All implementation choices are at Claude's discretion — discuss phase was skipped per user setting. Use ROADMAP phase goal, success criteria, and codebase conventions to guide decisions.

</decisions>

<code_context>
## Existing Code Insights

Codebase context will be gathered during plan-phase research.

</code_context>

<specifics>
## Specific Ideas

Success criteria from ROADMAP:

1. Running `pnpm --filter @multica/showroom storybook` starts Storybook with zero console errors about missing env vars or API client init
2. Clicking the theme toggle in Storybook switches all stories between light and dark mode correctly — `bg-sidebar` renders deep-forest-green in dark mode, not transparent
3. The a11y panel shows zero critical WCAG violations on all four Phase 2 atom stories
4. Stories import real component source from `packages/ui/` — no mocked component implementations, only mocked providers

</specifics>

<deferred>
## Deferred Ideas

None — discuss phase skipped.

</deferred>
