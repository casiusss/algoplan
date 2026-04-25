"use client";

import type { ReactNode } from "react";
import { FilterChipRow } from "./filter-chip-row";
import { BlockerBadge } from "./blocker-badge";
import { SearchInput } from "./search-input";
import { PrimaryCTA } from "./primary-cta";

export interface AppTopbarProps {
  /**
   * Workspace id forwarded to wsId-aware children (BlockerBadge). Atoms in
   * `packages/views/dashboard-shell/` never read workspace context themselves
   * — the wsId always travels in via props (UI-SPEC SC#4 + Wave 0 grep hook).
   */
  wsId?: string;
  /**
   * When provided, REPLACES the default `<SearchInput>` in the topbar. The
   * Web app slots its existing Cmd+K `<SearchTrigger>` here so we don't churn
   * the global command palette wiring while introducing the new shell.
   */
  searchSlot?: ReactNode;
}

/**
 * Topbar shell — composes the four Plan 03 atoms into a 48px (`h-12`) row
 * pinned with `border-b border-border` + `bg-background`. Layout from
 * UI-SPEC §8: FilterChipRow (left) → BlockerBadge → flex-1 spacer →
 * SearchInput (or `searchSlot` replacement) → PrimaryCTA (rightmost).
 */
export function AppTopbar({ wsId, searchSlot }: AppTopbarProps) {
  return (
    <header className="h-12 shrink-0 flex items-center gap-2 border-b border-border bg-background px-4">
      <FilterChipRow />
      <BlockerBadge wsId={wsId} />
      <div className="flex-1" />
      {searchSlot ?? <SearchInput />}
      <PrimaryCTA />
    </header>
  );
}
