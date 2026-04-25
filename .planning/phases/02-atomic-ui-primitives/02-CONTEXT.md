# Phase 2: Atomic UI Primitives - Context

**Gathered:** 2026-04-25
**Status:** Ready for planning
**Mode:** Auto-generated (discuss skipped via workflow.skip_discuss)

<domain>
## Phase Boundary

The four new atomic components (`TagChip`, `AccentBar`, `AvatarInitial`, `SegmentedControl`) exist in `packages/ui/components/ui/`, are keyboard-accessible, and pass Vitest tests in both light and dark mode — ready for any view phase to import.

**Requirements:** UI-01, UI-02, UI-03, UI-04
**Depends on:** Phase 1 (token foundation)

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

1. A developer can render `<TagChip color="tag-p0" />` and see the correct priority red in both light and dark mode without touching any hex value
2. `<SegmentedControl>` responds to arrow keys and Tab — keyboard navigation moves selection without mouse (WCAG keyboard accessible)
3. `<AvatarInitial name="Stephan" />` deterministically produces the same color for the same name across renders (no randomness)
4. Vitest tests for all four components pass with zero failures; components are imported from `packages/ui` with zero `next/*` or `react-router-dom` dependencies

</specifics>

<deferred>
## Deferred Ideas

None — discuss phase skipped.

</deferred>
