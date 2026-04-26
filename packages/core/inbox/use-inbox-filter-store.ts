import { create } from "zustand";
import type { InboxItem, InboxItemType } from "../types/inbox";

/**
 * Client-side type filter for the inbox view (UI-SPEC §Sub-Phase INB
 * §Type filter chips).
 *
 * State shape:
 *   - `selectedTypes` — Set of `InboxItemType` literals currently active.
 *     An empty set means "filter inactive" (show all).
 *
 * Per CLAUDE.md state-management rules:
 *   - "All shared Zustand stores live in `packages/core/`" — this file lives
 *     in core/inbox/ even though only views/inbox/ consumes it today.
 *   - Filter state is ephemeral UI state — NO `persist` middleware. Reloading
 *     the inbox tab resets the filter, which matches user expectation
 *     (Linear behaves identically).
 *   - The reducer creates a NEW Set on every mutation (immutability —
 *     downstream selectors comparing references can detect changes via
 *     identity, no shallow-equality middleware required).
 */
interface InboxFilterState {
  selectedTypes: Set<InboxItemType>;
  toggleType: (type: InboxItemType) => void;
  clearFilters: () => void;
}

export const useInboxFilterStore = create<InboxFilterState>((set) => ({
  selectedTypes: new Set<InboxItemType>(),
  toggleType: (type) =>
    set((state) => {
      const next = new Set(state.selectedTypes);
      if (next.has(type)) {
        next.delete(type);
      } else {
        next.add(type);
      }
      return { selectedTypes: next };
    }),
  clearFilters: () => set({ selectedTypes: new Set<InboxItemType>() }),
}));

/**
 * Pure helper — applies the current filter set to an inbox item list.
 * An empty set is treated as "filter inactive" and returns the input list
 * unchanged (no reference change), preserving TanStack Query cache identity.
 */
export function applyInboxFilter(
  items: InboxItem[],
  selectedTypes: Set<InboxItemType>,
): InboxItem[] {
  if (selectedTypes.size === 0) return items;
  return items.filter((item) => selectedTypes.has(item.type));
}
