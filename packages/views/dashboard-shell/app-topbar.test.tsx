import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen } from "@testing-library/react";

// ---------------------------------------------------------------------------
// Mock the four child atoms so AppTopbar's composition is isolated from each
// atom's internal store wiring. Each mock renders a unique data-testid marker;
// BlockerBadge additionally surfaces the wsId prop via data-wsid so the
// pass-through assertion can read it back.
// ---------------------------------------------------------------------------

vi.mock("./filter-chip-row", () => ({
  FilterChipRow: () => <div data-testid="filter-chip-row" />,
}));

vi.mock("./blocker-badge", () => ({
  BlockerBadge: ({ wsId }: { wsId: string | undefined }) => (
    <div data-testid="blocker-badge" data-wsid={wsId ?? ""} />
  ),
}));

vi.mock("./search-input", () => ({
  SearchInput: () => <div data-testid="search-input" />,
}));

vi.mock("./primary-cta", () => ({
  PrimaryCTA: () => <div data-testid="primary-cta" />,
}));

import { AppTopbar } from "./app-topbar";

describe("AppTopbar", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
  });

  it("renders the four atoms in DOM order: FilterChipRow, BlockerBadge, [spacer], SearchInput, PrimaryCTA", () => {
    const { container } = render(<AppTopbar wsId="ws-1" />);
    const header = container.querySelector("header");
    expect(header).not.toBeNull();
    const children = Array.from(header!.children);
    // 5 direct children: filter row, blocker badge, flex-1 spacer, search input, primary cta
    expect(children).toHaveLength(5);
    expect(children[0]).toHaveAttribute("data-testid", "filter-chip-row");
    expect(children[1]).toHaveAttribute("data-testid", "blocker-badge");
    expect(children[2]).toHaveClass("flex-1");
    expect(children[3]).toHaveAttribute("data-testid", "search-input");
    expect(children[4]).toHaveAttribute("data-testid", "primary-cta");
  });

  it("container is a <header> with the documented layout + token classes (h-12, shrink-0, flex, items-center, gap-2, border-b, border-border, bg-background, px-4)", () => {
    const { container } = render(<AppTopbar wsId="ws-1" />);
    const header = container.querySelector("header");
    expect(header).not.toBeNull();
    expect(header).toHaveClass(
      "h-12",
      "shrink-0",
      "flex",
      "items-center",
      "gap-2",
      "border-b",
      "border-border",
      "bg-background",
      "px-4",
    );
  });

  it("when searchSlot is provided, the default <SearchInput> is NOT rendered and the custom element appears in its position", () => {
    const { container } = render(
      <AppTopbar
        wsId="ws-1"
        searchSlot={<div data-testid="custom-search">custom</div>}
      />,
    );
    expect(screen.queryByTestId("search-input")).toBeNull();
    expect(screen.getByTestId("custom-search")).toBeInTheDocument();
    // Custom slot occupies the SearchInput position (4th child, between spacer and PrimaryCTA)
    const header = container.querySelector("header");
    const children = Array.from(header!.children);
    expect(children[3]).toHaveAttribute("data-testid", "custom-search");
    expect(children[4]).toHaveAttribute("data-testid", "primary-cta");
  });

  it("passes wsId through to BlockerBadge", () => {
    render(<AppTopbar wsId="ws-42" />);
    expect(screen.getByTestId("blocker-badge")).toHaveAttribute("data-wsid", "ws-42");
  });

  it("when wsId is undefined, BlockerBadge still mounts (it's wsId-tolerant per Plan 03)", () => {
    render(<AppTopbar wsId={undefined} />);
    const badge = screen.getByTestId("blocker-badge");
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveAttribute("data-wsid", "");
  });

  it("when wsId prop is omitted entirely, AppTopbar still mounts and BlockerBadge receives undefined", () => {
    render(<AppTopbar />);
    expect(screen.getByTestId("blocker-badge")).toHaveAttribute("data-wsid", "");
    expect(screen.getByTestId("filter-chip-row")).toBeInTheDocument();
    expect(screen.getByTestId("primary-cta")).toBeInTheDocument();
  });
});
