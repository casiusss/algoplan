import { forwardRef, useImperativeHandle, useRef, useState } from "react";
import type { ReactNode } from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { Project } from "@multica/core/types";

// ---------------------------------------------------------------------------
// Hoisted mocks
// ---------------------------------------------------------------------------

const mockPush = vi.hoisted(() => vi.fn());
const mockUpdateMutateAsync = vi.hoisted(() => vi.fn());
const mockDeleteMutate = vi.hoisted(() => vi.fn());
const mockToastError = vi.hoisted(() => vi.fn());
const mockToastSuccess = vi.hoisted(() => vi.fn());
const roleRef = vi.hoisted(() => ({ current: "member" as "member" | "admin" | "owner" | null }));

function setRole(role: "member" | "admin" | "owner" | null) {
  roleRef.current = role;
}

// ---------------------------------------------------------------------------
// Module mocks
// ---------------------------------------------------------------------------

vi.mock("@multica/core/workspace/hooks", () => ({
  useCurrentMemberRole: () => roleRef.current,
  useActorName: () => ({
    getActorName: () => "",
    getActorInitials: () => "",
    getActorAvatarUrl: () => null,
    getMemberName: () => "",
    getAgentName: () => "",
  }),
}));

vi.mock("@multica/core/projects/mutations", () => ({
  useUpdateProject: () => ({
    mutateAsync: mockUpdateMutateAsync,
    isPending: false,
  }),
  useDeleteProject: () => ({
    mutate: mockDeleteMutate,
    isPending: false,
  }),
}));

vi.mock("@multica/core/hooks", () => ({
  useWorkspaceId: () => "00000000-0000-0000-0000-000000000000",
}));

vi.mock("@multica/core/paths", () => ({
  useCurrentWorkspace: () => ({
    id: "00000000-0000-0000-0000-000000000000",
    name: "Test Workspace",
    slug: "test-ws",
  }),
  useWorkspacePaths: () => ({
    projects: () => "/test-ws/projects",
    projectDetail: (id: string) => `/test-ws/projects/${id}`,
  }),
}));

vi.mock("@multica/core/auth", () => ({
  useAuthStore: Object.assign(
    (selector: (s: { user: { id: string } }) => unknown) => selector({ user: { id: "user-1" } }),
    { getState: () => ({ user: { id: "user-1" } }) },
  ),
}));

// Project detail query: we pull directly from the outer test by reading a ref.
const projectRef = vi.hoisted(() => ({ current: null as Project | null }));

vi.mock("@multica/core/projects/queries", () => ({
  projectDetailOptions: (_wsId: string, _id: string) => ({
    queryKey: ["project-detail"],
    queryFn: async () => projectRef.current,
  }),
}));

vi.mock("@multica/core/workspace/queries", () => ({
  memberListOptions: () => ({ queryKey: ["members"], queryFn: async () => [] }),
  agentListOptions: () => ({ queryKey: ["agents"], queryFn: async () => [] }),
}));

vi.mock("@multica/core/issues/queries", () => ({
  myIssueListOptions: () => ({ queryKey: ["issues"], queryFn: async () => [] }),
  childIssueProgressOptions: () => ({
    queryKey: ["child-progress"],
    queryFn: async () => new Map(),
  }),
}));

vi.mock("@multica/core/issues/mutations", () => ({
  useUpdateIssue: () => ({ mutate: vi.fn() }),
}));

vi.mock("@multica/core/pins", () => ({
  pinListOptions: () => ({ queryKey: ["pins"], queryFn: async () => [] }),
  useCreatePin: () => ({ mutate: vi.fn() }),
  useDeletePin: () => ({ mutate: vi.fn() }),
}));

vi.mock("@multica/core/issues/config", () => ({
  BOARD_STATUSES: [],
}));

vi.mock("@multica/core/projects/config", () => ({
  PROJECT_STATUS_ORDER: ["planned"],
  PROJECT_STATUS_CONFIG: {
    planned: { label: "Planned", dotColor: "bg-muted" },
    in_progress: { label: "In Progress", dotColor: "bg-info" },
    paused: { label: "Paused", dotColor: "bg-warning" },
    completed: { label: "Completed", dotColor: "bg-success" },
    cancelled: { label: "Cancelled", dotColor: "bg-destructive" },
  },
  PROJECT_PRIORITY_ORDER: ["none"],
  PROJECT_PRIORITY_CONFIG: {
    none: { label: "No priority" },
    urgent: { label: "Urgent" },
    high: { label: "High" },
    medium: { label: "Medium" },
    low: { label: "Low" },
  },
}));

vi.mock("@multica/core/issues/stores/view-store", () => ({
  createIssueViewStore: () => ({
    getState: () => ({
      sortBy: "position",
      sortDirection: "asc",
      setSortBy: () => {},
      setSortDirection: () => {},
    }),
  }),
}));

