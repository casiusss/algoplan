import { describe, it, expect, vi } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * Plan 01 GREEN tests — KBN-01 / KBN-02 / KBN-06 contracts.
 *
 * Two behavioural tests prove the v0.4 onDragEnd source destructure produces the
 * expected `onMoveIssue(id, status, position)` call (KBN-06). Four source-level
 * invariant tests guard the load-bearing patterns:
 *   - KBN-02: AutoScroller plugin configuration (acceleration:15, threshold y:0.3)
 *   - KBN-01: requestAnimationFrame-driven recentlyMovedRef freeze (Hard Constraint 13)
 *   - KBN-01: useEffect column derivation gated on !isDraggingRef.current (Hard Constraint 12)
 *   - KBN-05: no legacy @dnd-kit/{core,sortable,utilities} imports remain
 */

// ---------------------------------------------------------------------------
// Hoisted handler captures
// ---------------------------------------------------------------------------
// The mock for @dnd-kit/react stores the latest onDragEnd callback in a hoisted
// ref so behavioural tests can invoke it with synthesised v0.4 event objects
// (no real DOM drag required — same idiom as <SegmentedControl> Harness).

const dndCaptured = vi.hoisted(() => ({
  onDragStart: undefined as ((event: any, manager: any) => void) | undefined,
  onDragOver: undefined as ((event: any, manager: any) => void) | undefined,
  onDragEnd: undefined as ((event: any, manager: any) => void) | undefined,
}));

vi.mock("@dnd-kit/react", () => ({
  DragDropProvider: ({ children, onDragStart, onDragOver, onDragEnd }: any) => {
    dndCaptured.onDragStart = onDragStart;
    dndCaptured.onDragOver = onDragOver;
    dndCaptured.onDragEnd = onDragEnd;
    return children;
  },
  DragOverlay: () => null,
  useDroppable: () => ({ ref: vi.fn(), isDropTarget: false }),
}));

vi.mock("@dnd-kit/react/sortable", () => ({
  useSortable: () => ({
    ref: vi.fn(),
    isDragging: false,
    isDropTarget: false,
    isDragSource: false,
    isDropping: false,
  }),
  // The behavioural tests rely on `isSortable` returning true for the
  // synthesised source object so the onDragEnd code path proceeds.
  isSortable: () => true,
}));

vi.mock("@dnd-kit/dom", () => ({
  AutoScroller: { configure: () => ({}) },
  PointerSensor: { configure: () => ({}) },
}));

vi.mock("@dnd-kit/abstract", () => ({
  CollisionPriority: { Lowest: 0, Low: 1, Normal: 2, High: 3, Highest: 4 },
}));

// ---------------------------------------------------------------------------
// Domain mocks
// ---------------------------------------------------------------------------

vi.mock("@multica/core/hooks", () => ({
  useWorkspaceId: () => "ws-1",
}));

vi.mock("@multica/core/issues/mutations", () => ({
  useLoadMoreByStatus: () => ({
    loadMore: vi.fn(),
    hasMore: false,
    isLoading: false,
    total: 0,
  }),
  useUpdateIssue: () => ({ mutate: vi.fn() }),
}));

vi.mock("@multica/core/issues/config", () => ({
  ALL_STATUSES: ["backlog", "todo", "in_progress", "in_review", "done", "blocked", "cancelled"],
  BOARD_STATUSES: ["backlog", "todo", "in_progress", "in_review", "done", "blocked"],
  STATUS_ORDER: ["backlog", "todo", "in_progress", "in_review", "done", "blocked", "cancelled"],
  STATUS_CONFIG: {
    backlog: { label: "Backlog", columnBg: "", badgeBg: "", badgeText: "" },
    todo: { label: "Todo", columnBg: "", badgeBg: "", badgeText: "" },
    in_progress: { label: "In Progress", columnBg: "", badgeBg: "", badgeText: "" },
    in_review: { label: "In Review", columnBg: "", badgeBg: "", badgeText: "" },
    done: { label: "Done", columnBg: "", badgeBg: "", badgeText: "" },
    blocked: { label: "Blocked", columnBg: "", badgeBg: "", badgeText: "" },
    cancelled: { label: "Cancelled", columnBg: "", badgeBg: "", badgeText: "" },
  },
  PRIORITY_ORDER: ["urgent", "high", "medium", "low", "none"],
  PRIORITY_CONFIG: {
    urgent: { label: "Urgent", badgeBg: "", badgeText: "" },
    high: { label: "High", badgeBg: "", badgeText: "" },
    medium: { label: "Medium", badgeBg: "", badgeText: "" },
    low: { label: "Low", badgeBg: "", badgeText: "" },
    none: { label: "None", badgeBg: "", badgeText: "" },
  },
}));

const mockViewState = {
  sortBy: "position" as const,
  sortDirection: "asc" as const,
  cardProperties: { priority: false, description: false, assignee: false, dueDate: false, project: false, childProgress: false },
  hideStatus: vi.fn(),
  showStatus: vi.fn(),
};

vi.mock("@multica/core/issues/stores/view-store-context", () => ({
  useViewStore: (selector?: any) => (selector ? selector(mockViewState) : mockViewState),
  useViewStoreApi: () => ({ getState: () => mockViewState, setState: vi.fn(), subscribe: vi.fn() }),
}));

