import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

// Phase 8 D-2 update: Plan 08-04 renamed these keys from multica:chat:* to
// algoplan:chat:* and shipped a one-shot migration in
// packages/core/migrations/localstorage.ts (LEGACY_KEY_MAP / WORKSPACE_SCOPED_LEGACY_KEY_MAP).
// This test is updated to assert the renamed keys ARE present in store.ts,
// and to cross-check that the migration covers the legacy multica:chat:* keys
// so no user data is silently lost on upgrade.
//
// Original Phase 7 D-2 regression-lock intent:
// If store.ts is ever renamed again without a migration, the source-text assertion
// below will fail on the ALGOPLAN key — forcing the author to ship a migration.
describe("packages/core/chat/store.ts — chat localStorage keys (Phase 8 D-2 update)", () => {
  const source = readFileSync(join(__dirname, "store.ts"), "utf-8");
  const migrationSource = readFileSync(
    join(__dirname, "../migrations/localstorage.ts"),
    "utf-8",
  );

  // Plan 08-04 renamed these keys. Store must use the new algoplan:chat:* names.
  const CURRENT_CHAT_KEYS = [
    "algoplan:chat:selectedAgentId",
    "algoplan:chat:activeSessionId",
    "algoplan:chat:drafts",
    "algoplan:chat:width",
    "algoplan:chat:height",
    "algoplan:chat:expanded",
    "algoplan:chat:focusMode",
  ];

  it.each(CURRENT_CHAT_KEYS)(
    "store.ts uses current key '%s' (Phase 8 D-2)",
    (key) => {
      expect(source).toContain(key);
    },
  );

  it("store.ts does NOT use legacy multica:chat:* keys (migrated in Plan 08-04)", () => {
    // Legacy keys must only appear in the migration helper, not in production store.
    expect(source).not.toMatch(/multica:chat:/);
  });

  // Cross-check: the migration helper must cover the legacy names so no user
  // data is silently lost on upgrade from v0.4.x to v0.5.0.
  const LEGACY_CHAT_KEYS = [
    "multica:chat:selectedAgentId",
    "multica:chat:activeSessionId",
    "multica:chat:drafts",
    "multica:chat:width",
    "multica:chat:height",
    "multica:chat:expanded",
    "multica:chat:focusMode",
  ];

  it.each(LEGACY_CHAT_KEYS)(
    "migration helper covers legacy key '%s' (data-loss guard)",
    (key) => {
      expect(migrationSource).toContain(key);
    },
  );
});
