// UI-SPEC §4 — SegmentedControl stories (Default, TwoOptions, WithDisabled, KeyboardInstructions).
// Atom source: @multica/ui/components/ui/segmented-control (real source).
//
// SegmentedControl is controlled — atom does NOT manage its own value state.
// We use `useArgs` from `storybook/preview-api` (NOT @storybook/preview-api per
// RESEARCH §Pitfall 1) so the args panel reflects the live value during interaction.
//
// Render functions are named (capitalized `Render`) to satisfy
// react-hooks/rules-of-hooks (the rule fires on lowercase `render`).
//
// `args.children` and `args.onValueChange` are placeholders that satisfy the atom's
// required-prop type contract. The `render` function overrides them at runtime so
// the actual children + handler come from there — the args values are never used.
import type { Meta, StoryObj } from "@storybook/react-vite"
import { useArgs } from "storybook/preview-api"

import {
  SegmentedControl,
  SegmentedControlItem,
} from "@multica/ui/components/ui/segmented-control"

const meta = {
  title: "Atoms / SegmentedControl",
  component: SegmentedControl,
} satisfies Meta<typeof SegmentedControl>

export default meta
type Story = StoryObj<typeof meta>

// Placeholders — see top-of-file comment.
const noopChange = (_value: string) => {}
const placeholderChildren = <></>

// P0/P1/P2/P3 priority picker — UI-SPEC §4 Default.
export const Default: Story = {
  args: {
    value: "P0",
    "aria-label": "Issue priority",
    onValueChange: noopChange,
    children: placeholderChildren,
  },
  render: function Render(args) {
    const [{ value }, updateArgs] = useArgs<{ value: string }>()
    return (
      <SegmentedControl
        {...args}
        value={value}
        onValueChange={(next) => updateArgs({ value: next })}
      >
        <SegmentedControlItem value="P0">P0</SegmentedControlItem>
        <SegmentedControlItem value="P1">P1</SegmentedControlItem>
        <SegmentedControlItem value="P2">P2</SegmentedControlItem>
        <SegmentedControlItem value="P3">P3</SegmentedControlItem>
      </SegmentedControl>
    )
  },
}

// Board / List view-mode toggle — UI-SPEC §4 TwoOptions (Phase 5 use case).
export const TwoOptions: Story = {
  args: {
    value: "Board",
    "aria-label": "View mode",
    onValueChange: noopChange,
    children: placeholderChildren,
  },
  render: function Render(args) {
    const [{ value }, updateArgs] = useArgs<{ value: string }>()
    return (
      <SegmentedControl
        {...args}
        value={value}
        onValueChange={(next) => updateArgs({ value: next })}
      >
        <SegmentedControlItem value="Board">Board</SegmentedControlItem>
        <SegmentedControlItem value="List">List</SegmentedControlItem>
      </SegmentedControl>
    )
  },
}

// P3 disabled — visually faded; not focusable via arrow keys (atom enforces).
export const WithDisabled: Story = {
  args: {
    value: "P0",
    "aria-label": "Issue priority",
    onValueChange: noopChange,
    children: placeholderChildren,
  },
  render: function Render(args) {
    const [{ value }, updateArgs] = useArgs<{ value: string }>()
    return (
      <SegmentedControl
        {...args}
        value={value}
        onValueChange={(next) => updateArgs({ value: next })}
      >
        <SegmentedControlItem value="P0">P0</SegmentedControlItem>
        <SegmentedControlItem value="P1">P1</SegmentedControlItem>
        <SegmentedControlItem value="P2">P2</SegmentedControlItem>
        <SegmentedControlItem value="P3" disabled>
          P3
        </SegmentedControlItem>
      </SegmentedControl>
    )
  },
}

// Documentation aid — keyboard navigation is asserted by Phase 2 tests, not by the story.
export const KeyboardInstructions: Story = {
  args: {
    value: "P0",
    "aria-label": "Issue priority",
    onValueChange: noopChange,
    children: placeholderChildren,
  },
  render: function Render(args) {
    const [{ value }, updateArgs] = useArgs<{ value: string }>()
    return (
      <section className="p-6 flex flex-col gap-3">
        <SegmentedControl
          {...args}
          value={value}
          onValueChange={(next) => updateArgs({ value: next })}
        >
          <SegmentedControlItem value="P0">P0</SegmentedControlItem>
          <SegmentedControlItem value="P1">P1</SegmentedControlItem>
          <SegmentedControlItem value="P2">P2</SegmentedControlItem>
          <SegmentedControlItem value="P3">P3</SegmentedControlItem>
        </SegmentedControl>
        <p className="text-xs text-muted-foreground">
          Tab to focus. ←/→ to move selection. Home/End to jump. Space to activate.
        </p>
      </section>
    )
  },
}
