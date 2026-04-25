"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { DragDropProvider, DragOverlay } from "@dnd-kit/react";
import { isSortable } from "@dnd-kit/react/sortable";
import { AutoScroller } from "@dnd-kit/dom";
import { Eye, MoreHorizontal } from "lucide-react";
import type { Issue, IssueStatus } from "@multica/core/types";
import { Button } from "@multica/ui/components/ui/button";
import { useLoadMoreByStatus } from "@multica/core/issues/mutations";
import type { MyIssuesFilter } from "@multica/core/issues/queries";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@multica/ui/components/ui/dropdown-menu";
import { ALL_STATUSES, STATUS_CONFIG } from "@multica/core/issues/config";
import { useViewStoreApi, useViewStore } from "@multica/core/issues/stores/view-store-context";
import type { SortField, SortDirection } from "@multica/core/issues/stores/view-store";
import { sortIssues } from "../utils/sort";
import { StatusIcon } from "./status-icon";
import { BoardColumn } from "./board-column";
import { BoardCardContent } from "./board-card";
import { InfiniteScrollSentinel } from "./infinite-scroll-sentinel";
import type { ChildProgress } from "./list-row";

// Retained for typing; kept intentionally so future column-id helpers stay close to ALL_STATUSES.
void ALL_STATUSES;

/** Build column ID arrays from TQ issue data, respecting current sort. */
function buildColumns(
  issues: Issue[],
  visibleStatuses: IssueStatus[],
  sortBy: SortField,
  sortDirection: SortDirection,
): Record<IssueStatus, string[]> {
  const cols = {} as Record<IssueStatus, string[]>;
  for (const status of visibleStatuses) {
    const sorted = sortIssues(
      issues.filter((i) => i.status === status),
      sortBy,
      sortDirection,
    );
    cols[status] = sorted.map((i) => i.id);
  }
  return cols;
}

/** Compute a float position for `activeId` based on its neighbors in `ids`. */
function computePosition(ids: string[], activeId: string, issueMap: Map<string, Issue>): number {
  const idx = ids.indexOf(activeId);
  if (idx === -1) return 0;
  const getPos = (id: string) => issueMap.get(id)?.position ?? 0;
  if (ids.length === 1) return issueMap.get(activeId)?.position ?? 0;
  if (idx === 0) return getPos(ids[1]!) - 1;
  if (idx === ids.length - 1) return getPos(ids[idx - 1]!) + 1;
  return (getPos(ids[idx - 1]!) + getPos(ids[idx + 1]!)) / 2;
}

/**
 * Produce the post-move ID order for the destination column without mutating the source map.
 *
 * v0.4 owns the visual reorder via `useSortable`'s `index`/`group` props during drag, so we
 * only need to compute the FINAL order at drag-end based on `source.{initialIndex, index,
 * initialGroup, group}` (RESEARCH §Pattern 2 — hand-rolled splice; preserves WS race immunity
 * by never mutating React state inside `onDragOver`).
 */
function computeFinalColumnIds(
  initialGroup: IssueStatus,
  finalGroup: IssueStatus,
  initialIndex: number,
  index: number,
  columns: Record<IssueStatus, string[]>,
): string[] {
  if (initialGroup === finalGroup) {
    const arr = [...(columns[finalGroup] ?? [])];
    const [moved] = arr.splice(initialIndex, 1);
    if (moved !== undefined) {
      arr.splice(index, 0, moved);
    }
    return arr;
  }
  // cross-group: take source out of its origin slice, then drop into target
  const target = [...(columns[finalGroup] ?? [])];
  const sourceArr = columns[initialGroup] ?? [];
  const movedId = sourceArr[initialIndex];
  if (movedId !== undefined) {
    target.splice(index, 0, movedId);
  }
  return target;
}

const EMPTY_PROGRESS_MAP = new Map<string, ChildProgress>();

