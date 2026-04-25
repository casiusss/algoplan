"use client";

import { Search } from "lucide-react";
import { Input } from "@multica/ui/components/ui/input";

/**
 * Inline topbar search input. Presentational only — typing is a no-op for v1
 * (UI-SPEC §11). The Web app replaces this default by passing a `searchSlot`
 * to `<AppTopbar>` so the existing Cmd+K `SearchTrigger` slots in unchanged.
 */
export function SearchInput() {
  return (
    <div className="relative w-64 max-w-xs">
      <Search
        aria-hidden="true"
        className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
      />
      <Input
        aria-label="Search"
        placeholder="Search…"
        className="h-8 border-transparent bg-muted pl-8"
      />
    </div>
  );
}
