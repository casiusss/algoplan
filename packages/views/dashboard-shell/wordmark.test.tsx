import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Wordmark, WordmarkText } from "./wordmark";

describe("Wordmark", () => {
  it("exports the source-of-truth string 'AlgoPlan' as WordmarkText", () => {
    expect(WordmarkText).toBe("AlgoPlan");
  });

  it("renders the literal 'AlgoPlan' as label when no workspaceName is provided", () => {
    render(<Wordmark />);
    expect(screen.getByText("AlgoPlan")).toBeInTheDocument();
  });

  it("renders the workspace name in the trigger position when workspaceName is provided", () => {
    render(<Wordmark workspaceName="Acme" />);
    expect(screen.getByText("Acme")).toBeInTheDocument();
  });

  it("renders the brand dot, label, and chevron", () => {
    const { container } = render(<Wordmark />);
    // Brand dot
    expect(container.querySelector(".bg-brand")).toBeTruthy();
    // Label exists
    expect(screen.getByText("AlgoPlan")).toBeInTheDocument();
    // Chevron icon present (lucide-react renders as svg)
    expect(container.querySelector("svg")).toBeTruthy();
  });

  it("does NOT apply italic styling to the label (Phase 4 contract: Inter Semibold UPRIGHT)", () => {
    render(<Wordmark />);
    const label = screen.getByText("AlgoPlan");
    expect(label.className).not.toMatch(/italic/);
  });

  it("uses semibold + leading-tight typography on the label", () => {
    render(<Wordmark />);
    const label = screen.getByText("AlgoPlan");
    expect(label.className).toMatch(/font-semibold/);
    expect(label.className).toMatch(/leading-tight/);
    expect(label.className).toMatch(/text-base/);
  });

  it("collapsed-mode tooltip text equals 'AlgoPlan' (via title attribute)", () => {
    const { container } = render(<Wordmark collapsed />);
    const root = container.firstElementChild as HTMLElement | null;
    expect(root).toBeTruthy();
    expect(root?.getAttribute("title")).toBe("AlgoPlan");
  });
});
