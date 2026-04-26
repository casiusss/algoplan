// @vitest-environment jsdom
/**
 * Stability test for useIssueCountByPriority — Plan 05 (Wave 4).
 *
 * PRIORITY MAPPING (per Plan 00 verification of packages/core/types/issue.ts):
 *   "urgent" → P0, "high" → P1, "medium" → P2, "low" → P3, "none" → excluded
 */
import { describe, it, expect, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { useIssueCountByPriority } from "./use-issue-count-by-priority";
import { issueKeys } from "../queries";
import type { Issue, ListIssuesCache } from "../../types";

// Mock @algoplan/core/api so issueListOptions's queryFn never hits the network.
const { mockListIssues } = vi.hoisted(() => ({ mockListIssues: vi.fn() }));
vi.mock("../../api", () => ({
  api: { listIssues: mockListIssues },
}));

function makeWrapper(qc?: QueryClient) {
  const client =
    qc ??
    new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const Wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return { Wrapper, client };
}

function makeIssue(id: string, priority: Issue["priority"]): Issue {
  return {
    id,
    workspace_id: "ws-1",
    number: 1,
    identifier: `WS-${id}`,
    title: `Issue ${id}`,
    description: null,
    status: "todo",
    priority,
    assignee_type: null,
    assignee_id: null,
    creator_type: "member",
    creator_id: "user-1",
    parent_issue_id: null,
    project_id: null,
    position: 0,
    due_date: null,
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
  };
}

/**
 * Build a ListIssuesCache (the raw cache shape) from a flat Issue[].
 * `issueListOptions(...).select` flattens it back to Issue[] for consumers.
 */
function makeCache(issues: Issue[]): ListIssuesCache {
  return {
    byStatus: {
      todo: { issues, total: issues.length },
    },
  };
}

describe("useIssueCountByPriority (SHL-05)", () => {
  it("returns frozen EMPTY when wsId is undefined — same reference across rerenders", () => {
    const { Wrapper } = makeWrapper();
    const { result, rerender } = renderHook(
      () => useIssueCountByPriority(undefined),
      { wrapper: Wrapper },
    );
    const first = result.current;
    rerender();
    expect(Object.is(first, result.current)).toBe(true);
    expect(first).toEqual({ p0: 0, p1: 0, p2: 0, p3: 0 });
  });

  it("returns frozen EMPTY when issues data is undefined (query not yet resolved)", () => {
    const { Wrapper } = makeWrapper();
    // mockListIssues is a vi.fn() that returns undefined → query stays pending → data is undefined
    mockListIssues.mockReturnValue(new Promise(() => {})); // never-resolving
    const { result, rerender } = renderHook(
      () => useIssueCountByPriority("ws-1"),
      { wrapper: Wrapper },
    );
    const first = result.current;
    rerender();
    expect(first).toEqual({ p0: 0, p1: 0, p2: 0, p3: 0 });
    expect(Object.is(first, result.current)).toBe(true);
  });

  it("returns frozen EMPTY when issues array is empty — same reference as the undefined-wsId branch", () => {
    const { Wrapper, client } = makeWrapper();
    client.setQueryData<ListIssuesCache>(issueKeys.list("ws-1"), makeCache([]));
    const { result } = renderHook(
      () => useIssueCountByPriority("ws-1"),
      { wrapper: Wrapper },
    );
    expect(result.current).toEqual({ p0: 0, p1: 0, p2: 0, p3: 0 });

    // Cross-hook reference equality: same EMPTY singleton when wsId is undefined too.
    const { Wrapper: Wrapper2 } = makeWrapper();
    const { result: result2 } = renderHook(
      () => useIssueCountByPriority(undefined),
      { wrapper: Wrapper2 },
    );
    expect(Object.is(result.current, result2.current)).toBe(true);
  });

  it("maps urgent→p0, high→p1, medium→p2, low→p3 and excludes none", () => {
    const { Wrapper, client } = makeWrapper();
    const issues: Issue[] = [
      makeIssue("a", "urgent"),
      makeIssue("b", "urgent"),
      makeIssue("c", "high"),
      makeIssue("d", "medium"),
      makeIssue("e", "medium"),
      makeIssue("f", "medium"),
      makeIssue("g", "low"),
      makeIssue("h", "none"),
      makeIssue("i", "none"),
      makeIssue("j", "none"),
      makeIssue("k", "none"),
    ];
    client.setQueryData<ListIssuesCache>(
      issueKeys.list("ws-1"),
      makeCache(issues),
    );

    const { result } = renderHook(
      () => useIssueCountByPriority("ws-1"),
      { wrapper: Wrapper },
    );
    expect(result.current).toEqual({ p0: 2, p1: 1, p2: 3, p3: 1 });
  });

  it("returns same object reference across renders with stable input (SHL-05)", () => {
    const { Wrapper, client } = makeWrapper();
    const issues: Issue[] = [
      makeIssue("a", "urgent"),
      makeIssue("b", "high"),
    ];
    client.setQueryData<ListIssuesCache>(
      issueKeys.list("ws-1"),
      makeCache(issues),
    );

    const { result, rerender } = renderHook(
      () => useIssueCountByPriority("ws-1"),
      { wrapper: Wrapper },
    );
    const first = result.current;
    rerender();
    expect(Object.is(first, result.current)).toBe(true);
  });

  it("different input issues array → different output object reference", () => {
    const { Wrapper, client } = makeWrapper();
    client.setQueryData<ListIssuesCache>(
      issueKeys.list("ws-1"),
      makeCache([makeIssue("a", "urgent")]),
    );

    const { result, rerender } = renderHook(
      () => useIssueCountByPriority("ws-1"),
      { wrapper: Wrapper },
    );
    const first = result.current;

    // Replace with a different issues array reference
    client.setQueryData<ListIssuesCache>(
      issueKeys.list("ws-1"),
      makeCache([
        makeIssue("a", "urgent"),
        makeIssue("b", "high"),
      ]),
    );
    rerender();
    expect(Object.is(first, result.current)).toBe(false);
    expect(result.current).toEqual({ p0: 1, p1: 1, p2: 0, p3: 0 });
  });
});
