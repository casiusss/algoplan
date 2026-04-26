import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { AlgoPlanWordmark } from "./algoplan-wordmark";

describe("AlgoPlanWordmark atom", () => {
  it("renders the literal text 'AlgoPlan'", () => {
    const { container } = render(<AlgoPlanWordmark />);
    expect(container.textContent).toBe("AlgoPlan");
  });

  it("renders a brand-dot span with bg-brand class", () => {
    const { container } = render(<AlgoPlanWordmark />);
    const dot = container.querySelector("[data-testid='algoplan-dot']");
    expect(dot).not.toBeNull();
    expect(dot!.className).toContain("bg-brand");
  });

  it("default size: text uses text-base + not-italic", () => {
    const { container } = render(<AlgoPlanWordmark />);
    const text = container.querySelector("[data-testid='algoplan-text']");
    expect(text).not.toBeNull();
    expect(text!.className).toContain("text-base");
    expect(text!.className).toContain("not-italic");
    expect(text!.className).not.toContain("italic ");
  });

  it("lg size: text uses text-2xl + italic", () => {
    const { container } = render(<AlgoPlanWordmark size="lg" />);
    const text = container.querySelector("[data-testid='algoplan-text']");
    expect(text).not.toBeNull();
    expect(text!.className).toContain("text-2xl");
    expect(text!.className).toContain("italic");
    expect(text!.className).not.toContain("not-italic");
  });

  it("applies font-semibold in both sizes", () => {
    const { container: defaultContainer } = render(<AlgoPlanWordmark />);
    expect(
      defaultContainer.querySelector("[data-testid='algoplan-text']")!.className,
    ).toContain("font-semibold");

    const { container: lgContainer } = render(<AlgoPlanWordmark size="lg" />);
    expect(
      lgContainer.querySelector("[data-testid='algoplan-text']")!.className,
    ).toContain("font-semibold");
  });

  it("default size brand-dot is size-1", () => {
    const { container } = render(<AlgoPlanWordmark />);
    const dot = container.querySelector("[data-testid='algoplan-dot']")!;
    expect(dot.className).toContain("size-1");
    expect(dot.className).not.toContain("size-2");
  });

  it("lg size brand-dot is size-2", () => {
    const { container } = render(<AlgoPlanWordmark size="lg" />);
    const dot = container.querySelector("[data-testid='algoplan-dot']")!;
    expect(dot.className).toContain("size-2");
  });

  it("merges className via cn()", () => {
    const { container } = render(<AlgoPlanWordmark className="custom-extra" />);
    const root = container.firstElementChild!;
    expect(root.className).toContain("custom-extra");
    // default wrapper classes should still be present
    expect(root.className).toContain("inline-flex");
    expect(root.className).toContain("items-center");
  });
});
