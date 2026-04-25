import { describe, it, expect, vi, beforeEach } from "vitest";
import { render } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { Issue, IssueStatus } from "@multica/core/types";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock("@multica/core/hooks", () => ({
  useWorkspaceId: () => "ws-1",
}));

vi.mock("@multica/core/paths", async () => {
  const actual = await vi.importActual<typeof import("@multica/core/paths")>(
    "@multica/core/paths",
  );
  return {
    ...actual,
    useCurrentWorkspace: () => ({ id: "ws-1", name: "Test WS", slug: "test" }),
    useWorkspacePaths: () => actual.paths.workspace("test"),
  };
});

vi.mock("../../navigation", () => ({
  AppLink: ({ children, href, ...props }: any) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
  useNavigation: () => ({ push: vi.fn(), pathname: "/issues" }),
}));

const mockSelectionState = {
  selectedIds: new Set<string>(),
  toggle: vi.fn(),
  clear: vi.fn(),
  setAll: vi.fn(),
  select: vi.fn(),
  deselect: vi.fn(),
};

vi.mock("@multica/core/issues/stores/selection-store", () => ({
  useIssueSelectionStore: Object.assign(
    (selector?: any) => (selector ? selector(mockSelectionState) : mockSelectionState),
    { getState: () => mockSelectionState },
  ),
}));

const mockViewState = {
  viewMode: "list" as const,
  sortBy: "position" as const,
  sortDirection: "asc" as const,
  cardProperties: {
    priority: true,
    description: true,
    assignee: true,
    dueDate: true,
    project: true,
    childProgress: true,
  },
  listCollapsedStatuses: [] as IssueStatus[],
  toggleListCollapsed: vi.fn(),
};

vi.mock("@multica/core/issues/stores/view-store-context", () => ({
  ViewStoreProvider: ({ children }: { children: React.ReactNode }) => children,
  useViewStore: (selector?: any) => (selector ? selector(mockViewState) : mockViewState),
  useViewStoreApi: () => ({ getState: () => mockViewState, setState: vi.fn(), subscribe: vi.fn() }),
}));

vi.mock("@multica/core/projects/queries", () => ({
  projectListOptions: (_wsId: string) => ({
    queryKey: ["projects", _wsId],
    queryFn: async () => [],
  }),
}));

vi.mock("@multica/core/issues/config", () => ({
  ALL_STATUSES: ["backlog", "todo", "in_progress", "in_review", "done", "blocked", "cancelled"],
  BOARD_STATUSES: ["backlog", "todo", "in_progress", "in_review", "done", "blocked"],
  STATUS_ORDER: ["backlog", "todo", "in_progress", "in_review", "done", "blocked", "cancelled"],
  PRIORITY_ORDER: ["urgent", "high", "medium", "low", "none"],
  STATUS_CONFIG: {
    backlog: {
      label: "Backlog",
      iconColor: "text-muted-foreground",
      hoverBg: "hover:bg-accent",
      dividerColor: "bg-muted-foreground/40",
      badgeBg: "bg-muted",
      badgeText: "text-muted-foreground",
      columnBg: "bg-muted/40",
    },
    todo: {
      label: "Todo",
      iconColor: "text-muted-foreground",
      hoverBg: "hover:bg-accent",
      dividerColor: "bg-muted-foreground/40",
      badgeBg: "bg-muted",
      badgeText: "text-muted-foreground",
      columnBg: "bg-muted/40",
    },
    in_progress: {
      label: "In Progress",
      iconColor: "text-warning",
      hoverBg: "hover:bg-warning/10",
      dividerColor: "bg-warning",
      badgeBg: "bg-warning",
      badgeText: "text-white",
      columnBg: "bg-warning/5",
    },
  },
  PRIORITY_CONFIG: {
    urgent: { label: "Urgent", bars: 4, color: "text-destructive" },
    high: { label: "High", bars: 3, color: "text-warning" },
    medium: { label: "Medium", bars: 2, color: "text-warning" },
    low: { label: "Low", bars: 1, color: "text-info" },
    none: { label: "No priority", bars: 0, color: "text-muted-foreground" },
  },
}));

const mockOpenModal = vi.fn();
vi.mock("@multica/core/modals", () => ({
  useModalStore: Object.assign(
    () => ({ open: mockOpenModal }),
    { getState: () => ({ open: mockOpenModal }) },
  ),
}));