vi.mock("@multica/core/issues/stores/view-store-context", () => ({
  ViewStoreProvider: ({ children }: { children: ReactNode }) => <>{children}</>,
  useViewStore: (selector: (s: unknown) => unknown) =>
    selector({
      viewMode: "list",
      statusFilters: [],
      priorityFilters: [],
      assigneeFilters: [],
      includeNoAssignee: false,
      creatorFilters: [],
    }),
}));

vi.mock("../../issues/utils/filter", () => ({
  filterIssues: (issues: unknown[]) => issues,
}));

vi.mock("../../issues/components/priority-icon", () => ({
  PriorityIcon: () => <span data-testid="priority-icon" />,
}));

vi.mock("../../issues/components/issues-header", () => ({
  IssuesHeader: () => <div data-testid="issues-header" />,
}));

vi.mock("../../issues/components/board-view", () => ({
  BoardView: () => <div data-testid="board-view" />,
}));

vi.mock("../../issues/components/list-view", () => ({
  ListView: () => <div data-testid="list-view" />,
}));

vi.mock("../../issues/components/batch-action-toolbar", () => ({
  BatchActionToolbar: () => <div data-testid="batch-action-toolbar" />,
}));

vi.mock("../../common/actor-avatar", () => ({
  ActorAvatar: () => <span data-testid="actor-avatar" />,
}));

