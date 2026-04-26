import { describe, it, expect, beforeEach } from "vitest";
import {
  useInboxFilterStore,
  applyInboxFilter,
} from "./use-inbox-filter-store";
import type { InboxItem, InboxItemType } from "../types/inbox";

function resetStore(): void {
  useInboxFilterStore.setState({ selectedTypes: new Set<InboxItemType>() });
}

function makeItem(id: string, type: InboxItemType): InboxItem {
  return {
    id,
    workspace_id: "ws-1",
    recipient_type: "member",
    recipient_id: "user-1",
    actor_type: null,
    actor_id: null,
    type,
    severity: "info",
    issue_id: null,
    title: id,
    body: null,
    issue_status: null,
    read: false,
    archived: false,
    created_at: new Date().toISOString(),
    details: null,
  };
}

beforeEach(() => {
  resetStore();
});

describe("useInboxFilterStore — initial state", () => {
  it("starts with an empty selectedTypes set", () => {
    expect(useInboxFilterStore.getState().selectedTypes.size).toBe(0);
  });
});

describe("useInboxFilterStore — toggleType", () => {
  it("adds the type when not present", () => {
    useInboxFilterStore.getState().toggleType("mentioned");
    expect(useInboxFilterStore.getState().selectedTypes.has("mentioned")).toBe(true);
  });

  it("removes the type when toggled a second time", () => {
    useInboxFilterStore.getState().toggleType("mentioned");
    useInboxFilterStore.getState().toggleType("mentioned");
    expect(useInboxFilterStore.getState().selectedTypes.has("mentioned")).toBe(false);
  });

  it("supports independent toggles for multiple types", () => {
    useInboxFilterStore.getState().toggleType("mentioned");
    useInboxFilterStore.getState().toggleType("new_comment");
    const set = useInboxFilterStore.getState().selectedTypes;
    expect(set.has("mentioned")).toBe(true);
    expect(set.has("new_comment")).toBe(true);
    expect(set.size).toBe(2);
  });
});

describe("useInboxFilterStore — clearFilters", () => {
  it("empties the selectedTypes set", () => {
    useInboxFilterStore.getState().toggleType("mentioned");
    useInboxFilterStore.getState().toggleType("new_comment");
    useInboxFilterStore.getState().clearFilters();
    expect(useInboxFilterStore.getState().selectedTypes.size).toBe(0);
  });
});

describe("useInboxFilterStore — selector stability", () => {
  it("returns the SAME selectedTypes reference across reads when no mutation occurs", () => {
    const a = useInboxFilterStore.getState().selectedTypes;
    const b = useInboxFilterStore.getState().selectedTypes;
    expect(a).toBe(b);
  });

  it("creates a NEW selectedTypes Set when toggleType mutates (immutability)", () => {
    const before = useInboxFilterStore.getState().selectedTypes;
    useInboxFilterStore.getState().toggleType("mentioned");
    const after = useInboxFilterStore.getState().selectedTypes;
    expect(after).not.toBe(before);
    // The original reference is not mutated in-place.
    expect(before.has("mentioned")).toBe(false);
  });
});

describe("applyInboxFilter helper", () => {
  it("returns the full list when the selectedTypes set is empty (filter inactive)", () => {
    const items = [makeItem("a", "mentioned"), makeItem("b", "new_comment")];
    expect(applyInboxFilter(items, new Set())).toEqual(items);
  });

  it("returns only items matching the selected types when set is non-empty", () => {
    const a = makeItem("a", "mentioned");
    const b = makeItem("b", "new_comment");
    const c = makeItem("c", "issue_assigned");
    const filtered = applyInboxFilter([a, b, c], new Set(["mentioned", "new_comment"]));
    expect(filtered).toEqual([a, b]);
  });

  it("returns an empty array when no items match the selected types", () => {
    const items = [makeItem("a", "mentioned")];
    expect(applyInboxFilter(items, new Set(["new_comment"]))).toEqual([]);
  });
});
