import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ActorFilterValue } from "@algoplan/core/issues/stores/view-store";
import type { IssueStatus, IssuePriority } from "@algoplan/core/types";

const {
  mockState,
  mockTogglePriority,
  mockToggleStatus,
  mockToggleAssignee,
  mockClearFilters,
  mockPathname,
} = vi.hoisted(() => ({
  mockState: {
    current: {
      priorityFilters: [] as IssuePriority[],
      statusFilters: [] as IssueStatus[],
      assigneeFilters: [] as ActorFilterValue[],
    },
  },
  mockTogglePriority: vi.fn(),
  mockToggleStatus: vi.fn(),
  mockToggleAssignee: vi.fn(),
  mockClearFilters: vi.fn(),
  mockPathname: { current: "/ws-1/issues" },
}));

vi.mock("@algoplan/core/issues/stores/view-store", () => {
  const actions = {
    togglePriorityFilter: mockTogglePriority,
    toggleStatusFilter: mockToggleStatus,
    toggleAssigneeFilter: mockToggleAssignee,
    clearFilters: mockClearFilters,
  };
  const useIssueViewStore = Object.assign(
    (selector?: (s: typeof mockState.current & typeof actions) => unknown) => {
      const state = { ...mockState.current, ...actions };
      return selector ? selector(state) : state;
    },
    {
      getState: () => ({ ...mockState.current, ...actions }),
    },
  );
  return { useIssueViewStore };
});

vi.mock("../navigation", () => ({
  useNavigation: () => ({
    pathname: mockPathname.current,
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
    searchParams: new URLSearchParams(),
  }),
}));

import { FilterChipRow } from "./filter-chip-row";

