import { describe, it, expect, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { InboxTypeFilter } from "./inbox-type-filter";
import { useInboxFilterStore } from "@multica/core/inbox";
import type { InboxItemType } from "@multica/core/types";

beforeEach(() => {
  useInboxFilterStore.setState({ selectedTypes: new Set<InboxItemType>() });
});

describe("InboxTypeFilter — chips", () => {
  it("renders 4 German chips: Erwähnungen, Zuweisungen, Kommentare, System", () => {
    render(<InboxTypeFilter />);
    expect(screen.getByRole("button", { name: "Erwähnungen" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Zuweisungen" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Kommentare" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "System" })).toBeInTheDocument();
  });

  it("uses TagChip with brand color (asserts bg-brand class)", () => {
    render(<InboxTypeFilter />);
    const chip = screen.getByRole("button", { name: "Erwähnungen" });
    expect(chip.className).toMatch(/bg-brand\b/);
  });

  it("inactive chips have opacity-60", () => {
    render(<InboxTypeFilter />);
    const chip = screen.getByRole("button", { name: "Erwähnungen" });
    expect(chip.className).toMatch(/\bopacity-60\b/);
  });

  it("active chips do NOT have opacity-60", async () => {
    render(<InboxTypeFilter />);
    const chip = screen.getByRole("button", { name: "Erwähnungen" });
    await userEvent.setup().click(chip);
    const chipAfter = screen.getByRole("button", { name: "Erwähnungen" });
    expect(chipAfter.className).not.toMatch(/\bopacity-60\b/);
  });
});

describe("InboxTypeFilter — toggle behavior", () => {
  it("clicking a chip toggles the type in the store (Erwähnungen → mentioned)", async () => {
    render(<InboxTypeFilter />);
    const chip = screen.getByRole("button", { name: "Erwähnungen" });
    await userEvent.setup().click(chip);
    expect(useInboxFilterStore.getState().selectedTypes.has("mentioned")).toBe(true);
  });

  it("active chip exposes aria-pressed=true after toggle", async () => {
    render(<InboxTypeFilter />);
    const chip = screen.getByRole("button", { name: "Zuweisungen" });
    expect(chip.getAttribute("aria-pressed")).toBe("false");
    await userEvent.setup().click(chip);
    const after = screen.getByRole("button", { name: "Zuweisungen" });
    expect(after.getAttribute("aria-pressed")).toBe("true");
  });

  it("clicking twice removes the type from the store", async () => {
    render(<InboxTypeFilter />);
    const user = userEvent.setup();
    const chip = screen.getByRole("button", { name: "Kommentare" });
    await user.click(chip);
    await user.click(screen.getByRole("button", { name: "Kommentare" }));
    expect(useInboxFilterStore.getState().selectedTypes.has("new_comment")).toBe(false);
  });
});
