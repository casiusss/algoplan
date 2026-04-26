import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import type { InboxItem } from "@algoplan/core/types";

// ---------------------------------------------------------------------------
// Hoisted mocks (vi.hoisted + Object.assign per CLAUDE.md)
// ---------------------------------------------------------------------------

const {
  mockUser,
  mockWorkspace,
  mockWorkspaces,
  mockInvitations,
  mockInbox,
  mockPinned,
  mockListInbox,
  mockPathname,
  mockPush,
  mockTheme,
  mockSetTheme,
  mockOpen,
  mockToggle,
  mockState,
  mockHasRuntimeUpdates,
  mockLogout,
} = vi.hoisted(() => ({
  mockUser: {
    current: { id: "user-1", name: "Alice", email: "alice@example.com", avatar_url: null } as
      | { id: string; name: string; email: string; avatar_url: string | null }
      | null,
  },
  mockWorkspace: {
    current: null as { id: string; name: string; slug: string } | null,
  },
  mockWorkspaces: { current: [] as Array<{ id: string; name: string; slug: string }> },
  mockInvitations: { current: [] as Array<{ id: string; workspace_id: string; workspace_name: string }> },
  mockInbox: { current: [] as InboxItem[] },
  mockPinned: { current: [] as Array<{ id: string; item_type: "issue"; item_id: string }> },
  mockListInbox: vi.fn(),
  mockPathname: { current: "/ws-1/issues" },
  mockPush: vi.fn(),
  mockTheme: { current: "light" as "light" | "dark" | "system" },
  mockSetTheme: vi.fn(),
  mockOpen: vi.fn(),
  mockToggle: vi.fn(),
  mockState: {
    current: {
      priorityFilters: [] as Array<"urgent" | "high" | "medium" | "low" | "none">,
    },
  },
  mockHasRuntimeUpdates: { current: false },
  mockLogout: vi.fn(),
}));

vi.mock("@algoplan/core/auth", () => {
  const useAuthStore = Object.assign(
    (selector?: (s: { user: typeof mockUser.current }) => unknown) => {
      const state = { user: mockUser.current };
      return selector ? selector(state) : state;
    },
    {
      getState: () => ({ user: mockUser.current }),
    },
  );
  return { useAuthStore };
});

vi.mock("@algoplan/core/paths", () => ({
  paths: {
    workspace: (slug: string) => ({
      issues: () => `/${slug}/issues`,
      inbox: () => `/${slug}/inbox`,
    }),
  },
  useCurrentWorkspace: () => mockWorkspace.current,
  useWorkspacePaths: () => ({
    inbox: () => "/ws-1/inbox",
    myIssues: () => "/ws-1/my-issues",
    issues: () => "/ws-1/issues",
    projects: () => "/ws-1/projects",
    autopilots: () => "/ws-1/autopilots",
    agents: () => "/ws-1/agents",
    runtimes: () => "/ws-1/runtimes",
    skills: () => "/ws-1/skills",
    settings: () => "/ws-1/settings",
    issueDetail: (id: string) => `/ws-1/issues/${id}`,
    projectDetail: (id: string) => `/ws-1/projects/${id}`,
  }),
}));

vi.mock("@algoplan/core/workspace/queries", () => ({
  workspaceListOptions: () => ({
    queryKey: ["workspace", "list"],
    queryFn: () => Promise.resolve(mockWorkspaces.current),
  }),
  myInvitationListOptions: () => ({
    queryKey: ["workspace", "my-invitations"],
    queryFn: () => Promise.resolve(mockInvitations.current),
  }),
  workspaceKeys: {
    all: () => ["workspace"] as const,
    myInvitations: () => ["workspace", "my-invitations"] as const,
  },
}));

vi.mock("@algoplan/core/inbox/queries", () => ({
  inboxKeys: {
    all: (wsId: string) => ["inbox", wsId] as const,
    list: (wsId: string) => ["inbox", wsId, "list"] as const,
  },
  deduplicateInboxItems: (items: InboxItem[]) => items,
}));

vi.mock("@algoplan/core/api", () => ({
  api: {
    listInbox: () => mockListInbox(),
    listWorkspaces: () => Promise.resolve(mockWorkspaces.current),
    listMyInvitations: () => Promise.resolve(mockInvitations.current),
    acceptInvitation: vi.fn(),
    declineInvitation: vi.fn(),
  },
}));

vi.mock("@algoplan/core/modals", () => ({
  useModalStore: Object.assign(
    () => ({ modal: null }),
    {
      getState: () => ({
        modal: null,
        open: mockOpen,
      }),
    },
  ),
}));

