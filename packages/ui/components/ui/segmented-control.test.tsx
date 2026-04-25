import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";

import { SegmentedControl, SegmentedControlItem } from "./segmented-control";

function Harness({
  initial = "a",
  onChange,
  ariaLabel = "Test",
  disabledValues = [] as string[],
}: {
  initial?: string;
  onChange?: (v: string) => void;
  ariaLabel?: string;
  disabledValues?: string[];
}) {
  const [v, setV] = useState(initial);
  return (
    <>
      <button type="button">before</button>
      <SegmentedControl
        value={v}
        onValueChange={(next) => {
          onChange?.(next);
          setV(next);
        }}
        aria-label={ariaLabel}
      >
        <SegmentedControlItem value="a" disabled={disabledValues.includes("a")}>
          A
        </SegmentedControlItem>
        <SegmentedControlItem value="b" disabled={disabledValues.includes("b")}>
          B
        </SegmentedControlItem>
        <SegmentedControlItem value="c" disabled={disabledValues.includes("c")}>
          C
        </SegmentedControlItem>
      </SegmentedControl>
      <button type="button">after</button>
    </>
  );
}

describe("SegmentedControl — render", () => {
  it("renders all items with aria-label on the root group", () => {
    render(<Harness ariaLabel="View mode" />);
    expect(screen.getByRole("group", { name: "View mode" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "A" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "B" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "C" })).toBeInTheDocument();
  });

  it("marks the active item with data-pressed", () => {
    render(<Harness initial="b" />);
    expect(screen.getByRole("button", { name: "B" })).toHaveAttribute("data-pressed");
    expect(screen.getByRole("button", { name: "A" })).not.toHaveAttribute("data-pressed");
    expect(screen.getByRole("button", { name: "C" })).not.toHaveAttribute("data-pressed");
  });
});

describe("SegmentedControl — click", () => {
  it("fires onValueChange with a STRING (not array) when clicking an inactive item", async () => {
    const onChange = vi.fn();
    render(<Harness initial="a" onChange={onChange} />);
    await userEvent.click(screen.getByRole("button", { name: "B" }));
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith("b");
    // Type guard: argument must be a string, not an array
    const firstCall = onChange.mock.calls[0];
    expect(firstCall).toBeDefined();
    expect(typeof firstCall![0]).toBe("string");
  });

  it("swallows deselect — clicking the active item does NOT fire onValueChange", async () => {
    const onChange = vi.fn();
    render(<Harness initial="a" onChange={onChange} />);
    await userEvent.click(screen.getByRole("button", { name: "A" }));
    expect(onChange).not.toHaveBeenCalled();
  });
});

describe("SegmentedControl — keyboard navigation (Base UI primitive)", () => {
  it("ArrowRight moves focus to the next item", async () => {
    render(<Harness initial="a" />);
    const a = screen.getByRole("button", { name: "A" });
    a.focus();
    expect(a).toHaveFocus();
    await userEvent.keyboard("{ArrowRight}");
    expect(screen.getByRole("button", { name: "B" })).toHaveFocus();
  });

  it("ArrowLeft from item 0 wraps to the last item (loopFocus default)", async () => {
    render(<Harness initial="a" />);
    const a = screen.getByRole("button", { name: "A" });
    a.focus();
    await userEvent.keyboard("{ArrowLeft}");
    expect(screen.getByRole("button", { name: "C" })).toHaveFocus();
  });

  it("Tab moves focus OUT of the control (single tab stop)", async () => {
    render(<Harness initial="a" />);
    screen.getByRole("button", { name: "before" }).focus();
    await userEvent.keyboard("{Tab}");
    // Inside the group now (focus on roving item)
    expect(
      [
        screen.getByRole("button", { name: "A" }),
        screen.getByRole("button", { name: "B" }),
        screen.getByRole("button", { name: "C" }),
      ].some((el) => el === document.activeElement),
    ).toBe(true);
    // Next Tab moves OUT of the group
    await userEvent.keyboard("{Tab}");
    expect(screen.getByRole("button", { name: "after" })).toHaveFocus();
  });

  it("Space activates the focused item", async () => {
    const onChange = vi.fn();
    render(<Harness initial="a" onChange={onChange} />);
    screen.getByRole("button", { name: "B" }).focus();
    await userEvent.keyboard(" ");
    expect(onChange).toHaveBeenCalledWith("b");
  });
});

describe("SegmentedControl — disabled item", () => {
  it("ArrowRight skips disabled items", async () => {
    render(<Harness initial="a" disabledValues={["b"]} />);
    screen.getByRole("button", { name: "A" }).focus();
    await userEvent.keyboard("{ArrowRight}");
    // B is disabled — focus should land on C
    expect(screen.getByRole("button", { name: "C" })).toHaveFocus();
  });

  it("clicking a disabled item does not fire onValueChange", async () => {
    const onChange = vi.fn();
    render(<Harness initial="a" onChange={onChange} disabledValues={["b"]} />);
    await userEvent.click(screen.getByRole("button", { name: "B" }));
    expect(onChange).not.toHaveBeenCalled();
  });
});

describe("SegmentedControl — source-level invariants", () => {
  // Resolve the source file via __dirname so the assertion is independent of
  // the cwd Vitest is invoked from (root vs package). Vite transforms
  // `import.meta.url` to a non-`file://` scheme in jsdom, so we cannot use
  // `new URL(..., import.meta.url)` here — use Node's path APIs instead.
  async function readSource() {
    const path = await import("node:path");
    const fs = await import("node:fs");
    const here = path.dirname(new URL(import.meta.url).pathname);
    return fs.readFileSync(path.join(here, "segmented-control.tsx"), "utf8");
  }

  it("uses multiple={false} (RESEARCH §Pitfall 1 fix)", async () => {
    const src = await readSource();
    expect(src).toMatch(/\bmultiple=\{false\}/);
  });

  it("does NOT use the non-existent toggleMultiple prop", async () => {
    const src = await readSource();
    expect(src).not.toContain("toggleMultiple");
  });
});
