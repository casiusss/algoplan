import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, within, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

vi.mock("@multica/core/paths", () => ({
  useCurrentWorkspace: () => ({
    id: "ws-1",
    name: "Acme",
    slug: "acme",
  }),
}));

// Stub each tab body — we only assert on the SettingsPage chrome (left nav,
// strings, Gefahrenzone quick-jump). The tab content tests live in their
// respective *-tab.test.tsx files.
vi.mock("./account-tab", () => ({
  AccountTab: () => <div data-testid="tab-account">account</div>,
}));
vi.mock("./appearance-tab", () => ({
  AppearanceTab: () => <div data-testid="tab-appearance">appearance</div>,
}));
vi.mock("./tokens-tab", () => ({
  TokensTab: () => <div data-testid="tab-tokens">tokens</div>,
}));
vi.mock("./workspace-tab", () => ({
  WorkspaceTab: () => (
    <div data-testid="tab-workspace">
      <section id="danger-zone" data-testid="danger-zone-target">
        Gefahrenzone target
      </section>
    </div>
  ),
}));
vi.mock("./repositories-tab", () => ({
  RepositoriesTab: () => <div data-testid="tab-repositories">repositories</div>,
}));
vi.mock("./members-tab", () => ({
  MembersTab: () => <div data-testid="tab-members">members</div>,
}));

import { SettingsPage } from "./settings-page";

describe("SettingsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the German page title 'Einstellungen'", () => {
    render(<SettingsPage />);
    expect(
      screen.getByRole("heading", { name: "Einstellungen" }),
    ).toBeInTheDocument();
  });

  it("renders 'Mein Konto' group label", () => {
    render(<SettingsPage />);
    expect(screen.getByText("Mein Konto")).toBeInTheDocument();
  });

  it("renders the workspace group label (workspace name when present)", () => {
    render(<SettingsPage />);
    // Workspace group label uses the workspace name when available
    expect(screen.getByText("Acme")).toBeInTheDocument();
  });

  it("renders all six German tab labels", () => {
    render(<SettingsPage />);
    expect(screen.getByRole("tab", { name: /Profil/ })).toBeInTheDocument();
    expect(
      screen.getByRole("tab", { name: /Erscheinungsbild/ }),
    ).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /API-Tokens/ })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /Allgemein/ })).toBeInTheDocument();
    expect(
      screen.getByRole("tab", { name: /Repositories/ }),
    ).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /Mitglieder/ })).toBeInTheDocument();
  });

  it("left nav container uses bg-sidebar tone (replaces bg-background)", () => {
    const { container } = render(<SettingsPage />);
    const leftNav = container.querySelector("[data-testid='settings-left-nav']");
    expect(leftNav).not.toBeNull();
    expect(leftNav!.className).toContain("bg-sidebar");
    expect(leftNav!.className).not.toContain("bg-background");
  });

  it("renders a [Gefahrenzone] quick-jump button inside the Workspace group", () => {
    render(<SettingsPage />);
    const btn = screen.getByRole("button", { name: "Gefahrenzone" });
    expect(btn).toBeInTheDocument();
  });

  it("clicking [Gefahrenzone] switches to Workspace tab AND scrolls to #danger-zone", async () => {
    const user = userEvent.setup();
    // jsdom doesn't implement scrollIntoView — install a mock on the prototype
    // before render so any element inherits it.
    const scrollSpy = vi.fn();
    const original = (HTMLElement.prototype as unknown as { scrollIntoView?: unknown })
      .scrollIntoView;
    (HTMLElement.prototype as unknown as { scrollIntoView: unknown }).scrollIntoView =
      function scrollIntoView(this: HTMLElement, ...args: unknown[]) {
        scrollSpy(this, ...args);
      };

    try {
      render(<SettingsPage />);
      await user.click(screen.getByRole("button", { name: "Gefahrenzone" }));

      // Workspace tab content is now visible
      const workspacePanel = await screen.findByTestId("tab-workspace");
      expect(workspacePanel).toBeInTheDocument();

      // The #danger-zone target's scrollIntoView gets called via rAF — wait
      // for the next animation frame to flush.
      await waitFor(() => {
        expect(scrollSpy).toHaveBeenCalled();
      });

      const target = within(workspacePanel).getByTestId("danger-zone-target");
      const calledOnTarget = scrollSpy.mock.calls.some(
        (call) => call[0] === target,
      );
      expect(calledOnTarget).toBe(true);
    } finally {
      if (original === undefined) {
        delete (HTMLElement.prototype as unknown as { scrollIntoView?: unknown })
          .scrollIntoView;
      } else {
        (HTMLElement.prototype as unknown as { scrollIntoView: unknown }).scrollIntoView =
          original;
      }
    }
  });
});
