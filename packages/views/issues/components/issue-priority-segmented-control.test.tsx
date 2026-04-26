import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import type { IssuePriority } from "@multica/core/types";

import { IssuePrioritySegmentedControl } from "./issue-priority-segmented-control";

function Harness({
  initial = "none" as IssuePriority,
  onChange,
  disabled,
}: {
  initial?: IssuePriority;
  onChange?: (p: IssuePriority) => void;
  disabled?: boolean;
}) {
  const [v, setV] = useState<IssuePriority>(initial);
  return (
    <IssuePrioritySegmentedControl
      value={v}
      onChange={(p) => {
        onChange?.(p);
        setV(p);
      }}
      disabled={disabled}
    />
  );
}

describe("IssuePrioritySegmentedControl — render", () => {
  it("renders exactly 4 items labeled P0, P1, P2, P3", () => {
    render(<Harness />);
    expect(screen.getByRole("button", { name: "P0" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "P1" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "P2" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "P3" })).toBeInTheDocument();
  });

  it("uses aria-label='Priorität' on the SegmentedControl root", () => {
    render(<Harness />);
    expect(screen.getByRole("group", { name: "Priorität" })).toBeInTheDocument();
  });
});

describe("IssuePrioritySegmentedControl — mapping (exhaustive)", () => {
  it("value='urgent' marks P0 as active (data-pressed)", () => {
    render(<Harness initial="urgent" />);
    expect(screen.getByRole("button", { name: "P0" })).toHaveAttribute("data-pressed");
    expect(screen.getByRole("button", { name: "P1" })).not.toHaveAttribute("data-pressed");
    expect(screen.getByRole("button", { name: "P2" })).not.toHaveAttribute("data-pressed");
    expect(screen.getByRole("button", { name: "P3" })).not.toHaveAttribute("data-pressed");
  });

  it("value='high' marks P1 as active", () => {
    render(<Harness initial="high" />);
    expect(screen.getByRole("button", { name: "P1" })).toHaveAttribute("data-pressed");
  });

  it("value='medium' marks P2 as active", () => {
    render(<Harness initial="medium" />);
    expect(screen.getByRole("button", { name: "P2" })).toHaveAttribute("data-pressed");
  });

  it("value='low' marks P3 as active", () => {
    render(<Harness initial="low" />);
    expect(screen.getByRole("button", { name: "P3" })).toHaveAttribute("data-pressed");
  });

  it("value='none' marks NO item as active", () => {
    render(<Harness initial="none" />);
    expect(screen.getByRole("button", { name: "P0" })).not.toHaveAttribute("data-pressed");
    expect(screen.getByRole("button", { name: "P1" })).not.toHaveAttribute("data-pressed");
    expect(screen.getByRole("button", { name: "P2" })).not.toHaveAttribute("data-pressed");
    expect(screen.getByRole("button", { name: "P3" })).not.toHaveAttribute("data-pressed");
  });
});

describe("IssuePrioritySegmentedControl — change", () => {
  it("clicking P2 fires onChange('medium')", async () => {
    const onChange = vi.fn();
    render(<Harness initial="urgent" onChange={onChange} />);
    await userEvent.click(screen.getByRole("button", { name: "P2" }));
    expect(onChange).toHaveBeenCalledWith("medium");
  });

  it("clicking P0 from 'none' fires onChange('urgent')", async () => {
    const onChange = vi.fn();
    render(<Harness initial="none" onChange={onChange} />);
    await userEvent.click(screen.getByRole("button", { name: "P0" }));
    expect(onChange).toHaveBeenCalledWith("urgent");
  });

  it("clicking P3 fires onChange('low')", async () => {
    const onChange = vi.fn();
    render(<Harness initial="none" onChange={onChange} />);
    await userEvent.click(screen.getByRole("button", { name: "P3" }));
    expect(onChange).toHaveBeenCalledWith("low");
  });
});

describe("IssuePrioritySegmentedControl — clear affordance", () => {
  it("when value !== 'none', a 'Priorität entfernen' button is rendered", () => {
    render(<Harness initial="medium" />);
    expect(
      screen.getByRole("button", { name: /Priorität entfernen/ }),
    ).toBeInTheDocument();
  });

  it("when value === 'none', the 'Priorität entfernen' button is NOT rendered", () => {
    render(<Harness initial="none" />);
    expect(
      screen.queryByRole("button", { name: /Priorität entfernen/ }),
    ).not.toBeInTheDocument();
  });

  it("clicking 'Priorität entfernen' fires onChange('none')", async () => {
    const onChange = vi.fn();
    render(<Harness initial="urgent" onChange={onChange} />);
    await userEvent.click(
      screen.getByRole("button", { name: /Priorität entfernen/ }),
    );
    expect(onChange).toHaveBeenCalledWith("none");
  });
});

describe("IssuePrioritySegmentedControl — colorByValue per active item", () => {
  it("active P0 item carries text-tag-p0 class (via data-[pressed]: variant)", () => {
    render(<Harness initial="urgent" />);
    const p0 = screen.getByRole("button", { name: "P0" });
    expect(p0.className).toMatch(/data-\[pressed\]:text-tag-p0/);
  });

  it("each P-item carries its corresponding text-tag-pN class", () => {
    render(<Harness initial="urgent" />);
    expect(screen.getByRole("button", { name: "P0" }).className).toMatch(
      /data-\[pressed\]:text-tag-p0/,
    );
    expect(screen.getByRole("button", { name: "P1" }).className).toMatch(
      /data-\[pressed\]:text-tag-p1/,
    );
    expect(screen.getByRole("button", { name: "P2" }).className).toMatch(
      /data-\[pressed\]:text-tag-p2/,
    );
    expect(screen.getByRole("button", { name: "P3" }).className).toMatch(
      /data-\[pressed\]:text-tag-p3/,
    );
  });
});

describe("IssuePrioritySegmentedControl — disabled", () => {
  it("disabled prop disables both control + clear button", () => {
    render(<Harness initial="urgent" disabled />);
    expect(screen.getByRole("button", { name: "P0" })).toBeDisabled();
    expect(
      screen.getByRole("button", { name: /Priorität entfernen/ }),
    ).toBeDisabled();
  });
});
