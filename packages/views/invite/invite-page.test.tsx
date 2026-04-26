import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

const mocks = vi.hoisted(() => ({
  getInvitation: vi.fn(),
  acceptInvitation: vi.fn(),
  declineInvitation: vi.fn(),
  push: vi.fn(),
}));

vi.mock("@multica/core/api", () => ({
  api: {
    getInvitation: mocks.getInvitation,
    acceptInvitation: mocks.acceptInvitation,
    declineInvitation: mocks.declineInvitation,
  },
}));

vi.mock("../navigation", () => ({
  useNavigation: () => ({ push: mocks.push, replace: mocks.push }),
}));

vi.mock("../auth", async () => {
  const actual = await vi.importActual<typeof import("../auth")>("../auth");
  return {
    ...actual,
    useLogout: () => vi.fn(),
  };
});

// Stub DragStrip so structural assertions can target it in jsdom.
vi.mock("../platform", () => ({
  DragStrip: () => <div data-testid="drag-strip-stub" />,
}));

vi.mock("@multica/core/workspace/queries", () => ({
  workspaceListOptions: () => ({
    queryKey: ["workspaces"],
    queryFn: () => Promise.resolve([]),
  }),
  workspaceKeys: { myInvitations: () => ["invitations"] },
}));

vi.mock("@multica/core/paths", async () => {
  const actual = await vi.importActual<
    typeof import("@multica/core/paths")
  >("@multica/core/paths");
  return {
    ...actual,
    useHasOnboarded: () => true,
    resolvePostAuthDestination: () => "/",
  };
});

import { InvitePage } from "./invite-page";

function renderPage(props: Partial<React.ComponentProps<typeof InvitePage>> = {}) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  );
  return render(
    <InvitePage invitationId="inv-1" {...props} />,
    { wrapper },
  );
}

describe("InvitePage (Phase 6 AUTH restyle)", () => {
  beforeEach(() => {
    mocks.getInvitation.mockReset();
    mocks.acceptInvitation.mockReset();
    mocks.declineInvitation.mockReset();
    mocks.push.mockReset();
  });

  it("renders AlgoPlanWordmark in the InviteShell (above the card)", async () => {
    mocks.getInvitation.mockResolvedValueOnce({
      id: "inv-1",
      workspace_id: "ws-1",
      workspace_name: "Acme",
      inviter_name: "Alice",
      inviter_email: "alice@example.com",
      role: "member",
      status: "pending",
    });
    const { container } = renderPage();
    await waitFor(() => {
      expect(container.querySelector("[data-testid='algoplan-wordmark']")).not.toBeNull();
    });
  });

  it("DragStrip is the first flex child of the InviteShell page-root", async () => {
    mocks.getInvitation.mockImplementation(() => new Promise(() => {})); // pending → loading branch
    const { container } = renderPage();
    const pageRoot = container.firstElementChild;
    expect(pageRoot).not.toBeNull();
    expect(pageRoot!.firstElementChild?.getAttribute("data-testid")).toBe(
      "drag-strip-stub",
    );
  });

  it("loading branch: shows the wordmark even before the invitation resolves", () => {
    mocks.getInvitation.mockImplementation(() => new Promise(() => {})); // pending forever
    const { container } = renderPage();
    expect(container.querySelector("[data-testid='algoplan-wordmark']")).not.toBeNull();
  });

  it("error branch: renders German 'Einladung nicht gefunden' on fetch failure", async () => {
    mocks.getInvitation.mockRejectedValueOnce(new Error("404"));
    renderPage();
    await waitFor(() => {
      expect(
        screen.getByRole("heading", { name: /Einladung nicht gefunden/i }),
      ).toBeInTheDocument();
    });
  });

  it("default branch: renders German 'Beitreten' / 'Ablehnen' affordances", async () => {
    mocks.getInvitation.mockResolvedValueOnce({
      id: "inv-1",
      workspace_id: "ws-1",
      workspace_name: "Acme",
      inviter_name: "Alice",
      inviter_email: "alice@example.com",
      role: "admin",
      status: "pending",
    });
    renderPage();
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Ablehnen/ })).toBeInTheDocument();
    });
    expect(screen.getByRole("button", { name: /Beitreten|Akzeptieren/i })).toBeInTheDocument();
  });

  it("Log out button reads 'Abmelden' (German) across all branches", () => {
    mocks.getInvitation.mockImplementation(() => new Promise(() => {}));
    renderPage();
    expect(screen.getByRole("button", { name: /Abmelden/ })).toBeInTheDocument();
  });
});