const mockLoadMore = vi.fn();
vi.mock("@multica/core/issues/mutations", () => ({
  useLoadMoreByStatus: (_status: IssueStatus) => ({
    loadMore: mockLoadMore,
    hasMore: false,
    isLoading: false,
    total: 0,
  }),
}));

vi.mock("../../common/actor-avatar", () => ({
  ActorAvatar: () => <span data-testid="actor-avatar" />,
}));

// Mock @base-ui/react/accordion — render children directly so we can
// query the trigger/header markup without needing a real disclosure widget.
vi.mock("@base-ui/react/accordion", () => ({
  Accordion: {
    Root: ({ children }: any) => <div>{children}</div>,
    Item: ({ children }: any) => <div>{children}</div>,
    Header: ({ children, className, ...rest }: any) => (
      <div className={className} {...rest}>
        {children}
      </div>
    ),
    Trigger: ({ children, className, ...rest }: any) => (
      <button className={className} {...rest}>
        {children}
      </button>
    ),
    Panel: ({ children, className, ...rest }: any) => (
      <div className={className} {...rest}>
        {children}
      </div>
    ),
  },
}));

vi.mock("./infinite-scroll-sentinel", () => ({
  InfiniteScrollSentinel: () => <div data-testid="sentinel" />,
}));

// ---------------------------------------------------------------------------
// Import component under test (after mocks)
// ---------------------------------------------------------------------------

import { ListView } from "./list-view";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const issueDefaults = {
  parent_issue_id: null,
  project_id: null,
  position: 0,
  workspace_id: "ws-1",
  description: null,
  assignee_type: null,
  assignee_id: null,
  creator_type: "member" as const,
  creator_id: "user-1",
  due_date: null,
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
};

const sampleIssue: Issue = {
  ...issueDefaults,
  id: "issue-1",
  number: 1,
  identifier: "TES-1",
  title: "Sample",
  status: "todo",
  priority: "medium",
};

function renderListView(opts: { issues?: Issue[]; statuses?: IssueStatus[] } = {}) {
  const { issues = [sampleIssue], statuses = ["todo"] } = opts;
  const qc = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false },
    },
  });
  return render(
    <QueryClientProvider client={qc}>
      <ListView issues={issues} visibleStatuses={statuses} />
    </QueryClientProvider>,
  );
}

// ---------------------------------------------------------------------------
// Tests — KBN-07 visual contract
// ---------------------------------------------------------------------------

describe("ListView — KBN-07 visual contract", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSelectionState.selectedIds = new Set();
    mockViewState.listCollapsedStatuses = [];
  });

  it("status accordion header has h-12 sticky top-0 z-10 bg-card border-b", () => {
    const { container } = renderListView();
    const header = container.querySelector("[data-list-view-header]");
    expect(header).toBeTruthy();
    expect(header?.className).toMatch(/h-12/);
    expect(header?.className).toMatch(/sticky/);
    expect(header?.className).toMatch(/top-0/);
    expect(header?.className).toMatch(/z-10/);
    expect(header?.className).toMatch(/bg-card/);
    expect(header?.className).toMatch(/border-b/);
  });

  it("status label has italic + font-semibold", () => {
    const { container } = renderListView();
    const label = container.querySelector("[data-list-view-status-label]");
    expect(label).toBeTruthy();
    expect(label?.className).toMatch(/italic/);
    expect(label?.className).toMatch(/font-semibold/);
  });

  it("count span has tabular-nums", () => {
    const { container } = renderListView();
    const count = container.querySelector("[data-list-view-count]");
    expect(count).toBeTruthy();
    expect(count?.className).toMatch(/tabular-nums/);
  });

  it("add-button trigger has aria-label='Issue hinzufügen'", () => {
    const { container } = renderListView();
    const trigger = container.querySelector("[data-list-view-add-trigger]");
    expect(trigger).toBeTruthy();
    expect(trigger?.getAttribute("aria-label")).toBe("Issue hinzufügen");
  });

  it("empty status body shows 'Keine Issues'", () => {
    const { getByText } = renderListView({ issues: [], statuses: ["todo"] });
    expect(getByText("Keine Issues")).toBeTruthy();
  });
});
