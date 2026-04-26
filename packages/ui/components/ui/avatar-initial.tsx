import { cva, type VariantProps } from "class-variance-authority"

import {
  AVATAR_PALETTE,
  extractInitials,
  hashToPaletteIndex,
} from "@algoplan/ui/lib/avatar-color"
import { cn } from "@algoplan/ui/lib/utils"

/**
 * AvatarInitial — circular initials badge with deterministic per-name color.
 *
 * Background + foreground colors come from the locked AVATAR_PALETTE in
 * @algoplan/ui/lib/avatar-color (8-entry table bound to Phase 1 tokens).
 * Initials extraction is the pure helper from that same module.
 *
 * The `after:` ring uses `mix-blend-darken` / `mix-blend-lighten` paired with
 * `dark:` because that is the structural mode companion required by the
 * blend-mode mechanic itself (it is NOT a per-color theme override). This
 * pattern is copied verbatim from packages/ui/components/ui/avatar.tsx so
 * AvatarInitial visually swaps with the standard Avatar fallback.
 */
const avatarInitialVariants = cva(
  "relative inline-flex shrink-0 select-none items-center justify-center rounded-full font-semibold after:absolute after:inset-0 after:rounded-full after:border after:border-border after:mix-blend-darken dark:after:mix-blend-lighten",
  {
    variants: {
      size: {
        sm: "size-6 text-xs",
        default: "size-8 text-sm",
        lg: "size-10 text-base",
      },
    },
    defaultVariants: {
      size: "default",
    },
  }
)

interface AvatarInitialProps extends VariantProps<typeof avatarInitialVariants> {
  name: string
  hashKey?: string
  className?: string
}

function AvatarInitial({ name, hashKey, size, className }: AvatarInitialProps) {
  const initials = extractInitials(name)
  const colorClasses = AVATAR_PALETTE[hashToPaletteIndex(hashKey ?? name)]
  const safeName = (typeof name === "string" ? name.trim() : "") || "Unknown user"

  return (
    <span
      role="img"
      aria-label={safeName}
      data-slot="avatar-initial"
      className={cn(avatarInitialVariants({ size }), colorClasses, className)}
    >
      {initials}
    </span>
  )
}

export { AvatarInitial, avatarInitialVariants, type AvatarInitialProps }
