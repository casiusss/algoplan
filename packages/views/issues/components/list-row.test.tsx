import { describe, it, expect, vi, beforeEach } from "vitest";
import { render } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { Issue, IssuePriority } from "@multica/core/types";

// ---------------------------------------------------------------------------
// Mocks (mirror issues-page.test.tsx patterns)
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
  cardProperties: {
    priority: true,
    description: true,
    assignee: true,
    dueDate: true,
    project: true,
    childProgress: true,
  },
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
  PRIORITY_CONFIG: {
    urgent: { label: "Urgent", bars: 4, color: "text-destructive" },
    high: { label: "High", bars: 3, color: "text-warning" },
    medium: { label: "Medium", bars: 2, color: "text-warning" },
    low: { label: "Low", bars: 1, color: "text-info" },
    none: { label: "No priority", bars: 0, color: "text-muted-foreground" },
  },
}));

vi.mock("../../common/actor-avatar", () => ({
  ActorAvatar: () => <span data-testid="actor-avatar" />,
}));

// ---------------------------------------------------------------------------
// Import component under test (after mocks)
// ---------------------------------------------------------------------------

import { ListRow } from "./list-row";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const baseIssue: Issue = {
  id: "issue-1",
  workspace_id: "ws-1",
  parent_issue_id: null,
  project_id: null,
  position: 0,
  number: 1,
  identifier: "TES-1",
  title: "Sample issue",
  description: null,
  status: "todo",
  priority: "medium",
  assignee_type: null,
  assignee_id: null,
  creator_type: "member",
  creator_id: "user-1",
  due_date: null,
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
};

function renderRow(opts: { priority?: IssuePriority; selected?: boolean } = {}) {
  const { priority = "medium", selected = false } = opts;
  mockSelectionState.selectedIds = selected ? new Set(["issue-1"]) : new Set();
  const issue: Issue = { ...baseIssue, priority };
  const qc = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false },
    },
  });
  return render(
    <QueryClientProvider client={qc}>
      <ListRow issue={issue} />
    </QueryClientProvider>,
  );
}

// ---------------------------------------------------------------------------
// Tests — KBN-07 AccentBar contract (W-1 selector strategy)
// ---------------------------------------------------------------------------

describe("ListRow — KBN-07 AccentBar contract", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSelectionState.selectedIds = new Set();
  });

  it.each([
    ["urgent", "tag-p0"],
    ["high", "tag-p1"],
    ["medium", "tag-p2"],
    ["low", "tag-p3"],
    ["none", "muted"],
  ] as const)(
    "renders leading AccentBar (vertical) with color %s → %s when not selected",
    (priority, expectedColor) => {
      const { container } = renderRow({ priority, selected: false });
      const leading = container.querySelector("[data-list-row-leading]");
      expect(leading).toBeTruthy();
      const bar = leading?.querySelector('[data-slot="accent-bar"]');
      expect(bar).toBeTruthy();
      // Vertical orientation encoded by className (absolute inset-y-0 left-0 w-1):
      expect(bar?.className ?? "").toMatch(/absolute/);
      expect(bar?.className ?? "").toMatch(/inset-y-0/);
      expect(bar?.className ?? "").toMatch(/left-0/);
      expect(bar?.className ?? "").toMatch(/w-1/);
      // Color class lives on a child segment span (atom uses bg-{color}); we
      // check the AccentBar root subtree for any (bg|to|from)-{color} hit.
      const subtreeClasses = Array.from(bar?.querySelectorAll("*") ?? [])
        .map((el) => el.className)
        .join(" ");
      const allClasses = `${bar?.className ?? ""} ${subtreeClasses}`;
      expect(allClasses).toMatch(new RegExp(`(bg|to|from)-${expectedColor}`));
    },
  );

  it("AccentBar is suppressed when row is selected", () => {
    const { container } = renderRow({ priority: "urgent", selected: true });
    const leading = container.querySelector("[data-list-row-leading]");
    // The leading container itself MAY still exist (empty) OR be entirely
    // absent — either is acceptable; what matters is no AccentBar inside it.
    const bar = leading?.querySelector('[data-slot="accent-bar"]') ?? null;
    expect(bar).toBeNull();
  });

  it("outer row div has relative positioning AND data-list-row-root", () => {
    const { container } = renderRow();
    const outer = container.querySelector("[data-list-row-root]");
    expect(outer).toBeTruthy();
    expect(outer?.className).toMatch(/\brelative\b/);
  });

  it("title span has font-medium AND data-list-row-title", () => {
    const { container } = renderRow();
    const title = container.querySelector("[data-list-row-title]");
    expect(title).toBeTruthy();
    expect(title?.className).toMatch(/font-medium/);
  });
});
