// UI-SPEC §1 — TagChip stories (Default, AllColors, WithRemove, Polymorphic).
// Atom source: @multica/ui/components/ui/tag-chip (real source — UI-SPEC §Hard Constraint #1).
//
// Storybook 9 subpath imports (NOT @storybook/test) per RESEARCH §Pitfall 1.
import type { Meta, StoryObj } from "@storybook/react-vite"
import { fn } from "storybook/test"

import { TagChip, type TagChipColor } from "@multica/ui/components/ui/tag-chip"

const meta = {
  title: "Atoms / TagChip",
  component: TagChip,
} satisfies Meta<typeof TagChip>

export default meta
type Story = StoryObj<typeof meta>

// The 5 colors locked by Phase 2 (UI-01) + UI-SPEC §1.
// Order matches the type definition for visual scannability.
const ALL_COLORS: readonly TagChipColor[] = [
  "tag-p0",
  "tag-p1",
  "tag-p2",
  "tag-p3",
  "brand",
] as const

export const Default: Story = {
  args: { color: "brand", children: "label" },
}

export const AllColors: Story = {
  // `args.color` satisfies TagChip's required-prop type contract; render() ignores it
  // because the story enumerates ALL_COLORS instead.
  args: { color: "brand" },
  render: () => (
    <section className="p-6 flex flex-col gap-3">
      <h2 className="text-sm font-semibold">Colors</h2>
      <div className="flex flex-wrap gap-2">
        {ALL_COLORS.map((c) => (
          <TagChip key={c} color={c}>
            {c}
          </TagChip>
        ))}
      </div>
    </section>
  ),
}

export const WithRemove: Story = {
  args: { color: "brand", children: "removable", onRemove: fn() },
  render: (args) => (
    <section className="p-6 flex flex-col gap-3">
      <h2 className="text-sm font-semibold">With X-to-remove</h2>
      <div className="flex flex-wrap gap-2">
        {ALL_COLORS.map((c) => (
          <TagChip key={c} color={c} onRemove={args.onRemove}>
            {c}
          </TagChip>
        ))}
      </div>
    </section>
  ),
}

// Polymorphism via Base UI useRender — `render={<a href="#" />}` swaps
// the rendered tag from <span> to <a>. Hover state visible.
export const Polymorphic: Story = {
  args: {
    color: "brand",
    children: "anchor",
    render: <a href="#" />,
  },
}
