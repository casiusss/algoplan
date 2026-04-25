import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@multica/ui/lib/utils"

const accentBarVariants = cva("flex overflow-hidden rounded-sm", {
  variants: {
    orientation: {
      horizontal: "h-1 w-full flex-row",
      vertical: "h-full w-1 flex-col",
    },
  },
  defaultVariants: {
    orientation: "horizontal",
  },
})

const segmentColorClass = {
  "tag-p0": "bg-tag-p0",
  "tag-p1": "bg-tag-p1",
  "tag-p2": "bg-tag-p2",
  "tag-p3": "bg-tag-p3",
  brand: "bg-brand",
  muted: "bg-muted",
} as const

export type AccentBarColor = keyof typeof segmentColorClass

interface AccentBarProps extends VariantProps<typeof accentBarVariants> {
  color?: AccentBarColor
  segments?: 1 | 2 | 3 | 4
  colors?: readonly AccentBarColor[]
  className?: string
}

function AccentBar({
  color,
  segments = 1,
  colors,
  orientation = "horizontal",
  className,
}: AccentBarProps) {
  let resolved: readonly AccentBarColor[]
  if (segments === 1) {
    if (!color) {
      throw new Error("AccentBar: `color` is required when segments === 1")
    }
    resolved = [color]
  } else if (colors) {
    if (colors.length !== segments) {
      throw new Error(
        `AccentBar: \`colors\` length (${colors.length}) must equal \`segments\` (${segments})`,
      )
    }
    resolved = colors
  } else if (color) {
    resolved = Array.from({ length: segments }, () => color)
  } else {
    throw new Error("AccentBar: provide `color` or `colors` matching `segments`")
  }

  return (
    <div
      role="presentation"
      aria-hidden="true"
      data-slot="accent-bar"
      className={cn(accentBarVariants({ orientation }), className)}
    >
      {resolved.map((c, i) => (
        <span key={i} className={cn("flex-1", segmentColorClass[c])} />
      ))}
    </div>
  )
}

export { AccentBar, accentBarVariants }
