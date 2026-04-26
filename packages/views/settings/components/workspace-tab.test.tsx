import type { ReactNode } from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const {
  mockUser,
  mockWorkspace,
  mockMembers,
  mockHasOnboarded,
  mockNavigationPush,
  mockSetCurrentWorkspace,
  mockResolvePostAuthDestination,
  mockLeaveMutate,
  mockDeleteMutate,
  mockUpdateWorkspace,
  mockToastError,
  mockToastSuccess,
  callOrder,
  cachedWorkspaceList,
} = vi.hoisted(() => ({
  mockUser: {
    current: {
      id: "user-1",
      name: "Owner User",
    } as { id: string; name: string },
  },
  mockWorkspace: {
    current: {
      id: "ws-1",
      name: "Acme",
      slug: "acme",
      description: "An acme workspace",
      context: "Some context",
    } as {
      id: string;
      name: string;
      slug: string;
      description: string;
      context: string;
    },
  },
  mockMembers: {
    current: [
      { id: "m-1", user_id: "user-1", role: "owner" as const },
      { id: "m-2", user_id: "user-2", role: "member" as const },
    ] as Array<{ id: string; user_id: string; role: "owner" | "admin" | "member" }>,
    fetched: true,
  },
  mockHasOnboarded: { current: true },
  mockNavigationPush: vi.fn<(dest: string) => void>(),
  mockSetCurrentWorkspace: vi.fn<(slug: string | null, uuid: string | null) => void>(),
  mockResolvePostAuthDestination: vi.fn<(...args: unknown[]) => string>(
    () => "/some/destination",
  ),
  mockLeaveMutate: vi.fn<(id: string) => Promise<void>>(async () => undefined),
  mockDeleteMutate: vi.fn<(id: string) => Promise<void>>(async () => undefined),
  mockUpdateWorkspace: vi.fn(
    async (_id: string, patch: Record<string, unknown>) => ({
      id: "ws-1",
      name: "Acme",
      slug: "acme",
      ...patch,
    }),
  ),
  mockToastError: vi.fn(),
  mockToastSuccess: vi.fn(),
  callOrder: [] as string[],
  cachedWorkspaceList: [
    { id: "ws-1", name: "Acme" },
    { id: "ws-2", name: "Other" },
  ],
}));

vi.mock("sonner", () => ({
  toast: {
    error: mockToastError,
    success: mockToastSuccess,
  },
}));

vi.mock("@algoplan/core/auth", () => ({
  useAuthStore: (selector: (s: { user: typeof mockUser.current }) => unknown) =>
    selector({ user: mockUser.current }),
}));

vi.mock("@algoplan/core/workspace/mutations", () => ({
  useLeaveWorkspace: () => ({
    mutateAsync: vi.fn(async (id: string) => {
      callOrder.push("leave-mutate");
      return mockLeaveMutate(id);
    }),
  }),
  useDeleteWorkspace: () => ({
    mutateAsync: vi.fn(async (id: string) => {
      callOrder.push("delete-mutate");
      return mockDeleteMutate(id);
    }),
  }),
}));

vi.mock("@algoplan/core/hooks", () => ({
  useWorkspaceId: () => "ws-1",
}));

vi.mock("@algoplan/core/workspace/queries", () => ({
  memberListOptions: () => ({ queryKey: ["members"], queryFn: async () => [] }),
  workspaceKeys: {
    list: () => ["workspaces"],
    members: () => ["members"],
  },
  workspaceListOptions: () => ({
    queryKey: ["workspaces"],
    queryFn: async () => cachedWorkspaceList,
  }),
}));

vi.mock("@algoplan/core/api", () => ({
  api: {
    updateWorkspace: (id: string, patch: Record<string, unknown>) =>
      mockUpdateWorkspace(id, patch),
  },
}));

