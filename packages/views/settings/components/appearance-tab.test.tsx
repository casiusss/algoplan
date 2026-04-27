import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const { mockTheme, mockSetTheme } = vi.hoisted(() => ({
  mockTheme: { current: "light" as "light" | "dark" | "system" },
  mockSetTheme: vi.fn(),
}));

// AppearanceTab MUST consume the theme-provider wrapper that pins
// storageKey="algoplan_theme" — same hook as the sidebar DarkModeToggle.
// This mock simulates next-themes via the wrapper.
vi.mock("@algoplan/ui/components/common/theme-provider", () => ({
  useTheme: () => ({
    theme: mockTheme.current,
    resolvedTheme:
      mockTheme.current === "system" ? "light" : mockTheme.current,
    setTheme: mockSetTheme,
  }),
}));

import { AppearanceTab } from "./appearance-tab";

describe("AppearanceTab", () => {
  beforeEach(() => {
    mockSetTheme.mockReset();
    mockTheme.current = "light";
  });

  it("renders the German section heading 'Theme'", () => {
    render(<AppearanceTab />);
    expect(screen.getByRole("heading", { name: "Theme" })).toBeInTheDocument();
  });

  it("renders 3 radio options labeled Hell / Dunkel / System", () => {
    render(<AppearanceTab />);
    expect(screen.getAllByRole("radio")).toHaveLength(3);
    expect(screen.getByText("Hell")).toBeInTheDocument();
    expect(screen.getByText("Dunkel")).toBeInTheDocument();
    expect(screen.getByText("System")).toBeInTheDocument();
  });

  it("group root has aria-label 'Theme auswählen'", () => {
    render(<AppearanceTab />);
    expect(screen.getByRole("radiogroup")).toHaveAccessibleName(
      "Theme auswählen",
    );
  });

  it("each radio has German aria-label '<label> auswählen'", () => {
    render(<AppearanceTab />);
    expect(
      screen.getByRole("radio", { name: "Hell auswählen" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("radio", { name: "Dunkel auswählen" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("radio", { name: "System auswählen" }),
    ).toBeInTheDocument();
  });

  it("clicking Hell calls setTheme('light')", async () => {
    const user = userEvent.setup();
    render(<AppearanceTab />);
    await user.click(screen.getByRole("radio", { name: "Hell auswählen" }));
    expect(mockSetTheme).toHaveBeenCalledWith("light");
  });

  it("clicking Dunkel calls setTheme('dark')", async () => {
    const user = userEvent.setup();
    render(<AppearanceTab />);
    await user.click(screen.getByRole("radio", { name: "Dunkel auswählen" }));
    expect(mockSetTheme).toHaveBeenCalledWith("dark");
  });

  it("clicking System calls setTheme('system')", async () => {
    const user = userEvent.setup();
    render(<AppearanceTab />);
    await user.click(screen.getByRole("radio", { name: "System auswählen" }));
    expect(mockSetTheme).toHaveBeenCalledWith("system");
  });

  it("the active option's mockup has ring-2 ring-brand class", () => {
    mockTheme.current = "dark";
    render(<AppearanceTab />);
    const dunkelRadio = screen.getByRole("radio", { name: "Dunkel auswählen" });
    // The ring lives on the mockup wrapper inside the radio button
    const mockupWrapper = dunkelRadio.querySelector(
      "[data-testid='theme-mockup']",
    );
    expect(mockupWrapper).not.toBeNull();
    expect(mockupWrapper!.className).toContain("ring-2");
    expect(mockupWrapper!.className).toContain("ring-brand");
  });

  it("the active option ALSO renders a brand-green check icon at top-right", () => {
    mockTheme.current = "dark";
    render(<AppearanceTab />);
    const dunkelRadio = screen.getByRole("radio", { name: "Dunkel auswählen" });
    const check = dunkelRadio.querySelector(
      "[data-testid='theme-active-check']",
    );
    expect(check).not.toBeNull();
    expect(check!.className).toContain("text-brand");
    expect(check!.className).toContain("absolute");
    expect(check!.className).toContain("top-1");
    expect(check!.className).toContain("right-1");
  });

  it("only the active option has the check icon (others don't)", () => {
    mockTheme.current = "light";
    render(<AppearanceTab />);
    const hellRadio = screen.getByRole("radio", { name: "Hell auswählen" });
    const dunkelRadio = screen.getByRole("radio", { name: "Dunkel auswählen" });
    const systemRadio = screen.getByRole("radio", { name: "System auswählen" });
    expect(
      hellRadio.querySelector("[data-testid='theme-active-check']"),
    ).not.toBeNull();
    expect(
      dunkelRadio.querySelector("[data-testid='theme-active-check']"),
    ).toBeNull();
    expect(
      systemRadio.querySelector("[data-testid='theme-active-check']"),
    ).toBeNull();
  });

  it("syncs with the sidebar DarkModeToggle (re-renders pick up new theme value)", () => {
    mockTheme.current = "light";
    const { rerender } = render(<AppearanceTab />);
    expect(
      screen
        .getByRole("radio", { name: "Hell auswählen" })
        .querySelector("[data-testid='theme-active-check']"),
    ).not.toBeNull();
    // Simulate sidebar toggle flipping the theme — the same module-level
    // mockTheme drives both the AppearanceTab radio AND any DarkModeToggle
    // because both read from `useTheme()` in the shared provider.
    mockTheme.current = "dark";
    rerender(<AppearanceTab />);
    expect(
      screen
        .getByRole("radio", { name: "Dunkel auswählen" })
        .querySelector("[data-testid='theme-active-check']"),
    ).not.toBeNull();
    expect(
      screen
        .getByRole("radio", { name: "Hell auswählen" })
        .querySelector("[data-testid='theme-active-check']"),
    ).toBeNull();
  });
});
