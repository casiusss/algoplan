"use client";

import { X } from "lucide-react";

import {
  SegmentedControl,
  SegmentedControlItem,
} from "@multica/ui/components/ui/segmented-control";
import type { IssuePriority } from "@multica/core/types";

/**
 * IssuePrioritySegmentedControl — Phase 6 DTL-02 affordance.
 *
 * Replaces the legacy <PriorityPicker> dropdown in the issue detail right
 * pane with a SegmentedControl carrying P0..P3. Mapping is fixed (UI-SPEC
 * §Hard Constraints #3):
 *
 *   urgent → P0    high → P1    medium → P2    low → P3    none → (cleared)
 *
 * The `none` enum value is NOT a tab — when `value === "none"` the control
 * renders with no active item. A separate "× Priorität entfernen" button
 * appears below the control whenever priority IS set, so users can clear
 * it without juggling tabs.
 *
 * Active item color: P0..P3 lift the active pill with `text-tag-pN` via the
 * Phase 2 SegmentedControl atom's new `colorByValue` prop. No new tokens.
 */

type PLabel = "p0" | "p1" | "p2" | "p3";

const ENUM_TO_LABEL: Record<Exclude<IssuePriority, "none">, PLabel> = {
  urgent: "p0",
  high: "p1",
  medium: "p2",
  low: "p3",
};

const LABEL_TO_ENUM: Record<PLabel, Exclude<IssuePriority, "none">> = {
  p0: "urgent",
  p1: "high",
  p2: "medium",
  p3: "low",
};

// Phase 6 REVIEW CR-01: Tailwind v4's content scanner cannot detect class
// strings composed at runtime. The full `data-[pressed]:text-tag-pN` literal
// MUST appear here so the CSS rule is generated. The atom now applies these
// strings verbatim — see SegmentedControl docs.
const COLOR_BY_LABEL: Record<PLabel, string> = {
  p0: "data-[pressed]:text-tag-p0",
  p1: "data-[pressed]:text-tag-p1",
  p2: "data-[pressed]:text-tag-p2",
  p3: "data-[pressed]:text-tag-p3",
};

interface IssuePrioritySegmentedControlProps {
  value: IssuePriority;
  onChange: (priority: IssuePriority) => void;
  disabled?: boolean;
  className?: string;
}

export function IssuePrioritySegmentedControl({
  value,
  onChange,
  disabled,
  className,
}: IssuePrioritySegmentedControlProps) {
  // When value === "none", pass an unmatched value so no item is data-pressed.
  const activeLabel: string = value === "none" ? "" : ENUM_TO_LABEL[value];
  return (
    <div className={className}>
      <SegmentedControl
        aria-label="Priorität"
        value={activeLabel}
        onValueChange={(label) => {
          // SegmentedControl will only emit one of our four declared values.
          onChange(LABEL_TO_ENUM[label as PLabel]);
        }}
        disabled={disabled}
        className="w-full justify-between"
        colorByValue={COLOR_BY_LABEL}
      >
        <SegmentedControlItem value="p0">P0</SegmentedControlItem>
        <SegmentedControlItem value="p1">P1</SegmentedControlItem>
        <SegmentedControlItem value="p2">P2</SegmentedControlItem>
        <SegmentedControlItem value="p3">P3</SegmentedControlItem>
      </SegmentedControl>
      {value !== "none" && (
        <button
          type="button"
          onClick={() => onChange("none")}
          disabled={disabled}
          className="mt-1.5 inline-flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground disabled:pointer-events-none disabled:opacity-50"
        >
          <X className="size-3" />
          Priorität entfernen
        </button>
      )}
    </div>
  );
}