vi.mock("@algoplan/core/paths", () => ({
  resolvePostAuthDestination: (...args: unknown[]) => {
    callOrder.push("resolve-dest-read");
    return mockResolvePostAuthDestination(...args);
  },
  useCurrentWorkspace: () => mockWorkspace.current,
  useHasOnboarded: () => mockHasOnboarded.current,
}));

vi.mock("@algoplan/core/platform", () => ({
  setCurrentWorkspace: (slug: string | null, uuid: string | null) => {
    callOrder.push("set-current-workspace-null");
    return mockSetCurrentWorkspace(slug, uuid);
  },
}));

vi.mock("../../navigation", () => ({
  useNavigation: () => ({
    push: (dest: string) => {
      callOrder.push(`navigation-push:${dest}`);
      return mockNavigationPush(dest);
    },
  }),
}));

vi.mock("@tanstack/react-query", () => ({
  useQuery: () => ({
    data: mockMembers.current,
    isFetched: mockMembers.fetched,
  }),
  useQueryClient: () => ({
    getQueryData: (_key: unknown) => cachedWorkspaceList,
    setQueryData: vi.fn(),
    invalidateQueries: vi.fn(),
  }),
}));

// Strip Base UI portal-heavy AlertDialog/Dialog primitives — same approach as
// delete-workspace-dialog.test.tsx. Confirm/Cancel buttons stay reachable.
vi.mock("@algoplan/ui/components/ui/alert-dialog", () => ({
  AlertDialog: ({ children, open }: { children: ReactNode; open: boolean }) =>
    open ? <div>{children}</div> : null,
  AlertDialogContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  AlertDialogHeader: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  AlertDialogTitle: ({ children }: { children: ReactNode }) => <h2>{children}</h2>,
  AlertDialogDescription: ({ children }: { children: ReactNode }) => <p>{children}</p>,
  AlertDialogFooter: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  AlertDialogCancel: ({ children, onClick }: { children: ReactNode; onClick?: () => void }) => (
    <button onClick={onClick}>{children}</button>
  ),
  AlertDialogAction: ({
    children,
    onClick,
  }: {
    children: ReactNode;
    onClick?: () => void;
    variant?: string;
  }) => <button onClick={onClick}>{children}</button>,
}));

// DeleteWorkspaceDialog has its own test file — strip down to a button that
// fires onConfirm so we can drive the safe-order delete flow here.
vi.mock("./delete-workspace-dialog", () => ({
  DeleteWorkspaceDialog: ({
    open,
    onConfirm,
  }: {
    workspaceName: string;
    loading?: boolean;
    open: boolean;
    onOpenChange: (v: boolean) => void;
    onConfirm: () => void;
  }) =>
    open ? (
      <div>
        <button onClick={onConfirm} aria-label="confirm-typed-delete">
          confirm-typed-delete
        </button>
      </div>
    ) : null,
}));

import { WorkspaceTab } from "./workspace-tab";

beforeEach(() => {
  callOrder.length = 0;
  mockNavigationPush.mockReset();
  mockSetCurrentWorkspace.mockReset();
  mockResolvePostAuthDestination.mockReset();
  mockResolvePostAuthDestination.mockReturnValue("/some/destination");
  mockLeaveMutate.mockReset();
  mockLeaveMutate.mockResolvedValue(undefined);
  mockDeleteMutate.mockReset();
  mockDeleteMutate.mockResolvedValue(undefined);
  mockUpdateWorkspace.mockClear();
  mockToastError.mockReset();
  mockToastSuccess.mockReset();
  mockUser.current = { id: "user-1", name: "Owner User" };
  mockMembers.current = [
    { id: "m-1", user_id: "user-1", role: "owner" },
    { id: "m-2", user_id: "user-2", role: "member" },
  ];
  mockMembers.fetched = true;
});

