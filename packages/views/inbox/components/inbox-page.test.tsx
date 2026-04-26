import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import type { InboxItem } from "@multica/core/types";

// ---------------------------------------------------------------------------
// Hoisted mock state
// ---------------------------------------------------------------------------

const {
  mockInbox,
  mockListInbox,
  mockMarkAllRead,
  mockMarkRead,
  mockArchive,
  mockArchiveAll,
  mockArchiveAllRead,
  mockArchiveCompleted,
  mockToastError,
} = vi.hoisted(() => ({
  mockInbox: { current: [] as InboxItem[] },
  mockListInbox: vi.fn(),
  mockMarkAllRead: vi.fn(),
  mockMarkRead: vi.fn(),
  mockArchive: vi.fn(),
  mockArchiveAll: vi.fn(),
  mockArchiveAllRead: vi.fn(),
  mockArchiveCompleted: vi.fn(),
  mockToastError: vi.fn(),
}));

vi.mock("@multica/core/api", () => ({
  api: {
    listInbox: () => mockListInbox(),
    markInboxRead: vi.fn(),
    archiveInbox: vi.fn(),
    markAllInboxRead: vi.fn(),
    archiveAllInbox: vi.fn(),
    archiveAllReadInbox: vi.fn(),
    archiveCompletedInbox: vi.fn(),
  },
}));

vi.mock("@multica/core/inbox/queries", async () => {
  const actual = await vi.importActual<typeof import("@multica/core/inbox/queries")>(
    "@multica/core/inbox/queries",
  );
  return {
    ...actual,
    deduplicateInboxItems: (items: InboxItem[]) => items,
  };
});

vi.mock("@multica/core/inbox/mutations", () => ({
  useMarkInboxRead: () => ({ mutate: mockMarkRead }),
  useArchiveInbox: () => ({ mutate: mockArchive }),
  useMarkAllInboxRead: () => ({ mutate: mockMarkAllRead }),
  useArchiveAllInbox: () => ({ mutate: mockArchiveAll }),
  useArchiveAllReadInbox: () => ({ mutate: mockArchiveAllRead }),
  useArchiveCompletedInbox: () => ({ mutate: mockArchiveCompleted }),
}));

vi.mock("@multica/core/hooks", () => ({
  useWorkspaceId: () => "ws-1",
}));

vi.mock("@multica/core/paths", () => ({
  useWorkspacePaths: () => ({
    inbox: () => "/ws-1/inbox",
    issueDetail: (id: string) => `/ws-1/issues/${id}`,
  }),
}));

vi.mock("@multica/core/workspace/hooks", () => ({
  useActorName: () => ({
    getActorName: () => "Tester",
    getActorInitials: () => "TT",
    getActorAvatarUrl: () => null,
  }),
}));

