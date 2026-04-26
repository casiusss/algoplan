import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const { mockOpen } = vi.hoisted(() => ({ mockOpen: vi.fn() }));

vi.mock("@algoplan/core/modals", () => ({
  useModalStore: {
    getState: () => ({ open: mockOpen }),
  },
}));

import { PrimaryCTA } from "./primary-cta";

describe("PrimaryCTA", () => {
  beforeEach(() => {
    mockOpen.mockReset();
  });

  it("renders a button with the exact label '+ New issue'", () => {
    render(<PrimaryCTA />);
    expect(screen.getByRole("button", { name: "+ New issue" })).toBeInTheDocument();
  });

  it("displays the visible '+ New issue' text", () => {
    render(<PrimaryCTA />);
    expect(screen.getByText("+ New issue")).toBeInTheDocument();
  });

  it("clicking the button calls useModalStore.getState().open with 'create-issue'", async () => {
    const user = userEvent.setup();
    render(<PrimaryCTA />);
    await user.click(screen.getByRole("button", { name: "+ New issue" }));
    expect(mockOpen).toHaveBeenCalledTimes(1);
    expect(mockOpen).toHaveBeenCalledWith("create-issue");
  });

  it("renders a button (no SVG icon — '+' is a literal character per UI-SPEC §12)", () => {
    const { container } = render(<PrimaryCTA />);
    expect(container.querySelector("svg")).toBeNull();
  });
});
