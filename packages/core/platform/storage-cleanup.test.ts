import { describe, it, expect, vi } from "vitest";
import { clearWorkspaceStorage } from "./storage-cleanup";

describe("clearWorkspaceStorage", () => {
  it("removes all workspace-scoped algoplan_* keys for given wsId", () => {
    const adapter = {
      getItem: vi.fn(),
      setItem: vi.fn(),
      removeItem: vi.fn(),
    };

    clearWorkspaceStorage(adapter, "ws_123");

    expect(adapter.removeItem).toHaveBeenCalledWith(
      "algoplan_issue_draft:ws_123",
    );
    expect(adapter.removeItem).toHaveBeenCalledWith(
      "algoplan_issues_view:ws_123",
    );
    expect(adapter.removeItem).toHaveBeenCalledWith(
      "algoplan_issues_scope:ws_123",
    );
    expect(adapter.removeItem).toHaveBeenCalledWith(
      "algoplan_my_issues_view:ws_123",
    );
    expect(adapter.removeItem).toHaveBeenCalledWith(
      "algoplan:chat:selectedAgentId:ws_123",
    );
    expect(adapter.removeItem).toHaveBeenCalledWith(
      "algoplan:chat:activeSessionId:ws_123",
    );
    expect(adapter.removeItem).toHaveBeenCalledWith(
      "algoplan:chat:drafts:ws_123",
    );
    expect(adapter.removeItem).toHaveBeenCalledWith(
      "algoplan:chat:expanded:ws_123",
    );
    expect(adapter.removeItem).toHaveBeenCalledWith(
      "algoplan_navigation:ws_123",
    );
    expect(adapter.removeItem).toHaveBeenCalledTimes(9);
  });
});
