import type { ReactNode } from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";

const { mockListTokens } = vi.hoisted(() => ({
  mockListTokens: vi.fn(async () => []),
}));

vi.mock("sonner", () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}));

vi.mock("@multica/core/api", () => ({
  api: {
    listPersonalAccessTokens: mockListTokens,
    createPersonalAccessToken: vi.fn(),
    revokePersonalAccessToken: vi.fn(),
  },
}));

vi.mock("@multica/ui/components/ui/tooltip", () => ({
  Tooltip: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  TooltipTrigger: ({ render }: { render: ReactNode }) => <>{render}</>,
  TooltipContent: ({ children }: { children: ReactNode }) => <span>{children}</span>,
}));

vi.mock("@multica/ui/components/ui/alert-dialog", () => ({
  AlertDialog: ({ children, open }: { children: ReactNode; open: boolean }) =>
    open ? <div>{children}</div> : null,
  AlertDialogContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  AlertDialogHeader: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  AlertDialogTitle: ({ children }: { children: ReactNode }) => <h2>{children}</h2>,
  AlertDialogDescription: ({ children }: { children: ReactNode }) => <p>{children}</p>,
  AlertDialogFooter: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  AlertDialogCancel: ({ children }: { children: ReactNode }) => <button>{children}</button>,
  AlertDialogAction: ({ children }: { children: ReactNode }) => <button>{children}</button>,
}));

vi.mock("@multica/ui/components/ui/dialog", () => ({
  Dialog: ({ children, open }: { children: ReactNode; open: boolean }) =>
    open ? <div>{children}</div> : null,
  DialogContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DialogHeader: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DialogTitle: ({ children }: { children: ReactNode }) => <h1>{children}</h1>,
  DialogDescription: ({ children }: { children: ReactNode }) => <p>{children}</p>,
  DialogFooter: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

import { TokensTab } from "./tokens-tab";

describe("TokensTab", () => {
  beforeEach(() => {
    mockListTokens.mockReset();
    mockListTokens.mockResolvedValue([]);
  });

  it("wraps content in SettingsSection with German heading 'API-Tokens'", async () => {
    render(<TokensTab />);
    expect(
      await screen.findByRole("heading", { name: "API-Tokens" }),
    ).toBeInTheDocument();
  });

  it("renders SettingsSection body wrapper", async () => {
    const { container } = render(<TokensTab />);
    await waitFor(() => {
      expect(
        container.querySelector("[data-testid='settings-section-body']"),
      ).not.toBeNull();
    });
  });

  it("renders the German Create button 'Erstellen'", async () => {
    render(<TokensTab />);
    expect(
      await screen.findByRole("button", { name: /Erstellen/ }),
    ).toBeInTheDocument();
  });

  it("renders German placeholder for token name 'Token-Name (z. B. Mein CLI)'", async () => {
    render(<TokensTab />);
    expect(
      await screen.findByPlaceholderText("Token-Name (z. B. Mein CLI)"),
    ).toBeInTheDocument();
  });

  it("renders German info text about CLI and Authentifizierung", async () => {
    render(<TokensTab />);
    expect(
      await screen.findByText(/Persönliche Zugriffstokens.*CLI/),
    ).toBeInTheDocument();
  });
});
