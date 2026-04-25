import { describe, it, expect, vi, beforeEach } from "vitest";
import { render } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// ---------------------------------------------------------------------------
// Mocks (CLAUDE.md Zustand idiom: Object.assign(selectorFn, { getState }))
// ---------------------------------------------------------------------------

const setViewMode = vi.fn();
let mockViewMode: "board" | "list" = "board";

vi.mock("@multica/core/issues/stores/view-store-context", () => ({
  useViewStore: (selector: (s: { viewMode: "board" | "list" }) => unknown) =>
    selector({ viewMode: mockViewMode }),
  useViewStoreApi: () => ({
    getState: () => ({ setViewMode }),
    setState: vi.fn(),
    subscribe: vi.fn(),
  }),
}));

// ---------------------------------------------------------------------------
// Import (after mocks)
// ---------------------------------------------------------------------------

import { ViewToggle } from "./view-toggle";

// ---------------------------------------------------------------------------
// Tests — KBN-04 view-toggle contract
// ---------------------------------------------------------------------------

describe("ViewToggle - KBN-04", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockViewMode = "board";
  });

  it("renders SegmentedControl with Board + Liste items", () => {
    const { getByText } = render(<ViewToggle />);
    expect(getByText("Board")).toBeTruthy();
    expect(getByText("Liste")).toBeTruthy();
  });

  it("aria-label = 'Ansicht wechseln'", () => {
    const { container } = render(<ViewToggle />);
    const root = container.querySelector('[aria-label="Ansicht wechseln"]');
    expect(root).toBeTruthy();
  });

  it("clicking 'Liste' calls setViewMode('list')", async () => {
    const user = userEvent.setup();
    const { getByText } = render(<ViewToggle />);
    await user.click(getByText("Liste"));
    expect(setViewMode).toHaveBeenCalledWith("list");
  });

  it("clicking 'Board' (when on list) calls setViewMode('board')", async () => {
    mockViewMode = "list";
    const user = userEvent.setup();
    const { getByText } = render(<ViewToggle />);
    await user.click(getByText("Board"));
    expect(setViewMode).toHaveBeenCalledWith("board");
  });

  it("ArrowRight from Board focuses Liste (Phase 2 ToggleGroup contract)", async () => {
    const user = userEvent.setup();
    const { getByText } = render(<ViewToggle />);
    const board = getByText("Board");
    board.focus();
    await user.keyboard("{ArrowRight}");
    expect(document.activeElement?.textContent).toBe("Liste");
  });
});