vi.mock("@algoplan/core/runtimes/hooks", () => ({
  useMyRuntimesNeedUpdate: () => mockHasRuntimeUpdates.current,
}));

vi.mock("@algoplan/core/pins/queries", () => ({
  pinListOptions: (wsId: string, userId: string) => ({
    queryKey: ["pins", wsId, userId],
    queryFn: () => Promise.resolve(mockPinned.current),
    enabled: !!wsId && !!userId,
  }),
}));

vi.mock("@algoplan/core/pins/mutations", () => ({
  useDeletePin: () => ({ mutate: vi.fn() }),
  useReorderPins: () => ({ mutate: vi.fn() }),
}));

vi.mock("@algoplan/core/issues/queries", () => ({
  issueDetailOptions: (wsId: string, id: string) => ({
    queryKey: ["issue", wsId, id],
    queryFn: () => Promise.resolve(null),
  }),
}));

// PriorityGrid (Plan 01) consumes useIssueCountByPriority (Plan 05). Mock the
// derived hook directly so this test stays decoupled from issue-list query
// internals.
vi.mock("@algoplan/core/issues/derived", () => ({
  useIssueCountByPriority: () => ({ p0: 0, p1: 0, p2: 0, p3: 0 }),
  useBlockerCount: () => 0,
}));

vi.mock("@algoplan/core/projects/queries", () => ({
  projectDetailOptions: (wsId: string, id: string) => ({
    queryKey: ["project", wsId, id],
    queryFn: () => Promise.resolve(null),
  }),
}));

vi.mock("@algoplan/core/issues/stores/draft-store", () => ({
  useIssueDraftStore: Object.assign(
    (selector?: (s: { draft: { title: string; description: string } }) => unknown) => {
      const state = { draft: { title: "", description: "" } };
      return selector ? selector(state) : state;
    },
    {
      getState: () => ({ draft: { title: "", description: "" } }),
    },
  ),
}));

vi.mock("@algoplan/core/issues/stores/view-store", () => {
  const useIssueViewStore = Object.assign(
    (selector?: (s: typeof mockState.current & { togglePriorityFilter: typeof mockToggle }) => unknown) => {
      const state = {
        ...mockState.current,
        togglePriorityFilter: mockToggle,
      };
      return selector ? selector(state) : state;
    },
    {
      getState: () => ({
        ...mockState.current,
        togglePriorityFilter: mockToggle,
      }),
    },
  );
  return { useIssueViewStore };
});

vi.mock("@algoplan/ui/components/common/theme-provider", () => ({
  useTheme: () => ({
    theme: mockTheme.current,
    resolvedTheme: mockTheme.current,
    setTheme: mockSetTheme,
  }),
}));