vi.mock("@multica/core/modals", () => ({
  useModalStore: Object.assign(
    () => ({ open: vi.fn() }),
    { getState: () => ({ open: vi.fn() }) },
  ),
}));

vi.mock("@multica/core/paths", () => ({
  useWorkspacePaths: () => ({
    issueDetail: (id: string) => `/issues/${id}`,
  }),
}));

vi.mock("@multica/core/projects/queries", () => ({
  projectListOptions: () => ({ queryKey: ["projects"], queryFn: () => Promise.resolve([]) }),
}));

vi.mock("../../navigation", () => ({
  AppLink: ({ children, href, ...props }: any) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock("../../common/actor-avatar", () => ({
  ActorAvatar: () => null,
}));

vi.mock("@tanstack/react-query", async () => {
  const actual = await vi.importActual<typeof import("@tanstack/react-query")>(
    "@tanstack/react-query",
  );
  return {
    ...actual,
    useQuery: () => ({ data: [], isLoading: false }),
  };
});

vi.mock("sonner", () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}));

// ---------------------------------------------------------------------------
// Behavioural setup
// ---------------------------------------------------------------------------

import { render } from "@testing-library/react";
import { BoardView } from "./board-view";
import type { Issue, IssueStatus } from "@multica/core/types";

const issueDefaults = {
  workspace_id: "ws-1",
  parent_issue_id: null,
  project_id: null,
  description: null,
  assignee_type: null,
  assignee_id: null,
  creator_type: "member" as const,
  creator_id: "user-1",
  due_date: null,
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
};

function makeIssue(id: string, status: IssueStatus, position: number, number: number): Issue {
  return {
    ...issueDefaults,
    id,
    number,
    identifier: `TES-${number}`,
    title: `Issue ${id}`,
    status,
    priority: "medium" as const,
    position,
  };
}

const fixtureIssues: Issue[] = [
  makeIssue("i1", "todo", 100, 1),
  makeIssue("i2", "todo", 200, 2),
  makeIssue("i3", "in_progress", 300, 3),
];

function renderBoard(onMoveIssue: (id: string, status: IssueStatus, position?: number) => void) {
  return render(
    <BoardView
      issues={fixtureIssues}
      visibleStatuses={["todo", "in_progress"]}
      hiddenStatuses={[]}
      onMoveIssue={onMoveIssue}
    />,
  );
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("BoardView — KBN-06 onMoveIssue contract (v0.4 source destructure)", () => {
  it("calls onMoveIssue(id, status, position) when source has changed group", () => {
    const onMoveIssue = vi.fn();
    renderBoard(onMoveIssue);

    expect(dndCaptured.onDragEnd).toBeDefined();
    // Synthesise a v0.4 dragend event: cross-column move i1 from todo[0] → in_progress[1].
    dndCaptured.onDragEnd!(
      {
        canceled: false,
        operation: {
          source: {
            id: "i1",
            initialIndex: 0,
            index: 1,
            initialGroup: "todo",
            group: "in_progress",
          },
          target: null,
        },
      },
      undefined,
    );

    expect(onMoveIssue).toHaveBeenCalledTimes(1);
    expect(onMoveIssue).toHaveBeenCalledWith("i1", "in_progress", expect.any(Number));
  });

  it("does NOT call onMoveIssue when canceled=true", () => {
    const onMoveIssue = vi.fn();
    renderBoard(onMoveIssue);

    expect(dndCaptured.onDragEnd).toBeDefined();
    dndCaptured.onDragEnd!(
      {
        canceled: true,
        operation: {
          source: {
            id: "i1",
            initialIndex: 0,
            index: 1,
            initialGroup: "todo",
            group: "in_progress",
          },
          target: null,
        },
      },
      undefined,
    );

    expect(onMoveIssue).not.toHaveBeenCalled();
  });
});

describe("BoardView — KBN-01 / KBN-02 / KBN-05 source-level invariants", () => {
  const SRC = readFileSync(resolve(__dirname, "board-view.tsx"), "utf8");

  it("KBN-02: AutoScroller.configure called with acceleration:15 + threshold y:0.3", () => {
    expect(SRC).toMatch(/AutoScroller\.configure\(\s*\{[^}]*acceleration:\s*15/);
    expect(SRC).toMatch(/threshold:\s*\{\s*x:\s*0,\s*y:\s*0\.3\s*\}/);
  });

  it("KBN-01 Hard Constraint 13: recentlyMovedRef is reset via requestAnimationFrame", () => {
    expect(SRC).toMatch(/recentlyMovedRef\s*=\s*useRef/);
    expect(SRC).toMatch(/requestAnimationFrame\(/);
  });

  it("KBN-01 Hard Constraint 12: useEffect column derivation is gated on !isDraggingRef.current", () => {
    expect(SRC).toMatch(/!\s*isDraggingRef\.current/);
  });

  it("KBN-05: no legacy @dnd-kit/{core,sortable,utilities} imports remain", () => {
    expect(SRC).not.toMatch(/@dnd-kit\/(core|sortable|utilities)/);
  });
});
