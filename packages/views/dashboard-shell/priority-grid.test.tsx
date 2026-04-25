import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const { mockState, mockToggle } = vi.hoisted(() => ({
  mockState: {
    current: {
      priorityFilters: [] as Array<"urgent" | "high" | "medium" | "low" | "none">,
    },
  },
  mockToggle: vi.fn(),
}));

vi.mock("@multica/core/issues/stores/view-store", () => {
  const useIssueViewStore = Object.assign(
    (selector?: (s: typeof mockState.current & { togglePriorityFilter: typeof mockToggle }) => unknown) => {
      const state = {
        ...mockState.current,
        togglePriorityFilter: mockToggle,
      };
      return selector ? selector(state) : state;
    },
    {
      getState: () => ({
        ...mockState.current,
        togglePriorityFilter: mockToggle,
      }),
    },
  );
  return { useIssueViewStore };
});

import { PriorityGrid } from "./priority-grid";

describe("PriorityGrid", () => {
  beforeEach(() => {
    mockState.current.priorityFilters = [];
    mockToggle.mockReset();
  });

  it("renders 4 buttons in P0/P1/P2/P3 order", () => {
    render(<PriorityGrid wsId="ws-1" />);
    const buttons = screen.getAllByRole("button");
    expect(buttons).toHaveLength(4);
    expect(buttons[0]?.getAttribute("aria-label")).toBe("Filter by P0");
    expect(buttons[1]?.getAttribute("aria-label")).toBe("Filter by P1");
    expect(buttons[2]?.getAttribute("aria-label")).toBe("Filter by P2");
    expect(buttons[3]?.getAttribute("aria-label")).toBe("Filter by P3");
  });

  it("renders the 'P0'..'P3' labels in the cell text", () => {
    render(<PriorityGrid wsId="ws-1" />);
    expect(screen.getByText("P0")).toBeInTheDocument();
    expect(screen.getByText("P1")).toBeInTheDocument();
    expect(screen.getByText("P2")).toBeInTheDocument();
    expect(screen.getByText("P3")).toBeInTheDocument();
  });

  it("renders no count badges when stub returns zero counts", () => {
    const { container } = render(<PriorityGrid wsId="ws-1" />);
    const numericBadges = container.querySelectorAll(".tabular-nums");
    expect(numericBadges.length).toBe(0);
  });

  it("active P0 cell carries 'ring-2 ring-tag-p0' classes", () => {
    mockState.current.priorityFilters = ["urgent"];
    render(<PriorityGrid wsId="ws-1" />);
    const p0Button = screen.getByLabelText("Filter by P0");
    expect(p0Button.className).toMatch(/ring-2/);
    expect(p0Button.className).toMatch(/ring-tag-p0/);
  });

  it("clicking P1 toggles 'high' priority on the store", async () => {
    const user = userEvent.setup();
    render(<PriorityGrid wsId="ws-1" />);
    await user.click(screen.getByLabelText("Filter by P1"));
    expect(mockToggle).toHaveBeenCalledWith("high");
  });

  it("clicking P2 toggles 'medium' priority on the store", async () => {
    const user = userEvent.setup();
    render(<PriorityGrid wsId="ws-1" />);
    await user.click(screen.getByLabelText("Filter by P2"));
    expect(mockToggle).toHaveBeenCalledWith("medium");
  });

  it("clicking P3 toggles 'low' priority on the store", async () => {
    const user = userEvent.setup();
    render(<PriorityGrid wsId="ws-1" />);
    await user.click(screen.getByLabelText("Filter by P3"));
    expect(mockToggle).toHaveBeenCalledWith("low");
  });

  it("root container is hidden when sidebar is in collapsed mode (group-data-[collapsible=icon]:hidden)", () => {
    const { container } = render(<PriorityGrid wsId="ws-1" />);
    const root = container.firstElementChild as HTMLElement | null;
    expect(root?.className).toMatch(/group-data-\[collapsible=icon\]:hidden/);
  });

  it("works with wsId={undefined} without throwing", () => {
    expect(() => render(<PriorityGrid wsId={undefined} />)).not.toThrow();
    expect(screen.getAllByRole("button")).toHaveLength(4);
  });
});