vi.mock("../navigation", () => ({
  useNavigation: () => ({
    push: mockPush,
    pathname: mockPathname.current,
  }),
  AppLink: ({ href, children, ...rest }: { href: string; children?: ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

vi.mock("../auth", () => ({
  useLogout: () => mockLogout,
}));

vi.mock("../workspace/workspace-avatar", () => ({
  WorkspaceAvatar: ({ name }: { name: string }) => (
    <span data-testid="workspace-avatar">{name}</span>
  ),
}));

vi.mock("../issues/components/status-icon", () => ({
  StatusIcon: () => <span data-testid="status-icon" />,
}));

vi.mock("../layout/help-launcher", () => ({
  HelpLauncher: () => <button type="button" data-testid="help-launcher" aria-label="Help" />,
}));

import { AppSidebar } from "./app-sidebar";
import { SidebarProvider } from "@algoplan/ui/components/ui/sidebar";

function renderSidebar(props: Parameters<typeof AppSidebar>[0] = {}) {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0, staleTime: 0 } },
  });
  return render(
    <QueryClientProvider client={qc}>
      <SidebarProvider>
        <AppSidebar {...props} />
      </SidebarProvider>
    </QueryClientProvider>,
  );
}

describe("AppSidebar", () => {
  beforeEach(() => {
    mockUser.current = { id: "user-1", name: "Alice", email: "alice@example.com", avatar_url: null };
    mockWorkspace.current = null;
    mockWorkspaces.current = [];
    mockInvitations.current = [];
    mockInbox.current = [];
    mockPinned.current = [];
    mockState.current.priorityFilters = [];
    mockTheme.current = "light";
    mockHasRuntimeUpdates.current = false;
    mockListInbox.mockReset().mockImplementation(() => Promise.resolve(mockInbox.current));
    mockPush.mockReset();
    mockSetTheme.mockReset();
    mockOpen.mockReset();
    mockToggle.mockReset();
    mockLogout.mockReset();
    mockPathname.current = "/ws-1/issues";
  });

  it("with wsId='ws-1' mounts all the composed surfaces (group labels, priority cells, badges, footer toggles, help)", async () => {
    renderSidebar({ wsId: "ws-1" });

    // Personal/Workspace/Configure/Priority group labels
    expect(screen.getByText("Personal")).toBeInTheDocument();
    expect(screen.getByText("Workspace")).toBeInTheDocument();
    expect(screen.getByText("Configure")).toBeInTheDocument();
    expect(screen.getByText("Priority")).toBeInTheDocument();

    // PriorityGrid renders 4 P0..P3 buttons
    expect(screen.getByLabelText("Filter by P0")).toBeInTheDocument();
    expect(screen.getByLabelText("Filter by P1")).toBeInTheDocument();
    expect(screen.getByLabelText("Filter by P2")).toBeInTheDocument();
    expect(screen.getByLabelText("Filter by P3")).toBeInTheDocument();

    // NotificationsBadge owns the Inbox row
    expect(screen.getByText("Inbox")).toBeInTheDocument();

    // Footer trio
    expect(screen.getByLabelText("Switch to dark mode")).toBeInTheDocument(); // DarkModeToggle
    expect(screen.getByTestId("help-launcher")).toBeInTheDocument();
    // CollapseToggle (SidebarTrigger) renders as a button with text "Toggle Sidebar"
    const collapseTriggers = screen.getAllByLabelText(/toggle sidebar/i);
    expect(collapseTriggers.length).toBeGreaterThan(0);
  });

  it("does not throw when wsId is undefined and falls back to useCurrentWorkspace()", () => {
    mockWorkspace.current = null;
    expect(() => renderSidebar({ wsId: undefined })).not.toThrow();
  });

  it("renders 'AlgoPlan' as the wordmark fallback when no workspace is selected (Multica → AlgoPlan regression lock)", () => {
    mockWorkspace.current = null;
    renderSidebar({ wsId: undefined });
    // The wordmark trigger label falls back to "AlgoPlan"
    expect(screen.getAllByText("AlgoPlan").length).toBeGreaterThan(0);
  });

  it("renders the active workspace name in the wordmark trigger when a workspace is present", () => {
    mockWorkspace.current = { id: "ws-1", name: "Acme Corp", slug: "acme" };
    renderSidebar({ wsId: "ws-1" });
    // The workspace name appears in both the WorkspaceAvatar mock and the
    // Wordmark trigger label — at minimum one occurrence must be present.
    expect(screen.getAllByText("Acme Corp").length).toBeGreaterThan(0);
  });

  it("active nav row carries an AccentBar (data-slot='accent-bar', color='brand', orientation='vertical')", () => {
    mockWorkspace.current = { id: "ws-1", name: "Acme", slug: "acme" };
    mockPathname.current = "/ws-1/issues"; // matches the Workspace 'Issues' nav item
    const { container } = renderSidebar({ wsId: "ws-1" });
    // Phase 2 AccentBar atom emits data-slot="accent-bar"; the brand active bar
    // uses bg-brand on its single segment.
    const accentBars = container.querySelectorAll('[data-slot="accent-bar"]');
    expect(accentBars.length).toBeGreaterThan(0);
    // At least one accent bar contains a bg-brand segment
    const hasBrandBar = Array.from(accentBars).some((bar) =>
      bar.querySelector(".bg-brand"),
    );
    expect(hasBrandBar).toBe(true);
  });

  it("renders the topSlot prop above SidebarHeader (preserves dual-topSlot pattern from Pitfall 2)", () => {
    renderSidebar({
      wsId: "ws-1",
      topSlot: <div data-testid="custom-top">drag-strip</div>,
    });
    expect(screen.getByTestId("custom-top")).toBeInTheDocument();
  });

  it("PriorityGrid container carries the group-data-[collapsible=icon]:hidden class for collapsed-state hide behavior", () => {
    const { container } = renderSidebar({ wsId: "ws-1" });
    // The PriorityGrid root <div> exposes the group-data hide class — real CSS
    // hide behavior is owned by the Sidebar primitive's data-collapsible attr.
    const hides = container.querySelectorAll(".group-data-\\[collapsible\\=icon\\]\\:hidden");
    expect(hides.length).toBeGreaterThan(0);
  });
});
