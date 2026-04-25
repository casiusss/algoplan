"use client";

import { AlertOctagon } from "lucide-react";
import { Button } from "@multica/ui/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@multica/ui/components/ui/popover";
import { cn } from "@multica/ui/lib/utils";

// PHASE-4-INLINE-STUB: Plan 05 deletes this stub and rewires the import to
// `@multica/core/issues/derived/use-blocker-count`. Until then the badge
// renders a literal 0 so the rest of the topbar can land safely.
//
// `__blockerCountForTesting` is exported ONLY so tests can drive the stub
// from `count = 0` (default) into `count > 0` without mocking the module.
// Plan 05 deletes this mutable AND the `__blockerCountForTesting` export
// AND updates blocker-badge.test.tsx to mock the real hook via vi.mock.
export const __blockerCountForTesting = { current: 0 };
function useBlockerCount(_wsId: string | undefined): number {
  return __blockerCountForTesting.current;
}
// END PHASE-4-INLINE-STUB

export interface BlockerBadgeProps {
  /** Workspace id, passed as a prop so the atom never calls the useWorkspaceId hook. */
  wsId: string | undefined;
}

/**
 * Read-only blocker count badge for the topbar. Icon-only when the count is
 * zero; gains a `bg-tag-p0` count badge when blockers exist. Click opens a
 * popover; v1 popover content is a stub message until backend support lands.
 */
export function BlockerBadge({ wsId }: BlockerBadgeProps) {
  const count = useBlockerCount(wsId);
  const ariaLabel =
    count > 0 ? `${count} blocker${count === 1 ? "" : "s"}` : "Blockers";

  return (
    <Popover>
      <PopoverTrigger
        render={
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={ariaLabel}
            title="Blockers"
          />
        }
      >
        <AlertOctagon
          className={cn("size-4", count === 0 && "text-muted-foreground")}
        />
        {count > 0 && (
          <span className="ml-1 rounded-full bg-tag-p0 px-1.5 text-xs font-semibold leading-none tabular-nums text-tag-p0-foreground">
            {count}
          </span>
        )}
      </PopoverTrigger>
      <PopoverContent className="w-64 p-0">
        <div className="p-4 text-sm text-muted-foreground">
          No blockers right now.
        </div>
      </PopoverContent>
    </Popover>
  );
}
