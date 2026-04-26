import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const { mockTheme, mockSetTheme } = vi.hoisted(() => ({
  mockTheme: { current: "light" as "light" | "dark" | "system" },
  mockSetTheme: vi.fn(),
}));

vi.mock("@algoplan/ui/components/common/theme-provider", () => ({
  useTheme: () => ({
    theme: mockTheme.current,
    resolvedTheme: mockTheme.current,
    setTheme: mockSetTheme,
  }),
}));

import { DarkModeToggle } from "./dark-mode-toggle";

describe("DarkModeToggle", () => {
  beforeEach(() => {
    mockSetTheme.mockReset();
    mockTheme.current = "light";
  });

  it("post-mount in light: renders Moon icon and aria-label 'Switch to dark mode'", async () => {
    render(<DarkModeToggle />);
    await waitFor(() => {
      const button = screen.getByRole("button");
      expect(button.getAttribute("aria-label")).toBe("Switch to dark mode");
    });
    // Moon icon (lucide adds class with "lucide-moon")
    const button = screen.getByRole("button");
    expect(button.querySelector("svg")?.getAttribute("class") || "").toMatch(
      /moon/i,
    );
  });

  it("post-mount in dark: renders Sun icon and aria-label 'Switch to light mode'", async () => {
    mockTheme.current = "dark";
    render(<DarkModeToggle />);
    await waitFor(() => {
      const button = screen.getByRole("button");
      expect(button.getAttribute("aria-label")).toBe("Switch to light mode");
    });
    const button = screen.getByRole("button");
    expect(button.querySelector("svg")?.getAttribute("class") || "").toMatch(
      /sun/i,
    );
  });

  it("clicking in light mode calls setTheme('dark')", async () => {
    const user = userEvent.setup();
    render(<DarkModeToggle />);
    await waitFor(() => {
      expect(screen.getByRole("button").getAttribute("aria-label")).toBe(
        "Switch to dark mode",
      );
    });
    await user.click(screen.getByRole("button"));
    expect(mockSetTheme).toHaveBeenCalledWith("dark");
  });

  it("clicking in dark mode calls setTheme('light')", async () => {
    mockTheme.current = "dark";
    const user = userEvent.setup();
    render(<DarkModeToggle />);
    await waitFor(() => {
      expect(screen.getByRole("button").getAttribute("aria-label")).toBe(
        "Switch to light mode",
      );
    });
    await user.click(screen.getByRole("button"));
    expect(mockSetTheme).toHaveBeenCalledWith("light");
  });

  it("title attribute mirrors the aria-label", async () => {
    render(<DarkModeToggle />);
    await waitFor(() => {
      const button = screen.getByRole("button");
      expect(button.getAttribute("title")).toBe(
        button.getAttribute("aria-label"),
      );
    });
  });
});