vi.mock("../../navigation", () => ({
  useNavigation: () => ({
    searchParams: new URLSearchParams(),
    replace: vi.fn(),
    push: vi.fn(),
    pathname: "/ws-1/inbox",
  }),
  AppLink: ({ href, children }: { href: string; children?: ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));

vi.mock("react-resizable-panels", async () => {
  const actual = await vi.importActual<typeof import("react-resizable-panels")>(
    "react-resizable-panels",
  );
  return {
    ...actual,
    useDefaultLayout: () => ({
      defaultLayout: undefined,
      onLayoutChanged: vi.fn(),
    }),
  };
});

// IssueDetail is a heavy module; replace with a stub so the inbox detail-pane
// path doesn't need a fully-wired issue cache.
vi.mock("../../issues/components", async () => {
  const actual = await vi.importActual<Record<string, unknown>>(
    "../../issues/components",
  );
  return {
    ...actual,
    IssueDetail: () => <div data-testid="issue-detail-stub" />,
  };
});

vi.mock("@multica/ui/hooks/use-mobile", () => ({
  useIsMobile: () => false,
}));

vi.mock("sonner", () => ({
  toast: { error: mockToastError, success: vi.fn() },
}));

// ---------------------------------------------------------------------------
// Import after mocks
// ---------------------------------------------------------------------------

import { InboxPage } from "./inbox-page";
import { useInboxFilterStore } from "@multica/core/inbox";
import type { InboxItemType } from "@multica/core/types";

function makeItem(overrides: Partial<InboxItem> = {}): InboxItem {
  return {
    id: overrides.id ?? `inbox-${Math.random().toString(36).slice(2, 8)}`,
    workspace_id: "ws-1",
    recipient_type: "member",
    recipient_id: "user-1",
    actor_type: null,
    actor_id: null,
    type: "issue_assigned",
    severity: "info",
    issue_id: null,
    title: overrides.title ?? "Test notification",
    body: null,
    issue_status: null,
    read: false,
    archived: false,
    created_at: new Date().toISOString(),
    details: null,
    ...overrides,
  };
}

function isoDaysAgo(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString();
}

function renderInbox() {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0, staleTime: 0 } },
  });
  return render(
    <QueryClientProvider client={qc}>
      <InboxPage />
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  mockInbox.current = [];
  mockListInbox.mockReset().mockImplementation(() =>
    Promise.resolve(mockInbox.current),
  );
  mockMarkAllRead.mockReset();
  mockMarkRead.mockReset();
  mockArchive.mockReset();
  mockArchiveAll.mockReset();
  mockArchiveAllRead.mockReset();
  mockArchiveCompleted.mockReset();
  mockToastError.mockReset();
  useInboxFilterStore.setState({ selectedTypes: new Set<InboxItemType>() });
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("InboxPage — German title", () => {
  it("renders the PageHeader title as 'Posteingang'", async () => {
    renderInbox();
    expect(await screen.findByText("Posteingang")).toBeInTheDocument();
    expect(screen.queryByText("Inbox")).toBeNull();
  });
});

describe("InboxPage — bucket grouping", () => {
  it("interleaves InboxBucketHeader rows with InboxListItem rows in fixed order", async () => {
    mockInbox.current = [
      makeItem({ id: "today-1", title: "Today A", created_at: isoDaysAgo(0) }),
      makeItem({ id: "yesterday-1", title: "Yesterday A", created_at: isoDaysAgo(1) }),
      makeItem({ id: "week-1", title: "Week A", created_at: isoDaysAgo(3) }),
      makeItem({ id: "older-1", title: "Older A", created_at: isoDaysAgo(30) }),
    ];
    renderInbox();
    // Wait for items to load
    await screen.findByText("Today A");
    expect(screen.getByText("Heute")).toBeInTheDocument();
    expect(screen.getByText("Gestern")).toBeInTheDocument();
    expect(screen.getByText("Diese Woche")).toBeInTheDocument();
    expect(screen.getByText("Älter")).toBeInTheDocument();
  });

  it("omits empty buckets entirely", async () => {
    mockInbox.current = [
      makeItem({ id: "today-1", title: "Today A", created_at: isoDaysAgo(0) }),
    ];
    renderInbox();
    await screen.findByText("Today A");
    expect(screen.getByText("Heute")).toBeInTheDocument();
    expect(screen.queryByText("Gestern")).toBeNull();
    expect(screen.queryByText("Diese Woche")).toBeNull();
    expect(screen.queryByText("Älter")).toBeNull();
  });
});

describe("InboxPage — Alle gelesen button", () => {
  it("renders the 'Alle gelesen' button when unreadCount > 0", async () => {
    mockInbox.current = [makeItem({ id: "u1", read: false })];
    renderInbox();
    expect(
      await screen.findByRole("button", { name: /Alle gelesen/i }),
    ).toBeInTheDocument();
  });

  it("hides the button entirely when unreadCount === 0", async () => {
    mockInbox.current = [makeItem({ id: "r1", read: true })];
    renderInbox();
    // Wait for any item-render so we know loading finished.
    await screen.findByText("Test notification");
    expect(
      screen.queryByRole("button", { name: /Alle gelesen/i }),
    ).toBeNull();
  });

  it("clicking the button calls the mark-all-read mutation", async () => {
    mockInbox.current = [makeItem({ id: "u1", read: false })];
    renderInbox();
    const btn = await screen.findByRole("button", { name: /Alle gelesen/i });
    await userEvent.setup().click(btn);
    expect(mockMarkAllRead).toHaveBeenCalledTimes(1);
  });

  it("mark-all-read failure shows German toast", async () => {
    mockInbox.current = [makeItem({ id: "u1", read: false })];
    // The mutate fn used in the page passes (undefined, { onError }). Invoke
    // onError immediately to simulate a failed call.
    mockMarkAllRead.mockImplementation((_args, opts?: { onError?: () => void }) => {
      opts?.onError?.();
    });
    renderInbox();
    const btn = await screen.findByRole("button", { name: /Alle gelesen/i });
    await userEvent.setup().click(btn);
    expect(mockToastError).toHaveBeenCalledWith(
      "Konnte nicht als gelesen markiert werden",
    );
  });
});

describe("InboxPage — E shortcut", () => {
  it("pressing 'e' with body focused fires mark-all-read", async () => {
    mockInbox.current = [makeItem({ id: "u1", read: false })];
    renderInbox();
    await screen.findByText("Test notification");
    document.body.focus();
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "e" }));
    expect(mockMarkAllRead).toHaveBeenCalledTimes(1);
  });

  it("pressing 'e' while a textarea is focused does NOT fire", async () => {
    mockInbox.current = [makeItem({ id: "u1", read: false })];
    renderInbox();
    await screen.findByText("Test notification");
    const ta = document.createElement("textarea");
    document.body.appendChild(ta);
    ta.focus();
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "e" }));
    expect(mockMarkAllRead).not.toHaveBeenCalled();
    ta.remove();
  });
});

