import type { ReactNode } from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

const { mockMembers, mockInvitations } = vi.hoisted(() => ({
  mockMembers: {
    current: [
      {
        id: "m-1",
        user_id: "user-1",
        role: "owner" as const,
        name: "Owner User",
        email: "owner@example.com",
      },
    ] as Array<{
      id: string;
      user_id: string;
      role: "owner" | "admin" | "member";
      name: string;
      email: string;
    }>,
  },
  mockInvitations: {
    current: [] as Array<{ id: string; invitee_email: string; role: "member" }>,
  },
}));

vi.mock("sonner", () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}));

vi.mock("@multica/core/auth", () => ({
  useAuthStore: (selector: (s: { user: { id: string } }) => unknown) =>
    selector({ user: { id: "user-1" } }),
}));

vi.mock("@multica/core/hooks", () => ({
  useWorkspaceId: () => "ws-1",
}));

vi.mock("@multica/core/paths", () => ({
  useCurrentWorkspace: () => ({
    id: "ws-1",
    name: "Acme",
    slug: "acme",
  }),
}));

vi.mock("@multica/core/workspace/queries", () => ({
  memberListOptions: () => ({ queryKey: ["members"], queryFn: async () => [] }),
  invitationListOptions: () => ({
    queryKey: ["invitations"],
    queryFn: async () => [],
  }),
  workspaceKeys: {
    members: () => ["members"],
    invitations: () => ["invitations"],
  },
}));

vi.mock("@multica/core/api", () => ({
  api: {
    createMember: vi.fn(),
    updateMember: vi.fn(),
    deleteMember: vi.fn(),
    revokeInvitation: vi.fn(),
  },
}));

vi.mock("../../common/actor-avatar", () => ({
  ActorAvatar: () => <div data-testid="actor-avatar" />,
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

vi.mock("@multica/ui/components/ui/dropdown-menu", () => ({
  DropdownMenu: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DropdownMenuTrigger: () => null,
  DropdownMenuContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DropdownMenuItem: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DropdownMenuSeparator: () => null,
  DropdownMenuSub: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DropdownMenuSubTrigger: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DropdownMenuSubContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

vi.mock("@tanstack/react-query", () => ({
  useQuery: (opts: { queryKey: unknown[] }) => {
    if (opts.queryKey[0] === "members") {
      return { data: mockMembers.current };
    }
    if (opts.queryKey[0] === "invitations") {
      return { data: mockInvitations.current };
    }
    return { data: [] };
  },
  useQueryClient: () => ({ invalidateQueries: vi.fn() }),
}));

import { MembersTab } from "./members-tab";

describe("MembersTab", () => {
  beforeEach(() => {
    mockMembers.current = [
      {
        id: "m-1",
        user_id: "user-1",
        role: "owner",
        name: "Owner User",
        email: "owner@example.com",
      },
    ];
    mockInvitations.current = [];
  });

  it("wraps content in SettingsSection with German heading 'Mitglieder (n)'", () => {
    render(<MembersTab />);
    expect(
      screen.getByRole("heading", { name: /Mitglieder \(1\)/ }),
    ).toBeInTheDocument();
  });

  it("renders SettingsSection body wrapper", () => {
    const { container } = render(<MembersTab />);
    expect(
      container.querySelector("[data-testid='settings-section-body']"),
    ).not.toBeNull();
  });

  it("renders German invite heading 'Mitglied einladen' (when current user is admin/owner)", () => {
    render(<MembersTab />);
    expect(screen.getByText("Mitglied einladen")).toBeInTheDocument();
  });

  it("renders German invite button 'Einladen'", () => {
    render(<MembersTab />);
    expect(
      screen.getByRole("button", { name: /Einladen/ }),
    ).toBeInTheDocument();
  });

  it("placeholder uses German 'user@firma.de'", () => {
    render(<MembersTab />);
    expect(screen.getByPlaceholderText("user@firma.de")).toBeInTheDocument();
  });
});
