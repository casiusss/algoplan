import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

describe("packages/core/chat/store.ts — chat localStorage keys", () => {
  const source = readFileSync(join(__dirname, "store.ts"), "utf-8");

  const CURRENT_CHAT_KEYS = [
    "algoplan:chat:selectedAgentId",
    "algoplan:chat:activeSessionId",
    "algoplan:chat:drafts",
    "algoplan:chat:width",
    "algoplan:chat:height",
    "algoplan:chat:expanded",
    "algoplan:chat:focusMode",
  ];

  it.each(CURRENT_CHAT_KEYS)("uses key '%s'", (key) => {
    expect(source).toContain(key);
  });

  it("does NOT reference legacy multica:chat:* keys", () => {
    expect(source).not.toMatch(/multica:chat:/);
  });
});