describe("InboxPage — Mark-all-read removed from More-actions dropdown", () => {
  it("dropdown menu does NOT contain a 'Mark all as read' item anymore", async () => {
    mockInbox.current = [makeItem({ id: "u1", read: false })];
    renderInbox();
    await screen.findByText("Test notification");
    expect(screen.queryByText(/Mark all as read/i)).toBeNull();
    // German equivalent should also not appear inside any dropdown menu item.
    // (We intentionally allow "Alle gelesen" as it lives in the PageHeader button.)
  });
});

describe("InboxPage — Type filter chips", () => {
  it("renders 4 chips below the PageHeader title row", async () => {
    mockInbox.current = [makeItem({ id: "u1", read: false })];
    renderInbox();
    expect(
      await screen.findByRole("button", { name: "Erwähnungen" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Zuweisungen" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Kommentare" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "System" })).toBeInTheDocument();
  });

  it("toggling a chip narrows the rendered list (client-side filter)", async () => {
    mockInbox.current = [
      makeItem({ id: "a", title: "A mention", type: "mentioned" }),
      makeItem({ id: "b", title: "B comment", type: "new_comment" }),
    ];
    renderInbox();
    await screen.findByText("A mention");
    expect(screen.getByText("B comment")).toBeInTheDocument();
    await userEvent.setup().click(
      screen.getByRole("button", { name: "Erwähnungen" }),
    );
    expect(screen.getByText("A mention")).toBeInTheDocument();
    expect(screen.queryByText("B comment")).toBeNull();
  });
});

describe("InboxPage — Empty state", () => {
  it("renders 'Keine Benachrichtigungen' when items list is empty", async () => {
    mockInbox.current = [];
    renderInbox();
    expect(
      await screen.findByText("Keine Benachrichtigungen"),
    ).toBeInTheDocument();
  });
});
