import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { AccentBar, type AccentBarColor } from "./accent-bar";

const COLORS: AccentBarColor[] = [
  "tag-p0",
  "tag-p1",
  "tag-p2",
  "tag-p3",
  "brand",
  "muted",
];

describe("AccentBar — single segment color mapping", () => {
  for (const color of COLORS) {
    it(`maps color="${color}" to bg-${color} on the child span`, () => {
      const { container } = render(<AccentBar color={color} />);
      const segment = container.querySelector("span");
      expect(segment).not.toBeNull();
      expect(segment!.className).toContain(`bg-${color}`);
    });
  }
});

describe("AccentBar — ARIA + slot", () => {
  it("renders <div role='presentation' aria-hidden='true' data-slot='accent-bar'>", () => {
    const { container } = render(<AccentBar color="tag-p0" />);
    const outer = container.firstElementChild as HTMLElement;
    expect(outer.tagName).toBe("DIV");
    expect(outer.getAttribute("role")).toBe("presentation");
    expect(outer.getAttribute("aria-hidden")).toBe("true");
    expect(outer.getAttribute("data-slot")).toBe("accent-bar");
  });
});

describe("AccentBar — orientation", () => {
  it("default horizontal: h-1 + w-full", () => {
    const { container } = render(<AccentBar color="tag-p0" />);
    const outer = container.firstElementChild as HTMLElement;
    expect(outer.className).toContain("h-1");
    expect(outer.className).toContain("w-full");
  });

  it("vertical: h-full + w-1", () => {
    const { container } = render(
      <AccentBar color="tag-p0" orientation="vertical" />,
    );
    const outer = container.firstElementChild as HTMLElement;
    expect(outer.className).toContain("h-full");
    expect(outer.className).toContain("w-1");
  });
});

describe("AccentBar — multi-segment", () => {
  for (const N of [2, 3, 4] as const) {
    it(`renders ${N} segments with explicit colors array`, () => {
      const colors = COLORS.slice(0, N) as AccentBarColor[];
      const { container } = render(
        <AccentBar segments={N} colors={colors} />,
      );
      const segments = container.querySelectorAll("span");
      expect(segments.length).toBe(N);
      colors.forEach((c, i) => {
        expect(segments[i]!.className).toContain(`bg-${c}`);
        expect(segments[i]!.className).toContain("flex-1");
      });
    });
  }

  it("repeats single `color` across N segments when `colors` is omitted", () => {
    const { container } = render(<AccentBar segments={2} color="tag-p0" />);
    const segments = container.querySelectorAll("span");
    expect(segments.length).toBe(2);
    expect(segments[0]!.className).toContain("bg-tag-p0");
    expect(segments[1]!.className).toContain("bg-tag-p0");
  });
});

describe("AccentBar — validation errors", () => {
  it("throws when colors.length !== segments", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() =>
      render(<AccentBar segments={3} colors={["tag-p0", "tag-p1"]} />),
    ).toThrow(/colors/i);
    spy.mockRestore();
  });

  it("throws when neither `color` nor `colors` is provided", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    // Props are optional at type-level; runtime validation enforces the contract.
    expect(() => render(<AccentBar />)).toThrow();
    spy.mockRestore();
  });
});

describe("AccentBar — theme tokens only", () => {
  it("source contains no dark: overrides", async () => {
    const fs = await import("node:fs");
    const path = await import("node:path");
    const url = await import("node:url");
    const here = path.dirname(url.fileURLToPath(import.meta.url));
    const src = fs.readFileSync(path.join(here, "accent-bar.tsx"), "utf8");
    expect(src).not.toMatch(/\bdark:/);
  });
});
