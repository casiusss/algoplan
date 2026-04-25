// Foundations / Tokens / Surfaces — smoke story for SC#2.
//
// Purpose: validate that the theme toggle decorator (preview.tsx) hits a DOM ancestor
// that triggers Tailwind's `@custom-variant dark (&:is(.dark *))` resolution.
//
// Acceptance (manual, per UI-SPEC §Light + Dark Mode Verification Gate):
//   1. Open this story in Storybook.
//   2. Click the Theme control in the toolbar; switch to "Dark".
//   3. Every swatch below MUST visibly change.
//   4. `bg-sidebar` MUST resolve to deep-forest-green in dark mode, NOT transparent.
//      (If it stays transparent → the decorator is targeting the wrong DOM ancestor.)
//
// a11y expectation (per UI-SPEC §0): zero critical violations. Swatches are decorative
// (no role="img"); each has a real text label; container is layout-only flex/grid.
import type { Meta, StoryObj } from "@storybook/react-vite"

const meta = {
  title: "Foundations / Tokens",
} satisfies Meta

export default meta
type Story = StoryObj

const SURFACE_TOKENS = [
  { className: "bg-background", label: "bg-background" },
  { className: "bg-card", label: "bg-card" },
  { className: "bg-sidebar", label: "bg-sidebar" },
  { className: "bg-muted", label: "bg-muted" },
  { className: "bg-secondary", label: "bg-secondary" },
  { className: "bg-accent", label: "bg-accent" },
] as const

const TAG_TOKENS = [
  { className: "bg-tag-p0", label: "bg-tag-p0" },
  { className: "bg-tag-p1", label: "bg-tag-p1" },
  { className: "bg-tag-p2", label: "bg-tag-p2" },
  { className: "bg-tag-p3", label: "bg-tag-p3" },
] as const

const BRAND_TOKENS = [{ className: "bg-brand", label: "bg-brand" }] as const

function Swatch({ className, label }: { className: string; label: string }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <div className={`h-12 w-12 rounded-md border border-border ${className}`} />
      <span className="text-xs text-muted-foreground">{label}</span>
    </div>
  )
}

export const Surfaces: Story = {
  render: () => (
    <div className="p-6 flex flex-col gap-6">
      <p className="text-xs text-muted-foreground max-w-md">
        Toggle the Theme control in the toolbar. Every surface below must
        visibly change. If <code>bg-sidebar</code> stays transparent in dark
        mode, the dark-class target is wrong.
      </p>
      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold">Surfaces</h2>
        <div className="flex flex-wrap gap-2">
          {SURFACE_TOKENS.map((t) => (
            <Swatch key={t.label} {...t} />
          ))}
        </div>
      </section>
      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold">Tag colors</h2>
        <div className="flex flex-wrap gap-2">
          {TAG_TOKENS.map((t) => (
            <Swatch key={t.label} {...t} />
          ))}
        </div>
      </section>
      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold">Brand</h2>
        <div className="flex flex-wrap gap-2">
          {BRAND_TOKENS.map((t) => (
            <Swatch key={t.label} {...t} />
          ))}
        </div>
      </section>
    </div>
  ),
}
