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

describe("authStore.initialize — token mode", () => {
  it("keeps the stored token when getMe fails with a non-401 ApiError (e.g. 500)", async () => {
    const storage = makeStorage({ multica_token: "t" });
    const api = makeApi(() =>
      Promise.reject(new ApiError("server error", 500, "Internal Server Error")),
    );
    const store = createAuthStore({ api, storage });

    await store.getState().initialize();

    expect(store.getState().user).toBeNull();
    expect(store.getState().isLoading).toBe(false);
    expect(storage.snapshot().multica_token).toBe("t");
  });

  it("keeps the stored token on a network failure (non-ApiError throw)", async () => {
    const storage = makeStorage({ multica_token: "t" });
    const api = makeApi(() => Promise.reject(new TypeError("fetch failed")));
    const store = createAuthStore({ api, storage });

    await store.getState().initialize();

    expect(store.getState().user).toBeNull();
    expect(storage.snapshot().multica_token).toBe("t");
  });

  it("on 401, leaves storage cleanup to ApiClient.onUnauthorized and resets state", async () => {
    // Simulate the real path: ApiClient fires onUnauthorized on 401, which
    // removes the token from storage. The store's catch block must not
    // duplicate or short-circuit this — it should only reset in-memory
    // auth state.
    const storage = makeStorage({ multica_token: "t" });
    const api = makeApi(() => {
      storage.removeItem("multica_token"); // stand-in for onUnauthorized
      return Promise.reject(new ApiError("unauthorized", 401, "Unauthorized"));
    });
    const store = createAuthStore({ api, storage });

    await store.getState().initialize();

    expect(store.getState().user).toBeNull();
    expect(storage.snapshot().multica_token).toBeUndefined();
  });

  it("populates user when getMe succeeds", async () => {
    const storage = makeStorage({ multica_token: "t" });
    const api = makeApi(() => Promise.resolve(fakeUser));
    const store = createAuthStore({ api, storage });

    await store.getState().initialize();

    expect(store.getState().user).toEqual(fakeUser);
    expect(storage.snapshot().multica_token).toBe("t");
  });
});

// Phase 7 D-2 regression lock — see .planning/phases/07-rebrand-pass/07-CONTEXT.md
//
// `multica_token` is the auth bearer token persisted in every logged-in user's
// browser. Renaming this key has the same effect as `localStorage.clear()` for
// the auth subsystem: the new key is empty on first read, the user is treated
// as logged out, and they're forced to re-authenticate. There is no migration
// path because the rename loses the only reference to the existing token.
//
// A source-text assertion (not a runtime test) is used here because a runtime
// test would only confirm the store reads/writes whatever key it currently
// uses (tautology). The intent is: NO future PR may rename this key without
// a one-shot migration in storage-cleanup AND a corresponding update to this
// assertion. Failing that, the test fails and blocks merge.
describe("auth/store.ts — multica_token localStorage key (Phase 7 D-2 regression lock)", () => {
  const source = readFileSync(join(__dirname, "store.ts"), "utf-8");

  it("preserves localStorage key 'multica_token' verbatim", () => {
    expect(source).toContain("multica_token");
  });

  it("does NOT introduce algoplan_token renamed key (would force re-login for all users)", () => {
    expect(source).not.toContain("algoplan_token");
  });
});
