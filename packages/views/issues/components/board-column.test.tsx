import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { Issue, IssueStatus } from "@algoplan/core/types";

// ---------------------------------------------------------------------------
// Mocks (mirror issues-page.test.tsx pattern; v0.4 dnd-kit surface)
// ---------------------------------------------------------------------------

// Capture isDropTarget per-test via closure
const droppableState = { isDropTarget: false };

vi.mock("@dnd-kit/react", () => ({
  DragDropProvider: ({ children }: any) => children,
  DragOverlay: () => null,
  useDroppable: () => ({ ref: vi.fn(), isDropTarget: droppableState.isDropTarget }),
}));

vi.mock("@dnd-kit/react/sortable", () => ({
  useSortable: () => ({
    ref: vi.fn(),
    isDragging: false,
    isDropTarget: false,
    isDragSource: false,
    isDropping: false,
  }),
  isSortable: () => true,
}));

vi.mock("@dnd-kit/dom", () => ({
  AutoScroller: { configure: () => ({}) },
  PointerSensor: { configure: () => ({}) },
}));

vi.mock("@dnd-kit/abstract", () => ({
  CollisionPriority: { Lowest: 0, Low: 1, Normal: 2, High: 3, Highest: 4 },
}));

vi.mock("@algoplan/core/issues/config", () => ({
  STATUS_CONFIG: {
    backlog: { label: "Backlog", iconColor: "text-muted-foreground", hoverBg: "hover:bg-accent", dividerColor: "bg-muted-foreground/40", badgeBg: "bg-muted", badgeText: "text-muted-foreground", columnBg: "bg-muted/40" },
    todo: { label: "Todo", iconColor: "text-muted-foreground", hoverBg: "hover:bg-accent", dividerColor: "bg-muted-foreground/40", badgeBg: "bg-muted", badgeText: "text-muted-foreground", columnBg: "bg-muted/40" },
    in_progress: { label: "In Progress", iconColor: "text-warning", hoverBg: "hover:bg-warning/10", dividerColor: "bg-warning", badgeBg: "bg-warning", badgeText: "text-white", columnBg: "bg-warning/5" },
    in_review: { label: "In Review", iconColor: "text-success", hoverBg: "hover:bg-success/10", dividerColor: "bg-success", badgeBg: "bg-success", badgeText: "text-white", columnBg: "bg-success/5" },
    done: { label: "Done", iconColor: "text-info", hoverBg: "hover:bg-info/10", dividerColor: "bg-info", badgeBg: "bg-info", badgeText: "text-white", columnBg: "bg-info/5" },
    blocked: { label: "Blocked", iconColor: "text-destructive", hoverBg: "hover:bg-destructive/10", dividerColor: "bg-destructive", badgeBg: "bg-destructive", badgeText: "text-white", columnBg: "bg-destructive/5" },
    cancelled: { label: "Cancelled", iconColor: "text-muted-foreground", hoverBg: "hover:bg-accent", dividerColor: "bg-muted-foreground/40", badgeBg: "bg-muted", badgeText: "text-muted-foreground", columnBg: "bg-muted/40" },
  },
  PRIORITY_CONFIG: {
    urgent: { label: "Urgent", badgeBg: "bg-tag-p0", badgeText: "text-white" },
    high: { label: "High", badgeBg: "bg-tag-p1", badgeText: "text-white" },
    medium: { label: "Medium", badgeBg: "bg-tag-p2", badgeText: "text-white" },
    low: { label: "Low", badgeBg: "bg-tag-p3", badgeText: "text-white" },
    none: { label: "No priority", badgeBg: "bg-muted", badgeText: "text-muted-foreground" },
  },
}));

const modalOpen = vi.fn();
vi.mock("@algoplan/core/modals", () => ({
  useModalStore: Object.assign(
    () => ({ open: modalOpen }),
    { getState: () => ({ open: modalOpen }) },
  ),
}));

const hideStatusFn = vi.fn();
vi.mock("@algoplan/core/issues/stores/view-store-context", () => ({
  useViewStore: (selector?: any) => {
    const state = { cardProperties: { priority: false, description: false, assignee: false, dueDate: false, project: false, childProgress: false } };
    return selector ? selector(state) : state;
  },
  useViewStoreApi: () => ({
    getState: () => ({ hideStatus: hideStatusFn }),
    setState: vi.fn(),
    subscribe: vi.fn(),
  }),
}));

// DraggableBoardCard would otherwise drag in @algoplan/core/hooks etc. Mock it as
// a passive renderer — Plan 02 doesn't test card behaviour from the column.
vi.mock("./board-card", () => ({
  DraggableBoardCard: ({ issue }: any) => <div data-testid={`card-${issue.id}`}>{issue.title}</div>,
}));

vi.mock("./status-icon", () => ({
  StatusIcon: () => null,
}));

