"use client";

import { AlertOctagon } from "lucide-react";
import { Button } from "@algoplan/ui/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@algoplan/ui/components/ui/popover";
import { cn } from "@algoplan/ui/lib/utils";
import { useBlockerCount } from "@algoplan/core/issues/derived";

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
            className={cn(count > 0 && "w-auto px-1.5")}
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
