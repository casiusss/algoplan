import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { EmptyState } from "./empty-state";

describe("EmptyState atom", () => {
  it("renders heading and body", () => {
    render(<EmptyState heading="Keine Benachrichtigungen" body="Alles erledigt." />);
    expect(
      screen.getByText("Keine Benachrichtigungen"),
    ).toBeInTheDocument();
    expect(screen.getByText("Alles erledigt.")).toBeInTheDocument();
  });

  it("renders heading without body when body omitted", () => {
    const { container } = render(
      <EmptyState heading="Noch keine Agenten" />,
    );
    expect(screen.getByText("Noch keine Agenten")).toBeInTheDocument();
    // No <p> element should be present
    expect(container.querySelector("p")).toBeNull();
  });

  it("renders illustration slot when provided", () => {
    render(
      <EmptyState
        heading="Empty"
        illustration={<div data-testid="custom-illustration">svg</div>}
      />,
    );
    expect(screen.getByTestId("custom-illustration")).toBeInTheDocument();
  });

  it("does not render illustration slot when not provided", () => {
    const { container } = render(<EmptyState heading="Empty" />);
    expect(
      container.querySelector("[data-testid='empty-state-illustration']"),
    ).toBeNull();
  });

  it("renders cta button only when cta prop is set", () => {
    const onClick = vi.fn();
    const { rerender } = render(<EmptyState heading="x" />);
    expect(screen.queryByRole("button")).toBeNull();

    rerender(
      <EmptyState heading="x" cta={{ label: "Hinzufügen", onClick }} />,
    );
    expect(
      screen.getByRole("button", { name: "Hinzufügen" }),
    ).toBeInTheDocument();
  });

  it("clicking the cta fires cta.onClick", async () => {
    const onClick = vi.fn();
    render(
      <EmptyState heading="x" cta={{ label: "Erstellen", onClick }} />,
    );
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Erstellen" }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});
