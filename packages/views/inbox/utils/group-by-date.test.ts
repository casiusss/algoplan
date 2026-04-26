import { describe, it, expect } from "vitest";
import { groupInboxByDate, type InboxBucket } from "./group-by-date";
import type { InboxItem } from "@multica/core/types";

function makeItem(id: string, createdAt: string): InboxItem {
  return {
    id,
    workspace_id: "ws-1",
    recipient_type: "member",
    recipient_id: "user-1",
    actor_type: null,
    actor_id: null,
    type: "issue_assigned",
    severity: "info",
    issue_id: null,
    title: id,
    body: null,
    issue_status: null,
    read: false,
    archived: false,
    created_at: createdAt,
    details: null,
  };
}

// Reference "now" anchored on a deterministic calendar slot so all tests
// reason in local time without DST surprises.
function fixedNow(): Date {
  return new Date("2026-04-26T15:00:00");
}

function isoAt(now: Date, daysOffset: number, hour: number, minute = 0): string {
  const d = new Date(now);
  d.setDate(d.getDate() + daysOffset);
  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
}

describe("groupInboxByDate — bucket boundaries", () => {
  it("places an item from 23:59 today into the today bucket", () => {
    const now = fixedNow();
    const item = makeItem("a", isoAt(now, 0, 23, 59));
    const groups = groupInboxByDate([item], now);
    expect(groups).toEqual([{ bucket: "today" as InboxBucket, items: [item] }]);
  });

  it("places an item from 00:01 yesterday into the yesterday bucket", () => {
    const now = fixedNow();
    const item = makeItem("b", isoAt(now, -1, 0, 1));
    const groups = groupInboxByDate([item], now);
    expect(groups).toEqual([{ bucket: "yesterday", items: [item] }]);
  });

  it("places an item from 2 days ago into the this_week bucket", () => {
    const now = fixedNow();
    const item = makeItem("c", isoAt(now, -2, 12));
    const groups = groupInboxByDate([item], now);
    expect(groups).toEqual([{ bucket: "this_week", items: [item] }]);
  });

  it("places an item from 6 days ago into the this_week bucket", () => {
    const now = fixedNow();
    const item = makeItem("d", isoAt(now, -6, 12));
    const groups = groupInboxByDate([item], now);
    expect(groups).toEqual([{ bucket: "this_week", items: [item] }]);
  });

  it("places an item from 7 days ago into the older bucket", () => {
    const now = fixedNow();
    const item = makeItem("e", isoAt(now, -7, 12));
    const groups = groupInboxByDate([item], now);
    expect(groups).toEqual([{ bucket: "older", items: [item] }]);
  });

  it("places an item from 30 days ago into the older bucket", () => {
    const now = fixedNow();
    const item = makeItem("f", isoAt(now, -30, 12));
    const groups = groupInboxByDate([item], now);
    expect(groups).toEqual([{ bucket: "older", items: [item] }]);
  });
});

describe("groupInboxByDate — order, omission, stability", () => {
  it("returns an empty array when the input is empty", () => {
    const groups = groupInboxByDate([], fixedNow());
    expect(groups).toEqual([]);
  });

  it("preserves the fixed bucket order: today → yesterday → this_week → older", () => {
    const now = fixedNow();
    const items = [
      makeItem("older", isoAt(now, -10, 12)),
      makeItem("week", isoAt(now, -3, 12)),
      makeItem("yesterday", isoAt(now, -1, 12)),
      makeItem("today", isoAt(now, 0, 12)),
    ];
    const groups = groupInboxByDate(items, now);
    expect(groups.map((g) => g.bucket)).toEqual([
      "today",
      "yesterday",
      "this_week",
      "older",
    ]);
  });

  it("omits empty buckets entirely (no header rendered for an empty bucket)", () => {
    const now = fixedNow();
    const items = [
      makeItem("today", isoAt(now, 0, 12)),
      makeItem("older", isoAt(now, -30, 12)),
    ];
    const groups = groupInboxByDate(items, now);
    expect(groups.map((g) => g.bucket)).toEqual(["today", "older"]);
    expect(groups.length).toBe(2);
  });

  it("preserves input order within a bucket (stable)", () => {
    const now = fixedNow();
    const a = makeItem("a", isoAt(now, 0, 8));
    const b = makeItem("b", isoAt(now, 0, 14));
    const c = makeItem("c", isoAt(now, 0, 20));
    const groups = groupInboxByDate([a, b, c], now);
    expect(groups[0]?.items).toEqual([a, b, c]);
  });

  it("uses the current Date when `now` is omitted", () => {
    // Smoke check — must not throw and must return an array.
    const item = makeItem("a", new Date().toISOString());
    const groups = groupInboxByDate([item]);
    expect(Array.isArray(groups)).toBe(true);
  });
});
