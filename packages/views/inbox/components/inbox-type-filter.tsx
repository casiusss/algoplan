"use client";

import { TagChip } from "@multica/ui/components/ui/tag-chip";
import { useInboxFilterStore } from "@multica/core/inbox";
import type { InboxItemType } from "@multica/core/types";

/**
 * Type filter chips for the inbox view (UI-SPEC §Sub-Phase INB §Type filter
 * chips). German labels per Copywriting Contract INB.
 *
 * The 4 user-facing chips collapse multiple `InboxItemType` enum members
 * into broader categories — "Zuweisungen" includes assigned/unassigned/
 * assignee-changed; "System" includes status/priority/due-date plus all
 * agent-driven types. The mapping intentionally lives here (not in
 * `InboxItemType`) so future enum changes don't force a UI ripple.
 *
 * Chips read from / write to `useInboxFilterStore` (in @multica/core/inbox
 * per CLAUDE.md state-management rules). The store creates a new Set on
 * every toggle (immutable), so this component re-renders cleanly off
 * Zustand identity.
 */
interface FilterDef {
  id: string;
  label: string;
  types: readonly InboxItemType[];
}

const FILTERS: readonly FilterDef[] = [
  { id: "mention", label: "Erwähnungen", types: ["mentioned"] },
  {
    id: "assignment",
    label: "Zuweisungen",
    types: ["issue_assigned", "unassigned", "assignee_changed"],
  },
  { id: "comment", label: "Kommentare", types: ["new_comment"] },
  {
    id: "system",
    label: "System",
    types: [
      "status_changed",
      "priority_changed",
      "due_date_changed",
      "review_requested",
      "task_completed",
      "task_failed",
      "agent_blocked",
      "agent_completed",
      "reaction_added",
    ],
  },
];

function filterIsActive(
  selectedTypes: Set<InboxItemType>,
  types: readonly InboxItemType[],
): boolean {
  // A category is "active" when ALL of its constituent types are selected.
  // Toggling a category flips every constituent in lockstep — keeps the UI
  // affordance honest (you cannot end up with a half-active chip).
  return types.every((t) => selectedTypes.has(t));
}

export function InboxTypeFilter() {
  const selectedTypes = useInboxFilterStore((s) => s.selectedTypes);
  const toggleType = useInboxFilterStore((s) => s.toggleType);

  function handleToggle(types: readonly InboxItemType[], active: boolean): void {
    // If active → remove every constituent; otherwise → add every missing one.
    for (const t of types) {
      const has = selectedTypes.has(t);
      if (active && has) toggleType(t);
      else if (!active && !has) toggleType(t);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2 px-4 py-2">
      {FILTERS.map(({ id, label, types }) => {
        const active = filterIsActive(selectedTypes, types);
        return (
          <TagChip
            key={id}
            color="brand"
            className={!active ? "opacity-60 cursor-pointer" : "cursor-pointer"}
            role="button"
            aria-pressed={active}
            aria-label={label}
            onClick={() => handleToggle(types, active)}
          >
            {label}
          </TagChip>
        );
      })}
    </div>
  );
}
