"use client";

import { useState, type ReactNode } from "react";
import { EyeOff, MoreHorizontal, Plus } from "lucide-react";
import { Tooltip, TooltipTrigger, TooltipContent } from "@algoplan/ui/components/ui/tooltip";
import { useDroppable } from "@dnd-kit/react";
import { CollisionPriority } from "@dnd-kit/abstract";
import type { Issue, IssueStatus } from "@algoplan/core/types";
import { Button } from "@algoplan/ui/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@algoplan/ui/components/ui/dropdown-menu";
import { STATUS_CONFIG } from "@algoplan/core/issues/config";
import { useViewStoreApi } from "@algoplan/core/issues/stores/view-store-context";
import { StatusIcon } from "./status-icon";
import { DraggableBoardCard } from "./board-card";
import { InlineTaskAdd } from "./inline-task-add";
import type { ChildProgress } from "./list-row";

export function BoardColumn({
  status,
  issues,
  childProgressMap,
  totalCount,
  footer,
}: {
  status: IssueStatus;
  issues: Issue[];
  childProgressMap?: Map<string, ChildProgress>;
  totalCount?: number;
  footer?: ReactNode;
}) {
  const cfg = STATUS_CONFIG[status];
  // v0.4 droppable — singular `accept`, `collisionPriority.Low` so individual cards
  // win pointer-collision when both card and column droppable overlap (RESEARCH §Pitfall 2).
  const { ref, isDropTarget } = useDroppable({
    id: status,
    type: "status-column",
    accept: "card",
    collisionPriority: CollisionPriority.Low,
  });
  const viewStoreApi = useViewStoreApi();
  // KBN-03 — local ephemeral UI state; never persisted (CLAUDE.md §State Mgmt
  // "Don't persist ephemeral UI state").
  const [isAdding, setIsAdding] = useState(false);

  return (
    <div data-board-column-root className={`flex w-[280px] shrink-0 flex-col rounded-xl ${cfg.columnBg} p-2`}>
      <div className="mb-2 flex items-center justify-between px-1.5">
        {/* Left: status badge + count */}
        <div className="flex items-center gap-2">
          <span className={`inline-flex items-center gap-1.5 rounded px-2 py-0.5 ${cfg.badgeBg} ${cfg.badgeText}`}>
            <StatusIcon status={status} className="h-3 w-3" inheritColor />
            <span data-board-column-status-label className="text-xs italic font-semibold">{cfg.label}</span>
          </span>
          <span data-board-column-count className="text-xs text-muted-foreground tabular-nums">
            {totalCount ?? issues.length}
          </span>
        </div>

        {/* Right: add + menu */}
        <div className="flex items-center gap-1">
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button data-board-column-menu-trigger variant="ghost" size="icon-sm" className="rounded-full text-muted-foreground">
                  <MoreHorizontal className="size-3.5" />
                </Button>
              }
            />
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => viewStoreApi.getState().hideStatus(status)}>
                <EyeOff className="size-3.5" />
                Spalte ausblenden
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  data-board-column-add-trigger
                  aria-label="Issue hinzufügen"
                  variant="ghost"
                  size="icon-sm"
                  className="rounded-full text-muted-foreground"
                  onClick={() => setIsAdding(true)}
                >
                  <Plus className="size-3.5" />
                </Button>
              }
            />
            <TooltipContent>Issue hinzufügen</TooltipContent>
          </Tooltip>
        </div>
      </div>
      <div
        ref={ref}
        data-board-column-body
        className={`min-h-[200px] flex-1 space-y-2 overflow-y-auto rounded-lg p-1 transition-colors ${
          isDropTarget ? "ring-2 ring-brand ring-offset-2 ring-offset-background bg-accent/40" : ""
        }`}
      >
        {issues.map((issue, idx) => (
          <DraggableBoardCard
            key={issue.id}
            issue={issue}
            cardIndex={idx}
            editable
            childProgress={childProgressMap?.get(issue.id)}
          />
        ))}
        {issues.length === 0 && !isAdding && (
          isDropTarget ? (
            <p className="py-8 text-center text-xs text-brand font-medium">Hier ablegen</p>
          ) : (
            <p className="py-8 text-center text-xs text-muted-foreground">Keine Issues</p>
          )
        )}
        {footer}
        {isAdding && (
          <div data-board-column-inline-add className="mt-2 px-1">
            <InlineTaskAdd
              status={status}
              onCancel={() => setIsAdding(false)}
            />
          </div>
        )}
      </div>
    </div>
  );
}
