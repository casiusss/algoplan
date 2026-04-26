// UI-SPEC §2 — AccentBar stories (Default, AllColors, Segments, Orientation).
// Atom source: @algoplan/ui/components/ui/accent-bar (real source).
import type { Meta, StoryObj } from "@storybook/react-vite"

import {
  AccentBar,
  type AccentBarColor,
} from "@algoplan/ui/components/ui/accent-bar"

const meta = {
  title: "Atoms / AccentBar",
  component: AccentBar,
} satisfies Meta<typeof AccentBar>

export default meta
type Story = StoryObj<typeof meta>

// 6 colors per UI-SPEC §2 AllColors — includes "muted" which TagChip does NOT have.
const ALL_COLORS: readonly AccentBarColor[] = [
  "tag-p0",
  "tag-p1",
  "tag-p2",
  "tag-p3",
  "brand",
  "muted",
] as const

export const Default: Story = {
  render: () => (
    <div className="p-6 w-64">
      <AccentBar color="brand" />
    </div>
  ),
}

export const AllColors: Story = {
  render: () => (
    <section className="p-6 flex flex-col gap-3">
      <h2 className="text-sm font-semibold">Colors</h2>
      <div className="flex flex-col gap-2">
        {ALL_COLORS.map((c) => (
          <div key={c} className="flex items-center gap-2 w-64">
            <AccentBar color={c} />
            <span className="text-xs text-muted-foreground ml-auto">{c}</span>
          </div>
        ))}
      </div>
    </section>
  ),
}

// Segments per UI-SPEC §2 Segments table:
//   1 segment  → ["brand"]
//   2 segments → ["tag-p0", "tag-p1"]
//   3 segments → ["tag-p0", "tag-p1", "tag-p2"]
//   4 segments → ["tag-p0", "tag-p1", "tag-p2", "tag-p3"]
export const Segments: Story = {
  render: () => (
    <section className="p-6 flex flex-col gap-3">
      <h2 className="text-sm font-semibold">Segments</h2>
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2 w-64">
          <AccentBar segments={1} colors={["brand"]} />
          <span className="text-xs text-muted-foreground ml-auto">1 segment</span>
        </div>
        <div className="flex items-center gap-2 w-64">
          <AccentBar segments={2} colors={["tag-p0", "tag-p1"]} />
          <span className="text-xs text-muted-foreground ml-auto">2 segments</span>
        </div>
        <div className="flex items-center gap-2 w-64">
          <AccentBar segments={3} colors={["tag-p0", "tag-p1", "tag-p2"]} />
          <span className="text-xs text-muted-foreground ml-auto">3 segments</span>
        </div>
        <div className="flex items-center gap-2 w-64">
          <AccentBar
            segments={4}
            colors={["tag-p0", "tag-p1", "tag-p2", "tag-p3"]}
          />
          <span className="text-xs text-muted-foreground ml-auto">4 segments</span>
        </div>
      </div>
    </section>
  ),
}

// UI-SPEC §2 Orientation: side-by-side horizontal + vertical.
// Vertical needs an explicit height — AccentBar's vertical variant is `h-full w-1`,
// so the parent must constrain height.
export const Orientation: Story = {
  render: () => (
    <section className="p-6 flex flex-col gap-3">
      <h2 className="text-sm font-semibold">Orientation</h2>
      <div className="flex flex-row gap-6">
        <div className="flex flex-col gap-1 w-64">
          <AccentBar color="brand" />
          <span className="text-xs text-muted-foreground">horizontal</span>
        </div>
        <div className="flex flex-col items-center gap-1 h-32">
          <AccentBar color="brand" orientation="vertical" />
          <span className="text-xs text-muted-foreground">vertical</span>
        </div>
      </div>
    </section>
  ),
}
