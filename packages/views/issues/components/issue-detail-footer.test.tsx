import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { IssueDetailFooter } from "./issue-detail-footer";

describe("IssueDetailFooter — render", () => {
  it("renders the Löschen button (variant=destructive) on the left side", () => {
    render(<IssueDetailFooter onDelete={() => {}} />);
    expect(
      screen.getByRole("button", { name: /Löschen/ }),
    ).toBeInTheDocument();
  });

  it("renders the 'Esc zum Schließen' hint text", () => {
    render(<IssueDetailFooter onDelete={() => {}} />);
    expect(screen.getByText("Esc zum Schließen")).toBeInTheDocument();
  });

  it("renders the Fertig button when onDone is defined", () => {
    render(<IssueDetailFooter onDelete={() => {}} onDone={() => {}} />);
    expect(screen.getByRole("button", { name: "Fertig" })).toBeInTheDocument();
  });

  it("does NOT render the Fertig button when onDone is undefined", () => {
    render(<IssueDetailFooter onDelete={() => {}} />);
    expect(
      screen.queryByRole("button", { name: "Fertig" }),
    ).not.toBeInTheDocument();
  });

  it("Löschen button shows the trash icon (lucide Trash2)", () => {
    const { container } = render(<IssueDetailFooter onDelete={() => {}} />);
    // lucide icons render as <svg class="lucide lucide-trash-2 ..."> or carry
    // a similar lucide-trash class. Match either form.
    const icon = container.querySelector(
      'svg.lucide-trash-2, svg[class*="lucide-trash"]',
    );
    expect(icon).not.toBeNull();
  });
});

describe("IssueDetailFooter — interactions", () => {
  it("clicking Löschen fires onDelete()", async () => {
    const onDelete = vi.fn();
    render(<IssueDetailFooter onDelete={onDelete} />);
    await userEvent.click(screen.getByRole("button", { name: /Löschen/ }));
    expect(onDelete).toHaveBeenCalledTimes(1);
  });

  it("clicking Fertig fires onDone()", async () => {
    const onDelete = vi.fn();
    const onDone = vi.fn();
    render(<IssueDetailFooter onDelete={onDelete} onDone={onDone} />);
    await userEvent.click(screen.getByRole("button", { name: "Fertig" }));
    expect(onDone).toHaveBeenCalledTimes(1);
    expect(onDelete).not.toHaveBeenCalled();
  });

  it("disabled prop disables both buttons", () => {
    render(
      <IssueDetailFooter onDelete={() => {}} onDone={() => {}} disabled />,
    );
    expect(screen.getByRole("button", { name: /Löschen/ })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Fertig" })).toBeDisabled();
  });
});

describe("IssueDetailFooter — root container", () => {
  it("root element carries the sticky 48px band classes", () => {
    const { container } = render(<IssueDetailFooter onDelete={() => {}} />);
    const root = container.firstChild as HTMLElement;
    // Spot-check the critical structural classes.
    expect(root.className).toContain("sticky");
    expect(root.className).toContain("bottom-0");
    expect(root.className).toContain("h-12");
    expect(root.className).toContain("border-t");
    expect(root.className).toContain("bg-card");
  });

  it("has role='contentinfo' for accessibility landmark", () => {
    render(<IssueDetailFooter onDelete={() => {}} />);
    expect(screen.getByRole("contentinfo")).toBeInTheDocument();
  });
});
