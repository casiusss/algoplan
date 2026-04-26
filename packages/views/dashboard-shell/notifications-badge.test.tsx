import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import type { InboxItem } from "@algoplan/core/types";

const { mockInbox, mockListInbox, mockPathname, mockPush } = vi.hoisted(() => ({
  mockInbox: { current: [] as InboxItem[] },
  mockListInbox: vi.fn(),
  mockPathname: { current: "/ws-1/issues" },
  mockPush: vi.fn(),
}));

vi.mock("@algoplan/core/api", () => ({
  api: {
    listInbox: () => mockListInbox(),
  },
}));

vi.mock("@algoplan/core/inbox/queries", () => ({
  inboxKeys: {
    all: (wsId: string) => ["inbox", wsId] as const,
    list: (wsId: string) => ["inbox", wsId, "list"] as const,
  },
  deduplicateInboxItems: (items: InboxItem[]) => items,
}));

vi.mock("@algoplan/core/paths", () => ({
  useWorkspacePaths: () => ({
    inbox: () => "/ws-1/inbox",
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

import { NotificationsBadge } from "./notifications-badge";
import { SidebarProvider, SidebarMenu } from "@algoplan/ui/components/ui/sidebar";

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
    title: "test",
    body: null,
    issue_status: null,
    read: false,
    archived: false,
    created_at: new Date().toISOString(),
    details: null,
    ...overrides,
  };
}

function renderBadge(props: { wsId: string | undefined }) {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0, staleTime: 0 } },
  });
  return render(
    <QueryClientProvider client={qc}>
      <SidebarProvider>
        <SidebarMenu>
          <NotificationsBadge wsId={props.wsId} />
        </SidebarMenu>
      </SidebarProvider>
    </QueryClientProvider>,
  );
}

describe("NotificationsBadge", () => {
  beforeEach(() => {
    mockInbox.current = [];
    mockListInbox.mockReset().mockImplementation(() => Promise.resolve(mockInbox.current));
    mockPush.mockReset();
    mockPathname.current = "/ws-1/issues";
  });

  it("renders the Inbox icon + 'Inbox' label", async () => {
    renderBadge({ wsId: "ws-1" });
    expect(await screen.findByText("Inbox")).toBeInTheDocument();
  });

  it("renders no mini-badge when count is zero", async () => {
    renderBadge({ wsId: "ws-1" });
    await screen.findByText("Inbox");
    // No tabular-nums numeric badge present
    expect(document.querySelector(".bg-destructive")).toBeNull();
  });

  it("disables query when wsId is undefined and renders zero-count form", async () => {
    renderBadge({ wsId: undefined });
    expect(await screen.findByText("Inbox")).toBeInTheDocument();
    expect(mockListInbox).not.toHaveBeenCalled();
    expect(document.querySelector(".bg-destructive")).toBeNull();
  });

  it("renders mini-badge with count when unread > 0", async () => {
    mockInbox.current = [
      makeItem({ id: "a", read: false }),
      makeItem({ id: "b", read: false }),
      makeItem({ id: "c", read: false }),
      makeItem({ id: "d", read: false }),
      makeItem({ id: "e", read: false }),
    ];
    renderBadge({ wsId: "ws-1" });
    expect(await screen.findByText("5")).toBeInTheDocument();
    const badge = document.querySelector(".bg-destructive");
    expect(badge).toBeTruthy();
    expect(badge?.className).toMatch(/tabular-nums/);
    expect(badge?.className).toMatch(/font-semibold/);
    expect(badge?.className).toMatch(/rounded-full/);
  });

  it("clamps display to '99+' for counts > 99", async () => {
    mockInbox.current = Array.from({ length: 150 }, (_, i) =>
      makeItem({ id: `i-${i}`, read: false }),
    );
    renderBadge({ wsId: "ws-1" });
    expect(await screen.findByText("99+")).toBeInTheDocument();
  });

  it("aria-label uses singular 'notification' when count === 1", async () => {
    mockInbox.current = [makeItem({ id: "only", read: false })];
    renderBadge({ wsId: "ws-1" });
    await screen.findByText("1");
    const button = document.querySelector("[aria-label]");
    expect(button?.getAttribute("aria-label")).toBe(
      "Inbox, 1 unread notification",
    );
  });

  it("aria-label uses plural 'notifications' when count > 1", async () => {
    mockInbox.current = [
      makeItem({ id: "a", read: false }),
      makeItem({ id: "b", read: false }),
      makeItem({ id: "c", read: false }),
    ];
    renderBadge({ wsId: "ws-1" });
    await screen.findByText("3");
    const labelled = Array.from(document.querySelectorAll("[aria-label]")).find(
      (n) => n.getAttribute("aria-label")?.includes("Inbox"),
    );
    expect(labelled?.getAttribute("aria-label")).toBe(
      "Inbox, 3 unread notifications",
    );
  });

  it("aria-label is plain 'Inbox' when count is zero", async () => {
    renderBadge({ wsId: "ws-1" });
    await screen.findByText("Inbox");
    const labelled = Array.from(document.querySelectorAll("[aria-label]")).find(
      (n) => n.getAttribute("aria-label") === "Inbox",
    );
    expect(labelled).toBeTruthy();
  });
});