describe("WorkspaceTab — German strings", () => {
  it("section heading 'Allgemein' is present", () => {
    render(<WorkspaceTab />);
    expect(
      screen.getByRole("heading", { name: "Allgemein" }),
    ).toBeInTheDocument();
  });

  it("section heading 'Gefahrenzone' is present", () => {
    render(<WorkspaceTab />);
    expect(
      screen.getByRole("heading", { name: "Gefahrenzone" }),
    ).toBeInTheDocument();
  });

  it("Leave heading 'Workspace verlassen' is present (matches both heading + button)", () => {
    render(<WorkspaceTab />);
    // Heading + button both carry the text — getAllByText keeps the
    // assertion robust without binding to layout.
    expect(screen.getAllByText("Workspace verlassen").length).toBeGreaterThan(0);
  });

  it("Delete heading 'Workspace löschen' is present (owner is current user)", () => {
    render(<WorkspaceTab />);
    expect(screen.getAllByText("Workspace löschen").length).toBeGreaterThan(0);
  });

  it("field labels render German: Name / Beschreibung / Kontext / Slug", () => {
    render(<WorkspaceTab />);
    expect(screen.getByText("Name")).toBeInTheDocument();
    expect(screen.getByText("Beschreibung")).toBeInTheDocument();
    expect(screen.getByText("Kontext")).toBeInTheDocument();
    expect(screen.getByText("Slug")).toBeInTheDocument();
  });

  it("Save button reads 'Speichern' (idle)", () => {
    render(<WorkspaceTab />);
    expect(
      screen.getByRole("button", { name: /Speichern/ }),
    ).toBeInTheDocument();
  });

  it("Save in-progress reads 'Wird gespeichert…'", async () => {
    const user = userEvent.setup();
    let resolveSave: ((v: { id: string; name: string; slug: string }) => void) | undefined;
    mockUpdateWorkspace.mockImplementationOnce(
      () =>
        new Promise<{ id: string; name: string; slug: string }>((res) => {
          resolveSave = res;
        }),
    );
    render(<WorkspaceTab />);
    await user.click(screen.getByRole("button", { name: /Speichern/ }));
    expect(
      screen.getByRole("button", { name: /Wird gespeichert…/ }),
    ).toBeInTheDocument();
    resolveSave?.({ id: "ws-1", name: "Acme", slug: "acme" });
  });

  it("Leave button reads 'Workspace verlassen'", () => {
    render(<WorkspaceTab />);
    // The non-sole-owner path renders the Leave button (we are owner but
    // there are 2 members — wait, owner-count is 1 and we ARE that owner so
    // sole-owner check applies. Switch member fixture so leave is clickable.)
    mockMembers.current = [
      { id: "m-1", user_id: "user-1", role: "owner" },
      { id: "m-2", user_id: "user-2", role: "owner" },
    ];
    render(<WorkspaceTab />);
    expect(
      screen.getAllByRole("button", { name: "Workspace verlassen" }).length,
    ).toBeGreaterThan(0);
  });

  it("non-admin hint reads German: 'Nur Admins und Owner können Workspace-Einstellungen ändern.'", () => {
    mockMembers.current = [
      { id: "m-1", user_id: "user-1", role: "member" },
    ];
    render(<WorkspaceTab />);
    expect(
      screen.getByText(
        "Nur Admins und Owner können Workspace-Einstellungen ändern.",
      ),
    ).toBeInTheDocument();
  });
});

describe("WorkspaceTab — SettingsSection wrappers", () => {
  it("Allgemein wraps in SettingsSection (default tone — no destructive ring)", () => {
    const { container } = render(<WorkspaceTab />);
    // The SettingsSection body wrapper has data-testid="settings-section-body"
    const bodies = container.querySelectorAll(
      "[data-testid='settings-section-body']",
    );
    expect(bodies.length).toBeGreaterThanOrEqual(2); // Allgemein + Gefahrenzone
  });

  it("Gefahrenzone wraps in SettingsSection tone='danger' with id='danger-zone'", () => {
    const { container } = render(<WorkspaceTab />);
    const dangerSection = container.querySelector("section#danger-zone");
    expect(dangerSection).not.toBeNull();
    // Heading dot is the danger marker rendered by SettingsSection
    const dot = dangerSection!.querySelector(
      "[data-testid='settings-section-dot']",
    );
    expect(dot).not.toBeNull();
    // And the body wrapper should have the destructive ring
    const body = dangerSection!.querySelector(
      "[data-testid='settings-section-body']",
    );
    expect(body).not.toBeNull();
    expect(body!.className).toContain("border-destructive/30");
  });
});

