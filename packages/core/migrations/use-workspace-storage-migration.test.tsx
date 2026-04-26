// @vitest-environment jsdom
// PHASE-8 D-2 / B-04: Integration tests for useWorkspaceStorageMigration.
// Verifies workspace-scoped localStorage key migration from multica_* → algoplan_*.

import { describe, expect, it, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";
import type { StorageAdapter } from "../types/storage";
import {
  useWorkspaceStorageMigration,
  __resetMigrationState,
} from "./use-workspace-storage-migration";

interface RecordingAdapter extends StorageAdapter {
  snapshot(): Record<string, string>;
}

function makeAdapter(initial: Record<string, string> = {}): RecordingAdapter {
  const data = { ...initial };
  return {
    getItem: (k) => data[k] ?? null,
    setItem: (k, v) => {
      data[k] = v;
    },
    removeItem: (k) => {
      delete data[k];
    },
    snapshot: () => ({ ...data }),
  };
}

beforeEach(() => {
  __resetMigrationState();
});

describe("useWorkspaceStorageMigration", () => {
  it("is a no-op when slug list is empty", () => {
    const adapter = makeAdapter({ multica_issue_draft: "should-stay-untouched" });
    renderHook(() => useWorkspaceStorageMigration([], adapter));
    expect(adapter.snapshot()).toEqual({ multica_issue_draft: "should-stay-untouched" });
  });

  it("migrates workspace-scoped legacy keys for the provided slugs", () => {
    const adapter = makeAdapter({
      "multica_issue_draft:acme": "my-draft",
      "multica_issues_view:acme": "kanban",
      "multica:chat:drafts:acme": '{"hello":"world"}',
      untouched_key: "untouched-value",
    });
    renderHook(() => useWorkspaceStorageMigration(["acme"], adapter));
    const snap = adapter.snapshot();
    expect(snap["algoplan_issue_draft:acme"]).toBe("my-draft");
    expect(snap["algoplan_issues_view:acme"]).toBe("kanban");
    expect(snap["algoplan:chat:drafts:acme"]).toBe('{"hello":"world"}');
    expect(snap["multica_issue_draft:acme"]).toBeUndefined();
    expect(snap["multica_issues_view:acme"]).toBeUndefined();
    expect(snap["multica:chat:drafts:acme"]).toBeUndefined();
    expect(snap["untouched_key"]).toBe("untouched-value");
  });

  it("is idempotent — second render with same slug list does not re-process", () => {
    const adapter = makeAdapter({ "multica_navigation:acme": "/issues" });
    const { rerender } = renderHook(
      ({ slugs }) => useWorkspaceStorageMigration(slugs, adapter),
      { initialProps: { slugs: ["acme"] } },
    );
    expect(adapter.snapshot()["algoplan_navigation:acme"]).toBe("/issues");
    // Simulate a stale-write after migration — must NOT be reverted by a second migration call.
    adapter.setItem("multica_navigation:acme", "stale-write-after-migration");
    rerender({ slugs: ["acme"] });
    // The stale-write must remain, proving the second render skipped the already-processed slug.
    expect(adapter.snapshot()["multica_navigation:acme"]).toBe("stale-write-after-migration");
  });

  it("processes only newly-added slugs on subsequent renders", () => {
    const adapter = makeAdapter({
      "multica_issue_draft:acme": "draft-a",
      "multica_issue_draft:beta": "draft-b",
    });
    const { rerender } = renderHook(
      ({ slugs }) => useWorkspaceStorageMigration(slugs, adapter),
      { initialProps: { slugs: ["acme"] as readonly string[] } },
    );
    expect(adapter.snapshot()["algoplan_issue_draft:acme"]).toBe("draft-a");
    expect(adapter.snapshot()["multica_issue_draft:beta"]).toBe("draft-b"); // not yet migrated
    rerender({ slugs: ["acme", "beta"] });
    expect(adapter.snapshot()["algoplan_issue_draft:beta"]).toBe("draft-b");
    expect(adapter.snapshot()["multica_issue_draft:beta"]).toBeUndefined();
  });

  it("migrates chat-prefix variant verbatim (multica:chat:drafts → algoplan:chat:drafts)", () => {
    const adapter = makeAdapter({
      "multica:chat:drafts:acme": '{"text":"hello"}',
      "multica:chat:expanded:acme": "true",
    });
    renderHook(() => useWorkspaceStorageMigration(["acme"], adapter));
    const snap = adapter.snapshot();
    expect(snap["algoplan:chat:drafts:acme"]).toBe('{"text":"hello"}');
    expect(snap["algoplan:chat:expanded:acme"]).toBe("true");
    expect(snap["multica:chat:drafts:acme"]).toBeUndefined();
    expect(snap["multica:chat:expanded:acme"]).toBeUndefined();
  });

  it("__resetMigrationState clears module-level state so tests are isolated", () => {
    // First pass: migrate "acme" and verify it is processed.
    const adapterFirst = makeAdapter({ "multica_issue_draft:acme": "initial" });
    renderHook(() => useWorkspaceStorageMigration(["acme"], adapterFirst));
    expect(adapterFirst.snapshot()["algoplan_issue_draft:acme"]).toBe("initial");

    // Without reset: "acme" is already in processedSlugs — the hook is a no-op.
    const adapterSecond = makeAdapter({ "multica_issue_draft:acme": "second-value" });
    renderHook(() => useWorkspaceStorageMigration(["acme"], adapterSecond));
    expect(adapterSecond.snapshot()["algoplan_issue_draft:acme"]).toBeUndefined();

    // After reset: "acme" is no longer in processedSlugs — migration runs again.
    __resetMigrationState();
    renderHook(() => useWorkspaceStorageMigration(["acme"], adapterSecond));
    expect(adapterSecond.snapshot()["algoplan_issue_draft:acme"]).toBe("second-value");
  });
});
