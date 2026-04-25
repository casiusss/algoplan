import { describe, expect, it } from "vitest";
import {
  AVATAR_PALETTE,
  djb2,
  extractInitials,
  hashToPaletteIndex,
} from "./avatar-color";

describe("djb2", () => {
  it("returns the seed for empty input", () => {
    expect(djb2("")).toBe(5381);
  });

  it("is deterministic across 100 calls", () => {
    const expected = djb2("Stephan");
    for (let i = 0; i < 100; i++) {
      expect(djb2("Stephan")).toBe(expected);
    }
  });

  it("is case-sensitive", () => {
    expect(djb2("Stephan")).not.toBe(djb2("stephan"));
  });
});

describe("hashToPaletteIndex", () => {
  it("returns integer in [0, 7] for 50 synthetic names", () => {
    for (let i = 0; i < 50; i++) {
      const name = `User-${i}-${Math.floor(i * 37)}`; // deterministic — no Math.random
      const idx = hashToPaletteIndex(name);
      expect(Number.isInteger(idx)).toBe(true);
      expect(idx).toBeGreaterThanOrEqual(0);
      expect(idx).toBeLessThan(AVATAR_PALETTE.length);
    }
  });

  it("is stable across 100 calls for the same input", () => {
    const expected = hashToPaletteIndex("Stephan");
    for (let i = 0; i < 100; i++) {
      expect(hashToPaletteIndex("Stephan")).toBe(expected);
    }
  });

  it("locks regression: hashToPaletteIndex('Stephan') matches committed value", () => {
    // After GREEN, replace __EXPECTED__ with the literal computed value.
    // Per RESEARCH §Pitfall 6, this guards against silent algorithm drift.
    expect(hashToPaletteIndex("Stephan")).toBe(__EXPECTED__);
  });
});

describe("AVATAR_PALETTE", () => {
  it("has exactly 8 entries", () => {
    expect(AVATAR_PALETTE.length).toBe(8);
  });

  it("each entry is 'bg-* text-*-foreground' shape", () => {
    for (const entry of AVATAR_PALETTE) {
      const parts = entry.split(" ");
      expect(parts.length).toBe(2);
      expect(parts[0]).toMatch(/^bg-/);
      expect(parts[1]).toMatch(/^text-.*-foreground$/);
    }
  });
});

describe("extractInitials", () => {
  it("returns SR for 'Stephan Rieche'", () => {
    expect(extractInitials("Stephan Rieche")).toBe("SR");
  });

  it("returns S for single-word 'Stephan'", () => {
    expect(extractInitials("Stephan")).toBe("S");
  });

  it("returns ? for empty / whitespace / punctuation-only", () => {
    expect(extractInitials("")).toBe("?");
    expect(extractInitials("   ")).toBe("?");
    expect(extractInitials("!!!")).toBe("?");
  });

  it("strips leading non-alphanumerics", () => {
    expect(extractInitials("@@@ Stephan")).toBe("S");
  });

  it("returns AC for 'a b c' (first + last word)", () => {
    expect(extractInitials("a b c")).toBe("AC");
  });

  it("handles Unicode (Cyrillic) via \\p{L}", () => {
    expect(extractInitials("Стephan Riеche")).toBe("СR");
  });

  it("does not throw on undefined input", () => {
    expect(() => extractInitials(undefined as unknown as string)).not.toThrow();
    expect(extractInitials(undefined as unknown as string)).toBe("?");
  });
});
