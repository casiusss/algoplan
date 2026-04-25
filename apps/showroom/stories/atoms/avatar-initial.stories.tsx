// UI-SPEC §3 — AvatarInitial stories (Default, AllSizes, Determinism, PaletteSpread, Empty).
// Atom source: @multica/ui/components/ui/avatar-initial (real source).
//
// PaletteSpread names: 16 empirically verified names, 2 per AVATAR_PALETTE index
// (RESEARCH §Pattern 4). Each name was passed to hashToPaletteIndex from
// @multica/ui/lib/avatar-color and the resulting index recorded. Two names per
// index gives independent visual confirmation per color and catches single-name
// typos. To re-derive (e.g., if AVATAR_PALETTE.length changes), see the script
// in RESEARCH §Pattern 4.
import type { Meta, StoryObj } from "@storybook/react-vite"

import { AvatarInitial } from "@multica/ui/components/ui/avatar-initial"

const meta = {
  title: "Atoms / AvatarInitial",
  component: AvatarInitial,
} satisfies Meta<typeof AvatarInitial>

export default meta
type Story = StoryObj<typeof meta>

// 16 names → 8 distinct AVATAR_PALETTE indexes, 2 names per index.
// Verified 2026-04-25 via hashToPaletteIndex from @multica/ui/lib/avatar-color.
// Order: palette index ascending (0,0,1,1,...,7,7) — reviewer scans top-to-bottom
// expecting paired colors to match.
const PALETTE_NAMES: ReadonlyArray<{ name: string; index: number }> = [
  { name: "Dana Davis", index: 0 },
  { name: "Jay Jones", index: 0 },
  { name: "Ivy Ito", index: 1 },
  { name: "Sara Smith", index: 1 },
  { name: "Quinn Quiroz", index: 2 },
  { name: "Wren White", index: 2 },
  { name: "Faye Fisher", index: 3 },
  { name: "Gabe Green", index: 3 },
  { name: "Xander Xu", index: 4 },
  { name: "Yara Young", index: 4 },
  { name: "Alice Anderson", index: 5 },
  { name: "Bella Brown", index: 5 },
  { name: "Hana Hill", index: 6 },
  { name: "Noah Nelson", index: 6 },
  { name: "Eli Edwards", index: 7 },
  { name: "Lara Lopez", index: 7 },
] as const

export const Default: Story = {
  args: { name: "Stephan Rieche" },
}

export const AllSizes: Story = {
  // `args.name` satisfies AvatarInitial's required-prop type contract; render() ignores it.
  args: { name: "Stephan Rieche" },
  render: () => (
    <section className="p-6 flex flex-col gap-3">
      <h2 className="text-sm font-semibold">Sizes</h2>
      <div className="flex flex-row items-end gap-4">
        <div className="flex flex-col items-center gap-1">
          <AvatarInitial name="Stephan Rieche" size="sm" />
          <span className="text-xs text-muted-foreground">sm</span>
        </div>
        <div className="flex flex-col items-center gap-1">
          <AvatarInitial name="Stephan Rieche" size="default" />
          <span className="text-xs text-muted-foreground">default</span>
        </div>
        <div className="flex flex-col items-center gap-1">
          <AvatarInitial name="Stephan Rieche" size="lg" />
          <span className="text-xs text-muted-foreground">lg</span>
        </div>
      </div>
    </section>
  ),
}

// 5 instances of the same name MUST be visually identical (deterministic color).
export const Determinism: Story = {
  args: { name: "Stephan Rieche" },
  render: () => (
    <section className="p-6 flex flex-col gap-3">
      <h2 className="text-sm font-semibold">Determinism</h2>
      <p className="text-xs text-muted-foreground">
        Same name → same color, every render.
      </p>
      <div className="flex flex-row gap-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <AvatarInitial key={i} name="Stephan Rieche" />
        ))}
      </div>
    </section>
  ),
}

// Each name was empirically chosen to land on a specific AVATAR_PALETTE index.
// 16 names total — 2 per index — gives independent visual confirmation per color.
export const PaletteSpread: Story = {
  args: { name: "Stephan Rieche" },
  render: () => (
    <section className="p-6 flex flex-col gap-3">
      <h2 className="text-sm font-semibold">Palette spread</h2>
      <p className="text-xs text-muted-foreground">
        16 names, 2 per palette index. Each pair must share a color.
      </p>
      <div className="flex flex-row flex-wrap gap-4">
        {PALETTE_NAMES.map(({ name, index }) => (
          <div key={name} className="flex flex-col items-center gap-1">
            <AvatarInitial name={name} />
            <span className="text-xs text-muted-foreground">{name}</span>
            <span className="text-xs text-muted-foreground">idx {index}</span>
          </div>
        ))}
      </div>
    </section>
  ),
}

// Empty name → atom renders "?" with aria-label="Unknown user".
export const Empty: Story = {
  args: { name: "" },
}
