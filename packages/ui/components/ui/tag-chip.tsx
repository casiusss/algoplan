import { mergeProps } from "@base-ui/react/merge-props"
import { useRender } from "@base-ui/react/use-render"
import { cva, type VariantProps } from "class-variance-authority"
import { X } from "lucide-react"

import { cn } from "@multica/ui/lib/utils"

/**
 * TagChip — a small color-locked pill, optionally interactive with an
 * X-to-remove button, polymorphic via Base UI `useRender`.
 *
 * Color contract: discriminated union over Phase 1 tokens (no hex, no inline
 * style, no Tailwind theme-prefix overrides). Theme adaptation flows entirely
 * through the Phase 1 token layer in `packages/ui/styles/tokens.css`.
 *
 * Padding contract (UI-SPEC §1 TagChip):
 *   - default          → px-2 py-0.5
 *   - with onRemove    → px-1.5 pr-1 (tighter to fit the X button)
 * Height: h-5 (20px) — matches Badge for visual consistency.
 *
 * The optional remove button calls `e.stopPropagation()` BEFORE invoking
 * `onRemove`, so clicking the X never bubbles into a wrapping click handler
 * (e.g. a card row that opens an issue on click).
 */
const tagChipVariants = cva(
  "group/tag-chip inline-flex h-5 w-fit shrink-0 items-center justify-center gap-1 rounded-md text-xs font-medium whitespace-nowrap transition-all",
  {
    variants: {
      color: {
        "tag-p0": "bg-tag-p0 text-tag-p0-foreground",
        "tag-p1": "bg-tag-p1 text-tag-p1-foreground",
        "tag-p2": "bg-tag-p2 text-tag-p2-foreground",
        "tag-p3": "bg-tag-p3 text-tag-p3-foreground",
        brand: "bg-brand text-brand-foreground",
      },
      interactive: {
        true: "px-1.5 pr-1 hover:opacity-90",
        false: "px-2 py-0.5",
      },
    },
    defaultVariants: {
      interactive: false,
    },
    // Intentionally NO defaultVariants.color — UI-SPEC §Color forbids a
    // default color. Callers MUST pass an explicit `color` prop.
  },
)

type TagChipColor = NonNullable<VariantProps<typeof tagChipVariants>["color"]>

interface TagChipExtraProps {
  color: TagChipColor
  onRemove?: () => void
}

function TagChip({
  className,
  color,
  render,
  onRemove,
  children,
  ...props
}: useRender.ComponentProps<"span"> & TagChipExtraProps) {
  const interactive = Boolean(onRemove)

  return useRender({
    defaultTagName: "span",
    props: mergeProps<"span">(
      {
        className: cn(tagChipVariants({ color, interactive }), className),
        children: (
          <>
            {children}
            {onRemove ? (
              <button
                type="button"
                aria-label="Remove tag"
                onClick={(e) => {
                  e.stopPropagation()
                  onRemove()
                }}
                className="inline-flex size-3.5 items-center justify-center rounded-full hover:bg-foreground/10 focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
              >
                <X className="size-3" />
              </button>
            ) : null}
          </>
        ),
      },
      props,
    ),
    render,
    state: { slot: "tag-chip", color },
  })
}

export { TagChip, tagChipVariants, type TagChipColor }
