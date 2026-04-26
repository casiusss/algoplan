import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const { mockBlockerCount } = vi.hoisted(() => ({
  mockBlockerCount: vi.fn<(wsId: string | undefined) => number>(() => 0),
}));

vi.mock("@algoplan/core/issues/derived", () => ({
  useBlockerCount: (wsId: string | undefined) => mockBlockerCount(wsId),
}));

import { BlockerBadge } from "./blocker-badge";

describe("BlockerBadge", () => {
  beforeEach(() => {
    mockBlockerCount.mockReset();
    mockBlockerCount.mockReturnValue(0);
  });

  it("renders an icon-only button when count = 0", () => {
    render(<BlockerBadge wsId="ws-1" />);
    const button = screen.getByRole("button", { name: "Blockers" });
    expect(button).toBeInTheDocument();
    // No tabular-nums numeric badge appears when count is zero
    expect(document.querySelector(".tabular-nums")).toBeNull();
  });

  it("uses muted-foreground icon color when count = 0", () => {
    const { container } = render(<BlockerBadge wsId="ws-1" />);
    const svg = container.querySelector("svg");
    expect(svg?.getAttribute("class")).toMatch(/text-muted-foreground/);
  });

  it("renders the count badge with bg-tag-p0 when count > 0", () => {
    mockBlockerCount.mockReturnValue(5);
    render(<BlockerBadge wsId="ws-1" />);
    const countBadge = screen.getByText("5");
    expect(countBadge.className).toMatch(/bg-tag-p0/);
    expect(countBadge.className).toMatch(/text-tag-p0-foreground/);
    expect(countBadge.className).toMatch(/tabular-nums/);
    expect(countBadge.className).toMatch(/font-semibold/);
    expect(countBadge.className).toMatch(/rounded-full/);
  });

  it("uses singular 'blocker' aria-label when count === 1", () => {
    mockBlockerCount.mockReturnValue(1);
    render(<BlockerBadge wsId="ws-1" />);
    const button = screen.getByRole("button");
    expect(button.getAttribute("aria-label")).toBe("1 blocker");
  });

  it("uses plural 'blockers' aria-label when count > 1", () => {
    mockBlockerCount.mockReturnValue(5);
    render(<BlockerBadge wsId="ws-1" />);
    const button = screen.getByRole("button");
    expect(button.getAttribute("aria-label")).toBe("5 blockers");
  });

  it("uses generic 'Blockers' aria-label when count === 0", () => {
    render(<BlockerBadge wsId="ws-1" />);
    const button = screen.getByRole("button");
    expect(button.getAttribute("aria-label")).toBe("Blockers");
  });

  it("uses 'Blockers' as the title (tooltip) regardless of count", () => {
    mockBlockerCount.mockReturnValue(3);
    render(<BlockerBadge wsId="ws-1" />);
    const button = screen.getByRole("button");
    expect(button.getAttribute("title")).toBe("Blockers");
  });

  it("clicking the button opens a popover with the stub message", async () => {
    const user = userEvent.setup();
    render(<BlockerBadge wsId="ws-1" />);
    await user.click(screen.getByRole("button", { name: "Blockers" }));
    expect(
      await screen.findByText("No blockers right now."),
    ).toBeInTheDocument();
  });

  it("works with wsId={undefined} without throwing", () => {
    expect(() => render(<BlockerBadge wsId={undefined} />)).not.toThrow();
    expect(screen.getByRole("button", { name: "Blockers" })).toBeInTheDocument();
  });

  it("forwards wsId prop to useBlockerCount hook", () => {
    render(<BlockerBadge wsId="ws-42" />);
    expect(mockBlockerCount).toHaveBeenCalledWith("ws-42");
  });
});
