import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { TagChip, type TagChipColor } from "./tag-chip";

describe("TagChip", () => {
  const COLORS: TagChipColor[] = ["tag-p0", "tag-p1", "tag-p2", "tag-p3", "brand"];

  for (const color of COLORS) {
    it(`maps color="${color}" to bg-${color} + text-${color}-foreground`, () => {
      const { container } = render(<TagChip color={color}>label</TagChip>);
      const el = container.firstElementChild as HTMLElement;
      expect(el).not.toBeNull();
      expect(el.className).toContain(`bg-${color}`);
      expect(el.className).toContain(`text-${color}-foreground`);
    });
  }

  it("renders as <span> by default with no inner remove button", () => {
    const { container } = render(<TagChip color="tag-p0">label</TagChip>);
    const el = container.firstElementChild as HTMLElement;
    expect(el.tagName).toBe("SPAN");
    expect(screen.queryByRole("button", { name: "Remove tag" })).toBeNull();
  });

  it("renders an X button with aria-label='Remove tag' when onRemove is provided", () => {
    render(
      <TagChip color="tag-p0" onRemove={() => {}}>
        label
      </TagChip>,
    );
    const btn = screen.getByRole("button", { name: "Remove tag" });
    expect(btn).toBeInTheDocument();
    // The lucide X icon is an SVG child of the button.
    expect(btn.querySelector("svg")).not.toBeNull();
  });

  it("fires onRemove exactly once when X is clicked", async () => {
    const onRemove = vi.fn();
    render(
      <TagChip color="tag-p0" onRemove={onRemove}>
        label
      </TagChip>,
    );
    await userEvent.click(screen.getByRole("button", { name: "Remove tag" }));
    expect(onRemove).toHaveBeenCalledTimes(1);
  });

  it("does NOT bubble the X click to a wrapping handler", async () => {
    const wrapperClick = vi.fn();
    const onRemove = vi.fn();
    render(
      // eslint-disable-next-line jsx-a11y/no-static-element-interactions
      <div onClick={wrapperClick}>
        <TagChip color="tag-p0" onRemove={onRemove}>
          label
        </TagChip>
      </div>,
    );
    await userEvent.click(screen.getByRole("button", { name: "Remove tag" }));
    expect(onRemove).toHaveBeenCalledTimes(1);
    expect(wrapperClick).not.toHaveBeenCalled();
  });

  it("swaps element via render prop (Base UI useRender polymorphism)", () => {
    render(
      <TagChip color="tag-p0" render={<a href="/tags/x" />}>
        label
      </TagChip>,
    );
    const link = screen.getByText("label");
    expect(link.tagName).toBe("A");
    expect(link.getAttribute("href")).toBe("/tags/x");
  });

  it("does not introduce any dark: override classes", () => {
    const { container } = render(<TagChip color="tag-p0">label</TagChip>);
    const html = container.innerHTML;
    expect(html).not.toMatch(/\bdark:/);
  });
});
