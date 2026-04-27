import { describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { ApiClient } from "../api/client";
import { ApiError } from "../api/client";
import type { StorageAdapter, User } from "../types";
import { createAuthStore } from "./store";

const fakeUser: User = {
  id: "u1",
  name: "Alice",
  email: "alice@example.com",
  avatar_url: null,
} as User;

function makeStorage(initial: Record<string, string> = {}): StorageAdapter & {
  snapshot: () => Record<string, string>;
} {
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

function makeApi(getMe: () => Promise<User>): ApiClient {
  return {
    setToken: vi.fn(),
    getMe,
    // Only the methods touched by store.initialize are needed. Cast to
    // ApiClient for type compatibility — the store treats it opaquely.
  } as unknown as ApiClient;
}

// Phase 8 D-2 update: Plan 08-04 renamed multica_token → algoplan_token
// with a migration in packages/core/migrations/localstorage.ts.
// CoreProvider now calls migrateLocalStorage(storage) before any reads,
// so a v0.4.x token under multica_token is copied to algoplan_token
// on first boot. These runtime tests are updated to use algoplan_token.
describe("authStore.initialize — token mode", () => {
  it("keeps the stored token when getMe fails with a non-401 ApiError (e.g. 500)", async () => {
    const storage = makeStorage({ algoplan_token: "t" });
    const api = makeApi(() =>
      Promise.reject(new ApiError("server error", 500, "Internal Server Error")),
    );
    const store = createAuthStore({ api, storage });

    await store.getState().initialize();

    expect(store.getState().user).toBeNull();
    expect(store.getState().isLoading).toBe(false);
    expect(storage.snapshot().algoplan_token).toBe("t");
  });

  it("keeps the stored token on a network failure (non-ApiError throw)", async () => {
    const storage = makeStorage({ algoplan_token: "t" });
    const api = makeApi(() => Promise.reject(new TypeError("fetch failed")));
    const store = createAuthStore({ api, storage });

    await store.getState().initialize();

    expect(store.getState().user).toBeNull();
    expect(storage.snapshot().algoplan_token).toBe("t");
  });

  it("on 401, leaves storage cleanup to ApiClient.onUnauthorized and resets state", async () => {
    // Simulate the real path: ApiClient fires onUnauthorized on 401, which
    // removes the token from storage. The store's catch block must not
    // duplicate or short-circuit this — it should only reset in-memory
    // auth state.
    const storage = makeStorage({ algoplan_token: "t" });
    const api = makeApi(() => {
      storage.removeItem("algoplan_token"); // stand-in for onUnauthorized
      return Promise.reject(new ApiError("unauthorized", 401, "Unauthorized"));
    });
    const store = createAuthStore({ api, storage });

    await store.getState().initialize();

    expect(store.getState().user).toBeNull();
    expect(storage.snapshot().algoplan_token).toBeUndefined();
  });

  it("populates user when getMe succeeds", async () => {
    const storage = makeStorage({ algoplan_token: "t" });
    const api = makeApi(() => Promise.resolve(fakeUser));
    const store = createAuthStore({ api, storage });

    await store.getState().initialize();

    expect(store.getState().user).toEqual(fakeUser);
    expect(storage.snapshot().algoplan_token).toBe("t");
  });
});

// Phase 8 D-2 update: Plan 08-04 renamed algoplan_token from multica_token.
// The Phase 7 regression-lock intent is preserved: NO future PR may rename
// this key again without a one-shot migration AND updating this assertion.
// This test now guards the algoplan_token name (the new canonical name).
// The migration from multica_token → algoplan_token is confirmed separately
// in packages/core/migrations/localstorage.test.ts.
describe("auth/store.ts — algoplan_token localStorage key (Phase 8 D-2 update)", () => {
  const source = readFileSync(join(__dirname, "store.ts"), "utf-8");
  const migrationSource = readFileSync(
    join(__dirname, "../migrations/localstorage.ts"),
    "utf-8",
  );

  it("store.ts uses current key 'algoplan_token' (Phase 8 D-2)", () => {
    expect(source).toContain("algoplan_token");
  });

  it("store.ts does NOT use legacy 'multica_token' key (migrated in Plan 08-04)", () => {
    // Legacy key must only appear in the migration helper, not in production store.
    expect(source).not.toContain("multica_token");
  });

  it("migration helper covers legacy key 'multica_token' (data-loss guard)", () => {
    expect(migrationSource).toContain("multica_token");
  });

  // W-01 from 08-PLAN-CHECK.md: explicit end-to-end scenario assertion
  it("W-01: legacy multica_token migrates to algoplan_token end-to-end via migrateLocalStorage", async () => {
    const { migrateLocalStorage } = await import("../migrations/localstorage");
    const data: Record<string, string> = { multica_token: "legacy-tok" };
    const adapter = {
      getItem: (k: string) => data[k] ?? null,
      setItem: (k: string, v: string) => { data[k] = v; },
      removeItem: (k: string) => { delete data[k]; },
    };
    migrateLocalStorage(adapter);
    expect(data.algoplan_token).toBe("legacy-tok");
    expect(data.multica_token).toBeUndefined();
  });
});
