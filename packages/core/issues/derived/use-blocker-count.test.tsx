// @vitest-environment jsdom
/**
 * Stability test for useBlockerCount — Plan 05 (Wave 4).
 * v1: literal 0 (FTR-03 backend wiring deferred to v2).
 */
import { describe, it, expect } from "vitest";
import { renderHook } from "@testing-library/react";
import { useBlockerCount } from "./use-blocker-count";

describe("useBlockerCount (SHL-05)", () => {
  it("returns the literal 0 for v1 (FTR-03 deferred to v2 backend)", () => {
    const { result } = renderHook(() => useBlockerCount("ws-1"));
    expect(result.current).toBe(0);
  });

  it("returns 0 for undefined wsId (no throw)", () => {
    const { result } = renderHook(() => useBlockerCount(undefined));
    expect(result.current).toBe(0);
  });

  it("primitive return is auto-stable across renders", () => {
    const { result, rerender } = renderHook(() => useBlockerCount("ws-1"));
    const first = result.current;
    rerender();
    expect(result.current).toBe(first);
  });
});