describe("FilterChipRow", () => {
  beforeEach(() => {
    mockState.current.priorityFilters = [];
    mockState.current.statusFilters = [];
    mockState.current.assigneeFilters = [];
    mockTogglePriority.mockReset();
    mockToggleStatus.mockReset();
    mockToggleAssignee.mockReset();
    mockClearFilters.mockReset();
    mockPathname.current = "/ws-1/issues";
  });

  it("renders nothing on a non-issues path", () => {
    mockPathname.current = "/ws-1/settings";
    const { container } = render(<FilterChipRow />);
    expect(container.firstChild).toBeNull();
  });

  it("also renders on the my-issues path", () => {
    mockPathname.current = "/ws-1/my-issues";
    mockState.current.priorityFilters = ["urgent"];
    render(<FilterChipRow />);
    expect(screen.getByText("P0")).toBeInTheDocument();
  });

  it("renders an empty container when no filters are active", () => {
    const { container } = render(<FilterChipRow />);
    const root = container.firstElementChild as HTMLElement | null;
    expect(root).not.toBeNull();
    expect(root?.children.length).toBe(0);
  });

  it("renders a single TagChip with tag-p0 color and 'P0' label for an active 'urgent' priority filter", () => {
    mockState.current.priorityFilters = ["urgent"];
    render(<FilterChipRow />);
    const chip = screen.getByText("P0").closest("span");
    expect(chip).not.toBeNull();
    expect(chip?.className).toMatch(/bg-tag-p0/);
    expect(chip?.className).toMatch(/text-tag-p0-foreground/);
  });

  it("renders P1/P2/P3 chips with their matching tag colors", () => {
    mockState.current.priorityFilters = ["high", "medium", "low"];
    render(<FilterChipRow />);
    expect(screen.getByText("P1").closest("span")?.className).toMatch(
      /bg-tag-p1/,
    );
    expect(screen.getByText("P2").closest("span")?.className).toMatch(
      /bg-tag-p2/,
    );
    expect(screen.getByText("P3").closest("span")?.className).toMatch(
      /bg-tag-p3/,
    );
  });

  it("excludes 'none' priority from the chip output", () => {
    mockState.current.priorityFilters = ["none", "urgent"];
    render(<FilterChipRow />);
    expect(screen.getByText("P0")).toBeInTheDocument();
    // 'none' should not produce any chip with 'PNone', 'None' or similar
    expect(screen.queryByText("PN")).toBeNull();
    expect(screen.queryByText("None")).toBeNull();
  });

  it("renders a 'Clear all' button when ≥2 filters are active", async () => {
    mockState.current.priorityFilters = ["urgent", "high"];
    render(<FilterChipRow />);
    const clearButton = screen.getByRole("button", { name: /clear all/i });
    expect(clearButton).toBeInTheDocument();
    const user = userEvent.setup();
    await user.click(clearButton);
    expect(mockClearFilters).toHaveBeenCalledTimes(1);
  });

  it("does NOT render 'Clear all' when only one filter is active", () => {
    mockState.current.priorityFilters = ["urgent"];
    render(<FilterChipRow />);
    expect(screen.queryByRole("button", { name: /clear all/i })).toBeNull();
  });

  it("renders status filter chips with brand color and capitalized labels", () => {
    mockState.current.statusFilters = ["in_progress", "backlog"];
    render(<FilterChipRow />);
    const inProgress = screen.getByText("In Progress").closest("span");
    const backlog = screen.getByText("Backlog").closest("span");
    expect(inProgress?.className).toMatch(/bg-brand/);
    expect(backlog?.className).toMatch(/bg-brand/);
  });

  it("renders assignee filter chips with brand color and the assignee id as label", () => {
    mockState.current.assigneeFilters = [
      { type: "member", id: "user-42" },
      { type: "agent", id: "agent-7" },
    ];
    render(<FilterChipRow />);
    const userChip = screen.getByText("user-42").closest("span");
    const agentChip = screen.getByText("agent-7").closest("span");
    expect(userChip?.className).toMatch(/bg-brand/);
    expect(agentChip?.className).toMatch(/bg-brand/);
  });

  it("clicking a priority chip's remove button calls togglePriorityFilter with the matching IssuePriority", async () => {
    mockState.current.priorityFilters = ["urgent"];
    render(<FilterChipRow />);
    const removeButton = screen.getByRole("button", { name: /remove tag/i });
    const user = userEvent.setup();
    await user.click(removeButton);
    expect(mockTogglePriority).toHaveBeenCalledWith("urgent");
  });

  it("clicking a status chip's remove button calls toggleStatusFilter with the matching IssueStatus", async () => {
    mockState.current.statusFilters = ["backlog"];
    render(<FilterChipRow />);
    const removeButton = screen.getByRole("button", { name: /remove tag/i });
    const user = userEvent.setup();
    await user.click(removeButton);
    expect(mockToggleStatus).toHaveBeenCalledWith("backlog");
  });

  it("clicking an assignee chip's remove button calls toggleAssigneeFilter with the full ActorFilterValue", async () => {
    const value: ActorFilterValue = { type: "member", id: "user-42" };
    mockState.current.assigneeFilters = [value];
    render(<FilterChipRow />);
    const removeButton = screen.getByRole("button", { name: /remove tag/i });
    const user = userEvent.setup();
    await user.click(removeButton);
    expect(mockToggleAssignee).toHaveBeenCalledWith(value);
  });

  it("renders the root container with flex + gap-2 + flex-wrap classes", () => {
    mockState.current.priorityFilters = ["urgent"];
    const { container } = render(<FilterChipRow />);
    const root = container.firstElementChild as HTMLElement | null;
    expect(root?.className).toMatch(/flex/);
    expect(root?.className).toMatch(/gap-2/);
    expect(root?.className).toMatch(/flex-wrap/);
  });

  it("Clear all button is the LAST child after the chips", () => {
    mockState.current.priorityFilters = ["urgent", "high"];
    const { container } = render(<FilterChipRow />);
    const root = container.firstElementChild as HTMLElement | null;
    const lastChild = root?.lastElementChild as HTMLElement | null;
    expect(lastChild).not.toBeNull();
    expect(within(lastChild!).getByText(/clear all/i)).toBeInTheDocument();
  });
});