export function BoardView({
  issues,
  visibleStatuses,
  hiddenStatuses,
  onMoveIssue,
  childProgressMap = EMPTY_PROGRESS_MAP,
  myIssuesScope,
  myIssuesFilter,
}: {
  issues: Issue[];
  visibleStatuses: IssueStatus[];
  hiddenStatuses: IssueStatus[];
  onMoveIssue: (
    issueId: string,
    newStatus: IssueStatus,
    newPosition?: number
  ) => void;
  childProgressMap?: Map<string, ChildProgress>;
  /** When set, per-status load-more targets the scoped cache instead of the workspace one. */
  myIssuesScope?: string;
  myIssuesFilter?: MyIssuesFilter;
}) {
  const sortBy = useViewStore((s) => s.sortBy);
  const sortDirection = useViewStore((s) => s.sortDirection);
  const myIssuesOpts = myIssuesScope
    ? { scope: myIssuesScope, filter: myIssuesFilter ?? {} }
    : undefined;

  // --- Drag state ---
  const [activeIssue, setActiveIssue] = useState<Issue | null>(null);
  const isDraggingRef = useRef(false);

  // --- Local columns state ---
  // Between drags: follows TQ via useEffect.
  // During drag: local-only (v0.4 owns the visual reorder via useSortable refs).
  const [columns, setColumns] = useState<Record<IssueStatus, string[]>>(() =>
    buildColumns(issues, visibleStatuses, sortBy, sortDirection),
  );
  const columnsRef = useRef(columns);
  columnsRef.current = columns;

  // After a cross-column move, lock for one animation frame so dnd-kit's
  // collision detection can stabilize before processing the next move.
  // Without this, collision oscillates: A→B→A→B… until React bails out.
  // (KBN-01 Layer 3 — Hard Constraint 13. Read in the rebuild gate below.)
  const recentlyMovedRef = useRef(false);

  useEffect(() => {
    if (!isDraggingRef.current && !recentlyMovedRef.current) {
      setColumns(buildColumns(issues, visibleStatuses, sortBy, sortDirection));
    }
  }, [issues, visibleStatuses, sortBy, sortDirection]);

  useEffect(() => {
    const id = requestAnimationFrame(() => {
      recentlyMovedRef.current = false;
    });
    return () => cancelAnimationFrame(id);
  }, [columns]);

  // --- Issue map ---
  // Frozen during drag so BoardColumn/DraggableBoardCard props stay
  // referentially stable even if a TQ refetch lands mid-drag.
  const issueMap = useMemo(() => {
    const map = new Map<string, Issue>();
    for (const issue of issues) map.set(issue.id, issue);
    return map;
  }, [issues]);

  const issueMapRef = useRef(issueMap);
  if (!isDraggingRef.current) {
    issueMapRef.current = issueMap;
  }

  // Resolve issue lists per visible column (parent-provided order from local `columns` state).
  // The column owns `cardIndex` via its own `.map((issue, idx) => ...)`.
  const columnIssueLists = useMemo(() => {
    const map = {} as Record<IssueStatus, Issue[]>;
    for (const status of visibleStatuses) {
      const ids = columns[status] ?? [];
      map[status] = ids.flatMap((id) => {
        const issue = issueMapRef.current.get(id);
        return issue ? [issue] : [];
      });
    }
    return map;
  }, [columns, visibleStatuses]);

  return (
    <DragDropProvider
      plugins={(defaults) => [
        ...defaults,
        // KBN-02: scroll-collision drift fix. `threshold.y: 0.3` activates auto-scroll within
        // the bottom/top 30% of a scrollable ancestor; `x: 0` disables horizontal auto-scroll
        // (we don't want column-list horizontal auto-scroll while dragging cards).
        AutoScroller.configure({ acceleration: 15, threshold: { x: 0, y: 0.3 } }),
      ]}
      onDragStart={(event) => {
        isDraggingRef.current = true;
        const sourceId = event.operation.source?.id;
        if (sourceId !== undefined) {
          const issue = issueMapRef.current.get(String(sourceId)) ?? null;
          setActiveIssue(issue);
        }
      }}
      onDragOver={() => {
        // Intentionally empty — v0.4 owns visual reorder via useSortable's
        // index/group props. State mutation here would break WS race
        // immunity (Hard Constraint 12 in 05-UI-SPEC).
      }}
      onDragEnd={(event) => {
        isDraggingRef.current = false;
        setActiveIssue(null);
        // Hard Constraint 13: 1-frame freeze gate so v0.4's collision detection
        // settles before TQ-driven re-derivation overwrites local columns.
        recentlyMovedRef.current = true;

        const { canceled, operation } = event;
        const source = operation.source;
        if (canceled || !source) return;
        if (!isSortable(source)) return;

        const { initialIndex, index, initialGroup, group, id } = source;
        if (initialGroup == null || group == null) return;
        if (initialGroup === group && initialIndex === index) return;

        const finalCol = String(group) as IssueStatus;
        const initialCol = String(initialGroup) as IssueStatus;
        const finalIds = computeFinalColumnIds(
          initialCol,
          finalCol,
          initialIndex,
          index,
          columnsRef.current,
        );
        const issueId = String(id);
        const newPosition = computePosition(finalIds, issueId, issueMapRef.current);

        const currentIssue = issueMapRef.current.get(issueId);
        if (
          currentIssue &&
          currentIssue.status === finalCol &&
          currentIssue.position === newPosition
        ) {
          return;
        }

        onMoveIssue(issueId, finalCol, newPosition);
      }}
    >
      <div className="flex flex-1 min-h-0 gap-4 overflow-x-auto p-4">
        {visibleStatuses.map((status) => (
          <PaginatedBoardColumn
            key={status}
            status={status}
            issues={columnIssueLists[status] ?? []}
            childProgressMap={childProgressMap}
            myIssuesOpts={myIssuesOpts}
          />
        ))}

        {hiddenStatuses.length > 0 && (
          <HiddenColumnsPanel
            hiddenStatuses={hiddenStatuses}
            myIssuesOpts={myIssuesOpts}
          />
        )}
      </div>

      {/*
        v0.4 ships its own DragOverlay primitive (re-exported from `@dnd-kit/react`).
        Plan 01 Open Question 1 RESOLVED: chose the built-in DragOverlay over the
        Feedback plugin (Path A) or a manual portal (Path B) because the v0.4 React
        adapter exports DragOverlay as a first-class primitive — no extra plugin
        registration needed and the API mirrors the v6 component we're replacing.
      */}
      <DragOverlay dropAnimation={null}>
        {activeIssue ? (
          <div className="w-[280px] rotate-2 scale-105 cursor-grabbing opacity-90 shadow-lg shadow-black/10">
            <BoardCardContent issue={activeIssue} childProgress={childProgressMap.get(activeIssue.id)} />
          </div>
        ) : null}
      </DragOverlay>
    </DragDropProvider>
  );
}

