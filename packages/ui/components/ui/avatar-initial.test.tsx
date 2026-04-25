import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";

import { AVATAR_PALETTE } from "@multica/ui/lib/avatar-color";
import { AvatarInitial } from "./avatar-initial";

const PALETTE_BG_CLASSES = AVATAR_PALETTE.map((entry) => entry.split(" ")[0]);

describe("AvatarInitial — initials extraction", () => {
  it("renders 'SR' for 'Stephan Rieche'", () => {
    render(<AvatarInitial name="Stephan Rieche" />);
    expect(screen.getByRole("img", { name: "Stephan Rieche" })).toHaveTextContent("SR");
  });

  it("renders 'S' for single-word 'Stephan'", () => {
    render(<AvatarInitial name="Stephan" />);
    expect(screen.getByRole("img", { name: "Stephan" })).toHaveTextContent("S");
  });

  it("renders '?' and aria-label='Unknown user' for empty name (no throw)", () => {
    expect(() => render(<AvatarInitial name="" />)).not.toThrow();
    expect(screen.getByRole("img", { name: "Unknown user" })).toHaveTextContent("?");
  });

  it("renders '?' for whitespace-only name", () => {
    render(<AvatarInitial name="   " />);
    expect(screen.getByRole("img", { name: "Unknown user" })).toHaveTextContent("?");
  });
});

describe("AvatarInitial — DOM shape", () => {
  it("uses <span role='img' data-slot='avatar-initial'>", () => {
    const { container } = render(<AvatarInitial name="Stephan" />);
    const el = container.firstElementChild as HTMLElement;
    expect(el.tagName).toBe("SPAN");
    expect(el.getAttribute("role")).toBe("img");
    expect(el.getAttribute("data-slot")).toBe("avatar-initial");
  });
});

describe("AvatarInitial — sizing", () => {
  const cases = [
    { size: "sm", dim: "size-6", text: "text-xs" },
    { size: "default", dim: "size-8", text: "text-sm" },
    { size: "lg", dim: "size-10", text: "text-base" },
  ] as const;

  for (const { size, dim, text } of cases) {
    it(`size="${size}" → ${dim} + ${text}`, () => {
      const { container } = render(<AvatarInitial name="Stephan" size={size} />);
      const el = container.firstElementChild as HTMLElement;
      expect(el.className).toContain(dim);
      expect(el.className).toContain(text);
    });
  }
});

describe("AvatarInitial — determinism", () => {
  it("renders the same bg-* class across 100 renders for the same name", () => {
    const seen = new Set<string>();
    for (let i = 0; i < 100; i++) {
      const { container, unmount } = render(<AvatarInitial name="Stephan" />);
      const el = container.firstElementChild as HTMLElement;
      const bgClass = el.className
        .split(/\s+/)
        .find((c) => c.startsWith("bg-"));
      expect(bgClass).toBeDefined();
      expect(PALETTE_BG_CLASSES).toContain(bgClass!);
      seen.add(bgClass!);
      unmount();
    }
    expect(seen.size).toBe(1); // exactly one bg class — fully deterministic
  });
});

describe("AvatarInitial — hashKey override", () => {
  it("uses hashKey (not name) for color when provided", () => {
    const { container: a, unmount: unmountA } = render(
      <AvatarInitial name="Alice" hashKey="user-123" />,
    );
    const bgA = (a.firstElementChild as HTMLElement).className
      .split(/\s+/)
      .find((c) => c.startsWith("bg-"));
    unmountA();

    const { container: b } = render(
      <AvatarInitial name="Bob" hashKey="user-123" />,
    );
    const bgB = (b.firstElementChild as HTMLElement).className
      .split(/\s+/)
      .find((c) => c.startsWith("bg-"));

    expect(bgA).toBe(bgB);
  });
});

describe("AvatarInitial — no inline color styles", () => {
  it("renders no inline style with backgroundColor or color", () => {
    const { container } = render(<AvatarInitial name="Stephan" />);
    const el = container.firstElementChild as HTMLElement;
    const styleAttr = el.getAttribute("style") ?? "";
    expect(styleAttr.toLowerCase()).not.toContain("background");
    expect(styleAttr.toLowerCase()).not.toContain("color");
  });
});
