import { describe, expect, it } from "vitest";
import type { StorageAdapter } from "../types/storage";
import {
  LEGACY_KEY_MAP,
  WORKSPACE_SCOPED_LEGACY_KEY_MAP,
  migrateLocalStorage,
  migrateWorkspaceScopedKeys,
} from "./localstorage";

interface RecordingAdapter extends StorageAdapter {
  snapshot(): Record<string, string>;
  ops: Array<["get" | "set" | "remove", string, string | null]>;
}

function makeAdapter(initial: Record<string, string> = {}): RecordingAdapter {
  const data = { ...initial };
  const ops: RecordingAdapter["ops"] = [];
  return {
    getItem: (k) => {
      const v = data[k] ?? null;
      ops.push(["get", k, v]);
      return v;
    },
    setItem: (k, v) => {
      data[k] = v;
      ops.push(["set", k, v]);
    },
    removeItem: (k) => {
      delete data[k];
      ops.push(["remove", k, null]);
    },
    snapshot: () => ({ ...data }),
    ops,
  };
}

describe("migrateLocalStorage — global keys", () => {
  it("returns empty report on empty adapter", () => {
    const adapter = makeAdapter();
    const report = migrateLocalStorage(adapter);
    expect(report).toEqual({ migrated: [], skipped: [], total: 0 });
    expect(adapter.snapshot()).toEqual({});
  });

  it("migrates multica_token to algoplan_token, deletes legacy", () => {
    const adapter = makeAdapter({ multica_token: "tok" });
    const report = migrateLocalStorage(adapter);
    expect(adapter.snapshot()).toEqual({ algoplan_token: "tok" });
    expect(report.migrated).toContain("algoplan_token");
    expect(report.skipped).toEqual([]);
  });

  it("preserves value verbatim (no JSON round-trip)", () => {
    const json = JSON.stringify({ width: 320, expanded: true });
    const adapter = makeAdapter({ "multica:chat:width": json });
    migrateLocalStorage(adapter);
    expect(adapter.snapshot()["algoplan:chat:width"]).toBe(json);
  });

  it("conflict: keeps new, deletes legacy, reports skipped", () => {
    const adapter = makeAdapter({
      multica_token: "old",
      algoplan_token: "new",
    });
    const report = migrateLocalStorage(adapter);
    expect(adapter.snapshot()).toEqual({ algoplan_token: "new" });
    expect(report.skipped).toEqual([{ key: "multica_token", reason: "destination exists" }]);
    expect(report.migrated).not.toContain("algoplan_token");
  });

  it("is idempotent across two boots", () => {
    const adapter = makeAdapter({ multica_theme: "dark", multica_token: "tok" });
    migrateLocalStorage(adapter);
    const afterFirst = adapter.snapshot();
    migrateLocalStorage(adapter);
    expect(adapter.snapshot()).toEqual(afterFirst);
  });

  it("set-then-delete order per migrated key (no partial-state risk)", () => {
    const adapter = makeAdapter({ multica_token: "tok" });
    migrateLocalStorage(adapter);
    const setIdx = adapter.ops.findIndex(([op, k]) => op === "set" && k === "algoplan_token");
    const removeIdx = adapter.ops.findIndex(([op, k]) => op === "remove" && k === "multica_token");
    expect(setIdx).toBeGreaterThanOrEqual(0);
    expect(removeIdx).toBeGreaterThan(setIdx);
  });

  it("partial state: only some legacy keys present", () => {
    const adapter = makeAdapter({ multica_theme: "dark" });
    const report = migrateLocalStorage(adapter);
    expect(report.total).toBe(1);
    expect(adapter.snapshot()).toEqual({ algoplan_theme: "dark" });
  });
});

describe("migrateWorkspaceScopedKeys", () => {
  it("migrates suffixed keys for each workspace slug", () => {
    const adapter = makeAdapter({
      "multica_issue_draft:acme": "draft-a",
      "multica_issue_draft:beta": "draft-b",
    });
    const report = migrateWorkspaceScopedKeys(adapter, ["acme", "beta"]);
    expect(adapter.snapshot()).toEqual({
      "algoplan_issue_draft:acme": "draft-a",
      "algoplan_issue_draft:beta": "draft-b",
    });
    expect(report.total).toBe(2);
  });

  it("is idempotent across two boots", () => {
    const adapter = makeAdapter({ "multica:chat:drafts:acme": '{"x":1}' });
    migrateWorkspaceScopedKeys(adapter, ["acme"]);
    const afterFirst = adapter.snapshot();
    migrateWorkspaceScopedKeys(adapter, ["acme"]);
    expect(adapter.snapshot()).toEqual(afterFirst);
  });
});

describe("LEGACY_KEY_MAP integrity", () => {
  it("contains exactly the documented global keys", () => {
    const legacyKeys = LEGACY_KEY_MAP.map(([l]) => l).sort();
    expect(legacyKeys).toEqual(
      [
        "multica_theme",
        "multica_token",
        "multica:chat:width",
        "multica:chat:height",
        "multica:chat:focusMode",
      ].sort(),
    );
  });

  it("every legacy global key starts with 'multica' and every current key starts with 'algoplan'", () => {
    for (const [legacy, current] of LEGACY_KEY_MAP) {
      expect(legacy.startsWith("multica")).toBe(true);
      expect(current.startsWith("algoplan")).toBe(true);
    }
    for (const [legacy, current] of WORKSPACE_SCOPED_LEGACY_KEY_MAP) {
      expect(legacy.startsWith("multica")).toBe(true);
      expect(current.startsWith("algoplan")).toBe(true);
    }
  });
});
