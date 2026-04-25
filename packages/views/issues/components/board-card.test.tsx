import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { Issue, IssuePriority } from "@multica/core/types";

// ---------------------------------------------------------------------------
// Mocks (mirror issues-page.test.tsx pattern; v0.4 dnd-kit surface)
// ---------------------------------------------------------------------------

vi.mock("@multica/core/hooks", () => ({
  useWorkspaceId: () => "ws-1",
}));

vi.mock("@multica/core/auth", () => ({
  useAuthStore: Object.assign(
    (selector?: any) => {
      const state = { user: { id: "u-1" }, isAuthenticated: true };
      return selector ? selector(state) : state;
    },
    { getState: () => ({ user: { id: "u-1" }, isAuthenticated: true }) },
  ),
}));

vi.mock("@multica/core/paths", async () => {
  const actual = await vi.importActual<typeof import("@multica/core/paths")>(
    "@multica/core/paths",
  );
  return {
    ...actual,
    useWorkspacePaths: () => actual.paths.workspace("test"),
  };
});

vi.mock("../../navigation", () => ({
  AppLink: ({ children, href, ...props }: any) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock("@multica/core/api", () => ({
  api: {
    listMembers: () => Promise.resolve([]),
    listAgents: () => Promise.resolve([]),
    listProjects: () => Promise.resolve([]),
  },
  getApi: () => ({
    listMembers: () => Promise.resolve([]),
    listAgents: () => Promise.resolve([]),
    listProjects: () => Promise.resolve([]),
  }),
}));

vi.mock("@multica/core/issues/config", () => ({
  PRIORITY_CONFIG: {
    urgent: { label: "Urgent", badgeBg: "bg-tag-p0", badgeText: "text-white" },
    high: { label: "High", badgeBg: "bg-tag-p1", badgeText: "text-white" },
    medium: { label: "Medium", badgeBg: "bg-tag-p2", badgeText: "text-white" },
    low: { label: "Low", badgeBg: "bg-tag-p3", badgeText: "text-white" },
    none: { label: "No priority", badgeBg: "bg-muted", badgeText: "text-muted-foreground" },
  },
}));

const mockCardProperties = {
  priority: false,
  description: false,
  assignee: false,
  dueDate: false,
  project: false,
  childProgress: false,
};
vi.mock("@multica/core/issues/stores/view-store-context", () => ({
  useViewStore: (selector?: any) =>
    selector ? selector({ cardProperties: mockCardProperties }) : { cardProperties: mockCardProperties },
}));

vi.mock("@multica/core/issues/mutations", () => ({
  useUpdateIssue: () => ({ mutate: vi.fn(), isPending: false }),
}));

vi.mock("@multica/core/projects/queries", () => ({
  projectListOptions: () => ({ queryKey: ["projects"], queryFn: () => Promise.resolve([]) }),
}));

vi.mock("../../common/actor-avatar", () => ({
  ActorAvatar: () => null,
}));

vi.mock("./pickers", () => ({
  PriorityPicker: ({ trigger }: any) => trigger,
  AssigneePicker: ({ trigger }: any) => trigger,
  DueDatePicker: ({ trigger }: any) => trigger,
}));

vi.mock("./priority-icon", () => ({
  PriorityIcon: () => null,
}));

vi.mock("./progress-ring", () => ({
  ProgressRing: () => null,
}));

vi.mock("sonner", () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}));

// v0.4 dnd-kit mocks (mirror issues-page.test.tsx Z. 209-234)
vi.mock("@dnd-kit/react", () => ({
  DragDropProvider: ({ children }: any) => children,
  DragOverlay: () => null,
  useDroppable: () => ({ ref: vi.fn(), isDropTarget: false }),
}));

vi.mock("@dnd-kit/react/sortable", () => ({
  useSortable: () => ({
    ref: vi.fn(),
    isDragging: false,
    isDropTarget: false,
    isDragSource: false,
    isDropping: false,
  }),
  isSortable: () => true,
}));

vi.mock("@dnd-kit/dom", () => ({
  AutoScroller: { configure: () => ({}) },
  PointerSensor: { configure: () => ({}) },
}));

vi.mock("@dnd-kit/abstract", () => ({
  CollisionPriority: { Lowest: 0, Low: 1, Normal: 2, High: 3, Highest: 4 },
}));

// ---------------------------------------------------------------------------
// Import component (after mocks)
// ---------------------------------------------------------------------------

import { BoardCardContent } from "./board-card";

// ---------------------------------------------------------------------------
// Test data + helpers
// ---------------------------------------------------------------------------

function makeIssue(overrides: Partial<Issue> = {}): Issue {
  return {
    id: "issue-1",
    workspace_id: "ws-1",
    number: 1,
    identifier: "TES-1",
    title: "Implement auth",
    description: null,
    status: "todo",
    priority: "high",
    assignee_type: null,
    assignee_id: null,
    creator_type: "member",
    creator_id: "user-1",
    parent_issue_id: null,
    project_id: null,
    position: 0,
    due_date: null,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

function renderCard(overrides: Partial<Issue> = {}) {
  const qc = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false },
    },
  });
  return render(
    <QueryClientProvider client={qc}>
      <BoardCardContent issue={makeIssue(overrides)} />
    </QueryClientProvider>,
  );
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("BoardCard - KBN-07 AccentBar contract", () => {
  it.each([
    ["urgent", "tag-p0"],
    ["high", "tag-p1"],
    ["medium", "tag-p2"],
    ["low", "tag-p3"],
    ["none", "muted"],
  ] as const)("renders AccentBar with color %s -> %s", (priority, expectedColor) => {
    const { container } = renderCard({ priority: priority as IssuePriority });
    const bar = container.querySelector('[data-slot="accent-bar"]');
    expect(bar).toBeTruthy();
    expect(bar?.outerHTML ?? "").toMatch(new RegExp(`(bg|to|from)-${expectedColor}`));
  });

  it("outer card div has overflow-hidden so AccentBar clips to rounded corners", () => {
    const { container } = renderCard();
    const outer = container.querySelector("[data-board-card-root]");
    expect(outer).toBeTruthy();
    expect(outer?.className).toMatch(/overflow-hidden/);
  });

  it("outer card div exposes data-issue-id (W-2 - Plan 05 KBN-01 spec consumer)", () => {
    const { container } = renderCard({ id: "issue-test-123" });
    const outer = container.querySelector("[data-board-card-root]");
    expect(outer?.getAttribute("data-issue-id")).toBe("issue-test-123");
  });

  it("identifier row uses pt-3 (NOT py-3) - AccentBar provides top space", () => {
    const { container } = renderCard();
    const identifier = container.querySelector("[data-board-card-identifier]");
    expect(identifier).toBeTruthy();
    expect(identifier?.className).toMatch(/pt-3/);
    expect(identifier?.className).not.toMatch(/py-3/);
  });
});
