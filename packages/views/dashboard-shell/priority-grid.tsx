"use client";

import { useMemo } from "react";
import { Button } from "@algoplan/ui/components/ui/button";
import { cn } from "@algoplan/ui/lib/utils";
import { useIssueViewStore } from "@algoplan/core/issues/stores/view-store";
import { useIssueCountByPriority } from "@algoplan/core/issues/derived";
import type { IssuePriority } from "@algoplan/core/types";

type CellKey = "p0" | "p1" | "p2" | "p3";
type CellLabel = "P0" | "P1" | "P2" | "P3";
type TagToken = "tag-p0" | "tag-p1" | "tag-p2" | "tag-p3";

interface CellSpec {
  key: CellKey;
  label: CellLabel;
  /**
   * Maps the visible label (P0..P3) to the descriptive `IssuePriority` enum
   * values used by the store. Verified by Plan 00 against
   * `packages/core/types/issue.ts` (urgent/high/medium/low/none).
   */
  priority: IssuePriority;
  tagToken: TagToken;
  ariaLabel: string;
  swatchClass: string;
  ringClass: string;
}

const CELLS: readonly CellSpec[] = [
  {
    key: "p0",
    label: "P0",
    priority: "urgent",
    tagToken: "tag-p0",
    ariaLabel: "Filter by P0",
    swatchClass: "bg-tag-p0",
    ringClass: "ring-2 ring-tag-p0",
  },
  {
    key: "p1",
    label: "P1",
    priority: "high",
    tagToken: "tag-p1",
    ariaLabel: "Filter by P1",
    swatchClass: "bg-tag-p1",
    ringClass: "ring-2 ring-tag-p1",
  },
  {
    key: "p2",
    label: "P2",
    priority: "medium",
    tagToken: "tag-p2",
    ariaLabel: "Filter by P2",
    swatchClass: "bg-tag-p2",
    ringClass: "ring-2 ring-tag-p2",
  },
  {
    key: "p3",
    label: "P3",
    priority: "low",
    tagToken: "tag-p3",
    ariaLabel: "Filter by P3",
    swatchClass: "bg-tag-p3",
    ringClass: "ring-2 ring-tag-p3",
  },
] as const;

interface PriorityCellProps {
  spec: CellSpec;
  count: number;
  active: boolean;
  onToggle: (priority: IssuePriority) => void;
}

function PriorityCell({ spec, count, active, onToggle }: PriorityCellProps) {
  return (
    <Button
      variant="ghost"
      size="sm"
      aria-label={spec.ariaLabel}
      onClick={() => onToggle(spec.priority)}
      className={cn(
        "h-auto justify-start gap-2 px-2 py-1.5",
        active && spec.ringClass,
      )}
    >
      <span
        className={cn("size-2 rounded-sm", spec.swatchClass)}
        aria-hidden="true"
      />
      <span className="text-xs font-medium">{spec.label}</span>
      {count > 0 && (
        <span className="ml-auto text-xs font-semibold tabular-nums leading-none">
          {count > 99 ? "99+" : count}
        </span>
      )}
    </Button>
  );
}

export interface PriorityGridProps {
  /** Workspace id, passed as a prop so the atom never calls the useWorkspaceId hook. */
  wsId: string | undefined;
}

/**
 * 2x2 priority quick-filter grid for the sidebar. Hidden when the sidebar is
 * in collapsed (icon-only) mode. Each cell toggles the matching priority
 * filter on the global `useIssueViewStore` (no local state).
 */
export function PriorityGrid({ wsId }: PriorityGridProps) {
  const counts = useIssueCountByPriority(wsId);
  // Stable selector: subscribes to the priorityFilters array reference only.
  const priorityFilters = useIssueViewStore((s) => s.priorityFilters);

  const activeMap = useMemo(() => {
    const set = new Set(priorityFilters);
    return {
      urgent: set.has("urgent"),
      high: set.has("high"),
      medium: set.has("medium"),
      low: set.has("low"),
      none: set.has("none"),
    } satisfies Record<IssuePriority, boolean>;
  }, [priorityFilters]);

  const handleToggle = (priority: IssuePriority) => {
    useIssueViewStore.getState().togglePriorityFilter(priority);
  };

  return (
    <div className="grid grid-cols-2 grid-rows-2 gap-2 p-2 group-data-[collapsible=icon]:hidden">
      {CELLS.map((spec) => (
        <PriorityCell
          key={spec.key}
          spec={spec}
          count={counts[spec.key]}
          active={activeMap[spec.priority]}
          onToggle={handleToggle}
        />
      ))}
    </div>
  );
}