describe("WorkspaceTab — SAFE-ORDER regression for navigateAwayFromCurrentWorkspace", () => {
  it("LEAVE: calls in order — read dest → setCurrentWorkspace(null,null) → navigation.push(dest) → THEN leave-mutate", async () => {
    const user = userEvent.setup();
    // Two owners so leave isn't blocked by the sole-owner guard.
    mockMembers.current = [
      { id: "m-1", user_id: "user-1", role: "owner" },
      { id: "m-2", user_id: "user-2", role: "owner" },
    ];
    render(<WorkspaceTab />);

    // Click Leave (Danger Zone) — opens AlertDialog
    const leaveButtons = screen.getAllByRole("button", {
      name: "Workspace verlassen",
    });
    // The Danger Zone Leave button is the LAST one (the heading text matches too)
    const lastLeave = leaveButtons[leaveButtons.length - 1];
    if (!lastLeave) throw new Error("expected at least one Workspace verlassen button");
    await user.click(lastLeave);

    // Click Confirm in dialog
    await user.click(screen.getByRole("button", { name: "Bestätigen" }));

    await waitFor(() => {
      expect(callOrder).toContain("leave-mutate");
    });

    // Strict ordering: read destination FIRST, then null context, then push, then mutate.
    const idxRead = callOrder.indexOf("resolve-dest-read");
    const idxNull = callOrder.indexOf("set-current-workspace-null");
    const idxPush = callOrder.findIndex((s) => s.startsWith("navigation-push:"));
    const idxMutate = callOrder.indexOf("leave-mutate");
    expect(idxRead).toBeGreaterThanOrEqual(0);
    expect(idxNull).toBeGreaterThan(idxRead);
    expect(idxPush).toBeGreaterThan(idxNull);
    expect(idxMutate).toBeGreaterThan(idxPush);

    // setCurrentWorkspace cleared the singleton with (null, null)
    expect(mockSetCurrentWorkspace).toHaveBeenCalledWith(null, null);
    // navigation.push received the destination from resolvePostAuthDestination
    expect(mockNavigationPush).toHaveBeenCalledWith("/some/destination");
  });

  it("DELETE: same safe order — read dest → setCurrentWorkspace(null,null) → push → THEN delete-mutate", async () => {
    const user = userEvent.setup();
    render(<WorkspaceTab />);

    // Open the Delete typed-name dialog
    await user.click(screen.getByRole("button", { name: /Workspace löschen/ }));
    // The mocked DeleteWorkspaceDialog confirm button fires onConfirm directly
    await user.click(
      screen.getByRole("button", { name: "confirm-typed-delete" }),
    );

    await waitFor(() => {
      expect(callOrder).toContain("delete-mutate");
    });

    const idxRead = callOrder.indexOf("resolve-dest-read");
    const idxNull = callOrder.indexOf("set-current-workspace-null");
    const idxPush = callOrder.findIndex((s) => s.startsWith("navigation-push:"));
    const idxMutate = callOrder.indexOf("delete-mutate");
    expect(idxRead).toBeGreaterThanOrEqual(0);
    expect(idxNull).toBeGreaterThan(idxRead);
    expect(idxPush).toBeGreaterThan(idxNull);
    expect(idxMutate).toBeGreaterThan(idxPush);

    expect(mockSetCurrentWorkspace).toHaveBeenCalledWith(null, null);
  });
});
