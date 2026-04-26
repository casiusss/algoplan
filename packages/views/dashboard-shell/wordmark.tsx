"use client";

import { ChevronDown } from "lucide-react";
import { cn } from "@algoplan/ui/lib/utils";

/**
 * Source-of-truth string for the AlgoPlan wordmark. Reused by the workspace
 * switcher dropdown header (Plan 02) so the brand label stays in one place.
 */
export const WordmarkText = "AlgoPlan";

export interface WordmarkProps {
  /**
   * When provided, displayed as the trigger label (typically the active
   * workspace name). Falls back to {@link WordmarkText} otherwise.
   */
  workspaceName?: string;
  /**
   * Marks the wordmark as rendered inside a collapsed sidebar — surfaces a
   * tooltip with {@link WordmarkText} so the brand stays discoverable.
   */
  collapsed?: boolean;
  className?: string;
}

/**
 * Brand identity surface for the sidebar header. Plan 02 slots this into the
 * workspace switcher trigger; Plan 01 ships it as a presentational primitive.
 */
export function Wordmark({ workspaceName, collapsed, className }: WordmarkProps) {
  const label = workspaceName ?? WordmarkText;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 text-sidebar-foreground",
        className,
      )}
      title={collapsed ? WordmarkText : undefined}
      data-collapsed={collapsed ? "true" : undefined}
    >
      <span
        className="size-1 rounded-full bg-brand"
        aria-hidden="true"
      />
      <span className="text-base font-semibold leading-tight tracking-tight">
        {label}
      </span>
      <ChevronDown
        className="size-3 text-muted-foreground"
        aria-hidden="true"
      />
    </span>
  );
}