function PaginatedBoardColumn({
  status,
  issues,
  childProgressMap,
  myIssuesOpts,
}: {
  status: IssueStatus;
  issues: Issue[];
  childProgressMap?: Map<string, ChildProgress>;
  myIssuesOpts?: { scope: string; filter: MyIssuesFilter };
}) {
  const { loadMore, hasMore, isLoading, total } = useLoadMoreByStatus(
    status,
    myIssuesOpts,
  );
  return (
    <BoardColumn
      status={status}
      issues={issues}
      childProgressMap={childProgressMap}
      totalCount={total}
      footer={
        hasMore ? (
          <InfiniteScrollSentinel onVisible={loadMore} loading={isLoading} />
        ) : undefined
      }
    />
  );
}

function HiddenColumnsPanel({
  hiddenStatuses,
  myIssuesOpts,
}: {
  hiddenStatuses: IssueStatus[];
  myIssuesOpts?: { scope: string; filter: MyIssuesFilter };
}) {
  return (
    <div className="flex w-[240px] shrink-0 flex-col">
      <div className="mb-2 flex items-center gap-2 px-1">
        <span className="text-sm font-medium text-muted-foreground">
          Hidden columns
        </span>
      </div>
      <div className="flex-1 space-y-0.5">
        {hiddenStatuses.map((status) => (
          <HiddenColumnRow
            key={status}
            status={status}
            myIssuesOpts={myIssuesOpts}
          />
        ))}
      </div>
    </div>
  );
}

function HiddenColumnRow({
  status,
  myIssuesOpts,
}: {
  status: IssueStatus;
  myIssuesOpts?: { scope: string; filter: MyIssuesFilter };
}) {
  const cfg = STATUS_CONFIG[status];
  const viewStoreApi = useViewStoreApi();
  const { total } = useLoadMoreByStatus(status, myIssuesOpts);
  return (
    <div className="flex items-center justify-between rounded-lg px-2.5 py-2 hover:bg-muted/50">
      <div className="flex items-center gap-2">
        <StatusIcon status={status} className="h-3.5 w-3.5" />
        <span className="text-sm">{cfg.label}</span>
      </div>
      <div className="flex items-center gap-1.5">
        <span className="text-xs text-muted-foreground">{total}</span>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button
                variant="ghost"
                size="icon-sm"
                className="rounded-full text-muted-foreground"
              >
                <MoreHorizontal className="size-3.5" />
              </Button>
            }
          />
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              onClick={() => viewStoreApi.getState().showStatus(status)}
            >
              <Eye className="size-3.5" />
              Show column
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
