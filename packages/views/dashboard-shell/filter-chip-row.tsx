"use client";

import { useMemo } from "react";
import type { ReactNode } from "react";
import { TagChip, type TagChipColor } from "@multica/ui/components/ui/tag-chip";
import { Button } from "@multica/ui/components/ui/button";
import {
  useIssueViewStore,
  type ActorFilterValue,
} from "@multica/core/issues/stores/view-store";
import type { IssuePriority, IssueStatus } from "@multica/core/types";
import { useNavigation } from "../navigation";

/**
 * Maps the descriptive `IssuePriority` literals from the store to the visible
 * "P0..P3" chip label and the matching Phase 1 tag color token.
 *
 * `none` is intentionally absent — it is excluded from chip rendering
 * (UI-SPEC §9 + RESEARCH §priority mapping).
 */
const PRIORITY_LABEL: Record<
  Exclude<IssuePriority, "none">,
  { label: "P0" | "P1" | "P2" | "P3"; color: TagChipColor }
> = {
  urgent: { label: "P0", color: "tag-p0" },
  high: { label: "P1", color: "tag-p1" },
  medium: { label: "P2", color: "tag-p2" },
  low: { label: "P3", color: "tag-p3" },
};

/**
 * Capitalizes an `IssueStatus` literal (snake_case) into a human label.
 * `in_progress` -> `In Progress`, `done` -> `Done`, etc.
 */
function statusLabel(status: IssueStatus): string {
  return status
    .split("_")
    .map((part) => (part.length === 0 ? part : part[0]!.toUpperCase() + part.slice(1)))
    .join(" ");
}

interface ChipDescriptor {
  key: string;
  color: TagChipColor;
  label: ReactNode;
  onRemove: () => void;
}

/**
 * Active-filters row rendered at the left of the topbar. Reads from the global
 * `useIssueViewStore` via individual primitive selectors (UI-SPEC §9 stability
 * rule). Renders nothing when the user is not on an issues-listing path.
 */
export function FilterChipRow() {
  const { pathname } = useNavigation();
  const onIssuesPage = /\/[^/]+\/(issues|my-issues)\b/.test(pathname);

  // Individual primitive selectors — each subscribes only to its own array
  // reference, keeping subscriptions stable across unrelated store updates.
  const priorityFilters = useIssueViewStore((s) => s.priorityFilters);
  const statusFilters = useIssueViewStore((s) => s.statusFilters);
  const assigneeFilters = useIssueViewStore((s) => s.assigneeFilters);

  const chips = useMemo<ChipDescriptor[]>(() => {
    const out: ChipDescriptor[] = [];

    for (const priority of priorityFilters) {
      if (priority === "none") continue;
      const meta = PRIORITY_LABEL[priority];
      out.push({
        key: `priority:${priority}`,
        color: meta.color,
        label: meta.label,
        onRemove: () =>
          useIssueViewStore.getState().togglePriorityFilter(priority),
      });
    }

    for (const status of statusFilters) {
      out.push({
        key: `status:${status}`,
        color: "brand",
        label: statusLabel(status),
        onRemove: () =>
          useIssueViewStore.getState().toggleStatusFilter(status),
      });
    }

    for (const value of assigneeFilters) {
      // `assigneeFilters` is `ActorFilterValue[]` — discriminated by `type` and
      // keyed by `id`. v1 renders the id as the chip label; Plan 04+ may swap
      // to a display name once member/agent stores expose one.
      const a: ActorFilterValue = value;
      out.push({
        key: `assignee:${a.type}:${a.id}`,
        color: "brand",
        label: a.id,
        onRemove: () =>
          useIssueViewStore.getState().toggleAssigneeFilter(a),
      });
    }

    return out;
  }, [priorityFilters, statusFilters, assigneeFilters]);

  if (!onIssuesPage) return null;

  return (
    <div className="flex min-w-0 flex-wrap items-center gap-2">
      {chips.map((chip) => (
        <TagChip
          key={chip.key}
          color={chip.color}
          onRemove={chip.onRemove}
        >
          {chip.label}
        </TagChip>
      ))}
      {chips.length >= 2 && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => useIssueViewStore.getState().clearFilters()}
        >
          × Clear all
        </Button>
      )}
    </div>
  );
}