// InlineTaskAdd — render a passive textbox + cancel button so the BoardColumn
// integration tests can assert mount/unmount on add-trigger / Esc without
// pulling in the real mutation stack.
vi.mock("./inline-task-add", () => ({
  InlineTaskAdd: ({ onCancel }: { onCancel: () => void }) => (
    <div data-testid="inline-task-add">
      <input
        type="text"
        aria-label="Aufgabentitel eingeben"
        onKeyDown={(e) => {
          if (e.key === "Escape") onCancel();
        }}
      />
      <button type="button" onClick={onCancel}>Abbrechen</button>
    </div>
  ),
}));

// ---------------------------------------------------------------------------
// Import (after mocks)
// ---------------------------------------------------------------------------

import { BoardColumn } from "./board-column";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeIssue(id: string): Issue {
  return {
    id,
    workspace_id: "ws-1",
    number: 1,
    identifier: id.toUpperCase(),
    title: `Issue ${id}`,
    description: null,
    status: "todo",
    priority: "medium",
    assignee_type: null,
    assignee_id: null,
    creator_type: "member",
    creator_id: "user-1",
    parent_issue_id: null,
    project_id: null,
    position: 0,
    due_date: null,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
  };
}

interface RenderColumnOpts {
  status?: IssueStatus;
  issueIds?: string[];
  isDropTarget?: boolean;
}
function renderColumn(opts: RenderColumnOpts = {}) {
  const status = opts.status ?? "todo";
  const ids = opts.issueIds ?? [];
  droppableState.isDropTarget = opts.isDropTarget ?? false;
  const issues = ids.map(makeIssue).map((i) => ({ ...i, status }));
  return render(<BoardColumn status={status} issues={issues} />);
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("BoardColumn - KBN-07 visual contract", () => {
  it("outer wrapper has data-board-column-root (W-3 - Plan 05 KBN-02 spec consumer)", () => {
    const { container } = renderColumn({ status: "in_progress" });
    const root = container.querySelector("[data-board-column-root]");
    expect(root).toBeTruthy();
    // Body lives INSIDE root (the spec walks up from body via .closest()).
    const body = root?.querySelector("[data-board-column-body]");
    expect(body).toBeTruthy();
  });

  it("status badge label has 'italic' class", () => {
    const { container } = renderColumn({ status: "in_progress" });
    const label = container.querySelector("[data-board-column-status-label]");
    expect(label).toBeTruthy();
    expect(label?.className).toMatch(/italic/);
    expect(label?.className).toMatch(/font-semibold/);
  });

  it("count span has tabular-nums", () => {
    const { container } = renderColumn({ status: "todo", issueIds: ["a", "b", "c"] });
    const count = container.querySelector("[data-board-column-count]");
    expect(count).toBeTruthy();
    expect(count?.className).toMatch(/tabular-nums/);
  });

  it("drop target adds ring-2 ring-brand", () => {
    const { container } = renderColumn({ isDropTarget: true });
    const body = container.querySelector("[data-board-column-body]");
    expect(body).toBeTruthy();
    expect(body?.className).toMatch(/ring-2/);
    expect(body?.className).toMatch(/ring-brand/);
  });

  it("empty column shows 'Keine Issues'", () => {
    const { getByText } = renderColumn({ issueIds: [] });
    expect(getByText("Keine Issues")).toBeTruthy();
  });

  it("empty + drop-target shows 'Hier ablegen' (NOT 'Keine Issues')", () => {
    const { getByText, queryByText } = renderColumn({ issueIds: [], isDropTarget: true });
    expect(getByText("Hier ablegen")).toBeTruthy();
    expect(queryByText("Keine Issues")).toBeNull();
  });

  it("add-button tooltip = 'Issue hinzufügen'", () => {
    const { container } = renderColumn();
    const trigger = container.querySelector("[data-board-column-add-trigger]");
    expect(trigger).toBeTruthy();
    expect(trigger?.getAttribute("aria-label")).toBe("Issue hinzufügen");
  });

  it("dropdown menu item label = 'Spalte ausblenden' (German)", async () => {
    const user = userEvent.setup();
    const { container, findByText } = renderColumn();
    const menuTrigger = container.querySelector("[data-board-column-menu-trigger]") as HTMLElement;
    expect(menuTrigger).toBeTruthy();
    await user.click(menuTrigger);
    expect(await findByText("Spalte ausblenden")).toBeTruthy();
  });

  it("clicking + add-trigger mounts InlineTaskAdd; Esc on input closes it (KBN-03)", async () => {
    const user = userEvent.setup();
    const { container, queryByTestId, getByRole } = renderColumn();
    expect(queryByTestId("inline-task-add")).toBeNull();
    const trigger = container.querySelector("[data-board-column-add-trigger]") as HTMLElement;
    await user.click(trigger);
    expect(queryByTestId("inline-task-add")).toBeTruthy();
    const input = getByRole("textbox") as HTMLInputElement;
    input.focus();
    await user.keyboard("{Escape}");
    expect(queryByTestId("inline-task-add")).toBeNull();
  });
});
