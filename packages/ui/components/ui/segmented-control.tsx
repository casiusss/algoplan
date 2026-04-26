"use client"

import * as React from "react"
import { Toggle as TogglePrimitive } from "@base-ui/react/toggle"
import { ToggleGroup as ToggleGroupPrimitive } from "@base-ui/react/toggle-group"

import { cn } from "@multica/ui/lib/utils"

/**
 * SegmentedControl — single-select value picker styled like a TabsList track
 * with a lifted active item. Wraps Base UI ToggleGroup.
 *
 * Three non-obvious wrapper rules (see RESEARCH §Pattern 2 + Pitfalls 1-3):
 *
 * 1) Base UI's ToggleGroup `value` is `readonly Value[]` (array) even when
 *    `multiple={false}`. We adapt to a friendlier `value: string` /
 *    `onValueChange: (value: string) => void` API by wrapping in [value]
 *    and unwrapping next[0].
 *
 * 2) The correct prop is `multiple={false}` — do NOT use the variant
 *    "toggle"+"Multiple" (concatenated) prop name suggested by the
 *    UI-SPEC text; that prop does not exist in Base UI v1.3. The runtime
 *    contract is enforced here and a source-level test guards regressions.
 *
 * 3) A single-select ToggleGroup will deselect the currently-active item
 *    if the user clicks it again, returning an empty array. For a
 *    P0/P1/P2/P3 picker (or Board/List toggle), an empty selection is
 *    invalid — there is no "no value" state. We swallow the empty-array
 *    deselect so a value is always defined.
 *
 * Phase 6 extension — `colorByValue?: Record<string, string>`:
 *    Maps an item's `value` to a Tailwind text-color class that is applied
 *    ONLY when that item is the active one (data-pressed). Implemented via
 *    the `data-[pressed]:<class>` Tailwind variant so the color disappears
 *    automatically when another item becomes active. Plumbed via a small
 *    module-private React Context so SegmentedControlItem can read its
 *    own color without each call site repeating the prop.
 */

const ColorByValueContext = React.createContext<
  Record<string, string> | undefined
>(undefined)

interface SegmentedControlProps {
  value: string
  onValueChange: (value: string) => void
  "aria-label": string
  children: React.ReactNode
  className?: string
  disabled?: boolean
  /**
   * Per-value Tailwind text-color class applied ONLY on the active item via
   * the `data-[pressed]:` variant. Items whose value is not in the map render
   * unchanged. See Phase 6 UI-SPEC §Sub-Phase DTL §Priority SegmentedControl.
   */
  colorByValue?: Record<string, string>
}

function SegmentedControl({
  value,
  onValueChange,
  children,
  className,
  disabled,
  colorByValue,
  ...props
}: SegmentedControlProps) {
  return (
    <ColorByValueContext.Provider value={colorByValue}>
      <ToggleGroupPrimitive
        value={[value]}
        onValueChange={(next) => {
          // Single-select; swallow deselect to keep one value always set.
          const [first] = next
          if (first !== undefined) onValueChange(first)
        }}
        multiple={false}
        orientation="horizontal"
        disabled={disabled}
        data-slot="segmented-control"
        className={cn(
          "inline-flex w-fit items-center gap-0 rounded-lg bg-muted p-[3px]",
          className,
        )}
        {...props}
      >
        {children}
      </ToggleGroupPrimitive>
    </ColorByValueContext.Provider>
  )
}

interface SegmentedControlItemProps {
  value: string
  children: React.ReactNode
  disabled?: boolean
  className?: string
}

function SegmentedControlItem({
  value,
  children,
  disabled,
  className,
}: SegmentedControlItemProps) {
  const colorByValue = React.useContext(ColorByValueContext)
  const colorClass = colorByValue?.[value]
  return (
    <TogglePrimitive
      value={value}
      disabled={disabled}
      data-slot="segmented-control-item"
      className={cn(
        "inline-flex h-6 min-w-8 items-center justify-center rounded-md px-3 text-sm font-medium text-muted-foreground transition-all",
        "hover:text-foreground",
        "focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none",
        "data-[pressed]:bg-background data-[pressed]:text-foreground data-[pressed]:shadow-sm",
        "disabled:pointer-events-none disabled:opacity-50",
        // Phase 6: per-value active color override (only takes effect when pressed)
        colorClass && `data-[pressed]:${colorClass}`,
        className,
      )}
    >
      {children}
    </TogglePrimitive>
  )
}

export { SegmentedControl, SegmentedControlItem }
export type { SegmentedControlProps, SegmentedControlItemProps }
