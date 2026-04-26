import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

// Phase 7 D-2 regression lock — see .planning/phases/07-rebrand-pass/07-CONTEXT.md
//
// Why a source-text assertion (not a runtime test):
// These keys are stored in user browsers TODAY. Renaming any of them migrates
// nothing — it silently abandons every user's chat selection / drafts /
// layout. There is no upgrade path because the new key is empty on first read,
// so the app falls back to defaults as if the user never used it.
//
// A runtime test would only verify the store reads/writes whatever key the
// store currently uses (tautology). A source-text assertion is the only thing
// that fails on rename, blocking the merge before the data loss ships.
//
// If a future plan legitimately needs to rename these keys, it MUST also ship
// a one-shot migration that copies old key -> new key in storage-cleanup or
// a dedicated migration step, AND update this test to point at the migrated
// key. Removing the assertion without a migration is a data-loss bug.
describe("packages/core/chat/store.ts — multica:chat:* localStorage keys (Phase 7 D-2 regression lock)", () => {
  const source = readFileSync(join(__dirname, "store.ts"), "utf-8");

  // These keys are storing user data (selected agent, session, drafts, layout
  // dimensions, focus mode). Renaming any of them = silent data loss for every
  // existing user. CONTEXT D-2 explicitly preserves them.
  const PRESERVED_CHAT_KEYS = [
    "multica:chat:selectedAgentId",
    "multica:chat:activeSessionId",
    "multica:chat:drafts",
    "multica:chat:width",
    "multica:chat:height",
    "multica:chat:expanded",
    "multica:chat:focusMode",
  ];

  it.each(PRESERVED_CHAT_KEYS)(
    "preserves localStorage key '%s' verbatim (Phase 7 D-2)",
    (key) => {
      expect(source).toContain(key);
    },
  );

  it("does NOT introduce algoplan:chat:* renamed keys", () => {
    expect(source).not.toMatch(/algoplan:chat:/);
  });
});