vi.mock("../../navigation", () => ({
  AppLink: ({ children, href }: { children: ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
  useNavigation: () => ({ push: mockPush }),
}));

vi.mock("../../editor", () => {
  const ContentEditor = forwardRef(
    (
      { defaultValue, placeholder }: { defaultValue?: string; placeholder?: string },
      ref: unknown,
    ) => {
      const valueRef = useRef(defaultValue || "");
      useImperativeHandle(ref as React.Ref<unknown>, () => ({
        getMarkdown: () => valueRef.current,
        uploadFile: vi.fn(),
      }));
      return <div data-testid="content-editor" aria-label={placeholder ?? ""} />;
    },
  );
  ContentEditor.displayName = "ContentEditor";

  return {
    ContentEditor,
    TitleEditor: ({ defaultValue, placeholder }: { defaultValue?: string; placeholder?: string }) => {
      const [value, setValue] = useState(defaultValue || "");
      return (
        <input
          type="text"
          aria-label="project title"
          placeholder={placeholder}
          value={value}
          onChange={(e) => setValue(e.target.value)}
        />
      );
    },
  };
});

vi.mock("../../layout/page-header", () => ({
  PageHeader: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

vi.mock("./project-issue-metrics", () => ({
  getProjectIssueMetrics: () => ({ totalCount: 0, completedCount: 0 }),
}));

vi.mock("react-resizable-panels", () => ({
  useDefaultLayout: () => ({ defaultLayout: undefined, onLayoutChanged: () => {} }),
  usePanelRef: () => ({ current: null }),
}));

vi.mock("@multica/ui/hooks/use-mobile", () => ({
  useIsMobile: () => false,
}));

vi.mock("@multica/ui/lib/utils", () => ({
  cn: (...values: Array<string | false | null | undefined>) => values.filter(Boolean).join(" "),
}));

vi.mock("@multica/ui/components/ui/skeleton", () => ({
  Skeleton: () => <div data-testid="skeleton" />,
}));

vi.mock("@multica/ui/components/ui/button", () => ({
  Button: ({
    children,
    disabled,
    onClick,
    type = "button",
    "aria-label": ariaLabel,
    title,
  }: {
    children: ReactNode;
    disabled?: boolean;
    onClick?: () => void;
    type?: "button" | "submit" | "reset";
    "aria-label"?: string;
    title?: string;
  }) => (
    <button type={type} disabled={disabled} onClick={onClick} aria-label={ariaLabel} title={title}>
      {children}
    </button>
  ),
}));

vi.mock("@multica/ui/components/ui/resizable", () => ({
  ResizablePanelGroup: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  ResizablePanel: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  ResizableHandle: () => <div />,
}));

vi.mock("@multica/ui/components/ui/sheet", () => ({
  Sheet: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  SheetContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

vi.mock("@multica/ui/components/ui/dropdown-menu", () => ({
  DropdownMenu: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DropdownMenuTrigger: ({ render }: { render: ReactNode }) => <>{render}</>,
  DropdownMenuContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DropdownMenuItem: ({ children, onClick }: { children: ReactNode; onClick?: () => void }) => (
    <button type="button" onClick={onClick}>
      {children}
    </button>
  ),
  DropdownMenuSeparator: () => <hr />,
}));

vi.mock("@multica/ui/components/ui/popover", () => ({
  Popover: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  PopoverTrigger: ({ render }: { render: ReactNode }) => <>{render}</>,
  PopoverContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

vi.mock("@multica/ui/components/ui/tooltip", () => ({
  Tooltip: ({ children }: { children: ReactNode }) => <>{children}</>,
  TooltipTrigger: ({ render }: { render: ReactNode }) => <>{render}</>,
  TooltipContent: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

vi.mock("@multica/ui/components/common/emoji-picker", () => ({
  EmojiPicker: () => <div data-testid="emoji-picker" />,
}));

vi.mock("@multica/ui/components/ui/alert-dialog", () => ({
  AlertDialog: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  AlertDialogAction: ({ children, onClick }: { children: ReactNode; onClick?: () => void }) => (
    <button onClick={onClick}>{children}</button>
  ),
  AlertDialogCancel: ({ children }: { children: ReactNode }) => <button>{children}</button>,
  AlertDialogContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  AlertDialogDescription: ({ children }: { children: ReactNode }) => <p>{children}</p>,
  AlertDialogFooter: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  AlertDialogHeader: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  AlertDialogTitle: ({ children }: { children: ReactNode }) => <h2>{children}</h2>,
}));

vi.mock("@tanstack/react-query", async () => {
  const actual = await vi.importActual<typeof import("@tanstack/react-query")>(
    "@tanstack/react-query",
  );
  return {
    ...actual,
    useQuery: (options: { queryKey: unknown[]; queryFn: () => unknown }) => {
      const key = Array.isArray(options.queryKey) ? options.queryKey[0] : "";
      if (key === "project-detail") {
        return { data: projectRef.current, isLoading: false };
      }
      return { data: [], isLoading: false };
    },
  };
});

vi.mock("sonner", () => ({
  toast: {
    error: mockToastError,
    success: mockToastSuccess,
  },
}));

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function mockProject(overrides: Partial<Project> = {}): Project {
  return {
    id: "project-1",
    workspace_id: "00000000-0000-0000-0000-000000000000",
    title: "Test Project",
    description: null,
    icon: null,
    status: "planned",
    priority: "none",
    lead_type: null,
    lead_id: null,
    repo_url: "https://github.com/a/b.git",
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    issue_count: 0,
    done_count: 0,
    ...overrides,
  };
}

import { ProjectDetail } from "./project-detail";

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("ProjectDetail — repo_url block", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    projectRef.current = mockProject();
    setRole("member");
  });

  it("member sees the repo URL but no edit button", () => {
    setRole("member");
    projectRef.current = mockProject({ repo_url: "https://a/b.git" });
    render(<ProjectDetail projectId="project-1" />);

    expect(screen.getByText("https://a/b.git")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /edit repository/i }),
    ).toBeNull();
  });

  it("admin sees the edit repository button", () => {
    setRole("admin");
    projectRef.current = mockProject({ repo_url: "https://a/b.git" });
    render(<ProjectDetail projectId="project-1" />);

    expect(
      screen.getByRole("button", { name: /edit repository/i }),
    ).toBeInTheDocument();
  });

  it("owner sees the edit repository button", () => {
    setRole("owner");
    projectRef.current = mockProject({ repo_url: "https://a/b.git" });
    render(<ProjectDetail projectId="project-1" />);

    expect(
      screen.getByRole("button", { name: /edit repository/i }),
    ).toBeInTheDocument();
  });

  it("admin save calls updateProject with new repo_url", async () => {
    setRole("admin");
    mockUpdateMutateAsync.mockResolvedValue({});
    projectRef.current = mockProject({ repo_url: "https://a/b.git" });

    const user = userEvent.setup();
    render(<ProjectDetail projectId="project-1" />);

    await user.click(screen.getByRole("button", { name: /edit repository/i }));

    const input = screen.getByLabelText(/repository url/i);
    await user.clear(input);
    await user.type(input, "https://a/c.git");

    await user.click(screen.getByRole("button", { name: /^save$/i }));

    expect(mockUpdateMutateAsync).toHaveBeenCalledWith(
      expect.objectContaining({ id: "project-1", repo_url: "https://a/c.git" }),
    );
  });

  it("admin save shows a specific error on 403 responses", async () => {
    setRole("admin");
    mockUpdateMutateAsync.mockRejectedValue({ status: 403 });
    projectRef.current = mockProject({ repo_url: "https://a/b.git" });

    const user = userEvent.setup();
    render(<ProjectDetail projectId="project-1" />);

    await user.click(screen.getByRole("button", { name: /edit repository/i }));

    const input = screen.getByLabelText(/repository url/i);
    await user.clear(input);
    await user.type(input, "https://a/c.git");

    await user.click(screen.getByRole("button", { name: /^save$/i }));

    expect(mockToastError).toHaveBeenCalledWith(
      expect.stringMatching(/only admins/i),
    );
  });
});
