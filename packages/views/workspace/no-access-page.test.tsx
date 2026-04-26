import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

const navigate = vi.hoisted(() => vi.fn());
const logout = vi.hoisted(() => vi.fn());

vi.mock("../navigation", () => ({
  useNavigation: () => ({ push: navigate, replace: navigate }),
}));

vi.mock("../auth", () => ({
  useLogout: () => logout,
}));

// Stub DragStrip so the structural first-flex-child assertion can target it
// without mounting the real macOS-only `-webkit-app-region` div in jsdom.
vi.mock("../platform", () => ({
  DragStrip: () => <div data-testid="drag-strip-stub" />,
}));

import { NoAccessPage } from "./no-access-page";

describe("NoAccessPage", () => {
  beforeEach(() => {
    navigate.mockReset();
    logout.mockReset();
  });

  it("renders the German title 'Workspace nicht verfügbar'", () => {
    render(<NoAccessPage />);
    expect(
      screen.getByRole("heading", { name: "Workspace nicht verfügbar" }),
    ).toBeInTheDocument();
  });

  it("renders the constant German body — does NOT distinguish 'not found' vs 'no access'", () => {
    render(<NoAccessPage />);
    expect(
      screen.getByText(
        "Dieser Workspace existiert nicht oder du hast keinen Zugriff.",
      ),
    ).toBeInTheDocument();
  });

  it("renders the AlgoPlanWordmark INSIDE the centered card region (not above DragStrip)", () => {
    const { container } = render(<NoAccessPage />);
    const wordmark = container.querySelector(
      "[data-testid='algoplan-wordmark']",
    );
    expect(wordmark).not.toBeNull();
    // Wordmark must NOT be the first JSX child of the page-root flex container
    // — DragStrip is. The wordmark belongs in the centered region below.
    const pageRoot = container.firstElementChild;
    expect(pageRoot).not.toBeNull();
    expect(pageRoot!.firstElementChild?.getAttribute("data-testid")).toBe(
      "drag-strip-stub",
    );
  });

  it("primary CTA reads 'Zu meinen Workspaces' and navigates to /", () => {
    render(<NoAccessPage />);
    fireEvent.click(
      screen.getByRole("button", { name: "Zu meinen Workspaces" }),
    );
    expect(navigate).toHaveBeenCalledWith("/");
  });

  it("secondary CTA reads 'Mit anderem Konto anmelden' and fully logs out (not just navigate)", () => {
    render(<NoAccessPage />);
    fireEvent.click(
      screen.getByRole("button", { name: "Mit anderem Konto anmelden" }),
    );
    expect(logout).toHaveBeenCalledTimes(1);
    // Should NOT just navigate to /login — that would leave the session
    // cookie + auth state intact and AuthInitializer would re-auth.
    expect(navigate).not.toHaveBeenCalledWith("/login");
  });
});
