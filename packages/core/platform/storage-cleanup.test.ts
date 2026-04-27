import { describe, it, expect, vi } from "vitest";
import { clearWorkspaceStorage } from "./storage-cleanup";

// Phase 8 D-2 update: Plan 08-04 renamed workspace-scoped keys from
// multica_* / multica:chat:* to algoplan_* / algoplan:chat:*. A one-shot
// migration in packages/core/migrations/localstorage.ts covers the legacy
// keys so no user data is silently lost on upgrade to v0.5.0.
// This test is updated to assert the new algoplan_* keys are cleared.
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
