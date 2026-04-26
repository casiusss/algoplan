import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const navigatePush = vi.hoisted(() => vi.fn());

// `not-found-page.tsx` uses sibling-relative imports (`../navigation`,
// `../platform`) — vi.mock matches by the import specifier as written, so we
// mock the same paths here.
vi.mock("../navigation", () => ({
  useNavigation: () => ({ push: navigatePush, replace: vi.fn(), back: vi.fn() }),
}));

vi.mock("../platform", () => ({
  DragStrip: () => <div data-testid="drag-strip-stub" />,
}));

import { NotFoundPage } from "./not-found-page";

describe("NotFoundPage (WS-04)", () => {
  it("renders the German title", () => {
    render(<NotFoundPage />);
    expect(
      screen.getByRole("heading", { name: "Seite nicht gefunden" }),
    ).toBeInTheDocument();
  });

  it("renders the German body copy", () => {
    render(<NotFoundPage />);
    expect(
      screen.getByText(
        "Diese Seite gibt es nicht oder sie wurde verschoben.",
      ),
    ).toBeInTheDocument();
  });

  it("renders the primary CTA labeled 'Zur Startseite'", () => {
    render(<NotFoundPage />);
    expect(
      screen.getByRole("button", { name: "Zur Startseite" }),
    ).toBeInTheDocument();
  });

  it("clicking the CTA calls useNavigation().push('/')", async () => {
    render(<NotFoundPage />);
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Zur Startseite" }));
    expect(navigatePush).toHaveBeenCalledWith("/");
  });

  it("DragStrip is the FIRST flex child of the page-root flex container", () => {
    const { container } = render(<NotFoundPage />);
    // Page root: <div class="flex min-h-svh flex-col bg-background">
    const pageRoot = container.firstElementChild;
    expect(pageRoot).not.toBeNull();
    expect(pageRoot!.className).toContain("flex");
    // First child must be the DragStrip stub.
    const firstChild = pageRoot!.firstElementChild;
    expect(firstChild).not.toBeNull();
    expect(firstChild!.getAttribute("data-testid")).toBe("drag-strip-stub");
  });

  it("includes the AlgoPlanWordmark above the title", () => {
    render(<NotFoundPage />);
    // The wordmark renders the literal "AlgoPlan" text in a span.
    expect(screen.getByTestId("algoplan-wordmark")).toBeInTheDocument();
  });
});
